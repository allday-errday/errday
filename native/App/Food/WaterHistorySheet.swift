import ErrdayCore
import SwiftUI

struct WaterHistorySheet: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var sortOrder: SortOrder = .newest
    @State private var entryToDelete: HydrationEntry?
    @State private var selectedEntry: HydrationEntry?

    let date: Date

    private enum SortOrder { case newest, largest }

    private var entries: [HydrationEntry] { records.hydrationEntries(on: date) }
    private var total: Double { records.water(on: date) }
    private var goal: Double { records.data.hydrationGoalMillilitres ?? 3_500 }
    private var sortedEntries: [HydrationEntry] {
        switch sortOrder {
        case .newest: entries
        case .largest:
            entries.sorted { left, right in
                left.millilitres == right.millilitres
                    ? left.date > right.date
                    : left.millilitres > right.millilitres
            }
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ErrdayCard {
                        Label("Water", systemImage: "drop.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(ErrdayTheme.foodAccent)
                        HStack(alignment: .firstTextBaseline, spacing: 5) {
                            Text(total.whole)
                                .font(.system(size: 36, weight: .semibold))
                                .contentTransition(.numericText())
                            Text("mL logged")
                                .font(.system(size: 14))
                                .foregroundStyle(ErrdayTheme.secondary)
                        }
                        if goal > 0 {
                            ProgressView(value: min(total, goal), total: goal)
                                .tint(ErrdayTheme.foodAccent)
                            Text(total >= goal
                                 ? "Goal reached · \(goal.whole) mL"
                                 : "\(max(0, goal - total).whole) mL left of your \(goal.whole) mL goal")
                                .font(.system(size: 12))
                                .foregroundStyle(ErrdayTheme.secondary)
                        }
                    }

                    if entries.isEmpty {
                        ErrdayCard {
                            EmptySection(title: "No water logged", symbol: "drop",
                                         message: "Your water entries will appear here after you log them.")
                        }
                    } else {
                        ErrdayCard {
                            HStack {
                                Text("Logged water")
                                    .font(.system(size: 15, weight: .semibold))
                                Spacer()
                                if entries.count >= 5 {
                                    Menu {
                                        Button("Newest first") { sortOrder = .newest }
                                        Button("Largest first") { sortOrder = .largest }
                                    } label: {
                                        Label(sortOrder == .newest ? "Newest first" : "Largest first",
                                              systemImage: "arrow.up.arrow.down")
                                            .font(.system(size: 12))
                                            .foregroundStyle(ErrdayTheme.accent)
                                    }
                                }
                            }
                            LazyVStack(spacing: 0) {
                                ForEach(sortedEntries) { entry in
                                    HStack(spacing: 12) {
                                        Button {
                                            selectedEntry = entry
                                            ErrdayHaptics.selection(isEnabled: hapticsEnabled)
                                        } label: {
                                            HStack(spacing: 12) {
                                                Image(systemName: "drop.fill")
                                                    .font(.system(size: 13))
                                                    .foregroundStyle(ErrdayTheme.foodAccent)
                                                    .frame(width: 20)
                                                Text(entry.date, style: .time)
                                                    .font(.system(size: 14))
                                                Spacer(minLength: 8)
                                                Text("\(entry.millilitres.whole) mL")
                                                    .font(.system(size: 14, weight: .semibold))
                                                Image(systemName: "chevron.right")
                                                    .font(.system(size: 9, weight: .semibold))
                                                    .foregroundStyle(ErrdayTheme.secondary)
                                            }
                                            .frame(maxWidth: .infinity, minHeight: 48)
                                            .contentShape(Rectangle())
                                        }
                                        .buttonStyle(.plain)
                                        .accessibilityLabel("Edit \(entry.millilitres.whole) millilitres logged at \(entry.date.formatted(date: .omitted, time: .shortened))")
                                        Button {
                                            entryToDelete = entry
                                        } label: {
                                            Image(systemName: "trash")
                                                .font(.system(size: 13))
                                                .foregroundStyle(ErrdayTheme.secondary)
                                                .frame(width: 44, height: 44)
                                                .contentShape(Rectangle())
                                        }
                                        .buttonStyle(.plain)
                                        .accessibilityLabel("Delete \(entry.millilitres.whole) millilitres logged at \(entry.date.formatted(date: .omitted, time: .shortened))")
                                    }
                                    .frame(minHeight: 48)
                                    if entry.id != sortedEntries.last?.id { Divider() }
                                }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .errdayBackground()
            .foregroundStyle(ErrdayTheme.text)
            .navigationTitle("Water history")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .confirmationDialog("Delete this water entry?", isPresented: Binding(
                get: { entryToDelete != nil },
                set: { if !$0 { entryToDelete = nil } }
            )) {
                Button("Delete", role: .destructive) {
                    guard let entryToDelete else { return }
                    if records.deleteWater(entryToDelete.id) {
                        ErrdayHaptics.selection(isEnabled: hapticsEnabled)
                        Task { await RoutineReminderScheduler.refreshIfAuthorized(for: records.data) }
                    }
                    self.entryToDelete = nil
                }
            }
        }
        .presentationDetents([.medium, .large])
        .sheet(item: $selectedEntry) { entry in
            WaterEntryEditor(entry: entry)
        }
    }
}
