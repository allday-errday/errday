import SwiftUI
import ErrdayCore
@preconcurrency import Speech
@preconcurrency import AVFoundation

@MainActor
@Observable
final class VoiceTranscriber {
    var transcript = ""
    var isRecording = false
    var isFinalizing = false
    var errorMessage: String?

    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?

    func toggle() async {
        if isRecording { stop() } else { await start() }
    }

    func start() async {
        errorMessage = nil
        guard await requestPermissions() else {
            errorMessage = "Allow Microphone and Speech Recognition in Settings to use Voice Log."
            return
        }
        guard let recognizer = preferredRecognizer(), recognizer.isAvailable else {
            errorMessage = "Speech recognition is currently unavailable. Check your internet and try again."
            return
        }
        #if targetEnvironment(simulator)
        errorMessage = "The Simulator has no reliable microphone input. Voice Log is ready to use on your iPhone; you can still type here."
        #else
        cancel()
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            request.taskHint = .dictation
            self.request = request

            let input = audioEngine.inputNode
            let format = input.inputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0 else {
                self.request = nil
                try? session.setActive(false, options: .notifyOthersOnDeactivation)
                errorMessage = "No microphone input is available. Voice Log works on your iPhone; you can still type here."
                return
            }
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1_024, format: format) { [weak request] buffer, _ in
                request?.append(buffer)
            }
            recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
                let text = result?.bestTranscription.formattedString
                let finished = result?.isFinal == true
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if let text { self.transcript = text }
                    if finished { self.completeRecognition() }
                    else if error != nil && self.isRecording {
                        self.errorMessage = "I couldn't understand that. Please try again or edit the text manually."
                        self.cancel()
                    }
                }
            }
            audioEngine.prepare()
            try audioEngine.start()
            isRecording = true
        } catch {
            cancel()
            errorMessage = "Voice Log couldn't start. Please try again."
        }
        #endif
    }

    func stop() {
        guard isRecording else { return }
        if audioEngine.isRunning { audioEngine.stop() }
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        isRecording = false
        isFinalizing = true
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        let activeTask = recognitionTask
        Task {
            try? await Task.sleep(for: .seconds(2))
            if recognitionTask === activeTask { completeRecognition() }
        }
    }

    func cancel() {
        if audioEngine.isRunning { audioEngine.stop() }
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        recognitionTask?.cancel()
        completeRecognition()
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func completeRecognition() {
        request = nil
        recognitionTask = nil
        isRecording = false
        isFinalizing = false
    }

    private func requestPermissions() async -> Bool {
        let speech = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0) }
        }
        guard speech == .authorized else { return false }
        return await AVAudioApplication.requestRecordPermission()
    }

    private func preferredRecognizer() -> SFSpeechRecognizer? {
        let preferred = Locale.preferredLanguages.first ?? "en-CH"
        return SFSpeechRecognizer(locale: Locale(identifier: preferred))
            ?? SFSpeechRecognizer(locale: Locale(identifier: "en-CH"))
            ?? SFSpeechRecognizer(locale: Locale(identifier: "de-CH"))
    }
}

struct VoiceLogView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AssistantStore.self) private var assistant
    @Environment(PersonalStore.self) private var records
    @State private var transcriber = VoiceTranscriber()
    @State private var mealLog = VoiceMealLog()
    @State private var analysisRequest: UUID?
    @State private var processedRequest: UUID?
    @State private var connectionSettings = false
    @FocusState private var editingTranscript: Bool
    var trackingDate: Date = .now

    private var cleanText: String {
        transcriber.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        @Bindable var mealLog = mealLog
        NavigationStack {
            ScrollView {
              VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Image(systemName: "waveform.circle.fill")
                        .font(.system(size: 58)).foregroundStyle(ErrdayTheme.accent)
                    Text(transcriber.isRecording ? "Listening …" : (transcriber.isFinalizing ? "Finishing …" : "Voice Log")).font(.title2.weight(.semibold))
                    Text("Describe all ingredients and amounts. They’ll be combined into one meal for review.")
                        .font(.subheadline).foregroundStyle(ErrdayTheme.secondary).multilineTextAlignment(.center)
                }
                TextEditor(text: $transcriber.transcript)
                    .focused($editingTranscript)
                    .font(.body).scrollContentBackground(.hidden).padding(14)
                    .frame(minHeight: 150, maxHeight: 230)
                    .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 12))
                    .disabled(mealLog.isAnalyzing)
                    .accessibilityLabel("Meal description")
                    .accessibilityIdentifier("voice.transcript")
                if let error = transcriber.errorMessage {
                    Text(error).font(.footnote).foregroundStyle(.orange).multilineTextAlignment(.center)
                }
                if let error = mealLog.errorMessage {
                    Text(error).font(.footnote).foregroundStyle(.orange).multilineTextAlignment(.center)
                        .accessibilityIdentifier("voice.analysisError")
                }
                if cleanText.count > 4_000 {
                    Text("Please shorten the meal description to 4,000 characters.")
                        .font(.footnote).foregroundStyle(.orange)
                }
                Button { Task { await transcriber.toggle() } } label: {
                    Label(transcriber.isRecording ? "Stop Recording" : (transcriber.isFinalizing ? "Saving Transcript …" : "Start Recording"),
                          systemImage: transcriber.isRecording ? "stop.fill" : (transcriber.isFinalizing ? "ellipsis" : "mic.fill"))
                        .font(.headline).frame(maxWidth: .infinity, minHeight: 54)
                }.buttonStyle(PrimaryButtonStyle(secondary: true)).disabled(transcriber.isFinalizing || mealLog.isAnalyzing)
                if mealLog.isAnalyzing {
                    HStack {
                        ProgressView()
                        Text("Analysing your meal …").font(.subheadline)
                        Spacer()
                        Button("Cancel") { analysisRequest = nil; mealLog.cancel() }
                    }
                } else if !assistant.isConnected {
                    Button("Connect OpenAI") { connectionSettings = true }.buttonStyle(PrimaryButtonStyle())
                } else {
                    Button(mealLog.errorMessage == nil ? "Analyse & Review" : "Try Again") {
                        editingTranscript = false
                        transcriber.cancel()
                        analysisRequest = UUID()
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(cleanText.count < 2 || cleanText.count > 4_000 || transcriber.isRecording || transcriber.isFinalizing)
                    .accessibilityIdentifier("voice.analyse")
                }
                Text("Apple converts your voice to text. Only the reviewed text is sent to OpenAI when you continue.")
                    .font(.caption).foregroundStyle(ErrdayTheme.secondary).multilineTextAlignment(.center)
              }
              .padding(20).frame(maxWidth: 620).frame(maxWidth: .infinity)
            }
            .errdayGlassControls().errdayBackground().foregroundStyle(ErrdayTheme.text)
            .navigationTitle("Voice Log").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { editingTranscript = false }
                }
            }
            .task(id: analysisRequest) {
                guard let request = analysisRequest, processedRequest != request else { return }
                processedRequest = request
                await mealLog.analyze(description: cleanText, trackingDate: trackingDate) {
                    try await assistant.analyzeFoodDescription($0)
                }
            }
            .sheet(item: $mealLog.draft, onDismiss: {
                if let id = mealLog.reviewedMealID, records.data.meals.contains(where: { $0.id == id }) {
                    dismiss()
                }
            }) { meal in
                // The existing review owns saving and reports success only after persistence succeeds.
                NutritionDetailView(meal: meal, isDraft: true)
            }
            .sheet(isPresented: $connectionSettings) { AssistantSettingsView() }
            .onDisappear { transcriber.cancel(); mealLog.cancel() }
        }
    }
}
