# Cogtopia – die gemütliche Fabrik

Fabrik-Aufbauspiel im Browser (Three.js 0.170, Low Poly, alles prozedural, keine Build-Tools). Bohrer fördern Erz, Bänder tragen es zu Maschinen,
Maschinen machen daraus wertvollere Teile, Verkaufsstationen bringen Münzen. Mit dem Geld kommen Forschung, neues Land, geheime Rezepte und
am Ende eine neue Fabrik in einer neuen Welt (Prestige). Die Fabrik ist nie fertig. Sprache wählbar: Englisch (Standard) und Deutsch.

**Spielen:** https://whatifgames.netlify.app/fabrik/ · https://leon1304.github.io/what-if-engine/fabrik/ (Maus, Trackpad oder Touch).
Lokal: `cd fabrik && python3 -m http.server 8000`, dann http://localhost:8000. Konzept und Mechaniken: `DESIGN.md`.

## Steuerung
| Eingabe | Aktion |
|---|---|
| Bauleiste · `1`–`9` | Gebäude wählen (`1` Band, `2` Bohrer, `3` Ofen, `4` Verkauf, `5` Presse, `6` Drahtzieher, `7` Montage, `8` Labor, `9` Verteiler); gesperrte zeigen im Tooltip die nötige Forschung |
| Klick · Tippen | bauen (Vorschau grün/rot mit Grund am Zeiger, grüner Pfeil = Ausgang); ohne Werkzeug: Gebäude auswählen → Info-Panel |
| Ziehen mit Band | Bandlinie in L-Form, Ecken werden automatisch Kurven; über vorhandene Bänder ziehen dreht sie kostenlos |
| `R` | Vorschau drehen (ohne Werkzeug: ausgewähltes Gebäude drehen) |
| `X` · `Entf` | Abriss-Modus (Klick oder Ziehen über Gebäude, volle Rückerstattung); `Entf` reißt das ausgewählte Gebäude ab |
| `C` · Mittelklick | Pipette: Typ und Drehung des Gebäudes unter dem Zeiger übernehmen |
| `Strg`/`Cmd`+`Z` | Rückgängig (20 Bauaktionen) |
| Rechtsklick · `Esc` | Werkzeug abbrechen, Auswahl/Panel schließen |
| Linksziehen · Rechtsziehen · Mausrad | schieben · drehen (rastet auf 90° ein) · zoomen zum Zeiger (im Band-/Abrissmodus gehört Linksziehen dem Bauen) |
| `W` `A` `S` `D` · `Q`/`E` · `+`/`−` | schieben · drehen · zoomen |
| Touch | ein Finger schieben (im Band-/Abrissmodus: ziehen), zwei Finger zoomen und drehen, tippen = bauen/auswählen |
| Gerald anklicken | Überraschungskiste (sitzt er auf einem Band, steht er wieder auf) |

## Spielinhalt
- **14 Gebäude** in vier Gruppen: Logistik (Band, Tunnelband, Verteiler, Sortierer, Lager), Förderung (Bohrer nur auf Vorkommen),
  Verarbeitung (Schmelzofen, Presse, Drahtzieher, Raffinerie, Montage), Spezial (Verkaufsstation, Labor mit Dr. Steve, Experimentiertisch).
- **29 Teile** von Stein bis Rakete; Rezepte automatisch oder fest im Info-Panel, Sortierer mit Filter (auch „Goldteile“).
- **Besonderes:** Goldteile (×25, bleiben golden durch die ganze Kette), Takt an der Verkaufsstation (bis ×2), Maschinen-Sterne ★1–★5,
  Experimentiertisch mit 12 geheimen Rezepten und Rezeptbuch (Tipps von Dr. Steve), Gerald der Praktikant, Kisten mit Spannung,
  Aufträge (3 + Tagesauftrag), 7 × 7 Grundstücke mit Preis-Schild (manchmal mit Ruine und Kiste), 36 Forschungen, 17 Patente,
  4 Welten (Wiese, Wüste, Eis, Mond), 28 Erfolge mit Bandfarben und Titeln, Offline-Einnahmen („Während du weg warst …“).
- **Belohnungsgefühl:** Münzen und Beträge fliegen von der Verkaufsstation, Gold-Jackpot mit Funkeln und Fanfare, Entdeckungskarte mit Konfetti,
  Stern beim Level-up, Takt-Ring, Erfolgs-Toasts, Kisten öffnen sich mit Wackeln, Deckel und Strahlen.
- **Anleitung** in 8 Schritten über `help()`: Hinweisblase mit Schritt-Zähler, pulsierender Knopf oder Pfeil in der Welt, überspringbar.
- **Oberfläche:** Startmenü mit lebendiger Fabrik und kreisender Kamera, Sprache live umschaltbar (Flaggenknopf, Einstellungen),
  HUD (Münzen mit Zähl-Animation, Forschungspunkte, Einnahmen/s, Boosts mit Restzeit, Kisten-Zähler), Panels als Karten bzw. auf dem Handy als Bottom-Sheets,
  eigene Dialoge (keine nativen `alert`/`confirm`/`prompt`).
- **Speichern:** Autosave alle 30 s und beim Verlassen/Verstecken des Tabs, 3 Speicherplätze, Export/Import als `.cogtopia.json`.
  Hintergrund-Tab pausiert; beim Zurückkommen werden höchstens 4 s nachgerechnet, längere Pausen über `offline()`.

## Aufbau
| Datei | Inhalt |
|---|---|
| `js/data.js` · `js/sim.js` · `js/rng.js` | reine Spieldaten · komplette Logik `Factory` ohne DOM/Three (20 Ticks/s, deterministisch, `SAVE_VERSION`, Migration) · gesäter Zufall |
| `js/i18n.js` · `js/lang/en.js` · `js/lang/de.js` | `t()`/`name()`/`desc()`/`fmtNum`, Live-Umschaltung (`onLang`) · englische und deutsche Texte (gleiche Schlüssel) |
| `js/storage.js` | Speicherplätze in `localStorage` (Präfix `fabrik.`), Autosave, Export/Import, Einstellungen |
| `js/kit.js` · `js/materials.js` · `js/models/*.js` | Low-Poly-Baukasten, Materialien (Band-Pfeile, Gold, Hitze) · Gebäude + `BeltInstancer`, Teile (`ItemRenderer`), Gelände, Gerald und Dr. Steve, Effekte |
| `js/stage.js` · `js/camera.js` · `js/audio.js` | Renderer, Himmel je Welt, Schatten, Post-FX, Qualitätsstufen · Kamera (schieben/drehen/zoomen, Touch, `panGate`) · prozeduraler Ton und Musik |
| `js/view.js` | Sim → Szene: Gebäude nur bei `rev`-Änderung diffen, Bänder instanziert, Teile pro Bild interpoliert, Grundstücke mit Preis-Schild, Gerald/Dr. Steve, Ereignis-Effekte + Töne, Geist-Vorschau, Auswahlrahmen, Treffer, Icons |
| `js/ui.js` | Startmenü, HUD, Bauleiste, Werkzeugzeile, Info-Panel, alle Panels, Anleitung, Sprechblasen, Toasts, Dialoge, Kisten- und Entdeckungskarten |
| `js/main.js` · `js/blueprint.js` · `index.html` | Verdrahtung, Zeit (Akkumulator + `alpha`), Eingabe, Spielstände · L-Bandwege, Menü-Fabrik, große Testfabrik · Seite mit allem CSS |
| `tools/` | `rules.mjs` (Logik), `models.mjs` + `models-demo.html` (Modelle), `play.mjs` (ganzes Spiel im Browser) |

Testhaken im Browser: `window.__fabrik = { sim, view, ui, stage, rig, sound, THREE, app, bp, storage }` (`sim` wird bei Neustart/Laden neu gesetzt).

## Prüfen (vor jedem Push)
```bash
node fabrik/tools/rules.mjs --quick              # RULES OK   (Logik, Speichern/Laden, alte Stände, Sprachschlüssel en = de)
node fabrik/tools/models.mjs <ordner>            # MODELS OK  (alle Modelle, Drehungen, Ausgänge wie die Sim)
node fabrik/tools/play.mjs <ordner> --shots      # PLAY OK    (Menü, Sprache, echte Klicks: Bohrer + Band ziehen → Geld, Info-Panel/Rezept,
                                                 #             Forschung, alle Panels, Kiste, Abriss + Undo, Pipette, Gerald, Neuladen, Offline-Meldung,
                                                 #             große Fabrik ≥ 30 fps, Handy 390 × 844 ohne horizontales Scrollen)
```
Spielstände bleiben über Updates ladbar: gespeichert wird nur über Ids und Namen (`SAVE_VERSION` in `js/sim.js`), Unbekanntes wird übersprungen.
