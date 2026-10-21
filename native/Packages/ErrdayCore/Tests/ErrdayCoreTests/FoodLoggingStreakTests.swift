import Foundation
import Testing
@testable import ErrdayCore

struct FoodLoggingStreakTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Zurich")!
        return calendar
    }
    private var today: Date { calendar.date(from: DateComponents(year: 2026, month: 10, day: 19, hour: 12))! }
    private func meal(daysAgo: Int, source: MealSource = .manual) -> MealEntry {
        var meal = MealEntry(date: calendar.date(byAdding: .day, value: -daysAgo, to: today)!,
                             name: "Food", calories: 1, protein: 0, carbs: 0, fat: 0)
        meal.source = source
        return meal
    }

    @Test func countsAnyFoodOncePerDayRegardlessOfGoalOrSource() {
        var data = PersonalData()
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 0)
        for day in 1...6 {
            data.meals.append(meal(daysAgo: 6 - day, source: day.isMultiple(of: 2) ? .aiText : .database))
            let date = calendar.date(byAdding: .day, value: day - 6, to: today)!
            #expect(data.foodLoggingStreak(on: date, calendar: calendar) == day)
            data.meals.append(meal(daysAgo: 6 - day))
            #expect(data.foodLoggingStreak(on: date, calendar: calendar) == day)
        }
    }

    @Test func keepsYesterdayUntilTodaysFirstFoodThenIncrements() {
        var data = PersonalData()
        data.meals = [meal(daysAgo: 1), meal(daysAgo: 2), meal(daysAgo: 3)]
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 3)
        data.meals.append(meal(daysAgo: 0))
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 4)
    }

    @Test func aFullMissedDayBreaksTheStreakAndFutureMealsDoNotCount() {
        var data = PersonalData()
        data.meals = [meal(daysAgo: 2), meal(daysAgo: 3), meal(daysAgo: -1)]
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 0)
        data.meals.append(meal(daysAgo: 0))
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 1)
    }

    @Test func editingDeletingAndBackfillingRecalculatesFromSavedDays() {
        var data = PersonalData()
        data.meals = [meal(daysAgo: 0), meal(daysAgo: 2)]
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 1)
        data.meals.append(meal(daysAgo: 1))
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 3)
        data.meals.removeLast()
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 1)
        data.meals[0].date = meal(daysAgo: 1).date
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 2)
    }

    @Test func waterWeightAndUnsavedTemplatesDoNotCount() {
        var data = PersonalData()
        data.hydration = [.init(date: today, millilitres: 250)]
        data.weightEntries = [.init(date: today, kilograms: 80)]
        data.savedFoods = [meal(daysAgo: 0)]
        #expect(data.foodLoggingStreak(on: today, calendar: calendar) == 0)
    }

    @Test func localMidnightAndDaylightSavingUseCalendarDays() {
        for components in [DateComponents(year: 2026, month: 3, day: 30),
                           DateComponents(year: 2026, month: 10, day: 26)] {
            let midnight = calendar.date(from: components)!
            var data = PersonalData()
            data.meals = (1...3).map { offset in
                MealEntry(date: calendar.date(byAdding: .day, value: -offset, to: midnight)!,
                          name: "Food", calories: 1, protein: 0, carbs: 0, fat: 0)
            }
            #expect(data.foodLoggingStreak(on: midnight, calendar: calendar) == 3)
            #expect(data.foodLoggingStreak(on: midnight.addingTimeInterval(-1), calendar: calendar) == 3)
            data.meals.append(.init(date: midnight, name: "Food", calories: 1, protein: 0, carbs: 0, fat: 0))
            #expect(data.foodLoggingStreak(on: midnight, calendar: calendar) == 4)
        }
    }
}
