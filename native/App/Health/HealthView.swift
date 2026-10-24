import SwiftUI
import Charts
import ErrdayCore

private enum HealthDurationText {
    static func text(hours: Double) -> String {
        let minutes = max(0, Int((hours * 60).rounded()))
        guard minutes >= 60 else { return "\(minutes) min" }
        let remainingMinutes = minutes % 60
        return remainingMinutes == 0
            ? "\(minutes / 60) hr"
            : "\(minutes / 60) hr \(remainingMinutes) min"
    }
}

struct HealthView: View {
    @Binding var selectedDate: Date
    @Environment(HealthStore.self) private var health
    @Environment(PersonalStore.self) private var records
    @State private var days = 1
    @State private var logWeight = false
    var body: some View {
        ErrdayPage {
            Picker("Range", selection: $days) { Text("Day").tag(1); Text("Week").tag(7); Text("Month").tag(30) }.pickerStyle(.segmented)
            RestedOverview(date: selectedDate)
            if !health.hasRequested || health.isLoading || health.errorMessage != nil {
                ErrdayCard {
                    if !health.hasRequested {
                        HStack(spacing: 12) {
                            FigmaIcon(asset: "f9871")
                            Text("Connect Apple Health").font(.system(size: 14)).foregroundStyle(ErrdayTheme.healthAccent)
                        }
                        Button("Connect Apple Health") { Task { await health.connect() } }
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(!health.isAvailable || health.isLoading)
                    }
                    if health.isLoading { ProgressView("Loading metrics …") }
                    if let error = health.errorMessage {
                        Text(error).font(.caption)
                        Button("Try Again") { Task { await health.refresh(force: true) } }
                    }
                }
            }
            VStack(spacing: 12) {
                detailHeading("Sleep") { SleepDetailView(days: days, endDate: selectedDate) }
                ErrdayCard {
                    Text(days == 1 ? "Last night" : "Average per recorded night").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                    Text(health.sleepText(days: days, endingOn: selectedDate)).font(.system(size: 32, weight: .semibold))
                    if days > 1 { MetricChart(values: health.sleepNights(days: days, endingOn: selectedDate).map { DailyMetric(date: $0.date, value: $0.hours) }, unit: "h") }
                    else { Text(stageText).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary) }
                }
            }
            VStack(spacing: 12) {
                detailHeading("Activity") { HealthMetricList(title: "Activity", keys: ["steps", "distance", "exercise", "stand", "flights"], days: days, endDate: selectedDate) }
                HStack(spacing: 12) {
                    MetricCard(title: days == 1 ? "Steps" : "Steps avg / day", value: health.value("steps", days: days, endingOn: selectedDate)?.whole ?? "—", note: "\(health.display("distance", days: days, endingOn: selectedDate)) km", icon: "87442")
                    MetricCard(title: days == 1 ? "Gym session" : "Gym energy", value: gymCalories.map { $0.whole } ?? "—", note: gymCalories == nil ? "No session" : "kcal burned", icon: "sf:dumbbell.fill")
                }
                ErrdayCard {
                    Text(days == 1 ? "Walking energy" : "Walking energy avg / day").font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                    Text(walkingCalories.map { "\($0.whole) kcal" } ?? "—").font(.system(size: 28, weight: .semibold))
                    Text("Estimated from walking/running distance and your latest weight.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                }
            }
            VStack(spacing: 12) {
                detailHeading("Body & heart") { HealthMetricList(title: "Body & heart", keys: ["weight", "fat", "lean", "bmi", "heartRate", "pulse", "hrv", "walkingPulse", "vo2", "respiratory", "oxygen"], days: days, endDate: selectedDate) }
                ErrdayCard {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Weight log").font(.headline)
                            if let latest = records.weightEntries.first {
                                Text("\(latest.kilograms.decimal) kg")
                                    .font(.system(size: 28, weight: .semibold))
                                Text(latest.date.formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                            } else {
                                Text("No manual weigh-ins yet").font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                            }
                        }
                        Spacer()
                        Button { logWeight = true } label: {
                            Image(systemName: "plus").font(.system(size: 16, weight: .semibold))
                                .frame(width: 44, height: 44).foregroundStyle(.white)
                                .errdayGlassCircle(tint: ErrdayTheme.healthAccent, interactive: true)
                        }.accessibilityLabel("Log weight")
                    }
                    if !records.weightEntries.isEmpty {
                        Divider()
                        NavigationLink { WeightHistoryView() } label: {
                            HStack { Text("View history"); Spacer(); Image(systemName: "chevron.right").font(.caption) }
                                .font(.system(size: 14, weight: .medium)).foregroundStyle(ErrdayTheme.healthAccent)
                                .frame(minHeight: 36).contentShape(Rectangle())
                        }.buttonStyle(.plain)
                    }
                }
                ErrdayCard {
                    if let value = health.value("weight", days: days, endingOn: selectedDate) { Text("Weight · \(value.decimal) kg"); Text(days == 1 ? selectedDate.formatted(date: .abbreviated, time: .omitted) : "Daily average").font(.caption).foregroundStyle(ErrdayTheme.secondary) }
                    else { Text("Weight · No data") }
                    Divider(); Text("Resting heart rate · \(health.display("pulse", days: days, endingOn: selectedDate)) bpm")
                    Divider(); Text("HRV · \(health.display("hrv", days: days, endingOn: selectedDate)) ms")
                }.font(.system(size: 14))
            }
            VStack(spacing: 12) {
                detailHeading("Mobility & running") { HealthMetricList(title: "Mobility & running", keys: ["walkSpeed", "stepLength", "asymmetry", "doubleSupport", "stairUp", "stairDown", "runningSpeed", "runningPower", "runningStride"], days: days, endDate: selectedDate) }
            }
            VStack(alignment: .leading, spacing: 12) {
                Text("All Health Data").font(.system(size: 18, weight: .semibold))
                Text("Everything Apple Health makes available to Errday, organised by category.")
                    .font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
                ErrdayCard {
                    ForEach(Array(HealthDataSection.allCases.enumerated()), id: \.element.id) { index, section in
                            NavigationLink { HealthDataSectionView(section: section, days: days, endDate: selectedDate) } label: {
                            HStack(spacing: 12) {
                                Image(systemName: section.symbol).foregroundStyle(ErrdayTheme.healthAccent).frame(width: 24)
                                Text(section.rawValue).font(.system(size: 14, weight: .semibold))
                                Spacer()
                                Text(sectionSummary(section)).font(.caption).foregroundStyle(ErrdayTheme.secondary)
                                Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.quiet)
                            }.frame(minHeight: 44).contentShape(Rectangle())
                        }.buttonStyle(.plain)
                        if index < HealthDataSection.allCases.count - 1 { Divider().overlay(ErrdayTheme.border) }
                    }
                }
            }
            NavigationLink { HealthSourcesView() } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Apple Health · Sources & permissions")
                    Text(health.refreshedAt.map { "Updated \($0.formatted(date: .omitted, time: .shortened))" } ?? "Not updated yet")
                }.font(.system(size: 11)).foregroundStyle(ErrdayTheme.quiet)
            }
        }
        .sheet(isPresented: $logWeight) { WeightLogSheet() }
        .task { await health.refresh() }.refreshable { await health.refresh(force: true) }
    }
    private var stageText: String {
        guard let night = health.sleepNights(days: 1, endingOn: selectedDate).last, night.hours != nil else { return "No sleep data available yet" }
        return ["Awake", "REM", "Core", "Deep"].map { "\($0) " + (night.stages[$0].map { HealthDurationText.text(hours: $0) } ?? "—") }.joined(separator: " · ")
    }
    private var activityWeight: Double? {
        records.weightEntries(on: selectedDate).first?.kilograms ?? records.data.profile?.weight ?? health.value("weight", days: days, endingOn: selectedDate)
    }
    private var walkingCalories: Double? {
        guard let kilometres = health.value("distance", days: days, endingOn: selectedDate), kilometres > 0,
              let activityWeight, activityWeight > 0 else { return nil }
        return kilometres * activityWeight * 0.53
    }
    private var gymCalories: Double? { health.gymCalories(days: days, endingOn: selectedDate, weightKG: activityWeight) }
    private func sectionSummary(_ section: HealthDataSection) -> String {
        if section == .sleep { return health.sleep.last?.hours == nil ? "No data" : "Available" }
        let numeric = HealthMetricDefinition.all.filter { $0.section == section && health.latest($0.id)?.value != nil }.count
        let samples = health.recentData[section] ?? 0
        let total = numeric + samples
        return total == 0 ? "No recent data" : "\(total) available"
    }
    private func detailHeading<C: View>(_ title: String, @ViewBuilder destination: () -> C) -> some View {
        HStack { Text(title).font(.system(size: 18, weight: .semibold)); Spacer(); NavigationLink(destination: destination) { HStack(spacing: 3) { Text("Details"); Image(systemName: "chevron.right").font(.system(size: 9)) }.font(.system(size: 12)).frame(minHeight: 32) } }
    }
}

struct WeightLogSheet: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @State private var value = ""
    @State private var date: Date
    @State private var showError = false
    @State private var isMorning = Calendar.current.component(.hour, from: .now) < 12
    @State private var morningSelectionChanged = false

    init(date: Date = .now, morning: Bool? = nil) {
        let calendar = Calendar.current
        let initial = calendar.isDateInToday(date) ? Date.now : calendar.date(bySettingHour: 12, minute: 0, second: 0, of: date) ?? date
        _date = State(initialValue: min(initial, .now))
        _isMorning = State(initialValue: morning ?? (calendar.component(.hour, from: initial) < 12))
    }

    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: "Log Weight", subtitle: "Add a measurement with its date and time.")
                ErrdayCard {
                    FoodNumberField(label: "Weight", unit: "kg", value: $value)
                    VStack(alignment: .leading, spacing: 7) {
                        Text("Measured at").font(.system(size: 12, weight: .medium)).foregroundStyle(ErrdayTheme.secondary)
                        DatePicker("Measured at", selection: $date, in: ...Date.now, displayedComponents: [.date, .hourAndMinute])
                            .labelsHidden().datePickerStyle(.compact)
                    }
                    Toggle("Morning weigh-in", isOn: Binding(
                        get: { isMorning },
                        set: { isMorning = $0; morningSelectionChanged = true }
                    ))
                    Text("For the two-week calorie check, weigh after the bathroom and before breakfast. Mark this if you're entering a morning measurement later.")
                        .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    if showError { Text("Enter a valid weight between 20 and 400 kg.").font(.caption).foregroundStyle(.orange) }
                }
                SuccessActionButton(
                    title: "Save Weight",
                    successTitle: "Weight saved",
                    isEnabled: !value.isEmpty,
                    action: save,
                    onCompletion: { dismiss() }
                )
            }
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
        .onChange(of: date) { _, newDate in
            if !morningSelectionChanged { isMorning = Calendar.current.component(.hour, from: newDate) < 12 }
        }
    }
    private func save() -> Bool {
        guard let kilograms = FoodInput.number(value), records.logWeight(kilograms, at: date, isMorning: isMorning) else {
            showError = true
            return false
        }
        showError = false
        return true
    }
}

struct WeightHistoryView: View {
    @Environment(PersonalStore.self) private var records

    var body: some View {
        ErrdayPage {
            PageHeading(title: "Weight History", subtitle: "Your manually recorded measurements.")
            if records.weightEntries.count > 1 {
                ErrdayCard {
                    Chart(Array(records.weightEntries.reversed())) { entry in
                        LineMark(x: .value("Date", entry.date), y: .value("Weight", entry.kilograms))
                            .foregroundStyle(ErrdayTheme.healthAccent)
                        PointMark(x: .value("Date", entry.date), y: .value("Weight", entry.kilograms))
                            .foregroundStyle(ErrdayTheme.healthAccent)
                    }.frame(height: 180)
                }
            }
            if records.weightEntries.isEmpty {
                ErrdayCard { EmptySection(title: "No weigh-ins", symbol: "scalemass", message: "Your saved measurements will appear here.") }
            } else {
                ErrdayCard {
                    ForEach(Array(records.weightEntries.enumerated()), id: \.element.id) { index, entry in
                        HStack(spacing: 12) {
                            Image(systemName: "scalemass").foregroundStyle(ErrdayTheme.healthAccent).frame(width: 24)
                            VStack(alignment: .leading, spacing: 3) {
                                Text("\(entry.kilograms.decimal) kg").font(.system(size: 16, weight: .semibold))
                                Text(entry.date.formatted(date: .abbreviated, time: .shortened)).font(.caption).foregroundStyle(ErrdayTheme.secondary)
                                if entry.isMorning ?? (Calendar.current.component(.hour, from: entry.date) < 12) {
                                    Text("Morning weigh-in").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                                }
                            }
                            Spacer()
                            Button(role: .destructive) { _ = records.deleteWeight(entry.id) } label: { Image(systemName: "trash") }
                                .accessibilityLabel("Delete weight from \(entry.date.formatted())")
                        }.frame(minHeight: 54)
                        if index < records.weightEntries.count - 1 { Divider() }
                    }
                }
            }
            Text("Manual weigh-ins stay on this iPhone. The newest measurement is also used as your current profile weight.")
                .font(.footnote).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}

struct HealthDataSectionView: View {
    @Environment(HealthStore.self) private var health
    let section: HealthDataSection
    let days: Int
    let endDate: Date

    var body: some View {
        ErrdayPage {
            PageHeading(title: section.rawValue, subtitle: "Available Apple Health data")
            if section == .sleep {
                NavigationLink { SleepDetailView(days: days, endDate: endDate) } label: {
                    ErrdayCard { LabeledContent("Sleep average", value: health.sleepText(days: days, endingOn: endDate)) }
                }.buttonStyle(.plain)
            }
            let metrics = HealthMetricDefinition.all.filter { $0.section == section }
            if !metrics.isEmpty {
                ForEach(metrics) { metric in
                    ErrdayCard {
                        HStack {
                            Text(metric.title).font(.system(size: 14, weight: .semibold))
                            Spacer()
                            Text("\(health.display(metric.id, days: days, endingOn: endDate)) \(metric.suffix)")
                                .font(.system(size: 14)).foregroundStyle(ErrdayTheme.healthAccent)
                        }
                        if health.latest(metric.id)?.value != nil {
                            MetricChart(values: health.values(metric.id, days: max(days, 7), endingOn: endDate), unit: metric.suffix)
                        } else {
                            Text("No accessible measurements for this period").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                        }
                    }
                }
            }
            if section == .body && !health.characteristics.isEmpty {
                ErrdayCard {
                    Text("Health profile").font(.headline)
                    ForEach(health.characteristics.keys.sorted(), id: \.self) { key in
                        LabeledContent(key, value: health.characteristics[key] ?? "—")
                    }
                }
            }
            if [.hearing, .sleep, .other, .clinical].contains(section) {
                ErrdayCard {
                    Text("Additional records").font(.headline)
                    Text("\(health.recentData[section] ?? 0) data types contain at least one accessible record from the last 30 days.")
                        .font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                    if section == .clinical {
                        Text("This includes allergies, conditions, immunisations, lab results, medications, procedures, vital-sign records, clinical notes and coverage when available.")
                            .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    }
                }
            }
            Text("Apple may return no values when a type has no data or when read access was not granted. Errday cannot distinguish those cases, by design.")
                .font(.footnote).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}
struct MetricChart: View {
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var selectedDate: Date?
    let values: [DailyMetric]; let unit: String
    var onSelectionChange: ((DailyMetric?) -> Void)? = nil

    private var selectedMetric: DailyMetric? {
        guard let selectedDate else { return nil }
        return values.first { Calendar.current.isDate($0.date, inSameDayAs: selectedDate) }
    }

    private func selectedValue(_ value: Double?) -> String {
        guard let value else { return "No measurement" }
        if unit == "h" { return HealthDurationText.text(hours: value) }
        return unit.isEmpty ? value.decimal : "\(value.decimal) \(unit)"
    }

    // Share categorical day slots across bars, labels and hit testing. A date
    // scale with .day bins offsets midpoint labels by another half day.
    private var daySlots: [String] { values.indices.map(String.init) }

    var body: some View {
        if values.allSatisfy({ $0.value == nil }) { Text("No measurements for this period").font(.caption).foregroundStyle(ErrdayTheme.secondary) }
        else {
            Chart(Array(values.enumerated()), id: \.element.id) { index, day in
                if let value = day.value {
                    BarMark(x: .value("Day", String(index)), y: .value(unit, value), width: .ratio(0.7))
                        .foregroundStyle(ErrdayTheme.healthAccent.opacity(selectedMetric == nil || selectedMetric?.id == day.id ? 1 : 0.35))
                        .cornerRadius(3)
                        .accessibilityLabel(day.date.formatted(date: .complete, time: .omitted))
                        .accessibilityValue(selectedValue(value))
                }
            }
            // Keep an empty slot for missing days, including either end.
            .chartXScale(domain: daySlots)
            .chartXAxis {
                AxisMarks(preset: .aligned, values: daySlots) { axis in
                    if let index = axis.as(String.self).flatMap(Int.init), values.indices.contains(index) {
                        let date = values[index].date
                        AxisValueLabel(centered: false, anchor: .top,
                                       collisionResolution: values.count > 10 ? .greedy : .disabled,
                                       offsetsMarks: false) {
                            Text(values.count > 10
                                 ? date.formatted(.dateTime.day())
                                 : date.formatted(.dateTime.locale(Locale(identifier: "en_GB")).day().month(.twoDigits)))
                                .font(.system(size: values.count > 10 ? 8 : 9))
                                .monospacedDigit()
                                .lineLimit(1)
                        }
                    }
                }
            }
            .chartOverlay { proxy in
                GeometryReader { geometry in
                    Rectangle()
                        .fill(.clear)
                        .contentShape(Rectangle())
                        .gesture(SpatialTapGesture().onEnded { tap in
                            guard let plotFrame = proxy.plotFrame else { return }
                            let plotRect = geometry[plotFrame]
                            let tapX = tap.location.x - plotRect.minX
                            guard (0...plotRect.width).contains(tapX) else { return }
                            let positionedDays = values.enumerated().compactMap { index, day -> (metric: DailyMetric, x: CGFloat)? in
                                guard let x = proxy.position(forX: String(index)) else { return nil }
                                return (day, x)
                            }
                            guard let nearest = positionedDays.min(by: { abs($0.x - tapX) < abs($1.x - tapX) }),
                                  nearest.metric.value != nil else { return }
                            let nextMetric: DailyMetric? = selectedMetric?.id == nearest.metric.id ? nil : nearest.metric
                            selectedDate = nextMetric?.date
                            onSelectionChange?(nextMetric)
                            ErrdayHaptics.selection(isEnabled: hapticsEnabled)
                        })
                }
            }
            .frame(height: 130)
            .accessibilityLabel("Daily measurements in \(unit)")
            .accessibilityHint("Tap a day to inspect it; tap again to clear")
            .onChange(of: values) { _, _ in
                selectedDate = nil
                onSelectionChange?(nil)
            }
            if onSelectionChange == nil, let selectedMetric {
                HStack {
                    Text(selectedMetric.date.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated)))
                        .foregroundStyle(ErrdayTheme.secondary)
                    Spacer()
                    Text(selectedValue(selectedMetric.value))
                        .fontWeight(.semibold)
                }
                .font(.system(size: 12))
                .accessibilityElement(children: .combine)
            }
            Text("\(values.filter { $0.value != nil }.count) of \(values.count) days recorded · missing days are not zero").font(.caption2).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}
struct HealthMetricList: View {
    @Environment(HealthStore.self) private var health
    @State private var selectedDays: [String: DailyMetric] = [:]
    let title: String; let keys: [String]; var days: Int; let endDate: Date

    private func heading(for metric: HealthMetricDefinition) -> String {
        guard metric.id == "steps", let selectedDay = selectedDays[metric.id] else { return metric.title }
        return selectedDay.date.formatted(.dateTime.weekday(.wide).day().month(.abbreviated))
    }

    private func headlineValue(for metric: HealthMetricDefinition) -> String {
        if metric.id == "steps" {
            let value = selectedDays[metric.id]?.value ?? health.value("steps", days: days, endingOn: endDate)
            let formatted = value?.whole ?? "—"
            return selectedDays[metric.id] == nil ? formatted : "\(formatted) steps"
        }
        return "\(health.display(metric.id, days: days, endingOn: endDate)) \(metric.suffix)"
    }

    private func stepComparison(on date: Date) -> String? {
        let calendar = Calendar.current
        guard !calendar.isDateInToday(date),
              let steps = health.value("steps", on: date),
              let previousDate = calendar.date(byAdding: .day, value: -1, to: date) else { return nil }
        let previous = Array(health.values("steps", days: 30, endingOn: previousDate)
            .compactMap(\.value).suffix(7))
        guard previous.count >= 3 else { return nil }
        let average = previous.reduce(0, +) / Double(previous.count)
        let difference = Int((steps - average).rounded())
        if difference == 0 { return "Same as the previous \(previous.count) recorded days on average." }
        let direction = difference > 0 ? "more" : "fewer"
        return "\(abs(difference).formatted()) \(direction) steps than the previous \(previous.count) recorded days on average."
    }

    private func stepDetails(on date: Date) -> some View {
        let distance = health.value("distance", on: date)
        let exercise = health.value("exercise", on: date)
        let flights = health.value("flights", on: date)
        let comparison = stepComparison(on: date)
        return ErrdayCard {
            Text("Activity details").font(.headline)
            if let distance { LabeledContent("Walking + running", value: "\(distance.decimal) km") }
            if let exercise { LabeledContent("Exercise", value: HealthDurationText.text(hours: exercise / 60)) }
            if let flights { LabeledContent("Flights climbed", value: flights.whole) }
            if let comparison {
                Divider()
                Text(comparison).font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
            }
            if distance == nil && exercise == nil && flights == nil {
                Text("No other activity measurements for this day.")
                    .font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
            }
        }
    }

    var body: some View {
        ErrdayPage {
            PageHeading(title: title, subtitle: "\(days == 1 ? endDate.formatted(.dateTime.weekday(.wide).day().month()) : "Last \(days) days") · available metrics")
            ForEach(HealthMetricDefinition.all.filter { keys.contains($0.id) }) { metric in
                ErrdayCard {
                    Text(heading(for: metric)).font(.headline)
                    Text(headlineValue(for: metric)).font(.system(size: 28, weight: .semibold))
                    MetricChart(values: health.values(metric.id, days: max(days, 7), endingOn: endDate), unit: metric.suffix) { day in
                        selectedDays[metric.id] = day
                    }
                }
                if let selectedDay = selectedDays[metric.id] {
                    if metric.id == "steps" {
                        stepDetails(on: selectedDay.date)
                    } else {
                        ErrdayCard {
                            Text(selectedDay.date, format: .dateTime.weekday().day().month()).font(.headline)
                            Text(selectedDay.value.map {
                                "\($0.decimal) \(metric.suffix.isEmpty ? metric.title.lowercased() : metric.suffix)"
                            } ?? "No measurement")
                            .font(.system(size: 20, weight: .semibold))
                        }
                    }
                }
            }
            Text("Multiple measurements in a day are averaged; activity values are summed per day. Not every device records every metric.").font(.footnote).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}
struct SleepDetailView: View {
    @Environment(HealthStore.self) private var health
    @State private var selectedNightDate: Date?
    var days: Int
    let endDate: Date
    private var nights: [SleepNight] { health.sleepNights(days: max(days, 7), endingOn: endDate) }
    private var selectedNight: SleepNight? {
        guard let selectedNightDate else { return nil }
        return nights.first { Calendar.current.isDate($0.date, inSameDayAs: selectedNightDate) }
    }
    private var headlineLabel: String {
        selectedNight?.date.formatted(.dateTime.weekday(.wide).day().month(.abbreviated))
            ?? (days == 1 ? "Last night" : "Average")
    }
    private var headlineHours: String {
        selectedNight?.hours.map { HealthDurationText.text(hours: $0) }
            ?? health.sleepText(days: days, endingOn: endDate)
    }
    var body: some View {
        ErrdayPage {
            PageHeading(title: "Sleep", subtitle: "Available nights from Apple Health")
            ErrdayCard {
                Text(headlineLabel).foregroundStyle(ErrdayTheme.secondary)
                Text(headlineHours).font(.system(size: 32, weight: .semibold))
                MetricChart(values: nights.map { DailyMetric(date: $0.date, value: $0.hours) }, unit: "h") { metric in
                    selectedNightDate = metric?.date
                }
            }
            if let night = selectedNight {
                ErrdayCard {
                    Text("Sleep stages").font(.headline)
                    if night.hours != nil { ForEach(["Awake", "REM", "Core", "Deep"], id: \.self) { stage in LabeledContent(stage, value: night.stages[stage].map { HealthDurationText.text(hours: $0) } ?? "—") } }
                    if let source = night.source { Text(source).font(.caption).foregroundStyle(ErrdayTheme.secondary) }
                }
            }
            Text("Nights are grouped from noon to noon. With multiple sources, one source is used per night and overlapping sleep is counted once.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}
struct HealthSourcesView: View {
    @Environment(HealthStore.self) private var health
    var body: some View {
        ErrdayPage {
            PageHeading(title: "Health Data", subtitle: "Sources & permissions")
            ErrdayCard {
                Text("Apple Health").font(.headline)
                Text("Apple Watch and other connected devices provide metrics through Apple Health. Errday reads only data you allow and does not store it on a server.").font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                Button(health.hasRequested ? "Refresh Health Data" : "Connect Apple Health") { Task { if health.hasRequested { await health.refresh(force: true) } else { await health.connect() } } }.buttonStyle(PrimaryButtonStyle()).disabled(health.isLoading || !health.isAvailable)
            }
            ErrdayCard { Text("One permission request").font(.headline); Text("Errday asks for activity, body measurements, hearing, mobility, nutrition, sleep, vitals, symptoms, workouts, medications and clinical records. Protected vision prescriptions and medication dose events require separate Apple pickers, so Errday leaves those out to keep setup to one permission flow. Apple does not tell apps which read permissions you declined, so a blank value can mean no data or no access.").font(.subheadline).foregroundStyle(ErrdayTheme.secondary) }
            Text("To change access later: Apple Health → profile → Apps → Errday.").font(.footnote).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}
