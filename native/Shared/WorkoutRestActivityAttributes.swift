import ActivityKit
import AppIntents
import Foundation

#if ERRDAY_APP
import ErrdayCore
#endif

struct WorkoutRestActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let exerciseName: String
        let nextSet: String
        let startDate: Date?
        let endDate: Date?
        let durationSeconds: Int
        let pausedSeconds: Int?

        var isRunning: Bool { endDate != nil }
    }

    let workoutID: String
    let workoutName: String
}

struct ToggleWorkoutRestIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Pause or resume rest timer"
    static var isDiscoverable: Bool = false

    @Parameter(title: "Workout ID") var workoutID: String

    init() { workoutID = "" }
    init(workoutID: String) { self.workoutID = workoutID }

    func perform() async throws -> some IntentResult {
        #if ERRDAY_APP
        await MainActor.run {
            let records = PersonalStore()
            records.load()
            guard records.data.activeWorkout?.id.uuidString == workoutID else { return }
            if let end = records.data.restEndsAt, end > .now {
                _ = records.update {
                    $0.restEndsAt = nil
                    $0.restTimerPausedSeconds = max(0, end.timeIntervalSinceNow)
                }
            } else if let remaining = records.data.restTimerPausedSeconds, remaining > 0 {
                _ = records.update {
                    $0.restEndsAt = .now.addingTimeInterval(remaining)
                    $0.restTimerPausedSeconds = nil
                }
            }
        }
        await WorkoutLiveActivityCoordinator.shared.flush()
        #endif
        return .result()
    }
}
