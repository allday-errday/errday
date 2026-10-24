import ErrdayCore
import Foundation
import Testing

@Test func readinessRequiresAtLeastTwoSignals() {
    let empty = ReadinessEstimate.evaluate(sleepHours: nil, feeling: nil, hrv: nil,
                                           hrvBaseline: nil, restingPulse: nil,
                                           restingPulseBaseline: nil)
    #expect(empty.score == nil)
    #expect(empty.factors.isEmpty)

    let sleepOnly = ReadinessEstimate.evaluate(sleepHours: 8, feeling: nil, hrv: nil,
                                               hrvBaseline: nil, restingPulse: nil,
                                               restingPulseBaseline: nil)
    #expect(sleepOnly.score == nil)
    #expect(sleepOnly.factors.map(\.id) == ["sleep"])
}

@Test func readinessNormalizesOnlyAvailableFactorWeights() {
    let estimate = ReadinessEstimate.evaluate(sleepHours: 8, feeling: .rested, hrv: nil,
                                              hrvBaseline: nil, restingPulse: nil,
                                              restingPulseBaseline: nil)
    // (90 × 35 + 80 × 40) / 75 = 84.67
    #expect(estimate.score == 85)
    #expect(estimate.label == "Ready")
    #expect(estimate.factors.map(\.weight) == [40, 35])
}

@Test func readinessUsesPersonalHeartBaselinesWithoutPenalizingMissingData() {
    let estimate = ReadinessEstimate.evaluate(sleepHours: 6.5, feeling: .okay,
                                              hrv: 60, hrvBaseline: 50,
                                              restingPulse: 68, restingPulseBaseline: 60)
    #expect(estimate.score != nil)
    #expect(estimate.factors.map(\.id) == ["feeling", "sleep", "hrv", "pulse"])
    #expect(estimate.factors.first { $0.id == "hrv" }?.score == 90)
    #expect(estimate.factors.first { $0.id == "pulse" }?.score == 35)
}

@Test func readinessRejectsInvalidMeasurements() {
    let estimate = ReadinessEstimate.evaluate(sleepHours: .nan, feeling: .tired,
                                              hrv: -1, hrvBaseline: 50,
                                              restingPulse: 300, restingPulseBaseline: 60)
    #expect(estimate.score == nil)
    #expect(estimate.factors.map(\.id) == ["feeling"])
}

@Test func goodWearableSignalsDoNotOverrideSevereFatigueOrSoreness() throws {
    for soreness in [nil, 5] as [Int?] {
        let result = ReadinessEstimate.evaluate(
            sleepHours: 8, feeling: soreness == nil ? .tired : .veryRested,
            hrv: 70, hrvBaseline: 50, restingPulse: 50, restingPulseBaseline: 60,
            energy: 5, soreness: soreness, stress: 1, sleepQuality: 5
        )
        #expect(try #require(result.score) < 60)
    }
}

@Test func extraSubjectiveRatingsDoNotPretendToBeIndependentWearableSignals() {
    let result = ReadinessEstimate.evaluate(
        sleepHours: nil, feeling: .rested, hrv: nil, hrvBaseline: nil,
        restingPulse: nil, restingPulseBaseline: nil,
        energy: 4, soreness: 2, stress: 2, sleepQuality: 4
    )
    #expect(result.score == nil)
    #expect(result.factors.count == 1)
}

@Test func readinessBaselineRequiresDistinctRecentPriorDays() {
    let calendar = Calendar(identifier: .gregorian)
    let today = calendar.startOfDay(for: Date())
    let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!
    let duplicateDays = (0..<10).map { _ in DailyMetric(date: yesterday, value: 50) }
    #expect(ReadinessEstimate.baseline(from: duplicateDays, before: today, calendar: calendar) == nil)
    var days = (1...7).map { DailyMetric(date: calendar.date(byAdding: .day, value: -$0, to: today)!, value: 50) }
    days.append(DailyMetric(date: today, value: 400))
    days.append(DailyMetric(date: calendar.date(byAdding: .day, value: -40, to: today)!, value: 400))
    #expect(ReadinessEstimate.baseline(from: days, before: today, calendar: calendar) == 50)
}

@Test func detailedCheckInPersistsAndOldCheckInsRemainReadable() throws {
    let entry = RestedCheckIn(date: .now, feeling: .okay, energy: 2, soreness: 4, stress: 3, sleepQuality: 2)
    #expect(try JSONDecoder().decode(RestedCheckIn.self, from: JSONEncoder().encode(entry)) == entry)
    let oldEntry = RestedCheckIn(date: .now, feeling: .rested)
    #expect(try JSONDecoder().decode(RestedCheckIn.self, from: JSONEncoder().encode(oldEntry)).energy == nil)
}
