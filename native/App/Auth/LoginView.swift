import SwiftUI

struct LoginView: View {
    @Environment(AuthStore.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @FocusState private var field: Field?
    private enum Field { case email, password }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                BrandHeader().padding(.top, 50)
                VStack(alignment: .leading, spacing: 10) {
                    Text("Your day.\nYour progress.").font(.largeTitle.weight(.semibold))
                    Text("Nutrition, training and health in one place.")
                        .foregroundStyle(.secondary)
                }
                ErrdayCard {
                    Text("Welcome back").font(.title3.weight(.semibold))
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Email").font(.subheadline)
                        TextField("Your email address", text: $email)
                            .textContentType(.username).keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                            .focused($field, equals: .email).submitLabel(.next)
                            .onSubmit { field = .password }
                    }
                    Divider()
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Password").font(.subheadline)
                        SecureField("Your password", text: $password)
                            .textContentType(.password).focused($field, equals: .password)
                            .submitLabel(.go).onSubmit { signIn() }
                    }
                    if let error = auth.configurationError ?? auth.errorMessage {
                        Text(error).font(.subheadline).foregroundStyle(.red).accessibilityIdentifier("login-error")
                    }
                    Button(action: signIn) {
                        if auth.isWorking { ProgressView().tint(ErrdayTheme.background) }
                        else { Text("Sign In") }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(email.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty || auth.isWorking || auth.configurationError != nil)
                    .accessibilityIdentifier("login-submit")
                }
                Text("Sign in with your existing Errday account.")
                    .font(.footnote).foregroundStyle(.secondary)
            }.padding(24).frame(maxWidth: 500)
                .frame(maxWidth: .infinity)
        }
        .errdayBackground()
        .onDisappear { password = "" }
    }

    private func signIn() {
        guard !email.trimmingCharacters(in: .whitespaces).isEmpty, !password.isEmpty else { return }
        field = nil
        Task { await auth.signIn(email: email, password: password); password = "" }
    }
}

#Preview("Anmeldung") {
    LoginView().environment(AuthStore()).preferredColorScheme(.dark).tint(ErrdayTheme.accent)
}
