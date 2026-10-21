import Foundation

struct AppConfiguration: Decodable {
    let supabaseURL: URL
    let publishableKey: String

    static func load(bundle: Bundle = .main) throws -> Self {
        guard let file = bundle.url(forResource: "Local", withExtension: "plist") else { throw ConfigurationError.missing }
        let config = try PropertyListDecoder().decode(Self.self, from: Data(contentsOf: file))
        guard config.supabaseURL.scheme == "https", config.supabaseURL.host != nil,
              !config.publishableKey.isEmpty, !config.publishableKey.hasPrefix("sb_secret_") else {
            throw ConfigurationError.invalid
        }
        // Legacy anonymous keys are public. Privileged JWT keys must never enter a mobile app.
        if !config.publishableKey.hasPrefix("sb_publishable_") {
            let parts = config.publishableKey.split(separator: ".")
            guard parts.count == 3 else { throw ConfigurationError.invalid }
            var payload = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
            payload += String(repeating: "=", count: (4 - payload.count % 4) % 4)
            guard let bytes = Data(base64Encoded: payload),
                  let claims = try JSONSerialization.jsonObject(with: bytes) as? [String: Any],
                  claims["role"] as? String == "anon" else { throw ConfigurationError.invalid }
        }
        return config
    }

    enum ConfigurationError: LocalizedError {
        case missing, invalid
        var errorDescription: String? { "Login is not configured yet. Check the local app configuration." }
    }
}
