import SwiftUI

/// Content stays in a quieter material layer; Liquid Glass is reserved for controls.
struct ErrdayBackdrop: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        ZStack {
            ErrdayTheme.background
            if !reduceTransparency {
                LinearGradient(
                    colors: [ErrdayTheme.accent.opacity(colorScheme == .dark ? 0.12 : 0.08),
                             ErrdayTheme.background.opacity(0.2),
                             ErrdayTheme.gymAccent.opacity(colorScheme == .dark ? 0.05 : 0.035)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

private struct ErrdaySurfaceModifier: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.colorSchemeContrast) private var contrast
    let radius: CGFloat

    func body(content: Content) -> some View {
        content.background {
            let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
            if reduceTransparency || contrast == .increased {
                shape.fill(ErrdayTheme.surface)
            } else {
                shape.fill(.regularMaterial)
                    .overlay { shape.fill(ErrdayTheme.surface.opacity(0.55)) }
            }
        }
        .overlay {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(ErrdayTheme.border.opacity(contrast == .increased ? 1 : 0.45),
                              lineWidth: contrast == .increased ? 1 : 0.5)
                .allowsHitTesting(false)
        }
    }
}

/// Group sibling glass controls so they share one native rendering context.
struct ErrdayGlassGroup<Content: View>: View {
    var spacing: CGFloat = 8
    @ViewBuilder var content: Content

    var body: some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: spacing) { content }
        } else {
            content
        }
    }
}

private struct ErrdayActionBarModifier: ViewModifier {
    func body(content: Content) -> some View {
        ErrdayGlassGroup { content }
            .background {
                LinearGradient(colors: [ErrdayTheme.background.opacity(0), ErrdayTheme.background.opacity(0.96)],
                               startPoint: .top, endPoint: .bottom)
                    .ignoresSafeArea(edges: .bottom)
                    .allowsHitTesting(false)
            }
    }
}

extension View {
    func errdayGlassControls() -> some View { ErrdayGlassGroup { self } }

    func errdayBackground() -> some View { background { ErrdayBackdrop() } }

    func errdaySurface(radius: CGFloat = ErrdayTheme.radius) -> some View {
        modifier(ErrdaySurfaceModifier(radius: radius))
    }

    func errdayActionBar() -> some View { modifier(ErrdayActionBarModifier()) }
}
