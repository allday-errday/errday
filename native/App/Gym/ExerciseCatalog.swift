import Foundation
import Observation
import ErrdayCore

enum MuscleGroup: String, CaseIterable, Identifiable {
    case chest = "Chest", back = "Back", shoulders = "Shoulders", biceps = "Biceps"
    case triceps = "Triceps", forearms = "Forearms", quadriceps = "Quadriceps"
    case hamstrings = "Hamstrings", glutes = "Glutes", adductors = "Adductors", calves = "Calves", core = "Core", fullBody = "Full body"
    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .chest: "figure.strengthtraining.traditional"
        case .back: "figure.rower"
        case .shoulders: "figure.strengthtraining.functional"
        case .biceps, .triceps, .forearms: "dumbbell.fill"
        case .quadriceps, .hamstrings, .glutes, .adductors, .calves: "figure.run"
        case .core: "figure.core.training"
        case .fullBody: "figure.cross.training"
        }
    }
}

struct CatalogExercise: Identifiable, Hashable {
    let name: String
    let muscle: MuscleGroup
    var equipment: String = "Other"
    var imageURL: URL? = nil
    var imageAuthor: String? = nil
    var licenseName: String? = nil
    var licenseURL: URL? = nil
    var sourceID: Int? = nil
    var id: String { sourceID.map { "wger-\($0)" } ?? name }
    var exercise: Exercise {
        var result = Exercise(name: name)
        result.primaryMuscle = muscle.rawValue
        result.imageURL = imageURL
        result.imageAuthor = imageAuthor
        result.imageLicenseName = licenseName
        result.imageLicenseURL = licenseURL
        result.catalogueSourceID = sourceID
        return result
    }
}

@MainActor @Observable
final class ExerciseMediaStore {
    var exercises: [CatalogExercise] = ExerciseCatalog.all
    var loading = false
    var error: String?
    private var loaded = false

    func load() async {
        guard !loaded, !loading else { return }
        loading = true; error = nil
        defer { loading = false }
        do {
            let offsets = [0, 300, 600, 900]
            let pages = try await withThrowingTaskGroup(of: WgerPage.self) { group in
                for offset in offsets {
                    group.addTask {
                        let url = URL(string: "https://wger.de/api/v2/exerciseinfo/?language=2&limit=300&offset=\(offset)")!
                        let (data, response) = try await URLSession.shared.data(from: url)
                        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
                        return try JSONDecoder().decode(WgerPage.self, from: data)
                    }
                }
                var result: [WgerPage] = []
                for try await page in group { result.append(page) }
                return result
            }
            var seen = Set<String>()
            let remote = pages.flatMap(\.results).compactMap { item -> CatalogExercise? in
                guard let translation = item.translations.first(where: { $0.language == 2 }),
                      let muscle = item.muscleGroup else { return nil }
                let name = translation.name.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !name.isEmpty, seen.insert(name.lowercased()).inserted else { return nil }
                let image = item.images.first(where: { $0.isMain }) ?? item.images.first
                let url = image.flatMap { URL(string: $0.thumbnails?.medium ?? $0.thumbnails?.small ?? $0.image) }
                return CatalogExercise(name: name, muscle: muscle,
                                       equipment: item.equipment.first?.name ?? "Bodyweight",
                                       imageURL: url,
                                       imageAuthor: image?.licenseAuthor.nilIfEmpty ?? item.licenseAuthor.nilIfEmpty,
                                       licenseName: item.license.shortName, licenseURL: URL(string: item.license.url), sourceID: item.id)
            }.sorted {
                if ($0.imageURL != nil) != ($1.imageURL != nil) { return $0.imageURL != nil }
                return $0.name.localizedStandardCompare($1.name) == .orderedAscending
            }
            if !remote.isEmpty {
                exercises = remote + ExerciseCatalog.all.filter { local in !seen.contains(local.name.lowercased()) }
            }
            loaded = true
        } catch {
            self.error = "Online exercise images are unavailable. Showing the offline catalogue."
            loaded = true
        }
    }
}

private struct WgerPage: Decodable { let results: [WgerExercise] }
private struct WgerExercise: Decodable {
    let id: Int
    let category: WgerCategory
    let muscles: [WgerMuscle]
    let equipment: [WgerEquipment]
    let images: [WgerImage]
    let translations: [WgerTranslation]
    let license: WgerLicense
    let licenseAuthor: String
    enum CodingKeys: String, CodingKey { case id, category, muscles, equipment, images, translations, license; case licenseAuthor = "license_author" }
    var muscleGroup: MuscleGroup? {
        let labels = muscles.map { ($0.nameEn ?? $0.name).lowercased() } + [category.name.lowercased()]
        if labels.contains(where: { $0.contains("chest") || $0.contains("pector") }) { return .chest }
        if labels.contains(where: { $0.contains("back") || $0.contains("latiss") || $0.contains("trapez") }) { return .back }
        if labels.contains(where: { $0.contains("shoulder") || $0.contains("deltoid") }) { return .shoulders }
        if labels.contains(where: { $0.contains("biceps") }) { return .biceps }
        if labels.contains(where: { $0.contains("triceps") }) { return .triceps }
        if labels.contains(where: { $0.contains("forearm") || $0.contains("brachioradialis") }) { return .forearms }
        if labels.contains(where: { $0.contains("quad") }) { return .quadriceps }
        if labels.contains(where: { $0.contains("hamstring") || $0.contains("biceps femoris") }) { return .hamstrings }
        if labels.contains(where: { $0.contains("glute") }) { return .glutes }
        if labels.contains(where: { $0.contains("adduct") || $0.contains("inner thigh") }) { return .adductors }
        if labels.contains(where: { $0.contains("calf") || $0.contains("gastrocnem") || $0.contains("soleus") }) { return .calves }
        if labels.contains(where: { $0.contains("abs") || $0.contains("abdom") || $0.contains("core") }) { return .core }
        return .fullBody
    }
}
private struct WgerCategory: Decodable { let name: String }
private struct WgerEquipment: Decodable { let name: String }
private struct WgerMuscle: Decodable {
    let name: String; let nameEn: String?
    enum CodingKeys: String, CodingKey { case name; case nameEn = "name_en" }
}
private struct WgerTranslation: Decodable { let name: String; let language: Int }
private struct WgerLicense: Decodable {
    let shortName: String; let url: String
    enum CodingKeys: String, CodingKey { case shortName = "short_name"; case url }
}
private struct WgerImage: Decodable {
    let image: String; let thumbnails: WgerThumbnails?; let isMain: Bool; let licenseAuthor: String
    enum CodingKeys: String, CodingKey { case image, thumbnails; case isMain = "is_main"; case licenseAuthor = "license_author" }
}
private struct WgerThumbnails: Decodable { let small: String?; let medium: String? }
private extension String { var nilIfEmpty: String? { isEmpty ? nil : self } }

enum ExerciseCatalog {
    static let all: [CatalogExercise] = ([
        ("Barbell Bench Press", .chest), ("Dumbbell Bench Press", .chest), ("Incline Barbell Press", .chest),
        ("Incline Dumbbell Press", .chest), ("Chest Press Machine", .chest), ("Cable Fly", .chest),
        ("Pec Deck", .chest), ("Push-Up", .chest), ("Dips (Chest)", .chest),
        ("Pull-Up", .back), ("Chin-Up", .back), ("Lat Pulldown", .back), ("Wide-Grip Lat Pulldown", .back),
        ("Cable Seated Row", .back), ("Chest-Supported Row", .back), ("Barbell Row", .back),
        ("Dumbbell Row", .back), ("T-Bar Row", .back), ("Straight-Arm Pulldown", .back), ("Back Extension", .back),
        ("Barbell Shoulder Press", .shoulders), ("Dumbbell Shoulder Press", .shoulders),
        ("Machine Shoulder Press", .shoulders), ("Dumbbell Lateral Raise", .shoulders),
        ("Cable Lateral Raise", .shoulders), ("Reverse Fly", .shoulders), ("Face Pull", .shoulders),
        ("Barbell Curl", .biceps), ("Dumbbell Curl", .biceps), ("Incline Dumbbell Curl", .biceps),
        ("Preacher Curl", .biceps), ("Cable Curl", .biceps), ("Hammer Curl", .biceps),
        ("Triceps Pushdown", .triceps), ("Overhead Cable Extension", .triceps),
        ("Skull Crusher", .triceps), ("Close-Grip Bench Press", .triceps), ("Dips (Triceps)", .triceps),
        ("Reverse Curl", .forearms), ("Wrist Curl", .forearms), ("Farmer's Carry", .forearms),
        ("Back Squat", .quadriceps), ("Front Squat", .quadriceps), ("Leg Press", .quadriceps),
        ("Hack Squat", .quadriceps), ("Bulgarian Split Squat", .quadriceps), ("Leg Extension", .quadriceps),
        ("Walking Lunge", .quadriceps), ("Romanian Deadlift", .hamstrings), ("Lying Leg Curl", .hamstrings),
        ("Seated Leg Curl", .hamstrings), ("Good Morning", .hamstrings),
        ("Hip Thrust", .glutes), ("Glute Bridge", .glutes), ("Cable Kickback", .glutes),
        ("Hip Abduction", .glutes), ("Standing Calf Raise", .calves), ("Seated Calf Raise", .calves),
        ("Leg Press Calf Raise", .calves), ("Cable Crunch", .core), ("Hanging Leg Raise", .core),
        ("Plank", .core), ("Ab Wheel Rollout", .core), ("Russian Twist", .core),
        ("Deadlift", .fullBody), ("Trap Bar Deadlift", .fullBody), ("Clean and Press", .fullBody)
    ] as [(String, MuscleGroup)]).map { CatalogExercise(name: $0.0, muscle: $0.1) }

    static func muscle(for exercise: Exercise) -> MuscleGroup? {
        if let stored = exercise.primaryMuscle.flatMap(MuscleGroup.init(rawValue:)) { return stored }
        return all.first { $0.name.caseInsensitiveCompare(exercise.name) == .orderedSame }?.muscle
    }
}

struct MuscleRecovery: Identifiable {
    let muscle: MuscleGroup
    let lastTrained: Date
    let targetHours: Double
    let completedSets: Int
    var id: String { muscle.rawValue }
    var progress: Double { min(1, max(0, Date.now.timeIntervalSince(lastTrained) / (targetHours * 3600))) }
    var remainingHours: Int { max(0, Int(ceil(targetHours - Date.now.timeIntervalSince(lastTrained) / 3600))) }
}

enum RecoveryEstimator {
    static func recoveries(from workouts: [Workout]) -> [MuscleRecovery] {
        var result: [MuscleGroup: MuscleRecovery] = [:]
        for workout in workouts.sorted(by: { $0.startedAt > $1.startedAt }) {
            guard let finished = workout.finishedAt else { continue }
            for exercise in workout.exercises {
                guard let muscle = ExerciseCatalog.muscle(for: exercise), result[muscle] == nil else { continue }
                let completed = exercise.sets.filter(\.completed)
                guard !completed.isEmpty else { continue }
                let failure = completed.contains { $0.effectiveType == .failure }
                result[muscle] = MuscleRecovery(muscle: muscle, lastTrained: finished,
                                                targetHours: failure ? 48 : 36,
                                                completedSets: completed.count)
            }
        }
        return result.values.sorted { $0.progress < $1.progress }
    }
}
