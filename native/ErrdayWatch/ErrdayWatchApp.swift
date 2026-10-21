import SwiftUI

@main
struct ErrdayWatchApp: App {
    @State private var workouts = WatchWorkoutStore()
    @State private var health = WatchHealthStore()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            WatchDashboardView()
                .environment(workouts)
                .environment(health)
                .tint(WatchTheme.accent)
                .onChange(of: phase) { _, value in
                    if value == .active { workouts.sync(); Task { await health.refresh() } }
                }
        }
    }
}
