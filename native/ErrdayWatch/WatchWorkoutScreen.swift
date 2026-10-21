import ErrdayCore
import SwiftUI

struct WatchWorkoutView: View {
    @Environment(WatchWorkoutStore.self) private var workouts
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var finishConfirmation = false
    @State private var discardConfirmation = false
    @State private var finished: Workout?
    @State private var sheet: WorkoutSheet?

    private enum WorkoutSheet: Identifiable {
        case timer(UUID), sync
        var id: String {
            switch self {
            case .timer(let id): "timer-\(id)"
            case .sync: "sync"
            }
        }
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if let workout = workouts.snapshot?.activeWorkout {
                        summary(workout)
                        HStack(spacing: 8) {
                            Button { sheet = .timer(workout.id) } label: {
                                WatchRestChip().frame(maxWidth: .infinity, minHeight: 44)
                            }.tint(WatchTheme.gym).accessibilityIdentifier("watch.timer")
                            Button("Finish") { finishConfirmation = true }
                                .tint(WatchTheme.gym)
                                .disabled(workout.completedSets == 0 || workouts.error != nil)
                                .accessibilityIdentifier("watch.finish")
                        }.font(.caption)
                        if let next = workout.exercises.first(where: { $0.sets.contains { !$0.completed } }),
                           let index = next.sets.firstIndex(where: { !$0.completed }) {
                            Button {
                                withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.25)) {
                                    proxy.scrollTo(next.id, anchor: .top)
                                }
                            } label: {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text("Next · Set \(index + 1)").foregroundStyle(WatchTheme.gym)
                                    Text(next.name).foregroundStyle(.primary)
                                }.font(.caption2).frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            }.buttonStyle(.plain).accessibilityIdentifier("watch.next")
                        }
                        ForEach(workout.exercises) { exercise in
                            WatchExerciseCard(workoutID: workout.id, exercise: exercise) { sheet = .timer(workout.id) }
                                .id(exercise.id)
                        }
                        Button("Discard workout", role: .destructive) { discardConfirmation = true }
                            .font(.caption).disabled(workouts.error != nil)
                        if !workouts.pending.isEmpty || workouts.error != nil {
                            Button(workouts.error == nil ? "Saved on Watch · sync status" : "Check sync") { sheet = .sync }
                                .font(.caption2).foregroundStyle(.secondary)
                        }
                    } else if let finished {
                        Image(systemName: "checkmark.circle.fill").font(.largeTitle).foregroundStyle(WatchTheme.gym)
                        Text("Workout saved").font(.title3.weight(.semibold))
                        Text(finished.name).font(.headline)
                        Text("\(finished.completedSets) sets · \(WatchTheme.number(finished.volume)) kg volume")
                            .font(.caption).foregroundStyle(.secondary)
                        if !workouts.pending.isEmpty {
                            Text("Saved on Watch. Syncs when connected to iPhone.")
                                .font(.caption2).foregroundStyle(.secondary)
                        }
                        Button("Done") { dismiss() }
                    } else {
                        Text("No active workout").font(.headline)
                        Text("Choose a session to begin.").font(.caption).foregroundStyle(.secondary)
                        Button("Done") { dismiss() }
                    }
                    if let error = workouts.actionError {
                        Text(error).font(.caption2).foregroundStyle(.orange)
                    }
                }.padding(.horizontal, 8)
            }
        }
        .navigationTitle(workouts.snapshot?.activeWorkout?.name ?? "Workout")
        .navigationBarTitleDisplayMode(.inline)
        .task { await WatchRestAlerts.requestAccess() }
        .sheet(item: $sheet) { item in
            NavigationStack {
                switch item {
                case .timer(let id): WatchRestTimerView(workoutID: id)
                case .sync: WatchSyncView()
                }
            }
        }
        .confirmationDialog("Finish this workout?", isPresented: $finishConfirmation, titleVisibility: .visible) {
            Button("Finish & save") {
                guard let workout = workouts.snapshot?.activeWorkout else { return }
                if workouts.perform(.finish(workoutID: workout.id)) { finished = workout }
            }
        } message: { Text("Your completed sets will appear in your workout history.") }
        .confirmationDialog("Discard this workout?", isPresented: $discardConfirmation, titleVisibility: .visible) {
            Button("Discard workout", role: .destructive) {
                guard let id = workouts.snapshot?.activeWorkout?.id else { return }
                if workouts.perform(.discard(workoutID: id)) { dismiss() }
            }
        } message: { Text("This session and its sets won’t be saved to history.") }
    }

    private func summary(_ workout: Workout) -> some View {
        VStack(spacing: 10) {
            HStack(spacing: 4) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Duration").foregroundStyle(.secondary)
                    Text(workout.startedAt, style: .timer).foregroundStyle(WatchTheme.gym)
                        .monospacedDigit().lineLimit(1).minimumScaleFactor(0.6)
                }.frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Vol · kg").foregroundStyle(.secondary)
                    Text(WatchTheme.number(workout.volume)).monospacedDigit().lineLimit(1).minimumScaleFactor(0.6)
                }.frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Sets").foregroundStyle(.secondary)
                    Text("\(workout.completedSets)").monospacedDigit()
                }
            }.font(.system(size: 11))
            ProgressView(value: Double(workout.completedSets), total: Double(max(1, workout.exercises.flatMap(\.sets).count)))
                .tint(WatchTheme.gym)
                .accessibilityLabel("Workout progress")
        }.watchSurface()
    }
}
