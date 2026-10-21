import Foundation
import HealthKit
import Observation

@MainActor @Observable
final class WatchHealthStore {
    private let health = HKHealthStore()
    var steps: Double?
    var activeCalories: Double?
    var heartRate: Double?
    var heartRateDate: Date?
    var error: String?
    var hasRequestedAccess = UserDefaults.standard.bool(forKey: "errday.watch.health.requested")
    private let identifiers: [HKQuantityTypeIdentifier] = [.stepCount, .activeEnergyBurned, .heartRate]

    func requestAccess() async {
        guard HKHealthStore.isHealthDataAvailable() else { error = "Health data is unavailable on this device."; return }
        do {
            let types = Set(identifiers.compactMap { HKQuantityType.quantityType(forIdentifier: $0) })
            try await health.requestAuthorization(toShare: [], read: types)
            hasRequestedAccess = true
            UserDefaults.standard.set(true, forKey: "errday.watch.health.requested")
            error = nil
            await refresh()
        } catch { self.error = "Health access could not be requested. Try again." }
    }

    func refresh() async {
        guard hasRequestedAccess else { return }
        async let steps = sum(.stepCount, unit: .count())
        async let calories = sum(.activeEnergyBurned, unit: .kilocalorie())
        self.steps = await steps
        activeCalories = await calories
        guard let type = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }
        let sample: HKQuantitySample? = await withCheckedContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: HKQuery.predicateForSamples(withStart: .now.addingTimeInterval(-86400), end: .now), limit: 1,
                                      sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]) { _, samples, _ in
                continuation.resume(returning: samples?.first as? HKQuantitySample)
            }
            health.execute(query)
        }
        heartRate = sample?.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
        heartRateDate = sample?.endDate
    }

    private func sum(_ identifier: HKQuantityTypeIdentifier, unit: HKUnit) async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: identifier) else { return nil }
        return await withCheckedContinuation { continuation in
            let predicate = HKQuery.predicateForSamples(withStart: Calendar.current.startOfDay(for: .now), end: .now, options: .strictStartDate)
            health.execute(HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
                continuation.resume(returning: result?.sumQuantity()?.doubleValue(for: unit))
            })
        }
    }
}
