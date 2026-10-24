import Foundation

public extension PersonalData {
    /// A day counts only after its calorie target and every daily checklist item
    /// are complete. Today's unfinished day does not break yesterday's streak.
    func dailyGoalStreak(
        on date: Date = .now,
        calendar: Calendar = .current,
        calorieAdjustment: (Date) -> Double = { _ in 0 }
    ) -> Int {
        func isComplete(_ date: Date) -> Bool {
            let day = calendar.startOfDay(for: date)
            guard let calorieGoal, calorieGoal > 0 else { return false }
            let target = max(0, calorieGoal + max(0, calorieAdjustment(day)))
            let calories = meals(on: day, calendar: calendar).reduce(0) { $0 + $1.calories }
            let completed = checklist(on: day, calendar: calendar)?.completed ?? []
            return calories >= target
                && DailyChecklistItem.supplementItems.allSatisfy(completed.contains)
        }

        var day = calendar.startOfDay(for: date)
        if !isComplete(day) {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: day) else { return 0 }
            day = yesterday
        }
        var count = 0
        while isComplete(day) {
            count += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previous
        }
        return count
    }
}
