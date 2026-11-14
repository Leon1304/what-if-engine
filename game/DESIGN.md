# Waldtankstelle – Spielkonzept

Survival-Erkundungsspiel aus der Ich-Perspektive (POV). Die erste Map ist ein Stück Wald mit Landstraße und einer
verlassenen Tankstelle. Die Map wird in Blender gebaut (`game/blender/`), als `game/map.glb` exportiert und im Browser
gespielt (`game/index.html`, Three.js).

## Ausgangslage
Spät am Nachmittag im Herbst. Dein Auto bleibt auf der Landstraße im Wald liegen, das Handy hat kein Netz.
Ein paar hundert Meter weiter steht die Tankstelle „Waldtank“, dunkel und verlassen. Strom gibt es keinen. Bald wird es Nacht und kalt.
**Ziel der ersten Map:** die Nacht überstehen, die Tankstelle wieder mit Strom versorgen und über das Funkgerät Hilfe rufen.

## Werte (HUD)
| Wert | sinkt durch | steigt durch |
|---|---|---|
| Gesundheit | Hunger/Durst/Kälte auf 0, Stürze | Verbandskasten, Schlaf |
| Hunger | Zeit, Sprinten | Chips, Sandwich, Schokolade, Dosensuppe (warm = mehr) |
| Durst | Zeit, Sprinten, Kaffee kaum | Wasser, Cola, Energydrink, Kaffee |
| Wärme | draußen nachts, Regen | drinnen mit Strom, Lagerfeuer, heißer Kaffee/Suppe |
| Ausdauer | Sprinten, Springen, Holzhacken | Stehen/Gehen, Energydrink |

Tag-Nacht-Wechsel: Ein Spieltag dauert ca. 24 Minuten. Nachts ist es draußen stockdunkel; die Taschenlampe braucht Batterien.

## Steuerung
WASD laufen · Maus umschauen · Shift sprinten · Strg ducken · Leertaste springen · **E** benutzen/aufheben ·
**F** Taschenlampe · **B** Handbuch · **Tab** Rucksack · **1–5** Schnellleiste · **Q** essen/trinken aus der Hand · **C** herstellen · **M** Karte · **Z** warten · **Esc** Pause

## Tutorial (Aufgabenkette, führt durch die Map)
1. **Aufwachen** am Auto am Straßenrand (Süden). Lerne: umschauen, laufen.
2. **Kofferraum öffnen** (E) → Rucksack und Taschenlampe. Lerne: benutzen, Rucksack (Tab).
3. **Der Straße nach Norden folgen**, bis die Tankstelle auftaucht. Lerne: sprinten, Ausdauer.
4. **Dämmerung:** Taschenlampe an (F). Die Schiebetür vorn geht ohne Strom nicht auf.
5. **Hintereingang finden:** um das Gebäude herum, Schlüssel liegt im Blumenkübel neben der Hintertür. Lerne: Dinge durchsuchen.
6. **Essen und trinken** aus Regalen und Kühlschränken. Lerne: Hunger/Durst, Schnellleiste, Q.
7. **Sicherungskasten im Büro:** „Kein Strom – Generator prüfen“.
8. **Generator hinter dem Haus** ist leer → **Kanister** im Lager holen → an der Zapfsäule geht nichts (kein Strom) →
   **Handpumpe am Altöltank / Diesel-Fass im Schuppen**: Kanister füllen → Generator betanken und anwerfen.
9. **Strom da:** Licht, Kühlschränke brummen, Kaffeemaschine, Kasse und Schiebetür funktionieren, drinnen wird es warm.
10. **Funkgerät im Büro** braucht einen 9-V-Block. Im Laden gibt es keinen mehr → Tipp auf dem Notizzettel:
    „Ersatzbatterien im Hochsitz, Jäger Bernd“. **Ende des Tutorials**, ab hier freie Erkundung.

## Erkundung (Map 1)
- **Tankstelle:** Verkaufsraum (Regale, Kühlschränke, Kasse, Kaffee, Eistruhe, Bistrotische), WC, Lager, Büro,
  Vorplatz mit Tankdach, 4 Zapfsäulen, Luft/Wasser, Preissäule, Container, Gasflaschen-Käfig, Holzstapel mit Axt, Schuppen.
- **Straße:** liegengebliebenes Auto (Startpunkt), Leitpfosten, Leitplanken, Schilder, Bushaltestelle.
- **Wald:** Fichten, Kiefern, Birken, Unterholz, Farn, Pilze, Felsen, umgestürzte Bäume; Trampelpfad zum **Hochsitz**,
  alte **Feuerstelle**, Bach mit Wasser (abkochen!), Pilze (manche giftig).

## Herstellen (C)
- Lagerfeuer: 3 Holz (Axt am Holzstapel oder Äste im Wald) + Feuerzeug (Kasse)
- Fackel: 1 Ast + Stoff (Lappen im Lager) + Feuer
- Abgekochtes Wasser: Bachwasser + Topf (Lager) am Feuer
- Verband: Stoff + Desinfektion (WC-Schrank)

## Umgesetzt (Stand 14.11.2026)
Alles oben, dazu: Wölfe nachts (Hit-and-Run, fliehen vor Licht/Feuer; erste Nacht erst ab 21 Uhr), Rehe am Tag, Regenschauer,
vorbeifahrendes Auto nachts, verlassener Wohnwagen (Schlafsack, Gaskocher, Tagebuch), Fernglas, Wanderkarte, Holzhacken mit Axt,
Speichern/Laden im Browser, Grafikstufen, Bildratenbegrenzung, Survival-Handbuch (B), Stufen/Bordsteine begehbar,
automatischer Test-Durchlauf (`tools/playthrough.mjs`) und Laufweg-Prüfung (`tools/routes.mjs`).

## Später (weitere Maps / Ausbau)
Auto reparieren (Keilriemen aus der Werkstatt), weitere Orte (Forsthaus, Funkturm, See), Nebel, Schnee, Bär, mehrere Tage mit Vorräten, Controller-Steuerung.

## Technik
- Blender: jedes benutzbare Ding ist ein eigenes Objekt mit Eigenschaften (`interact`, `label`, `item`, `angle`, `slide`, `group` …),
  Drehpunkt = Ursprung. Lichter als Empties `light_*`, Spielpunkte (Spawn, Aufgabenziele) als Empties.
- Spiel: Three.js 0.170 (CDN), Kollision per BVH (three-mesh-bvh), gleiche Modelle werden als InstancedMesh gezeichnet.
