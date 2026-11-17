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
| Ziehen mit Band | Bandlinie in L-Form, Ecken werden automatisch Kurven; über vorhandene Bänder ziehen dreht sie kostenlos. Neue Bänder verbinden sich mit angrenzenden Sackgassen und Maschinen (Einstellung „Bänder automatisch verbinden“) |
| `F` · Umschalter in der Werkzeugzeile | Wegsuche statt L-Form: das Band findet beim Ziehen selbst den Weg um Hindernisse (mit Tunneln, sobald erforscht); Vorschau als Geisterbänder mit Kosten, rot wenn kein Weg |
| `B` | Blaupause: Rechteck ziehen kopiert Gebäude (mit Richtung, Rezept, Filter, Mk); einfügen per Klick (Touch: tippen, dann ✓), `R` dreht, Speichern in die Bibliothek, Code teilen/einfügen |
| `P` · `I` | Strom-Ansicht (Reichweiten, Netze, Versorgung in %, Kabel) · Engpässe (Symbole über Gebäuden + Liste, Klick fliegt hin) |
| `K` | Fotomodus: Oberfläche aus, freie Kamera, Tilt-Shift/Fokus/Unschärfe/Vignette/Kamerawinkel, Filter, PNG in doppelter Auflösung; `Esc` beendet |
| `R` | Vorschau drehen (ohne Werkzeug: ausgewähltes Gebäude drehen) |
| `X` · `Entf` | Abriss-Modus (Klick oder Ziehen über Gebäude, volle Rückerstattung); `Entf` reißt das ausgewählte Gebäude ab |
| `C` · Mittelklick | Pipette: Typ und Drehung des Gebäudes unter dem Zeiger übernehmen |
| `Strg`/`Cmd`+`Z` | Rückgängig (20 Bauaktionen) |
| Rechtsklick · `Esc` | Werkzeug abbrechen (auch Drohnen-Verknüpfen), Auswahl/Panel schließen |
| Linksziehen · Rechtsziehen · Mausrad | schieben · drehen (rastet auf 90° ein) · zoomen zum Zeiger (im Band-/Abrissmodus gehört Linksziehen dem Bauen) |
| `W` `A` `S` `D` · `Q`/`E` · `+`/`−` | schieben · drehen · zoomen |
| Touch | ein Finger schieben (im Band-/Abrissmodus: ziehen), zwei Finger zoomen und drehen, tippen = bauen/auswählen |
| Gerald anklicken | Überraschungskiste (sitzt er auf einem Band, steht er wieder auf) |

## Spielinhalt
- **20 Gebäude** in fünf Gruppen: Logistik (Band, Tunnelband, Verteiler, Sortierer, Lager, Drohnenhafen), Förderung (Bohrer nur auf Vorkommen; 4 Bohrer im 2×2-Quadrat auf einem Rohstoff verschmelzen zum Großbohrer mit einem Ausgang und +25 %),
  Verarbeitung (Schmelzofen, Presse, Drahtzieher, Raffinerie, Montage), Strom (Kraftwerk, Solarfeld, Strommast, Heizer),
  Spezial (Verkaufsstation, Labor mit Dr. Steve, Experimentiertisch, Weltwunder ab der zweiten Fabrik). Die Bauleiste zeigt nur Freigeschaltetes und
  als Vorschau, was die nächste mögliche Forschung bringt.
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
- **Ausbau 2:** Strom (Kraftwerk, Solarfeld, Strommast, Heizer; Kabel zwischen den Knoten eines Netzes, roter Blitz bei „kein Strom“),
  Mk II/III im Info-Panel (Kosten, Grund, Strombedarf), Diagnose mit Tipp für jedes Gebäude, Drohnenhäfen (Info-Panel → „Mit Hafen verbinden“ → Ziel anklicken),
  Weltwunder ab der zweiten Fabrik (Panel mit 5 Stufen, Bedarf, Boni, „Bauplatz setzen“, Startanimation), Sandsturm/Frost je Welt.
  Zusatzsysteme (`js/meta.js`): Glücksrad (einmal am Tag, animiertes Rad mit Ton), Tagesserie (7-Tage-Kalender, Check-in beim Start), Ereignisse mit Banner und Timer
  (Goldader, Meteor, Beben, VIP-Auftrag mit Fortschritt, Marktboom), Durchbruch-Karte, Album (4 Karten je Teil, Seiten nach Stufe), Ziel-Leiste oben (Klick führt hin),
  Wochen-Herausforderung (eigener Speicherplatz, Timer, Ende-Bildschirm, lokale Bestenliste, Ergebnis-Code + Code eines Freundes prüfen).
  Zeitraffer-Export: die Fabrik baut sich aus dem Verlauf neu auf, Kamera kreist, Titelkarte mit Kennzahlen, 9:16 (1080 × 1920) als MP4 (sonst WebM).
  Rechte Leiste nur noch mit den häufigsten Panels, alles andere im Menü (☰) nach Gruppen; Hinweise nach der Anleitung für Strom, Ausbau, Blaupausen, Drohnen, Wunder.
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
| `js/ui.js` · `js/ui/meta.js` · `js/ui/tools.js` · `js/ui/common.js` | Startmenü, HUD, Bauleiste, Werkzeugzeile, Info-Panel, alle Panels, Anleitung, Sprechblasen, Toasts, Dialoge, Kisten- und Entdeckungskarten · Glücksrad, Serie, Ereignis-Banner, Ziel-Leiste, Album, Wunder, Herausforderung, Hinweise · Menü, Blaupausen, Überlagerungs-Karte, Fotomodus, Zeitraffer-Fenster · Helfer, Panel-Liste |
| `js/meta.js` · `js/media.js` | Zusatzsysteme ohne DOM · Zeitraffer (Nachbau aus `history()`, `stage.renderFrame`, MediaRecorder) und Downloads |
| `js/main.js` · `js/blueprint.js` · `index.html` | Verdrahtung, Zeit (Akkumulator + `alpha`), Eingabe (Wegsuche, Blaupausen, Verknüpfen, Fotomodus), Spielstände, `meta.attach` · L-Bandwege, Wegsuche, Blaupausen, Menü-Fabrik, große Testfabrik · Seite mit allem CSS |
| `tools/` | `rules.mjs` (Logik), `models.mjs` + `models-demo.html` (Modelle), `play.mjs` (ganzes Spiel im Browser) |

Testhaken im Browser: `window.__fabrik = { sim, view, ui, stage, rig, sound, THREE, app, bp, storage, meta, media, today }` (`sim` wird bei Neustart/Laden neu gesetzt).
Speicher (localStorage, Präfix `fabrik.`): `save.auto|backup|1–3` Spielstände, `save.chal` Wochen-Herausforderung, `bp.<id>` Blaupausen-Bibliothek (bleibt über Prestige),
`chal.<Woche>` lokale Bestenliste, `set.*` Einstellungen (u. a. `autoJoin`, `beltMode`, `hints`).

## Prüfen (vor jedem Push)
```bash
node fabrik/tools/rules.mjs --quick              # RULES OK   (Logik, Speichern/Laden, alte Stände, Sprachschlüssel en = de)
node fabrik/tools/models.mjs <ordner>            # MODELS OK  (alle Modelle, Drehungen, Ausgänge wie die Sim)
node fabrik/tools/meta-rules.mjs                 # META OK    (Glücksrad, Serie, Ereignisse, Durchbrüche, Album, Ziele, Herausforderung)
node fabrik/tools/play.mjs <ordner> --shots      # PLAY OK    (Menü, Sprache, echte Klicks: Bohrer + Band ziehen → Geld, Info-Panel/Rezept,
                                                 #             Forschung, alle Panels, Kiste, Abriss + Undo, Pipette, Gerald, Neuladen, Offline-Meldung,
                                                 #             auto-join, Wegsuche, Blaupause + Code, Upgrade, Strom, Drohnen, Engpässe, Glücksrad, Serie,
                                                 #             Ereignisse, Album, Ziele, Wunder, Herausforderung, Zeitraffer > 100 KB, Fotomodus-PNG,
                                                 #             Deutsch ohne englische Reste, Leck-Test, große Fabrik mit Strom/Drohnen ≥ 30 fps, Handy 390 × 844)
```
Spielstände bleiben über Updates ladbar: gespeichert wird nur über Ids und Namen (`SAVE_VERSION` in `js/sim.js`), Unbekanntes wird übersprungen.
