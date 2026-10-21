import Foundation
import Observation
import SQLite3
import ErrdayCore

private struct FoodCatalogSummary: Sendable {
    let productCount: Int
    let generatedAt: Date
    let sourceDescription: String
    let usesExpandedCatalog: Bool
}

actor FoodCatalogLoader {
    private var database: OpaquePointer?
    private var fallbackIndex: FoodCatalogIndex?
    private var summary: FoodCatalogSummary?

    deinit {
        if let database { sqlite3_close(database) }
    }

    fileprivate func load() throws -> FoodCatalogSummary {
        if let summary { return summary }

        if let url = Bundle.main.url(forResource: "food-catalog-v2", withExtension: "sqlite") {
            var handle: OpaquePointer?
            let flags = SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX
            guard sqlite3_open_v2(url.path, &handle, flags, nil) == SQLITE_OK, let handle else {
                if let handle { sqlite3_close(handle) }
                throw CocoaError(.fileReadCorruptFile)
            }
            do {
                let productCount = try scalarInt("select count(*) from products", database: handle)
                guard productCount > 0 else { throw CocoaError(.fileReadCorruptFile) }
                let generated = try scalarText("select generated_at from import_runs order by generated_at desc limit 1", database: handle)
                let date = generated.flatMap { ISO8601DateFormatter().date(from: $0) } ?? .now
                database = handle
                let result = FoodCatalogSummary(
                    productCount: productCount,
                    generatedAt: date,
                    sourceDescription: "Open Food Facts + Swiss Food Composition Database",
                    usesExpandedCatalog: true
                )
                summary = result
                return result
            } catch {
                sqlite3_close(handle)
                throw error
            }
        }

        guard let url = Bundle.main.url(forResource: "food-catalog", withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }
        let catalogue = try FoodCatalog.load(Data(contentsOf: url))
        fallbackIndex = FoodCatalogIndex(products: catalogue.products)
        let result = FoodCatalogSummary(
            productCount: catalogue.products.count,
            generatedAt: catalogue.generatedAt,
            sourceDescription: catalogue.source,
            usesExpandedCatalog: false
        )
        summary = result
        return result
    }

    func search(_ text: String, retailer: FoodRetailer?, limit: Int) throws -> [FoodProduct] {
        if let database {
            return try searchSQLite(text, retailer: retailer, limit: limit, database: database)
        }
        return fallbackIndex?.search(text, retailer: retailer, limit: limit) ?? []
    }

    private func searchSQLite(_ text: String, retailer: FoodRetailer?, limit: Int, database: OpaquePointer) throws -> [FoodProduct] {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let baseSelect = """
            select p.barcode, p.id, p.name, p.brand, p.unit,
                   p.calories, p.protein, p.carbs, p.fat, p.fiber, p.sugar, p.sodium,
                   p.source_updated_at, p.fetched_at,
                   coalesce(group_concat(distinct pr.retailer || ':' || pr.evidence), '')
            from products p
            left join product_retailers pr on pr.product_id = p.id
            """
        let retailerClause = "(? = '' or exists (select 1 from product_retailers filter where filter.product_id = p.id and filter.retailer = ?))"
        let sql: String
        let ftsQuery: String?
        if trimmed.isEmpty {
            sql = baseSelect + " where " + retailerClause + " group by p.id order by p.name collate nocase, p.id limit ?"
            ftsQuery = nil
        } else {
            guard let query = Self.ftsQuery(from: trimmed) else { return [] }
            sql = baseSelect + """
                 where (p.barcode = ? or p.id in (select product_id from product_search where product_search match ?))
                   and \(retailerClause)
                 group by p.id
                 order by case when p.barcode = ? then 0 else 1 end,
                          case when p.calories is not null and p.protein is not null and p.carbs is not null and p.fat is not null then 0 else 1 end,
                          p.name collate nocase, p.id
                 limit ?
                """
            ftsQuery = query
        }

        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
            throw databaseError(database)
        }
        defer { sqlite3_finalize(statement) }

        let retailerValue = retailer?.rawValue ?? ""
        if let ftsQuery {
            bind(trimmed, at: 1, to: statement)
            bind(ftsQuery, at: 2, to: statement)
            bind(retailerValue, at: 3, to: statement)
            bind(retailerValue, at: 4, to: statement)
            bind(trimmed, at: 5, to: statement)
            sqlite3_bind_int(statement, 6, Int32(max(0, limit)))
        } else {
            bind(retailerValue, at: 1, to: statement)
            bind(retailerValue, at: 2, to: statement)
            sqlite3_bind_int(statement, 3, Int32(max(0, limit)))
        }

        var products: [FoodProduct] = []
        while true {
            let result = sqlite3_step(statement)
            if result == SQLITE_DONE { break }
            guard result == SQLITE_ROW else { throw databaseError(database) }
            products.append(Self.product(from: statement))
        }
        return products
    }

    private static func product(from statement: OpaquePointer) -> FoodProduct {
        let code = optionalText(statement, 0)
        let sourceID = text(statement, 1)
        let updatedAt = optionalText(statement, 12).flatMap { ISO8601DateFormatter().date(from: $0) }
        let fetchedAt = ISO8601DateFormatter().date(from: text(statement, 13)) ?? .now
        let retailerPairs = text(statement, 14).split(separator: ",")
        var retailers: [FoodRetailer] = []
        var evidence: [String: String] = [:]
        for pair in retailerPairs {
            let parts = pair.split(separator: ":", maxSplits: 1).map(String.init)
            guard let raw = parts.first, let retailer = FoodRetailer(rawValue: raw) else { continue }
            retailers.append(retailer)
            if parts.count == 2 { evidence[raw] = parts[1] }
        }
        var product = FoodProduct(
            id: code ?? sourceID,
            name: text(statement, 2),
            brand: text(statement, 3),
            nutrients: FoodNutrients(
                calories: optionalDouble(statement, 5),
                protein: optionalDouble(statement, 6),
                carbs: optionalDouble(statement, 7),
                fat: optionalDouble(statement, 8),
                fiber: optionalDouble(statement, 9),
                sugar: optionalDouble(statement, 10),
                sodium: optionalDouble(statement, 11)
            ),
            unit: FoodUnit(rawValue: text(statement, 4)) ?? .g,
            retailers: retailers,
            sourceUpdatedAt: updatedAt,
            fetchedAt: fetchedAt
        )
        product.retailerEvidence = evidence.isEmpty ? nil : evidence
        return product
    }

    private static func ftsQuery(from text: String) -> String? {
        let terms = text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "de_CH"))
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
        guard !terms.isEmpty else { return nil }
        return terms.map { "\"\($0.replacingOccurrences(of: "\"", with: "\"\""))\"*" }.joined(separator: " AND ")
    }

    private func scalarInt(_ sql: String, database: OpaquePointer) throws -> Int {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
            throw databaseError(database)
        }
        defer { sqlite3_finalize(statement) }
        guard sqlite3_step(statement) == SQLITE_ROW else { throw databaseError(database) }
        return Int(sqlite3_column_int64(statement, 0))
    }

    private func scalarText(_ sql: String, database: OpaquePointer) throws -> String? {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(database, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
            throw databaseError(database)
        }
        defer { sqlite3_finalize(statement) }
        guard sqlite3_step(statement) == SQLITE_ROW else { return nil }
        return Self.optionalText(statement, 0)
    }

    private func databaseError(_ database: OpaquePointer) -> Error {
        let message = String(cString: sqlite3_errmsg(database))
        return NSError(domain: "ErrdayFoodCatalog", code: Int(sqlite3_errcode(database)), userInfo: [NSLocalizedDescriptionKey: message])
    }

    private func bind(_ value: String, at index: Int32, to statement: OpaquePointer) {
        sqlite3_bind_text(statement, index, value, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
    }

    private static func text(_ statement: OpaquePointer, _ index: Int32) -> String {
        guard let value = sqlite3_column_text(statement, index) else { return "" }
        return String(cString: value)
    }

    private static func optionalText(_ statement: OpaquePointer, _ index: Int32) -> String? {
        sqlite3_column_type(statement, index) == SQLITE_NULL ? nil : text(statement, index)
    }

    private static func optionalDouble(_ statement: OpaquePointer, _ index: Int32) -> Double? {
        sqlite3_column_type(statement, index) == SQLITE_NULL ? nil : sqlite3_column_double(statement, index)
    }
}

@MainActor @Observable
final class FoodCatalogStore {
    private(set) var isLoaded = false
    private(set) var productCount = 0
    private(set) var generatedAt: Date?
    private(set) var sourceDescription = ""
    private(set) var usesExpandedCatalog = false
    private(set) var error: String?
    private let loader = FoodCatalogLoader()

    func load() async {
        guard !isLoaded else { return }
        do {
            let summary = try await loader.load()
            productCount = summary.productCount
            generatedAt = summary.generatedAt
            sourceDescription = summary.sourceDescription
            usesExpandedCatalog = summary.usesExpandedCatalog
            isLoaded = true
            error = nil
        } catch {
            self.error = "The food database could not be loaded. You can still add food manually."
        }
    }

    func search(_ text: String, retailer: FoodRetailer?, limit: Int) async -> [FoodProduct] {
        if !isLoaded { await load() }
        guard isLoaded else { return [] }
        do {
            return try await loader.search(text, retailer: retailer, limit: limit)
        } catch {
            self.error = "The food database could not be searched. You can still add food manually."
            return []
        }
    }
}
