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
    var accent: Color = ErrdayTheme.healthAccent

    private var sleepHours: Double? {
        health.sleepNights(days: 1, endingOn: date).last?.hours
    }

    private var checkIn: RestedCheckIn? { records.restedCheckIn(on: date) }

    private var estimate: ReadinessEstimate {
        ReadinessEstimate.evaluate(
            sleepHours: sleepHours,
            feeling: checkIn?.feeling,
            hrv: health.value("hrv", on: date),
            hrvBaseline: baseline(for: "hrv"),
            restingPulse: health.value("pulse", on: date),
            restingPulseBaseline: baseline(for: "pulse"),
            energy: checkIn?.energy, soreness: checkIn?.soreness,
            stress: checkIn?.stress, sleepQuality: checkIn?.sleepQuality
        )
    }

    var body: some View {
        ErrdayCard {
            HStack {
                Text(Calendar.current.isDateInToday(date) ? "Readiness today" : "Readiness · \(date.formatted(.dateTime.month(.abbreviated).day()))")
                    .font(.system(size: 14, weight: .semibold))
                Spacer()
                Image(systemName: "gauge.with.dots.needle.50percent")
                    .foregroundStyle(accent)
                    .accessibilityHidden(true)
            }
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(estimate.score.map(String.init) ?? "—")
                    .font(.system(size: 36, weight: .semibold, design: .rounded))
                if estimate.score != nil {
                    Text("/ 100")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(ErrdayTheme.secondary)
                }
                Spacer()
                Text(estimate.label)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(accent)
            }
            Text(trainingGuidance)
                .font(.system(size: 13))
                .foregroundStyle(ErrdayTheme.secondary)

            HStack {
                Label(sleepHours.map { "\($0.decimal) h sleep" } ?? "Sleep unavailable", systemImage: "bed.double")
                Spacer()
                Text(checkIn?.feeling.title ?? "No check-in")
            }
            .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)

            DisclosureGroup("Your signals") {
            VStack(alignment: .leading, spacing: 12) {
            ForEach(estimate.factors) { factor in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(factor.title)
                            .foregroundStyle(ErrdayTheme.text)
                        Text(factor.detail)
                            .font(.system(size: 11))
                            .foregroundStyle(ErrdayTheme.secondary)
                    }
                    Spacer()
                    Text("\(factor.score)/100")
                        .fontWeight(.semibold)
                        .foregroundStyle(ErrdayTheme.text)
                }
                .font(.system(size: 13))
                .accessibilityElement(children: .combine)
            }

            if !estimate.missingSignals.isEmpty {
                Text("Not counted: \(estimate.missingSignals.joined(separator: ", ")).")
                    .font(.system(size: 11))
                    .foregroundStyle(ErrdayTheme.secondary)
            }
            if let checkIn {
                if let energy = checkIn.energy { LabeledContent("Energy", value: "\(energy)/5") }
                if let soreness = checkIn.soreness { LabeledContent("Muscle soreness", value: "\(soreness)/5") }
                if let stress = checkIn.stress { LabeledContent("Stress", value: "\(stress)/5") }
                if let quality = checkIn.sleepQuality { LabeledContent("Sleep quality", value: "\(quality)/5") }
                if let note = checkIn.note, !note.isEmpty { Text(note).foregroundStyle(ErrdayTheme.secondary) }
            }
            Text("An experimental 0–100 wellness estimate, not a measured percentage of recovery or a validated performance test. Check-in 40%, sleep 35%, HRV 15%, resting pulse 10%; only available signals count. At least two signal types are needed. Heart references use the median of at least 7 prior days within 28 days. Watch HRV is daily SDNN, not a standardized overnight recovery test. Sleep stages are not scored. Strong fatigue or soreness limits the result.")
                .font(.caption).foregroundStyle(ErrdayTheme.secondary)
            Link("Research on sleep & athletes", destination: URL(string: "https://pubmed.ncbi.nlm.nih.gov/33144349/")!)
            Link("Research on personal recovery monitoring", destination: URL(string: "https://doi.org/10.1186/s40798-025-00958-y")!)
            }
            .font(.system(size: 12)).padding(.top, 8)
            }.font(.system(size: 13)).tint(accent)

            Button {
                checkInDate = RestedDate(date: date)
            } label: {
                HStack(spacing: 7) {
                    Image(systemName: "square.and.pencil")
                    Text(checkIn == nil ? "Daily check-in" : "Edit check-in")
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 11))
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(accent)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(checkIn == nil ? "Add rest check-in" : "Edit rest check-in")

        }
        .sheet(item: $checkInDate) { selected in
            RestedCheckInSheet(date: selected.date)
                .environment(\.errdayAccent, accent).tint(accent)
        }
    }

    private var trainingGuidance: String {
        if (checkIn?.feeling.rawValue ?? 5) <= 2 || checkIn?.energy == 1 || checkIn?.soreness == 5 {
            return "You reported significant fatigue or soreness. Consider rest or a lighter session; reassess during your warm-up."
        }
        guard let score = estimate.score, checkIn != nil else {
            return "Add how you feel to put your sleep and heart trends in context before training."
        }
        switch score {
        case 80...: return "Signals look favorable. Start with your warm-up and use how your sets feel to guide today's effort."
        case 60..<80: return "Use your warm-up to assess today's session. Keep extra effort optional."
        default: return "Recovery signals are lower today. Consider lighter loads, fewer sets or a rest day."
        }
    }

    private func baseline(for key: String) -> Double? {
        ReadinessEstimate.baseline(from: health.values(key, days: 29, endingOn: date), before: date)
    }
}

private struct RestedCheckInSheet: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @Environment(\.errdayAccent) private var accent
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true

    let date: Date
    @State private var feeling: RestedFeeling?
    @State private var note: String
    @State private var energy = 0
    @State private var soreness = 0
    @State private var stress = 0
    @State private var sleepQuality = 0

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
                                        .foregroundStyle(accent)
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
                    Text("A little more context").font(.headline)
                    rating("Energy", value: $energy, low: "Exhausted", high: "Full of energy")
                    rating("Muscle soreness", value: $soreness, low: "None", high: "Severe")
                    rating("Stress", value: $stress, low: "Low", high: "Very high")
                    rating("Sleep quality", value: $sleepQuality, low: "Poor", high: "Great")
                }
                ErrdayCard {
                    ErrdayTextArea(label: "Note (optional)", placeholder: "Anything affecting your rest?", text: $note)
                }
                SuccessActionButton(title: "Save check-in", successTitle: "Saved", isEnabled: feeling != nil,
                                    action: save, onCompletion: { dismiss() })
                Text("Extra ratings are optional. Your check-in stays on this iPhone and helps interpret your sleep and heart trends.")
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
            energy = existing.energy ?? 0; soreness = existing.soreness ?? 0
            stress = existing.stress ?? 0; sleepQuality = existing.sleepQuality ?? 0
        }
    }

    private func save() -> Bool {
        guard let feeling else { return false }
        return records.saveRestedCheckIn(feeling: feeling, note: note, on: date,
                                        energy: energy == 0 ? nil : energy, soreness: soreness == 0 ? nil : soreness,
                                        stress: stress == 0 ? nil : stress, sleepQuality: sleepQuality == 0 ? nil : sleepQuality)
    }

    private func rating(_ title: String, value: Binding<Int>, low: String, high: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title).font(.system(size: 14, weight: .semibold))
                Spacer()
                if value.wrappedValue > 0 {
                    Button("Clear") { value.wrappedValue = 0 }.font(.caption).foregroundStyle(accent)
                }
            }
            Picker(title, selection: value) {
                Text("—").tag(0)
                ForEach(1...5, id: \.self) { Text(String($0)).tag($0) }
            }.pickerStyle(.segmented)
            HStack { Text("1 · \(low)"); Spacer(); Text("5 · \(high)") }
                .font(.caption).foregroundStyle(ErrdayTheme.secondary)
        }.padding(.vertical, 4)
    }
}
