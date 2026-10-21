# Figma-Umsetzung – 7. Oktober 2026

Referenz: https://www.figma.com/design/qrd1avODjr00mX7gcKsZ6L/Untitled?node-id=1-4069

Native SwiftUI-Übersetzung der vier Hauptseiten und lokaler Detailabläufe. Farbwerte, Abstände, Karten und heruntergeladene Figma-Vektoren werden über ErrdayTheme/FigmaIcon verwendet. Die bestehende SF-Pro-Typografie bleibt entsprechend den Projektvorgaben erhalten. TabView, NavigationStack, Form, Berechtigungsdialoge und Tastatur verwenden die jeweilige iOS-Darstellung; auf iOS 26+ haben System-Tabs deshalb Liquid Glass statt des flachen Figma-Footers. Statische Statusleisten und Beispiel-Messwerte aus Figma werden nicht übernommen.

## Verbundene Abläufe

- Home: Ernährung, nächstes/laufendes Training, verfügbare Health-Messwerte, faktischer Tagesüberblick.
- Food: Suche/Filter, gruppierte Nährwertvarianten, Barcode-Aliase, Kameraerkennung mit manuellem Ersatz, korrigierbare Portionen, vier Mahlzeitenbereiche, Bearbeiten/Löschen, Favoriten, eigene Lebensmittel, gespeicherte Meals mit Zutaten und Mengenfaktor.
- Gym: Wochenübersicht, anlegbare/reihenfähige Trainingspläne, Vorlagen, Übungsauswahl und eigene Namen, Sätze/Wiederholungsbereiche/Pausen, aktives Training, gespeicherter Pausenzeitpunkt, Abschluss/Verlauf und Rotation.
- Health: Tag/7 Tage/30 Tage, Schlafnächte/-stadien, Schritte/Distanz/Energie/Trainingszeit, Körper-/Herz-/Atemwerte, Verlaufsdiagramme, fehlende Messungen, Quellen/Berechtigungen. Tagesdurchschnitte aus vorhandenen Tagen, Aktivitätsmengen je Tag summiert. Keine pauschale Bewertung gesund/krank oder erfundener Erholungsprozentsatz.
- Profil: freiwillige Angaben, Ziele, sechs Einrichtungsschritte, optionale lokale Erinnerungen zu festen Zeiten.

## Bewusste Grenzen

KI-Anbindung inzwischen umgesetzt: persönlicher OpenAI-Schlüssel im gerätelokalen Schlüsselbund, GPT-5.4 mini, lokaler Katalogzugriff, bestätigte/korrigierbare Einträge und Food-/Gym-/Health-Zusammenfassungen. Health wird nur nach expliziter Freigabe im Chat an OpenAI gesendet; die Freigabe endet mit dem App-Neustart. Chatverlauf nur im Arbeitsspeicher, kein Supabase-Sync. Login bleibt deaktiviert. Foto-KI, Watch-App, Widgets und dynamische Erholungsbenachrichtigungen bleiben offen.

## Prüfung

20 Python-Import-/Bereinigungstests und 26 Swift-Core-Tests. Simulator: iPhone 17 Pro Max, iOS 27 (installierter vergleichbarer Simulator); kein iPhone-16-Runtime vorhanden. Die für die Prüfung angelegten Mahlzeiten und Trainings wurden anschliessend aus dem Simulator entfernt. Kamera und echte Health-/Watch-Messungen benötigen ein reales Gerät.


## KI-Prüfung am 7. Oktober 2026

26 Swift-Core-Tests bestanden (einschliesslich 8 neuer KI-Tests). Signierter Simulator-Build erfolgreich. Echte OpenAI-Anfrage aus der App: Barcode → Katalogtreffer → 200 g / 316 kcal → Bestätigen → lokal gespeichert → Rückgängig. Health ohne Freigabe blockiert; mit Freigabe und fehlenden Simulatorwerten keine erfundenen Messwerte. Testeintrag entfernt. Keine Supabase-Änderung und kein API-Schlüssel im App-Bundle. Reale Health-Daten und das persönliche iPhone benötigen weiterhin einen Gerätetest.
