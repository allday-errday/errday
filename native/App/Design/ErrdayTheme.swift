import SwiftUI
import UIKit

enum ErrdayTheme {
    static let accent = Color(hex: 0x7357f6)
    static let foodAccent = Color(hex: 0xe0a000)
    static let gymAccent = Color(hex: 0x246bfd)
    static let healthAccent = Color(hex: 0xef4e55)
    static let proteinAccent = Color(hex: 0xef6671)
    static let carbsAccent = Color(hex: 0xe59a55)
    static let fatAccent = Color(hex: 0x4f8ce8)
    static let dinnerAccent = Color(hex: 0x4a6fa5)
    static let snacksAccent = Color(hex: 0xe47c9a)
    static let background = Color(uiColor: .systemGroupedBackground)
    static let surface = Color(uiColor: .secondarySystemGroupedBackground)
    static let raised = Color(uiColor: .tertiarySystemFill)
    static let text = Color(uiColor: .label)
    static let secondary = Color(uiColor: .secondaryLabel)
    static let quiet = Color(uiColor: .tertiaryLabel)
    static let border = Color(uiColor: .separator)
    static let radius: CGFloat = 12
}

private struct ErrdayAccentKey: EnvironmentKey {
    static let defaultValue = ErrdayTheme.accent
}

extension EnvironmentValues {
    var errdayAccent: Color {
        get { self[ErrdayAccentKey.self] }
        set { self[ErrdayAccentKey.self] = newValue }
    }
}
extension Color {
    init(hex: UInt32) { self.init(red: Double((hex >> 16) & 255)/255, green: Double((hex >> 8) & 255)/255, blue: Double(hex & 255)/255) }
}
struct BrandHeader: View {
    var body: some View {
        Text("errday.").font(.system(size: 21, weight: .bold)).foregroundStyle(ErrdayTheme.text)
            .fixedSize().frame(minWidth: 92, alignment: .leading).padding(.leading, 4)
            .accessibilityLabel("Errday")
    }
}
struct FigmaIcon: View {
    let asset: String
    var body: some View { Image("Figma_" + asset).renderingMode(.template).accessibilityHidden(true) }
}
struct ErrdayCard<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .frame(maxWidth: .infinity, alignment: .leading).padding(16)
            .errdaySurface()
    }
}
struct ErrdayPage<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) { content }
                .padding(.horizontal, 20).padding(.top, 20).padding(.bottom, 32)
                .frame(maxWidth: 620).frame(maxWidth: .infinity)
                .errdayGlassControls()
        }
            .errdayBackground().foregroundStyle(ErrdayTheme.text)
            .errdayKeyboardDone()
    }
}

private struct ErrdayKeyboardDoneModifier: ViewModifier {
    func body(content: Content) -> some View {
        content.toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder),
                                                    to: nil, from: nil, for: nil)
                }
                .fontWeight(.semibold)
            }
        }
    }
}

extension View {
    func errdayKeyboardDone() -> some View { modifier(ErrdayKeyboardDoneModifier()) }

    func errdayGlass(radius: CGFloat = 18, tint: Color? = nil, interactive: Bool = false) -> some View {
        modifier(ErrdayGlassRoundedModifier(radius: radius, tint: tint, interactive: interactive))
    }

    func errdayGlassCircle(tint: Color? = nil, interactive: Bool = false) -> some View {
        modifier(ErrdayGlassCircleModifier(tint: tint, interactive: interactive))
    }
}

private struct ErrdayGlassRoundedModifier: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.colorSchemeContrast) private var contrast
    let radius: CGFloat
    let tint: Color?
    let interactive: Bool

    @ViewBuilder
    func body(content: Content) -> some View {
        if reduceTransparency || contrast == .increased {
            content.background {
                RoundedRectangle(cornerRadius: radius).fill(ErrdayTheme.surface)
                    .overlay { RoundedRectangle(cornerRadius: radius).fill(tint ?? .clear) }
            }
                .overlay { RoundedRectangle(cornerRadius: radius).strokeBorder(ErrdayTheme.border, lineWidth: 0.5).allowsHitTesting(false) }
        } else if #available(iOS 26.0, *) {
            if let tint {
                if interactive {
                    content.glassEffect(.regular.tint(tint).interactive(), in: .rect(cornerRadius: radius))
                } else {
                    content.glassEffect(.regular.tint(tint), in: .rect(cornerRadius: radius))
                }
            } else if interactive {
                content.glassEffect(.regular.interactive(), in: .rect(cornerRadius: radius))
            } else {
                content.glassEffect(.regular, in: .rect(cornerRadius: radius))
            }
        } else {
            content
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: radius, style: .continuous)
                        .stroke(ErrdayTheme.border.opacity(0.5), lineWidth: 0.5)
                }
        }
    }
}

private struct ErrdayGlassCircleModifier: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.colorSchemeContrast) private var contrast
    let tint: Color?
    let interactive: Bool

    @ViewBuilder
    func body(content: Content) -> some View {
        if reduceTransparency || contrast == .increased {
            content.background {
                Circle().fill(ErrdayTheme.surface)
                    .overlay { Circle().fill(tint ?? .clear) }
            }
                .overlay { Circle().strokeBorder(ErrdayTheme.border, lineWidth: 0.5).allowsHitTesting(false) }
        } else if #available(iOS 26.0, *) {
            if let tint {
                if interactive {
                    content.glassEffect(.regular.tint(tint).interactive(), in: Circle())
                } else {
                    content.glassEffect(.regular.tint(tint), in: Circle())
                }
            } else if interactive {
                content.glassEffect(.regular.interactive(), in: Circle())
            } else {
                content.glassEffect(.regular, in: Circle())
            }
        } else {
            content
                .background(.ultraThinMaterial, in: Circle())
                .overlay(Circle().stroke(ErrdayTheme.border.opacity(0.5), lineWidth: 0.5))
        }
    }
}
struct PageHeading: View {
    let title: String
    var subtitle: String = Date.now.formatted(.dateTime.locale(Locale(identifier: "en_GB")).weekday(.wide).day().month(.wide))
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title).font(.system(size: 28, weight: .semibold))
            Text(subtitle).font(.system(size: 13)).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.errdayAccent) private var accent
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var secondary = false
    @ViewBuilder
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity)
            .frame(minHeight: 50)
            .foregroundStyle(secondary ? ErrdayTheme.text : .white)
            .errdayGlass(radius: 25, tint: secondary ? nil : accent, interactive: isEnabled)
            .contentShape(Capsule())
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .opacity(isEnabled ? (configuration.isPressed ? 0.82 : 1) : 0.45)
            .animation(reduceMotion ? nil : .smooth(duration: 0.18), value: configuration.isPressed)
    }
}

struct ErrdayTextField: View {
    let label: String
    var placeholder: String = ""
    var unit: String = ""
    var keyboard: UIKeyboardType = .default
    @Binding var text: String
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(ErrdayTheme.secondary)
            HStack(spacing: 10) {
                TextField(placeholder, text: $text)
                    .textFieldStyle(.plain)
                    .keyboardType(keyboard)
                    .focused($focused)
                    .font(.system(size: 16))
                    .frame(maxWidth: .infinity, minHeight: 28)
                    .accessibilityLabel(label)
                if !unit.isEmpty {
                    Text(unit)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(ErrdayTheme.secondary)
                }
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 52)
            .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 10))
            .overlay {
                RoundedRectangle(cornerRadius: 10)
                    .stroke(focused ? ErrdayTheme.accent.opacity(0.65) : .clear, lineWidth: 1.5)
            }
        }
    }
}

struct ErrdayTextArea: View {
    let label: String
    var placeholder: String = ""
    @Binding var text: String
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(ErrdayTheme.secondary)
            TextField(placeholder, text: $text, axis: .vertical)
                .textFieldStyle(.plain)
                .focused($focused)
                .lineLimit(3...5)
                .font(.system(size: 15))
                .padding(14)
                .frame(maxWidth: .infinity, minHeight: 88, alignment: .topLeading)
                .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 10))
                .overlay {
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(focused ? ErrdayTheme.accent.opacity(0.65) : .clear, lineWidth: 1.5)
                }
                .accessibilityLabel(label)
        }
    }
}

struct ErrdaySegmentField<SelectionValue: Hashable, Content: View>: View {
    let label: String
    @Binding var selection: SelectionValue
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(ErrdayTheme.secondary)
            Picker(label, selection: $selection, content: content)
                .pickerStyle(.segmented)
                .labelsHidden()
        }
    }
}

struct ErrdayStepperField: View {
    let label: String
    let valueText: String
    @Binding var value: Int
    let range: ClosedRange<Int>

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(label).font(.system(size: 12, weight: .medium)).foregroundStyle(ErrdayTheme.secondary)
                Text(valueText).font(.system(size: 16, weight: .medium))
            }
            Spacer()
            Stepper(label, value: $value, in: range).labelsHidden()
        }
        .padding(.horizontal, 14)
        .frame(minHeight: 64)
        .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 10))
    }
}
struct SectionHeading: View {
    @Environment(\.errdayAccent) private var accent
    let title: String
    var actionTitle: String = "Details"
    var action: (() -> Void)?
    var body: some View {
        HStack { Text(title).font(.system(size: 18, weight: .semibold)); Spacer()
            if let action { Button(action: action) { HStack(spacing: 3) { Text(actionTitle); Image(systemName: "chevron.right").font(.system(size: 9)) } }.font(.system(size: 12)).foregroundStyle(accent).frame(minHeight: 32) }
        }
    }
}
struct MetricCard: View {
    let title: String; let value: String; let note: String; let icon: String
    var body: some View {
        ErrdayCard {
            HStack(spacing: 6) {
                if icon.hasPrefix("sf:") {
                    Image(systemName: String(icon.dropFirst(3))).foregroundStyle(ErrdayTheme.healthAccent).frame(width: 18)
                } else {
                    FigmaIcon(asset: icon)
                }
                Text(title).font(.system(size: 12)).foregroundStyle(ErrdayTheme.secondary)
            }
            Text(value).font(.system(size: 28, weight: .semibold)).minimumScaleFactor(0.65).lineLimit(1)
            Text(note).font(.system(size: 11)).foregroundStyle(ErrdayTheme.secondary)
        }
    }
}
struct EmptySection: View {
    let title: String; let symbol: String; let message: String
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(title, systemImage: symbol).font(.headline)
            Text(message).font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}
extension Double {
    var whole: String { formatted(.number.precision(.fractionLength(0))) }
    var decimal: String { formatted(.number.precision(.fractionLength(0...1))) }
}
