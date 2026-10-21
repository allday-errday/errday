import SwiftUI
import UIKit

@MainActor
enum ErrdayHaptics {
    static func success(isEnabled: Bool) {
        guard isEnabled else { return }
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.success)
    }

    static func selection(isEnabled: Bool) {
        guard isEnabled else { return }
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
    }

    static func tap(isEnabled: Bool) {
        guard isEnabled else { return }
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.prepare()
        generator.impactOccurred(intensity: 0.9)
    }
}

struct SuccessActionButton: View {
    let title: String
    var successTitle = "Added"
    var isEnabled = true
    let action: () -> Bool
    let onCompletion: () -> Void

    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var completed = false

    var body: some View {
        Button {
            guard !completed, action() else { return }
            withAnimation(.snappy(duration: 0.28)) { completed = true }
            ErrdayHaptics.success(isEnabled: hapticsEnabled)
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(520))
                onCompletion()
            }
        } label: {
            HStack(spacing: 8) {
                if completed {
                    Image(systemName: "checkmark")
                        .transition(.scale.combined(with: .opacity))
                }
                Text(completed ? successTitle : title)
                    .contentTransition(.numericText())
            }
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(!isEnabled || completed)
        .accessibilityLabel(completed ? successTitle : title)
    }
}
