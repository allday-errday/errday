import Foundation
import Testing
@testable import ErrdayCore

@Test func missingMeasurementsAreNotZeroes() {
    let days = [DailyMetric(date: .now, value: 0), DailyMetric(date: .now, value: nil), DailyMetric(date: .now, value: 12)]
    #expect(WeeklySummary.average(days) == 6)
    #expect(WeeklySummary.average([DailyMetric(date: .now, value: nil)]) == nil)
}

@Test func completedSetsOnlyCountTowardVolume() {
    var workout = Workout(name: "Test", exercises: [Exercise(name: "Bankdrücken", setCount: 2)])
    workout.exercises[0].sets[0].weight = 60
    workout.exercises[0].sets[0].repetitions = 10
    workout.exercises[0].sets[0].completed = true
    workout.exercises[0].sets[1].weight = 100
    #expect(workout.completedSets == 1)
    #expect(workout.volume == 600)
}

@Test func recordsRemainSeparatedByAccountAndSurviveReload() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: directory) }
    let first = PersonalRepository(directory: directory, userID: UUID())
    let second = PersonalRepository(directory: directory, userID: UUID())
    var data = PersonalData()
    data.meals = [MealEntry(name: "Reis", calories: 130, protein: 2.7, carbs: 28, fat: 0.3)]
    data.activeWorkout = Workout(name: "Oberkörper", exercises: [Exercise(name: "Rudern")])
    try first.save(data)
    #expect(try first.load() == data)
    #expect(try second.load().meals.isEmpty)
}

@Test func corruptedDataDoesNotSilentlyBecomeEmpty() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: directory) }
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let repository = PersonalRepository(directory: directory, userID: UUID())
    try Data("broken".utf8).write(to: repository.fileURL)
    #expect(throws: (any Error).self) { try repository.load() }
}

@Test func mealsUseLocalCalendarDay() {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: "Europe/Zurich")!
    let formatter = ISO8601DateFormatter()
    let lateUTC = formatter.date(from: "2026-10-05T23:30:00Z")!
    var data = PersonalData()
    data.meals = [MealEntry(date: lateUTC, name: "Snack", calories: 100, protein: 5, carbs: 10, fat: 4)]
    #expect(data.meals(on: formatter.date(from: "2026-10-06T12:00:00Z")!, calendar: calendar).count == 1)
}
