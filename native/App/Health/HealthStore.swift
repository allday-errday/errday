import ErrdayCore
import HealthKit
import Observation

struct SleepNight: Identifiable {
    let date: Date; let hours: Double?; let stages: [String: Double]; let source: String?
    var id: Date { date }
}

struct HealthWorkoutEnergy: Identifiable {
    let id: UUID
    let date: Date
    let activity: HKWorkoutActivityType
    let duration: TimeInterval
    let activeEnergy: Double?
    let sourceName: String
    let sourceBundleIdentifier: String
    var endDate: Date { date.addingTimeInterval(duration) }

    var isFromStrava: Bool {
        sourceName.localizedCaseInsensitiveContains("strava")
            || sourceBundleIdentifier.localizedCaseInsensitiveContains("strava")
    }

    var isStrengthSession: Bool {
        switch activity {
        case .traditionalStrengthTraining, .functionalStrengthTraining, .mixedCardio:
            true
        default:
            false
        }
    }

    /// Net (above-resting) estimate. A normal multi-exercise resistance
    /// session is 3.5 MET, so its active portion is 3.5 - 1 resting MET.
    func estimatedActiveEnergy(weightKG: Double?) -> Double? {
        guard let weightKG, weightKG.isFinite, weightKG > 0,
              duration.isFinite, duration > 0 else { return nil }
        let activeMET: Double = activity == .traditionalStrengthTraining ? 2.5 : 4.0
        return activeMET * weightKG * duration / 3_600
    }

    /// Keeps a Watch value when it is plausible, while capping impossible
    /// outliers at vigorous resistance-training intensity (6 MET gross).
    func plausibleRecordedEnergy(weightKG: Double?) -> Double? {
        guard let activeEnergy, activeEnergy.isFinite, activeEnergy > 0 else { return nil }
        guard let weightKG, weightKG.isFinite, weightKG > 0,
              duration.isFinite, duration > 0 else { return activeEnergy }
        let vigorousActiveEnergy = 5.0 * weightKG * duration / 3_600
        return min(activeEnergy, vigorousActiveEnergy)
    }
}

struct WorkoutHeartRatePoint: Identifiable, Equatable {
    let id: UUID
    let date: Date
    let beatsPerMinute: Double
}

struct WorkoutHealthSnapshot: Equatable {
    var heartRates: [WorkoutHeartRatePoint] = []
    var activeCalories: Double?
    var sourceNames: [String] = []

    var latestHeartRate: Double? { heartRates.last?.beatsPerMinute }
    var averageHeartRate: Double? {
        guard !heartRates.isEmpty else { return nil }
        return heartRates.reduce(0) { $0 + $1.beatsPerMinute } / Double(heartRates.count)
    }
    var maximumHeartRate: Double? { heartRates.map(\.beatsPerMinute).max() }
}

@MainActor @Observable
final class HealthStore {
    private static let authorizationSetVersion = 5
    private static let entryMetadataKey = "ErrdayEntryID"
    private static let automaticRefreshInterval: TimeInterval = 5 * 60
    private static let dailyGymEnergyCap = 350.0
    private let store = HKHealthStore()
    private(set) var isLoading = false
    private(set) var hasRequested = UserDefaults.standard.integer(forKey: "errday.health.authorizationSetVersion") >= authorizationSetVersion
    private(set) var series: [String: [DailyMetric]] = [:]
    private(set) var sleep: [SleepNight] = []
    private(set) var recentData: [HealthDataSection: Int] = [:]
    private(set) var characteristics: [String: String] = [:]
    private(set) var workoutEnergy: [HealthWorkoutEnergy] = []
    private(set) var refreshedAt: Date?
    private var isSyncing = false
    private var pendingSync: PersonalData?
    var errorMessage: String?
    var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }
    var stepsToday: Double? { value("steps", days: 1) }
    var restingPulseToday: Double? { value("pulse", days: 1) }
    var stepDays: [DailyMetric] { Array((series["steps"] ?? []).dropLast().suffix(7)) }
    var stepAverage: Double? { WeeklySummary.average(stepDays) }
    var observedDays: Int { stepDays.filter { $0.value != nil }.count }
    func values(_ key: String, days: Int) -> [DailyMetric] { Array((series[key] ?? []).suffix(days)) }
    func value(_ key: String, days: Int) -> Double? { WeeklySummary.average(values(key, days: days)) }
    func values(_ key: String, days: Int, endingOn date: Date) -> [DailyMetric] {
        let end = Calendar.current.startOfDay(for: date)
        return Array((series[key] ?? []).filter { $0.date <= end }.suffix(days))
    }
    func value(_ key: String, days: Int, endingOn date: Date) -> Double? { WeeklySummary.average(values(key, days: days, endingOn: date)) }
    func display(_ key: String, days: Int, endingOn date: Date) -> String { value(key, days: days, endingOn: date).map { $0.decimal } ?? "—" }
    func value(_ key: String, on date: Date) -> Double? {
        series[key]?.first { Calendar.current.isDate($0.date, inSameDayAs: date) }?.value
    }

    /// Reads only measurements recorded during this workout. Values remain nil
    /// when Health access is unavailable or the Watch has not written samples.
    func workoutSnapshot(from start: Date, to end: Date = .now) async -> WorkoutHealthSnapshot {
        guard isAvailable, hasRequested, end > start else { return WorkoutHealthSnapshot() }
        async let heartResult = workoutHeartRates(from: start, to: end)
        async let energyResult = workoutActiveCalories(from: start, to: end)
        let heart = (try? await heartResult) ?? []
        let energy = (try? await energyResult) ?? []
        let sources = Set((heart.map(\.source) + energy.map(\.source)).filter { !$0.isEmpty })
        return WorkoutHealthSnapshot(
            heartRates: heart.map(\.point),
            activeCalories: energy.isEmpty ? nil : energy.reduce(0) { $0 + $1.value },
            sourceNames: sources.sorted()
        )
    }
    /// A transparent walking estimate from Health's walking/running distance and
    /// the latest known body mass. It is deliberately separate from active energy.
    func walkingCalories(on date: Date, weightKG: Double?) -> Double? {
        guard let kilometres = value("distance", on: date), kilometres > 0,
              let weightKG, weightKG > 0 else { return nil }
        return kilometres * weightKG * 0.53
    }
    /// Estimates active strength-training energy from recorded workout duration
    /// and body mass. This avoids treating noisy Watch heart-rate estimates as
    /// exact and avoids adding resting energy to the food target a second time.
    func gymCalories(on date: Date, weightKG: Double?) -> Double? {
        gymCalories(days: 1, endingOn: date, weightKG: weightKG)
    }
    /// The food target uses exactly the two estimates shown in the Activities
    /// card. Health's total active-energy value also contains background
    /// movement and would otherwise make the target much higher than the UI
    /// explains.
    func foodActivityCalories(on date: Date, weightKG: Double?) -> Double {
        let walking = walkingCalories(on: date, weightKG: weightKG) ?? 0
        let gym = gymCalories(on: date, weightKG: weightKG) ?? 0
        return min(max(0, walking + gym), 2_000)
    }
    func foodGoalAddition(on date: Date, weightKG: Double?, data: PersonalData) -> Double {
        data.calorieActivityAddition(foodActivityCalories(on: date, weightKG: weightKG))
    }
    func gymCalories(days: Int, endingOn date: Date, weightKG: Double?) -> Double? {
        let calendar = Calendar.current
        let end = calendar.startOfDay(for: date)
        let start = calendar.date(byAdding: .day, value: -(max(1, days) - 1), to: end) ?? end
        let sessions = workoutEnergy.filter {
            let day = calendar.startOfDay(for: $0.date)
            return day >= start && day <= end && $0.isStrengthSession
        }.sorted { $0.date < $1.date }
        var groups: [[HealthWorkoutEnergy]] = []
        for session in sessions {
            if let index = groups.indices.last,
               groups[index].contains(where: { Self.samePhysicalSession($0, session) }) {
                groups[index].append(session)
            } else {
                groups.append([session])
            }
        }
        let values = groups.compactMap { group -> (date: Date, energy: Double)? in
            // Strava can write a copy of the same activity into Apple Health.
            // Prefer the Watch/Errday copy when both are present in one group.
            let nonStrava = group.filter { !$0.isFromStrava }
            let preferred = nonStrava.isEmpty ? group : nonStrava
            let representative = preferred.max { $0.duration < $1.duration }
            let estimate = representative?.estimatedActiveEnergy(weightKG: weightKG)
            let recorded = preferred.compactMap { $0.plausibleRecordedEnergy(weightKG: weightKG) }
            let energy: Double?
            if recorded.isEmpty {
                energy = estimate
            } else if let estimate {
                energy = recorded.min { abs($0 - estimate) < abs($1 - estimate) }
            } else {
                energy = recorded.min()
            }
            guard let date = representative?.date, let energy else { return nil }
            return (date, energy)
        }
        guard !values.isEmpty else { return nil }
        let daily = Dictionary(grouping: values) { calendar.startOfDay(for: $0.date) }
        return daily.values.reduce(0) { total, sessions in
            total + min(Self.dailyGymEnergyCap, sessions.reduce(0) { $0 + $1.energy })
        }
    }
    private static func samePhysicalSession(_ lhs: HealthWorkoutEnergy, _ rhs: HealthWorkoutEnergy) -> Bool {
        let overlap = max(0, min(lhs.endDate, rhs.endDate).timeIntervalSince(max(lhs.date, rhs.date)))
        let shorter = min(lhs.duration, rhs.duration)
        let startsClose = abs(lhs.date.timeIntervalSince(rhs.date)) <= 15 * 60
        let endsClose = abs(lhs.endDate.timeIntervalSince(rhs.endDate)) <= 30 * 60
        return shorter > 0 && (overlap / shorter >= 0.25 || (startsClose && endsClose))
    }

    private struct WorkoutQuantityReading {
        let point: WorkoutHeartRatePoint
        let source: String
    }

    private struct WorkoutEnergyReading {
        let value: Double
        let source: String
    }

    private func workoutHeartRates(from start: Date, to end: Date) async throws -> [WorkoutQuantityReading] {
        let type = HKQuantityType(.heartRate)
        let unit = HKUnit.count().unitDivided(by: .minute())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [.strictStartDate])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let samples: [HKQuantitySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit,
                                      sortDescriptors: [sort]) { _, results, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: results as? [HKQuantitySample] ?? []) }
            }
            store.execute(query)
        }
        return samples.compactMap { sample in
            let value = sample.quantity.doubleValue(for: unit)
            guard value.isFinite, value > 0 else { return nil }
            return WorkoutQuantityReading(
                point: WorkoutHeartRatePoint(id: sample.uuid, date: sample.startDate, beatsPerMinute: value),
                source: sample.sourceRevision.source.name
            )
        }
    }

    private func workoutActiveCalories(from start: Date, to end: Date) async throws -> [WorkoutEnergyReading] {
        let type = HKQuantityType(.activeEnergyBurned)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [.strictStartDate])
        let samples: [HKQuantitySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit,
                                      sortDescriptors: nil) { _, results, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: results as? [HKQuantitySample] ?? []) }
            }
            store.execute(query)
        }
        return samples.compactMap { sample in
            let value = sample.quantity.doubleValue(for: .kilocalorie())
            guard value.isFinite, value > 0 else { return nil }
            return WorkoutEnergyReading(value: value, source: sample.sourceRevision.source.name)
        }
    }
    func display(_ key: String, days: Int) -> String { value(key, days: days).map { $0.decimal } ?? "—" }
    func sleepText(days: Int) -> String {
        let metrics = sleep.suffix(days).map { DailyMetric(date: $0.date, value: $0.hours) }
        guard let h = WeeklySummary.average(metrics) else { return "—" }
        let minutes = Int((h*60).rounded()); return "\(minutes/60)h \(minutes%60)m"
    }
    func sleepNights(days: Int, endingOn date: Date) -> [SleepNight] {
        let end = Calendar.current.startOfDay(for: date)
        return Array(sleep.filter { $0.date <= end }.suffix(days))
    }
    func sleepText(days: Int, endingOn date: Date) -> String {
        let metrics = sleepNights(days: days, endingOn: date).map { DailyMetric(date: $0.date, value: $0.hours) }
        guard let h = WeeklySummary.average(metrics) else { return "—" }
        let minutes = Int((h * 60).rounded()); return "\(minutes / 60)h \(minutes % 60)m"
    }
    func latest(_ key: String) -> DailyMetric? { series[key]?.last { $0.value != nil } }
    func connect() async {
        guard isAvailable, !isLoading else { return }
        isLoading = true; errorMessage = nil
        defer { isLoading = false }
        do {
            let types = requestedTypes
            let status = try await store.statusForAuthorizationRequest(toShare: writableTypes, read: types)
            if status == .shouldRequest { try await store.requestAuthorization(toShare: writableTypes, read: types) }
            hasRequested = true
            UserDefaults.standard.set(true, forKey: "errday.health.requested")
            UserDefaults.standard.set(Self.authorizationSetVersion, forKey: "errday.health.authorizationSetVersion")
            await readMetrics()
        } catch {
#if DEBUG
            print("Health authorization failed: \(error)")
#endif
            errorMessage = "Health data could not be loaded. Please try again."
        }
    }

    func sync(_ data: PersonalData) async {
        pendingSync = data
        guard hasRequested, !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }
        while let next = pendingSync {
            pendingSync = nil
            await syncNow(next)
        }
    }
    func refresh(force: Bool = false) async {
        guard hasRequested, !isLoading else { return }
        if !force, let refreshedAt,
           Date.now.timeIntervalSince(refreshedAt) < Self.automaticRefreshInterval { return }
        isLoading = true; defer { isLoading = false }
        await readMetrics()
    }
    private func readMetrics() async {
        errorMessage = nil
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let start = calendar.date(byAdding: .day, value: -29, to: today)!
        var next: [String: [DailyMetric]] = [:]
        var successfulQueries = 0
        var failures = 0

        do { sleep = try await nights(from: start, calendar: calendar); successfulQueries += 1 }
        catch { sleep = []; failures += 1 }
        workoutEnergy = (try? await workouts(from: start)) ?? []

        for metric in HealthMetricDefinition.all {
            do {
                next[metric.id] = try await daily(metric, from: start, calendar: calendar)
                successfulQueries += 1
            } catch {
                // HealthKit may return an error for an unavailable or declined
                // individual type. Keep that metric empty without turning an
                // otherwise useful Health overview into a global failure.
                next[metric.id] = emptyDays(from: start, calendar: calendar)
                failures += 1
            }
            // Publish each metric as soon as it arrives. Activity is near the
            // front of the catalogue, so calorie goals update without waiting
            // for every clinical and nutrition metric to finish loading.
            series[metric.id] = next[metric.id]
        }
        recentData = await readRecentData(from: start)
        characteristics = readCharacteristics()
        guard !Task.isCancelled else { return }
        series = next; refreshedAt = .now
        if failures > 0 && successfulQueries == 0 {
            errorMessage = "Apple Health could not be read. Unlock your iPhone and try again."
        }
    }
    private var requestedTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>(HealthKitCatalog.quantityTypes)
        types.formUnion(HealthKitCatalog.categoryTypes)
        types.formUnion(HealthKitCatalog.characteristicTypes)
        types.formUnion(readableClinicalTypes)
        types.formUnion(readableSpecialSampleTypes)
        return types
    }

    private var readableClinicalTypes: [HKClinicalType] {
        // Health Records authorization is unavailable in the iOS Simulator and
        // passing clinical types there raises an Objective-C exception before
        // Swift can handle it. The signed iPhone build carries the required
        // health-records entitlement and requests these types normally.
#if targetEnvironment(simulator)
        []
#else
        HealthKitCatalog.clinicalTypes
#endif
    }

    private var readableSpecialSampleTypes: [HKSampleType] {
#if targetEnvironment(simulator)
        // CDA documents belong to Health Records and are unavailable in the
        // simulator for the same reason as HKClinicalType values.
        HealthKitCatalog.specialSampleTypes.filter { !($0 is HKDocumentType) }
#else
        HealthKitCatalog.specialSampleTypes
#endif
    }

    private var writableTypes: Set<HKSampleType> {
        let quantities: [HKQuantityTypeIdentifier] = [
            .bodyMass, .dietaryWater, .dietaryEnergyConsumed, .dietaryProtein,
            .dietaryCarbohydrates, .dietaryFatTotal, .dietaryFiber, .dietarySugar, .dietarySodium
        ]
        return Set(quantities.map(HKQuantityType.init) + [HKObjectType.workoutType()])
    }

    private func syncNow(_ data: PersonalData) async {
        var current: [String: Data] = [:]
        for entry in data.weightEntries ?? [] { current["weight:\(entry.id)"] = encoded(entry) }
        for entry in data.hydration ?? [] { current["water:\(entry.id)"] = encoded(entry) }
        for entry in data.meals { current["meal:\(entry.id)"] = encoded(entry) }
        for entry in data.workouts where entry.finishedAt != nil { current["workout:\(entry.id)"] = encoded(entry) }

        let defaults = UserDefaults.standard
        let cacheKey = "errday.health.syncedEntries"
        var cached = defaults.dictionary(forKey: cacheKey) as? [String: String] ?? [:]
        var didChange = false
        for key in Set(cached.keys).union(current.keys) {
            guard let payload = current[key] else {
                await removeSamples(for: key); cached.removeValue(forKey: key); didChange = true; continue
            }
            let signature = payload.base64EncodedString()
            guard cached[key] != signature else { continue }
            await removeSamples(for: key)
            do {
                let samples = samples(for: key, data: data)
                if !samples.isEmpty { try await store.save(samples) }
                cached[key] = signature
                didChange = true
            } catch {
                errorMessage = "Some Errday entries could not be saved to Apple Health. Check Health permissions."
            }
        }
        defaults.set(cached, forKey: cacheKey)
        if didChange { await readMetrics() }
    }

    private func encoded<T: Encodable>(_ value: T) -> Data { (try? JSONEncoder().encode(value)) ?? Data() }

    private func samples(for key: String, data: PersonalData) -> [HKSample] {
        let metadata = [Self.entryMetadataKey: key]
        func quantity(_ identifier: HKQuantityTypeIdentifier, _ unit: HKUnit, _ value: Double, _ date: Date) -> HKQuantitySample? {
            guard value.isFinite, value > 0 else { return nil }
            return HKQuantitySample(type: HKQuantityType(identifier), quantity: HKQuantity(unit: unit, doubleValue: value), start: date, end: date.addingTimeInterval(1), metadata: metadata)
        }
        if key.hasPrefix("weight:"), let id = UUID(uuidString: String(key.dropFirst(7))), let entry = data.weightEntries?.first(where: { $0.id == id }) {
            return [quantity(.bodyMass, .gramUnit(with: .kilo), entry.kilograms, entry.date)].compactMap { $0 }
        }
        if key.hasPrefix("water:"), let id = UUID(uuidString: String(key.dropFirst(6))), let entry = data.hydration?.first(where: { $0.id == id }) {
            return [quantity(.dietaryWater, .literUnit(with: .milli), entry.millilitres, entry.date)].compactMap { $0 }
        }
        if key.hasPrefix("meal:"), let id = UUID(uuidString: String(key.dropFirst(5))), let entry = data.meals.first(where: { $0.id == id }) {
            let gram = HKUnit.gram(), mg = HKUnit.gramUnit(with: .milli), kcal = HKUnit.kilocalorie()
            return [
                quantity(.dietaryEnergyConsumed, kcal, entry.calories, entry.date),
                quantity(.dietaryProtein, gram, entry.protein, entry.date),
                quantity(.dietaryCarbohydrates, gram, entry.carbs, entry.date),
                quantity(.dietaryFatTotal, gram, entry.fat, entry.date),
                entry.fiber.flatMap { quantity(.dietaryFiber, gram, $0, entry.date) },
                entry.sugar.flatMap { quantity(.dietarySugar, gram, $0, entry.date) },
                entry.sodium.flatMap { quantity(.dietarySodium, mg, $0, entry.date) }
            ].compactMap { $0 }
        }
        if key.hasPrefix("workout:"), let id = UUID(uuidString: String(key.dropFirst(8))),
           let workout = data.workouts.first(where: { $0.id == id }), let end = workout.finishedAt, end > workout.startedAt {
            return [HKWorkout(activityType: .traditionalStrengthTraining, start: workout.startedAt, end: end,
                              duration: end.timeIntervalSince(workout.startedAt), totalEnergyBurned: nil,
                              totalDistance: nil, metadata: metadata)]
        }
        return []
    }

    private func removeSamples(for key: String) async {
        let predicate = HKQuery.predicateForObjects(withMetadataKey: Self.entryMetadataKey, allowedValues: [key])
        for type in writableTypes {
            let samples: [HKSample] = await withCheckedContinuation { continuation in
                let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, results, _ in
                    continuation.resume(returning: results ?? [])
                }
                store.execute(query)
            }
            guard !samples.isEmpty else { continue }
            try? await store.delete(samples)
        }
    }

    private func readRecentData(from start: Date) async -> [HealthDataSection: Int] {
        let displayedQuantityIDs = Set(HealthMetricDefinition.all.map { HKQuantityType($0.type).identifier })
        let additionalQuantities = HealthKitCatalog.quantityTypes.filter { !displayedQuantityIDs.contains($0.identifier) }
        let groups: [HealthDataSection: [HKSampleType]] = [
            .hearing: HealthKitCatalog.categoryTypes.filter { $0.identifier.localizedCaseInsensitiveContains("Audio") } + [HKObjectType.audiogramSampleType()],
            .sleep: HealthKitCatalog.categoryTypes.filter { $0.identifier.localizedCaseInsensitiveContains("Sleep") },
            .clinical: readableClinicalTypes,
            .other: HealthKitCatalog.categoryTypes + readableSpecialSampleTypes + additionalQuantities
        ]
        var result: [HealthDataSection: Int] = [:]
        for (section, types) in groups {
            var found = 0
            for type in types where await hasSample(type, from: start) { found += 1 }
            result[section] = found
        }
        return result
    }

    private func hasSample(_ type: HKSampleType, from start: Date) async -> Bool {
        await withCheckedContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: start, end: .now)
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                continuation.resume(returning: !(samples?.isEmpty ?? true))
            }
            store.execute(query)
        }
    }

    private func readCharacteristics() -> [String: String] {
        var values: [String: String] = [:]
        if let birthday = try? store.dateOfBirthComponents(), let year = birthday.year { values["Year of birth"] = String(year) }
        if let sex = try? store.biologicalSex().biologicalSex { values["Biological sex"] = String(describing: sex).replacingOccurrences(of: "HKBiologicalSex", with: "") }
        if let blood = try? store.bloodType().bloodType { values["Blood type"] = String(describing: blood).replacingOccurrences(of: "HKBloodType", with: "") }
        if let wheelchair = try? store.wheelchairUse().wheelchairUse { values["Wheelchair use"] = wheelchair == .yes ? "Yes" : "No" }
        return values
    }
    private func emptyDays(from start: Date, calendar: Calendar) -> [DailyMetric] {
        (0..<30).map { offset in
            DailyMetric(date: calendar.date(byAdding: .day, value: offset, to: start)!, value: nil)
        }
    }
    private func daily(_ metric: HealthMetricDefinition, from start: Date, calendar: Calendar) async throws -> [DailyMetric] {
        let quantityType = HKQuantityType(metric.type)
        if quantityType.aggregationStyle != .cumulative {
            return try await dailySamples(metric, type: quantityType, from: start, calendar: calendar)
        }
        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[DailyMetric], Error>) in
            let predicate = HKQuery.predicateForSamples(withStart: start, end: .now, options: [.strictStartDate])
            let query = HKStatisticsCollectionQuery(quantityType: quantityType, quantitySamplePredicate: predicate,
                options: .cumulativeSum, anchorDate: start, intervalComponents: DateComponents(day: 1))
            query.initialResultsHandler = { _, collection, error in
                if let error { continuation.resume(throwing: error); return }
                let values = (0..<30).map { offset -> DailyMetric in
                    let day = calendar.date(byAdding: .day, value: offset, to: start)!
                    let stats = collection?.statistics(for: day)
                    let value = stats?.sumQuantity()?.doubleValue(for: metric.unit).mapPercent(metric.suffix == "%")
                    return DailyMetric(date: day, value: value)
                }
                continuation.resume(returning: values)
            }
            store.execute(query)
        }
    }

    private func workouts(from start: Date) async throws -> [HealthWorkoutEnergy] {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[HealthWorkoutEnergy], Error>) in
            let predicate = HKQuery.predicateForSamples(withStart: start, end: .now)
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
            let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, error in
                if let error { continuation.resume(throwing: error); return }
                let workouts = (samples as? [HKWorkout] ?? []).map { workout in
                    HealthWorkoutEnergy(id: workout.uuid, date: workout.startDate, activity: workout.workoutActivityType,
                                        duration: workout.duration,
                                        activeEnergy: workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
                                        sourceName: workout.sourceRevision.source.name,
                                        sourceBundleIdentifier: workout.sourceRevision.source.bundleIdentifier)
                }
                continuation.resume(returning: workouts)
            }
            store.execute(query)
        }
    }

    /// Some discrete HealthKit types reject HKStatisticsCollectionQuery options by
    /// raising an Objective-C exception. A sample query works for every quantity
    /// type and lets Errday compute the per-day average without risking termination.
    private func dailySamples(_ metric: HealthMetricDefinition, type: HKQuantityType,
                              from start: Date, calendar: Calendar) async throws -> [DailyMetric] {
        let samples: [HKQuantitySample] = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[HKQuantitySample], Error>) in
            let predicate = HKQuery.predicateForSamples(withStart: start, end: .now, options: [.strictStartDate])
            let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit,
                                      sortDescriptors: nil) { _, results, error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume(returning: results as? [HKQuantitySample] ?? []) }
            }
            store.execute(query)
        }
        let grouped = Dictionary(grouping: samples) { calendar.startOfDay(for: $0.startDate) }
        return (0..<30).map { offset in
            let day = calendar.date(byAdding: .day, value: offset, to: start)!
            let values = (grouped[day] ?? []).map { $0.quantity.doubleValue(for: metric.unit) }.filter(\.isFinite)
            let average = values.isEmpty ? nil : values.reduce(0, +) / Double(values.count)
            return DailyMetric(date: day, value: average.map { $0.mapPercent(metric.suffix == "%") })
        }
    }
    private func nights(from start: Date, calendar: Calendar) async throws -> [SleepNight] {
        let from = calendar.date(byAdding: .hour, value: -12, to: start)!
        let samples: [HKCategorySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: HKCategoryType(.sleepAnalysis), predicate: HKQuery.predicateForSamples(withStart: from, end: .now), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, results, error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: results as? [HKCategorySample] ?? []) }
            }
            store.execute(query)
        }
        return (0..<30).map { offset in
            let day = calendar.date(byAdding: .day, value: offset, to: start)!
            let end = calendar.date(byAdding: .hour, value: 12, to: day)!
            let beginning = calendar.date(byAdding: .day, value: -1, to: end)!
            let relevant = samples.filter { $0.endDate > beginning && $0.startDate < end }
            // Select one recording source per night, then union intervals to prevent duplicate sleep.
            let sources = Dictionary(grouping: relevant) { $0.sourceRevision.source.bundleIdentifier }
            let asleepValues = [HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue, HKCategoryValueSleepAnalysis.asleepCore.rawValue, HKCategoryValueSleepAnalysis.asleepDeep.rawValue, HKCategoryValueSleepAnalysis.asleepREM.rawValue]
            func duration(_ items: [HKCategorySample]) -> Double {
                let intervals = items.map { (max($0.startDate, beginning), min($0.endDate, end)) }.sorted { $0.0 < $1.0 }
                var total: Double = 0; var current: (Date, Date)?
                for interval in intervals {
                    if let c = current, interval.0 <= c.1 { current = (c.0, max(c.1, interval.1)) }
                    else { if let c = current { total += c.1.timeIntervalSince(c.0) }; current = interval }
                }
                if let c = current { total += c.1.timeIntervalSince(c.0) }
                return total/3600
            }
            let chosen = sources.values.sorted { duration($0.filter { asleepValues.contains($0.value) }) > duration($1.filter { asleepValues.contains($0.value) }) }.first ?? []
            let asleep = chosen.filter { asleepValues.contains($0.value) }
            let definitions = ["Awake": HKCategoryValueSleepAnalysis.awake, "REM": .asleepREM, "Core": .asleepCore, "Deep": .asleepDeep]
            var stages: [String: Double] = [:]
            for (name, stage) in definitions {
                let matching = chosen.filter { $0.value == stage.rawValue }
                if !matching.isEmpty { stages[name] = duration(matching) }
            }
            return SleepNight(date: day, hours: asleep.isEmpty ? nil : duration(asleep), stages: stages, source: chosen.first?.sourceRevision.source.name)
        }
    }
}
private extension Double { func mapPercent(_ percent: Bool) -> Double { percent ? self*100 : self } }
