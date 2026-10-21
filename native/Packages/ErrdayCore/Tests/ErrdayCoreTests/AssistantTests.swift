import Foundation
import Testing
@testable import ErrdayCore

@Test func assistantFoodDraftUsesSelectedTrackingDate() throws {
    let selectedDate = Date(timeIntervalSince1970: 1_760_000_000)
    let product = FoodProduct(
        id: "rice",
        name: "Rice",
        nutrients: FoodNutrients(calories: 130, protein: 3, carbs: 28, fat: 0.3),
        unit: .g
    )
    let draft = try AssistantFoodDraft(product: product, amount: 100, unit: .g, slot: .lunch, date: selectedDate)
    #expect(draft.meal.date == selectedDate)
}

@Test func assistantDraftUsesCatalogueNutritionAndStableID() throws {
    let product = FoodProduct(id: "123", name: "Skyr", nutrients: .init(calories: 65, protein: 11, carbs: 4, fat: 0.2))
    let draft = try AssistantFoodDraft(product: product, amount: 200, unit: .g, slot: .breakfast)
    #expect(draft.meal.calories == 130 && draft.meal.protein == 22)
    #expect(draft.meal.slot == .breakfast && draft.id == draft.meal.id)
    #expect(draft.meal.foodPortion?.product.id == "123")
}
@Test func assistantRejectsIncompleteNutritionAndUnitConversion() {
    let partial = FoodProduct(id: "1", name: "A", nutrients: .init(calories: 2))
    let full = FoodProduct(id: "2", name: "B", nutrients: .init(calories: 0, protein: 0, carbs: 0, fat: 0))
    #expect(throws: AssistantFailure.self) { try AssistantFoodDraft(product: partial, amount: 100, unit: .g, slot: .lunch) }
    #expect(throws: AssistantFailure.self) { try AssistantFoodDraft(product: full, amount: 100, unit: .ml, slot: .lunch) }
    for amount in [0, -1, 10_001, Double.infinity, Double.nan] {
        #expect(throws: AssistantFailure.self) { try AssistantFoodDraft(product: full, amount: amount, unit: .g, slot: .lunch) }
    }
}
@Test func assistantZeroNutrientsAreValid() throws {
    let water = FoodProduct(id: "3", name: "Wasser", nutrients: .init(calories: 0, protein: 0, carbs: 0, fat: 0), unit: .ml)
    #expect(try AssistantFoodDraft(product: water, amount: 250, unit: .ml, slot: .snacks).meal.calories == 0)
}
@Test func assistantJSONPreservesNullNumbersAndBooleans() throws {
    let value = try AIJSON.decode(#"{"missing":null,"zero":0,"flag":false,"list":["a",3]}"#)
    #expect(value["missing"] == .null && value["zero"].number == 0 && value["flag"] == .bool(false))
    #expect(try AIJSON.decode(value.encoded) == value)
}

private final class MockOpenAI: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var handler: ((URLRequest) throws -> (Int, Data))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (code, data) = try Self.handler!(request)
            client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: code, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
@Suite(.serialized) struct AssistantNetworkTests {
    private func client() -> AssistantAPI {
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [MockOpenAI.self]
        return AssistantAPI(session: URLSession(configuration: config))
    }
    private func requestJSON(_ request: URLRequest) throws -> AIJSON {
        if let body = request.httpBody { return try JSONDecoder().decode(AIJSON.self, from: body) }
        let stream = try #require(request.httpBodyStream)
        stream.open(); defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4_096)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count <= 0 { break }
            data.append(contentsOf: buffer.prefix(count))
        }
        return try JSONDecoder().decode(AIJSON.self, from: data)
    }

    @Test func voiceMealUsesOneStructuredRequestNotTheChatToolLoop() async throws {
        var calls = 0
        MockOpenAI.handler = { request in
            calls += 1
            let json = try requestJSON(request)
            #expect(json["input"].array.count == 1)
            #expect(json["input"].array[0]["content"].array[0]["text"].string?.contains(VoiceMealFixture.transcript) == true)
            #expect(json["instructions"].string?.contains("exactly one meal") == true)
            #expect(json["text"]["format"]["type"].string == "json_schema")
            #expect(json["store"] == .bool(false))
            #expect(json["max_output_tokens"].number == 6_000)
            #expect(!json["tools"].array.contains { $0["type"].string == "function" })
            return (200, try VoiceMealFixture.response())
        }
        let api = client()
        let estimate = try await api.analyzeFoodDescription(
            key: "sk-test-not-a-real-secret-123", description: VoiceMealFixture.transcript
        )
        let meal = try estimate.meal(slot: .snacks, source: .aiText)
        #expect(calls == 1)
        #expect(meal.ingredients?.count == 5)
        #expect(meal.calories == 150)
    }

    @Test func longFoodDescriptionIsSentWholeInsteadOfTruncatingAt600Characters() async throws {
        let description = VoiceMealFixture.transcript + String(repeating: " with the listed portions", count: 30) + " final ingredient"
        #expect(description.count > 600)
        MockOpenAI.handler = { request in
            let json = try requestJSON(request)
            #expect(json["input"].array[0]["content"].array[0]["text"].string?.contains(description) == true)
            return (200, try VoiceMealFixture.response())
        }
        _ = try await client().analyzeFoodDescription(key: "sk-test-not-a-real-secret-123", description: description)
    }

    @Test func incompleteMealHasARetryableErrorAndNoPartialDraft() async throws {
        MockOpenAI.handler = { _ in (200, try VoiceMealFixture.response(status: "incomplete")) }
        do {
            _ = try await client().analyzeFoodDescription(key: "sk-test-not-a-real-secret-123", description: VoiceMealFixture.transcript)
            Issue.record("Incomplete nutrition must not become a meal")
        } catch AssistantFailure.incompleteMeal {
            // Expected even if the response contains a superficially parseable partial result.
        } catch { Issue.record("Expected a specific incomplete-meal error, received \(error)") }
    }

    @Test func malformedIngredientRejectsTheWholeMealInsteadOfDroppingIt() async throws {
        guard case .object(var value) = VoiceMealFixture.json else { return }
        var ingredients = value["ingredients"]!.array
        ingredients[4] = .object(["name": .string("Whipped cream"), "amount": .string("20 g")])
        value["ingredients"] = .array(ingredients)
        let malformed = AIJSON.object(value)
        MockOpenAI.handler = { _ in (200, try VoiceMealFixture.response(value: malformed)) }
        await #expect(throws: AssistantFailure.self) {
            try await client().analyzeFoodDescription(key: "sk-test-not-a-real-secret-123", description: VoiceMealFixture.transcript)
        }
    }

    @Test func oversizedDescriptionIsRejectedBeforeNetworkWithoutTruncation() async {
        MockOpenAI.handler = { _ in Issue.record("Network must not be called"); return (500, Data()) }
        do {
            _ = try await client().analyzeFoodDescription(key: "sk-test-not-a-real-secret-123", description: String(repeating: "a", count: 4_001))
            Issue.record("Expected length validation")
        } catch AssistantFailure.foodDescriptionTooLong {
        } catch { Issue.record("Wrong input validation error") }
    }
    @Test func responseUsesFixedEndpointAndReturnsToolCall() async throws {
        MockOpenAI.handler = { request in
            #expect(request.url?.absoluteString == "https://api.openai.com/v1/responses")
            #expect(request.httpMethod == "POST")
            var body = request.httpBody
            if body == nil, let stream = request.httpBodyStream {
                stream.open(); defer { stream.close() }; var bytes = Data(); var buffer = [UInt8](repeating: 0, count: 4096)
                while stream.hasBytesAvailable { let n = stream.read(&buffer, maxLength: buffer.count); if n <= 0 { break }; bytes.append(contentsOf: buffer.prefix(n)) }; body = bytes
            }
            let json = try JSONDecoder().decode(AIJSON.self, from: #require(body))
            #expect(json["store"] == .bool(false))
            #expect(json["model"].string == "gpt-5.4-mini")
            #expect(json["tools"].array.count == 4)
            return (200, Data(#"{"status":"completed","output":[{"type":"function_call","name":"search_food","call_id":"c1","arguments":"{}"}],"usage":{"input_tokens":10,"output_tokens":4}}"#.utf8))
        }
        let result = try await client().respond(key: "sk-test-not-a-real-secret-123", input: [], instructions: "test")
        #expect(result.calls.count == 1 && result.inputTokens == 10 && result.outputTokens == 4)
    }
    @Test func photoAnalysisUsesImageInputAndReturnsEditableEstimate() async throws {
        MockOpenAI.handler = { request in
            var body = request.httpBody
            if body == nil, let stream = request.httpBodyStream {
                stream.open(); defer { stream.close() }
                var bytes = Data(); var buffer = [UInt8](repeating: 0, count: 4096)
                while stream.hasBytesAvailable {
                    let count = stream.read(&buffer, maxLength: buffer.count)
                    if count <= 0 { break }
                    bytes.append(contentsOf: buffer.prefix(count))
                }
                body = bytes
            }
            let requestBody = try #require(body)
            let json = try JSONDecoder().decode(AIJSON.self, from: requestBody)
            let content = json["input"].array.first?["content"].array ?? []
            #expect(json["store"] == .bool(false))
            #expect(json["text"]["format"]["type"].string == "json_schema")
            #expect(json["text"]["format"]["schema"]["properties"]["kind"]["type"].string == "string")
            #expect(json["text"]["format"]["schema"]["properties"]["ingredients"]["items"]["type"].string == "object")
            #expect(json["text"]["format"]["schema"]["properties"]["serving_amount"] != .null)
            #expect(json["tools"].array.count == 1)
            #expect(json["tools"].array.first?["type"].string == "web_search")
            #expect(json["tools"].array.first?["user_location"]["country"].string == "CH")
            #expect(json["instructions"].string?.contains("OAKBERRY Works") == true)
            #expect(content.count == 2)
            #expect(content[1]["type"].string == "input_image")
            #expect(content[1]["image_url"].string?.hasPrefix("data:image/jpeg;base64,") == true)
            let estimate = #"{"recognized":true,"kind":"food_photo","name":"Chicken rice","ingredients":[{"name":"chicken","amount":"180 g","calories":260,"protein":44,"carbs":0,"fat":9},{"name":"rice","amount":"250 g","calories":360,"protein":4,"carbs":68,"fat":7}],"calories":620,"protein":48,"carbs":68,"fat":16,"fiber":4,"sugar":3,"sodium":740,"basis_amount":null,"basis_unit":null,"basis_text":"visible serving","serving_amount":null,"serving_unit":null,"serving_text":"","confidence":"medium","note":"Portion size is estimated."}"#
            let response = AIJSON.object([
                "status": .string("completed"),
                "output": .array([.object(["type": .string("message"), "content": .array([.object(["type": .string("output_text"), "text": .string(estimate)])])])]),
                "usage": .object(["input_tokens": .number(30), "output_tokens": .number(20)])
            ])
            return (200, try JSONEncoder().encode(response))
        }
        let result = try await client().analyzeFoodImage(key: "sk-test-not-a-real-secret-123", jpegData: Data([1, 2, 3]))
        let meal = try result.meal(slot: .dinner)
        #expect(result.ingredients == ["chicken", "rice"])
        #expect(meal.name == "Chicken rice" && meal.calories == 620 && meal.sodium == 740)
        #expect(meal.slot == .dinner)
    }
    @Test func textAnalysisKeepsDistinctIngredientNutritionAndRoundsToFiveHundredths() async throws {
        MockOpenAI.handler = { request in
            var body = request.httpBody
            if body == nil, let stream = request.httpBodyStream {
                stream.open(); defer { stream.close() }
                var bytes = Data(); var buffer = [UInt8](repeating: 0, count: 4096)
                while stream.hasBytesAvailable {
                    let count = stream.read(&buffer, maxLength: buffer.count)
                    if count <= 0 { break }
                    bytes.append(contentsOf: buffer.prefix(count))
                }
                body = bytes
            }
            let json = try JSONDecoder().decode(AIJSON.self, from: #require(body))
            #expect(json["text"]["format"]["schema"]["properties"]["ingredients"]["items"]["type"].string == "object")
            let estimate = #"{"recognized":true,"name":"Skyr oats bowl","ingredients":[{"name":"skyr","amount":"200 g","calories":135.023,"protein":22.024,"carbs":8.027,"fat":0.011},{"name":"oats","amount":"70 g","calories":265.027,"protein":9.026,"carbs":42.024,"fat":5.078}],"calories":400.05,"protein":31.05,"carbs":50.05,"fat":5.1,"fiber":7.026,"sugar":10.024,"sodium":140.027,"confidence":"medium","note":"Estimated from the described portions."}"#
            let response = AIJSON.object([
                "status": .string("completed"),
                "output": .array([.object(["type": .string("message"), "content": .array([.object(["type": .string("output_text"), "text": .string(estimate)])])])]),
                "usage": .object(["input_tokens": .number(30), "output_tokens": .number(20)])
            ])
            return (200, try JSONEncoder().encode(response))
        }
        let result = try await client().analyzeFoodDescription(key: "sk-test-not-a-real-secret-123", description: "Skyr and oats")
        let meal = try result.meal(slot: .breakfast, source: .aiText)
        let ingredients = try #require(meal.ingredients)
        #expect(ingredients.count == 2)
        #expect(ingredients[0].calories == 135.0)
        #expect(ingredients[1].calories == 265.05)
        #expect(ingredients[0].protein == 22.0)
        #expect(ingredients[1].fat == 5.1)
        #expect(meal.calories == 400.05)
        #expect(meal.protein == 31.05)
        #expect(meal.fiber == 7.05)
        #expect(meal.sugar == 10.0)
        #expect(meal.sodium == 140.05)
        #expect(ingredients.allSatisfy { [$0.calories, $0.protein, $0.carbs, $0.fat].allSatisfy { ($0 * 20).rounded() == $0 * 20 } })
    }
    @Test func nutritionLabelKeepsItsBasisAndScalesAReviewedPortion() async throws {
        MockOpenAI.handler = { _ in
            let label = #"{"recognized":true,"kind":"nutrition_label","name":"Protein drink","ingredients":[],"calories":64,"protein":10,"carbs":4.2,"fat":0.3,"fiber":null,"sugar":4.2,"sodium":48,"basis_amount":100,"basis_unit":"ml","basis_text":"per 100 ml","serving_amount":330,"serving_unit":"ml","serving_text":"1 bottle · 330 ml","confidence":"high","note":"Copied from the visible label."}"#
            let response = AIJSON.object([
                "status": .string("completed"),
                "output": .array([.object(["type": .string("message"), "content": .array([.object(["type": .string("output_text"), "text": .string(label)])])])]),
                "usage": .object(["input_tokens": .number(30), "output_tokens": .number(20)])
            ])
            return (200, try JSONEncoder().encode(response))
        }
        let result = try await client().analyzeFoodImage(key: "sk-test-not-a-real-secret-123", jpegData: Data([1, 2, 3]))
        let review = try #require(result.labelPortion())
        var portion = review.portion
        #expect(portion.amount == 330)
        #expect(portion.servingAmount == 330)
        #expect(portion.servingLabel == "1 bottle · 330 ml")
        portion.amount = 165
        let meal = try #require(portion.meal(name: result.name))
        #expect(result.kind == .nutritionLabel && result.basisText == "per 100 ml")
        #expect(abs(meal.calories - 105.6) < 0.0001)
        #expect(abs(meal.protein - 16.5) < 0.0001)
        #expect(abs((meal.sodium ?? 0) - 79.2) < 0.0001)
    }
    @Test func mapsQuotaAndAuthenticationErrorsWithoutLeakingBody() async {
        for code in [401,403,429,500] {
            MockOpenAI.handler = { _ in (code, Data("private provider diagnostic".utf8)) }
            do { _ = try await client().respond(key: "sk-test-not-a-real-secret-123", input: [], instructions: "test"); Issue.record("Expected failure") }
            catch { #expect(error is AssistantFailure); #expect(!error.localizedDescription.contains("private provider")) }
        }
    }
    @Test func incompleteResponseCannotBecomeAConfirmation() async {
        MockOpenAI.handler = { _ in (200, Data(#"{"status":"incomplete","output":[{"type":"message","content":[] }]}"#.utf8)) }
        await #expect(throws: AssistantFailure.self) { try await client().respond(key: "sk-test-not-a-real-secret-123", input: [], instructions: "test") }
    }
    @Test func invalidKeyNeverReachesNetwork() async {
        MockOpenAI.handler = { _ in Issue.record("Network must not be called"); return (500, Data()) }
        await #expect(throws: AssistantFailure.self) { try await client().respond(key: "", input: [], instructions: "test") }
    }
}

@Test func keyInputAcceptsProjectKeysAndClipboardEdges() throws {
    let fake = "sk-proj-unit-test-not-a-real-key-123"
    #expect(try AssistantKeyInput.normalize("\n  " + fake + "\r\n") == fake)
    #expect(try AssistantKeyInput.normalize("\"" + fake + "\"") == fake)
    #expect(try AssistantKeyInput.normalize("\u{FEFF}" + fake + "\u{200B}") == fake)
}
@Test func keyInputRejectsEmptyAndExtraProse() {
    for value in ["", " \n", "sk-", "api key sk-proj-unit-test-not-a-real-key", "sk-proj-unit-test-not-a-real-key api key openai", "sk-proj-test\nnot-a-real-key", "sk-proj-test💜not-a-real-key"] {
        #expect(throws: AssistantKeyInput.InputError.self) { try AssistantKeyInput.normalize(value) }
    }
}
