import Foundation

public enum AssistantKeyInput {
    public enum InputError: LocalizedError {
        case empty, invalid
        public var errorDescription: String? {
            switch self {
            case .empty: "Paste your API key into the field first."
            case .invalid: "Paste only the complete API key without extra text. It starts with sk-."
            }
        }
    }
    public static func normalize(_ input: String) throws -> String {
        let edges = CharacterSet.whitespacesAndNewlines.union(CharacterSet(charactersIn: "\u{FEFF}\u{200B}"))
        var value = input.trimmingCharacters(in: edges)
        if value.count >= 2, let first = value.first, let last = value.last,
           (first == "\"" && last == "\"") || (first == "'" && last == "'") {
            value = String(value.dropFirst().dropLast()).trimmingCharacters(in: edges)
        }
        guard !value.isEmpty else { throw InputError.empty }
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_")
        guard value.hasPrefix("sk-"), value.count > 20, value.count <= 1024,
              value.unicodeScalars.allSatisfy({ allowed.contains($0) }) else { throw InputError.invalid }
        return value
    }
}
