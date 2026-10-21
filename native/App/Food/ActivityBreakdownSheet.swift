import SwiftUI

struct ActivityBreakdownSheet: View {
    @Environment(HealthStore.self) private var health
    @Environment(\.dismiss) private var dismiss

    let date: Date
    let weightKG: Double?

    private var distanceKM: Double? { health.value("distance", on: date) }
    private var walkingCalories: Double? { health.walkingCalories(on: date, weightKG: weightKG) }
    private var gymCalories: Double? { health.gymCalories(on: date, weightKG: weightKG) }
    private var hasEstimate: Bool { walkingCalories != nil || gymCalories != nil }
    private var uncappedCalories: Double { (walkingCalories ?? 0) + (gymCalories ?? 0) }
    private var foodGoalAddition: Double { health.foodActivityCalories(on: date, weightKG: weightKG) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if hasEstimate {
                        ErrdayCard {
                            Label("Added to food goal", systemImage: "figure.move")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(ErrdayTheme.accent)
                            HStack(alignment: .firstTextBaseline, spacing: 5) {
                                Text(foodGoalAddition.whole)
                                    .font(.system(size: 36, weight: .semibold))
                                Text("kcal estimated")
                                    .font(.system(size: 14))
                                    .foregroundStyle(ErrdayTheme.secondary)
                            }
                            if uncappedCalories > foodGoalAddition {
                                Text("The daily food-goal addition is capped at 2,000 kcal.")
                                    .font(.system(size: 12))
                                    .foregroundStyle(ErrdayTheme.secondary)
                            } else {
                                Text("Walking and gym estimates are added to today's food goal.")
                                    .font(.system(size: 12))
                                    .foregroundStyle(ErrdayTheme.secondary)
                            }
                        }
                    } else {
                        ErrdayCard {
                            EmptySection(title: "No activity estimate", symbol: "figure.walk",
                                         message: "Walking distance or a strength workout is needed for this day.")
                        }
                    }

                    ErrdayCard {
                        Label("Walking", systemImage: "figure.walk")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(ErrdayTheme.accent)
                        Text(walkingCalories.map { "\($0.whole) kcal" } ?? "—")
                            .font(.system(size: 23, weight: .semibold))
                        if let distanceKM, distanceKM > 0, let weightKG, weightKG > 0 {
                            Text("Estimated from \(distanceKM.decimal) km walking/running distance and \(weightKG.decimal) kg body weight.")
                                .font(.system(size: 12))
                                .foregroundStyle(ErrdayTheme.secondary)
                        } else {
                            Text("Needs walking/running distance and body weight.")
                                .font(.system(size: 12))
                                .foregroundStyle(ErrdayTheme.secondary)
                        }
                    }

                    ErrdayCard {
                        Label("Gym", systemImage: "dumbbell.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(ErrdayTheme.accent)
                        Text(gymCalories.map { "\($0.whole) kcal" } ?? "—")
                            .font(.system(size: 23, weight: .semibold))
                        Text(gymCalories == nil
                             ? "No usable strength-workout energy for this day."
                             : "Estimated from strength workouts in Apple Health. Uses plausible recorded energy or workout duration and body weight.")
                            .font(.system(size: 12))
                            .foregroundStyle(ErrdayTheme.secondary)
                        if gymCalories != nil {
                            Text("Overlapping imports count once; gym energy is capped at 350 kcal per day.")
                                .font(.system(size: 12))
                                .foregroundStyle(ErrdayTheme.secondary)
                        }
                    }
                }
                .padding(20)
            }
            .errdayBackground()
            .foregroundStyle(ErrdayTheme.text)
            .navigationTitle("Activity details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
}
