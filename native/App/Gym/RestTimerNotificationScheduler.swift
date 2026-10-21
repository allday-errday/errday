import ErrdayCore
import Foundation
import UserNotifications

@MainActor
enum RestTimerNotificationScheduler {
    private static let enabledKey = "errday.restTimerAlertsEnabled"
    private static let notificationID = "errday.workout.restComplete"
    private static var lastEnd: Date?
    private static var lastEnabled: Bool?
    private static var hasScheduled = false
    private static var pending: Task<Void, Never>?

    static var isEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: enabledKey) }
        set { UserDefaults.standard.set(newValue, forKey: enabledKey) }
    }

    static func setEnabled(_ enabled: Bool, for data: PersonalData) async throws -> Bool {
        if enabled {
            let center = UNUserNotificationCenter.current()
            let status = await center.notificationSettings().authorizationStatus
            let allowed: Bool
            switch status {
            case .authorized, .provisional, .ephemeral:
                allowed = true
            case .notDetermined:
                allowed = try await center.requestAuthorization(options: [.alert, .sound])
            case .denied:
                allowed = false
            @unknown default:
                allowed = false
            }
            guard allowed else { return false }
        }

        isEnabled = enabled
        schedule(for: data)
        await pending?.value
        return enabled
    }

    static func schedule(for data: PersonalData, preserveCompletedAlert: Bool = false) {
        let enabled = isEnabled
        let end = enabled && data.activeWorkout != nil ? data.restEndsAt : nil
        guard !hasScheduled || end != lastEnd || enabled != lastEnabled else { return }
        hasScheduled = true
        lastEnd = end
        lastEnabled = enabled
        let previous = pending
        pending = Task {
            await previous?.value
            await apply(end: end, preserveCompletedAlert: preserveCompletedAlert)
        }
    }

    private static func apply(end: Date?, preserveCompletedAlert: Bool) async {
        let center = UNUserNotificationCenter.current()
        if !preserveCompletedAlert {
            center.removePendingNotificationRequests(withIdentifiers: [notificationID])
        }
        guard let end, end > .now else { return }
        let status = await center.notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional || status == .ephemeral else { return }

        let content = UNMutableNotificationContent()
        content.title = "Rest complete"
        content.body = "Ready for your next set."
        content.sound = .default
        let seconds = end.timeIntervalSinceNow
        guard seconds > 0 else { return }
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, seconds), repeats: false)
        try? await center.add(UNNotificationRequest(identifier: notificationID, content: content, trigger: trigger))
    }
}
