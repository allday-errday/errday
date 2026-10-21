import SwiftUI

struct AppearanceSettingsLink: View {
    @AppStorage(AppAppearance.storageKey) private var appearance = AppAppearance.system

    var body: some View {
        NavigationLink {
            AppearanceSettingsView()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "circle.lefthalf.filled")
                    .frame(width: 22)
                    .foregroundStyle(ErrdayTheme.accent)
                Text("Appearance").font(.system(size: 15))
                Spacer()
                Text(appearance.title)
                    .font(.subheadline)
                    .foregroundStyle(ErrdayTheme.secondary)
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(ErrdayTheme.quiet)
            }
            .frame(maxWidth: .infinity, minHeight: 46)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("settings.appearance")
    }
}

struct AppearanceSettingsView: View {
    @AppStorage(AppAppearance.storageKey) private var appearance = AppAppearance.system

    var body: some View {
        Form {
            Section {
                Picker("Appearance", selection: $appearance) {
                    ForEach(AppAppearance.allCases) { option in
                        Label(option.title, systemImage: option.symbol)
                            .tag(option)
                            .accessibilityIdentifier("appearance.\(option.rawValue)")
                    }
                }
                .pickerStyle(.inline)
                .labelsHidden()
            } footer: {
                Text("System follows your iPhone’s appearance. Your choice is saved automatically for Errday.")
            }
        }
        .scrollContentBackground(.hidden)
        .errdayBackground()
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
        // Also update immediately when opened inside the Settings sheet.
        .preferredColorScheme(appearance.colorScheme)
    }
}

#Preview {
    NavigationStack { AppearanceSettingsView() }
        .tint(ErrdayTheme.accent)
}
