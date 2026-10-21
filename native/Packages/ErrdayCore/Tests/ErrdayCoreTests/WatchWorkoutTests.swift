import Foundation
import Testing
@testable import ErrdayCore

private func watchFixture() -> PersonalData {
    var data = PersonalData()
    var program = TrainingProgram()
    var exercise = Exercise(name: "Squat")
    exercise.restSeconds = 120
    program.templates = [Workout(name: "Legs", exercises: [exercise])]
    data.program = program
    return data
}

@Test func watchCanStartAnySessionAndReplayOfflineEditsExactlyOnce() throws {
    var phone = watchFixture()
    var watch = WatchWorkoutSnapshot(data: phone).personalData
    let template = try #require(phone.program?.templates.first)
    let start = WatchWorkoutCommand(.start(templateID: template.id, workoutID: UUID()))
    try watch.applyWatchCommand(start)
    let active = try #require(watch.activeWorkout)
    let set = WatchWorkoutCommand(.set(workoutID: active.id, exerciseID: active.exercises[0].id, setID: active.exercises[0].sets[0].id, weight: 67.5, reps: 8, completed: true))
    let finish = WatchWorkoutCommand(.finish(workoutID: active.id))
    try watch.applyWatchCommand(set)
    try watch.applyWatchCommand(finish)
    for command in [start, start, set, set, finish, finish] { try phone.applyWatchCommand(command) }
    #expect(phone.workouts.count == 1)
    #expect(phone.workouts[0].completedSets == 1)
    #expect(phone.workouts[0].volume == 540)
    #expect(phone.workouts[0].exercises == watch.workouts[0].exercises)
    #expect(phone.activeWorkout == nil && phone.restEndsAt == nil)
    let restored = try JSONDecoder().decode(PersonalData.self, from: JSONEncoder().encode(phone))
    #expect(restored.processedWatchCommandIDs?.count == 3)
}

@Test func delayedWatchSetDoesNotRestartAnExpiredRestTimer() throws {
    var data = watchFixture()
    let now = Date(timeIntervalSince1970: 10000)
    let template = try #require(data.program?.templates.first)
    try data.applyWatchCommand(.init(.start(templateID: template.id, workoutID: UUID()), date: now.addingTimeInterval(-600)), now: now)
    let workout = try #require(data.activeWorkout)
    let command = WatchWorkoutCommand(.set(workoutID: workout.id, exerciseID: workout.exercises[0].id, setID: workout.exercises[0].sets[0].id, weight: 20, reps: 10, completed: true), date: now.addingTimeInterval(-300))
    try data.applyWatchCommand(command, now: now)
    #expect(data.activeWorkout?.completedSets == 1)
    #expect(data.restEndsAt == nil)
}

@Test func staleWatchEditsCannotChangeAnotherWorkout() throws {
    var data = watchFixture()
    let template = try #require(data.program?.templates.first)
    try data.applyWatchCommand(.init(.start(templateID: template.id, workoutID: UUID())))
    let workout = try #require(data.activeWorkout)
    let before = data
    #expect(throws: WatchWorkoutError.self) {
        try data.applyWatchCommand(.init(.set(workoutID: UUID(), exerciseID: workout.exercises[0].id, setID: workout.exercises[0].sets[0].id, weight: 20, reps: 10, completed: true)))
    }
    #expect(data == before)
    #expect(throws: WatchWorkoutError.self) {
        try data.applyWatchCommand(.init(.set(workoutID: workout.id, exerciseID: workout.exercises[0].id, setID: workout.exercises[0].sets[0].id, weight: .infinity, reps: 10, completed: true)))
    }
    #expect(data == before)
}

@Test func editingCompletedWatchSetKeepsExistingRestAndFinishRequiresASet() throws {
    var data = watchFixture()
    let template = try #require(data.program?.templates.first)
    try data.applyWatchCommand(.init(.start(templateID: template.id, workoutID: UUID())))
    let workout = try #require(data.activeWorkout)
    #expect(throws: WatchWorkoutError.self) { try data.applyWatchCommand(.init(.finish(workoutID: workout.id))) }
    let action = WatchWorkoutCommand.Action.set(workoutID: workout.id, exerciseID: workout.exercises[0].id, setID: workout.exercises[0].sets[0].id, weight: 25, reps: 10, completed: true)
    try data.applyWatchCommand(.init(action))
    let rest = data.restEndsAt
    try data.applyWatchCommand(.init(action, date: .now.addingTimeInterval(10)))
    #expect(data.restEndsAt == rest)
    try data.applyWatchCommand(.init(.skipRest(workoutID: workout.id)))
    #expect(data.restEndsAt == nil)
}

private func activeWatchFixture() throws -> PersonalData {
    var data = watchFixture()
    let template = try #require(data.program?.templates.first)
    try data.applyWatchCommand(.init(.start(templateID: template.id, workoutID: UUID())))
    return data
}

@Test func watchNumberEditingDoesNotCompleteASetOrChangeItsTimer() throws {
    var data = try activeWatchFixture()
    let workout = try #require(data.activeWorkout)
    let exercise = workout.exercises[0]
    let set = exercise.sets[0]
    let edit = WatchWorkoutCommand(.editSet(workoutID: workout.id, exerciseID: exercise.id, setID: set.id, weight: 42.5, reps: 8))
    try data.applyWatchCommand(edit)
    #expect(data.activeWorkout?.completedSets == 0)
    #expect(data.activeWorkout?.exercises[0].sets[0].weight == 42.5)
    #expect(data.restEndsAt == nil)
    try data.applyWatchCommand(.init(.set(workoutID: workout.id, exerciseID: exercise.id, setID: set.id, weight: 42.5, reps: 8, completed: true)))
    let end = data.restEndsAt
    try data.applyWatchCommand(.init(.editSet(workoutID: workout.id, exerciseID: exercise.id, setID: set.id, weight: 45, reps: 9)))
    #expect(data.activeWorkout?.completedSets == 1)
    #expect(data.activeWorkout?.volume == 405)
    #expect(data.restEndsAt == end)
    try data.applyWatchCommand(.init(.set(workoutID: workout.id, exerciseID: exercise.id, setID: set.id, weight: 45, reps: 9, completed: false)))
    #expect(data.activeWorkout?.completedSets == 0)
    #expect(data.restEndsAt == nil && data.restTimerPausedSeconds == nil)
}

@Test func watchAddSetAndEditReplayExactlyOnceAcrossBothDevices() throws {
    var phone = try activeWatchFixture()
    var watch = WatchWorkoutSnapshot(data: phone).personalData
    let workout = try #require(phone.activeWorkout)
    let exercise = workout.exercises[0]
    let newSet = WorkoutSet()
    let add = WatchWorkoutCommand(.addSet(workoutID: workout.id, exerciseID: exercise.id, set: newSet))
    let edit = WatchWorkoutCommand(.editSet(workoutID: workout.id, exerciseID: exercise.id, setID: newSet.id, weight: 67.25, reps: 6))
    for command in [add, edit] { try watch.applyWatchCommand(command) }
    for command in [add, add, edit, edit] {
        let roundTrip = try JSONDecoder().decode(WatchWorkoutCommand.self, from: JSONEncoder().encode(command))
        try phone.applyWatchCommand(roundTrip)
    }
    #expect(phone.activeWorkout == watch.activeWorkout)
    #expect(phone.activeWorkout?.exercises[0].sets.count == exercise.sets.count + 1)
    #expect(phone.activeWorkout?.exercises[0].sets.last?.weight == 67.25)
    #expect(phone.activeWorkout?.completedSets == 0)
}

@Test func watchRestPauseAdjustResumeAndDelayedReplay() throws {
    var data = try activeWatchFixture()
    let id = try #require(data.activeWorkout?.id)
    let now = Date.now
    try data.applyWatchCommand(.init(.rest(workoutID: id, endsAt: now.addingTimeInterval(90), pausedSeconds: nil, durationSeconds: 90), date: now), now: now)
    try data.applyWatchCommand(.init(.rest(workoutID: id, endsAt: nil, pausedSeconds: 70, durationSeconds: 90)))
    #expect(data.restEndsAt == nil && data.restTimerPausedSeconds == 70)
    try data.applyWatchCommand(.init(.rest(workoutID: id, endsAt: nil, pausedSeconds: 80, durationSeconds: 90)))
    #expect(data.restTimerPausedSeconds == 80)
    let resume = WatchWorkoutCommand(.rest(workoutID: id, endsAt: now.addingTimeInterval(80), pausedSeconds: nil, durationSeconds: 90), date: now)
    try data.applyWatchCommand(resume, now: now.addingTimeInterval(200))
    #expect(data.restEndsAt == nil && data.restTimerPausedSeconds == 0)
    #expect(data.restTimerDurationSeconds == 90)
    let before = data
    #expect(throws: WatchWorkoutError.self) {
        try data.applyWatchCommand(.init(.rest(workoutID: id, endsAt: now.addingTimeInterval(20), pausedSeconds: 20, durationSeconds: 90)))
    }
    #expect(data == before)
    #expect(throws: WatchWorkoutError.self) {
        try data.applyWatchCommand(.init(.rest(workoutID: UUID(), endsAt: nil, pausedSeconds: 20, durationSeconds: 90)))
    }
    #expect(data == before)
}

@Test func discardingWatchWorkoutDoesNotAddHistoryOrAdvanceProgram() throws {
    var data = try activeWatchFixture()
    let id = try #require(data.activeWorkout?.id)
    let program = data.program
    data.restTimerPausedSeconds = 40
    data.workoutStopwatchElapsedSeconds = 60
    let command = WatchWorkoutCommand(.discard(workoutID: id))
    try data.applyWatchCommand(command)
    try data.applyWatchCommand(command)
    #expect(data.activeWorkout == nil && data.workouts.isEmpty)
    #expect(data.program == program)
    #expect(data.restTimerPausedSeconds == nil && data.workoutStopwatchElapsedSeconds == nil)
}

@Test func watchSnapshotKeepsRecentHistoryAndReadsOlderPayloads() throws {
    var data = try activeWatchFixture()
    var previous = try #require(data.activeWorkout)
    previous.id = UUID()
    previous.startedAt = .now.addingTimeInterval(-3600)
    previous.finishedAt = .now
    previous.exercises[0].sets[0].weight = 80
    previous.exercises[0].sets[0].completed = true
    data.workouts = [previous]
    data.restTimerDurationSeconds = 120
    let snapshot = WatchWorkoutSnapshot(data: data)
    let decoded = try JSONDecoder().decode(WatchWorkoutSnapshot.self, from: JSONEncoder().encode(snapshot))
    #expect(decoded.previousSet(exerciseName: "SQUAT", index: 0)?.weight == 80)
    #expect(decoded.previousSet(exerciseName: "SQUAT", index: 1) == nil)
    #expect(decoded.personalData.restTimerDurationSeconds == 120)
    var old = try #require(JSONSerialization.jsonObject(with: JSONEncoder().encode(snapshot)) as? [String: Any])
    old.removeValue(forKey: "recentWorkouts")
    old.removeValue(forKey: "restTimerDurationSeconds")
    let legacy = try JSONDecoder().decode(WatchWorkoutSnapshot.self, from: JSONSerialization.data(withJSONObject: old))
    #expect(legacy.activeWorkout == snapshot.activeWorkout)
    #expect(legacy.recentWorkouts == nil && legacy.restTimerDurationSeconds == nil)
}
