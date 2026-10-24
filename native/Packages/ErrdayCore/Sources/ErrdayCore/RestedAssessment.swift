import Foundation

/// A subjective morning check-in, not a medical measurement.
public enum RestedFeeling: Int, Codable, CaseIterable, Identifiable, Sendable {
    case veryTired = 1
    case tired
    case okay
    case rested
    case veryRested

    public var id: Int { rawValue }

    public var title: String {
        switch self {
        case .veryTired: "Very tired"
        case .tired: "Tired"
        case .okay: "Okay"
        case .rested: "Rested"
        case .veryRested: "Very rested"
        }
    }
}

public struct RestedCheckIn: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var date: Date
    public var feeling: RestedFeeling
    public var note: String?
    /// Optional 1–5 ratings preserve compatibility with earlier check-ins.
    public var energy: Int?
    public var soreness: Int?
    public var stress: Int?
    public var sleepQuality: Int?

    public init(id: UUID = UUID(), date: Date, feeling: RestedFeeling, note: String? = nil,
                energy: Int? = nil, soreness: Int? = nil, stress: Int? = nil, sleepQuality: Int? = nil) {
        self.id = id
        self.date = date
        self.feeling = feeling
        self.note = note
        self.energy = energy; self.soreness = soreness; self.stress = stress; self.sleepQuality = sleepQuality
    }
}

/// A deliberately coarse interpretation of sleep duration and self-report.
/// No percentage or clinical recovery claim is inferred from these inputs.
public enum RestedAssessment: Equatable, Sendable {
    case noData
    case sleepOnly
    case checkInOnly
    case wellRested
    case somewhatRested
    case notFullyRested
    case mixedSignals

    public static func evaluate(sleepHours: Double?, feeling: RestedFeeling?) -> Self {
        let hours = sleepHours.flatMap { $0.isFinite && $0 > 0 && $0 <= 16 ? $0 : nil }
        guard let feeling else { return hours == nil ? .noData : .sleepOnly }
        guard let hours else { return .checkInOnly }
        if feeling.rawValue <= 2 { return .notFullyRested }
        if feeling.rawValue >= 4 { return hours >= 7 ? .wellRested : .mixedSignals }
        return hours >= 7 ? .somewhatRested : .notFullyRested
    }
}

/// A transparent, non-medical estimate built from the wellness signals that are
/// available for a given day. Missing signals are never treated as poor scores.
public struct ReadinessEstimate: Equatable, Sendable {
    public struct Factor: Identifiable, Equatable, Sendable {
        public let id: String
        public let title: String
        public let score: Int
        public let weight: Int
        public let detail: String

        public init(id: String, title: String, score: Int, weight: Int, detail: String) {
            self.id = id
            self.title = title
            self.score = score
            self.weight = weight
            self.detail = detail
        }
    }

    public let score: Int?
    public let factors: [Factor]
    public let missingSignals: [String]

    public var label: String {
        guard let score else { return "More data needed" }
        switch score {
        case 80...: return "Ready"
        case 60..<80: return "Steady"
        case 40..<60: return "Take it easier"
        default: return "Prioritize recovery"
        }
    }

    public static func evaluate(
        sleepHours: Double?,
        feeling: RestedFeeling?,
        hrv: Double?,
        hrvBaseline: Double?,
        restingPulse: Double?,
        restingPulseBaseline: Double?,
        energy: Int? = nil,
        soreness: Int? = nil,
        stress: Int? = nil,
        sleepQuality: Int? = nil
    ) -> Self {
        var factors: [Factor] = []
        var missing: [String] = []

        if let feeling {
            let scores = [1: 25, 2: 40, 3: 60, 4: 80, 5: 95]
            var ratings = [scores[feeling.rawValue] ?? 60]
            for rating in [energy, sleepQuality] {
                if let rating, (1...5).contains(rating) { ratings.append(scores[rating] ?? 60) }
            }
            for rating in [soreness, stress] {
                if let rating, (1...5).contains(rating) { ratings.append(scores[6 - rating] ?? 60) }
            }
            factors.append(Factor(id: "feeling", title: "Your check-in",
                                  score: ratings.reduce(0, +) / ratings.count, weight: 40,
                                  detail: feeling.title))
        } else {
            missing.append("morning check-in")
        }

        if let hours = valid(sleepHours, range: 0.01...16) {
            let score: Int
            switch hours {
            case ..<5: score = 25
            case 5..<6: score = 45
            case 6..<7: score = 65
            case 7...9: score = 90
            default: score = 75
            }
            factors.append(Factor(id: "sleep", title: "Sleep duration", score: score, weight: 35,
                                  detail: durationText(hours)))
        } else {
            missing.append("sleep duration")
        }

        if let current = valid(hrv, range: 0.01...500),
           let baseline = valid(hrvBaseline, range: 0.01...500) {
            let change = (current - baseline) / baseline
            let score = Int((70 + change * 100).rounded()).clamped(to: 25...95)
            factors.append(Factor(id: "hrv", title: "HRV vs baseline", score: score, weight: 15,
                                  detail: comparisonText(current: current, baseline: baseline, unit: "ms")))
        } else {
            missing.append("HRV baseline")
        }

        if let current = valid(restingPulse, range: 20...220),
           let baseline = valid(restingPulseBaseline, range: 20...220), baseline > 0 {
            let difference = current - baseline
            let score = Int((75 - difference * 5).rounded()).clamped(to: 25...95)
            factors.append(Factor(id: "pulse", title: "Resting heart rate", score: score, weight: 10,
                                  detail: comparisonText(current: current, baseline: baseline, unit: "bpm")))
        } else {
            missing.append("resting heart-rate baseline")
        }

        // One signal is too easy to over-interpret. Two independent signals are
        // required, and available weights are normalized instead of penalizing
        // missing Health permissions or measurements.
        guard factors.count >= 2 else {
            return Self(score: nil, factors: factors, missingSignals: missing)
        }
        let totalWeight = factors.reduce(0) { $0 + $1.weight }
        let weightedScore = factors.reduce(0) { $0 + $1.score * $1.weight }
        var score = Int((Double(weightedScore) / Double(totalWeight)).rounded())
        // Strong self-reported fatigue must not be hidden by favorable wearable data.
        if feeling.map({ $0.rawValue <= 2 }) == true || energy.map({ (1...2).contains($0) }) == true
            || soreness.map({ (4...5).contains($0) }) == true || stress == 5 {
            score = min(score, 59)
        }
        return Self(score: score,
                    factors: factors, missingSignals: missing)
    }

    /// Compare like-for-like daily Health readings, excluding the selected day
    /// and samples outside the prior 28 calendar days. Seven distinct days are
    /// a minimum for an initial personal reference, not a validated cutoff.
    public static func baseline(from metrics: [DailyMetric], before date: Date,
                                calendar: Calendar = .current) -> Double? {
        let end = calendar.startOfDay(for: date)
        guard let start = calendar.date(byAdding: .day, value: -28, to: end) else { return nil }
        let days = Dictionary(grouping: metrics.filter {
            $0.date >= start && $0.date < end && $0.value.map { $0.isFinite && $0 > 0 } == true
        }, by: { calendar.startOfDay(for: $0.date) })
        guard days.count >= 7 else { return nil }
        let values = days.values.map { entries in
            let values = entries.compactMap(\.value)
            return values.reduce(0, +) / Double(values.count)
        }.sorted()
        let middle = values.count / 2
        return values.count.isMultiple(of: 2) ? (values[middle - 1] + values[middle]) / 2 : values[middle]
    }

    private static func valid(_ value: Double?, range: ClosedRange<Double>) -> Double? {
        guard let value, value.isFinite, range.contains(value) else { return nil }
        return value
    }

    private static func durationText(_ hours: Double) -> String {
        let minutes = Int((hours * 60).rounded())
        return "\(minutes / 60)h \(minutes % 60)m"
    }

    private static func comparisonText(current: Double, baseline: Double, unit: String) -> String {
        "\(Int(current.rounded())) \(unit) · baseline \(Int(baseline.rounded()))"
    }
}

private extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
