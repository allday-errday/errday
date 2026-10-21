import ErrdayCore
import Foundation
import Observation
import WatchConnectivity
import WatchKit

@MainActor @Observable
final class WatchWorkoutStore: NSObject, WCSessionDelegate {
    private(set) var snapshot: WatchWorkoutSnapshot?
    private(set) var pending: [WatchWorkoutCommand] = []
    private(set) var reachable = false
    private(set) var syncing = false
    var error: String?
    var actionError: String?
    private var base: WatchWorkoutSnapshot?
    private let cacheKey = "errday.watch.snapshot.v1"
    private let queueKey = "errday.watch.commands.v1"
    private var isPreview = false
    private var scheduledRestEnd: Date?
    private var restCompletionTask: Task<Void, Never>?

    override init() {
        super.init()
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--watch-ui-preview") {
            isPreview = true
            var data = PersonalData()
            data.program = .pplUpperLower()
            if let template = data.program?.templates.first {
                // Isolated simulator-only fixture. Never written to disk or sent to the phone.
                var previous = template
                previous.id = UUID()
                previous.startedAt = .now.addingTimeInterval(-86400)
                previous.finishedAt = previous.startedAt.addingTimeInterval(3600)
                for i in previous.exercises.indices {
                    for j in previous.exercises[i].sets.indices {
                        previous.exercises[i].sets[j].weight = 40
                        previous.exercises[i].sets[j].repetitions = 10
                        previous.exercises[i].sets[j].completed = true
                    }
                }
                data.workouts = [previous]
                if ProcessInfo.processInfo.arguments.contains("--watch-preview-workout") {
                    try? data.applyWatchCommand(.init(.start(templateID: template.id, workoutID: UUID())))
                }
            }
            base = WatchWorkoutSnapshot(data: data)
            rebuild()
            return
        }
        #endif
        if let bytes = UserDefaults.standard.data(forKey: cacheKey) { base = try? JSONDecoder().decode(WatchWorkoutSnapshot.self, from: bytes) }
        if let bytes = UserDefaults.standard.data(forKey: queueKey) { pending = (try? JSONDecoder().decode([WatchWorkoutCommand].self, from: bytes)) ?? [] }
        rebuild()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    @discardableResult
    func perform(_ action: WatchWorkoutCommand.Action) -> Bool {
        guard error == nil, var data = snapshot?.personalData else { return false }
        actionError = nil
        let command = WatchWorkoutCommand(action)
        do {
            try data.applyWatchCommand(command)
            pending.append(command)
            persistQueue()
            snapshot = WatchWorkoutSnapshot(data: data)
            synchronizeRestAlert()
            if case .set(_, _, _, _, _, true) = action { WKInterfaceDevice.current().play(.success) }
            else { WKInterfaceDevice.current().play(.click) }
            sync()
            return true
        } catch { actionError = error.localizedDescription; return false }
    }

    func sync() {
        guard !isPreview else { return }
        reachable = WCSession.default.isReachable
        guard WCSession.default.activationState == .activated, reachable, !syncing, error == nil else { return }
        let command = pending.first
        var message: [String: Any] = ["refresh": true]
        if let command, let bytes = try? JSONEncoder().encode(command) { message = ["command": bytes] }
        syncing = true
        WCSession.default.sendMessage(message, replyHandler: { [weak self] reply in
            Task { @MainActor in
                guard let self else { return }
                self.syncing = false
                if let error = reply["error"] as? String {
                    self.error = error
                    return
                }
                if let command { self.pending.removeAll { $0.id == command.id }; self.persistQueue() }
                self.receive(reply)
                if !self.pending.isEmpty { self.sync() }
            }
        }, errorHandler: { [weak self] _ in
            Task { @MainActor in
                self?.syncing = false
                self?.reachable = WCSession.default.isReachable
                // Edits remain on disk and retry when the connection/app returns.
                if self?.reachable == true {
                    Task { @MainActor [weak self] in
                        try? await Task.sleep(for: .seconds(5))
                        self?.sync()
                    }
                }
            }
        })
    }

    func retry() { error = nil; sync() }

    func usePhoneVersion() {
        pending = []; persistQueue(); error = nil
        snapshot = base
        synchronizeRestAlert()
        sync()
    }

    private func receive(_ message: [String: Any]) {
        guard let bytes = message["snapshot"] as? Data,
              let incoming = try? JSONDecoder().decode(WatchWorkoutSnapshot.self, from: bytes), incoming.version == 1,
              incoming.updatedAt >= (base?.updatedAt ?? .distantPast) else { return }
        base = incoming
        UserDefaults.standard.set(bytes, forKey: cacheKey)
        pending.removeAll { incoming.processedCommandIDs.contains($0.id) }
        persistQueue()
        rebuild()
    }

    private func rebuild() {
        guard let base else { return }
        var data = base.personalData
        do {
            for command in pending { try data.applyWatchCommand(command) }
            snapshot = WatchWorkoutSnapshot(data: data, now: base.updatedAt)
            synchronizeRestAlert()
        } catch {
            self.error = error.localizedDescription
            if snapshot == nil { snapshot = base }
        }
    }

    private func persistQueue() {
        guard !isPreview else { return }
        if let bytes = try? JSONEncoder().encode(pending) { UserDefaults.standard.set(bytes, forKey: queueKey) }
    }

    /// One rest alert per store, not one for each screen showing the same timer.
    private func synchronizeRestAlert() {
        guard !isPreview else { return }
        let end = snapshot?.restEndsAt.flatMap { $0 > .now ? $0 : nil }
        guard end != scheduledRestEnd else { return }
        scheduledRestEnd = end
        restCompletionTask?.cancel()
        WatchRestAlerts.schedule(end: end)
        guard let end else { return }
        restCompletionTask = Task { @MainActor [weak self] in
            do { try await Task.sleep(for: .seconds(max(0, end.timeIntervalSinceNow))) }
            catch { return }
            guard !Task.isCancelled, self?.snapshot?.restEndsAt == end else { return }
            if WKApplication.shared().applicationState == .active {
                WKInterfaceDevice.current().play(.notification)
            }
        }
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let context = session.receivedApplicationContext
        Task { @MainActor in self.receive(context); self.sync() }
    }
    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in self.reachable = WCSession.default.isReachable; self.sync() }
    }
    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.receive(applicationContext) }
    }
}
