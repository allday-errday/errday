import ErrdayCore
import SwiftUI

struct WatchRestChip: View {
    @Environment(WatchWorkoutStore.self) private var workouts

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let end = workouts.snapshot?.restEndsAt
            let paused = workouts.snapshot?.restTimerPausedSeconds
            let remaining = end.map { max(0, $0.timeIntervalSince(context.date)) } ?? paused
            Label(remaining.map { WatchTheme.duration($0) } ?? "Timer",
                  systemImage: (paused ?? 0) > 0 ? "pause.circle" : "timer")
                .monospacedDigit().lineLimit(1).minimumScaleFactor(0.7)
        }
    }
}

struct WatchRestTimerView: View {
    @Environment(WatchWorkoutStore.self) private var workouts
    let workoutID: UUID
    private var snapshot: WatchWorkoutSnapshot? { workouts.snapshot }
    private var duration: Int { snapshot?.restTimerDurationSeconds ?? 90 }
    private var isCurrent: Bool { snapshot?.activeWorkout?.id == workoutID }

    var body: some View {
        ScrollView {
            TimelineView(.periodic(from: .now, by: 0.5)) { context in
                let seconds = remaining(at: context.date)
                let running = snapshot?.restEndsAt.map { $0 > context.date } ?? false
                VStack(spacing: 12) {
                    ZStack {
                        Circle().stroke(WatchTheme.raised, lineWidth: 5)
                        Circle().trim(from: 0, to: min(1, max(0, seconds / Double(max(1, duration)))))
                            .stroke(WatchTheme.gym, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        VStack(spacing: 4) {
                            Text(WatchTheme.duration(seconds))
                                .font(.system(size: 34, weight: .medium, design: .rounded)).monospacedDigit()
                                .lineLimit(1).minimumScaleFactor(0.65)
                            Text(running ? "Resting" : seconds == 0 ? "Ready" : snapshot?.restTimerPausedSeconds != nil ? "Paused" : "Rest timer")
                                .font(.caption2).foregroundStyle(.secondary)
                        }.padding(12)
                    }.frame(height: 134).padding(4)
                        .accessibilityElement(children: .combine)
                    HStack(spacing: 4) {
                        Button { adjust(by: -10) } label: {
                            Text("−10").font(.caption).frame(maxWidth: .infinity, minHeight: 44)
                        }.disabled(seconds <= 0).accessibilityLabel("Subtract 10 seconds")
                        Button { toggle() } label: {
                            Image(systemName: running ? "pause.fill" : "play.fill")
                                .frame(maxWidth: .infinity, minHeight: 44)
                        }.tint(WatchTheme.gym).buttonStyle(.borderedProminent)
                            .accessibilityLabel(running ? "Pause timer" : "Start timer")
                            .accessibilityIdentifier("watch.timer.toggle")
                        Button { adjust(by: 10) } label: {
                            Text("+10").font(.caption).frame(maxWidth: .infinity, minHeight: 44)
                        }.disabled(seconds >= 3600).accessibilityLabel("Add 10 seconds")
                    }
                    if snapshot?.restEndsAt != nil || snapshot?.restTimerPausedSeconds != nil {
                        Button("Skip rest") { workouts.perform(.skipRest(workoutID: workoutID)) }
                            .font(.caption).accessibilityIdentifier("watch.timer.skip")
                    }
                    if !isCurrent { Text("This workout has ended.").font(.caption) }
                    if let error = workouts.actionError ?? workouts.error {
                        Text(error).font(.caption2).foregroundStyle(.orange)
                    }
                }
                .disabled(!isCurrent || workouts.error != nil)
                .padding(.horizontal, 8)
            }
        }.navigationTitle("Rest timer").navigationBarTitleDisplayMode(.inline)
    }

    private func remaining(at date: Date = .now) -> Double {
        if let end = snapshot?.restEndsAt { return max(0, end.timeIntervalSince(date)) }
        return snapshot?.restTimerPausedSeconds ?? Double(duration)
    }

    private func toggle() {
        let now = Date.now
        let seconds = remaining(at: now)
        if let end = snapshot?.restEndsAt, end > now {
            workouts.perform(.rest(workoutID: workoutID, endsAt: nil, pausedSeconds: seconds, durationSeconds: duration))
        } else {
            let startSeconds = seconds > 0 ? seconds : Double(max(10, duration))
            workouts.perform(.rest(workoutID: workoutID, endsAt: now.addingTimeInterval(startSeconds),
                                   pausedSeconds: nil, durationSeconds: max(duration, Int(startSeconds.rounded(.up)))))
        }
    }

    private func adjust(by delta: Double) {
        let now = Date.now
        let seconds = min(3600, max(0, remaining(at: now) + delta))
        let running = snapshot?.restEndsAt.map { $0 > now } ?? false
        let idle = snapshot?.restEndsAt == nil && snapshot?.restTimerPausedSeconds == nil
        let newDuration = idle ? Int(seconds.rounded(.up)) : max(duration, Int(seconds.rounded(.up)))
        workouts.perform(.rest(workoutID: workoutID,
                               endsAt: running && seconds > 0 ? now.addingTimeInterval(seconds) : nil,
                               pausedSeconds: idle || (running && seconds > 0) ? nil : seconds,
                               durationSeconds: newDuration))
    }
}
