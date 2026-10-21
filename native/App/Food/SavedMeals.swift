import SwiftUI
import ErrdayCore

struct RecipeEditor: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    let existing: SavedMeal?
    @State private var name: String
    @State private var ingredients: [MealEntry]
    @State private var adding = false
    @State private var editingIngredient: MealEntry?
    init(existing: SavedMeal? = nil) {
        self.existing = existing; _name = State(initialValue: existing?.name ?? ""); _ingredients = State(initialValue: existing?.ingredients ?? [])
    }
    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: existing == nil ? "Create Meal" : "Edit Meal", subtitle: "Save it for next time.")
                ErrdayCard { ErrdayTextField(label: "Meal name", placeholder: "For example: chicken rice bowl", text: $name) }
                ForEach(ingredients) { item in
                    ErrdayCard {
                        Button { editingIngredient = item } label: { FoodMealRow(meal: item) }.buttonStyle(.plain)
                        HStack {
                            Button("Move up", systemImage: "arrow.up") { move(item, by: -1) }.disabled(ingredients.first?.id == item.id)
                            Button("Move down", systemImage: "arrow.down") { move(item, by: 1) }.disabled(ingredients.last?.id == item.id)
                            Spacer()
                            Button("Remove", systemImage: "trash", role: .destructive) { ingredients.removeAll { $0.id == item.id } }.labelStyle(.iconOnly)
                        }.font(.caption)
                    }
                }
                Button { adding = true } label: { HStack { FigmaIcon(asset: "4c9bd"); Text("Add Ingredient") } }.buttonStyle(PrimaryButtonStyle(secondary: true))
                ErrdayCard {
                    Text("Full meal · \(ingredients.count) ingredients").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    Text("\(ingredients.reduce(0) { $0+$1.calories }.whole) kcal").font(.system(size: 28, weight: .semibold))
                    Text("\(ingredients.reduce(0) { $0+$1.protein }.decimal) g protein · \(ingredients.reduce(0) { $0+$1.carbs }.decimal) g carbs · \(ingredients.reduce(0) { $0+$1.fat }.decimal) g fat").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                }
                Button("Save Meal") {
                    var meal = SavedMeal(name: name.trimmingCharacters(in: .whitespacesAndNewlines), ingredients: ingredients)
                    if let existing { meal.id = existing.id }
                    if records.update({ data in var meals = data.savedMeals ?? []; meals.removeAll { $0.id == meal.id }; meals.append(meal); data.savedMeals = meals }) { dismiss() }
                }.buttonStyle(PrimaryButtonStyle()).disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || ingredients.isEmpty)
            }.toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
                .sheet(item: $editingIngredient) { item in
                    if let portion = item.foodPortion {
                        FoodPortionEditor(product: portion.product, editing: item, onPick: replaceIngredient)
                    } else { MealEditor(editing: item, onPick: replaceIngredient) }
                }
                .sheet(isPresented: $adding) { FoodSearchView(onPick: { var ingredient = $0; ingredient.id = UUID(); ingredients.append(ingredient); adding = false }) }
        }
    }
    private func replaceIngredient(_ item: MealEntry) {
        if let index = ingredients.firstIndex(where: { $0.id == item.id }) { ingredients[index] = item }
    }
    private func move(_ item: MealEntry, by offset: Int) {
        guard let index = ingredients.firstIndex(where: { $0.id == item.id }), ingredients.indices.contains(index+offset) else { return }
        ingredients.swapAt(index, index+offset)
    }
}
struct RecipeDetail: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    let meal: SavedMeal
    var date: Date = .now
    @State var slot: MealSlot = .suggested(at: .now)
    @State private var portions = "1"
    @State private var edit = false
    @State private var confirmDelete = false
    private var current: SavedMeal { records.data.savedMeals?.first { $0.id == meal.id } ?? meal }
    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: current.name, subtitle: "Saved meal")
                ErrdayCard { ForEach(current.ingredients) { FoodMealRow(meal: $0) } }
                ErrdayCard { FoodNumberField(label: "Portions", unit: "×", value: $portions) }
                let entry = current.portion(FoodInput.number(portions) ?? 0, slot: slot, date: FoodInput.entryDate(on: date))
                ErrdayCard { Text("\(entry?.calories.whole ?? "—") kcal").font(.system(size: 28, weight: .semibold)); Text("For your selected amount").font(.caption).foregroundStyle(ErrdayTheme.secondary) }
                Button("Add Meal") { if let entry, records.saveMeal(entry) { dismiss() } }.buttonStyle(PrimaryButtonStyle()).disabled(entry == nil)
                Button("Edit Recipe") { edit = true }.buttonStyle(PrimaryButtonStyle(secondary: true))
                Button("Delete Saved Meal", role: .destructive) { confirmDelete = true }
            }.toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
                .sheet(isPresented: $edit) { RecipeEditor(existing: current) }
                .confirmationDialog("Delete this meal? Logged entries will stay.", isPresented: $confirmDelete) {
                    Button("Delete", role: .destructive) { if records.update({ $0.savedMeals?.removeAll { $0.id == meal.id } }) { dismiss() } }
                }
        }
    }
}
struct SavedRecipeLibrary: View {
    @Environment(PersonalStore.self) private var records
    var slot: MealSlot
    var date: Date = .now
    @State private var selection: SavedMeal?
    @State private var create = false
    var body: some View {
        NavigationStack {
            List {
                ForEach(records.data.savedMeals ?? []) { meal in Button(meal.name) { selection = meal } }
                Button("Create Meal", systemImage: "plus") { create = true }
            }.navigationTitle("My Meals").sheet(item: $selection) { RecipeDetail(meal: $0, date: date, slot: slot) }.sheet(isPresented: $create) { RecipeEditor() }
        }
    }
}
struct SavedFoodLibrary: View {
    @Environment(PersonalStore.self) private var records
    var slot: MealSlot
    var date: Date = .now
    @State private var selection: MealEntry?
    var body: some View {
        NavigationStack {
            List {
                if (records.data.savedFoods ?? []).isEmpty { Text("Save a product from its portion view.").foregroundStyle(.secondary) }
                ForEach(records.data.savedFoods ?? []) { meal in Button { selection = meal } label: { FoodMealRow(meal: meal) }.buttonStyle(.plain) }
                    .onDelete { indices in records.update { $0.savedFoods?.remove(atOffsets: indices) } }
            }.navigationTitle("Saved Foods").sheet(item: $selection) { meal in
                if let portion = meal.foodPortion { FoodPortionEditor(product: portion.product, preset: portion, presetName: meal.name, date: date, slot: slot) }
                else { MealEditor(preset: meal, date: date, slot: slot) }
            }
        }
    }
}
