import ErrdayCore
import Foundation
import UserNotifications

enum RoutineReminderScheduler {
    private static let enabledKey = "errday.routineRemindersEnabled"
    private static let identifierPrefix = "errday.routine."
    private static let scheduledDayCount = 7

    static var isEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: enabledKey) }
        set { UserDefaults.standard.set(newValue, forKey: enabledKey) }
    }

    static func setEnabled(_ enabled: Bool, for data: PersonalData) async throws -> Bool {
        guard enabled else {
            isEnabled = false
            await removeScheduledReminders()
            return false
        }

        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        let allowed: Bool
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            allowed = true
        case .notDetermined:
            allowed = try await center.requestAuthorization(options: [.alert, .sound])
        case .denied:
            allowed = false
        @unknown default:
            allowed = false
        }

        guard allowed else {
            isEnabled = false
            return false
        }
        isEnabled = true
        await refresh(for: data)
        return true
    }

    /// Refreshes reminders without showing a permission prompt. Permission is
    /// requested only when the person enables reminders from Settings.
    static func refreshIfAuthorized(for data: PersonalData, now: Date = .now) async {
        guard isEnabled else { return }
        let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional || status == .ephemeral else { return }
        await refresh(for: data, now: now)
    }

    static func refreshPlannedGymSessions(for data: PersonalData, now: Date = .now) async {
        let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional || status == .ephemeral else { return }
        let center = UNUserNotificationCenter.current()
        let existing = await center.pendingNotificationRequests().map(\.identifier).filter { $0.contains(".preworkout.") }
        center.removePendingNotificationRequests(withIdentifiers: existing)
        for session in data.plannedGymSessions ?? [] where session.remindersEnabled {
            let reminderDate = session.startAt.addingTimeInterval(-Double(session.preWorkoutMinutes * 60))
            guard reminderDate > now else { continue }
            await add(center: center, id: identifier(for: "preworkout", date: reminderDate),
                      title: "Pre-workout meal",
                      body: "You planned (session.workoutName) at (session.startAt.formatted(date: .omitted, time: .shortened)). Have a light carb- and protein-focused meal now.",
                      date: reminderDate)
        }
    }

    static func refresh(for data: PersonalData, now: Date = .now) async {
        guard isEnabled else { return }
        let center = UNUserNotificationCenter.current()
        await removeScheduledReminders()

        let calendar = Calendar.current
        let today = calendar.startOfDay(for: now)
        for offset in 0..<scheduledDayCount {
            guard let day = calendar.date(byAdding: .day, value: offset, to: today) else { continue }
            let isToday = offset == 0
            let completed = data.checklist(on: day)?.completed ?? []
            let hydration = data.hydration(on: day).reduce(0) { $0 + $1.millilitres }
            let hydrationGoal = data.hydrationGoalMillilitres ?? 3_500

            for session in (data.plannedGymSessions ?? []).filter({ Calendar.current.isDate($0.date, inSameDayAs: day) && $0.remindersEnabled }) {
                let reminderDate = session.startAt.addingTimeInterval(-Double(session.preWorkoutMinutes * 60))
                guard reminderDate > now else { continue }
                await add(center: center,
                          id: identifier(for: "preworkout", date: reminderDate),
                          title: "Pre-workout meal",
                          body: "You planned (session.workoutName) at (session.startAt.formatted(date: .omitted, time: .shortened)). Have a light carb- and protein-focused meal now.",
                          date: reminderDate)
            }

            if !isToday || hydration < hydrationGoal {
                for hour in [8, 12, 18, 23] {
                    guard let fireDate = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: day), fireDate > now else { continue }
                    let amount = isToday ? " You have logged \(Int(hydration)) of \(Int(hydrationGoal)) ml." : ""
                    await add(
                        center: center,
                        id: identifier(for: "water", date: fireDate),
                        title: "Water check-in",
                        body: "Keep moving toward your 3.5 L water goal.\(amount)",
                        date: fireDate
                    )
                }
            }

            let daytimeItems: [DailyChecklistItem] = [.creatine, .multivitamin, .omega3]
            let pendingDaytime = daytimeItems.filter { !completed.contains($0) }
            if !isToday || !pendingDaytime.isEmpty {
                for hour in [8, 12, 20] {
                    guard let fireDate = calendar.date(bySettingHour: hour, minute: 0, second: 0, of: day), fireDate > now else { continue }
                    let names = (isToday ? pendingDaytime : daytimeItems).map(title).joined(separator: ", ")
                    await add(
                        center: center,
                        id: identifier(for: "supplements", date: fireDate),
                        title: hour == 8 ? "Daily supplements" : "Supplement check-in",
                        body: "Still to check off: \(names).",
                        date: fireDate
                    )
                }
            }

            if !isToday || !completed.contains(.magnesium) {
                guard let fireDate = calendar.date(bySettingHour: 22, minute: 0, second: 0, of: day), fireDate > now else { continue }
                await add(
                    center: center,
                    id: identifier(for: "magnesium", date: fireDate),
                    title: "Evening magnesium",
                    body: "Check off magnesium when you have taken it.",
                    date: fireDate
                )
            }
        }
    }

    private static func add(center: UNUserNotificationCenter, id: String, title: String, body: String, date: Date) async {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }

    private static func removeScheduledReminders() async {
        let center = UNUserNotificationCenter.current()
        let identifiers = await center.pendingNotificationRequests()
            .map(\.identifier)
            .filter { $0.hasPrefix(identifierPrefix) }
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
    }

    private static func identifier(for kind: String, date: Date) -> String {
        "\(identifierPrefix)\(kind).\(Int(date.timeIntervalSince1970))"
    }

    private static func title(_ item: DailyChecklistItem) -> String {
        switch item {
        case .creatine: "creatine"
        case .multivitamin: "multivitamin"
        case .omega3: "omega-3"
        case .magnesium: "magnesium"
        case .water: "water"
        }
    }
}
