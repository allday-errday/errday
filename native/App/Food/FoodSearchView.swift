import SwiftUI
import ErrdayCore

private enum FoodSearchScope: String, CaseIterable, Identifiable {
    case all = "All"
    case myFoods = "My foods"
    case myMeals = "My meals"
    case savedFoods = "Saved foods"
    var id: String { rawValue }
}

struct FoodSearchView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PersonalStore.self) private var records
    @Environment(AssistantStore.self) private var assistant
    @State private var catalog = FoodCatalogStore()
    let slot: MealSlot
    let onPick: ((MealEntry) -> Void)?
    let date: Date
    @State private var query: String
    init(query: String = "", date: Date = .now, slot: MealSlot = .suggested(at: .now), onPick: ((MealEntry) -> Void)? = nil) {
        _query = State(initialValue: query); self.date = date; self.slot = slot; self.onPick = onPick
    }
    @State private var retailer: FoodRetailer?
    @State private var results: [FoodProduct] = []
    @State private var limit = 60
    @State private var searching = false
    @State private var destination: Destination?
    @State private var analyzing = false
    @State private var showConnection = false
    @State private var aiError: String?
    @State private var scope: FoodSearchScope = .all
    @FocusState private var searchFocused: Bool
    private enum Destination: Identifiable {
        case product(FoodProduct), recent(MealEntry), savedMeal(SavedMeal), ai(MealEntry), manual
        var id: String {
            switch self {
            case .product(let p): "product-" + p.id
            case .recent(let m): "recent-" + m.id.uuidString
            case .savedMeal(let m): "meal-" + m.id.uuidString
            case .ai(let m): "ai-" + m.id.uuidString
            case .manual: "manual"
            }
        }
    }
    private var recent: [MealEntry] {
        var seen = Set<String>()
        return records.data.meals.sorted { $0.date > $1.date }.filter {
            let matchesRetailer = retailer == nil || ($0.foodPortion?.product.retailers.contains(retailer!) ?? false)
            return matchesRetailer && (query.isEmpty || $0.name.localizedStandardContains(query)) && seen.insert($0.foodPortion?.product.id ?? $0.name.lowercased()).inserted
        }.prefix(8).map { $0 }
    }
    private var savedFoods: [MealEntry] {
        (records.data.savedFoods ?? []).filter { query.isEmpty || $0.name.localizedStandardContains(query) }
    }
    private var savedMeals: [SavedMeal] {
        (records.data.savedMeals ?? []).filter { query.isEmpty || $0.name.localizedStandardContains(query) }
    }
    private struct ResultGroup: Identifiable {
        let id: String
        let products: [FoodProduct]
    }
    private var groupedResults: [ResultGroup] {
        func normalize(_ value: String) -> String {
            value.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "de_CH"))
                .components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty }.joined(separator: " ")
        }
        var order: [String] = []; var groups: [String: [FoodProduct]] = [:]
        for product in results {
            let brand = product.brand.split(separator: ",").map { normalize(String($0)) }.sorted().joined(separator: ",")
            let key = normalize(product.name) + "|" + brand + "|" + product.unit.rawValue + (brand.isEmpty ? "|" + product.retailers.map(\.rawValue).sorted().joined(separator: ",") : "")
            if groups[key] == nil { order.append(key) }; groups[key, default: []].append(product)
        }
        return order.map { ResultGroup(id: $0, products: groups[$0]!) }
    }
    private var searchID: String { "\(query)|\(retailer?.rawValue ?? "all")|\(limit)|\(catalog.isLoaded)" }
    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 10) {
                        FigmaIcon(asset: "96c83")
                        TextField("Product, brand or barcode", text: $query).autocorrectionDisabled().textInputAutocapitalization(.never)
                            .focused($searchFocused)
                            .submitLabel(.search)
                            .onSubmit { searchFocused = false }
                            .accessibilityIdentifier("food-search-query")
                        if !query.isEmpty { Button { query = "" } label: { FigmaIcon(asset: "c6d22").frame(width: 44, height: 44) }.accessibilityLabel("Clear") }
                    }.padding(.vertical, 5)
                    FoodSearchScopeTabs(selection: $scope)
                    Button("Add manually", systemImage: "square.and.pencil") { destination = .manual }
                }
                if (scope == .all || scope == .myFoods) && !recent.isEmpty {
                    Section(scope == .all ? "Recently used" : "My foods") {
                        ForEach(recent) { meal in
                            Button { destination = .recent(meal) } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(meal.name).foregroundStyle(ErrdayTheme.text)
                                    Text("\(meal.calories.formatted(.number.precision(.fractionLength(0)))) kcal · last portion")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
                if scope == .myMeals {
                    Section("My meals") {
                        if savedMeals.isEmpty {
                            ContentUnavailableView("No meals yet", systemImage: "fork.knife", description: Text("Create a meal to reuse its ingredients and nutrition."))
                        } else {
                            ForEach(savedMeals) { savedMeal in
                                Button { destination = .savedMeal(savedMeal) } label: {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(savedMeal.name).foregroundStyle(ErrdayTheme.text)
                                        Text("\(savedMeal.ingredients.count) ingredients · \(savedMeal.calories.whole) kcal")
                                            .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
                if scope == .savedFoods {
                    Section("Saved foods") {
                        if savedFoods.isEmpty {
                            ContentUnavailableView("No saved foods", systemImage: "bookmark", description: Text("Save a food from its nutrition screen to find it here."))
                        } else {
                            ForEach(savedFoods) { meal in
                                Button { destination = .recent(meal) } label: { FoodMealRow(meal: meal) }
                            }
                        }
                    }
                }
                if scope == .all && query.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2 {
                    Section {
                        Button { generateWithAI() } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "sparkles").foregroundStyle(ErrdayTheme.accent)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text("General Results using AI").font(.system(size: 15, weight: .semibold)).foregroundStyle(ErrdayTheme.text)
                                    Text("Search online and prepare an editable estimate").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                                }
                                Spacer(); Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.quiet)
                            }.padding(.vertical, 5)
                        }.disabled(analyzing)
                    }
                }
                if scope == .all { Section("Foods") {
                    if let error = catalog.error {
                        Text(error).foregroundStyle(.secondary)
                        Button("Try Again") { Task { await catalog.load() } }
                    } else if !catalog.isLoaded || searching {
                        ProgressView("Loading foods …")
                    } else if results.isEmpty {
                        ContentUnavailableView.search(text: query)
                        Text("Not every Coop, Migros and Denner product is included. You can add a missing product manually.")
                            .font(.footnote).foregroundStyle(.secondary)
                    } else {
                        ForEach(groupedResults) { group in
                            if group.products.count == 1, let product = group.products.first {
                                Button { destination = .product(product) } label: { FoodProductRow(product: product) }
                            } else if let first = group.products.first {
                                DisclosureGroup {
                                    ForEach(group.products) { product in
                                        Button { destination = .product(product) } label: {
                                            VStack(alignment: .leading, spacing: 5) {
                                                Text("\(product.nutrients.calories?.decimal ?? "—") kcal · P \(product.nutrients.protein?.decimal ?? "—") · C \(product.nutrients.carbs?.decimal ?? "—") · F \(product.nutrients.fat?.decimal ?? "—") / 100 \(product.unit.rawValue)").foregroundStyle(ErrdayTheme.text)
                                                Text("Barcode \(product.id)").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                                            }.padding(.vertical, 6)
                                        }
                                    }
                                } label: {
                                    VStack(alignment: .leading, spacing: 5) {
                                        Text(first.name).foregroundStyle(ErrdayTheme.text)
                                        Text("\(first.brand) · \(group.products.count) nutrition variants").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                                        Text("Compare values with the package").font(.caption2).foregroundStyle(ErrdayTheme.quiet)
                                    }
                                }
                            }
                        }
                        if results.count == limit {
                            Button("Show More") { limit += 60 }
                        }
                    }
                } }
                if scope == .all { Section {
                    if catalog.isLoaded {
                        Text("\(catalog.productCount.formatted()) products" + (catalog.generatedAt.map { " · updated \($0.formatted(date: .abbreviated, time: .omitted))" } ?? ""))
                        Text("Retailer assignment comes from Open Food Facts. Current availability is not guaranteed. Search works offline.")
                    }
                    Link("Sources and licences", destination: URL(string: "https://www.naehrwertdaten.ch/en/downloads/")!)
                }.font(.footnote).foregroundStyle(.secondary) }
            }
            .scrollContentBackground(.hidden).errdayBackground()
            .navigationTitle("Log Food").navigationBarTitleDisplayMode(.inline)
            .onChange(of: query) { _, _ in limit = 60 }
            .onChange(of: retailer) { _, _ in limit = 60 }
            .task {
                searchFocused = true
                await catalog.load()
            }
            .task(id: searchID) {
                searching = true
                do { try await Task.sleep(for: .milliseconds(120)) } catch { return }
                let found = await catalog.search(query, retailer: retailer, limit: limit)
                guard !Task.isCancelled else { return }
                results = found; searching = false
            }
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .sheet(isPresented: $showConnection) { AssistantSettingsView() }
            .alert("AI search unavailable", isPresented: Binding(get: { aiError != nil }, set: { if !$0 { aiError = nil } })) {
                Button("OK") { aiError = nil }
            } message: { Text(aiError ?? "") }
            .sheet(item: $destination) { item in
                switch item {
                case .product(let product): FoodPortionEditor(product: product, date: date, slot: slot, onPick: onPick, onSaved: { dismiss() })
                case .recent(let meal):
                    if let portion = meal.foodPortion {
                        FoodPortionEditor(product: portion.product, preset: portion, presetName: meal.name, date: date, slot: slot, onPick: onPick, onSaved: { dismiss() })
                    } else { MealEditor(preset: meal, date: date, slot: slot, onPick: onPick, onSaved: { dismiss() }) }
                case .savedMeal(let meal): RecipeDetail(meal: meal, date: date)
                case .ai(let meal):
                    NutritionDetailView(meal: meal, isDraft: true) { entry in
                        if let onPick { onPick(entry) }
                        else { _ = records.saveMeal(entry) }
                        dismiss()
                    }
                case .manual: MealEditor(date: date, slot: slot, onPick: onPick, onSaved: { dismiss() })
                }
            }
        }
    }

    private func generateWithAI() {
        let request = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !analyzing, request.count >= 2 else { return }
        guard assistant.isConnected else { showConnection = true; return }

        if onPick == nil {
            guard assistant.startFoodAnalysis(description: request, slot: slot, trackingDate: date) else { return }
            dismiss()
            return
        }

        withAnimation { analyzing = true }; aiError = nil
        Task {
            defer { withAnimation { analyzing = false } }
            do {
                let estimate = try await assistant.analyzeFoodDescription(request)
                guard estimate.recognized else { aiError = "No clear food was found. Add a brand, retailer or portion size and try again."; return }
                var meal = try estimate.meal(slot: slot, source: .aiText)
                meal.date = FoodInput.entryDate(on: date)
                destination = .ai(meal)
            } catch {
                aiError = (error as? AssistantFailure)?.localizedDescription ?? "The food could not be analyzed. Check your internet and try again."
            }
        }
    }
}

private struct FoodSearchScopeTabs: View {
    @Binding var selection: FoodSearchScope

    var body: some View {
        Picker("Food collection", selection: $selection) {
            ForEach(FoodSearchScope.allCases) { scope in
                Text(scope.rawValue).tag(scope)
            }
        }
        .pickerStyle(.segmented)
    }
}

private struct FoodProductRow: View {
    let product: FoodProduct
    var body: some View {
        HStack(spacing: 12) {
            FigmaIcon(asset: "b9574")
            VStack(alignment: .leading, spacing: 5) {
            Text(product.name).foregroundStyle(ErrdayTheme.text)
            if !product.brand.isEmpty { Text(product.brand).font(.subheadline).foregroundStyle(.secondary) }
            Text(product.retailers.map { $0.title + (product.retailerEvidence?[$0.rawValue] == "brand" ? " (brand)" : "") }.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary)
            if let kcal = product.nutrients.calories {
                Text("\(kcal.formatted(.number.precision(.fractionLength(0)))) kcal / 100 \(product.unit.rawValue)")
                    .font(.caption).foregroundStyle(.secondary)
            }
            if !product.nutrients.isComplete { Text("Complete nutrition values").font(.caption).foregroundStyle(ErrdayTheme.foodAccent) }
            }
        }.padding(.vertical, 3).frame(maxWidth: .infinity, alignment: .leading)
    }
}
