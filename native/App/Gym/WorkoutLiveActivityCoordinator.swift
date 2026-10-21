import ActivityKit
import ErrdayCore
import Foundation
import OSLog

@MainActor
final class WorkoutLiveActivityCoordinator {
    static let shared = WorkoutLiveActivityCoordinator()

    private struct DesiredActivity: Equatable {
        let workoutID: String
        let workoutName: String
        let state: WorkoutRestActivityAttributes.ContentState
    }

    private let logger = Logger(subsystem: "com.errday.native", category: "WorkoutLiveActivity")
    private var hasScheduled = false
    private var lastScheduled: DesiredActivity?
    private var pending: Task<Void, Never>?

    private init() {}

    func schedule(for data: PersonalData) {
        let desired = Self.desiredActivity(for: data)
        let hasLiveActivity = !Activity<WorkoutRestActivityAttributes>.activities.isEmpty
        guard !hasScheduled || desired != lastScheduled || (desired != nil && !hasLiveActivity) else { return }
        hasScheduled = true
        lastScheduled = desired
        let previous = pending
        pending = Task {
            await previous?.value
            await apply(desired)
        }
    }

    func flush() async {
        await pending?.value
    }

    private func apply(_ desired: DesiredActivity?) async {
        let activities = Activity<WorkoutRestActivityAttributes>.activities
        for activity in activities where desired == nil
            || activity.attributes.workoutID != desired?.workoutID
            || activity.attributes.workoutName != desired?.workoutName {
            await activity.end(nil, dismissalPolicy: .immediate)
        }

        guard let desired, ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let content = ActivityContent(state: desired.state, staleDate: desired.state.endDate)
        if let active = activities.first(where: {
            $0.attributes.workoutID == desired.workoutID && $0.attributes.workoutName == desired.workoutName
        }) {
            if active.content.state != desired.state { await active.update(content) }
        } else {
            do {
                let attributes = WorkoutRestActivityAttributes(workoutID: desired.workoutID,
                                                               workoutName: desired.workoutName)
                _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
            } catch {
                logger.error("Could not start workout Live Activity: \(error.localizedDescription, privacy: .public)")
            }
        }
    }

    private static func desiredActivity(for data: PersonalData) -> DesiredActivity? {
        guard let workout = data.activeWorkout else { return nil }
        let end = data.restEndsAt.flatMap { $0 > .now ? $0 : nil }
        let paused = data.restTimerPausedSeconds.flatMap { $0 > 0 ? $0 : nil }
        guard end != nil || paused != nil else { return nil }

        let duration = max(10, data.restTimerDurationSeconds ?? Int(ceil(end?.timeIntervalSinceNow ?? paused ?? 90)))
        let next = workout.exercises.lazy.compactMap { exercise -> (Exercise, Int, WorkoutSet)? in
            guard let index = exercise.sets.firstIndex(where: { !$0.completed }) else { return nil }
            return (exercise, index, exercise.sets[index])
        }.first
        let exerciseName = String((next?.0.name ?? workout.exercises.last?.name ?? workout.name).prefix(80))
        let nextSet: String
        if let (exercise, index, set) = next {
            let measure = set.weight > 0 && set.repetitions > 0
                ? " (\(set.weight.decimal) kg × \(set.repetitions))" : ""
            nextSet = "Next: Set \(index + 1) of \(exercise.sets.count)\(measure)"
        } else {
            nextSet = "All sets complete"
        }
        let state = WorkoutRestActivityAttributes.ContentState(
            exerciseName: exerciseName,
            nextSet: String(nextSet.prefix(100)),
            startDate: end?.addingTimeInterval(-Double(duration)),
            endDate: end,
            durationSeconds: duration,
            pausedSeconds: paused.map { Int(ceil($0)) }
        )
        return DesiredActivity(workoutID: workout.id.uuidString,
                               workoutName: String(workout.name.prefix(80)), state: state)
    }
}
