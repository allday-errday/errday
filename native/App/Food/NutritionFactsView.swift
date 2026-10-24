import SwiftUI

enum NutritionMetric: String, CaseIterable, Identifiable {
    case calories, protein, carbs, fat, fiber, sugar, sodium

    var id: String { rawValue }

    var title: String {
        switch self {
        case .calories: "Calories"
        case .protein: "Protein"
        case .carbs: "Carbs"
        case .fat: "Fats"
        case .fiber: "Fiber"
        case .sugar: "Sugar"
        case .sodium: "Sodium"
        }
    }

    var unit: String {
        switch self {
        case .calories: "kcal"
        case .sodium: "mg"
        default: "g"
        }
    }

    var symbol: String {
        switch self {
        case .calories: "flame.fill"
        case .protein: "fork.knife"
        case .carbs: "leaf.fill"
        case .fat: "drop.fill"
        case .fiber: "leaf"
        case .sugar: "cube.fill"
        case .sodium: "saltshaker.fill"
        }
    }

    var color: Color {
        switch self {
        case .calories: ErrdayTheme.foodAccent
        case .protein: ErrdayTheme.proteinAccent
        case .carbs: ErrdayTheme.carbsAccent
        case .fat: ErrdayTheme.fatAccent
        case .fiber: Color(hex: 0x5cab74)
        case .sugar: Color(hex: 0xd59636)
        case .sodium: Color(hex: 0x5c82d9)
        }
    }
}

struct NutritionMetricValues {
    let calories: Double?
    let protein: Double?
    let carbs: Double?
    let fat: Double?
    let fiber: Double?
    let sugar: Double?
    let sodium: Double?

    func value(for metric: NutritionMetric) -> Double? {
        switch metric {
        case .calories: calories
        case .protein: protein
        case .carbs: carbs
        case .fat: fat
        case .fiber: fiber
        case .sugar: sugar
        case .sodium: sodium
        }
    }
}

struct NutritionFactsView: View {
    let values: NutritionMetricValues
    var onSelect: ((NutritionMetric) -> Void)?

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 3)
    private let secondaryMetrics: [NutritionMetric] = [.protein, .carbs, .fat, .fiber, .sugar, .sodium]

    var body: some View {
        VStack(spacing: 10) {
            metricControl(.calories, prominent: true)
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(secondaryMetrics) { metric in
                    metricControl(metric, prominent: false)
                }
            }
        }
    }

    @ViewBuilder
    private func metricControl(_ metric: NutritionMetric, prominent: Bool) -> some View {
        if let onSelect {
            Button { onSelect(metric) } label: { metricCard(metric, prominent: prominent) }
                .buttonStyle(.plain)
        } else {
            metricCard(metric, prominent: prominent)
        }
    }

    private func metricCard(_ metric: NutritionMetric, prominent: Bool) -> some View {
        HStack(alignment: .top, spacing: prominent ? 14 : 7) {
            Image(systemName: metric.symbol)
                .font(prominent ? .system(size: 25) : .caption)
                .foregroundStyle(metric.color)
                .frame(width: prominent ? 28 : 14)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: prominent ? 2 : 7) {
                Text(metric.title)
                    .font(prominent ? .caption : .caption2)
                    .foregroundStyle(metric.color)
                Text(formattedValue(for: metric, prominent: prominent))
                    .font(.system(size: prominent ? 34 : 17, weight: .semibold))
                    .foregroundStyle(ErrdayTheme.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            Spacer(minLength: 0)
            if prominent, onSelect != nil {
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(ErrdayTheme.quiet)
                    .padding(.top, 16)
            }
        }
        .padding(prominent ? 20 : 12)
        .frame(maxWidth: .infinity, minHeight: prominent ? 0 : 84, alignment: .leading)
        .errdaySurface()
        .accessibilityElement(children: .combine)
    }

    private func formattedValue(for metric: NutritionMetric, prominent: Bool) -> String {
        guard let value = values.value(for: metric) else { return "—" }
        let number = prominent
            ? value.formatted(.number.precision(.fractionLength(0)))
            : value.formatted(.number.precision(.fractionLength(0...1)))
        return prominent ? number : "\(number)\(metric.unit)"
    }
}
