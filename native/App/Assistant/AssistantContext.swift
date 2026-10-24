import Foundation
import ErrdayCore

@MainActor
enum AssistantContext {
    static func personal(records: PersonalStore) -> AIJSON {
        let profile = records.data.profile
        let latestWeight = records.weightEntries.first?.kilograms ?? profile?.weight
        return .object([
            "profile": .object([
                "age": profile?.age.map { .number(Double($0)) } ?? .null,
                "height_cm": optional(profile?.height),
                "latest_weight_kg": optional(latestWeight),
                "goal": profile.map { .string(String($0.goal.prefix(80))) } ?? .null,
                "requested_weekly_gain_kg": optional(profile?.weeklyGainGoalKG),
                "training_days_per_week": profile?.trainingDaysPerWeek.map { .number(Double($0)) } ?? .null,
                "usual_daily_steps": profile?.usualDailySteps.map { .number(Double($0)) } ?? .null,
                "prefers_lactose_free": profile?.prefersLactoseFree.map(AIJSON.bool) ?? .null,
                "preferred_retailers": .array((profile?.preferredRetailers ?? []).prefix(10).map { .string(String($0.prefix(40))) }),
                "food_preference_notes": profile?.foodPreferenceNotes.map { .string(String($0.prefix(400))) } ?? .null
            ]),
            "nutrition_goals": .object([
                "calories_kcal": optional(records.data.calorieGoal),
                "protein_g": optional(records.data.proteinGoal),
                "carbs_g": optional(records.data.carbsGoal),
                "fat_g": optional(records.data.fatGoal),
                "fiber_g": optional(records.data.fiberGoal),
                "sugar_limit_g": optional(records.data.sugarGoal),
                "sodium_limit_mg": optional(records.data.sodiumGoal)
            ])
        ])
    }

    static func summary(scope: String, days: Int, records: PersonalStore, health: HealthStore, allowHealth: Bool) -> AIJSON {
        guard [1, 7, 30].contains(days) else { return error("Invalid period") }
        let calendar = Calendar.current
        let start = calendar.date(byAdding: .day, value: 1-days, to: calendar.startOfDay(for: .now))!
        var result: [String: AIJSON] = ["days": .number(Double(days)), "start": .string(date(start)), "through": .string(date(.now)), "today_is_partial": .bool(true)]
        switch scope {
        case "health":
            guard allowHealth else { return error("Health sharing is off. Ask the user to enable 'Health teilen' in this chat. Never infer missing readings.") }
            result["refreshed_at"] = health.refreshedAt.map { .string($0.ISO8601Format()) } ?? .null
            result["metrics"] = .array(HealthMetricDefinition.all.map { metric in
                let values = health.values(metric.id, days: days)
                return .object(["name": .string(metric.title), "unit": .string(metric.suffix),
                    "aggregation": .string(metric.cumulative ? "sum per day; average across observed days" : "daily average; average across observed days"),
                    "average": optional(WeeklySummary.average(values)), "observed_days": .number(Double(values.filter { $0.value != nil }.count)),
                    "daily": .array(values.map { .object(["date": .string(date($0.date)), "value": optional($0.value)]) })])
            })
            result["sleep_hours"] = .array(health.sleep.suffix(days).map { .object(["date": .string(date($0.date)), "hours": optional($0.hours)]) })
            result["data_note"] = .string("Missing is unknown, not zero. Wearable readings cannot establish whether someone is healthy or diagnose a condition.")
        case "food":
            let meals = records.data.meals.filter { $0.date >= start && $0.date <= .now }
            let weight = records.weightEntries(on: .now).first?.kilograms
                ?? records.data.profile?.weight
                ?? health.value("weight", on: .now)
            let activityCalories = health.foodGoalAddition(on: .now, weightKG: weight, data: records.data)
            result["logged_entries"] = .number(Double(meals.count))
            result["days_with_entries"] = .number(Double(Set(meals.map { calendar.startOfDay(for: $0.date) }).count))
            result["base_calorie_goal"] = optional(records.data.calorieGoal)
            result["today_extra_active_kcal"] = allowHealth ? .number(activityCalories) : .null
            result["today_adjusted_calorie_goal"] = allowHealth ? optional(records.data.calorieGoal.map { $0 + activityCalories }) : .null
            result["protein_goal_g"] = optional(records.data.proteinGoal)
            result["carbs_goal_g"] = optional(records.data.carbsGoal)
            result["fat_goal_g"] = optional(records.data.fatGoal)
            result["fiber_goal_g"] = optional(records.data.fiberGoal)
            result["sugar_limit_g"] = optional(records.data.sugarGoal)
            result["sodium_limit_mg"] = optional(records.data.sodiumGoal)
            result["today_water_ml"] = .number(records.water(on: .now))
            result["latest_weight_kg"] = optional(records.weightEntries.first?.kilograms ?? records.data.profile?.weight)
            result["weight_entries"] = .array(records.weightEntries.filter { $0.date >= start && $0.date <= .now }.prefix(60).map {
                .object(["date": .string(date($0.date)), "kilograms": .number($0.kilograms)])
            })
            result["daily"] = .array((0..<days).map { offset in
                let day = calendar.date(byAdding: .day, value: offset, to: start)!
                let entries = meals.filter { calendar.isDate($0.date, inSameDayAs: day) }
                return .object(["date": .string(date(day)), "entries": .number(Double(entries.count)),
                    "logged_kcal": .number(entries.reduce(0) { $0+$1.calories }), "logged_protein_g": .number(entries.reduce(0) { $0+$1.protein }),
                    "logged_carbs_g": .number(entries.reduce(0) { $0+$1.carbs }), "logged_fat_g": .number(entries.reduce(0) { $0+$1.fat }),
                    "logged_fiber_g": complete(entries.map(\.fiber)), "logged_sugar_g": complete(entries.map(\.sugar)),
                    "logged_sodium_mg": complete(entries.map(\.sodium)), "logged_water_ml": .number(records.water(on: day))])
            })
            result["data_note"] = .string("Logged amounts only. No entries does not mean no food consumed. Incomplete tracking cannot establish a calorie deficit.")
        case "gym":
            let sessions = records.data.workouts.filter { $0.startedAt >= start && $0.startedAt <= .now }
            result["sessions"] = .array(sessions.suffix(30).map { workout in
                .object(["name": .string(workout.name), "date": .string(date(workout.startedAt)), "completed_sets": .number(Double(workout.completedSets)),
                    "volume_kg_reps": .number(workout.volume), "exercises": .array(workout.exercises.map { exercise in
                        .object(["name": .string(exercise.name), "completed_sets": .array(exercise.sets.filter(\.completed).map {
                            .object(["kg": .number($0.weight), "reps": .number(Double($0.repetitions))]) })])
                    })])
            })
            result["data_note"] = .string("Logged sessions only; exercise names and external weight may not be comparable. Do not claim muscle growth from volume alone.")
        default: return error("Unknown scope")
        }
        return .object(result)
    }
    static func error(_ message: String) -> AIJSON { .object(["error": .string(message)]) }
    static func optional(_ value: Double?) -> AIJSON { value.map(AIJSON.number) ?? .null }
    private static func complete(_ values: [Double?]) -> AIJSON {
        guard values.allSatisfy({ $0 != nil }) else { return .null }
        return .number(values.compactMap { $0 }.reduce(0, +))
    }
    static func date(_ date: Date) -> String { { let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = .current; formatter.dateFormat = "yyyy-MM-dd"; return formatter.string(from: date) }() }
}
