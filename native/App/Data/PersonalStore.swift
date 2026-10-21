import ErrdayCore
import Foundation
import Observation
import WidgetKit

@MainActor @Observable
final class PersonalStore {
    private(set) var data = PersonalData()
    private(set) var isLoaded = false
    var errorMessage: String?
    private let repository: PersonalRepository

    /// Temporary account-free profile, isolated from all existing account records.
    init() {
        let directory = URL.applicationSupportDirectory.appending(path: "Errday/LocalProfile", directoryHint: .isDirectory)
        repository = PersonalRepository(directory: directory, userID: UUID(uuidString: "00000000-0000-0000-0000-000000000000")!)
    }

    init(userID: UUID) {
        let directory = URL.applicationSupportDirectory.appending(path: "Errday/Accounts", directoryHint: .isDirectory)
        repository = PersonalRepository(directory: directory, userID: userID)
    }

    func load() {
        do {
            var loaded = try repository.load()
            if loaded.profile?.goal == "Muskelaufbau" { loaded.profile?.goal = "Build muscle" }
            if loaded.profile?.goal == "Gesundheit" { loaded.profile?.goal = "General health" }
            if loaded.profile?.goal == "Überblick" { loaded.profile?.goal = "Maintain" }
            if loaded.profile?.pace == "In meinem Tempo" { loaded.profile?.pace = "At my own pace" }
            if loaded.profile != nil {
                if loaded.profile?.prefersLactoseFree == nil { loaded.profile?.prefersLactoseFree = true }
                if loaded.profile?.preferredRetailers == nil {
                    loaded.profile?.preferredRetailers = ["Coop", "Migros", "Aldi", "Lidl", "Spar"]
                }
                if loaded.profile?.foodPreferenceNotes == nil {
                    loaded.profile?.foodPreferenceNotes = "Affordable, calorie-dense meals with plenty of carbohydrates, enough protein, few ingredients and varied suggestions."
                }
            }
            if loaded.program?.name == "Mein Trainingsplan" { loaded.program?.name = "My Training Program" }
            if loaded.schemaVersion < 2 || loaded.program == nil {
                loaded.program = .pplUpperLower()
            }
            if loaded.schemaVersion < 3 { migrateLegacyCalculatedMacros(in: &loaded) }
            loaded.schemaVersion = 3
            if loaded.dailyChecklistStartedAt == nil {
                loaded.dailyChecklistStartedAt = Calendar.current.startOfDay(for: .now)
            }
            if loaded.hydrationGoalMillilitres == nil { loaded.hydrationGoalMillilitres = 3_500 }
            if loaded.weightGoalKilograms == nil { loaded.weightGoalKilograms = 90 }
            enrichMissingFoodNutrition(in: &loaded)
            data = loaded; try repository.save(loaded); isLoaded = true; errorMessage = nil; updateWidgetSummary()
            WorkoutLiveActivityCoordinator.shared.schedule(for: loaded)
            RestTimerNotificationScheduler.schedule(for: loaded)
            WatchWorkoutBridge.shared.connect(to: self)
        }
        catch { errorMessage = "Your saved entries could not be loaded. They will not be overwritten." }
    }

    @discardableResult
    func update(_ change: (inout PersonalData) -> Void) -> Bool {
        guard isLoaded else { return false }
        var next = data; change(&next)
        do {
            try repository.save(next)
            let restJustCompleted = data.activeWorkout != nil && next.activeWorkout != nil
                && (data.restEndsAt.map { $0 <= .now } ?? false)
                && next.restEndsAt == nil && next.restTimerPausedSeconds == 0
            data = next; errorMessage = nil; updateWidgetSummary()
            WorkoutLiveActivityCoordinator.shared.schedule(for: next)
            RestTimerNotificationScheduler.schedule(for: next, preserveCompletedAlert: restJustCompleted)
            WatchWorkoutBridge.shared.publish(next)
            return true
        }
        catch { errorMessage = "Saving failed. Your entry has not been added yet."; return false }
    }
    @discardableResult
    func saveMeal(_ meal: MealEntry) -> Bool {
        guard meal.isValid else { return false }
        return update {
            if let index = $0.meals.firstIndex(where: { $0.id == meal.id }) { $0.meals[index] = meal }
            else { $0.meals.append(meal) }
        }
    }
    @discardableResult
    func deleteMeal(_ id: UUID) -> Bool { update { $0.meals.removeAll { $0.id == id } } }
    var todayMeals: [MealEntry] { data.meals(on: .now).sorted { $0.date > $1.date } }
    func meals(on date: Date) -> [MealEntry] { data.meals(on: date).sorted { $0.date > $1.date } }
    func workouts(on date: Date) -> [Workout] { data.workouts.filter { Calendar.current.isDate($0.startedAt, inSameDayAs: date) }.sorted { $0.startedAt > $1.startedAt } }
    var todayCalories: Double { todayMeals.reduce(0) { $0 + $1.calories } }
    var todayProtein: Double { todayMeals.reduce(0) { $0 + $1.protein } }
    var todayWater: Double { data.hydration(on: .now).reduce(0) { $0 + $1.millilitres } }
    func water(on date: Date) -> Double { data.hydration(on: date).reduce(0) { $0 + $1.millilitres } }
    func hydrationEntries(on date: Date) -> [HydrationEntry] { data.hydration(on: date).sorted { $0.date > $1.date } }
    func weightEntries(on date: Date) -> [WeightEntry] { weightEntries.filter { Calendar.current.isDate($0.date, inSameDayAs: date) } }
    func restedCheckIn(on date: Date) -> RestedCheckIn? {
        data.restedCheckIns?.first { Calendar.current.isDate($0.date, inSameDayAs: date) }
    }

    @discardableResult
    func saveRestedCheckIn(feeling: RestedFeeling, note: String?, on date: Date) -> Bool {
        guard Calendar.current.startOfDay(for: date) <= Calendar.current.startOfDay(for: .now) else { return false }
        let trimmed = note?.trimmingCharacters(in: .whitespacesAndNewlines)
        let entry = RestedCheckIn(date: Calendar.current.startOfDay(for: date), feeling: feeling,
                                  note: trimmed?.isEmpty == false ? trimmed : nil)
        return update { data in
            var entries = data.restedCheckIns ?? []
            entries.removeAll { Calendar.current.isDate($0.date, inSameDayAs: date) }
            entries.append(entry)
            data.restedCheckIns = entries
        }
    }
    func foodStreak(on date: Date = .now) -> Int { data.foodLoggingStreak(on: date) }
    var trackingDays: Int {
        guard let first = data.meals.map(\.date).min() else { return 0 }
        return max(1, (Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: first), to: Calendar.current.startOfDay(for: .now)).day ?? 0) + 1)
    }
    @discardableResult
    func logWater(_ millilitres: Double, at date: Date = .now) -> Bool {
        logWaterEntry(millilitres, at: date) != nil
    }

    @discardableResult
    func logWaterEntry(_ millilitres: Double, at date: Date = .now) -> HydrationEntry? {
        let entry = HydrationEntry(date: date, millilitres: millilitres)
        guard entry.isValid else { return nil }
        let saved = update { data in
            var hydration = data.hydration ?? []
            hydration.append(entry)
            data.hydration = hydration
        }
        return saved ? entry : nil
    }
    @discardableResult
    func updateWater(_ entry: HydrationEntry) -> Bool {
        guard entry.isValid, entry.date <= .now.addingTimeInterval(300),
              let existing = data.hydration?.first(where: { $0.id == entry.id }),
              Calendar.current.isDate(existing.date, inSameDayAs: entry.date) else { return false }
        return update { data in
            guard let index = data.hydration?.firstIndex(where: { $0.id == entry.id }) else { return }
            data.hydration?[index] = entry
        }
    }
    @discardableResult
    func deleteWater(_ id: UUID) -> Bool { update { $0.hydration?.removeAll { $0.id == id } } }

    var weightEntries: [WeightEntry] {
        (data.weightEntries ?? []).sorted { $0.date > $1.date }
    }

    @discardableResult
    func logWeight(_ kilograms: Double, at date: Date = .now) -> Bool {
        let entry = WeightEntry(date: date, kilograms: kilograms)
        guard entry.isValid, date <= .now.addingTimeInterval(300) else { return false }
        return update { data in
            var entries = data.weightEntries ?? []
            entries.append(entry)
            data.weightEntries = entries
            var profile = data.profile ?? PersonalProfile()
            if entries.max(by: { $0.date < $1.date })?.id == entry.id { profile.weight = kilograms }
            data.profile = profile
        }
    }

    @discardableResult
    func deleteWeight(_ id: UUID) -> Bool {
        update { data in
            data.weightEntries?.removeAll { $0.id == id }
            if let latest = data.weightEntries?.max(by: { $0.date < $1.date }) {
                data.profile?.weight = latest.kilograms
            }
        }
    }

    func completedChecklistItems(on date: Date) -> Set<DailyChecklistItem> {
        data.checklist(on: date)?.completed ?? []
    }

    func isChecklistComplete(on date: Date) -> Bool {
        let completed = completedChecklistItems(on: date)
        return DailyChecklistItem.supplementItems.allSatisfy(completed.contains)
    }

    func latestChecklistCompletion(on date: Date) -> Date? {
        data.checklist(on: date)?.completedAt?.values.max()
    }

    @discardableResult
    func toggleChecklistItem(_ item: DailyChecklistItem, on date: Date) -> Bool {
        update { data in
            let day = Calendar.current.startOfDay(for: date)
            var entries = data.dailyChecklist ?? []
            if let index = entries.firstIndex(where: { Calendar.current.isDate($0.date, inSameDayAs: day) }) {
                var completionTimes = entries[index].completedAt ?? [:]
                if entries[index].completed.contains(item) {
                    entries[index].completed.remove(item)
                    completionTimes.removeValue(forKey: item)
                } else {
                    entries[index].completed.insert(item)
                    completionTimes[item] = .now
                }
                entries[index].completedAt = completionTimes
            } else {
                entries.append(DailyChecklistEntry(date: day, completed: [item], completedAt: [item: .now]))
            }
            data.dailyChecklist = entries
        }
    }

    private func updateWidgetSummary() {
        let meals = data.meals(on: .now)
        let defaults = UserDefaults(suiteName: "group.com.errday.native")
        func completeTotal(_ keyPath: KeyPath<MealEntry, Double?>) -> Double? {
            if meals.isEmpty { return 0 }
            guard meals.allSatisfy({ $0[keyPath: keyPath] != nil }) else { return nil }
            return meals.compactMap { $0[keyPath: keyPath] }.reduce(0, +)
        }
        func setOptional(_ value: Double?, forKey key: String) {
            if let value { defaults?.set(value, forKey: key) }
            else { defaults?.removeObject(forKey: key) }
        }
        defaults?.set(meals.reduce(0) { $0 + $1.calories }, forKey: "widget.calories")
        defaults?.set(meals.reduce(0) { $0 + $1.protein }, forKey: "widget.protein")
        defaults?.set(meals.reduce(0) { $0 + $1.carbs }, forKey: "widget.carbs")
        defaults?.set(meals.reduce(0) { $0 + $1.fat }, forKey: "widget.fat")
        setOptional(completeTotal(\.fiber), forKey: "widget.fiber")
        setOptional(completeTotal(\.sugar), forKey: "widget.sugar")
        setOptional(completeTotal(\.sodium), forKey: "widget.sodium")
        defaults?.set(data.calorieGoal ?? 0, forKey: "widget.calorieGoal")
        defaults?.set(data.proteinGoal ?? 0, forKey: "widget.proteinGoal")
        defaults?.set(data.carbsGoal ?? 0, forKey: "widget.carbsGoal")
        defaults?.set(data.fatGoal ?? 0, forKey: "widget.fatGoal")
        defaults?.set(data.fiberGoal ?? 0, forKey: "widget.fiberGoal")
        defaults?.set(data.sugarGoal ?? 0, forKey: "widget.sugarGoal")
        defaults?.set(data.sodiumGoal ?? 0, forKey: "widget.sodiumGoal")
        WidgetCenter.shared.reloadTimelines(ofKind: "ErrdayNutritionWidget")
        WidgetCenter.shared.reloadTimelines(ofKind: "ErrdayLockScreenNutritionWidget")
    }

    func updateWidgetActivity(_ calories: Double) {
        let defaults = UserDefaults(suiteName: "group.com.errday.native")
        defaults?.set(max(0, calories), forKey: "widget.activityCalories")
        WidgetCenter.shared.reloadTimelines(ofKind: "ErrdayNutritionWidget")
        WidgetCenter.shared.reloadTimelines(ofKind: "ErrdayLockScreenNutritionWidget")
    }

    /// Update targets created by the former 1.8 g/kg protein and 0.8 g/kg fat
    /// calculator. Manually edited targets are left untouched.
    private func migrateLegacyCalculatedMacros(in data: inout PersonalData) {
        guard let profile = data.profile,
              profile.goal == "Build muscle",
              let age = profile.age,
              let height = profile.height,
              let weight = profile.weight,
              let currentProtein = data.proteinGoal,
              let currentFat = data.fatGoal,
              abs(currentProtein - weight * 1.8) < 0.6,
              abs(currentFat - weight * 0.8) < 0.6,
              let estimate = NutritionEstimate.muscleGain(
                age: age,
                heightCM: height,
                weightKG: weight,
                metabolicReference: profile.metabolicReference ?? "male",
                activityLevel: profile.activityLevel ?? "active",
                weeklyGainKG: profile.weeklyGainGoalKG,
                trainingDaysPerWeek: profile.trainingDaysPerWeek,
                usualDailySteps: profile.usualDailySteps
              ) else { return }

        data.calorieGoal = estimate.targetCalories
        data.proteinGoal = estimate.protein
        data.carbsGoal = estimate.carbs
        data.fatGoal = estimate.fat
        data.fiberGoal = estimate.fiber
        data.sugarGoal = estimate.freeSugarLimit
        data.sodiumGoal = estimate.sodiumLimit
    }

    /// Product entries are historical snapshots. This only fills secondary nutrients
    /// that were previously absent; calories and existing nutrition are never changed.
    private func enrichMissingFoodNutrition(in data: inout PersonalData) {
        guard let url = Bundle.main.url(forResource: "food-catalog", withExtension: "json"),
              let catalogue = try? FoodCatalog.load(Data(contentsOf: url)) else { return }
        let products = Dictionary(uniqueKeysWithValues: catalogue.products.map { ($0.id, $0) })

        func enrich(_ meal: inout MealEntry) {
            guard var portion = meal.foodPortion, let product = products[portion.product.id] else { return }
            var changed = false
            if portion.nutrientsPer100.fiber == nil, let value = product.nutrients.fiber {
                portion.nutrientsPer100.fiber = value; changed = true
            }
            if portion.nutrientsPer100.sugar == nil, let value = product.nutrients.sugar {
                portion.nutrientsPer100.sugar = value; changed = true
            }
            if portion.nutrientsPer100.sodium == nil, let value = product.nutrients.sodium {
                portion.nutrientsPer100.sodium = value; changed = true
            }
            guard changed else { return }

            portion.product.nutrients.fiber = portion.product.nutrients.fiber ?? product.nutrients.fiber
            portion.product.nutrients.sugar = portion.product.nutrients.sugar ?? product.nutrients.sugar
            portion.product.nutrients.sodium = portion.product.nutrients.sodium ?? product.nutrients.sodium
            let scale = portion.amount / 100
            meal.fiber = meal.fiber ?? portion.nutrientsPer100.fiber.map { $0 * scale }
            meal.sugar = meal.sugar ?? portion.nutrientsPer100.sugar.map { $0 * scale }
            meal.sodium = meal.sodium ?? portion.nutrientsPer100.sodium.map { $0 * scale }
            meal.foodPortion = portion
        }

        for index in data.meals.indices { enrich(&data.meals[index]) }
        if data.savedFoods != nil {
            for index in data.savedFoods!.indices { enrich(&data.savedFoods![index]) }
        }
    }
}
