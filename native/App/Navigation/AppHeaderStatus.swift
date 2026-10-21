import SwiftUI

struct AppHeaderStatus: View {
    let streak: Int
    let openAssistant: () -> Void

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
                .accessibilityLabel("\(streak) day food logging streak")
                .accessibilityHint("Log any food each day to keep your streak")
                .accessibilityIdentifier("header.foodStreak")

            Divider().frame(height: 20)

            Button(action: openAssistant) {
                FigmaIcon(asset: "a9e8c")
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Assistant")
            .accessibilityIdentifier("header.assistant")
        }
        .padding(.horizontal, 4)
    }
}
