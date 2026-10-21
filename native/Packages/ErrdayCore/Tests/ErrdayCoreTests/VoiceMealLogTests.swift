import Foundation
import Testing
@testable import ErrdayCore

enum VoiceMealFixture {
    static let transcript = "two bananas, two eggs, 100 grams of flour, 50 grams of Nutella, and 20 grams of whipped cream"
    static let names = ["Bananas", "Eggs", "Flour", "Nutella", "Whipped cream"]
    static let amounts = ["2 bananas", "2 eggs", "100 g", "50 g", "20 g"]

    // Synthetic values exercise aggregation; these are not product nutrition data.
    static var json: AIJSON {
        .object([
            "recognized": .bool(true), "name": .string("Banana meal"),
            "ingredients": .array(names.indices.map { index in
                let value = Double(index + 1)
                return .object([
                    "name": .string(names[index]), "amount": .string(amounts[index]),
                    "calories": .number(value * 10), "protein": .number(value),
                    "carbs": .number(value * 2), "fat": .number(value / 2)
                ])
            }),
            "calories": .number(150), "protein": .number(15), "carbs": .number(30), "fat": .number(7.5),
            "fiber": .null, "sugar": .null, "sodium": .null,
            "confidence": .string("medium"), "note": .string("Synthetic regression-test fixture.")
        ])
    }

    static func estimate() throws -> FoodPhotoEstimate { try #require(FoodPhotoEstimate(json)) }

    static func response(status: String = "completed", value: AIJSON? = nil) throws -> Data {
        let content = AIJSON.object(["type": .string("output_text"), "text": .string((value ?? json).encoded)])
        let message = AIJSON.object(["type": .string("message"), "content": .array([content])])
        return try JSONEncoder().encode(AIJSON.object([
            "status": .string(status),
            "output": .array([message])
        ]))
    }
}

@MainActor struct VoiceMealLogTests {
    @Test func oneTranscriptMakesOneUnsavedMealWithFiveIngredients() async throws {
        let log = VoiceMealLog()
        let now = Date(timeIntervalSince1970: 1_792_404_000)
        var requests: [String] = []
        await log.analyze(description: VoiceMealFixture.transcript, trackingDate: now, now: now) { text in
            requests.append(text)
            return try VoiceMealFixture.estimate()
        }
        let draft = try #require(log.draft)
        #expect(requests == [VoiceMealFixture.transcript])
        #expect(draft.ingredients?.map(\.name) == VoiceMealFixture.names)
        #expect(draft.ingredients?.map(\.amount) == VoiceMealFixture.amounts)
        #expect(draft.calories == 150 && draft.protein == 15 && draft.carbs == 30 && draft.fat == 7.5)
        #expect(draft.source == .aiText && draft.servings == 1)
        #expect(draft.date == now && log.reviewedMealID == draft.id)
        #expect(log.errorMessage == nil && !log.isAnalyzing)
        // Analysis has no repository/save dependency; saving requires the review screen.
    }

    @Test func failureCanRetryWithoutLosingTheDescription() async throws {
        let log = VoiceMealLog()
        await log.analyze(description: VoiceMealFixture.transcript, trackingDate: .now) { _ in
            throw AssistantFailure.incompleteMeal
        }
        #expect(log.draft == nil && log.errorMessage != nil && !log.isAnalyzing)
        await log.analyze(description: VoiceMealFixture.transcript, trackingDate: .now) { text in
            #expect(text == VoiceMealFixture.transcript)
            return try VoiceMealFixture.estimate()
        }
        #expect(log.draft?.ingredients?.count == 5 && log.errorMessage == nil)
    }

    @Test func cancellationDiscardsLateResultsAndDoubleSubmitDoesNotStartAnotherRequest() async throws {
        let log = VoiceMealLog()
        await log.analyze(description: VoiceMealFixture.transcript, trackingDate: .now) { _ in
            #expect(log.isAnalyzing)
            await log.analyze(description: "duplicate", trackingDate: .now) { _ in
                Issue.record("A second analysis must not start while the first is running")
                return try VoiceMealFixture.estimate()
            }
            log.cancel()
            return try VoiceMealFixture.estimate()
        }
        #expect(log.draft == nil && log.reviewedMealID == nil && !log.isAnalyzing)
        #expect(log.errorMessage == nil)
    }

    @Test func selectedTrackingDayIsPreserved() async throws {
        let log = VoiceMealLog()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try #require(TimeZone(identifier: "Europe/Zurich"))
        let day = try #require(calendar.date(from: DateComponents(year: 2026, month: 10, day: 17)))
        let now = try #require(calendar.date(byAdding: .day, value: 2, to: day))
        await log.analyze(description: VoiceMealFixture.transcript, trackingDate: day, now: now, calendar: calendar) { _ in
            try VoiceMealFixture.estimate()
        }
        let date = try #require(log.draft?.date)
        #expect(calendar.isDate(date, inSameDayAs: day))
        #expect(calendar.component(.hour, from: date) == 12)
    }

    @Test func emptyOrOversizedDescriptionsNeverReachAnalysis() async {
        for text in ["", " ", "a", String(repeating: "a", count: 4_001)] {
            let log = VoiceMealLog()
            await log.analyze(description: text, trackingDate: .now) { _ in
                Issue.record("Invalid input must not reach the API")
                return try VoiceMealFixture.estimate()
            }
            #expect(log.draft == nil && log.errorMessage != nil)
        }
    }

    @Test func ingredientFreeResultIsNotPresentedAsComplete() async throws {
        guard case .object(var value) = VoiceMealFixture.json else { return }
        value["ingredients"] = .array([])
        let estimate = try #require(FoodPhotoEstimate(.object(value)))
        let log = VoiceMealLog()
        await log.analyze(description: VoiceMealFixture.transcript, trackingDate: .now) { _ in estimate }
        #expect(log.draft == nil && log.errorMessage != nil)
    }
}
