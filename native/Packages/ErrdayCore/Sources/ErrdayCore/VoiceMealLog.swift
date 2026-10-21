import Foundation
import Observation

/// A voice transcript produces one unsaved meal, independently of chat/tool history.
@MainActor @Observable
public final class VoiceMealLog {
    public var draft: MealEntry?
    public private(set) var reviewedMealID: UUID?
    public private(set) var isAnalyzing = false
    public private(set) var errorMessage: String?
    private var generation = UUID()

    public init() {}

    public func analyze(description: String, trackingDate: Date, now: Date = .now,
                        calendar: Calendar = .current,
                        using analyze: (String) async throws -> FoodPhotoEstimate) async {
        guard !isAnalyzing else { return }
        let text = description.trimmingCharacters(in: .whitespacesAndNewlines)
        guard text.count >= 2, text.count <= 4_000 else {
            errorMessage = "Describe your meal in 2–4,000 characters."
            return
        }
        let token = UUID()
        generation = token
        isAnalyzing = true
        errorMessage = nil
        draft = nil
        reviewedMealID = nil
        defer { if generation == token { isAnalyzing = false } }
        do {
            let estimate = try await analyze(text)
            try Task.checkCancellation()
            guard generation == token else { return }
            // Do not present a partial, ingredient-free answer as a complete voice meal.
            guard !estimate.ingredientBreakdown.isEmpty else { throw AssistantFailure.invalidResponse }
            var meal = try estimate.meal(slot: .snacks, source: .aiText)
            meal.date = calendar.isDate(trackingDate, inSameDayAs: now)
                ? now
                : calendar.date(bySettingHour: 12, minute: 0, second: 0, of: trackingDate) ?? trackingDate
            reviewedMealID = meal.id
            draft = meal
        } catch {
            guard generation == token, !Task.isCancelled, !(error is CancellationError) else { return }
            errorMessage = (error as? AssistantFailure)?.localizedDescription
                ?? "Meal analysis was interrupted. Your text is still here—please try again."
        }
    }

    public func cancel() {
        generation = UUID()
        isAnalyzing = false
    }
}
