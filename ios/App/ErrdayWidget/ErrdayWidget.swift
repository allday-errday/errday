import SwiftUI
import WidgetKit

struct ErrdayEntry: TimelineEntry {
    let date: Date
}

struct ErrdayTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> ErrdayEntry {
        ErrdayEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (ErrdayEntry) -> Void) {
        completion(ErrdayEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ErrdayEntry>) -> Void) {
        let entry = ErrdayEntry(date: Date())
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

struct ErrdayWidgetView: View {
    let entry: ErrdayEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Errday")
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                Spacer()
                Image(systemName: "heart.text.square.fill")
                    .foregroundStyle(Color(red: 0.55, green: 0.51, blue: 0.96))
            }

            Spacer(minLength: 4)

            Text("Today")
                .font(.system(size: 26, weight: .heavy, design: .rounded))
            Text("Open your dashboard, log food, training and sleep.")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .lineLimit(3)

            Spacer(minLength: 4)

            Text(entry.date, style: .time)
                .font(.caption2)
                .fontWeight(.bold)
                .foregroundStyle(Color(red: 0.55, green: 0.51, blue: 0.96))
        }
        .padding()
        .widgetURL(URL(string: "errday://today"))
        .errdayWidgetBackground()
    }
}

struct ErrdayTodayWidget: Widget {
    let kind = "ErrdayTodayWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ErrdayTimelineProvider()) { entry in
            ErrdayWidgetView(entry: entry)
        }
        .configurationDisplayName("Errday Today")
        .description("Quick access to your daily Errday dashboard.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct ErrdayWidgets: WidgetBundle {
    var body: some Widget {
        ErrdayTodayWidget()
    }
}

private extension View {
    @ViewBuilder
    func errdayWidgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) {
                Color(red: 0.08, green: 0.09, blue: 0.11)
            }
        } else {
            background(Color(red: 0.08, green: 0.09, blue: 0.11))
        }
    }
}
