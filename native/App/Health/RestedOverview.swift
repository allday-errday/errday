import ErrdayCore
import SwiftUI

private struct RestedDate: Identifiable {
    let date: Date
    var id: Date { Calendar.current.startOfDay(for: date) }
}

struct RestedOverview: View {
    @Environment(HealthStore.self) private var health
    @Environment(PersonalStore.self) private var records
    @State private var checkInDate: RestedDate?

    let date: Date

    private var sleepHours: Double? {
        health.sleepNights(days: 1, endingOn: date).last?.hours
    }

    private var checkIn: RestedCheckIn? { records.restedCheckIn(on: date) }

    private var assessment: RestedAssessment {
        RestedAssessment.evaluate(sleepHours: sleepHours, feeling: checkIn?.feeling)
    }

    var body: some View {
        ErrdayCard {
            HStack {
                Text(Calendar.current.isDateInToday(date) ? "Rested today" : "Rested · \(date.formatted(.dateTime.month(.abbreviated).day()))")
                    .font(.system(size: 14, weight: .semibold))
                Spacer()
                Image(systemName: "moon.zzz.fill")
                    .foregroundStyle(ErrdayTheme.healthAccent)
                    .accessibilityHidden(true)
            }
            Text(statusTitle)
                .font(.system(size: 28, weight: .semibold))
            Text(statusDetail)
                .font(.system(size: 13))
                .foregroundStyle(ErrdayTheme.secondary)

            Divider()
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("Last night")
                Spacer()
                Text(sleepHours.map { sleepText($0) } ?? "No sleep data")
                    .foregroundStyle(ErrdayTheme.text)
            }
            .font(.system(size: 13))
            .foregroundStyle(ErrdayTheme.secondary)

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("Your check-in")
                Spacer()
                Text(checkIn?.feeling.title ?? "Not added")
                    .foregroundStyle(ErrdayTheme.text)
            }
            .font(.system(size: 13))
            .foregroundStyle(ErrdayTheme.secondary)

            Button {
                checkInDate = RestedDate(date: date)
            } label: {
                HStack(spacing: 7) {
                    Image(systemName: "square.and.pencil")
                    Text(checkIn == nil ? "How do you feel?" : "Edit check-in")
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 11))
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(ErrdayTheme.healthAccent)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(checkIn == nil ? "Add rest check-in" : "Edit rest check-in")
        }
        .sheet(item: $checkInDate) { selected in
            RestedCheckInSheet(date: selected.date)
        }
    }

    private var statusTitle: String {
        switch assessment {
        case .noData: "No estimate yet"
        case .sleepOnly: "Add how you feel"
        case .checkInOnly: checkIn?.feeling.title ?? "Check-in added"
        case .wellRested: "Well rested"
        case .somewhatRested: "Somewhat rested"
        case .notFullyRested: "Not fully rested"
        case .mixedSignals: "Mixed signals"
        }
    }

    private var statusDetail: String {
        switch assessment {
        case .noData: "Connect sleep in Apple Health and add a check-in to see the full picture."
        case .sleepOnly: "Sleep duration alone can't tell how rested you feel. Add a quick check-in."
        case .checkInOnly: "Based on how you feel. No sleep measurement is available for this night."
        case .wellRested: "You feel rested and recorded at least 7 hours of sleep."
        case .somewhatRested: "Sleep duration looks sufficient, but you feel only okay."
        case .notFullyRested: "Your check-in or last night's sleep suggests you may need more rest."
        case .mixedSignals: "You feel rested, but recorded less than 7 hours of sleep."
        }
    }

    private func sleepText(_ hours: Double) -> String {
        let minutes = Int((hours * 60).rounded())
        return "\(minutes / 60)h \(minutes % 60)m"
    }
}

private struct RestedCheckInSheet: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true

    let date: Date
    @State private var feeling: RestedFeeling?
    @State private var note: String

    init(date: Date) {
        self.date = date
        _feeling = State(initialValue: nil)
        _note = State(initialValue: "")
    }

    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: "How do you feel?", subtitle: date.formatted(date: .complete, time: .omitted))
                ErrdayCard {
                    Text("How rested do you feel?")
                        .font(.system(size: 15, weight: .semibold))
                    ForEach(RestedFeeling.allCases) { option in
                        Button {
                            feeling = option
                            ErrdayHaptics.selection(isEnabled: hapticsEnabled)
                        } label: {
                            HStack {
                                Text(option.title)
                                Spacer()
                                if feeling == option {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(ErrdayTheme.healthAccent)
                                }
                            }
                            .font(.system(size: 15))
                            .foregroundStyle(ErrdayTheme.text)
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(feeling == option ? .isSelected : [])
                        if option != RestedFeeling.allCases.last { Divider() }
                    }
                }
                ErrdayCard {
                    ErrdayTextArea(label: "Note (optional)", placeholder: "Anything affecting your rest?", text: $note)
                }
                SuccessActionButton(title: "Save check-in", successTitle: "Saved", isEnabled: feeling != nil,
                                    action: save, onCompletion: { dismiss() })
                Text("This uses your selected feeling and last night's sleep. Your note is for your own record. It isn't a medical recovery score, and your check-in stays on this iPhone.")
                    .font(.footnote)
                    .foregroundStyle(ErrdayTheme.secondary)
            }
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
        .presentationDetents([.large])
        .onAppear {
            guard let existing = records.restedCheckIn(on: date) else { return }
            feeling = existing.feeling
            note = existing.note ?? ""
        }
    }

    private func save() -> Bool {
        guard let feeling else { return false }
        return records.saveRestedCheckIn(feeling: feeling, note: note, on: date)
    }
}
