import SwiftUI
import ErrdayCore

struct FoodOverviewCarousel: View {
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var page = 0
    @State private var displayMode = DisplayMode.left
    @State private var lastQuickWaterEntry: HydrationEntry?
    @State private var selectedDetail: OverviewDetail?
    var date: Date = .now
    let onLogWater: () -> Void
    var onLogWeight: (() -> Void)?
    var onOpenDay: (() -> Void)?

    private enum DisplayMode { case eaten, left }
    private enum OverviewDetail: Identifiable {
        case nutrient(NutritionBreakdownKind), water, activity
        var id: String {
            switch self {
            case .nutrient(let kind): "nutrient-\(kind.id)"
            case .water: "water"
            case .activity: "activity"
            }
        }
    }
    private var meals: [MealEntry] { records.meals(on: date) }
    private var calories: Double { meals.reduce(0) { $0 + $1.calories } }
    private var protein: Double { meals.reduce(0) { $0 + $1.protein } }
    private var carbs: Double { meals.reduce(0) { $0 + $1.carbs } }
    private var fat: Double { meals.reduce(0) { $0 + $1.fat } }
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
    private var waterGoal: Double { records.data.hydrationGoalMillilitres ?? 3_500 }
    private var waterAmount: Double { records.water(on: date) }
    private var currentWeightEntry: WeightEntry? {
        let calendar = Calendar.current
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: date)) ?? date
        return records.weightEntries.first(where: { $0.date < endOfDay })
    }
    private var currentWeight: Double? {
        currentWeightEntry?.kilograms
            ?? health.value("weight", on: date)
            ?? (Calendar.current.isDateInToday(date) ? records.data.profile?.weight : nil)
    }
    private var weightGoal: Double { records.data.weightGoalKilograms ?? 90 }

    var body: some View {
        VStack(spacing: 12) {
            TabView(selection: $page) {
                macroPage.tag(0)
                nutrientPage.tag(1)
                activityPage.tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 330)

            HStack(spacing: 7) {
                ForEach(0..<3) { index in
                    Button { withAnimation(.snappy) { page = index } } label: {
                        Circle().fill(index == page ? ErrdayTheme.text : ErrdayTheme.border)
                            .frame(width: index == page ? 8 : 7, height: index == page ? 8 : 7)
                            .frame(width: 16, height: 20)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Overview page \(index + 1)")
                }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: page)
        .accessibilityLabel("Nutrition overview")
        .sheet(item: $selectedDetail) { detail in
            switch detail {
            case .nutrient(let kind): NutritionBreakdownSheet(kind: kind, date: date)
            case .water: WaterHistorySheet(date: date)
            case .activity: ActivityBreakdownSheet(date: date, weightKG: activityWeight)
            }
        }
    }

    private var macroPage: some View {
        VStack(spacing: 12) {
            Button { toggleDisplayMode() } label: {
                HStack(spacing: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text(displayValue(calories, goal: calorieGoal).whole)
                                .font(.system(size: 38, weight: .semibold))
                            if displayMode == .eaten, let calorieGoal {
                                Text("/\(calorieGoal.whole)").font(.system(size: 15)).foregroundStyle(ErrdayTheme.secondary)
                            }
                        }
                        HStack(spacing: 5) {
                            Text(displayLabel("Calories", value: calories, goal: calorieGoal))
                            Image(systemName: "chevron.up.chevron.down").font(.system(size: 9, weight: .semibold))
                        }
                        .font(.system(size: 13)).foregroundStyle(ErrdayTheme.secondary)
                        if activityCalories > 0 {
                            Label("+\(activityCalories.whole)", systemImage: "figure.walk")
                                .font(.system(size: 11, weight: .semibold))
                                .padding(.horizontal, 8).frame(height: 24)
                                .background(ErrdayTheme.raised, in: Capsule())
                        }
                    }
                    Spacer(minLength: 0)
                    ProgressRing(value: calories, goal: calorieGoal, color: ErrdayTheme.accent, symbol: "flame.fill", size: 106)
                }
                .padding(18).frame(maxWidth: .infinity, minHeight: 142)
                .errdaySurface()
            }
            .buttonStyle(.plain)
            .accessibilityHint("Switch between eaten and remaining values")

            HStack(spacing: 10) {
                macroCard(.protein, value: protein, goal: records.data.proteinGoal)
                macroCard(.carbs, value: carbs, goal: records.data.carbsGoal)
                macroCard(.fat, value: fat, goal: records.data.fatGoal)
            }
        }
    }

    private var nutrientPage: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                nutrientCard(.fiber, value: knownNutrient(\.fiber), goal: records.data.fiberGoal)
                nutrientCard(.sugar, value: knownNutrient(\.sugar), goal: records.data.sugarGoal)
                nutrientCard(.sodium, value: knownNutrient(\.sodium), goal: records.data.sodiumGoal)
            }
            waterGoalCard
        }
    }

    private var waterGoalCard: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 8) {
                Label("Water", systemImage: "drop.fill")
                    .font(.system(size: 14, weight: .semibold)).foregroundStyle(ErrdayTheme.foodAccent)
                Spacer(minLength: 2)
                if let entry = lastQuickWaterEntry {
                    Button { undoQuickWater(entry) } label: {
                        Text("Undo").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                    }
                    .accessibilityLabel("Undo last 250 millilitres of water")
                } else {
                    Button(action: onLogWater) {
                        Text("Log").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                    }
                    .accessibilityLabel("Log a custom amount of water")
                }
                Button(action: quickAddWater) {
                    HStack(spacing: 3) {
                        Image(systemName: "plus").font(.system(size: 10, weight: .semibold))
                        Text("250 mL")
                    }
                    .frame(minHeight: 44)
                    .padding(.horizontal, 9)
                    .background(ErrdayTheme.foodAccent.opacity(0.12), in: Capsule())
                    .contentShape(Capsule())
                }
                .accessibilityLabel("Add 250 millilitres of water")
            }
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(ErrdayTheme.accent)
            .buttonStyle(.plain)
            .frame(minHeight: 44)
            Button {
                lastQuickWaterEntry = nil
                selectedDetail = .water
                ErrdayHaptics.selection(isEnabled: hapticsEnabled)
            } label: {
                VStack(spacing: 9) {
                    HStack(alignment: .firstTextBaseline, spacing: 5) {
                        Text((waterAmount / 1_000).formatted(.number.precision(.fractionLength(0...2))))
                            .font(.system(size: 25, weight: .semibold))
                            .contentTransition(.numericText())
                        Text("/ \((waterGoal / 1_000).formatted(.number.precision(.fractionLength(1)))) L")
                            .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                        Spacer()
                        Text(waterAmount >= waterGoal ? "Goal reached" : "\(max(0, waterGoal - waterAmount).whole) ml left")
                            .font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                            .lineLimit(1).minimumScaleFactor(0.8)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(ErrdayTheme.secondary)
                    }
                    ProgressView(value: min(waterAmount, waterGoal), total: max(1, waterGoal))
                        .tint(ErrdayTheme.foodAccent)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Water history, \(waterAmount.whole) of \(waterGoal.whole) millilitres")
            .accessibilityHint("Shows water entries for this day")
        }
        .padding(15).frame(maxWidth: .infinity, minHeight: 106)
        .errdaySurface()
        .animation(.snappy(duration: 0.3), value: waterAmount)
        .task(id: lastQuickWaterEntry?.id) {
            guard lastQuickWaterEntry != nil else { return }
            try? await Task.sleep(for: .seconds(5))
            guard !Task.isCancelled else { return }
            withAnimation(.smooth(duration: 0.2)) { lastQuickWaterEntry = nil }
        }
        .onChange(of: date) { _, _ in lastQuickWaterEntry = nil }
    }

    private func quickAddWater() {
        guard let entry = records.logWaterEntry(250, at: FoodInput.entryDate(on: date)) else { return }
        withAnimation(.snappy(duration: 0.3)) { lastQuickWaterEntry = entry }
        ErrdayHaptics.success(isEnabled: hapticsEnabled)
    }

    private func undoQuickWater(_ entry: HydrationEntry) {
        guard records.deleteWater(entry.id) else { return }
        withAnimation(.snappy(duration: 0.3)) { lastQuickWaterEntry = nil }
        ErrdayHaptics.selection(isEnabled: hapticsEnabled)
    }

    private var activityPage: some View {
        let walkingCalories = health.walkingCalories(on: date, weightKG: activityWeight)
        let gymCalories = health.gymCalories(on: date, weightKG: activityWeight)
        return VStack(spacing: 12) {
            HStack(spacing: 12) {
                activitiesCard(walkingCalories: walkingCalories, gymCalories: gymCalories)
                checklistCard
            }
            weightProgressCard
        }
    }

    private func macroCard(_ kind: NutritionBreakdownKind, value: Double, goal: Double?) -> some View {
        Button {
            selectedDetail = .nutrient(kind)
            ErrdayHaptics.selection(isEnabled: hapticsEnabled)
        } label: {
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text("\(displayValue(value, goal: goal).whole)g").font(.system(size: 17, weight: .semibold))
                    if displayMode == .eaten, let goal { Text("/\(goal.whole)g").font(.system(size: 10)).foregroundStyle(ErrdayTheme.secondary) }
                }
                HStack(spacing: 3) {
                    Text(displayLabel(kind.title, value: value, goal: goal))
                    Image(systemName: "chevron.right").font(.system(size: 8, weight: .semibold))
                }
                .font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                .lineLimit(1).minimumScaleFactor(0.75)
                Spacer(minLength: 4)
                ProgressRing(value: value, goal: goal, color: kind.color, symbol: kind.symbol, size: 54)
                    .frame(maxWidth: .infinity)
            }
            .padding(12).frame(maxWidth: .infinity, minHeight: 154, alignment: .topLeading)
            .errdaySurface()
            .contentShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(kind.title), \(value.decimal) grams eaten")
        .accessibilityHint("Shows foods contributing to \(kind.title.lowercased())")
    }

    private func nutrientCard(_ kind: NutritionBreakdownKind, value: Double?, goal: Double?) -> some View {
        Button {
            selectedDetail = .nutrient(kind)
            ErrdayHaptics.selection(isEnabled: hapticsEnabled)
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                Label(kind.title, systemImage: kind.symbol).font(.system(size: 12, weight: .medium)).foregroundStyle(kind.color)
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text(nutrientDisplayValue(value, goal: goal).map { "\($0.decimal) \(kind.unit)" } ?? "—")
                        .font(.system(size: 17, weight: .semibold)).minimumScaleFactor(0.72).lineLimit(1)
                    if displayMode == .eaten, let goal {
                        Text("/\(goal.decimal)").font(.system(size: 9)).foregroundStyle(ErrdayTheme.secondary)
                    }
                }
                HStack(spacing: 4) {
                    Text(nutrientDisplayState(value: value, goal: goal).capitalized)
                    Image(systemName: "chevron.right").font(.system(size: 7, weight: .semibold))
                }
                .font(.system(size: 9)).foregroundStyle(ErrdayTheme.secondary)
                Spacer()
                ProgressRing(value: value ?? 0, goal: value == nil ? nil : goal, color: kind.color, symbol: kind.symbol, size: 48)
                    .frame(maxWidth: .infinity)
            }
            .padding(11).frame(maxWidth: .infinity, minHeight: 188, alignment: .topLeading)
            .errdaySurface()
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(kind.title), \(value.map { "\($0.decimal) \(kind.unit) recorded" } ?? "no recorded value")")
        .accessibilityHint("Shows foods contributing to \(kind.title.lowercased())")
    }

    private func activitiesCard(walkingCalories: Double?, gymCalories: Double?) -> some View {
        Button {
            selectedDetail = .activity
            ErrdayHaptics.selection(isEnabled: hapticsEnabled)
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("Activities").font(.system(size: 13, weight: .semibold))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(ErrdayTheme.secondary)
                }
                activityRow(
                    symbol: "figure.walk",
                    title: "Walking",
                    value: walkingCalories.map { "\($0.whole) kcal" } ?? "—",
                    note: health.value("distance", on: date).map { "\($0.decimal) km" } ?? "No distance"
                )
                Divider()
                activityRow(
                    symbol: "dumbbell.fill",
                    title: "Gym",
                    value: gymCalories.map { "\($0.whole) kcal" } ?? "—",
                    note: nil
                )
            }
            .padding(14).frame(maxWidth: .infinity, minHeight: 200, alignment: .topLeading)
            .errdaySurface()
            .contentShape(RoundedRectangle(cornerRadius: 17))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Activity details, walking \(walkingCalories.map { "\($0.whole) kilocalories" } ?? "unavailable"), gym \(gymCalories.map { "\($0.whole) kilocalories" } ?? "unavailable")")
        .accessibilityHint("Shows how activity changes the food goal")
    }

    private func activityRow(symbol: String, title: String, value: String, note: String?) -> some View {
        HStack(spacing: 9) {
            Image(systemName: symbol)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(ErrdayTheme.accent)
                .frame(width: 27)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                Text(value).font(.system(size: 16, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.72)
                if let note {
                    Text(note).font(.system(size: 9)).foregroundStyle(ErrdayTheme.quiet).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, minHeight: 79, alignment: .leading)
    }

    private var checklistCard: some View {
        let completed = records.completedChecklistItems(on: date)
        let allDone = DailyChecklistItem.supplementItems.allSatisfy(completed.contains)
        let latestCompletion = records.latestChecklistCompletion(on: date)
        return VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Daily checklist").font(.system(size: 13, weight: .semibold))
                Spacer(minLength: 4)
                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 3) {
                        if allDone {
                            Image(systemName: "checkmark.circle.fill")
                        }
                        Text(allDone ? "Done" : "\(DailyChecklistItem.supplementItems.filter(completed.contains).count)/\(DailyChecklistItem.supplementItems.count)")
                            .contentTransition(.numericText())
                    }
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(allDone ? Color(hex: 0x35b66a) : ErrdayTheme.secondary)
                    if let latestCompletion {
                        Text(latestCompletion, style: .time)
                            .font(.system(size: 9)).foregroundStyle(ErrdayTheme.quiet)
                    }
                }
            }
            .frame(minHeight: 24)
            ForEach(DailyChecklistItem.supplementItems) { item in
                Button { toggleChecklist(item) } label: {
                    HStack(spacing: 7) {
                        Image(systemName: completed.contains(item) ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(completed.contains(item) ? Color(hex: 0x35b66a) : ErrdayTheme.quiet)
                            .symbolEffect(.bounce, value: completed.contains(item))
                        Text(checklistTitle(item))
                            .font(.system(size: 10, weight: .medium)).lineLimit(1).minimumScaleFactor(0.75)
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(checklistTitle(item)), \(completed.contains(item) ? "completed" : "not completed")")
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 6)
        .frame(maxWidth: .infinity, minHeight: 212, alignment: .topLeading)
        .errdaySurface()
    }

    private func toggleChecklist(_ item: DailyChecklistItem) {
        let wasComplete = records.isChecklistComplete(on: date)
        let saved = withAnimation(.snappy(duration: 0.24)) {
            records.toggleChecklistItem(item, on: date)
        }
        guard saved else { return }
        if !wasComplete && records.isChecklistComplete(on: date) {
            ErrdayHaptics.success(isEnabled: hapticsEnabled)
        } else {
            ErrdayHaptics.selection(isEnabled: hapticsEnabled)
        }
        Task { await RoutineReminderScheduler.refreshIfAuthorized(for: records.data) }
    }

    private func checklistTitle(_ item: DailyChecklistItem) -> String {
        switch item {
        case .creatine: "Creatine"
        case .water: "3.5 L water"
        case .magnesium: "Magnesium"
        case .multivitamin: "Multivitamin"
        case .omega3: "Omega-3"
        }
    }

    private var weightProgressCard: some View {
        HStack(spacing: 16) {
            Button { onLogWeight?() } label: {
            HStack(spacing: 12) {
                Image(systemName: "scalemass")
                    .font(.system(size: 22, weight: .semibold)).foregroundStyle(ErrdayTheme.accent)
                    .frame(width: 42, height: 42).background(ErrdayTheme.raised, in: Circle())
                VStack(alignment: .leading, spacing: 4) {
                    Text("Current weight").font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(currentWeight?.decimal ?? "—").font(.system(size: 25, weight: .semibold))
                        Text("kg").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                    }
                    if let trackedAt = currentWeightEntry?.date {
                        Text(trackedAt.formatted(date: .abbreviated, time: .shortened))
                            .font(.system(size: 9)).foregroundStyle(ErrdayTheme.quiet)
                    } else if currentWeight != nil {
                        Text("Apple Health").font(.system(size: 9)).foregroundStyle(ErrdayTheme.quiet)
                    }
                }
            }
            .contentShape(Rectangle())
            }.buttonStyle(.plain).disabled(onLogWeight == nil)
            Spacer(minLength: 8)
            NavigationLink { NutritionGoalsView() } label: {
                VStack(alignment: .trailing, spacing: 5) {
                    Text("Goal \(weightGoal.decimal) kg").font(.system(size: 12, weight: .semibold))
                    Text(weightGoalSummary).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                        .multilineTextAlignment(.trailing).lineLimit(2)
                    Label("Edit goal", systemImage: "pencil").font(.system(size: 11)).foregroundStyle(ErrdayTheme.accent)
                }
                .frame(minHeight: 44).contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityLabel("Edit weight and nutrition goals")
        }
        .padding(14).frame(maxWidth: .infinity, minHeight: 106).errdaySurface()
    }

    private var weightGoalSummary: String {
        guard let currentWeight else { return "Log a weight to estimate" }
        let remaining = weightGoal - currentWeight
        guard remaining > 0 else { return "Goal reached" }
        let pace = records.data.profile?.weeklyGainGoalKG ?? 0.2
        guard pace > 0 else { return "\(remaining.decimal) kg left" }
        let weeks = remaining / pace
        let estimate = Calendar.current.date(byAdding: .day, value: Int((weeks * 7).rounded()), to: date)
        let estimateText = estimate?.formatted(.dateTime.month(.wide).year()) ?? ""
        return estimateText
    }

    private func displayValue(_ value: Double, goal: Double?) -> Double {
        guard displayMode == .left else { return value }
        guard let goal, goal > 0 else { return value }
        return abs(goal - value)
    }

    private func nutrientDisplayValue(_ value: Double?, goal: Double?) -> Double? {
        guard let value else { return nil }
        if displayMode == .eaten { return value }
        guard let goal, goal > 0 else { return value }
        return abs(goal - value)
    }

    private func nutrientDisplayState(value: Double?, goal: Double?) -> String {
        guard let value else { return "not recorded" }
        guard displayMode == .left, let goal, goal > 0 else { return "recorded" }
        return value > goal ? "over" : "left"
    }

    private func displayLabel(_ title: String, value: Double?, goal: Double?) -> String {
        "\(title) \(displayState(value: value, goal: goal))"
    }

    private func displayState(value: Double?, goal: Double?) -> String {
        guard displayMode == .left else { return "eaten" }
        guard let value, let goal, goal > 0 else { return "eaten" }
        return value > goal ? "over" : "left"
    }

    private func toggleDisplayMode() {
        withAnimation(.snappy) {
            displayMode = displayMode == .eaten ? .left : .eaten
        }
    }

    private func knownNutrient(_ keyPath: KeyPath<MealEntry, Double?>) -> Double? {
        let values = meals.compactMap { $0[keyPath: keyPath] }
        return values.isEmpty ? nil : values.reduce(0, +)
    }

}

struct ProgressRing: View {
    let value: Double
    let goal: Double?
    let color: Color
    let symbol: String
    var size: CGFloat = 64

    private var progress: Double { guard let goal, goal > 0 else { return 0 }; return min(max(value / goal, 0), 1) }

    var body: some View {
        ZStack {
            Circle().stroke(ErrdayTheme.raised, lineWidth: max(6, size * 0.085))
            Circle().trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: max(6, size * 0.085), lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.snappy, value: progress)
            Image(systemName: symbol).font(.system(size: size * 0.2, weight: .semibold)).foregroundStyle(color)
        }
        .frame(width: size, height: size)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(goal.map { _ in "\(Int(progress * 100)) percent" } ?? "No goal")
    }
}

struct FoodLibraryTabs: View {
    @Binding var selection: Int
    private let labels = ["Recent", "Saved Foods", "My Meals"]
    var body: some View {
        HStack(spacing: 4) {
            ForEach(labels.indices, id: \.self) { index in
                Button(labels[index]) { selection = index }
                    .font(.system(size: 12, weight: selection == index ? .semibold : .regular))
                    .foregroundStyle(selection == index ? ErrdayTheme.foodAccent : ErrdayTheme.secondary)
                    .frame(maxWidth: .infinity, minHeight: 36)
                    .background(selection == index ? ErrdayTheme.foodAccent.opacity(0.12) : ErrdayTheme.background, in: RoundedRectangle(cornerRadius: 8))
            }
        }
    }
}

struct WaterLogSheet: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @State private var amount = "250"
    @State private var error = false
    private let date: Date

    init(date: Date = .now) {
        self.date = date
    }

    private var entryDate: Date { FoodInput.entryDate(on: date) }
    private var loggedEntries: [HydrationEntry] { records.hydrationEntries(on: date) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Log Water").font(.system(size: 22, weight: .semibold))
                    Spacer()
                    Text("\(dayLabel) · \(records.water(on: date).whole) ml logged").font(.system(size: 10)).foregroundStyle(ErrdayTheme.secondary)
                        .padding(.horizontal, 10).frame(height: 26).background(ErrdayTheme.raised, in: Capsule())
                }
                ErrdayTextField(label: "Amount", placeholder: "250", unit: "ml", keyboard: .decimalPad, text: $amount)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(error ? Color.orange : .clear))
                HStack {
                    Text("Quick add").font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                    Spacer()
                    Button(role: .destructive) { clearAmount() } label: {
                        Label("Clear", systemImage: "trash")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .buttonStyle(.plain)
                    .disabled((FoodInput.number(amount) ?? 0) == 0)
                }
                HStack(spacing: 12) {
                    quickAdd("+1 Glass", amount: 250, symbol: "cup.and.saucer", detail: "250 mL")
                    quickAdd("+1 Bottle", amount: 500, symbol: "waterbottle", detail: "500 mL")
                    quickAdd("+1 Large", amount: 750, symbol: "waterbottle.fill", detail: "750 mL")
                }
                SuccessActionButton(
                    title: "Log Water",
                    successTitle: "Water logged",
                    isEnabled: (FoodInput.number(amount) ?? 0) > 0,
                    action: save,
                    onCompletion: { dismiss() }
                )
                loggedWaterSection
            }
            .padding(20).errdayGlassControls()
        }
        .scrollIndicators(.hidden)
        .foregroundStyle(ErrdayTheme.text)
        .errdayKeyboardDone()
        .presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
    }
    private func quickAdd(_ title: String, amount value: Double, symbol: String, detail: String) -> some View {
        Button { addToAmount(value) } label: {
            VStack(spacing: 7) {
                Image(systemName: symbol).foregroundStyle(ErrdayTheme.foodAccent)
                Text(title).font(.system(size: 12, weight: .semibold))
                Text(detail).font(.system(size: 10)).foregroundStyle(ErrdayTheme.secondary)
            }.frame(maxWidth: .infinity, minHeight: 84).errdayGlass(radius: 12, interactive: true)
        }
        .buttonStyle(.plain)
        .accessibilityHint("Adds \(value.whole) millilitres to the amount")
    }

    @ViewBuilder private var loggedWaterSection: some View {
        if !loggedEntries.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                Text("Logged water")
                    .font(.system(size: 13, weight: .semibold))
                    .padding(.bottom, 6)
                ForEach(Array(loggedEntries.enumerated()), id: \.element.id) { index, entry in
                    HStack(spacing: 12) {
                        Image(systemName: "drop.fill")
                            .foregroundStyle(ErrdayTheme.foodAccent)
                            .frame(width: 24)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(entry.millilitres.whole) ml").font(.system(size: 14, weight: .medium))
                            Text(entry.date.formatted(date: .omitted, time: .shortened))
                                .font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
                        }
                        Spacer()
                        Button(role: .destructive) { delete(entry) } label: {
                            Image(systemName: "trash")
                                .frame(width: 36, height: 36)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Delete \(entry.millilitres.whole) millilitres")
                    }
                    .frame(minHeight: 50)
                    if index < loggedEntries.count - 1 { Divider().overlay(ErrdayTheme.border) }
                }
            }
            .padding(14)
            .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 10))
        }
    }

    private func addToAmount(_ value: Double) {
        let current = FoodInput.number(amount) ?? 0
        amount = (current + value).whole
        error = false
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func clearAmount() {
        amount = "0"
        error = false
    }

    private func delete(_ entry: HydrationEntry) {
        guard records.deleteWater(entry.id) else { error = true; return }
        error = false
        Task { await RoutineReminderScheduler.refreshIfAuthorized(for: records.data) }
    }
    private func save() -> Bool {
        guard let value = FoodInput.number(amount), value > 0, records.logWater(value, at: entryDate) else {
            error = true
            return false
        }
        error = false
        Task { await RoutineReminderScheduler.refreshIfAuthorized(for: records.data) }
        return true
    }

    private var dayLabel: String {
        Calendar.current.isDateInToday(date) ? "Today" : date.formatted(.dateTime.day().month(.abbreviated))
    }
}
