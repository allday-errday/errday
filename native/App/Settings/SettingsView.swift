import SwiftUI
import ErrdayCore

struct SettingsView: View {
    @Environment(PersonalStore.self) private var records
    @Environment(AssistantStore.self) private var assistant
    @Environment(StravaStore.self) private var strava
    @Environment(\.dismiss) private var dismiss
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: "Your Profile", subtitle: "The details Errday uses for your targets.")
                ErrdayCard {
                    Text(records.data.profile?.name.isEmpty == false ? records.data.profile!.name : "Local Profile").font(.title2.weight(.semibold))
                    Text("\(records.data.profile?.goal ?? "Build muscle") · no login").font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                }
                ErrdayCard {
                    settingsLink("Edit Profile", symbol: "person") { ProfileEditor() }; Divider()
                    settingsLink("Nutrition Goals", symbol: "target") { NutritionGoalsView() }; Divider()
                    AppearanceSettingsLink(); Divider()
                    settingsLink("Notifications", symbol: "bell") { NotificationPreferencesView() }; Divider()
                    settingsLink("Apple Health & Sources", symbol: "heart") { HealthSourcesView() }; Divider()
                    settingsLink(strava.isConnected ? "Strava · Connected" : "Connect Strava", symbol: "figure.run") { StravaSettingsView() }
                }
                ErrdayCard {
                    Text("Your Data").font(.headline)
                    Text("Meals, profile and workouts stay on this iPhone. There is no cloud sync.").font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                    Text(assistant.isConnected ? "AI connected" : "AI not connected").font(.caption).foregroundStyle(ErrdayTheme.quiet)
                }
                ErrdayCard {
                    Toggle(isOn: $hapticsEnabled) {
                        Label("Haptic feedback", systemImage: "iphone.radiowaves.left.and.right")
                    }
                    Text("A short tap confirms completed logs.")
                        .font(.caption)
                        .foregroundStyle(ErrdayTheme.secondary)
                }
            }.toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }

    private func settingsLink<Destination: View>(_ title: String, symbol: String,
                                                 @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination()) {
            HStack(spacing: 12) {
                Image(systemName: symbol).frame(width: 22).foregroundStyle(ErrdayTheme.accent)
                Text(title).font(.system(size: 15))
                Spacer()
                Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.quiet)
            }.frame(maxWidth: .infinity, minHeight: 46).contentShape(Rectangle())
        }.buttonStyle(.plain)
    }
}

struct ProfileTabView: View {
    @Environment(PersonalStore.self) private var records
    @Environment(AssistantStore.self) private var assistant
    @Environment(StravaStore.self) private var strava
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    var body: some View {
        ErrdayPage {
            PageHeading(title: "Your Profile", subtitle: "The details Errday uses for your targets.")
            ErrdayCard {
                Text(records.data.profile?.name.isEmpty == false ? records.data.profile!.name : "Local Profile").font(.title2.weight(.semibold))
                Text("\(records.data.profile?.goal ?? "Build muscle") · no login").font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
            }
            ErrdayCard {
                link("Edit Profile", symbol: "person") { ProfileEditor() }; Divider()
                link("Nutrition Goals", symbol: "target") { NutritionGoalsView() }; Divider()
                AppearanceSettingsLink(); Divider()
                link("Notifications", symbol: "bell") { NotificationPreferencesView() }; Divider()
                link("Apple Health & Sources", symbol: "heart") { HealthSourcesView() }; Divider()
                link(strava.isConnected ? "Strava · Connected" : "Connect Strava", symbol: "figure.run") { StravaSettingsView() }
            }
            ErrdayCard {
                Text("Your Data").font(.headline)
                Text("Meals, profile and workouts stay on this iPhone. There is no cloud sync.").font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                Text(assistant.isConnected ? "AI connected" : "AI not connected").font(.caption).foregroundStyle(ErrdayTheme.quiet)
            }
            ErrdayCard {
                Toggle(isOn: $hapticsEnabled) {
                    Label("Haptic feedback", systemImage: "iphone.radiowaves.left.and.right")
                }
                Text("A short tap confirms completed logs.")
                    .font(.caption)
                    .foregroundStyle(ErrdayTheme.secondary)
            }
        }
    }
    private func link<Destination: View>(_ title: String, symbol: String, @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination()) {
            HStack(spacing: 12) {
                Image(systemName: symbol).frame(width: 22).foregroundStyle(ErrdayTheme.accent)
                Text(title).font(.system(size: 15)); Spacer()
                Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.quiet)
            }.frame(maxWidth: .infinity, minHeight: 46).contentShape(Rectangle())
        }.buttonStyle(.plain)
    }
}

struct ProfileEditor: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @State private var profile = PersonalProfile()
    @State private var age = ""
    @State private var height = ""
    @State private var weight = ""
    @State private var targetWeight = ""
    @State private var hydrationGoal = ""
    @State private var preferredRetailers = ""
    @State private var foodPreferenceNotes = ""
    private var valid: Bool {
        (age.isEmpty || Int(age).map { (18...100).contains($0) } == true) &&
        (height.isEmpty || FoodInput.number(height).map { (120...240).contains($0) } == true) &&
        (weight.isEmpty || FoodInput.number(weight).map { (35...350).contains($0) } == true) &&
        (FoodInput.number(targetWeight).map { (35...350).contains($0) } == true) &&
        (FoodInput.number(hydrationGoal).map { (500...10_000).contains($0) } == true)
    }
    var body: some View {
        ErrdayPage {
            PageHeading(title: "Edit Profile", subtitle: "Your basic details for personal targets.")
            ErrdayCard {
                Text("Personal details").font(.headline)
                ErrdayTextField(label: "Name", placeholder: "Your name", text: $profile.name)
                FoodNumberField(label: "Age", unit: "years", value: $age)
            }
            ErrdayCard {
                Text("Body details").font(.headline)
                HStack(alignment: .top, spacing: 12) {
                    FoodNumberField(label: "Height", unit: "cm", value: $height)
                    FoodNumberField(label: "Weight", unit: "kg", value: $weight)
                }
                HStack(alignment: .top, spacing: 12) {
                    FoodNumberField(label: "Target weight", unit: "kg", value: $targetWeight)
                    FoodNumberField(label: "Water goal", unit: "ml", value: $hydrationGoal)
                }
                ErrdaySegmentField(label: "Metabolic reference", selection: Binding(get: { profile.metabolicReference ?? "male" }, set: { profile.metabolicReference = $0 })) {
                    Text("Male").tag("male")
                    Text("Female").tag("female")
                }
                Text("This choice is only used by the calorie equation. Training and daily steps are managed under Nutrition Goals.")
                    .font(.caption).foregroundStyle(ErrdayTheme.secondary)
            }
            ErrdayCard {
                Text("Food preferences").font(.headline)
                Toggle("Prefer lactose-free products", isOn: Binding(
                    get: { profile.prefersLactoseFree ?? true },
                    set: { profile.prefersLactoseFree = $0 }
                ))
                ErrdayTextField(label: "Preferred stores", placeholder: "Coop, Migros, Aldi", text: $preferredRetailers)
                ErrdayTextField(label: "What matters for food", placeholder: "Affordable, quick, calorie-dense…", text: $foodPreferenceNotes)
                Text("These preferences guide product searches and meal suggestions. Product names can still be searched in German.")
                    .font(.caption).foregroundStyle(ErrdayTheme.secondary)
            }
            Button("Save Changes") {
                profile.age = Int(age); profile.height = FoodInput.number(height); profile.weight = FoodInput.number(weight)
                profile.preferredRetailers = preferredRetailers.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
                profile.foodPreferenceNotes = foodPreferenceNotes.trimmingCharacters(in: .whitespacesAndNewlines)
                if records.update({ data in
                    data.profile = profile
                    data.weightGoalKilograms = FoodInput.number(targetWeight)
                    data.hydrationGoalMillilitres = FoodInput.number(hydrationGoal)
                }) { dismiss() }
            }.buttonStyle(PrimaryButtonStyle()).disabled(!valid)
        }.task {
            profile = records.data.profile ?? PersonalProfile()
            age = profile.age.map(String.init) ?? ""; height = FoodInput.text(profile.height); weight = FoodInput.text(profile.weight)
            targetWeight = FoodInput.text(records.data.weightGoalKilograms ?? 90)
            hydrationGoal = FoodInput.text(records.data.hydrationGoalMillilitres ?? 3_500)
            preferredRetailers = (profile.preferredRetailers ?? ["Coop", "Migros", "Aldi", "Lidl", "Spar"]).joined(separator: ", ")
            foodPreferenceNotes = profile.foodPreferenceNotes ?? "Affordable, calorie-dense meals with plenty of carbohydrates, enough protein, few ingredients and varied suggestions."
        }
    }
}

struct NutritionGoalsView: View {
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    @State private var calories = ""
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var fiber = ""
    @State private var sugar = ""
    @State private var sodium = ""
    @State private var weeklyGain = ""
    @State private var trainingDays = 3
    @State private var dailySteps = ""
    @State private var saved = false
    private var valid: Bool { [calories, protein, carbs, fat, fiber, sugar, sodium].allSatisfy { $0.isEmpty || FoodInput.number($0).map { $0 >= 0 } == true } }
    private var estimate: NutritionEstimate? {
        guard let profile = records.data.profile,
              let age = profile.age, let height = profile.height, let weight = profile.weight,
              let gain = FoodInput.number(weeklyGain), let steps = Int(dailySteps) else { return nil }
        return NutritionEstimate.muscleGain(age: age, heightCM: height, weightKG: weight,
                                            metabolicReference: profile.metabolicReference ?? "male",
                                            activityLevel: profile.activityLevel ?? "active",
                                            weeklyGainKG: gain,
                                            trainingDaysPerWeek: trainingDays,
                                            usualDailySteps: steps)
    }
    private var todayActivityCalories: Double {
        let weight = records.weightEntries(on: .now).first?.kilograms
            ?? records.data.profile?.weight
            ?? health.value("weight", on: .now)
        return health.foodActivityCalories(on: .now, weightKG: weight)
    }
    var body: some View {
        ErrdayPage {
            PageHeading(title: "Nutrition Goals", subtitle: "A starting plan for lean weight gain, adjusted by your activity.")
            if records.data.profile?.age == nil || records.data.profile?.height == nil || records.data.profile?.weight == nil {
                ErrdayCard {
                    Text("Complete your profile first").font(.headline)
                    Text("Age, height and weight are needed for the calculation.").font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                    NavigationLink("Edit Profile") { ProfileEditor() }.buttonStyle(PrimaryButtonStyle())
                }
            }
            ErrdayCard {
                Text("Your weekly plan").font(.headline)
                FoodNumberField(label: "Target weight gain", unit: "kg/week", value: $weeklyGain)
                ErrdayStepperField(label: "Strength training", valueText: "\(trainingDays) days per week", value: $trainingDays, range: 0...7)
                FoodNumberField(label: "Usual daily steps", unit: "steps", value: $dailySteps)
                Text("Choose the activity you normally expect. Walking and gym calories shown in Errday are added to the food goal for each day.")
                    .font(.caption).foregroundStyle(ErrdayTheme.secondary)
            }
            if let estimate {
                ErrdayCard {
                    Text("Calculated targets").font(.headline)
                    LabeledContent("Maintenance estimate", value: "\(estimate.maintenanceCalories.whole) kcal")
                    LabeledContent("Planned surplus", value: "+\(estimate.surplusCalories.whole) kcal")
                    LabeledContent("Base daily goal", value: "\(estimate.targetCalories.whole) kcal")
                    if todayActivityCalories > 0 {
                        LabeledContent("Additional movement today", value: "+\(todayActivityCalories.whole) kcal")
                        LabeledContent("Today's goal", value: "\((estimate.targetCalories + todayActivityCalories).whole) kcal")
                    }
                    Divider()
                    LabeledContent("Protein", value: "\(estimate.protein.whole) g")
                    LabeledContent("Carbohydrates", value: "\(estimate.carbs.whole) g")
                    LabeledContent("Fat", value: "\(estimate.fat.whole) g")
                    LabeledContent("Fiber", value: "\(estimate.fiber.whole) g")
                    LabeledContent("Sodium limit", value: "\(estimate.sodiumLimit.whole) mg")
                    paceMessage(estimate)
                }
                Button(saved ? "Plan Saved" : "Use This Plan") { apply(estimate) }
                    .buttonStyle(PrimaryButtonStyle()).disabled(saved)
            }
            DisclosureGroup("Fine-tune targets manually") {
                VStack(spacing: 12) {
                    FoodNumberField(label: "Calories", unit: "kcal", value: $calories)
                    FoodNumberField(label: "Protein", unit: "g", value: $protein)
                    FoodNumberField(label: "Carbs", unit: "g", value: $carbs)
                    FoodNumberField(label: "Fat", unit: "g", value: $fat)
                    FoodNumberField(label: "Fiber", unit: "g", value: $fiber)
                    FoodNumberField(label: "Sugar reference", unit: "g", value: $sugar)
                    FoodNumberField(label: "Sodium", unit: "mg", value: $sodium)
                    Button("Save Manual Targets") { saveManual() }.buttonStyle(PrimaryButtonStyle(secondary: true)).disabled(!valid)
                }.padding(.top, 12)
            }.font(.system(size: 14, weight: .semibold))
            Text("This is an evidence-based starting estimate, not a guarantee or medical prescription. Compare your 7-day average weight for 2–3 weeks and adjust. Product labels usually report total sugar; the calculated sugar reference is based on the free-sugar guideline and is therefore only a reference.")
                .font(.footnote).foregroundStyle(ErrdayTheme.secondary)
            Link("Evidence: off-season muscle-gain nutrition", destination: URL(string: "https://pubmed.ncbi.nlm.nih.gov/31247944/")!)
                .font(.footnote)
        }.task {
            calories = FoodInput.text(records.data.calorieGoal); protein = FoodInput.text(records.data.proteinGoal); carbs = FoodInput.text(records.data.carbsGoal); fat = FoodInput.text(records.data.fatGoal)
            fiber = FoodInput.text(records.data.fiberGoal); sugar = FoodInput.text(records.data.sugarGoal); sodium = FoodInput.text(records.data.sodiumGoal)
            let profile = records.data.profile
            weeklyGain = FoodInput.text(profile?.weeklyGainGoalKG ?? profile?.weight.map { $0 * 0.0025 } ?? 0.2)
            trainingDays = profile?.trainingDaysPerWeek ?? 3
            dailySteps = String(profile?.usualDailySteps ?? 8_000)
        }
        .onChange(of: weeklyGain) { saved = false }
        .onChange(of: trainingDays) { saved = false }
        .onChange(of: dailySteps) { saved = false }
    }

    private func paceMessage(_ estimate: NutritionEstimate) -> some View {
        let inRange = estimate.requestedWeeklyGainKG >= estimate.recommendedWeeklyGainMinKG && estimate.requestedWeeklyGainKG <= estimate.recommendedWeeklyGainMaxKG
        return Text(inRange
                    ? "Your selected pace is within the research-based range of \(estimate.recommendedWeeklyGainMinKG.decimal)–\(estimate.recommendedWeeklyGainMaxKG.decimal) kg per week."
                    : "For your weight, the research-based starting range is \(estimate.recommendedWeeklyGainMinKG.decimal)–\(estimate.recommendedWeeklyGainMaxKG.decimal) kg per week. The calorie surplus is capped at the conservative upper range.")
            .font(.caption).foregroundStyle(inRange ? ErrdayTheme.secondary : .orange)
    }

    private func apply(_ estimate: NutritionEstimate) {
        guard let steps = Int(dailySteps), let gain = FoodInput.number(weeklyGain) else { return }
        saved = records.update { data in
            var profile = data.profile ?? PersonalProfile()
            profile.weeklyGainGoalKG = gain; profile.trainingDaysPerWeek = trainingDays; profile.usualDailySteps = steps
            profile.activityLevel = NutritionEstimate.resolvedActivityLevel(fallback: profile.activityLevel ?? "active", trainingDaysPerWeek: trainingDays, usualDailySteps: steps)
            data.profile = profile
            data.calorieGoal = estimate.targetCalories; data.proteinGoal = estimate.protein
            data.carbsGoal = estimate.carbs; data.fatGoal = estimate.fat
            data.fiberGoal = estimate.fiber; data.sugarGoal = estimate.freeSugarLimit; data.sodiumGoal = estimate.sodiumLimit
        }
        if saved { loadGoalFields(estimate) }
    }

    private func loadGoalFields(_ estimate: NutritionEstimate) {
        calories = FoodInput.text(estimate.targetCalories); protein = FoodInput.text(estimate.protein)
        carbs = FoodInput.text(estimate.carbs); fat = FoodInput.text(estimate.fat); fiber = FoodInput.text(estimate.fiber)
        sugar = FoodInput.text(estimate.freeSugarLimit); sodium = FoodInput.text(estimate.sodiumLimit)
    }

    private func saveManual() {
        saved = records.update { data in
            data.calorieGoal = FoodInput.number(calories); data.proteinGoal = FoodInput.number(protein); data.carbsGoal = FoodInput.number(carbs); data.fatGoal = FoodInput.number(fat)
            data.fiberGoal = FoodInput.number(fiber); data.sugarGoal = FoodInput.number(sugar); data.sodiumGoal = FoodInput.number(sodium)
        }
    }
}

struct OnboardingView: View {
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    @Environment(\.dismiss) private var dismiss
    @State private var step = 0
    @State private var name = ""
    @State private var age = ""
    @State private var height = ""
    @State private var weight = ""
    @State private var reference = "male"
    @State private var activity = "active"
    @State private var experience = "beginner"
    @State private var weeklyGain = "0.2"
    @State private var trainingDays = 3
    @State private var dailySteps = "8000"
    @State private var goal = "Build muscle"
    private let titles = ["About you", "Your body", "Your goal", "Daily activity", "Your starting targets", "Apple Health"]
    private var estimate: NutritionEstimate? {
        guard let age = Int(age), let height = FoodInput.number(height), let weight = FoodInput.number(weight) else { return nil }
        return NutritionEstimate.muscleGain(age: age, heightCM: height, weightKG: weight,
                                            metabolicReference: reference, activityLevel: activity,
                                            weeklyGainKG: FoodInput.number(weeklyGain),
                                            trainingDaysPerWeek: trainingDays,
                                            usualDailySteps: Int(dailySteps))
    }
    private var selectedCalories: Double? { estimate.map { goal == "Build muscle" ? $0.targetCalories : $0.maintenanceCalories } }
    private var selectedCarbs: Double? { guard let estimate, let selectedCalories else { return nil }; return max(0, (selectedCalories - estimate.protein * 4 - estimate.fat * 9) / 4) }
    private var canContinue: Bool {
        switch step { case 0: return !name.trimmingCharacters(in: .whitespaces).isEmpty && (Int(age).map { (18...100).contains($0) } ?? false)
        case 1: return (FoodInput.number(height).map { (120...240).contains($0) } ?? false) && (FoodInput.number(weight).map { (35...350).contains($0) } ?? false)
        case 3: return (FoodInput.number(weeklyGain).map { (0.05...1).contains($0) } ?? false) && (Int(dailySteps).map { (0...50_000).contains($0) } ?? false)
        default: return true }
    }
    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: titles[step], subtitle: "Step \(step + 1) of \(titles.count) · You can change this later")
                ProgressView(value: Double(step + 1), total: Double(titles.count))
                ErrdayCard { stepContent }
                Button(step == titles.count - 1 ? "Start using Errday" : "Continue") { if step < titles.count - 1 { step += 1 } else { finish() } }.buttonStyle(PrimaryButtonStyle()).disabled(!canContinue)
                if step > 0 { Button("Back") { step -= 1 } }
            }
        }.task { loadExisting() }
    }
    @ViewBuilder private var stepContent: some View {
        switch step {
        case 0:
            ErrdayTextField(label: "Name", placeholder: "Your name", text: $name)
            FoodNumberField(label: "Age", unit: "years", value: $age)
        case 1:
            HStack(alignment: .top, spacing: 12) {
                FoodNumberField(label: "Height", unit: "cm", value: $height)
                FoodNumberField(label: "Weight", unit: "kg", value: $weight)
            }
            ErrdaySegmentField(label: "Metabolic reference", selection: $reference) { Text("Male").tag("male"); Text("Female").tag("female") }
            Text("The Mifflin-St Jeor equation requires one of these two metabolic reference constants.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
        case 2:
            ErrdaySegmentField(label: "Goal", selection: $goal) { Text("Build").tag("Build muscle"); Text("Maintain").tag("Maintain"); Text("Health").tag("General health") }
            ErrdaySegmentField(label: "Training experience", selection: $experience) { Text("Beginner").tag("beginner"); Text("Intermediate").tag("intermediate"); Text("Advanced").tag("advanced") }
        case 3:
            FoodNumberField(label: "Target weight gain", unit: "kg/week", value: $weeklyGain)
            ErrdayStepperField(label: "Strength training", valueText: "\(trainingDays) days per week", value: $trainingDays, range: 0...7)
            FoodNumberField(label: "Usual daily steps", unit: "steps", value: $dailySteps)
            Text("Errday uses this as your normal week. Apple Health can add calories on days when your measured activity is higher.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
        case 4:
            if let estimate {
                LabeledContent("Calories", value: "\(selectedCalories?.whole ?? "—") kcal")
                LabeledContent("Protein", value: "\(estimate.protein.whole) g")
                LabeledContent("Carbs", value: "\(selectedCarbs?.whole ?? "—") g")
                LabeledContent("Fat", value: "\(estimate.fat.whole) g")
                LabeledContent("Fiber", value: "\(estimate.fiber.whole) g")
                LabeledContent("Sodium limit", value: "\(estimate.sodiumLimit.whole) mg")
                Text("Starting estimate: Mifflin-St Jeor maintenance, a 5–20% surplus based on your selected pace, and 1.8 g protein/kg. Review your 7-day weight trend after 2–3 weeks and adjust.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                Link("Evidence on muscle-gain nutrition", destination: URL(string: "https://pubmed.ncbi.nlm.nih.gov/31247944/")!)
                Link("Evidence on energy surplus", destination: URL(string: "https://pubmed.ncbi.nlm.nih.gov/37914977/")!)
            } else { Text("Complete the earlier questions to calculate your estimate.") }
        default:
            Text("Connect once to read the activity, sleep, heart, body, mobility and workout data you choose to share.")
            Button(health.hasRequested ? "Health Access Requested" : "Connect Apple Health") { Task { await health.connect() } }.buttonStyle(PrimaryButtonStyle(secondary: true)).disabled(health.hasRequested || !health.isAvailable || health.isLoading)
            if health.isLoading { ProgressView() }
        }
    }
    private func loadExisting() {
        guard let profile = records.data.profile else { return }
        name = profile.name; age = profile.age.map(String.init) ?? ""; height = FoodInput.text(profile.height); weight = FoodInput.text(profile.weight)
        reference = profile.metabolicReference ?? "male"; activity = profile.activityLevel ?? "active"; experience = profile.trainingExperience ?? "beginner"; goal = profile.goal
        weeklyGain = FoodInput.text(profile.weeklyGainGoalKG ?? profile.weight.map { $0 * 0.0025 } ?? 0.2)
        trainingDays = profile.trainingDaysPerWeek ?? 3; dailySteps = String(profile.usualDailySteps ?? 8_000)
    }
    private func finish() {
        guard let estimate else { return }
        if records.update({ data in
            var profile = data.profile ?? PersonalProfile(); profile.name = name; profile.age = Int(age); profile.height = FoodInput.number(height); profile.weight = FoodInput.number(weight); profile.metabolicReference = reference; profile.activityLevel = activity; profile.trainingExperience = experience; profile.goal = goal; profile.onboardingComplete = true
            profile.weeklyGainGoalKG = FoodInput.number(weeklyGain); profile.trainingDaysPerWeek = trainingDays; profile.usualDailySteps = Int(dailySteps)
            profile.activityLevel = NutritionEstimate.resolvedActivityLevel(fallback: activity, trainingDaysPerWeek: trainingDays, usualDailySteps: Int(dailySteps)); data.profile = profile
            data.calorieGoal = selectedCalories
            data.proteinGoal = estimate.protein; data.carbsGoal = selectedCarbs; data.fatGoal = estimate.fat
            data.fiberGoal = estimate.fiber; data.sugarGoal = estimate.freeSugarLimit; data.sodiumGoal = estimate.sodiumLimit
        }) { dismiss() }
    }
}
