import Foundation
import Testing
@testable import ErrdayCore

@Test func aliasBarcodeSearchReturnsCanonicalProduct() {
    var product = FoodProduct(id: "123", name: "Müesli", nutrients: .init(calories: 350), retailers: [.coop])
    product.barcodeAliases = ["987654321"]
    #expect(FoodCatalogIndex(products: [product]).search("987654321", retailer: .coop).first?.id == "123")
}
@Test func savedMealScalesAndRejectsInvalidPortions() throws {
    let recipe = SavedMeal(name: "Bowl", ingredients: [MealEntry(name: "A", calories: 100, protein: 5, carbs: 10, fat: 2), MealEntry(name: "B", calories: 200, protein: 10, carbs: 20, fat: 4)])
    let entry = try #require(recipe.portion(0.5, slot: .breakfast))
    #expect(entry.calories == 150 && entry.protein == 7.5 && entry.carbs == 15 && entry.fat == 3)
    #expect(entry.slot == .breakfast)
    #expect(recipe.portion(0, slot: .dinner) == nil)
    #expect(recipe.portion(.infinity, slot: .dinner) == nil)
}

@Test func savedMealUsesTheSelectedTrackingDate() throws {
    let selectedDate = Date(timeIntervalSince1970: 1_760_000_000)
    let recipe = SavedMeal(name: "Bowl", ingredients: [MealEntry(name: "Rice", calories: 100, protein: 3, carbs: 20, fat: 1)])
    let entry = try #require(recipe.portion(1, slot: .lunch, date: selectedDate))
    #expect(entry.date == selectedDate)
}
@Test func trainingRotationAdvancesOnlyForMatchingTemplate() {
    var plan = TrainingProgram(); plan.templates = [Workout(name: "Push", exercises: [Exercise(name: "Press")]), Workout(name: "Pull", exercises: [Exercise(name: "Row")])]
    let first = plan.next!
    let active = first.start()
    #expect(active.templateID == first.id && active.id != first.id)
    #expect(active.exercises[0].sets[0].id != first.exercises[0].sets[0].id)
    plan.advance(after: UUID()); #expect(plan.next?.id == first.id)
    plan.advance(after: active.templateID); #expect(plan.next?.name == "Pull")
    plan.advance(after: plan.next?.id); #expect(plan.next?.id == first.id)
}
@Test func anyProgramSessionCanStartWithoutFollowingNext() throws {
    var plan = TrainingProgram()
    plan.templates = [Workout(name: "Push", exercises: [Exercise(name: "Press")]),
                      Workout(name: "Legs", exercises: [Exercise(name: "Squat")])]
    plan.nextTemplateID = plan.templates[0].id
    let chosen = plan.templates[1]
    let active = chosen.start()
    #expect(active.name == "Legs")
    #expect(active.templateID == chosen.id)
    #expect(active.id != chosen.id)
    plan.advance(after: active.templateID)
    #expect(plan.next?.name == "Push")
}
@Test func preferredPPLUpperLowerProgramContainsTheRequestedRotation() throws {
    let plan = TrainingProgram.pplUpperLower()
    #expect(plan.name == "PPL · Upper · Lower")
    #expect(plan.templates.map(\.name) == ["Push", "Pull", "Legs", "Upper", "Lower"])
    #expect(plan.next?.name == "Push")
    #expect(plan.templates[0].exercises.map(\.name).contains("Cable High-to-Low Fly"))
    #expect(plan.templates[1].exercises.map(\.name).contains("Cable Straight Back Seated Row"))
    #expect(plan.templates[2].exercises.map(\.name) == plan.templates[4].exercises.map(\.name))
    #expect(plan.templates[2].exercises.last?.primaryMuscle == "Adductors")
    #expect(plan.templates[3].exercises.flatMap(\.sets).count == 19)
    #expect(Set(plan.templates.map(\.id)).count == 5)
}
@Test func originalPersonalDataMigratesWithoutDroppingMeals() throws {
    let meal = MealEntry(name: "Reis", calories: 130, protein: 3, carbs: 28, fat: 0)
    var data = PersonalData(); data.meals = [meal]
    let encoded = try JSONEncoder().encode(data)
    var json = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
    for key in ["profile", "program", "savedMeals", "savedFoods", "restEndsAt", "restTimerDurationSeconds", "restTimerPausedSeconds", "workoutStopwatchStartedAt", "workoutStopwatchElapsedSeconds", "carbsGoal", "fatGoal"] { json.removeValue(forKey: key) }
    let restored = try JSONDecoder().decode(PersonalData.self, from: JSONSerialization.data(withJSONObject: json))
    #expect(restored.meals == [meal]); #expect(restored.profile == nil)
    #expect(restored.restTimerDurationSeconds == nil)
    #expect(restored.workoutStopwatchStartedAt == nil)
}
@Test func newFeaturesPersistAcrossReload() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: directory) }
    let repository = PersonalRepository(directory: directory, userID: UUID())
    var state = PersonalData(); state.profile = PersonalProfile(); state.profile?.name = "Test"; state.program = TrainingProgram()
    state.profile?.prefersLactoseFree = true
    state.profile?.preferredRetailers = ["Coop", "Migros"]
    state.profile?.foodPreferenceNotes = "Quick meals with varied suggestions"
    state.program?.templates = [Workout(name: "Upper", exercises: [Exercise(name: "Row")])]
    let meal = MealEntry(name: "Reis", calories: 130, protein: 3, carbs: 28, fat: 0)
    state.savedFoods = [meal]; state.savedMeals = [SavedMeal(name: "Reisgericht", ingredients: [meal])]; state.restEndsAt = Date(timeIntervalSince1970: 1000)
    state.restTimerDurationSeconds = 120
    state.restTimerPausedSeconds = 54.5
    state.workoutStopwatchStartedAt = Date(timeIntervalSince1970: 900)
    state.workoutStopwatchElapsedSeconds = 12.34
    try repository.save(state); #expect(try repository.load() == state)
}

@Test func workoutSetTypesAndNotesPersistWithoutBreakingOlderWorkouts() throws {
    var workout = Workout(name: "Upper", exercises: [Exercise(name: "Bench Press")])
    workout.exercises[0].notes = "Keep shoulders down"
    workout.exercises[0].restSeconds = 180
    workout.exercises[0].warmupRestSeconds = 75
    workout.exercises[0].imageURL = URL(string: "https://example.com/bench.png")
    workout.exercises[0].catalogueSourceID = 42
    workout.exercises[0].sets[0].type = .warmup
    let encoded = try JSONEncoder().encode(workout)
    #expect(try JSONDecoder().decode(Workout.self, from: encoded) == workout)

    var json = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
    var exercises = try #require(json["exercises"] as? [[String: Any]])
    exercises[0].removeValue(forKey: "notes")
    exercises[0].removeValue(forKey: "warmupRestSeconds")
    exercises[0].removeValue(forKey: "imageURL")
    exercises[0].removeValue(forKey: "catalogueSourceID")
    var sets = try #require(exercises[0]["sets"] as? [[String: Any]])
    sets[0].removeValue(forKey: "type")
    exercises[0]["sets"] = sets
    json["exercises"] = exercises
    let oldWorkout = try JSONDecoder().decode(Workout.self, from: JSONSerialization.data(withJSONObject: json))
    #expect(oldWorkout.exercises[0].notes == nil)
    #expect(oldWorkout.exercises[0].warmupRestSeconds == nil)
    #expect(oldWorkout.exercises[0].imageURL == nil)
    #expect(oldWorkout.exercises[0].sets[0].effectiveType == .normal)
}

@Test func hydrationAndOptionalMicronutrientsPersistWithoutInventingMissingValues() throws {
    var meal = MealEntry(name: "Bowl", calories: 500, protein: 30, carbs: 60, fat: 15, fiber: 9, sugar: nil, sodium: 640)
    #expect(meal.isValid)
    var data = PersonalData()
    data.meals = [meal]
    data.hydration = [HydrationEntry(date: .now, millilitres: 350)]
    let weighedAt = Date(timeIntervalSince1970: 1_760_000_000)
    data.weightEntries = [WeightEntry(date: weighedAt, kilograms: 80.5)]
    data.dailyChecklistStartedAt = weighedAt
    data.dailyChecklist = [DailyChecklistEntry(date: weighedAt, completed: [.creatine, .magnesium],
                                               completedAt: [.creatine: weighedAt])]
    data.hydrationGoalMillilitres = 3_500
    data.weightGoalKilograms = 90
    let restored = try JSONDecoder().decode(PersonalData.self, from: JSONEncoder().encode(data))
    #expect(restored.meals[0].fiber == 9)
    #expect(restored.meals[0].sugar == nil)
    #expect(restored.hydration(on: .now).first?.millilitres == 350)
    #expect(restored.weightEntries?.first?.date == weighedAt)
    #expect(restored.weightEntries?.first?.kilograms == 80.5)
    #expect(restored.checklist(on: weighedAt)?.completed == [.creatine, .magnesium])
    #expect(restored.checklist(on: weighedAt)?.completedAt?[.creatine] == weighedAt)
    #expect(restored.dailyChecklistStartedAt == weighedAt)
    #expect(restored.hydrationGoalMillilitres == 3_500)
    #expect(restored.weightGoalKilograms == 90)
    #expect(DailyChecklistItem.supplementItems == [.creatine, .multivitamin, .omega3, .magnesium])

    meal.fiber = -.infinity
    #expect(!meal.isValid)
    #expect(!HydrationEntry(millilitres: 0).isValid)
    #expect(!WeightEntry(kilograms: 0).isValid)
}

@Test func muscleGainEstimateUsesProfileInputsAndConservesCalories() throws {
    let result = try #require(NutritionEstimate.muscleGain(age: 25, heightCM: 180, weightKG: 80,
                                                           metabolicReference: "male", activityLevel: "active"))
    #expect(result.targetCalories > result.maintenanceCalories)
    #expect(abs(result.protein - 160) < 0.01)
    #expect(abs(result.fat - 80) < 0.01)
    #expect(abs(result.protein * 4 + result.carbs * 4 + result.fat * 9 - result.targetCalories) < 0.01)
    #expect(result.surplusCalories > 0)
    #expect(result.fiber > 0)
    #expect(result.sodiumLimit == 2_000)
    #expect(NutritionEstimate.muscleGain(age: 14, heightCM: 180, weightKG: 80, metabolicReference: "male", activityLevel: "active") == nil)
}

@Test func muscleGainPlanUsesStepsTrainingAndCapsAggressiveSurplus() throws {
    let moderate = try #require(NutritionEstimate.muscleGain(
        age: 25, heightCM: 180, weightKG: 80, metabolicReference: "male", activityLevel: "sedentary",
        weeklyGainKG: 0.3, trainingDaysPerWeek: 4, usualDailySteps: 9_000
    ))
    let aggressive = try #require(NutritionEstimate.muscleGain(
        age: 25, heightCM: 180, weightKG: 80, metabolicReference: "male", activityLevel: "sedentary",
        weeklyGainKG: 1, trainingDaysPerWeek: 4, usualDailySteps: 9_000
    ))
    #expect(NutritionEstimate.resolvedActivityLevel(fallback: "sedentary", trainingDaysPerWeek: 4, usualDailySteps: 9_000) == "active")
    #expect(moderate.maintenanceCalories > moderate.restingCalories)
    #expect(aggressive.targetCalories <= aggressive.maintenanceCalories * 1.200_001)
    #expect(abs(moderate.protein * 4 + moderate.carbs * 4 + moderate.fat * 9 - moderate.targetCalories) < 0.01)
}
