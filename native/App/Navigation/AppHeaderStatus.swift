import SwiftUI

struct AppHeaderStatus: View {
    let streak: Int

    var body: some View {
        if #available(iOS 26.0, *) {
            // The system toolbar supplies the glass around this group.
            controls
        } else {
            controls.errdayGlass(radius: 22)
        }
    }

    private var controls: some View {
        HStack(spacing: 0) {
            Label("\(streak)", systemImage: "flame.fill")
                .labelStyle(.titleAndIcon)
                .font(.system(size: 13, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(.orange)
                .padding(.horizontal, 6)
                .frame(minWidth: 48, minHeight: 44)
                .accessibilityLabel("\(streak) day goal streak")
                .accessibilityHint("Reach your calorie goal and complete the daily checklist to keep your streak")
                .accessibilityIdentifier("header.foodStreak")

        }
        .padding(.horizontal, 4)
    }
}
