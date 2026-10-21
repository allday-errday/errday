import SwiftUI
import ErrdayCore

struct NutritionDetailView: View {
    @Environment(PersonalStore.self) private var records
    @Environment(AssistantStore.self) private var assistant
    @Environment(\.dismiss) private var dismiss
    @State private var meal: MealEntry
    let isDraft: Bool
    let onSaveDraft: ((MealEntry) -> Void)?
    @State private var ingredientToEdit: MealIngredient?
    @State private var addIngredient = false
    @State private var fixIssue = false
    @State private var editNutrition = false
    @State private var nutrientToEdit: NutritionMetric?
    @State private var confirmDelete = false
    @State private var editTime = false
    @State private var editServing = false
    @State private var foodSaved = false
    @State private var draftSaved = false
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true

    init(meal: MealEntry, isDraft: Bool = false, onSave: ((MealEntry) -> Void)? = nil) {
        _meal = State(initialValue: meal)
        self.isDraft = isDraft
        self.onSaveDraft = onSave
    }

    private var ingredients: [MealIngredient] {
        if let stored = meal.ingredients, !stored.isEmpty { return stored }
        guard meal.source != .aiPhoto, let portion = meal.foodPortion else { return [] }
        return [MealIngredient(name: meal.name,
                               amount: "\(portion.amount.formatted(.number.precision(.fractionLength(0...1)))) \(portion.unit.rawValue)",
                               calories: meal.calories, protein: meal.protein,
                               carbs: meal.carbs, fat: meal.fat)]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    nutritionCards
                    ingredientSection
                    if let note = meal.aiNote, !note.isEmpty {
                        Text(note).font(.caption).foregroundStyle(ErrdayTheme.secondary)
                            .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                            .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 14))
                    }
                }
                .padding(.horizontal, 20).padding(.top, 10).padding(.bottom, 128)
                .frame(maxWidth: 620).frame(maxWidth: .infinity)
            }
            .errdayBackground().foregroundStyle(ErrdayTheme.text)
            .toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .bottom) {
                if !isDraft {
                    HStack(spacing: 10) {
                        Button { fixIssue = true } label: { Label("Fix Issue", systemImage: "sparkles") }
                            .buttonStyle(PrimaryButtonStyle(secondary: true))
                        Button("Done") {
                            ErrdayHaptics.tap(isEnabled: hapticsEnabled)
                            dismiss()
                        }
                        .buttonStyle(PrimaryButtonStyle())
                    }
                    .padding(.horizontal, 20).padding(.vertical, 12)
                    .errdayActionBar()
                }
            }
            .sheet(item: $ingredientToEdit) { ingredient in
                IngredientEditor(ingredient: ingredient, onSave: { updated in
                    updateIngredient(updated)
                }, onDelete: {
                    deleteIngredient(ingredient.id)
                })
            }
            .sheet(item: $nutrientToEdit) { nutrient in
                MealNutrientEditor(meal: meal, nutrient: nutrient) { value in
                    update(nutrient, to: value)
                }
            }
            .sheet(isPresented: $addIngredient) {
                FoodSearchView(onPick: { entry in add(entry); addIngredient = false })
            }
            .sheet(isPresented: $fixIssue) {
                FixMealIssueView(meal: meal) { corrected in commit(corrected) }
            }
            .sheet(isPresented: $editNutrition, onDismiss: { if !isDraft { reload() } }) {
                if isDraft {
                    MealEditor(preset: meal, date: meal.date, slot: meal.slot ?? .suggested(at: meal.date), onPick: { updated in
                        var corrected = updated
                        corrected.id = meal.id
                        corrected.date = meal.date
                        corrected.servings = meal.servings
                        commit(corrected)
                    })
                } else {
                    MealEditor(preset: meal, editing: meal)
                }
            }
            .sheet(isPresented: $editTime) {
                MealTimeEditor(date: meal.date) { updatedDate in
                    var updated = meal
                    updated.date = updatedDate
                    commit(updated)
                }
            }
            .sheet(isPresented: $editServing) {
                MealServingEditor(meal: meal) { updated in
                    commit(updated)
                }
            }
            .confirmationDialog("Delete this food entry?", isPresented: $confirmDelete) {
                Button("Delete", role: .destructive) {
                    if records.deleteMeal(meal.id) { dismiss() }
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 18) {
            ZStack {
                Text("Nutrition").font(.system(size: 18, weight: .semibold))
                HStack {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark").font(.system(size: 16, weight: .semibold))
                            .frame(width: 48, height: 48).errdayGlassCircle(interactive: true)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Close")
                    Spacer()
                    if isDraft {
                        Button { saveDraft() } label: {
                            HStack(spacing: 7) {
                                if draftSaved {
                                    Image(systemName: "checkmark")
                                        .transition(.scale.combined(with: .opacity))
                                }
                                Text(draftSaved ? "Added" : "Save")
                                    .contentTransition(.numericText())
                            }
                        }
                            .font(.system(size: 15, weight: .semibold))
                            .padding(.horizontal, 16).frame(height: 44)
                            .foregroundStyle(.white)
                            .errdayGlass(radius: 22, tint: ErrdayTheme.accent, interactive: true)
                            .buttonStyle(.plain)
                            .disabled(draftSaved)
                    } else {
                        Menu {
                            Button(foodSaved ? "Food saved" : "Save food", systemImage: foodSaved ? "bookmark.fill" : "bookmark") { saveFood() }
                                .disabled(foodSaved)
                            Button("Edit nutrition", systemImage: "pencil") { editNutrition = true }
                            Button("Delete", systemImage: "trash", role: .destructive) { confirmDelete = true }
                        } label: {
                            Image(systemName: "ellipsis").font(.system(size: 18, weight: .semibold))
                                .frame(width: 48, height: 48).errdayGlassCircle(interactive: true)
                        }
                    }
                }
            }
            Button { editTime = true } label: {
                HStack(spacing: 6) {
                    Text(meal.date, style: .time)
                    Image(systemName: "chevron.down").font(.system(size: 9, weight: .semibold))
                }
                .font(.system(size: 13, weight: .medium))
                .padding(.horizontal, 14).frame(height: 34)
                .errdayGlass(radius: 22, interactive: true)
            }.buttonStyle(.plain).accessibilityLabel("Change tracked time")
            HStack(alignment: .firstTextBaseline) {
                Text(meal.name).font(.system(size: 27, weight: .bold)).lineLimit(2)
                Spacer()
                Button { editServing = true } label: {
                    HStack(spacing: 6) {
                        Text(servingDescription)
                        Image(systemName: "chevron.down").font(.system(size: 9, weight: .semibold))
                    }
                    .font(.system(size: 15, weight: .semibold))
                    .padding(.horizontal, 16).frame(height: 46)
                    .errdayGlass(radius: 23, interactive: true)
                }.buttonStyle(.plain).accessibilityLabel("Change serving")
            }
        }
        .errdayGlassControls()
    }

    private var servingDescription: String {
        guard let portion = meal.foodPortion else {
            let count = meal.servings ?? 1
            let word = abs(count - 1) < 0.0001 ? "serving" : "servings"
            return "\(count.formatted(.number.precision(.fractionLength(0...2)))) \(word)"
        }
        if let serving = portion.servingAmount, serving > 0 {
            let count = portion.amount / serving
            let word = abs(count - 1) < 0.0001 ? "serving" : "servings"
            return "\(count.formatted(.number.precision(.fractionLength(0...2)))) \(word)"
        }
        return "\(portion.amount.formatted(.number.precision(.fractionLength(0...1)))) \(portion.unit.rawValue)"
    }

    private var nutritionCards: some View {
        NutritionFactsView(values: NutritionMetricValues(
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            fiber: meal.fiber,
            sugar: meal.sugar,
            sodium: meal.sodium
        )) { nutrient in
            nutrientToEdit = nutrient
        }
    }

    private var ingredientSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Ingredients").font(.system(size: 19, weight: .semibold))
                Spacer()
                if meal.source != .aiPhoto && meal.source != .nutritionLabel {
                    Button("Add More", systemImage: "plus") { addIngredient = true }
                        .font(.system(size: 13)).foregroundStyle(ErrdayTheme.secondary)
                }
            }
            if meal.source == .nutritionLabel {
                Text("These values were copied from a photographed nutrition label and reviewed before saving. Missing values were not guessed.")
                    .font(.system(size: 14)).foregroundStyle(ErrdayTheme.secondary)
                    .padding(18).frame(maxWidth: .infinity, alignment: .leading)
                    .errdaySurface()
            } else if meal.source == .aiPhoto {
                Text("This meal was calculated from a photo with AI. No reliable ingredient list was visible, so only the estimated nutrition is shown.")
                    .font(.system(size: 14)).foregroundStyle(ErrdayTheme.secondary)
                    .padding(18).frame(maxWidth: .infinity, alignment: .leading)
                    .errdaySurface()
            } else if ingredients.isEmpty {
                Text("No ingredients were saved for this food.").font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
            } else {
                ForEach(ingredients) { ingredient in
                    Button { ingredientToEdit = ingredient } label: {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(ingredient.name).font(.system(size: 15, weight: .medium)).foregroundStyle(ErrdayTheme.text)
                                Text("\(ingredient.calories.whole) cal").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                            }
                            Spacer(); Text(ingredient.amount).font(.system(size: 13)).foregroundStyle(ErrdayTheme.secondary)
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.quiet)
                        }.padding(18).errdaySurface()
                    }.buttonStyle(.plain)
                }
            }
        }
    }

    private func updateIngredient(_ updated: MealIngredient) {
        var list = ingredients
        if let index = list.firstIndex(where: { $0.id == updated.id }) { list[index] = updated }
        meal.ingredients = list; recalculate(); commit(meal)
    }

    private func deleteIngredient(_ id: UUID) {
        var list = ingredients
        list.removeAll { $0.id == id }
        meal.ingredients = list
        recalculate()
        commit(meal)
    }

    private func update(_ nutrient: NutritionMetric, to value: Double) {
        switch nutrient {
        case .calories: meal.calories = value
        case .protein: meal.protein = value
        case .carbs: meal.carbs = value
        case .fat: meal.fat = value
        case .fiber: meal.fiber = value
        case .sugar: meal.sugar = value
        case .sodium: meal.sodium = value
        }
        commit(meal)
    }

    private func add(_ entry: MealEntry) {
        var list = ingredients
        list.append(MealIngredient(name: entry.name, calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fat: entry.fat))
        meal.ingredients = list; meal.source = .savedMeal; recalculate(); commit(meal)
    }

    private func recalculate() {
        guard let list = meal.ingredients, !list.isEmpty else { return }
        meal.calories = list.reduce(0) { $0 + $1.calories }
        meal.protein = list.reduce(0) { $0 + $1.protein }
        meal.carbs = list.reduce(0) { $0 + $1.carbs }
        meal.fat = list.reduce(0) { $0 + $1.fat }
    }

    private func commit(_ value: MealEntry) {
        meal = value
        if !isDraft { _ = records.saveMeal(value) }
    }

    private func saveDraft() {
        guard meal.isValid, !draftSaved else { return }
        let saved: Bool
        if let onSaveDraft {
            onSaveDraft(meal)
            saved = true
        } else {
            saved = records.saveMeal(meal)
        }
        guard saved else { return }
        withAnimation(.snappy(duration: 0.28)) { draftSaved = true }
        ErrdayHaptics.success(isEnabled: hapticsEnabled)
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(520))
            dismiss()
        }
    }

    private func saveFood() {
        guard meal.isValid else { return }
        foodSaved = records.update { data in
            var saved = data.savedFoods ?? []
            let key = meal.foodPortion?.product.id ?? meal.name.lowercased()
            saved.removeAll { ($0.foodPortion?.product.id ?? $0.name.lowercased()) == key }
            saved.append(meal)
            data.savedFoods = saved
        }
        if foodSaved { ErrdayHaptics.success(isEnabled: hapticsEnabled) }
    }

    private func reload() {
        if let current = records.data.meals.first(where: { $0.id == meal.id }) { meal = current }
    }
}

private struct MealTimeEditor: View {
    @Environment(\.dismiss) private var dismiss
    let originalDate: Date
    let onSave: (Date) -> Void
    @State private var time: Date

    init(date: Date, onSave: @escaping (Date) -> Void) {
        originalDate = date
        self.onSave = onSave
        _time = State(initialValue: date)
    }

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Tracked time", selection: $time, displayedComponents: .hourAndMinute)
                    .datePickerStyle(.wheel)
            }
            .navigationTitle("Tracked Time").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Image(systemName: "xmark") }
                        .accessibilityLabel("Close")
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let calendar = Calendar.current
                        let components = calendar.dateComponents([.hour, .minute, .second], from: time)
                        let updated = calendar.date(bySettingHour: components.hour ?? 12,
                                                    minute: components.minute ?? 0,
                                                    second: components.second ?? 0,
                                                    of: originalDate) ?? originalDate
                        onSave(updated)
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct MealServingEditor: View {
    @Environment(\.dismiss) private var dismiss
    let meal: MealEntry
    let onSave: (MealEntry) -> Void
    @State private var value: String
    @FocusState private var focused: Bool

    init(meal: MealEntry, onSave: @escaping (MealEntry) -> Void) {
        self.meal = meal
        self.onSave = onSave
        if let portion = meal.foodPortion {
            let initial = portion.servingAmount.map { portion.amount / $0 } ?? portion.amount
            _value = State(initialValue: FoodInput.text(initial))
        } else {
            _value = State(initialValue: FoodInput.text(meal.servings ?? 1))
        }
    }

    private var parsedValue: Double? {
        guard let value = FoodInput.number(value), value > 0, value <= 100 else { return nil }
        return value
    }

    private var fieldUnit: String {
        if let portion = meal.foodPortion {
            return portion.servingAmount == nil ? portion.unit.rawValue : "servings"
        }
        return "servings"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        TextField("Serving", text: $value)
                            .keyboardType(.decimalPad)
                            .focused($focused)
                        Text(fieldUnit).foregroundStyle(.secondary)
                    }
                } footer: {
                    Text("Nutrition values update with the selected serving.")
                }
            }
            .navigationTitle("Serving").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { dismiss() } label: { Image(systemName: "xmark") }
                        .accessibilityLabel("Close")
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let updated = updatedMeal else { return }
                        onSave(updated)
                        dismiss()
                    }.disabled(updatedMeal == nil)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { focused = false }
                }
            }
            .onAppear { focused = true }
        }
    }

    private var updatedMeal: MealEntry? {
        guard let parsedValue else { return nil }
        if var portion = meal.foodPortion {
            let oldAmount = portion.amount
            let newAmount = portion.servingAmount.map { $0 * parsedValue } ?? parsedValue
            guard oldAmount > 0, newAmount > 0 else { return nil }
            let ratio = newAmount / oldAmount
            portion.amount = newAmount
            guard var updated = portion.meal(name: meal.name, id: meal.id, date: meal.date) else { return nil }
            updated.slot = meal.slot
            updated.source = meal.source
            updated.aiNote = meal.aiNote
            updated.ingredients = scale(meal.ingredients, by: ratio)
            updated.servings = meal.servings
            return updated
        }

        let oldCount = meal.servings ?? 1
        guard oldCount > 0 else { return nil }
        let ratio = parsedValue / oldCount
        var updated = meal
        updated.servings = parsedValue
        updated.calories *= ratio
        updated.protein *= ratio
        updated.carbs *= ratio
        updated.fat *= ratio
        updated.fiber = updated.fiber.map { $0 * ratio }
        updated.sugar = updated.sugar.map { $0 * ratio }
        updated.sodium = updated.sodium.map { $0 * ratio }
        updated.ingredients = scale(updated.ingredients, by: ratio)
        return updated
    }

    private func scale(_ ingredients: [MealIngredient]?, by ratio: Double) -> [MealIngredient]? {
        ingredients?.map { ingredient in
            var updated = ingredient
            updated.calories *= ratio
            updated.protein *= ratio
            updated.carbs *= ratio
            updated.fat *= ratio
            return updated
        }
    }
}

private struct MealNutrientEditor: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    let meal: MealEntry
    let nutrient: NutritionMetric
    let onSave: (Double) -> Void
    @State private var text: String
    @FocusState private var focused: Bool

    init(meal: MealEntry, nutrient: NutritionMetric, onSave: @escaping (Double) -> Void) {
        self.meal = meal
        self.nutrient = nutrient
        self.onSave = onSave
        _text = State(initialValue: FoodInput.text(Self.value(of: nutrient, in: meal)))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                editorHeader
                ScrollView {
                    VStack(alignment: .leading, spacing: 28) {
                        summaryCard
                        VStack(alignment: .leading, spacing: 8) {
                            Text(nutrient.title).font(.system(size: 13, weight: .medium)).foregroundStyle(ErrdayTheme.secondary)
                            HStack {
                                TextField(nutrient.title, text: $text)
                                    .keyboardType(.decimalPad).focused($focused).font(.system(size: 18))
                                Text(nutrient.unit).font(.system(size: 14, weight: .medium)).foregroundStyle(ErrdayTheme.secondary)
                            }
                            .padding(.horizontal, 16).frame(height: 64)
                            .errdaySurface()
                            .overlay(RoundedRectangle(cornerRadius: ErrdayTheme.radius).stroke(focused ? ErrdayTheme.accent : .clear, lineWidth: 1))
                        }
                    }
                    .padding(.horizontal, 20).padding(.top, 28).padding(.bottom, 120)
                    .frame(maxWidth: 620).frame(maxWidth: .infinity)
                }
            }
            .errdayBackground().foregroundStyle(ErrdayTheme.text)
            .toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .bottom) {
                HStack(spacing: 10) {
                    Button("Revert") { text = FoodInput.text(Self.value(of: nutrient, in: meal)) }
                        .buttonStyle(PrimaryButtonStyle(secondary: true))
                    Button("Done") { save() }.buttonStyle(PrimaryButtonStyle()).disabled(parsedValue == nil)
                }
                .padding(.horizontal, 20).padding(.vertical, 12).errdayActionBar()
            }
            .onAppear { focused = true }
        }
    }

    private var editorHeader: some View {
        ZStack {
            Text("Edit \(nutrient.title)").font(.system(size: 18, weight: .semibold))
            HStack {
                Button { dismiss() } label: {
                    Image(systemName: "arrow.left").frame(width: 48, height: 48)
                        .errdayGlassCircle(interactive: true)
                }.buttonStyle(.plain)
                Spacer()
            }
        }.padding(.horizontal, 20).padding(.top, 10)
    }

    private var summaryCard: some View {
        HStack(spacing: 18) {
            ZStack {
                Circle().stroke(nutrient.color.opacity(0.14), lineWidth: 5)
                Circle().trim(from: 0, to: progress).stroke(nutrient.color, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Image(systemName: nutrient.symbol).foregroundStyle(nutrient.color)
            }.frame(width: 58, height: 58)
            VStack(alignment: .leading, spacing: 5) {
                Text("\((parsedValue ?? Self.value(of: nutrient, in: meal)).whole)\(nutrient.unit == "kcal" ? "" : nutrient.unit)")
                    .font(.system(size: 20, weight: .semibold))
                Text(goalDescription).font(.system(size: 14)).foregroundStyle(ErrdayTheme.secondary)
            }
            Spacer()
        }.padding(20).errdaySurface()
    }

    private var parsedValue: Double? { FoodInput.number(text) }
    private var goal: Double? {
        switch nutrient {
        case .calories: records.data.calorieGoal
        case .protein: records.data.proteinGoal
        case .carbs: records.data.carbsGoal
        case .fat: records.data.fatGoal
        case .fiber: records.data.fiberGoal
        case .sugar: records.data.sugarGoal
        case .sodium: records.data.sodiumGoal
        }
    }
    private var totalToday: Double {
        records.meals(on: meal.date).reduce(0) { partial, entry in
            partial + Self.value(of: nutrient, in: entry)
        } - Self.value(of: nutrient, in: meal) + (parsedValue ?? Self.value(of: nutrient, in: meal))
    }
    private var progress: Double {
        guard let goal, goal > 0 else { return 0 }
        return min(max(totalToday / goal, 0), 1)
    }
    private var goalDescription: String {
        guard let goal else { return "No daily goal set" }
        return "\(max(0, goal - totalToday).whole) \(nutrient.unit) left today"
    }
    private func save() { guard let parsedValue else { return }; onSave(parsedValue); dismiss() }
    private static func value(of nutrient: NutritionMetric, in meal: MealEntry) -> Double {
        switch nutrient {
        case .calories: meal.calories
        case .protein: meal.protein
        case .carbs: meal.carbs
        case .fat: meal.fat
        case .fiber: meal.fiber ?? 0
        case .sugar: meal.sugar ?? 0
        case .sodium: meal.sodium ?? 0
        }
    }
}

private enum IngredientMeasurement: String, CaseIterable, Identifiable {
    case serving = "Serving"
    case grams = "g"
    case millilitres = "ml"
    case cup = "Cup"
    case fluidOunces = "fl oz"
    var id: String { rawValue }
}

private struct IngredientEditor: View {
    @Environment(\.dismiss) private var dismiss
    let original: MealIngredient
    let originalServingCount: Double
    let originalMeasurement: IngredientMeasurement
    let onSave: (MealIngredient) -> Void
    let onDelete: () -> Void
    @State private var name: String
    @State private var servings: String
    @State private var measurement: IngredientMeasurement
    @State private var calories: String
    @State private var protein: String
    @State private var carbs: String
    @State private var fat: String

    @State private var confirmDelete = false

    init(ingredient: MealIngredient, onSave: @escaping (MealIngredient) -> Void, onDelete: @escaping () -> Void) {
        original = ingredient; self.onSave = onSave; self.onDelete = onDelete
        let parsed = Self.parseAmount(ingredient.amount)
        originalServingCount = FoodInput.number(parsed.value) ?? 1
        originalMeasurement = parsed.measurement
        _name = State(initialValue: ingredient.name)
        _servings = State(initialValue: parsed.value)
        _measurement = State(initialValue: parsed.measurement)
        _calories = State(initialValue: String(ingredient.calories)); _protein = State(initialValue: String(ingredient.protein))
        _carbs = State(initialValue: String(ingredient.carbs)); _fat = State(initialValue: String(ingredient.fat))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ZStack {
                    Text("Edit Ingredient").font(.system(size: 18, weight: .semibold))
                    HStack {
                        Button { dismiss() } label: {
                            Image(systemName: "arrow.left").frame(width: 48, height: 48).errdayGlassCircle(interactive: true)
                        }.buttonStyle(.plain)
                        Spacer()
                        Button { confirmDelete = true } label: {
                            Image(systemName: "trash").frame(width: 48, height: 48).foregroundStyle(.red).errdayGlassCircle(interactive: true)
                        }.buttonStyle(.plain)
                    }
                }.padding(.horizontal, 20).padding(.top, 10).errdayGlassControls()
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        TextField("Ingredient name", text: $name).font(.system(size: 30, weight: .bold))
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Measurement").font(.system(size: 16, weight: .semibold))
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(IngredientMeasurement.allCases) { option in
                                        Button(option.rawValue) { measurement = option }
                                            .font(.system(size: 15, weight: .medium))
                                            .padding(.horizontal, 20).frame(height: 48)
                                            .foregroundStyle(measurement == option ? Color.white : ErrdayTheme.text)
                                            .errdayGlass(radius: 24, tint: measurement == option ? ErrdayTheme.accent : nil, interactive: true)
                                    }
                                }.errdayGlassControls()
                            }
                            HStack {
                                Text(measurement == .serving ? "Number of servings" : "Amount")
                                    .font(.system(size: 16, weight: .semibold))
                                Spacer()
                                TextField("1", text: $servings).keyboardType(.decimalPad)
                                    .multilineTextAlignment(.center).font(.system(size: 18, weight: .semibold))
                                    .frame(width: 130, height: 50)
                                    .background(ErrdayTheme.surface, in: Capsule())
                                    .overlay(Capsule().stroke(ErrdayTheme.border, lineWidth: 1))
                            }
                        }
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Nutrition").font(.system(size: 16, weight: .semibold))
                            HStack(spacing: 10) {
                                compactField("Calories", unit: "kcal", text: $calories)
                                compactField("Protein", unit: "g", text: $protein)
                            }
                            HStack(spacing: 10) {
                                compactField("Carbs", unit: "g", text: $carbs)
                                compactField("Fats", unit: "g", text: $fat)
                            }
                        }
                    }
                    .padding(.horizontal, 20).padding(.top, 24).padding(.bottom, 120)
                    .frame(maxWidth: 620).frame(maxWidth: .infinity)
                }
            }
            .errdayBackground().foregroundStyle(ErrdayTheme.text)
            .toolbar(.hidden, for: .navigationBar).errdayKeyboardDone()
            .safeAreaInset(edge: .bottom) {
                Button("Done") { save() }.buttonStyle(PrimaryButtonStyle()).disabled(value == nil)
                    .padding(.horizontal, 20).padding(.vertical, 12).errdayActionBar()
            }
            .confirmationDialog("Delete this ingredient?", isPresented: $confirmDelete) {
                Button("Delete", role: .destructive) { onDelete(); dismiss() }
            }
            .onChange(of: servings) { _, _ in rescaleForServingCount() }
            .onChange(of: measurement) { _, _ in rescaleForServingCount() }
        }
    }

    private func compactField(_ label: String, unit: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption).foregroundStyle(ErrdayTheme.secondary)
            HStack(spacing: 3) {
                TextField("0", text: text).keyboardType(.decimalPad).font(.system(size: 18, weight: .semibold))
                Text(unit).font(.caption).foregroundStyle(ErrdayTheme.secondary)
            }
        }.padding(14).frame(maxWidth: .infinity).errdaySurface()
    }

    private var value: MealIngredient? {
        guard let kcal = FoodInput.number(calories), let p = FoodInput.number(protein),
              let c = FoodInput.number(carbs), let f = FoodInput.number(fat),
              let servingCount = FoodInput.number(servings), servingCount > 0,
              !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        return MealIngredient(id: original.id, name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                              amount: "\(servingCount.formatted(.number.precision(.fractionLength(0...2)))) \(measurement.rawValue)",
                              calories: kcal, protein: p, carbs: c, fat: f)
    }
    private func save() { guard let value else { return }; onSave(value); dismiss() }

    private func rescaleForServingCount() {
        guard measurement == originalMeasurement,
              originalServingCount > 0,
              let current = FoodInput.number(servings) else { return }
        let scale = current / originalServingCount
        calories = FoodInput.text(original.calories * scale)
        protein = FoodInput.text(original.protein * scale)
        carbs = FoodInput.text(original.carbs * scale)
        fat = FoodInput.text(original.fat * scale)
    }

    private static func parseAmount(_ amount: String) -> (value: String, measurement: IngredientMeasurement) {
        let lowercased = amount.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let number = lowercased.split(whereSeparator: { !$0.isNumber && $0 != "." && $0 != "," }).first
        let value = number.map(String.init)?.replacingOccurrences(of: ",", with: ".") ?? "1"
        if lowercased.contains("ml") { return (value, .millilitres) }
        if lowercased.contains("fl oz") { return (value, .fluidOunces) }
        if lowercased.contains("cup") { return (value, .cup) }
        if lowercased.contains("g") { return (value, .grams) }
        return (value, .serving)
    }
}

private struct FixMealIssueView: View {
    @Environment(AssistantStore.self) private var assistant
    @Environment(\.dismiss) private var dismiss
    let meal: MealEntry
    let onUpdate: (MealEntry) -> Void
    @State private var correction = ""
    @State private var processing = false
    @State private var showConnection = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 24) {
                Label("Fix result", systemImage: "sparkles").font(.system(size: 28, weight: .semibold))
                TextField("Describe what needs to be fixed", text: $correction, axis: .vertical)
                    .lineLimit(3...6).padding(16)
                    .errdaySurface()
                Text("Example: It was duck, not turkey").font(.system(size: 14)).foregroundStyle(ErrdayTheme.secondary)
                    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                    .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 14))
                if let error { Text(error).font(.footnote).foregroundStyle(.orange) }
                Spacer()
                Button { update() } label: {
                    HStack { if processing { ProgressView().tint(.white) }; Text(processing ? "Updating …" : "Update") }
                }.buttonStyle(PrimaryButtonStyle()).disabled(correction.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || processing)
            }
            .padding(24).errdayBackground().foregroundStyle(ErrdayTheme.text)
            .navigationTitle("").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .sheet(isPresented: $showConnection) { AssistantSettingsView() }
        }
    }

    private func update() {
        guard assistant.isConnected else { showConnection = true; return }
        processing = true; error = nil
        let request = "Correct this consumed meal. Current result: \(meal.name), \(meal.calories.whole) kcal, protein \(meal.protein.decimal) g, carbs \(meal.carbs.decimal) g, fat \(meal.fat.decimal) g. User correction: \(correction)."
        Task {
            defer { processing = false }
            do {
                let estimate = try await assistant.analyzeFoodDescription(request)
                var corrected = try estimate.meal(slot: meal.slot ?? .suggested(at: meal.date), source: meal.source ?? .aiText)
                corrected.id = meal.id; corrected.date = meal.date
                if meal.source == .aiPhoto { corrected.ingredients = nil }
                onUpdate(corrected); dismiss()
            } catch {
                self.error = (error as? AssistantFailure)?.localizedDescription ?? "The result could not be updated."
            }
        }
    }
}
