import Foundation
import Testing
@testable import ErrdayCore

struct DailyGoalStreakTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Zurich")!
        return calendar
    }

    private var today: Date {
        calendar.date(from: DateComponents(year: 2026, month: 10, day: 19, hour: 12))!
    }

    private func date(daysAgo: Int) -> Date {
        calendar.date(byAdding: .day, value: -daysAgo, to: today)!
    }

    private func meal(daysAgo: Int, calories: Double) -> MealEntry {
        MealEntry(date: date(daysAgo: daysAgo), name: "Food", calories: calories, protein: 0, carbs: 0, fat: 0)
    }

    private func completedChecklist(daysAgo: Int) -> DailyChecklistEntry {
        DailyChecklistEntry(
            date: date(daysAgo: daysAgo),
            completed: Set(DailyChecklistItem.supplementItems)
        )
    }

    @Test func requiresCaloriesAndTheCompleteChecklist() {
        var data = PersonalData()
        data.calorieGoal = 2_000
        data.meals = [meal(daysAgo: 0, calories: 2_000)]
        #expect(data.dailyGoalStreak(on: today, calendar: calendar) == 0)

        data.dailyChecklist = [completedChecklist(daysAgo: 0)]
        #expect(data.dailyGoalStreak(on: today, calendar: calendar) == 1)

        data.meals[0].calories = 1_999
        #expect(data.dailyGoalStreak(on: today, calendar: calendar) == 0)
    }

    @Test func todaysUnfinishedGoalsKeepYesterdaysStreakVisible() {
        var data = PersonalData()
        data.calorieGoal = 2_000
        data.meals = [meal(daysAgo: 1, calories: 2_050), meal(daysAgo: 2, calories: 2_000)]
        data.dailyChecklist = [completedChecklist(daysAgo: 1), completedChecklist(daysAgo: 2)]
        #expect(data.dailyGoalStreak(on: today, calendar: calendar) == 2)

        data.meals.append(meal(daysAgo: 0, calories: 2_100))
        #expect(data.dailyGoalStreak(on: today, calendar: calendar) == 2)

        data.dailyChecklist?.append(completedChecklist(daysAgo: 0))
        #expect(data.dailyGoalStreak(on: today, calendar: calendar) == 3)
    }

    @Test func aMissedGoalOnAFullDayBreaksTheStreak() {
        var data = PersonalData()
        data.calorieGoal = 2_000
        data.meals = [meal(daysAgo: 0, calories: 2_000), meal(daysAgo: 2, calories: 2_000)]
        data.dailyChecklist = [completedChecklist(daysAgo: 0), completedChecklist(daysAgo: 2)]
        #expect(data.dailyGoalStreak(on: today, calendar: calendar) == 1)
    }

    @Test func activityCaloriesIncreaseTheRequiredGoal() {
        var data = PersonalData()
        data.calorieGoal = 2_000
        data.meals = [meal(daysAgo: 0, calories: 2_250)]
        data.dailyChecklist = [completedChecklist(daysAgo: 0)]

        #expect(data.dailyGoalStreak(on: today, calendar: calendar, calorieAdjustment: { _ in 300 }) == 0)
        data.meals[0].calories = 2_300
        #expect(data.dailyGoalStreak(on: today, calendar: calendar, calorieAdjustment: { _ in 300 }) == 1)
    }

    @Test func localMidnightAndDaylightSavingUseCalendarDays() {
        for components in [DateComponents(year: 2026, month: 3, day: 30),
                           DateComponents(year: 2026, month: 10, day: 26)] {
            let midnight = calendar.date(from: components)!
            var data = PersonalData()
            data.calorieGoal = 2_000
            data.meals = (0...2).map { offset in
                MealEntry(
                    date: calendar.date(byAdding: .day, value: -offset, to: midnight)!,
                    name: "Food",
                    calories: 2_000,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                )
            }
            data.dailyChecklist = (0...2).map { offset in
                DailyChecklistEntry(
                    date: calendar.date(byAdding: .day, value: -offset, to: midnight)!,
                    completed: Set(DailyChecklistItem.supplementItems)
                )
            }
            #expect(data.dailyGoalStreak(on: midnight, calendar: calendar) == 3)
            #expect(data.dailyGoalStreak(on: midnight.addingTimeInterval(-1), calendar: calendar) == 2)
        }
    }
}
