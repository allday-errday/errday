import ErrdayCore
import Foundation

struct WorkoutSetProgress {
    struct NextSet {
        let exerciseID: UUID
        let exerciseName: String
        let number: Int
    }

    let completed: Int
    let total: Int
    let next: NextSet?

    init(workout: Workout) {
        completed = workout.completedSets
        total = workout.exercises.reduce(0) { $0 + $1.sets.count }
        next = workout.exercises.lazy.compactMap { exercise -> NextSet? in
            guard let index = exercise.sets.firstIndex(where: { !$0.completed }) else { return nil }
            return NextSet(exerciseID: exercise.id, exerciseName: exercise.name, number: index + 1)
        }.first
    }
}
