# Hashtags für TikTok, Instagram und YouTube (ab 13.11.2026, Leons Vorgabe)

Ersetzt die alte Regel „immer die plattformweit meistgenutzten Tags“ (#fyp, #viral …). Gilt für jedes neue Video und wurde am 13.11. auf alle 10 Videos in `gallery/captions/` angewendet.

## Kanal
- TikTok @what.if0612 („What if“), YouTube/Instagram @whatifthishappenedscenarios
- Englische Low-Poly-3D-Videos, 45–58 s, „What if…?“ in Du-Perspektive, Endcard-Frage A/B/C
- Zielgruppe englischsprachig, international. Stärkste Videos bisher: Zombie-Survival (48K) und Erklärvideos wie „Tunnel durch die Erde“ (62K)
- **Sprache:** Hashtags und Caption immer englisch. Keine deutschen oder anderssprachigen Tags, keine Länder-Tags (#deutschland, #fürdich).

## Kategorien (genau eine, wie in der Themenliste)
Erkennbar an Badge bzw. `CFG.kind` in `<slug>.story.js`. Die Tags rechts sind Richtungen, jedes Mal neu prüfen.

| Kategorie | Badge / `CFG.kind` | Inhalt | Kategorie-Tags TikTok | Instagram/YouTube statt „-tok“ |
|---|---|---|---|---|
| Story | „What if“ · `story` | Zombies, Survival, Monster, Alltags-Chaos, 1 vs 100 | #zombieapocalypse #zombiesurvival #whatifscenario | gleich |
| Series | „Ep N“ · `CFG.series` | Zombie Farm, NPC Life, Swallowed Alive, Monsters Are Back … | Serien-Tag (#zombiefarm, #swallowedalive) + Thema | gleich |
| Explaining | „Explaining“ · `explain` | Physik, Weltraum, Ozean, Körper, Natur | #science #sciencetok #space | #sciencefacts #astronomy |
| Conspiracy | „Conspiracy“ · `conspiracy` | Mythen, Verschwörungen, Aliens, mit Urteil | #mythbusting #debunked #conspiracy | gleich |
| Horror | „What if“ · `horror` | Grusel, Creepypasta, Monster im Dunkeln | #horrortok #creepy #scarystories | #horrorstories |
| History | „History“ | Du mittendrin in einem echten historischen Moment | #history #historytok #historyfacts | #historyfacts |
| True Crime | „True Crime“ · `truecrime` | Coups, Ausbrüche, ungelöste Fälle ohne Mordopfer | #truecrime #heist #unsolvedmysteries | gleich |

Zombie-Action bleibt Story, auch mit Horror-Musik. Ein Teaser-Short bekommt die Kategorie seines Themas.

## Vorgehen
1. **Analysieren:** Kategorie, Hauptthema, Unterthema und konkrete Keywords bestimmen (Ort, Tier, Fall, Ereignis).
2. **Aktuell recherchieren**, jedes Mal neu, nie aus dem Gedächtnis:
   - Websuche nach aktuellen Tags zu Thema und Kategorie (TikTok Creative Center auf USA/UK, Hashtag-Tools, Artikel), nur englische Quellen und Tags.
   - Mit Browser: `tiktok.com/tag/<tag>` prüfen oder im TikTok-Studio-Upload `#…` tippen; die Vorschläge zeigen die Beitragszahl (z. B. #robotfight 5,2K, #robotboxing 1,6K am 13.11.).
   - Trend, News, Jahrestag oder viraler Sound zum Thema? `trend-log.md` als Startpunkt.
3. **Auswählen, genau 5 je Plattform:**
   - **TikTok / Instagram:** `#whatif` + 2 Nischen-Tags (bei Serien einer davon der Serienname, in allen Folgen gleich) + 1–2 Kategorie-Tags (mittelgroß, nicht überlaufen) + optional 1 Trend-Tag, nur wenn er wirklich passt. „-tok“-Tags nur auf TikTok.
   - **YouTube Shorts:** `#shorts #whatif` + 3 Themen-Tags (2 Nischen + 1 Kategorie oder Trend). Im Tag-Feld (500 Zeichen) keine inhaltsleeren Wörter wie viral, trending, fyp.
4. **Verboten:**
   - #fyp, #foryou, #foryoupage, #fy, #viral, #trending, #explore, #reels, #reelsinstagram, #youtubeshorts und alle anderen inhaltsleeren Reichweiten-Tags
   - nicht-englische Tags und Mischformen (#scienceDE), Übersetzungen deutscher Kategorienamen (#erklärung)
   - fremde Marken, Filme, Spiele, Personen (z. B. kein #worldwarz für die Zombie-Mauer), unpassende oder doppelte Tags, Emojis in Tags
   - True Crime: keine Namen von Verdächtigen in laufenden Verfahren, keine Opfer-Namen; History / True Crime: keine Spaß- oder Meme-Tags; Conspiracy: keine Tags, die die Theorie bestätigen
5. **Caption prüfen:** englisch; Tippfehler, abgeschnittene Wörter und übrig gebliebene Dateinamen/Slugs entfernen (TikTok setzt beim Upload den Dateinamen als Beschreibung ein, z. B. „robot-fight“); 2–3 Such-Keywords auch im Text; Endcard-Frage A/B/C als Kommentar-Aufforderung drinlassen, bei Serien „Follow for part 2“.

## Ausgabe im Chat
Erklärungen deutsch, Tags und Captions englisch: **Kategorie**, die 5 Tags je Plattform in einer Zeile zum Kopieren, **Warum** (pro Tag ein Halbsatz: Nische / Kategorie / Trend, Größe falls geprüft), korrigierte Caption, **Quellen**.

## Stand 13.11.2026 (alle gerenderten Videos)
| Video | Kategorie | TikTok | Instagram (Abweichung) | YouTube |
|---|---|---|---|---|
| bus-stop-types | Story (Testformat) | #whatif #typesofpeople #busstop #relatable #3danimation | gleich | #shorts #whatif #typesofpeople #busstop #relatable |
| every-planet | Explaining | #whatif #planets #solarsystem #space #sciencetok | #astronomy statt #sciencetok | #shorts #whatif #planets #solarsystem #space |
| heart-stops | Explaining | #whatif #cpr #cardiacarrest #firstaid #learnontiktok | #savealife statt #learnontiktok | #shorts #whatif #cpr #cardiacarrest #firstaid |
| jerusalem-zombie-wall | Story | #whatif #zombiehorde #zombiewall #zombieapocalypse #zombiesurvival | gleich | #shorts #whatif #zombiehorde #zombieapocalypse #zombiesurvival |
| lake-natron | Explaining (Mythos) | #whatif #lakenatron #tanzania #mythbusting #sciencetok | #sciencefacts statt #sciencetok | #shorts #whatif #lakenatron #tanzania #mythbusting |
| louvre-heist-guard | True Crime | #whatif #louvreheist #louvre #truecrime #heist | gleich | #shorts #whatif #louvreheist #louvre #truecrime |
| megalodon-pool | Series (Monsters Are Back) | #whatif #monstersareback #megalodon #sharktok #prehistoric | #sharks statt #sharktok | #shorts #whatif #monstersareback #megalodon #sharks |
| planets-lined-up | Conspiracy | #whatif #planetparade #planetaryalignment #mythbusting #space | gleich | #shorts #whatif #planetparade #planetaryalignment #mythbusting |
| robot-fight | Story | #whatif #robotfight #robotboxing #whatifscenario #humanoidrobot | gleich | #shorts #whatif #robotfight #robotboxing #humanoidrobot |
| sperm-whale | Series (Swallowed Alive) | #whatif #swallowedalive #spermwhale #whales #oceantok | #oceanlife statt #oceantok | #shorts #whatif #swallowedalive #spermwhale #whales |

Tag-Größen geprüft: nur #robotfight (5,2K) und #robotboxing (1,6K); die übrigen beim nächsten Upload in den Studio-Vorschlägen nachsehen und hier eintragen.
