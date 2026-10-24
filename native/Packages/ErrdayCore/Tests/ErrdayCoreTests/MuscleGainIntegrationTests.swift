import Foundation
import Testing
@testable import ErrdayCore

@Test func calculatedNutritionDoesNotCountActivityTwice() throws {
    let plan = try #require(NutritionEstimate.muscleGain(
        age: 20, heightCM: 191, weightKG: 76.7, metabolicReference: "male", activityLevel: "active",
        weeklyGainKG: 0.5, trainingDaysPerWeek: 5, usualDailySteps: 10_000
    ))
    #expect(plan.surplusCalories <= plan.maintenanceCalories * 0.100_001)
    #expect(abs(plan.protein * 4 + plan.carbs * 4 + plan.fat * 9 - plan.targetCalories) < 0.01)
    let data = PersonalData()
    #expect(data.calorieActivityAddition(300) == 0)
    var manual = PersonalData()
    manual.addsActivityCalories = true
    #expect(manual.calorieActivityAddition(300) == 300)
    #expect(manual.calorieActivityAddition(.nan) == 0)
}

@Test func weightTrendRequiresBothWeeksAndDoesNotOverweightRepeatedWeighIns() throws {
    let calendar = Calendar(identifier: .gregorian)
    let today = calendar.startOfDay(for: .now).addingTimeInterval(43_200)
    func entry(_ daysAgo: Int, _ weight: Double) -> WeightEntry {
        .init(date: calendar.date(byAdding: .day, value: -daysAgo, to: today)!, kilograms: weight)
    }
    let previous = [entry(8, 76), entry(10, 76), entry(12, 76)]
    #expect(WeightGainTrend.evaluate(entries: previous, on: today, calendar: calendar) == nil)
    var entries = previous + [entry(0, 76.2), entry(2, 76.2), entry(4, 76.2)]
    entries += (0..<10).map { _ in entry(2, 76.2) }
    entries.append(entry(-1, 100))
    let trend = try #require(WeightGainTrend.evaluate(entries: entries, on: today, calendar: calendar))
    #expect(abs(trend.weeklyChange - 0.2) < 0.001)
}
