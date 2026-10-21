import ErrdayCore
import SwiftUI

enum WatchSetField: String, Hashable { case weight, reps }

struct WatchSetEditor: View {
    @Environment(WatchWorkoutStore.self) private var workouts
    @Environment(\.dismiss) private var dismiss
    let workoutID: UUID
    let exerciseID: UUID
    let setID: UUID
    let initialField: WatchSetField
    @State private var weight: Double
    @State private var reps: Double
    @FocusState private var focused: WatchSetField?

    init(workoutID: UUID, exerciseID: UUID, set: WorkoutSet, initialField: WatchSetField) {
        self.workoutID = workoutID
        self.exerciseID = exerciseID
        self.setID = set.id
        self.initialField = initialField
        _weight = State(initialValue: set.weight)
        _reps = State(initialValue: Double(set.repetitions))
    }

    private var setExists: Bool {
        workouts.snapshot?.activeWorkout?.id == workoutID
            && workouts.snapshot?.activeWorkout?.exercises.first(where: { $0.id == exerciseID })?.sets.contains(where: { $0.id == setID }) == true
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                numberControl("Weight · kg", field: .weight, value: $weight, step: 0.25, maximum: 2000)
                numberControl("Reps", field: .reps, value: $reps, step: 1, maximum: 1000)
                Text("Tap a number, then turn the Digital Crown.")
                    .font(.caption2).foregroundStyle(.secondary)
                Button("Save values") {
                    if workouts.perform(.editSet(workoutID: workoutID, exerciseID: exerciseID, setID: setID,
                                                 weight: weight, reps: Int(reps.rounded()))) { dismiss() }
                }.tint(WatchTheme.gym).buttonStyle(.borderedProminent)
                    .disabled(!setExists || workouts.error != nil).accessibilityIdentifier("watch.saveValues")
                if !setExists { Text("This set is no longer in your active workout.").font(.caption2) }
                if let error = workouts.actionError ?? workouts.error {
                    Text(error).font(.caption2).foregroundStyle(.orange)
                }
            }.padding(.horizontal, 8)
        }.navigationTitle("Edit set")
            .navigationBarTitleDisplayMode(.inline)
            .task { focused = initialField }
    }

    private func numberControl(_ title: String, field: WatchSetField, value: Binding<Double>, step: Double, maximum: Double) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.caption2).foregroundStyle(.secondary)
            HStack(spacing: 0) {
                Button { value.wrappedValue = max(0, value.wrappedValue - step) } label: {
                    Image(systemName: "minus").frame(width: 44, height: 44).contentShape(Rectangle())
                }.disabled(value.wrappedValue <= 0).accessibilityLabel("Decrease \(title)")
                Button { focused = field } label: {
                    Text(WatchTheme.number(value.wrappedValue)).font(.title3.weight(.semibold))
                        .monospacedDigit().lineLimit(1).minimumScaleFactor(0.6)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .foregroundStyle(focused == field ? WatchTheme.gym : Color.primary)
                }
                .focusable().focused($focused, equals: field)
                .digitalCrownRotation(value, from: 0, through: maximum, by: step, sensitivity: .low,
                                      isContinuous: false, isHapticFeedbackEnabled: true)
                .accessibilityLabel("\(title), \(WatchTheme.number(value.wrappedValue))")
                .accessibilityHint("Turn the Digital Crown to adjust")
                Button { value.wrappedValue = min(maximum, value.wrappedValue + step) } label: {
                    Image(systemName: "plus").frame(width: 44, height: 44).contentShape(Rectangle())
                }.disabled(value.wrappedValue >= maximum).accessibilityLabel("Increase \(title)")
            }.buttonStyle(.plain)
        }.disabled(!setExists)
    }
}
