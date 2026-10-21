import SwiftUI
import WidgetKit

private struct NutritionEntry: TimelineEntry {
    let date: Date
    let calories: Double
    let calorieGoal: Double
    let protein: Double
    let proteinGoal: Double
    let carbs: Double
    let carbsGoal: Double
    let fat: Double
    let fatGoal: Double
    let fiber: Double?
    let fiberGoal: Double
    let sugar: Double?
    let sugarGoal: Double
    let sodium: Double?
    let sodiumGoal: Double
}

private struct NutritionProvider: TimelineProvider {
    func placeholder(in context: Context) -> NutritionEntry { sample }
    func getSnapshot(in context: Context, completion: @escaping (NutritionEntry) -> Void) { completion(load()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<NutritionEntry>) -> Void) {
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now.addingTimeInterval(1800)
        completion(Timeline(entries: [load()], policy: .after(next)))
    }

    private var sample: NutritionEntry {
        NutritionEntry(date: .now, calories: 1870, calorieGoal: 3200,
                       protein: 132, proteinGoal: 190, carbs: 210, carbsGoal: 390, fat: 63, fatGoal: 95,
                       fiber: 18, fiberGoal: 32, sugar: 31, sugarGoal: 55, sodium: 1260, sodiumGoal: 2300)
    }

    private func load() -> NutritionEntry {
        guard let d = UserDefaults(suiteName: "group.com.errday.native") else {
            return NutritionEntry(date: .now, calories: 0, calorieGoal: 0,
                                  protein: 0, proteinGoal: 0, carbs: 0, carbsGoal: 0,
                                  fat: 0, fatGoal: 0, fiber: nil, fiberGoal: 0,
                                  sugar: nil, sugarGoal: 0, sodium: nil, sodiumGoal: 0)
        }
        func optionalDouble(_ key: String) -> Double? {
            d.object(forKey: key) == nil ? nil : d.double(forKey: key)
        }
        return NutritionEntry(
            date: .now,
            calories: d.double(forKey: "widget.calories"),
            calorieGoal: d.double(forKey: "widget.calorieGoal") + d.double(forKey: "widget.activityCalories"),
            protein: d.double(forKey: "widget.protein"), proteinGoal: d.double(forKey: "widget.proteinGoal"),
            carbs: d.double(forKey: "widget.carbs"), carbsGoal: d.double(forKey: "widget.carbsGoal"),
            fat: d.double(forKey: "widget.fat"), fatGoal: d.double(forKey: "widget.fatGoal"),
            fiber: optionalDouble("widget.fiber"), fiberGoal: d.double(forKey: "widget.fiberGoal"),
            sugar: optionalDouble("widget.sugar"), sugarGoal: d.double(forKey: "widget.sugarGoal"),
            sodium: optionalDouble("widget.sodium"), sodiumGoal: d.double(forKey: "widget.sodiumGoal")
        )
    }
}

private struct WidgetRing: View {
    let value: Double
    let goal: Double
    let color: Color
    var lineWidth: CGFloat = 7
    private var progress: Double { goal > 0 ? min(max(value / goal, 0), 1) : 0 }
    var body: some View {
        ZStack {
            Circle().stroke(Color(red: 0.91, green: 0.91, blue: 0.95), lineWidth: lineWidth)
            Circle().trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

private struct NutritionWidgetView: View {
    let entry: NutritionEntry
    private let accent = Color(red: 0.49, green: 0.34, blue: 0.96)
    private let primary = Color(red: 0.10, green: 0.09, blue: 0.14)
    private let secondary = Color(red: 0.42, green: 0.41, blue: 0.47)

    private var calorieDifference: (amount: Double, state: String)? {
        guard entry.calorieGoal > 0 else { return nil }
        let difference = entry.calorieGoal - entry.calories
        return (abs(difference), difference >= 0 ? "left" : "over")
    }

    var body: some View {
        GeometryReader { proxy in
            let compact = proxy.size.width < 360
            let ringSize = min(compact ? 96 : 102, max(90, proxy.size.height - 54))
            let actionWidth: CGFloat = compact ? 78 : 88

            VStack(spacing: 6) {
                HStack(spacing: compact ? 12 : 16) {
                    calorieRing(size: ringSize)

                    VStack(alignment: .leading, spacing: compact ? 3 : 4) {
                        nutrient("Protein", value: entry.protein, goal: entry.proteinGoal,
                                 color: Color(red: 0.95, green: 0.40, blue: 0.45), symbol: "bolt.fill")
                        nutrient("Carbs", value: entry.carbs, goal: entry.carbsGoal,
                                 color: Color(red: 0.90, green: 0.59, blue: 0.32), symbol: "leaf.fill")
                        nutrient("Fat", value: entry.fat, goal: entry.fatGoal,
                                 color: Color(red: 0.35, green: 0.58, blue: 0.96), symbol: "drop.fill")
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .layoutPriority(1)

                    actionPanel(width: actionWidth)
                }
                .frame(maxHeight: .infinity)

            }
            .padding(.horizontal, compact ? 11 : 14)
            .padding(.vertical, 14)
            .frame(width: proxy.size.width, height: proxy.size.height)
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [.white, Color(red: 0.985, green: 0.98, blue: 1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .foregroundStyle(primary)
    }

    private func calorieRing(size: CGFloat) -> some View {
        ZStack {
            WidgetRing(value: entry.calories, goal: entry.calorieGoal, color: accent, lineWidth: 8)
            VStack(spacing: 3) {
                if let calorieDifference {
                    Text(calorieDifference.amount, format: .number.precision(.fractionLength(0)))
                        .font(.system(size: 25, weight: .bold, design: .rounded))
                        .minimumScaleFactor(0.58)
                        .lineLimit(1)
                } else {
                    Text("—").font(.system(size: 25, weight: .bold, design: .rounded))
                }
                Text(calorieDifference.map { "Calories \($0.state)" } ?? "Calories")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(secondary)
                    .lineLimit(1)
            }
            .padding(.horizontal, 13)
        }
        .frame(width: size, height: size)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(calorieDifference.map { "\(Int($0.amount.rounded())) calories \($0.state)" } ?? "Calorie goal not set")
    }

    private func nutrient(_ title: String, value: Double, goal: Double, color: Color, symbol: String) -> some View {
        let difference: (amount: Double, state: String)? = goal > 0
            ? (abs(goal - value), value <= goal ? "left" : "over")
            : nil
        return HStack(spacing: 8) {
            ZStack {
                WidgetRing(value: value, goal: goal, color: color, lineWidth: 3)
                Image(systemName: symbol).font(.system(size: 8, weight: .bold)).foregroundStyle(color)
            }
            .frame(width: 28, height: 28)

            VStack(alignment: .leading, spacing: 1) {
                HStack(alignment: .firstTextBaseline, spacing: 1) {
                    if let difference {
                        Text(difference.amount, format: .number.precision(.fractionLength(0)))
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                        Text("g").font(.system(size: 10, weight: .semibold))
                    } else {
                        Text("—").font(.system(size: 16, weight: .bold, design: .rounded))
                    }
                }
                .lineLimit(1)
                .minimumScaleFactor(0.62)

                Text(difference.map { "\(title) \($0.state)" } ?? title)
                    .font(.system(size: 9, weight: .regular))
                    .foregroundStyle(secondary)
                    .lineLimit(1)
            }
        }
        .frame(minHeight: 30, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(difference.map { "\(Int($0.amount.rounded())) grams of \(title) \($0.state)" } ?? "\(title) goal not set")
    }

    private func actionPanel(width: CGFloat) -> some View {
        VStack(spacing: 0) {
            action("Scan Food", symbol: "camera.viewfinder", url: "errday://food/photo")
            Divider().overlay(Color.black.opacity(0.06)).padding(.horizontal, 10)
            action("Barcode", symbol: "barcode.viewfinder", url: "errday://food/barcode")
        }
        .frame(width: width)
        .background(
            Color(red: 0.965, green: 0.955, blue: 0.99),
            in: RoundedRectangle(cornerRadius: 18, style: .continuous)
        )
    }

    private func action(_ title: String, symbol: String, url: String) -> some View {
        Link(destination: URL(string: url)!) {
            VStack(spacing: 5) {
                Image(systemName: symbol).font(.system(size: 17, weight: .semibold))
                Text(title)
                    .font(.system(size: 10, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(Rectangle())
        }
        .accessibilityLabel(title)
    }
}

struct ErrdayNutritionWidget: Widget {
    let kind = "ErrdayNutritionWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NutritionProvider()) { entry in NutritionWidgetView(entry: entry) }
            .configurationDisplayName("Nutrition")
            .description("See calories and macros, then scan food in one tap.")
            .supportedFamilies([.systemMedium])
            .contentMarginsDisabled()
    }
}

private struct LockScreenNutritionView: View {
    let entry: NutritionEntry

    private var caloriesLeft: Double? {
        guard entry.calorieGoal > 0 else { return nil }
        return entry.calorieGoal - entry.calories
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 5) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 13))
                    .widgetAccentable()
                if let caloriesLeft {
                    Text(abs(caloriesLeft), format: .number.precision(.fractionLength(0)))
                        .font(.system(size: 18, weight: .semibold))
                    Text(caloriesLeft >= 0 ? "Calories left" : "Calories over")
                        .font(.system(size: 11))
                        .lineLimit(1)
                } else {
                    Text("Calories not set")
                        .font(.system(size: 12, weight: .medium))
                }
            }
            GeometryReader { proxy in
                Capsule().fill(Color.primary.opacity(0.25))
                    .overlay(alignment: .leading) {
                        Capsule().fill(Color.primary)
                            .frame(width: proxy.size.width * min(1, max(0, entry.calories / max(1, entry.calorieGoal))))
                    }
            }
            .frame(height: 4)
            HStack(spacing: 9) {
                macro("bolt.fill", value: entry.protein, goal: entry.proteinGoal)
                macro("leaf.fill", value: entry.carbs, goal: entry.carbsGoal)
                macro("drop.fill", value: entry.fat, goal: entry.fatGoal)
            }
        }
        .padding(.horizontal, 2)
        .containerBackground(for: .widget) { Color.clear }
        .widgetURL(URL(string: "errday://food"))
    }

    private func macro(_ symbol: String, value: Double, goal: Double) -> some View {
        HStack(spacing: 3) {
            Image(systemName: symbol).font(.system(size: 9)).widgetAccentable()
            Text(goal > 0 ? "\(Int(abs(goal - value).rounded()))g\(value > goal ? "+" : "")" : "—")
                .font(.system(size: 10, weight: .medium))
                .lineLimit(1)
        }
        .accessibilityLabel(goal > 0 ? "\(Int(abs(goal - value).rounded())) grams \(value > goal ? "over" : "left")" : "Goal not set")
    }
}

struct ErrdayLockScreenNutritionWidget: Widget {
    let kind = "ErrdayLockScreenNutritionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NutritionProvider()) { entry in
            LockScreenNutritionView(entry: entry)
        }
        .configurationDisplayName("Calories left")
        .description("See your remaining calories and macros on the Lock Screen.")
        .supportedFamilies([.accessoryRectangular])
    }
}

@main
struct ErrdayWidgetBundle: WidgetBundle {
    var body: some Widget {
        ErrdayNutritionWidget()
        ErrdayLockScreenNutritionWidget()
        WorkoutRestLiveActivity()
    }
}
