import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

final class ErrdayScreenTimeMonitor: DeviceActivityMonitor {
    private let defaults = UserDefaults(suiteName: "group.com.errday.app") ?? .standard
    private let store = ManagedSettingsStore()
    private let selectionKey = "errday.focus.selection"
    private let limitReachedKey = "errday.focus.limitReached"

    override func intervalDidStart(for activity: DeviceActivityName) {
        guard activity == DeviceActivityName("errday.daily.focus") else { return }
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
        defaults.set(false, forKey: limitReachedKey)
    }

    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        guard
            activity == DeviceActivityName("errday.daily.focus"),
            event == DeviceActivityEvent.Name("errday.daily.focus.limit"),
            let data = defaults.data(forKey: selectionKey),
            let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else {
            return
        }

        store.shield.applications = selection.applicationTokens
        store.shield.applicationCategories = .specific(selection.categoryTokens)
        store.shield.webDomains = selection.webDomainTokens
        defaults.set(true, forKey: limitReachedKey)
    }
}
