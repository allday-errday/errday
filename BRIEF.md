# Errday — Produkt- & Design-Brief

## Was Errday ist
Eine persönliche Health-Dashboard-Web-App — Motto **„All day. Errday."**. Sie bündelt das tägliche
Tracking von **Training, Ernährung, Schlaf und Journal** an einem Ort, mit einem
**Daily-Flow-Score** als motivierendem Herzstück. Kein nüchterner Tracker, sondern ein
**premium, ruhiges, intuitives** Erlebnis, das man jeden Tag gern öffnet.

- **Plattform:** Website (Desktop = Sidebar + mehrspaltiges Dashboard) mit App-Gefühl auf
  Mobile (Bottom-Nav, große Touch-Ziele). Mobile-first, aber auf Desktop bewusst „Website".
- **Nutzer:** eine Einzelperson (privat), die Fitness/Ernährung/Schlaf diszipliniert verfolgt.
- **Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Supabase (Auth + Postgres + RLS).

## Design-Sprache (verbindlich)
- **Theme:** dunkelgrau Basis `#15171c`, Akzent **Violett `#8b82f6`** (`--accent`), Flächen als
  weiß-transparente „surfaces", dezenter **Ambient-Glow** im Hintergrund. Tokens in `globals.css`.
- **Schrift:** **Manrope**. Abgestufte Gewichte: Überschriften 700, Werte/Buttons 600, Fließtext 400.
  Niemals alles fett — wirkt sonst kindlich.
- **Form:** Karten mit `rounded-2xl`, 1px-Border, weiche Schatten; großzügige Abstände; klare
  Hierarchie (ein Hero pro Seite, nicht alles gleich groß).
- **Sprache der UI:** Englisch, „sentence case", keine schreienden Großbuchstaben.

## Globale Prinzipien (gelten überall)
1. **Jede Aktion gibt Feedback.** Loggen (Wasser, Essen, Workout, Schlaf) und jedes Speichern
   zeigt einen **Toast „✓ …"**. Nichts passiert „stumm".
2. **Keine toten Controls.** Steht „Customize", muss es funktionieren. Lieber weglassen als faken.
3. **Intuitiv & schnell.** Wenig Klicks zum Loggen; Loading-Skeletons; sinnvolle Defaults.
4. **Charaktervolle Empty-States** statt „No data" — laden zum ersten Schritt ein.
5. **Responsiv:** Desktop nutzt die Breite (Spalten/Grids), Mobile bleibt fokussiert einspaltig.

## Navigation
Sidebar (Desktop) / Bottom-Nav (Mobile) mit Akzent-Aktiv-Indikator:
**Today · Gym · Food · Sleep · Journal** + **Settings** (unten). Logo „Errday" oben.

---

## Was auf jede Seite gehört

### Today (Home / Dashboard)
Das tägliche Cockpit. Auf Desktop zweispaltig.
- **Header:** „Today" + Datum, Settings-Shortcut.
- **Daily-Flow-Score (Hero):** großer Score /100 + Status („Poor/On track/…") + Fortschrittsring +
  ein motivierender Satz. Das Auge soll zuerst hier landen.
- **Stat-Karten (anpassbar):** Kalorien, Protein, Carbs, Burned, Wasser, Schlaf — je mit Wert,
  Ziel und Mini-Fortschrittsbalken. **„Customize"** wählt, welche sichtbar sind (gespeichert).
- **Wasser-Quicklog:** +250 / +500 ml direkt.
- **Quick Actions:** Log Meal · Start Workout · Write Journal · Log Weight.
- **Tagesplan-Timeline:** Frühstück → Pre-Workout → Workout → Post-Workout → Dinner → Schlaf,
  je mit Uhrzeit, Status (Logged/Upcoming/Missed) und Tap-to-log. Rest-Day/Gym-Day-Umschalter.

### Gym
- **Wochen-Snapshot:** Workouts · Sätze · Volumen (kg).
- **Primär-Aktion:** „Start New Workout" (prominent).
- **Workout loggen:** Schnell-Log (Template wählen, Minuten/Kalorien, Notiz).
- **Heute erledigt:** heutige Workouts.
- **Programme/Presets:** Push/Pull/Legs/Upper/Lower… als Karten-Grid; Custom bauen / Library browsen.
- **Verlauf:** letzte Workouts.
- **Aktives Workout (eigene Ansicht):** Timer (Dauer/Volumen/Sätze), pro Übung Sätze eingeben
  (kg × reps, „OK"), Übungs-Picker mit Suche + Muskel-Filter, Discard/Finish.

### Food
- **Suche:** Lebensmittel per Name oder Barcode (USDA FoodData Central) → Treffer mit Makros,
  Gramm + Mahlzeit wählen, loggen.
- **Mahlzeit loggen (manuell):** aus eigener Library wählen, Portionen.
- **Tages-Totals:** Kalorien / Protein / Carbs / Fett — gegen das Ziel.
- **Food-Library:** gespeicherte/Standard-Items mit Makros.
- **Heutige Einträge:** was heute geloggt wurde (löschbar).

### Sleep
- **Wind-down-Experience (Hero):** „Start wind-down" → 15-Min-Einschlaf-Countdown (ruhiger Ring,
  beruhigende Texte) → automatisch **Schlaf-Modus** mit Ziel-Aufwachzeit (aus Settings) →
  **„I'm awake"** loggt die Nacht automatisch. Läuft über Navigation/Reload hinweg.
- **Manuelles Loggen** (einklappbar) + **letzte 7 Nächte** mit Balken.

### Journal
- **Fokussiertes Check-in (Hero):** Tages-Gruß + wechselnder Reflexions-Prompt, großes Schreibfeld.
- **Skalen:** Mood (Emoji), Energy, Stress — tappbar 1–5.
- **Vergangene Einträge** als ruhige Liste; heutiger Eintrag wird vorausgefüllt.

### Settings
- **Profil:** Geschlecht, Geburtsdatum, Größe, Gewicht, Ziel, Aktivität → berechnet Kalorien- &
  Makro-Ziele automatisch.
- **Reminder:** Zeiten für Essen/Supplements/Gym/Schlaf/Journal + Gym-Rest-Timer-Hinweis.
- **Logout.**

### Login / Signup
Fokussierte, zentrierte Auth-Karte (kein Sidebar), gleiche Design-Sprache.

---

## Leitsatz für die Umsetzung
Wenn eine Entscheidung ansteht: **ruhig, premium, intuitiv, mit Feedback.** Lieber eine Sache
richtig „besonders" machen als fünf Sachen generisch. Jede Seite hat **einen klaren Hero** und
führt zur nächsten sinnvollen Aktion.
