import Foundation

/// Two adjacent seven-day windows with equal weighting per recorded day.
/// Multiple same-day weigh-ins do not create additional evidence.
public struct WeightGainTrend: Equatable, Sendable {
    public let previousAverage: Double
    public let currentAverage: Double
    public var weeklyChange: Double { currentAverage - previousAverage }

    public static func evaluate(entries: [WeightEntry], on date: Date = .now,
                                calendar: Calendar = .current, minimumDaysPerWeek: Int = 3) -> Self? {
        let today = calendar.startOfDay(for: date)
        guard let end = calendar.date(byAdding: .day, value: 1, to: today),
              let middle = calendar.date(byAdding: .day, value: -6, to: today),
              let start = calendar.date(byAdding: .day, value: -13, to: today) else { return nil }
        let days = Dictionary(grouping: entries.filter {
            $0.date >= start && $0.date < end && $0.date <= date && $0.kilograms.isFinite && $0.kilograms > 0
        }, by: { calendar.startOfDay(for: $0.date) })
        func average(from: Date, to: Date) -> Double? {
            let values = days.filter { $0.key >= from && $0.key < to }.values.map {
                $0.reduce(0) { $0 + $1.kilograms } / Double($0.count)
            }
            guard values.count >= max(1, minimumDaysPerWeek) else { return nil }
            return values.reduce(0, +) / Double(values.count)
        }
        guard let previous = average(from: start, to: middle), let current = average(from: middle, to: end) else { return nil }
        return Self(previousAverage: previous, currentAverage: current)
    }
}
