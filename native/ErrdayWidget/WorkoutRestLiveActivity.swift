import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private enum RestActivityStyle {
    static let background = Color(red: 0.07, green: 0.07, blue: 0.08)
    static let blue = Color(red: 0.15, green: 0.64, blue: 0.94)
    static let muted = Color(red: 0.68, green: 0.68, blue: 0.72)
}

struct WorkoutRestLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutRestActivityAttributes.self) { context in
            lockScreenContent(context)
                .activityBackgroundTint(RestActivityStyle.background)
                .activitySystemActionForegroundColor(.white)
                .widgetURL(URL(string: "errday://gym/workout"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("Rest", systemImage: "timer")
                        .foregroundStyle(RestActivityStyle.blue)
                        .font(.system(size: 15, weight: .semibold))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    remainingTime(context.state)
                        .font(.system(size: 19, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(RestActivityStyle.blue)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 7) {
                        Text(context.state.exerciseName)
                            .font(.system(size: 15, weight: .semibold))
                            .lineLimit(1)
                        Text(context.state.nextSet)
                            .font(.system(size: 12))
                            .foregroundStyle(RestActivityStyle.muted)
                            .lineLimit(1)
                        HStack(spacing: 12) {
                            restProgress(context.state)
                            toggleButton(context)
                        }
                    }
                    .padding(.top, 3)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundStyle(RestActivityStyle.blue)
                    .accessibilityLabel("Rest timer")
            } compactTrailing: {
                remainingTime(context.state)
                    .font(.system(size: 13, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(RestActivityStyle.blue)
                    .frame(minWidth: 34)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundStyle(RestActivityStyle.blue)
                    .accessibilityLabel("Rest timer")
            }
            .widgetURL(URL(string: "errday://gym/workout"))
        }
    }

    private func lockScreenContent(_ context: ActivityViewContext<WorkoutRestActivityAttributes>) -> some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack {
                Text("Errday")
                    .font(.system(size: 12, weight: .semibold))
                Spacer()
                Text(context.attributes.workoutName)
                    .font(.system(size: 12))
                    .foregroundStyle(RestActivityStyle.muted)
                    .lineLimit(1)
            }

            HStack(spacing: 11) {
                Image(systemName: "dumbbell.fill")
                    .font(.system(size: 21, weight: .medium))
                    .foregroundStyle(RestActivityStyle.blue)
                    .frame(width: 48, height: 48)
                    .background(Color.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 10))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 3) {
                    Text(context.state.exerciseName)
                        .font(.system(size: 15, weight: .semibold))
                        .lineLimit(1)
                    Text(context.state.nextSet)
                        .font(.system(size: 12))
                        .foregroundStyle(RestActivityStyle.muted)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }

            HStack(spacing: 12) {
                remainingTime(context.state)
                    .font(.system(size: 18, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(RestActivityStyle.blue)
                    .frame(minWidth: 46, alignment: .leading)
                restProgress(context.state)
                toggleButton(context)
            }
        }
        .padding(14)
        .foregroundStyle(.white)
    }

    @ViewBuilder
    private func remainingTime(_ state: WorkoutRestActivityAttributes.ContentState) -> some View {
        if let start = state.startDate, let end = state.endDate, end > start {
            Text(timerInterval: start...end, countsDown: true, showsHours: false)
        } else {
            let seconds = max(0, state.pausedSeconds ?? 0)
            Text(String(format: "%d:%02d", seconds / 60, seconds % 60))
        }
    }

    @ViewBuilder
    private func restProgress(_ state: WorkoutRestActivityAttributes.ContentState) -> some View {
        if let start = state.startDate, let end = state.endDate, end > start {
            ProgressView(timerInterval: start...end, countsDown: true)
                .tint(RestActivityStyle.blue)
        } else {
            ProgressView(value: Double(state.pausedSeconds ?? 0), total: Double(max(1, state.durationSeconds)))
                .tint(RestActivityStyle.blue)
        }
    }

    private func toggleButton(_ context: ActivityViewContext<WorkoutRestActivityAttributes>) -> some View {
        Button(intent: ToggleWorkoutRestIntent(workoutID: context.attributes.workoutID)) {
            Image(systemName: context.state.isRunning ? "pause.fill" : "play.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(Color.white.opacity(0.18), in: Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(context.state.isRunning ? "Pause rest timer" : "Resume rest timer")
    }
}
