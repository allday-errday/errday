import ErrdayCore
import SwiftUI

struct WatchSessionPicker: View {
    @Environment(WatchWorkoutStore.self) private var workouts

    var body: some View {
        List {
            ForEach(workouts.snapshot?.templates ?? []) { template in
                NavigationLink(value: WatchRoute.session(template.id)) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(template.name).font(.headline)
                        Text("\(template.exercises.count) exercises · \(template.exercises.flatMap(\.sets).count) sets")
                            .font(.caption2).foregroundStyle(.secondary)
                    }.padding(.vertical, 4)
                }
            }
            if workouts.snapshot?.templates.isEmpty != false {
                Text(workouts.snapshot == nil
                     ? "Open Errday on iPhone to sync your program."
                     : "Add sessions to your program on iPhone. You can start any of them here.")
                    .font(.caption)
                Button("Sync now") { workouts.retry() }.disabled(workouts.syncing)
            }
        }.navigationTitle("Your sessions").navigationBarTitleDisplayMode(.inline)
    }
}

struct WatchSessionPreview: View {
    @Environment(WatchWorkoutStore.self) private var workouts
    let templateID: UUID
    let onStarted: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let template = workouts.snapshot?.templates.first(where: { $0.id == templateID }) {
                    if let active = workouts.snapshot?.activeWorkout {
                        Text("\(active.name) is already in progress. Finish or discard it before starting another session.")
                            .font(.caption)
                        NavigationLink("Resume workout", value: WatchRoute.workout)
                    } else {
                        Button {
                            if workouts.perform(.start(templateID: templateID, workoutID: UUID())) { onStarted() }
                        } label: {
                            Label("Start \(template.name)", systemImage: "play.fill")
                                .frame(maxWidth: .infinity, minHeight: 44)
                        }
                        .tint(WatchTheme.gym).buttonStyle(.borderedProminent)
                        .disabled(workouts.error != nil).accessibilityIdentifier("watch.start")
                    }
                    ForEach(Array(template.exercises.enumerated()), id: \.element.id) { index, exercise in
                        HStack(alignment: .top, spacing: 8) {
                            Text("\(index + 1)").font(.caption).foregroundStyle(WatchTheme.gym)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(exercise.name).font(.headline)
                                Text("\(exercise.sets.count) sets").font(.caption2).foregroundStyle(.secondary)
                            }.frame(maxWidth: .infinity, alignment: .leading)
                        }.watchSurface()
                    }
                } else {
                    Text("This session changed. Go back and choose it again.").font(.caption)
                }
                if let error = workouts.actionError ?? workouts.error {
                    Text(error).font(.caption2).foregroundStyle(.orange)
                }
            }.padding(.horizontal, 8)
        }.navigationTitle(workouts.snapshot?.templates.first(where: { $0.id == templateID })?.name ?? "Session")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct WatchSyncView: View {
    @Environment(WatchWorkoutStore.self) private var workouts
    @State private var confirmDiscard = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(workouts.error ?? (workouts.pending.isEmpty
                     ? "Your program and workout sync with Errday on iPhone."
                     : "Your edits are saved on this Watch. Open Errday on both devices to finish syncing."))
                    .font(.caption)
                if !workouts.pending.isEmpty {
                    Text("\(workouts.pending.count) pending edits").font(.caption2).foregroundStyle(.secondary)
                }
                Button(workouts.syncing ? "Syncing…" : "Sync now") { workouts.retry() }.disabled(workouts.syncing)
                if workouts.error != nil && !workouts.pending.isEmpty {
                    Button("Use iPhone version", role: .destructive) { confirmDiscard = true }
                }
            }.padding(.horizontal, 8)
        }.navigationTitle("iPhone sync")
        .confirmationDialog("Discard unsynced Watch edits?", isPresented: $confirmDiscard, titleVisibility: .visible) {
            Button("Discard Watch edits", role: .destructive) { workouts.usePhoneVersion() }
        } message: { Text("Your saved iPhone workout will be kept.") }
    }
}
