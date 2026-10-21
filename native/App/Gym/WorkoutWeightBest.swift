import ErrdayCore
import SwiftUI

struct WorkoutWeightBest {
    let previous: Double
    let current: Double?

    var isNewBest: Bool { (current ?? 0) > previous + 0.0001 }

    static func forExercise(_ exercise: Exercise, workouts: [Workout]) -> WorkoutWeightBest? {
        let name = exercise.name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return nil }

        let previous = workouts
            .flatMap(\.exercises)
            .filter { $0.name.trimmingCharacters(in: .whitespacesAndNewlines)
                .caseInsensitiveCompare(name) == .orderedSame }
            .flatMap(\.sets)
            .filter { $0.completed && $0.weight.isFinite && (0...2000).contains($0.weight) }
            .map(\.weight)
            .max()
        guard let previous, previous > 0 else { return nil }

        let current = exercise.sets
            .filter { $0.completed && $0.weight.isFinite && (0...2000).contains($0.weight) }
            .map(\.weight)
            .max()
        return WorkoutWeightBest(previous: previous, current: current)
    }
}

struct WorkoutWeightBestLabel: View {
    let progress: WorkoutWeightBest

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: progress.isNewBest ? "trophy.fill" : "chart.line.uptrend.xyaxis")
            Text(progress.isNewBest
                 ? "New best · \((progress.current ?? 0).decimal) kg"
                 : "Best to beat · \(progress.previous.decimal) kg")
        }
        .font(.system(size: 12, weight: progress.isNewBest ? .semibold : .regular))
        .foregroundStyle(progress.isNewBest ? ErrdayTheme.gymAccent : ErrdayTheme.secondary)
        .lineLimit(1)
        .minimumScaleFactor(0.85)
        .accessibilityLabel(progress.isNewBest
            ? "New heaviest set, \((progress.current ?? 0).decimal) kilograms"
            : "Previous best weight, \(progress.previous.decimal) kilograms")
    }
}
