import Foundation
import Security
import ErrdayCore

enum AssistantKeychain {
    struct StorageError: LocalizedError {
        let status: OSStatus
        var errorDescription: String? {
            switch status {
            case errSecMissingEntitlement:
                "This app build cannot access the Keychain (code \(status)). Reinstall the app with valid Xcode signing."
            case errSecInteractionNotAllowed:
                "The Keychain is locked (code \(status)). Unlock the iPhone and try again."
            default:
                "Saving to the iPhone Keychain failed (code \(status)). Share only this error code, never your key."
            }
        }
    }
    private static var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.errday.native.openai", kSecAttrAccount as String: "personal-api-key"]
    }
    static func read() -> String? {
        var q = query; q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func save(_ value: String) throws {
        let key = try AssistantKeyInput.normalize(value)
        let attributes: [String: Any] = [kSecValueData as String: Data(key.utf8), kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var q = query; attributes.forEach { q[$0.key] = $0.value }
            let added = SecItemAdd(q as CFDictionary, nil)
            guard added == errSecSuccess else { throw StorageError(status: added) }
        } else if status != errSecSuccess { throw StorageError(status: status) }
        guard read() == key else { throw StorageError(status: errSecNotAvailable) }
    }
    static func remove() throws {
        let result = SecItemDelete(query as CFDictionary)
        guard result == errSecSuccess || result == errSecItemNotFound else { throw StorageError(status: result) }
    }
}
