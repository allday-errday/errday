import Capacitor
import HealthKit

@objc(ErrdayHealthKitPlugin)
class ErrdayHealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "ErrdayHealthKitPlugin"
    let jsName = "ErrdayHealthKit"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readDailyMetrics", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health is not available on this device.")
            return
        }

        healthStore.requestAuthorization(toShare: [], read: readTypes()) { success, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }

            call.resolve(["authorized": success])
        }
    }

    @objc func readDailyMetrics(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health is not available on this device.")
            return
        }

        let dateString = call.getString("date") ?? Self.dateFormatter.string(from: Date())
        guard let bounds = dayBounds(for: dateString) else {
            call.reject("Invalid date. Expected YYYY-MM-DD.")
            return
        }

        let group = DispatchGroup()
        var steps: Double?
        var activeEnergy: Double?
        var exerciseMinutes: Double?
        var sleepHours: Double?

        group.enter()
        readQuantity(.stepCount, unit: .count(), start: bounds.start, end: bounds.end) { value in
            steps = value
            group.leave()
        }

        group.enter()
        readQuantity(.activeEnergyBurned, unit: .kilocalorie(), start: bounds.start, end: bounds.end) { value in
            activeEnergy = value
            group.leave()
        }

        group.enter()
        readQuantity(.appleExerciseTime, unit: .minute(), start: bounds.start, end: bounds.end) { value in
            exerciseMinutes = value
            group.leave()
        }

        group.enter()
        readSleepHours(start: bounds.start, end: bounds.end) { value in
            sleepHours = value
            group.leave()
        }

        group.notify(queue: .main) {
            call.resolve([
                "active_energy_kcal": self.jsonValue(activeEnergy.map { round($0 * 10) / 10 }),
                "date": dateString,
                "exercise_minutes": self.jsonValue(exerciseMinutes.map { Int($0.rounded()) }),
                "sleep_hours": self.jsonValue(sleepHours.map { round($0 * 100) / 100 }),
                "steps": self.jsonValue(steps.map { Int($0.rounded()) })
            ])
        }
    }

    private func readTypes() -> Set<HKObjectType> {
        var types = Set<HKObjectType>()

        if let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) {
            types.insert(stepType)
        }
        if let activeEnergyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
            types.insert(activeEnergyType)
        }
        if let exerciseType = HKObjectType.quantityType(forIdentifier: .appleExerciseTime) {
            types.insert(exerciseType)
        }
        if let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            types.insert(sleepType)
        }

        return types
    }

    private func readQuantity(
        _ identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        start: Date,
        end: Date,
        completion: @escaping (Double?) -> Void
    ) {
        guard let type = HKObjectType.quantityType(forIdentifier: identifier) else {
            completion(nil)
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
            if error != nil {
                completion(nil)
                return
            }

            completion(result?.sumQuantity()?.doubleValue(for: unit))
        }

        healthStore.execute(query)
    }

    private func readSleepHours(start: Date, end: Date, completion: @escaping (Double?) -> Void) {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            completion(nil)
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if error != nil {
                completion(nil)
                return
            }

            let asleepValues: Set<Int> = [
                HKCategoryValueSleepAnalysis.asleep.rawValue,
                3,
                4,
                5
            ]

            let seconds = (samples as? [HKCategorySample])?.reduce(0.0) { total, sample in
                guard asleepValues.contains(sample.value) else {
                    return total
                }

                let clippedStart = max(sample.startDate, start)
                let clippedEnd = min(sample.endDate, end)
                return total + max(0, clippedEnd.timeIntervalSince(clippedStart))
            } ?? 0

            completion(seconds > 0 ? seconds / 3600 : nil)
        }

        healthStore.execute(query)
    }

    private func dayBounds(for dateString: String) -> (start: Date, end: Date)? {
        guard let date = Self.dateFormatter.date(from: dateString) else {
            return nil
        }

        let start = Calendar.current.startOfDay(for: date)
        guard let end = Calendar.current.date(byAdding: .day, value: 1, to: start) else {
            return nil
        }

        return (start, end)
    }

    private func jsonValue<T>(_ value: T?) -> Any {
        guard let value = value else {
            return NSNull()
        }

        return value
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        return formatter
    }()
}
