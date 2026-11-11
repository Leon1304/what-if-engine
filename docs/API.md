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

Figuren haben Mund und Augenbrauen: `figure({expr})` mit calm · scared · angry · happy · shout, auch als `t => …`; panic/cheer/Zombies setzen das automatisch. Gesichter nachts mit einem kleinen `glow` (dist 6–8, `flicker: 0`) aufhellen. Massen haben Augen und Mund, Nahaufnahmen auf die vorderste Reihe funktionieren also auch. Gerald bekommt im Twist eine `shot('macro', …)`-Nahaufnahme (`track('gerald', g)`, `dy: 0.4`).

## `SHAKES` und `FLASHES`

`SHAKES` mit `{ t, amp 0.2–0.6, dur }` bei Einschlägen. `FLASHES` mit `{ t, dur 0.2–0.4, a 0.25–0.6, color }` bei Schnitten und Explosionen.

## `SKY`

`[[t, preset], …]` blendet zwischen Presets: day · golden · dusk · night · dawn · storm · apocalypse · space · underwater · deepsea.

## Nacht

Hauptmotive anleuchten mit `glow`, `lamp`, Fenstern über `lit` und hellen, satten Farben. Sonst säuft alles ab.

## Bild (läuft automatisch)

Kontaktschatten (`CFG.ao`, Standard 0.55), Glühen auf Feuer, Explosionen, Fenstern, Neon und Zombie-Augen (`CFG.bloom` 0.45, `bloomThreshold` 1.2; nur der Überschuss glüht, angestrahlte Flächen überstrahlen nicht), Sonnenschatten passend zum Bildausschnitt (in Nahaufnahmen scharf, `CFG.shadowFit`), echte Bewegungsunschärfe auf schnellen Frames (`CFG.motionBlur: 'auto'`: Schüttler, schnelle Kamera, Rennende nah an der Linse; `MBLUR = [[t0, t1]]` erzwingt sie; nur im Export, nicht in der Vorschau), abgerundete, weich schattierte Figuren (`CFG.smooth`). Umgebungslicht `CFG.env: true` nur bei „beste qualität“.


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

- `house(p,x,z,{w,d,h,wall,roof,lit,ry,porch})` → `{g, winMat}`
- `barn(…)`, `silo(…)` → `{g, top}`, `windmill(…)` → `{rotor}`
- `fence(p,[[x,z],…],{h,color})` → `spans[]`; einzelne Felder mit `knock(span.g, t)` umwerfen
- `tree(p,x,z,{kind:'round'|'pine'|'dead',size})`, `rock(p,x,z,s)`
- `field(p,x,z,w,d,{crop:'wheat'|'corn'|'cabbage'})`, `haybale(p,x,z,ry)`
- `vehicle(p,x,z,{kind:'car'|'tractor'|'truck',color,ry})` → `{g, wheels}`
- `lamp(p,x,z,{intensity})`
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
- Treffer: `fall(rig, t, {dir, getUp, dazed})` (`dazed` = Sternchen); Massen: `h.hit(i, t, {from, push})`, `h.near(p, t, {max})`, `killNear(h, P, t, r)`.
- Fahrzeuge: `tank(p,x,z,{color, ry, turret, camo, crew})` + `drive`, `aimTurret(T, t, at)`, `cannon(T, t, {at, size})`; `jet(p,{missiles, bombs})` + `fly`, `missile({from, at, t0})` (lenkt nach, trifft auch Flugzeuge → `shotDown`), `bomb(V, t, {horde})`, `flares(V, t)`, `strafe(V, t0, t1, {at, horde})`, `shotDown(J, t)`.
- Die Sounds kommen automatisch. Pro Kampfszene eine Zeitlupe auf den entscheidenden Treffer.

## Fallen und Maschinen (v2.11)

`trap(p, kind, x, z, {t, victim, ry})` mit bear (Tellereisen) · pit (Fallgrube, `spikes`) · spikes · log (schwingender Stachelstamm) · pendulum (Pendelklinge) · net · snare (kopfüber) · mine (`horde`, `r`) · flame · saw · boulder (`path`, rollt) · darts · cage · trapdoor · laser · electric (Röntgen-Zap) · banana · rake; `victim` = Rig oder Horden-Index. Opfer überleben comichaft (Sternchen, plattgedrückt mit `squash`, mit `getUp` wieder hoch). Geschütztürme: `turret(p,x,z,{kind: 'gatling'|'rocket'|'flame'|'laser'|'cannon', scan})`, `turretAim(T, t, at)`, `turretFire(T, t0, t1, {horde, at, rate, burst})` (sucht sich Horden-Ziele selbst). `drone(p,{gun, light})` + `fly`/`strafe`, `press(p,x,z,{at: [t, …], victims})`.

## Wiederkehrende Charaktere sehen immer gleich aus (Pflicht)

Sie entstehen nur über `char(name, { expr, hold })`, nie über `figure()` mit eigenen Farben. `char('you')` ist „you“, die Hauptfigur jedes Szenarios, `char('steve')` ist Dr. Steve (Laborkittel, Klemmbrett), Gerald immer `gerald()` mit Standardgröße 1.5. Aussehen (shirt, pants, hat, skin) kommt aus `CHARS` in der Engine und aus `series/<S>/cast.json` im Repo; `char()` ignoriert übergebene Farben. Neue Figur in einer Serie (Nachbar, Oma …): zuerst in `cast.json` eintragen, committen, dann überall `char('name')`. Kostümwechsel nur, wenn die Story ihn zeigt, und dann als eigener Eintrag (`you-raincoat`). Bei Sammelfiguren (Zombie-Massen, Passanten) gilt das nicht.

## Figuren

`figure({kind:'human'|'zombie', shirt, pants, skin, hat, hold, holdShape:'board', coat, cape, expr, look, talk})` (`cape: '#hex'` = Umhang, weht im Wind und flattert beim Rennen nach hinten) → Rig mit Hüfte, Knien, Füßen und Ellbogen, nur für einmalige Figuren. `pose(rig, mode, phase, t)` mit walk · run · shamble · idle · panic · cheer · point · hold. Die Füße setzt die Engine per IK, sie bleiben beim Gehen am Boden; alle Figuren atmen, blinzeln und schauen sich um, auch ohne `pose`. Tiere: `animal({kind})` liefert jetzt die detaillierten Tiere aus `beast()` (siehe **Tiere**); Hühner und Gerald bleiben wie bisher, `detail: false` gibt den alten Klötzchen-Look. Gerald: `gerald({scale})` (Standard 1.5) → Rig wie `animal`, `world.add(g.root)`; bewegen mit `walk` oder per `dyn(g.root)` + eigenem `tick`.

## Ausrüstung und Trupps (v2.13)

`warrior(kind, {seed, at: [x,z], ry, weapon, expr, look})` mit kind = soldier · knight · viking · spartan · roman · samurai · ninja · pirate · cowboy · bandit · swat · caveman (Helme, Rüstung, Wappenröcke, Fell, Helmbusch, Masken, Bärte, Umhänge, Gürtel, Taschen, Stiefel, passende Waffen). `squad(kind, n, {at, ry, cols, gap, jitter, seed, mix})` stellt eine Gruppe auf, in der jeder anders aussieht (Ausrüstung, Farben, Bart, Waffe per Seed). **Regel:** mehrere Trupps immer mit verschiedenen `seed`; dieselbe Figur behält in allen Folgen ihren `seed`. `gear(rig, kind, {seed})` rüstet eine vorhandene Figur aus.

## Gesichter

`expr` = calm · happy · scared · angry · shout · sad · surprised · smug · annoyed (auch `t => …`). Die Augen haben Pupillen, die umherblicken. `look: 'cam' | [x,y,z] | 'trackName' | obj` dreht den Kopf dorthin (auch nachträglich: `rig.look = …`). **Lippensynchron:** Beats mit `who: 'you' | 'steve' | Name` werden mit eigener Stimme gesprochen (you: Preset young, Steve: steve), und die Lippen der Figur aus `char(name)` bewegen sich passend zur Stimme (offen, breit, rund, Zähne, geschlossen); die Figur steht dabei groß im Bild. Ohne Stimme bewegt `talk: [[t0, t1], …]` oder `t => bool` die Lippen im Silbenrhythmus. In jeder Nahaufnahme passt der Ausdruck zur Caption (Angst, Triumph, Ärger). „you“ schaut bei Pointen gern in die Kamera (`look: 'cam'`).

## Look von „you“

Standard sind Haare ohne Hut. Der Look passt zum Szenario: `char('you', { outfit: … })` mit straw (Farm) · cap · capBack · beanie · cowboy · shades · hair (nimmt den Hut ab) und den Frisuren short · buzz · spiky · long · bun · curly · mohawk, dazu Haarfarbe blond · ginger · black; auch kombiniert, z. B. `['capBack', 'shades']`. Eine Serie legt den Look einmal in `cast.json` fest (`hatStyle`, `hat`, `hairStyle`, `hair`, `glasses`) und behält ihn, Einzelvideos wählen frei. Einmalige Figuren nehmen dieselben Optionen direkt in `figure({ hatStyle, hairStyle, glasses })`.

## Schauspiel

`react(rig, t, kind, {dur, amp})` mit startle · flinch · hit · shrug · nod · shake · facepalm · wave · sigh; `jump(obj, t, {h, dur})` holt aus, streckt sich und federt bei der Landung (Figuren, Tiere, Props). Pro Video 3–5 Reaktionen auf die Schlüsselmomente, z. B. Schreck beim Durchbruch, Facepalm nach Steves Tipp, Jubel bei der Rettung.

## Motion Capture (optional)

`model('robot', {scale: 0.45, tint: {Main: '#hex'}})` ist ein geriggter Roboter (CC0) mit echten Animationen (Idle, Walking, Running, Dance, Wave, Jump, Yes, No, ThumbsUp, Punch, Death …). Er funktioniert mit `walk`, `pose` und `track`; feste Abfolgen laufen über `anim(rig, [[t, 'Wave', {once: true}], [t2, 'Dance']])`. Weitere Modelle liegen als `models/<name>.glb` im Repo (siehe `models/README.md`); in `cast.json` macht `"model": "name"` aus einer Serienfigur ein Mocap-Modell.

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
- Aufruf: `horde({kind:'zombie'|'human', n, from:[x,z], r, to:[x,z], stop, pile, around, t0, t1, speed:[a,b], mode:'shamble'|'walk'|'run', rise, wait:{line:[[x,z],[x,z]], until, stop, pile}, lift:(t,i)=>dy, armsUp:(t,i)=>bool, skin, shirts, pants, eyes, scale})` → `{count(t)}`.
- Ablauf: Die Masse erscheint zwischen `t0` und `t1`, steigt aus dem Boden (`rise`), läuft zu einer Barriere (`wait.line`), drängt dort bis `until` und strömt dann zum Ziel. Mit `around: true` umzingelt sie es. Wer ankommt, bleibt stehen; Zombies hämmern dann.
- `kind: 'human'` setzt Hauttöne, bunte Shirts, dunkle Augen, `walk` und kein `rise`. `lift` lässt hüpfen oder Wellen laufen, `armsUp` reißt die Arme hoch (Jubel, Panik). Pro Mitglied variieren über `hash(i)`.
- Starren (v2.27): `gaze: { t, at: [x, y, z], spread: 0.8, turn: 0.7, tilt: 0.55, arms: 'down' | 'up', face }` – ab `t` (pro Mitglied bis `spread` s später) bleibt jeder stehen, dreht sich zu `at` und schaut hoch (Feuerwerk, UFO, Sonnenfinsternis); Zombies hören auf zu hämmern. `face: false` = nicht drehen; `h.hit()` geht danach wie gewohnt.

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
- SFX: `mg` (MG-Feuerstoß, `dur`) · `flak` · `whistle` (anfliegende Granate, `dur`) · `morse` (Funk, `dur`) · `inflate` (Gebläse, `dur`) · `typewriter` (`dur`).
- `AUDIO.amb`: `battle` (ferne Schlacht: Artillerie, Gewehr- und MG-Feuer) · `planes` (Dröhnen vieler Propellerflugzeuge) · `hq` (Kriegsraum: Raumklang, tickende Uhr, Schreibmaschine) · `surf` (Brandung, Wind, Möwe).

# Tests
`bash tests/run.sh [name …]` baut die Beispiel-Story aus `template.html` und alle Szenen in `tests/` und rendert je drei Bilder; Seitenfehler lassen den Test scheitern. Der Workflow `test` läuft bei jeder Engine-Änderung auf GitHub. Neue Funktionen bekommen eine kleine Testszene in `tests/<thema>.story.js` + `.scene.js`.

# Neu in v2.27 (Feuerwerk, starrende Massen)

## Feuerwerk
- `fireworkBox(p, x, y, z, { size, ry, colors, color })` → Holzkiste mit bunten Röhren, Zündschnüren und Warnstreifen (Vorderseite +z), `box.top` = Höhe der Röhren; tragbar mit `carry`, für eigene Bewegung `dyn(box)`.
- `fireworks({ from: [x, y, z], at: [x, y, z], area: [sx, sy, sz], t0, t1, every: 0.4 | n, rise: 1.1, kinds: ['peony', 'willow', 'crackle', 'palm'], colors, size, light: 900 | false, dist: 90, sound: true | Lautstärke, seed })` → `{ bursts: [{ t, p, color, kind, launch }], light }`. Raketen mit Funkenschweif steigen von `from` auf und zerplatzen um `at`: peony = bunte Kugel, willow = goldener Regen, crackle = Kugel + weißes Knistern, palm = wenige dicke Arme. Ein einziges Licht springt zur neuesten Explosion (Farbe + Aufblitzen), pro Explosion die echte Feuerwerks-Aufnahme (`AUDIO.hits` automatisch). Zeiten sind Szenenzeit (SLOWMO wird umgerechnet).
- Tipp: `at` 20–30 m hoch, Kamera 30–50 m entfernt, fov 50–56; dazu `horde({ gaze: { t, at } })`, dann starrt die Menge hoch. Test: `tests/fireworks.story.js`.
