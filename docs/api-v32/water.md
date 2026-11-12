# Wasser (v3.2)

Alles wirkt automatisch in jedem Video; die Optionen sind nur zum Abschalten oder Feintunen.

## Oberfläche: Kräuselwellen, Himmel, Sonnenglitzern
- `water()` (Meer, Seen, Salzseen wie der Natronsee): pro Pixel kleine laufende Wellen (Summe aus 8 Wellen mit echter Dispersion, reine Funktion von t, feine Wellen blenden mit der Entfernung aus), scharfes Sonnenglitzern, Himmelsspiegelung nach Fresnel. Ruhiges Wasser (`waves` < 0,15, also Seen) bekommt feinere, kräftigere Kräusel als das offene Meer. Von unten gesehen (Kamera unter Wasser): helles Himmelsfenster direkt über einem, außen herum die Wasserfarbe.
  Optionen: `water({ ripples: 0.7 | false, rippleScale: 2.6, glint: 1 })` (Zahl = Stärke, `rippleScale` = längste Welle in m). Ganz aus: `CFG.ripples: false`.
- `waterSurfaceMat({ color, opacity: 0.22, reflect: 0.9, ripples: 1.8, scale: 0.9, glint: 1, under, rough })`: Material für eine flache Wasserfläche (Pool, Teich, Becken, Tank). Auf eine waagerechte Ebene legen (`PlaneGeometry`, −90° um x). Senkrecht von oben durchsichtig, flach von der Seite ein Spiegel, mit hellen Himmelsstreifen auf den Wellen. `m.userData.water` enthält die Uniforms (z. B. `ripples`, `opacity` animieren).

## Pool
`swimPool(p, x, z, { w, d, h, level, drain: [t0, t1], water, tiles, lanes, tileColor, bandColor, copingColor })` – wie bisher, aber mit echtem Wasser:
- Wasseroberfläche (`P.surface`) auf `P.level(t)` mit Kräuseln, Spiegelung und Glitzern; Spritzer und Gischt über dem Wasser bleiben davor.
- Alles unter Wasser (Boden, Wände, Figuren, Haie, Schwimmtiere) wird durch das Wasser gesehen: leicht türkis getönt und je nach Weg durchs Wasser (gerade runter, schräg, durch die Glaskante, von unter Wasser) tiefer blau. Lichtnetz (Kaustik) auf Boden, Wänden und allem im Wasser – nur unterhalb des Wasserspiegels. Helle, wackelnde Wasserlinie, wo die Oberfläche eine Wand oder einen Körper trifft. Nach dem Ablassen (`drain`) bleiben die Wände dunkel-nass.
- Becken gefliest (Fliesenmuster, dunkles Mosaikband oben an der Wand), Bahnlinie mit T-Enden und Abflussgitter auf dem Boden, Randsteine (4 cm über dem Wasser), Leiter mit Stufen und Bügeln über den Rand.
- `water: { color, deep: '#0B5E8E', tint: '#A6EEF6', dens: 0.16, opacity, ripples, scale }` (`dens` = wie schnell es mit der Tiefe blau wird) oder `water: false`. `tiles: false` = glatte Farben, `lanes: false` = keine Bahnlinie.
- Rückgabe zusätzlich `surface` (die Wasserfläche).
- Für andere Becken: `poolWater(g, { lo: [x, y, z], hi: [x, y, z], level: t => y, top, deep, tint, dens })` meldet einen quaderförmigen Wasserkörper im lokalen Raum der Gruppe `g` an (bis zu 4 im Video); dazu eine Fläche mit `waterSurfaceMat()`. Aus für ein Video: `CFG.poolWater: false`. Kaustik-Stärke: `CFG.caustics` (Standard 1).

## Unter Wasser automatisch
Steht im `SKY` irgendwo `'underwater'` oder `'deepsea'` und die Szene ruft `underwater()` nicht selbst auf, kommt es beim Bauen von allein dazu:
- Kaustik, Lichtstrahlen und Meeresschnee **um die Kamera herum** (immer dort, wo die Einstellung ist), tiefer = dunkler. Bei `'deepsea'` keine Lichtstrahlen und nur schwache Kaustik.
- Tiefen-Verlauf statt einfarbigem Bild: am Horizont die Nebelfarbe, nach oben heller (Oberfläche, helles Fenster), nach unten dunkel.
- Ohne `ground()`: sandiger Meeresgrund mit Dünen, Rippeln und Steinen knapp unter dem tiefsten Ding der Szene bzw. der tiefsten Kamera.
- Alles folgt dem Himmel: Einstellungen über Wasser (`SKY` wechselt auf `'day'`) bleiben trocken.
- Aus: `CFG.autoUnderwater: false`. Ein eigener `underwater()`-Aufruf ersetzt die Automatik (nie doppelt).
- `underwater()` selbst hat jetzt auch Meeresschnee und den Tiefen-Verlauf (`snow: false`, `gradient: false` = aus) und optional `depthDark: 0.4` (tiefer = dunkler).
- Einzeln nutzbar: `seabed({ y, color, size, at, rocks })`, `marineSnow({ n, box, size, color, opacity, k })`, `depthGradient({ k, surface })`, `lightShafts({ …, follow: true, k: t => 0 … 1 })` (Strahlen wiederholen sich um die Kamera, `k` blendet ein und aus).

Test: `tests/v32-water.*` (Pool mit Figur, Hai und Ablassen, roter Salzsee, Unterwasser-Himmel ohne `underwater()`).
