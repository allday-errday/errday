import SwiftUI
import ErrdayCore

enum HomeQuickAction: String, Identifiable {
    case add, search, photo, barcode, water, weight
    var id: String { rawValue }
}

private enum HomeHealthDetail: String, Identifiable {
    case sleep, steps
    var id: String { rawValue }
}

private struct HomeHealthDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    let detail: HomeHealthDetail
    let selectedDate: Date

    var body: some View {
        NavigationStack {
            Group {
                switch detail {
                case .sleep:
                    SleepDetailView(days: 1, endDate: .now)
                case .steps:
                    HealthMetricList(title: "Steps", keys: ["steps"], days: 1, endDate: selectedDate)
                }
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDragIndicator(.visible)
    }
}

struct HomeView: View {
    @Binding var selectedTab: AppTab
    @Binding var selectedDate: Date
    @Binding var requestedAction: HomeQuickAction?
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    @Environment(AssistantStore.self) private var assistant
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var editMeal: MealEntry?
    @State private var deleteMeal: MealEntry?
    @State private var quickAction: HomeQuickAction?
    @State private var analysisMeal: MealEntry?
    @State private var healthDetail: HomeHealthDetail?

    private var meals: [MealEntry] { records.meals(on: selectedDate) }
    private var weekOffset: Int { relativeWeekOffset(for: selectedDate) }
    private var analysis: FoodAnalysis? {
        guard let analysis = assistant.foodAnalysis,
              Calendar.current.isDate(analysis.trackingDate, inSameDayAs: selectedDate) else { return nil }
        return analysis
    }
    var body: some View {
        ErrdayPage {
            dateStrip
            VStack(alignment: .leading, spacing: 8) {
                WeeklyRecapLink(weekStart: days(inWeek: weekOffset)[0])
                FoodOverviewCarousel(date: selectedDate, onLogWater: { quickAction = .water }, onLogWeight: { quickAction = .weight })
            }
            MealPlanSection(date: selectedDate)
            VStack(spacing: 12) {
                SectionHeading(title: "Recently added")
                if let analysis {
                    foodAnalysisCard(analysis)
                }
                if meals.isEmpty && analysis == nil {
                    ErrdayCard { EmptySection(title: "Nothing added yet", symbol: "fork.knife", message: "Tap + to add your first food of the day.") }
                } else {
                    ForEach(meals) { meal in
                        DeleteSwipeRow(onTap: { editMeal = meal }, onDelete: { _ = records.deleteMeal(meal.id) }) {
                            RecentFoodCard(meal: meal)
                        }
                    }
                }
            }
            VStack(spacing: 12) {
                SectionHeading(title: "Health", actionTitle: "Open", action: { selectedTab = .health })
                HStack(spacing: 12) {
                    Button {
                        ErrdayHaptics.selection(isEnabled: hapticsEnabled)
                        healthDetail = .sleep
                    } label: {
                        MetricCard(title: "Sleep", value: health.sleepText(days: 1), note: "Latest night", icon: "6a00f")
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Shows the latest sleep details and recorded nights")
                    Button {
                        ErrdayHaptics.selection(isEnabled: hapticsEnabled)
                        healthDetail = .steps
                    } label: {
                        MetricCard(title: "Steps", value: health.value("steps", on: selectedDate)?.whole ?? "—", note: "Apple Health", icon: "87442")
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Shows steps for the selected day and the recent trend")
                }
            }
        }
        .sheet(item: $healthDetail) { detail in
            HomeHealthDetailSheet(detail: detail, selectedDate: selectedDate)
        }
        .sheet(item: $editMeal) { MealEditDestination(meal: $0) }
        .sheet(item: $analysisMeal) { meal in
            NutritionDetailView(meal: meal, isDraft: true) { entry in
                if records.saveMeal(entry) { assistant.clearFoodAnalysis() }
            }
        }
        .sheet(item: $quickAction) { action in
            switch action {
            case .add: AddFoodView(date: selectedDate)
            case .search: FoodSearchView(date: selectedDate)
            case .photo: FoodPhotoScanView(date: selectedDate)
            case .barcode: BarcodeFoodView(date: selectedDate)
            case .water: WaterLogSheet(date: selectedDate)
            case .weight: WeightLogSheet(date: selectedDate)
            }
        }
        .confirmationDialog("Delete this food entry?", isPresented: Binding(get: { deleteMeal != nil }, set: { if !$0 { deleteMeal = nil } })) {
            Button("Delete", role: .destructive) { if let deleteMeal { _ = records.deleteMeal(deleteMeal.id) }; deleteMeal = nil }
        }
        .onChange(of: requestedAction) { _, action in
            guard let action else { return }
            quickAction = action
            requestedAction = nil
        }
    }

    @ViewBuilder
    private func foodAnalysisCard(_ analysis: FoodAnalysis) -> some View {
        switch analysis.status {
        case .analyzing:
            ErrdayCard {
                HStack(spacing: 12) {
                    ProgressView().tint(ErrdayTheme.accent)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Analyzing food …").font(.system(size: 15, weight: .semibold))
                        Text(analysis.query).font(.caption).foregroundStyle(ErrdayTheme.secondary).lineLimit(2)
                    }
                }
                ProgressView().tint(ErrdayTheme.accent)
                Text("Checking nutrition and portion information")
                    .font(.caption2).foregroundStyle(ErrdayTheme.quiet)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Analyzing food: \(analysis.query)")
        case .ready(let meal):
            Button { analysisMeal = meal } label: {
                RecentFoodCard(meal: meal)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens the nutrition review")
        case .failed(let message):
            ErrdayCard {
                Label("Food analysis failed", systemImage: "exclamationmark.circle")
                    .font(.system(size: 15, weight: .semibold))
                Text(message).font(.caption).foregroundStyle(ErrdayTheme.secondary)
                Button("Dismiss") { assistant.clearFoodAnalysis(analysis.id) }
                    .font(.system(size: 13, weight: .semibold))
            }
        }
    }

    private var dateStrip: some View {
        TabView(selection: Binding(
            get: { weekOffset },
            set: { newOffset in
                guard (-52...0).contains(newOffset), newOffset != weekOffset,
                      let matchingDate = matchingDay(inWeek: newOffset) else { return }
                selectedDate = matchingDate
                ErrdayHaptics.selection(isEnabled: hapticsEnabled)
            }
        )) {
            ForEach(-52...0, id: \.self) { offset in
                HStack(spacing: 4) {
                    ForEach(days(inWeek: offset), id: \.self) { date in
                        dayButton(date)
                    }
                }
                .padding(.horizontal, 2)
                .tag(offset)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .frame(height: 70)
        .accessibilityAction(named: "Previous week") {
            guard weekOffset > -52, let date = matchingDay(inWeek: weekOffset - 1) else { return }
            selectedDate = date
        }
        .accessibilityAction(named: "Next week") {
            guard weekOffset < 0, let date = matchingDay(inWeek: weekOffset + 1) else { return }
            selectedDate = date
        }
    }

    private func matchingDay(inWeek offset: Int) -> Date? {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: selectedDate)
        let dates = days(inWeek: offset)
        let matching = dates.first { calendar.component(.weekday, from: $0) == weekday } ?? dates.first
        guard let matching else { return nil }
        let today = calendar.startOfDay(for: .now)
        return min(matching, today)
    }

    private func relativeWeekOffset(for date: Date) -> Int {
        var calendar = Calendar.current
        calendar.firstWeekday = 1
        func weekStart(_ value: Date) -> Date {
            let day = calendar.startOfDay(for: value)
            let weekday = calendar.component(.weekday, from: day)
            return calendar.date(byAdding: .day, value: -(weekday - 1), to: day) ?? day
        }
        let current = weekStart(.now)
        let selected = weekStart(date)
        return (calendar.dateComponents([.day], from: current, to: selected).day ?? 0) / 7
    }

    private func days(inWeek offset: Int) -> [Date] {
        var calendar = Calendar.current
        calendar.firstWeekday = 1
        let today = calendar.startOfDay(for: .now)
        let weekday = calendar.component(.weekday, from: today)
        let currentSunday = calendar.date(byAdding: .day, value: -(weekday - 1), to: today)!
        let start = calendar.date(byAdding: .day, value: offset * 7, to: currentSunday)!
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }

    private func dayButton(_ date: Date) -> some View {
        let calendar = Calendar.current
        let selected = calendar.isDate(date, inSameDayAs: selectedDate)
        let today = calendar.isDateInToday(date)
        let future = calendar.startOfDay(for: date) > calendar.startOfDay(for: .now)
        let scoreColor = future ? nil : nutritionScoreColor(on: date)
        let completion = future ? nil : nutritionCompletion(on: date)
        let ringColor = scoreColor ?? (today ? ErrdayTheme.accent : ErrdayTheme.border)
        return Button {
            guard !future else { return }
            withAnimation(.snappy(duration: 0.28)) {
                selectedDate = calendar.startOfDay(for: date)
            }
            ErrdayHaptics.selection(isEnabled: hapticsEnabled)
        } label: {
            VStack(spacing: 7) {
                Text(date.formatted(.dateTime.locale(Locale(identifier: "en_GB")).weekday(.narrow)))
                    .font(.system(size: 11, weight: today ? .semibold : .regular))
                    .foregroundStyle(today ? ErrdayTheme.accent : ErrdayTheme.secondary)
                Text(date.formatted(.dateTime.day()))
                    .font(.system(size: 15, weight: .semibold))
                    .frame(width: 34, height: 34)
                    .background((scoreColor ?? ringColor).opacity(scoreColor == nil ? (selected ? 0.08 : 0) : 0.10), in: Circle())
                    .overlay {
                        ZStack {
                            Circle().stroke(ErrdayTheme.border, lineWidth: today ? 2.5 : 2)
                            if let completion {
                                Circle()
                                    .trim(from: 0, to: completion)
                                    .stroke(ringColor, style: StrokeStyle(lineWidth: today ? 2.5 : 2, lineCap: .round))
                                    .rotationEffect(.degrees(-90))
                            } else if today {
                                Circle().stroke(ringColor, lineWidth: 2.5)
                            }
                        }
                    }
            }
            .frame(maxWidth: .infinity).padding(.vertical, 7)
            .background(selected ? ErrdayTheme.surface : .clear, in: RoundedRectangle(cornerRadius: 14))
            .opacity(future ? 0.45 : 1)
        }.buttonStyle(.plain)
            .disabled(future)
            .accessibilityValue(completion.map { "\(Int(($0 * 100).rounded())) percent complete" } ?? "No tracked progress")
    }

    /// Scores only goals the user has actually configured. The daily checklist is
    /// a hard completion requirement from the day it was enabled.
    private func nutritionScoreColor(on date: Date) -> Color? {
        let calendar = Calendar.current
        let day = calendar.startOfDay(for: date)
        if let startedAt = records.data.dailyChecklistStartedAt,
           day >= calendar.startOfDay(for: startedAt),
           day <= calendar.startOfDay(for: .now),
           !records.isChecklistComplete(on: day) {
            return Color(hex: 0xef4e55)
        }

        guard let score = nutritionCompletion(on: date) else { return nil }
        if score >= 0.95 { return Color(hex: 0x35b66a) }
        if score >= 0.75 { return Color(hex: 0xe2a62b) }
        return Color(hex: 0xef4e55)
    }

    private func nutritionCompletion(on date: Date) -> Double? {
        let meals = records.meals(on: date)
        let calendar = Calendar.current
        let day = calendar.startOfDay(for: date)
        var values: [Double] = []

        func include(_ value: Double, goal: Double?) {
            guard let goal, goal > 0 else { return }
            values.append(min(max(value / goal, 0), 1))
        }

        if !meals.isEmpty {
            let weight = records.weightEntries(on: date).first?.kilograms
                ?? records.data.profile?.weight
                ?? health.value("weight", on: date)
            let adjustedCalories = records.data.calorieGoal.map {
                $0 + health.foodGoalAddition(on: date, weightKG: weight, data: records.data)
            }
            include(meals.reduce(0) { $0 + $1.calories }, goal: adjustedCalories)
            include(meals.reduce(0) { $0 + $1.protein }, goal: records.data.proteinGoal)
            include(meals.reduce(0) { $0 + $1.carbs }, goal: records.data.carbsGoal)
            include(meals.reduce(0) { $0 + $1.fat }, goal: records.data.fatGoal)
        }

        if let startedAt = records.data.dailyChecklistStartedAt,
           day >= calendar.startOfDay(for: startedAt),
           day <= calendar.startOfDay(for: .now) {
            values.append(records.isChecklistComplete(on: day) ? 1 : 0)
        }

        guard !values.isEmpty else { return nil }
        return values.reduce(0, +) / Double(values.count)
    }

}

struct DailyFoodLogView: View {
    @Environment(PersonalStore.self) private var records
    let date: Date
    @State private var editing: MealEntry?

    private var meals: [MealEntry] { records.meals(on: date) }

    var body: some View {
        List {
            if meals.isEmpty {
                ContentUnavailableView("Nothing eaten", systemImage: "fork.knife", description: Text("Foods tracked on this day will appear here."))
                    .listRowBackground(Color.clear)
            } else {
                ForEach(meals) { meal in
                    Button { editing = meal } label: { FoodMealRow(meal: meal) }
                        .buttonStyle(.plain)
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button("Delete", role: .destructive) { _ = records.deleteMeal(meal.id) }
                        }
                }
            }
        }
        .scrollContentBackground(.hidden).errdayBackground()
        .navigationTitle(date.formatted(.dateTime.weekday(.wide).day().month()))
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $editing) { MealEditDestination(meal: $0) }
    }
}

struct NutritionSummary: View {
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    var date: Date = .now
    private var meals: [MealEntry] { records.meals(on: date) }
    private var calories: Double { meals.reduce(0) { $0 + $1.calories } }
    private var activityWeight: Double? {
        records.weightEntries(on: date).first?.kilograms
            ?? records.data.profile?.weight
            ?? health.value("weight", on: date)
    }
    private var activityCalories: Double {
        health.foodGoalAddition(on: date, weightKG: activityWeight, data: records.data)
    }
    private var calorieGoal: Double? {
        records.data.calorieGoal.map { $0 + activityCalories }
    }
    var body: some View {
        ErrdayCard {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Calories tracked").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                    HStack(alignment: .firstTextBaseline, spacing: 5) { Text(calories.whole).font(.system(size: 32, weight: .semibold)); Text("kcal").font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary) }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) { Text(calorieGoal.map { max(0, $0-calories).whole } ?? "—").font(.system(size: 16)); Text("kcal remaining").font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary) }
            }
            progress(calories, goal: calorieGoal)
            Text(calorieGoal.map { "Daily goal \($0.whole) kcal" + (activityCalories > 0 ? " · +\(activityCalories.whole) activity" : "") } ?? "No daily goal yet").font(.system(size: 11)).foregroundStyle(ErrdayTheme.quiet)
            HStack(alignment: .top, spacing: 12) {
                macro("Protein", value: meals.reduce(0) { $0+$1.protein }, goal: records.data.proteinGoal)
                macro("Carbs", value: meals.reduce(0) { $0+$1.carbs }, goal: records.data.carbsGoal)
                macro("Fat", value: meals.reduce(0) { $0+$1.fat }, goal: records.data.fatGoal)
            }
        }
    }
    private func progress(_ value: Double, goal: Double?) -> some View { ProgressView(value: goal == nil ? 0 : min(max(0, value), max(1, goal ?? 1)), total: max(1, goal ?? 1)).opacity(goal == nil ? 0.25 : 1) }
    private func macro(_ title: String, value: Double, goal: Double?) -> some View {
        VStack(alignment: .leading, spacing: 8) { Text(title).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary); Text(goal.map { "\(value.whole) / \($0.whole) g" } ?? "\(value.whole) g").font(.system(size: 13)).minimumScaleFactor(0.7).lineLimit(1); progress(value, goal: goal) }.frame(maxWidth: .infinity, alignment: .leading)
    }
}
