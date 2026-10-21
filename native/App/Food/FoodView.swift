import SwiftUI
import ErrdayCore

struct FoodView: View {
    @Binding var selectedDate: Date
    @Environment(PersonalStore.self) private var records
    @State private var sheet: FoodSheet?
    @State private var library = 0
    private enum FoodSheet: Identifiable {
        case add, search, photo, scan, water, edit(MealEntry), reuse(MealEntry), recipe, savedRecipe(SavedMeal)
        var id: String { switch self { case .add: "add"; case .search: "search"; case .photo: "photo"; case .scan: "scan"; case .water: "water"; case .recipe: "recipe"; case .savedRecipe(let m): "recipe"+m.id.uuidString; case .edit(let m): "edit"+m.id.uuidString; case .reuse(let m): "reuse"+m.id.uuidString } }
    }
    private var libraryFoods: [MealEntry] {
        if library == 1 { return records.data.savedFoods ?? [] }
        var seen = Set<String>()
        return records.data.meals.sorted { $0.date > $1.date }.filter { seen.insert($0.foodPortion?.product.id ?? $0.name.lowercased()).inserted }.prefix(12).map { $0 }
    }
    private var selectedMeals: [MealEntry] { records.meals(on: selectedDate) }
    var body: some View {
        ErrdayPage {
            PageHeading(title: "Food", subtitle: selectedDate.formatted(.dateTime.locale(Locale(identifier: "en_GB")).weekday(.wide).day().month(.wide).year()))
            FoodOverviewCarousel(date: selectedDate, onLogWater: { sheet = .water }, onLogWeight: nil, onOpenDay: nil)
            VStack(spacing: 8) {
                Button { sheet = .search } label: { HStack(spacing: 10) { FigmaIcon(asset: "96c83"); Text("Search foods or products").font(.system(size: 13)); Spacer() }.foregroundStyle(ErrdayTheme.secondary).padding(14).errdaySurface() }
                HStack(spacing: 8) {
                    Button { sheet = .add } label: { HStack { Image(systemName: "plus"); Text("Add Food") } }.buttonStyle(PrimaryButtonStyle())
                    Button { sheet = .photo } label: { HStack { Image(systemName: "camera.viewfinder"); Text("Scan Food") } }.buttonStyle(PrimaryButtonStyle(secondary: true))
                }
            }
            VStack(spacing: 12) {
                SectionHeading(title: "Recently added")
                if selectedMeals.isEmpty {
                    ErrdayCard { EmptySection(title: "Nothing added yet", symbol: "fork.knife", message: "Your tracked foods will appear here without meal categories.") }
                }
                ForEach(selectedMeals) { meal in
                    DeleteSwipeRow(onTap: { sheet = .edit(meal) }, onDelete: { _ = records.deleteMeal(meal.id) }) {
                        RecentFoodCard(meal: meal)
                    }
                }
            }
            VStack(spacing: 12) {
                FoodLibraryTabs(selection: $library)
                if library == 2 {
                    ForEach(records.data.savedMeals ?? []) { meal in Button { sheet = .savedRecipe(meal) } label: { ErrdayCard { Text(meal.name); Text("\(meal.ingredients.count) ingredients · \(meal.calories.whole) kcal").font(.caption).foregroundStyle(ErrdayTheme.secondary) } }.buttonStyle(.plain) }
                    Button("Create Meal", systemImage: "plus") { sheet = .recipe }.buttonStyle(PrimaryButtonStyle(secondary: true))
                } else if libraryFoods.isEmpty {
                    ErrdayCard { EmptySection(title: "No foods yet", symbol: "bookmark", message: library == 1 ? "Save products you use often from the portion view." : "Your recently tracked foods will appear here.") }
                } else {
                    ErrdayCard { ForEach(libraryFoods) { meal in
                        Button { sheet = .reuse(meal) } label: { FoodMealRow(meal: meal) }.buttonStyle(.plain)
                        if meal.id != libraryFoods.last?.id { Divider() }
                    } }
                }
            }
        }
        .sheet(item: $sheet) { item in
            switch item {
            case .add: AddFoodView(date: selectedDate)
            case .search: FoodSearchView(date: selectedDate)
            case .photo: FoodPhotoScanView(date: selectedDate)
            case .scan: BarcodeFoodView(date: selectedDate)
            case .water: WaterLogSheet(date: selectedDate)
            case .edit(let meal): MealEditDestination(meal: meal, date: selectedDate)
            case .reuse(let meal): MealEditDestination(meal: meal, reuse: true, date: selectedDate)
            case .recipe: RecipeEditor()
            case .savedRecipe(let meal): RecipeDetail(meal: meal, date: selectedDate)
            }
        }
    }
}
struct RecentFoodCard: View {
    let meal: MealEntry
    var body: some View {
        ErrdayCard {
            HStack { Text(meal.name).font(.system(size: 15, weight: .semibold)).lineLimit(1); Spacer(); Text(meal.date, style: .time).font(.caption).foregroundStyle(ErrdayTheme.secondary) }
            HStack(alignment: .firstTextBaseline, spacing: 5) { Text(meal.calories.whole).font(.system(size: 22, weight: .semibold)); Text("Calories consumed").font(.caption).foregroundStyle(ErrdayTheme.secondary) }
            Text("Protein \(meal.protein.whole)g  ·  Carbs \(meal.carbs.whole)g  ·  Fat \(meal.fat.whole)g").font(.caption).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}
struct MealSlotPicker: View {
    @Binding var slot: MealSlot
    var body: some View { Picker("Meal", selection: $slot) { ForEach(MealSlot.allCases, id: \.self) { Text($0.title).tag($0) } } }
}
struct FoodMealRow: View {
    let meal: MealEntry
    var body: some View {
        HStack(spacing: 12) {
            FigmaIcon(asset: "b9574")
            VStack(alignment: .leading, spacing: 5) {
                Text("\(meal.name) · \(meal.calories.whole) kcal").font(.system(size: 14))
                Text(meal.foodPortion.map { "\($0.amount.decimal) \($0.unit.rawValue) · \(meal.protein.decimal) g protein" } ?? "\(meal.protein.decimal) g protein · one portion").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            }; Spacer(minLength: 0)
        }.padding(.vertical, 6).frame(maxWidth: .infinity, alignment: .leading)
    }
}
struct MealEditDestination: View {
    let meal: MealEntry
    var reuse = false
    var date: Date = .now
    var body: some View {
        if !reuse { NutritionDetailView(meal: meal) }
        else if let portion = meal.foodPortion { FoodPortionEditor(product: portion.product, preset: portion, presetName: meal.name, date: date) }
        else { MealEditor(preset: meal, date: date) }
    }
}
struct MealLogView: View {
    @Environment(PersonalStore.self) private var records
    let slot: MealSlot
    @State private var add = false
    @State private var editing: MealEntry?
    var body: some View {
        ErrdayPage {
            PageHeading(title: slot.title)
            let meals = records.todayMeals.filter { ($0.slot ?? .suggested(at: $0.date)) == slot }
            if meals.isEmpty { ErrdayCard { Text("Nothing tracked yet").foregroundStyle(ErrdayTheme.secondary) } }
            ForEach(meals) { meal in Button { editing = meal } label: { ErrdayCard { FoodMealRow(meal: meal) } }.buttonStyle(.plain) }
            Button("Add Food", systemImage: "plus") { add = true }.buttonStyle(PrimaryButtonStyle())
        }.sheet(isPresented: $add) { AddFoodView(initialSlot: slot) }.sheet(item: $editing) { MealEditDestination(meal: $0) }
    }
}
struct AddFoodView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var slot: MealSlot
    @State private var destination: Int?
    let date: Date
    init(date: Date = .now, initialSlot: MealSlot = .suggested(at: .now)) { self.date = date; _slot = State(initialValue: initialSlot) }
    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: "Add food", subtitle: "Search, scan or enter it yourself.")
                ErrdayCard {
                    option("Food Database", icon: "93416", value: 0)
                    Divider(); option("Scan Food", symbol: "camera.viewfinder", value: 1)
                    Divider(); option("Scan barcode", icon: "97b8f", value: 2)
                    Divider(); option("Saved foods", icon: "6101e", value: 3)
                    Divider(); option("My meals", icon: "46045", value: 4)
                    Divider(); option("Custom food", icon: "2a613", value: 5)
                }
            }.toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .sheet(isPresented: Binding(get: { destination != nil }, set: { if !$0 { destination = nil } })) {
                switch destination {
                case 0: FoodSearchView(date: date, slot: slot)
                case 1: FoodPhotoScanView(slot: slot, date: date)
                case 2: BarcodeFoodView(slot: slot, date: date)
                case 3: SavedFoodLibrary(slot: slot, date: date)
                case 4: SavedRecipeLibrary(slot: slot, date: date)
                default: MealEditor(date: date, slot: slot)
                }
            }
        }
    }
    private func option(_ title: String, icon: String, value: Int) -> some View {
        Button { destination = value } label: { HStack(spacing: 12) { FigmaIcon(asset: icon); Text(title); Spacer(); Image(systemName: "chevron.right").font(.caption) }.font(.system(size: 14)).foregroundStyle(ErrdayTheme.text).frame(minHeight: 44) }
    }
    private func option(_ title: String, symbol: String, value: Int) -> some View {
        Button { destination = value } label: { HStack(spacing: 12) { Image(systemName: symbol).foregroundStyle(ErrdayTheme.foodAccent).frame(width: 24); Text(title); Spacer(); Image(systemName: "chevron.right").font(.caption) }.font(.system(size: 14)).foregroundStyle(ErrdayTheme.text).frame(minHeight: 44) }
    }
}
