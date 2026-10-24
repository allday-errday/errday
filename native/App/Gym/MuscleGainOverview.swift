import SwiftUI
import ErrdayCore

struct MuscleGainOverview: View {
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health

    private var trend: WeightGainTrend? {
        let localDays = Set(records.weightEntries.map { Calendar.current.startOfDay(for: $0.date) })
        let healthEntries = health.values("weight", days: 14).compactMap { metric -> WeightEntry? in
            guard !localDays.contains(Calendar.current.startOfDay(for: metric.date)), let value = metric.value else { return nil }
            return WeightEntry(date: metric.date, kilograms: value)
        }
        return WeightGainTrend.evaluate(entries: records.weightEntries + healthEntries)
    }

    var body: some View {
        ErrdayCard {
            HStack {
                Text("Muscle-gain plan").font(.system(size: 15, weight: .semibold))
                Spacer()
                NavigationLink("Edit goals") { NutritionGoalsView() }
                    .font(.system(size: 13)).foregroundStyle(ErrdayTheme.gymAccent)
            }
            HStack(alignment: .firstTextBaseline) {
                Text(records.data.weightGoalKilograms.map { "Goal \($0.decimal) kg" } ?? "Set a weight goal")
                    .font(.system(size: 21, weight: .semibold))
                Spacer()
                if let pace = records.data.profile?.weeklyGainGoalKG {
                    Text("\(pace.decimal) kg/week").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                }
            }
            if let trend {
                LabeledContent("7-day average", value: "\(trend.currentAverage.decimal) kg")
                LabeledContent("Change vs previous week", value: "\(trend.weeklyChange > 0 ? "+" : "")\(trend.weeklyChange.decimal) kg")
                Text(trendMessage(trend)).font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            } else {
                Text("Log weight on at least 3 separate days in each of two weeks to see your trend. Compare similar morning weigh-ins.")
                    .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            }
            if let calories = records.data.calorieGoal, let protein = records.data.proteinGoal {
                Divider()
                Text("Daily plan · \(calories.whole) kcal · \(protein.whole) g protein")
                    .font(.system(size: 13))
                Text("Keep your nutrition plan on rest days too. Review 2–3 weeks of weight and training progress before adjusting calories.")
                    .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            }
            Divider()
            WeightCalibrationSection()
        }
    }

    private func trendMessage(_ trend: WeightGainTrend) -> String {
        guard let weight = records.data.profile?.weight else { return "Weight change includes water and fat as well as muscle." }
        if trend.weeklyChange > weight * 0.005 {
            return "Faster than a conservative muscle-gain pace. If this continues for 2–3 weeks, review your calorie surplus. Weight change is not all muscle."
        }
        if trend.weeklyChange < weight * 0.001 {
            return "Little weight gain recorded. If this continues for 2–3 weeks with consistent food tracking, consider a small calorie increase."
        }
        return "Weight is rising gradually. Keep monitoring strength and your weekly average; water changes can affect short-term results."
    }
}
