# Errday – native iPhone-App

Eigenständiger SwiftUI-Neuaufbau ab iOS 17. Das alte Web-/Capacitor-Projekt bleibt unverändert. Bundle-ID: `com.errday.native`.

## Öffnen und testen

1. `Errday.xcodeproj` in Xcode öffnen, Schema **Errday** wählen.
2. Simulator oder eigenes iPhone auswählen und starten. Für das iPhone muss das Apple-Team ein HealthKit-Provisioning-Profil für die neue Bundle-ID bereitstellen.
3. Die Einrichtung lässt sich überspringen. Anmeldung ist derzeit deaktiviert; eine Supabase-Konfiguration wird für den lokalen Modus nicht benötigt.

Die App speichert unter `Errday/LocalProfile`. Frühere kontobezogene Daten unter `Errday/Accounts/<User-ID>` bleiben getrennt. Eine Deinstallation kann lokale Daten löschen; Cloud-Sync und Backup/Export sind noch nicht verbunden.

## Funktionen

- Vier Hauptseiten nach dem Figma-Entwurf: Home, Food, Gym, Health. Native Navigation, SF Pro, dunkelgrau/violett und lokale Figma-Vektorassets.
- Food: bereinigter OFF-Katalog, Händlerfilter, Such- und Barcode-Aliase, aufklappbare Varianten, Kamera-Barcodeerkennung, Mengen/Nährwertkorrekturen, Mahlzeitkategorien, Favoriten, eigene Lebensmittel und Meals mit Zutaten. Historische Einträge speichern unabhängige Snapshots.
- Gym: flexible Trainingsrotation, bearbeitbare Vorlagen, Übungen und eigene Namen, Satz-/Wiederholungs-/Pausenvorgaben, Gewichte/Wiederholungen, Pausentimer, Abschluss und Verlauf.
- Health: optionale HealthKit-Freigabe; Schlaf, Aktivität, Körper-/Herz-/Atemwerte; Tages-, 7-Tage- und 30-Tage-Ansichten mit Diagrammen und Datenabdeckung. Fehlende Werte werden nicht zu 0. Keine Diagnose und kein erfundener Recovery-Score.
- Profil und Einrichtung, frei gesetzte Kalorien-/Makroziele, freiwillige lokale Tages-/Wochen-Erinnerungen.

Der Assistent ist mit OpenAI GPT-5.4 mini verbunden (Responses API, eigener API-Schlüssel im gerätelokalen Schlüsselbund). Er sucht im lokalen Katalog, bereitet korrigierbare Lebensmittel-Einträge vor und liest Food-/Gym-Zusammenfassungen. Health-Zusammenfassungen benötigen die separate Freigabe im Chat. Speichern erfolgt erst nach Bestätigung; Rückgängig entfernt nur den zugehörigen Eintrag. Fehlende Daten bleiben unbekannt. Der Chat bleibt nur im Arbeitsspeicher, `store: false` deaktiviert OpenAI-Response-Speicherung; die API-Aufbewahrungsregeln von OpenAI gelten weiterhin.

Foto-KI, Watch-App, Widgets, dynamische Erholungsbenachrichtigungen und Cloud-Sync sind noch nicht umgesetzt. Die Auth-Implementierung bleibt für spätere Aktivierung erhalten; sie wird im lokalen Modus nicht initialisiert.

## KI einrichten

- Auf dem eigenen iPhone: Assistent → Menü → Verbindung & Datenschutz → eigenen API-Schlüssel einmalig im Schlüsselbund speichern. Der Schlüssel aus der Mac-Datei wird absichtlich nicht in den Build kopiert. Die Verbindung benötigt Internet und API-Guthaben; keinen laufenden Mac und keinen Supabase-Login.
- Persönliche BYOK-App: Der Nutzer hinterlegt seinen eigenen Schlüssel. Vor Verteilung an andere Nutzer ist ein authentifizierter Server mit serverseitigem Schlüssel und Nutzungsgrenzen erforderlich.
- Simulator: normal signierten Debug-Build verwenden. Bei Finder-/Synchronisierungsproblemen DerivedData ausserhalb des Desktops anlegen, z.B. `/tmp/errday-ai-derived`. Unsigned Builds unterstützen den Schlüsselbund nicht zuverlässig.
- `python3 scripts/connect_assistant_simulator.py --simulator <UDID>` übernimmt den bestätigten Schlüssel aus der ignorierten Root-`.env.local` in den Simulator-Schlüsselbund über die Prozessumgebung. Keine Ausgabe des Schlüssels, keine App-Ressource. Der Importpfad existiert nur für Debug-Simulator-Builds.
- Kein Hintergrund-Polling. Maximal sechs Modellaufrufe pro Nachricht, begrenzte Ausgabelänge, acht Suchtreffer, 4’000 Zeichen pro Nachricht. Tokenverbrauch im Chat-Menü; Kosten/Guthaben auf der OpenAI-Abrechnungsseite. Keine automatische Wiederholung kostenpflichtiger Anfragen.


## Lebensmittel

**22’768 Produkte**, 24’008 suchbare Barcodes inklusive Aliase. 2’055 nährwertlose Einträge entfernt, 1’240 Doppeleinträge vereinigt. 22’586 vollständige und 182 teilweise vorhandene Nährwertprofile. Zuordnungen: Coop 10’185, Migros 11’201, Denner 1’475; Überschneidungen möglich.

Quelle: Open Food Facts, ODbL 1.0; kein offizielles Live-Sortiment der Händler. [FOOD-DATA.md](FOOD-DATA.md) dokumentiert Zuordnung, Import, Ausschlüsse und Lizenz. [DESIGN-IMPLEMENTATION.md](DESIGN-IMPLEMENTATION.md) dokumentiert Designumfang und bewusste Grenzen.

## Prüfungen

- `python3 -m unittest discover -s scripts -p 'test_food_*.py'`
- `swift test --package-path Packages/ErrdayCore --scratch-path /tmp/errday-native-core-tests`
- App im Simulator bauen: `xcodebuild -project Errday.xcodeproj -scheme Errday -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' -derivedDataPath /tmp/errday-ai-derived CODE_SIGN_IDENTITY=- build`

Der externe SwiftPM-Testordner vermeidet Signierprobleme durch Finder-/Synchronisierungsattribute. Debug verwendet die aktive Architektur, damit App und lokale Packages auf demselben Simulator-Ziel gebaut werden.

Am 7. Oktober 2026 im Simulator geprüft: Start/Einrichtung überspringen, vier Hauptseiten, Lebensmittel erfassen und Tageswerte, Trainingsplan und Übung erstellen, Training starten, Satz abhaken, Pause und Abschluss. Core-Tests prüfen zusätzlich Migration alter Einträge, Persistenz, Portionen, Rotation und Barcode-Aliase. Kamera und reale Health-/Watch-Messwerte benötigen die Prüfung auf einem echten iPhone. Keine produktiven Datenbankänderungen.


## KI-Prüfung am 7. Oktober 2026

26 Swift-Core-Tests bestanden (einschliesslich 8 neuer KI-Tests). Signierter Simulator-Build erfolgreich. Echte OpenAI-Anfrage aus der App: Barcode → Katalogtreffer → 200 g / 316 kcal → Bestätigen → lokal gespeichert → Rückgängig. Health ohne Freigabe blockiert; mit Freigabe und fehlenden Simulatorwerten keine erfundenen Messwerte. Testeintrag entfernt. Keine Supabase-Änderung und kein API-Schlüssel im App-Bundle. Reale Health-Daten und das persönliche iPhone benötigen weiterhin einen Gerätetest.
