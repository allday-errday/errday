import SwiftUI
import UniformTypeIdentifiers
import WatchConnectivity
import Charts
import ErrdayCore

private struct SetSelection: Identifiable {
    let exerciseID: UUID
    let setID: UUID
    var id: String { "\(exerciseID)-\(setID)" }
}

private struct RestSelection: Identifiable {
    let exerciseID: UUID
    var id: UUID { exerciseID }
}

struct WorkoutView: View {
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    @Environment(\.dismiss) private var dismiss
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var confirmFinish = false
    @State private var confirmDiscard = false
    @State private var completedWorkout: Workout?
    @State private var selectedSet: SetSelection?
    @State private var restSelection: RestSelection?
    @State private var showExercisePicker = false
    @State private var replaceExerciseID: UUID?
    @State private var draggingExerciseID: UUID?
    @State private var showWatch = false
    @State private var watchConnected = false
    @State private var showTimer = false
    @State private var showRestComplete = false

    var body: some View {
        Group {
            if let completedWorkout {
                WorkoutSummaryView(workout: completedWorkout)
                    .safeAreaInset(edge: .bottom) {
                        Button("Done") { dismiss() }.buttonStyle(PrimaryButtonStyle())
                            .padding(.horizontal, 20).padding(.vertical, 12).errdayActionBar()
                    }
            } else if let workout = records.data.activeWorkout {
                activeWorkout(workout)
            } else {
                ContentUnavailableView("No active workout", systemImage: "dumbbell")
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .errdayKeyboardDone()
        .sheet(item: $restSelection) { selection in
            if let exercise = exercise(with: selection.exerciseID) {
                RestTimerEditor(exerciseID: exercise.id, exerciseName: exercise.name,
                                initialSeconds: exercise.restSeconds ?? 90,
                                initialWarmupSeconds: exercise.warmupRestSeconds ?? min(exercise.restSeconds ?? 90, 90))
                    .presentationDetents([.large])
            }
        }
        .sheet(isPresented: $showExercisePicker) {
            ExercisePicker(title: replaceExerciseID == nil ? "Add exercises" : "Replace exercise",
                           selectionLimit: replaceExerciseID == nil ? nil : 1) { selected in
                applyExerciseSelection(selected)
            }
        }
        .sheet(item: $selectedSet) { selection in
            if let set = set(for: selection) {
                SetTypeSheet(current: set.effectiveType, onSelect: { type in
                    updateSet(selection) { $0.type = type }
                }, onRemove: { removeSet(selection) })
                .presentationDetents([.large])
            }
        }
        .sheet(isPresented: $showWatch) {
            if let workout = records.data.activeWorkout {
                WorkoutWatchView(workout: workout, isConnected: watchConnected)
            }
        }
        .sheet(isPresented: $showTimer) {
            WorkoutTimerSheet()
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .confirmationDialog("Finish workout?", isPresented: $confirmFinish, titleVisibility: .visible) {
            Button("Finish") { finish() }
            Button("Cancel", role: .cancel) {}
        } message: { Text("Completed sets will be saved to your workout history.") }
        .confirmationDialog("Discard this workout?", isPresented: $confirmDiscard, titleVisibility: .visible) {
            Button("Discard Workout", role: .destructive) {
                if records.update({ clearWorkoutTimer(in: &$0); $0.activeWorkout = nil }) { dismiss() }
            }
            Button("Keep Workout", role: .cancel) {}
        } message: { Text("This active workout and its entered sets will be deleted.") }
        .task { await monitorWatch() }
    }

    private func activeWorkout(_ workout: Workout) -> some View {
        VStack(spacing: 0) {
            workoutHeader(workout)
                .padding(.horizontal, 18).padding(.vertical, 8)
                .errdayActionBar()
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 18) {
                        sessionSummary(workout) { exerciseID in
                            withAnimation(.snappy) { proxy.scrollTo(exerciseID, anchor: .top) }
                        }
                        ForEach(workout.exercises) { exercise in
                            exerciseCard(exercise)
                                .id(exercise.id)
                                .opacity(draggingExerciseID == exercise.id ? 0.72 : 1)
                                .scaleEffect(draggingExerciseID == exercise.id ? 0.985 : 1)
                                .onDrop(of: [UTType.text], delegate: ExerciseReorderDropDelegate(
                                    targetID: exercise.id, draggingID: $draggingExerciseID, move: moveExercise
                                ))
                        }
                        Button { replaceExerciseID = nil; showExercisePicker = true } label: {
                            Label("Add exercise", systemImage: "plus")
                        }
                        .buttonStyle(PrimaryButtonStyle(secondary: true))

                        Button(role: .destructive) { confirmDiscard = true } label: {
                            Label("Discard workout", systemImage: "trash")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(.red)
                                .frame(maxWidth: .infinity, minHeight: 50)
                                .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                        }
                        .buttonStyle(.plain)
                        .accessibilityHint("Deletes this active workout after confirmation")
                        .padding(.top, 4)
                        .padding(.bottom, 32)
                    }
                    .padding(.horizontal, 18).padding(.top, 10)
                    .frame(maxWidth: 620).frame(maxWidth: .infinity)
                }
            }
        }
        .errdayBackground().foregroundStyle(ErrdayTheme.text)
        .task(id: records.data.restEndsAt) { await clearRestWhenFinished() }
        .overlay(alignment: .top) {
            if showRestComplete && !showTimer {
                WorkoutRestCompleteBanner { showRestComplete = false }
                    .padding(.horizontal, 18)
                    .padding(.top, 64)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .task(id: showRestComplete) {
            guard showRestComplete else { return }
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            withAnimation(.snappy) { showRestComplete = false }
        }
    }

    private func workoutHeader(_ workout: Workout) -> some View {
        HStack(spacing: 16) {
            Button { dismiss() } label: { Image(systemName: "chevron.down").frame(width: 44, height: 44).errdayGlassCircle(interactive: true) }
                .buttonStyle(.plain).accessibilityLabel("Minimise workout")
            Button { showTimer = true } label: { WorkoutTimerChip() }
                .buttonStyle(.plain)
                .accessibilityLabel("Open workout timer")
            Spacer()
            Button { showWatch = true } label: {
                Image(systemName: watchConnected ? "applewatch.radiowaves.left.and.right" : "applewatch")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(watchConnected ? Color.green : ErrdayTheme.quiet)
                    .frame(width: 44, height: 44)
                    .errdayGlassCircle(interactive: true)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(watchConnected ? "Apple Watch connected" : "Open Apple Watch workout data")
            Button("Finish") { confirmFinish = true }
                .font(.system(size: 14, weight: .semibold)).foregroundStyle(.white)
                .padding(.horizontal, 20).frame(height: 44)
                .errdayGlass(radius: 22, tint: ErrdayTheme.gymAccent, interactive: true)
                .buttonStyle(.plain)
        }
    }

    private func sessionSummary(_ workout: Workout, onNext: @escaping (UUID) -> Void) -> some View {
        let progress = WorkoutSetProgress(workout: workout)
        return VStack(spacing: 0) {
            HStack(spacing: 0) {
                TimelineView(.periodic(from: .now, by: 1)) { _ in
                    summaryMetric("Duration", elapsed(workout.startedAt), accent: true)
                }
                summaryMetric("Volume", "\(workout.volume.whole) kg")
                summaryMetric("Sets", progress.total > 0 ? "\(progress.completed)/\(progress.total)" : "0")
            }
            .padding(.vertical, 17)

            if progress.total > 0 {
                Divider().overlay(ErrdayTheme.border)
                if let next = progress.next {
                    Button { onNext(next.exerciseID) } label: {
                        HStack(spacing: 10) {
                            ProgressView(value: Double(progress.completed), total: Double(progress.total))
                                .tint(ErrdayTheme.gymAccent)
                                .frame(width: 58)
                            Text("Next: \(next.exerciseName) · Set \(next.number)")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(ErrdayTheme.text)
                                .lineLimit(1)
                            Spacer(minLength: 4)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(ErrdayTheme.quiet)
                        }
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Jump to next incomplete set: \(next.exerciseName), set \(next.number)")
                } else {
                    Label("All \(progress.total) sets complete", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(ErrdayTheme.gymAccent)
                        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                }
            }
        }
        .padding(.horizontal, 16)
        .errdaySurface()
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(ErrdayTheme.border))
    }

    private func summaryMetric(_ title: String, _ value: String, accent: Bool = false) -> some View {
        VStack(spacing: 5) {
            Text(title).font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            Text(value).font(.system(size: 18, weight: .semibold)).monospacedDigit()
                .foregroundStyle(accent ? ErrdayTheme.gymAccent : ErrdayTheme.text)
        }.frame(maxWidth: .infinity)
    }

    private func exerciseCard(_ exercise: Exercise) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                exerciseThumbnail(exercise)
                VStack(alignment: .leading, spacing: 4) {
                    Text(exercise.name).font(.system(size: 17, weight: .semibold)).lineLimit(2)
                    if let progress = WorkoutWeightBest.forExercise(exercise, workouts: records.data.workouts) {
                        WorkoutWeightBestLabel(progress: progress)
                            .animation(.snappy, value: progress.isNewBest)
                    }
                }
                Spacer(minLength: 4)
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(ErrdayTheme.quiet)
                    .frame(width: 36, height: 44)
                    .contentShape(Rectangle())
                    .onDrag {
                        draggingExerciseID = exercise.id
                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        return NSItemProvider(object: exercise.id.uuidString as NSString)
                    } preview: {
                        Text(exercise.name)
                            .font(.system(size: 15, weight: .semibold))
                            .padding(14)
                            .errdaySurface()
                    }
                    .accessibilityLabel("Reorder \(exercise.name)")
                    .accessibilityHint("Press and hold, then drag up or down")
                Menu {
                    Button("Replace exercise", systemImage: "arrow.triangle.2.circlepath") {
                        replaceExerciseID = exercise.id; showExercisePicker = true
                    }
                    Button("Move to top", systemImage: "arrow.up.to.line") { moveExerciseToTop(exercise.id) }
                    Divider()
                    Button("Delete exercise", systemImage: "trash", role: .destructive) { deleteExercise(exercise.id) }
                } label: {
                    Image(systemName: "ellipsis").font(.system(size: 20, weight: .semibold)).frame(width: 44, height: 44)
                }
                .accessibilityLabel("Options for \(exercise.name)")
            }
            TextField("Notes…", text: notesBinding(exercise.id), axis: .vertical)
                .font(.system(size: 14)).lineLimit(1...3).padding(.vertical, 6)
            HStack(spacing: 10) {
                Button { openTimer(for: exercise) } label: {
                    Label("Rest Timer: \(restText(exercise.restSeconds ?? 90))", systemImage: "timer")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(ErrdayTheme.gymAccent)
                        .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
                Spacer()
                Button { restSelection = RestSelection(exerciseID: exercise.id) } label: {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(ErrdayTheme.secondary)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Set rest duration for \(exercise.name)")
            }
            HStack(spacing: 8) {
                Text("SET").frame(width: 36)
                Text("PREVIOUS").frame(maxWidth: .infinity)
                Text("KG").frame(width: 68)
                Text("REPS").frame(width: 64)
                Color.clear.frame(width: 42)
            }.font(.system(size: 10, weight: .medium)).foregroundStyle(ErrdayTheme.secondary)
            ForEach(Array(exercise.sets.enumerated()), id: \.element.id) { setIndex, set in
                DeleteSwipeRow(allowsRowTap: false, onTap: {}, onDelete: {
                    removeSet(SetSelection(exerciseID: exercise.id, setID: set.id))
                }) {
                    setRow(exercise: exercise, set: set, setIndex: setIndex).background(ErrdayTheme.surface)
                }
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            Button { addSet(to: exercise.id) } label: {
                Label("Add set", systemImage: "plus")
                    .frame(maxWidth: .infinity, minHeight: 46)
                    .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 10))
            }.buttonStyle(.plain)
        }
        .padding(16)
        .errdaySurface()
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(ErrdayTheme.border))
        .animation(.snappy, value: draggingExerciseID)
    }

    private func exerciseThumbnail(_ exercise: Exercise) -> some View {
        let symbol = ExerciseCatalog.muscle(for: exercise)?.symbol ?? "dumbbell.fill"
        return Group {
            if let url = exercise.imageURL {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFit().padding(5)
                    } else {
                        Image(systemName: symbol).font(.system(size: 23, weight: .medium))
                            .foregroundStyle(ErrdayTheme.gymAccent)
                    }
                }
            } else {
                Image(systemName: symbol).font(.system(size: 23, weight: .medium))
                    .foregroundStyle(ErrdayTheme.gymAccent)
            }
        }
            .frame(width: 58, height: 58)
            .errdaySurface()
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(ErrdayTheme.border))
    }

    private func setRow(exercise: Exercise, set: WorkoutSet, setIndex: Int) -> some View {
        let selection = SetSelection(exerciseID: exercise.id, setID: set.id)
        let prior = previousSet(exerciseName: exercise.name, setIndex: setIndex)
        return HStack(spacing: 8) {
            Button { selectedSet = selection } label: {
                Text(set.effectiveType == .normal ? "\(setIndex + 1)" : set.effectiveType.shortLabel)
                    .font(.system(size: 15, weight: .semibold)).frame(width: 36, height: 44)
                    .foregroundStyle(setTypeColor(set.effectiveType))
            }.buttonStyle(.plain)
            if let prior {
                Button { copyPreviousSet(prior, to: selection) } label: {
                    HStack(spacing: 3) {
                        Text("\(prior.weight.decimal) kg × \(prior.repetitions)")
                        Image(systemName: "arrow.down.left")
                            .font(.system(size: 9, weight: .semibold))
                    }
                    .font(.system(size: 12))
                    .foregroundStyle(set.completed ? ErrdayTheme.secondary : ErrdayTheme.gymAccent)
                    .lineLimit(1).minimumScaleFactor(0.8)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(set.completed)
                .accessibilityLabel("Copy previous set: \(prior.weight.decimal) kilograms, \(prior.repetitions) repetitions")
            } else {
                Text("—").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            TextField("0", value: weightBinding(selection), format: .number)
                .keyboardType(.decimalPad).multilineTextAlignment(.center).font(.system(size: 16, weight: .semibold))
                .frame(width: 68, height: 44).errdaySurface()
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(ErrdayTheme.border))
            TextField("0", value: repsBinding(selection), format: .number)
                .keyboardType(.numberPad).multilineTextAlignment(.center).font(.system(size: 16, weight: .semibold))
                .frame(width: 64, height: 44).errdaySurface()
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(ErrdayTheme.border))
            Button { toggleSet(selection) } label: {
                Image(systemName: "checkmark").font(.system(size: 16, weight: .bold)).frame(width: 42, height: 42)
                    .foregroundStyle(set.completed ? .white : ErrdayTheme.quiet)
                    .background(set.completed ? ErrdayTheme.gymAccent : ErrdayTheme.raised, in: Circle())
            }.buttonStyle(.plain)
        }.frame(minHeight: 48)
    }

    private func setTypeColor(_ type: WorkoutSetType) -> Color {
        switch type {
        case .warmup: .orange
        case .failure: .red
        case .drop: .blue
        case .left, .right: .teal
        case .myoReps: .purple
        case .normal: ErrdayTheme.gymAccent
        }
    }

    private func exercise(with id: UUID) -> Exercise? { records.data.activeWorkout?.exercises.first { $0.id == id } }
    private func set(for selection: SetSelection) -> WorkoutSet? {
        exercise(with: selection.exerciseID)?.sets.first { $0.id == selection.setID }
    }
    private func updateSet(_ selection: SetSelection, change: (inout WorkoutSet) -> Void) {
        records.update { data in
            guard let exerciseIndex = data.activeWorkout?.exercises.firstIndex(where: { $0.id == selection.exerciseID }),
                  let setIndex = data.activeWorkout?.exercises[exerciseIndex].sets.firstIndex(where: { $0.id == selection.setID }) else { return }
            change(&data.activeWorkout!.exercises[exerciseIndex].sets[setIndex])
        }
    }
    private func toggleSet(_ selection: SetSelection) {
        guard let exercise = exercise(with: selection.exerciseID), let set = set(for: selection) else { return }
        let shouldStartRest = !set.completed
        guard records.update({ data in
            guard let exerciseIndex = data.activeWorkout?.exercises.firstIndex(where: { $0.id == selection.exerciseID }),
                  let setIndex = data.activeWorkout?.exercises[exerciseIndex].sets.firstIndex(where: { $0.id == selection.setID }) else { return }
            data.activeWorkout!.exercises[exerciseIndex].sets[setIndex].completed.toggle()
            if shouldStartRest {
                let seconds = set.effectiveType == .warmup
                    ? (exercise.warmupRestSeconds ?? min(exercise.restSeconds ?? 90, 90))
                    : (exercise.restSeconds ?? 90)
                data.restTimerDurationSeconds = seconds > 0 ? seconds : nil
                data.restTimerPausedSeconds = nil
                data.restEndsAt = seconds > 0 ? .now.addingTimeInterval(Double(seconds)) : nil
            } else { data.restEndsAt = nil; data.restTimerPausedSeconds = nil }
        }) else { return }
        if shouldStartRest { ErrdayHaptics.success(isEnabled: hapticsEnabled) }
        else { ErrdayHaptics.selection(isEnabled: hapticsEnabled) }
    }
    private func addSet(to exerciseID: UUID) {
        records.update { data in
            guard let index = data.activeWorkout?.exercises.firstIndex(where: { $0.id == exerciseID }) else { return }
            data.activeWorkout!.exercises[index].sets.append(WorkoutSet())
        }
    }
    private func removeSet(_ selection: SetSelection) {
        selectedSet = nil
        records.update { data in
            guard let exerciseIndex = data.activeWorkout?.exercises.firstIndex(where: { $0.id == selection.exerciseID }),
                  let setIndex = data.activeWorkout?.exercises[exerciseIndex].sets.firstIndex(where: { $0.id == selection.setID }) else { return }
            data.activeWorkout!.exercises[exerciseIndex].sets.remove(at: setIndex)
        }
    }
    private func deleteExercise(_ id: UUID) {
        records.update { $0.activeWorkout?.exercises.removeAll { $0.id == id } }
    }
    private func moveExercise(_ sourceID: UUID, before targetID: UUID) {
        guard sourceID != targetID else { return }
        records.update { data in
            guard var exercises = data.activeWorkout?.exercises,
                  let source = exercises.firstIndex(where: { $0.id == sourceID }),
                  let target = exercises.firstIndex(where: { $0.id == targetID }) else { return }
            let moved = exercises.remove(at: source)
            exercises.insert(moved, at: min(target, exercises.count))
            data.activeWorkout?.exercises = exercises
        }
    }
    private func moveExerciseToTop(_ id: UUID) {
        records.update { data in
            guard var exercises = data.activeWorkout?.exercises,
                  let index = exercises.firstIndex(where: { $0.id == id }) else { return }
            exercises.insert(exercises.remove(at: index), at: 0)
            data.activeWorkout?.exercises = exercises
        }
    }
    private func applyExerciseSelection(_ selected: [CatalogExercise]) {
        guard !selected.isEmpty else { return }
        records.update { data in
            guard var workout = data.activeWorkout else { return }
            if let replaceExerciseID, let index = workout.exercises.firstIndex(where: { $0.id == replaceExerciseID }) {
                let existing = workout.exercises[index]
                var replacement = selected[0].exercise
                replacement.id = existing.id
                replacement.sets = existing.sets
                replacement.notes = existing.notes
                replacement.restSeconds = existing.restSeconds
                replacement.warmupRestSeconds = existing.warmupRestSeconds
                workout.exercises[index] = replacement
            } else { workout.exercises.append(contentsOf: selected.map(\.exercise)) }
            data.activeWorkout = workout
        }
        replaceExerciseID = nil
    }
    private func previousSet(exerciseName: String, setIndex: Int) -> WorkoutSet? {
        records.data.workouts.sorted { $0.startedAt > $1.startedAt }
            .compactMap { workout -> WorkoutSet? in
                guard let exercise = workout.exercises.first(where: {
                    $0.name.caseInsensitiveCompare(exerciseName) == .orderedSame
                }), exercise.sets.indices.contains(setIndex) else { return nil }
                let set = exercise.sets[setIndex]
                guard set.completed, set.weight.isFinite, (0...2000).contains(set.weight),
                      (0...1000).contains(set.repetitions) else { return nil }
                return set
            }
            .first
    }
    private func copyPreviousSet(_ prior: WorkoutSet, to selection: SetSelection) {
        guard let current = set(for: selection), !current.completed else { return }
        guard records.update({ data in
            guard let exerciseIndex = data.activeWorkout?.exercises.firstIndex(where: { $0.id == selection.exerciseID }),
                  let setIndex = data.activeWorkout?.exercises[exerciseIndex].sets.firstIndex(where: { $0.id == selection.setID }) else { return }
            data.activeWorkout!.exercises[exerciseIndex].sets[setIndex].weight = prior.weight
            data.activeWorkout!.exercises[exerciseIndex].sets[setIndex].repetitions = prior.repetitions
        }) else { return }
        ErrdayHaptics.selection(isEnabled: hapticsEnabled)
    }
    private func notesBinding(_ exerciseID: UUID) -> Binding<String> {
        Binding(get: { exercise(with: exerciseID)?.notes ?? "" }, set: { value in
            records.update { data in
                guard let index = data.activeWorkout?.exercises.firstIndex(where: { $0.id == exerciseID }) else { return }
                data.activeWorkout!.exercises[index].notes = value
            }
        })
    }
    private func weightBinding(_ selection: SetSelection) -> Binding<Double> {
        Binding(get: { set(for: selection)?.weight ?? 0 }, set: { value in
            guard value.isFinite, (0...2000).contains(value) else { return }; updateSet(selection) { $0.weight = value }
        })
    }
    private func repsBinding(_ selection: SetSelection) -> Binding<Int> {
        Binding(get: { set(for: selection)?.repetitions ?? 10 }, set: { value in
            guard (0...1000).contains(value) else { return }; updateSet(selection) { $0.repetitions = value }
        })
    }
    private func finish() {
        guard var workout = records.data.activeWorkout else { return }
        workout.finishedAt = .now
        if records.update({ data in
            data.workouts.append(workout); data.program?.advance(after: workout.templateID)
            clearWorkoutTimer(in: &data); data.activeWorkout = nil
        }) { completedWorkout = workout }
    }
    private func elapsed(_ start: Date) -> String {
        let seconds = max(0, Int(Date.now.timeIntervalSince(start)))
        return String(format: "%d:%02d:%02d", seconds / 3600, (seconds / 60) % 60, seconds % 60)
    }
    private func restText(_ seconds: Int) -> String {
        seconds % 60 == 0 ? "\(seconds / 60)min" : "\(seconds / 60)m \(seconds % 60)s"
    }
    private func openTimer(for exercise: Exercise) {
        if records.data.restEndsAt == nil, (records.data.restTimerPausedSeconds ?? 0) <= 0 {
            _ = records.update {
                $0.restTimerDurationSeconds = exercise.restSeconds ?? 90
                $0.restTimerPausedSeconds = nil
            }
        }
        showTimer = true
    }
    private func clearWorkoutTimer(in data: inout PersonalData) {
        data.restEndsAt = nil
        data.restTimerDurationSeconds = nil
        data.restTimerPausedSeconds = nil
        data.workoutStopwatchStartedAt = nil
        data.workoutStopwatchElapsedSeconds = nil
    }
    private func clearRestWhenFinished() async {
        guard let end = records.data.restEndsAt else { return }
        let remaining = end.timeIntervalSinceNow
        if remaining > 0 {
            do { try await Task.sleep(for: .seconds(remaining)) }
            catch { return }
        }
        guard !Task.isCancelled, records.data.restEndsAt == end else { return }
        guard records.update({ $0.restEndsAt = nil; $0.restTimerPausedSeconds = 0 }) else { return }
        if Date.now.timeIntervalSince(end) < 10 {
            ErrdayHaptics.success(isEnabled: hapticsEnabled)
            withAnimation(.snappy) { showRestComplete = true }
        }
    }
    private func monitorWatch() async {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.activate()
        while !Task.isCancelled {
            watchConnected = session.activationState == .activated
                && session.isPaired
                && session.isWatchAppInstalled
                && session.isReachable
            try? await Task.sleep(for: .seconds(2))
        }
    }
}

private struct ExerciseReorderDropDelegate: DropDelegate {
    let targetID: UUID
    @Binding var draggingID: UUID?
    let move: (UUID, UUID) -> Void
    func dropEntered(info: DropInfo) {
        guard let draggingID, draggingID != targetID else { return }
        withAnimation(.snappy) { move(draggingID, targetID) }
    }
    func performDrop(info: DropInfo) -> Bool { draggingID = nil; return true }
}

struct SetTypeSheet: View {
    @Environment(\.dismiss) private var dismiss
    let current: WorkoutSetType
    let onSelect: (WorkoutSetType) -> Void
    let onRemove: () -> Void
    private let types: [WorkoutSetType] = [.warmup, .failure, .drop, .normal, .left, .right, .myoReps]
    var body: some View {
        VStack(spacing: 14) {
            Capsule().fill(ErrdayTheme.border).frame(width: 40, height: 5)
            Text("Select set type").font(.system(size: 20, weight: .semibold)).padding(.bottom, 4)
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(types, id: \.rawValue) { type in
                        Button { onSelect(type); dismiss() } label: {
                            HStack(spacing: 14) {
                                Text(type.shortLabel).font(.system(size: 15, weight: .bold)).foregroundStyle(color(type)).frame(width: 30)
                                Text(type.title).foregroundStyle(ErrdayTheme.text)
                                Spacer()
                                if type == current { Image(systemName: "checkmark").foregroundStyle(ErrdayTheme.gymAccent) }
                            }.padding(.horizontal, 14).frame(minHeight: 48)
                                .errdaySurface()
                                .overlay(RoundedRectangle(cornerRadius: 10).stroke(ErrdayTheme.border))
                        }.buttonStyle(.plain)
                    }
                }
            }
            Button(role: .destructive) { dismiss(); onRemove() } label: {
                Label("Remove set", systemImage: "trash").frame(maxWidth: .infinity, minHeight: 46, alignment: .leading)
                    .padding(.horizontal, 14).errdaySurface()
            }.buttonStyle(.plain)
        }.padding(20).errdayBackground().foregroundStyle(ErrdayTheme.text)
    }
    private func color(_ type: WorkoutSetType) -> Color {
        switch type { case .warmup: .yellow; case .failure: .red; case .drop: ErrdayTheme.gymAccent; default: ErrdayTheme.secondary }
    }
}

struct RestTimerEditor: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    let exerciseID: UUID
    let exerciseName: String
    @State private var setKind = RestSetKind.normal
    @State private var normalSeconds: Int
    @State private var warmupSeconds: Int

    private enum RestSetKind: String, CaseIterable, Identifiable {
        case normal = "Normal set"
        case warmup = "Warm-up set"
        var id: String { rawValue }
    }

    init(exerciseID: UUID, exerciseName: String, initialSeconds: Int, initialWarmupSeconds: Int) {
        self.exerciseID = exerciseID; self.exerciseName = exerciseName
        _normalSeconds = State(initialValue: max(5, min(600, initialSeconds)))
        _warmupSeconds = State(initialValue: max(5, min(600, initialWarmupSeconds)))
    }
    var body: some View {
        VStack(spacing: 18) {
            Capsule().fill(ErrdayTheme.border).frame(width: 40, height: 5)
            Text("Rest Timer").font(.system(size: 21, weight: .semibold))
            Text(exerciseName).font(.system(size: 14)).foregroundStyle(ErrdayTheme.secondary)
            Picker("Set kind", selection: $setKind) {
                ForEach(RestSetKind.allCases) { kind in Text(kind.rawValue).tag(kind) }
            }.pickerStyle(.segmented)
            Picker("Rest duration", selection: durationBinding) {
                ForEach(Array(stride(from: 5, through: 600, by: 5)), id: \.self) { value in Text(duration(value)).tag(value) }
            }
            .pickerStyle(.wheel)
            .frame(maxHeight: 260)
            .accessibilityLabel("\(setKind.rawValue) rest duration")
            Spacer()
            Button("Done") {
                records.update { data in
                    guard let index = data.activeWorkout?.exercises.firstIndex(where: { $0.id == exerciseID }) else { return }
                    data.activeWorkout!.exercises[index].restSeconds = normalSeconds
                    data.activeWorkout!.exercises[index].warmupRestSeconds = warmupSeconds
                    if data.restEndsAt == nil, (data.restTimerPausedSeconds ?? 0) <= 0 {
                        data.restTimerDurationSeconds = normalSeconds
                        data.restTimerPausedSeconds = nil
                    }
                }; dismiss()
            }.buttonStyle(PrimaryButtonStyle())
        }.padding(20).errdayBackground().foregroundStyle(ErrdayTheme.text)
    }
    private var durationBinding: Binding<Int> {
        Binding(
            get: { setKind == .normal ? normalSeconds : warmupSeconds },
            set: { if setKind == .normal { normalSeconds = $0 } else { warmupSeconds = $0 } }
        )
    }
    private func duration(_ value: Int) -> String { "\(value / 60)m \(value % 60)s" }
}

struct WorkoutWatchView: View {
    @Environment(HealthStore.self) private var health
    @Environment(\.dismiss) private var dismiss
    let workout: Workout
    let isConnected: Bool
    @State private var snapshot = WorkoutHealthSnapshot()
    @State private var isRefreshing = false
    @State private var showSetup = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    watchStatus
                    HStack(spacing: 0) {
                        TimelineView(.periodic(from: .now, by: 1)) { _ in
                            watchMetric("Duration", durationText)
                        }
                        watchMetric("Heart rate", snapshot.latestHeartRate.map { "\(Int($0.rounded())) bpm" } ?? "—")
                        watchMetric("Calories", snapshot.activeCalories.map { "\(Int($0.rounded())) kcal" } ?? "—")
                    }.padding(.vertical, 18).errdaySurface()
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(ErrdayTheme.border))
                    heartRateSection
                    Button("Troubleshooting & Setup") { showSetup.toggle() }
                        .buttonStyle(PrimaryButtonStyle(secondary: true))
                    if showSetup { setupHelp }
                }.padding(20)
            }
            .errdayBackground().foregroundStyle(ErrdayTheme.text)
            .navigationTitle("Watch workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: { Image(systemName: "xmark") }.accessibilityLabel("Close")
                }
            }
            .refreshable { await reload() }
            .task {
                while !Task.isCancelled {
                    await reload()
                    try? await Task.sleep(for: .seconds(15))
                }
            }
        }
    }

    private var watchStatus: some View {
        HStack(spacing: 12) {
            Image(systemName: isConnected ? "applewatch.radiowaves.left.and.right" : "applewatch")
            VStack(alignment: .leading, spacing: 2) {
                Text(isConnected ? "Apple Watch Connected" : "Apple Watch Not Reachable")
                    .font(.system(size: 16, weight: .semibold))
                Text(isConnected ? "Live connection available" : "Showing Health data when it becomes available")
                    .font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
            }
            Spacer()
            if isRefreshing { ProgressView().controlSize(.small) }
        }
        .foregroundStyle(isConnected ? Color.green : ErrdayTheme.text)
        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
        .background((isConnected ? Color.green : ErrdayTheme.raised).opacity(isConnected ? 0.1 : 1), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(isConnected ? Color.green.opacity(0.45) : ErrdayTheme.border))
    }

    @ViewBuilder private var heartRateSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Heart rate").font(.system(size: 20, weight: .semibold))
                Text(snapshot.sourceNames.isEmpty ? "Current workout · Apple Health" : snapshot.sourceNames.joined(separator: ", "))
                    .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            }
            if snapshot.heartRates.isEmpty {
                ContentUnavailableView(
                    "No workout heart-rate data",
                    systemImage: "heart",
                    description: Text("Errday does not invent readings. Start a Watch workout and allow heart-rate access in Apple Health.")
                )
                .frame(minHeight: 230)
            } else {
                Chart(snapshot.heartRates) { item in
                    AreaMark(x: .value("Time", item.date), y: .value("BPM", item.beatsPerMinute))
                        .foregroundStyle(LinearGradient(colors: [.red.opacity(0.30), .red.opacity(0.04)], startPoint: .top, endPoint: .bottom))
                    LineMark(x: .value("Time", item.date), y: .value("BPM", item.beatsPerMinute))
                        .foregroundStyle(.red).lineStyle(StrokeStyle(lineWidth: 2))
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .frame(height: 240)
                HStack {
                    watchSummary("Average", snapshot.averageHeartRate)
                    Spacer()
                    watchSummary("Maximum", snapshot.maximumHeartRate, trailing: true)
                }
            }
        }
        .padding(16)
        .errdaySurface()
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(ErrdayTheme.border))
    }

    private var setupHelp: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Keep your Watch workout running during the session.", systemImage: "applewatch")
            Label("Allow Heart Rate, Active Energy and Workouts in Apple Health.", systemImage: "heart.text.square")
            Label("Pull down to refresh after the Watch writes new samples.", systemImage: "arrow.clockwise")
            Button("Open Apple Health") {
                if let url = URL(string: "x-apple-health://") { UIApplication.shared.open(url) }
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(ErrdayTheme.gymAccent)
        }
        .font(.system(size: 13))
        .foregroundStyle(ErrdayTheme.secondary)
        .padding(16)
        .errdaySurface()
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(ErrdayTheme.border))
    }

    private func watchMetric(_ title: String, _ value: String) -> some View {
        VStack(spacing: 5) {
            Text(title).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
            Text(value).font(.system(size: 15, weight: .semibold)).minimumScaleFactor(0.75).lineLimit(1)
        }.frame(maxWidth: .infinity)
    }

    private func watchSummary(_ title: String, _ value: Double?, trailing: Bool = false) -> some View {
        VStack(alignment: trailing ? .trailing : .leading, spacing: 3) {
            Text(title).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
            Text(value.map { "\(Int($0.rounded())) bpm" } ?? "—")
                .font(.system(size: 20, weight: .semibold)).monospacedDigit()
        }
    }

    private var durationText: String {
        let seconds = max(0, Int(Date.now.timeIntervalSince(workout.startedAt)))
        return String(format: "%d:%02d:%02d", seconds / 3600, (seconds / 60) % 60, seconds % 60)
    }

    private func reload() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        if !health.hasRequested { await health.connect() }
        snapshot = await health.workoutSnapshot(from: workout.startedAt)
        isRefreshing = false
    }
}
