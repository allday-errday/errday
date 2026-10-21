import ErrdayCore
import SwiftUI

struct WorkoutSessionComparison {
    let previous: Workout
    let volumeChange: Double
    let setChange: Int

    static func latest(for workout: Workout, in history: [Workout]) -> WorkoutSessionComparison? {
        let name = workout.name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, workout.completedSets > 0 else { return nil }
        guard let previous = history
            .filter({ $0.id != workout.id && $0.startedAt < workout.startedAt
                && $0.completedSets > 0
                && $0.name.trimmingCharacters(in: .whitespacesAndNewlines)
                    .caseInsensitiveCompare(name) == .orderedSame })
            .max(by: { $0.startedAt < $1.startedAt }) else { return nil }

        return WorkoutSessionComparison(previous: previous,
                                        volumeChange: workout.volume - previous.volume,
                                        setChange: workout.completedSets - previous.completedSets)
    }
}

struct WorkoutSessionComparisonCard: View {
    let comparison: WorkoutSessionComparison

    var body: some View {
        ErrdayCard {
            HStack(alignment: .firstTextBaseline) {
                Text("Compared with last time")
                    .font(.system(size: 15, weight: .semibold))
                Spacer()
                Text(comparison.previous.startedAt, format: .dateTime.day().month(.abbreviated))
                    .font(.system(size: 12))
                    .foregroundStyle(ErrdayTheme.secondary)
            }
            HStack(spacing: 18) {
                metric("Volume", value: signed(comparison.volumeChange) + " kg")
                metric("Completed sets", value: signed(comparison.setChange))
            }
        }
    }

    private func metric(_ title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            Text(value).font(.system(size: 17, weight: .semibold))
                .foregroundStyle(ErrdayTheme.text)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private func signed(_ value: Double) -> String {
        value > 0 ? "+\(value.decimal)" : value < 0 ? "−\((-value).decimal)" : "0"
    }

    private func signed(_ value: Int) -> String {
        value > 0 ? "+\(value)" : "\(value)"
    }
}
