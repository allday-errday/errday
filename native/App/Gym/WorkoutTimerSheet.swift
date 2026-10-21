import SwiftUI
import ErrdayCore

private enum WorkoutTimerStyle {
    static let track = ErrdayTheme.raised
    static let blue = Color(hex: 0x26a7f2)
    static let green = Color(hex: 0x2bd76b)
    static let orange = Color(hex: 0xf5a623)
}

struct WorkoutRestCompleteBanner: View {
    let dismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 21))
                .foregroundStyle(Color(hex: 0x2bd76b))
            VStack(alignment: .leading, spacing: 2) {
                Text("Rest complete").font(.system(size: 15, weight: .semibold))
                Text("Ready for your next set").font(.system(size: 13)).foregroundStyle(ErrdayTheme.secondary)
            }
            Spacer(minLength: 8)
            Button(action: dismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .semibold))
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Dismiss rest complete message")
        }
        .foregroundStyle(ErrdayTheme.text)
        .padding(.leading, 16)
        .padding(.trailing, 8)
        .frame(minHeight: 60)
        .errdayGlass(radius: 12)
        .accessibilityElement(children: .combine)
    }
}

struct WorkoutTimerChip: View {
    @Environment(PersonalStore.self) private var records

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            HStack(spacing: 7) {
                Image(systemName: timerSymbol)
                    .font(.system(size: 17, weight: .medium))
                Text(label(at: context.date))
                    .font(.system(size: 14, weight: .semibold))
                    .monospacedDigit()
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .frame(minHeight: 44)
            .errdayGlass(radius: 22, tint: WorkoutTimerStyle.blue, interactive: true)
            .contentShape(Capsule())
        }
    }

    private func label(at date: Date) -> String {
        if let end = records.data.restEndsAt, end > date {
            return WorkoutTimerSheet.countdownText(Int(ceil(end.timeIntervalSince(date))))
        }
        if let paused = records.data.restTimerPausedSeconds, paused > 0 {
            return WorkoutTimerSheet.countdownText(Int(ceil(paused)))
        }
        if let started = records.data.workoutStopwatchStartedAt {
            let seconds = (records.data.workoutStopwatchElapsedSeconds ?? 0) + date.timeIntervalSince(started)
            return WorkoutTimerSheet.countdownText(Int(seconds))
        }
        if let elapsed = records.data.workoutStopwatchElapsedSeconds, elapsed > 0 {
            return WorkoutTimerSheet.countdownText(Int(elapsed))
        }
        return "Timer"
    }

    private var timerSymbol: String {
        if records.data.restEndsAt == nil, (records.data.restTimerPausedSeconds ?? 0) <= 0,
           records.data.workoutStopwatchStartedAt != nil || (records.data.workoutStopwatchElapsedSeconds ?? 0) > 0 {
            return "stopwatch"
        }
        return "timer"
    }
}

struct WorkoutTimerSheet: View {
    @Environment(PersonalStore.self) private var records
    @Environment(\.dismiss) private var dismiss
    @AppStorage("errday.hapticsEnabled") private var hapticsEnabled = true
    @State private var mode: Mode = .countdown
    @State private var restAlertsEnabled = RestTimerNotificationScheduler.isEnabled
    @State private var alertError: String?
    @State private var alertBusy = false
    @State private var showRestComplete = false

    private enum Mode: String, CaseIterable {
        case countdown = "Countdown"
        case stopwatch = "Stopwatch"
    }

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                HStack {
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 21, weight: .medium))
                            .frame(width: 50, height: 50)
                            .errdayGlassCircle(interactive: true)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Close timer")
                }
                .padding(.top, 20)

                modeControl
                    .padding(.top, 28)

                if mode == .countdown {
                    countdownContent(width: geometry.size.width)
                } else {
                    stopwatchContent
                }
                Spacer(minLength: 20)
            }
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .errdayGlassControls()
            .errdayBackground()
        }
        .overlay(alignment: .top) {
            if showRestComplete {
                WorkoutRestCompleteBanner { showRestComplete = false }
                    .padding(.horizontal, 24)
                    .padding(.top, 84)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .onChange(of: records.data.restEndsAt) { previous, current in
            guard let previous, current == nil,
                  previous <= .now,
                  Date.now.timeIntervalSince(previous) < 10,
                  records.data.restTimerPausedSeconds == 0 else { return }
            withAnimation(.snappy) { showRestComplete = true }
        }
        .task(id: showRestComplete) {
            guard showRestComplete else { return }
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            withAnimation(.snappy) { showRestComplete = false }
        }
    }

    private var modeControl: some View {
        Picker("Timer mode", selection: $mode) {
            ForEach(Mode.allCases, id: \.self) { Text($0.rawValue).tag($0) }
        }
        .pickerStyle(.segmented)
        .onChange(of: mode) { _, _ in ErrdayHaptics.selection(isEnabled: hapticsEnabled) }
    }

    private func countdownContent(width: CGFloat) -> some View {
        let diameter = min(width - 84, 340)
        return VStack(spacing: 28) {
            TimelineView(.periodic(from: .now, by: 0.1)) { context in
                let remaining = countdownRemaining(at: context.date)
                let duration = max(1, records.data.restTimerDurationSeconds ?? 90)
                let progress = records.data.restEndsAt == nil && records.data.restTimerPausedSeconds == nil
                    ? 1.0 : min(1, max(0, remaining / Double(duration)))
                ZStack {
                    Circle()
                        .stroke(WorkoutTimerStyle.track, lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(WorkoutTimerStyle.blue, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text(Self.countdownText(Int(ceil(remaining))))
                        .font(.system(size: 62, weight: .light, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText())
                }
                .frame(width: diameter, height: diameter)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Countdown, \(Self.countdownText(Int(ceil(remaining)))) remaining")
            }

            HStack {
                adjustmentButton(seconds: -10, symbol: "minus", label: "Remove 10 seconds")
                Spacer()
                timerActionButton(isRunning: isCountdownRunning, action: toggleCountdown)
                Spacer()
                adjustmentButton(seconds: 10, symbol: "plus", label: "Add 10 seconds")
            }
            .frame(maxWidth: diameter)

            Button {
                Task { await toggleRestAlerts() }
            } label: {
                Label(restAlertsEnabled ? "Rest alert on" : "Alert when rest ends",
                      systemImage: restAlertsEnabled ? "bell.fill" : "bell")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(restAlertsEnabled ? WorkoutTimerStyle.blue : .secondary)
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(alertBusy)
            .accessibilityValue(restAlertsEnabled ? "On" : "Off")
            if let alertError {
                Text(alertError)
                    .font(.footnote)
                    .foregroundStyle(WorkoutTimerStyle.orange)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 40)
    }

    private var stopwatchContent: some View {
        VStack(spacing: 72) {
            TimelineView(.periodic(from: .now, by: 0.05)) { context in
                Text(Self.stopwatchText(stopwatchElapsed(at: context.date)))
                    .font(.system(size: 58, weight: .light, design: .rounded))
                    .monospacedDigit()
                    .minimumScaleFactor(0.75)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)
                    .accessibilityLabel("Stopwatch, \(Self.stopwatchText(stopwatchElapsed(at: context.date)))")
            }
            HStack {
                Button("Reset", action: resetStopwatch)
                    .font(.system(size: 17, weight: .medium))
                    .frame(width: 76, height: 76)
                    .errdayGlassCircle(interactive: true)
                    .disabled((records.data.workoutStopwatchElapsedSeconds ?? 0) == 0 && records.data.workoutStopwatchStartedAt == nil)
                    .accessibilityLabel("Reset stopwatch")
                Spacer()
                timerActionButton(isRunning: records.data.workoutStopwatchStartedAt != nil, action: toggleStopwatch)
            }
            .frame(maxWidth: 340)
        }
        .padding(.top, 105)
    }

    private func adjustmentButton(seconds: Int, symbol: String, label: String) -> some View {
        Button { adjustCountdown(by: seconds) } label: {
            VStack(spacing: 1) {
                Image(systemName: "timer")
                    .font(.system(size: 18, weight: .medium))
                HStack(spacing: 1) {
                    Image(systemName: symbol)
                        .font(.system(size: 10, weight: .semibold))
                    Text("10")
                        .font(.system(size: 10, weight: .semibold))
                }
            }
            .frame(width: 76, height: 76)
            .errdayGlassCircle(interactive: true)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private func timerActionButton(isRunning: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(isRunning ? "Pause" : "Start")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(.black)
                .frame(width: 76, height: 76)
                .errdayGlassCircle(tint: isRunning ? WorkoutTimerStyle.orange : WorkoutTimerStyle.green, interactive: true)
        }
        .buttonStyle(.plain)
    }

    private var isCountdownRunning: Bool {
        guard let end = records.data.restEndsAt else { return false }
        return end > .now
    }

    private func countdownRemaining(at date: Date) -> Double {
        if let end = records.data.restEndsAt, end > date { return end.timeIntervalSince(date) }
        if let paused = records.data.restTimerPausedSeconds { return max(0, paused) }
        return Double(max(0, records.data.restTimerDurationSeconds ?? 90))
    }

    private func toggleCountdown() {
        if let end = records.data.restEndsAt, end > .now {
            let remaining = end.timeIntervalSinceNow
            guard records.update({ $0.restEndsAt = nil; $0.restTimerPausedSeconds = max(0, remaining) }) else { return }
        } else {
            let seconds = records.data.restTimerPausedSeconds.flatMap { $0 > 0 ? $0 : nil }
                ?? Double(max(10, records.data.restTimerDurationSeconds ?? 90))
            guard records.update({ $0.restEndsAt = .now.addingTimeInterval(seconds); $0.restTimerPausedSeconds = nil }) else { return }
        }
        ErrdayHaptics.selection(isEnabled: hapticsEnabled)
    }

    private func adjustCountdown(by seconds: Int) {
        let current = countdownRemaining(at: .now)
        let adjusted = max(0, min(3600, current + Double(seconds)))
        guard records.update({ data in
            if let end = data.restEndsAt, end > .now {
                data.restEndsAt = adjusted > 0 ? .now.addingTimeInterval(adjusted) : nil
                data.restTimerPausedSeconds = adjusted > 0 ? nil : 0
            } else if data.restTimerPausedSeconds != nil {
                data.restTimerPausedSeconds = adjusted
            } else {
                data.restTimerDurationSeconds = Int(max(10, adjusted))
            }
            if data.restEndsAt != nil || data.restTimerPausedSeconds != nil {
                data.restTimerDurationSeconds = max(10, max(Int(ceil(adjusted)), (data.restTimerDurationSeconds ?? 90) + seconds))
            }
        }) else { return }
        ErrdayHaptics.selection(isEnabled: hapticsEnabled)
    }

    private func stopwatchElapsed(at date: Date) -> Double {
        let previous = max(0, records.data.workoutStopwatchElapsedSeconds ?? 0)
        guard let started = records.data.workoutStopwatchStartedAt else { return previous }
        return previous + max(0, date.timeIntervalSince(started))
    }

    private func toggleStopwatch() {
        if let started = records.data.workoutStopwatchStartedAt {
            guard records.update({ data in
                data.workoutStopwatchElapsedSeconds = (data.workoutStopwatchElapsedSeconds ?? 0) + max(0, Date.now.timeIntervalSince(started))
                data.workoutStopwatchStartedAt = nil
            }) else { return }
        } else {
            guard records.update({ $0.workoutStopwatchStartedAt = .now }) else { return }
        }
        ErrdayHaptics.selection(isEnabled: hapticsEnabled)
    }

    private func resetStopwatch() {
        guard records.update({ $0.workoutStopwatchStartedAt = nil; $0.workoutStopwatchElapsedSeconds = 0 }) else { return }
        ErrdayHaptics.selection(isEnabled: hapticsEnabled)
    }

    private func toggleRestAlerts() async {
        guard !alertBusy else { return }
        alertBusy = true
        defer { alertBusy = false }
        alertError = nil
        let enabling = !restAlertsEnabled
        do {
            let enabled = try await RestTimerNotificationScheduler.setEnabled(enabling, for: records.data)
            restAlertsEnabled = enabled
            if enabling && !enabled {
                alertError = "Enable notifications in iPhone Settings to get rest alerts."
            }
        } catch {
            alertError = "Rest alerts could not be enabled."
        }
    }

    static func countdownText(_ seconds: Int) -> String {
        let safe = max(0, seconds)
        return String(format: "%02d:%02d", safe / 60, safe % 60)
    }

    static func stopwatchText(_ seconds: Double) -> String {
        let centiseconds = max(0, Int((seconds * 100).rounded(.down)))
        return String(format: "%02d:%02d,%02d", centiseconds / 6000, (centiseconds / 100) % 60, centiseconds % 100)
    }
}
