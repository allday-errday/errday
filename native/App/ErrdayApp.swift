import SwiftUI

@main
struct ErrdayApp: App {
    @State private var records: PersonalStore
    @AppStorage(AppAppearance.storageKey) private var appearance = AppAppearance.system

    init() {
        let records = PersonalStore()
        records.load()
        _records = State(initialValue: records)
    }

    var body: some Scene {
        WindowGroup {
            LocalRoot(records: records)
                .tint(ErrdayTheme.accent)
                .environment(\.locale, Locale(identifier: "en_CH"))
                .preferredColorScheme(appearance.colorScheme)
        }
    }
}

struct LocalRoot: View {
    let records: PersonalStore
    @State private var health = HealthStore()
    @State private var assistant = AssistantStore()
    @State private var strava = StravaStore()
    var body: some View {
        Group {
            if records.isLoaded { AppShell() }
            else if let error = records.errorMessage {
                ContentUnavailableView {
                    Label("Entries unavailable", systemImage: "externaldrive.badge.exclamationmark")
                } description: { Text(error) } actions: {
                    Button("Try Again") { records.load() }
                }
            } else { ProgressView("Loading entries …") }
        }
        .environment(records).environment(health).environment(assistant).environment(strava)
        .task { if !records.isLoaded { records.load() }; await health.refresh() }
        .alert("Unable to Save", isPresented: Binding(
            get: { records.isLoaded && records.errorMessage != nil },
            set: { if !$0 { records.errorMessage = nil } }
        )) { Button("OK") { records.errorMessage = nil } } message: { Text(records.errorMessage ?? "") }
    }
}
