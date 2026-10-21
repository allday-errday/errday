import SwiftUI
import UserNotifications

struct NotificationPreferencesView: View {
    @Environment(PersonalStore.self) private var records
    @State private var enabled = Set<String>()
    @State private var routineEnabled = RoutineReminderScheduler.isEnabled
    @State private var error: String?
    @State private var busy = false
    private let options: [(String, String, String, Int, Int?)] = [
        ("daily", "Daily overview", "Open your daily overview in Errday.", 20, nil),
        ("workout", "Workout reminder", "Time to plan your next training day.", 17, nil),
        ("nutrition", "Nutrition", "Have you tracked today's food?", 19, nil),
        ("weekly", "Weekly overview", "Your week in Errday is ready to review.", 19, 1)
    ]
    var body: some View {
        ErrdayPage {
            PageHeading(title: "Notifications", subtitle: "Only the reminders you choose.")
            ErrdayCard {
                Toggle(isOn: Binding(
                    get: { routineEnabled },
                    set: { value in Task { await toggleRoutine(value) } }
                )) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Daily routine reminders")
                        Text("Supplements · 08:00, 12:00, 20:00\nWater · 08:00, 12:00, 18:00, 23:00\nMagnesium · 22:00")
                            .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    }
                }
                .disabled(busy)
                Text("Later supplement reminders stop for the day after you check the items off. Water reminders stop after 3.5 L.")
                    .font(.footnote).foregroundStyle(ErrdayTheme.secondary)
            }
            ErrdayCard {
                ForEach(options, id: \.0) { item in
                    Toggle(isOn: Binding(get: { enabled.contains(item.0) }, set: { value in Task { await toggle(item, value: value) } })) {
                        VStack(alignment: .leading, spacing: 5) { Text(item.1); Text(item.4 == nil ? "Daily at \(item.3):00" : "Sundays at \(item.3):00").font(.caption).foregroundStyle(ErrdayTheme.secondary) }
                    }.disabled(busy)
                }
            }
            Text("Local reminders at fixed times. Dynamic AI summaries and recovery alerts are not connected yet.").font(.footnote).foregroundStyle(ErrdayTheme.secondary)
            if let error { Text(error).font(.footnote).foregroundStyle(.red) }
            Button("Manage iPhone Notifications") { if let url = URL(string: UIApplication.openNotificationSettingsURLString) { UIApplication.shared.open(url) } }.buttonStyle(PrimaryButtonStyle(secondary: true))
        }.task {
            let requests = await UNUserNotificationCenter.current().pendingNotificationRequests()
            let known = Set(options.map(\.0))
            enabled = Set(requests.compactMap {
                guard $0.identifier.hasPrefix("errday.") else { return nil }
                let value = String($0.identifier.dropFirst(7))
                return known.contains(value) ? value : nil
            })
            routineEnabled = RoutineReminderScheduler.isEnabled
        }
    }

    private func toggleRoutine(_ value: Bool) async {
        busy = true
        defer { busy = false }
        error = nil
        do {
            routineEnabled = try await RoutineReminderScheduler.setEnabled(value, for: records.data)
            if value && !routineEnabled { error = "Notifications are not allowed in iPhone Settings." }
        } catch {
            routineEnabled = false
            self.error = "The routine reminders could not be saved."
        }
    }
    private func toggle(_ item: (String, String, String, Int, Int?), value: Bool) async {
        busy = true; defer { busy = false }; error = nil
        let center = UNUserNotificationCenter.current(); let id = "errday."+item.0
        if !value { center.removePendingNotificationRequests(withIdentifiers: [id]); enabled.remove(item.0); return }
        do {
            guard try await center.requestAuthorization(options: [.alert, .sound]) else { error = "Notifications are not allowed in iPhone Settings."; return }
            let content = UNMutableNotificationContent(); content.title = "Errday · "+item.1; content.body = item.2; content.sound = .default
            var date = DateComponents(); date.hour = item.3; date.minute = 0; date.weekday = item.4
            try await center.add(UNNotificationRequest(identifier: id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: date, repeats: true)))
            enabled.insert(item.0)
        } catch { self.error = "The reminder could not be saved." }
    }
}
