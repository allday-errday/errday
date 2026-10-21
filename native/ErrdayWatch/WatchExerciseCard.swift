import ErrdayCore
import SwiftUI

struct WatchExerciseCard: View {
    @Environment(WatchWorkoutStore.self) private var workouts
    let workoutID: UUID
    let exercise: Exercise
    let openTimer: () -> Void
    @State private var editing: SetSelection?

    private struct SetSelection: Identifiable {
        let set: WorkoutSet
        let field: WatchSetField
        var id: UUID { return set.id }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 5) {
                Text(exercise.name).font(.headline)
                if let notes = exercise.notes, !notes.isEmpty {
                    Text(notes).font(.caption2).foregroundStyle(.secondary)
                }
                Button {
                    if workouts.snapshot?.restEndsAt == nil, workouts.snapshot?.restTimerPausedSeconds == nil {
                        workouts.perform(.rest(workoutID: workoutID, endsAt: nil, pausedSeconds: nil,
                                               durationSeconds: min(3600, max(0, exercise.restSeconds ?? 90))))
                    }
                    openTimer()
                } label: {
                    Label("Rest · \(WatchTheme.duration(Double(exercise.restSeconds ?? 90)))", systemImage: "timer")
                        .font(.caption2).frame(minHeight: 44)
                }.buttonStyle(.plain).foregroundStyle(WatchTheme.gym)
            }.padding(.horizontal, 10).padding(.top, 10)
            HStack(spacing: 0) {
                Text("#").frame(width: 14)
                Text("KG").frame(maxWidth: .infinity)
                Text("REPS").frame(maxWidth: .infinity)
                Image(systemName: "checkmark").frame(width: 44)
            }.font(.system(size: 10, weight: .medium)).foregroundStyle(.secondary).padding(.bottom, 4)
                .accessibilityHidden(true)
            ForEach(Array(exercise.sets.enumerated()), id: \.element.id) { index, set in
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        Text(set.effectiveType == .normal ? "\(index + 1)" : set.effectiveType.shortLabel)
                            .font(.system(size: 11, weight: .semibold)).foregroundStyle(WatchTheme.gym).frame(width: 14)
                        numberButton(WatchTheme.number(set.weight), set: set, field: .weight, index: index)
                        numberButton("\(set.repetitions)", set: set, field: .reps, index: index)
                        Button { toggle(setID: set.id) } label: {
                            Image(systemName: set.completed ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 23, weight: .medium))
                                .foregroundStyle(set.completed ? WatchTheme.gym : Color.secondary)
                                .frame(width: 44, height: 44).contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(set.completed ? "Undo set \(index + 1)" : "Complete set \(index + 1)")
                        .accessibilityIdentifier("watch.complete.\(index)")
                    }
                    .background(set.completed ? WatchTheme.gym.opacity(0.12) : Color.clear)
                    if let previous = workouts.snapshot?.previousSet(exerciseName: exercise.name, index: index) {
                        Button {
                            workouts.perform(.editSet(workoutID: workoutID, exerciseID: exercise.id, setID: set.id,
                                                      weight: previous.weight, reps: previous.repetitions))
                        } label: {
                            HStack(spacing: 4) {
                                Text("Previous: \(WatchTheme.number(previous.weight)) × \(previous.repetitions)")
                                    .lineLimit(1).minimumScaleFactor(0.7)
                                Spacer(minLength: 0)
                                if !set.completed { Image(systemName: "arrow.turn.up.left") }
                            }.font(.caption2).foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).padding(.horizontal, 10)
                        }
                        .buttonStyle(.plain).disabled(set.completed)
                        .accessibilityLabel("Copy previous set: \(WatchTheme.number(previous.weight)) kilograms, \(previous.repetitions) reps")
                        .accessibilityIdentifier("watch.previous.\(index)")
                    }
                    if index < exercise.sets.count - 1 { Divider().padding(.horizontal, 10) }
                }
            }
            Button {
                workouts.perform(.addSet(workoutID: workoutID, exerciseID: exercise.id, set: WorkoutSet()))
            } label: {
                Label("Add set", systemImage: "plus").font(.caption)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }.buttonStyle(.plain).foregroundStyle(WatchTheme.gym)
                .disabled(exercise.sets.count >= 100).accessibilityIdentifier("watch.addSet")
        }
        .background(WatchTheme.surface, in: RoundedRectangle(cornerRadius: WatchTheme.radius))
        .disabled(workouts.error != nil)
        .sheet(item: $editing) { selection in
            NavigationStack {
                WatchSetEditor(workoutID: workoutID, exerciseID: exercise.id, set: selection.set, initialField: selection.field)
            }
        }
    }

    private func numberButton(_ text: String, set: WorkoutSet, field: WatchSetField, index: Int) -> some View {
        Button { editing = SetSelection(set: set, field: field) } label: {
            Text(text).font(.system(size: 16, weight: .semibold)).monospacedDigit()
                .lineLimit(1).minimumScaleFactor(0.6)
                .frame(maxWidth: .infinity, minHeight: 44).contentShape(Rectangle())
        }.buttonStyle(.plain)
            .accessibilityLabel("Set \(index + 1), \(field == .weight ? "weight" : "reps"), \(text)")
            .accessibilityIdentifier("watch.\(field.rawValue).\(index)")
    }

    private func toggle(setID: UUID) {
        // Resolve the latest value, not the row captured before a phone sync.
        guard let active = workouts.snapshot?.activeWorkout, active.id == workoutID,
              let set = active.exercises.first(where: { $0.id == exercise.id })?.sets.first(where: { $0.id == setID })
        else { return }
        workouts.perform(.set(workoutID: workoutID, exerciseID: exercise.id, setID: setID,
                              weight: set.weight, reps: set.repetitions, completed: !set.completed))
    }
}
