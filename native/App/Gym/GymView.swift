import SwiftUI
import Charts
import UniformTypeIdentifiers
import ErrdayCore

struct GymView: View {
    @Environment(PersonalStore.self) private var records
    @State private var showProgram = false
    @State private var showFreeWorkout = false
    @State private var showActiveWorkout = false
    @State private var selectedTemplate: Workout?
    @State private var openStartedWorkout = false
    @State private var editHistory: Workout?
    @State private var deleteHistory: Workout?
    @State private var chartMetric = GymChartMetric.duration
    @State private var showLyftaImporter = false
    @State private var importMessage: String?

    private var week: [Workout] {
        guard let interval = Calendar.current.dateInterval(of: .weekOfYear, for: .now) else { return [] }
        return records.data.workouts.filter { interval.contains($0.startedAt) }
    }
    private var weekMinutes: Int {
        Int(week.reduce(0) { $0 + max(0, ($1.finishedAt ?? $1.startedAt).timeIntervalSince($1.startedAt)) } / 60)
    }
    private var trainingWeek: Int {
        let first = records.data.workouts.map(\.startedAt).min() ?? records.data.activeWorkout?.startedAt ?? .now
        return max(1, (Calendar.current.dateComponents([.weekOfYear], from: first, to: .now).weekOfYear ?? 0) + 1)
    }

    var body: some View {
        ErrdayPage {
            RestedOverview(date: .now, accent: ErrdayTheme.gymAccent)

            VStack(spacing: 12) {
                SectionHeading(title: "Your program", actionTitle: "Manage", action: { showProgram = true })
                programCard
            }

            HStack(spacing: 10) {
                GymMetric(title: "Workouts", value: "\(week.count)", note: "Week \(trainingWeek)")
                GymMetric(title: "Minutes", value: "\(weekMinutes)", note: "7 days")
                GymMetric(title: "Volume", value: compactVolume(week.reduce(0) { $0 + $1.volume }), note: "7 days")
            }

            GymActivityCard(workouts: week, metric: $chartMetric)

            MuscleGainOverview()

            VStack(spacing: 12) {
                SectionHeading(title: "Exercise progress")
                NavigationLink { ExerciseProgressView(workouts: records.data.workouts) } label: {
                    ExerciseProgressSummaryCard(workouts: records.data.workouts)
                }.buttonStyle(.plain)
            }

            VStack(spacing: 12) {
                SectionHeading(title: "Muscle recovery", actionTitle: "View all")
                NavigationLink { RecoveryView() } label: {
                    RecoveryOverviewCard(recoveries: RecoveryEstimator.recoveries(from: records.data.workouts))
                }
                .buttonStyle(.plain)
            }

            GymInsightsCard(workouts: records.data.workouts)

            VStack(spacing: 12) {
                HStack {
                    Text("Workout history").font(.system(size: 18, weight: .semibold)).foregroundStyle(ErrdayTheme.text)
                    Spacer()
                    Button { showLyftaImporter = true } label: {
                        Image(systemName: "square.and.arrow.down")
                    }
                    .font(.system(size: 13, weight: .medium)).foregroundStyle(ErrdayTheme.gymAccent)
                    .accessibilityLabel("Import Lyfta CSV")
                    NavigationLink { WorkoutLogDashboardView(workouts: records.data.workouts) } label: {
                        HStack(spacing: 3) { Text("View all"); Image(systemName: "chevron.right").font(.system(size: 9)) }
                    }.font(.system(size: 12, weight: .medium)).foregroundStyle(ErrdayTheme.gymAccent)
                }
                if records.data.workouts.isEmpty {
                    ErrdayCard {
                        EmptySection(title: "No workouts yet", symbol: "dumbbell", message: "Start your program or a free workout to build your history.")
                    }
                }
                ForEach(records.data.workouts.sorted { $0.startedAt > $1.startedAt }.prefix(3)) { workout in
                    DeleteSwipeRow(onTap: { editHistory = workout }, onDelete: { deleteHistory = workout }) {
                        WorkoutHistoryCard(workout: workout)
                    }
                }
            }

            Button("Start free workout") { showFreeWorkout = true }
                .buttonStyle(PrimaryButtonStyle(secondary: true))
                .disabled(records.data.activeWorkout != nil)
        }
        .sheet(isPresented: $showProgram) { ProgramEditor() }
        .sheet(isPresented: $showFreeWorkout, onDismiss: { if records.data.activeWorkout != nil { showActiveWorkout = true } }) { CreateWorkoutView() }
        .sheet(item: $selectedTemplate, onDismiss: {
            if openStartedWorkout {
                openStartedWorkout = false
                showActiveWorkout = true
            }
        }) { template in
            ProgramSessionSheet(templateID: template.id) { openStartedWorkout = true }
        }
        .fullScreenCover(isPresented: $showActiveWorkout) { WorkoutView() }
        .sheet(item: $editHistory) { workout in
            WorkoutTemplateEditor(workout: workout) { saved in records.update { data in if let i = data.workouts.firstIndex(where: { $0.id == saved.id }) { data.workouts[i] = saved } } }
        }
        .confirmationDialog("Delete this workout?", isPresented: Binding(get: { deleteHistory != nil }, set: { if !$0 { deleteHistory = nil } })) {
            Button("Delete", role: .destructive) { if let deleteHistory { records.update { $0.workouts.removeAll { $0.id == deleteHistory.id } } }; deleteHistory = nil }
        }
        .fileImporter(isPresented: $showLyftaImporter, allowedContentTypes: [.commaSeparatedText, .plainText]) { result in
            Task { await importLyfta(result) }
        }
        .alert("Lyfta import", isPresented: Binding(get: { importMessage != nil }, set: { if !$0 { importMessage = nil } })) {
            Button("OK") { importMessage = nil }
        } message: { Text(importMessage ?? "") }
    }

    private func compactVolume(_ value: Double) -> String {
        value >= 1_000 ? String(format: "%.1fk", value / 1_000) : "\(value.whole)"
    }

    @MainActor
    private func importLyfta(_ selection: Result<URL, Error>) async {
        do {
            let url = try selection.get()
            let imported = try await Task.detached { try LyftaCSVImporter.parse(url: url) }.value
            let existing = Set(records.data.workouts.map { workoutKey($0) })
            let newWorkouts = imported.workouts.filter { !existing.contains(workoutKey($0)) }
            guard !newWorkouts.isEmpty else {
                importMessage = "All \(imported.workouts.count) workouts are already in Errday."
                return
            }
            let suggestedProgram = records.data.program == nil ? suggestedProgram(from: records.data.workouts + newWorkouts) : nil
            guard records.update({ data in
                data.workouts.append(contentsOf: newWorkouts)
                if data.program == nil { data.program = suggestedProgram }
            }) else {
                importMessage = "The workouts were read, but could not be saved."
                return
            }
            importMessage = "Imported \(newWorkouts.count) workouts and \(imported.sourceRows) sets." + (suggestedProgram == nil ? "" : " A program was created from your recent rotation.")
        } catch {
            importMessage = error.localizedDescription
        }
    }

    private func workoutKey(_ workout: Workout) -> String {
        "\(workout.name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())|\(Int(workout.startedAt.timeIntervalSince1970))"
    }

    private func suggestedProgram(from workouts: [Workout]) -> TrainingProgram? {
        let rotation = ["push", "pull", "legs"]
        let sources = rotation.compactMap { name in
            workouts.filter {
                let normalized = $0.name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                return normalized == name || normalized.hasPrefix(name + " ") || normalized.hasSuffix(" " + name)
            }.max(by: { $0.startedAt < $1.startedAt })
        }
        guard sources.count >= 2 else { return nil }
        var plan = TrainingProgram()
        plan.name = sources.count == 3 ? "Push / Pull / Legs" : "Imported Lyfta Program"
        plan.templates = sources.map { source in
            var template = source
            template.id = UUID()
            template.templateID = nil
            template.startedAt = .now
            template.finishedAt = nil
            template.notes = nil
            for exerciseIndex in template.exercises.indices {
                template.exercises[exerciseIndex].id = UUID()
                for setIndex in template.exercises[exerciseIndex].sets.indices {
                    template.exercises[exerciseIndex].sets[setIndex].id = UUID()
                    template.exercises[exerciseIndex].sets[setIndex].completed = false
                }
            }
            return template
        }
        if let latest = sources.indices.max(by: { sources[$0].startedAt < sources[$1].startedAt }) {
            plan.nextTemplateID = plan.templates[(latest + 1) % plan.templates.count].id
        }
        return plan
    }

    @ViewBuilder private var programCard: some View {
        if let plan = records.data.program, !plan.templates.isEmpty {
            ErrdayCard {
                Text(plan.name).font(.system(size: 15, weight: .semibold))
                if let active = records.data.activeWorkout {
                    Button { showActiveWorkout = true } label: {
                        Label("Resume \(active.name)", systemImage: "play.fill")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                }
                ForEach(plan.templates) { workout in
                    Button { selectedTemplate = workout } label: {
                        HStack(spacing: 12) {
                            workoutIcon(for: workout)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(workout.name).font(.system(size: 14, weight: .semibold)).foregroundStyle(ErrdayTheme.text)
                                Text("\(workout.exercises.count) exercises · \(workout.exercises.flatMap(\.sets).count) sets")
                                    .font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .semibold)).foregroundStyle(ErrdayTheme.quiet)
                        }
                        .frame(minHeight: 48)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Shows exercises and lets you start this session")
                }
            }
        } else {
            ErrdayCard {
                Text("No program yet").font(.system(size: 15, weight: .semibold))
                Text("Create a simple rotation and add exercises when you are ready.")
                    .font(.system(size: 13)).foregroundStyle(ErrdayTheme.secondary)
                if let active = records.data.activeWorkout {
                    Button("Resume \(active.name)") { showActiveWorkout = true }.buttonStyle(PrimaryButtonStyle())
                } else {
                    Button("Create program") { showProgram = true }.buttonStyle(PrimaryButtonStyle())
                }
            }
        }
    }

    private func workoutIcon(for workout: Workout) -> some View {
        Image(systemName: workoutSymbol(for: workout))
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(ErrdayTheme.gymAccent)
            .frame(width: 36, height: 36)
            .background(ErrdayTheme.gymAccent.opacity(0.09), in: RoundedRectangle(cornerRadius: 9))
    }

    private func workoutSymbol(for workout: Workout) -> String {
        let name = workout.name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if name.contains("push") { return "figure.strengthtraining.traditional" }
        if name.contains("pull") { return "figure.rower" }
        if name.contains("leg") { return "figure.run" }
        if name.contains("upper") { return "figure.strengthtraining.functional" }
        if name.contains("lower") { return "figure.walk" }
        return "dumbbell.fill"
    }

}

private struct ProgramSessionSheet: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    let templateID: UUID
    let onStarted: () -> Void

    private var template: Workout? {
        records.data.program?.templates.first { $0.id == templateID }
    }

    var body: some View {
        NavigationStack {
            ErrdayPage {
                if let template {
                    PageHeading(title: template.name,
                                subtitle: "\(template.exercises.count) exercises · \(template.exercises.flatMap(\.sets).count) sets")
                    if template.exercises.isEmpty {
                        ErrdayCard { EmptySection(title: "No exercises yet", symbol: "dumbbell",
                                                  message: "Start now and add exercises during the workout, or add them under Manage.") }
                    } else {
                        ErrdayCard {
                            ForEach(Array(template.exercises.enumerated()), id: \.element.id) { index, exercise in
                                HStack(spacing: 12) {
                                    Image(systemName: "dumbbell.fill")
                                        .foregroundStyle(ErrdayTheme.gymAccent)
                                        .frame(width: 24)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(exercise.name).font(.system(size: 14, weight: .semibold))
                                        Text("\(exercise.sets.count) sets" + (exercise.repRange.map { " · \($0) reps" } ?? ""))
                                            .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                                    }
                                    Spacer()
                                }
                                .frame(minHeight: 48)
                                if index < template.exercises.count - 1 { Divider() }
                            }
                        }
                    }
                    if records.data.activeWorkout != nil {
                        Text("Finish or discard your current workout before starting another session.")
                            .font(.footnote).foregroundStyle(ErrdayTheme.secondary)
                    }
                } else {
                    ContentUnavailableView("Session unavailable", systemImage: "dumbbell")
                }
            }
            .navigationTitle("Program session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .safeAreaInset(edge: .bottom) {
                if let template {
                    Button { start(template) } label: {
                        Label("Start \(template.name)", systemImage: "play.fill")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(records.data.activeWorkout != nil)
                    .padding(.horizontal, 20).padding(.vertical, 12)
                    .errdayActionBar()
                }
            }
        }
        .presentationDragIndicator(.visible)
    }

    private func start(_ template: Workout) {
        guard records.data.activeWorkout == nil,
              let current = records.data.program?.templates.first(where: { $0.id == template.id }),
              records.update({ $0.activeWorkout = current.start() }),
              records.data.activeWorkout?.templateID == template.id else { return }
        ErrdayHaptics.success(isEnabled: hapticsEnabled)
        onStarted()
        dismiss()
    }
}

struct GymMetric: View {
    let title: String
    let value: String
    var note: String = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
            Text(value).font(.system(size: 20, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.55)
            if !note.isEmpty { Text(note).font(.system(size: 10)).foregroundStyle(ErrdayTheme.secondary) }
        }.frame(maxWidth: .infinity, minHeight: 82, alignment: .leading).padding(12)
            .errdaySurface()
    }
}

struct GymScreenHeader: View {
    let title: String
    let subtitle: String
    let back: () -> Void
    var trailingTitle: String?
    var trailingAction: (() -> Void)?
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Button(action: back) {
                    Image(systemName: "chevron.left").font(.system(size: 16, weight: .semibold))
                        .frame(width: 44, height: 44).errdayGlassCircle(interactive: true)
                }.buttonStyle(.plain).accessibilityLabel("Back")
                Spacer()
                if let trailingTitle, let trailingAction {
                    Button(trailingTitle, action: trailingAction)
                        .font(.system(size: 14, weight: .semibold)).foregroundStyle(ErrdayTheme.gymAccent)
                        .padding(.horizontal, 16).frame(minHeight: 44).errdayGlass(radius: 22, interactive: true)
                        .buttonStyle(.plain)
                }
            }.errdayGlassControls()
            Text(title).font(.system(size: 28, weight: .semibold))
            Text(subtitle).font(.system(size: 13)).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}

struct GymInput: View {
    let label: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label).font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            TextField("", text: $text).font(.system(size: 14)).keyboardType(keyboard)
        }.padding(12).frame(minHeight: 64)
            .errdaySurface()
    }
}

struct ProgramEditor: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @State private var draft = TrainingProgram()
    @State private var editing: Workout?
    @State private var newWorkoutName = ""
    @State private var loaded = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    GymScreenHeader(title: records.data.program == nil ? "Create Program" : "Edit Program",
                                    subtitle: records.data.program == nil ? "Start simple. Add as many workouts as you need." : "Choose any session whenever you train.",
                                    back: { dismiss() })
                    GymInput(label: "Program name", text: $draft.name)
                    if !draft.templates.isEmpty {
                        VStack(spacing: 0) {
                            ForEach(Array(draft.templates.enumerated()), id: \.element.id) { index, workout in
                                programRow(workout, index: index)
                                if index < draft.templates.count - 1 { Divider().overlay(ErrdayTheme.border) }
                            }
                        }.padding(16).errdaySurface()
                    }
                    Button { addWorkout() } label: { Label("Add Workout", systemImage: "plus") }.buttonStyle(PrimaryButtonStyle(secondary: true))
                    GymInput(label: "New workout name", text: $newWorkoutName)
                    Text("There’s no fixed order. Add the sessions you want to start whenever they fit.")
                        .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                }.padding(20).padding(.bottom, 76).frame(maxWidth: 620).frame(maxWidth: .infinity)
            }.errdayBackground().foregroundStyle(ErrdayTheme.text).toolbar(.hidden, for: .navigationBar)
                .errdayKeyboardDone()
                .safeAreaInset(edge: .bottom) {
                    Button(records.data.program == nil ? "Create Program" : "Save Program") { save() }
                        .buttonStyle(PrimaryButtonStyle()).padding(.horizontal, 20).padding(.vertical, 12).errdayActionBar()
                        .disabled(draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .task {
                    guard !loaded else { return }
                    if let existing = records.data.program { draft = existing }
                    else { draft.name = "My Strength Program" }
                    loaded = true
                }
                .sheet(item: $editing) { workout in
                    WorkoutTemplateEditor(workout: workout) { saved in
                        if let i = draft.templates.firstIndex(where: { $0.id == saved.id }) { draft.templates[i] = saved } else { draft.templates.append(saved) }
                        if draft.nextTemplateID == nil { draft.nextTemplateID = saved.id }
                    }
                }
        }
    }

    private func programRow(_ workout: Workout, index: Int) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                FigmaIcon(asset: "b0ce3").frame(width: 20, height: 20)
                Button { editing = workout } label: {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(workout.name)
                            Image(systemName: "chevron.right").font(.caption)
                        }.foregroundStyle(ErrdayTheme.text)
                        Text("\(workout.exercises.count) exercises · \(workout.exercises.flatMap(\.sets).count) sets").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }.buttonStyle(.plain)
                Button { editing = workout } label: { Image(systemName: "pencil") }.foregroundStyle(ErrdayTheme.secondary)
                Button(role: .destructive) { draft.templates.removeAll { $0.id == workout.id } } label: { Image(systemName: "trash") }
            }
            HStack(spacing: 20) {
                Button("Move up") { move(index, by: -1) }.disabled(index == 0)
                Button("Move down") { move(index, by: 1) }.disabled(index == draft.templates.count - 1)
                Spacer()
            }.font(.system(size: 11, weight: .semibold)).foregroundStyle(ErrdayTheme.secondary)
        }.padding(.vertical, 8)
    }
    private func addWorkout() {
        let name = newWorkoutName.trimmingCharacters(in: .whitespacesAndNewlines)
        editing = Workout(name: name.isEmpty ? "New Workout" : name, exercises: [])
        newWorkoutName = ""
    }
    private func move(_ index: Int, by offset: Int) {
        let destination = index + offset
        guard draft.templates.indices.contains(index), draft.templates.indices.contains(destination) else { return }
        draft.templates.swapAt(index, destination)
    }
    private func save() { guard records.update({ $0.program = draft }) else { return }; dismiss() }
}

struct WorkoutTemplateEditor: View {
    @Environment(\.dismiss) private var dismiss
    @State private var workout: Workout
    @State private var showPicker = false
    let onSave: (Workout) -> Void
    init(workout: Workout, onSave: @escaping (Workout) -> Void) { _workout = State(initialValue: workout); self.onSave = onSave }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    GymScreenHeader(title: workout.name.isEmpty ? "Workout" : workout.name,
                                    subtitle: "Workout template · \(workout.exercises.count) exercises · \(workout.exercises.flatMap(\.sets).count) sets", back: { dismiss() })
                    GymInput(label: "Workout name", text: $workout.name)
                    ForEach(Array(workout.exercises.indices), id: \.self) { index in exerciseCard(index) }
                    Button { showPicker = true } label: { Label("Add Exercise", systemImage: "plus") }.buttonStyle(PrimaryButtonStyle(secondary: true))
                }.padding(20).padding(.bottom, 76).frame(maxWidth: 620).frame(maxWidth: .infinity)
            }.errdayBackground().foregroundStyle(ErrdayTheme.text).toolbar(.hidden, for: .navigationBar)
                .errdayKeyboardDone()
                .safeAreaInset(edge: .bottom) {
                    Button("Save Workout") { onSave(workout); dismiss() }.buttonStyle(PrimaryButtonStyle())
                        .padding(.horizontal, 20).padding(.vertical, 12).errdayActionBar()
                        .disabled(workout.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .sheet(isPresented: $showPicker) { ExercisePicker { workout.exercises.append(contentsOf: $0.map(\.exercise)) } }
        }
    }

    private func exerciseCard(_ index: Int) -> some View {
        ErrdayCard {
            HStack(spacing: 12) {
                FigmaIcon(asset: "b0ce3").frame(width: 20, height: 20)
                TextField("Exercise", text: $workout.exercises[index].name).font(.system(size: 15, weight: .semibold))
                Button(role: .destructive) { workout.exercises.remove(at: index) } label: { Image(systemName: "trash") }
            }
            Divider().overlay(ErrdayTheme.border)
            HStack(spacing: 10) {
                numberField("Sets", value: setCountBinding(index))
                textField("Rep range", placeholder: "8–12", value: Binding(get: { workout.exercises[index].repRange ?? "" }, set: { workout.exercises[index].repRange = $0 }))
            }
            HStack(spacing: 10) {
                numberField("Rest (sec)", value: Binding(get: { workout.exercises[index].restSeconds ?? 90 }, set: { workout.exercises[index].restSeconds = min(max($0, 0), 600) }))
                textField("Notes", placeholder: "Optional", value: Binding(get: { workout.exercises[index].notes ?? "" }, set: { workout.exercises[index].notes = $0 }))
            }
        }
    }
    private func numberField(_ title: String, value: Binding<Int>) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
            TextField("", value: value, format: .number).keyboardType(.numberPad).padding(10).background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 8))
        }.frame(maxWidth: .infinity)
    }
    private func textField(_ title: String, placeholder: String, value: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
            TextField(placeholder, text: value).padding(10).background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 8))
        }.frame(maxWidth: .infinity)
    }
    private func setCountBinding(_ index: Int) -> Binding<Int> {
        Binding(get: { workout.exercises[index].sets.count }, set: { count in
            let safe = min(max(count, 1), 12)
            while workout.exercises[index].sets.count < safe { workout.exercises[index].sets.append(WorkoutSet()) }
            while workout.exercises[index].sets.count > safe { workout.exercises[index].sets.removeLast() }
        })
    }
}

struct ExercisePicker: View {
    @Environment(\.dismiss) private var dismiss
    @State private var media = ExerciseMediaStore()
    @State private var query = ""
    @State private var muscle: MuscleGroup?
    @State private var equipment: String?
    @State private var selected = Set<String>()
    var title = "Add exercises"
    var selectionLimit: Int? = nil
    let onSelect: ([CatalogExercise]) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    Button { dismiss() } label: {
                        Label("Gym", systemImage: "chevron.left")
                            .font(.system(size: 13))
                            .foregroundStyle(ErrdayTheme.gymAccent)
                    }
                    .buttonStyle(.plain)

                    Text(title)
                        .font(.system(size: 28, weight: .semibold))
                        .tracking(-0.6)

                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 17))
                            .foregroundStyle(ErrdayTheme.secondary)
                        TextField("Search exercises", text: $query)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }
                    .padding(.horizontal, 14)
                    .frame(height: 48)
                    .errdaySurface()

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Muscle group")
                            .font(.system(size: 13, weight: .semibold))
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                muscleButton(nil, title: "All", symbol: "square.grid.2x2")
                                ForEach(MuscleGroup.allCases) { item in
                                    muscleButton(item, title: item.rawValue, symbol: item.symbol)
                                }
                            }
                            .padding(.horizontal, 1)
                        }
                    }

                    HStack(spacing: 8) {
                        Menu {
                            Button("All equipment") { equipment = nil }
                            ForEach(equipmentOptions, id: \.self) { item in
                                Button(item) { equipment = item }
                            }
                        } label: {
                            filterLabel(equipment ?? "Equipment", active: equipment != nil)
                        }
                    }

                    HStack {
                        Text("\(filterTitle) · \(filtered.count) exercises · \(selected.count) selected")
                            .font(.system(size: 13))
                            .foregroundStyle(ErrdayTheme.secondary)
                        Spacer()
                        if media.loading { ProgressView().controlSize(.small) }
                    }

                    if let error = media.error {
                        Text(error).font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                    }

                    ForEach(filtered) { item in
                        exerciseRow(item)
                    }

                    if !cleanQuery.isEmpty && !media.exercises.contains(where: { $0.name.caseInsensitiveCompare(cleanQuery) == .orderedSame }) {
                        Button {
                            let item = CatalogExercise(name: cleanQuery, muscle: muscle ?? .fullBody, equipment: equipment ?? "Other")
                            onSelect([item]); dismiss()
                        } label: {
                            Label("Create “\(cleanQuery)”", systemImage: "plus")
                        }
                        .buttonStyle(PrimaryButtonStyle(secondary: true))
                    }
                    Link("Exercise data by wger", destination: URL(string: "https://wger.de")!)
                        .font(.system(size: 11))
                        .foregroundStyle(ErrdayTheme.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 4)
                }
                .padding(.horizontal, 20)
                .padding(.top, 14)
                .padding(.bottom, 32)
                .frame(maxWidth: 620)
                .frame(maxWidth: .infinity)
                .errdayGlassControls()
            }
            .errdayBackground()
            .foregroundStyle(ErrdayTheme.text)
            .toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .bottom) {
                Button(selected.isEmpty ? "Select exercise" : actionTitle, action: addSelected)
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(selected.isEmpty)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .errdayActionBar()
            }
            .task { await media.load() }
        }
    }
    private var cleanQuery: String { query.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var equipmentOptions: [String] {
        Array(Set(media.exercises.map(\.equipment))).sorted()
    }
    private var filterTitle: String {
        if let muscle { return muscle.rawValue }
        if let equipment { return equipment }
        return "All exercises"
    }
    private var filtered: [CatalogExercise] {
        media.exercises.filter {
            (muscle == nil || $0.muscle == muscle) &&
            (equipment == nil || $0.equipment == equipment) &&
            (cleanQuery.isEmpty || $0.name.localizedStandardContains(cleanQuery) || $0.muscle.rawValue.localizedStandardContains(cleanQuery))
        }
    }
    private var actionTitle: String {
        if selectionLimit == 1 { return "Use this exercise" }
        return "Add \(selected.count) exercise\(selected.count == 1 ? "" : "s")"
    }
    private func toggle(_ item: CatalogExercise) {
        if selected.contains(item.id) { selected.remove(item.id) }
        else if selectionLimit == 1 { selected = [item.id] }
        else { selected.insert(item.id) }
    }
    private func addSelected() { onSelect(media.exercises.filter { selected.contains($0.id) }); dismiss() }

    private func filterLabel(_ title: String, active: Bool) -> some View {
        HStack(spacing: 8) {
            Text(title).lineLimit(1)
            Image(systemName: "chevron.down").font(.system(size: 10, weight: .semibold))
        }
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(active ? ErrdayTheme.gymAccent : ErrdayTheme.text)
        .padding(.horizontal, 12)
        .frame(minHeight: 44)
        .errdayGlass(radius: 22, tint: active ? ErrdayTheme.gymAccent.opacity(0.15) : nil, interactive: true)
    }

    private func muscleButton(_ item: MuscleGroup?, title: String, symbol: String) -> some View {
        let isSelected = muscle == item
        return Button {
            withAnimation(.snappy) { muscle = item }
        } label: {
            VStack(spacing: 7) {
                Image(systemName: symbol)
                    .font(.system(size: 20, weight: .medium))
                    .frame(width: 42, height: 34)
                Text(title)
                    .font(.system(size: 11, weight: isSelected ? .semibold : .regular))
                    .lineLimit(1)
            }
            .foregroundStyle(isSelected ? ErrdayTheme.gymAccent : ErrdayTheme.secondary)
            .frame(width: 76, height: 70)
            .background(isSelected ? ErrdayTheme.gymAccent.opacity(0.15) : ErrdayTheme.surface, in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(isSelected ? ErrdayTheme.gymAccent.opacity(0.3) : ErrdayTheme.border))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Show \(title) exercises")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func exerciseRow(_ item: CatalogExercise) -> some View {
        let isSelected = selected.contains(item.id)
        return HStack(spacing: 12) {
            Button { toggle(item) } label: {
                HStack(spacing: 12) {
                    ExerciseThumbnail(exercise: item)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.name)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(ErrdayTheme.text)
                            .multilineTextAlignment(.leading)
                        Text("\(item.muscle.rawValue) · \(item.equipment)")
                            .font(.system(size: 12))
                            .foregroundStyle(ErrdayTheme.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 4)
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 22))
                        .foregroundStyle(isSelected ? ErrdayTheme.gymAccent : ErrdayTheme.border)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .frame(minHeight: 66)
        .background(isSelected ? ErrdayTheme.gymAccent.opacity(0.15) : ErrdayTheme.surface, in: RoundedRectangle(cornerRadius: 12))
    }
}

private struct ExerciseThumbnail: View {
    let exercise: CatalogExercise
    var body: some View {
        Image(systemName: exercise.muscle.symbol)
            .font(.system(size: 23, weight: .medium))
            .foregroundStyle(ErrdayTheme.gymAccent)
        .frame(width: 50, height: 50)
        .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 9))
        .overlay(RoundedRectangle(cornerRadius: 9).stroke(ErrdayTheme.border))
        .clipShape(RoundedRectangle(cornerRadius: 9))
    }
}

private struct ExerciseAttributionSheet: View {
    @Environment(\.dismiss) private var dismiss
    let exercise: CatalogExercise
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Capsule().fill(ErrdayTheme.border).frame(width: 40, height: 5).frame(maxWidth: .infinity)
            HStack(spacing: 14) {
                ExerciseThumbnail(exercise: exercise)
                VStack(alignment: .leading, spacing: 4) {
                    Text(exercise.name).font(.system(size: 18, weight: .semibold))
                    Text("Exercise and image from wger").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                }
            }
            if let author = exercise.imageAuthor { LabeledContent("Image author", value: author) }
            if let license = exercise.licenseName, let url = exercise.licenseURL { Link("License: \(license)", destination: url) }
            Link("Open wger", destination: URL(string: "https://wger.de")!)
            Spacer()
        }
        .padding(20)
        .errdayBackground()
        .foregroundStyle(ErrdayTheme.text)
    }
}

struct CreateWorkoutView: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    var body: some View { WorkoutTemplateEditor(workout: Workout(name: "", exercises: [])) { workout in if records.update({ $0.activeWorkout = workout.start() }) { dismiss() } } }
}

struct WorkoutSummaryView: View {
    @Environment(PersonalStore.self) private var records
    @Environment(StravaStore.self) private var strava
    let workout: Workout
    @State private var showStrava = false
    private var duration: Int { Int(max(0, (workout.finishedAt ?? workout.startedAt).timeIntervalSince(workout.startedAt)) / 60) }
    private var priorWorkouts: [Workout] {
        records.data.workouts.filter { $0.id != workout.id && $0.startedAt < workout.startedAt }
    }
    private var sessionComparison: WorkoutSessionComparison? {
        WorkoutSessionComparison.latest(for: workout, in: records.data.workouts)
    }
    private var recordsSet: [(UUID, String, WorkoutWeightBest)] {
        return workout.exercises.compactMap { exercise in
            guard let progress = WorkoutWeightBest.forExercise(exercise, workouts: priorWorkouts),
                  progress.isNewBest else { return nil }
            return (exercise.id, exercise.name, progress)
        }
    }
    var body: some View {
        ErrdayPage {
            BrandHeader()
            PageHeading(title: "Workout Complete", subtitle: "\(workout.name) · \(workout.startedAt.formatted(.dateTime.day().month(.wide).year()))")
            HStack(spacing: 10) { GymMetric(title: "DURATION", value: "\(duration) min"); GymMetric(title: "VOLUME", value: "\(workout.volume.whole) kg") }
            ErrdayCard { LabeledContent("Exercises", value: "\(workout.exercises.count)"); Divider().overlay(ErrdayTheme.border); LabeledContent("Sets completed", value: "\(workout.completedSets)") }
            if let sessionComparison {
                WorkoutSessionComparisonCard(comparison: sessionComparison)
            }
            if strava.isConnected {
                Button {
                    Task { _ = await strava.share(workout) }
                } label: {
                    HStack {
                        if strava.isBusy { ProgressView().tint(.white) }
                        Label(strava.lastSharedWorkoutID == workout.id ? "Shared to Strava" : "Share to Strava",
                              systemImage: strava.lastSharedWorkoutID == workout.id ? "checkmark" : "arrow.up.right")
                    }
                }.buttonStyle(PrimaryButtonStyle()).disabled(strava.isBusy || strava.lastSharedWorkoutID == workout.id)
            } else {
                Button("Connect Strava", systemImage: "link") { showStrava = true }.buttonStyle(PrimaryButtonStyle(secondary: true))
            }
            if let error = strava.errorMessage { Text(error).font(.footnote).foregroundStyle(.orange) }
            if !recordsSet.isEmpty {
                Text("Personal Records").font(.system(size: 18, weight: .semibold))
                ErrdayCard {
                    ForEach(recordsSet, id: \.0) { item in
                        HStack(spacing: 10) {
                            Image(systemName: "trophy.fill").foregroundStyle(ErrdayTheme.gymAccent)
                            Text(item.1).lineLimit(2)
                            Spacer(minLength: 8)
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("\((item.2.current ?? 0).decimal) kg")
                                    .font(.system(size: 14, weight: .semibold))
                                Text("+\(((item.2.current ?? 0) - item.2.previous).decimal) kg")
                                    .font(.system(size: 11))
                                    .foregroundStyle(ErrdayTheme.secondary)
                            }
                        }
                    }
                }
            }
            ForEach(workout.exercises) { exercise in
                ErrdayCard {
                    Text(exercise.name).font(.system(size: 15, weight: .semibold))
                    ForEach(Array(exercise.sets.enumerated()), id: \.element.id) { index, set in
                        HStack { Text("\(set.effectiveType.shortLabel)\(index + 1)"); Spacer(); Text("\(set.weight.decimal) kg × \(set.repetitions)"); Image(systemName: set.completed ? "checkmark.circle.fill" : "circle").foregroundStyle(set.completed ? ErrdayTheme.gymAccent : ErrdayTheme.quiet) }.font(.system(size: 13))
                    }
                }
            }
        }
        .sheet(isPresented: $showStrava) { StravaSettingsView() }
    }
}

struct RecoveryOverviewCard: View {
    let recoveries: [MuscleRecovery]
    var body: some View {
        ErrdayCard {
            if recoveries.isEmpty {
                Text("No trained muscles yet").font(.system(size: 16, weight: .semibold))
                Text("Complete a workout to start muscle recovery estimates.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
            } else {
                ForEach(recoveries.prefix(3)) { recovery in
                    VStack(alignment: .leading, spacing: 7) {
                        HStack { Text(recovery.muscle.rawValue).font(.system(size: 14, weight: .semibold)); Spacer(); Text(recovery.remainingHours == 0 ? "Ready" : "~\(recovery.remainingHours)h left").font(.caption).foregroundStyle(recovery.remainingHours == 0 ? .green : ErrdayTheme.secondary) }
                        ProgressView(value: recovery.progress)
                    }
                }
                Text("Estimate from your logged sets, not a medical measurement.").font(.caption2).foregroundStyle(ErrdayTheme.quiet)
            }
        }
    }
}

struct RecoveryView: View {
    @Environment(HealthStore.self) private var health
    @Environment(PersonalStore.self) private var records
    var body: some View {
        ErrdayPage {
            PageHeading(title: "Recovery", subtitle: "Per-muscle estimates from your completed workouts")
            RecoveryOverviewCard(recoveries: RecoveryEstimator.recoveries(from: records.data.workouts))
            ForEach(RecoveryEstimator.recoveries(from: records.data.workouts)) { recovery in
                ErrdayCard {
                    HStack { Text(recovery.muscle.rawValue).font(.headline); Spacer(); Text(recovery.remainingHours == 0 ? "Ready" : "About \(recovery.remainingHours)h remaining").foregroundStyle(recovery.remainingHours == 0 ? .green : ErrdayTheme.secondary) }
                    ProgressView(value: recovery.progress)
                    Text("\(recovery.completedSets) completed sets · last trained \(recovery.lastTrained.formatted(.relative(presentation: .named)))").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                }
            }
            recoveryRow("Sleep", value: health.sleepText(days: 1), note: "Last night")
            recoveryRow("Resting heart rate", value: health.display("pulse", days: 1) == "—" ? "—" : "\(health.display("pulse", days: 1)) bpm", note: "Today")
            recoveryRow("HRV", value: health.display("hrv", days: 1) == "—" ? "—" : "\(health.display("hrv", days: 1)) ms", note: "Today")
            recoveryRow("Time since workout", value: lastWorkoutText, note: "Completed workouts")
            ErrdayCard {
                Text("How this estimate works").font(.headline)
                Text("Errday uses a 36-hour baseline after completed sets and 48 hours when you log a failure set. Research shows that training to failure can slow recovery over the following 24–48 hours, but there is no validated fixed recovery time for every muscle.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                Link("Study: recovery after failure training", destination: URL(string: "https://pubmed.ncbi.nlm.nih.gov/28965198/")!)
                Link("Study: fatigue up to 48 hours", destination: URL(string: "https://pubmed.ncbi.nlm.nih.gov/26667923/")!)
            }
        }
    }
    private var lastWorkoutText: String {
        guard let last = records.data.workouts.compactMap(\.finishedAt).max() else { return "—" }
        let hours = max(0, Int(Date.now.timeIntervalSince(last) / 3600))
        return hours < 24 ? "\(hours)h" : "\(hours / 24)d \(hours % 24)h"
    }
    private func recoveryRow(_ title: String, value: String, note: String) -> some View {
        ErrdayCard { HStack { VStack(alignment: .leading, spacing: 5) { Text(title).font(.system(size: 14, weight: .semibold)); Text(note).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary) }; Spacer(); Text(value).font(.system(size: 20, weight: .semibold)) } }
    }
}
