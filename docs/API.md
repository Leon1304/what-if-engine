# what-if-engine — API-Referenz

Vollständige Referenz der Szenen-API von `template.html` (Engine v2.16). Die SKILL.md des /whatif-Skills enthält nur die Regeln
und einen Kurzüberblick; hier stehen alle Funktionen mit Optionen. Abschnitte gezielt lesen, z. B.
`sed -n '/^## Tiere/,/^## /p' .engine/docs/API.md` oder `grep -n -A6 'ride(' .engine/docs/API.md`.

Konventionen: 1 Einheit = 1 m, y nach oben, Modelle schauen nach +z, heading = `atan2(dx, dz)`. Zeiten sind Szenenzeit in s.
Jedes Bild ist eine reine Funktion von t: alles Bewegte über `tick`, `late`, `walk`, `fly`, `sail` … nie mit Zustand zwischen Frames.

# Welt und Kamera


## Maße

1 Einheit = 1 m, y zeigt nach oben, Boden bei y = 0. Außerhalb des `flat`-Radius gibt es Hügel; Höhe über `groundH(x, z)`. Spielfläche ca. ±30 m (Stadt ±40 m). `CFG.area` ist der Schattenbereich und deckt die Spielfläche ab.

## Ausrichtung

Alle Modelle schauen nach +z; heading = `atan2(dx, dz)`. Licht kommt aus `CFG.sunAz`, 0 = von +z. Die Kamera steht meist auf der +z/+x-Seite, damit die beleuchteten Seiten zu sehen sind.

## Bildausschnitt 9:16

vertikale FOV 45–55°, horizontal sieht man nur ca. 0,55 davon. Totalen aus 40–60 m Abstand, Nahaufnahmen aus 4–8 m. Figuren sind 1,85 m groß. Die Kamera nie in Felder, Bäume oder Wände stellen.

## `CAM` mit `shot()` schreiben

(kurz, spart Tokens): `...shot(art, t, dauer, ziel, {az, dist, h, fov, fy, dof, move, tr})` liefert Start-Key (Schnitt + Übergang) und End-Key (Bewegung).
- `art`: `wide` (48 m, Orbit) · `mid` (13 m) · `close` (4,2 m, fov 34, Motiv bei 36 % von oben, Tiefenunschärfe) · `macro` (1,7 m, für Objekte).
- `ziel`: `[x,y,z]` (Blickpunkt) oder ein Name aus `track('name', rig|obj, dy)` in der Szene: Dann fährt die Kamera mit, auch bei laufenden Figuren. `dy` = Blickhöhe über dem Objekt (Kopf 1,55).
- `az`: Blickwinkel in Grad, 0 = Kamera auf +z-Seite des Ziels. Für Gesichter `az` = Blickrichtung der Figur (heading in Grad), sonst sieht man den Hinterkopf.
- `move`: push (Standard nah) · pull · orbit (Standard Totale, `turn`) · crane (`rise`) · static.
- **First Person (v2.12):** `...shot('pov', t, dauer, 'trackName', {look, pitch, free, fov})` zeigt durch die Augen eines getrackten Rigs (Figur, Tier, Vogel, Hai): eigener Kopf ausgeblendet, Hände und Waffe im Bild, Kopfwippen beim Gehen. `look: 'trackName' | [x,y,z]` hält ein Ziel im Blick, `free: true` folgt der Kopfdrehung; zielt die Figur mit einer Schusswaffe, gleitet das Bild hinter Kimme und Korn. **Regel:** nur, wenn es die Szene stärker macht (Zielen, Sturz in eine Falle, Flucht durch den Flur, Blick von Zombie, Hai oder Löwe auf die Beute): 1–2 POV-Shots von 1,5–3 s pro Video, nie im Hook-Bild, danach zurück in eine Außenansicht.
- Bei Tieren, Fahrzeugen, Flugzeugen und Schiffen als Ziel im `shot` immer `dy` setzen (Standard 1,55 = Kopfhöhe eines Menschen).

## `CAM`-Keys von Hand

`{ t, p, l, fov, e, cut, tr, td, dir, around, follow, off, dy, fy, dof }`. `p`/`l` dürfen Funktionen `t => [x,y,z]` sein. Zwei Keys mit gleichem t, der zweite mit `cut: true`, ergeben einen Schnitt; `tr` wählt den Übergang (whip · zoom · dip · blur · cut), `td` dessen Dauer (0,34 s), `dir` die Whip-Richtung ±1. `e` ist das Easing in diesen Key (`inOut` · `out` · `lin` · `in`). `around: [x, z]` fährt einen Bogen um diesen Punkt. `fy` (0 = oben) setzt das Motiv auf diese Bildhöhe. **Tiefenschärfe ist echt (nach Entfernung):** Nahaufnahmen bekommen automatisch einen weichen Hintergrund; `dof` 0–1 stellt die Stärke ein (0 = aus), `focus: Meter | [x,y,z] | 'trackName'` legt die Schärfe fest. Zwei Keys mit verschiedenem `focus` ergeben eine Schärfeverlagerung (Rack Focus), z. B. vom Gesicht auf die Gefahr im Hintergrund: pro Video höchstens einmal, an einem Schlüsselmoment.

## Nahaufnahmen

Figuren haben ein Cartoon-Gesicht (runde Augen mit Iris, Pupille und Glanzpunkten, Ober- und Unterlider, zweiteilige Brauen, Mund mit Lippen, Zähnen und Zunge, Wangen, Nase, Ohren): `figure({expr})` mit den Ausdrücken unter **Gesichter**, auch als `t => …`; panic/cheer/Zombies setzen das automatisch. In Nahaufnahmen (`shot('close' | 'macro', …)`, Figur groß im Bild) reagiert das Gesicht von selbst auf die Szene, siehe **Gesichter**. Gesichter nachts mit einem kleinen `glow` (dist 6–8, `flicker: 0`) aufhellen. Massen haben Augen und Mund, Nahaufnahmen auf die vorderste Reihe funktionieren also auch. Gerald bekommt im Twist eine `shot('macro', …)`-Nahaufnahme (`track('gerald', g)`, `dy: 0.4`).

## `SHAKES` und `FLASHES`

`SHAKES` mit `{ t, amp 0.2–0.6, dur }` bei Einschlägen. `FLASHES` mit `{ t, dur 0.2–0.4, a 0.25–0.6, color }` bei Schnitten und Explosionen.

## `SKY`

`[[t, preset], …]` blendet zwischen Presets: day · golden · dusk · night · dawn · storm · apocalypse · space · underwater · deepsea.

## Nacht

Hauptmotive anleuchten mit `glow`, `lamp`, Fenstern über `lit` und hellen, satten Farben. Sonst säuft alles ab.

## Bild (läuft automatisch)
 **Himmelslicht (v3.0):** Das Umgebungslicht (weiches Fülllicht und Spiegelungen) ist der aktuelle Himmel – Zenit, Horizont, Boden und Sonnenschein –, statt eines grauen Studios; es folgt jedem `SKY`-Wechsel. `CFG.env: false` = aus, `true` / `'studio'` = altes Studio, Zahl = Stärke.
Kontaktschatten (`CFG.ao`, Standard 0.55), Glühen auf Feuer, Explosionen, Fenstern, Neon und Zombie-Augen (`CFG.bloom` 0.45, `bloomThreshold` 1.2; nur der Überschuss glüht, angestrahlte Flächen überstrahlen nicht), Sonnenschatten passend zum Bildausschnitt (in Nahaufnahmen scharf, `CFG.shadowFit`), echte Bewegungsunschärfe auf schnellen Frames (`CFG.motionBlur: 'auto'`: Schüttler, schnelle Kamera, Rennende nah an der Linse; `MBLUR = [[t0, t1]]` erzwingt sie; nur im Export, nicht in der Vorschau), abgerundete, weich schattierte Figuren (`CFG.smooth`). Umgebungslicht `CFG.env: true` nur bei „beste qualität“.


# Prüfung (v3.0)

`node render.mjs page.html --audit` (läuft auch mit `--shots` und im Render-Workflow) meldet neben `MOTION:`/`HITBOX:`/`GORE:` jetzt `QA:`: Massenmitglieder ineinander oder in Props, Füße im Boden beim Stehen, Glieder, die auf Klötze zurückfallen mussten. `--video` prüft die fertigen Frames auf Streifen durchs Bild (`LINES:`, qa_lines.py). **Render-Stücke (v3.1):** Auf GitHub rendert jeder der 12 (lange Videos bis 20) Shards verschränkte Stücke von 10–30 Bildern (Stück c → Shard c % n), damit schwere Momente sich verteilen; Größe aus `whatif.plan(n, fps)` → `{ n, chunk }`. Seit v3.2 prüft der Encode-Job mit `--seams n` jede Stückgrenze der fertigen Bilder (qa_seams.py: auffälliger Bildwechsel genau an der Grenze → Bild noch einmal durchgespielt rendern und vergleichen) und meldet echte Sprünge als `SEAM:`. Ursache ist immer Zustand zwischen Bildern: aus t berechnen. Notschalter: `CFG.shard: 'block'` rendert wieder einen zusammenhängenden Block pro Shard (wie vor v3.1, langsamer). Der Render-Workflow schreibt alle Warnungen in die Zusammenfassung und hängt `<slug>-qa.txt` an das Release. `--strict` bricht bei jeder Warnung ab (Exit 3). **Regel:** Vor dem Rendern `--audit` laufen lassen und jede `QA:`-/`HITBOX:`-/`MOTION:`-Zeile beheben.

# Engine-API (für die Szene)


## Primitive

(Unterkante bei y; `ball` ist zentriert): `box(p,w,h,d,farbe,x,y,z,o)`, `cyl(p,rOben,rUnten,h,…)`, `cone(p,r,h,…)`, `ball(p,r,…)`, `prism(p,w,h,d,…)` (Satteldach, First entlang x), `grp(p,x,y,z,ry)`. Optionen `o`: `rx ry rz cast mat seg detail`.

## Material

`mat(hex,{rough,metal,em,ei,opacity,basic,own})`. `own: true` = eigenes Material, z. B. um `emissiveIntensity` zu animieren.

## Takt

`world` ist die Wurzel der Szene. Alles Bewegte läuft über `tick(t => …)` und wird nur aus t berechnet, ohne Zustand zwischen Frames. Mit `SLOWMO` bekommt die Szene die Szenenzeit (`ST(t)`); Captions, Kamera und Sound laufen in Echtzeit, `explode` rechnet selbst um (`VT`). Helfer: `span(t,t0,dauer,ease)` → 0..1, `bump(t,t0,d)`, `EASE`, `lerp`, `clamp`, `rnd()`/`rr(a,b)`/`pick(arr)` (geseedet), `hash(n)`, `noise1(x)`, `clockText`.

## Gelände

`ground({color, flat, hills, coast, depth, sand, dirt})`. Mit `coast: 38` endet das Land bei z = 38 mit Sandstrand und fällt dahinter ins Meer (Richtung +z); dazu `water()`. Der Boden bekommt automatisch weiche Farbflecken (`dirt: false` ohne Erdflecken).

## Natur (Pflicht in jeder Szene im Freien)

Als letzte Zeile der Szene `biome(kind, {density, trees, keep: [[x, z, r]], area})`, passend zu Serie und Ort: `farm` (Zombie-Farm) · `forest` · `beach` (mit `ground({coast})`, Palmen am Strand, Muscheln, Strandgras) · `desert` · `snow` · `swamp` · `city` (GTA 6, NPC-Life: fast nichts) · `moon` (mit Kratern) · `reef` (unter Wasser). Es streut Bäume im Gürtel um die Spielfläche, Felsgruppen, Büsche, Grasbüschel, Blumen, Kiesel und Ähnliches und hält Gebäude, Zäune, Felder, Straßen, `walk`-Wege, `horde`-Bahnen und jede Kamera-Sichtlinie frei. Es nutzt einen eigenen Zufallsgenerator, bestehende Layouts bleiben also gleich. Jede Folge einer Serie bekommt dasselbe Biom. Einzeln: `tree(p,x,z,{kind:'round'|'pine'|'snowpine'|'birch'|'dead'|'palm', size})`, `rock(p,x,z,s,color)` (Felsgruppe), `bush(p,x,z,{kind:'fern'|'dry', flowers})`, `stump(p,x,z,s)`, `log(p,x,z,s)`, `cactus`. Bäume, Gras und Felder wiegen sich im Wind (`CFG.wind` 0–2, bei Sturm automatisch stärker).

## Props

- `house(p,x,z,{w,d,h,wall,roof,lit,ry,porch,chimney,smoke,backWindows,shutters,flowers})` → `{g, winMat, door, windows}`; `smoke: true | t0` lässt den Schornstein rauchen, `backWindows: false` spart die Rückfenster
- `barn(…)`, `silo(…)` → `{g, top}`, `windmill(…)` → `{rotor}`
- `fence(p,[[x,z],…],{h,color,kind})` → `spans[]`; `kind`: `rail` (Standard, Pfosten mit Kappe) · `picket` (Lattenzaun mit Spitzen) · `boards` (Bretterzaun) · `wire` (Weidezaun mit Stacheldraht); einzelne Felder mit `knock(span.g, t)` umwerfen
- `wall(p, [[x,z],[x,z],…], { h: 2.6, thick: 0.35, kind: 'concrete' | 'brick' | 'stone', color, posts })` → `{ g, line, h }` (v3.3): freistehende Mauer mit Abdeckung und Pfeilern etwa alle 3 m, Oberfläche passend zur Art, statisch und fest (Hitbox). Kletternde Massen: `horde({ wait: { line: W.line, climb: { h: W.h } } })`.
- `tree(p,x,z,{kind:'round'|'pine'|'dead',size})`, `rock(p,x,z,s)`
- `field(p,x,z,w,d,{crop:'wheat'|'corn'|'cabbage'})`, `haybale(p,x,z,ry)`
- `vehicle(p,x,z,{kind:'car'|'tractor'|'truck',color,ry})` → `{g, wheels}`
- `lamp(p,x,z,{intensity, flicker})` – das Licht flackert leicht (`flicker: 0` = ruhig, Standard 0.05)
- Stoff, der im Wind weht (bei Sturm stärker): `flagpole(p,x,z,{h, colors})`, `laundry(p,[[x,z],[x,z]])` (Wäscheleine), `cloth(p,{w, h, color, stripes, x, y, z, ry, pin:'left'|'top'})` (Banner, Vorhang)

## Innenräume (v2.10)

`interior(p,x,z,{kind, w, d, h, ry, door: 'left'|'right'|false, window: 'back'|'high'|false, night, lamps, items})` mit kind = living · kitchen · bedroom · bathroom · office · kids · cellar · garage · bunker · classroom · shop → `R` mit `R.at(name)` (Ankerpunkt eines Möbels), `R.seat(name, i)` (für `sit`), `R.doors` (für `openDoor`), `R.tv`, `R.fridge`, `R.bed`, `R.lamps`. Komplett eingerichtet (Sofa, Teppich, Fernseher, Regale, Pflanzen, Küche mit Herd und Kühlschrank, Bad, Werkbank …); einzelne Stücke mit `furnish(p, name, x, z, ry)`. Die Front (+z) ist offen, die Kamera steht davor.

## Stadt

- `city({nx, nz, block, street, at:[x,z], hmin, hmax, lit})` baut Blocks mit Hochhäusern (in der Mitte höher) und Straßen → `{loops, size}`.
- `traffic(loops, {per, speed, until, colors})` lässt Autos auf den Blockrunden fahren, ab `until` stehen sie.
- Einzeln: `tower(p,x,z,{w,d,h,color,lit,antenna,style})`, `road(p,[[x,z],…],{w, edges})`. `lit`: 0 = Tag, 1 = Nacht (ca. 60 % der Fenster leuchten).
- Fassaden mit Tiefe, Stil je Gebäude automatisch oder per `style`: `glass` (Fensterbänder, Gesimse, Lisenen) · `brick` (zurückgesetzte Fenster mit Sims und Sturz, Feuertreppen, Kranzgesims) · `deco` (Pilaster, Gurtgesimse, gestufte Krone, Turmspitze). Dazu im Erdgeschoss Schaufenster, Markisen und Eingang, auf dem Dach Geräte und Wassertanks.
- `city()` setzt automatisch Gehwegplatten, Bordsteine, Zebrastreifen, Gullydeckel, Straßenlaternen (leuchten nachts), Bäume, Blumenkübel, Bänke, Mülleimer, Hydranten, Bushaltestellen und Ampeln (`props: false` = nackt). Einzeln: `streetlight(p,x,z,ry)`, `planter(p,x,z,ry,{flowers})`, `busstop`, `bench`, `trashcan`, `hydrant`, `trafficLight(p,x,z,{ry, state})`.

## Fahrzeuge

`vehicle(p,x,z,{kind, color, ry})` mit car · sports · taxi · police (blinkender Lichtbalken) · van · pickup · bus · truck · tractor, alle mit Scheinwerfern, Rücklichtern, Stoßstangen, Spiegeln und Radkappen. `traffic(loops, {kinds})` mischt die Typen. Boote und Schiffe: siehe **Schiffe** unter Meer und Küste.

## Luftfahrt (v2.15)

`aircraft({kind, x, y, z, ry, scale, paint, gear})` in echter Größe: airliner (38 m) · jumbo · bizjet · cargo (Heckrampe) · fighter (Propeller-Jäger, Flügel-MGs) · bomber (Viermot mit Türmen und Bombenschacht) · biplane · cessna · seaplane · glider · stealth. Propeller drehen, das Fahrwerk klappt in Bodennähe von selbst aus und oben ein (`A.gearUp(t)` / `A.gearDown(t)` erzwingt). Bewegung: `fly(A, [[x,y,z],…], {t0, speed, loop, bank})` (Nase entlang der Bahn, Kurvenlage). Aktionen: `A.drop(t, {n, interval, horde})` (Schacht öffnet, Bomben fallen), `A.rampOpen(t)`, `paradrop(A, t, n)` (Fallschirmspringer), `contrail(A, t0, t1, {tips, smoke})`, dazu `strafe`, `missile` und `shotDown` aus **Kampf**. `jet(p, …)` ist der moderne Kampfjet, `heli(p,{color})` der Hubschrauber; `plane()` liefert die neuen Modelle.

## Meer und Küste

- `water({level, waves, size, z, color, shallow, reflect, foam})`: `level` ist eine Zahl oder `t => …` für Flut und Tsunami. `waterH(x,z,t)` liefert die Wasserhöhe. Spiegelt den Himmel, türkis im Flachen, Schaum an der Küste, Schaumkronen bei hohem Seegang (`waves` ≥ 0.5). An Küsten `level` ca. −0.3 setzen.
- **Unterwasser:** `SKY` 'underwater' (hell, Riff) oder 'deepsea' (dunkel), `ground({color:'#C8B78A'})`, `water({level: 16})` als Oberfläche, `underwater({surface: 16})` (Lichtmuster auf allem, Lichtstrahlen, Plankton), `biome('reef')` (Korallen, Seegras, Kelp, Muscheln, Seesterne). Einzeln: `coral(p,x,z,{kind:'branch'|'brain'|'fan'|'tube'})`, `seaweed(p,x,z,{h})`.
- Meerestiere (v2.14): `sea({kind, x, y, z, ry, len})` + `fly(S, pts, {speed, loop})` (Nase +z, der Körper schwimmt in Wellen, im Stand langsamer): white · megalodon (16 m) · hammerhead · tiger · mako · whaleshark · dolphin · orca · humpback · bluewhale · tuna · swordfish · clownfish · tang · puffer · piranha · angler (Leuchtköder) · goldfish · salmon · manta · stingray · turtle · octopus. `S.do('bite'|'open'|'thrash'|'roll'|'inflate'|'spout'|'click'|'song', t, {dur})` (Biss mit Zähnen und Chomp, Kugelfisch bläst sich auf, Wal bläst eine Fontäne). `shark()` liefert jetzt den Weißen Hai.
- Schwärme und Taucher: `school({n, at:[x,y,z], r, h, colors, scatter: t})` (flieht ab `scatter`), `jelly(p,{x,y,z,color})`, `diver({look})` + `swim(rig, [[x,y,z],…], {t0, speed})` (waagerecht, Flossenschlag, Luftblasen), `submarine(p,{x,y,z,color,light})`, `emit('bubble', {at})`.
- `bob(obj, {depth, size, drop: {t, from}})` lässt ein Objekt auf den Wellen schwimmen und mit ihnen kippen; mit `drop` fällt es hinein, spritzt, taucht unter und kommt wieder hoch. `ship(…)` → `S`, danach `bob(S.g, {size: S.len * 0.5, depth: 0})` (liegt still) oder `sail(S, [[x,z],…], {t0, speed, len: S.len})` (fährt über die Wellen, legt sich in Kurven, Kielwasser, Gischt am Bug).
- **Schiffe (v2.15):** `ship(kind, x, z, {ry, len, paint})` in echter Größe, Wasserlinie bei y = 0: rowboat · speedboat · sailboat · fishing (Trawler mit Netztrommel, Auslegern, Bojen) · tug · landing (Landungsboot) · viking (Ruderer, gestreiftes Segel, Drachenkopf, Schilde) · galleon (drei Masten, Kanonenpforten) · ferry · cruise · freighter (Container) · tanker · destroyer · battleship · carrier. Aktionen: `rampDown(S, t)` + `board(S, rig, i, {t1})` / `seatAt(S, i, t)` (Soldaten fahren mit und laufen über die Rampe raus), `salvo(S, t, {at})` (Geschütztürme zielen und feuern), `broadside(S, t, {side: ±1, at})` (Galeone), `launch(S, t, {at, n})` (Zerstörer-Raketen), Türme einzeln mit `aimTurret(S.guns[i], …)` / `cannon(S.guns[i], …)`. Riesenschiffe dehnen den Nebel automatisch (`CFG.fogScale`); Totalen trotzdem aus höchstens ca. 1,5 × Schiffslänge Abstand. `boat()` liefert die neuen Schiffe.
- Figuren, deren `walk` durchs Wasser führt, spritzen automatisch bei jedem Schritt.
- `lighthouse(p,x,z,{h,beam})` mit kreisendem Lichtkegel (`beam: 0` am Tag), `tree(…,{kind:'palm'})`.

## Tiere (v2.14)

- `beast({kind, x, z, ry, seed, scale, graze})` in echter Größe: lion · lioness · tiger · leopard · cheetah · wolf · fox · dog · cat · bear · polar · panda · deer · doe · reindeer · moose · horse · zebra · donkey · cow · bull · pig · boar · sheep · goat · camel · elephant · giraffe · rhino · hippo · croc · rabbit (Mähne, Streifen, Flecken, Geweih, Hörner, Stoßzähne, Rüssel, Maul mit Zähnen). `walk(b, pts, {speed})` wählt den Gang nach dem Tempo (Schritt, Trab, Galopp, Hoppeln; die Füße bleiben am Boden). Richtwerte in m/s: Schritt 1–1,8, Trab 3–5, Galopp Pferd 12–15, Gepard 20–25, Elefant höchstens 4.
- Aktionen: `b.do(kind, t, {dur})` mit roar · call · howl · trumpet · snap · yawn · sit · lie · sleep · rear · stand · buck · pounce (`h`) · swipe · graze · drink · shake · stalk · charge · wag · look (`at`) · down (`getUp`); die Laute kommen automatisch.
- `herd(kind | [kinds], n, {at, to, t0, speed, spread, seed})`: Herde oder Stampede (ab speed 6 mit Staub und Hufgetrappel).
- Vögel: `bird({kind, x, y, z, ry})` mit gull · eagle · hawk · vulture · pigeon · crow · raven · parrot · owl · duck · flamingo · swan · penguin · sparrow. Mit `fly(b, pts, {speed})` flattert, segelt und stößt er von selbst; steht er still, legt er die Flügel an. `walk` für Laufvögel (Watscheln, Kopfnicken), `b.do('call'|'spread'|'grab'|'peck', t)`. Schwärme: `flock({n, at, r, h, speed, kind, size})` (kreist) oder `{from, to, t0, formation: 'v'}` (Zug), `scatter: t` lässt sie aufstieben.

## Wüste

`ground({color:'#D9B77A'})`, `pyramid(p,x,z,{size})`, `cactus(p,x,z,{size})`, Palmen.

## Weltraum

- `SKY` 'space' plus `spaceSky({nebula, nebula2, glow, milkyway})` (Nebel, Milchstraße, helle Sterne) in jeder Weltraumszene.
- `planet(p,x,y,z,{kind, r, ring, clouds, atmosphere, axis, spin})` mit kind = earth (Kontinente, Eiskappen, Wolken) · moon (Krater) · mars · gas (Bänder) · ice · lava (glühende Risse); Atmosphärenschein, Ringe mit Streifen (`ring: true`). Am Himmel weit weg (r 40–80 in 300–600 m); als Erde unter einer Raumstation groß (r ≈ 500, Oberkante ca. 150 m unter der Station, `axis: 1.2`). Planeten ignorieren den Nebel.
- `astronaut({expr, patch, visor, look})` → Figur im Raumanzug (Helm mit getöntem Visier und sichtbarem Gesicht, Rucksack, Brustpanel, Handschuhe); funktioniert mit `walk`, `pose`, `react`, `carry`. Auf dem Mond `walk(…, {mode: 'lowg', prints: '#6A6A70'})` (Mondhüpfer), in Schwerelosigkeit `floatIn(rig, {t0, t1, drift: [dx,dy,dz], spin})`.
- `spaceship(p, {kind, x, y, z, scale, trail, thrust, beam})` mit kind = shuttle · capsule · fighter · cruiser · ufo: detaillierte Rümpfe mit Paneelen, beleuchteten Fensterreihen, blinkenden Positionslichtern, Triebwerksglocken mit glühendem Rand und flackerndem Abgasstrahl (`thrust` 0–1 oder `t => …`, Kapsel und UFO standardmäßig aus), Cockpit mit Pilot (Fighter), Alien-Pilot und Lauflichter (UFO, `beam: {t0, t1}` = Traktorstrahl). `trail: true` zieht zusätzlich eine Partikelspur entlang der Bahn. Bewegung immer mit `fly(ship, [[x,y,z],…], {t0, speed, bank})`. Größen: Fighter 9 m, Shuttle 16 m, Kreuzer 30 m.
- `satellite(p, {kind: 'classic'|'starlink', x, y, z})`, `station(p, {x, y, z})` (dreht sich langsam), `asteroids({n, at, r, size})`.
- Mond: `ground({color: '#8E8E94'})` + `biome('moon')` (Krater, Geröll), `lander(p,x,z,{ry})`, `flag(p,x,z,{colors})`, `crater(p,x,z,r)`, dazu die Erde am Himmel.
- Mehrere Orte (Orbit, Mondoberfläche) mindestens 1,5 km auseinander bauen, z. B. das Orbit-Set bei x = 4000; nie übereinander, denn die Kamera sieht 1,2 km weit.
- `rocket(p,x,z,{t0,size,acc})` → `{g, nozzle}` hebt bei t0 mit Flamme und Rauch ab; Höhe = ½·acc·(t−t0)².

## Action

- `explode(x,y,z,t0,{size,crater})` bringt Feuerball, Trümmer, Rauch, Licht, Krater, Shake, Flash und Sound selbst mit.
- `meteor({from:[x,y,z], to:[x,y,z], t0, t1, size})` fliegt mit Feuerschweif und explodiert bei t1.
- Jede Explosion belegt für 1,2 s ein Licht. Zusammen mit `glow`/`lamp` höchstens 3–4 Lichter gleichzeitig.

## Kampf (v2.9, comichaft)

- Waffen: `weapon(rig, kind, {style, color, scale, quiver})` mit sword · axe · spear · bat · knife · hammer · saber · katana · cutlass · club · mace · shield (`style`: round · kite · heater · scutum · aspis · riot) · bow · pistol · revolver · blaster · smg · rifle · sniper · shotgun · minigun · launcher.
- Nahkampf: `swing(rig, t, {kind: 'slash'|'back'|'chop'|'thrust'|'rise', at, hit, kill, power})` (t = Treffer), `block(rig, t, {parry})`, `duel(a, b, {t0, n, every, finish: 'a'|'b'})` (n Schlagwechsel mit Klirren, dann der letzte Schlag), `punch(rig, t, {at})`, `kick(rig, t, {at})`.
- Fernkampf: `bow(rig, t, {at, draw, kill, miss})`, `arrowRain({from, to, r, n, t0, t1})`, `shoot(rig, t, {at, n, rate, spread, acc, kill})` (`at` = Rig, Punkt, `horde` oder Liste; Mündungsfeuer, Hülsen, Leuchtspur, Einschläge), `reload(rig, t)`, `grenade(rig, t, {to, fuse, size})`.
- Treffer: `fall(rig, t, {dir, getUp, dazed})` (`dazed` = Sternchen), Sturz aus der Höhe `fallDown(rig, t, {from, to, land})` (v2.29), `ouch(person, t)`, `dismember(zombie, part, t)` und `{ sever }` (v2.23, Abschnitt „Blut und Körperteile“); Massen: `h.hit(i, t, {from, push})`, `h.near(p, t, {max})`, `killNear(h, P, t, r)`.
- Fahrzeuge: `tank(p,x,z,{color, ry, turret, camo, crew})` + `drive`, `aimTurret(T, t, at)`, `cannon(T, t, {at, size})`; `jet(p,{missiles, bombs})` + `fly`, `missile({from, at, t0})` (lenkt nach, trifft auch Flugzeuge → `shotDown`), `bomb(V, t, {horde})`, `flares(V, t)`, `strafe(V, t0, t1, {at, horde})`, `shotDown(J, t)`.
- Die Sounds kommen automatisch. Pro Kampfszene eine Zeitlupe auf den entscheidenden Treffer.

## Fallen und Maschinen (v2.11)

`trap(p, kind, x, z, {t, victim, ry})` mit bear (Tellereisen) · pit (Fallgrube, `spikes`) · spikes · log (schwingender Stachelstamm) · pendulum (Pendelklinge) · net · snare (kopfüber) · mine (`horde`, `r`) · flame · saw · boulder (`path`, rollt) · darts · cage · trapdoor · laser · electric (Röntgen-Zap) · banana · rake; `victim` = Rig oder Horden-Index. Opfer überleben comichaft (Sternchen, plattgedrückt mit `squash`, mit `getUp` wieder hoch). Geschütztürme: `turret(p,x,z,{kind: 'gatling'|'rocket'|'flame'|'laser'|'cannon', scan})`, `turretAim(T, t, at)`, `turretFire(T, t0, t1, {horde, at, rate, burst})` (sucht sich Horden-Ziele selbst). `drone(p,{gun, light})` + `fly`/`strafe`, `press(p,x,z,{at: [t, …], victims})`.

## Wiederkehrende Charaktere sehen immer gleich aus (Pflicht)

Sie entstehen nur über `char(name, { expr, hold })`, nie über `figure()` mit eigenen Farben. `char('you')` ist „you“, die Hauptfigur jedes Szenarios, `char('steve')` ist Dr. Steve (Laborkittel, Klemmbrett), Gerald immer `gerald()` mit Standardgröße 1.5. Aussehen (shirt, pants, hat, skin) kommt aus `CHARS` in der Engine und aus `series/<S>/cast.json` im Repo; `char()` ignoriert übergebene Farben. Neue Figur in einer Serie (Nachbar, Oma …): zuerst in `cast.json` eintragen, committen, dann überall `char('name')`. Kostümwechsel nur, wenn die Story ihn zeigt, und dann als eigener Eintrag (`you-raincoat`). Bei Sammelfiguren (Zombie-Massen, Passanten) gilt das nicht.

## Figuren

`figure({kind:'human'|'zombie', build, shirt, pants, skin, hat, hold, holdShape:'board', coat, cape, expr, look, talk, gait, beard, top, sleeves, skirt, dress, backpack, watch, belt})` (Körperbau, Gangarten und Alltagskleidung: Abschnitt **Körperbau, Körpersprache und Alltagskleidung**) (`cape: '#hex'` = Umhang, weht im Wind und flattert beim Rennen nach hinten) (`coat: true` = Mantel/Kittel mit Kragen, Revers und Knöpfen; unter der Taille vier Bahnen, die an den Hüftgelenken hängen und von den Oberschenkeln geschoben werden – sie gehen nie durch ein Bein, fliegen beim Rennen hinten hoch und legen sich beim Sitzen über die Schenkel; `coatLen` = Länge, Standard 0,365). Haare und Hüte sitzen fest am Kopf (Schale über Scheitel, Hinterkopf und Seiten, vorne der Haaransatz) und bewegen sich nur mit dem Kopf, auch bei Schlägen, Stürzen und Ragdoll; `long` fällt bis zu den Schulterblättern – der Teil auf dem Rücken hängt am Oberkörper und steckt oben im Haar des Kopfes, so schwingt beim Kopfdrehen nichts durch die Schultern → Rig mit Hüfte, Knien, Füßen und Ellbogen, nur für einmalige Figuren. `pose(rig, mode, phase, t)` mit walk · run · shamble · idle · panic · cheer · point · hold. Die Füße setzt die Engine per IK, sie bleiben beim Gehen am Boden; alle Figuren atmen, blinzeln und schauen sich um, auch ohne `pose`. Tiere: `animal({kind})` liefert jetzt die detaillierten Tiere aus `beast()` (siehe **Tiere**); Hühner und Gerald bleiben wie bisher, `detail: false` gibt den alten Klötzchen-Look. Gerald: `gerald({scale})` (Standard 1.5) → Rig wie `animal`, `world.add(g.root)`; bewegen mit `walk` oder per `dyn(g.root)` + eigenem `tick`.

## Ausrüstung und Trupps (v2.13)

`warrior(kind, {seed, at: [x,z], ry, weapon, expr, look})` mit kind = soldier · knight · viking · spartan · roman · samurai · ninja · pirate · cowboy · bandit · swat · caveman (Helme, Rüstung, Wappenröcke, Fell, Helmbusch, Masken, Bärte, Umhänge, Gürtel, Taschen, Stiefel, passende Waffen). `squad(kind, n, {at, ry, cols, gap, jitter, seed, mix})` stellt eine Gruppe auf, in der jeder anders aussieht (Ausrüstung, Farben, Bart, Waffe per Seed). **Regel:** mehrere Trupps immer mit verschiedenen `seed`; dieselbe Figur behält in allen Folgen ihren `seed`. `gear(rig, kind, {seed})` rüstet eine vorhandene Figur aus. Röcke, Tuniken, Lendenschurze, Rockschöße, Panzerschurze sowie Chiton-Saum und Pteryges der Spartaner hängen als Bahnen an den Hüftgelenken (`hemPanels(rig.hips, rig.flaps ??= [], farbe, oben, länge)` bzw. `hipFlap(...)` für eigene Teile); die Engine schiebt sie jedes Bild mit den Oberschenkeln mit.

## Gesichter

`expr` = calm · happy · scared · angry · shout · sad · surprised · smug · annoyed, seit v2.40.5 auch disgust (Nase rümpfen, Oberlippe hoch) · confused (eine Braue hoch, Mund schief) · nervous (gezwungenes Grinsen mit Zähnen, Schweißtropfen) · relieved · determined · panic (stärker als scared: Mund weit auf, Stecknadel-Pupillen, Schweiß, Zittern) · deadpan (halb geschlossene Lider, gerader Mund) · cry (Tränen) · blush (verlegen, rote Wangen) · sweat (Schweißtropfen). Zusätze mit `+`: `'happy+blush'`, `'scared+sweat'`, `'angry+tears'`. Alles auch als `t => …`.
- **Lesbar auf dem Handy:** jeder Ausdruck hat eigene Brauenformen (innen hoch bei Angst/Trauer, zusammengezogen bei Wut), Lider (Lächeln und Wut kneifen, Angst und Staunen reißen auf, schräge Lider bei Wut/Trauer), Pupillen (klein bei Angst, groß bei Freude), Mundformen (Grinsen mit Zähnen, Schmollmund, O-Mund, zusammengebissene Zähne, schiefes Grinsen) und Wangen, die beim Lächeln hochgehen.
- **Weiche Wechsel:** jeder Wechsel von `expr` blendet über ~0,25 s, Brauen und Augen gehen mit kleinem Überschwingen voraus, der Mund folgt; beim Wechsel blinzelt die Figur meist. Blinzeln alle 2–6 s (manchmal doppelt), auch wenn sie woanders hinschaut; die Augen schauen kurz vor dem Kopf zum `look`-Ziel, sonst blicken sie umher (mit kleinen Sakkaden).
- **Reagiert von selbst (Nahaufnahme):** Ist die Figur groß im Bild, zuckt ihr Gesicht bei einem lauten Treffer (`explode()`, Explosion, Kanone, Donner, Brüllen, Aufprall in `AUDIO.hits`), starkem Kamerawackeln (`SHAKES` amp ≥ 0,2) oder großem `FLASHES` (a ≥ 0,55) zusammen (Augen zu, dann weit auf, Brauen hoch, Mund auf, Kopf ruckt kurz zurück) und geht dann in den geschriebenen Ausdruck zurück; fällt ein Zähler (`STATS` mit `up`) sichtbar, schaut sie kurz besorgt, steigt er, kurz erleichtert. Dieselben Ereignisse wie beim Erzähler (v2.38). Der geschriebene `expr` bleibt die Grundlage, Reaktionen liegen nur kurz darüber. Aus: `figure({ autoFace: false })` bzw. `char('you', { autoFace: false })` oder für das ganze Video `CFG.autoFace: false`. Zombies reagieren nicht.
- `react()` spielt das Gesicht mit: startle → erschrocken, flinch/hit → Augen zukneifen, facepalm → genervt, sigh → deadpan mit Ausatmen, shrug → ratlos (eine Braue hoch), nod → kleines Lächeln, shake → Stirnrunzeln, wave → Lächeln.
- `look: 'cam' | [x,y,z] | 'trackName' | obj` dreht den Kopf dorthin (auch nachträglich: `rig.look = …`; als Funktion `t => [x, y, z] | 'cam' | 'trackName' | null`). Bei weiten Drehungen gehen Brust (~28 %) und Hüfte (~10 %) mit, die Füße bleiben stehen – der Kopf dreht nie mehr als ~60° gegen die Schultern. Steht das Ziel weiter als ~90° zur Seite, die Figur mit `faceTo` drehen.
- **Lippensynchron:** Beats mit `who: 'you' | 'steve' | Name` werden mit eigener Stimme gesprochen (you: Preset young, Steve: steve), und die Lippen der Figur aus `char(name)` bewegen sich passend zur Stimme (offen, breit, rund, Zähne, geschlossen); auf betonten Silben gehen die Brauen kurz hoch (bei Wut ziehen sie sich zusammen). Die Figur steht dabei groß im Bild. Ohne Stimme bewegt `talk: [[t0, t1], …]` oder `t => bool` die Lippen im Silbenrhythmus.
- Masken, Bärte, Helme, Kapuzen, Schutzbrillen und Augenklappen verdecken das Gesicht sauber (was dahinter liegt, wird ausgeblendet; Augenlöcher im Helm bleiben offen). Zombies: trübe, schwach leuchtende Augen mit schweren, schiefen Lidern, offener Kiefer mit schiefen Zähnen.
- In jeder Nahaufnahme passt der Ausdruck zur Caption (Angst, Triumph, Ärger). „you“ schaut bei Pointen gern in die Kamera (`look: 'cam'`). Test: `tests/faces.*`.

## Look von „you“

Standard sind Haare ohne Hut. Der Look passt zum Szenario: `char('you', { outfit: … })` mit straw (Farm) · cap · capBack · beanie · cowboy · shades · hair (nimmt den Hut ab) und den Frisuren short · buzz · spiky · long · bun · curly · mohawk, dazu Haarfarbe blond · ginger · black; auch kombiniert, z. B. `['capBack', 'shades']`. Eine Serie legt den Look einmal in `cast.json` fest (`hatStyle`, `hat`, `hairStyle`, `hair`, `glasses`) und behält ihn, Einzelvideos wählen frei. Einmalige Figuren nehmen dieselben Optionen direkt in `figure({ hatStyle, hairStyle, glasses })`.

## Durchgehende Glieder (v3.0, automatisch)

Arme und Beine sind je eine durchgehende, geskinnte Fläche über Schulter, Ellbogen und Handgelenk bzw. Hüfte, Knie und Knöchel (an dieselben Gelenke gebunden, an jedem Gelenk weich überblendet): Ein gebeugter Ellbogen oder ein gebeugtes Knie bleibt geschlossen, die Schulter geht in den Körper über, keine Lücken und keine herausstehenden Kanten mehr. Ärmel, nackte Unterarme (`sleeves: 'short'`), Körperbau, `soot`/`wet`/Einfrieren und Sichtbarkeit gehen mit. Die alten Klötze bleiben unsichtbar im Rig (Gore, Ragdolls, Hitboxen und Prüfung lesen sie) und werden nur gezeichnet, wo die Haut nicht kann: ein abgetrenntes Glied oder ein von der Physik auseinandergezogenes Gelenk (> 12 %), nur für diese Frames. `figure({ skin: false })` bzw. `CFG.skin: false` = alte Klötze.

## Körperbau, Körpersprache und Alltagskleidung (v2.41)

- **Körperbau:** `figure({ build })` mit man (Standard) · woman (schmalere Schultern, Taille, breitere Hüfte, schwingende Hüfte beim Gehen, Füße fast auf einer Linie, Standardfrisur long/ponytail/bun) · kid (≈ 1,2 m, großer Kopf, lebhafter Gang) · teen · old (gebeugt, leicht gebeugte Knie, kleiner Bauch, wenig Armschwung, graue Haare) · heavy (breit, Bauch der beim Gehen mitfedert, breiter Stand, schaukelnder Gang) · slim · tall · short · muscular (breite Schultern, dicke Arme, Arme leicht abgespreizt). Dazu `height: 0.9–1.1` als Feinregler. Schultergelenke wandern mit, IK (Greifen, Waffen, Tragen) stimmt bei jedem Körperbau. Serienfiguren bekommen ihren Körperbau in `cast.json` (`"build": "woman"`); `char()` lässt ihn wie die Farben nicht überschreiben. Massen (`horde`) mischen automatisch schmale bis kräftige Oberkörper.
- **Körpersprache folgt dem Gesicht (automatisch):** Jeder `expr` hat eine Haltung, die über 0,45 s nach dem Gesicht einblendet: Angst/Panik/nervös → Schultern hoch, Arme eng, Ellbogen angewinkelt · traurig/weinen → Kopf hängt, Schultern fallen, Arme hängen, kaum Armschwung · glücklich → aufrecht, größerer Armschwung · wütend/entschlossen → nach vorn gelehnt, Fäuste · überheblich → zurückgelehnt, Kopf schief · verwirrt → Kopf schief, Schultern hoch · erleichtert → Schultern sinken. Im Stand voll, beim Gehen ca. 65 %, beim Rennen ca. 35 %; Aktionen (`react`, `gesture`, Greifen, Waffen) liegen darüber. Aus: `figure({ bodyLang: false })` oder `CFG.bodyLang: false`.
- **Gangarten nach Stimmung:** `figure({ gait })` oder `rig.gait = name | t => name` mit tired (gebeugt, schlurfend, kaum Armschwung) · proud (Brust raus, großer Armschwung) · scared · sad · happy · angry · cool (lässig, Kopf schief, wenig Armschwung) · sneaky. Wirkt beim Gehen voll, im Stand schwächer; wechselt weich. Dazu weiter die Modi von `walk(…, { mode: 'sneak' | 'tiptoe' | 'limp' | 'crawl' })`.
- **Schultern:** eigene Kanäle `S.lsh` / `S.rsh` (−0,5 … 1, hoch = positiv) für eigene `fx`. `react` shrug/startle/flinch ziehen sie hoch, sigh lässt sie fallen; beim Atmen heben sie sich leicht.
- **Standbein / Spielbein:** Steht eine Figur, verlagert sie das Gewicht; das freie Knie gibt nach, die Ferse hebt sich etwas (`figure({ freeLeg: 0 })` = aus).
- **Ausholen vor dem Loslaufen:** Vor jedem `walk`-Start knicken die Knie kurz ein, der Oberkörper lehnt sich zurück, die Arme gehen nach hinten – dann geht es los (`CFG.windup: false` = aus).
- **Hände:** vier Finger und Daumen mit je zwei Gelenken; alle Handposen (`hands`, Gesten, Griffe) beugen beide Gelenke. `grab(rig, at, t0, t1, { side: 'L' | 'R' | 'both', gap, hand })` hält sich eine Weile an einem Punkt fest (Geländer, Türklinke, Lenkrad, Leiter, Schulter eines anderen): `at` = `[x,y,z]`, Objekt oder `t => [x,y,z]`; der Arm greift per IK hin, lehnt sich vor oder geht in die Hocke, wenn es etwas weiter weg ist, die Hand schließt sich.
- **Neue Leerlauf-Aktionen:** `idle(rig, t0, t1, 'neck' | 'think' | 'look')` (Nacken reiben · Hand ans Kinn · Blick über die Schulter), zusätzlich zu shift · cross · scratch · watch · hips · tap · pocket · stretch. **Statisten zappeln von selbst:** `figure()` ohne `who`, die nicht laufen und keine eigenen Aktionen haben, machen im Stand alle paar Sekunden eine kleine Leerlauf-Aktion (`figure({ fidget: false })` bzw. `CFG.fidget: false` = aus; `fidget: true` erzwingt es).
- **Alltagskleidung** (alles auch in `cast.json`):
  - `beard: 'full' | 'stubble' | 'goatee' | 'mustache'` (`beardColor`, Standard Haarfarbe) – sitzt fest am Kopf und verdeckt den Mund nie.
  - Frisuren zusätzlich `hairStyle: 'ponytail'` (Zopf am Hinterkopf, hängt nach unten, fliegt beim Rennen nach hinten) und `'bald'` (Glatze mit Haarkranz).
  - `top: 'hoodie'` (Kapuze im Nacken, Bauchtasche, Kordeln, die mitschwingen, Bündchen) · `sleeves: 'short'` (T-Shirt, nackte Unterarme).
  - `skirt: '#hex'` · `dress: '#hex'` (Kleid = Oberteil in derselben Farbe), `skirtLen`, `legs: '#hex'` (Strumpfhose, sonst Haut) – Bahnen an den Hüftgelenken, nie durch ein Bein.
  - `backpack: true | '#hex'` (schwingt und federt beim Gehen nach) · `watch: true | '#hex'` · `belt: true | '#hex'`.
  - Schuhe haben Sohle, Schnürung und (bei dunklen Schuhen) helle Kappe; `soles: false | '#hex'`.
- **Look (automatisch):** feines Randlicht in der Farbe des Himmels auf allen Figuren (nachts stärker – Figuren lösen sich vom dunklen Hintergrund; `CFG.rim` 0–2, 0 = aus), Haut mit warmem Schimmer an den Rändern, weiche Kontaktschatten unter den Füßen, die beim Anheben verblassen (`CFG.contactShadows` 0–1, `false` = aus). `CFG.fingers: false` = alte Klötzchen-Hände, `CFG.figLook: false` = ohne Randlicht/Hautschimmer.
- Test: `tests/bodies.*`.

## Schauspiel

`react(rig, t, kind, {dur, amp})` mit startle · flinch · hit · shrug · nod · shake · facepalm · wave · sigh; `jump(obj, t, {h, dur})` holt aus, streckt sich und federt bei der Landung (Figuren, Tiere, Props). Pro Video 3–5 Reaktionen auf die Schlüsselmomente, z. B. Schreck beim Durchbruch, Facepalm nach Steves Tipp, Jubel bei der Rettung.

## Motion Capture (optional)

`model('robot', {scale: 0.45, tint: {Main: '#hex'}})` ist ein geriggter Roboter (CC0) mit echten Animationen (Idle, Walking, Running, Dance, Wave, Jump, Yes, No, ThumbsUp, Punch, Death …). Er funktioniert mit `walk`, `pose` und `track`; feste Abfolgen laufen über `anim(rig, [[t, 'Wave', {once: true}], [t2, 'Dance']])`. Weitere Modelle liegen als `models/<name>.glb` im Repo (siehe `models/README.md`); in `cast.json` macht `"model": "name"` aus einer Serienfigur ein Mocap-Modell.

**Asset-Bibliothek (v3.4):** rund 600 Low-Poly-Modelle aus CC0-Paketen (Quaternius, KayKit) in echten Maßen unter `assets/<paket>/<name>.glb`; Übersicht mit Vorschaubild und Maßen: `node tools/import-assets.mjs` → `work/asset-catalog.html`, Liste mit Maßen und Clips: `assets/index.json`.
- Feste Objekte: `asset(p, 'paket/name', x, z, { ry, scale, h (Zielhöhe in m), y, tint: '#hex' | { Materialname: '#hex' }, dyn: true (bewegbar, z. B. mit drive()), shadow })` → Group, steht auf dem Boden. Pakete: `farm/` (barn, bigbarn, smallbarn, openbarn, silo, silo_house, windmill, towerwindmill, watertower, well, chickencoop, fence, fence2) · `cars/` (cop, taxi, suv, normalcar1/2, sportscar/2) · `nature/` (150: commontree_*, pinetree_*, birchtree_*, willow_*, palmtree_*, je auch _autumn/_snow/_dead; bush_*, rock_*, cactus_*, grass, flowers, corn, wheat, lilypad, treestump, woodlog) · `street/` (Straßenstücke 2 × 2 m, Brücken, Ampeln, Laternen, Schilder) · `city/` (KayKit: building_a–h, Straßen, car_*, Ampeln, Hydrant, Mülltonne, Wasserturm) · `space/` (Basis-Module, Lander, Landeplätze, Fracht, Solar, Bohrturm, Tunnel, Rover) · `resources/` (Gold-, Silber-, Eisen-, Kupferbarren und -nuggets, Fässer, Kanister, Holz, Steine, Stoffe) · `furniture/` (Betten, Sofas, Stühle, Tische, Lampen, Regale, Teppiche, Pflanzen) · `tools/` (Hammer, Säge, Axt, Laterne, Karten …) · `scifi/` (Kisten, Spinde, Fässer, Schreibtische, Satellitenschüssel, Waffen).
- Tiere und Wesen mit Animationen über `model('paket/name')` (Clips Walk · Run · Idle · Attack · Jump · Death; `walk`/`pose` finden sie selbst, Schrittlänge aus der Körperlänge): `dino/` trex, velociraptor, triceratops, stegosaurus, apatosaurus, parasaurolophus · `farmanim/` cow, horse, zebra (+WalkSlow), pig, sheep, llama, pug (nur Idle/Jump) · `fish/` shark, whale, dolphin, manta_ray, fish1–3 (Swim) · `critters/` rat, spider, frog, snake, snake_angry, wasp (Flying) · `scifi/` enemy_eyedrone, enemy_quadshell, enemy_trilobite. Feste Abfolgen: `anim(rig, [[0, 'TRex_Idle'], [3, 'TRex_Attack', { once: true }]])`. Echte Größe (T-Rex 12 m lang, Kuh 2,4 m, Wespe 4 cm); für „riesig“ `scale` setzen.
- `assemble.py` bettet nur die benutzten Modelle ein (typisch 20–300 KB je Objekt, animierte Tiere 0,3–1 MB). Neue Pakete: nur CC0, in `PACKS` von `tools/import-assets.mjs` eintragen, Maßstab in `tools/asset-scales.json`, echte Länge der Tiere in `tools/asset-sizes.json`.
- **Eigene Modelle aus Blender (v3.9):** Paket `own/` – Low-Poly-Objekte, die wir selbst in Blender bauen (Blender-MCP live oder headless). Jedes Modell hat ein Bauskript `assets/own/src/<name>.py` mit `build(coll)` (Meter, Z oben, gibt die Mesh-Objekte zurück; Helfer `mat(name, '#hex', rough, metal, emit)`, `mesh(name, bm, mat, coll)`, `jitter(bm, amount, seed)`, dazu die Detail-Helfer unten). `tools/blender_asset.py` fügt die Teile zusammen, setzt den Ursprung unten mittig, exportiert flach schattiert nach `assets/own/<name>.glb` und trägt Maße und Dreiecke in `assets/index.json` ein. Neu bauen: `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/<name>.py`. In der Szene wie jedes Asset: `asset(world, 'own/bunker', x, z, { h, ry, scale, tint: { concrete: '#7C8A6A' } })` – die Materialnamen aus dem Bauskript sind die Schlüssel für `tint`. **Details (v3.10):** Helfer im Bauskript (Blender-Achsen: x rechts, y nach hinten, z oben; Vorderseite = −y, in three.js +z): `box(sx, sy, sz, at, bevel_w, seg, rz)` (steht mit der Unterseite auf `at`), `cyl(r, h, at, seg, r2, axis)`, `torus(R, r, at, seg, seg2, axis)` (Räder, Griffe), `prism([(x, z), …], depth, y)` (Umriss nach hinten gezogen: Warnstreifen, Schilder, Giebel), `bevel(bm, width, seg, angle)` (Kanten fasen – der günstigste Detailgewinn), `recess(bm, normal, inset, depth, near)` (Fläche mit Rahmen einsenken: Türen, Fenster, Paneele; negative Tiefe = erhaben). Seit v3.11 außerdem `arch_pts(w, h, x, z)` / `rect_pts` (Umrisse für Bogen- und Rechteckfenster, mit `prism`), `dome(r, at, seg, rings, h)` (Kuppel), `rotz(bm, a)`, `move(bm, v)`; gemeinsame Bauteile mehrerer Modelle liegen in `assets/own/src/_<name>.py` (Unterstrich = kein eigenes Modell) und werden mit `use('_jlm.py')` geladen (Fassaden-Helfer für Häuser: `window`, `door`, `balcony`, `ac_unit`, `water_tank`, `solar_heater`, `dish`, `parapet`, `courses`, `spandrel`, `pot_plant`, `olive_tree`). Reihen und Spiegelungen sind einfache Python-Schleifen. Beim Export brennt Cycles **Ambient Occlusion** in die Vertex-Farbe ein (Fugen, Ecken, Unterseiten dunkler; three.js multipliziert sie mit der Materialfarbe, auch nach `tint`); im Skript `AO = {'strength': 0.65, 'dist': 1.0}` anpassen oder `AO = False`. In Blenders Materialansicht ist das AO nicht zu sehen, erst im Engine-Bild. Regeln: echte Maße, ein Material pro Farbfläche, Dreiecke: Requisite ≤ 2000, Fahrzeug ≤ 10 000, Gebäude ≤ 12 000; Farben im Stil der CC0-Pakete. Vorhanden: `own/bunker` (Betonbunker 9,8 × 6,6 × 11,4 m, ca. 10 000 Dreiecke: Grasdach, Drucktür mit Handrad, Riegeln und Nummernschild, Warnstreifen, Lampe, Schießscharten, Lüfter, Periskop, Antenne, Leiter, Notausstieg, Betonschäden mit Bewehrung, Risse, Schmutz, Moos, Schutt, Stacheldraht, NATO-Draht, MG-Nest, Suchscheinwerfer, Warnschild, Fallrohr, Munitionskisten, Ölfässer, Sandsäcke; Materialien concrete, concrete_dark, turf, steel, steel_dark, rust, void, sandbag, hazard_y, hazard_k, lamp, wood, moss, grime, barrel, white). **Jerusalem-Set (v3.11):** `own/jlm_house` (3 Geschosse, 10 × 10 m: Laden mit Rollladen und Markise, Balkon, Bogenfenster mit Läden, Eckquader, Dachaufbau mit Kuppel, schwarze Wassertanks, Solarboiler, Schüssel) · `own/jlm_courtyard` (2 Geschosse mit Arkaden-Loggia und Dachterrasse, Steinkuppel auf Tambour, Außentreppe, Olivenbaum) · `own/jlm_block` (5-geschossiger Wohnblock 16 × 11 m, drei Läden, Balkonreihen, acht Tanks, vier Solarboiler) · `own/jlm_golden_dome` (achteckiger Kuppelbau in echter Größe, 57 m breit, 37 m hoch: Marmor unten, blaue Fliesen oben, Zinnen, vier Portale, Bleidach, Tambour, goldene Kuppel); Materialien stone, stone_light, stone_dark, shutter, door, awning, tank, solar … · **Mauer:** `own/wall_barrier` (12 m Fertigteilmauer, 16,5 m hoch: vier T-Wandplatten mit Fugen, Schmutz, Flecken und Kratzspuren außen, NATO-Draht oben, Laufsteg mit Geländer und Flutlicht innen) und `own/wall_tower` (Wachturm, 24 m, Kanzel mit Umgang, Suchscheinwerfer, Kameras, Leiter). Beide haben dieselbe Tiefe und stehen bei ry 0 bündig auf einer Linie, die Außenseite (Angreifer) zeigt nach +z und liegt 0,95 m vor der Mittellinie (bei ry π nach −z): Mauerstücke in 12-m-Schritten, Türme in 6-m-Schritten aneinanderreihen, z. B. `const B = 'own/wall_barrier', T = 'own/wall_tower'; let x = -60; for (const n of [B, B, T, B, B]) { const w = n === T ? 6 : 12; asset(world, n, x + w / 2, 0); x += w; }`. Für Zombies, die die Mauer hochklettern: `horde({ …, wait: { line: [[x0, 1.0], [x1, 1.0]], climb: { h: 16.5 } } })` (Linie an der Außenseite, siehe **Massen**). **Straßen-Set (v3.12):** `own/jlm_road` (Straßenstück genau 16 m breit × 12 m lang, entlang z aneinanderreihen, mit ry π/2 entlang x: zwei 3,5-m-Spuren, Mittel- und Randlinien, Bordsteine, 3 m Gehweg aus Kalksteinplatten, Gullys, Kanaldeckel, Flickstellen, Risse, Baumscheiben) · `own/jlm_road_cross` (Kreuzung 16 × 16 m, schließt an alle vier Seiten an: Zebrastreifen, Haltelinien, abgerundete Gehwegecken, Blindenleitplatten). Gehweg-Oberkante y = 0,15 → Möbel auf dem Gehweg mit `{ y: 0.15 }`; Rechtsverkehr: in −z-Richtung bei x = +1,75 fahren, in +z-Richtung bei x = −1,75. · `own/car_hatch` (Kleinwagen 4,2 m) und `own/car_van` (Lieferwagen 5,4 m, Dachträger, Leiter, Schiebetür) – Front nach +z wie bei `drive()`: `const c = asset(world, 'own/car_hatch', x, z, { dyn: true, tint: { paint: '#B03A2E' } }); drive(c, [[x, z], [x, z2]], { t0, speed })` (Räder drehen sich nicht mit, das Auto fährt als Ganzes) · `own/traffic_light` (Ampel 4,5 m mit Fahrzeug- und Fußgängersignal, Taster, Schild, Kamera; Signal schaut nach +z) – schalten per `tint`, das Leuchten folgt (v3.12): Rot an = `{ tint: { light_yellow: '#2A2A2A', light_green: '#2A2A2A', ped_red: '#2A2A2A' } }` · `own/street_lamp` (Laterne im Altstadtstil 4,4 m, leuchtend; aus mit `tint: { lamp: '#3A3A3A' }`) · `own/bench` (Bank mit Steinwangen und Holzlatten, schaut nach +z) · `own/bus_stop` (Haltestelle 3,6 m, offen nach +z, Werbevitrine leuchtet, Bank, Fahrplan, Schild, Mülleimer) · `own/trash_bin` (grüner Straßenmülleimer am Pfosten) · `own/palm_planter` (Dattelpalme 6 m im Steintrog) · `own/cypress` (Zypresse 8,8 m). Gemeinsame Teile: `assets/own/src/_street.py`. `tint` färbt seit v3.12 bei leuchtenden Materialien auch das Leuchten um (Signale, Lampen an/aus). **Namen immer wörtlich** (`'own/jlm_house'`, auch in Listen): `assemble.py` bettet nur Modelle ein, deren Name als String im Code steht; zusammengesetzte Namen (`'own/' + n`) fehlen im Video. Seit v3.11 meldet die Engine fehlende Modelle als PAGE ERROR. **Pflicht:** Neue Modelle nur in voller Detailstufe bauen (wie `own/bunker`: Fasen, Aussparungen, Schäden, Gebrauchsspuren, Kleinteile, Umgebungsdetails), keine einfache Grundvariante; Name `own/<name>` ohne Zusatz. Tests: `tests/own-assets`, `tests/own-jerusalem`, `tests/own-street`.

**Mocap-Menschen (v3.4):** `human({ sex: 'm' | 'f', shirt, pants, shoes, sleeves: 'short' | 'long' | 'none', legs: 'long' | 'shorts' | 'briefs', skin, hair: 'parted' | 'buzzed' | 'long' | 'buns' | 'pixie' | 'bald', hairColor, beard, shirt: false (ohne Oberteil), scale (0,92), seed })` → Model-Rig mit echtem Körper (Quaternius Universal Base Characters, CC0) und 84 Mocap-Clips (Universal Animation Library 1 + 2). Kleidung wird per Shader auf den Körper gemalt (eng anliegend, matter Stoff); fehlende Farben, Frisur und Hautton wählt `seed` (Standard: fortlaufend). Funktioniert mit `walk` (walk · run · panic · shamble · sneak · swim, Schrittlängen gemessen), `pose`, `track` und `anim(rig, [[t, 'Clip', { once }]])`. Kurznamen in `anim`: talk · phone · fold · sit · tread. Wichtige Clips: Idle_Loop, Idle_Talking_Loop, Idle_TalkingPhone_Loop, Idle_FoldArms_Loop, Idle_No_Loop, Yes, Walk_Loop, Walk_Formal_Loop, Walk_Carry_Loop, Jog_Fwd_Loop, Sprint_Loop, Crouch_Fwd_Loop, Crouch_Idle_Loop, Jump_Start/Jump_Loop/Jump_Land, Roll, Dance_Loop, Death01, Hit_Chest, Hit_Head, Hit_Knockback, Punch_Jab, Punch_Cross, Melee_Hook, Sitting_Enter/Sitting_Idle_Loop/Sitting_Talking_Loop/Sitting_Exit, LayToIdle, Driving_Loop, Push_Loop, PickUp_Table, Interact, Fixing_Kneeling, Consume, OverhandThrow, ClimbUp_1m, Swim_Fwd_Loop, Swim_Idle_Loop, Zombie_Walk_Fwd_Loop, Zombie_Idle_Loop, Zombie_Scratch, Farm_Harvest, Farm_PlantSeed, Farm_Watering, TreeChopping_Loop, Pistol_* (Aim, Shoot, Reload), Sword_*, Shield_*, Spell_Simple_*. Kosten: je Körper ca. 4,9 MB im Render-HTML (`assemble.py` bettet `human_m`/`human_f` nur ein, wenn die Szene sie braucht; `sex: 'f'` → `human_f`). Für Hauptfiguren gedacht, nicht für Massen (dafür `horde`/`crowd`). Neu bauen: `node models/build-quaternius.mjs` (siehe `models/README.md`).

**Mocap auf den eigenen Figuren (v3.6, automatisch):** Die 84 Clips von `human()` sind auf das Skelett von `figure()` übertragen (Low-Poly-Look bleibt, Bewegung ist echte Mocap). **Standard für jede Figur**, die Engine wählt den Clip aus der Szene: Stehen → Idle_Loop (pro Figur zeitversetzt), sobald die Figur spricht (`talk`, oder ihre Zeilen in `BEATS` über `who`) → Idle_Talking_Loop mit Redegesten, weich überblendet; `sit` → Sitting_Idle_Loop / Sitting_Talking_Loop (Sitzhöhe bleibt die der Szene); `walk` → Walk_Loop, `run` → Jog_Fwd_Loop, ab 6 m/s Sprint_Loop; `sneak` → Crouch_Fwd_Loop; Zombies → Zombie_Idle_Loop / Zombie_Walk_Fwd_Loop; `panic` → Beine sprinten, Arme fuchteln wie gehabt; rennende Zombies behalten die ausgestreckten Arme. Schrittlänge passt zum Tempo von `walk`, die Füße rutschen nicht. Massen (`horde`) ebenso, siehe **Massen**. Modi ohne Clip (cheer, point, hold, crawl, tiptoe, limp, swim, tread, climb, float, lowg …) bleiben die eigenen Posen, Wechsel werden überblendet. **Alles, was auf die Pose kommt, wirkt weiter:** Körpersprache (`expr`, `gait`, Körperbau), Atmen, `react`, `gesture`, `idle(…)`-Aktionen, `stumble`, `slide`, `dance`, `grab`, Umarmen, Ziehen usw. Kleine Schichten laufen auf dem Clip mit, große (Winken, Greifen, Zeigen, IK) übernehmen das betroffene Glied stufenlos. Gesicht, Hände, Kleidung, Haare, Gore, Ragdoll, Fuß-IK am Hang bleiben wie gehabt. Grundhaltung pro Figur: `figure({ idle: 'fold' | 'phone' | 'talk' | 'Crouch_Idle_Loop' | … })`. Aus: `figure({ mocap: false })` bzw. `CFG.mocap: false` (ganze Szene, alter Look). **Eigene Clips passend zur Handlung:** `anim(f, [[t, 'Punch_Cross', { once: true }], [t2, null]])` (`null` = zurück zum Automatik-Clip), Überblendung `fade` (0,3 s), `{ only: 'upper' }` = nur Oberkörper/Arme/Kopf (Beine laufen mit `walk` weiter, z. B. `anim(f, [[0, 'phone']], { only: 'upper' })`), `'lower'` = nur Hüfte und Beine. Kurznamen: talk · phone · fold · sit · dance · yes · no · sprint · swim · tread. Kosten: ca. 120 KB für die Automatik-Clips, dazu ca. 7 KB pro Sekunde je benanntem Clip (`assemble.py` bettet nur ein, was die Szene braucht). Daten: `models/mocap.json`, neu bauen mit `node models/build-mocap.mjs` (aus `models/human_m.glb`). Test: `tests/figure-mocap`.

## Bewegung

- `walk(rig|obj, [[x,z],…], {t0, t1, speed, mode, loop, endMode, startMode, ramp})` setzt Pose und Laufrichtung automatisch: Die Figur fährt an und bremst ab (`ramp` in s, 0 = sofort), nimmt Kurven vorausschauend, legt sich beim Rennen in die Kurve und wechselt weich zwischen Laufen und Stehen. Wegen `ramp` kommt sie ca. 0,2–0,5 s später an als Weglänge/`speed`.
- `appear(obj, t0, {from:'pop'|'rise'|'drop'})`, `vanish(obj, t0)`, `knock(obj, t0, {dir, axis})`.

## Interaktion mit Gegenständen (Pflicht: mindestens 2 pro Video)

Wenn die Handlung es hergibt, fassen die Figuren Dinge an, statt nur daneben zu stehen.
- Tragen und Werfen: `carry(rig, obj, {pick, drop, throw: {t, to: [x,z], h, spin}, both, heavy})` (`heavy: true` = schwer: zurückgelehnt, Arme angespannt; dann langsamer gehen lassen, `speed` ca. 0.8) bückt sich, greift zu, trägt mit einer oder beiden Händen und stellt ab oder wirft mit Ausholen. Die Figur steht beim Wurf; bewegt sie sich davor, laufen die `walk`-Abschnitte vorher.
- Physik: `toss(obj, t, {from, to, h, bounces, spin, float})` fliegt im Bogen, springt auf und bleibt liegen; landet es im Wasser, spritzt es, und es geht unter oder treibt (`float`). Dazu `push(rig, obj, {t0, t1, to})` (schieben, die Figur läuft dahinter), `knockAway(obj, t, {dir, power})` (weggeschleudert), `shatter(obj, t)` (zersplittert mit Scherben und Klirren) und `wobble(obj, t, {amp})` (wackelt nach einem Treffer nach).
- Türen: `openDoor(house | barn | car | gate, t, {i, close})`. Das Haus hat eine Tür mit dunklem Flur dahinter, die Scheune ein Schiebetor, Autos haben Fahrer- (`i: 0`) und Beifahrertür (`i: 1`). `openWindow(house, t, {i})` öffnet die vorderen Fenster, `gate(p,x,z,{w, ry})` baut ein Hoftor. Geräusche kommen automatisch.
- Sitzen und Einsteigen: `sit(rig, t, {seat: bench | [x,y,z], t1, h})`. `enter(rig, vehicle, t, {out})`: Tür auf, einsteigen, mitfahren, mit `out` wieder aus. Danach fährt das Fahrzeug mit `drive`.
- Licht: `flashlight(rig, {t0, t1, flicker})` mit Lichtkegel, `headlights(vehicle, {t0, t1, light})` (übrige Autos mit `light: false`, nur Kegel), `phone(rig, {t0, t1, light})` (leuchtendes Display, Kopf gesenkt; nachts `light: true` hellt das Gesicht auf), `lightning(t, {x, z})` und `lightningStorm(t0, t1, {every})` mit Blitz, Aufhellung und Donner. Gleichzeitig höchstens 3–4 echte Lichter (Spot, Glow, Lampe, Explosion).
- Spuren: `walk(…, {prints: true | '#hex'})` hinterlässt Fußabdrücke (Schnee, Sand, Schlamm). `drive(vehicle, pts, {t0, t1, speed, ramp, tracks, dust})` lässt die Räder drehen, die Nase beim Bremsen eintauchen und das Auto sich in Kurven neigen; dazu Reifenspuren, Bremsspuren und Staub. `splash(x, z, t, {size})` spritzt und zieht Wellenringe. Sprünge: `drive(…, {jumps: [[t, h, flugzeit]]})` (Nase hoch beim Absprung, Federn und Staub bei der Landung), `bumpy: 0–2` rüttelt im Gelände; Unfall siehe `crash()` unter Physik.
- Bewegung auf die äußere Gruppe legen, `appear`/`vanish` auf eine innere.

## Physik (echt, einmal vorab simuliert, bildgenau wiederholbar)

Für alles, was fällt, fliegt, umkippt oder zerbricht, statt Handanimation. Vor seinem Startzeitpunkt bleibt jedes Objekt in seiner normalen Animation, danach übernimmt die Simulation.
- `phys(obj, {t0, mass, vel: [x,y,z], spin, shape: 'box'|'sphere', bounce, friction})`: fällt, kippt, rollt, prallt ab; Kistenstapel stürzen um, wenn etwas sie trifft.
- `blast(x,y,z,t,{power, r})` stößt alles Simulierte weg; `explode()` macht das automatisch.
- `breakApart(obj, t, {n: [x,y,z], power, from})`: Mauer, Schuppen, Zaunfeld oder Kiste zerbricht in Stücke in den eigenen Farben.
- `ragdoll(rig, t, {from: [x,y,z] | dir, power, getUp: t2})`: Die Figur wird weggeschleudert und fällt schlaff mit Gelenken (comichaft, nie brutal; bei Explosionen, Zusammenstößen, gern bei Zombies). `getUp` lässt sie an Ort und Stelle aufstehen; danach kein `walk` mehr für diese Figur.
- `crash(vehicle, t, {impulse, spin})`: Das Fahrzeug verlässt seine `drive`-Bahn, überschlägt sich, Glas splittert, Rauch steigt auf.
- Häuser, Scheunen, Silos, Türme und Fahrzeuge sind automatisch fest; eigene Hindernisse mit `collider(obj)`, bewegte (gehende, fahrende) mit `collider(obj, {moving: true})`.
- Automatisch an Figuren: Oberkörper, Kopf, Hut, Haare, Mantel und Umhang schwingen beim Anlaufen, Bremsen und in Kurven nach; Füße passen sich Hängen an; gehende Figuren weichen einander aus.
- Pro Video 1–3 Physik-Momente an den Höhepunkten. `power` 4–8 halten, damit alles im Bild bleibt, und den Moment mit einem Shot zeigen, der lang genug steht (1,5–2,5 s).

## Massen

(instanziert, bis ca. 600 Figuren):
- Aufruf: `horde({kind:'zombie'|'human', n, from:[x,z], r, to:[x,z], stop, pile, around, t0, t1, speed:[a,b], mode:'shamble'|'walk'|'run', rise, wait:{line:[[x,z],[x,z]], until, stop, pile, climb}, lift:(t,i)=>dy, armsUp:(t,i)=>bool, skin, shirts, pants, eyes, scale, heroes, behave, trips, domino, blood, extras, vary, dedup})` → `{count(t)}`.
- Ablauf: Die Masse erscheint zwischen `t0` und `t1`, steigt aus dem Boden (`rise`), läuft zu einer Barriere (`wait.line`), drängt dort bis `until` und strömt dann zum Ziel. Mit `around: true` umzingelt sie es. Wer ankommt, bleibt stehen; Zombies hämmern dann.
- `kind: 'human'` setzt Hauttöne, bunte Shirts, dunkle Augen, `walk` und kein `rise`. `lift` lässt hüpfen oder Wellen laufen, `armsUp` reißt die Arme hoch (Jubel, Panik). Pro Mitglied variieren über `hash(i)`.
- Starren (v2.27): `gaze: { t, at: [x, y, z], spread: 0.8, turn: 0.7, tilt: 0.55, arms: 'down' | 'up', face }` – ab `t` (pro Mitglied bis `spread` s später) bleibt jeder stehen, dreht sich zu `at` und schaut hoch (Feuerwerk, UFO, Sonnenfinsternis); Zombies hören auf zu hämmern. `face: false` = nicht drehen; `h.hit()` geht danach wie gewohnt.

- **Simulation (v3.0, automatisch):** Die Wege oben sind der Plan, eine einmal vorab berechnete Massensimulation ist, was die Mitglieder tun: Jeder hält Abstand (niemand läuft durch einen anderen oder steht am Ziel in ihm), weicht Häusern, Zäunen, geparkten Autos und Figuren aus (vorausschauend, auf denselben Hitboxen wie die Figuren), beschleunigt und bremst weich und dreht sich mit begrenzter Geschwindigkeit. An einer Barriere (`wait.line`) entsteht echtes Gedränge: Die erste Reihe bleibt auf ihrer Seite, die Reihen dahinter drücken nach; ab `until` gilt die Barriere als durchbrochen. Ein fester Zaun ohne `wait` hält die Masse auf – vorher `knock()`/`breakApart()`. Bildgenau wiederholbar (30 Hz aufgezeichnet). `horde({ sim: false })` bzw. `CFG.crowdSim: false` = alte gerade Wege.
- **Panikwelle (v3.0):** Mit `flee: { t, at }` laufen die Mitglieder los, wenn die Nachricht sie erreicht – Nächste zuerst, eine Welle durch die Menge (`flee.wave` m/s, Standard 9; `wave: false` = alle fast gleichzeitig wie früher).
- **Köpfe (v3.0, automatisch):** Menschen haben meist Haare in natürlichen Farben, etwa jeder Fünfte Cap oder Mütze, Zombies teils strähnige dunkle Haare – keine Klon-Masse mehr. `hair: false` = ohne.
- **Heldenfiguren (v3.0):** `horde({ heroes: k })` (true = 4) macht die ersten k Mitglieder (die Spitze der Masse, die zuerst bei der Kamera ist) zu vollen Figuren mit Gesicht, durchgehenden Gliedern, Haaren und Kleidung in ihren Farben – für Nahaufnahmen auf die vorderste Reihe. Sie folgen derselben Simulation (gehen, rennen, stehen); während eines `h.hit()` übernimmt das Instanz-Mitglied. **Regel:** Bei Nahaufnahmen auf eine Masse immer `heroes: 3–6`.
- **Mocap (v3.8, automatisch):** Auch die Mitglieder von `horde` bewegen sich mit den Mocap-Clips: Menschen gehen mit Walk_Loop, Zombies mit Zombie_Walk_Fwd_Loop, nach Schrittweg getaktet (Füße rutschen nicht); Stehende mit Idle_Loop / Zombie_Idle_Loop (pro Mitglied versetzt); `run` und Fliehende (`flee`) joggen (ab 6 m/s Sprint), rennende Zombies behalten die ausgestreckten Arme. Verhalten (Zögern, Umschauen, Ausfallschritte, Hämmern, Arme hoch, Staunen) liegt obendrauf; bei Treffern, Stolpern, Klettern und beim Aufstehen aus dem Boden blendet Mocap weich aus. `horde({ mocap: false })` bzw. `CFG.mocap: false` = eigene Posen. Test: `tests/crowd-mocap`.
- **Verhalten (v3.3, automatisch):** Jedes Mitglied zögert ab und zu (wird langsamer, bleibt kurz stehen, schaut sich um), Menschen schauen beim Gehen umher, Zombies machen Ausfallschritte (kurz schneller, Arme vor, Oberkörper nach vorn) und zucken mit dem Kopf. Läuft als eigene Uhr auf dem Plan: Wer gezögert hat, holt danach mit höchstens 15 % Mehrtempo auf. Fliehende zögern nie. `behave: false` = aus.
- **Stolpern und Stürze (v3.3, automatisch):** Wer im Gedränge läuft, stolpert gelegentlich, fällt nach vorn (Arme fangen ab), bleibt kurz liegen und steht wieder auf. `trips` = Stürze pro Sekunde und gedrängtem Mitglied (Standard Zombies 0,015, Menschen 0,02; 0 = aus). Liegende (gestolpert oder per `h.hit()` umgeworfen) sind Hindernisse: Die anderen gehen außen herum oder fallen über sie (`domino` = Chance pro Begegnung, Standard 0,45). Höchstens 6 % der Masse stürzt; Heldenfiguren stolpern nicht.
- **Über eine Mauer klettern (v3.3):** `wait: { line, climb: true | { h, rate, bodies } }`. Die Masse drückt gegen die Mauer. Wo der Druck ist, wächst ein Hügel aus Körpern (`rate` m/s, Standard h/5). Die Mitglieder klettern ihn mit erhobenen Armen und strampelnden Beinen hinauf. Sobald ein Abschnitt die Mauerhöhe `h` (Standard 2,6 m) erreicht, quellen sie oben drüber, fallen auf der anderen Seite herunter und laufen weiter zu `to`. `until` ist dabei optional (bricht zusätzlich zu einer festen Zeit durch). Die Mauer dazu baut `wall()` (siehe **Props**). Test: `tests/crowd-behave`.
- **Mehr Abwechslung (v3.3, automatisch):** offene Jacken (Menschen ca. 38 %, Zombies 20 %; Ärmel in Jackenfarbe), bei Zombies zerrissene Hemdfetzen und Blutflecken auf Brust und Kinn, Zombie-Hosen in fünf Farben, mehr Streuung bei Größe und Haltung. `blood: false` = ohne Blut, `extras: false` = keine Jacken, Fetzen, Blut; `vary: false` = Größe/Haltung wie vor v3.3. Stehen oder gehen zwei gleich aussehende Mitglieder nebeneinander, bekommt eines nach der Simulation einen anderen Hemdton (`dedup: false` = aus; Heldenfiguren bleiben unverändert).
- **Fernstufe (v3.3, automatisch):** Mitglieder, die im fertigen 2K-Bild kleiner als `CFG.crowdFarPx` (Standard 28 px) sind, lassen Augen, Mund, Haare, Mütze, Jacke, Fetzen, Blut und Füße weg (spart Rechenzeit bei riesigen Massen in Totalen). Bei Kameras mit `follow`/`pov` bleibt alles in voller Stufe. `CFG.crowdLod: false` = aus.
- **Simulation (v3.3):** Wer gerade auftaucht, macht Platz (niemand steigt in einem anderen aus dem Boden; Startpunkte werden auseinandergeschoben, `spread: false` = alt). Mitglieder, die noch nicht erschienen sind, sind keine unsichtbaren Hindernisse mehr. Läufer bremsen hinter dem Vordermann auf dessen Tempo, statt aufzulaufen. Mehrere Nachbarn schieben zusammen höchstens ca. 1 m/s. Vor einer Barriere wird abgebremst statt hart gestoppt.
- **Prüfung (v3.3):** `QA: crowd #k: … stops or starts dead` / `… whips round` (Mitglied hält schlagartig an, startet aus dem Stand oder dreht sich in einem Ruck) und `QA: crowd #k: … identical-looking members side by side`. Debuggen: `--probe "hordes[0]._dbg(i, t)"` → Startzeit, Plan- und Simulationsposition, Sturz.
## Partikel und Licht

- `emit(kind, {at:[x,y,z] | t => [x,y,z], t0, t1, rate | burst, size, jitter, …})` mit kind = fire · smoke · spark · debris · dust · goo · confetti · rain · snow. Mit einer Funktion als `at` wandert die Quelle mit (Schweif, Düse).
- `glow(x,y,z,{t0, intensity, dist, color})` ist ein flackerndes Licht. Höchstens 3–4 Punkt- oder Spotlichter pro Szene.
- Partikel klein halten (fire 0.4–0.7, dust ≤ 0.4) und nicht direkt vor die Kamera setzen. Rauch, Staub und Feuer sind weiche Wolken, die ein- und ausblenden und nachts dunkler werden.
- Wetter und Licht: `fogBank({at:[x,z], r, density, drift})` (Bodennebel: Morgen, Sumpf, Horror), `lightShafts({at:[x,z], n, top, len, opacity})` (Lichtstrahlen durch Wolken, Bäume, Fenster, Staub), `lensRain(t0, t1, stärke)` (Tropfen auf der Linse, zu `emit('rain')` in Nahaufnahmen). Jedes nur dort, wo es die Stimmung trägt.

## Sound

(`AUDIO`):
- `score: [[t, mood], …]` (Moods siehe Abschnitt 2), `mood` nur noch als Fallback. `amb: [[t0, t1, kind, vol]]` für Hintergrundgeräusche, `ambVol` (Standard 0.7) für deren Gesamtlautstärke. Automatisch dazu kommen Steves Jingle (`who: 'steve'`), Posaune bzw. Ding beim Stempel und der Seufzer (`sigh: true`).
- `sections: [[t, 0..3]]` steuert die Intensität: 0 = Pad, 1 = + Bass, 2 = + Drums/Lead, 3 = voll.
- `hits: [{t, k, v, dur, p}]` mit k = boom · impact · whoosh · riser · groan · horde · heartbeat · crack · fire · ticks · tick · ding · stinger · pop · alarm · glitch · thunder · splash · wind · engine · explosion · laser · coin · door · applause · fireworks · confetti. Für boom, impact, whoosh, riser, thunder, splash, explosion, ding, stinger, pop, alarm, coin, ticks, drop, door, applause, fireworks und confetti spielt die Engine echte Aufnahmen (CC0, `sfx/` im Repo), teils mit dem Synth-Klang gemischt.
- Weitere Sounds setzt die Engine bei den Funktionen selbst: Kampf (shot · rifle · shotgun · minigun · cannon · missile · jet · twang · clang · slash · punch · daze …), Fallen (snap · boing · saw · buzz · beep · rumble · hiss), Tiere (roar · growl · howl · trumpet · neigh · moo · bleat · oink · bark · meow · squawk · caw · screech · tweet · hoot · quack · honk · flap · chomp · click · song · blow · hooves). Von Hand als `hits` nur, wenn kein Aufruf sie auslöst (z. B. ein Vogelruf im Hintergrund).
- Whooshes für Übergänge und `drop` für Zeitlupen setzt die Engine selbst, nicht doppelt eintragen. Ein riser startet bei Schnitt minus dur. `stinger` gehört auf die Endcard. Laute Hits ducken die Musik automatisch, die Stimme auch (`AUDIO.duck`, Standard 0.38 = Musik auf 38 %).

## Performance

Props sind statisch und werden beim Start zu wenigen Meshes verschmolzen (`bake`, siehe `baked` in der Zeile `scene:`). Eigene unbewegte Bauten mit `stat(grp(…))` markieren, dann zählen sie nicht ins Budget. Wer einen Prop oder ein Teil davon per eigenem `tick` bewegt, ruft vorher `dyn(obj)` auf, sonst friert es ein; `walk`/`appear`/`vanish`/`knock` tun das selbst. Ziel: unter ca. 300 bewegte Meshes. Wiederholtes läuft über `field`/`horde`/`emit`/`city`. Eigene Objekte aus Primitiven bauen: Low-Poly, flatShading, satte Farben.

# Erklär-Werkzeuge (CFG.kind: explain · conspiracy)


## Werkzeuge (Engine v2.6; Zeiten sind Videozeit wie in `BEATS`, `'b3+0.4'` geht)

- `CALLOUTS = [{ t, dur, at, kind, text, sub, side, value, fmt }]` in der Story oder `callout(at, t, o)` in der Szene: Punkt mit Linie (`label`), großer Pfeil (`arrow`), Kreis (`ring`, `r` in m oder `size`), Chip über dem Objekt (`tag`). `at` = Track-Name, `[x,y,z]`, `t => [x,y,z]` oder Rig. Labels bleiben im sicheren Bereich, wechseln die Seite, wenn es eng wird, und weichen einander aus. Live-Wert: `text: 'Falling at {v}', value: t => …, fmt: 'speed'`. Text 1–3 Wörter, höchstens 3 Callouts gleichzeitig.
- `FREEZE = [{ t, dur: 1.5–2.5, label: '0.001 seconds in', sub }]`: Die Szene steht, Kamera, Stimme und Captions laufen weiter (ein Orbit wirkt am besten), Farbe weicht, weißer Rahmen + Chip. Danach läuft die Szene `dur` s hinter dem Video: Szenenzeiten nach dem Standbild als `ST(videoZeit)` schreiben.
- `xray(rig, { t0, t1, path: 'bolt' | 'venom' | 'blood' | [Gelenke], grow: [a, b] })`: Körper gläsern, Skelett sichtbar, leuchtender Pfad (Strom, Gift, Blut) mit Pulsen. `t0` ca. 0,35 s vor einem Standbild setzen, damit es darin voll sichtbar ist.
- `layers(world, x, y, z, { r, kind: 'earth' | 'moon' | 'sun' | 'plain', layers, cut: 90 | 180, face, open: [t0, t1], tunnel, labels: { t, every, dur } })`: aufgeschnittene Kugel mit Schichten, Deckel hebt ab; `E.at(i)` liefert Anker für eigene Callouts. Kamera mindestens 4–5 × r entfernt, `face` zur Kamera drehen. `tunnel` nur in Halbtotalen (in Nahaufnahmen wirkt er wie ein Strich).
- `strata(world, x, z, { w, d, layers: [{ h, color, name, opacity }], top, labels })`: Querschnitt-Block (Boden, Treibsand mit durchsichtiger Schicht, Schnee, Meerestiefe); Vorderseite = +z.
- `RULER = { label, show, hide, min, max, fmt, value | keys, marks: [[8849, 'Everest'], …], invert }`: Skala links mit Zeiger, Marken leuchten beim Passieren auf. Marken mindestens 8 % der Skala auseinander.
- `FACTS`, `MYTH`, `GUESS`: Karten in der Mitte; Captions rutschen dann ins untere Drittel, Callouts und Lineal blenden aus. Pro Video 1–2 Faktenkarten, höchstens eine Mythos-Karte und eine Rate-Frage; Karten nie über das Schlüsselbild legen.
- `STEPS = [[t, 'The heat'], …]`: nummerierter Schritt-Chip neben der Badge statt `PHASES`.
- Globus (v2.7): `globeMark(planet, lat, lon, { t0 })` (Pin mit Puls-Ring), `globeArc(planet, [lat, lon], [lat, lon], { t0, t1, h })` (Bogen, der sich zeichnet: Route, Flugbahn), `globeArea(planet, [[lat, lon], …], { t0, color })` (Fläche, z. B. Bermuda-Dreieck) auf `planet()` und `layers()`; alle liefern einen Anker für `callout()`. lon 0 zeigt nach +z, die Kamera also auf die +z-Seite stellen und den Planeten mit Abstand ≥ 4 × r zeigen.
- Größenvergleich (v2.7): `lineup(world, x, z, [{ kind, h, label }], { labels: { t, every, dur } })` stellt Dinge in echter Höhe nebeneinander (human, dog, cow, car, bus, truck, house, tree, palm, tower, lighthouse, silo, rocket, pyramid, plane, ship, whale, block), mit Höhen-Chips; `...L.shot(t, dur)` in `CAM` fährt vom Kleinsten zum Größten. Höchstes Objekt ≤ ca. 400 m, größere Vergleiche über `RULER`.
- Zeitleiste (v2.7): Zähler `type: 'timeline'`, `from`, `to`, `marks: [[1969, 'Apollo 11'], …]`, Wert = Jahr (`fmt: 'year'`, negativ = BC).
- Kamera auf einen Anker (v2.8): `focusShot(anker, t, dauer, { dist, az, el, center, fov, push })` in der Szene fügt einen Schnitt mit langsamem Push-in in `CAM` ein, z. B. auf ein Pinnwand-Foto (`B.item(2)`, `dist: 1.6`), einen Globus-Pin (`center` = Planetenmitte, dann schaut die Kamera von außen drauf), eine Schicht oder ein Lineup-Objekt. Spart lange Kamera-Listen.
- Planeten (v2.8): `planet()` ist jetzt glatt mit weichen Wolken und Atmosphärenrand (`smooth: false` = alter kantiger Look).
- Loop-Ende: seit v2.23 nahtlose Überblendung statt Wisch, siehe „Neu in v2.23“ unten.
- Zähler mit Einheiten: `fmt: 'speed' | 'dist' | 'height' | 'depth' | 'temp' | 'mass'` (metrisch eingeben, zeigt z. B. „195 km/h · 121 mph“); `type: 'graph'` zeichnet die Kurve (z. B. Fallgeschwindigkeit bis zur Endgeschwindigkeit, `mark` = Grenzwert).

# Neu in v2.16

## Reiten
`ride(rig, tier, {t0, t1, saddle, saddleColor})` setzt eine Figur (oder einen `warrior`) rittlings auf ein `beast` von t0 bis t1: Sattel mit Steigbügeln und Zügeln (Elefant und Mammut: Sänfte), Beine gespreizt, Hände am Zügel (Krieger behalten ihre Waffenhaltung). Die Figur reitet jeden Gang, Sprung und Drachenflug mit; vor t0 und nach t1 springt sie im Bogen auf bzw. ab. Geht mit horse · zebra · donkey · camel · elephant · mammoth · bull · cow · moose · deer · reindeer · bear · lion · tiger · trex · triceratops · brachio · dragon. `tier.riders` listet die Reiter. Figuren aus `figure()` müssen nicht vorher in die Welt gesetzt werden.
Beispiel: `const hs = beast({ kind: 'horse' }); walk(hs, [[-40, 0], [40, 0]], { speed: 12 }); ride(warrior('knight', { seed: 2 }), hs);`

## Dinosaurier und Monster
`beast({kind})` kennt zusätzlich: trex (13 m, Zweibeiner mit kleinen Armen, Zahnreihen, Laufgang) · raptor (Zweibeiner, Federkamm, Streifen) · triceratops (Nackenschild, drei Hörner, Schnabel) · stegosaurus (Rückenplatten, Schwanzstacheln) · brachio (Hals ca. 8,5 m) · mammoth (Zottelfell, gebogene Stoßzähne) · dragon (Flügel, Hörner, Rückenstacheln). Alle laufen mit `walk` (T-Rex rennt bis ca. 9 m/s, Raptor bis ca. 15 m/s) und kennen die Aktionen aus **Tiere** (roar, snap, charge, stand …); die Laute sind echte Aufnahmen.
Drache: `fly(dg, [[x,y,z], …], {t0, speed})` – die Flügel schlagen im Flug, am Boden sind sie angelegt, die Beine werden im Flug angezogen. `dg.do('breath', t, {dur, at, down})` speit einen Feuerstrahl mit Glut und Rauch (auch im Flug), `at` = Ziel, das danach brennt. Im `shot` bei Dinos `dy` setzen (T-Rex 3, Raptor 0.8, Brachio 6).

## Seeungeheuer
`tentacles({at: schiff | [x, z], n, t0, rise, h, r, grab, drag, dragDur, color})`: Krakenarme steigen um ein Schiff aus dem Wasser (`rise` s), winden sich, packen bei `grab` zu (rollen sich um den Rumpf) und ziehen das Schiff ab `drag` in die Tiefe (`sink` mit Krängung über `dragDur` s). Ohne Schiff stehen sie um den Punkt `[x, z]`.

## Schiffe sinken
`sink(S, t, {mode, dur, depth, angle, side, lifeboats, debris, smoke, sfx})` lässt ein Schiff untergehen: `bow` (Bug zuerst, Heck steigt aus dem Wasser, Titanic) · `stern` · `list` (legt sich auf die Seite, `side` ±1) · `capsize` (kentert kieloben). Dazu Gischt entlang des Rumpfs, Strudel am Ende, Rauch, Ächzen und Gurgeln. Große Schiffe (> 60 m) setzen 4 Rettungsboote mit verängstigten Passagieren aus, die wegrudern (`lifeboats`), Trümmer und Rettungsringe treiben (`debris`). Funktioniert mit `bob` und `sail`. Totale aus ca. 1,2 × Schiffslänge.
`board(S, rig, i)`: Sitzplätze setzen die Figur automatisch hin (Ruderboot, Wikinger rudern mit), Stehplätze an Deck; das Wikingerschiff hat 12 Ruderer + Steuermann. Der Träger zeigt geparkte Jets auf dem Deck (`ship('carrier', x, z, {planes: 8})`, `0` = keine).

## Start, Landung, Bruchlandung
- `takeoff(A, {at: [x, z], dir | to: [x, z], t0, roll, speed, climb, alt, dist})` → Abhebezeitpunkt: rollt von `at` aus an (beschleunigt aus dem Stand), hebt nach `roll` m ab, steigt mit `climb` (rad) auf `alt` m; Staub auf der Bahn, Fahrwerk klappt oben ein.
- `land(A, {at, dir | from, t0, speed, alt, glide, roll})` → Aufsetzzeitpunkt: Anflug im Gleitwinkel, Aufsetzen mit Staubwolke, Ausrollen bis zum Stand. `t0` darf negativ sein, damit die Maschine schon im Anflug ist.
- `crashLand(A, {at, dir | from, t0, speed, alt, skid})` → Stillstand: Bauchlandung ohne Fahrwerk, Funken, Staub, Trümmer, Shake, danach Rauch und kleines Feuer.
- `fly()` hat dafür `ramp` (Beschleunigen über s, ab `v0`), `stop` (Abbremsen bis zum Stand am Bahnende). Vögel und Drachen starten und landen damit automatisch weich.
- Eine Startbahn ist ein flacher `box` (z. B. 500 × 45 m, dunkelgrau) mit Mittellinie; Flugzeuge stehen mit `A.gy` (Fahrwerkshöhe) richtig auf dem Boden.

## Hubschrauber
`heli(p, {kind, x, y, z, ry, color, scale, rpm, spotPitch, downwash})` mit kind = news (Kamera-Kufe) · police (Suchscheinwerfer mit Lichtkegel, `spotPitch`) · rescue (Seilwinde) · attack (schmaler Kampfhubschrauber, Raketenbehälter als `hard`-Punkte für `missile`, Kinnkanone für `strafe`) · transport (Tandemrotor, Heckrampe). Rotoren mit Bewegungsunschärfe-Scheibe, Heckrotor, Nase senkt sich beim Vorwärtsflug, Schweben wippt, Blinklicht; unter 18 m wirbelt Staub auf (`downwash: false` aus).
Aktionen: `H.winchDown(t, len, dur)` lässt das Seil ab, `hang(rig, H, t0, t1)` hängt eine Figur an den Haken (Arme hoch), `H.rampOpen(t)` (Transport). `heliSound(H, t0, t1, vol)` legt das Rotorgeräusch über die Zeit. Bewegung mit `fly(H, pts, {speed})`; `heli(…, {legacy: true})` gibt das alte Modell.

## Echte Tierlaute und Effekte
Echte Aufnahmen (CC0 / Public Domain, Quellen in `sfx/README.md`) für roar · growl · howl · trumpet · neigh · bray (Esel) · song (Wal) · caw · squawk · meow · bleat · trex · raptor · monster (Drache) · wingflap · heli · sinking. Die Tieraktionen und Funktionen spielen sie selbst; von Hand als `hits` (`{t, k, v, dur}`).

## Detailstufen (LOD)
Kleine Teile ferner Tiere (Zähne, Krallen, Muster) blenden automatisch aus, wenn das Tier weiter als `CFG.lodFar` (Standard 70) × seine Größe entfernt ist. Eigene große Modelle: `lodRegister(root, größe_m)`.

# Neu in v2.17

## Hände
Jede Figur hat Hände mit Fingern (Handfläche, drei Finger, Zeigefinger, Daumen). `hands(rig, pose, t0, t1, { side: 'L' | 'R' | 'both' })` mit relax · open · fist · point · thumb · grip · claw · loose · spread. Automatisch: Waffen, `carry`, Taschenlampe, Handy und gehaltenes Essen greifen zu, Zombies krallen, Panik spreizt, Rennen ballt locker, `react` (wave, facepalm, shrug, startle) öffnet die Hände.
`gesture(rig, t, kind, { dur, at })`: thumbsup · fistpump · clap (mit Klatschen) · salute · shush · beckon · stop · point (dreht sich zu `at`) · peace · cross (Arme verschränkt). `faceTo(rig, ziel, t0, t1)` dreht eine stehende Figur zu einem Rig oder Punkt.

## Neue Bewegungen
- `walk(rig, pts, { mode })` kennt zusätzlich crawl (auf allen vieren, ca. 0,6 m/s) · sneak (geduckt schleichen, ca. 1 m/s) · tiptoe · limp.
- `climb(rig, { at: [x, z], ry, y0, y1, t0, speed, ladder })` → Endzeit: Hand über Hand eine Leiter hinauf (baut die Leiter, `ladder: false` für eine Wand); oben bleibt die Figur stehen.
- `stairs(p, x, z, { n, rise, run, w, ry, rail })`: Treppe Richtung +z mit Geländer; `walk` läuft automatisch die Stufen hinauf (nach `ground()` bauen).
- `stumble(rig, t, { fall, dir, getUp })`: stolpert mit rudernden Armen, mit `fall: true` hinfallen und bei `getUp` aufstehen.
- `slide(rig, t0, t1, { kind: 'knees' | 'belly' | 'butt' | 'surf', spray: 'water' })`: Pose, während `walk` die Figur weiterträgt (Knie-Rutscher, Bauchrutscher auf Eis, Po-Rutsche, Surf-Haltung), mit Staub oder Gischt.
- `dance(rig, t0, t1, { style, bpm })`: bounce · hype · disco · robot · floss · twist · wave, im Takt (Standard 120 bpm).
- Wasser: `paddle(rig, pts, { t0, speed, level })` schwimmt Kraul an der Oberfläche mit Spritzern; `tread(rig, t0, t1, { at, level })` tritt Wasser, Kopf über Wasser.

## Figuren zusammen
`hug(a, b, t0, t1)` · `highFive(a, b, t)` (Klatschen, kleiner Funkenstoß) · `handshake(a, b, t0, t1)` · `piggyback(träger, reiter, t0, t1)` (Träger mit `walk` bewegen) · `pull(a, b, t0, t1)` (a zieht b an der Hand, beide laufen) · `shove(a, b, t, { power, getUp })` (b stolpert zurück, ab power 1,5 fällt er) · `chat(a, b, t0, t1, { turns })` (wenden sich zu, der Sprecher gestikuliert und bewegt die Lippen, der Zuhörer nickt). Die beiden müssen nicht exakt stehen: sie drehen sich zueinander und rücken auf den passenden Abstand.

## Figuren und Tiere
`pet(rig, tier, t0, t1)` (hockt sich bei kleinen Tieren hin, streichelt; Hunde wedeln) · `feed(rig, tier, t, { item })` (hält Futter hin, das Tier frisst; Standard Karotte bzw. Knochen) · `fetch(rig, hund, t, { to })` → Rückkehrzeit (wirft einen Stock, der Hund holt ihn und bringt ihn zurück) · `lead(rig, tier, pts, { t0, speed, gap })` (führt ein Pferd am Zügel, das Tier folgt) · `perch(vogel, ziel, t, { from, off: 'head' })` (Vogel fliegt herbei und landet auf Schulter, Kopf oder Punkt und reitet mit).

## Cartoon-Schauspiel
- `boing(obj, t, { amp, dur })`: Stauchen und Strecken mit Nachwippen.
- `faceFx(rig, kind, t0, t1)`: sweat · tears · blush · steam · question · exclaim · hearts · zzz · anger.
- `soot(rig, t)`: nach einer Explosion schwarzes Gesicht und Kleidung (Augen bleiben weiß), verkokelte Afro-Haare, Rauchkringel. `wet(rig, t0, { t1 })`: klitschnass, dunkler, glänzend, tropft.
- `idle(rig, t0, t1, kind)`: tap · cross · scratch · watch · shift · hips · stretch · pocket; `idleMix(rig, t0, t1)` streut zufällige kleine Aktionen.
- `holdItem(rig, obj, t0, t1, { side, off, rot, after: 'rest' | 'hide' | 'free' })`: beliebiges Objekt in der Hand.

## Essen und Trinken
`food(p, kind, x, y, z, { state, scale, ry, plate, still, t0 })` → F. Kinds: pizza · slice · burger · fries · hotdog · taco · sushi · ramen · cake (`candles`, `F.blow(t)`) · cupcake · donut · icecream (`scoops`) · popcorn · apple · orange · banana · watermelon · grapes · carrot · strawberry · bread · baguette · croissant · pretzel · cheese · cookie · chocolate · candy · lollipop · steak · drumstick · egg · pancakes · sandwich · pie · tomato · spaghetti · bone · fish; Getränke cup · can · mug · glass · bottle · milkshake · juicebox; Geschirr plate · bowl · tray · board · fork · knife. `plate: true | 'bowl' | 'tray' | 'board'` stellt es auf Geschirr. Keine Marken: Farben über `color`, `band`.
Zustände (`state`): fresh · steam · burnt (dunkel, raucht) · frozen (Eisblock) · moldy (grüne Flecken, Mief) · melting (tropft, Pfütze wächst ab `t0`) · bitten. Deko-Essen (Regale, Theken) mit `still: true`: spart Rechenzeit.
- `eat(rig, F, t0, { bites, every, side, after })` → Endzeit: nimmt es, beißt (jeder Biss nimmt ein Stück weg und zeigt das Innere, Krümel, Kauen mit Lippen, Crunch), danach weg (`after: 'hide'`) oder zurück (`'rest'`).
- `drink(rig, F, t0, { sips })`: zum Mund, kippen, Kopf zurück, Schlürfen und Schlucken; Dosen zischen beim Öffnen.
- `foodFight(von, ziel, t, { kind: 'pie' | 'tomato' | 'spaghetti' | …, h })` → Aufprallzeit: Wurf mit Ausholen, Flugbahn, Klecks im Gesicht (bei einem Rig) oder auf dem Boden, Spritzer, Splat, Reaktion.
- Kochen: `pan(p, x, y, z, { item: 'egg' | 'steak' | 'pancakes', t0, t1, flip: [t…], burn })` (brutzelt, Fettspritzer, bräunt, Wenden durch die Luft) · `pot(p, x, y, z, { t0, boil, over, lid })` (Blasen, Dampf, klappernder Deckel, kocht über) · `toaster(p, x, y, z, { pop, h })` · `grill(p, x, z, { t0, items, flare: [t…] })` · `campfire(p, x, z, { t0, size, light })` · `marshmallow(rig, feuer, { t0, t1, burn })` (bräunt, fängt Feuer, Erschrecken).
- Orte: `foodtruck(p, x, z, { ry, color, awning, vendor })` · `counter(p, x, z, { kind: 'fastfood' | 'bakery' | 'icecream' | 'cafe', w, ry, staff })` · `shelf(p, x, z, { kind: 'grocery' | 'drinks' | 'snacks' | 'produce' | 'cans', w, h, ry, sides })` · `buffet(p, x, z, { n, ry })`. Speisekarten zeigen Bilder statt Schrift.
- Neue Partikel: steam · crumbs · grease · drip · splat; neue Sounds: clap · crunch · munch · slurp · gulp · fizz · sizzle · boil.

# Neu in v2.18

## Zweiräder
`bike(p, { kind: 'bicycle' | 'motorcycle' | 'scooter' | 'skateboard', x, z, ry, color })` → V; bewegen mit `drive(V, pts, { speed, dust: false })` (Zweiräder legen sich in Kurven). `rideBike(rig, V, { t0, t1 })`: Fahrrad mit Tretbewegung passend zu den Rädern, Motorrad mit Händen am Lenker (Motor, Auspuffrauch), Tretroller mit Abstoßen, Skateboard seitlich stehend.

## Bahn
`rails(p, [[x,z], …])` (Schotter, Schwellen, Schienen) · `train(p, { kind: 'commuter' | 'subway' | 'steam' | 'freight', cars, x, z, ry })` → T · `run(T, { from, to, t0, speed, ramp, horn })` (fährt weich an und bremst, Dampflok raucht, Hupe) · `trainStation(p, x, z, { len, ry })` (Bahnsteig mit Kante, Dach, Bänken, Schildern, Uhr).

## Einsatz- und Baufahrzeuge
- `firetruck(p, x, z, { ry })` → F: `F.ladder(t0, t1, { yaw, pitch, extend })`, `F.spray(t0, t1, { at })` (Wasserstrahl aus dem Korb), Blaulicht, Sirene.
- `ambulance(p, x, z, { ry })` → A: `A.open(t)` (Hecktüren), Blaulicht.
- `excavator(p, x, z, { ry })` → E: `E.dig(t, { at, dump })` (graben, schwenken, auskippen mit Staub und Erde).
- `crane(p, x, z, { h, jib, ry })` → C: `C.move(t0, t1, { yaw, trolley, hook })`, `C.hookAt(t)` (Hakenposition, z. B. um etwas daran hängen zu lassen).
- `monstertruck(p, x, z, { color, ry })`: mit `drive` und `jumps`.
- `balloon(p, { x, y, z, colors, burn: [t…], passengers })` → mit `fly` bewegen (Brennerflamme, Passagiere).
- `stream(src, t0, t1, { dir, speed, n, size, color, glow })`: Strahl aus Tropfen auf echten Bahnen (Schlauch, Brunnen, Wasserpistole, Lava); `src`/`dir` dürfen Funktionen von t sein.

## Naturgewalten
`volcano(p, x, z, { r, h, erupt: t })` (Ausbruch: Explosion, Aschesäule, Lavabomben, Lavaströme, Leuchten, Beben) · `tornado(p, { x, z, path, t0, t1, speed, h, r })` (drehender Trichter mit Trümmern, Staub, Sturmgeräusch) · `avalanche(p, { from, to, t0, dur, w })` (Schneewalze mit Pulverwolke) · `earthquake(t0, t1, { at, amp, cracks })` (Kamerabeben, Risse öffnen sich, Staub) · `waterfall(p, x, z, { h, w, ry })` (Felswand, Wasser, Gischt, Becken) · `river(p, pts, { w, flow })` (Fluss mit treibendem Schaum, Ufersteine) · `cave(p, x, z, { r, len, ry, crystals })` (Höhle mit Tropfsteinen, leuchtende Kristalle).

## Kleintiere
`insects(kind, { at: [x,y,z] | rig, n, r, t0, t1, scatter })` mit bee · butterfly · fly · firefly · mosquito (folgt einem Rig, Summen) · `antTrail(pts, { n, speed })` · `spider(p, { x, z, size, web })` (mit `walk`) · `snake(p, { x, z, len, pattern: 'bands' | 'diamond' | 'plain' })` + `slither(S, pts, { t0, speed })`, `S.do('strike' | 'hiss' | 'rattle', t)` · `lizard(p, { x, z })` (mit `walk`) · `frog(p, { x, z })` + `hop(F, pts, { t0 })`, `F.do('croak' | 'tongue', t)`.

## Gebäude
`castle(p, x, z, { size, ry, flag, flag2 })` → `C.gate(t, open)` (Fallgitter und Zugbrücke) · `hospital(p, x, z, { floors, ry })` (blaues H-Schild, Liegendanfahrt) · `supermarket(p, x, z, { ry, color })` (Glasfront, Einkaufswagen, Regale innen) · `gasstation(p, x, z, { ry, color })` · `bank(p, x, z, { ry })` · `vault(p, x, z, { open: t })` (Tresortür schwingt auf, Goldbarren, Geldstapel) · `lab(p, x, z, { ry, w })` (blubbernde Kolben, Bildschirme, Leuchtprobe) · `prison(p, x, z, { cells })` → `P.openCell(i, t)` (Zellen mit Gittertüren, Zaun mit Stacheldraht, Wachturm mit Suchscheinwerfer) · `airport(p, x, z, { ry })` (Terminal, Fluggastbrücke, Tower).

## Alltag
- Bildschirme: `uiScreen(parent, w, h, kind, { t0, t1, from, to })` mit chat · notify · battery (leert sich, wird rot) · call · video · map · code · graph · dna · social; `phone(rig, { ui: 'chat' })` zeigt den Inhalt auf dem Handy, `laptop(p, x, y, z, { open: t, ui })`.
- Geld: `money(p, kind, x, y, z)` mit bill · stack · coins · coin · case · gold; `moneyRain(t0, t1, { at })` (Scheine regnen, Kassenklingeln).
- Sport: `sportsBall(p, kind, x, y, z)` mit soccer · basketball · football · tennis · volleyball · bowling · beach; `goal(p, x, z, { kind: 'soccer' | 'hoop' })`; `kickBall(rig, ball, t, { to })`, `throwBall(rig, ball, t, { to })`.
- Party: `balloons(p, x, y, z, { n, release: t })`, `discoBall(p, x, y, z)` (farbige Lichtkegel), `djDesk(p, x, z, { ry, dj: true })` (Plattenteller, Pegellichter, DJ).
- Musik: `instrument(rig, kind, t0, t1)` mit guitar · drums (Set mit Hocker) · keyboard · trumpet · mic; mit passendem Klang.

# Neu in v2.19

## Publikum und Massen
`audience(p, x, z, { rows, cols, gap, rise, ry, ola: { t0, t1, speed }, cheer: [[t0, t1], …], flee: { at: [x,z], t, speed, dir }, jostle, shirts, color, seat })` baut eine Tribüne voller Leute (eine instanzierte Masse), → `{ g, H, spots }`.
- `ola`: La-Ola läuft durch die Reihen, mit Applaus.
- `cheer`: Jubelfenster mit Hüpfen und Armen oben.
- `flee`: Panik ab `t`. Alle rennen die Reihe entlang, weg von `at`, steigen am Tribünenende herunter und laufen weiter.

`horde()` hat dafür neue Optionen:
- `spots: [[x, z, yaw, y], …]`: feste Plätze (Schlange, Zuschauer, Wartende), `n` ergibt sich daraus.
- `face: [x,z]`: alle schauen dorthin.
- `ola: { t0, t1, speed, axis: 'x' | 'z', period }`.
- `jostle`: leichtes Schunkeln und Drängeln, Stärke 0–1.
- `flee: { at, t, speed, path(i, d, q) → [x, z, y, yaw] }`: mit Reaktionsverzögerung je Person.

## Kamera-Moves
Sie wirken zusätzlich zu `CAM`:
- `vertigo(t0, t1, { amount })`: Dolly-Zoom (Hitchcock). Die Figur bleibt gleich groß, der Hintergrund zieht sich zusammen; `amount < 0` kehrt das um. Mit Riser.
- `crashZoom(t, { dur, amount, hold })`: blitzschneller Zoom auf das Motiv, mit Whoosh.
- `droneShot(t0, t1, [[x,y,z], …], { look: [x,y,z] | trackName | 'ahead', roll, tilt })`: weicher Drohnenflug durch Punkte, legt sich in Kurven.
- `shaky(t0, t1, { amp })`: Handkamera-Action mit Wackeln und Rollen.

## Flüssigkeiten
- `pour(rig | [x,y,z], t0, t1, { to: [x,z], color, puddle })`: gießt aus der rechten Hand (Gefäß mit `holdItem`, `rot` kippt es) und bildet eine Pfütze.
- `gush(at, dir, t0, t1, { speed, w })`: Wasser schießt durch eine Tür, ein Rohr oder ein Fenster.
- `floodRoom({ x, z, w, d, ry }, t0, t1, { h })`: Wasser steigt in einem Raum, Wände baut die Szene; → `{ level(t) }`.

## Seile und Schaukeln
- `rope(a, b, { sag, len, segs, r, color })`: hängendes Seil zwischen Punkten, Figuren (rechte Hand), Objekten oder `t => [x,y,z]`, wird jedes Bild neu berechnet; → `{ mid(t) }`.
- `swingSet(p, x, z, { h, t0, amp, rider, color })`: Schaukel mit Pendel, Reiter greift die Seile und schwingt die Beine.
- `ropeBridge(p, [x,z], [x,z], { y, w, sag, walkers: [rig] })`: Hängebrücke aus Planken, die unter den Gängern nachgibt und federt. `walk()` darüber hält die Füße auf den Planken (der Start muss auf der Brücke liegen).

## Wackelpudding, Feuer, Glas
- `jello(p, x, y, z, { color, poke: [t, …], scale })`: Wackelpudding auf Teller; jeder Stups lässt ihn nachwabbeln.
- `burn(obj | [x,y,z], t0, { size, dur, charTime, char: false })`: Flammen, Rauch, Glut und Knistern; das Objekt verkohlt.
- `spreadFire([obj | [x,y,z], …], t0, { speed })`: Feuer springt von einem zum nächsten (Kisten, Vorhänge, Gras).
- `crackGlass([x,y,z], t, { size, ry })`: Spinnennetz-Riss in einer Scheibe, mit Knack.

# Neu in v2.20 (Zuschauerbindung und Ton)

## Flash-Forward
`TEASE = [{ t: 'b5', dur: 0.6, at: 'b11+0.4', label: 'Later tonight' }]` in der Story: Für `dur` s zeigt das Bild Szene und Kamera zur Videozeit `at` (meist der Höhepunkt). HUD, Zähler, Stimme und Captions laufen in Videozeit weiter; weißer Blitz und Whoosh beim Hinein- und Hinausspringen kommen automatisch, `label` erscheint als kleiner Chip über der Mitte. Einmal pro Story-Video in den Durchhänger bei ca. 40–55 % der Laufzeit legen, `at` mitten in einen Shot des Höhepunkts (nicht auf einen Schnitt). `rate` (1) verlangsamt oder beschleunigt den Ausschnitt.

## Serien-Rückblick als Chip
`CFG.series.prev = { q, opts, pick }` zeigt ab v2.20 standardmäßig (`mode: 'chip'`) nur einen kleinen Chip „You chose: Cellar ✓“ neben der Badge (`dur` 3,5 s); Captions und Action laufen ab Frame 0 normal. `mode: 'card'` = alte Vollbild-Endcard der Vorfolge (assemble.py warnt).

## Ende über laufender Szene, Loop immer an
- `CFG.endDim` (0,38, vorher fest 0,55): Abdunklung unter der Endcard; Ende „dead“ mindestens 0,7. Die Kamera soll unter den Karten weiterfahren (kein Standbild).
- `CFG.loop` ist standardmäßig an; `loop: false` schaltet es ab. Seit v2.23 Überblendung statt Wisch (unten).

## Musik nur, wenn sie passt
- `AUDIO.mood: 'none'` oder `AUDIO.score: false` = keine Musik, nur Hintergrundgeräusche und SFX (die Geräusche werden dann etwas lauter gemischt). Einzelne Abschnitte gehen auch: `score: [[0, 'none'], [21, 'tense']]`.
- Neue Hintergrundgeräusche (`AUDIO.amb`): `cabin` (Flugzeugkabine mit Anschnall-Gong) · `hum` (Neonröhren, Serverraum, Backrooms) · `people` (Stimmengewirr: Mall, Büro, Straße) · `stadium` (jubelnde Menge, Pfiffe) · `underwater` (dumpfer Druck, Blasen) · `forest` (Blätter, Vögel, Insekten, Specht) · `cave` (tiefer Raum, Tropfen mit Echo, Grollen). `crowd` bleibt das Zombie-Gemurmel.
- Fehlt ein Geräusch: im Objekt `AMB` im Sound-Abschnitt von `template.html` als neue Art bauen (Bausteine `bed`, `every`, `tone`, `nz`) und mitcommitten. `assemble.py` warnt bei unbekannten Stimmungen und Geräuscharten.

## assemble.py-Hinweise (v2.20)
Story-Video über 58 s · Endcard + Loop über 6,5 s · `loop: false` · kein `TEASE` ab 40 s · Rückblick als Vollbild-Karte · unbekannte Musikstimmung oder Geräuschart.

# Neu in v2.21 (Minen und Warnschilder)

## Springmine (Erklärvideos zu Minen, Weltkrieg, Kampfmittel)
- `boundingMine(p, x, z, { scale: 1, t, launch, h: 1, burst: true, size: 0.7, rust, buried: true, y, xray: [t0, t1], ry })`: Springmine wie die „Bouncing Betty“: Stahlbehälter im Abschussrohr, nur die drei Zünderstifte schauen aus dem Boden. `t` = Stifte werden gedrückt (Klick), `launch` = eine kleine Ladung schießt den Behälter senkrecht hoch (Staub, Dumpfschlag), er erreicht `h` m und zerplatzt dort (`burst: false` = Blindgänger, fällt zurück und kippt um). `xray` macht Hülle und Rohr gläsern und zeigt die Teile (Treibladung, Hauptladung, Stahlkugeln). `rust: true` = alter, rostiger Fund; `buried: false` steht sie frei auf dem Boden, `y` setzt die Höhe (z. B. Oberkante eines `strata`-Blocks). Nur schematisch, keine Bauanleitung.
  → `{ g, can, launch, apex, height(t), at: { prongs, can, charge, tube } }`; `at.*` sind Anker für `callout()`, `height(t)` speist ein `RULER` (`LIVE.h = t => …`).
- `warnSign(p, x, z, { kind: 'mines' | 'danger' | 'keepout', text, ry, h: 1.1, size: 0.62, rust })`: rotes Dreiecksschild mit Totenkopf und Text auf einem Pfosten; mit `appear(S.g, t)` einblenden. → `{ g, at }`
- `markerFlag(p, x, z, { color, t, h: 0.6 })`: kleines Markierungsfähnchen (Fundstelle), poppt bei `t` auf.
# Neu in v2.22

## Haus-Fallen und Heimverteidigung
- `marbles(p, x, y, z, { w, d, n, r, colors, seed, spill: { t0, t1, from: [x,y,z], jar } })` → M: bunte Glasmurmeln auf einem Boden (instanziert). `spill` = aus einem gekippten Glas (`jar: false` ohne Glas) geschüttet, sie springen auf und rollen an ihren Platz (Klackern kommt automatisch). `M.kick(x, z, t, { r, power })` lässt Murmeln um einen Punkt wegrollen.
- `slip(rig, t, { dir: 'back', getUp, dazed, on: M })`: Cartoon-Ausrutscher (Murmeln, Banane, Eis): Füße schießen nach vorn, Arme rudern, Landung auf dem Rücken mit Sternchen; `on: marbles` lässt die Murmeln unter den Füßen wegspritzen. Davor die Figur mit `walk` genau zum Ausrutschpunkt laufen lassen (`t1` = t).
- `trapFloor(p, x, y, z, { w, d, ry, open: t, close: t2, split: 'x' | 'z' | false, color })`: ein ganzer Dielenboden, der wegklappt (zwei Hälften an den Außenkanten, Bombenschacht-Prinzip), `close` klappt ihn wieder hoch. Den Raum dazu mit `interior({ floor: false })` bauen, den restlichen Boden als `box` setzen und darunter einen Keller (`interior({ kind: 'cellar', y: -2.9 })`). Massen fallen mit `horde({ lift: (t, i) => t > T ? -Math.min(2.9, 4.9 * (t - T) ** 2) : 0 })` hinein.
- `lever(p, x, y, z, { ry, t, color })` → `{ g, handle, at() }`: Wandhebel auf Stahlplatte (Vorderseite +z), schlägt bei t von oben nach unten um (Klonk). `at()` = Knauf-Position für `gesture(rig, t, 'point', { at })` oder Callouts.
- `toolbox(p, x, y, z, { ry, color, open: t, close: t2, scale })` → `{ g, lid }`: roter Werkzeugkasten, Deckel klappt auf (Hammer, Schraubenschlüssel, Schraubenzieher, Zange, Maßband); `g` funktioniert mit `carry`, `holdItem`, `toss`.
- `interior({ floor: false })`: Raum ohne Boden (für Fallböden und Löcher).
- `trap(p, 'net', x, z, { ceiling: 2.7 })`: Netz für Innenräume, hängt an einem Deckenhaken statt an Pfahl und Ast. `trap(p, 'trapdoor', x, z, { size, depth, keep: true })`: Opfer fällt `depth` m tief und bleibt sichtbar (z. B. im Keller darunter).
- Waffe `pan` (Bratpfanne): `weapon(rig, 'pan')` + `swing` → Treffer mit Klong (`clang`).
- Look von „you“ (`outfit`): `grey` · `silver` (Haarfarben), `scar` (Narbe über dem Auge), `workjacket` (olivgrüne Arbeitsjacke mit Kragen, Reißverschluss, Brusttaschen), `cardigan` (Strickjacke mit V-Ausschnitt und Knöpfen), `boots`, `readers` (dünne Lesebrille).
- Querschnitt-Trick: `ground()` ist von unten unsichtbar. Eine Kamera knapp unter y = 0 zeigt Erdgeschoss und Keller zugleich (Puppenhaus-Schnitt); die Schnittkante davor mit Erd-Boxen gestalten.

# Neu in v2.24 (Thumbnails mit Wow-Effekt)
Zusätzliche Felder in `THUMB` (je Variante), sparsam 1–2 pro Thumbnail:
- `focus: [x,y,z] | 'trackName'`, `dof: 0–1` (Standard 0.9): Motiv scharf, Hintergrund verschwimmt. Liegt das Motiv hinter einer durchsichtigen Schicht (z. B. `strata`), auf deren Vorderseite fokussieren.
- `rays: true | [x%, y%, loch%]` (+ `raysColor`): Lichtstrahlen in der Akzentfarbe hinter dem Motiv; innerhalb von `loch` (Standard 12 %) bleibt das Motiv klar.
- `glow: [x%, y%, größe%]` (+ `glowColor`): warmer Schein auf das Motiv.
- `q: true | [x%, y%]`: großes Fragezeichen in der Akzentfarbe.
- `hide: [x%, y%, breite%, höhe%]` (+ `hideText`, Standard „???“): verwischter Kasten über der Auflösung, damit die Frage offen bleibt.

# Neu in v2.23 (Bewertungskarte weg, nahtloser Loop)

## Keine Bewertungskarte mehr
`END.review` wird ignoriert (Karte, Sterne, Stimme und Sounds sind raus); `assemble.py` warnt, wenn es noch in einer Story steht. Die CTA steht wieder auf der Endcard. Endcard + Loop zusammen höchstens 6 s.

## Nahtloser Loop (`CFG.loop`, Standard an)
- **Bild:** In den letzten `CFG.loopFade` s (0,6; 0,2–1,5) rendert die Engine zusätzlich Szene und Kamera zur Zeit t − DUR, also die Momente kurz vor Frame 0, und blendet sie weich über die letzte Einstellung (Canvas `#loopv`). Das letzte Bild ist damit Frame 0, der Neustart ist unsichtbar. Alles bleibt eine Funktion von t, also bildgenau im Export und in der Vorschau.
- **HUD:** Endcard, Abdunklung, Captions, Callouts und Karten blenden mit aus; die Uhr springt schon in der Überblendung auf die Hook-Zeit, die Serien-Kopfzeile fährt nicht mehr ein (steht ab Frame 0), und ist `BEATS[0]` ein `instant`-Hook, blendet seine Caption in den letzten ~0,24 s genau so ein, wie sie auf Frame 0 steht.
- **Ton:** Musik und SFX blenden über die Überblendung aus, der Master nur noch in den letzten 0,1 s (kein Klick); der erste Hit des Hooks (`boom` bei t = 0) landet auf dem Neustart.
- **Loop-Satz `END.loop`:** `END = { …, say: 'What would you have done?', loop: 'Which is why you should never ask —' }`. `voice.py` legt ihn rechtsbündig, er endet 0,12 s vor dem Schnitt und führt grammatisch in den ersten gesprochenen Satz (Hook). Höchstens ca. 8 Wörter; der Schlusssatz `END.say` bekommt automatisch den Platz davor (zu lang → TOO LONG in der Tabelle). In Sprachversionen: `end.loop` in `<slug>.<lang>.json`.
- **Tipp:** Die letzte `CAM`-Einstellung schaut grob dorthin, wohin die Hook-Einstellung schaut (gleicher Ort, ähnliche Richtung), dann wirkt die Überblendung wie eine einzige Kamerafahrt.
- Test: `tests/loop.story.js` (Shot bei 8 s liegt mitten in der Überblendung).

# Neu in v2.25 (Querformat, Zweiter Weltkrieg / D-Day)

## Querformat 16:9 (normale YouTube-Videos)
- `CFG.aspect: '16:9'` rendert im Querformat. `--w` bleibt die kurze Seite: `--w 1440` (Standard, 2K) ergibt 2560 × 1440, `--w 2160` 4K. Der Workflow `render` erkennt das selbst und teilt lange Videos in bis zu 20 Blöcke (Dauer ÷ 15 s).
- Das HUD rechnet in Bildhöhe: Badge und Zähler oben links, Captions mit `CFG.capPos: 'low'` als Untertitel unten (`CFG.capWords` 9–10 passt im Querformat). Endcard und Karten bleiben mittig.
- `CFG.subtitles: true` (mit `karaoke: false`): jede Caption-Seite steht sofort komplett da, wie klassische Untertitel; gut für lange Erklärvideos.
- Kamera: die vertikale `fov` wird mit `CFG.fovScale` multipliziert (Querformat-Standard 0.68), damit `shot()`-Presets wie im Hochformat sitzen. Callouts (`CALLOUTS`, `RULER`) sind bisher fürs Hochformat ausgelegt.
- Thumbnail im Querformat: Text links (`THUMB.text`), Motiv rechts in die Bildhälfte legen. YouTube nimmt Thumbnails bis 2 MB: Cover vor dem Hochladen auf 1280 × 720 verkleinern.
- Kontaktbogen: Kacheln 480 × 270, drei pro Reihe.

## Gelände
- `water({ waves: t => … })`: Seegang darf eine Funktion der Zeit sein (Sturm zieht auf, legt sich).
- `ground({ coast, beach: 45 })`: `beach` = Breite des Sandstreifens in m (Standard 5; Omaha bei Ebbe 40–60), der Sand bleibt flach.
- `ridge({ x0, x1, foot, crest, back, end, h, kind: 'bluff' | 'cliff' | 'dune', taper, rough, grass, face, sand })`: erhöhter Streifen entlang x – Steilufer hinter einem Strand, Klippe (Pointe du Hoc), Düne. Steigt von `foot` (Seeseite, +z) bis `crest`, flach bis `back`, fällt bis `end`. Nach `ground()` aufrufen: `groundH` enthält ihn danach (Figuren, `biome`, Bunker stehen darauf). Felsige Klippe mit Geröll am Fuß bei `kind: 'cliff'`.
- `hedgerow(p, [[x, z], …], { h: 2.3, bank, gap, trees: 0.12, colors, seed })`: normannische Bocage-Hecke auf Erdwall, ab und zu ein Baum.

## Atlantikwall
- `hedgehog(p, x, z, { s, ry })` (Tschechenigel) · `stake(p, x, z, { h, lean, mine })` (Holzpfahl mit Tellermine, zur See geneigt) · `ramp(p, x, z, { len, h, mine })` (Hemmbalken) · `beachGate(p, x, z, { w, h })` (Belgisches Tor).
- `beachObstacles(p, { x0, x1, rows: [z, …], gap: 6, mix: { hedgehog, stake, ramp, gate }, keep: [[x, z, r]], seed })` stellt sie in Reihen parallel zum Ufer auf; `keep` hält Landestellen frei.
- `bunker(p, x, z, { kind: 'casemate' | 'pillbox' | 'tobruk', ry, w, sink, y, camo })` → `B`: Front mit Scharte und Rohr zeigt nach +z. `B.fire(t, { at, size })` = Geschütz (Mündungsfeuer, Rauch, Knall, Einschlag bei `at`), `B.mg(t0, t1, { at: [[x, z], [x, z]] })` = MG-Feuer, `B.muzzle` = Mündung als Anker.
- `wire(p, [[x, z], …], { r, pitch, posts })` (Stacheldraht-Rolle mit X-Pfählen) · `sandbags(p, x, z, { len, rows, ry, y })`.

## Feuer und Luftabwehr (ohne Blut, nichts trifft Figuren)
- `mgFire(from, { t0, t1, at: [[x, z], [x, z]] | [x, y, z], burst, pause, rate: 9, speed, spread, puffs, sound })`: Feuerstöße mit Leuchtspur, Mündungsfeuer, Sandfontänen am Einschlag und MG-Geräusch (`mg`).
- `flak({ t0, t1, rate: 2, box: [[x0, x1], [y0, y1], [z0, z1]], tracers: { from: [[x, z], …], rate }, sound })`: Flak-Sprengwolken (Blitz + dunkle Wolke) am Himmel, auf Wunsch Leuchtspur von unten.
- `searchlight(p, x, z, { t0, t1, az, el, len, r, opacity })`: Suchscheinwerfer mit weichem Lichtkegel, `az`/`el` in Grad oder `t => …`.
- `muzzle(at, [t, …], { size })` und `tracerPool(shots, { color, len })` sind die Bausteine dafür.
- `barrageBalloon(p, { at: [x, y, z] | t => […], h: 70, len: 13 })`: Sperrballon mit Seil (über Schiffen, Häfen).

## Täuschung (Operation Fortitude)
- `inflatable(p, x, z, { kind: 'tank' | 'truck' | 'gun', t0, dur: 2.6, deflate, pump, ry })` → `{ g, body }`: Gummi-Attrappe, liegt vor `t0` platt im Gras und bläst sich mit Wackeln auf (Gebläse-Geräusch `inflate`). Leicht genug für einen Mann: `push(rig, I.g, …)`.

## Lagekarte und Kriegsraum
- `warMap(p, x, z, { region: 'europe' | 'channel' | 'normandy' | [lon0, lat0, lon1, lat1], w: 4.2, table: true, wall, h, y, ry, title, labels, beaches, drops, occupied, text })` → `M`: Karte im Stil von 1944 (Papier, Küsten, Grenzen, Gradnetz, besetzte Gebiete schraffiert, Städte, bei `normandy` die fünf Strände farbig nach Nation, `drops: true` Absprunggebiete) auf einem Holztisch; Norden zeigt nach −z, `wall: true` hängt sie an die Wand.
  - `M.arrow([[lon, lat], …], { t0, t1, color, w, layer, hide })` zeichnet einen Angriffspfeil, der sich aufbaut (liefert Anker der Spitze) · `M.pin(lon, lat, { t0, color })` · `M.piece(lon, lat, { kind: 'block' | 'ship' | 'plane' | 'flag', color, t0, to: [lon, lat], move: [t1, t2] })` schiebt Figuren über die Karte · `M.area([[lon, lat], …], { t0, color, opacity, pulse })` · `M.label(text, lon, lat, { t0, size, stand })` · `M.at(lon, lat)` / `M.world(lon, lat)` = Anker für `focusShot` und Kamera.
- `warRoom(p, x, z, { w, d, h, lamp, wallMap: 'europe', clock })` → `{ g, wall, lamp }`: Hauptquartier der 1940er (Dielen, zweifarbige Wände, verdunkeltes Fenster, Hängelampe, Uhr, Wandkarte); offen nach +z. Die Tischkarte mit `warMap()` hineinstellen.

## Erinnerung
- `cemetery(p, x, z, { rows, cols, gap: [2.0, 2.8], ry, stars: 0.06, aisle, t0, t1 })`: Soldatenfriedhof mit weißen Marmorkreuzen und Davidsternen in Reihen auf gemähtem Rasen, Hecke, Mittelweg; ab `t0` sichtbar. Respektvoll einsetzen: ruhige Kamera, keine Effekte.

## Geräusche
- Ton für lange Videos: Schnellfeuer (`mg`) und das Knistern in `battle` laufen über eine einzige Rauschquelle pro Feuerstoß (`pulses`), statt eines Knotens pro Schuss. So rendert der Ton eines 5-Minuten-Videos in ca. 8 statt über 40 Minuten. Neue Geräusche mit vielen kurzen Klicks genauso bauen.
- SFX: `mg` (MG-Feuerstoß, `dur`) · `flak` · `whistle` (anfliegende Granate, `dur`) · `morse` (Funk, `dur`) · `inflate` (Gebläse, `dur`) · `typewriter` (`dur`).
- `AUDIO.amb`: `battle` (ferne Schlacht: Artillerie, Gewehr- und MG-Feuer) · `planes` (Dröhnen vieler Propellerflugzeuge) · `hq` (Kriegsraum: Raumklang, tickende Uhr, Schreibmaschine) · `surf` (Brandung, Wind, Möwe).

# Tests
`bash tests/run.sh [name …]` baut die Beispiel-Story aus `template.html` und alle Szenen in `tests/` und rendert je drei Bilder; Seitenfehler lassen den Test scheitern. Der Workflow `test` läuft bei jeder Engine-Änderung auf GitHub. Neue Funktionen bekommen eine kleine Testszene in `tests/<thema>.story.js` + `.scene.js`.

# Neu in v2.27 (Feuerwerk, starrende Massen)

## Feuerwerk
- `fireworkBox(p, x, y, z, { size, ry, colors, color })` → Holzkiste mit bunten Röhren, Zündschnüren und Warnstreifen (Vorderseite +z), `box.top` = Höhe der Röhren; tragbar mit `carry`, für eigene Bewegung `dyn(box)`.
- `fireworks({ from: [x, y, z], at: [x, y, z], area: [sx, sy, sz], t0, t1, every: 0.4 | n, rise: 1.1, kinds: ['peony', 'willow', 'crackle', 'palm'], colors, size, light: 900 | false, dist: 90, sound: true | Lautstärke, seed })` → `{ bursts: [{ t, p, color, kind, launch }], light }`. Raketen mit Funkenschweif steigen von `from` auf und zerplatzen um `at`: peony = bunte Kugel, willow = goldener Regen, crackle = Kugel + weißes Knistern, palm = wenige dicke Arme. Ein einziges Licht springt zur neuesten Explosion (Farbe + Aufblitzen), pro Explosion die echte Feuerwerks-Aufnahme (`AUDIO.hits` automatisch). Zeiten sind Szenenzeit (SLOWMO wird umgerechnet).
- Tipp: `at` 20–30 m hoch, Kamera 30–50 m entfernt, fov 50–56; dazu `horde({ gaze: { t, at } })`, dann starrt die Menge hoch. Test: `tests/fireworks.story.js`.

# Neu in v2.28 (Hopliten)

## Hopliten (Griechen/Spartaner um 480 v. Chr.)
`hoplite(o)` = `warrior('spartan', o)`; auch `squad('spartan', n, …)` nutzt das Kit (jeder Mann per Seed anders, ab 17 Mann automatisch `detail: 'low'`). Optionen: `kit` 'warrior' (Standard) · 'parade' (Helm hochgeschoben) · 'boy' (Agoge: geschorener Kopf, barfuß, ein grober Umhang, keine Waffe) · 'citizen' (ohne Rüstung) · `armor` 'muscle' (bronzener Muskelpanzer) · 'linen' (Linothorax mit Schulterklappen und Borten) · 'none' · `metal` 'bright' · 'aged' · 'dark' · `crest` 'fan' · 'transverse' (Offizier, quer) · 'none' · `crestColor` · `helmet: false` · `helmetUp: true` · `greaves: false` · `cloak: true | '#hex' | false` · `beard` · `device` · `deviceColor` · `shieldFace: '#hex'` (bemalte Schildfläche) · `weapon` 'dory+aspis' · 'xiphos+aspis' · 'dory' … · `detail` 'high' | 'low'.
Teile einzeln: `hopliteGear(rig, o)` rüstet jede Figur aus (auch `char('you')`), `corinthHelmet(head, { crest, crestColor, metal })` (Helm auch auf Ständern), `weapon(rig, 'dory')` (2,6 m, Blatt mit Mittelrippe, Sauroter), `weapon(rig, 'xiphos')`, `weapon(rig, 'shield', { style: 'aspis', device, deviceColor, face, rim: false, metal })`, `buildAspis(group, o)` (Schild ohne Figur), `buildWeapon('dory' | 'xiphos')`.
Schildzeichen (`device`): scorpion · snake · club (Herakles-Keule, passt zu Leonidas) · bull · eyes · trident · gorgon · star · lambda · none. **Regel:** Für 480 v. Chr. kein `lambda` (erst ab ca. 420 v. Chr. belegt), kein Look aus dem Film „300“.
Animation: `helmetUp(rig, [[t, 1], [t2, 0]])` schiebt den Helm weich hoch (Gesicht frei, Haare an den Seiten sichtbar) oder zieht ihn herunter, mit leisem Klirren. Der Helmbusch-Schweif und der Umhang schwingen im Wind und beim Laufen.
Test/Vorschau: `tests/hoplites.*` (Aufstellung, Helme auf Ständern, alle Schildzeichen, Waffenständer, Nahaufnahmen, Phalanx aus 24 Mann).


# Neu in v2.32 (Meer: Unterwasser-Explosion, Kuppel, Querschnitt)

## Explosion in der Tiefsee
- `uwBlast(p, x, y, z, { t, r: 8, pulses: 3, period: 3.2, decay: 0.55, color, light: 1, rings: true, bubbles: true, sound: true, fx: true })`: Explosion tief unter Wasser (Atombombe im Marianengraben, Wasserbombe): Blitz und glühender Kern, dann eine Dampfblase mit silbrigem Rand, die auf `r` wächst, vom Wasserdruck zerdrückt wird und zurückfedert (`pulses`, jedes Mal kleiner und kürzer); jeder Kollaps schickt einen Druckring und Blasen, am Ende steigt eine Blasenwolke auf. Liefert `{ g, radius(t), at, collapses }`; `radius(ST(t))` für Zähler, `at` als Anker für `callout`. In `SKY: 'deepsea'` (Sichtweite ca. 34 m) mit `r` 4–5 und Kamera 17–22 m, `fov: 60`.
- `bombCase(p, x, y, z, { size, color, stripe, ry, glow })`: Cartoon-Bombenhülle (Zylinder, Nase, Leitwerk, gelbe Warnstreifen, keine Kennzeichen), liegt entlang +z.

## Kuppel an der Oberfläche
- `seaDome(x, z, t, { r: 60, h: 4, rise, hold, fall, color, spray, steam, hot: [t0, t1], sound })`: Das Meer wölbt sich zu einer flachen, schäumenden Kuppel und sinkt zurück (kein Tsunami), mit Gischt, etwas Dampf und einem Schaumring; `hot` färbt den Fleck rot-orange (warmes, radioaktives Wasser, Wärmebild-Look). `D.heightAt(x, z, t)` auf Boote addieren, die dort schwimmen: `tick(t => { S.g.position.y += D.heightAt(0, 0, t); })` nach `bob`.

## Ozean im Querschnitt
- `oceanSection(p, x, z, { w: 44, h: 36, d: 6, y, bed: 0.3, trench: { w, floor }, water: [oben, unten], rock, opacity, labels: { t, every, dur, u, zones: [[v, 'Name'], …] } })`: Museums-Querschnitt bis zum Tiefseegraben: dunkler Fels mit V-förmigem Graben, durchsichtige Wassersäule, die mit der Tiefe dunkler wird, weiße Oberflächenlinie. `O.at(u, v)` = Anker auf der Vorderseite (u −1 … 1 quer, v 0 Oberfläche … 1 Grabengrund), `O.top`, `O.floorY`. Dazu `RULER` mit `fmt: 'depth'`, `invert: true` und ein Mini-Schiff `ship(…, { len: 2.6 })` auf `O.top`.
- Test: `tests/ocean-blast.story.js`.

# Neu in v2.33.3 (Horror-Kit)
- `convexMirror(p, x, y, z, { r: 0.42, ry, rx: 0.35, color })` → `{ g, dome, at }`: runder Sicherheitsspiegel (Shop, Tankstelle, Lager) am Wandarm, Vorderseite +z, `rx` neigt ihn nach unten.
- `lensMask([[t0, t1], …], { r: 0.96, color, rim, vignette, sheen })`: runde Linse vor der Kamera in diesen Zeitfenstern, Rest des Bildes dunkel (Blick in den Spiegel, durch den Türspion, durchs Zielfernrohr). `r` = Radius relativ zur halben Bildbreite. Dazu im `CAM` eine weite Einstellung (fov 70–95) von der Spiegel- bzw. Spionposition.
- `hideDuring(obj, [[t0, t1], …])`: blendet ein Objekt oder eine Figur in diesen Fenstern aus (z. B. „you“ fehlt im Spiegel).
- SFX: `chime` (Ladentür-Gong) · `knock` (Klopfen an Holztür, `dur` = Länge, ein Schlag pro 0,2 s) · `static` (Funkgerät: Klick, Rauschen, Klick; `dur`) · `caralarm` (Autoalarm, `dur`) · `lift` (Förderkorb: Gitter knallt, Motor, Seil-Ticks; `dur`).

# Neu in v2.30 (Langvideo-Modus, 16:9, 3–10 Min)

Greift automatisch bei jedem `CFG.aspect: '16:9'` (`CFG.long: false` schaltet ihn ab). Alles bleibt eine reine Funktion von t.

## Automatisch
- **Volle Auflösung:** 3D in voller Ausgabegröße (`renderScale` ≥ 1) und 4× MSAA. Renderzeit ca. ×1,7. `CFG.fast: true` = alte Geschwindigkeit (Entwürfe).
- **Ruhiges HUD:** Badge + Kapitel-Chip stehen nur am Anfang (`CFG.hudHold`, 7 s), zu jedem Kapitelstart (`CFG.hudChapter`, 5,5 s), solange ein Zähler/eine Zeitleiste sichtbar ist und auf der Endcard. Der @Kanalname bleibt immer stehen. Daten stehen weiter direkt unter der Badge.
- **Kapitelkarten:** Aus `STEPS` wird zu jedem Kapitelstart (ab t ≥ 0,5) eine Titelkarte links („Chapter 02 / 07“, großer Titel, Akzentlinie, weicher Verlauf, Whoosh), `CFG.chapterDur` 3 s, `CFG.chapters: false` = aus. In den ersten ~3 s eines Kapitels keine Faktenkarte setzen.
- **Faktenkarten (`FACTS`) als Bauchbinde** unten links über den Untertiteln, ohne das Bild abzudunkeln. MYTH- und GUESS-Karten bleiben mittig.
- **Untertitel:** normale Groß-/Kleinschreibung, schlanke Schrift, bis zu zwei Zeilen (`CFG.subWords`, 16 Wörter); lange Sätze werden an Komma, Doppelpunkt, Gedankenstrich oder vor „and / but / which …“ geteilt, nahe der Mitte. `CFG.capWords` gilt nur noch für Shorts.
- **Zeitleiste (`type: 'timeline'`, auch in Shorts):** Beschriftungen überlappen nie (zwei Reihen, im Streifen gehalten, notfalls etwas kleiner); im Querformat breiter.
- **Licht:** Nacht, Sturm, Dämmerung werden aufgehellt (`CFG.nightLift`, 1; 0 = aus), mehr Luftperspektive in Totalen (`CFG.haze`, 0.6 = Dunst beginnt früher; 1 = wie Shorts).
- **Wasser:** Gischt und Spritzer als weiche Nebel-Partikel statt kleiner Würfel, Wasserringe dezenter.
- **Küste:** `ground({ coast })` bekommt einen dunkleren, leicht glänzenden Nasssand-Streifen zur Wasserlinie (`wet: 6` m, `false` = aus).

## 2D-Kartenkarte `MAP2D`
Ganzbild-Karte im Stil von 1944, jedes Bild gestochen scharf in Ausgabegröße gezeichnet (gleiche Karte wie `warMap()`), mit langsamer Fahrt zwischen zwei Ausschnitten. Solange sie das Bild ganz deckt, wird die 3D-Szene nicht gerechnet (spart Renderzeit). Ersetzt lange Einstellungen am Kartentisch.
```js
const MAP2D = [{ t: bt(3), dur: be(5) - bt(3), region: 'europe',            // 'europe' | 'channel' | 'normandy' | [lon0, lat0, lon1, lat1]
  view: [[3.0, 49.4, 21], [5.5, 50.4, 13]],                                   // [Länge, Breite, Breite des Ausschnitts in Grad]: Start → Ende (Push/Pan)
  areas: [{ pts: [[lon, lat], …], t0, color: '#8E2A1C', opacity: 0.22, pulse }],   // Fläche mit gestricheltem Rand
  arrows: [{ pts: [[13.4, 52.5], [9.5, 51.0], [2.35, 48.86]], t0, t1, color, w: 13, label: 'May 1940' }],   // Pfeil baut sich auf (geglättet), Label an der Spitze
  pins: [{ at: [-0.13, 51.5], t0, label: 'London', color: '#2F5D9E' }],      // Pin mit Puls-Ring
  marks: [{ text: 'ATLANTIC WALL', at: [lon, lat], t0, size: 40, color }],    // zusätzliche Beschriftung
  fade: 0.45, textScale: 1.6, labels, beaches, drops, occupied, text }];      // wie warMap()
```
Farben: Alliierte `#2F5D9E`, Deutschland/Achse `#8E2A1C` bzw. `#5A2A1E`, Sowjetunion `#B3261E`. Pins und Pfeile bekommen leise Sounds. Untertitel, Zähler und Kapitelkarten liegen darüber.

## Untertitel als Datei
`node render.mjs page.html --srt out/<slug>.srt` schreibt die Untertitel mit denselben Seiten und Zeiten wie im Bild. `CFG.burnSubs: false` blendet die Untertitel im Bild aus (dann kommen sie nur über die .srt als YouTube-Untertitel; sonst die .srt nicht hochladen, sonst stehen sie doppelt da). Der Workflow `render` legt `<slug>.srt` mit in den Release (YouTube Studio → Untertitel → Datei hochladen).

## Gerüst für Langvideos
Startpunkt: `examples/long/dday.story.js` + `dday.scene.js` (5:41, 7 Kapitel). Sprechzeilen als `LINES` mit Pausen:
```js
const LINES = [['Caption *mit* Akzent.', 'Gesprochener Text (optional).', { pause: 1.2, tone: 'sad' }], …];
const BEATS = []; { let t = 0.2; LINES.forEach(([text, say, x], i) => { const d = DURS[i] ?? est(say ?? text); BEATS.push({ t: +t.toFixed(2), dur: +(d - 0.2).toFixed(2), text, ...(say ? { say } : {}), ...(x ?? {}) }); t += d + (x?.pause ?? 0); }); }
```
`pause` = Sekunden Stille nach der Zeile (nur Bild + Atmo), z. B. 1–1,5 s am Kapitelende und nach Opferzahlen.
Bestehende Seiten mit neuer Engine neu bauen (Story, Szene, Stimme bleiben): `python3 reengine.py renders/<slug>.html template.html renders/<slug>.html`.

Test: `tests/long.*` (Kapitelkarten, Bauchbinde, Untertitel-Umbruch, Zeitleiste, Nacht, Gischt, Nasssand, 2D-Karte).
# Neu in v2.29 (Blut und abtrennbare Körperteile, Stürze, YouTube-Tags, saubere Bewegungen, Hitboxen)

## Blut und Körperteile (`CFG.gore`)
- **Modus:** `CFG.gore` = `'goo'` (Standard: grüner Zombie-Schleim, wie bisher) · `'blood'` (dunkles Cartoon-Blut, Menschen nur wenige hellrote Tropfen) · `'off'` (keine Flüssigkeit, nichts wird abgetrennt, nur ein Treffer). Gilt auch für alle Kampftreffer auf Zombies (`hitFx`). Serien legen den Modus einmal fest und behalten ihn.
- `dismember(zombie | { h, i }, part, t, { from, dir, power: 3.2, up: 2.6, spin, blood: 1, linger: 2.5, then: 'fall', twitch, fluid, sfx })`: Körperteil fliegt mit Squelch ab (echte Physik: fliegt, prallt ab, rollt), zuckt am Boden und verpufft nach `linger` s (0,8–4) mit Puff und Plopp. Am Körper bleibt ein kurzer Stumpf mit dunkler Kappe. `part` = armL · armR (ganzer Arm) · foreL · foreR (Unterarm) · handL · handR · legL · legR (Bein: der Zombie fällt). `from` = Punkt des Angreifers (Teil fliegt davon weg), sonst zur Seite. `then: 'fall'` lässt auch bei Armen umfallen. Ohne `from`/`dir` fliegt es nach außen. Gibt `{ limb, stub, end }` zurück (`track('arm', D.limb)` für die Kamera).
- Massen: `h.lose(i, 'armL' | 'armR' | 'legL' | 'legR', t, o)` bzw. `dismember({ h, i }, …)`: Unterarm bzw. Unterschenkel fliegt, Oberarm/Oberschenkel behält eine Kappe; bei Beinen fällt das Mitglied.
- Kampf: `swing`, `bow` und `shoot` nehmen `sever: 'armR'` (Teil des Treffers; bei `shoot` nur der letzte Schuss). Beispiel: `swing(you, 31.2, { at: z, sever: 'foreR' })`.
- `bleed(at, t, { n ≤ 30, dur, dir, speed, cone, size, who, fluid })`: Tropfen (Stoß oder mit `dur` kurzer Strahl), die als kleine Flecken landen und nach ca. 2 s weg sind. `at` = Punkt, `t => [x,y,z]` oder Rig (Brust). Menschen: nur im Modus `'blood'`, höchstens 8 Tropfen.
- `ouch(person, t, { blood, n, stars, dazed: 2.2, plaster, fall, from })`: Cartoon-Verletzung für Menschen: ein paar Tropfen (nur `'blood'`), Sternchen, Pflaster auf der Wange (ploppt nach 0,45 s auf), Treffer-Reaktion; `fall: true` = umfallen.
- `fluid`: `'goo'` · `'blood'` · `'oil'` (schwarz, für Roboter-Optik) · `'#hex'` überschreibt die Farbe für einen Aufruf.

**Automatische Schutzregeln (YouTube und Instagram, immer an):**
- Nur Zombies verlieren Körperteile (`o.undead` für eigene Untote). Menschen und Tiere bekommen stattdessen `ouch` (Warnung).
- Köpfe bleiben dran (YouTube beschränkt Enthauptung auf 18+) – `part: 'head'` wird zum rechten Arm (Warnung).
- Kleine Mengen: höchstens ca. 20 Tropfen pro Teil, keine Pfützen, Flecken verschwinden nach ca. 2 s, abgetrennte Teile verpuffen.
- Thumbnail (`render.mjs --cover`): kein Blut, alle Körperteile dran.
- Warnungen in `info().gore` (erscheinen bei `--shots` in der Zeile `scene:`): Gore vor 15 s (YouTube: grafische Gewalt in den ersten 7 s = keine Werbung, 8–15 s = eingeschränkt), Gore in einer Zeitlupe (`SLOWMO`), Gore in einer Nahaufnahme (Bildhöhe am Ort unter 3 m). Jede Warnung beheben, bevor gerendert wird.
- Test: `tests/gore.story.js` + `.scene.js`.

**Feinschliff:**
- Teile: `'arm' | 'fore' | 'hand' | 'leg'` nimmt die Seite, die zum Angreifer (`from`) zeigt; `'random'` (oder `sever: true`) ein Arm-Teil. Gilt auch für `h.lose` und `{ sever }`.
- Bein ab: Ein laufender Zombie fällt auf die Hände und **kriecht weiter** zu seinem Ziel (`then: 'crawl'`, `to: [x, z]`, `speed: 0.4`), ein stehender kippt um (`then: 'fall'`).
- Arm ab: Der Zombie schaut kurz auf den Stumpf und macht weiter (`look: false` = nicht); aus dem Stumpf tropft es kurz (`drip: false` = nicht).
- Massen: `killNear(h, P, t, r, { sever: 2 })` und `grenade(rig, t, { horde, sever: 2 })`: die n Nächsten verlieren ein Teil.
- Flüssigkeit pro Aufruf (`fluid`): `'oil'` (schwarz mit Funken, Roboter-Optik), `'alien'` (leuchtend cyan), `'#hex'`.
- Look: Blut glänzt und reagiert auf Licht, Tropfen ziehen sich im Flug lang, Flecken haben verschiedene Formen und Drehungen (auch der grüne Schleim). Abgetrennte Teile stoßen nicht mit Ragdolls zusammen (`phys(…, { group: 'debris' })`).
- Prüfung: `info().gore` prüft die ganze Zeit um jedes Ereignis (Nahaufnahme, unabhängig von den `--shots`-Zeiten), Gore im `TEASE`-Vorgriff und mehr als 3 abgetrennte Teile. `assemble.py` warnt bei Gore-Wörtern in Captions, Stimme, Titel und Thumbnail und bei mehr als 3 Abtrenn-Aufrufen.

## Stürze aus der Höhe (`fallDown`)
- `fallDown(rig, t, { from, to, depth, dist: 0.6, dir, up: 0.8, land: 'auto', getUp, until, dazed, hide, shake, sfx })` → `{ land, at }`: Figur fällt von Dach, Leiter, Mauer, Baum, Brücke, Klippe oder durch eine Falltür. Flug: kleiner Absprung (`up` m/s), Arme rudern, Beine strampeln, ängstliches Gesicht, Fallwind. Landung: Staub, dumpfer Aufprall, Schütteln je nach Höhe.
  - `land: 'auto'`: bis 1,2 m fangen die Knie ab und sie bleibt stehen, darüber kippt sie nach hinten (`'front'` = aufs Gesicht) und bleibt liegen (Menschen mit Sternchen). `'feet'` erzwingt Stehenbleiben, `'back'` das Hinfallen.
  - `from` = Startpunkt mit Höhe (Standard: wo die Figur bei t steht, z. B. `root.position.y = 3` auf einem Dach). Ziel: `to: [x, z]` (Boden dort) oder `[x, y, z]`, sonst `depth` m tiefer bzw. der Boden `dist` m voraus.
  - `getUp: t2` steht wieder auf, `until: t3` gibt die Figur frei (danach `walk()` ab `at`), `hide: tt => bool` blendet sie aus (außer Sicht, z. B. tiefe Grube).
  - Regel: Figuren nie per `holdRig`/Pfad einfach nach unten schieben – jeder Sturz läuft über `fallDown`.
- Fallen nutzen das selbst: `trap('trapdoor' | 'pit', …, { victim, keep: true })` → Opfer fällt, landet und bleibt unten liegen (bei `spikes` nie sichtbar unten). `trapVictim(V, t, 'drop', { depth, keep })` genauso.
- Massen: `h.pit({ at: [x, z], r | w, d, ry, t0, t1, depth: 2.9 })`: Wer ab `t0` in die Fläche läuft, fällt hinein, landet, kippt um und bleibt liegen; die Gefallenen stapeln sich. Ersetzt den `lift`-Trick bei `trapFloor` (Fläche = Bodenöffnung). `h.hit(i, t, { drop: true, keep: true, depth })` für einzelne.
- Festgehaltene Figuren (`holdRig`, Fallen, Stürze) stehen vor dem Festhalten wieder an ihrem Platz, auch nach Vor- und Zurückspulen und wenn die Physik vorab spätere Zeiten berechnet hat (vorher standen sie z. B. schon unten in der Grube).
- Test: `tests/falls.story.js` + `.scene.js`.

## YouTube-Tags (`tags.py`)
- `python3 tags.py "tag1, tag2, …"` gibt die Liste bereinigt zurück (doppelte raus, `#` und Anführungszeichen weg) und zählt wie YouTube: jedes Zeichen, jedes Komma, +2 für Tags mit Leerzeichen; höchstens 500. Was nicht mehr passt, fällt hinten weg, kürzere Tags weiter hinten füllen Lücken.
- `python3 tags.py --file renders/<slug>.post.json` prüft und kürzt `youtube.tags` im Posting-Plan; `upload.py` kürzt beim Hochladen ebenfalls, damit die API den Upload nicht ablehnt.

## Saubere Bewegungen (Bewegungs-Prüfung, keine Sprünge)
- **Prüfung:** `node render.mjs page.html --audit` (läuft auch bei `--shots` mit, `--no-audit` = aus) spielt das ganze Video mit 30 fps durch und meldet:
  - `MOTION: … jumps X m in one frame` (Figur/Objekt springt), `… snaps N° in one frame` (Gelenk klappt in einem Bild um), `… jitters back and forth` (zwei Systeme kämpfen gegeneinander),
  - `… off/differs … after jumping back / when frames are skipped` (Zustand aus anderen Bildern übrig: flackert zwischen Render-Workern),
  - `HITBOX: … stands … m inside an object` (Figur steht in einem Gegenstand, siehe unten), `GORE: …` (wie bisher).
  Jede `MOTION:`-Zeile vor dem Rendern beheben: Sprung → Zeit/Pfad anpassen oder `ramp`, Gelenk-Schnappen → Pose mit `env3`/`_thru` einblenden, Zittern → nur ein System darf die Sache bewegen, „left over“ → eigener `tick` muss für jedes t (auch vor dem Start) den Zustand setzen. Gewollte Zuckungen (Stromschlag) meldet die Prüfung nicht, wenn sie eingetragen sind: `SHAKY.push([objekt, t0, t1])` (die Elektro-Falle tut das selbst, mit Bewegungsunschärfe). Positionen stehen in der Meldung `(x, z)`.
  Schnelle Aktionen (Schwünge, Schläge, Tritte, Würfe, Abtrennen, harte Landungen, Schlingen) bekommen automatisch Bewegungsunschärfe (`MBAUTO`) und werden nur bei sehr großen Sprüngen gemeldet.
- **Debuggen:** `node render.mjs page.html --probe "<js>"` führt Code in der Engine aus (nach dem Szenenaufbau) und gibt das Ergebnis als JSON aus, z. B. `--probe "(() => { stepScene(4.2); return RIGS[3].root.position; })()"`.
- **Reinheit:** Jedes Bild ist eine reine Funktion der Zeit. Figuren starten jedes Bild in ihrer gebauten Pose (Position, Drehung, Sichtbarkeit), Gegenstände in Händen, Bananenschalen usw. ebenso.
- **Was die Engine jetzt selbst glättet:** Wurf-, Stoß- und Schussbewegungen schwingen über ~3 Bilder durch (`_thru`), Schwertschwünge laufen in Gelenkwinkeln (kein Umklappen des Arms nahe der Schulter), überlappende Bogenschüsse und Granatwürfe blenden ineinander, Tanzschritte (`robot`, `disco`) und `chat`-Gesten blenden, `tread` im Wasser sinkt ein statt 1 m zu springen, Treppen werden gleichmäßig hochgelaufen (Füße finden trotzdem jede Stufe), `hang` am Rettungshaken blendet ein und lässt am Ende fallen, `fly()` hat an Start und Ende keine 52°-Schräglage mehr, schnelle Flugzeuge (`speed ≥ 15`, nicht Hubschrauber/Vögel) fliegen vor `t0` schon ein (`cruise: false` = alt), Hubschrauber beschleunigen ab `t0 > 0` in 1,2 s, der Hund bei `fetch` stoppt, senkt den Kopf und nimmt den Stock ins Maul.
- **Greifen und Ablegen:** `holdItem` und Essen/Trinken (`eat`, `drink`) greifen jetzt nach dem Gegenstand: die Hand geht zu seinem Platz (beugt sich vor, geht für Tiefes in die Hocke), nimmt ihn genau dort und legt ihn bei `after: 'rest'` dort wieder ab. `reach: false` schaltet das ab. Gegenstände, die nur für die Aktion erzeugt werden (am Ursprung oder unter dem Boden geparkt), sind vorher unsichtbar. Nach `after: 'free'` verlässt der Gegenstand die Hand weich (`release` s, Standard 0,15).

## Hitboxen (niemand steht in Gegenständen)
- Jede stehende oder gehende Figur ist ein Zylinder (Radius 0,21 m × Größe). Fest sind: alle statischen Gegenstände zwischen Knie- und Kopfhöhe der Figur (Möbel, Wände, Kisten, Zäune, Bäume, geparkte Autos …), andere Figuren und Tiere. Stufen, Bordsteine, Teppiche (unter Kniehöhe) werden übergangen; Dächer, Lampen darüber stören nicht. Gras, Getreide, Menschenmassen (instanziert) sind durchlässig.
- Jedes Bild (vor allen Anhängern): **1)** Gehende weichen statischen Hindernissen, stehenden Figuren und ruhenden Tieren seitlich aus (sanft über 0,9 m vor und nach dem Hindernis, Personen mit etwas Abstand); entgegenkommende Gehende weichen immer zur selben Seite aus. **2)** Was noch überlappt, wird herausgeschoben (Figur in den Tisch gestellt → steht an der Kante). **3)** Figuren werden auseinandergeschoben (halb/halb), Tiere und Sitzende schieben, werden aber nicht bewegt.
- Nur flache Überlappungen: wer mehr als ~0,45–0,9 m tief in etwas steht (Haus aus einem Block, Zelt), bleibt stehen und wird als `HITBOX:` gemeldet – Figur oder Pfad verschieben oder `noHit()`.
- Ausgenommen (automatisch): Sitzende, Hockende, Liegende, Fallende, Ragdolls, festgehaltene (`holdRig`), Reiter, Figuren in Fahrzeugen (anderes Elternobjekt), Figuren hoch über dem Boden (Leiter, Dach). Berührende Paare automatisch: `hug`, `highFive`, `handshake`, `chat` (alle `_pair`), `piggyback`, `pull`, `shove`, `carry` (Figur tragen), Mensch und Tier bei `pet`, `feed`, `fetch`, `lead`.
- `noHit(figur | objekt)` = nie schieben / nie blockieren (z. B. Badewanne, in der jemand steht), `noHit(a, b, t0, t1)` = die zwei dürfen sich in dem Fenster berühren. `CFG.hitboxes = false` schaltet alles ab. Das alte „Abstand halten“ (1,1 m Schieben) ist ersetzt.
- Test: `tests/hitbox.story.js` + `.scene.js`.

# Neu in v2.31 (flüssige Videos: Prüfung an echten Videos, Posen-Überblendung, Hitboxen überarbeitet)

## Was die Engine jetzt selbst glättet
- **Posenwechsel in Szenen-Ticks:** `tick(t => pose(f, t < 5 ? 'idle' : 'cheer', 0, t))` klappte früher in einem Bild um (Arme 170°). Die Engine fragt denselben Tick, welche Pose er kurz vorher gewählt hat, und blendet über `CFG.poseFade` s (0,24, in Videozeit; 0 = aus). Gilt auch, wenn ein Tick eine Figur nur zeitweise posiert (`if (t > 3) pose(…)`: weich aus der Steh-/Geh-Pose und zurück), für Geher und für `figur.look = …` in Ticks (der Kopf dreht sich, statt zu springen). Nichts dafür tun – einfach `pose()` mit der gewünschten Pose aufrufen.
- **Jedes Bild startet aus der gebauten Szene:** Position, Drehung, Größe und Sichtbarkeit aller beweglichen Objekte (`dyn`) werden vor jedem Bild zurückgesetzt. Ein Tick, der etwas nur „solange es fährt“ oder „ab 5 s“ setzt, ergibt damit in Vorschau, jedem Render-Worker und jedem CI-Block dasselbe Bild (vorher: was das letzte Bild hinterlassen hatte → Sprünge an Blockgrenzen). Folge: Was nach einem Ereignis bleiben soll, muss der Tick für jedes spätere t setzen (z. B. Endrichtung eines Fahrzeugs), `CFG.restReset: false` schaltet es ab.
- **Mehrere `walk()` auf einer Figur** übergeben jetzt an ihrem `t0` (vorher hielt der zuletzt geschriebene Weg die Figur die ganze Zeit an seinem Start fest) und drehen in 0,45 s in die neue Richtung.
- **Kurven:** Geher, Tiere und `traffic()`-Autos drehen gleichmäßig durch Ecken (Blickrichtung = Sehne über ±0,35–2,2 m je nach Tempo; Autos runden die Ecke), vorher zwei 45°-Schritte bzw. 90° in einem Bild.
- **Gangart nach Tempo:** `walk(…, { mode: 'walk' })` über 2,4 m/s und `'shamble'` über 1,7 m/s werden zum Lauf (Zombies mit Armen nach vorn), sonst flimmern die Beine. `gait: false` behält die Gangart.
- **Kampf-Kombos:** überlappende Schwünge, Schläge und Tritte liegen der Reihe nach übereinander (jeder blendet über den vorigen), vorher sprang der Arm beim Wechsel.
- **Übergaben:** `board()` (Boot → Laufen) steht in 0,3 s auf und steigt aus; `carry()` greift nach Dingen auf Tisch/Theke (statt sich zum Boden zu bücken) und nimmt sie weich in die Hand; Würfe aus `carry` starten genau an der Hand; Ragdolls starten dort, wo die Figur steht, auch wenn der Szenen-Tick mit `if (t >= T) return` übergibt; Raketen kippen am Ziel nicht mehr; `lever()` schwingt weicher.
- **Körper (v2.40):** `faceTo` dreht eine stehende Figur mit kleinen Schritten (die Füße heben abwechselnd ab, der Kopf dreht voraus; `steps: false` = alt); `look` lässt los, sobald die Figur fällt, liegt oder Ragdoll ist (vorher drehte der Hals beim Sturz ruckartig zum Ziel); `gesture` schwingt ~8 % über und pendelt sich ein; Schläge (`punch`/`strike`) heben die Deckung in 0,25 s (Treffer zur selben Zeit); das Stehen verlagert das Gewicht unregelmäßig, Stand, Armhaltung und Ellbogen sind je Figur verschieden, die Arme pendeln leicht mit dem Atem.
- **Regel für Szenen:** `look` nicht in einem Tick umschalten, wenn es auf die Augen ankommt (die Pupillen hängen dann an Blockgrenzen ein Bild nach) – lieber einmal `figur.look = t => [x, y, z]` mit weichen Übergängen. Gangarten in eigenen Ticks mit stetiger Phase posieren (`t < 3.6 ? t * 5.4 : 19.44 + (t - 3.6) * 8`), sonst springen Arme und Beine beim Wechsel.
- **Bewegungsunschärfe:** schnelle Aktionen (`MBAUTO`) rendern mit 5 statt 3 Teilbildern (Schliere statt drei Geisterbilder). `CFG.mbSamples` setzt einen festen Wert.

## Hitboxen (überarbeitet)
- **Geher:** Der geschriebene Weg ist der Plan. Er wird nur dort korrigiert, wo der Körper wirklich in etwas hineinliefe: seitlicher Schritt um genau das fehlende Stück, 0,7 s vorher ein- und nachher ausgeblendet. Wege, die vor einem Tisch enden oder durch eine Tür führen, bleiben unverändert (vorher: Ausweichen vor allem „in der Nähe“ → Zittern in engen Räumen). Geher weichen stehenden Figuren aus; Geher untereinander werden nur sanft auseinandergeschoben.
- **Weiche Gewichte statt Schalter:** Setzt sich jemand, fällt, wird gehalten oder springt, blendet die Korrektur aus (kein Zurückspringen).
- Fallen (`trap()`) sind nie Hindernis. Sonst wie in v2.29 (`noHit`, `HITBOX:`-Meldungen).

## Prüfung (`--audit`, läuft bei `--shots` mit)
- Urteilt wie der Zuschauer: nur was im Bild und groß genug ist (ab ca. 1,2 % der Bildhöhe), nichts über Schnitte und `TEASE`-Sprünge hinweg; Endlos-Requisiten, die ans ferne Ende zurückgesetzt werden, und simulierte Objekte bei Aufprall zählen nicht.
- Neu: `the camera turns / jumps … without a cut` (Kamerasprung ohne Schnitt → `tr: 'cut'` oder echte Fahrt), `object … turns N° in one frame` (Objekt dreht in einem Bild um, z. B. Fahrzeug, dessen Richtung aus einer winzigen Bewegung berechnet wird → `drive()`/`walk()` nutzen oder Richtung beim Stillstand festhalten).
- `PRESNAP.push([t, fn])` (für Engine-Funktionen): wertet die Szene einmal vor dem ersten Bild bei t aus und merkt sich, was eine Aktion von dort braucht – statt „beim ersten gerenderten Bild“.
- Test: `tests/smooth.story.js` + `.scene.js`.

# Neu in v2.34 (detailreiche Umgebung und Gebäude)

Alles hier läuft von selbst, sobald die Szene `biome()` oder `city()` nutzt. Nichts davon von Hand nachbauen (keine eigenen Wolken, Bergketten, Vögel).

## Himmel
- **Wolken** ziehen in jedem `SKY`-Preset mit eigener Menge und Farbe (Tag hell, Dämmerung von unten angeleuchtet, Nacht dunkel, Sturm dicht). `CFG.clouds: false` = wolkenlos, Zahl = mehr/weniger Bedeckung (1 = Preset, 1.5 = bewölkt, 0.5 = fast klar).
- `NIGHTK` (0 Tag … 1 Nacht) folgt `SKY`. Fenster von `tower()`/`city()` gehen damit von selbst an, sobald ein Nacht- oder Dämmerungs-Preset in `SKY` steht (`lit: 0` = aus, `lit: 0..2` = Anteil wie bisher).

## Boden
- `ground()` zeichnet pro Pixel feine Struktur aus der Bodenfarbe: Gras gesprenkelt, Sand mit Windrippeln, Schnee mit Glitzern und bläulichen Mulden. Blendet mit der Entfernung aus (kein Flimmern in Totalen). `ground({ detail: false })` oder Zahl (0.5 dezent, 1.5 kräftig), global `CFG.groundDetail: false`.
- `biome()` setzt zusätzlich mehr Grasbüschel in Kameranähe (`biome(kind, { lush: false })` = wie früher).

## Hintergrund: `backdrop(kind, { coast, seed, r0 })`
- Zwei dunstige Ringe hinter dem Gelände, die die Farbe des Himmels annehmen (passen zu jeder Tageszeit). Arten: `hills` (grüne Hügel, blaue Kämme) · `alps` (Fels mit Schneekappen) · `snow` · `mesa` (Tafelberge) · `islands` (zur Seeseite) · `skyline` (ferne Hochhäuser).
- `biome()` wählt selbst: farm → hills, forest → alps, snow → snow, desert → mesa, beach → islands; `city()` → skyline. Anders: `biome('farm', { backdrop: 'alps' })`, aus: `{ backdrop: false }` oder `CFG.backdrop: false`. Mond und Riff haben keinen.
- Der Hintergrund hat keine Hitbox und steht nicht im Cover-Check. Eigene Szene ohne Biom: `backdrop('hills')` einmal aufrufen.

## Kleines Leben: `ambientLife(kind, { area })`
- Schmetterlinge und kreisende Vögel am Tag (Strand: Möwen, Sumpf: Libellen), Glühwürmchen bei Nacht, fallende Blätter im Wald. Instanziert, jede Position reine Funktion von `t` (gleich in jedem Render-Worker).
- Kommt mit `biome()`; aus: `biome(kind, { life: false })` oder `CFG.life: false`.

## Oberflächen: `{ surf }` an `mat()`, `box()`, `cyl()`, `prism()`, `cone()`
- Arten: `brick` · `stone` (große Quader) · `plank` (senkrechte Bretter) · `siding` (Stülpschalung) · `tile` (Dachziegel) · `plaster` · `concrete` (Platten) · `metal` (Wellblech). Beispiel: `box(g, 5, 3, 4, '#D8CBB4', 0, 0, 0, { surf: 'plaster' })`.
- Keine Extra-Geometrie, blendet ab 35 m aus, Muster hängt am Bauteil (wandert mit, wenn das Gebäude bewegt oder weggeschleudert wird). `CFG.surfaces: false` = glatte Flächen.
- **Regel:** Eigene Wände, Mauern und Dächer ab 2 m Kantenlänge bekommen ein `surf`. Kleine Props, Figuren, Fahrzeuge nicht.
- Eingebaute Gebäude tragen sie schon: `house` (Sockel Stein, Wand `siding`, Dach `tile`, Schornstein Ziegel; `house(…, { surf: 'brick' })` ändert die Wand), `barn`, `silo`, `tower` (brick/deco), `castle`, `bank`, `hospital`, `supermarket`, `airport`, `prison`, `lighthouse`, `pyramid`.

## Dach und Fassade
- `roofKit(g, w, d, y, seed, { parapet, tank, helipad, stair })`: was auf einem Flachdach steht: Attika, Klimageräte mit Lüftern, Abluftrohre, Oberlicht, Treppenhaus, Antenne, manchmal Wassertank; `helipad: true` malt den Landeplatz.
- `facadeKit(g, w, h, d, { color, lamps: [x…] })`: dunkler Sockel, Fallrohre an den hinteren Ecken, Lampen neben dem Eingang (Front = +z).
- Krankenhaus (mit Landeplatz, Fensterbänken, Sprossen), Supermarkt und Flughafen haben beides eingebaut.

## Gebäude
- `pyramid()` ist jetzt gestuft (Steinlagen, Eingang an der +z-Seite, heller Schlussstein), Spitze weiter bei 0,65 × `size`. `{ smooth: true }` = glatte Form wie früher, `{ door: false }` = ohne Eingang.
- `lighthouse()`: Steinsockel, Tür, Fenster den Turm hinauf, Galerie mit Geländer, Laternenhaus mit Sprossen.
- `castle()`: Quadermauerwerk an Mauern, Türmen und Bergfried, Ziegeldächer.
- Test/Vorschau: `tests/environment.*` (Tag → Dämmerung → Nacht, alle Oberflächen, Dach-Kit).

# Neu in v2.35 (Wetter am Boden, Straßen, Innenräume, Ufer, Dämmerung, Tankstelle/Labor/Gefängnis)

## Wetter am Boden (läuft von selbst)
- **Regen macht nass:** `emit('rain', { t0, t1 })` färbt Boden, Straßen, Wände und Dächer dunkler und glänzend (in ~5 s nass, ~25 s zum Trocknen). Auf Straßen, Gehwegen und flachen Bodenstellen bilden sich Pfützen, die den Himmel spiegeln.
- **Schnee bleibt liegen:** `emit('snow', { t0, t1 })` lässt Schnee auf allem wachsen, was nach oben zeigt: Dächer, Mauerkronen, Boden, Straßen (dort dünner, Asphalt schaut durch). Erst Flecken, dann geschlossene Decke (~16 s). `biome('snow')` startet mit voller Decke (`{ cover: false }` = aus).
- Von Hand: `wetGround(t0, t1, stärke, { rise, dry })` (z. B. „nach dem Regen“: `wetGround()` ohne Regen), `snowCover(t0, t1, stärke, { rise, melt })`. Ganzes Video: `CFG.wet: 0..1`, `CFG.snowCover: 0..1`. Alles aus: `CFG.weather: false`. Ein Emitter ohne Bodenwirkung: `emit('rain', { cover: false })`.
- Schnee und Nässe liegen auf Boden, Straßen und allen Flächen mit `surf`. Bäume, Autos und Figuren bleiben, wie sie sind (Figuren: `wet(f, t)` wie bisher).

## Straßen
- `road()` hat jetzt Asphalt mit Körnung, Rissen und Flickstellen und einen Schotterstreifen am Rand (`shoulder: false` = ohne). Neu: `curb: true` (Bordsteine mit Gullys), `manholes: true`.
- `city()`: Gehwegplatten per Oberfläche (`paving`), Gullys in der Rinne, Laub unter den Straßenbäumen (`leaves: false` = ohne).
- Einzelteile: `drain(p, x, z, ry)`, `manhole(p, x, z)`, `leafLitter([[x, z, r, y?], …], { per, colors })` (Laubhaufen als ein Instanz-Mesh).
- Neue Oberflächen für eigene Flächen: `surf: 'asphalt'` (Parkplatz, Hof), `surf: 'paving'` (Platz, Terrasse).

## Innenräume
- `interior()` zeichnet Böden und Wände mit Oberfläche: Dielen mit versetzten Stößen und Maserung (`boards`), Fliesen mit Fugen (`tiles`), Teppich (`carpet`), Tapete mit Streifen (`wallpaper`), Putz, Beton, Ziegel im Keller. Ändern: `interior(…, { floorSurf: 'tiles', wallSurf: 'brick' })`, `false` = glatt.
- Dazu Steckdosen, Lüftungsgitter, Bilderleiste, Lichtschalter und Fußmatte an der Tür, Bilder an freien Seitenwänden (`fittings: false` = ohne).
- Eigene Räume: `box(g, w, 0.06, d, '#B5834E', 0, 0, 0, { surf: 'boards', indoor: true })`. `indoor: true` hält Regen und Schnee draußen. **Regel:** Jede selbst gebaute Innenwand und jeder Boden bekommt `surf` und `indoor: true`.
- Muster richten sich nach dem Raum (Dielen laufen mit der Raumachse, auch bei `ry`).

## Ufer
- `water()`: Schaumkante pro Pixel (saubere, laufende Bänder entlang der Wasserlinie), nasser Sand und auflaufender Schaum auf dem Strand. Aus: `water({ foam: false })`, `water({ shore: false })` oder `CFG.shore: false`.
- `river()`: Schilf an beiden Ufern und Seerosen (`reeds: 0..1` Dichte oder `false`, `lilies: false`).

## Licht
- `dusk` und `dawn` lassen mehr Restlicht am Boden (Himmelslicht 0,95 statt 0,6/0,75, Belichtung 1,22/1,15). Stimmung bleibt, Figuren und Boden sind lesbar.

## Gebäude
- `gasstation()`: Dachunterseite mit Fugen, Säulenmanschetten, Schriftband, Dachaufbauten, Poller an den Zapfsäulen, Tankdeckel, Luft/Wasser-Säule, Mülltonnen; Shop mit Glastür, Fußmatte, Eistruhe, Plakaten, Gasflaschen, Sockel und Lampen.
- `lab()`: Fliesenboden, Betonwände, Warnstreifen, Lüftungsrohr mit Lichtleisten, Warn- und Erste-Hilfe-Schild, Spüle, Hocker, Gasflaschen.
- `prison()`: Ziegel-Trennwände, vergitterte Fenster, Zellennummern, Lampen, Regal, Kissen, Strichliste an der Wand, Dachaufbauten; Wachturm mit Umlauf, Geländer, Leiter und Streben.
- Test/Vorschau: `tests/ground-weather.*` (Regen → Pfützen → Schnee), `tests/interiors.*`.

# Neu in v2.36 (Zerstörung: Gebäude, Gegenstände, Fahrzeuge)

Dinge zerbrechen so, wie sie gebaut sind. Alles ist echte Physik (einmal vorab simuliert) bzw. reine Funktion von `t`.

## `breakApart(obj, t, { power, from, dir, up, spin, max, chunk })` (überarbeitet)
- Kleine Teile fliegen am Stück (Türen, Fensterläden, Pfosten, Schornstein, Zaunlatten). Wände und Platten brechen in unregelmäßige Stücke, die ihre Oberfläche behalten (Ziegel bleibt Ziegel). Dächer, Silos und Kegel reißen in Blechen/Scherben ihrer eigenen Haut. Ein massiver Block, der für ein hohles Gebäude steht (Scheune, Turm), zerfällt in Wände und Decke statt in Würfel.
- Glas platzt als Splitter, dazu Staub und Splitter in den Farben des Objekts, Krachen; ab ca. 3 m Größe Grollen und leichtes Wackeln.
- `from: [x, y, z]` = Ausgangspunkt des Stoßes, `dir: [x, y, z]` = Richtung (Auto fährt durch die Mauer), `power` 2–8, `max` = Zahl der Stücke (Standard 24–64 nach Größe), `chunk` = ab welcher Größe ein Teil zerbricht. `n: [x, y, z]` aus alten Szenen gilt als Richtwert für die Stückzahl. `fx: false` = ohne Staub und Ton.
- Zerstörte Objekte haben keine Hitbox und sind nach dem Bruch kein Hindernis für die Physik.

## `collapse(gebäude, t, { style, dir: [dx, dz], dur, max, rubble, linger })` (neu)
- `pancake` (hohe Gebäude, Standard wenn höher als breit): sackt in die eigene Staubwolke, Trümmer fliegen an der Bodenlinie weg, ein Schutthügel aus den Materialien des Gebäudes wächst und bleibt liegen.
- `topple` (`dir` = wohin): kippt wie ein Baum, schlägt auf und zerbricht dort mit dem Schwung des Falls (Silo, Turm, Schornstein, Leuchtturm).
- `crumble` (flach und breit, Standard für Häuser/Scheunen): kurzes Zittern, dann fällt es an Ort und Stelle auseinander.
- Bringt Staub, Rauch danach (`linger` s), Ton, Kamerawackeln und einen Stoß für simulierte Dinge in der Nähe mit. Gibt `{ t1, style }` zurück (`t1` = Ende). **Regel:** Den Shot bis `t1 + 1` stehen lassen, Totale oder Halbtotale.

## Fahrzeuge
- `crash(vehicle, t, { impulse, spin, level, side, parts, fire })` bringt jetzt Schaden mit: zerknautschte Bleche, gestauchte Karosserie, aufgesprungene Haube, Licht flackert und geht aus, ein bis zwei Räder lösen sich und rollen weg, Funken. `fire: 1.5` = fängt nach 1,5 s Feuer. `wreck: false` = wie früher (Auto bleibt heil).
- `wreck(vehicle, t, { side: 'front' | 'rear' | 'left' | 'right', level: 0.3–1.6, parts, fire })`: derselbe Schaden ohne Überschlag (Auffahrunfall, Baum fällt aufs Auto, Monster tritt dagegen), mit Glas, Dampf und Ton.

## Explosionen
- `explode(x, y, z, t, { breaks: [obj, …] })`: Die Druckwelle zerstört, was aufgelistet ist: Fahrzeug → `crash` mit Feuer, hohes Gebäude → `collapse` (kippt weg von der Explosion), alles andere → `breakApart` vom Explosionspunkt aus.

## Regeln
- Pro Video 1–3 Zerstörungen an den Höhepunkten. Jede braucht einen sichtbaren Auslöser im selben Shot (Explosion, Aufprall, Monster) und 1,5–2,5 s Standzeit danach.
- Keine Handanimation für Brüche (`vanish` + Partikel) mehr, wenn das Objekt größer als eine Kiste ist.
- `CFG.destruction: false` = Verhalten vor v2.36 (Blockraster, Autos bleiben heil).
- Test/Vorschau: `tests/destruction.*`.

# Neu in v2.37 (Erklär- und Conspiracy-Videos: wenige Zahlen)

- `CFG.numbers`: `'few'` ist Standard bei `kind: 'explain' | 'conspiracy'`: Die Believability-Nadel (`type: 'meter'`) zeigt keine Prozentzahl mehr (Nadel und Beschriftung reichen), Zähler zeigen keine „+120“/„−30 %“-Einblendungen. `'all'` = wie in Story-Videos.
- Pro Zähler: `num: false` = nur Balken/Nadel ohne Zahl (geht in jedem Video), `num: true` bzw. `pop: true` holt Zahl bzw. Einblendung im `'few'`-Modus zurück.
- `assemble.py` zählt bei Erklär- und Conspiracy-Videos, was der Zuschauer lesen müsste, und meldet `numbers on screen: 6 (captions 2 · callouts/ruler 3 · cards 1) + 4 counter(s)`. Mehr als 4 Zahlen im ganzen Video oder mehr als 1 Zähler gibt eine WARNING. `numbers: 'all'` in `CFG` schaltet die Prüfung ab.

# Neu in v2.38 (Stimme mit Gefühl, Stimme vor Geräuschen und Musik)

## Der Erzähler reagiert auf die Szene (automatisch)
- `assemble.py` fragt die gebaute Seite, was wann passiert (`whatif.events()` → `<slug>.events.json`): laute Ereignisse (Explosion, Kanone, Donner, Brüllen, Aufprall), Kamerawackeln, Musikstimmung, Sprünge der Zähler (gut/schlecht), Dunkelheit, Zeitlupe.
- `voice.py` wählt daraus pro **Satz** den Ton: Explosion oder starkes Wackeln kurz vor oder im Satz → `shout` (kurze Sätze, „!“) oder `excited`; ein Zähler stürzt → `worried`, erholt sich → `relieved`; „…“ → `dramatic`; kurze Pointe nach einem Satz → `deadpan`; Frage → `curious`; sonst nach der Musik (`horror`/`tense` → `tense`, `action`/`triumph`/`party` → `excited`, `epic` → `dramatic`, `sad` → `sad`, `science`/`chill` → `calm`). Die Endcard spricht er ruhig.
- Der Erzähler reagiert auf das, was gerade passiert ist, er nimmt es nicht vorweg (Ereignis bis 0,7 s vor dem Satz oder in dessen erster Hälfte). Schnitt-Akzente (`boom`, `stinger`, `whoosh`) zählen nicht.
- Die Zeilenübersicht von `assemble.py` zeigt die Wahl mit Grund: `tone: worried ← Survival drops at 6.2 s · shout ← explosion at 12.6 s`.

## Was ein Ton hörbar ändert
- Tempo, Lautstärke, Tonhöhe und Tonumfang (PSOLA: dieselbe Stimme, Formanten bleiben), dazu Klangfarbe: `whisper` ist echtes Flüstern (stimmlos, hauchig), `shout` hat Druck und Biss.
- Töne: calm · tense · worried · excited · shout · whisper · sad · dramatic · deadpan · curious · relieved · plain (neutral).
- Von Hand: `tone` am Beat gilt für alle seine Sätze. Pro Satz in `say`: `say: 'It was quiet. [whisper] Too quiet.'`.
- Reaktionen in `say`: `[gasp]` (scharfes Einatmen) · `[sigh]` (Seufzer) als Laute; als kurze gesprochene Einwürfe `[whoa]` `[wow]` `[ugh]` `[oh]` (Oh no.) `[ha]` `[noway]` `[great]` `[yikes]` `[seriously]` `[comeon]`. Jeder Einwurf wird gespielt statt vorgelesen: Er bekommt seine eigene Melodie und Länge („Whoa“ springt hoch und fällt, „Ugh“ sackt ab, „Great.“ bleibt flach und tief, „Seriously?“ steigt am Ende). Einwürfe werden langsam und etwas lauter gesprochen und nie gehetzt (mit einem Spracherkenner geprüft: im normalen Erzähltempo wird aus „Whoa!“ ein vernuscheltes „well…“). Sie brauchen Platz: ca. 0,9 s zusätzlich im Beat. **Nur wenn es passt:** Standard ist kein Einwurf. Ein Einwurf gehört auf einen echten Moment (Schreck, Rückschlag, absurde Wendung) und muss zu ihm passen; `[hm]` gibt es nicht mehr (ein unbekanntes Tag wird überlesen). Automatisch setzt die Engine höchstens drei pro Video (Einatmen vor dem Schreck, Seufzer nach einem schweren Rückschlag), nur wenn die Zeile dafür Platz hat.
- `CFG.voice: { name, emotion: 1 }` skaliert die Stärke (0 = aus, 1,5 = kräftig), `auto: false` schaltet die Automatik ab (nur noch `tone` und Tags). Stimmen im Bild (`who: 'steve' | 'you'`) bekommen keine Automatik.
- Braucht `praat-parselmouth` (pip); fehlt es, bleiben Tempo, Lautstärke und Klangfarbe, die Tonhöhe ändert sich nicht.

## Stimme zuerst: der Mix
- Musik, Atmo und Effekte werden für sich gerendert und danach unter die Stimme gemischt: Während gesprochen wird, bleibt die Stimme `AUDIO.clarity` dB über allem anderen (Standard 12, Erklär-/Conspiracy- und Querformat-Videos 14). Gemessen wird im Sprachbereich mit 60 ms Vorlauf: Eine Explosion mitten im Satz wird leiser, bevor sie einsetzt. Zwischen den Sätzen kommt der Hintergrund zurück, bleibt aber `AUDIO.bedCap` dB (Standard 4) unter der Stimme.
- Auch Effekte ducken jetzt unter der Stimme (`AUDIO.duckFx`, 0.7), Atmo stärker (`AUDIO.duckAmb`, 0.55). Die Stimme hat eine eigene Kette (Präsenz bei 3 kHz, `AUDIO.presence` dB, eigener Kompressor) und hängt nicht mehr am Kompressor der Effekte: Laute Szenen drücken sie nicht mehr weg.
- `render.mjs` meldet nach dem Ton: `mix: voice 15 dB over the background while speaking (scene as written: 8.3 dB · tightest passage 2.7 dB at 8 s · target 12 dB)`. Liegt die Szene selbst unter 4 dB, kommt eine `MIX:`-Zeile mit der Stelle: dort Atmo/Effekte leiser setzen oder den lauten Moment zwischen zwei Sätze legen.
- `AUDIO.clarity: false` = nur festes Ducking wie vor v2.38.

# Neu in v2.39 (keine Zwischenfragen-Karten in Erklär- und Conspiracy-Videos)

- `GUESS` zeigt keine Karte mehr (weder „Guess first“ mit Optionen und Countdown noch „The answer“). Die Frage stellt der Erzähler in einem Beat, die Antwort kommt im letzten Beat vor der Endcard.
- `MYTH` zeigt keine Behauptungs-Karte mehr. Die Behauptung spricht der Erzähler; im Bild erscheint nur der Urteils-Stempel (False / True / Half true), und zwar ganz am Ende: 2,3 s vor der Endcard (`verdictAt: 'b9+0.4'` legt ihn woanders hin, `verdictDur`, `stamp: false` = gar kein Stempel). Bei mehreren Einträgen gibt es ein Urteil (das letzte).
- Alte Darstellung: `CFG.questionCards: true` oder `card: true` am Eintrag. `assemble.py` weist darauf hin, wenn eine Story noch `GUESS`/`MYTH` enthält.
- `FACTS`-Karte und Endcard bleiben.

# Neu in v2.39.1 (Stadtausfahrt: Mauthäuschen, Schranke, Straßenbrücke)
- `tollBooth(p, x, z, { ry, color })` → `{ g, roof }`: Mauthäuschen mit Fenstern, Flachdach und Leuchtschild; `roof` = Punkt auf dem Dach (z. B. für Gerald).
- `boomGate(p, x, z, { w: 8, ry, close: t, dur: 2.2, open: t2 })` → `{ g, arm, closedAt }`: Schrankenpfosten mit rot-weißem Arm entlang lokal +x. Offen steht der Arm hoch; ab `close` senkt er sich in `dur` s, Warnlampe blinkt, Piepen kommt von selbst; `open` hebt ihn wieder.
- `roadBridge(p, x0, x1, z, { w: 10, pylonH: 22, color, y })`: Straßenbrücke von x0 bis x1 mit Fahrbahn, Mittellinie, Gehwegen, Geländer, zwei Pylonen und Hängeseilen.
- SFX `horn` (Auto- und Bushupe, `dur`).

# Neu in v2.39.2 (Bergwerk: Stollen, Förderkorb, Stirnlampe, Funkgerät)
- `mineTunnel(p, x, z, { len: 60, w: 4, h: 3.2, every: 3, lampEvery: 9, dead: [i …], y })` → `{ g, lamps, w, h, len }`: Stollen von z Richtung −z mit Felswänden, Holzausbau, Gleisen mit Schwellen, Kabel, Rohr und Notlampen (`dead` = Indizes, die aus sind; `lamps` = [x, y, z, an]).
- `mineCage(p, x, z, { h: 40, close: t, up: t, dur: 3, ry })` → `{ g, cage, y(t) }`: Schachtgerüst mit Förderkorb (Gitterkorb, Licht); das Scherengitter vorne (+z) schließt bei `close`, der Korb fährt ab `up` in `dur` s `h` m hoch, mit Geräusch `lift`.
- `headlamp(rig, { color, battery: t => 0..1, flicker: [[t0, t1]], intensity: 90, dist, angle })` → `{ helmet, light }`: Schutzhelm mit Stirnlampe und Lichtkegel in Blickrichtung (Hut und Haare werden ausgeblendet).
- `walkie(rig, { talk: [[t0, t1], …] })`: Funkgerät an der Brust, rote LED blinkt, solange gesprochen wird.

# Objekte in v2.40.x (Gebäude, Props, Fahrzeuge, Natur)
- **Bauernhof:** Haus mit Giebeln in Wandfarbe samt Lüftung, Regenrinnen und Fallrohren, Sturz über der Tür, Türgriff, Wandlampe (leuchtet nachts), Rückfenster, Schornsteinaufsatz, Kellerlüftung; Scheune mit Giebeln in Wandfarbe, Laufschiene, Rollen und Griff am Schiebetor, Heuaufzug, Rampe; Silo mit Füllrohr über den Rand, Luke, Rückenbügeln an der Leiter, Dachluke; Heuballen mit Schnur, gewickelten Stirnseiten und Halmen.
- **Stadt:** Ladenfenster mit Sprossen, Kämpfer und Sims, Glas-Doppeltür mit Griffen, Rahmen, Stufe und Wandlampe; Bahnsteig mit Bahnsteigkante, Dachträgern, Lampen unter dem Dach, Bänken aus Latten, Mülleimern und Fahrplantafel.
- **Natur:** Bäume mit Wurzelanläufen am Stammfuß, Laubbäume mit kleinen Blattbüscheln unter der Krone, tote Bäume mit spitz zulaufenden Ästen und Zweigen (Form, Drehung und Platzierung alter Szenen bleiben gleich).
- **Bank:** echter Giebel zur Straße mit Gesims, Zahnschnitt und Giebelfeld, Flachdach, zweiflügelige Tür mit Füllungen und Messinggriffen, Oberlicht, Wandlaternen (nachts an), vergitterte Seitenfenster.
- **Schnellboot:** Zierstreifen am Rumpf, Steuerkonsole mit Armaturen und Lenkrad, Bugreling, Klampen, Positionslichter (rot/grün), Badeplattform, Streifen am Motor.
- **Kran:** Der drehende Ausleger ist zu wenigen Meshes verschmolzen (vorher rund 60 bewegte Teile im Budget). Der Haken pendelt am Seil nach, wenn Laufkatze oder Ausleger anfahren und bremsen (gedämpft, `C.hookAt(t)` liefert die pendelnde Position, daran Gehängtes schwingt mit).
- **Rakete:** Triebwerksglocke unter dem Rumpf (stand vorher auf den Flossen über einer Lücke), Farbringe, Bullauge, Luke, Flossenspitzen, Spitze; zu wenigen Meshes verschmolzen.
- **Zaun:** Pfosten mit Pyramidenkappe und dunklem Fuß, Stoßfugen an den Latten; der Zaun endet jetzt auf einem Pfosten (vorher ragten die Latten am Ende frei in die Luft). Neue Arten `picket`, `boards`, `wire`.
- **Büsche und Felsen:** Büsche mit dichtem dunklem Kern und kleinen Blattbüscheln am Rand; große Felsen teils geschichtet (hellere Platte oben) oder mit angelehntem Spaltblock, gewählt per Hash (alte Szenen behalten Lage und Größe).
- **Glastürme:** echte Vorhangfassade (getöntes Brüstungsglas zwischen den Fensterbändern, Sprossen), Dachschienen mit Fassadenkran, Lichtband an der Krone (nachts an); ein Teil der beleuchteten Büros leuchtet kühlweiß statt warm, in der Dämmerung wie in der Nacht.
- **Krankenhaus:** Fensterreihen mit Bänken und Sprossen auch an Seiten und Rückseite, Geschossbänder, verglastes Treppenhaus, Sockel, Poller an der Vorfahrt.
- **Supermarkt:** Vordach über den Schiebetüren, Wandpaneele und Attika, Laderampe mit Rolltor und Puffern, Poller, Bank, Mülleimer.
- Neue Teile an Häusern und Plätzen sind kein Hindernis (`noHit`), die Hitboxen bleiben so groß wie vorher.
- **Motoren an und aus:** `A.engine(t, false)` lässt Propeller auslaufen, `A.engine(t)` startet sie (weich, ca. 2,5 s); `aircraft({ engineOff: true })` = geparkt mit stehenden Blättern. Läuft der Motor, zeigt der Propeller eine Unschärfescheibe mit Spitzenring statt der Blätter; langsam oder still die Blätter. Hubschrauber genauso: `heli(…, { engineOff: true })`, `H.engine(t)` / `H.engine(t, false)` (ca. 4 s Anlauf/Auslauf), Staub vom Rotor nur bei laufendem Motor.
- **Flugzeuge am Boden:** Verkehrsflugzeuge mit Türrahmen vorne und hinten, Hintertür, Notausstiegen über der Tragfläche, Frachtluke.
- **Schlepper und Kutter:** Schlepper mit Mast, drehendem Radar, Positionslicht, Suchscheinwerfer, Reling ums Deckshaus, durchgehendem Bugfender, Schleppbeting, Schornsteinring, Rettungsringen; Kutter mit drehendem Radar, Suchscheinwerfer, Antennen, Tür, Netzhaufen, Fischkisten, Luke.
- **Weltraum:** Raumstation mit angedockter Kapsel, Roboterarm, Antennenschüssel, Kuppel mit Fenstern, Handläufen und Blinklichtern, die Solarflügel drehen sich zur Sonne; zu wenigen Meshes verschmolzen (vorher rund 150 bewegte Teile). Satellit mit Düsen, Antennen, Sternsensor, Triebwerk. Mondlandefähre mit Abstiegstriebwerk, Plattform, Luke, Streben, Folienflecken, Steuerdüsen, Antennen.
- **Behoben:** Netztrommel des Kutters schwebte 1,8 m über ihren Ringen; Kabel und Rohr im `mineTunnel()` lagen L/2 über dem Stollen (unsichtbar); Rohre in Kellern und Bunkern schwebten über der Decke; Querbalken der Baumstamm-Falle schwebte 1,65 m über den Pfosten, Galgenarm der Netzfalle 1 m über dem Mast (alle: `cyl()` mit `rx`/`rz` dreht um die Mitte, die Länge war nicht abgezogen).
- **Behoben:** `collapse()` setzt das Gebäude vor seinem Startzeitpunkt in jedem Bild zurück; vorher blieb es nach einem Durchlauf für spätere Zeiten (z. B. der neue Posen-Scan beim Start) gekippt stehen und sprang beim Einsturz (`MOTION: object … jumps`).
- **Prüfung aller gedrehten Zylinder** (`cyl()` mit `rx`/`rz`, rund 90 Stellen, per Messung der Weltlage gegen die Nachbarteile): schwebend waren das Fußballtor (Querlatte 3,65 m über den Pfosten und seitlich versetzt), die Bassdrum (20 cm), das Lüftungsrohr im Labor, der Rechenstiel, der Tank auf dem Generator, Pizzarand, Würstchen und Knochenschaft, der Suchscheinwerfer des Schleppers, die äußeren Räder großer Fahrwerke (jetzt mit Achse) und die Seiten-MGs des Bombers (lagen längs neben dem Rumpf, zeigen jetzt seitlich hinaus). Alle behoben; dazu Halter für die Toms und Beine für die Standtom.
- **Glasturm-Krone:** dunkles Glas bei Tag (kein heller Strich mehr), leuchtet mit der Dunkelheit.
- **Cessna:** Kabinentüren unter der Tragfläche als Paneel auf dem Rumpf mit Fugen und Griff.
- Alle Details sind statisch (in wenige Draw-Calls gebacken), kein Hindernis, und ändern weder Maße noch Türen, Fenster oder Hitboxen.
- **Türen nacheinander:** Mehrere `openDoor()` auf dieselbe Tür bauen aufeinander auf: `openDoor(H, 2); openDoor(H, 6, { angle: 0 }); openDoor(H, 8)` = auf, zu (federt am Rahmen zurück statt durchzuschwingen), wieder auf. Vorher galt nur der letzte Aufruf, ein früheres Öffnen war unsichtbar.
- **Flugzeuge und Hubschrauber am Boden:** Ohne `y` (oder mit `y: 0`) stehen `aircraft()` und `heli()` auf Fahrwerk bzw. Kufen (`A.gy` über dem Gelände) statt bis zu den Flügeln im Boden; `fly()`, `takeoff()`, `land()` übernehmen wie bisher. Ein geparkter Hubschrauber wippt nicht mehr (Schweben nur in der Luft).
- **Behoben:** Jedes Boot hatte zwei 2,5 m hohe schwarze Stangen am Bug (nur Kriegsschiffe haben sie noch); Einkaufswagen am Supermarkt schwebten über ihren Rädern (jetzt mit Beinen, Ablage, Griffstangen).

# Tiere in v2.40.x (feste Füße, Huhn und Gerald, mehr Details)
- **Füße bleiben stehen:** Bei `walk()` steht ein Fuß, solange er Bodenkontakt hat, fest an seinem Aufsetzpunkt – auch beim Anlaufen, Abbremsen und Gangwechsel. Die ersten und letzten Schritte sind kurz; nach dem Halt setzen die Tiere die noch gespreizten Beine nacheinander unter den Körper, und der nächste `walk` beginnt aus dieser Stellung. Jeder `walk` hat einen Gang (aus seiner Geschwindigkeit: Schritt, Trab, Galopp); für einen Gangwechsel zwei `walk` hintereinander legen, der zweite mit `t0` **nach** dem Ende des ersten (sonst springt das Tier zum Startpunkt des zweiten). Körperrollen, Wirbelsäulenschwung und `shake` schieben die Füße nicht mehr seitlich; Krokodilbeine (gespreizt) bleiben ebenfalls stehen. Beginnt ein `walk` in eine neue Richtung, tritt das Tier während der Drehung (0,45 s) auf der Stelle um; stehende Füße bleiben auch in Kurven an ihrem Platz. Biped-Dinos (T-Rex, Raptor) können jetzt auch `lie`, `sleep`, `rear`, `pounce`, `swipe` (vorher Absturz der Seite).
- **Huhn:** `animal({ kind: 'chicken', color })` mit rundem Körper, angelegten Flügeln mit Federreihen, Schwanzfächer, Kamm, Kehllappen, Schnabel, Augen mit Lidern (blinzeln), geschuppten Beinen und Zehen; stolziert mit festen Füßen und Kopf-Rucken, pickt mit dem Hals, schaut ruckartig umher; rennt es schnell, gehen die Flügel halb auf. Größe, Rig (`root, body, head, legs`) und API wie bisher; `detail: false` = alter Klötzchen-Look.
- **Gerald:** dasselbe detaillierte Huhn (Maßstab 1,5) mit seiner kleinen Sonnenbrille (umlaufende Gläser über beiden Augen). Er pickt nie und tut weiterhin nichts. `gerald({ detail: false })` = alter Look.
- **Details:** Hund mit hängenden Schlappohren (steckten im Kopf), Mammut mit kleinen Elefantenohren und langem Fell an den Flanken, Elch mit Schaufelgeweih (Stange, gewölbte Schaufel, Sprossen), Schlange mit durchgehendem Körper (statt Perlenkette) mit hellem Bauch, Bändern/Rauten, Schlitzpupillen; Vogelflügel mit Federreihe an der Hinterkante und gezackten Deckfedern; Frosch mit Maul, Vorderbeinen und Schwimmfüßen; Spinne läuft im Wechselschritt nach zurückgelegter Strecke (Beinspitzen rutschen nicht).
- **Laufvögel, Echsen, Elefanten, Drehungen:** `walk()` mit Vögeln (Ente, Taube, Möwe, Adler, Pinguin …) setzt die Füße fest auf (auch beim Anlaufen und Anhalten), die Taube nickt im Schritt; `lizard()` hat einen neuen Körper (flach, langer Schwanz, Rückenstreifen, zweiteilige Beine mit Zehen) und trabt nach zurückgelegter Strecke; Elefant und Mammut wechseln bei Tempo in einen Passgang mit kürzeren, schnelleren Schritten statt zu überstrecken (über ~4 m/s rutschten die Füße); bei langen Schritten senkt sich der Körper etwas. Dreht ein neuer `walk` um mehr als 90°, dauert die Drehung entsprechend länger (180° = 0,9 s) und das Tier tritt mehr Schritte.
- **Meer:** Wale und Delfine mit hohem, schmalem Schwanzstiel (vorher dünner Stab), Orca-Augenfleck oval; Haimaul folgt der Unterseite der Schnauze (der geschlossene Kiefer hing als Platte unter dem Kinn); `jelly()` mit Glocke mit gewelltem Rand, leuchtendem Kern, 12 Tentakeln und 4 Mundarmen, die wehen und nachschleppen (vorher 8 gerade Stäbchen); Löwenmähne aus zotteligen Büscheln.
- Test: `tests/animals-detail.*`, `tests/sea-detail.*`.

# Neu in v2.40 (Fehlerbehebung: Haare, Hut, Mantel, Räder; mehr Details)

- **Haare, Hut, Umhang springen nicht mehr:** Jedes Teil einer Figur startet in jedem Bild aus seiner gebauten Lage; das Nachschwingen addiert sich nicht mehr von Bild zu Bild auf (vorher: Haare wanderten vom Kopf weg und sprangen an den Grenzen der Render-Blöcke zurück, die ganze Figur ruckte).
- **Prüfung (`--audit`, läuft bei `--shots` mit):** vergleicht an allen Grenzen der 12 bzw. 20 Render-Blöcke, an jedem Shard-Start und jedem Stückanfang des Renders (v3.2, angesprungen vom Ende des vorigen Stücks desselben Shards) und 12 weiteren Momenten jedes Einzelteil jeder Figur, jedes Tiers und jedes bewegten Objekts (Lage, Drehung, Größe, sichtbar), Materialien, Lichter und Kamera: direkt angesprungen, durchgespielt, jedes 3. Bild, zurückgesprungen, dazu eine zweite frische Seite. Abweichungen kommen als `MOTION:`-Zeile mit Figur, Teil und Zeit.
- **Tiere:** `beast()` mit geformten, bemalten Körpern (Rumpf, Hals, Kopf, Kiefer, Beine, Schwanz), Augenlidern, Paarhufen und Zehen.
- **Fahrzeuge und Züge:** Karosserien mit Radkästen, Felgen, schrägen Scheiben, Türen mit dunklem Innenraum; jedes Rad rollt nach seinem eigenen Radius, Vorderräder lenken, auch im `traffic()`.
- **Behoben:** Heuballen schwebte 0,55 m über dem Boden, Burgfahnen wurden von der Turmwand abgeschnitten (`cloth({ wall: true })`), schwarze Türflächen am Bauernhaus.

# Neu in v2.40.27 (Käfigkampf und Himmelsmodell)
- `arenaHall(p, { w: 80, d: 80, h: 20, x, z, color, strip, aisle })` → `{ g }`: dunkle Halle (Boden, Wände mit Notausgang-Schildern, Decke mit Traversen, Lichtleisten im Gang). Dazu `SKY` 'night', `CFG.clouds: false`, kein `biome`; die Decke wirft keinen Schatten, das Nachtlicht hellt leicht auf.
- `fightCage(p, x, z, { r: 4.6, h: 2.1, open: [7, 0, 1], doorSide: 2, door: t, truss: 7.5, intensity: 520, angle, accent, table: [x, z] })` → `{ g, R, door: [x, z], table, spot, inside(x, z) }`: Achteck-Käfig mit Matte, gepolsterten Pfosten und Maschendraht. `open` = Felder ohne Gitter (Standard die drei Richtung +z, damit die Kamera von außen durchschauen kann: Außenkameras nur mittig durch ein offenes Feld). Die Tür sitzt im Feld `doorSide` (2 = +x) und fliegt bei `door` auf (Knall, nachfedern). Lichttraverse mit Strahlern und einem Spot von oben; Glockentisch außen (Standard links).
- `ringBell(C, t, { n: 3, v })`: Ringglocke am Tisch des Käfigs, n schnelle Schläge mit Hammer, Ton `bell` (auch als `hits`-Art).
- `fightBot({ color, accent, visor, core, scale: 1.04 })` → Rig: Kampfroboter auf dem Figuren-Rig (`walk`, `punch`, `kick`, `dance`, `track` … funktionieren): Metallhülle, Brustplatte mit leuchtendem Kern (`rig.core`), rote Akzente, Visier-Kopf (`rig.botHead`), `rig.neckAt(t)` = Halspunkt in Weltkoordinaten.
- `headOff(bot, t, { to: [x, z], h: 1.6, bounces: 2, spin: 10, face: 0, until, sparkEnd })` → `{ head, land, stop }`: Der Kopf fliegt bei t mit Funken, Klirren und Brummen ab, dreht sich wie ein Kreisel, springt auf und bleibt aufrecht liegen, Visier Richtung `face` (Gierwinkel, 0 = +z). Aus dem Hals sprühen weiter Funken. `until` blendet den losen Kopf aus (z. B. wenn ihn jemand aufhebt: dann einen zweiten `botHead()` an `land` per `carry` nehmen). Nur Roboter, nie Menschen.
- `botHead(p, { at: [x, y, z], color, accent, visor })` → Gruppe: der Roboterkopf allein (Unterkante bei y, Visier nach +z), z. B. als Gegenstand für `carry`.
- `gloves(rig, { color, cuff })`: Boxhandschuhe auf beiden Händen (Finger ausgeblendet).
- `orrery(p, x, y, z, { scale: 1, angles: [8 Werte in Grad], align: [t0, dur], line: 0, orbits, orbitOpacity, planetScale: 1, ringW: 1 })` → `{ g, sun, names, pos(i, t) }`: Sonnensystem-Modell (Sonne, Merkur … Neptun auf Bahnringen, Bahnradien gestaucht: Jupiter bei 23, Neptun bei 41 × scale). `angles` = Lage jedes Planeten (0 = +z, Reihenfolge Merkur … Neptun); `align` schwenkt alle Planeten in `dur` s auf den Winkel `line` (eine Linie von der Sonne aus). `pos(i, t)` liefert die Weltposition, z. B. für Callouts (2 = Erde). Kamera für den Blick von oben ca. 95 m darüber, dann `planetScale: 2.5, ringW: 3`, sonst sind Planeten und Bahnen nur Punkte und Haarlinien. Sonne und Bahnen ignorieren den Nebel.
- `telescope(p, x, z, { ry, pitch: 0.55, h: 1.25, color })` → `{ g, eye }`: Linsenteleskop auf Dreibein, Tubus in Richtung `ry` um `pitch` angehoben; `eye` = Okular in Weltkoordinaten.

## Pottwal und Innenleben großer Tiere (v2.42)

- `sea({ kind: 'spermwhale' | 'sperm', x, y, z, ry })`: Pottwal (16 m) mit Blockkopf, schmalem Unterkiefer mit Zähnen (oben keine), weißem Mundrand, faltiger Haut hinter dem Kopf, Höcker mit „Knöcheln“ statt Rückenflosse und S-förmigem Blasloch vorn links. `W.do('spout', t)` bläst schräg nach vorn links, `W.do('open', t, { dur })` öffnet den Kiefer weit (ca. 65°), `W.do('bite', t)` schnappt zu. Neue Optionen in `SEA` für alle Tiere: `mouth: [u0, u1]` (Lage des Mauls), `jawW` (Kieferbreite), `upper: 0` (keine Oberzähne), `spout: [x/R, y/R, z/L]`, `blowhole`, `knuckles`.
- `innards(p, x, z, { kind, len, r, y, color, squeeze, amp })`: begehbares Inneres eines großen Tiers (Wal, Dino, Riesenfrosch). `kind: 'throat'` = gerippter, nasser Fleischtunnel von z Richtung −z (`len`, Radius `r`), Schleimfäden von der Decke, dunkles Ende (`closed: true` = auch der Eingang dunkel); `'stomach'` = muskulöse Magenkammer (`r`) mit einem Haufen Tintenfisch-Schnäbel (`beaks`, `pile`), Säurepfütze (`acid`) und grünem Dunst (`haze: false` = aus). `squeeze: [[t0, t1], …]` lässt die Wände in Wellen zusammenziehen (`amp`, Standard 0,2). Rückgabe `{ g, at(u), floorY(t), center, r }` (`at(u)`: Punkt auf der Tunnelachse, 0 = Eingang). Innen ist es dunkel: Licht über `flashlight()` oder `glow()`; `SKY` z. B. `'deepsea'`. Weit weg von der Außenwelt bauen (≥ 1,5 km).
- Test: `tests/whale-inside.*`.

## Versteinern und Salzkrusten (v2.43)

- `petrify(obj, { color, t0, dur, crust, grains })`: macht ein Tier, eine Figur oder einen Gegenstand zur kreidigen „Stein“-Statue (matt, Farbe `#E4DED2`, Salzkörner oben drauf). Mit `t0` + `dur` geht die Farbe über die Zeit über (Verkrustung), sonst sofort. Für Natronsee, Medusa-Mythen, Statuen, versteinerte Tiere.
- **Vergleich und Archiv (v2.47):** `balance(p, x, y, z, { len, tilt })` riesige Balkenwaage (Masse-Vergleich: Mond gegen Bombenberg), Objekte an `left` / `right` hängen, `tilt` Zahl oder `t => …`. `archiveDesk(p, x, z, { ry, open: t })` Archivecke der 50er: Schreibtisch mit Schreibmaschine, Lampe, Aktenordner (Deckel klappt bei `open` auf, `page` = Anker für Callouts), Aktenschränke. `planetSet(…, 'moon')` Mondoberfläche.
- **Pool-Villa (v2.46):** `swimPool(p, x, z, { w: 4.5, d: 10, h: 1.9, drain: [t0, t1] })` erhöhte Terrasse mit Infinity-Pool (Glaskante auf +z, `P.wall` mit `breakApart` zerbrechen, `drain` leert das Becken), Rückgabe `{ g, wall, level(t), top, w, d }`. `airbed(p, x, y, z, { color, deflate: [t0, t1], pop: t })` Luftmatratze (y Zahl oder `t => P.level(t)`), `floatie(p, x, y, z, { kind: 'flamingo' | 'ring' })` Schwimmtier mit `seat` für einen Reiter (Gerald), `divingBoard(p, x, y, z, { len, ry })` Sprungbrett mit `tip`.
- **Planeten zum Betreten (v2.45):** `planetSet(p, x, z, kind)` baut eine kleine Oberfläche weit weg von der Hauptwelt (x ≥ 1000, je Set ≥ 1000 m Abstand): `mercury` (Fels, glühende Tagseite links, Reif auf der Nachtseite), `venus` (rissiger Basalt), `mars` (roter Staub, Steine, Radspuren, Berge), `jupiter` · `neptune` (kein Boden: Wolkenbänder, durch die man fällt, Oberkante y = 0; Neptun mit Sturmwirbel). Dazu die Himmel `SKY` 'mercury' · 'venus' (dichter gelber Dunst) · 'mars' · 'jupiter' · 'neptune', zeitlich passend zum Set umschalten. `portal(p, x, y, z, { r, color, ry, open: [t0, t1], flicker: [t, …] })` leuchtender Portalring mit wirbelnder Scheibe.
- **Erste Hilfe (v2.44):** `clutch(rig, t0, t1, { amp })` Hand aufs Herz, Schultern hoch, leicht vorgebeugt (Herzinfarkt, Schreck). `cpr(helfer, opfer, t0, t1, { rate: 110, side: 1 })`: Die Helferin kniet neben einer liegenden Figur (vorher `fall(opfer, t, { dir })` ohne `getUp`) und drückt mit gestreckten Armen auf die Brustmitte, der Brustkorb federt mit; Takt `rate` pro Minute, dazu Hit `tick` als Metronom. `aedBox(p, x, y, z, { ry, open })` Defibrillator-Kasten an der Wand (grün, weißes Herz mit Blitz), `open: t` Tür auf; Rückgabe `{ g, unit, door }`, `unit` mit `holdItem(…, { after: 'hide' })` holen.
- `tripodCam(p, x, z, { h, ry, flash: [t, …] })` (v2.43.2): Fotokamera auf Stativ (drei gespreizte Beine, Gehäuse, Objektiv); `ry` = Blickrichtung des Objektivs, `flash` = Zeitpunkte, an denen der Blitz aufleuchtet (mit `FLASHES` und Hit `shutter` kombinieren). Rückgabe `{ g, head }` (`head` als Kamera- oder Callout-Ziel).
- `jetty(p, x, z, { len, w, h, seg, ry, rails, depth, color, breakable })` (v2.43.1): Holzsteg bzw. Bohlenweg von (x, z) Richtung +z übers Wasser: Planken in Abschnitten, Pfosten bis zum Grund, optional Geländer. Rückgabe `{ g, sections, end, h, at(u) }`; `end` (letzter Abschnitt) ist beweglich, z. B. `breakApart(J.end, t, { dir: [0, -1, 0.3] })` – der Steg bricht unter jemandem weg.
- `saltCrust(p, x, z, { r, n, size, y, color })`: flache, weiße Salz- und Sodakrusten (gerissene Platten mit Rand) auf einem See oder einer Salzpfanne; `y` = Höhe der Wasser- bzw. Bodenfläche.
- Test: `tests/salt-lake.*`.

# Neu in v2.48 (ElevenLabs-Erzähler, Stimme je Kategorie)

## Stimme je Kategorie
- Ist `ELEVENLABS_API_KEY` gesetzt, spricht `voice.py` den Erzähler mit ElevenLabs. Nur amerikanische Sprecher:

| Kategorie | Erkennung | Stimme | Voice-ID |
|---|---|---|---|
| What if (Einzelvideo) | sonst | Denzel | `7sXif1ZLnLgbMgmFvs2G` |
| Serie | `CFG.series` gesetzt | JM – Husky & Engaging | `EkK5I93UQWFDigLMpZcX` |
| Explaining | `CFG.kind: 'explain'` | Adam | `wBXNqKUATyqu0RtYt25i` |
| Conspiracy | `CFG.kind: 'conspiracy'` / `'debunk'` | Declan Sage | `kqVT88a5QfII1HNAEPTJ` |
| Horror | `CFG.kind: 'horror'` | Storm Styles | `YI5bDiiDOYHHb2eLadHv` |
| True Crime | `CFG.kind: 'truecrime'` | Declan Sage | `kqVT88a5QfII1HNAEPTJ` |

- Reihenfolge: `kind` (explain / conspiracy / horror) vor Serie vor Story. Horror-Musik allein macht kein Horror-Video. `kind: 'horror'` verhält sich sonst wie `'story'` (Badge „What if“).
- Innerhalb einer Serie bleibt die Stimme gleich, solange `kind` in allen Folgen gleich bleibt.
- `CFG.voice`: `'auto'` (Standard; Kokoro-Namen wie `deep`, `documentary` zählen als auto) · `'denzel' | 'jm' | 'adam' | 'declan' | 'storm'` oder eine ElevenLabs-Voice-ID legt eine Stimme fest · `{ engine: 'kokoro' }` bzw. `--kokoro` = Offline-Stimme · `{ model: 'eleven_v4', el_speed: 1.05 }` = Modell und Grundtempo.
- `python3 voice.py <slug> --which` zeigt Kategorie und Stimme ohne Synthese.

## Gefühl mit ElevenLabs
- Die Töne aus v2.38 (Automatik und `tone`/`[tag]`) werden zu ElevenLabs-Audio-Tags: calm · tense · worried · excited · shout → `[shouting]` · whisper → `[whispers]` · sad · dramatic · deadpan · curious · relieved. Automatische Töne nur ab Stärke 0,6. Keine PSOLA-, Flüster- oder Schrei-Bearbeitung darüber; Atmer macht die Stimme selbst.
- Einwürfe (`[whoa]`, `[ugh]` …) spricht ElevenLabs mit passendem Tag (excited, annoyed, worried, surprised, laughs); `[gasp]`/`[sigh]` bleiben Laute.
- Tempo pro Satz wie bisher (an ElevenLabs als `speed` 0,7–1,2). Wortzeiten, Karaoke, Lippen-Sync und Mix unverändert.
- Modell: `eleven_v4`, sonst `eleven_v3`, sonst `eleven_multilingual_v2` (ohne Tags). Jede Zeile wird in `.voice/el-*.npy` gecacht; nur geänderte Sätze kosten erneut Credits. `voice.py` meldet `elevenlabs: category … · model … · N new requests (… characters)`.
- Ohne Key oder wenn der Key schon beim ersten Satz scheitert (ungültig, keine Credits): ganzes Video mit Kokoro, nie gemischt. Stimmen im Bild (`who: 'steve' | 'you'`) bleiben Kokoro, wenn es installiert ist.

## Museum und Einbruch (v2.49, True Crime)
- `museumGallery(p, x, z, { len: 28, w: 9, h: 6.2, y, side: -1, windows: 5, breakAt: 1, cases: [{ x, z, items, ry, rope, open }], facade })` → M: prunkvolle Palast-Galerie entlang z (Parkett mit rotem Läufer, cremefarbene Wände mit Goldpilastern und Gemälden, bemaltes Tonnengewölbe mit Goldrippen und Himmelsfeldern, drei Kronleuchter, Marmorbüsten, Durchgang bei +z). `y` = Fußbodenhöhe (Obergeschoss), Fensterwand bei x = side · w/2. Mit `facade` (Standard) auch die Außenseite: Steinsockel mit Bogenfenstern, Gurtgesims, Pilaster, Fensterverdachungen, Balkon mit Balustrade vor Fenster `breakAt`, Kranzgesims, Mansarddach mit Gauben. `M.win` (Scheiben des Balkonfensters), `M.winAt`, `M.cases`, `M.at('door' | 'window' | 'balcony')`, `M.breakWindow(t, { cut: [t0, t1] })` (Funken von außen, dann zersplittert die Scheibe). Hülle wirft keine Schatten (Tageslicht fällt hinein).
- `jewelCase(p, x, z, { w, d, h, glass, items: ['crown', 'tiara', 'necklace'], scale, ry })` → C: Vitrine auf Sockel mit Goldleisten, Samtkissen, Glashaube mit Lichtleiste. `C.items[i]` (Schmuckgruppen: `vanish`, `carry`, `toss`), `C.at(i)`, `C.front`, `C.cut(t0, t1)` (Trennschleifer an der Frontscheibe), `C.smash(t)` (Riss, dann zerspringt die Haube, der Rahmen bleibt).
- `jewel(p, kind, x, y, z, { scale, gem, metal })`: crown · tiara · necklace · brooch · earrings (Gold, Perlen, leuchtende Steine).
- `liftTruck(p, x, z, { ry, color, ladder: 9 })` → V (ladder = Länge des Grundteils in m): Lkw mit Möbellift (Leiter auf Drehkranz, ausziehbar, waagerechte Plattform). `V.raise(t0, t1, { yaw, pitch, extend })`, `V.ride(t0, t1, { to: 0..1 })`, `V.basketAt(t)` (Weltposition des Plattformbodens: Mitfahrer dort hinstellen), `V.basketYaw(t)`.
- `grinder()` (Trennschleifer, für `holdItem`), `grindSparks(at, t0, t1, { rate })` (Funkenfächer + Kreischen), `hivis(figur, { color })` (Warnweste), Outfit `char('you', { outfit: 'guard' })` (dunkelblaue Wachdienst-Jacke).
- `CFG.kind: 'truecrime'`: Badge „True Crime“, sonst wie eine Story (du als Zeuge, Ende „What would you have done?“); Erzähler Declan Sage (ElevenLabs).

## Eine Aufnahme pro Beat (v2.50)
- Mit ElevenLabs spricht der Erzähler jeden Beat in **einer** Aufnahme: die Sätze fließen ineinander, der Ton jedes Satzes steht als Tag mitten im Text (`[worried] … [deadpan] …`), ` | ` wird zu einer Pause „…“. Ein Video braucht so ca. 10 statt 25 Anfragen. `CFG.voice: { el_beat: false }` = wieder eine Aufnahme pro Satz.
- Jede Aufnahme wird einmal im Grundtempo (`el_speed`, 1.05) geholt und gecacht; passt ein Beat nicht ins Fenster, streckt `voice.py` die vorhandene Aufnahme tonhöhentreu (ffmpeg `atempo`) statt neu anzufragen — Neu-Timing kostet keine Credits.

## Stimme ohne API-Key: ElevenLabs über den Connector (v2.49)
Ist in der Sitzung kein `ELEVENLABS_API_KEY` gesetzt, aber der ElevenLabs-Connector verbunden, spricht der Erzähler trotzdem mit ElevenLabs: `elmcp/requests.py` ersetzt für `voice.py` das Paket `requests`.
1. Planen: `EL_LOG=el_log.jsonl ELEVENLABS_API_KEY=via-mcp PYTHONPATH=.engine/elmcp python3 assemble.py <slug>` → `el_log.jsonl` enthält jede Zeile (Text mit Ton-Tag, Modell, Tempo); nichts wird bezahlt.
2. Jeden eindeutigen Text einmal mit `creative_generate_speech` erzeugen (Voice-ID der Kategorie aus `EL_VOICES`, `eleven_v4`, `generations_count: 1`, alle in einen Flow), mit `creative_get_generations` die URLs holen, laden und `{ Text: Datei }` als JSON speichern.
3. Bauen: `.voice/el-*.npy` löschen, dann `EL_MAP=<map.json> ELEVENLABS_API_KEY=via-mcp PYTHONPATH=.engine/elmcp python3 assemble.py <slug>`. Das Tempo, das `voice.py` je Zeile verlangt, setzt der Shim per ffmpeg `atempo` um — Neu-Timing braucht keine neue Generierung.

## Umgebung & Look (v3.5)
Seit v3.5 sieht jede Szene ohne Zutun hochwertiger aus: Hintergrund, Boden-Ausstattung, Räume, Wasser, Licht, Farblook und Materialien greifen automatisch. Jeder Teil lässt sich einzeln abschalten (siehe unten). Tests: `tests/v35-*.story.js` + `.scene.js`.

### Neu in v3.5: Landschaft (Hintergrund, Skyline, Boden von selbst, Bäume, Felder)

Alles hier wirkt ohne Änderung an der Szene. Test: `tests/v35-landscape.story.js` + `.scene.js`.

#### Hintergrund: `backdrop(kind, { coast, seed, r, r0, sector, also })`
- `hills` · `islands` · `alps` · `snow`: statt einzelner Kegel („Pyramiden“) jetzt zwei durchgehende, weiche Hügelbänder rund um die Szene: vorn (~310 m) grüner mit Baumkante am Kamm und dunkleren Waldflecken, hinten (~450 m) bläulich. Höhe entlang des Rings aus mehreren Sinuswellen (Zufall aus dem Backdrop-Seed), Querschnitt mit Vorderhang, Kamm und Rückhang, die Kammlinie schwankt vor und zurück. In jedem 9:16-Bild stehen mehrere Hügel, nie ein einzelner Berg.
- `alps` / `snow`: hinten eine zackige Kette (Gipfel mit Sätteln dazwischen) mit Schneekappen ab einer unregelmäßigen Schneegrenze; vorn bewaldete (bzw. verschneite) Rücken.
- `mesa`: Tafelberge wie bisher, dazwischen und dahinter niedrige Sandrücken, damit keine Lücken im Horizont bleiben.
- Küste (`coast`): die Bänder tauchen zur Seeseite unter den Meeresspiegel; `islands` legt flache Inseln mit Sandrand aufs Meer.
- Dunst wie bisher (nimmt die Nebelfarbe jeder Tageszeit an). Neu: die untersten Meter jedes Bandes bekommen den echten Nebel, so endet der Boden nicht mehr in einem hellen Streifen vor klareren Hügeln.
- `skyline`: Türme mit Rücksprüngen (2–3 Stufen), Dachaufbauten, Antennen; mehr Farben (Beton, Glas, Klinker). Fensterraster pro Fassade im Shader: am Tag dunkles Glas, ab der Dämmerung geht ein wachsender, zufälliger Anteil an (meist warm, einige kalt-weiß), gesteuert von `NIGHTK`; die Fenster leuchten durch den Dunst. Fenster unter ~2 Pixeln werden zu ihrem Mittelwert (kein Flimmern). Rote Flugwarnlichter auf Antennen blinken in Dämmerung und Nacht (reine Funktion von t).
- `sector: [vonGrad, bisGrad]` (nur `skyline`): Türme nur in diesem Bereich des Horizonts (0° = +z, 90° = +x), z. B. eine Stadt auf einer Seite.
- `also: true`: zusätzliche Ebene, z. B. `backdrop('skyline', { also: true, r0: 200, sector: [140, 220] })` vor den Hügeln. Zählt nicht als „Szene hat einen Hintergrund“.
- `NIGHTU` (Uniform mit `NIGHTK`) und `BDT` (Uniform mit t) stehen für eigene Shader bereit; ein `tick` setzt sie, sobald eine Skyline gebaut ist.

#### Boden kleidet sich selbst: `ground()` ohne `biome()`/`city()`/`backdrop()`
- Bisher: endlose grüne/graue Fläche bis zum verschwommenen Horizont. Jetzt bekommt die Szene beim Backen (DEFER) eine leichte Ausstattung passend zur Bodenfarbe:
  - grün → `plain` + `hills` (vereinzelte Laubbäume, Birken, Kiefern, Büsche, Felsen im Ring; Grasbüschel in Bodenfarbe, Kiesel, wenige Blumen auf der Spielfläche)
  - sandfarben → `plain-sand` + `mesa` (Kiesel, wenige trockene Büsche, Felsen, vereinzelt Kakteen/tote Bäume)
  - weiß → `plain-snow` + `snow` (Schneekiefern, Felsen, Schneewehen)
  - grau → `plain-stone` + `skyline`; dunkelgrau/braun → `plain-stone` + `hills`
  - bläulicher Boden, `SKY` unter Wasser, Tiefsee, Weltraum oder Planeten: nichts.
- Der Ring beginnt hinter allem, was gebaut ist (höchstens `CFG.area` × 3), und bleibt auf dem Boden (`ground({ size })`). Wie bei `biome()` bleiben Kameras und ihre Sichtlinien, `walk`-Wege, `horde`-Bahnen, Gebäude, Fahrzeuge, Figuren frei; Seen und Fluten (`water()` ohne Küste) auch. Eigener Zufall, der globale bleibt unverändert (Layout der Szene wie vorher). Innenräume auf der Bodenplatte stehen dann im Garten.
- Aus: `ground({ dress: false })` oder `CFG.autoDress: false`. Die Biome gibt es auch direkt: `biome('plain')`, `'plain-sand'`, `'plain-snow'`, `'plain-stone'`.
- `runBiome(kind, { dry: true })`: hält Wasserflächen (`water()`) frei; `{ flowers: false }`: keine Blumen.

#### Bäume: `tree(p, x, z, { kind: 'round' | 'birch' })`
- Jeder Baum hat aus seiner Position eigene Form: Krone gestreckt oder gedrungen, breiter oder schmaler, leicht seitlich versetzt, 6–11 unregelmäßig verteilte, leicht gestauchte Blätterballen, 1–2 helle Kuppen oben, leichte Schräglage (Wurzeln bleiben am Boden), Farbton, Sättigung und Helligkeit leicht verschieden. Reihen gleich großer Bäume wiederholen sich nicht mehr. Seed-Layout unverändert (gleich viele `rnd()`-Aufrufe).

#### Felder: `field(p, x, z, w, d, { crop })`
- `wheat`: Büschel aus 5 Halmen mit Ähren statt eines Kegels; Boden darunter stoppelbraun (`soil` wie bisher änderbar).
- `corn`: Stängel mit 7 gebogenen Blättern, Kolben im Hüllblatt, Fahne oben.
- `cabbage`: fester Kopf in einer Rosette aus gewölbten Blättern.
- Weiter instanziert, wiegen sich im Wind wie bisher (Kohl steht still), `colors` färbt wie bisher (Schattierung kommt aus Vertex-Faktoren).


### Innenräume, Gemälde, Museum, Plätze (v3.5)

#### Geschlossene Räume, die sich nach der Kamera richten
- `interior(…, { closed: 'auto' })` (Standard): Der Raum bekommt eine **Vorderwand** (mit Fenster, Steckdosen, Fußleiste) und eine **Decke**. Beide sind nur zu sehen, solange die Kamera im Raum ist. Von außen bleibt der Raum offen wie ein Puppenhaus, von innen sieht man keinen Himmel und kein Gras mehr. Die Sichtbarkeit wird in jedem Bild aus der Kamera berechnet (reine Funktion von t), auch für Splitscreen und Cover-Kamera.
  - Vorderwand: sichtbar, wenn die Kamera innerhalb der Grundfläche und unter Deckenhöhe steht.
  - Decke: blendet auf dem letzten Meter vor der offenen Seite ein (`ceilFade: 1.0` m), es gibt also keinen Sprung, wenn die Kamera hineinfliegt.
  - Beide werfen keinen Schatten. Das Licht im Raum sieht also aus wie vorher (Sonne von oben), und `bake()` fasst sie nicht mit anderen Teilen zusammen. Für die Hitboxen zählen sie nicht.
  - `closed: true` = immer zu, `closed: false` = alter offener Schnitt. Für alle Räume: `CFG.closedRooms: false`.
  - `front: true` und `ceiling: true` funktionieren wie bisher (feste Wand bzw. Decke mit Schatten). Mit `ceiling: true` gibt es keine Auto-Decke, mit `front: true` keine Auto-Vorderwand.
  - `frontWindow: false | 'high'` steuert das Fenster in der Vorderwand. `ceilColor` setzt die Deckenfarbe. Ohne Hängelampe (`ceiling`/`lamps`) bekommt die Auto-Decke an den Lampenplätzen flache Deckenleuchten.
  - Funktioniert auch mit `ry` und erhöhtem `y`. `R.frontW` und `R.ceilG` sind die Gruppen.
- Wenn die Kamera im Raum steht und nach draußen sehen soll (Monster vor dem Haus), `closed: false` setzen.

#### Türen führen in einen beleuchteten Flur
- Die Türwand eines `interior()` hat jetzt eine echte Öffnung. Dahinter liegt ein kurzer, warm beleuchteter Flur (Dielen, Läufer, Tapete, Deckenleuchte, Bild mit Lichtkegel gegenüber der Tür, Konsole, Garderobe). Eine offene Tür (`openDoor(R, t)`) zeigt also nie mehr Schwarz oder Gras. Keller: Ziegel und Glühbirne, Bunker: Beton, Garage/Bad/Laden/Klassenzimmer: schlicht.
  - `hall: false` (oder `CFG.halls: false`) = alte dunkle Türfläche. `hallStyle`, `hallD` (Tiefe, 1,5 m), `hallLen` (Länge entlang der Wand, 3,4 m). `R.hall` = Gruppe, `R.at('hall')` = Mitte des Flurs.
  - `doorW`, `doorH`, `doorZ`: Maße und Lage der Tür. `doorway: true` = offener Durchgang ohne Türblatt.
- `house()`: Hinter der Haustür liegt jetzt ein kleiner Flur (Garderobe, Bild, Lampe), der Hauskörper ist dort ausgeschnitten. `hall: false` = alte dunkle Fläche, `hallWall` = Flurfarbe.
- `museumGallery()`: Hinter dem Durchgang bei +z liegt der nächste Saal (Bild mit Lichtkegel, Büste) statt einer schwarzen Fläche. `next: false` = alt. `M.next` = Gruppe.
- Einzeln: `hallStub(p, x, y, z, ry, { x0, x1, d, h, style: 'home' | 'museum' | 'cellar' | 'bunker' | 'plain', wall, lit, shell, art })`. Die Öffnung liegt in der Ebene z = 0 und schaut nach +z, der Flur läuft von x0 bis x1 und d tief nach −z. Die Wände leuchten leicht selbst (kein echtes Licht). `shell: false` = nur die Innenverkleidung, wenn der Flur in einen festen Körper geschnitten ist.

#### Gemälde
- `painting(p, x, y, z, ry, { w, h, art, seed, frame, mount, lit })`: gerahmtes Gemälde mit gemaltem Bild (Canvas-Textur). y = Unterkante, z = Wandfläche (der Rahmen ist 5 cm tief).
  - `art`: `'auto'` (Standard, je nach Position) · `'landscape'` · `'portrait'` · `'still'` (Stillleben) · `'sea'` (Seestück mit Schiff) · `'abstract'` (Raster, Farbfelder, Kreise, Drips, Quadrate) · `'child'` (Kinderzeichnung, mit Klebeband an der Wand) · `false` = altes flaches Bild.
  - Rahmen: Gold mit Lippe und Perlstab, dunkles Holz oder schmal (Abstraktes). `frame: 'gold' | hex | 'none'`. Kleine Bilder bekommen manchmal ein Passepartout (`mount`).
  - Leichter Firnisglanz, vergilbter Firnis, dunkle Ränder, feine Risse. `lit: 0..1` lässt die Leinwand leicht leuchten (angestrahlt).
  - Gleiche Szene = gleiche Bilder. Texturen werden geteilt, höchstens `CFG.artMax` (28) verschiedene (zusammen ca. 7 MB). Alle Gemälde zusammen zeichnet eine einzige Funktion, `CFG.paintings: false` schaltet auf das alte flache Bild um.
- `FURN.picture` / `R.wallPut('picture', …)` und die Bilder an Seitenwänden nutzen das automatisch, das Kinderzimmer bekommt eine Kinderzeichnung, `museumGallery()` echte Gemälde mit Bilderleuchten und Lichtkegeln, auch das große Bild an der Stirnwand statt der Farbblöcke (`paintings: false` = alt, `M.paintings`).
- `pictureLight(p, x, y, z, ry, { w })`: Bilderleuchte aus Messing (Wandplatte, Arm, Schirm mit leuchtendem Schlitz).
- `glowDecal(p, x, y, z, ry, { w, h, kind: 'cone' | 'round', color, i, flat })`: Lichtfleck ohne echtes Licht (additiv, kein Schatten, zählt nicht zum Lichtbudget). `'cone'` = Lichtkegel an der Wand unter einer Lampe, `'round'` = runder Fleck, `flat: true` = auf dem Boden.

#### Museum
- `interior(…, { kind: 'museum' })` (11 × 8 m, 4,6 m hoch): dunkelrote Wände, Parkett, drei Gemälde an der Rückwand (das mittlere groß, hinter einer Kordel), Bilder an den Seitenwänden, alle mit Bilderleuchte, Lichtkegel und Schildchen, zwei Vitrinen (`jewelCase`) auf Sockeln mit Kordel-Absperrung und Lichtfleck am Boden, Museumsbank, Büste und Amphore auf Sockeln, breiter offener Durchgang in den nächsten Saal (mit Flur). Die Auto-Decke hat ein Oberlicht (`skylight: false` = ohne).
- `kind: 'gallery'`: dasselbe modern (weiße Wände, helles Parkett, abstrakte Bilder, Bronzeskulptur). `style: 'modern' | 'classic'` wählt das auch für `museum`.
- `R.cases` (jewelCase-Objekte: `C.smash(t)`, `C.cut(t0, t1)`, `C.items`), `R.paintings`, `R.at('case0' | 'case1' | 'museumBench' | 'door' | 'hall')`, `R.seat('museumBench', i)`.
- Bausteine für eigene Räume: `R.art(wand, u, y, { w, h, art, lit, spot: true })` hängt ein Bild an `'back'` (u = x), `'left'` / `'right'` (u = z) oder `'front'`, mit `spot` samt Leuchte, Lichtkegel und Schild. `R.rope([[x, z], …], { closed })` = Kordel-Absperrung.
- Einzelstücke (`furnish` / `R.put`): `museumBench`, `vitrine` (jewelCase, `items`), `sculpture` (`kind: 'bust' | 'vase' | 'bronze'`), `ropeLine` (`w`, `n`). Frei: `stanchions(p, [[x, z], …], { closed, gap, color, rope, sag })`.

#### Plätze
- `plaza(p, x, z, { w: 24, d: 18, ry, y, style, fountain, benches, trees, lamps, lights: 0, bollards, gutter, props, entrance: 2.4, colors })` → P: gepflasterter Platz. Plattenmuster (`paving`), dunkleres Randband, eingelegte Bänder zu den vier Eingängen, Rosette oder Brunnen in der Mitte, Granitbordstein, Rinne mit Gullys, Poller mit Lücken an den Eingängen, Bänke um die Mitte und an den Längsseiten, Mülleimer, Laternen (`lamp()`, echtes Licht nur mit `lights: n`), Bäume in Pflanzkübeln.
  - `style`: `'classic'` (heller Stein, Eisenpoller, Holzbänke) · `'modern'` (Beton, Stahlpoller) · `'old'` (dunkles Pflaster, Steinpoller) · `'forecourt'` (großer hellgrauer Vorplatz wie vor dem Louvre). `colors: { pave, band, inlay, curb, gutter }` überschreibt einzelne Farben.
  - Brunnen ab 12 m kürzester Seite automatisch (`fountain: false` = Rosette).
  - `P.top` (Pflasterhöhe 0,12 m), `P.at('center' | 'n' | 's' | 'e' | 'w' | 'fountain')`, `P.seat(i)` (Bank- und Brunnenrandplätze für `sit`), `P.toWorld(lx, lz)`, `P.lamps`, `P.benches`, `P.bins`, `P.bollards`, `P.fountain`.
- `fountain(p, x, z, { r: 2.2, jets: 8, color, water })` → F: Steinbecken mit profiliertem Rand, Wasser mit Ringwellen, Säule mit überlaufender Schale (Wasserschleier) und Bögen aus Tropfen (instanziert, reine Funktion von t). `F.seats`, `F.seat(i)`, `F.at()` (Spitze des Strahls).
- Einzelstücke: `FURN.bollard` (`kind: 'iron' | 'steel' | 'stone'`), `FURN.parkBench` (`kind: 'wood' | 'concrete' | 'stone'`, Sitzplätze in `userData.seats`), `FURN.litterBin` (`'iron' | 'steel'`), `FURN.treePlanter` (`size`, `tree: false` = Blumen).

Test/Vorschau: `tests/v35-interiors.*` (Kamera fliegt in ein Wohnzimmer, Tür öffnet auf den Flur, Museum, gedrehte erhöhte Küche, Platz mit Brunnen, Haus mit Flur, Galerie von außen).


### Wasser (v3.5)

Alles wirkt automatisch in jedem Video; die Optionen sind nur zum Abschalten oder Feintunen.

#### Oberfläche: Kräuselwellen, Himmel, Sonnenglitzern
- `water()` (Meer, Seen, Salzseen wie der Natronsee): pro Pixel kleine laufende Wellen (Summe aus 8 Wellen mit echter Dispersion, reine Funktion von t, feine Wellen blenden mit der Entfernung aus), scharfes Sonnenglitzern, Himmelsspiegelung nach Fresnel. Ruhiges Wasser (`waves` < 0,15, also Seen) bekommt feinere, kräftigere Kräusel als das offene Meer. Von unten gesehen (Kamera unter Wasser): helles Himmelsfenster direkt über einem, außen herum die Wasserfarbe.
  Optionen: `water({ ripples: 0.7 | false, rippleScale: 2.6, glint: 1 })` (Zahl = Stärke, `rippleScale` = längste Welle in m). Ganz aus: `CFG.ripples: false`.
- `waterSurfaceMat({ color, opacity: 0.22, reflect: 0.9, ripples: 1.8, scale: 0.9, glint: 1, under, rough })`: Material für eine flache Wasserfläche (Pool, Teich, Becken, Tank). Auf eine waagerechte Ebene legen (`PlaneGeometry`, −90° um x). Senkrecht von oben durchsichtig, flach von der Seite ein Spiegel, mit hellen Himmelsstreifen auf den Wellen. `m.userData.water` enthält die Uniforms (z. B. `ripples`, `opacity` animieren).

#### Pool
`swimPool(p, x, z, { w, d, h, level, drain: [t0, t1], water, tiles, lanes, tileColor, bandColor, copingColor })` – wie bisher, aber mit echtem Wasser:
- Wasseroberfläche (`P.surface`) auf `P.level(t)` mit Kräuseln, Spiegelung und Glitzern; Spritzer und Gischt über dem Wasser bleiben davor.
- Alles unter Wasser (Boden, Wände, Figuren, Haie, Schwimmtiere) wird durch das Wasser gesehen: leicht türkis getönt und je nach Weg durchs Wasser (gerade runter, schräg, durch die Glaskante, von unter Wasser) tiefer blau. Lichtnetz (Kaustik) auf Boden, Wänden und allem im Wasser – nur unterhalb des Wasserspiegels. Helle, wackelnde Wasserlinie, wo die Oberfläche eine Wand oder einen Körper trifft. Nach dem Ablassen (`drain`) bleiben die Wände dunkel-nass.
- Becken gefliest (Fliesenmuster, dunkles Mosaikband oben an der Wand), Bahnlinie mit T-Enden und Abflussgitter auf dem Boden, Randsteine (4 cm über dem Wasser), Leiter mit Stufen und Bügeln über den Rand.
- `water: { color, deep: '#0B5E8E', tint: '#A6EEF6', dens: 0.16, opacity, ripples, scale }` (`dens` = wie schnell es mit der Tiefe blau wird) oder `water: false`. `tiles: false` = glatte Farben, `lanes: false` = keine Bahnlinie.
- Rückgabe zusätzlich `surface` (die Wasserfläche).
- Für andere Becken: `poolWater(g, { lo: [x, y, z], hi: [x, y, z], level: t => y, top, deep, tint, dens })` meldet einen quaderförmigen Wasserkörper im lokalen Raum der Gruppe `g` an (bis zu 4 im Video); dazu eine Fläche mit `waterSurfaceMat()`. Aus für ein Video: `CFG.poolWater: false`. Kaustik-Stärke: `CFG.caustics` (Standard 1).

#### Unter Wasser automatisch
Steht im `SKY` irgendwo `'underwater'` oder `'deepsea'` und die Szene ruft `underwater()` nicht selbst auf, kommt es beim Bauen von allein dazu:
- Kaustik, Lichtstrahlen und Meeresschnee **um die Kamera herum** (immer dort, wo die Einstellung ist), tiefer = dunkler. Bei `'deepsea'` keine Lichtstrahlen und nur schwache Kaustik.
- Tiefen-Verlauf statt einfarbigem Bild: am Horizont die Nebelfarbe, nach oben heller (Oberfläche, helles Fenster), nach unten dunkel.
- Ohne `ground()`: sandiger Meeresgrund mit Dünen, Rippeln und Steinen knapp unter dem tiefsten Ding der Szene bzw. der tiefsten Kamera.
- Alles folgt dem Himmel: Einstellungen über Wasser (`SKY` wechselt auf `'day'`) bleiben trocken.
- Aus: `CFG.autoUnderwater: false`. Ein eigener `underwater()`-Aufruf ersetzt die Automatik (nie doppelt).
- `underwater()` selbst hat jetzt auch Meeresschnee und den Tiefen-Verlauf (`snow: false`, `gradient: false` = aus) und optional `depthDark: 0.4` (tiefer = dunkler).
- Einzeln nutzbar: `seabed({ y, color, size, at, rocks })`, `marineSnow({ n, box, size, color, opacity, k })`, `depthGradient({ k, surface })`, `lightShafts({ …, follow: true, k: t => 0 … 1 })` (Strahlen wiederholen sich um die Kamera, `k` blendet ein und aus).

Test: `tests/v35-water.*` (Pool mit Figur, Hai und Ablassen, roter Salzsee, Unterwasser-Himmel ohne `underwater()`).


### Licht & Nachbearbeitung (v3.5)

Alles ist ab v3.5 automatisch an und verbessert jedes Video ohne Änderung an der Szene. Jeder Teil lässt sich einzeln abschalten. Alle Werte folgen den `SKY`-Schlüsseln und werden zwischen zwei Himmeln genauso überblendet wie Farbe, Nebel und Sonne (Tabelle `LOOK` in `template.html`, eine Zeile pro Himmel). Jedes Bild bleibt eine reine Funktion von t.

| Wirkung | Was passiert | Abschalten / Stärke |
|---|---|---|
| **Gegenlicht (Rim)** | Zweites, schattenloses Richtungslicht hinter dem Motiv, aus Sicht der Kamera (jedes Bild neu aus der Kamera berechnet, leicht zur sonnenabgewandten Seite gedreht). Kanten, Schultern und Oberseiten fangen Licht, Figuren lösen sich vom Hintergrund. Nachts starkes kühles Mondlicht, golden/dusk warm, am Tag dezent. | `CFG.rim: false` · Zahl = × Stärke |
| **Nacht & Sturm lesbar** | Mond als Hauptlicht (heller, kühler), kühleres Fülllicht, angehobene Bodenfarbe der Hemisphäre (Nacht `#2C3550` statt `#1C1C24`). Schattenseiten werden nicht mehr schwarz. | `CFG.nightLook: false` = alte Werte |
| **Schattenboden** | Dunkle Bereiche werden in der Nachbearbeitung leicht geöffnet (`open`) und bekommen einen getönten Boden (`lift`): nie große, rein schwarze Flächen. Nachts blau, Dämmerung violett, Apokalypse rotbraun, im All aus. | `CFG.lift: false` · Zahl = × Stärke |
| **Farblook je Tageszeit** | Split-Toning (Tönung der Schatten und der Lichter) plus kleine Sättigungs-/Kontrast-Korrektur je Himmel: Tag kühle Schatten/warme Lichter, golden Teal-Orange, Nacht blau, Sturm entsättigt, Apokalypse Rot-Orange. Wirkt zusätzlich zu `CFG.saturation`/`CFG.contrast`. | `CFG.grade: false` |
| **Lichtstrahlen (God Rays)** | Strahlen von Sonne oder Mond, nur wenn sie über dem Horizont und im oder nahe am Bild stehen. Alles, was dunkler als der Himmel ist (Häuser, Bäume, Figuren), schneidet die Strahlen. Am stärksten golden, dawn, dusk; schwach am Tag und nachts; Sturm aus. Viertelauflösung, drei radiale Durchgänge: kaum Kosten. Aus bei Split-Screen. | `CFG.godrays: false` · Zahl = × Stärke |
| **Bodennebel** | Zusätzlich zum Entfernungsnebel liegt eine niedrige Dunstschicht über dem Boden und in Senken (Höhe in Weltkoordinaten, fällt nach oben exponentiell ab, ab 12 m vor der Kamera). Leuchtet in Richtung einer tiefen Sonne. Viel bei dawn/dusk/Nacht/Sturm, wenig am Tag, unter Wasser aus. Gilt für alle eingebauten Materialien (Patch der Three.js-Fog-Chunks). | `CFG.groundFog: false` · Zahl = × Menge |
| **Staub in der Luft** | Feine, schwebende Partikel um die Kamera (in einer Box um die Kamera umgebrochen, bleiben in der Welt stehen), im Gegenlicht heller. An bei golden/dawn/dusk/Apokalypse/unter Wasser, ein Hauch am Tag, nachts aus. In Räumen aus `interior()` automatisch an, sobald die Kamera drin ist. | `CFG.dust: false` · Zahl = × Menge · `true` = in jedem Himmel |
| **Schatten in der Weite** | Bei weiten Einstellungen wächst die Schattenbox mit dem Abstand der Kamera bis 120 m halbe Kantenlänge (vorher fest `CFG.area`, meist 36 m) und rückt in Blickrichtung vor. Gleiche 2048er Schattenkarte; Tiefenbereich und Bias wachsen mit. Nahe Einstellungen bleiben wie bisher scharf. | `CFG.shadowFar: false` = alte Grenze · Zahl = maximale halbe Kantenlänge |
| **Weichere Tiefenunschärfe** | Automatische Unschärfe in Nahaufnahmen schwächer (`CFG.dofAuto` Standard 0,65 statt 1), maximaler Unschärfekreis 0,009 statt 0,013: Hintergrund bleibt erkennbar, aber getrennt. Explizites `dof` in Kamera-Keys wirkt wie bisher, nur mit der neuen Obergrenze. | `CFG.dofAuto: 1` = alte Stärke |

Hinweise:
- Eigene `ShaderMaterial` mit `fog: true` bekommen den Bodennebel nur, wenn ihre Uniforms aus `THREE.UniformsLib.fog` stammen; der Vertex-Shader muss dann `#include <fog_vertex>` nach `mvPosition` enthalten (wie bei Three.js üblich).
- Die Werte je Himmel stehen in `LOOK` (rim, sh/hl Tönung, sat, con, lift, open, rays, haze, dust); Planeten-Himmel nutzen neutrale Werte (`LOOK0`).
- Test: `tests/v35-light` (Tag → golden → Nacht, weit und nah).


### Neu in v3.5: Materialien, Lichtkegel, Lichtpfützen

#### Material-Presets: `mat(hex, { kind })`
`kind` = paint · glass · metal · chrome · ceramic · plastic · wood · fabric · rubber · stone. Das Preset setzt Rauheit, Metallanteil und wie stark die Fläche den Himmel spiegelt (Umgebung aus dem Himmel, seit v3.0). Gilt auch für `box`, `cyl`, `cone`, `ball`, `prism`, `plate`, `finPlate` (Option wird an `mat` durchgereicht).
- paint = Autolack (glatt, Himmel spiegelt sich auf Motorhaube und Dach), glass = Scheibe (fast glatt, spiegelt stark), metal = gebürstetes Metall, chrome = Spiegel, ceramic = glasierte Keramik, plastic = Kunststoff mit leichtem Glanz, wood / fabric / rubber / stone = matt.
- Glänzende Sorten (paint, glass, metal, chrome, ceramic, plastic) sind auf runden Teilen glatt schattiert (Kugeln, Zylinder). Kisten und Umrisse bleiben kantig – der Low-Poly-Look bleibt.
- `rough`, `metal`, `flat` zusätzlich angegeben gewinnen. `env: Zahl` = Stärke der Spiegelung (1 = wie bisher), auch ohne `kind`.
- Durchsichtiges Glas: `mat(hex, { kind: 'glass', opacity: 0.4 })`. Standard ist undurchsichtig (Autos und Häuser haben innen nichts).
- `envK(material, k)` hebt die Spiegelung eines beliebigen Standard-Materials an (Shader-Patch, behält frühere Patches).
- Abschalten: `CFG.materials: false` = alle Presets wie das alte matte Material.

Automatisch:
- `vehicle()`: Karosserie in Lack, Scheiben als Glas (etwas dunkler getönt, spiegeln den Himmel), Chromteile als Chrom, graue Zierteile als Metall, schwarze Stoßstangen/Grill als Kunststoff, Reifen als Gummi und Felgen als Metall (zwei Meshes pro Rad). `vehicle(…, { finish: false })` = alter matter Look.
- `tower()`: Fensterscheiben, Schaufenster und Glastüren als Glas (beleuchtete Fenster leuchten wie bisher).
- Straßenmöbel: Laternen- und Ampelmasten als Metall, Hydrant lackiert, Mülleimer lackiert mit Metalldeckel.

#### Kugeln und Obst in Nahaufnahme
- `ball(p, r, …)` ohne `detail`: Radius ≤ 0,35 m oder glänzende Sorte → `detail: 2` (rund statt Polyeder). Große Kugeln (Baumkronen, Felsen) bleiben `detail: 1`.
- `food`: Apfel als gedrechselte Form mit Mulden oben und unten, glatt und leicht wachsig; Orange und Tomate feiner und glatt; Trauben rund und glänzend.
- `fruitBowl(p, x, y, z, { color, fruit: [kind…], scale, ry })` → Gruppe: glasierte Keramikschale mit Obst (Äpfel rot und grün, Orange, Banane, Trauben), statisch, y = Tischplatte. Die Küche (`furnish(…, 'appliances')`) nutzt sie statt der fünf kantigen Kugeln.

#### Lichtkegel: `beamMat(o)`
Gemeinsames Material für alle Lichtkegel: additiv, ohne Tiefenschreiben; hell an der Lampe und zum Ende hin auslaufend, hellster Kern in der Mitte, weich zum Rand (Blickwinkel), langsam treibender Staub (Weltraum, reine Funktion von t), blendet über dem Boden aus (keine harte Kante, wo der Kegel den Boden schneidet) und im Nebel.
- `o`: `color`, `k` (Stärke, etwa 2 × alte Deckkraft), `soft` (Kern-Schärfe, 1,6), `dust` (0–1), `dustScale` (1/m), `len` (Abfall entlang des Kegels), `floor` (Welt-y), `floorBand` (0,5 m).
- Animieren: `m.uniforms.uK.value`.
- Geometrie: jede `ConeGeometry`/`CylinderGeometry` (offen); Anfang = Spitze bzw. Oberseite (uv.y = 1).
- Benutzt von: `searchlight` (Kegel beginnt jetzt an der Linse, weicher Kern statt weißer Planke; neue Optionen `soft: 7`, `dust: 0.7`; `opacity` wie bisher), `flashlight`, `headlights` (Kegel waren verkehrt herum – jetzt schmal an der Lampe), UFO-Traktorstrahl (`spaceship({ kind: 'ufo', beam })`), Leuchtturm, U-Boot-Scheinwerfer, Polizei-Hubschrauber, Wachturm am Gefängnis, Discokugel.

`beamSpot(beam, { axis, len, tan, color, k, floor, spot })` → Mesh: weicher, elliptischer Lichtfleck, wo der Kegel den Boden trifft (nach dem Posieren der Figuren berechnet, verschwindet mit dem Kegel). Automatisch bei Taschenlampe, Scheinwerfern, UFO-Strahl, Polizei-Hubschrauber und Wachturm. `flashlight(…, { spot: false })` / `headlights(…, { spot: false })` = ohne.

#### Lichtpfützen und Halos (keine echten Lichter)
- `lightPool(p, x, y, z, { r, color, k, night, wall, ry, ignore })`: weicher Lichtschein auf dem Boden unter einer Lampe (lokal zu p). Legt sich kurz vor `bake()` über Bordsteine, Stufen, Pflaster (alles bis 0,28 m über dem Lampenfuß; Bänke, Autos und der eigene Sockel – `ignore: Gruppe` – bleiben außen vor). Alle statischen Pfützen = ein Draw-Call. Folgt der Dunkelheit (`NIGHTK`); `night: false` = immer an (Innenräume); `wall: true` = senkrecht an einer Wand (lokal +z aus der Wand).
- `bulbHalo(p, x, y, z, { size, color, k, night })`: kleiner weicher Schein um eine Glühbirne, zur Kamera gedreht, etwas vor die Birne gezogen (Lampengehäuse schneiden ihn nicht). Alle statischen Halos = ein instanzierter Draw-Call.
- Automatisch: `lamp()` (Pfütze r = 1,25 × Höhe, schwächer wenn die Lampe ein echtes Licht hat, Halo um die Birne), `streetlight()` und damit `city()` (Pfütze unter dem Kopf über der Straße, Halo unter dem Kopf).
- Abschalten: `lamp(…, { pool: false, halo: false })`, `streetlight(p, x, z, ry, { pool: false, halo: false })`, `city({ pools: false })`, ganz: `CFG.pools: false` (auch ohne Lichtflecken der Kegel).

Test: `tests/v35-materials` (Autos am Tag, Material-Kugeln, Obst auf dem Tisch, Straße in Dämmerung und Nacht mit Laternen, Suchscheinwerfer, Leuchtturm, UFO-Strahl, Taschenlampe, Scheinwerfer, kleine Stadt von oben).


### v3.5 Bild-QA und HQ-Render (Paket P6)

Zum Einmischen in `docs/API.md` (Abschnitt „Prüfung“) – Stand dieses Branches.

#### Bild-Prüfung im Audit (`QA: DARK / EMPTY / CAMCLIP / HEADCUT`)

`node render.mjs page.html --audit` (läuft auch bei `--shots` mit und im Render-Workflow) prüft jetzt zusätzlich, **wie das Bild aussieht**. Die Engine rendert dafür selbst winzige Bilder (72 × 128, quer 128 × 72) in eigene Render-Targets: ein normales `renderer.render(scene, camera)` nach `stepScene(teaseV(t))`, Tone-Mapping + sRGB + Kontrast + Vignette wie im Final-Pass (ohne AO, Bloom, Unschärfe; gleiches Render-Target-Format wie der Composer, damit SwiftShader nichts neu kompiliert), dazu ein zweiter Durchgang nur mit der Tiefe der undurchsichtigen Geometrie. Renderer-Zustand (Render-Target, autoClear, Schatten-Update, Sichtbarkeit, `THUMB`-Modus) wird danach zurückgesetzt – am sichtbaren Bild ändert sich nichts.

**Stichproben:** jedes Cover (`THUMB`, alle A/B-Varianten, im Thumbnail-Modus mit `THUMB.cam`) und die Mitte jeder Kameraeinstellung (`CAM`-Keys zwischen zwei Schnitten; Split-Screens, bildfüllende `MAP2D`-Karten und die Endkarte zählen nicht), zusammen höchstens 30 volle Bilder; lange Einstellungen (> 3,5 s) zusätzlich bei 20 % und 80 %, solange Platz ist. Für `CAMCLIP` und `HEADCUT` außerdem reine Tiefen-Proben kurz nach Beginn und kurz vor Ende jeder Einstellung (12 / 88 %, höchstens 60; die Kamera fährt im Lauf der Bewegung in etwas hinein). Covers und Einstellungsmitten laufen immer (gleiche Zeilen auf jedem Rechner); das Zeitbudget (25 s ab Start der Bild-Prüfung, `qaLook({ budget })`) kürzt nur die Extra-Proben. Kosten: ca. 0,1–0,3 s pro Bild ohne Last, beim ersten Bild einmalig Shader-/Pipeline-Aufbau.

Jede Meldung nennt Art, Ort (`shot n (a–b s) at t s` bzw. `cover A (THUMB at t s)`) und einen kurzen Hinweis. Pro Einstellung und Art nur die schlimmste Stelle, höchstens 6 Zeilen pro Art.

| Zeile | Wann | Schwelle | Typische Abhilfe |
|---|---|---|---|
| `QA: DARK – …` | eine große, fast schwarze Fläche (8×8-Zellen, die zu ≥ 90 % Luma < 0,06 haben – eine schwarze Wand/Platte, nicht die dunklen Lücken einer belebten Nachtszene), **Himmel zählt nicht** | > 35 % des Bildes; bei dunklem Himmel (`night`, `deepsea`, `space`, `mercury`; Nachtanteil ≥ 0,75) > 60 % | Licht ans Motiv (`lamp`, Taschenlampe, Fenster, `CFG.nightLift`), hellerer `SKY`-Eintrag dort, Kamera weg von der dunklen Wand / dem Schatten |
| `QA: EMPTY – …` | Bild fast ohne Details (flacher Himmel, kahler Boden, Nebel, Wasser; das Motiv winzig oder weg) | > 85 % der 8×8-Pixel-Zellen ohne Kontrast (Laplace-Mittel < 0,006 und Spitze < 0,05); nicht wenn schon `CAMCLIP` meldet. Auch: Kamera-Position/Linse `NaN` (nichts wird gezeichnet) | Kamera näher (`dist`, `fov`), aufs Motiv richten (`THUMB.cam` / `THUMB.t` beim Cover) oder etwas ins Bild stellen |
| `QA: CAMCLIP – …` (Linse in etwas) | Geometrie näher als 0,5 m an der Linse | > 20 % des Bildes | Kamera weg (`dist`, `h`, `az`, `p`) oder Objekt verschieben |
| `QA: CAMCLIP – …` (Vordergrund verdeckt) | etwas Großes zwischen Linse und einem weit entfernten Motiv: näher als min(2 m, 0,3 × Abstand zum Blickpunkt), nur wenn der Blickpunkt ≥ 4 m weg ist; nicht der Boden am unteren Rand | > 35 % des Bildes, Schwerpunkt in den oberen 60 % | Kamera daran vorbei (`az`, `h`, `p`) oder Objekt aus dem Weg |
| `QA: HEADCUT – …` | Figur groß im Bild (Kopf bis Hüfte > 30 % der Bildhöhe), Brust im Bild, aber ≥ 30 % des Kopfes über dem oberen Rand | – | tiefer kadrieren (`fy` 0,4–0,5, etwas mehr `dist`/`fov`, auf das Gesicht zielen: `dy`) oder weiter aufziehen |

Nicht gemeldet: Rauch, Glas, Wasser, Strahlen, Partikel und der Himmel bei `CAMCLIP` (nur undurchsichtige Geometrie zählt); Ego-Perspektive (`shot('pov', …)`) bei `CAMCLIP` und `HEADCUT` (eigene Hände/Waffe sind gewollt nah); `HEADCUT` in Makro-Einstellungen (Blickpunkt < 2,3 m, `fov` ≤ 30 oder `hand` 1,5), wenn der Blickpunkt unterhalb des Halses liegt (Hände, gehaltene Dinge); Figuren, deren Brust nicht im Bild ist (bewusst angeschnitten).

`--strict` zählt die neuen Zeilen mit (Exit 3). Debug: `node render.mjs page.html --probe "qaLook({ stats: true, budget: 1e9 })"` liefert die Messwerte jeder Probe (`dead`, `dark`, `flat`, `clip`, `fg`, `fd` = Abstand zum Blickpunkt, `heads`); `probes: false` = ohne die Tiefen-Proben.

Test: `tests/v35-qa.story.js` + `.scene.js` – Einstellung 2 meldet absichtlich `EMPTY`, Einstellung 3 `CAMCLIP`, Einstellung 4 `HEADCUT`; Einstellung 1 und das Cover bleiben still.

**Kalibrierung (Stand dieses Branches, alte Szenen mit neuer Engine neu gebaut):**
- `iss-falls`: `EMPTY` Cover A (96 %) und Einstellung 12 (99 %, blauer Leer-Frame); `DARK` Einstellung 11 (Globus-Nachtseite, 71 %). Feuerball-Einstellung (73 % flach) und ISS im All (76 %) bleiben still.
- `volcano-trash`: `DARK` Cover A (63 %, „Trash into lava“ – im fertigen Cover grau mit Fleck, weil Bloom/Unschärfe das schwarze Gestein überstrahlen) und Einstellung 7 (40 %, schwarze Vulkanwand über der Lava).
- `megalodon-pool`: `CAMCLIP` bei 36,0 s (Linse in der rosa Wand, 74 %), 48,3 s (blauer Pfeiler, 97 %), 39,7 s (Beckenrand unten, 29 %). Die Riesen-Luftmatratze bei 2,3 s ist 1–1,5 m entfernt und selbst das Motiv – nicht gemeldet.
- `zombie-city-ep1`: `DARK` Einstellung 12 (32,1 s, schwarze Fläche oben links, 38 %). Die übrigen Dämmerungs-Einstellungen (dunkle Flächen 17–31 %) und die Stelle um 20 s bleiben still.
- `coffee-test`: still (Köpfe in den Nahaufnahmen knapp, aber nicht angeschnitten).
- Tests: `environment` meldet `DARK` in Einstellung 3 (Kamera vor der Scheunenwand bei Nacht, 91 % schwarz – echter Fehler der Testszene), `horror-kit` meldet `EMPTY` mit `NaN` (die Testszene hat kein `CFG.handheld` → Kamera `NaN`, das Bild ist leer grau), `interiors`, `sea-detail`, `retention`, `long` still.

#### HQ-Render (fertiges Video in voller Qualität)

- `node render.mjs page.html --video out.mp4` **ohne** `--draft` setzt `window.__HQ__`; die Engine hebt dann `CFG.renderScale` auf ≥ 1 und `CFG.msaa` auf ≥ 4 (wie bisher schon bei 16:9-Langvideos). `CFG.fast: true` behält überall die schnelle Qualität.
- Vorschau im Browser, `--shots`, `--cover`, `--audit` und `--video --draft` bleiben schnell (`renderScale` 0,75, `msaa` 2), außer mit `--hq`. `--no-hq` schaltet es für `--video` ab.
- Render-Workflow: die Frame-Shards rendern automatisch in HQ; das Cover wird mit `--hq` gerendert (ein Bild, kostet kaum Zeit).
- Mehraufwand (lokal gemessen, M-Mac, 1 Worker, `--w 1440`): reines 3D-Rendern 1,6–1,8× (coffee-test 0,8 → 1,5 s, megalodon-pool 0,93 → 1,6 s pro Bild), ganzer `--video`-Pfad inkl. Screenshot + JPEG ca. 1,5× (megalodon-pool 2,1 → 3,1 s/Bild). Der Workflow nutzt deshalb 18 statt 12 Shards (`SHARDS: 18`; GitHub-Free-Limit 20 gleichzeitige Jobs), die Wandzeit pro Video bleibt etwa gleich (Megalodon-Shards bisher 6–15 min). Job-Timeouts (Standard 6 h) mussten nicht angepasst werden.

