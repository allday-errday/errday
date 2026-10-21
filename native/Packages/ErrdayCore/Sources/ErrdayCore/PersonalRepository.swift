import Foundation

public struct PersonalRepository: Sendable {
    public let directory: URL
    public let userID: UUID
    public init(directory: URL, userID: UUID) { self.directory = directory; self.userID = userID }
    public var fileURL: URL { directory.appendingPathComponent(userID.uuidString).appendingPathExtension("json") }

    public func load() throws -> PersonalData {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return PersonalData() }
        let data = try JSONDecoder().decode(PersonalData.self, from: Data(contentsOf: fileURL))
        guard (1...3).contains(data.schemaVersion) else { throw RepositoryError.unsupportedVersion }
        return data
    }

    public func save(_ data: PersonalData) throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let encoded = try JSONEncoder().encode(data)
        #if os(iOS)
        try encoded.write(to: fileURL, options: [.atomic, .completeFileProtection])
        #else
        try encoded.write(to: fileURL, options: .atomic)
        #endif
    }

    public enum RepositoryError: Error { case unsupportedVersion }
}
