import HealthKit

enum HealthDataSection: String, CaseIterable, Identifiable {
    case activity = "Activity"
    case body = "Body Measurements"
    case hearing = "Hearing"
    case mobility = "Mobility"
    case nutrition = "Nutrition"
    case sleep = "Sleep"
    case vitals = "Vitals"
    case other = "Other Data"
    case clinical = "Clinical Records"

    var id: String { rawValue }
    var symbol: String {
        switch self {
        case .activity: "figure.walk"
        case .body: "scalemass"
        case .hearing: "ear"
        case .mobility: "figure.walk.motion"
        case .nutrition: "fork.knife"
        case .sleep: "moon.zzz"
        case .vitals: "waveform.path.ecg"
        case .other: "square.grid.2x2"
        case .clinical: "cross.case"
        }
    }
}

struct HealthMetricDefinition: Identifiable {
    let id: String
    let title: String
    let section: HealthDataSection
    let type: HKQuantityTypeIdentifier
    let unit: HKUnit
    let suffix: String
    let cumulative: Bool

    static let all: [Self] = {
        var result: [Self] = []
        func add(_ id: String, _ title: String, _ section: HealthDataSection, _ type: HKQuantityTypeIdentifier, _ unit: HKUnit, _ suffix: String, _ cumulative: Bool = false) {
            result.append(.init(id: id, title: title, section: section, type: type, unit: unit, suffix: suffix, cumulative: cumulative))
        }

        let count = HKUnit.count(), kcal = HKUnit.kilocalorie(), minute = HKUnit.minute()
        let bpm = HKUnit.count().unitDivided(by: .minute()), percent = HKUnit.percent()
        let kg = HKUnit.gramUnit(with: .kilo), gram = HKUnit.gram(), mg = HKUnit.gramUnit(with: .milli)
        let metre = HKUnit.meter(), km = HKUnit.meterUnit(with: .kilo), cm = HKUnit.meterUnit(with: .centi)
        let speed = metre.unitDivided(by: .second())

        add("steps", "Steps", .activity, .stepCount, count, "", true)
        add("active", "Active energy", .activity, .activeEnergyBurned, kcal, "kcal", true)
        add("restEnergy", "Resting energy", .activity, .basalEnergyBurned, kcal, "kcal", true)
        add("distance", "Walking + running distance", .activity, .distanceWalkingRunning, km, "km", true)
        add("cyclingDistance", "Cycling distance", .activity, .distanceCycling, km, "km", true)
        add("swimmingDistance", "Swimming distance", .activity, .distanceSwimming, metre, "m", true)
        add("wheelchairDistance", "Wheelchair distance", .activity, .distanceWheelchair, km, "km", true)
        add("exercise", "Exercise time", .activity, .appleExerciseTime, minute, "min", true)
        add("moveTime", "Move time", .activity, .appleMoveTime, minute, "min", true)
        add("stand", "Stand time", .activity, .appleStandTime, minute, "min", true)
        add("flights", "Flights climbed", .activity, .flightsClimbed, count, "", true)
        add("pushes", "Wheelchair pushes", .activity, .pushCount, count, "", true)
        add("swimStrokes", "Swimming strokes", .activity, .swimmingStrokeCount, count, "", true)
        add("cyclingPower", "Cycling power", .activity, .cyclingPower, HKUnit.watt(), "W")
        add("cyclingSpeed", "Cycling speed", .activity, .cyclingSpeed, speed, "m/s")
        add("cyclingCadence", "Cycling cadence", .activity, .cyclingCadence, bpm, "rpm")

        add("weight", "Weight", .body, .bodyMass, kg, "kg")
        add("height", "Height", .body, .height, cm, "cm")
        add("fat", "Body fat", .body, .bodyFatPercentage, percent, "%")
        add("lean", "Lean body mass", .body, .leanBodyMass, kg, "kg")
        add("bmi", "BMI", .body, .bodyMassIndex, count, "")
        add("waist", "Waist circumference", .body, .waistCircumference, cm, "cm")
        add("wristTemperature", "Sleeping wrist temperature", .body, .appleSleepingWristTemperature, .degreeCelsius(), "°C")

        add("environmentNoise", "Environmental audio exposure", .hearing, .environmentalAudioExposure, HKUnit(from: "dBASPL"), "dB(A)")
        add("headphoneNoise", "Headphone audio exposure", .hearing, .headphoneAudioExposure, HKUnit(from: "dBASPL"), "dB(A)")
        add("soundReduction", "Environmental sound reduction", .hearing, .environmentalSoundReduction, HKUnit(from: "dBASPL"), "dB(A)")

        add("walkSpeed", "Walking speed", .mobility, .walkingSpeed, speed, "m/s")
        add("stepLength", "Walking step length", .mobility, .walkingStepLength, cm, "cm")
        add("asymmetry", "Walking asymmetry", .mobility, .walkingAsymmetryPercentage, percent, "%")
        add("doubleSupport", "Double support time", .mobility, .walkingDoubleSupportPercentage, percent, "%")
        add("steadiness", "Walking steadiness", .mobility, .appleWalkingSteadiness, percent, "%")
        add("sixMinuteWalk", "Six-minute walk distance", .mobility, .sixMinuteWalkTestDistance, metre, "m")
        add("stairUp", "Stair ascent speed", .mobility, .stairAscentSpeed, speed, "m/s")
        add("stairDown", "Stair descent speed", .mobility, .stairDescentSpeed, speed, "m/s")
        add("runningSpeed", "Running speed", .mobility, .runningSpeed, speed, "m/s")
        add("runningPower", "Running power", .mobility, .runningPower, .watt(), "W")
        add("runningStride", "Running stride length", .mobility, .runningStrideLength, metre, "m")
        add("groundContact", "Running ground contact time", .mobility, .runningGroundContactTime, .secondUnit(with: .milli), "ms")
        add("verticalOscillation", "Running vertical oscillation", .mobility, .runningVerticalOscillation, cm, "cm")

        add("dietEnergy", "Dietary energy", .nutrition, .dietaryEnergyConsumed, kcal, "kcal", true)
        add("protein", "Protein", .nutrition, .dietaryProtein, gram, "g", true)
        add("carbs", "Carbohydrates", .nutrition, .dietaryCarbohydrates, gram, "g", true)
        add("fatTotal", "Total fat", .nutrition, .dietaryFatTotal, gram, "g", true)
        add("fatSaturated", "Saturated fat", .nutrition, .dietaryFatSaturated, gram, "g", true)
        add("fatMono", "Monounsaturated fat", .nutrition, .dietaryFatMonounsaturated, gram, "g", true)
        add("fatPoly", "Polyunsaturated fat", .nutrition, .dietaryFatPolyunsaturated, gram, "g", true)
        add("sugar", "Sugar", .nutrition, .dietarySugar, gram, "g", true)
        add("fiber", "Fibre", .nutrition, .dietaryFiber, gram, "g", true)
        add("water", "Water", .nutrition, .dietaryWater, .literUnit(with: .milli), "ml", true)
        add("sodium", "Sodium", .nutrition, .dietarySodium, mg, "mg", true)
        add("cholesterol", "Cholesterol", .nutrition, .dietaryCholesterol, mg, "mg", true)
        add("caffeine", "Caffeine", .nutrition, .dietaryCaffeine, mg, "mg", true)
        add("calcium", "Calcium", .nutrition, .dietaryCalcium, mg, "mg", true)
        add("iron", "Iron", .nutrition, .dietaryIron, mg, "mg", true)
        add("magnesium", "Magnesium", .nutrition, .dietaryMagnesium, mg, "mg", true)
        add("potassium", "Potassium", .nutrition, .dietaryPotassium, mg, "mg", true)
        add("zinc", "Zinc", .nutrition, .dietaryZinc, mg, "mg", true)
        add("vitaminA", "Vitamin A", .nutrition, .dietaryVitaminA, mg, "mg", true)
        add("vitaminB6", "Vitamin B6", .nutrition, .dietaryVitaminB6, mg, "mg", true)
        add("vitaminB12", "Vitamin B12", .nutrition, .dietaryVitaminB12, mg, "mg", true)
        add("vitaminC", "Vitamin C", .nutrition, .dietaryVitaminC, mg, "mg", true)
        add("vitaminD", "Vitamin D", .nutrition, .dietaryVitaminD, mg, "mg", true)
        add("vitaminE", "Vitamin E", .nutrition, .dietaryVitaminE, mg, "mg", true)
        add("vitaminK", "Vitamin K", .nutrition, .dietaryVitaminK, mg, "mg", true)
        add("folate", "Folate", .nutrition, .dietaryFolate, mg, "mg", true)

        add("heartRate", "Heart rate", .vitals, .heartRate, bpm, "bpm")
        add("pulse", "Resting heart rate", .vitals, .restingHeartRate, bpm, "bpm")
        add("walkingPulse", "Walking heart rate", .vitals, .walkingHeartRateAverage, bpm, "bpm")
        add("heartRecovery", "One-minute heart rate recovery", .vitals, .heartRateRecoveryOneMinute, bpm, "bpm")
        add("hrv", "Heart rate variability", .vitals, .heartRateVariabilitySDNN, .secondUnit(with: .milli), "ms")
        add("afibBurden", "Atrial fibrillation burden", .vitals, .atrialFibrillationBurden, percent, "%")
        add("vo2", "Cardio fitness", .vitals, .vo2Max, HKUnit(from: "ml/kg*min"), "ml/kg/min")
        add("respiratory", "Respiratory rate", .vitals, .respiratoryRate, bpm, "/min")
        add("oxygen", "Blood oxygen", .vitals, .oxygenSaturation, percent, "%")
        add("bodyTemperature", "Body temperature", .vitals, .bodyTemperature, .degreeCelsius(), "°C")
        add("basalTemperature", "Basal body temperature", .vitals, .basalBodyTemperature, .degreeCelsius(), "°C")
        add("bloodGlucose", "Blood glucose", .vitals, .bloodGlucose, HKUnit(from: "mg/dL"), "mg/dL")
        add("bloodPressureSystolic", "Systolic blood pressure", .vitals, .bloodPressureSystolic, .millimeterOfMercury(), "mmHg")
        add("bloodPressureDiastolic", "Diastolic blood pressure", .vitals, .bloodPressureDiastolic, .millimeterOfMercury(), "mmHg")
        add("fev1", "Forced expiratory volume", .vitals, .forcedExpiratoryVolume1, .liter(), "L")
        add("fvc", "Forced vital capacity", .vitals, .forcedVitalCapacity, .liter(), "L")
        add("peakFlow", "Peak expiratory flow", .vitals, .peakExpiratoryFlowRate, .liter().unitDivided(by: .minute()), "L/min")
        add("falls", "Falls", .vitals, .numberOfTimesFallen, count, "", true)
        add("inhaler", "Inhaler use", .vitals, .inhalerUsage, count, " puffs", true)

        add("daylight", "Time in daylight", .other, .timeInDaylight, minute, "min", true)
        add("uv", "UV exposure", .other, .uvExposure, count, "", true)
        add("alcohol", "Alcoholic beverages", .other, .numberOfAlcoholicBeverages, count, "", true)
        add("bloodAlcohol", "Blood alcohol content", .other, .bloodAlcoholContent, percent, "%")
        add("underwaterDepth", "Underwater depth", .other, .underwaterDepth, metre, "m")
        add("waterTemperature", "Water temperature", .other, .waterTemperature, .degreeCelsius(), "°C")
        return result
    }()
}

enum HealthKitCatalog {
    // Keep the permission set exhaustive for the HealthKit SDK available on the device.
    // Raw identifiers let older iOS versions ignore newer types instead of preventing launch.
    static let quantityNames = [
        "AppleSleepingWristTemperature", "BodyFatPercentage", "BodyMass", "BodyMassIndex", "ElectrodermalActivity", "Height", "LeanBodyMass", "WaistCircumference",
        "ActiveEnergyBurned", "AppleExerciseTime", "AppleMoveTime", "AppleStandTime", "BasalEnergyBurned", "CrossCountrySkiingSpeed", "CyclingCadence", "CyclingFunctionalThresholdPower", "CyclingPower", "CyclingSpeed",
        "DistanceCrossCountrySkiing", "DistanceCycling", "DistanceDownhillSnowSports", "DistancePaddleSports", "DistanceRowing", "DistanceSkatingSports", "DistanceSwimming", "DistanceWalkingRunning", "DistanceWheelchair",
        "EstimatedWorkoutEffortScore", "FlightsClimbed", "NikeFuel", "PaddleSportsSpeed", "PhysicalEffort", "PushCount", "RowingSpeed", "RunningPower", "RunningSpeed", "StepCount", "SwimmingStrokeCount", "UnderwaterDepth", "WorkoutEffortScore",
        "EnvironmentalAudioExposure", "EnvironmentalSoundReduction", "HeadphoneAudioExposure",
        "AtrialFibrillationBurden", "HeartRate", "HeartRateRecoveryOneMinute", "HeartRateVariabilityRMSSD", "HeartRateVariabilitySDNN", "PeripheralPerfusionIndex", "RestingHeartRate", "VO2Max", "WalkingHeartRateAverage",
        "AppleWalkingSteadiness", "RunningGroundContactTime", "RunningStrideLength", "RunningVerticalOscillation", "SixMinuteWalkTestDistance", "StairAscentSpeed", "StairDescentSpeed", "WalkingAsymmetryPercentage", "WalkingDoubleSupportPercentage", "WalkingSpeed", "WalkingStepLength",
        "DietaryBiotin", "DietaryCaffeine", "DietaryCalcium", "DietaryCarbohydrates", "DietaryChloride", "DietaryCholesterol", "DietaryChromium", "DietaryCopper", "DietaryEnergyConsumed", "DietaryFatMonounsaturated", "DietaryFatPolyunsaturated", "DietaryFatSaturated", "DietaryFatTotal", "DietaryFiber", "DietaryFolate", "DietaryIodine", "DietaryIron", "DietaryMagnesium", "DietaryManganese", "DietaryMolybdenum", "DietaryNiacin", "DietaryPantothenicAcid", "DietaryPhosphorus", "DietaryPotassium", "DietaryProtein", "DietaryRiboflavin", "DietarySelenium", "DietarySodium", "DietarySugar", "DietaryThiamin", "DietaryVitaminA", "DietaryVitaminB12", "DietaryVitaminB6", "DietaryVitaminC", "DietaryVitaminD", "DietaryVitaminE", "DietaryVitaminK", "DietaryWater", "DietaryZinc",
        "BloodAlcoholContent", "BloodPressureDiastolic", "BloodPressureSystolic", "InsulinDelivery", "NumberOfAlcoholicBeverages", "NumberOfTimesFallen", "TimeInDaylight", "UVExposure", "WaterTemperature",
        "BasalBodyTemperature", "AppleSleepingBreathingDisturbances", "ForcedExpiratoryVolume1", "ForcedVitalCapacity", "InhalerUsage", "OxygenSaturation", "PeakExpiratoryFlowRate", "RespiratoryRate", "BloodGlucose", "BodyTemperature"
    ]

    static var quantityTypes: [HKQuantityType] {
        quantityNames.compactMap {
            HKObjectType.quantityType(forIdentifier: .init(rawValue: "HKQuantityTypeIdentifier" + $0))
        }
    }

    static let categoryNames = [
        "AppleStandHour", "EnvironmentalAudioExposureEvent", "HeadphoneAudioExposureEvent", "HighHeartRateEvent",
        "HypertensionEvent", "IrregularHeartRhythmEvent", "LowCardioFitnessEvent", "LowHeartRateEvent", "MindfulSession",
        "AppleWalkingSteadinessEvent", "HandwashingEvent", "ToothbrushingEvent", "BleedingAfterMenopause",
        "BleedingAfterPregnancy", "BleedingDuringPregnancy", "CervicalMucusQuality", "Contraceptive",
        "InfrequentMenstrualCycles", "IntermenstrualBleeding", "IrregularMenstrualCycles", "Lactation", "MenopausalState",
        "MenstrualFlow", "OvulationTestResult", "PersistentIntermenstrualBleeding", "Pregnancy", "PregnancyTestResult",
        "ProgesteroneTestResult", "ProlongedMenstrualPeriods", "SexualActivity", "SleepApneaEvent", "SleepAnalysis",
        "AbdominalCramps", "Acne", "AppetiteChanges", "BladderIncontinence", "Bloating", "BreastPain",
        "ChestTightnessOrPain", "Chills", "Constipation", "Coughing", "Diarrhea", "Dizziness", "DrySkin", "Fainting",
        "Fatigue", "Fever", "GeneralizedBodyAche", "HairLoss", "Headache", "Heartburn", "HotFlashes", "LossOfSmell",
        "LossOfTaste", "LowerBackPain", "MemoryLapse", "MoodChanges", "Nausea", "NightSweats", "PelvicPain",
        "RapidPoundingOrFlutteringHeartbeat", "RunnyNose", "ShortnessOfBreath", "SinusCongestion", "SkippedHeartbeat",
        "SleepChanges", "SoreThroat", "VaginalDryness", "Vomiting", "Wheezing"
    ]

    static var categoryTypes: [HKCategoryType] {
        categoryNames.compactMap { HKObjectType.categoryType(forIdentifier: .init(rawValue: "HKCategoryTypeIdentifier" + $0)) }
    }

    static var characteristicTypes: [HKCharacteristicType] {
        [HKCharacteristicTypeIdentifier.biologicalSex, .bloodType, .dateOfBirth, .fitzpatrickSkinType, .wheelchairUse, .activityMoveMode]
            .compactMap { HKObjectType.characteristicType(forIdentifier: $0) }
    }

    static var clinicalTypes: [HKClinicalType] {
        [HKClinicalTypeIdentifier.allergyRecord, .clinicalNoteRecord, .conditionRecord, .immunizationRecord,
         .labResultRecord, .medicationRecord, .procedureRecord, .vitalSignRecord, .coverageRecord]
            .compactMap { HKObjectType.clinicalType(forIdentifier: $0) }
    }

    static var specialSampleTypes: [HKSampleType] {
        var types: [HKSampleType] = [HKObjectType.workoutType(), HKObjectType.audiogramSampleType(),
                                     HKObjectType.electrocardiogramType(), HKSeriesType.workoutRoute(),
                                     HKSeriesType.heartbeat()]
        if let cda = HKObjectType.documentType(forIdentifier: .CDA) { types.append(cda) }
        if #available(iOS 18.0, *) { types.append(HKObjectType.stateOfMindType()) }
        return types
    }
}
