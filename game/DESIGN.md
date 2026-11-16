# Northwood – Spielkonzept (früher „Waldtank“; die Tankstelle im Spiel heißt weiter „Waldtank“)

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

## Ausbau 14.11.2026 (Abend)
Gegenstände sichtbar (Füllware lässt Platz, `tools/pickups.mjs`), Glitzern in der Nähe; Karte nach Norden erweitert: Dorf Tannbach
(6 Häuser, Dorfladen, Kapelle, Bauernhof mit Scheune und Feld, Brunnen, Telefonzelle, Infotafel), Aussichtsturm Hirschkopf,
Burgruine Falkenstein, Steinbruch mit Bauwagen, Wassermühle; 18 Säcke mit Beute; Bauen (8 Baupläne, Blockhütte in 4 Abschnitten),
Bäume fällen, Felder (3 Pflanzen), Waffen (Messer, Pistole, Schrotflinte, Jagdgewehr, Bogen), Wildschwein, Bär, Jagd + Zerlegen,
Schwierigkeit (keine Feinde/leicht/mittel/schwer), Speicherplätze + Datei-Export, versionsfeste Spielstände, Wanderkarte mit
gefundenen Orten + Wegmarkern, freies Spiel nach der Rettung.

## Ausbau 2 (14.11.2026, nachts)
Level/EP + 11 Nebenaufgaben (Story um die Räumung von Tannbach, 5 Notizen), Hausausbau in 3 Stufen, Möbel und Geräte (Werkbank-Rezepte inkl. Munition),
Lichter (Fackelhalter, Laterne, Solarlampe, Baustrahler), Zäune mit Tor gegen Tiere, Schlafen bis zum Morgen, Händler Kurt (Euro), Auto reparieren + fahren,
Waldsee mit Steg + Anglerhütte, Angeln, Kaninchen + Fallen, Hund Bello, Jahreszeiten + Wetter (Schnee, Nebel, Gewitter), Kompass, abgelegte Gegenstände bleiben liegen,
Taschenlampe per Links-/Rechtsklick, mehr Munition (Säcke, Händler, Werkbank).

## Ausbau 3 (15.11.2026)
- **Krankheiten:** Erkältung (Kälte, Nässe, Gebirge; Husten, weniger Ausdauer, Fieber ab 60 %) und Magenverstimmung (Verdorbenes, Rohes, Bachwasser);
  Heilung durch Wärme/Schlaf, Kräutertee (Kamille + Wasser am Feuer/Gaskocher) und Medizin (`js/health.js`).
- **Vorräte verderben:** Essen trägt seine Frische im Stapel (`f`, Spielstunden), auch in Kisten und abgelegten Bündeln; Kühlbox ×0,2, Winter ×0,5, Gebirge ×0,7;
  danach „Verdorbenes Essen“. Trockenfleisch verdirbt nie.
- **Ruderboot + Insel:** der Waldsee ist größer und tief (nicht watbar); Boot am Steg (W/S/A/D, Aussteigen am Ufer/Steg/Insel, `js/boat.js`);
  Opa Willis Schatz unter dem Steinkreuz (Spaten), Hinweis im Logbuch der Anglerhütte.
- **Forsthaus + Funkturm:** Rätselkette – Schlüssel bei der Futterkrippe → Tagebuch (Code der Funkhütte = Höhe Hirschkopf 612) + Kalender (Waffenschrank 1403);
  Funkstation mit Tastenfeld, Notstrom-Aggregat, Sender (Bergwacht, Wetterbericht), Schlüssel der Pass-Schranke.
- **Zweite Karte „Steinberg“:** eigene Region im selben GLB (y 900 … 1160, `s14_gebirge.py`, `js/regions.js`), per Auto über den Pass erreichbar:
  Serpentinen, Steinberghütte mit Förster Henning, Stollen mit Geröll zum Sprengen und Kristallkammer, Gipfelkreuz, Bergsee, Heustadel, Gämsen,
  Schnee statt Regen, kälter. Batches und Instanzen pro Region – die jeweils andere Karte wird nicht gezeichnet.
- **Mehr Details (Blender, `game/blender/deco.py`):** Baukasten d_*() für Dachrinnen + Fallrohre, Ziegel-/Schindelreihen, Fachwerk-Giebel, Fensterbänke, Sprossen, Vorhänge, Vordächer, Wandlampen, Hausnummern, Briefkästen, Antennen, Regentonnen, Holzstapel, Mülltonnen, Fahrräder, Blumentöpfe, Bänke, Hydranten, Kanaldeckel, Strommasten mit Leitungen. Eingesetzt an Dorfhäusern, Kapelle (+ Friedhof), Scheune, Werkstatt, Tankstelle, Forsthaus (+ Bellos Hundehütte), Funkhütte, Mühle, Anglerhütte, Steinberghütte; Stromleitung Tankstelle → Trafohaus am Dorfeingang.
- **Natur (`s15_natur.py`, eigene Zufallsfolgen – der Wald aus s06 bleibt gleich):** Blumenwiesen (Margerite, Hahnenfuß, Glockenblume, Mohn), hohes Gras, Laub- und Nadelstreu unter den Bäumen, Moos, Kiesel, umgestürzte Bäume mit Wurzelteller, Ameisenhaufen, Baumpilze, Schilf am Bach, Wegmarken, Aussichtsbänke; im Gebirge Enzian, Edelweiß, Alpenrosen, Latschen, Geröll, Altschnee, Steinmänner, Wegkreuz. Kleinkram wird in `world.js` in 48-m-Kacheln instanziert, wirft keinen Schatten und wird je nach Größe und Grafikstufe ausgeblendet (`W.detailDist`). Blumen verblassen im Herbst und liegen im Winter unter Schnee.
- **Handbuch „Fundorte“:** für jeden Gegenstand, wo er liegt, wer ihn verkauft, wie man ihn herstellt oder kocht (automatisch aus Welt, Rezepten und Laden erzeugt; Test prüft, dass keiner fehlt).
- **Inventar:** 10 Plätze in den Taschen, Rucksack 20, Großer Rucksack 28 (Werkbank), Trekkingrucksack 36 (Kurt 90 €, Steinberghütte), Expeditionsrucksack 48 (Werkbank, Stufe 7).
- **Bello „Such!“** (H): führt zu Säcken, Kräutern, Kristallen, Schätzen. **27 Abzeichen + Statistikseite** (Handbuch, Pause-Menü).
- 7 neue Nebenaufgaben, neue Gebirgskarte (Relief), Fisch/Kaninchen am Feuer braten, Töpfe kommen beim Kochen zurück.
- **Stimmung (`js/mood.js`):** Bodennebel als Höhennebel in allen Shadern (eigene `ShaderChunk.fog_*`, Uniforms `uMist`/`uMistColor` werden je Programm
  gesetzt) – morgens in den Senken, über dem See, im Gebirge als Nebelmeer unter der Hütte; Glühwürmchen in warmen Nächten (ein Points-Shader, 140 Stück
  um den Spieler, am Wasser dichter), Sternschnuppen bei klarem Himmel, selten ein Feuerball → Meteorit als Bündel mit Glut (Wegmarker „Einschlag“);
  Regen trommelt hörbar aufs Dach (Hütte, Häuser, Auto) mit einzelnen Tropfen.
- **Geschichte, Teil 2 (`js/story.js`, Blender `s16_extras.py`):** Kurt gibt nach den 5 Notizen sein Handfunkgerät (Kanal 7). 6 Tagebuchseiten von Hannes Brandt
  (Werkstatt, Steinbruch, Burgruine, Turm, Stollen-Eingang, hinter dem Geröll) erzählen: Kristallader unter dem Dorf, Probesprengung → Steinschlag am Pass,
  erfundene Damm-Gefahr → Räumung, Ladungen im Steinbruch. Funksprüche (Lena, Brandt, Bergwacht) kommen nach und nach (J). Ende an der Zündmaschine:
  Kabel kappen + Wahrheit funken (Dorf wird wieder bewohnt, abends Licht in den Fenstern) oder Brandts Umschlag nehmen (500 €, Sprengung in der Nacht).
- **Sammelalbum (`js/album.js`):** Tiere (inkl. seltener weißer Hirsch, der alte Grimm), Fische (Forelle, Saibling, Hecht, Goldforelle), Pilze & Pflanzen
  (Pfifferling, Edelweiß neu), Fundstücke mit Bildern der Blender-Modelle (`bp_r_*`), Naturschauspiele. 6 Geheimverstecke mit seltenen Gegenständen
  (goldener Rahmen im Rucksack, eigenes Modell auch abgelegt).
- **Herausforderungen:** Kurts Tagesaufträge (`js/orders.js`, jeden Morgen neu, Frist, Lohn); der alte Grimm (Boss-Bär an der Bärenhöhle im Gebirge:
  schläft, stürmt geradeaus, rast unter 40 %, kehrt zum Heilen in die Höhle zurück, Lebensleiste oben); Unwetter/Schneesturm mit Warnung eine Stunde vorher
  (Hagel, Blitzeinschläge in der Nähe, Kälte – sicher unter Dach, in Häusern, im Auto).
- **Winter am See (`js/ice.js`):** Waldsee und Bergsee frieren zu (Eisfläche mit eigenem Kollider, rutschig), zu Fuß zur Insel, Eisloch mit Axt/Spaten, Eisangeln (Hechte).
- **Kreativ-Modus:** keine Werte, kein Schaden, Bauen/Ausbauen/Herstellen ohne Material, Werkzeug und Level, Hütte sofort fertig; Kreativ-Menü (K) mit allen
  Gegenständen, Uhrzeit, Wetter, Jahreszeit, Ereignissen und Reisezielen; Fliegen (V); eigener Speicherplatz „Kreativ (auto)“.

## Später (weitere Maps / Ausbau)
Controller-Steuerung, Mehrspieler, Jagdhütte im Gebirge, weitere Regionen.

## Technik
- Blender: jedes benutzbare Ding ist ein eigenes Objekt mit Eigenschaften (`interact`, `label`, `item`, `angle`, `slide`, `group` …),
  Drehpunkt = Ursprung. Lichter als Empties `light_*`, Spielpunkte (Spawn, Aufgabenziele) als Empties.
- Spiel: Three.js 0.170 (CDN), Kollision per BVH (three-mesh-bvh), gleiche Modelle werden als InstancedMesh gezeichnet.
