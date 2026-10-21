import SwiftUI

/// The original side-by-side layout. TabView still owns tab state and navigation.
struct AppBottomBar<TrackingControl: View>: View {
    @Binding var selectedTab: AppTab
    @ViewBuilder var trackingControl: TrackingControl

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 0) {
                ForEach(AppTab.allCases) { tab in
                    Button { selectedTab = tab } label: {
                        VStack(spacing: 4) {
                            Image(systemName: tab.symbol)
                                .font(.system(size: 17, weight: .semibold))
                            Text(tab.rawValue)
                                .font(.system(size: 10, weight: .medium))
                                .lineLimit(1)
                        }
                        .foregroundStyle(selectedTab == tab ? tab.accent : ErrdayTheme.secondary)
                        .frame(maxWidth: .infinity, minHeight: 55)
                        .background(selectedTab == tab ? tab.accent.opacity(0.10) : .clear, in: Capsule())
                        .contentShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(tab.rawValue)
                    .accessibilityAddTraits(selectedTab == tab ? .isSelected : [])
                    .accessibilityIdentifier("tab.\(tab.rawValue.lowercased())")
                }
            }
            .padding(5)
            .errdayGlass(radius: 33)

            trackingControl
        }
        .frame(maxWidth: 620)
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .errdayActionBar()
    }
}

#Preview("Bottom navigation · Light", traits: .fixedLayout(width: 320, height: 100)) {
    AppBottomBar(selectedTab: .constant(.home)) {
        Image(systemName: "plus")
            .font(.system(size: 23, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 60, height: 60)
            .errdayGlassCircle(tint: ErrdayTheme.accent, interactive: true)
    }
    .errdayBackground()
    .preferredColorScheme(.light)
}

#Preview("Bottom navigation · Dark", traits: .fixedLayout(width: 430, height: 100)) {
    AppBottomBar(selectedTab: .constant(.health)) {
        Image(systemName: "plus")
            .font(.system(size: 23, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 60, height: 60)
            .errdayGlassCircle(tint: ErrdayTheme.accent, interactive: true)
    }
    .errdayBackground()
    .preferredColorScheme(.dark)
}
