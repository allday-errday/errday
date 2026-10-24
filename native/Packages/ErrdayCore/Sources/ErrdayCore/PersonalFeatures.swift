import Foundation

public enum MealSlot: String, Codable, CaseIterable, Sendable {
    case breakfast, lunch, snacks, dinner
    public var title: String { switch self { case .breakfast: "Breakfast"; case .lunch: "Lunch"; case .snacks: "Snacks"; case .dinner: "Dinner" } }
    public static func suggested(at date: Date) -> Self {
        switch Calendar.current.component(.hour, from: date) { case 0..<11: .breakfast; case 11..<15: .lunch; case 15..<18: .snacks; default: .dinner }
    }
}
public struct SavedMeal: Codable, Identifiable, Equatable, Sendable {
    public var id = UUID()
    public var name: String
    public var ingredients: [MealEntry]
    public init(name: String, ingredients: [MealEntry]) { self.name = name; self.ingredients = ingredients }
    public var calories: Double { ingredients.reduce(0) { $0 + $1.calories } }
    public func portion(_ multiplier: Double, slot: MealSlot, date: Date = .now) -> MealEntry? {
        guard multiplier.isFinite, multiplier > 0, !ingredients.isEmpty, ingredients.allSatisfy(\.isValid) else { return nil }
        var entry = MealEntry(name: name, calories: calories * multiplier, protein: ingredients.reduce(0) { $0 + $1.protein } * multiplier,
                              carbs: ingredients.reduce(0) { $0 + $1.carbs } * multiplier, fat: ingredients.reduce(0) { $0 + $1.fat } * multiplier,
                              fiber: completeSum(ingredients.map(\.fiber)).map { $0 * multiplier },
                              sugar: completeSum(ingredients.map(\.sugar)).map { $0 * multiplier },
                              sodium: completeSum(ingredients.map(\.sodium)).map { $0 * multiplier })
        entry.slot = slot
        entry.date = date
        entry.source = .savedMeal
        entry.ingredients = ingredients.map {
            MealIngredient(name: $0.name, amount: multiplier == 1 ? "1 serving" : "\(multiplier.formatted(.number.precision(.fractionLength(0...2)))) servings",
                           calories: $0.calories * multiplier, protein: $0.protein * multiplier,
                           carbs: $0.carbs * multiplier, fat: $0.fat * multiplier)
        }
        return entry.isValid ? entry : nil
    }

    private func completeSum(_ values: [Double?]) -> Double? {
        guard values.allSatisfy({ $0 != nil }) else { return nil }
        return values.compactMap { $0 }.reduce(0, +)
    }
}
public struct PersonalProfile: Codable, Equatable, Sendable {
    public var name = ""
    public var age: Int?
    public var height: Double?
    public var weight: Double?
    public var goal = "Build muscle"
    public var pace = "At my own pace"
    /// Reference used by the Mifflin-St Jeor equation. Optional for stored profiles.
    public var metabolicReference: String?
    public var activityLevel: String?
    public var trainingExperience: String?
    /// Optional so profiles saved before nutrition planning continue to decode.
    public var weeklyGainGoalKG: Double?
    public var trainingDaysPerWeek: Int?
    public var usualDailySteps: Int?
    /// Food preferences stay optional so profiles saved before this feature decode unchanged.
    public var prefersLactoseFree: Bool?
    public var preferredRetailers: [String]?
    public var foodPreferenceNotes: String?
    public var onboardingComplete = false
    public init() {}
}

public struct NutritionEstimate: Equatable, Sendable {
    public let restingCalories: Double
    public let maintenanceCalories: Double
    public let targetCalories: Double
    public let surplusCalories: Double
    public let protein: Double
    public let carbs: Double
    public let fat: Double
    public let fiber: Double
    public let freeSugarLimit: Double
    public let sodiumLimit: Double
    public let requestedWeeklyGainKG: Double
    public let recommendedWeeklyGainMinKG: Double
    public let recommendedWeeklyGainMaxKG: Double

    public static func muscleGain(age: Int, heightCM: Double, weightKG: Double,
                                  metabolicReference: String, activityLevel: String,
                                  weeklyGainKG: Double? = nil,
                                  trainingDaysPerWeek: Int? = nil,
                                  usualDailySteps: Int? = nil) -> Self? {
        guard (18...100).contains(age), (120...240).contains(heightCM), (35...350).contains(weightKG) else { return nil }
        let offset = metabolicReference == "female" ? -161.0 : 5.0
        let resting = 10 * weightKG + 6.25 * heightCM - 5 * Double(age) + offset
        let inferredActivity = resolvedActivityLevel(fallback: activityLevel,
                                                     trainingDaysPerWeek: trainingDaysPerWeek,
                                                     usualDailySteps: usualDailySteps)
        let factor: Double = switch inferredActivity {
        case "light": 1.375
        case "very_active": 1.725
        case "active": 1.55
        default: 1.2
        }
        let maintenance = resting * factor
        let recommendedMin = weightKG * 0.0025
        let recommendedMax = weightKG * 0.005
        let requestedGain = min(max(weeklyGainKG ?? recommendedMin, 0.05), 1.0)
        // Start conservatively at 5–10% and review observed weight trends.
        // Helms et al. (2023), doi:10.1186/s40798-023-00651-y, found faster
        // weight gain was more consistently associated with increased skinfolds.
        let requestedRate = requestedGain / weightKG
        let surplusFraction = min(max((requestedRate / 0.005) * 0.10, 0.05), 0.10)
        let target = maintenance * (1 + surplusFraction)
        let surplus = target - maintenance
        // Use the upper end of the evidence-based range as a simple muscle-gain
        // target. Keep fat at least 1 g/kg and around 22% of total energy, then
        // let carbohydrates fill the remaining calorie budget.
        let protein = weightKG * 2.0
        let fat = max(weightKG, target * 0.22 / 9)
        let carbs = max(0, (target - protein * 4 - fat * 9) / 4)
        let fiber = target / 1_000 * 14
        let freeSugarLimit = target * 0.10 / 4
        return .init(restingCalories: resting, maintenanceCalories: maintenance,
                     targetCalories: target, surplusCalories: surplus,
                     protein: protein, carbs: carbs, fat: fat, fiber: fiber,
                     freeSugarLimit: freeSugarLimit, sodiumLimit: 2_000,
                     requestedWeeklyGainKG: requestedGain,
                     recommendedWeeklyGainMinKG: recommendedMin,
                     recommendedWeeklyGainMaxKG: recommendedMax)
    }

    public static func resolvedActivityLevel(fallback: String,
                                             trainingDaysPerWeek: Int?,
                                             usualDailySteps: Int?) -> String {
        guard let trainingDaysPerWeek, let usualDailySteps else { return fallback }
        if usualDailySteps >= 12_000 || trainingDaysPerWeek >= 6 { return "very_active" }
        if usualDailySteps >= 7_500 || trainingDaysPerWeek >= 3 { return "active" }
        if usualDailySteps >= 4_000 || trainingDaysPerWeek >= 1 { return "light" }
        return "sedentary"
    }
}
public struct TrainingProgram: Codable, Equatable, Sendable {
    public var name = "My Training Program"
    public var templates: [Workout] = []
    public var nextTemplateID: UUID?
    public init() {}
    public var next: Workout? { templates.first(where: { $0.id == nextTemplateID }) ?? templates.first }
    public mutating func advance(after id: UUID?) {
        guard let i = templates.firstIndex(where: { $0.id == id }), !templates.isEmpty else { return }
        nextTemplateID = templates[(i + 1) % templates.count].id
    }
}
public extension TrainingProgram {
    static func pplUpperLower() -> TrainingProgram {
        func exercise(_ name: String, muscle: String, sets: Int = 3,
                      reps: String, rest: Int, note: String? = nil) -> Exercise {
            var item = Exercise(name: name, setCount: sets)
            item.primaryMuscle = muscle
            item.repRange = reps
            item.restSeconds = rest
            item.notes = note
            return item
        }
        func workout(_ name: String, _ exercises: [Exercise]) -> Workout {
            Workout(name: name, exercises: exercises)
        }

        let push = workout("Push", [
            exercise("Lever Seated Fly", muscle: "Chest", reps: "8–12", rest: 90),
            exercise("Smith Incline Bench Press", muscle: "Chest", reps: "6–10", rest: 120),
            exercise("Cable High-to-Low Fly", muscle: "Chest", reps: "10–15", rest: 90),
            exercise("Lever Lateral Raise", muscle: "Shoulders", reps: "12–20", rest: 75),
            exercise("Lever Shoulder Press", muscle: "Shoulders", reps: "6–10", rest: 120),
            exercise("Triceps Pushdown", muscle: "Triceps", reps: "8–12", rest: 90),
            exercise("Overhead Triceps Extension", muscle: "Triceps", reps: "8–12", rest: 90)
        ])

        let pull = workout("Pull", [
            exercise("Cable Wide-Grip Lat Pulldown", muscle: "Back", reps: "8–12", rest: 120),
            exercise("Barbell Row", muscle: "Back", reps: "6–10", rest: 120),
            exercise("Cable Straight Back Seated Row", muscle: "Back", reps: "8–12", rest: 105, note: "Use the close-grip handle."),
            exercise("Lever Seated Reverse Fly", muscle: "Shoulders", reps: "12–20", rest: 75),
            exercise("Dumbbell Curl", muscle: "Biceps", reps: "8–12", rest: 90),
            exercise("Hammer Curl", muscle: "Biceps", reps: "8–12", rest: 90)
        ])

        func lowerWorkout(named name: String) -> Workout {
            workout(name, [
                exercise("Lever Seated Leg Press", muscle: "Quadriceps", reps: "6–10", rest: 150),
                exercise("Stiff-Leg Deadlift", muscle: "Hamstrings", reps: "6–10", rest: 150),
                exercise("Lever Seated Leg Curl", muscle: "Hamstrings", reps: "8–12", rest: 90),
                exercise("Lever Leg Extension", muscle: "Quadriceps", reps: "8–12", rest: 90),
                exercise("Standing Calf Raise", muscle: "Calves", reps: "10–15", rest: 75),
                exercise("Cable Crunch", muscle: "Core", reps: "10–15", rest: 75),
                exercise("Lever Seated Hip Adduction", muscle: "Adductors", reps: "10–15", rest: 75, note: "Inner thighs")
            ])
        }

        let legs = lowerWorkout(named: "Legs")
        let upper = workout("Upper", [
            exercise("Smith Incline Bench Press", muscle: "Chest", reps: "6–10", rest: 120),
            exercise("Cable Wide-Grip Lat Pulldown", muscle: "Back", reps: "8–12", rest: 120),
            exercise("Cable Straight Back Seated Row", muscle: "Back", reps: "8–12", rest: 105),
            exercise("Lever Seated Fly", muscle: "Chest", sets: 2, reps: "10–15", rest: 90),
            exercise("Lever Shoulder Press", muscle: "Shoulders", sets: 2, reps: "8–12", rest: 105),
            exercise("Lever Lateral Raise", muscle: "Shoulders", sets: 2, reps: "12–20", rest: 75),
            exercise("Triceps Pushdown", muscle: "Triceps", sets: 2, reps: "8–12", rest: 90),
            exercise("Dumbbell Curl", muscle: "Biceps", sets: 2, reps: "8–12", rest: 90)
        ])
        let lower = lowerWorkout(named: "Lower")

        var program = TrainingProgram()
        program.name = "PPL · Upper · Lower"
        program.templates = [push, pull, legs, upper, lower]
        program.nextTemplateID = push.id
        return program
    }
}
public extension Workout {
    func start() -> Workout {
        var result = Workout(name: name, exercises: exercises)
        result.templateID = id
        for i in result.exercises.indices {
            result.exercises[i].id = UUID()
            for j in result.exercises[i].sets.indices {
                result.exercises[i].sets[j].id = UUID(); result.exercises[i].sets[j].completed = false
            }
        }
        return result
    }
}
