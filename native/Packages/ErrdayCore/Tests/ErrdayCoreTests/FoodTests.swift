import Foundation
import Testing
@testable import ErrdayCore

private func product(_ id: String = "7610000000001", name: String = "Haferflocken", retailers: [FoodRetailer] = [.coop]) -> FoodProduct {
    FoodProduct(id: id, name: name, brand: "Testmarke", nutrients: FoodNutrients(calories: 370, protein: 13, carbs: 60, fat: 7), retailers: retailers)
}

@Test func portionsScaleEveryNutrientAndKeepSourceSnapshot() throws {
    let original = product()
    let portion = FoodPortion(product: original, amount: 75, unit: .g, nutrientsPer100: original.nutrients)
    let meal = try #require(portion.meal(name: "Frühstück"))
    #expect(meal.calories == 277.5)
    #expect(meal.protein == 9.75)
    #expect(meal.carbs == 45)
    #expect(meal.fat == 5.25)
    #expect(meal.foodPortion?.product == original)
    #expect(try JSONDecoder().decode(MealEntry.self, from: JSONEncoder().encode(meal)) == meal)
}

@Test func missingNutrientsBlockSavingButActualZeroDoesNot() {
    let p = product()
    var values = p.nutrients; values.protein = nil
    var portion = FoodPortion(product: p, amount: 100, unit: .g, nutrientsPer100: values)
    #expect(portion.meal(name: "Test") == nil)
    portion.nutrientsPer100.protein = 0
    #expect(portion.meal(name: "Test")?.protein == 0)
    portion.amount = 0
    #expect(portion.meal(name: "Test") == nil)
    portion.amount = .infinity
    #expect(portion.meal(name: "Test") == nil)
    portion.amount = 100; portion.nutrientsPer100.fat = -1
    #expect(portion.meal(name: "Test") == nil)
}

@Test func correctionDoesNotMutateCatalogueOrOtherPortions() {
    let p = product()
    var portion = FoodPortion(product: p, amount: 200, unit: .g, nutrientsPer100: p.nutrients)
    portion.nutrientsPer100.calories = 100
    #expect(portion.isCorrected)
    #expect(portion.meal(name: "Test")?.calories == 200)
    #expect(portion.product.nutrients.calories == 370)
}

@Test func millilitresUseTheSameHundredUnitBasis() {
    let p = product()
    let portion = FoodPortion(product: p, amount: 250, unit: .ml,
                              nutrientsPer100: FoodNutrients(calories: 40, protein: 0, carbs: 10, fat: 0))
    #expect(portion.meal(name: "Saft")?.calories == 100)
    #expect(portion.meal(name: "Saft")?.foodPortion?.unit == .ml)
}

@Test func knownServingMetadataSurvivesScalingAndPersistence() throws {
    let p = product()
    let portion = FoodPortion(product: p, amount: 165, unit: .ml,
                              nutrientsPer100: FoodNutrients(calories: 64, protein: 10, carbs: 4.2, fat: 0.3),
                              servingAmount: 330, servingLabel: "1 bottle · 330 ml")
    let meal = try #require(portion.meal(name: "Protein drink"))
    #expect(meal.calories == 105.6)
    #expect(meal.protein == 16.5)
    #expect(meal.foodPortion?.servingAmount == 330)
    #expect(meal.ingredients?.first?.amount == "0.5 servings")
    let decoded = try JSONDecoder().decode(MealEntry.self, from: JSONEncoder().encode(meal))
    #expect(decoded.foodPortion?.servingLabel == "1 bottle · 330 ml")
}

@Test func searchMatchesAccentsAllWordsAndRetailerMetadata() {
    let coop = product(name: "Bio Müesli", retailers: [.coop])
    let migros = product("7610000000002", name: "Bio Müesli", retailers: [.migros])
    let shared = product("7610000000003", name: "Milch", retailers: [.coop, .migros])
    let index = FoodCatalogIndex(products: [coop, migros, shared])
    #expect(index.search("BIO muesli", retailer: .coop).map(\.id) == [coop.id])
    #expect(index.search("bio", retailer: .migros).map(\.id) == [migros.id])
    #expect(index.search("Testmarke milch", retailer: .coop).map(\.id) == [shared.id])
    #expect(index.search("reis", retailer: nil).isEmpty)
    #expect(index.search(shared.id, retailer: .migros).first?.id == shared.id)
    #expect(index.search("", retailer: nil, limit: 1).count == 1)
}

@Test func oldMealsWithoutProductMetadataRemainReadable() throws {
    let data = Data(#"{"id":"B73B8261-4967-461A-98AD-F855F389C401","date":0,"name":"Reis","calories":130,"protein":3,"carbs":28,"fat":0.3}"#.utf8)
    let meal = try JSONDecoder().decode(MealEntry.self, from: data)
    #expect(meal.name == "Reis")
    #expect(meal.foodPortion == nil)
}

@Test func persistedCorrectionsAreAccountScoped() throws {
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: dir) }
    let repository = PersonalRepository(directory: dir, userID: UUID())
    let p = product()
    var state = PersonalData()
    state.meals = [try #require(FoodPortion(product: p, amount: 150, unit: .g, nutrientsPer100: p.nutrients).meal(name: p.name))]
    try repository.save(state)
    #expect(try repository.load() == state)
    #expect(try PersonalRepository(directory: dir, userID: UUID()).load().meals.isEmpty)
}

@Test func bundledCatalogueHasValidUniqueProductsAndSearchableRetailers() throws {
    var directory = URL(fileURLWithPath: #filePath)
    for _ in 0..<5 { directory.deleteLastPathComponent() }
    let catalogue = try FoodCatalog.load(Data(contentsOf: directory.appendingPathComponent("App/Resources/food-catalog.json")))
    #expect(catalogue.source == "Open Food Facts")
    #expect(catalogue.products.count > 1000)
    #expect(Set(catalogue.products.map(\.id)).count == catalogue.products.count)
    let index = FoodCatalogIndex(products: catalogue.products)
    for retailer in FoodRetailer.allCases {
        let results = index.search("", retailer: retailer)
        #expect(!results.isEmpty)
        #expect(results.allSatisfy { $0.retailers.contains(retailer) })
    }
    for product in catalogue.products {
        #expect(!product.name.isEmpty && !product.retailers.isEmpty)
        #expect(product.id.allSatisfy { $0.isASCII && $0.isNumber })
        for value in [product.nutrients.calories, product.nutrients.protein, product.nutrients.carbs, product.nutrients.fat].compactMap({ $0 }) {
            #expect(value.isFinite && value >= 0)
        }
    }
}
