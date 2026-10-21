# Coop / Migros / Denner: Datenherkunft und Import

## Paralleler kostenloser Katalog-Prototyp

Der erweiterte Katalog liegt unter `Artifacts/FoodCatalogV2/`, wird als `App/Resources/food-catalog-v2.sqlite` mit der nativen App gebündelt und in die geschützten `food_catalog_*`-Tabellen von Supabase gespiegelt. Der bestehende JSON-Katalog bleibt als App-Fallback erhalten. Der erweiterte Katalog kombiniert den vollständigen, mit einer separaten Zählabfrage geprüften Schweiz-Export von Open Food Facts mit der offiziellen Swiss Food Composition Database. Er speichert Herkunft, Lizenz, Abrufzeitpunkt, Quelldatum, Händlernachweis und Datenvertrauen pro Produkt.

Stand 19. Oktober 2026 enthält die SQLite-Vorschau 86’704 suchbare Lebensmittel: 85’458 Produkte von Open Food Facts und 1’246 Einträge aus der Schweizer Nährwertdatenbank. 85’458 Einträge besitzen einen Barcode, davon sind 61’513 noch nicht über eine Hauptnummer oder einen Alias im aktuellen App-Katalog auffindbar. Die Datenbank hat die Integritätsprüfung bestanden; der vollständige Bericht mit Prüfsummen liegt in `Artifacts/FoodCatalogV2/report.json`.

Beim Import werden unmögliche Werte pro 100 g beziehungsweise 100 ml verworfen (über 900 kcal, über 100 g je Makronährstoff oder über 50 g Natrium). Ein ansonsten brauchbares Produkt bleibt erhalten; nur das fehlerhafte Feld wird geleert. Wenn ein fehlerhafter kcal-Wert vorliegt, aber eine plausible Energieangabe in kJ vorhanden ist, werden die kcal daraus wiederhergestellt. Der Importbericht zählt sämtliche Korrekturen je Feld.

Neu erstellen (bestehende Vorschau bewusst ersetzen):

`python3 scripts/build_free_swiss_food_catalog.py --cache /tmp/errday-food-v2 --reuse-downloads --replace-preview --output Artifacts/FoodCatalogV2/catalog-v2.sqlite --report Artifacts/FoodCatalogV2/report.json`

Der Builder verweigert einen Neuaufbau, wenn die unabhängig abgefragte Open-Food-Facts-Zeilenanzahl unerwartet unter 10’000 fällt. Damit kann eine leere oder vorübergehend fehlerhafte Exportantwort den verifizierten Katalog nicht ersetzen. Eine bestehende verifizierte Momentaufnahme kann ohne erneuten Download atomar nach den aktuellen Qualitätsregeln bereinigt werden:

`python3 scripts/refine_food_catalog.py --database Artifacts/FoodCatalogV2/catalog-v2.sqlite --report Artifacts/FoodCatalogV2/report.json`

Ohne `--replace-preview` verweigert das Skript das Überschreiben. Als zusätzliche Sicherung akzeptiert es den Pfad des aktuellen App-Katalogs nicht. Es ändert weder App-Ressourcen noch eine entfernte Datenbank.

FoodRepo ist als spätere Zusatzquelle vorgesehen, aber nicht Teil dieses Builds: Der in der öffentlichen v3-Dokumentation angegebene Produkt-Endpunkt antwortete bei der Prüfung nicht mehr erfolgreich. Ein Import wird erst ergänzt, wenn ein funktionierender offizieller Export oder API-Zugang vorliegt. Händler-Websites werden nicht ungefragt gescrapt; für Coop- und Migros-Daten braucht es eine rechtlich und technisch belastbare Quelle oder Erlaubnis.

Der Katalog stammt aus **Open Food Facts**, nicht aus offiziellen Live-Sortimentssystemen von Coop, Migros oder Denner. Er enthält Produkte, die dort für die Schweiz und mindestens einen der drei Händler oder eine der unten genannten Eigenmarken erfasst sind. Ein Produkteintrag ist keine Aussage zur aktuellen Verfügbarkeit in einer Filiale.

- Quelle und Lizenz: https://world.openfoodfacts.org/data — Open Database License (ODbL) 1.0, https://opendatacommons.org/licenses/odbl/1-0/
- API-Vertrag: https://openfoodfacts.github.io/documentation/docs/Product-Opener/v2/search/get-search/
- Anbieterlimits: https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/index.md
- Lokale Daten: `App/Resources/food-catalog.json`. Enthält Importdatum, Umfang je Händler, Produktbarcode, Händlerzuordnung, Originalnährwerte und Quelldatum, soweit vorhanden. `allPagesFetched` ist ausdrücklich nur eine Aussage über die abgefragte Quelle, niemals über das vollständige Händlersortiment.

## Verhalten

Suche und Händlerfilter laufen ausschliesslich auf dem Gerät. Name, Marke und Barcode sind suchbar; Umlaute und Gross-/Kleinschreibung werden normalisiert. Der Import vereinigt gleiche Barcodes und danach Produkte mit gleichem normalisiertem Namen, gleicher Marke, Einheit und gleichem Nährwertprofil (auf 0.001 gerundet). Zusätzliche Barcodes bleiben als suchbare Aliase erhalten. Ein Produkt kann mehreren Händlern zugeordnet sein. Unterschiedliche Nährwertprofile werden nicht automatisch gleichgesetzt; die Suche fasst gleiche Namen als aufklappbare Varianten zusammen.

Nährwerte gelten pro 100 g/ml des verkauften Produkts. Die Einheit wird aus vorhandenen Quellenangaben übernommen; andernfalls ist g vorausgewählt und im Editor überprüfbar. Der Editor nimmt keine Dichteumrechnung vor. Bei Reis, Pasta etc. Rohgewicht und Zubereitungszustand auf der Verpackung beachten. Geschätzte Zusatznährwerte (`nutriments_estimated`) werden nicht übernommen. Fehlende Werte sind nicht 0. Produkte ohne einen einzigen gültigen Nährwert werden entfernt. Teilweise vorhandene Nährwerte bleiben erhalten und verlangen vor dem Speichern eine Ergänzung. Tatsächliche Nullwerte, etwa bei Wasser, bleiben gültig.

Mahlzeiten speichern einen eigenen Snapshot von Produkt, Menge, Einheit und persönlichen Korrekturen. Neue Katalogversionen verändern historische Einträge nicht. Korrekturen werden nicht an Open Food Facts gesendet. Vorhandene Mahlzeiten ohne diese Zusatzdaten bleiben lesbar.

## Vollständiger Quellenexport

Bereinigt am 6. Oktober 2026: **22’768 Produkte**, davon 10’185 mit Coop-, 11’201 mit Migros- und 1’475 mit Denner-Zuordnung. Überschneidungen sind möglich. 22’586 Produkte enthalten alle vier Basisnährwerte, 182 sind teilweise ausgefüllt. Vom bisherigen Bestand mit 26’063 Barcodes wurden 2’055 Datensätze ohne Nährwerte entfernt und 1’240 Doppeleinträge vereinigt. Insgesamt bleiben 24’008 Barcodes über Hauptnummern und Aliase suchbar.

Der vollständige [Mirabelle-CSV-Export](https://mirabelle.openfoodfacts.org/products) wird separat gegen eine COUNT-Abfrage derselben Quelle geprüft. Der neue Export umfasst 27’040 Kandidaten, davon 26’011 eindeutige verwendbare Produkte; 52 ergänzende Produkte bleiben aus früheren Abrufen erhalten.

## Händlerzuordnung

Der Schweiz-Ländereintrag ist für neue Produkte Pflicht. Gross-/Kleinschreibung und umgebende Leerzeichen werden normalisiert.

- **Händlernachweis:** ganze Einträge `Coop`, `Migros`, `Denner`; bei Coop zusätzlich `Coop Pronto`, `coop.ch` und `coop@home`. Biocoop wird nicht als Coop behandelt.
- **Markenzuordnung:** ohne Händlernachweis werden die Marken `Coop`, `Coop …`, `Naturaplan`, `Prix Garantie` sowie `Denner` zugeordnet. Coop bestätigt [Naturaplan als Eigenmarke](https://www.coop.ch/de/marken-inspiration/eigenmarken/naturaplan/c/m_1052) und [Prix Garantie](https://report.coop.ch/fr/temps-forts-de-l-annee-2023/). Denner führt [Produkte unter der eigenen Marke](https://www.denner.ch/de/entdecken/produkte-highlights/kaffeekapseln-denner).
- Markenbasierte Zuordnungen sind Schlussfolgerungen, kein Nachweis des aktuellen Verkaufs. Sie werden in Suchtreffern mit **(Marke)** und im Editor ausdrücklich erklärt. `retailerEvidence` hält `store` oder `brand` pro Händler fest.
- Vor der Nährwert-/Dublettenbereinigung: Coop 3’989 mit aktuellem oder früherem Händlernachweis, 7’563 über Marke. Denner: 1’453 mit Händlernachweis, 206 über Marke.
- Für Migros wurde keine neue Markenheuristik hinzugefügt.

Rohdatensätze mit Zuordnung: Coop 11’811, Migros 13’381, Denner 1’719. Wegen fehlendem Namen oder ungültigem Barcode wurden 283, 461 bzw. 60 ausgeschlossen; Überschneidungen sind möglich. Gleiche Barcodes werden zusammengeführt und vorhandene direkte Händlernachweise haben Vorrang vor Markenschlüssen. Bei gleichem Quelldatum bleiben reichhaltigere API-Angaben wie deutscher Name oder explizite Einheit erhalten.

Die Datenbanken von API und Mirabelle können unterschiedliche Stände haben. Deshalb weichen ihre Zählungen voneinander ab. „Vollständig“ bezeichnet hier ausschliesslich den vollständig heruntergeladenen Export mit den dokumentierten Filtern — nicht das gesamte aktuelle Sortiment von Coop, Migros und Denner. Quellenangaben können fehlen oder veraltet sein.

Der CSV-Export enthält keine explizite Nährwert-Basiseinheit. Bei eindeutig als ml/cl/dl/l angegebener Packungsmenge wird ml vorgeschlagen, sonst g. Der Editor verlangt weiterhin die Prüfung anhand der Verpackung. Bereits vorhandene explizite API-Einheiten bleiben bei gleicher/neuerer Revision erhalten.

## Aktualisieren

`python3 scripts/import_food_export.py --cache /tmp/errday-food-export-YYYY-MM-DD`

Das Skript lädt den vollständigen CSV-Datenstrom ohne Seitenlimit und prüft die Zeilenanzahl mit einer separaten Quellenabfrage. Abgeschnittene Downloads, abweichende Spalten oder fehlerhafte Antworten ersetzen den bisherigen Katalog nicht. Erst nach erfolgreicher Prüfung wird atomar geschrieben. URL, CSV-Prüfsumme, Kandidatenzahl und Ausschlüsse sind als `importAudit` beziehungsweise `reports` im Katalog dokumentiert.

`--reuse-verified-downloads` verwendet bereits heruntergeladene `products.csv` und `count.json` im angegebenen Cache. Für frische Daten ohne diesen Parameter ausführen. Historische Mahlzeiten und persönliche Korrekturen werden durch einen Katalogimport nicht verändert.

Das frühere `import_food_catalog.py` bleibt für begrenzte API-Abrufe erhalten. Der vollständige Export ist der bevorzugte Weg; ein kleinerer API-Import wird standardmässig abgelehnt, damit er den grossen Katalog nicht versehentlich ersetzt.

Kein Scraping der Händler-Websites, keine produktive Supabase-Migration und keine AI-Anfragen. Der native Kamerascanner liest Barcodes lokal; alternativ sind Barcodes eintippbar. Fotoerkennung und KI-Texterfassung sind noch nicht verbunden.

## Wiederholbarkeit

`clean_food_catalog.py` ist in beide Importwege eingebunden. Die Bereinigung ist idempotent. Ändert ein früherer Alias später sein Nährwertprofil, hat dessen eigener Datensatz Vorrang; kein Barcode darf zwei Produkten zugeordnet werden. Historische Mahlzeit-Snapshots bleiben unverändert.
