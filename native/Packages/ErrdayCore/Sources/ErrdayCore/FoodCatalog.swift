import Foundation

public struct FoodCatalog: Codable, Sendable {
    public let schemaVersion: Int
    public let generatedAt: Date
    public let source: String
    public let license: String
    public let reports: [ImportReport]
    public let products: [FoodProduct]
    public struct ImportReport: Codable, Sendable {
        public let retailer: FoodRetailer
        public let sourceCount: Int
        public let receivedCount: Int
        public let allPagesFetched: Bool
    }
    public static func load(_ data: Data) throws -> FoodCatalog {
        let decoder = JSONDecoder(); decoder.dateDecodingStrategy = .iso8601
        let result = try decoder.decode(FoodCatalog.self, from: data)
        guard result.schemaVersion == 1 else { throw CocoaError(.fileReadCorruptFile) }
        return result
    }
}

/// The catalogue is public data. Search stays on device, including barcodes.
public struct FoodCatalogIndex: Sendable {
    private struct Row: Sendable {
        let product: FoodProduct
        let name: String
        let searchText: String
    }
    private let rows: [Row]
    public init(products: [FoodProduct]) {
        rows = products.map { Row(product: $0, name: Self.normalize($0.name), searchText: Self.normalize($0.name + " " + $0.brand + " " + ([$0.id] + ($0.barcodeAliases ?? [])).joined(separator: " "))) }
    }
    public func search(_ query: String, retailer: FoodRetailer?, limit: Int = 60) -> [FoodProduct] {
        let query = Self.normalize(query)
        let words = query.split(separator: " ").map(String.init)
        return rows.lazy.filter { row in
            (retailer == nil || row.product.retailers.contains(retailer!)) && words.allSatisfy { row.searchText.contains($0) }
        }.sorted { lhs, rhs in
            func rank(_ row: Row) -> Int {
                if row.product.id == query || row.product.barcodeAliases?.contains(query) == true { return 0 }
                if row.name == query { return 1 }
                if !query.isEmpty && row.name.hasPrefix(query) { return 2 }
                return row.product.nutrients.isComplete ? 3 : 4
            }
            let l = rank(lhs), r = rank(rhs)
            return l == r ? (lhs.name == rhs.name ? lhs.product.id < rhs.product.id : lhs.name < rhs.name) : l < r
        }.prefix(max(0, limit)).map(\.product)
    }
    private static func normalize(_ text: String) -> String {
        text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "de_CH"))
            .components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty }.joined(separator: " ")
    }
}
