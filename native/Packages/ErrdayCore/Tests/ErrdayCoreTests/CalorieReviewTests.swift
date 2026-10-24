import Foundation
import Testing
@testable import ErrdayCore

struct CalorieReviewTests {
    private var calendar: Calendar {
        var result = Calendar(identifier: .gregorian)
        result.timeZone = TimeZone(identifier: "Europe/Zurich")!
        return result
    }
    private var today: Date { calendar.date(from: DateComponents(year: 2026, month: 11, day: 15, hour: 12))! }
    private func day(_ offset: Int, hour: Int = 8) -> Date {
        let date = calendar.date(byAdding: .day, value: offset, to: today)!
        return calendar.date(bySettingHour: hour, minute: 0, second: 0, of: date)!
    }
    private func data(gain: Double = 0) -> PersonalData {
        var result = PersonalData()
        var profile = PersonalProfile()
        profile.goal = "Build muscle"; profile.weight = 76; profile.weeklyGainGoalKG = 0.2
        result.profile = profile; result.weightGoalKilograms = 90
        result.calorieGoal = 3_000; result.proteinGoal = 160; result.carbsGoal = 410; result.fatGoal = 80
        result.calorieReviewStartedAt = day(-14, hour: 0)
        result.weightEntries = (1...14).map {
            WeightEntry(date: day(-$0), kilograms: $0 <= 7 ? 76 + gain : 76, isMorning: true)
        }
        return result
    }

    @Test func slowGainProducesOneSmallIncreaseThenStartsAnotherObservation() throws {
        var data = data()
        #expect(CalorieReview.evaluate(data: data, on: today, calendar: calendar).decision == .increase)
        let applied = data.applyCalorieReview(on: today, calendar: calendar)
        #expect(applied)
        #expect(data.calorieGoal == 3_150)
        #expect(data.carbsGoal == 447.5)
        #expect(data.proteinGoal == 160)
        #expect(data.fatGoal == 80)
        #expect(data.calorieAdjustments?.count == 1)
        #expect(CalorieReview.evaluate(data: data, on: today, calendar: calendar).decision == .observing)
        let appliedAgain = data.applyCalorieReview(on: today, calendar: calendar)
        #expect(!appliedAgain)
        #expect(data.calorieGoal == 3_150)
        let restored = try JSONDecoder().decode(PersonalData.self, from: JSONEncoder().encode(data))
        #expect(restored.calorieAdjustments == data.calorieAdjustments)
        #expect(restored.calorieReviewStartedAt == data.calorieReviewStartedAt)
    }

    @Test func noIncreaseBeforeTwoWeeksOrWithInsufficientMorningDays() {
        var data = data()
        data.calorieReviewStartedAt = day(-13, hour: 0)
        #expect(CalorieReview.evaluate(data: data, on: today, calendar: calendar).decision == .observing)
        data.calorieReviewStartedAt = day(-14, hour: 0)
        data.weightEntries = (1...14).map { WeightEntry(date: day(-$0, hour: 19), kilograms: 76, isMorning: false) }
        #expect(CalorieReview.evaluate(data: data, on: today, calendar: calendar).decision == .needsWeighIns)
        data.weightEntries = Array(repeating: WeightEntry(date: day(-1), kilograms: 76, isMorning: true), count: 14)
        #expect(CalorieReview.evaluate(data: data, on: today, calendar: calendar).decision == .needsWeighIns)
    }

    @Test func atPaceAndFastGainNeverReduceCalories() {
        var onTrack = data(gain: 0.2)
        #expect(CalorieReview.evaluate(data: onTrack, on: today, calendar: calendar).decision == .keep)
        let appliedOnTrack = onTrack.applyCalorieReview(on: today, calendar: calendar)
        #expect(!appliedOnTrack)
        var fast = data(gain: 0.8)
        #expect(CalorieReview.evaluate(data: fast, on: today, calendar: calendar).decision == .fasterGain)
        let appliedFast = fast.applyCalorieReview(on: today, calendar: calendar)
        #expect(!appliedFast)
        #expect(fast.calorieGoal == 3_000)
    }

    @Test func lowLoggedIntakeAndReachedGoalsPreventAnIncrease() {
        var data = data()
        data.meals = (1...14).map {
            MealEntry(date: day(-$0, hour: 19), name: "Logged daily food", calories: 2_400, protein: 120, carbs: 300, fat: 60)
        }
        #expect(CalorieReview.evaluate(data: data, on: today, calendar: calendar).decision == .checkIntake)
        data.weightGoalKilograms = 75
        #expect(CalorieReview.evaluate(data: data, on: today, calendar: calendar).decision == .goalReached)
    }

    @Test func currentAndFutureDaysCannotDistortTheCompletedWeeks() throws {
        var data = data(gain: 0.2)
        data.weightEntries?.append(WeightEntry(date: day(0), kilograms: 100, isMorning: true))
        data.weightEntries?.append(WeightEntry(date: day(1), kilograms: 100, isMorning: true))
        let result = CalorieReview.evaluate(data: data, on: today, calendar: calendar)
        #expect(result.decision == .keep)
        #expect(abs(try #require(result.trend).weeklyChange - 0.2) < 0.001)
    }

    @Test func extremeRequestedPaceIsNotChasedAndMacroMismatchCannotBeApplied() {
        var data = data()
        data.profile?.weeklyGainGoalKG = 1
        let review = CalorieReview.evaluate(data: data, on: today, calendar: calendar)
        #expect((review.comparisonGainKG ?? 1) <= 76 * 0.005)
        data.carbsGoal = 1
        let applied = data.applyCalorieReview(on: today, calendar: calendar)
        #expect(!applied)
        #expect(data.calorieGoal == 3_000)
    }
}
