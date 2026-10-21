import SwiftUI
import ErrdayCore

struct MealEditor: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    let editing: MealEntry?
    let onSaved: () -> Void
    let onPick: ((MealEntry) -> Void)?
    let entryDate: Date
    let originalSource: MealSource?
    let originalIngredients: [MealIngredient]?
    let originalAINote: String?
    let originalFoodPortion: FoodPortion?
    let originalServings: Double?
    @State private var slot: MealSlot
    @State private var loggedAt: Date
    @State private var confirmDelete = false
    @State private var saveFavorite = false
    init(preset: MealEntry? = nil, editing: MealEntry? = nil, date: Date = .now, slot: MealSlot = .suggested(at: .now), onPick: ((MealEntry) -> Void)? = nil, onSaved: @escaping () -> Void = {}) {
        self.editing = editing; self.onSaved = onSaved; self.onPick = onPick; self.entryDate = FoodInput.entryDate(on: date)
        _slot = State(initialValue: editing?.slot ?? slot)
        let meal = editing ?? preset
        _loggedAt = State(initialValue: meal?.date ?? FoodInput.entryDate(on: date))
        self.originalSource = meal?.source
        self.originalIngredients = meal?.ingredients
        self.originalAINote = meal?.aiNote
        self.originalFoodPortion = meal?.foodPortion
        self.originalServings = meal?.servings
        _name = State(initialValue: meal?.name ?? "")
        _calories = State(initialValue: FoodInput.text(meal?.calories))
        _protein = State(initialValue: FoodInput.text(meal?.protein))
        _carbs = State(initialValue: FoodInput.text(meal?.carbs))
        _fat = State(initialValue: FoodInput.text(meal?.fat))
        _fiber = State(initialValue: FoodInput.text(meal?.fiber))
        _sugar = State(initialValue: FoodInput.text(meal?.sugar))
        _sodium = State(initialValue: FoodInput.text(meal?.sodium))
    }
    @State private var name = ""
    @State private var calories = ""
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var fiber = ""
    @State private var sugar = ""
    @State private var sodium = ""

    private func number(_ value: String) -> Double? {
        Double(value.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: "."))
    }
    private var entry: MealEntry? {
        guard let kcal = number(calories), let p = number(protein), let c = number(carbs), let f = number(fat) else { return nil }
        var meal = MealEntry(id: editing?.id ?? UUID(), date: loggedAt, name: name.trimmingCharacters(in: .whitespacesAndNewlines), calories: kcal, protein: p, carbs: c, fat: f,
                             fiber: optionalNumber(fiber), sugar: optionalNumber(sugar), sodium: optionalNumber(sodium))
        meal.slot = slot
        meal.source = editing?.source ?? originalSource ?? .manual
        meal.ingredients = editing?.ingredients ?? originalIngredients
        meal.aiNote = editing?.aiNote ?? originalAINote
        meal.foodPortion = editing?.foodPortion ?? originalFoodPortion
        meal.servings = editing?.servings ?? originalServings
        return meal.isValid ? meal : nil
    }
    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: editing == nil ? "Add Food" : "Edit Food", subtitle: "Enter the values for your full portion.")
                MealNameEditor(name: $name, loggedAt: $loggedAt)
                NutritionFactsEditor(
                    calories: $calories,
                    protein: $protein,
                    carbs: $carbs,
                    fat: $fat,
                    fiber: $fiber,
                    sugar: $sugar,
                    sodium: $sodium
                )
                Text("Use the values from the package or your recipe. Zero is a valid value.")
                    .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                if editing == nil && onPick == nil {
                    ErrdayCard { Toggle("Save as a reusable food", isOn: $saveFavorite) }
                }
                if let error = records.errorMessage { Text(error).font(.footnote).foregroundStyle(.red) }
                if editing == nil {
                    SuccessActionButton(
                        title: "Add Food",
                        successTitle: "Food added",
                        isEnabled: entry != nil,
                        action: save,
                        onCompletion: finishSaving
                    )
                }
                if editing != nil && onPick == nil { Button("Delete Entry", role: .destructive) { confirmDelete = true } }
            }
            .safeAreaInset(edge: .bottom) {
                if editing != nil {
                    SuccessActionButton(
                        title: "Done",
                        successTitle: "Saved",
                        isEnabled: entry != nil,
                        action: save,
                        onCompletion: finishSaving
                    )
                        .padding(.horizontal, 20).padding(.vertical, 12).errdayActionBar()
                }
            }
            .confirmationDialog("Delete this entry?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    if let editing, records.deleteMeal(editing.id) { dismiss() }
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
    }
    private func optionalNumber(_ value: String) -> Double? {
        value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : number(value)
    }
    private func save() -> Bool {
        guard let entry else { return false }
        if let onPick {
            onPick(entry)
            return true
        }
        return records.update { data in
            if let index = data.meals.firstIndex(where: { $0.id == entry.id }) { data.meals[index] = entry } else { data.meals.append(entry) }
            if saveFavorite { var favorites = data.savedFoods ?? []; favorites.append(entry); data.savedFoods = favorites }
        }
    }
    private func finishSaving() {
        dismiss()
        onSaved()
    }
}

private struct MealNameEditor: View {
    @Binding var name: String
    @Binding var loggedAt: Date
    @FocusState private var nameFocused: Bool

    var body: some View {
        ErrdayCard {
            VStack(alignment: .leading, spacing: 7) {
                Text("Food name")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(ErrdayTheme.secondary)
                TextField("What did you eat?", text: $name)
                    .textFieldStyle(.plain)
                    .font(.system(size: 27, weight: .bold))
                    .focused($nameFocused)
                    .accessibilityLabel("Food name")
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 72, alignment: .leading)
            .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 10))
            .overlay {
                RoundedRectangle(cornerRadius: 10)
                    .stroke(nameFocused ? ErrdayTheme.accent.opacity(0.65) : .clear, lineWidth: 1.5)
            }
            DatePicker("Tracked time", selection: $loggedAt, displayedComponents: .hourAndMinute)
        }
    }
}

private struct NutritionFactsEditor: View {
    @Binding var calories: String
    @Binding var protein: String
    @Binding var carbs: String
    @Binding var fat: String
    @Binding var fiber: String
    @Binding var sugar: String
    @Binding var sodium: String

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 3)

    var body: some View {
        VStack(spacing: 10) {
            NutritionValueEditor(metric: .calories, value: $calories, prominent: true)
            LazyVGrid(columns: columns, spacing: 10) {
                NutritionValueEditor(metric: .protein, value: $protein)
                NutritionValueEditor(metric: .carbs, value: $carbs)
                NutritionValueEditor(metric: .fat, value: $fat)
                NutritionValueEditor(metric: .fiber, value: $fiber)
                NutritionValueEditor(metric: .sugar, value: $sugar)
                NutritionValueEditor(metric: .sodium, value: $sodium)
            }
        }
    }
}

private struct NutritionValueEditor: View {
    let metric: NutritionMetric
    @Binding var value: String
    var prominent = false
    @FocusState private var focused: Bool

    var body: some View {
        HStack(alignment: .top, spacing: prominent ? 14 : 7) {
            Image(systemName: metric.symbol)
                .font(prominent ? .system(size: 25) : .caption)
                .foregroundStyle(metric.color)
                .frame(width: prominent ? 28 : 14)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: prominent ? 2 : 7) {
                Text(metric.title)
                    .font(prominent ? .caption : .caption2)
                    .foregroundStyle(metric.color)
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    TextField("—", text: $value)
                        .textFieldStyle(.plain)
                        .keyboardType(.decimalPad)
                        .focused($focused)
                        .font(.system(size: prominent ? 34 : 17, weight: .semibold))
                        .multilineTextAlignment(.leading)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    Text(metric.unit)
                        .font(.system(size: prominent ? 14 : 11, weight: .medium))
                        .foregroundStyle(ErrdayTheme.secondary)
                        .fixedSize()
                }
            }
            Spacer(minLength: 0)
        }
        .padding(prominent ? 20 : 12)
        .frame(maxWidth: .infinity, minHeight: prominent ? 0 : 84, alignment: .leading)
        .errdaySurface()
        .overlay {
            RoundedRectangle(cornerRadius: ErrdayTheme.radius)
                .stroke(focused ? metric.color.opacity(0.7) : .clear, lineWidth: 1.5)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(metric.title)
    }
}
