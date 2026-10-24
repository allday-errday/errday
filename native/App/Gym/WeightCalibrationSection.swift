import SwiftUI
import ErrdayCore

struct WeightCalibrationSection: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.errdayAccent) private var accent
    @State private var showWeightLog = false
    @State private var applyFailed = false

    private var review: CalorieReview { CalorieReview.evaluate(data: records.data) }
    private var number: FloatingPointFormatStyle<Double> { .number.precision(.fractionLength(2)) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Two-week calorie check").font(.system(size: 15, weight: .semibold))
                Spacer()
                Image(systemName: "chart.line.uptrend.xyaxis").foregroundStyle(accent).accessibilityHidden(true)
            }
            Text(statusTitle).font(.system(size: 20, weight: .semibold))
            if review.decision == .observing || review.decision == .needsWeighIns {
                ProgressView(value: Double(review.completedDays), total: 14).tint(accent)
                Text("\(review.completedDays)/14 completed days · morning weigh-ins \(review.firstWeekCount)/7 + \(review.secondWeekCount)/7")
                    .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                if let start = review.periodStart {
                    Text("Current plan since \(start.formatted(date: .abbreviated, time: .omitted))")
                        .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                }
            }
            if let trend = review.trend {
                LabeledContent("Previous week average", value: "\(trend.previousAverage.formatted(number)) kg")
                LabeledContent("Latest week average", value: "\(trend.currentAverage.formatted(number)) kg")
                LabeledContent("Weekly change", value: "\(trend.weeklyChange > 0 ? "+" : "")\(trend.weeklyChange.formatted(number)) kg")
                if let pace = review.comparisonGainKG {
                    LabeledContent("Compared with", value: "\(pace.formatted(number)) kg/week")
                }
            }
            Text(message).font(.system(size: 13)).foregroundStyle(ErrdayTheme.secondary)
            if let requested = review.requestedGainKG, let comparison = review.comparisonGainKG,
               requested > comparison + 0.001 {
                Text("Your selected \(requested.formatted(number)) kg/week is above 0.5% of body weight. The calorie check uses the lower \(comparison.formatted(number)) kg/week pace.")
                    .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            }
            if review.decision == .increase, let calories = records.data.calorieGoal {
                Text("\(calories.whole) → \((calories + CalorieReview.increaseCalories).whole) kcal/day")
                    .font(.system(size: 17, weight: .semibold))
                Text("+37.5 g carbs; protein and fat stay the same. Check that you've consistently eaten your current target before increasing it.")
                    .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                Button("Apply +150 kcal") {
                    applyFailed = !records.applyCalorieReview()
                }
                .buttonStyle(PrimaryButtonStyle())
                .accessibilityIdentifier("weightReview.applyIncrease")
                if applyFailed {
                    Text("The plan could not be updated. Review your saved calorie and macro targets, then try again.")
                        .font(.caption).foregroundStyle(.orange)
                }
            }
            HStack {
                Button("Log morning weight", systemImage: "plus") { showWeightLog = true }
                    .accessibilityIdentifier("weightReview.logWeight")
                Spacer()
                NavigationLink("History") { WeightHistoryView() }
            }
            .font(.system(size: 13)).foregroundStyle(accent).frame(minHeight: 44)
            if let last = records.data.calorieAdjustments?.last {
                Text("Last increase · \(last.date.formatted(date: .abbreviated, time: .omitted)) · \(last.previousCalories.whole) to \(last.newCalories.whole) kcal")
                    .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            }
        }
        .font(.system(size: 13))
        .sheet(isPresented: $showWeightLog) { WeightLogSheet(morning: true) }
        .onChange(of: records.data.calorieGoal) { applyFailed = false }
    }

    private var statusTitle: String {
        switch review.decision {
        case .needsPlan: "Set your muscle-gain plan"
        case .observing: "Building your weight trend"
        case .needsWeighIns: "A few more morning weights"
        case .keep: "Your pace is on track"
        case .increase: "A small increase could help"
        case .checkIntake: "Check your current intake first"
        case .fasterGain: "Gaining faster than planned"
        case .goalReached: "Your weight goal is reached"
        }
    }

    private var message: String {
        switch review.decision {
        case .needsPlan:
            "Save a calorie target and weekly gain pace under Nutrition Goals to start your check."
        case .observing, .needsWeighIns:
            "Track mornings after the bathroom and before food, in similar clothing. After 14 days on the same plan and at least 5 morning weigh-ins per week, we'll compare the two weekly averages."
        case .keep:
            "Keep your current calories. Your weekly average is close to your planned gain pace."
        case .increase:
            "Your weekly average is rising more slowly than the comparison pace. A 150 kcal increase is a small trial; after applying, another two-week observation starts."
        case .checkIntake:
            "Your food logs average below 90% of your current calorie target on at least 10 logged days. Check whether tracking is complete and reach your current target consistently before raising it."
        case .fasterGain:
            "Keep calories unchanged for now and review the trend. Water and glycogen can change weight quickly. Calories are never reduced automatically."
        case .goalReached:
            "No extra calories are suggested. Review your next weight goal and nutrition plan."
        }
    }
}
