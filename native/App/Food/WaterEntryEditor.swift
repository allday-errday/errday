import ErrdayCore
import SwiftUI

struct WaterEntryEditor: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var amount: String
    @State private var time: Date
    @State private var saveFailed = false

    let entry: HydrationEntry

    init(entry: HydrationEntry) {
        self.entry = entry
        _amount = State(initialValue: entry.millilitres.decimal)
        _time = State(initialValue: entry.date)
    }

    private var editedDate: Date? {
        let components = Calendar.current.dateComponents([.hour, .minute], from: time)
        guard let hour = components.hour, let minute = components.minute else { return nil }
        return Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: entry.date)
    }

    private var canSave: Bool {
        guard let value = FoodInput.number(amount), value.isFinite, value > 0, value <= 10_000,
              let editedDate, editedDate <= .now.addingTimeInterval(300) else { return false }
        return true
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                ErrdayCard {
                    ErrdayTextField(label: "Amount", placeholder: "250", unit: "mL",
                                    keyboard: .decimalPad, text: $amount)
                    HStack {
                        Text("Tracked time")
                            .font(.system(size: 14))
                        Spacer()
                        DatePicker("Tracked time", selection: $time, displayedComponents: .hourAndMinute)
                            .labelsHidden()
                            .datePickerStyle(.compact)
                    }
                    .frame(minHeight: 44)
                    if saveFailed {
                        Text("Could not save this change. Please try again.")
                            .font(.system(size: 12))
                            .foregroundStyle(.orange)
                    }
                }
                .padding(20)
            }
            .errdayBackground()
            .foregroundStyle(ErrdayTheme.text)
            .navigationTitle("Edit water")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).disabled(!canSave)
                }
            }
        }
        .errdayKeyboardDone()
        .presentationDetents([.medium, .large])
    }

    private func save() {
        guard canSave, let value = FoodInput.number(amount), let editedDate else { return }
        var updated = entry
        updated.millilitres = value
        updated.date = editedDate
        guard records.updateWater(updated) else { saveFailed = true; return }
        ErrdayHaptics.success(isEnabled: hapticsEnabled)
        Task { await RoutineReminderScheduler.refreshIfAuthorized(for: records.data) }
        dismiss()
    }
}
