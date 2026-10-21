import Foundation

public enum FoodRetailer: String, Codable, CaseIterable, Sendable {
    case coop, migros, denner
    public var title: String { switch self { case .coop: "Coop"; case .migros: "Migros"; case .denner: "Denner" } }
}

public enum FoodUnit: String, Codable, CaseIterable, Sendable { case g, ml }

public struct FoodNutrients: Codable, Equatable, Sendable {
    public var calories: Double?
    public var protein: Double?
    public var carbs: Double?
    public var fat: Double?
    public var fiber: Double?
    public var sugar: Double?
    /// Milligrams per 100 g or 100 ml.
    public var sodium: Double?
    public init(calories: Double? = nil, protein: Double? = nil, carbs: Double? = nil, fat: Double? = nil,
                fiber: Double? = nil, sugar: Double? = nil, sodium: Double? = nil) {
        self.calories = calories; self.protein = protein; self.carbs = carbs; self.fat = fat
        self.fiber = fiber; self.sugar = sugar; self.sodium = sodium
    }
    public var isComplete: Bool {
        [calories, protein, carbs, fat].allSatisfy { value in
            guard let value else { return false }
            return value.isFinite && value >= 0
        }
    }
}

public struct FoodProduct: Codable, Identifiable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var barcodeAliases: [String]?
    public var brand: String
    public var nutrients: FoodNutrients
    public var unit: FoodUnit
    public var retailers: [FoodRetailer]
    public var retailerEvidence: [String: String]?
    public var sourceUpdatedAt: Date?
    public var fetchedAt: Date
    public var sourceURL: URL? { URL(string: "https://world.openfoodfacts.org/product/\(id)") }
    public init(id: String, name: String, brand: String = "", nutrients: FoodNutrients,
                unit: FoodUnit = .g, retailers: [FoodRetailer] = [], sourceUpdatedAt: Date? = nil, fetchedAt: Date = .now) {
        self.id = id; self.name = name; self.brand = brand; self.nutrients = nutrients
        self.unit = unit; self.retailers = retailers; self.sourceUpdatedAt = sourceUpdatedAt; self.fetchedAt = fetchedAt
    }
}

/// Snapshot: historical meals do not change when the remote catalogue changes.
public struct FoodPortion: Codable, Equatable, Sendable {
    public var product: FoodProduct
    public var amount: Double
    public var unit: FoodUnit
    public var nutrientsPer100: FoodNutrients
    /// Full product serving in the same unit as `unit`, when known.
    public var servingAmount: Double?
    public var servingLabel: String?
    public init(product: FoodProduct, amount: Double, unit: FoodUnit, nutrientsPer100: FoodNutrients,
                servingAmount: Double? = nil, servingLabel: String? = nil) {
        self.product = product; self.amount = amount; self.unit = unit; self.nutrientsPer100 = nutrientsPer100
        self.servingAmount = servingAmount; self.servingLabel = servingLabel
    }
    public var isCorrected: Bool { nutrientsPer100 != product.nutrients || unit != product.unit }
    public func meal(name: String, id: UUID = UUID(), date: Date = .now) -> MealEntry? {
        guard amount.isFinite, amount > 0, nutrientsPer100.isComplete,
              let kcal = nutrientsPer100.calories, let p = nutrientsPer100.protein,
              let c = nutrientsPer100.carbs, let f = nutrientsPer100.fat else { return nil }
        let scale = amount / 100
        var result = MealEntry(id: id, date: date, name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                               calories: kcal * scale, protein: p * scale, carbs: c * scale, fat: f * scale,
                               fiber: nutrientsPer100.fiber.map { $0 * scale },
                               sugar: nutrientsPer100.sugar.map { $0 * scale },
                               sodium: nutrientsPer100.sodium.map { $0 * scale })
        result.foodPortion = self
        result.source = .database
        let ingredientAmount: String
        if let servingAmount, servingAmount > 0 {
            let count = amount / servingAmount
            let word = abs(count - 1) < 0.0001 ? "serving" : "servings"
            ingredientAmount = "\(count.formatted(.number.precision(.fractionLength(0...2)))) \(word)"
        } else {
            ingredientAmount = "\(amount.formatted(.number.precision(.fractionLength(0...1)))) \(unit.rawValue)"
        }
        result.ingredients = [MealIngredient(name: result.name, amount: ingredientAmount,
                                                   calories: result.calories, protein: result.protein,
                                                   carbs: result.carbs, fat: result.fat)]
        return result.isValid ? result : nil
    }
}
