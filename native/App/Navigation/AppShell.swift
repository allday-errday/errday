import SwiftUI
import ErrdayCore
import UIKit

enum AppTab: String, CaseIterable, Identifiable {
    case home = "Home", gym = "Gym", health = "Health", profile = "Profile"
    var id: String { rawValue }
    var accent: Color {
        switch self {
        case .home, .profile: ErrdayTheme.accent
        case .gym: ErrdayTheme.gymAccent
        case .health: ErrdayTheme.healthAccent
        }
    }
    var symbol: String {
        switch self {
        case .home: "house.fill"
        case .gym: "dumbbell.fill"
        case .health: "heart.fill"
        case .profile: "person.crop.circle.fill"
        }
    }
}

private enum GlobalQuickAction: String, Identifiable {
    case voice, database, photo, barcode
    var id: String { rawValue }
}

struct AppShell: View {
    @Environment(\.scenePhase) private var scenePhase
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    @State private var selectedTab = AppTab.home
    @State private var assistantPresented = false
    @State private var onboarding = false
    @State private var selectedDate = Calendar.current.startOfDay(for: .now)
    @State private var requestedHomeAction: HomeQuickAction?
    @State private var quickAction: GlobalQuickAction?
    @State private var workoutPresented = false
    @State private var keyboardVisible = false
    @State private var streakDate = Date.now

    var body: some View {
        tabView
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if !keyboardVisible {
                    AppBottomBar(selectedTab: $selectedTab) { trackingMenu }
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in
                keyboardVisible = true
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
                keyboardVisible = false
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.significantTimeChangeNotification)) { _ in
                streakDate = .now
            }
            .sheet(item: $quickAction) { action in
                switch action {
                case .voice: VoiceLogView(trackingDate: selectedDate)
                case .database: FoodSearchView(date: selectedDate)
                case .photo: FoodPhotoScanView(date: selectedDate)
                case .barcode: BarcodeFoodView(date: selectedDate)
                }
            }
            .fullScreenCover(isPresented: $workoutPresented) { WorkoutView() }
            .sheet(isPresented: $assistantPresented) { AssistantView(trackingDate: selectedDate) }
            .sheet(isPresented: $onboarding) { OnboardingView() }
            .task {
                onboarding = records.data.profile?.onboardingComplete != true
                await healthSync()
                await RoutineReminderScheduler.refreshIfAuthorized(for: records.data)
                await RoutineReminderScheduler.refreshPlannedGymSessions(for: records.data)
            }
            .onChange(of: scenePhase) { _, phase in
                guard phase == .active else { return }
                streakDate = .now
                records.load()
                Task {
                    await RoutineReminderScheduler.refreshIfAuthorized(for: records.data)
                    await RoutineReminderScheduler.refreshPlannedGymSessions(for: records.data)
                }
            }
            .onChange(of: records.data) { _, _ in Task { await healthSync() } }
            .onChange(of: healthRequested) { _, requested in if requested { Task { await healthSync() } } }
            .onChange(of: health.refreshedAt) { _, _ in updateWidgetActivity() }
            .onOpenURL { url in
                guard url.scheme == "errday" else { return }
                if url.host == "gym", url.path == "/workout" {
                    selectedTab = .gym
                    workoutPresented = records.data.activeWorkout != nil
                    return
                }
                guard url.host == "food" else { return }
                selectedTab = .home
                let action = url.pathComponents.dropFirst().first ?? ""
                quickAction = action == "photo" ? .photo : action == "barcode" ? .barcode : nil
            }
    }

    private var tabView: some View {
        TabView(selection: $selectedTab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack {
                    tabContent(tab)
                        .environment(\.errdayAccent, tab.accent)
                        .tint(tab.accent)
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            if #available(iOS 26.0, *) {
                                ToolbarItem(placement: .topBarLeading) { BrandHeader() }
                                    .sharedBackgroundVisibility(.hidden)
                            } else {
                                ToolbarItem(placement: .topBarLeading) { BrandHeader() }
                            }
                            ToolbarItem(placement: .topBarTrailing) {
                                AppHeaderStatus(streak: dailyGoalStreak)
                            }
                            ToolbarItem(placement: .topBarTrailing) {
                                Button { assistantPresented = true } label: {
                                    Image(systemName: "sparkles")
                                        .font(.system(size: 17, weight: .semibold))
                                        .foregroundStyle(ErrdayTheme.accent)
                                        .frame(width: 44, height: 44)
                                }
                                .accessibilityLabel("Assistant")
                                .accessibilityIdentifier("header.assistant")
                            }
                        }
                }
                .tag(tab)
                .tabItem { Label(tab.rawValue, systemImage: tab.symbol) }
                .toolbar(.hidden, for: .tabBar)
            }
        }
        .tint(selectedTab.accent)
    }

    @ViewBuilder private func tabContent(_ tab: AppTab) -> some View {
        switch tab {
        case .home: HomeView(selectedTab: $selectedTab, selectedDate: $selectedDate, requestedAction: $requestedHomeAction)
        case .gym: GymView()
        case .health: HealthView(selectedDate: $selectedDate)
        case .profile: ProfileTabView()
        }
    }

    private var trackingMenu: some View {
        Menu {
            Section("Food") {
                Button("Scan food", systemImage: "camera.viewfinder") { quickAction = .photo }
                Button("Scan barcode", systemImage: "barcode.viewfinder") { quickAction = .barcode }
                Button("Search foods", systemImage: "magnifyingglass") { quickAction = .database }
            }
            Section("Track") {
                Button("Weight", systemImage: "scalemass") { openHomeAction(.weight) }
                Button("Water", systemImage: "drop") { openHomeAction(.water) }
            }
            Button("Voice log", systemImage: "mic") { quickAction = .voice }
        } label: {
            Image(systemName: "plus")
                .font(.system(size: 23, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 60, height: 60)
                .errdayGlassCircle(tint: ErrdayTheme.accent, interactive: true)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .tint(ErrdayTheme.accent)
        .accessibilityLabel("Track")
        .accessibilityHint("Scan or search foods, track weight or water, or use voice log")
        .accessibilityIdentifier("navigation.add")
    }

    private func openHomeAction(_ action: HomeQuickAction) {
        selectedTab = .home
        requestedHomeAction = action
    }

    private var healthRequested: Bool { health.hasRequested }
    private var dailyGoalStreak: Int {
        records.foodStreak(on: streakDate) { date in
            let weight = records.weightEntries(on: date).first?.kilograms
                ?? records.data.profile?.weight
                ?? health.value("weight", on: date)
            return health.foodGoalAddition(on: date, weightKG: weight, data: records.data)
        }
    }
    private func healthSync() async {
        await health.sync(records.data)
        updateWidgetActivity()
    }
    private func updateWidgetActivity() {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today) ?? today
        let entries = [yesterday, today].map { date in
            let weight = records.weightEntries(on: date).first?.kilograms
                ?? records.data.profile?.weight
                ?? health.value("weight", on: date)
            return (date: date, calories: health.foodActivityCalories(on: date, weightKG: weight))
        }
        records.updateWidgetActivity(entries)
    }
}
