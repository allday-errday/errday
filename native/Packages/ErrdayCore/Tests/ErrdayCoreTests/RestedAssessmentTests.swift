import ErrdayCore
import Foundation
import Testing

@Test func restedAssessmentRequiresBothSignalsForCombinedConclusion() {
    #expect(RestedAssessment.evaluate(sleepHours: nil, feeling: nil) == .noData)
    #expect(RestedAssessment.evaluate(sleepHours: 8, feeling: nil) == .sleepOnly)
    #expect(RestedAssessment.evaluate(sleepHours: nil, feeling: .rested) == .checkInOnly)
    #expect(RestedAssessment.evaluate(sleepHours: .nan, feeling: .rested) == .checkInOnly)
}

@Test func restedAssessmentDoesNotOverrideHowSomeoneFeelsWithSleepDuration() {
    #expect(RestedAssessment.evaluate(sleepHours: 8, feeling: .tired) == .notFullyRested)
    #expect(RestedAssessment.evaluate(sleepHours: 5.5, feeling: .rested) == .mixedSignals)
    #expect(RestedAssessment.evaluate(sleepHours: 7.5, feeling: .rested) == .wellRested)
    #expect(RestedAssessment.evaluate(sleepHours: 7.5, feeling: .okay) == .somewhatRested)
}

@Test func restedCheckInSurvivesPersistenceAndOlderDataWithoutItLoads() throws {
    var data = PersonalData()
    data.restedCheckIns = [RestedCheckIn(date: Date(timeIntervalSince1970: 1_000),
                                         feeling: .okay, note: "Woke up twice")]
    let encoded = try JSONEncoder().encode(data)
    #expect(try JSONDecoder().decode(PersonalData.self, from: encoded).restedCheckIns == data.restedCheckIns)

    var json = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
    json.removeValue(forKey: "restedCheckIns")
    let oldData = try JSONSerialization.data(withJSONObject: json)
    #expect(try JSONDecoder().decode(PersonalData.self, from: oldData).restedCheckIns == nil)
}
