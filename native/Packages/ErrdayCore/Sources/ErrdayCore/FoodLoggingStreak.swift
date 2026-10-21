import Foundation

public extension PersonalData {
    /// One day counts once when any food is logged. Today's unfinished day does
    /// not break yesterday's streak; a full missed calendar day does.
    func foodLoggingStreak(on date: Date = .now, calendar: Calendar = .current) -> Int {
        let loggedDays = Set(meals.map { calendar.startOfDay(for: $0.date) })
        var day = calendar.startOfDay(for: date)
        if !loggedDays.contains(day) {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: day) else { return 0 }
            day = yesterday
        }
        var count = 0
        while loggedDays.contains(day) {
            count += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previous
        }
        return count
    }
}
