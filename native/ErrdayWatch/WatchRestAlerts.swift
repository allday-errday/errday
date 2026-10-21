import Foundation
import UserNotifications

enum WatchRestAlerts {
    private static let identifier = "errday.watch.rest"
    static func requestAccess() async {
        _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
    }
    static func schedule(end: Date?) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [identifier])
        guard let end, end.timeIntervalSinceNow > 0 else { return }
        let content = UNMutableNotificationContent()
        content.title = "Rest complete"
        content.body = "Ready for your next set."
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, end.timeIntervalSinceNow), repeats: false)
        center.add(UNNotificationRequest(identifier: identifier, content: content, trigger: trigger))
    }
}
