import Foundation

public struct CalorieAdjustment: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var date: Date
    public var previousCalories: Double
    public var newCalories: Double
    public var observedWeeklyGainKG: Double

    public init(date: Date, previousCalories: Double, newCalories: Double, observedWeeklyGainKG: Double) {
        id = UUID(); self.date = date; self.previousCalories = previousCalories
        self.newCalories = newCalories; self.observedWeeklyGainKG = observedWeeklyGainKG
    }
}

/// A conservative product rule for reviewing a stable nutrition target. This is
/// not a measurement of metabolism or a guaranteed rate of muscle growth.
public struct CalorieReview: Equatable, Sendable {
    public enum Decision: Equatable, Sendable {
        case needsPlan, observing, needsWeighIns, keep, increase, checkIntake, fasterGain, goalReached
    }
    public let decision: Decision
    public let completedDays: Int
    public let firstWeekCount: Int
    public let secondWeekCount: Int
    public let trend: WeightGainTrend?
    public let comparisonGainKG: Double?
    public let requestedGainKG: Double?
    public let periodStart: Date?
    public static let increaseCalories = 150.0

    public static func evaluate(data: PersonalData, on date: Date = .now,
                                calendar: Calendar = .current) -> Self {
        let today = calendar.startOfDay(for: date)
        let start = data.calorieReviewStartedAt
        let end = today // Only completed days, never a partial day of food logs.
        let windowStart = calendar.date(byAdding: .day, value: -14, to: end) ?? end
        let middle = calendar.date(byAdding: .day, value: -7, to: end) ?? end
        let mornings = (data.weightEntries ?? []).filter {
            $0.isValid && $0.date >= max(start ?? end, windowStart) && $0.date < end
                && ($0.isMorning ?? (calendar.component(.hour, from: $0.date) < 12))
        }
        let days = Set(mornings.map { calendar.startOfDay(for: $0.date) })
        let completedDays = start.map {
            max(0, calendar.dateComponents([.day], from: calendar.startOfDay(for: $0), to: today).day ?? 0)
        } ?? 0
        let countMiddle = completedDays < 14
            ? start.flatMap { calendar.date(byAdding: .day, value: 7, to: calendar.startOfDay(for: $0)) } ?? middle
            : middle
        let firstCount = days.filter { $0 < countMiddle }.count
        let secondCount = days.filter { $0 >= countMiddle }.count
        let trend = WeightGainTrend.evaluate(entries: mornings, on: end.addingTimeInterval(-0.001),
                                             calendar: calendar, minimumDaysPerWeek: 5)
        let requested = data.profile?.weeklyGainGoalKG
        let weight = trend?.currentAverage ?? mornings.max(by: { $0.date < $1.date })?.kilograms
            ?? data.profile?.weight
        // Do not chase an unusually aggressive requested rate with repeated rises.
        let comparison = requested.flatMap { gain -> Double? in
            guard gain.isFinite, gain > 0, let weight, weight.isFinite, weight > 0 else { return nil }
            return min(gain, weight * 0.005)
        }

        func result(_ decision: Decision) -> Self {
            Self(decision: decision, completedDays: min(completedDays, 14), firstWeekCount: firstCount,
                 secondWeekCount: secondCount, trend: trend, comparisonGainKG: comparison,
                 requestedGainKG: requested, periodStart: start)
        }
        guard data.profile?.goal == "Build muscle", let calories = data.calorieGoal,
              calories.isFinite, calories > 0, data.addsActivityCalories != true,
              let comparison else { return result(.needsPlan) }
        if let weight, let goal = data.weightGoalKilograms, goal.isFinite, weight >= goal {
            return result(.goalReached)
        }
        guard start != nil, completedDays >= 14 else { return result(.observing) }
        guard let trend else { return result(.needsWeighIns) }
        let tolerance = max(0.05, comparison * 0.25)
        if trend.weeklyChange > comparison + tolerance { return result(.fasterGain) }
        guard trend.weeklyChange < comparison - tolerance else { return result(.keep) }

        let meals = data.meals.filter { $0.date >= max(start ?? end, windowStart) && $0.date < end }
        let foodDays = Dictionary(grouping: meals, by: { calendar.startOfDay(for: $0.date) })
        if foodDays.count >= 10 {
            let average = foodDays.values.reduce(0.0) { $0 + $1.reduce(0.0) { $0 + $1.calories } } / Double(foodDays.count)
            if average < calories * 0.9 { return result(.checkIntake) }
        }
        return result(.increase)
    }
}

public extension PersonalData {
    /// Re-evaluate at apply time, so the same observation window cannot increase
    /// calories repeatedly and an edited goal invalidates an outdated proposal.
    @discardableResult
    mutating func applyCalorieReview(on date: Date = .now, calendar: Calendar = .current) -> Bool {
        let review = CalorieReview.evaluate(data: self, on: date, calendar: calendar)
        guard review.decision == .increase, let trend = review.trend,
              let calories = calorieGoal, let carbs = carbsGoal, carbs.isFinite, carbs >= 0,
              let protein = proteinGoal, protein.isFinite, protein >= 0,
              let fat = fatGoal, fat.isFinite, fat >= 0 else { return false }
        let macroCalories = protein * 4 + carbs * 4 + fat * 9
        guard abs(macroCalories - calories) <= max(50, calories * 0.05) else { return false }
        let increase = CalorieReview.increaseCalories
        calorieGoal = calories + increase
        carbsGoal = carbs + increase / 4
        addsActivityCalories = false
        var history = calorieAdjustments ?? []
        history.append(CalorieAdjustment(date: date, previousCalories: calories, newCalories: calories + increase,
                                         observedWeeklyGainKG: trend.weeklyChange))
        calorieAdjustments = history
        calorieReviewStartedAt = date
        return true
    }
}
