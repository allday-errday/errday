import SwiftUI
import ErrdayCore

struct WeeklyRecapLink: View {
    @State private var showingDetail = false
    let weekStart: Date

    var body: some View {
        Button { showingDetail = true } label: {
            HStack(spacing: 5) {
                Text("Weekly recap")
                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .semibold))
            }
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(ErrdayTheme.accent)
            .frame(minHeight: 32)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, alignment: .trailing)
        .accessibilityHint("Opens food, sleep, steps and gym summaries for this week")
        .sheet(isPresented: $showingDetail) {
            WeeklyRecapDetail(weekStart: weekStart)
        }
    }
}

private struct WeeklyRecapDetail: View {
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    @Environment(\.dismiss) private var dismiss
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var expandedSection: RecapSection?
    @State private var selectedDetent: PresentationDetent = .medium
    let weekStart: Date

    private enum RecapSection { case food, sleep, steps, gym }

    private var summary: WeeklyRecapSummary {
        WeeklyRecapSummary(weekStart: weekStart, records: records)
    }
    private var previousSummary: WeeklyRecapSummary {
        WeeklyRecapSummary(weekStart: previousWeekStart, records: records)
    }
    private var previousWeekStart: Date {
        Calendar.current.date(byAdding: .day, value: -7, to: weekStart) ?? weekStart
    }
    private var sleepHours: [Double] {
        sleepHours(in: summary)
    }
    private var averageSleep: Double? {
        guard !sleepHours.isEmpty else { return nil }
        return sleepHours.reduce(0, +) / Double(sleepHours.count)
    }
    private var recordedSteps: [Double] {
        recordedSteps(in: summary)
    }
    private var averageSteps: Double? {
        guard !recordedSteps.isEmpty else { return nil }
        return recordedSteps.reduce(0, +) / Double(recordedSteps.count)
    }
    private var completedWorkouts: [Workout] {
        completedWorkouts(in: summary)
    }
    private var workoutMinutes: Int {
        Int(completedWorkouts.reduce(0) { total, workout in
            total + max(0, (workout.finishedAt ?? workout.startedAt).timeIntervalSince(workout.startedAt))
        } / 60)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(summary.dateRange)
                        .font(.system(size: 13))
                        .foregroundStyle(ErrdayTheme.secondary)

                    comparisonCard

                    recapSection("Food", symbol: "fork.knife", color: ErrdayTheme.foodAccent, section: .food) {
                        recapRow("Days with food", value: "\(summary.foodDays)")
                        recapRow("Calories / logged day", value: summary.averageCalories.map { "\($0.whole) kcal" } ?? "—")
                        recapRow("Protein / logged day", value: summary.averageProtein.map { "\($0.whole) g" } ?? "—")
                        recapRow("Water / logged day", value: summary.averageWater.map { "\(($0 / 1_000).formatted(.number.precision(.fractionLength(0...1)))) L" } ?? "—")
                    }

                    recapSection("Sleep", symbol: "moon.fill", color: Color(hex: 0x6d73c8), section: .sleep) {
                        recapRow("Nights recorded", value: "\(sleepHours.count)")
                        recapRow("Average / recorded night", value: averageSleep.map { hours in
                            let minutes = Int((hours * 60).rounded())
                            return "\(minutes / 60)h \(minutes % 60)m"
                        } ?? "—")
                    }

                    recapSection("Steps", symbol: "figure.walk", color: ErrdayTheme.healthAccent, section: .steps) {
                        recapRow("Days recorded", value: "\(recordedSteps.count)")
                        recapRow("Average / recorded day", value: averageSteps.map { "\($0.whole) steps" } ?? "—")
                    }

                    recapSection("Gym", symbol: "dumbbell.fill", color: ErrdayTheme.gymAccent, section: .gym) {
                        recapRow("Workouts", value: "\(completedWorkouts.count)")
                        recapRow("Total time", value: "\(workoutMinutes) min")
                    }
                }
                .padding(20)
            }
            .errdayBackground()
            .foregroundStyle(ErrdayTheme.text)
            .navigationTitle("Weekly recap")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large], selection: $selectedDetent)
        .presentationDragIndicator(.visible)
    }

    private var comparisonCard: some View {
        let priorSleep = average(sleepHours(in: previousSummary))
        let priorSteps = average(recordedSteps(in: previousSummary))
        let currentGymPerDay = dailyWorkoutMinutes(in: summary)
        let priorGymPerDay = dailyWorkoutMinutes(in: previousSummary)

        return ErrdayCard {
            Text("Compared with previous week")
                .font(.system(size: 15, weight: .semibold))
            Text("Food, sleep and steps compare recorded-day averages. Gym time is averaged across elapsed days.")
                .font(.system(size: 11))
                .foregroundStyle(ErrdayTheme.secondary)
            trendRow("Calories", current: summary.averageCalories, previous: previousSummary.averageCalories,
                     formatter: { "\($0.whole) kcal" }, difference: { signed($0, suffix: " kcal") })
            trendRow("Sleep", current: averageSleep, previous: priorSleep,
                     formatter: hourText, difference: signedMinutes)
            trendRow("Steps", current: averageSteps, previous: priorSteps,
                     formatter: { $0.whole }, difference: { signed($0, suffix: "") })
            trendRow("Gym time / day", current: currentGymPerDay, previous: priorGymPerDay,
                     formatter: { "\(Int($0.rounded())) min" }, difference: { signed($0, suffix: " min") })
        }
    }

    private func trendRow(_ title: String, current: Double?, previous: Double?,
                          formatter: (Double) -> String, difference: (Double) -> String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).foregroundStyle(ErrdayTheme.secondary)
                if let current, let previous {
                    Text("\(formatter(current)) vs \(formatter(previous))")
                        .font(.system(size: 11))
                        .foregroundStyle(ErrdayTheme.quiet)
                }
            }
            Spacer()
            if let current, let previous {
                let delta = current - previous
                Image(systemName: abs(delta) < 0.5 ? "equal" : (delta > 0 ? "arrow.up.right" : "arrow.down.right"))
                    .font(.system(size: 10, weight: .semibold))
                    .accessibilityHidden(true)
                Text(difference(delta)).fontWeight(.semibold)
            } else {
                Text("Not enough data").foregroundStyle(ErrdayTheme.secondary)
            }
        }
        .font(.system(size: 13))
        .accessibilityElement(children: .combine)
    }

    private func recapSection<Content: View>(_ title: String, symbol: String, color: Color, section: RecapSection,
                                             @ViewBuilder content: () -> Content) -> some View {
        ErrdayCard {
            Label(title, systemImage: symbol)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(color)
            content()
            Divider()
            Button {
                withAnimation(.snappy(duration: 0.24)) {
                    expandedSection = expandedSection == section ? nil : section
                    if expandedSection != nil { selectedDetent = .large }
                }
                ErrdayHaptics.selection(isEnabled: hapticsEnabled)
            } label: {
                HStack {
                    Text(expandedSection == section ? "Hide daily details" : "Daily details")
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 11, weight: .semibold))
                        .rotationEffect(.degrees(expandedSection == section ? 180 : 0))
                }
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(ErrdayTheme.accent)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(expandedSection == section ? "Hide" : "Show") daily \(title.lowercased()) details")
            if expandedSection == section {
                detailRows(for: section)
                    .transition(.opacity)
            }
        }
    }

    @ViewBuilder
    private func detailRows(for section: RecapSection) -> some View {
        Divider()
        switch section {
        case .food:
            ForEach(summary.days.filter { !$0.isFuture }) { day in
                let notes = [day.protein.map { "\($0.whole) g protein" },
                             day.water.map { "\($0.whole) mL water" }].compactMap { $0 }
                detailRow(day.date.formatted(.dateTime.weekday(.abbreviated).day()),
                          value: day.calories.map { "\($0.whole) kcal" } ?? "No food logged",
                          note: notes.isEmpty ? nil : notes.joined(separator: " · "))
            }
        case .sleep:
            ForEach(summary.days.filter { !$0.isFuture }) { day in
                let hours = health.sleep.first { Calendar.current.isDate($0.date, inSameDayAs: day.date) }?.hours
                detailRow(day.date.formatted(.dateTime.weekday(.abbreviated).day()),
                          value: hours.map { hourText($0) } ?? "No measurement")
            }
        case .steps:
            ForEach(summary.days.filter { !$0.isFuture }) { day in
                let steps = health.value("steps", on: day.date)
                let distance = health.value("distance", on: day.date)
                detailRow(day.date.formatted(.dateTime.weekday(.abbreviated).day()),
                          value: steps.map { "\($0.whole) steps" } ?? "No measurement",
                          note: distance.map { "\($0.decimal) km walking + running" })
            }
        case .gym:
            if completedWorkouts.isEmpty {
                Text("No completed workouts logged this week.")
                    .font(.system(size: 13))
                    .foregroundStyle(ErrdayTheme.secondary)
            } else {
                ForEach(completedWorkouts.sorted { $0.startedAt < $1.startedAt }) { workout in
                    let minutes = Int(max(0, (workout.finishedAt ?? workout.startedAt).timeIntervalSince(workout.startedAt)) / 60)
                    detailRow(workout.name, value: "\(minutes) min",
                              note: workout.startedAt.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated)))
                }
            }
        }
    }

    private func detailRow(_ title: String, value: String, note: String? = nil) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 13, weight: .medium))
                if let note {
                    Text(note).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                }
            }
            Spacer(minLength: 6)
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(value.hasPrefix("No ") ? ErrdayTheme.secondary : ErrdayTheme.text)
                .multilineTextAlignment(.trailing)
        }
        .frame(minHeight: 40)
    }

    private func hourText(_ hours: Double) -> String {
        let minutes = Int((hours * 60).rounded())
        return "\(minutes / 60)h \(minutes % 60)m"
    }

    private func sleepHours(in summary: WeeklyRecapSummary) -> [Double] {
        summary.days.filter { !$0.isFuture }.compactMap { day in
            health.sleep.first { Calendar.current.isDate($0.date, inSameDayAs: day.date) }?.hours
        }
    }

    private func recordedSteps(in summary: WeeklyRecapSummary) -> [Double] {
        summary.days.filter { !$0.isFuture }.compactMap { health.value("steps", on: $0.date) }
    }

    private func completedWorkouts(in summary: WeeklyRecapSummary) -> [Workout] {
        summary.days.filter { !$0.isFuture }
            .flatMap { records.workouts(on: $0.date) }
            .filter { $0.finishedAt != nil }
    }

    private func dailyWorkoutMinutes(in summary: WeeklyRecapSummary) -> Double? {
        let elapsedDays = summary.days.filter { !$0.isFuture }.count
        guard elapsedDays > 0 else { return nil }
        let seconds = completedWorkouts(in: summary).reduce(0) { total, workout in
            total + max(0, (workout.finishedAt ?? workout.startedAt).timeIntervalSince(workout.startedAt))
        }
        return seconds / 60 / Double(elapsedDays)
    }

    private func average(_ values: [Double]) -> Double? {
        guard !values.isEmpty else { return nil }
        return values.reduce(0, +) / Double(values.count)
    }

    private func signed(_ value: Double, suffix: String) -> String {
        let rounded = Int(value.rounded())
        return "\(rounded > 0 ? "+" : "")\(rounded)\(suffix)"
    }

    private func signedMinutes(_ hours: Double) -> String {
        signed(hours * 60, suffix: " min")
    }

    private func recapRow(_ title: String, value: String) -> some View {
        HStack {
            Text(title).foregroundStyle(ErrdayTheme.secondary)
            Spacer()
            Text(value).fontWeight(.semibold)
        }
        .font(.system(size: 13))
    }
}

@MainActor
private struct WeeklyRecapSummary {
    let days: [Day]

    struct Day: Identifiable {
        let date: Date
        let calories: Double?
        let protein: Double?
        let water: Double?
        let isFuture: Bool

        var id: Date { date }
    }

    init(weekStart: Date, records: PersonalStore) {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        days = (0..<7).compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: offset, to: weekStart) else { return nil }
            let meals = records.meals(on: date)
            let waterEntries = records.hydrationEntries(on: date)
            let calories = meals.isEmpty ? nil : meals.reduce(0) { $0 + $1.calories }
            let protein = meals.isEmpty ? nil : meals.reduce(0) { $0 + $1.protein }
            let water = waterEntries.isEmpty ? nil : waterEntries.reduce(0) { $0 + $1.millilitres }
            let isFuture = date > today
            return Day(date: date, calories: calories, protein: protein, water: water, isFuture: isFuture)
        }
    }

    var foodDays: Int { days.filter { $0.calories != nil && !$0.isFuture }.count }
    var averageCalories: Double? { average(days.filter { !$0.isFuture }.compactMap(\.calories)) }
    var averageProtein: Double? { average(days.filter { !$0.isFuture }.compactMap(\.protein)) }
    var averageWater: Double? { average(days.filter { !$0.isFuture }.compactMap(\.water)) }
    var dateRange: String {
        guard let first = days.first?.date, let last = days.last?.date else { return "" }
        return "\(first.formatted(.dateTime.day().month(.abbreviated))) – \(last.formatted(.dateTime.day().month(.abbreviated)))"
    }

    private func average(_ values: [Double]) -> Double? {
        guard !values.isEmpty else { return nil }
        return values.reduce(0, +) / Double(values.count)
    }
}
