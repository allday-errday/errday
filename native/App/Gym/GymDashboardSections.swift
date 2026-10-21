import SwiftUI
import Charts
import ErrdayCore

enum GymChartMetric: String, CaseIterable, Identifiable {
    case duration = "Duration"
    case volume = "Volume"
    case workouts = "Workouts"
    var id: String { rawValue }
    var symbol: String {
        switch self {
        case .duration: "clock"
        case .volume: "chart.bar"
        case .workouts: "point.bottomleft.forward.to.point.topright.scurvepath"
        }
    }
}

private struct GymDayValue: Identifiable {
    let date: Date
    let value: Double
    var id: Date { date }
}

struct GymActivityCard: View {
    let workouts: [Workout]
    @Binding var metric: GymChartMetric

    private var values: [GymDayValue] {
        let calendar = Calendar.current
        let interval = calendar.dateInterval(of: .weekOfYear, for: .now)
        let start = interval?.start ?? calendar.startOfDay(for: .now)
        return (0..<7).compactMap { offset in
            guard let date = calendar.date(byAdding: .day, value: offset, to: start) else { return nil }
            let matches = workouts.filter { calendar.isDate($0.startedAt, inSameDayAs: date) }
            let value: Double
            switch metric {
            case .duration:
                value = matches.reduce(0) { $0 + max(0, ($1.finishedAt ?? $1.startedAt).timeIntervalSince($1.startedAt) / 60) }
            case .volume:
                value = matches.reduce(0) { $0 + $1.volume }
            case .workouts:
                value = Double(matches.count)
            }
            return GymDayValue(date: date, value: value)
        }
    }

    private var totalText: String {
        let total = values.reduce(0) { $0 + $1.value }
        switch metric {
        case .duration: return total >= 60 ? "\(Int(total) / 60)h \(Int(total) % 60)m" : "\(Int(total))m"
        case .volume: return total >= 1_000 ? String(format: "%.1fk kg", total / 1_000) : "\(total.whole) kg"
        case .workouts: return "\(Int(total))"
        }
    }

    var body: some View {
        ErrdayCard {
            Text("Weekly activity").font(.system(size: 18, weight: .semibold))
            Text(totalText).font(.system(size: 28, weight: .semibold))
            Chart(values) { item in
                AreaMark(x: .value("Day", item.date, unit: .day), y: .value(metric.rawValue, item.value))
                    .foregroundStyle(.linearGradient(colors: [ErrdayTheme.gymAccent.opacity(0.22), .clear], startPoint: .top, endPoint: .bottom))
                LineMark(x: .value("Day", item.date, unit: .day), y: .value(metric.rawValue, item.value))
                    .foregroundStyle(ErrdayTheme.gymAccent).lineStyle(.init(lineWidth: 2))
                PointMark(x: .value("Day", item.date, unit: .day), y: .value(metric.rawValue, item.value))
                    .foregroundStyle(ErrdayTheme.surface).symbolSize(36)
                    .annotation(position: .overlay) { Circle().stroke(ErrdayTheme.gymAccent, lineWidth: 2).frame(width: 8, height: 8) }
            }
            .chartXAxis {
                AxisMarks(values: .stride(by: .day)) { value in
                    AxisValueLabel(format: .dateTime.weekday(.narrow))
                }
            }
            .chartYAxis(.hidden)
            .frame(height: 132)

            HStack(spacing: 8) {
                ForEach(GymChartMetric.allCases) { item in
                    Button { withAnimation(.snappy) { metric = item } } label: {
                        Label(item.rawValue, systemImage: item.symbol)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(metric == item ? .white : ErrdayTheme.secondary)
                            .frame(maxWidth: .infinity, minHeight: 36)
                            .background(metric == item ? ErrdayTheme.gymAccent : ErrdayTheme.raised,
                                        in: RoundedRectangle(cornerRadius: 8))
                    }.buttonStyle(.plain)
                }
            }
        }
    }
}

struct GymInsightsCard: View {
    let workouts: [Workout]
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Training insights").font(.system(size: 18, weight: .semibold))
            ErrdayCard {
                insightLink("Weekly muscle map", note: "See which muscles you trained", symbol: "figure.strengthtraining.traditional") {
                    WeeklyMuscleMapView(workouts: workouts)
                }
                Divider().overlay(ErrdayTheme.border)
                insightLink("Muscle & rep distribution", note: "Volume, sets and rep ranges", symbol: "chart.bar.xaxis") {
                    TrainingDistributionView(workouts: workouts)
                }
                Divider().overlay(ErrdayTheme.border)
                insightLink("Calendar & workout log", note: "Patterns across weeks and months", symbol: "calendar") {
                    WorkoutLogDashboardView(workouts: workouts)
                }
            }
        }
    }

    private func insightLink<Destination: View>(_ title: String, note: String, symbol: String,
                                                 @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination) {
            HStack(spacing: 12) {
                Image(systemName: symbol).font(.system(size: 17, weight: .medium)).foregroundStyle(ErrdayTheme.gymAccent).frame(width: 28)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.system(size: 14, weight: .semibold)).foregroundStyle(ErrdayTheme.text)
                    Text(note).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.quiet)
            }.frame(minHeight: 46).contentShape(Rectangle())
        }.buttonStyle(.plain)
    }
}

struct WorkoutHistoryCard: View {
    let workout: Workout
    private var duration: Int { Int(max(0, (workout.finishedAt ?? workout.startedAt).timeIntervalSince(workout.startedAt)) / 60) }
    var body: some View {
        ErrdayCard {
            HStack(spacing: 12) {
                Image(systemName: "dumbbell.fill")
                    .font(.system(size: 16)).foregroundStyle(ErrdayTheme.gymAccent)
                    .frame(width: 38, height: 38).background(ErrdayTheme.gymAccent.opacity(0.10), in: RoundedRectangle(cornerRadius: 8))
                VStack(alignment: .leading, spacing: 4) {
                    Text(workout.name).font(.system(size: 15, weight: .semibold))
                    Text(workout.startedAt, format: .dateTime.day().month(.abbreviated).year())
                        .font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(workout.completedSets) sets").font(.system(size: 12, weight: .medium))
                    Text("\(duration)m · \(workout.volume.whole) kg").font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                }
            }
        }
    }
}

private struct ExercisePerformance: Identifiable {
    let name: String
    let sessions: Int
    let completedSets: Int
    let bestWeight: Double
    let estimatedOneRepMax: Double
    let lastTrained: Date
    var id: String { name.lowercased() }
}

private func exercisePerformances(_ workouts: [Workout]) -> [ExercisePerformance] {
    struct Entry { let date: Date; let weight: Double; let reps: Int }
    var grouped: [String: (name: String, entries: [Entry], sessions: Set<String>)] = [:]
    for workout in workouts {
        for exercise in workout.exercises {
            let name = exercise.name.trimmingCharacters(in: .whitespacesAndNewlines)
            let key = name.lowercased()
            let entries = exercise.sets.filter(\.completed).map { Entry(date: workout.startedAt, weight: $0.weight, reps: $0.repetitions) }
            guard !entries.isEmpty else { continue }
            if grouped[key] == nil { grouped[key] = (name, [], []) }
            grouped[key]?.entries.append(contentsOf: entries)
            grouped[key]?.sessions.insert("\(workout.startedAt.timeIntervalSince1970)")
        }
    }
    return grouped.values.map { value in
        ExercisePerformance(
            name: value.name,
            sessions: value.sessions.count,
            completedSets: value.entries.count,
            bestWeight: value.entries.map(\.weight).max() ?? 0,
            estimatedOneRepMax: value.entries.map { $0.weight * (1 + Double($0.reps) / 30) }.max() ?? 0,
            lastTrained: value.entries.map(\.date).max() ?? .distantPast
        )
    }.sorted {
        if $0.lastTrained != $1.lastTrained { return $0.lastTrained > $1.lastTrained }
        return $0.completedSets > $1.completedSets
    }
}

struct ExerciseProgressSummaryCard: View {
    let workouts: [Workout]
    private var performances: [ExercisePerformance] { Array(exercisePerformances(workouts).prefix(3)) }
    var body: some View {
        ErrdayCard {
            if performances.isEmpty {
                EmptySection(title: "No progression yet", symbol: "chart.line.uptrend.xyaxis", message: "Complete workouts or import your Lyfta history to see exercise progress.")
            } else {
                ForEach(Array(performances.enumerated()), id: \.element.id) { index, item in
                    HStack(spacing: 12) {
                        Image(systemName: "chart.line.uptrend.xyaxis").foregroundStyle(ErrdayTheme.gymAccent).frame(width: 24)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.name).font(.system(size: 14, weight: .semibold)).foregroundStyle(ErrdayTheme.text).lineLimit(1)
                            Text("\(item.sessions) sessions · \(item.completedSets) sets").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 3) {
                            Text("\(item.bestWeight.decimal) kg").font(.system(size: 14, weight: .semibold)).foregroundStyle(ErrdayTheme.text)
                            Text("Best weight").font(.caption2).foregroundStyle(ErrdayTheme.quiet)
                        }
                        Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.quiet)
                    }.frame(minHeight: 48)
                    if index < performances.count - 1 { Divider().overlay(ErrdayTheme.border) }
                }
            }
        }
    }
}

private struct ExerciseSessionBest: Identifiable {
    let date: Date
    let weight: Double
    let estimatedOneRepMax: Double
    var id: Date { date }
}

struct ExerciseProgressView: View {
    let workouts: [Workout]
    @State private var search = ""
    private var performances: [ExercisePerformance] {
        let all = exercisePerformances(workouts)
        return search.isEmpty ? all : all.filter { $0.name.localizedCaseInsensitiveContains(search) }
    }
    var body: some View {
        ErrdayPage {
            TextField("Search exercises", text: $search)
                .textFieldStyle(.plain).padding(12)
                .errdaySurface()
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(ErrdayTheme.border))
            if performances.isEmpty {
                ErrdayCard { EmptySection(title: "No exercise data", symbol: "chart.line.uptrend.xyaxis", message: "Completed sets will appear here.") }
            } else {
                ForEach(performances) { item in
                    NavigationLink { ExerciseProgressDetailView(name: item.name, workouts: workouts) } label: {
                        ErrdayCard {
                            HStack {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(item.name).font(.system(size: 15, weight: .semibold)).foregroundStyle(ErrdayTheme.text)
                                    Text("Last trained \(item.lastTrained.formatted(date: .abbreviated, time: .omitted)) · \(item.sessions) sessions")
                                        .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text("\(item.bestWeight.decimal) kg").font(.system(size: 15, weight: .semibold)).foregroundStyle(ErrdayTheme.text)
                                    Text("e1RM \(item.estimatedOneRepMax.whole) kg").font(.caption2).foregroundStyle(ErrdayTheme.secondary)
                                }
                                Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.quiet)
                            }
                        }
                    }.buttonStyle(.plain)
                }
            }
        }
        .navigationTitle("Exercise progress")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ExerciseProgressDetailView: View {
    let name: String
    let workouts: [Workout]
    private var sessions: [ExerciseSessionBest] {
        workouts.compactMap { workout in
            let sets = workout.exercises
                .filter { $0.name.trimmingCharacters(in: .whitespacesAndNewlines).caseInsensitiveCompare(name) == .orderedSame }
                .flatMap(\.sets).filter(\.completed)
            guard !sets.isEmpty else { return nil }
            return ExerciseSessionBest(
                date: workout.startedAt,
                weight: sets.map(\.weight).max() ?? 0,
                estimatedOneRepMax: sets.map { $0.weight * (1 + Double($0.repetitions) / 30) }.max() ?? 0
            )
        }.sorted { $0.date < $1.date }
    }
    var body: some View {
        ErrdayPage {
            if let best = sessions.max(by: { $0.estimatedOneRepMax < $1.estimatedOneRepMax }) {
                HStack(spacing: 10) {
                    GymMetric(title: "Best weight", value: "\(best.weight.decimal) kg")
                    GymMetric(title: "Estimated 1RM", value: "\(best.estimatedOneRepMax.whole) kg")
                    GymMetric(title: "Sessions", value: "\(sessions.count)")
                }
            }
            ErrdayCard {
                Text("Progress").font(.system(size: 18, weight: .semibold))
                if sessions.count > 1 {
                    Chart(sessions) { item in
                        LineMark(x: .value("Date", item.date), y: .value("Estimated 1RM", item.estimatedOneRepMax))
                            .foregroundStyle(ErrdayTheme.gymAccent).lineStyle(.init(lineWidth: 2))
                        PointMark(x: .value("Date", item.date), y: .value("Estimated 1RM", item.estimatedOneRepMax))
                            .foregroundStyle(ErrdayTheme.gymAccent)
                    }.frame(height: 210)
                } else {
                    Text("Complete this exercise again to build a progress chart.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                }
            }
            Text("Session bests").font(.system(size: 18, weight: .semibold))
            ErrdayCard {
                ForEach(sessions.reversed()) { item in
                    HStack {
                        Text(item.date.formatted(date: .abbreviated, time: .omitted)).font(.system(size: 13))
                        Spacer()
                        Text("\(item.weight.decimal) kg").font(.system(size: 13, weight: .semibold))
                        Text("e1RM \(item.estimatedOneRepMax.whole)").font(.caption).foregroundStyle(ErrdayTheme.secondary).frame(width: 72, alignment: .trailing)
                    }.frame(minHeight: 38)
                }
            }
        }
        .navigationTitle(name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct MuscleTrainingTotal: Identifiable {
    let muscle: MuscleGroup
    let sets: Int
    let volume: Double
    var id: String { muscle.id }
}

private func muscleTotals(_ workouts: [Workout], interval: DateInterval? = nil) -> [MuscleTrainingTotal] {
    var values: [MuscleGroup: (sets: Int, volume: Double)] = [:]
    for workout in workouts where interval?.contains(workout.startedAt) ?? true {
        for exercise in workout.exercises {
            guard let muscle = ExerciseCatalog.muscle(for: exercise) else { continue }
            let completed = exercise.sets.filter(\.completed)
            values[muscle, default: (0, 0)].sets += completed.count
            values[muscle, default: (0, 0)].volume += completed.reduce(0) { $0 + $1.weight * Double($1.repetitions) }
        }
    }
    return MuscleGroup.allCases.map { muscle in
        let value = values[muscle] ?? (0, 0)
        return MuscleTrainingTotal(muscle: muscle, sets: value.sets, volume: value.volume)
    }.filter { $0.sets > 0 }.sorted { $0.volume > $1.volume }
}

struct WeeklyMuscleMapView: View {
    let workouts: [Workout]
    @State private var weekOffset = 0
    private var interval: DateInterval? {
        guard let current = Calendar.current.date(byAdding: .weekOfYear, value: weekOffset, to: .now) else { return nil }
        return Calendar.current.dateInterval(of: .weekOfYear, for: current)
    }
    private var totals: [MuscleTrainingTotal] { muscleTotals(workouts, interval: interval) }
    private var dateText: String {
        guard let interval else { return "" }
        let end = interval.end.addingTimeInterval(-1)
        return "\(interval.start.formatted(.dateTime.day().month(.abbreviated)))–\(end.formatted(.dateTime.day().month(.abbreviated).year()))"
    }
    var body: some View {
        ErrdayPage {
            HStack {
                Button { weekOffset -= 1 } label: { Image(systemName: "chevron.left") }
                Spacer(); Text(dateText).font(.system(size: 15, weight: .semibold)); Spacer()
                Button { weekOffset += 1 } label: { Image(systemName: "chevron.right") }.disabled(weekOffset >= 0)
            }.foregroundStyle(ErrdayTheme.gymAccent)
            VStack(spacing: 12) {
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.system(size: 88, weight: .light)).foregroundStyle(ErrdayTheme.gymAccent)
                Text("Muscles trained").font(.system(size: 18, weight: .semibold))
                Text("Based on completed sets in this week").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            }.frame(maxWidth: .infinity)
            if totals.isEmpty {
                ErrdayCard { EmptySection(title: "No training this week", symbol: "figure.strengthtraining.traditional", message: "Completed sets will appear on this map.") }
            } else {
                ErrdayCard {
                    ForEach(totals) { total in
                        MuscleTotalRow(total: total, maximum: totals.map(\.volume).max() ?? 1)
                    }
                }
            }
        }
        .navigationTitle("Weekly muscle map")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct MuscleTotalRow: View {
    let total: MuscleTrainingTotal
    let maximum: Double
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: total.muscle.symbol).foregroundStyle(ErrdayTheme.gymAccent).frame(width: 24)
            VStack(alignment: .leading, spacing: 6) {
                HStack { Text(total.muscle.rawValue).font(.system(size: 14, weight: .semibold)); Spacer(); Text("\(total.sets) sets").font(.caption).foregroundStyle(ErrdayTheme.secondary) }
                ProgressView(value: maximum > 0 ? total.volume / maximum : 0).tint(ErrdayTheme.gymAccent)
                Text("\(total.volume.whole) kg volume").font(.caption2).foregroundStyle(ErrdayTheme.quiet)
            }
        }.padding(.vertical, 3)
    }
}

struct TrainingDistributionView: View {
    let workouts: [Workout]
    @State private var mode = DistributionMode.muscles
    enum DistributionMode: String, CaseIterable, Identifiable { case muscles = "Muscles", repetitions = "Rep ranges"; var id: String { rawValue } }
    private var totals: [MuscleTrainingTotal] { muscleTotals(workouts) }
    private var repCounts: [(String, Int)] {
        var values = ["1–3": 0, "4–7": 0, "8–12": 0, "13+": 0]
        for set in workouts.flatMap(\.exercises).flatMap(\.sets).filter(\.completed) {
            let key = set.repetitions <= 3 ? "1–3" : set.repetitions <= 7 ? "4–7" : set.repetitions <= 12 ? "8–12" : "13+"
            values[key, default: 0] += 1
        }
        return ["1–3", "4–7", "8–12", "13+"].map { ($0, values[$0] ?? 0) }
    }
    var body: some View {
        ErrdayPage {
            Picker("Distribution", selection: $mode) { ForEach(DistributionMode.allCases) { Text($0.rawValue).tag($0) } }.pickerStyle(.segmented)
            if mode == .muscles {
                if totals.isEmpty { ErrdayCard { EmptySection(title: "No muscle data", symbol: "chart.bar", message: "Finish a workout to see your split.") } }
                ForEach(totals) { total in
                    ErrdayCard { MuscleTotalRow(total: total, maximum: totals.map(\.volume).max() ?? 1) }
                }
            } else {
                ErrdayCard {
                    ForEach(repCounts, id: \.0) { range, count in
                        VStack(alignment: .leading, spacing: 7) {
                            HStack { Text("\(range) repetitions").font(.system(size: 14, weight: .semibold)); Spacer(); Text("\(count) sets").font(.caption).foregroundStyle(ErrdayTheme.secondary) }
                            ProgressView(value: Double(count), total: Double(max(1, repCounts.map(\.1).max() ?? 1))).tint(ErrdayTheme.gymAccent)
                        }.padding(.vertical, 4)
                    }
                }
            }
        }
        .navigationTitle("Training distribution")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct WorkoutLogDashboardView: View {
    let workouts: [Workout]
    private var recentDays: [Date] {
        let start = Calendar.current.date(byAdding: .day, value: -83, to: Calendar.current.startOfDay(for: .now)) ?? .now
        return (0..<84).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: start) }
    }
    var body: some View {
        ErrdayPage {
            ErrdayCard {
                Text(Date.now.formatted(.dateTime.month(.wide).year())).font(.system(size: 18, weight: .semibold))
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 8) {
                    ForEach(Array(["M", "T", "W", "T", "F", "S", "S"].enumerated()), id: \.offset) { _, label in
                        Text(label).font(.caption2).foregroundStyle(ErrdayTheme.secondary)
                    }
                    ForEach(Array(currentMonthSlots.enumerated()), id: \.offset) { _, date in
                        if let date {
                            let hasWorkout = workouts.contains { Calendar.current.isDate($0.startedAt, inSameDayAs: date) }
                            Text("\(Calendar.current.component(.day, from: date))").font(.system(size: 12, weight: hasWorkout ? .semibold : .regular))
                                .frame(width: 30, height: 30)
                                .background(hasWorkout ? ErrdayTheme.gymAccent : .clear, in: Circle())
                                .foregroundStyle(hasWorkout ? .white : ErrdayTheme.text)
                        } else {
                            Color.clear.frame(width: 30, height: 30)
                        }
                    }
                }
            }
            VStack(alignment: .leading, spacing: 12) {
                Text("Last 12 weeks").font(.system(size: 18, weight: .semibold))
                ErrdayCard {
                    LazyVGrid(columns: Array(repeating: GridItem(.fixed(10), spacing: 4), count: 14), spacing: 4) {
                        ForEach(recentDays, id: \.self) { date in
                            let count = workouts.filter { Calendar.current.isDate($0.startedAt, inSameDayAs: date) }.count
                            RoundedRectangle(cornerRadius: 2).fill(count > 0 ? ErrdayTheme.gymAccent : ErrdayTheme.border).frame(width: 10, height: 10)
                        }
                    }
                    Text("\(workouts.count) completed workouts").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                }
            }
            Text("Workout log").font(.system(size: 18, weight: .semibold))
            if workouts.isEmpty { ErrdayCard { EmptySection(title: "No workouts yet", symbol: "calendar", message: "Your completed sessions will appear here.") } }
            ForEach(workouts.sorted { $0.startedAt > $1.startedAt }) { WorkoutHistoryCard(workout: $0) }
        }
        .navigationTitle("Calendar & workout log")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var currentMonthSlots: [Date?] {
        let calendar = Calendar.current
        guard let interval = calendar.dateInterval(of: .month, for: .now),
              let days = calendar.range(of: .day, in: .month, for: .now) else { return [] }
        let weekday = calendar.component(.weekday, from: interval.start)
        let mondayFirstOffset = (weekday + 5) % 7
        let dates = days.compactMap { calendar.date(byAdding: .day, value: $0 - 1, to: interval.start) }
        return Array(repeating: nil, count: mondayFirstOffset) + dates.map(Optional.some)
    }
}
