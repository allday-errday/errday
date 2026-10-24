import SwiftUI
import ErrdayCore

private struct MealTarget: Identifiable {
    let slot: MealSlot
    let calories: Double?
    let protein: Double?
    let carbs: Double?
    let fat: Double?

    var id: String { slot.rawValue }
    var symbol: String {
        switch slot {
        case .breakfast: "sunrise.fill"
        case .lunch: "sun.max.fill"
        case .dinner: "moon.stars.fill"
        case .snacks: "leaf.fill"
        }
    }
    var color: Color {
        switch slot {
        case .breakfast, .lunch: ErrdayTheme.foodAccent
        case .dinner: ErrdayTheme.dinnerAccent
        case .snacks: ErrdayTheme.snacksAccent
        }
    }
    var defaultHour: Int {
        switch slot {
        case .breakfast: 8
        case .lunch: 12
        case .snacks: 18
        case .dinner: 20
        }
    }
    func scheduledDate(on date: Date) -> Date {
        Calendar.current.date(bySettingHour: defaultHour, minute: 0, second: 0, of: date) ?? date
    }
}

private enum MealPlanRow: Identifiable {
    case meal(MealTarget)
    case preWorkout(PlannedGymSession)
    case gym(PlannedGymSession)

    var id: String {
        switch self {
        case .meal(let target): "meal-\(target.id)"
        case .preWorkout(let session): "pre-\(session.id.uuidString)"
        case .gym(let session): "gym-\(session.id.uuidString)"
        }
    }
}

private struct FoodSuggestion: Identifiable {
    let meal: MealEntry
    let reason: String
    var id: UUID { meal.id }
}

private enum SmartFoodSuggestions {
    static func meals(for slot: MealSlot, remainingCalories: Double, remainingProtein: Double,
                      remainingCarbs: Double, remainingFat: Double, recentMeals: [MealEntry]) -> [FoodSuggestion] {
        let options: [(String, MealSlot, Double, Double, Double, Double, String)] = [
            ("Greek yogurt, oats & berries", .breakfast, 520, 32, 68, 14, "High-protein breakfast with steady carbs"),
            ("Eggs on sourdough with avocado", .breakfast, 610, 29, 58, 29, "Balanced breakfast with filling fats"),
            ("Cottage cheese, banana & granola", .breakfast, 470, 32, 64, 10, "Quick protein and carbs for the morning"),
            ("Oatmeal with whey, banana & berries", .breakfast, 560, 35, 86, 9, "Carb-forward breakfast with protein"),
            ("Chicken rice bowl with vegetables", .lunch, 720, 48, 86, 18, "Protein-forward lunch that fits a larger target"),
            ("Turkey pasta with tomato sauce", .lunch, 680, 43, 84, 17, "Carb-rich lunch with lean protein"),
            ("Salmon, potatoes & greens", .dinner, 690, 42, 61, 26, "Protein and slower carbs for dinner"),
            ("Beef stir-fry with rice", .dinner, 760, 47, 78, 24, "Hearty dinner for a higher calorie gap"),
            ("Skyr with banana and peanut butter", .snacks, 360, 27, 39, 12, "Compact pre-workout protein and carbs"),
            ("Toast with cottage cheese and honey", .snacks, 330, 22, 45, 8, "Light snack when you need mostly carbs"),
            ("Chocolate milk & a fruit", .snacks, 290, 16, 43, 7, "Easy-to-digest pre-workout option")
        ]
        let recentNames = Set(recentMeals.map { $0.name.lowercased() })
        let sameSlot = recentMeals.filter { ($0.slot ?? .suggested(at: $0.date)) == slot }
        let habitCalories = sameSlot.isEmpty ? nil : sameSlot.reduce(0) { $0 + $1.calories } / Double(sameSlot.count)
        var scored = options.filter { $0.1 == slot }.map { item -> (FoodSuggestion, Double) in
            let meal = MealEntry(name: item.0, calories: item.2, protein: item.3, carbs: item.4, fat: item.5)
            var score = abs(item.2 - max(250, remainingCalories)) / 120
            score += abs(item.3 - max(15, min(remainingProtein, item.3))) / 18
            score += abs(item.4 - max(15, min(remainingCarbs, item.4))) / 28
            score += abs(item.5 - max(5, min(remainingFat, item.5))) / 14
            if let habitCalories { score += abs(item.2 - habitCalories) / 500 }
            if recentNames.contains(item.0.lowercased()) { score += 0.8 }
            return (FoodSuggestion(meal: meal, reason: item.6), score)
        }
        if slot == .breakfast {
            var meal = MealEntry(name: "Oats & Skyr Breakfast", calories: 1_076, protein: 58, carbs: 147, fat: 29)
            meal.source = .aiText
            meal.ingredients = [
                MealIngredient(name: "Oat flakes", amount: "80 g", calories: 304, protein: 10, carbs: 52, fat: 6),
                MealIngredient(name: "Skyr nature", amount: "300 g", calories: 189, protein: 33, carbs: 12, fat: 1),
                MealIngredient(name: "Banana", amount: "1 medium", calories: 107, protein: 1, carbs: 27, fat: 0),
                MealIngredient(name: "Whole grain bread", amount: "100 g", calories: 240, protein: 9, carbs: 40, fat: 4),
                MealIngredient(name: "Butter", amount: "10 g", calories: 72, protein: 0, carbs: 0, fat: 8),
                MealIngredient(name: "Honey", amount: "15 g", calories: 46, protein: 0, carbs: 12, fat: 0),
                MealIngredient(name: "Peanut butter", amount: "20 g", calories: 118, protein: 5, carbs: 4, fat: 10)
            ]
            scored.append((FoodSuggestion(meal: meal, reason: ""), 0.05))
        }
        return scored.sorted { $0.1 < $1.1 }.prefix(3).map(\.0)
    }
}

struct MealPlanSection: View {
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    let date: Date
    @State private var selectedTarget: MealTarget?
    @State private var showGymPlan = false
    @State private var preWorkoutMeal: MealEntry?

    private let slots: [MealSlot] = [.breakfast, .lunch, .snacks, .dinner]

    private var targets: [MealTarget] {
        let dailyCalories = records.data.calorieGoal.map {
            $0 + health.foodGoalAddition(on: date, weightKG: records.data.profile?.weight, data: records.data)
        }
        let shares: [MealSlot: Double] = [.breakfast: 0.30, .lunch: 0.35, .dinner: 0.25, .snacks: 0.10]
        return slots.map { slot in
            let share = shares[slot] ?? 0
            return MealTarget(slot: slot,
                              calories: dailyCalories.map { $0 * share },
                              protein: records.data.proteinGoal.map { $0 * share },
                              carbs: records.data.carbsGoal.map { $0 * share },
                              fat: records.data.fatGoal.map { $0 * share })
        }
    }

    private var todaySession: PlannedGymSession? {
        guard Calendar.current.isDateInToday(date) else { return nil }
        return records.data.plannedGymSessions?.first { Calendar.current.isDate($0.date, inSameDayAs: date) }
    }

    private var planRows: [MealPlanRow] {
        var rows = targets.map(MealPlanRow.meal)
        if let session = todaySession {
            rows.append(.preWorkout(session)); rows.append(.gym(session))
        }
        return rows.sorted { time(for: $0) < time(for: $1) }
    }

    private func time(for row: MealPlanRow) -> Date {
        switch row {
        case .meal(let target): target.scheduledDate(on: date)
        case .preWorkout(let session): session.startAt.addingTimeInterval(-Double(session.preWorkoutMinutes * 60))
        case .gym(let session): session.startAt
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Meal targets").font(.system(size: 18, weight: .semibold))
                Spacer()
                if Calendar.current.isDateInToday(date) {
                    Button { showGymPlan = true } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(ErrdayTheme.accent)
                            .frame(width: 34, height: 34)
                            .background(ErrdayTheme.accent.opacity(0.12), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(todaySession == nil ? "Add gym session" : "Edit gym session")
                    .accessibilityHint("Opens today's gym plan")
                    .accessibilityIdentifier("mealTargets.gymPlan")
                }
            }

            ErrdayCard {
                ForEach(Array(planRows.enumerated()), id: \.element.id) { index, row in
                    rowView(row)
                    if index < planRows.count - 1 { Divider() }
                }
            }
        }
        .sheet(item: $selectedTarget) { target in
            MealSlotDetailView(slot: target.slot, date: date, target: target)
        }
        .sheet(item: $preWorkoutMeal) { meal in
            NutritionDetailView(meal: meal, isDraft: true) { entry in
                var copy = entry
                copy.id = UUID(); copy.date = meal.date; copy.slot = .snacks
                _ = records.saveMeal(copy)
                preWorkoutMeal = nil
            }
        }
        .sheet(isPresented: $showGymPlan) {
            NavigationStack {
                ScrollView {
                    GymPlanCard(date: date).padding(20)
                }
                .errdayBackground()
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Done") { showGymPlan = false } }
                }
            }
        }
    }

    @ViewBuilder
    private func rowView(_ row: MealPlanRow) -> some View {
        switch row {
        case .meal(let target):
            Button { selectedTarget = target } label: {
                MealTargetRow(target: target, meals: records.meals(on: date).filter { ($0.slot ?? .suggested(at: $0.date)) == target.slot })
            }.buttonStyle(.plain)
        case .preWorkout(let session):
            Button { preWorkoutMeal = makePreWorkoutMeal(for: session) } label: {
                HStack(spacing: 12) {
                    Image(systemName: "bolt.fill").foregroundStyle(ErrdayTheme.accent).frame(width: 24)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Pre-workout idea").font(.system(size: 15, weight: .semibold))
                        Text("Fast-digesting carbs · \(time(for: row).formatted(date: .omitted, time: .shortened))")
                            .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                }.padding(.vertical, 7)
            }.buttonStyle(.plain)
        case .gym(let session):
            Button { showGymPlan = true } label: {
                HStack(spacing: 12) {
                    Image(systemName: "dumbbell.fill").foregroundStyle(ErrdayTheme.gymAccent).frame(width: 24)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Gym session").font(.system(size: 15, weight: .semibold))
                        Text(session.startAt.formatted(date: .omitted, time: .shortened)).font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    }
                    Spacer(); Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                }.padding(.vertical, 7)
            }.buttonStyle(.plain)
        }
    }

    private func makePreWorkoutMeal(for session: PlannedGymSession) -> MealEntry {
        let gymCalories = health.gymCalories(on: date, weightKG: records.data.profile?.weight) ?? 0
        let calories = max(300, min(500, 250 + gymCalories * 0.20))
        var meal = MealEntry(date: session.startAt.addingTimeInterval(-Double(session.preWorkoutMinutes * 60)), name: "Fast-carb pre-workout", calories: calories, protein: 18, carbs: calories * 0.55 / 4, fat: calories * 0.25 / 9)
        meal.source = .aiText; meal.slot = .snacks
        meal.ingredients = [
            MealIngredient(name: "Banana", amount: "1 medium", calories: 105, protein: 1, carbs: 27, fat: 0),
            MealIngredient(name: "Whole grain toast", amount: "2 slices", calories: 180, protein: 7, carbs: 32, fat: 3),
            MealIngredient(name: "Honey", amount: "15 g", calories: 46, protein: 0, carbs: 12, fat: 0)
        ]
        return meal
    }
}

private struct MealTargetRow: View {
    let target: MealTarget
    let meals: [MealEntry]

    private var calories: Double { meals.reduce(0) { $0 + $1.calories } }
    private var progress: Double { target.calories.map { min(max(calories / max(1, $0), 0), 1) } ?? 0 }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: target.symbol)
                .foregroundStyle(target.color)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(target.slot.title).font(.system(size: 15, weight: .semibold))
                    Text(target.scheduledDate(on: .now).formatted(date: .omitted, time: .shortened))
                        .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                }
                HStack(spacing: 5) {
                    Text(calories.whole)
                    Text(target.calories.map { "/ \($0.whole) kcal" } ?? "kcal logged")
                }
                .font(.caption)
                .foregroundStyle(ErrdayTheme.secondary)
                ProgressView(value: progress)
                    .tint(target.color)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(ErrdayTheme.secondary)
        }
        .padding(.vertical, 7)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityHint("Shows logged and remaining nutrition for this meal")
    }
}

private struct MealSlotDetailView: View {
    @Environment(PersonalStore.self) private var records
    @Environment(AssistantStore.self) private var assistant
    @Environment(\.dismiss) private var dismiss
    let slot: MealSlot
    let date: Date
    let target: MealTarget?
    @State private var suggestionToAdd: MealEntry?
    @State private var showSuggestions = false
    @State private var suggestions: [FoodSuggestion] = []
    @State private var suggestionOffset = 0

    private var meals: [MealEntry] {
        records.meals(on: date).filter { ($0.slot ?? .suggested(at: $0.date)) == slot }
    }
    private var calories: Double { meals.reduce(0) { $0 + $1.calories } }
    private var protein: Double { meals.reduce(0) { $0 + $1.protein } }
    private var carbs: Double { meals.reduce(0) { $0 + $1.carbs } }
    private var fat: Double { meals.reduce(0) { $0 + $1.fat } }
    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: slot.title, subtitle: date.formatted(.dateTime.weekday(.wide).day().month()))
                progressCard
                VStack(alignment: .leading, spacing: 10) {
                    SectionHeading(title: "Logged foods")
                    if meals.isEmpty {
                        ErrdayCard { EmptySection(title: "Nothing logged yet", symbol: "fork.knife", message: "Add food to start tracking this meal.") }
                    } else {
                        ErrdayCard {
                            ForEach(meals) { meal in
                                FoodMealRow(meal: meal)
                                if meal.id != meals.last?.id { Divider() }
                            }
                        }
                    }
                }
                VStack(alignment: .leading, spacing: 10) {
                    Button {
                        requestSuggestion()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "sparkles")
                            Text(showSuggestions ? "Suggest again" : "Suggested foods")
                        }
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(ErrdayTheme.accent)
                        .frame(minHeight: 40)
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Creates one food recommendation matched to your remaining nutrients and eating habits")
                    if showSuggestions {
                        ErrdayCard {
                            if case .analyzing? = assistant.foodAnalysis?.status {
                                HStack(spacing: 10) {
                                    ProgressView().tint(ErrdayTheme.accent)
                                    Text("Thinking of a meal that fits your goals…")
                                        .font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                                }
                            } else if let suggestion = aiSuggestion ?? suggestions.first {
                                suggestionRow(suggestion)
                            } else {
                                Text("Connect AI in Assistant Settings to get personalised meal ideas.")
                                    .font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                            }
                        }
                    }
                }
            }
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } } }
        }
        .sheet(item: $suggestionToAdd) { meal in
            NutritionDetailView(meal: meal, isDraft: true) { entry in
                var copy = entry
                copy.id = UUID()
                copy.date = FoodInput.entryDate(on: date)
                copy.slot = slot
                _ = records.saveMeal(copy)
                suggestionToAdd = nil
            }
        }
    }

    private var aiSuggestion: FoodSuggestion? {
        guard let analysis = assistant.foodAnalysis,
              Calendar.current.isDate(analysis.trackingDate, inSameDayAs: date) else { return nil }
        guard case .ready(let meal) = analysis.status else { return nil }
        return FoodSuggestion(meal: meal, reason: "")
    }

    @ViewBuilder
    private func suggestionRow(_ suggestion: FoodSuggestion) -> some View {
        Button { suggestionToAdd = suggestion.meal } label: {
            HStack(spacing: 10) {
                Image(systemName: "plus.circle.fill").foregroundStyle(ErrdayTheme.accent)
                VStack(alignment: .leading, spacing: 3) {
                    Text(suggestion.meal.name).font(.system(size: 14, weight: .semibold)).lineLimit(2)
                    Text("\(suggestion.meal.calories.whole) kcal · \(suggestion.meal.protein.whole) g protein · \(suggestion.meal.carbs.whole) g carbs · \(suggestion.meal.fat.whole) g fat")
                        .font(.caption).foregroundStyle(ErrdayTheme.secondary).lineLimit(2)
                }
                Spacer(minLength: 0)
            }
        }
        .buttonStyle(.plain)
    }

    private func requestSuggestion() {
        withAnimation(.snappy(duration: 0.2)) {
            showSuggestions = true
            suggestions = []
        }
        assistant.clearFoodAnalysis()
        guard assistant.isConnected else {
            let nextOffset = showSuggestions ? suggestionOffset + 1 : 0
            suggestions = makeSuggestions(startingAt: nextOffset)
            suggestionOffset = nextOffset
            return
        }
        let calendar = Calendar.current
        let start = calendar.date(byAdding: .day, value: -30, to: date) ?? date
        let recent = records.data.meals
            .filter { $0.date >= start && $0.date < date }
            .sorted { $0.date > $1.date }
            .prefix(12)
            .map { "\($0.name) (\($0.calories.whole) kcal, \($0.protein.whole)g protein)" }
            .joined(separator: "; ")
        let preference = slot == .breakfast ? "Preferred breakfast pattern: oat flakes with plain Skyr or Greek yogurt and a banana, plus whole grain bread with butter, honey and peanut butter. Use these ingredients as the starting point and adjust portions if needed." : ""
        let prompt = "Suggest one complete, realistic \(slot.title.lowercased()) meal for me to eat. Fit this remaining target as closely as possible: \(max(0, (target?.calories ?? 0) - calories).whole) kcal, \(max(0, (target?.protein ?? 0) - protein).whole) g protein, \(max(0, (target?.carbs ?? 0) - carbs).whole) g carbs, \(max(0, (target?.fat ?? 0) - fat).whole) g fat. \(preference) Use these recent meals as context, but do not repeat them automatically: \(recent). Return one meal with ingredients, realistic amounts and nutrition totals only. Estimates are fine; prioritize a balanced fit over exact numbers."
        _ = assistant.startFoodAnalysis(description: prompt, slot: slot, trackingDate: date)
    }

    private func makeSuggestions(startingAt: Int) -> [FoodSuggestion] {
        let calendar = Calendar.current
        let start = calendar.date(byAdding: .day, value: -30, to: date) ?? date
        let recentMeals = records.data.meals.filter { $0.date >= start && $0.date < date }
        let all = SmartFoodSuggestions.meals(
            for: slot,
            remainingCalories: max(250, (target?.calories ?? 600) - calories),
            remainingProtein: max(15, (target?.protein ?? 30) - protein),
            remainingCarbs: max(15, (target?.carbs ?? 50) - carbs),
            remainingFat: max(5, (target?.fat ?? 20) - fat),
            recentMeals: recentMeals
        )
        guard !all.isEmpty else { return [] }
        let offset = startingAt % all.count
        return Array(all[offset...]) + Array(all[..<offset])
    }

    private var progressCard: some View {
        ErrdayCard {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Eaten").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    Text("\(calories.whole) kcal").font(.system(size: 30, weight: .semibold))
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Remaining").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    Text(target?.calories.map { max(0, $0 - calories).whole } ?? "—")
                        .font(.system(size: 22, weight: .semibold))
                    if target?.calories != nil { Text("kcal").font(.caption).foregroundStyle(ErrdayTheme.secondary) }
                }
            }
            ProgressView(value: target?.calories.map { min(calories, $0) } ?? 0, total: max(1, target?.calories ?? 1))
                .tint(ErrdayTheme.accent)
            HStack(spacing: 10) {
                nutrient("Protein", value: protein, target: target?.protein)
                nutrient("Carbs", value: carbs, target: target?.carbs)
                nutrient("Fat", value: fat, target: target?.fat)
            }
        }
    }

    private func nutrient(_ title: String, value: Double, target: Double?) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title).font(.caption2).foregroundStyle(ErrdayTheme.secondary)
            Text(target.map { "\(value.whole) / \($0.whole) g" } ?? "\(value.whole) g")
                .font(.system(size: 12, weight: .semibold)).minimumScaleFactor(0.7).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
