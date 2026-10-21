import SwiftUI
import ErrdayCore

private enum PortionAmountMode: String, CaseIterable, Identifiable {
    case serving = "Serving"
    case exact = "Exact amount"
    var id: String { rawValue }
}

struct FoodPortionEditor: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    let product: FoodProduct
    let editing: MealEntry?
    let onSaved: () -> Void
    let onPick: ((MealEntry) -> Void)?
    let entryDate: Date
    let source: MealSource
    let sourceDescription: String?
    let note: String?
    let servingAmount: Double?
    let servingLabel: String?
    @State private var slot: MealSlot
    @State private var name: String
    @State private var amount: String
    @State private var unit: FoodUnit
    @State private var amountMode: PortionAmountMode
    @State private var servingCount: String
    @State private var calories: String
    @State private var protein: String
    @State private var carbs: String
    @State private var fat: String
    @State private var fiber: String
    @State private var sugar: String
    @State private var sodium: String
    @State private var confirmDelete = false
    @State private var savedFavorite = false

    init(product: FoodProduct, preset: FoodPortion? = nil, presetName: String? = nil, date: Date = .now,
         editing: MealEntry? = nil, slot: MealSlot = .suggested(at: .now), source: MealSource = .database,
         sourceDescription: String? = nil, note: String? = nil,
         onPick: ((MealEntry) -> Void)? = nil, onSaved: @escaping () -> Void = {}) {
        self.product = product; self.editing = editing; self.onSaved = onSaved; self.onPick = onPick; self.entryDate = FoodInput.entryDate(on: date)
        self.source = source; self.sourceDescription = sourceDescription; self.note = note
        _slot = State(initialValue: editing?.slot ?? slot)
        let portion = editing?.foodPortion ?? preset
        let nutrients = portion?.nutrientsPer100 ?? product.nutrients
        let knownServing = portion?.servingAmount.flatMap { $0.isFinite && $0 > 0 ? $0 : nil }
        servingAmount = knownServing
        servingLabel = portion?.servingLabel
        _name = State(initialValue: editing?.name ?? presetName ?? product.name)
        _amount = State(initialValue: FoodInput.text(portion?.amount ?? 100))
        _unit = State(initialValue: portion?.unit ?? product.unit)
        _amountMode = State(initialValue: knownServing == nil ? .exact : .serving)
        _servingCount = State(initialValue: FoodInput.text(knownServing.map { (portion?.amount ?? $0) / $0 } ?? 1))
        _calories = State(initialValue: FoodInput.text(nutrients.calories))
        _protein = State(initialValue: FoodInput.text(nutrients.protein))
        _carbs = State(initialValue: FoodInput.text(nutrients.carbs))
        _fat = State(initialValue: FoodInput.text(nutrients.fat))
        _fiber = State(initialValue: FoodInput.text(nutrients.fiber))
        _sugar = State(initialValue: FoodInput.text(nutrients.sugar))
        _sodium = State(initialValue: FoodInput.text(nutrients.sodium))
    }
    private var consumedAmount: Double? {
        switch amountMode {
        case .serving:
            guard let servingAmount, let count = FoodInput.number(servingCount) else { return nil }
            return servingAmount * count
        case .exact:
            return FoodInput.number(amount)
        }
    }
    private var portion: FoodPortion? {
        guard let consumedAmount, consumedAmount > 0 else { return nil }
        return FoodPortion(product: product, amount: consumedAmount, unit: unit,
            nutrientsPer100: FoodNutrients(calories: FoodInput.number(calories), protein: FoodInput.number(protein),
                                          carbs: FoodInput.number(carbs), fat: FoodInput.number(fat),
                                          fiber: FoodInput.number(fiber), sugar: FoodInput.number(sugar), sodium: FoodInput.number(sodium)),
            servingAmount: servingAmount, servingLabel: servingLabel)
    }
    private var entry: MealEntry? {
        var result = portion?.meal(name: name, id: editing?.id ?? UUID(), date: editing?.date ?? entryDate)
        result?.slot = slot
        result?.source = editing?.source ?? source
        result?.aiNote = editing?.aiNote ?? note
        return result
    }
    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: name, subtitle: sourceDescription ?? (product.brand.isEmpty ? "Open Food Facts · Check the package" : product.brand))
                VStack(alignment: .leading, spacing: 10) {
                    Text("Nutrition per 100 \(unit.rawValue)")
                        .font(.system(size: 19, weight: .semibold))
                    NutritionFactsView(values: nutritionValues)
                }
                ErrdayCard {
                    if let servingAmount {
                        Picker("Portion type", selection: $amountMode) {
                            Text("Serving").tag(PortionAmountMode.serving)
                            Text(unit.rawValue).tag(PortionAmountMode.exact)
                        }
                        .pickerStyle(.segmented)

                        if amountMode == .serving {
                            FoodNumberField(label: "Servings", unit: "× \(servingAmount.decimal) \(unit.rawValue)", value: $servingCount)
                            if let servingLabel, !servingLabel.isEmpty {
                                Text(servingLabel).font(.caption).foregroundStyle(ErrdayTheme.secondary)
                            }
                        } else {
                            FoodNumberField(label: "Amount", unit: unit.rawValue, value: $amount)
                        }
                    } else {
                        FoodNumberField(label: "Amount", unit: unit.rawValue, value: $amount)
                        Text("No reliable serving size was found. Enter the amount shown on the package.")
                            .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    }
                }
                VStack(alignment: .leading, spacing: 10) {
                    Text("Your portion")
                        .font(.system(size: 19, weight: .semibold))
                    if let entry {
                        Text(portionSummary(entry))
                            .font(.caption)
                            .foregroundStyle(ErrdayTheme.secondary)
                        NutritionFactsView(values: NutritionMetricValues(
                            calories: entry.calories,
                            protein: entry.protein,
                            carbs: entry.carbs,
                            fat: entry.fat,
                            fiber: entry.fiber,
                            sugar: entry.sugar,
                            sodium: entry.sodium
                        ))
                    } else {
                        Text("Add missing nutrition and an amount greater than zero.")
                            .font(.subheadline)
                            .foregroundStyle(ErrdayTheme.secondary)
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .errdaySurface()
                    }
                }
                if editing == nil {
                    SuccessActionButton(
                        title: "Add Food",
                        successTitle: "Food added",
                        isEnabled: entry != nil,
                        action: save,
                        onCompletion: finishSaving
                    )
                }
                ErrdayCard {
                    DisclosureGroup("Correct name & nutrition") {
                        VStack(spacing: 16) {
                            ErrdayTextField(label: "Food name", placeholder: "Product name", text: $name)
                            FoodNumberField(label: "Calories", unit: "kcal", value: $calories)
                            FoodNumberField(label: "Protein", unit: "g", value: $protein)
                            FoodNumberField(label: "Carbs", unit: "g", value: $carbs)
                            FoodNumberField(label: "Fat", unit: "g", value: $fat)
                            FoodNumberField(label: "Fiber", unit: "g", value: $fiber)
                            FoodNumberField(label: "Sugar", unit: "g", value: $sugar)
                            FoodNumberField(label: "Sodium", unit: "mg", value: $sodium)
                            Text("Per 100 \(unit.rawValue). Missing values are unknown, not zero. Check whether the package uses g or ml; the app does not convert density.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                        }.padding(.top, 12)
                    }
                    Button(savedFavorite ? "Food saved" : "Save Food", systemImage: "bookmark") {
                        guard let entry else { return }
                        savedFavorite = records.update { data in
                            var saved = data.savedFoods ?? []; saved.removeAll { $0.foodPortion?.product.id == product.id }; saved.append(entry); data.savedFoods = saved
                        }
                    }.disabled(entry == nil)
                }
                if sourceDescription == nil { DisclosureGroup("Source & product data") {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(product.retailers, id: \.self) { retailer in Text(retailer.title + (product.retailerEvidence?[retailer.rawValue] == "brand" ? ": matched by brand" : ": retailer from Open Food Facts")) }
                        if let url = product.sourceURL { Link("View on Open Food Facts", destination: url) }
                        Text("Barcode: \(product.id)")
                        if let updated = product.sourceUpdatedAt { Text("Source data from \(updated.formatted(date: .abbreviated, time: .omitted))") }
                        Link("Data licence: ODbL 1.0", destination: URL(string: "https://opendatacommons.org/licenses/odbl/1-0/")!)
                    }.font(.footnote).foregroundStyle(ErrdayTheme.secondary).padding(.top, 12)
                }.font(.subheadline) }
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
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .confirmationDialog("Delete this entry?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    if let editing, records.deleteMeal(editing.id) { dismiss() }
                }
            }
            .onChange(of: amountMode) { _, mode in
                guard let servingAmount else { return }
                if mode == .serving, let exact = FoodInput.number(amount) {
                    servingCount = FoodInput.text(exact / servingAmount)
                } else if mode == .exact, let count = FoodInput.number(servingCount) {
                    amount = FoodInput.text(count * servingAmount)
                }
            }
        }
    }
    private var nutritionValues: NutritionMetricValues {
        NutritionMetricValues(
            calories: FoodInput.number(calories),
            protein: FoodInput.number(protein),
            carbs: FoodInput.number(carbs),
            fat: FoodInput.number(fat),
            fiber: FoodInput.number(fiber),
            sugar: FoodInput.number(sugar),
            sodium: FoodInput.number(sodium)
        )
    }
    private func portionSummary(_ entry: MealEntry) -> String {
        let exact = consumedAmount?.formatted(.number.precision(.fractionLength(0...2))) ?? "—"
        if amountMode == .serving, let count = FoodInput.number(servingCount) {
            let word = abs(count - 1) < 0.0001 ? "serving" : "servings"
            return "Your portion · \(count.formatted(.number.precision(.fractionLength(0...2)))) \(word) · \(exact) \(unit.rawValue) · \(entry.calories.whole) kcal"
        }
        return "Your portion · \(exact) \(unit.rawValue) · \(entry.calories.whole) kcal"
    }
    private func save() -> Bool {
        guard let entry else { return false }
        if let onPick {
            onPick(entry)
            return true
        }
        return records.saveMeal(entry)
    }
    private func finishSaving() {
        dismiss()
        onSaved()
    }
}

enum FoodInput {
    static func entryDate(on day: Date) -> Date {
        let calendar = Calendar.current
        if calendar.isDateInToday(day) { return .now }
        return calendar.date(bySettingHour: 12, minute: 0, second: 0, of: day) ?? day
    }
    static func number(_ text: String) -> Double? {
        guard let value = Double(text.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: ".")),
              value.isFinite, value >= 0 else { return nil }
        return value
    }
    static func text(_ number: Double?) -> String {
        guard let number else { return "" }
        return number.formatted(.number.grouping(.never).precision(.fractionLength(0...3)))
    }
}

struct FoodNumberField: View {
    let label: String
    let unit: String
    @Binding var value: String
    var body: some View {
        ErrdayTextField(label: label, placeholder: "—", unit: unit, keyboard: .decimalPad, text: $value)
    }
}
