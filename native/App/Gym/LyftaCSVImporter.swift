import Foundation
import ErrdayCore

struct LyftaImportResult {
    let workouts: [Workout]
    let sourceRows: Int
}

enum LyftaCSVImportError: LocalizedError {
    case unreadable
    case invalidHeader
    case noWorkouts

    var errorDescription: String? {
        switch self {
        case .unreadable: "The selected CSV could not be read."
        case .invalidHeader: "This does not look like a Lyfta export."
        case .noWorkouts: "No valid workouts were found in this file."
        }
    }
}

enum LyftaCSVImporter {
    private struct SourceRow {
        let title: String
        let date: Date
        let duration: TimeInterval
        let description: String
        let workoutNotes: String
        let exercise: String
        let exerciseNote: String
        let weight: Double
        let repetitions: Int
        let effort: Double?
        let distance: Double?
        let setDuration: Double?
        let setType: WorkoutSetType
        let recordLevel: Int?
        let recordType: Int?
    }

    static func parse(url: URL) throws -> LyftaImportResult {
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url),
              let text = String(data: data, encoding: .utf8) else { throw LyftaCSVImportError.unreadable }
        let table = csvRows(text)
        guard let header = table.first else { throw LyftaCSVImportError.invalidHeader }
        let names = header.enumerated().reduce(into: [String: Int]()) { result, item in
            result[item.element.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\u{feff}", with: "")] = item.offset
        }
        let required = ["Title", "Date", "Duration", "Exercise", "Weight", "Reps", "Set Type"]
        guard required.allSatisfy({ names[$0] != nil }) else { throw LyftaCSVImportError.invalidHeader }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        formatter.timeZone = .current

        func field(_ row: [String], _ name: String) -> String {
            guard let index = names[name], row.indices.contains(index) else { return "" }
            return row[index].trimmingCharacters(in: .whitespacesAndNewlines)
        }
        func number(_ row: [String], _ name: String) -> Double? {
            let raw = field(row, name).replacingOccurrences(of: ",", with: ".")
            return raw.isEmpty ? nil : Double(raw)
        }

        var source: [SourceRow] = []
        for row in table.dropFirst() {
            guard let date = formatter.date(from: field(row, "Date")) else { continue }
            let title = field(row, "Title")
            let exercise = field(row, "Exercise")
            guard !title.isEmpty, !exercise.isEmpty else { continue }
            source.append(SourceRow(
                title: title,
                date: date,
                duration: duration(field(row, "Duration")),
                description: field(row, "Description"),
                workoutNotes: field(row, "Notes"),
                exercise: exercise,
                exerciseNote: field(row, "Exercise Note"),
                weight: number(row, "Weight") ?? 0,
                repetitions: max(0, Int(number(row, "Reps") ?? 0)),
                effort: number(row, "RIR/RPE"),
                distance: number(row, "Distance"),
                setDuration: field(row, "Time").isEmpty ? nil : duration(field(row, "Time")),
                setType: setType(field(row, "Set Type")),
                recordLevel: number(row, "RecordLevel: gold/silver/bronze").map(Int.init),
                recordType: number(row, "RecordType: 1RM / max_weight / volume / reps").map(Int.init)
            ))
        }

        let grouped = Dictionary(grouping: source) { "\($0.title)|\($0.date.timeIntervalSince1970)" }
        let workouts = grouped.values.compactMap(makeWorkout).sorted { $0.startedAt < $1.startedAt }
        guard !workouts.isEmpty else { throw LyftaCSVImportError.noWorkouts }
        return LyftaImportResult(workouts: workouts, sourceRows: source.count)
    }

    private static func makeWorkout(_ rows: [SourceRow]) -> Workout? {
        guard let first = rows.first else { return nil }
        var order: [String] = []
        var grouped: [String: [SourceRow]] = [:]
        for row in rows {
            let normalized = row.exercise.trimmingCharacters(in: .whitespacesAndNewlines)
            let key = normalized.lowercased()
            if grouped[key] == nil { order.append(key) }
            grouped[key, default: []].append(row)
        }
        let exercises = order.compactMap { key -> Exercise? in
            guard let items = grouped[key], let item = items.first else { return nil }
            var exercise = Exercise(name: item.exercise.trimmingCharacters(in: .whitespacesAndNewlines), setCount: max(1, items.count))
            exercise.notes = items.map(\.exerciseNote).filter { !$0.isEmpty }.uniqued().joined(separator: " · ").nilIfEmpty
            exercise.primaryMuscle = ExerciseCatalog.all.first {
                $0.name.caseInsensitiveCompare(exercise.name) == .orderedSame
            }?.muscle.rawValue
            exercise.sets = items.map { source in
                var set = WorkoutSet(type: source.setType)
                set.weight = source.weight
                set.repetitions = source.repetitions
                set.completed = true
                set.effort = source.effort
                set.distance = source.distance
                set.durationSeconds = source.setDuration
                set.recordLevel = source.recordLevel
                set.recordType = source.recordType
                return set
            }
            return exercise
        }
        var workout = Workout(name: first.title, startedAt: first.date, exercises: exercises)
        workout.finishedAt = first.date.addingTimeInterval(first.duration)
        workout.notes = [first.description, first.workoutNotes].filter { !$0.isEmpty }.joined(separator: " · ").nilIfEmpty
        return workout
    }

    private static func setType(_ value: String) -> WorkoutSetType {
        switch value.uppercased() {
        case "WARMUP_SET": .warmup
        case "DROP_SET": .drop
        case "FAILURE_SET": .failure
        case "LEFT_SET": .left
        case "RIGHT_SET": .right
        case "MYO_REPS_SET": .myoReps
        default: .normal
        }
    }

    private static func duration(_ value: String) -> TimeInterval {
        if value.isEmpty { return 0 }
        let parts = value.split(separator: ":").compactMap { Double($0) }
        if parts.count == 3 { return parts[0] * 3600 + parts[1] * 60 + parts[2] }
        if parts.count == 2 { return parts[0] * 60 + parts[1] }
        return Double(value) ?? 0
    }

    private static func csvRows(_ text: String) -> [[String]] {
        var rows: [[String]] = []
        var row: [String] = []
        var field = ""
        var quoted = false
        let characters = Array(text)
        var index = 0
        while index < characters.count {
            let character = characters[index]
            if character == "\"" {
                if quoted, index + 1 < characters.count, characters[index + 1] == "\"" {
                    field.append("\""); index += 1
                } else { quoted.toggle() }
            } else if character == ",", !quoted {
                row.append(field); field = ""
            } else if (character == "\n" || character == "\r"), !quoted {
                if character == "\r", index + 1 < characters.count, characters[index + 1] == "\n" { index += 1 }
                row.append(field); field = ""
                if row.contains(where: { !$0.isEmpty }) { rows.append(row) }
                row = []
            } else { field.append(character) }
            index += 1
        }
        if !field.isEmpty || !row.isEmpty { row.append(field); rows.append(row) }
        return rows
    }
}

private extension Array where Element == String {
    func uniqued() -> [String] {
        var seen = Set<String>()
        return filter { seen.insert($0).inserted }
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
