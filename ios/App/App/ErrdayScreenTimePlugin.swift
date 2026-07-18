import Capacitor
import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings
import SwiftUI

@objc(ErrdayScreenTimePlugin)
class ErrdayScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "ErrdayScreenTimePlugin"
    let jsName = "ErrdayScreenTime"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentAppPicker", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "configureDailyLimit", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearLimit", returnType: CAPPluginReturnPromise)
    ]

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve(statusPayload())
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.reject("Screen Time controls require iOS 16 or later.")
            return
        }

        Task {
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                call.resolve(statusPayload())
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func presentAppPicker(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("Screen Time controls require iOS 15 or later.")
            return
        }
        guard AuthorizationCenter.shared.authorizationStatus == .approved else {
            call.reject("Allow Screen Time access before choosing apps.")
            return
        }
        guard let viewController = bridge?.viewController else {
            call.reject("Could not present the app picker.")
            return
        }

        let picker = FocusAppPicker(
            selection: FocusStore.selection(),
            onSave: { selection in
                FocusStore.save(selection: selection)
                call.resolve(self.statusPayload())
            },
            onCancel: {
                call.resolve(self.statusPayload())
            }
        )
        let host = UIHostingController(rootView: picker)
        host.modalPresentationStyle = .pageSheet
        host.isModalInPresentation = true
        viewController.present(host, animated: true)
    }

    @objc func configureDailyLimit(_ call: CAPPluginCall) {
        guard #available(iOS 15.0, *) else {
            call.reject("Screen Time controls require iOS 15 or later.")
            return
        }
        guard AuthorizationCenter.shared.authorizationStatus == .approved else {
            call.reject("Allow Screen Time access before setting a limit.")
            return
        }
        guard let selection = FocusStore.selection(), FocusStore.selectionCount(selection) > 0 else {
            call.reject("Choose at least one app or category first.")
            return
        }

        let minutes = min(max(call.getInt("minutes") ?? 30, 5), 720)
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )
        let event = DeviceActivityEvent(
            applications: selection.applicationTokens,
            categories: selection.categoryTokens,
            webDomains: selection.webDomainTokens,
            threshold: DateComponents(minute: minutes)
        )

        do {
            let center = DeviceActivityCenter()
            center.stopMonitoring([FocusStore.activityName])
            try center.startMonitoring(
                FocusStore.activityName,
                during: schedule,
                events: [FocusStore.eventName: event]
            )
            FocusStore.defaults.set(minutes, forKey: FocusStore.limitKey)
            FocusStore.defaults.set(false, forKey: FocusStore.limitReachedKey)
            call.resolve(statusPayload())
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func clearLimit(_ call: CAPPluginCall) {
        let center = DeviceActivityCenter()
        center.stopMonitoring([FocusStore.activityName])
        FocusStore.managedStore.shield.applications = nil
        FocusStore.managedStore.shield.applicationCategories = nil
        FocusStore.managedStore.shield.webDomains = nil
        FocusStore.defaults.removeObject(forKey: FocusStore.limitKey)
        FocusStore.defaults.set(false, forKey: FocusStore.limitReachedKey)
        call.resolve(statusPayload())
    }

    private func statusPayload() -> [String: Any] {
        let selection = FocusStore.selection()
        return [
            "authorized": AuthorizationCenter.shared.authorizationStatus == .approved,
            "configured": FocusStore.defaults.integer(forKey: FocusStore.limitKey) > 0,
            "limitMinutes": FocusStore.defaults.integer(forKey: FocusStore.limitKey),
            "limitReached": FocusStore.defaults.bool(forKey: FocusStore.limitReachedKey),
            "selectionCount": selection.map(FocusStore.selectionCount) ?? 0
        ]
    }
}

@available(iOS 15.0, *)
private struct FocusAppPicker: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selection: FamilyActivitySelection
    let onSave: (FamilyActivitySelection) -> Void
    let onCancel: () -> Void

    init(
        selection: FamilyActivitySelection?,
        onSave: @escaping (FamilyActivitySelection) -> Void,
        onCancel: @escaping () -> Void
    ) {
        _selection = State(initialValue: selection ?? FamilyActivitySelection())
        self.onSave = onSave
        self.onCancel = onCancel
    }

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Choose apps")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            onCancel()
                            dismiss()
                        }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            onSave(selection)
                            dismiss()
                        }
                    }
                }
        }
    }
}

enum FocusStore {
    static let suiteName = "group.com.errday.app"
    static let selectionKey = "errday.focus.selection"
    static let limitKey = "errday.focus.limitMinutes"
    static let limitReachedKey = "errday.focus.limitReached"
    static let activityName = DeviceActivityName("errday.daily.focus")
    static let eventName = DeviceActivityEvent.Name("errday.daily.focus.limit")
    static let managedStore = ManagedSettingsStore()
    static let defaults = UserDefaults(suiteName: suiteName) ?? .standard

    static func selection() -> FamilyActivitySelection? {
        guard let data = defaults.data(forKey: selectionKey) else { return nil }
        return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    static func save(selection: FamilyActivitySelection) {
        guard let data = try? JSONEncoder().encode(selection) else { return }
        defaults.set(data, forKey: selectionKey)
    }

    static func selectionCount(_ selection: FamilyActivitySelection) -> Int {
        selection.applicationTokens.count + selection.categoryTokens.count + selection.webDomainTokens.count
    }
}
