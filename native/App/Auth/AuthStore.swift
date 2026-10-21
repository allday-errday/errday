import Auth
import Foundation
import Observation

@MainActor @Observable
final class AuthStore {
    enum Status: Equatable { case loading, signedOut, signedIn(UUID) }
    private(set) var status: Status = .loading
    private(set) var email = ""
    var errorMessage: String?
    var isWorking = false
    let configurationError: String?
    private let client: AuthClient?

    init() {
        do {
            let config = try AppConfiguration.load()
            client = AuthClient(
                url: config.supabaseURL.appending(path: "auth/v1"),
                headers: ["apikey": config.publishableKey],
                storageKey: "errday-native-session",
                localStorage: KeychainLocalStorage(),
                emitLocalSessionAsInitialSession: false
            )
            configurationError = nil
        } catch {
            client = nil; configurationError = error.localizedDescription; status = .signedOut
        }
    }

    func observeSession() async {
        guard let client else { return }
        for await (_, session) in client.authStateChanges {
            guard !Task.isCancelled else { return }
            if let session, !session.isExpired {
                email = session.user.email ?? ""
                status = .signedIn(session.user.id)
            } else {
                email = ""; status = .signedOut
            }
        }
    }

    func signIn(email: String, password: String) async {
        guard let client, !isWorking else { return }
        isWorking = true; errorMessage = nil
        defer { isWorking = false }
        do {
            let session = try await client.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
            self.email = session.user.email ?? email
            status = .signedIn(session.user.id)
        } catch {
            errorMessage = (error as? URLError) != nil
                ? "No connection. Check your internet and try again."
                : "Login failed. Check your email and password or try again later."
        }
    }

    func signOut() async {
        guard let client, !isWorking else { return }
        isWorking = true; errorMessage = nil
        defer { isWorking = false }
        do {
            try await client.signOut(scope: .local)
            status = .signedOut; email = ""
        } catch {
            errorMessage = "Sign out failed. Please try again."
        }
    }
}
