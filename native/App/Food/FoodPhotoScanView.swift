import AVFoundation
import ErrdayCore
import PhotosUI
import SwiftUI
import UIKit
@preconcurrency import Vision

private struct ScannedLabelReview: Identifiable {
    let id = UUID()
    let product: FoodProduct
    let portion: FoodPortion
    let name: String
    let note: String
}

struct FoodPhotoScanView: View {
    @Environment(AssistantStore.self) private var assistant
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var catalog = FoodCatalogStore()
    var slot: MealSlot = .suggested(at: .now)
    var date: Date = .now

    @State private var image: UIImage?
    @State private var photoItem: PhotosPickerItem?
    @State private var showCamera = true
    @State private var cameraAuthorized = AVCaptureDevice.authorizationStatus(for: .video) == .authorized
    @State private var showConnection = false
    @State private var isScanning = false
    @State private var estimate: FoodPhotoEstimate?
    @State private var draft: MealEntry?
    @State private var labelReview: ScannedLabelReview?
    @State private var selectedProduct: FoodProduct?
    @State private var databaseMatches: [FoodProduct] = []
    @State private var guidance = ""
    @State private var error: String?
    @State private var cameraAccessBlocked = false

    var body: some View {
        Group {
            if showCamera {
                FoodCameraCapture(
                    isPresented: $showCamera,
                    isActive: cameraAuthorized,
                    onCancel: { dismiss() },
                    onImage: setImage
                )
                .ignoresSafeArea()
            } else {
                reviewView
            }
        }
        .task {
            openCamera()
            await catalog.load()
        }
    }

    private var reviewView: some View {
        NavigationStack {
            ErrdayPage {
                PageHeading(title: "Scan food", subtitle: "Photograph a meal, package or nutrition label.")
                photoPreview
                HStack(spacing: 8) {
                    Button { openCamera() } label: { Label("Camera", systemImage: "camera") }
                        .buttonStyle(PrimaryButtonStyle())
                    PhotosPicker(selection: $photoItem, matching: .images) {
                        Label("Library", systemImage: "photo.on.rectangle")
                    }.buttonStyle(PrimaryButtonStyle(secondary: true))
                }
                if image != nil {
                    ErrdayCard {
                        Text("Add a correction").font(.headline)
                        ErrdayTextArea(label: "What should the AI know?", placeholder: "For example: OAKBERRY Works size, or I ate half", text: $guidance)
                        Text("Add the brand, exact menu item and size when you know them. Errday can check current public menu information before estimating.")
                            .font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    }
                }
                if !assistant.isConnected {
                    ErrdayCard {
                        Text("Connect OpenAI").font(.headline)
                        Text("The same API connection used by the Errday assistant powers photo recognition.")
                            .font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                        Button("Open AI Connection") { showConnection = true }.buttonStyle(PrimaryButtonStyle())
                    }
                } else if image != nil {
                    Button { scan() } label: {
                        HStack { if isScanning { ProgressView().tint(.white) }; Text(isScanning ? "Checking database, web and photo …" : (estimate == nil ? "Scan Food" : "Update Estimate")) }
                    }.buttonStyle(PrimaryButtonStyle()).disabled(isScanning)
                }
                if !databaseMatches.isEmpty { databaseCard }
                if let estimate { resultCard(estimate) }
                if let error {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(error).font(.footnote).foregroundStyle(.orange)
                        if cameraAccessBlocked {
                            Button("Open Camera Settings") {
                                guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                                openURL(url)
                            }
                            .buttonStyle(PrimaryButtonStyle(secondary: true))
                        }
                    }
                }
                Text("The selected photo is sent to OpenAI for this analysis and is not saved by Errday. Nutrition from a photo is an estimate; review every value before adding it.")
                    .font(.caption).foregroundStyle(ErrdayTheme.secondary)
            }
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .onChange(of: photoItem) { _, item in load(item) }
            .sheet(isPresented: $showConnection) { AssistantSettingsView() }
            .sheet(item: $draft) { meal in
                NutritionDetailView(meal: meal, isDraft: true) { entry in
                    if assistant.isConnected, entry.isValid, records.saveMeal(entry) { dismiss() }
                }
            }
            .sheet(item: $labelReview) { review in
                FoodPortionEditor(product: review.product, preset: review.portion, presetName: review.name,
                                  date: date, slot: slot, source: .nutritionLabel,
                                  sourceDescription: "Scanned nutrition label", note: review.note,
                                  onSaved: { dismiss() })
            }
            .sheet(item: $selectedProduct) { product in
                FoodPortionEditor(product: product, date: date, slot: slot, onSaved: { dismiss() })
            }
        }
    }

    private var photoPreview: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 340)
                    .frame(maxWidth: .infinity).background(ErrdayTheme.surface)
                    .clipShape(RoundedRectangle(cornerRadius: ErrdayTheme.radius))
            } else {
                ErrdayCard {
                    Image(systemName: "camera.viewfinder").font(.system(size: 30)).foregroundStyle(ErrdayTheme.foodAccent)
                    Text("No photo selected").font(.headline)
                    Text("For a label, keep the complete nutrition table sharp and straight. For a meal, include the whole serving.")
                        .font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                }
            }
        }
    }

    private func resultCard(_ result: FoodPhotoEstimate) -> some View {
        ErrdayCard {
            Label(result.kind == .nutritionLabel ? "Nutrition label read" : "AI estimate · \(result.confidence) confidence",
                  systemImage: result.kind == .nutritionLabel ? "text.viewfinder" : "sparkles")
                .font(.caption).foregroundStyle(ErrdayTheme.foodAccent)
            Text(result.name).font(.headline)
            if !result.ingredients.isEmpty { Text(result.ingredients.joined(separator: " · ")).font(.subheadline).foregroundStyle(ErrdayTheme.secondary) }
            if result.kind == .nutritionLabel, !result.basisText.isEmpty {
                Text(result.basisText).font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
            }
            if let calories = result.calories { Text("\(calories.whole) kcal").font(.system(size: 24, weight: .semibold)) }
            HStack(spacing: 14) {
                nutrient("Protein", result.protein, "g")
                nutrient("Carbs", result.carbs, "g")
                nutrient("Fat", result.fat, "g")
            }
            Text(result.note).font(.caption).foregroundStyle(ErrdayTheme.secondary)
            Button(result.kind == .nutritionLabel ? "Review Label Values" : "Review AI Estimate") {
                if let label = result.labelPortion() {
                    labelReview = ScannedLabelReview(product: label.product, portion: label.portion,
                                                     name: result.name, note: result.note)
                } else {
                    do {
                        var meal = try result.meal(slot: slot, source: result.kind == .nutritionLabel ? .nutritionLabel : .aiPhoto)
                        meal.date = FoodInput.entryDate(on: date)
                        draft = meal
                        error = nil
                    }
                    catch { self.error = "The photo did not contain all required nutrition values. Take a clearer photo or enter the missing values manually." }
                }
            }.buttonStyle(PrimaryButtonStyle())
        }
    }

    private func nutrient(_ title: String, _ value: Double?, _ unit: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.caption2).foregroundStyle(ErrdayTheme.secondary)
            Text(value.map { "\($0.decimal) \(unit)" } ?? "—").font(.system(size: 14, weight: .semibold))
        }.frame(maxWidth: .infinity, alignment: .leading)
    }

    private var databaseCard: some View {
        ErrdayCard {
            Text("Matches from the food database").font(.headline)
            Text("Use a match when the package is the same. Its label nutrition is more reliable than a photo estimate.")
                .font(.caption).foregroundStyle(ErrdayTheme.secondary)
            ForEach(databaseMatches) { product in
                Button { selectedProduct = product } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "shippingbox").foregroundStyle(ErrdayTheme.foodAccent).frame(width: 24)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(product.name).font(.system(size: 14, weight: .semibold)).lineLimit(2)
                            Text([product.brand, product.retailers.map(\.title).joined(separator: ", ")].filter { !$0.isEmpty }.joined(separator: " · "))
                                .font(.caption).foregroundStyle(ErrdayTheme.secondary).lineLimit(1)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").font(.caption).foregroundStyle(ErrdayTheme.quiet)
                    }.frame(minHeight: 48).contentShape(Rectangle())
                }.buttonStyle(.plain)
                if product.id != databaseMatches.last?.id { Divider() }
            }
        }
    }

    private func setImage(_ selected: UIImage) {
        image = selected; estimate = nil; draft = nil; labelReview = nil; databaseMatches = []; error = nil
    }

    private func load(_ item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            do {
                guard let data = try await item.loadTransferable(type: Data.self), let selected = UIImage(data: data) else {
                    throw AssistantFailure.invalidResponse
                }
                setImage(selected)
            } catch { self.error = "The selected photo could not be opened." }
        }
    }

    private func openCamera() {
        error = nil
        cameraAccessBlocked = false
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            showCamera = false
            error = "The camera is unavailable on this device. Choose a photo from the library."
            return
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            cameraAuthorized = true
            showCamera = true
        case .notDetermined:
            Task {
                let allowed = await AVCaptureDevice.requestAccess(for: .video)
                await MainActor.run {
                    if allowed {
                        cameraAuthorized = true
                        showCamera = true
                    } else {
                        showCamera = false
                        cameraAccessBlocked = true
                        error = "Camera access is off. Enable it in iPhone Settings or use the photo library."
                    }
                }
            }
        case .denied, .restricted:
            showCamera = false
            cameraAccessBlocked = true
            error = "Camera access is off. Enable it in iPhone Settings or use the photo library."
        @unknown default:
            showCamera = false
            error = "The camera could not be opened. Please try again or choose a photo from the library."
        }
    }

    private func scan() {
        guard let image, !isScanning else { return }
        guard let jpeg = image.errdayJPEG() else { error = "The photo could not be prepared for scanning."; return }
        isScanning = true; estimate = nil; databaseMatches = []; error = nil
        Task {
            defer { isScanning = false }
            do {
                // Search readable package text locally before asking the AI to
                // estimate the photographed serving.
                let visibleText = (try? await FoodPhotoTextRecognizer.lines(in: jpeg)) ?? []
                databaseMatches = await findDatabaseMatches(queries: visibleText + [guidance])
                let result = try await assistant.analyzeFoodPhoto(jpeg, guidance: guidance, visibleText: visibleText)
                guard result.recognized else { error = "No clear food or readable nutrition label was found. Move closer, avoid glare and try again."; return }
                estimate = result
                if databaseMatches.isEmpty {
                    databaseMatches = await findDatabaseMatches(queries: [result.name] + result.ingredients)
                }
            } catch { self.error = (error as? AssistantFailure)?.localizedDescription ?? "The photo scan failed. Check your internet and try again." }
        }
    }

    private func findDatabaseMatches(queries: [String]) async -> [FoodProduct] {
        await catalog.load()
        let context = (queries + [guidance]).joined(separator: " ").lowercased()
        let retailer: FoodRetailer? = FoodRetailer.allCases.first { context.contains($0.rawValue) }
        var found: [FoodProduct] = []; var ids = Set<String>()
        let cleaned = queries.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        let candidates = cleaned + cleaned.flatMap { text in
            text.components(separatedBy: CharacterSet.alphanumerics.inverted).filter { $0.count >= 4 }
        }
        for query in candidates.prefix(30) {
            for product in await catalog.search(query, retailer: retailer, limit: 5) where product.nutrients.isComplete {
                if ids.insert(product.id).inserted { found.append(product) }
                if found.count == 4 { return found }
            }
        }
        return found
    }
}

private enum FoodPhotoTextRecognizer {
    static func lines(in imageData: Data) async throws -> [String] {
        try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error { continuation.resume(throwing: error); return }
                let lines = (request.results as? [VNRecognizedTextObservation] ?? [])
                    .compactMap { $0.topCandidates(1).first?.string }
                continuation.resume(returning: lines)
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.recognitionLanguages = ["de-CH", "fr-CH", "it-IT", "en-GB"]
            DispatchQueue.global(qos: .userInitiated).async {
                do { try VNImageRequestHandler(data: imageData).perform([request]) }
                catch { continuation.resume(throwing: error) }
            }
        }
    }
}

private extension UIImage {
    func errdayJPEG() -> Data? {
        let limit: CGFloat = 1600
        let ratio = min(1, limit / max(size.width, size.height))
        let target = CGSize(width: max(1, size.width * ratio), height: max(1, size.height * ratio))
        let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = true
        let rendered = UIGraphicsImageRenderer(size: target, format: format).image { _ in draw(in: CGRect(origin: .zero, size: target)) }
        return rendered.jpegData(compressionQuality: 0.78)
    }
}
