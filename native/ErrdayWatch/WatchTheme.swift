import SwiftUI

enum WatchTheme {
    static let accent = Color(red: 115 / 255, green: 87 / 255, blue: 246 / 255)
    static let gym = Color(red: 36 / 255, green: 107 / 255, blue: 253 / 255)
    static let surface = Color(white: 0.11)
    static let raised = Color(white: 0.18)
    static let radius: CGFloat = 12

    static func number(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(0...2)))
    }

    static func duration(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds.rounded(.up)))
        return total >= 3600
            ? String(format: "%d:%02d:%02d", total / 3600, (total % 3600) / 60, total % 60)
            : String(format: "%d:%02d", total / 60, total % 60)
    }
}

extension View {
    func watchSurface() -> some View {
        padding(10).background(WatchTheme.surface, in: RoundedRectangle(cornerRadius: WatchTheme.radius))
    }
}
