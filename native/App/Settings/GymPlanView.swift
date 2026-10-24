import SwiftUI
import ErrdayCore

struct GymPlanCard: View {
    @Environment(PersonalStore.self) private var records
    let date: Date
    @State private var startAt: Date
    @State private var preWorkoutMinutes = 60
    @State private var remindersEnabled = true
    @State private var saved = false

    init(date: Date) {
        let today = Calendar.current.startOfDay(for: .now)
        self.date = today
        _startAt = State(initialValue: Calendar.current.date(bySettingHour: 18, minute: 0, second: 0, of: today) ?? today)
    }

    private var existing: PlannedGymSession? {
        records.data.plannedGymSessions?.first { Calendar.current.isDate($0.date, inSameDayAs: date) }
    }

    var body: some View {
        ErrdayCard {
            SectionHeading(title: "Plan your gym session")
            DatePicker("Gym time", selection: $startAt, displayedComponents: .hourAndMinute)
            Picker("Pre-workout meal", selection: $preWorkoutMinutes) {
                Text("30 min before").tag(30)
                Text("60 min before").tag(60)
            }
            .pickerStyle(.segmented)
            Toggle("Remind me about the meal", isOn: $remindersEnabled)
            Button(saved ? "Gym plan saved" : "Save gym plan") { save() }
                .buttonStyle(PrimaryButtonStyle())
        }
        .task { loadExisting() }
    }

    private func loadExisting() {
        guard let existing else { return }
        startAt = existing.startAt
        preWorkoutMinutes = existing.preWorkoutMinutes
        remindersEnabled = existing.remindersEnabled
    }

    private func save() {
        let plan = PlannedGymSession(date: Calendar.current.startOfDay(for: date), startAt: startAt,
                                     workoutName: "Gym session",
                                     preWorkoutMinutes: preWorkoutMinutes, remindersEnabled: remindersEnabled)
        guard records.update({ data in
            var plans = data.plannedGymSessions ?? []
            plans.removeAll { Calendar.current.isDate($0.date, inSameDayAs: date) }
            plans.append(plan)
            data.plannedGymSessions = plans.sorted { $0.date < $1.date }
        }) else { return }
        saved = true
        Task { await RoutineReminderScheduler.refreshPlannedGymSessions(for: records.data) }
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(1.5))
            saved = false
        }
    }
}
