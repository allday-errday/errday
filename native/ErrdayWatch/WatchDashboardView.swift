import ErrdayCore
import SwiftUI

enum WatchRoute: Hashable {
    case sessions, session(UUID), workout
}

struct WatchDashboardView: View {
    @Environment(WatchWorkoutStore.self) private var workouts
    @Environment(WatchHealthStore.self) private var health
    @State private var path: [WatchRoute] = {
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--watch-ui-preview"),
           ProcessInfo.processInfo.arguments.contains("--watch-preview-workout") { return [.workout] }
        #endif
        return []
    }()
    @State private var showSync = false

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    gymCard
                    Text("Today").font(.system(size: 14, weight: .semibold))
                    HStack(spacing: 8) {
                        metric("Steps", value: health.steps, unit: "today", icon: "figure.walk", color: .green)
                        metric("Active", value: health.activeCalories, unit: "kcal", icon: "flame.fill", color: .orange)
                    }
                    HStack(spacing: 10) {
                        Image(systemName: "heart.fill").foregroundStyle(.pink)
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Heart rate").font(.caption2).foregroundStyle(.secondary)
                            HStack(alignment: .firstTextBaseline, spacing: 3) {
                                Text(health.heartRate.map { WatchTheme.number($0.rounded()) } ?? "—")
                                    .font(.title3.weight(.semibold)).monospacedDigit()
                                Text("bpm").font(.caption2).foregroundStyle(.secondary)
                            }
                            if let date = health.heartRateDate {
                                Text(date, style: .time).font(.caption2).foregroundStyle(.secondary)
                            }
                        }
                        Spacer(minLength: 0)
                    }.watchSurface().accessibilityElement(children: .combine)
                    if !health.hasRequestedAccess {
                        Button("Connect Health") { Task { await health.requestAccess() } }
                        Text("See your activity and latest heart-rate reading.")
                            .font(.caption2).foregroundStyle(.secondary)
                    } else if health.steps == nil && health.activeCalories == nil {
                        Text("No Health data yet. Check Errday’s access in Health settings.")
                            .font(.caption2).foregroundStyle(.secondary)
                    }
                    if let error = health.error { Text(error).font(.caption2).foregroundStyle(.orange) }
                    Button { showSync = true } label: {
                        Label(syncLabel, systemImage: workouts.error == nil ? "iphone.and.arrow.forward" : "exclamationmark.arrow.triangle.2.circlepath")
                            .font(.caption2).frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    }.buttonStyle(.plain).foregroundStyle(.secondary).accessibilityIdentifier("watch.sync")
                }.padding(.horizontal, 8)
            }
            .navigationTitle("Errday")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: WatchRoute.self) { route in
                switch route {
                case .sessions: WatchSessionPicker()
                case .session(let id): WatchSessionPreview(templateID: id) { path = [.workout] }
                case .workout: WatchWorkoutView()
                }
            }
            .sheet(isPresented: $showSync) { NavigationStack { WatchSyncView() } }
            .task {
                workouts.sync()
                while !Task.isCancelled {
                    await health.refresh()
                    do { try await Task.sleep(for: .seconds(30)) } catch { return }
                }
            }
        }
    }

    private var gymCard: some View {
        NavigationLink(value: workouts.snapshot?.activeWorkout == nil ? WatchRoute.sessions : .workout) {
            HStack(alignment: .center, spacing: 8) {
                    Image(systemName: "figure.strengthtraining.traditional")
                        .foregroundStyle(WatchTheme.gym)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(workouts.snapshot?.activeWorkout?.name ?? "Gym").font(.headline)
                            .lineLimit(2)
                        if let active = workouts.snapshot?.activeWorkout {
                            Text("\(active.completedSets) sets · Resume").font(.caption2).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.7)
                        } else {
                            Text("Sessions").font(.system(size: 12)).foregroundStyle(.secondary)
                        }
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right").font(.caption2).foregroundStyle(.secondary)
            }.frame(maxWidth: .infinity, alignment: .leading).watchSurface()
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(workouts.snapshot?.activeWorkout == nil ? "watch.program" : "watch.resume")
    }

    private var syncLabel: String {
        if workouts.error != nil { return "Check sync" }
        if !workouts.pending.isEmpty { return "\(workouts.pending.count) edits saved on Watch" }
        if workouts.snapshot == nil { return "Open Errday on iPhone to connect" }
        return workouts.reachable ? "Connected to iPhone" : "iPhone offline"
    }

    private func metric(_ title: String, value: Double?, unit: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 3) {
                Image(systemName: icon)
                Text(title).lineLimit(1).minimumScaleFactor(0.8)
            }.font(.system(size: 11)).foregroundStyle(color)
            Text(value.map { WatchTheme.number($0.rounded()) } ?? "—")
                .font(.system(size: 22, weight: .semibold)).monospacedDigit()
                .lineLimit(1).minimumScaleFactor(0.65)
            Text(unit).font(.system(size: 11)).foregroundStyle(.secondary)
        }.frame(maxWidth: .infinity, alignment: .leading).watchSurface()
            .accessibilityElement(children: .combine)
    }
}
