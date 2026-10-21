import Foundation

public struct WatchWorkoutSnapshot: Codable, Sendable {
    public var version = 1
    public var updatedAt: Date
    public var templates: [Workout]
    public var activeWorkout: Workout?
    public var restEndsAt: Date?
    public var restTimerPausedSeconds: Double?
    /// Optional fields keep already-installed companions and cached v1 snapshots readable.
    public var restTimerDurationSeconds: Int?
    public var recentWorkouts: [Workout]?
    public var processedCommandIDs: [UUID]

    public init(data: PersonalData, now: Date = .now) {
        updatedAt = now
        templates = data.program?.templates ?? []
        activeWorkout = data.activeWorkout
        restEndsAt = data.restEndsAt
        restTimerPausedSeconds = data.restTimerPausedSeconds
        restTimerDurationSeconds = data.restTimerDurationSeconds
        recentWorkouts = Array(data.workouts.filter { $0.finishedAt != nil }
            .sorted { $0.startedAt > $1.startedAt }.prefix(12))
        processedCommandIDs = data.processedWatchCommandIDs ?? []
    }

    public var personalData: PersonalData {
        var data = PersonalData()
        var program = TrainingProgram()
        program.templates = templates
        data.program = program
        data.activeWorkout = activeWorkout
        data.restEndsAt = restEndsAt
        data.restTimerPausedSeconds = restTimerPausedSeconds
        data.restTimerDurationSeconds = restTimerDurationSeconds
        data.workouts = recentWorkouts ?? []
        data.processedWatchCommandIDs = processedCommandIDs
        return data
    }

    public func previousSet(exerciseName: String, index: Int) -> WorkoutSet? {
        guard index >= 0 else { return nil }
        for workout in (recentWorkouts ?? []).sorted(by: { $0.startedAt > $1.startedAt }) {
            guard let exercise = workout.exercises.first(where: {
                $0.name.compare(exerciseName, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
            }), exercise.sets.indices.contains(index), exercise.sets[index].completed else { continue }
            return exercise.sets[index]
        }
        return nil
    }
}

public struct WatchWorkoutCommand: Codable, Identifiable, Sendable {
    public enum Action: Codable, Sendable {
        case start(templateID: UUID, workoutID: UUID)
        case set(workoutID: UUID, exerciseID: UUID, setID: UUID, weight: Double, reps: Int, completed: Bool)
        case editSet(workoutID: UUID, exerciseID: UUID, setID: UUID, weight: Double, reps: Int)
        case addSet(workoutID: UUID, exerciseID: UUID, set: WorkoutSet)
        case rest(workoutID: UUID, endsAt: Date?, pausedSeconds: Double?, durationSeconds: Int)
        case skipRest(workoutID: UUID)
        case finish(workoutID: UUID)
        case discard(workoutID: UUID)
    }
    public var id: UUID
    public var date: Date
    public var action: Action
    public init(_ action: Action, date: Date = .now, id: UUID = UUID()) {
        self.action = action; self.date = date; self.id = id
    }
}

public enum WatchWorkoutError: LocalizedError {
    case conflict, missingSession, invalidSet, invalidRest, noSets
    public var errorDescription: String? {
        switch self {
        case .conflict: "Your workout changed on iPhone. Check the current session and try again."
        case .missingSession: "This session is no longer in your program. Open Errday on iPhone to refresh."
        case .invalidSet: "Enter a valid weight and number of reps."
        case .invalidRest: "Choose a rest time between 0 and 60 minutes."
        case .noSets: "Log at least one set before finishing."
        }
    }
}

public extension PersonalData {
    /// The same reducer runs on both devices. IDs are scoped by workout, and edits
    /// set absolute values, making disconnected/retried commands deterministic.
    mutating func applyWatchCommand(_ command: WatchWorkoutCommand, now: Date = .now) throws {
        guard !(processedWatchCommandIDs ?? []).contains(command.id) else { return }
        let eventDate = min(command.date, now)
        switch command.action {
        case let .start(templateID, workoutID):
            guard activeWorkout == nil, !workouts.contains(where: { $0.id == workoutID }) else { throw WatchWorkoutError.conflict }
            guard let template = program?.templates.first(where: { $0.id == templateID }) else { throw WatchWorkoutError.missingSession }
            var workout = Workout(name: template.name, startedAt: eventDate, exercises: template.exercises)
            workout.id = workoutID
            workout.templateID = templateID
            for i in workout.exercises.indices {
                for j in workout.exercises[i].sets.indices { workout.exercises[i].sets[j].completed = false }
            }
            activeWorkout = workout
            clearWatchWorkoutTimers()
        case let .set(workoutID, exerciseID, setID, weight, reps, completed):
            guard weight.isFinite, (0...2000).contains(weight), (0...1000).contains(reps) else { throw WatchWorkoutError.invalidSet }
            guard var workout = activeWorkout, workout.id == workoutID,
                  let i = workout.exercises.firstIndex(where: { $0.id == exerciseID }),
                  let j = workout.exercises[i].sets.firstIndex(where: { $0.id == setID }) else { throw WatchWorkoutError.conflict }
            let wasCompleted = workout.exercises[i].sets[j].completed
            workout.exercises[i].sets[j].weight = weight
            workout.exercises[i].sets[j].repetitions = reps
            workout.exercises[i].sets[j].completed = completed
            activeWorkout = workout
            if completed && !wasCompleted {
                let exercise = workout.exercises[i]
                let seconds = workout.exercises[i].sets[j].effectiveType == .warmup
                    ? (exercise.warmupRestSeconds ?? min(exercise.restSeconds ?? 90, 90))
                    : (exercise.restSeconds ?? 90)
                restTimerDurationSeconds = max(0, seconds)
                let end = eventDate.addingTimeInterval(Double(max(0, seconds)))
                restEndsAt = end > now ? end : nil
                restTimerPausedSeconds = end > now ? nil : 0
            } else if wasCompleted && !completed {
                // Match the phone: undoing a logged set also cancels its rest.
                restEndsAt = nil; restTimerPausedSeconds = nil
            }
        case let .editSet(workoutID, exerciseID, setID, weight, reps):
            guard weight.isFinite, (0...2000).contains(weight), (0...1000).contains(reps) else { throw WatchWorkoutError.invalidSet }
            guard var workout = activeWorkout, workout.id == workoutID,
                  let i = workout.exercises.firstIndex(where: { $0.id == exerciseID }),
                  let j = workout.exercises[i].sets.firstIndex(where: { $0.id == setID }) else { throw WatchWorkoutError.conflict }
            // Editing numbers must not log/unlog a set or restart its timer.
            workout.exercises[i].sets[j].weight = weight
            workout.exercises[i].sets[j].repetitions = reps
            activeWorkout = workout
        case let .addSet(workoutID, exerciseID, set):
            guard set.weight.isFinite, (0...2000).contains(set.weight),
                  (0...1000).contains(set.repetitions), !set.completed else { throw WatchWorkoutError.invalidSet }
            guard var workout = activeWorkout, workout.id == workoutID,
                  let i = workout.exercises.firstIndex(where: { $0.id == exerciseID }),
                  !workout.exercises.flatMap(\.sets).contains(where: { $0.id == set.id }),
                  workout.exercises[i].sets.count < 100 else { throw WatchWorkoutError.conflict }
            workout.exercises[i].sets.append(set)
            activeWorkout = workout
        case let .rest(workoutID, endsAt, pausedSeconds, durationSeconds):
            guard activeWorkout?.id == workoutID else { throw WatchWorkoutError.conflict }
            guard (0...3600).contains(durationSeconds),
                  endsAt == nil || pausedSeconds == nil,
                  pausedSeconds.map({ $0.isFinite && (0...3600).contains($0) }) ?? true,
                  endsAt.map({ $0.timeIntervalSince1970.isFinite && $0.timeIntervalSince(command.date) <= 3600 }) ?? true
            else { throw WatchWorkoutError.invalidRest }
            restTimerDurationSeconds = durationSeconds
            restEndsAt = endsAt.flatMap { $0 > now ? $0 : nil }
            restTimerPausedSeconds = endsAt == nil ? pausedSeconds : (restEndsAt == nil ? 0 : nil)
        case let .skipRest(workoutID):
            guard activeWorkout?.id == workoutID else { throw WatchWorkoutError.conflict }
            restEndsAt = nil; restTimerPausedSeconds = 0
        case let .finish(workoutID):
            guard var workout = activeWorkout, workout.id == workoutID else { throw WatchWorkoutError.conflict }
            guard workout.completedSets > 0 else { throw WatchWorkoutError.noSets }
            workout.finishedAt = max(workout.startedAt, eventDate)
            workouts.append(workout)
            program?.advance(after: workout.templateID)
            activeWorkout = nil
            clearWatchWorkoutTimers()
        case let .discard(workoutID):
            guard activeWorkout?.id == workoutID else { throw WatchWorkoutError.conflict }
            activeWorkout = nil
            clearWatchWorkoutTimers()
        }
        processedWatchCommandIDs = Array(((processedWatchCommandIDs ?? []) + [command.id]).suffix(256))
    }

    private mutating func clearWatchWorkoutTimers() {
        restEndsAt = nil; restTimerPausedSeconds = nil; restTimerDurationSeconds = nil
        workoutStopwatchStartedAt = nil; workoutStopwatchElapsedSeconds = nil
    }
}
