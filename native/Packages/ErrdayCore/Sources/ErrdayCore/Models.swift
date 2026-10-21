import Foundation

public enum MealSource: String, Codable, Equatable, Sendable {
    case manual, database, savedMeal, aiPhoto, aiText, nutritionLabel
}

public struct MealIngredient: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var name: String
    public var amount: String
    public var calories: Double
    public var protein: Double
    public var carbs: Double
    public var fat: Double
    public init(id: UUID = UUID(), name: String, amount: String = "1 serving", calories: Double,
                protein: Double, carbs: Double, fat: Double) {
        self.id = id; self.name = name; self.amount = amount; self.calories = calories
        self.protein = protein; self.carbs = carbs; self.fat = fat
    }
}

public struct MealEntry: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var date: Date
    public var name: String
    public var slot: MealSlot?
    public var foodPortion: FoodPortion?
    public var calories: Double
    public var protein: Double
    public var carbs: Double
    public var fat: Double
    public var fiber: Double?
    public var sugar: Double?
    public var sodium: Double?
    /// Number of servings represented by this entry when no gram/ml portion exists.
    /// Optional so older entries continue to decode as one serving.
    public var servings: Double?
    /// Optional metadata keeps existing local entries backwards compatible.
    public var source: MealSource?
    public var ingredients: [MealIngredient]?
    public var aiNote: String?
    public init(id: UUID = UUID(), date: Date = .now, name: String, calories: Double,
                protein: Double, carbs: Double, fat: Double, fiber: Double? = nil,
                sugar: Double? = nil, sodium: Double? = nil) {
        self.id = id; self.date = date; self.name = name; self.calories = calories
        self.protein = protein; self.carbs = carbs; self.fat = fat
        self.fiber = fiber; self.sugar = sugar; self.sodium = sodium
    }
    public var isValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        [calories, protein, carbs, fat].allSatisfy { $0.isFinite && $0 >= 0 } &&
        [fiber, sugar, sodium].compactMap { $0 }.allSatisfy { $0.isFinite && $0 >= 0 }
    }
}

public struct HydrationEntry: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var date: Date
    public var millilitres: Double
    public init(id: UUID = UUID(), date: Date = .now, millilitres: Double) {
        self.id = id; self.date = date; self.millilitres = millilitres
    }
    public var isValid: Bool { millilitres.isFinite && millilitres > 0 && millilitres <= 10_000 }
}

public struct WeightEntry: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var date: Date
    public var kilograms: Double

    public init(id: UUID = UUID(), date: Date = .now, kilograms: Double) {
        self.id = id
        self.date = date
        self.kilograms = kilograms
    }

    public var isValid: Bool { kilograms.isFinite && (20...400).contains(kilograms) }
}

public enum DailyChecklistItem: String, Codable, CaseIterable, Identifiable, Sendable {
    case creatine
    case water
    case magnesium
    case multivitamin
    case omega3

    public var id: String { rawValue }

    /// Water remains decodable for older saved profiles, but hydration now has
    /// its own progress card instead of being a manual checklist item.
    public static let supplementItems: [Self] = [.creatine, .multivitamin, .omega3, .magnesium]
}

public struct DailyChecklistEntry: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var date: Date
    public var completed: Set<DailyChecklistItem>
    /// Completion times are stored separately so profiles created before this
    /// feature remain decodable and unchecked items do not invent timestamps.
    public var completedAt: [DailyChecklistItem: Date]?

    public init(id: UUID = UUID(), date: Date, completed: Set<DailyChecklistItem> = [],
                completedAt: [DailyChecklistItem: Date]? = nil) {
        self.id = id
        self.date = date
        self.completed = completed
        self.completedAt = completedAt
    }
}

public enum WorkoutSetType: String, Codable, CaseIterable, Sendable {
    case warmup
    case normal
    case drop
    case failure
    case left
    case right
    case myoReps

    public var shortLabel: String {
        switch self {
        case .warmup: "W"
        case .normal: "N"
        case .drop: "D"
        case .failure: "F"
        case .left: "L"
        case .right: "R"
        case .myoReps: "M"
        }
    }

    public var title: String {
        switch self {
        case .warmup: "Warm-up"
        case .normal: "Normal"
        case .drop: "Drop set"
        case .failure: "Failure"
        case .left: "Left side"
        case .right: "Right side"
        case .myoReps: "Myo-reps"
        }
    }
}

public struct WorkoutSet: Codable, Identifiable, Equatable, Sendable {
    public var id = UUID()
    public var weight: Double = 0
    public var repetitions: Int = 10
    public var completed = false
    /// Optional so older locally stored workouts decode without a migration.
    public var type: WorkoutSetType?
    /// Optional effort and endurance fields used by imported workout histories.
    public var effort: Double?
    public var distance: Double?
    public var durationSeconds: Double?
    public var recordLevel: Int?
    public var recordType: Int?
    public init(type: WorkoutSetType? = nil) { self.type = type }
    public var effectiveType: WorkoutSetType { type ?? .normal }
}

public struct Exercise: Codable, Identifiable, Equatable, Sendable {
    public var id = UUID()
    public var name: String
    public var repRange: String?
    public var restSeconds: Int?
    /// Optional so existing workouts continue to decode. Warm-up sets can use a
    /// shorter rest without changing the normal-set timer.
    public var warmupRestSeconds: Int?
    /// Optional so existing local workout data stays compatible.
    public var notes: String?
    /// English catalogue identifier. Optional so existing workouts keep decoding.
    public var primaryMuscle: String?
    /// Optional exercise media metadata from the catalogue. Active workouts keep
    /// their image after the picker closes and across app launches.
    public var imageURL: URL?
    public var imageAuthor: String?
    public var imageLicenseName: String?
    public var imageLicenseURL: URL?
    public var catalogueSourceID: Int?
    public var sets: [WorkoutSet]
    public init(name: String, setCount: Int = 3) {
        self.name = name
        sets = (0..<max(1, setCount)).map { _ in WorkoutSet() }
    }
}

public struct Workout: Codable, Identifiable, Equatable, Sendable {
    public var id = UUID()
    public var name: String
    public var templateID: UUID?
    public var startedAt: Date
    public var finishedAt: Date?
    /// Optional session note, including descriptions imported from other trackers.
    public var notes: String?
    public var exercises: [Exercise]
    public init(name: String, startedAt: Date = .now, exercises: [Exercise]) {
        self.name = name; self.startedAt = startedAt; self.exercises = exercises
    }
    public var completedSets: Int { exercises.flatMap(\.sets).filter(\.completed).count }
    public var volume: Double {
        exercises.flatMap(\.sets).filter(\.completed).reduce(0) { $0 + $1.weight * Double($1.repetitions) }
    }
}

public struct PersonalData: Codable, Equatable, Sendable {
    public var schemaVersion = 3
    public var meals: [MealEntry] = []
    public var workouts: [Workout] = []
    public var activeWorkout: Workout?
    /// Saved atomically with watch edits so retried messages never log a set twice.
    public var processedWatchCommandIDs: [UUID]?
    public var restEndsAt: Date?
    /// Workout timer state stays available when the active workout is minimised.
    public var restTimerDurationSeconds: Int?
    public var restTimerPausedSeconds: Double?
    public var workoutStopwatchStartedAt: Date?
    public var workoutStopwatchElapsedSeconds: Double?
    public var profile: PersonalProfile?
    public var program: TrainingProgram?
    public var savedFoods: [MealEntry]?
    public var savedMeals: [SavedMeal]?
    public var carbsGoal: Double?
    public var fatGoal: Double?
    public var calorieGoal: Double?
    public var proteinGoal: Double?
    public var fiberGoal: Double?
    public var sugarGoal: Double?
    public var sodiumGoal: Double?
    /// Daily hydration target. Optional so profiles saved before hydration goals decode unchanged.
    public var hydrationGoalMillilitres: Double?
    /// Long-term body-weight target. Optional so existing local profiles decode unchanged.
    public var weightGoalKilograms: Double?
    /// Optional so existing local profiles decode without migration work.
    public var hydration: [HydrationEntry]?
    /// Manual weigh-ins, kept optional so existing local data decodes unchanged.
    public var weightEntries: [WeightEntry]?
    /// Subjective rest check-ins stay in the local profile; optional for older saves.
    public var restedCheckIns: [RestedCheckIn]?
    /// Per-day routine checks. Optional so existing profiles decode unchanged.
    public var dailyChecklist: [DailyChecklistEntry]?
    /// Prevents the checklist from marking days before the feature was enabled as incomplete.
    public var dailyChecklistStartedAt: Date?
    public init() {}

    public func meals(on date: Date, calendar: Calendar = .current) -> [MealEntry] {
        meals.filter { calendar.isDate($0.date, inSameDayAs: date) }
    }

    public func hydration(on date: Date, calendar: Calendar = .current) -> [HydrationEntry] {
        (hydration ?? []).filter { calendar.isDate($0.date, inSameDayAs: date) }
    }

    public func checklist(on date: Date, calendar: Calendar = .current) -> DailyChecklistEntry? {
        dailyChecklist?.first { calendar.isDate($0.date, inSameDayAs: date) }
    }
}

public struct DailyMetric: Identifiable, Equatable, Sendable {
    public let date: Date
    public let value: Double?
    public var id: Date { date }
    public init(date: Date, value: Double?) { self.date = date; self.value = value }
}

public enum WeeklySummary {
    /// Missing measurements are not zeroes. Averages only include observed days.
    public static func average(_ days: [DailyMetric]) -> Double? {
        let values = days.compactMap(\.value).filter(\.isFinite)
        return values.isEmpty ? nil : values.reduce(0, +) / Double(values.count)
    }
}
