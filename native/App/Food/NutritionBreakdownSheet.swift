import ErrdayCore
import SwiftUI

enum NutritionBreakdownKind: String, Identifiable {
    case protein, carbs, fat, fiber, sugar, sodium

    var id: String { rawValue }

    var title: String {
        switch self {
        case .protein: "Protein"
        case .carbs: "Carbs"
        case .fat: "Fat"
        case .fiber: "Fiber"
        case .sugar: "Sugar"
        case .sodium: "Sodium"
        }
    }

    var symbol: String {
        switch self {
        case .protein: "fork.knife"
        case .carbs: "leaf.fill"
        case .fat: "drop.fill"
        case .fiber: "leaf"
        case .sugar: "cube.fill"
        case .sodium: "aqi.medium"
        }
    }

    var color: Color {
        switch self {
        case .protein: Color(hex: 0xef6671)
        case .carbs: Color(hex: 0xe59a55)
        case .fat: Color(hex: 0x4f8ce8)
        case .fiber: Color(hex: 0x5cab74)
        case .sugar: Color(hex: 0xd59636)
        case .sodium: Color(hex: 0x5c82d9)
        }
    }

    var unit: String { self == .sodium ? "mg" : "g" }
    var isLimit: Bool { self == .sugar || self == .sodium }
    var hasOptionalValues: Bool { self == .fiber || self == .sugar || self == .sodium }

    func amount(in meal: MealEntry) -> Double? {
        switch self {
        case .protein: meal.protein
        case .carbs: meal.carbs
        case .fat: meal.fat
        case .fiber: meal.fiber
        case .sugar: meal.sugar
        case .sodium: meal.sodium
        }
    }

    func goal(in data: PersonalData) -> Double? {
        switch self {
        case .protein: data.proteinGoal
        case .carbs: data.carbsGoal
        case .fat: data.fatGoal
        case .fiber: data.fiberGoal
        case .sugar: data.sugarGoal
        case .sodium: data.sodiumGoal
        }
    }
}

struct NutritionBreakdownSheet: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var sortOrder: SortOrder = .largest
    @State private var selectedMeal: MealEntry?

    let kind: NutritionBreakdownKind
    let date: Date

    private enum SortOrder { case largest, newest }

    private var meals: [MealEntry] { records.meals(on: date) }
    private var knownMeals: [MealEntry] { meals.filter { kind.amount(in: $0) != nil } }
    private var contributingMeals: [MealEntry] { meals.filter { (kind.amount(in: $0) ?? 0) > 0 } }
    private var total: Double? {
        if kind.hasOptionalValues && knownMeals.isEmpty { return nil }
        return knownMeals.reduce(0) { $0 + (kind.amount(in: $1) ?? 0) }
    }
    private var hasMissingValues: Bool { kind.hasOptionalValues && knownMeals.count < meals.count }
    private var goal: Double? { kind.goal(in: records.data) }
    private var sortedMeals: [MealEntry] {
        switch sortOrder {
        case .largest:
            contributingMeals.sorted { left, right in
                let leftAmount = kind.amount(in: left) ?? 0
                let rightAmount = kind.amount(in: right) ?? 0
                return leftAmount == rightAmount ? left.date > right.date : leftAmount > rightAmount
            }
        case .newest: contributingMeals.sorted { $0.date > $1.date }
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ErrdayCard {
                        Label(kind.title, systemImage: kind.symbol)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(kind.color)
                        HStack(alignment: .firstTextBaseline, spacing: 5) {
                            Text(total?.decimal ?? "—")
                                .font(.system(size: 36, weight: .semibold))
                                .contentTransition(.numericText())
                            Text("\(kind.unit) \(kind.hasOptionalValues ? "recorded" : "eaten")")
                                .font(.system(size: 14))
                                .foregroundStyle(ErrdayTheme.secondary)
                        }
                        if let total, let goal, goal > 0 {
                            ProgressView(value: min(total, goal), total: goal)
                                .tint(kind.color)
                            Text(goalSummary(total: total, goal: goal))
                                .font(.system(size: 12))
                                .foregroundStyle(ErrdayTheme.secondary)
                        } else if total == nil {
                            Text("No values recorded for this nutrient")
                                .font(.system(size: 12))
                                .foregroundStyle(ErrdayTheme.secondary)
                        } else {
                            Text(kind.isLimit ? "No daily limit set" : "No daily goal set")
                                .font(.system(size: 12))
                                .foregroundStyle(ErrdayTheme.secondary)
                        }
                        if hasMissingValues {
                            Text("Some logged foods have no \(kind.title.lowercased()) data, so this total may be incomplete.")
                                .font(.system(size: 12))
                                .foregroundStyle(ErrdayTheme.secondary)
                        }
                    }

                    if contributingMeals.isEmpty {
                        ErrdayCard {
                            EmptySection(title: "No \(kind.title.lowercased()) logged", symbol: kind.symbol,
                                         message: "Foods with \(kind.title.lowercased()) will appear here when you log them.")
                        }
                    } else {
                        ErrdayCard {
                            HStack {
                                Text("From your foods")
                                    .font(.system(size: 15, weight: .semibold))
                                Spacer()
                                if contributingMeals.count >= 5 {
                                    Menu {
                                        Button("Largest first") { sortOrder = .largest }
                                        Button("Newest first") { sortOrder = .newest }
                                    } label: {
                                        Label(sortOrder == .largest ? "Largest first" : "Newest first",
                                              systemImage: "arrow.up.arrow.down")
                                            .font(.system(size: 12))
                                            .foregroundStyle(ErrdayTheme.accent)
                                    }
                                }
                            }
                            ForEach(sortedMeals) { meal in
                                Button {
                                    selectedMeal = meal
                                    ErrdayHaptics.selection(isEnabled: hapticsEnabled)
                                } label: {
                                    HStack(alignment: .center, spacing: 10) {
                                        VStack(alignment: .leading, spacing: 3) {
                                            Text(meal.name)
                                                .font(.system(size: 14, weight: .medium))
                                                .lineLimit(2)
                                            Text(meal.date, style: .time)
                                                .font(.system(size: 11))
                                                .foregroundStyle(ErrdayTheme.secondary)
                                        }
                                        Spacer(minLength: 8)
                                        Text("\((kind.amount(in: meal) ?? 0).decimal) \(kind.unit)")
                                            .font(.system(size: 14, weight: .semibold))
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 10, weight: .semibold))
                                            .foregroundStyle(ErrdayTheme.secondary)
                                    }
                                    .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Open \(meal.name), \((kind.amount(in: meal) ?? 0).decimal) \(kind.unit) \(kind.title.lowercased())")
                                .accessibilityHint("View or edit this food")
                                if meal.id != sortedMeals.last?.id { Divider() }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .errdayBackground()
            .foregroundStyle(ErrdayTheme.text)
            .navigationTitle("\(kind.title) breakdown")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
        .sheet(item: $selectedMeal) { meal in
            NutritionDetailView(meal: meal)
        }
    }

    private func goalSummary(total: Double, goal: Double) -> String {
        let difference = abs(goal - total).decimal
        if kind.isLimit {
            return total > goal
                ? "\(difference) \(kind.unit) over your \(goal.decimal) \(kind.unit) daily limit"
                : hasMissingValues
                    ? "\(total.decimal) of \(goal.decimal) \(kind.unit) daily limit recorded"
                    : "\(difference) \(kind.unit) under your \(goal.decimal) \(kind.unit) daily limit"
        }
        return total > goal
            ? "\(difference) \(kind.unit) over your \(goal.decimal) \(kind.unit) goal"
            : "\(difference) \(kind.unit) left of your \(goal.decimal) \(kind.unit) goal"
    }
}
