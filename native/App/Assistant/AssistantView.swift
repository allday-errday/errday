import SwiftUI
import ErrdayCore

struct AssistantView: View {
    @Environment(AssistantStore.self) private var assistant
    @Environment(PersonalStore.self) private var records
    @Environment(HealthStore.self) private var health
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @FocusState private var composing: Bool
    @State private var settings = false
    @State private var editing: AssistantFoodDraft?
    @State private var confirmNew = false
    @State private var confirmHealth = false
    @State private var voiceLog = false
    var trackingDate: Date = .now
    var body: some View {
        @Bindable var assistant = assistant
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    Text("GPT-5.4 mini").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                    Spacer()
                    Button(assistant.allowHealth ? "Health shared" : "Share Health", systemImage: assistant.allowHealth ? "heart.fill" : "heart") {
                        if assistant.allowHealth { assistant.reset(); assistant.allowHealth = false }
                        else { confirmHealth = true }
                    }.font(.caption).disabled(assistant.isBusy)
                }.padding(.horizontal, 20).padding(.vertical, 10)
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            if assistant.messages.isEmpty {
                                Text("What would you like to know?").font(.title2.weight(.semibold))
                                Text("Ask about Food, Gym or Health. Errday can read relevant summaries and prepare food entries for review.").font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
                                if !assistant.isConnected {
                                    Button("Connect OpenAI") { settings = true }.buttonStyle(PrimaryButtonStyle())
                                }
                                ForEach(["How does my nutrition look today?", "How did my training go this week?", "How was my sleep this week?"], id: \.self) { prompt in
                                    Button(prompt) { text = prompt }.font(.subheadline).frame(maxWidth: .infinity, alignment: .leading).padding(.vertical, 8)
                                }
                                Text("Your messages and relevant Food/Gym summaries are sent to OpenAI. Health is shared only after you allow it. API usage uses your OpenAI credit.").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                            }
                            ForEach(assistant.messages) { message in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(message.isUser ? "You" : "Errday").font(.caption.weight(.semibold)).foregroundStyle(ErrdayTheme.secondary)
                                    Text(message.text).textSelection(.enabled)
                                }.frame(maxWidth: .infinity, alignment: .leading).padding(14)
                                    .background(message.isUser ? ErrdayTheme.raised : ErrdayTheme.surface, in: RoundedRectangle(cornerRadius: 12))
                            }
                            ForEach(assistant.drafts) { draft in draftCard(draft) }
                            if assistant.isBusy { HStack { ProgressView(); Text(assistant.status).font(.caption); Spacer(); Button("Stop") { assistant.cancel() } } }
                            if let error = assistant.error { Text(error).font(.subheadline).foregroundStyle(.orange) }
                            Color.clear.frame(height: 1).id("bottom")
                        }.padding(20).frame(maxWidth: 620).frame(maxWidth: .infinity)
                    }
                    .onChange(of: assistant.messages.count) { _, _ in withAnimation { proxy.scrollTo("bottom", anchor: .bottom) } }
                    .onChange(of: assistant.isBusy) { _, _ in withAnimation { proxy.scrollTo("bottom", anchor: .bottom) } }
                }
                HStack(alignment: .bottom, spacing: 12) {
                    Button { voiceLog = true } label: {
                        Image(systemName: "mic.fill").font(.headline)
                            .frame(width: 44, height: 44).errdayGlassCircle(interactive: true)
                    }
                    .accessibilityLabel("Voice Log").disabled(assistant.isBusy || !assistant.isConnected)
                    TextField("Ask Errday …", text: $text, axis: .vertical).focused($composing).lineLimit(1...5).padding(12).background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 10))
                    Button {
                        let message = text; text = ""; composing = false; assistant.send(message, records: records, health: health, trackingDate: trackingDate)
                    } label: { Image(systemName: "arrow.up").font(.headline).frame(width: 44, height: 44).foregroundStyle(.white).errdayGlassCircle(tint: ErrdayTheme.accent, interactive: true) }
                    .accessibilityLabel("Send message").disabled(assistant.isBusy || !assistant.isConnected || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || text.count > 4000)
                }.padding(16).errdayActionBar()
                if text.count > 4000 { Text("Please shorten your message to 4,000 characters.").font(.caption).foregroundStyle(.orange) }
            }
            .errdayBackground().foregroundStyle(ErrdayTheme.text)
            .navigationTitle("Assistant").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Connection & Privacy") { settings = true }
                        Button("New Chat", systemImage: "square.and.pencil") { confirmNew = true }
                    } label: { Image(systemName: "ellipsis") }.accessibilityLabel("Assistant settings")
                }
            }
            .sheet(isPresented: $settings) { AssistantSettingsView() }
            .sheet(isPresented: $voiceLog) {
                VoiceLogView(trackingDate: trackingDate)
            }
            .sheet(item: $editing) { draft in
                NutritionDetailView(meal: draft.meal, isDraft: true) { entry in
                    var saved = entry
                    saved.id = draft.id
                    if records.saveMeal(saved) { assistant.markSaved(draft.id); editing = nil }
                }
            }
            .alert("Start a new chat?", isPresented: $confirmNew) {
                Button("Cancel", role: .cancel) {}
                Button("New Chat") { assistant.reset() }
            } message: { Text("The current chat will be cleared. Saved food entries stay in the app.") }
            .alert("Share Health with OpenAI?", isPresented: $confirmHealth) {
                Button("Cancel", role: .cancel) {}
                Button("Share") { assistant.reset(); assistant.allowHealth = true }
            } message: { Text("For relevant questions, daily values and 30-day summaries such as sleep, heart rate and weight are sent to OpenAI. You can turn sharing off at the top.") }
        }
    }
    private func draftCard(_ draft: AssistantFoodDraft) -> some View {
        let saved = assistant.savedIDs.contains(draft.id)
        let entry = records.data.meals.first { $0.id == draft.id } ?? draft.meal
        return ErrdayCard {
            Text(saved ? "Saved" : "Review Entry").font(.caption).foregroundStyle(ErrdayTheme.accent)
            Text(entry.name).font(.headline)
            if let portion = entry.foodPortion {
                Text("\(portion.amount.decimal) \(portion.unit.rawValue) · \(entry.slot?.title ?? "") · \(entry.calories.whole) kcal").font(.subheadline)
                Text("\(portion.product.brand) · Open Food Facts").font(.caption).foregroundStyle(ErrdayTheme.secondary)
            } else {
                Text("\(entry.calories.whole) kcal · \(entry.protein.whole)g protein · \(entry.carbs.whole)g carbs · \(entry.fat.whole)g fat")
                    .font(.subheadline).foregroundStyle(ErrdayTheme.secondary)
            }
            if saved {
                Button("Undo") { assistant.undo(draft, records: records) }.disabled(assistant.isBusy)
            } else {
                Button("Review") { editing = draft }
                    .buttonStyle(PrimaryButtonStyle()).disabled(assistant.isBusy)
            }
        }
    }
}

struct AssistantSettingsView: View {
    @Environment(AssistantStore.self) private var assistant
    @Environment(\.dismiss) private var dismiss
    @State private var key = ""
    @State private var confirmRemove = false
    var body: some View {
        NavigationStack {
            Form {
                Section("OpenAI") {
                    LabeledContent("Model", value: "GPT-5.4 mini")
                    LabeledContent("Connection", value: assistant.isConnected ? "Key saved" : "Not set up")
                    VStack(alignment: .leading, spacing: 10) {
                        Text("API key").font(.caption).foregroundStyle(ErrdayTheme.secondary)
                        SecureField("Paste here (sk-…)", text: $key)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                            .foregroundStyle(ErrdayTheme.text).privacySensitive()
                        PasteButton(payloadType: String.self) { values in
                            if let value = values.first { key = value; assistant.error = nil }
                        }.labelStyle(.titleAndIcon)
                    }
                    .onChange(of: key) { _, _ in assistant.error = nil }
                    Button("Save in Keychain") {
                        assistant.connect(key)
                        if assistant.error == nil { key = ""; dismiss() }
                    }.disabled(key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || assistant.isBusy)
                    if assistant.isConnected { Button("Remove Key", role: .destructive) { confirmRemove = true }.disabled(assistant.isBusy) }
                    if let error = assistant.error { Text(error).foregroundStyle(.orange) }
                }
                Section("Your Data") {
                    Text("The connection goes directly from your device to OpenAI. Your key is stored only in this device's Keychain and is not shipped with the app.")
                    Text("Food and Gym data is read only for relevant questions. Health requires separate sharing in the chat. Messages and tool results are resent for the current chat.")
                    Text("Response storage is disabled. OpenAI may still retain abuse-monitoring logs under its API data policy. Starting a new chat clears local history, not data already sent.")
                    Link("OpenAI data policy", destination: URL(string: "https://developers.openai.com/api/docs/guides/your-data")!)
                }.font(.subheadline)
                Section("Usage in this Chat") {
                    LabeledContent("Input tokens", value: "\(assistant.inputTokens)")
                    LabeledContent("Output tokens", value: "\(assistant.outputTokens)")
                    Link("Credit & billing", destination: URL(string: "https://platform.openai.com/settings/organization/billing/overview")!)
                }
            }.navigationTitle("AI Connection").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
                .confirmationDialog("Remove the key from this device?", isPresented: $confirmRemove) {
                    Button("Remove", role: .destructive) { assistant.disconnect() }
                }
        }
    }
}
