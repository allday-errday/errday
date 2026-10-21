import AuthenticationServices
import ErrdayCore
import Foundation
import Observation
import Security
import SwiftUI
import UIKit

@MainActor @Observable
final class StravaStore: NSObject {
    private(set) var isConnected = false
    private(set) var athleteName: String?
    private(set) var isBusy = false
    var errorMessage: String?
    var lastSharedWorkoutID: UUID?

    private var credentials = StravaCredentials.load()
    private var webSession: ASWebAuthenticationSession?
    private let presentation = StravaPresentationContext()

    override init() {
        super.init()
        isConnected = credentials?.refreshToken.isEmpty == false
        athleteName = credentials?.athleteName
    }

    var configuredClientID: String { credentials?.clientID ?? "" }
    var hasDeveloperCredentials: Bool {
        guard let credentials else { return false }
        return !credentials.clientID.isEmpty && !credentials.clientSecret.isEmpty
    }

    func connect(clientID: String, clientSecret: String) async {
        let id = clientID.trimmingCharacters(in: .whitespacesAndNewlines)
        let secret = clientSecret.trimmingCharacters(in: .whitespacesAndNewlines)
        guard Int(id) != nil, !secret.isEmpty else {
            errorMessage = "Enter the Client ID and Client Secret from your Strava API application."
            return
        }
        isBusy = true; errorMessage = nil
        defer { isBusy = false }
        do {
            var saved = credentials ?? StravaCredentials(clientID: id, clientSecret: secret)
            saved.clientID = id; saved.clientSecret = secret
            try saved.save(); credentials = saved
            let state = UUID().uuidString
            var components = URLComponents(string: "https://www.strava.com/oauth/mobile/authorize")!
            components.queryItems = [
                .init(name: "client_id", value: id),
                .init(name: "redirect_uri", value: "errday://errday.app/strava"),
                .init(name: "response_type", value: "code"),
                .init(name: "approval_prompt", value: "auto"),
                .init(name: "scope", value: "read,activity:write"),
                .init(name: "state", value: state)
            ]
            let callback = try await authorize(url: components.url!)
            guard let callbackParts = URLComponents(url: callback, resolvingAgainstBaseURL: false),
                  callbackParts.queryItems?.first(where: { $0.name == "state" })?.value == state,
                  let code = callbackParts.queryItems?.first(where: { $0.name == "code" })?.value else {
                throw StravaError.authorization
            }
            let token = try await tokenRequest([
                "client_id": id, "client_secret": secret, "code": code, "grant_type": "authorization_code"
            ])
            try store(token: token, developer: saved)
        } catch is CancellationError {
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Strava could not be connected."
        }
    }

    func disconnect() {
        guard var saved = credentials else { return }
        saved.accessToken = ""; saved.refreshToken = ""; saved.expiresAt = 0; saved.athleteName = nil
        try? saved.save(); credentials = saved; isConnected = false; athleteName = nil
        lastSharedWorkoutID = nil; errorMessage = nil
    }

    func share(_ workout: Workout) async -> Bool {
        guard !isBusy else { return false }
        isBusy = true; errorMessage = nil
        defer { isBusy = false }
        do {
            let token = try await validAccessToken()
            var request = URLRequest(url: URL(string: "https://www.strava.com/api/v3/activities")!)
            request.httpMethod = "POST"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            let elapsed = max(1, Int((workout.finishedAt ?? .now).timeIntervalSince(workout.startedAt)))
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = .current
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
            let fields = [
                "name": workout.name.isEmpty ? "Strength Training" : workout.name,
                "sport_type": "WeightTraining",
                "start_date_local": formatter.string(from: workout.startedAt),
                "elapsed_time": String(elapsed),
                "description": description(for: workout)
            ]
            request.httpBody = Self.form(fields)
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw StravaError.unavailable }
            guard (200..<300).contains(http.statusCode) else {
                if http.statusCode == 401 { throw StravaError.expired }
                throw StravaError.upload
            }
            lastSharedWorkoutID = workout.id
            return true
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "The workout could not be shared to Strava."
            return false
        }
    }

    private func authorize(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "errday") { callback, error in
                if let sessionError = error as? ASWebAuthenticationSessionError, sessionError.code == .canceledLogin {
                    continuation.resume(throwing: CancellationError()); return
                }
                if let error { continuation.resume(throwing: error); return }
                guard let callback else { continuation.resume(throwing: StravaError.authorization); return }
                continuation.resume(returning: callback)
            }
            session.presentationContextProvider = presentation
            session.prefersEphemeralWebBrowserSession = false
            webSession = session
            guard session.start() else { continuation.resume(throwing: StravaError.authorization); return }
        }
    }

    private func validAccessToken() async throws -> String {
        guard var saved = credentials, !saved.refreshToken.isEmpty else { throw StravaError.notConnected }
        if saved.expiresAt > Date.now.timeIntervalSince1970 + 60, !saved.accessToken.isEmpty { return saved.accessToken }
        let token = try await tokenRequest([
            "client_id": saved.clientID, "client_secret": saved.clientSecret,
            "refresh_token": saved.refreshToken, "grant_type": "refresh_token"
        ])
        try store(token: token, developer: saved)
        saved = credentials!
        return saved.accessToken
    }

    private func tokenRequest(_ fields: [String: String]) async throws -> StravaTokenResponse {
        var request = URLRequest(url: URL(string: "https://www.strava.com/oauth/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = Self.form(fields)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let token = try? JSONDecoder().decode(StravaTokenResponse.self, from: data) else {
            throw StravaError.token
        }
        return token
    }

    private func store(token: StravaTokenResponse, developer: StravaCredentials) throws {
        var saved = developer
        saved.accessToken = token.accessToken
        saved.refreshToken = token.refreshToken
        saved.expiresAt = token.expiresAt
        if let athlete = token.athlete {
            saved.athleteName = [athlete.firstname, athlete.lastname].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
        }
        try saved.save(); credentials = saved; isConnected = true; athleteName = saved.athleteName; errorMessage = nil
    }

    private func description(for workout: Workout) -> String {
        let completedExercises = workout.exercises.compactMap { exercise -> (Exercise, [WorkoutSet])? in
            let sets = exercise.sets.filter(\.completed)
            return sets.isEmpty ? nil : (exercise, sets)
        }
        let elapsed = max(0, Int((workout.finishedAt ?? .now).timeIntervalSince(workout.startedAt)))
        var lines = [
            "Workout summary",
            "\(durationText(elapsed)) · \(completedExercises.count) \(completedExercises.count == 1 ? "exercise" : "exercises") · \(workout.completedSets) \(workout.completedSets == 1 ? "set" : "sets")",
            "Total volume: \(number(workout.volume)) kg"
        ]
        for (exercise, sets) in completedExercises.prefix(20) {
            lines.append("")
            lines.append(exercise.name)
            lines.append(sets.map(setText).joined(separator: " · "))
        }
        lines.append("")
        lines.append("Logged with Errday")
        return String(lines.joined(separator: "\n").prefix(2_000))
    }

    private func setText(_ set: WorkoutSet) -> String {
        let prefix: String
        switch set.effectiveType {
        case .warmup: prefix = "Warm-up: "
        case .drop: prefix = "Drop: "
        case .failure: prefix = "Failure: "
        case .left: prefix = "Left: "
        case .right: prefix = "Right: "
        case .myoReps: prefix = "Myo-reps: "
        case .normal: prefix = ""
        }
        return "\(prefix)\(number(set.weight)) kg × \(set.repetitions)"
    }

    private func number(_ value: Double) -> String {
        value.formatted(.number.grouping(.automatic).precision(.fractionLength(0...2)))
    }

    private func durationText(_ seconds: Int) -> String {
        let minutes = max(1, seconds / 60)
        let hours = minutes / 60
        let remainder = minutes % 60
        if hours == 0 { return "\(minutes) min" }
        if remainder == 0 { return "\(hours) hr" }
        return "\(hours) hr \(remainder) min"
    }

    private static func form(_ fields: [String: String]) -> Data {
        var components = URLComponents()
        components.queryItems = fields.sorted { $0.key < $1.key }.map(URLQueryItem.init)
        return Data((components.percentEncodedQuery ?? "").utf8)
    }
}

private final class StravaPresentationContext: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
}

private struct StravaTokenResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Double
    let athlete: Athlete?
    struct Athlete: Decodable { let firstname: String?; let lastname: String? }
    enum CodingKeys: String, CodingKey {
        case athlete
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresAt = "expires_at"
    }
}

private struct StravaCredentials: Codable {
    var clientID: String
    var clientSecret: String
    var accessToken = ""
    var refreshToken = ""
    var expiresAt: Double = 0
    var athleteName: String?

    private static let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "com.errday.native.strava",
        kSecAttrAccount as String: "personal-connection"
    ]
    static func load() -> Self? {
        var query = query; query[kSecReturnData as String] = true; query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return try? JSONDecoder().decode(Self.self, from: data)
    }
    func save() throws {
        let data = try JSONEncoder().encode(self)
        let attributes: [String: Any] = [kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status = SecItemUpdate(Self.query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var query = Self.query; attributes.forEach { query[$0.key] = $0.value }
            guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else { throw StravaError.keychain }
        } else if status != errSecSuccess { throw StravaError.keychain }
    }
}

private enum StravaError: LocalizedError {
    case authorization, token, keychain, notConnected, expired, upload, unavailable
    var errorDescription: String? {
        switch self {
        case .authorization: "Strava authorization was not completed. Check the callback domain and try again."
        case .token: "Strava did not accept the Client ID, Client Secret or authorization code."
        case .keychain: "The Strava connection could not be saved in the iPhone Keychain."
        case .notConnected: "Connect Strava in Profile first."
        case .expired: "The Strava connection expired. Reconnect it in Profile."
        case .upload: "Strava did not accept this workout. Try again later."
        case .unavailable: "Strava is currently unavailable."
        }
    }
}

struct StravaSettingsView: View {
    @Environment(StravaStore.self) private var strava
    @Environment(\.dismiss) private var dismiss
    @State private var clientID = ""
    @State private var clientSecret = ""

    var body: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: "Strava", subtitle: "Share completed strength workouts from Errday.")
                if strava.isConnected {
                    ErrdayCard {
                        Label("Connected", systemImage: "checkmark.circle.fill").font(.headline).foregroundStyle(.green)
                        if let name = strava.athleteName, !name.isEmpty { Text(name).foregroundStyle(ErrdayTheme.secondary) }
                        Text("Completed workouts can be shared as Weight Training activities. You choose each workout before it is uploaded.")
                            .font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                        Button("Disconnect", role: .destructive) { strava.disconnect() }
                    }
                } else {
                    ErrdayCard {
                        Text("1. Create your Strava API application").font(.headline)
                        Text("Set the Authorization Callback Domain to errday.app. Then copy its Client ID and Client Secret below.")
                            .font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                        Text("Strava currently requires a Strava subscription before it lets you create an API application.")
                            .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                        Link("Open Strava API Settings", destination: URL(string: "https://www.strava.com/settings/api")!)
                    }
                    ErrdayCard {
                        Text("2. Connect Errday").font(.headline)
                        ErrdayTextField(label: "Client ID", placeholder: "123456", keyboard: .numberPad, text: $clientID)
                        VStack(alignment: .leading, spacing: 7) {
                            Text("Client Secret").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                            SecureField("From Strava", text: $clientSecret)
                                .textInputAutocapitalization(.never).autocorrectionDisabled()
                                .padding(.horizontal, 14).frame(minHeight: 50)
                                .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 12))
                        }
                        Button {
                            Task { await strava.connect(clientID: clientID, clientSecret: clientSecret) }
                        } label: {
                            HStack { if strava.isBusy { ProgressView() }; Text("Connect with Strava") }
                        }.buttonStyle(PrimaryButtonStyle()).disabled(strava.isBusy || clientID.isEmpty || clientSecret.isEmpty)
                        Text("The Client Secret and Strava tokens stay in this iPhone's Keychain. They are not included in the app.")
                            .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    }
                }
                if let error = strava.errorMessage { Text(error).font(.footnote).foregroundStyle(.orange) }
            }
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .task { if clientID.isEmpty { clientID = strava.configuredClientID } }
        }
    }
}
