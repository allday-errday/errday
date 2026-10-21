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

    public init(id: UUID = UUID(), date: Date, feeling: RestedFeeling, note: String? = nil) {
        self.id = id
        self.date = date
        self.feeling = feeling
        self.note = note
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
