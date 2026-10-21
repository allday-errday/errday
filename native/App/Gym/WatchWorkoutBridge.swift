import ErrdayCore
import Foundation
import WatchConnectivity

@MainActor
final class WatchWorkoutBridge: NSObject, WCSessionDelegate {
    static let shared = WatchWorkoutBridge()
    private weak var records: PersonalStore?

    func connect(to records: PersonalStore) {
        self.records = records
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
        publish(records.data)
    }

    func publish(_ data: PersonalData) {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated,
              WCSession.default.isPaired, WCSession.default.isWatchAppInstalled,
              let encoded = try? JSONEncoder().encode(WatchWorkoutSnapshot(data: data)) else { return }
        try? WCSession.default.updateApplicationContext(["snapshot": encoded])
    }

    private func receive(_ message: [String: Any]) -> [String: Any] {
        guard let records, records.isLoaded else { return ["error": "Open Errday on your iPhone once to connect your program."] }
        var response: [String: Any] = [:]
        if let encoded = message["command"] as? Data {
            do {
                let command = try JSONDecoder().decode(WatchWorkoutCommand.self, from: encoded)
                var next = records.data
                try next.applyWatchCommand(command)
                guard records.update({ $0 = next }) else { return ["error": "Your iPhone could not save this set. Please retry."] }
            } catch { response["error"] = error.localizedDescription }
        }
        response["snapshot"] = try? JSONEncoder().encode(WatchWorkoutSnapshot(data: records.data))
        return response
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        Task { @MainActor in if let records = self.records { self.publish(records.data) } }
    }
    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}
    nonisolated func sessionDidDeactivate(_ session: WCSession) { session.activate() }
    nonisolated func sessionWatchStateDidChange(_ session: WCSession) {
        Task { @MainActor in if let records = self.records { self.publish(records.data) } }
    }
    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        Task { @MainActor in replyHandler(self.receive(message)) }
    }
}
