# What-if Content-Plan (Kurzfassung)

Vollständiger Plan als Doc: https://claude.ai/artifact/MqDCKQ1jn8zLDZ7LW4j4mK (Stand 2026-11-10)

## Formel Story-Videos (ab 11.11.2026: 50–56 s, höchstens 58 s, Engine v2.20)
Cold Open + Hook (0–3 s: mitten in der Gefahr, Stimme ab Frame 0, Hook-Satz mit Gefahr + Deadline + „you“) → genau 1 Intro-Beat mit offener Frage, Deadline-Timer ab ca. 2–3 s → Setup + Regel → Eskalation 1 → Dr. Steve gibt Tipp (1 Satz, nur Serien) → Tipp geht schief ("Thanks, Steve.", Stempel sofort) → Re-Hook bei 40–55 % (Satz mit konkretem Vorgriff + Flash-Forward `TEASE`, 0,5–0,7 s Blick auf den Höhepunkt) → Eskalation 2 → Wende zum Tiefpunkt (nur in ausgewählten Videos mit "And that's when it got worse.") → Höhepunkt + Twist so spät wie möglich, Gerald überlebt (Streak +1, nur Serien) → Endcard über der weiterlaufenden Szene (gesprochen nur "What would you have done? Drop it in the comments.", nur Story-Videos; die Frage steht auf der Karte) → Bewertungskarte (höchstens 8 gesprochene Wörter). Endcard + Bewertung zusammen höchstens 6 s; der letzte Satz führt als Loop in die Titelfrage (Loop in allen Videos).
Gespart wird an Karten- und Intro-Sekunden, nicht an der Erzählung. Anlass: Zombie Farm Ep2/Ep4 hatten 13,8–14,1 s Endcard + Bewertung am Stück.
Messen: YouTube „Viewed vs. swiped away“ + Retention-Kurve, Instagram Skip Rate (erste 3 s) + Retention; mit eigenen Videos vor/nach der Umstellung vergleichen.

## Ton (ab 11.11.2026)
- Musik nur, wenn eine Stimmung wirklich zum Thema und zur Szene passt; sonst keine Musik (`AUDIO.mood: 'none'` oder 'none'-Abschnitte im Score), nur Hintergrundgeräusche und SFX.
- Fehlt ein passendes Geräusch, wird es dauerhaft in die Engine gebaut (AMB/SFX in template.html) und gepusht. Seit Engine v2.20 neu: cabin, hum, people, stadium, underwater, forest, cave.

## Running Gags
- **Ab 10.11.2026: Gerald und Dr. Steve nur in Serien.** Einzelvideos ohne Gerald, ohne Gerald-Zähler und ohne Steve; Erzähler, fester Satz und Bewertungskarte bleiben (Fußzeile ohne Gerald).
- Gerald (Serien): Huhn mit Sonnenbrille, tut nie etwas, überlebt immer. Zähler GERALD STREAK.
- Genervter Erzähler: tiefe ernste Stimme, genervt von "you". Wird nur innerhalb einer Serie verzweifelter (Folge 1 leicht genervt, 2 sarkastisch, 3 flehend, ab 4 aufgegeben); neue Serie = wieder Stufe 1.
- Dr. Steve (Serien), Scientist (online certificate): eigene Stimme, ein falscher Tipp pro Folge, nie wiederholt.
- Bewertungskarte zum Schluss, meist 1–2 Sterne; in Serien "Gerald found this helpful", in Einzelvideos eine eigene Fußzeile (z. B. „12 people found this helpful“).
- Ausnahme: ernste Themen (z. B. E14 Zweiter Weltkrieg) ohne Gags, ohne NS-Symbole, Erzähler ernst.
- Verschwörungstheorien in Einzelvideos: Badge „Conspiracy“; Mythos-Karte („THE INTERNET SAYS“) stellt die Behauptung auf, Stempel FALSE, der Erzähler löst sie mit Fakten auf; keine Theorien mit Gesundheits-, Wahl- oder Hetzbezug. Seit Engine v2.6 als fertige Karte `MYTH` in der Engine.

## Joker (nicht in jedem Video)
- Fester Satz "And that's when it got worse.": mit Bedacht, höchstens jedes dritte Video, nie zwei Videos hintereinander, nur vor dem größten Absturz. Pro Serie 1–2 Mal. Sonst leitet ein eigener Erzählersatz die Wende ein.
Stand: running-gags.md

## Bild
- Alle Daten und Zahlen (Zähler, Fahndungssterne, Geld …) stehen direkt unter der "What if"-Badge, ohne Lücke. Ausnahme Erklär- und Conspiracy-Videos: Callouts am Objekt, Lineal links, Faktenkarte mittig.
- Null Toleranz für Bildfehler: keine fremden Linien, Streifen oder Kanten (z. B. Deko-Streifen durch Screens oder Schilder).

## Lieferung
Pro Video: nur `<slug>.mp4` für YouTube (2K, 1440 × 2560, CRF 18) – keine Instagram-Fassung –, Cover, YouTube-Shorts-Text (Titel, Beschreibung, Tags) und Instagram-Caption mit Hashtags.
Rendern über GitHub Actions im Repo Leon1304/what-if-engine (Push von `renders/<slug>.html` → Release `render-<slug>`), ca. 15–20 min pro Folge.

## Serien
Ab Folge 2 (ab 11.11.2026): kein Vollbild-Rückblick mehr auf Frame 0. Die Folge startet mit einem Cold Open aus der neuen Folge, die Wahl steht als Chip „You chose: Cellar ✓“ neben der Badge und wird in einem Satz gesprochen.
1. Zombie Farm – ✅ Staffel 1 fertig: Ep1 Farm-Überfall · Ep2 Keller → Traktor · Ep3 Heuballen-Festung · Ep4 100 Days (Finale). Staffel 2 per Endcard: Zombies in the city / Zombie dinosaurs / You are the zombie
2. Every Second – grew/shrank 1 cm per second, cat grows, ocean rises
3. Swallowed Alive – sperm whale, T-Rex, giant frog, washing machine · 📝 **SA1 sperm-whale Skript fertig 12.11.** („What if a sperm whale swallowed you?“, cyan, Gerald-Streak 10, Steve „Ocean Expert (went to an aquarium once)“, fester Satz ja; Abstimmung Folge 2: T. rex / Giant frog / Washing machine) – Skript-Doc: https://claude.ai/artifact/DdpiyqCV82VVmPVwythB69
4. 1 vs 100 – 100 grandmas vs T-Rex, 1,000 chickens vs lion, 1M ants vs you, Romans vs tank, 10,000 geese
5. Earth Glitch – gravity off 5 s, Earth stops 1 s, Moon twice as close, day = 1 year
6. Monsters Are Back – Megalodon in pool, T-Rex in city, mammoths, kraken · 📝 **MB1 megalodon-pool Skript fertig 12.11.** („What if a Megalodon was in your pool?“, green, Gerald-Streak 11, Steve „Shark Expert (owns a shark-tooth necklace)“, ohne festen Satz; Abstimmung Folge 2: T. rex in the city / Mammoths at the mall / Kraken in the harbor) – Skript-Doc wie SA1
7. Everyday Apocalypse – floor is lava, Wi-Fi dies, soup rain, thoughts audible, house upside down
8. Survive X Days – rubber-duck island, 7 days on Moon, 30 days in mall, ocean floor
9. NPC Life (GTA 6) – 🎬 Folge 1 gerendert ("What if you were an NPC in GTA 6?"), Folgen 2–6 offen. 6 Folgen, 4 Enden (Mall ✅, Leave Vice City ✅, Heist ☠, Go viral ☠), Gerald-Streak 7–12, fester Satz nur in den Wegen "Leave Vice City" und "Go viral", eigener Screen "NPC DESPAWNED", keine Rockstar-Logos/-Figuren. Skript-Doc: https://claude.ai/artifact/35MNR5URJJhteKhYTMAWQi

## Langvideos (16:9, 3–5 Min, + 9:16-Short als Teaser)
Format wie D-Day: 2560 × 1440, Kapitel, Untertitel statt Karaoke, Endcard-Frage über der Szene + ca. 10–14 s ruhiger Schluss für den YouTube-Abspann. Der Short (50–56 s) springt durch die stärksten Momente, endet mit Verweis aufs Langvideo („Verwandtes Video“ in YouTube Studio) und loopt in den Hook.
- D-Day: Why It Happened and What Happened – ✅ gerendert 11.11. (5:41, Doku, ernst, ohne Gags) + Short (49 s)
- Raised by Spartans – 📝 Skript fertig 11.11.: https://claude.ai/artifact/K2PU7NTMJncwrYSaAx1EnA · Story-Video in Du-Perspektive, ca. 4:55, 5 Kapitel (Day 7 · Age 7 · Age 12 · Age 20 · Age 30), zwei Mythos-Karten (NO EVIDENCE, FALSE), Twist: du bist Aristodemus; Farbe red; ohne Gerald/Steve; ohne festen Satz (Wende „Then a runner came from the north.“); Short ca. 53 s. Braucht neue Antike-Bausteine in der Engine (Liste im Doc).
- Reihe „Raised by …“ möglich (Vikings, Samurai, Pirates): Lebenslauf in Altersstufen mit AGE-Zähler, jede Folge steht für sich.

## Einzelvideos (ca. 45 s)
📝 50 Skripte fertig (gerendert: E19, E24; E41 und E42 stehen mit vollem Skript direkt in dieser Datei, Abschnitt „Trend-Videos E41–E42“). **Volle Skripte E1–E40 im Doc: https://claude.ai/artifact/2Z119xNQq76RXhF4Tkamhn** · **E43–E50 (Vorbild-Themen) im Doc: https://claude.ai/artifact/DdpiyqCV82VVmPVwythB69** · reservierte Farben und Sätze in running-gags.md
Format: krasses Cold-Open-Intro mitten im schlimmsten Moment (0–5 s) → Setup → Info-Beat (bei E1–E17 ersetzt der Skill dort den Steve-Beat, ab E18 Mythos-Karte) → Folge → Wende → Ende → Endcard + Umfrage-Sticker + Bewertung. Sprechtext ca. 120–145 Wörter, ausformuliert, durchgehend gesprochen. Spalte Ton (SFX/Musik) pro Beat. Ab E25 zusätzlich Look der Hauptfigur, Umgebungsdetails und Thumbnail-Idee pro Skript. Beim Bauen gilt die Story-Formel oben (Re-Hook + Flash-Forward, Ende ≤ 6 s, Loop, Musik nur wenn passend).
Enden: geschlossen = Auflösung + Sterne · offen = Cliffhanger mit harter Schwarzblende, Bewertungskarte „★ ? – Rating pending“, Top-Antwort der Endcard wird Teil 2.
| # | Slug | Titel | Ende |
|---|---|---|---|
| E1 | pilot-passed-out | What if the pilot passed out and YOU had to land the plane? | geschlossen |
| E2 | phone-battery-life | What if your phone battery was your life? | geschlossen |
| E3 | ocean-drained | What if all the oceans drained in 60 seconds? | offen |
| E4 | everyone-vanished | What if you woke up and every human was gone? | offen |
| E5 | black-hole | What if you fell into a black hole? | offen |
| E6 | million-dollar-challenge | What if you joined a $1,000,000 YouTuber challenge? | geschlossen |
| E7 | endless-livestream | What if your livestream could never end? | geschlossen |
| E8 | ai-clone | What if your AI clone became more famous than you? | offen |
| E9 | bot-views | What if you went viral… and every view was a bot? | geschlossen |
| E10 | backrooms | What if you fell into the Backrooms while streaming? | offen |
| E11 | brainrot-virus | What if brainrot spread like a virus? | offen |
| E12 | influencer-boxing | What if you had to fight in an influencer boxing match? | geschlossen |
| E13 | endless-podcast | What if you got stuck in a video podcast that never ends? | geschlossen |
| E14 | germany-won-ww2 | What if Germany had won World War II? (ernste Sonderfolge, keine Gags) | geschlossen |
| E15 | dinosaurs-survived | What if dinosaurs never went extinct? (Twist: Vögel sind Dinosaurier) | geschlossen |
| E16 | moon-exploded | What if the Moon exploded? | offen |
| E17 | pen-from-space | What if you dropped a pen from space? | geschlossen |
| E18 | moon-landing-fake | What if the Moon landing was fake? (Verschwörung, aufgelöst) | geschlossen |
| E19 | tunnel-through-earth | What if you jumped into a tunnel through the Earth? (Erklärung) | geschlossen |
| E20 | birds-arent-real | What if birds weren't real? (Verschwörung/Satire, aufgelöst) | geschlossen |
| E21 | lightning-strike | What if you got struck by lightning? (Erklärung) | geschlossen |
| E22 | flat-earth | What if the Earth was actually flat? (Verschwörung, aufgelöst) | geschlossen |
| E23 | quicksand | What if you fell into quicksand? (Erklärung) | geschlossen |
| E24 | pyramids-aliens | What if aliens built the pyramids? (Verschwörung, aufgelöst) | geschlossen |
| E25 | area-51 | What if Area 51 really hid aliens? (Verschwörung, aufgelöst) | geschlossen |
| E26 | elevator-fall | What if your elevator started falling? (Erklärung) | geschlossen |
| E27 | loch-ness | What if the Loch Ness Monster was real? (Verschwörung, aufgelöst) | geschlossen |
| E28 | space-jump | What if you jumped from the edge of space? (Erklärung) | geschlossen |
| E29 | bermuda-triangle | What if the Bermuda Triangle really swallowed ships? (Verschwörung, aufgelöst) | geschlossen |
| E30 | snake-bite | What if a venomous snake bit you? (Erklärung) | geschlossen |
| E31 | brain-100 | What if you could use 100 % of your brain? (Mythos, aufgelöst) | geschlossen |
| E32 | meteorite-hit | What if a meteorite hit you? (Erklärung) | geschlossen |
| E33 | polar-bear-2026 | What if the November 2026 polar bear was real? (Trend) | offen |
| E34 | flying-car-update | What if your car got a flying update overnight? (Trend) | geschlossen |
| E35 | black-friday-free | What if everything was free for 60 seconds on Black Friday? (Trend) | geschlossen |
| E36 | zombie-filter | What if the zombie filter actually turned you into a zombie? (Trend) | offen |
| E37 | three-days-blackout | What if the power went out for 3 days? (Trend) | geschlossen |
| E38 | ai-shutdown | What if all AI shut down for a day? (Trend) | geschlossen |
| E39 | christmas-every-day | What if it was Christmas every day? (Trend) | offen |
| E40 | frutiger-aero | What if you woke up inside the 2008 internet? (Trend) | geschlossen |
| E41 | robot-fight | What if you had to fight a robot? (Trend, volles Skript unten) | geschlossen |
| E42 | planets-lined-up | What if all the planets lined up? (Verschwörung/Mythos, aufgelöst; Trend, volles Skript unten) | geschlossen |
| E43 | heart-stops | What happens when your heart stops? (Erklärung, ernst, ohne Gags, Erste Hilfe; Vorbild) | geschlossen |
| E44 | moon-crashes | What if the Moon fell toward Earth? (Erklärung; Vorbild) | geschlossen |
| E45 | nuke-the-moon | What if we nuked the Moon? (Erklärung, Twist Project A119; Vorbild) | geschlossen |
| E46 | every-planet | What if you stood on every planet without a suit? (Erklärung, Ranking; Vorbild) | geschlossen |
| E47 | lake-natron | What if you fell into Lake Natron? (Erklärung, Mythos „turns you to stone“; Vorbild) | geschlossen |
| E48 | last-light | What if everyone vanished… when would the last light go out? (Story, ruhig; Vorbild) | geschlossen |
| E49 | earth-grows | What if Earth grew 1 cm every second? (Erklärung; Vorbild) | geschlossen |
| E50 | niagara-straw | What if Niagara Falls went through a straw? (Erklärung; Vorbild) | geschlossen |
E6–E13 = Creator-Trends 2026, nur erfundene Creator.
E33–E40 = virale Trends Stand 11.11.2026 (Trend-Check mit Quellen im Skript-Doc). Story-Videos mit „What if“-Badge und Ende „What would you have done?“; die Mythos-Karte (E33, E35, E36, E37) ist dort nur der Info-Beat, nicht das Conspiracy-Format. Keine echten Marken, Personen, Songs oder Logos.
Reihenfolge (so rendern): E1 Mi 18.11. · E6 Sa 21.11. · E2 Mi 25.11. · E7 Sa 28.11. · E3 Mi 2.12. · E8 Sa 5.12. · E4 Mi 9.12. · E9 Sa 12.12. · E5 Mi 16.12. · E10 Sa 19.12. · E11 Mi 23.12. · E12 Sa 26.12. · E13 Mi 30.12. · E15 Sa 2.1. · E16 Mi 6.1. · E17 Sa 9.1. · E18 Mi 13.1. · E19 Sa 16.1. · E20 Mi 20.1. · E21 Sa 23.1. · E22 Mi 27.1. · E23 Sa 30.1. · E24 Mi 3.2. · E25 Sa 6.2. · E26 Mi 10.2. · E27 Sa 13.2. · E28 Mi 17.2. · E29 Sa 20.2. · E30 Mi 24.2. · E31 Sa 27.2. · E32 Mi 3.3. · E14 eigener Slot außerhalb der Gag-Reihe (thematisch 8. Mai).
Trend-Slots dazwischen (zuerst rendern, E33 sofort – der Eisbär-Gag funktioniert nur im November): E33 So 15.11. · E34 So 22.11. · E35 Do 26.11. (vor Black Friday 27.11.) · E36 So 29.11. · E37 So 6.12. · E38 So 13.12. · E39 So 20.12. · E40 So 27.12.
E41–E42 = Trend-Videos vom 12.11.2026 (Roboter-Käfigkampf, Planeten-Parade): gebaut und geprüft, Render offen. Slots: E42 zuerst (Parade ab Sa 14.11., am besten zwischen 13. und 20.11. posten), E41 ohne Termin, z. B. als Trend-Zusatzvideo am Sa 14.11. oder in der Woche danach.

### Vorbild-Videos E43–E50 + SA1, MB1 (📝 Skripte fertig 12.11.2026)
Aus der Liste der meistgesehenen What-if-Videos (Infographics Show, Kurzgesagt, What If, xkcd What If; Muster in virale-vorbilder.md). Nur das Prinzip übernommen, eigene Titel, Hooks und Wendungen. **Volle Skripte (Beat-Tabellen, Look, Umgebung, Zähler, Ton, Endcard, Loop, Thumbnails A/B, geprüfte Fakten + Quellen, YouTube-Titel): https://claude.ai/artifact/DdpiyqCV82VVmPVwythB69**
| Vorbild (Aufrufe) | Unser Video | Format | Farbe | Status |
|---|---|---|---|---|
| What Happens When You Die? (27 Mio.) | E43 heart-stops | Erklärung, ernst, Mythos „shock a flatline“ FALSE | lime | 📝 Skript |
| What Happens if the Moon Crashes into Earth? (22 Mio.) | E44 moon-crashes | Erklärung, Rate-Frage (Ring statt Einschlag) | orange | 📝 Skript |
| What if We Nuke the Moon? (20 Mio.) | E45 nuke-the-moon | Erklärung, Mythos FALSE + Twist A119 | purple | 📝 Skript |
| What If We Dumped Our Trash into Volcanoes? (17 Mio.) | T22 volcano-trash | Erklärung | red | ✅ gerendert 11.11. |
| What If You DIED on Every Planet? (16 Mio.) | E46 every-planet | Erklärung, Ranking, Rate-Frage | yellow | 📝 Skript |
| What If You Were Swallowed ALIVE by a Sperm Whale? (16 Mio.) | SA1 sperm-whale | Serie Swallowed Alive Folge 1 | cyan | 📝 Skript |
| What If the World Lost Oxygen for 5 Seconds? (15 Mio.) | T23 oxygen-5-seconds | Erklärung | blue | ✅ gerendert 11.11. |
| What If You Jumped Into Lake Natron? (13 Mio.) | E47 lake-natron | Erklärung, Mythos „turns you to stone“ FALSE | red | 📝 Skript |
| What If a Megalodon Was Lurking Beneath You? (11 Mio.) | MB1 megalodon-pool | Serie Monsters Are Back Folge 1 | green | 📝 Skript |
| If all humans died, when would the last light go out? (9,3 Mio.) | E48 last-light | Story, ruhig, aus dem All | blue | 📝 Skript |
| What if Earth grew 1cm every second? (5,1 Mio.) | E49 earth-grows | Erklärung, Zeitsprünge, Rate-Frage | orange | 📝 Skript |
| What if you funneled Niagara Falls through a straw? (4,9 Mio.) | E50 niagara-straw | Erklärung, Rate-Frage | cyan | 📝 Skript |
- Gags: Gerald/Steve nur in SA1 (Streak 10) und MB1 (Streak 11); fester Satz nur in SA1 (vor dem Magen); alle anderen mit eigenem Wende-Satz. Neue Loop-Sätze und Steve-Titel stehen im Skript-Doc; beim Rendern in running-gags.md übernehmen.
- Render-Reihenfolge (Vorschlag): SA1 → E47 → E43 → E46 → MB1 → E45 → E44 → E49 (nach E44 posten, Mond-Ring-Rückgriff) → E50 → E48. Farben beim Einplanen gegen die Nachbarvideos prüfen.
- ✅ Offene Aussagen geklärt (12.11., Quellen im Skript-Doc): E45 Energie-Satz bleibt (den Mond anzuhalten braucht ca. 3,8 × 10²⁸ J, ein Vielfaches aller Atomwaffen) · MB1 Planschen lockt Haie an (National Geographic, Hawaii DLNR), Beat bleibt · SA1 Blasloch führt nur in die Lunge, Satz präzisiert zu „The blowhole only goes to the lungs. Not to the throat.“ · E48 Batterie-Zeitsprung von Year twenty auf Year thirty geändert (xkcd: Batterielampen halten einige Jahrzehnte); xkcd-Originalseite nicht auffindbar, Angaben über Video-Zusammenfassung und Buchtext bestätigt.

### Trend-Videos E41–E42 (volle Skripte, Stand 12.11.2026 – gebaut und geprüft, noch nicht gerendert)
Aus der nächtlichen Trend-Routine vom 12.11. (Kandidaten und Quellen in trend-log.md). Beide wurden mit Engine v2.40.27 gebaut und per Kontaktbogen geprüft; die MP4s fehlen, weil die Sitzung nicht ins Repo pushen durfte. Zeiten sind die geprüften Beat-Zeiten in Sekunden. Beide ohne Gerald, ohne Dr. Steve, ohne festen Satz, Loop in den Hook.
Neue Engine-Bausteine, die dafür gebaut wurden und im Repo noch fehlen (sie stecken in `engine-v2.40.27.patch` aus dem Chat vom 12.11., zusammen mit beiden Render-Seiten; ohne den Patch neu bauen): `fightCage()` (Achteck-Käfig mit Tür, offenen Kamerafeldern, Lichttraverse, Gongtisch), `ringBell()` + Sound `bell`, `arenaHall()` (dunkle Halle), `fightBot()` (Kampfroboter auf Figuren-Rig), `headOff()` (Kopf fliegt ab, bleibt liegen, Körper macht weiter – nur Roboter), `botHead()`, `gloves()` (Boxhandschuhe), `orrery()` (Sonnensystem-Modell, `align` schwenkt alle Planeten auf eine Linie), `telescope()`; `carry`-Wurf ohne Arm-Sprung.
(Stand-Hinweis: laut trend-log.md wurden beide Videos am 12.11. nachmittags doch gerendert und die Bausteine als Engine v2.40.27/v2.40.28 gepusht.)

#### E41 robot-fight – What if you had to fight a robot?
- **Format:** Story-Video (Badge „What if“), Einzelvideo · **Farbe:** red · **Länge:** 55,8 s · **Stimme:** deep, Erzähler Stufe 1 · **Ende:** geschlossen (Sieg durch Ring-out)
- **Trend:** Humanoiden-Käfigkampf, bei dem ein Roboter nach einem Tritt ohne Kopf weiterkämpft – Clip seit 4.11.2026 wieder viral (Sunday Guardian 5.11., dotdotnews 7.11.; Ereignis 16.7.2026 in Shenzhen, Futurism 17.7.). Nur das Prinzip, kein Markenname, eigenes Roboter-Design. Nicht zeitkritisch.
- **Look „you“:** rotes Shirt, Buzz-Cut, rote Boxhandschuhe (`char('you', { outfit: 'buzz' })` + `gloves`). Gesicht: determined → nervous (nach dem Brust-Schlag) → happy (Kopf ab) → panic (blinde Schläge) → determined → happy.
- **Roboter:** silberner Humanoid mit türkisem Visier und leuchtendem Brustkern, rote Akzente (`fightBot`).
- **Umgebung:** dunkle Halle (`arenaHall`, SKY night, keine Wolken), Achteck-Käfig in der Mitte, vordere drei Felder offen für die Kamera, Tür auf der +x-Seite, Gongtisch links; drei Tribünen mit jubelndem Publikum (`audience`, Jubel nach dem Tritt und am Ende); ein Spot über dem Käfig, drei schwache Aufheller.
- **Zähler:** Final bell (Timer bis zur Glocke, groß, ab Beat 1) · Win chance in % (22 → 9 nach dem Brust-Schlag „steel chest“ → 86 „head gone“ → 40 „still standing“ → 12 „blind fury“ → 100 „ring-out“, Alarm unter 15) · Robot heads (1 → 0, nur Beat 4–6). Phase: Round 1 / Round 2 (ab Beat 5) / Round 3 (ab Beat 8).

| Beat | Zeit | Sprechtext (EN) | Bild | Ton |
|---|---|---|---|---|
| 0 Hook | 0–3,6 | What if… you had to fight a robot? | Cold Open im Käfig: der Roboter landet den ersten Schlag (0,5 s), Funken, Kamera von vorn durch das offene Feld, Push-in | boom bei 0, Musik action, Atmo stadium + hum durchgehend |
| 1 Intro | 3,6–9,2 | Three rounds. One steel cage. An opponent that never gets tired. | Kran-Totale über Käfig und Tribünen (2,7 s), dann Nahaufnahme Roboter mit Visier; ihr umkreist euch. Timer erscheint | Ringglocke (bell), Musik tense ab Beat 2 |
| 2 Setup + Regel | 9,2–14,3 | It weighs as much as you — in steel. Last one standing wins. | Über deine Schulter: der Roboter schattenboxt (4 Schläge in die Luft), du zuckst; dann Nahaufnahme dein Gesicht (determined) | servo |
| 3 Eskalation 1 | 14,3–19,3 | Round one. You punch its chest. Your hand regrets it. | Seitenansicht: du gehst ran, Schlag auf die Brustplatte (clang), nichts passiert; Nahaufnahme du (nervous, Schweiß); der Roboter schüttelt den Kopf | bell leise, clang, Musik action |
| 4 Kopf ab | 19,3–24,9 | So you aim higher. One perfect kick — and its head leaves the fight. | Durch das linke offene Feld: Tritt bei 22,4 s in Zeitlupe (1,0 s, Rate 0,28), der Kopf fliegt mit Funken im Bogen, springt auf, bleibt hinten rechts liegen; Publikum springt auf | riser vor dem Tritt, clang, buzz, applause; Ton der Zeile: excited |
| 5 Re-Hook | 24,9–29,5 | The crowd goes wild. But nobody rings the bell. | Du gehst jubelnd auf die Kamera zu (2 × fistpump), hinter dir steht der kopflose Roboter, Funken am Hals, und hebt wieder die Fäuste; du erschrickst. `TEASE` bei 28,3 s (0,6 s, Label „Round 3“): der Roboter rennt durch die Käfigtür | Musik tense, servo |
| 6 Fakt | 29,5–33,9 | Fun fact: fighting robots keep their brain in the chest. | Nahaufnahme Brustkern mit Callout „Brain“, dann Makro auf den Kopf am Boden mit Callout „Just a camera“ (Visier leuchtet noch) | Musik funny, ding |
| 7 Wende | 33,9–37,7 | It can’t see you. So it punches everything. | Totale von vorn: der Roboter schlägt blind um sich (6 Schläge) und läuft Zickzack nach links, du rennst nach rechts weg (panic) | riser, Musik action |
| 8 Idee | 37,7–43,3 | But the head still sees. So you grab it — and throw it out. | Du schleichst zum Kopf, hebst ihn auf (2,5 s nach Beat-Start) und wirfst ihn in hohem Bogen über die Käfigwand nach rechts hinaus (4,75 s) | servo, whoosh |
| 9 Twist | 43,3–49,4 | The body follows its eyes. Out of the ring. You win. Technically. | Aus dem Käfig Richtung Tür: der Körper sprintet los, rammt die Tür auf (44,7 s, Shake), steht draußen; Glocke bei 45,8 s, Timer auf 00:00; Nahaufnahme du (happy), joggst zur Mitte | clang, bell, applause, Musik triumph; Ton der Zeile: deadpan |
| Endcard | 49,4–55,8 | What would you have done? Drop it in the comments. | Kamera draußen vor der Tür: der kopflose Roboter tanzt im Vordergrund (dance robot), du jubelst im Käfig dahinter | stinger |
| Loop | Ende | Rematch is Friday. So — | Überblendung in den Hook | |

- **Endcard:** How would *you* beat the robot? · A Kick the head · B Unplug it · C Run
- **Thumbnail A:** Moment des Tritts von links vorn, Kopf fliegt mit Funken ab, Strahlen in Rot, Pfeil auf den leeren Hals, Text „It kept *fighting*“. **Thumbnail B:** du vorn rechts mit Panik-Gesicht und Blick in die Kamera, dahinter der kopflose Roboter mit erhobenen Fäusten, Glow, Fragezeichen, Text „It can’t *see* you“ (Zeitpunkt vor dem Flash-Forward wählen).
- **Fakt und Quelle:** Beim Roboter aus dem viralen Clip sitzt die zentrale Steuereinheit im Rumpf, deshalb lief er ohne Kopf weiter (Sunday Guardian 5.11.2026; keine Angabe, wie lange er ohne Kopf arbeiten könnte).
- **YouTube-Titel:** What if you had to fight a robot? 🤖🥊 · alternative Hooks: „What if your opponent didn't need its head?“ · „What if the robot kept fighting… without its head?“
- **Bau-Hinweise:** Kameras von außen nur mittig durch ein offenes Feld (sonst steht ein Pfosten im Bild), Halbtotalen und Nahaufnahmen aus dem Käfig heraus. Für das Aufheben einen zweiten Kopf als Gegenstand an der Endlage einblenden, sobald der lose Kopf verschwindet. Thumbnail-Zeitpunkt nie in das `TEASE`-Fenster legen.

#### E42 planets-lined-up – What if all the planets lined up? (Verschwörung/Mythos, aufgelöst)
- **Format:** Conspiracy (Badge „Conspiracy“) · **Farbe:** blue · **Länge:** 43,3 s · **Stimme:** documentary · **Ende:** geschlossen, Stempel FALSE
- **Trend (zeitgebunden, frisch bis Ende November):** Vier-Planeten-„Parade“ am Morgenhimmel ab 14.11.2026 – Merkur, Venus, Mars und Jupiter vor Sonnenaufgang im Osten, Mars und Jupiter am 14.11. nur 1° auseinander (Forbes 10.11.2026, Star Walk 5.11., National Geographic 29.10.). Dazu der alte Mythos, eine Planetenreihe reiße die Erde auseinander. Am besten um den 14.–20.11. posten.
- **Look „you“:** Mütze (beanie), steht am Teleskop am Strand und schaut in den Himmel; Gesicht: calm → nervous (liest die Behauptung am Handy) → confused → relieved.
- **Drei Orte:** (A) Strand im Morgengrauen (SKY dawn, Meer Richtung +z, Biom beach): Teleskop, Pinnwand, vier Planeten als Lichtpunkte auf einer schrägen Linie über dem Meer. (B) „Mythos“-Modell im All (x = 4000): Sonne und alle acht Planeten in einer perfekten Linie (`orrery` mit `align`). (C) „Wirklichkeit“ im All (x = 8000): dasselbe Modell von oben, Merkur, Venus, Mars und Jupiter liegen aus Sicht der Erde auf derselben Seite, aber weit verstreut.
- **Pflicht-Bausteine:** Pinnwand (Foto Globus „EARTH“, Zettel „PLANETS ALIGN!“, Ausschnitt „MEGA QUAKE!“, Foto Auge „THEY KNOW“, Zettel „GRAVITY x8“, Ausschnitt „1982: DOOM?“; drei Fäden reißen nach den drei Schritten, drei rote Kreuze, die Wand kippt beim Urteil) · Believability-Nadel (92 → 58 „no real line“ → 31 „too far away“ → 10 „tested in 1982“ → 2 „NASA math“) · Myth vs. Reality als Split (3 s in Schritt 1: oben die perfekte Linie, unten der Blick von oben) · Zeitleiste 1970–2030 mit 1974 „The book“, 1982 „Doom date“, 2026 „This week“ (nur in Schritt 3) · ein Standbild in Schritt 2.
- **Zahlen im Bild (Budget eingehalten):** 1982 in der Caption, 0.04 mm auf der Faktenkarte.

| Beat | Zeit | Sprechtext (EN) | Bild | Ton |
|---|---|---|---|---|
| 0 Hook | 0–3,2 | What if… all the planets lined up? | Modell B: die Planeten schwenken in eine Linie (fertig bei 0,3 s), Kamera schräg von hinter Neptun Richtung Sonne, Push-in; Shake und orangener Blitz bei 0,25 s | boom, rumble, Musik epic, Atmo space |
| 1 Behauptung | 3,2–10,2 | The internet says: when planets align, their gravity tears Earth apart. This week, four line up. | Strand von hinten über deine Schulter: Morgenhimmel mit den vier Lichtpunkten, Callouts „Jupiter + Mars“, „Venus“, „Mercury“ (3,4 s); dann Pinnwand von vorn, du liest am Handy und erschrickst; Nadel erscheint | riser, Musik tense, Atmo surf |
| 2 Schritt 1 „The line“ | 10,2–16,8 | First: there is no line. Seen from above, the four are scattered across the solar system. | Modell C von oben mit Callouts „You“ (Erde), „Jupiter“, „Venus“; Split Myth / Reality 12,5–15,5 s; dann Fokus auf den Zettel „PLANETS ALIGN!“, Faden reißt bei 16,1 s, Kreuz | Musik science, Atmo space, dann surf |
| 3 Schritt 2 „The pull“ | 16,8–23,4 | Second: gravity fades fast with distance. All the planets together barely move your ocean. | Flach über dem Sand: Meer, aufgehende Sonne, Planeten darüber; zweiter Winkel von links; Standbild bei 19,9 s (1,5 s, Chip „High tide – planets included“) mit Callouts „Moon + Sun: the tide“ und „All planets: a hair more“ auf dem Wasser; dann Fokus auf „GRAVITY x8“, Faden reißt, Kreuz | surf |
| 4 Schritt 3 „The test“ | 23,4–30,8 | Third: it’s been tested. A bestseller promised a giant quake for 1982. Nothing happened. | Fokus auf den Ausschnitt „1982: DOOM?“ (3 s), Zeitleiste läuft 1974 → 1982; Modell B: die Erde groß und völlig ruhig, Sonne dahinter (2,6 s); zurück zur Pinnwand, Faden reißt, Kreuz, Zeitleiste auf 2026 | Musik science, Stufe 2 |
| 5 Auflösung | 30,8–36,8 | NASA did the math: the extra tide is thinner than a hair. So enjoy the view. | Pinnwand kippt bei 31,8 s um, du zuckst mit den Schultern und nickst (relieved); Faktenkarte „0.04 mm – extra tide if every planet lined up · Source: NASA“ (31,2–34,4 s); Stempel FALSE ca. 2,3 s vor der Endcard über dem Himmelsblick mit Teleskop | ding, Musik chill |
| Endcard + Loop | 36,8–43,3 | Did you believe it? A or B — drop your pick in the comments. · Loop: Still, someone always asks: | Blick über deine Schulter in den Morgenhimmel, langsamer Push-in; Überblendung in den Hook | stinger |

- **Endcard:** Did you *believe* it? · A Yes · B Not for a second
- **Thumbnail A:** die Planetenlinie im All, Stempel FALSE, Text „Planets *align?*“. **Thumbnail B:** du mit Teleskop vor dem Morgenhimmel, große Zahl „0.04 mm“, Text „Planets vs. *your ocean*“.
- **Geprüfte Fakten und Quellen (für „Sources:“ in der YouTube-Beschreibung):** NASA, zitiert von TIME: alle Planeten in einer Linie würden die Gezeiten um etwa 1/25 mm anheben · NASA NSSDCA, „The Planetary Alignment of 5 May 2000“: die Planeten sind zu weit weg, um auf der Erde etwas zu bewirken · Wikipedia, „The Jupiter Effect“: Buch von 1974, sagte für den 10.3.1982 unter anderem ein großes Erdbeben voraus, es blieb aus · Forbes 10.11.2026: die Planeten stehen nicht wirklich in einer Linie im Raum, der Anblick entsteht durch die Blickrichtung von der Erde.
- **YouTube-Titel:** What if all the planets lined up? 🪐 · alternative Hooks: „What if this week's planet parade could move your ocean?“ · „What if eight planets pulled on Earth at once?“
- **Bau-Hinweise:** Ein eigener Kameraschnitt direkt nach einem `focusShot` beginnt 0,02 s nach dessen Ende, sonst fliegt die Kamera vom Pinnwand-Motiv zum nächsten Ort. Blick von oben: Kamera ca. 95 m über dem Modell, leicht versetzt, dann passen die Bahnen bis Jupiter ins Hochformat.

## Erklär- und Conspiracy-Videos (Format ab Engine v2.6, Stand 11.11.2026)
- Erklärvideos (Badge „Explaining“, `CFG.kind: 'explain'`): Skripte mit „(Erklärung)“ – E19, E21, E23, E26, E28, E30, E32, E43, E44, E45, E46, E47, E49, E50.
- Conspiracy-Videos (Badge „Conspiracy“, `CFG.kind: 'conspiracy'`): Skripte mit „(Verschwörung …)“ oder „(Mythos …)“ – E18, E20, E22, E24, E25, E27, E29, E31, E42. Ablauf: Behauptung als Mythos-Karte direkt nach dem Hook, dann die Fakten Schritt für Schritt, Stempel FALSE beim stärksten Beweis; Satire (E20) mit Augenzwinkern.
- Look: Badge oben links „Explaining“ bzw. „Conspiracy“ statt „What if #…“, jedes Video in einer anderen Akzentfarbe (Badge, Akzentwörter, Karten, Callouts); ruhiger Documentary-Erzähler; Bewertungskarte mit Fußzeile „Sources in the description“.
- **Länge (ab 11.11.2026): 40–50 s, höchstens 52 s.** E19 und E24 kamen auf 70–71 s, das war Leon zu lang. Ca. 95–115 gesprochene Wörter, pro Beat 1–2 Sätze; die Skripte im Doc (ca. 120–145 Wörter) beim Bauen entsprechend kürzen. `assemble.py` warnt ab 52 s.
- Formel: Hook (0–2,5 s) → Rate-Frage (Erklärung) **oder** Mythos-Karte (Conspiracy), nie beides → 3 nummerierte Schritte à 5–6 s (Standbild mit Callouts/Röntgen liegt in einem Schritt, kein eigener Beat) → eine Faktenkarte mit Quelle + Auflösung in einem Beat → Endcard (~3,5 s) + Bewertung (~2,5 s, `review.say` höchstens 8 Wörter, Loop-Satz), beide über der weiterlaufenden Szene.
- Ende: kein „What would you have done?“. Die Endcard fragt zum Thema (Conspiracy: „Did you believe it?“, Erklärung: „Would you have survived?“ / „Did you guess right?“); Schlusssatz und CTA baut die Engine automatisch aus Frage und Optionen („… A, B or C — drop your pick in the comments.“). Loop-Ende Pflicht.
- Pflicht-Bausteine Conspiracy (Engine v2.7/2.8): Pinnwand mit reißenden Fäden, Believability-Nadel, einmal Myth vs. Reality (alle während der Schritte, nicht davor); Thumbnail A mit FALSE-Stempel oder Nadel, B mit der verblüffendsten Zahl.
- Pflicht: Fakten per Websuche prüfen, Quellen auf den Karten und unter „Sources:“ in der YouTube-Beschreibung; bei Gesundheitsthemen korrekte Erste Hilfe, gefährliche Mythen nur widerlegt.
- Werkzeug-Ideen: E19 aufgeschnittene Erde mit Tunnel + Lineal Tiefe · E21 Röntgen mit Strompfad + Standbild beim Einschlag · E23 Querschnitt-Block mit durchsichtiger Treibsandschicht · E26 Geschwindigkeitskurve + Standbild · E28 Höhenlineal (Everest, Airliner, Sprunghöhe) + Kurve bis zur Schallmauer · E30 Röntgen mit Giftpfad + Mythos-Karte „Suck out the venom“ (FALSE) · E32 Faktenkarte Einschlaggeschwindigkeit + Querschnitt Krater.

### Themen-Pool Erklärvideos T1–T12 (noch ohne Skript, Details im Skript-Doc unter „Themen-Pool“)
Jedes Thema mit Hook, Rate-Frage + Antwort, Mythos-Karte, 3 Schritten, Standbild-Idee, geprüften Fakten + Quelle und Thumbnail (beim Skripten nur Rate-Frage oder Mythos-Karte verwenden, nicht beides). ★ = zuerst skripten.
- ★ T1 How to escape a sinking car (Guess: was tun die meisten falsch? → Handy statt raus; SWOC, Giesbrecht)
- ★ T2 The loudest sound in history (Guess: wie weit hörbar? → 4.800 km; Krakatau 1883)
- ★ T3 What a sunset looks like on Mars (Guess: welche Farbe? → blau; NASA)
- ★ T4 What really happens in space without a suit (Guess: explodieren/erfrieren/kochen? → nichts davon, bewusstlos nach 10–15 s)
- ★ T5 The internet is under the ocean (Guess: wie viel Datenverkehr? → ~99 %; Haie < 1 % der Schäden)
- T6 How to escape a rip current (parallel schwimmen; 80 % der Strandrettungen)
- T7 What happens when lightning hits your plane (~1× pro Jahr, Faradayscher Käfig)
- T8 The deepest hole ever dug (12.262 m = ~0,2 % zum Erdmittelpunkt, 180 °C)
- T9 The frog that freezes solid and comes back to life (bis zu 7 Monate gefroren)
- T10 Is Yellowstone about to explode? (1 zu 730.000 pro Jahr, USGS)
- T11 Why seawater makes you thirstier (Nieren, >3× salziger als Blut, NOAA)
- T12 The worst place to hide from a tornado (Autobahnbrücke, NWS)

### Themen-Pool T13–T37 (Stand 11.11.2026, mit Trend-Check)
Trend-Lage Nov 2026: Feeds wechseln von Halloween zu Weihnachten; animierte Zombie-Outbreak-Survival-Storys trenden auf TikTok; gesichtsloser Erklär-Content läuft stark. Kinder (Gen Alpha) schauen u. a. Mark Rober, Minecraft, Roblox, Pokémon, Dinosaurier. Zahlen ohne Quelle beim Skripten noch per Websuche gegenprüfen.
**Datumsgebunden (zuerst, solange frisch):**
- ★ T13 Why is Friday the 13th "unlucky"? – **Fr 13.11.2026** (Mythos-Karte: Tempelritter-Verhaftung 13.10.1307 → NO EVIDENCE, erst im 20. Jh. verknüpft; erster Beleg 1869 in der Rossini-Biografie – Rossini starb am Fr 13.11.1868, also genau heute vor 158 Jahren; in Italien ist Freitag der 17. der Unglückstag)
- ★ T14 Voyager 1 is now one light-day away – **Mi 18.11.** 06:16 UTC (Rate-Frage: wie lange unterwegs? → 49 J., 2 Mon., 11 Tage; ~25,9 Mrd. km; Befehl + Antwort = 48 h; NASA JPL)
- ★ T15 NASA found a skull in Antarctica – Vega Island (NASA Earth Observatory 2.11.: Nunatak = Auge, Seitenmoräne = Mund, Devil's Bay Glacier = Kiefer, blickt Richtung Devil Island; warmer Winter 2026 legt Eis frei, der „Schädel“ verändert sich)
- ★ T16 Scientists just found dinosaur blood (PNAS Nov 2026: Aratasaurus, 115 Mio. Jahre, Häm-Spuren in Blutzell-Strukturen ~23 µm; Mythos-Karte „Now we can clone dinosaurs“ → FALSE: keine DNA, kein flüssiges Blut)
- T17 Is Mars still alive? (Science Advances 4.11.: Chlorwasserstoff über frischen Rissen am Vulkan Alba Mons, evtl. Magma darunter; nicht bewiesen)
- T18 What a shooting star really is (Leoniden-Höhepunkt Nacht 17./18.11., Supermond 24.11.; Rate-Frage: wie groß? → meist sandkorngroß; Komet 55P/Tempel-Tuttle)
- ★ T19 Real zombies exist (Zombie-Ameisen-Pilz: Ameise beißt um die Mittagszeit in die Blattader, ~25 cm über dem Boden, Pilzstiel wächst aus dem Kopf; BMC Ecology 2011) – passt zum Zombie-Outbreak-Trend und zu Zombie Farm
**Gruselig:**
- ★ T20 Never stare into a mirror in the dark (Caputo 2010: Effekt nach < 1 Min., ~2/3 sahen ihr Gesicht verzerrt, > 1/4 eine fremde Person; Mythos-Karte Bloody Mary)
- T21 The shadow man of sleep paralysis (~8 % erleben es mind. einmal; Gehirn wach, Körper noch im REM-Stillstand)
- T22 The lake that suffocated a village (Nyos 1986, CO₂-Wolke, 1.746 Tote; ernst, ohne Gags)
- T23 6 million people under Paris (Katakomben)
- T24 The parasite that turns snails into zombies (Leucochloridium, pulsierende Fühler locken Vögel)
- T25 Who is Krampus? (Krampusnacht 5.12. – Anker für Anfang Dezember)
**Skurril:**
- T26 The town that couldn't stop dancing (Straßburg 1518: 50–400 Menschen, Juli bis Sept.; ob Menschen starben, ist umstritten)
- T27 The deadly wave of molasses (Boston 1919: 21 Tote, Welle ~7,6 m, ~56 km/h; ernst)
- ★ T28 The shrimp hotter than the Sun (Pistolenkrebs: Blase ~4.700 °C vs. Sonnenoberfläche ~5.500 °C, bis ~218 dB; störte im 2. Weltkrieg das Sonar; WHOI) – auch für Kinder
- T29 The war Australia lost to birds (Emu-Krieg 1932)
- T30 The animal that survived open space (Bärtierchen, FOTON-M3 2007, 10 Tage)
- T31 The jellyfish that never dies (Turritopsis dohrnii)
**Jüngere Zielgruppe (familienfreundlich, ohne Blut):**
- ★ T32 Why wombats poop cubes (Ig-Nobelpreis 2019; ~80–100 Würfel pro Nacht)
- T33 What if you swallow gum? (Mythos „7 Jahre im Magen“ → FALSE)
- T34 Do cats always land on their feet? (Studie 1987: 132 Katzen, im Schnitt 5,5 Stockwerke, 90 % überlebten mit Behandlung; Mythos „immer heil“ → FALSE)
- T35 The animal with 3 hearts and blue blood (Oktopus)
- T36 Do goldfish forget everything after 3 seconds? (→ FALSE, sie merken sich Dinge über Monate)
- T37 Can your eyes pop out when you sneeze? (→ FALSE)
Hinweis Kinder-Themen: Richtet sich ein Video vor allem an Kinder unter 13, verlangt YouTube die Einstellung „Made for Kids“ – dann sind Kommentare aus und die Endcard-Frage läuft ins Leere. Daher familienfreundlich für alle, nicht gezielt für Kleinkinder.
Slots: T13 Fr 13.11. (zusätzlich zum NPC-Teaser) · T14 Mi 18.11. (E1 rückt nach) · T15, T16, T19 in den nächsten 2 Wochen · T25 um den 5.12.

## Posting-Rhythmus
Mo Hauptserie · Mi Debatte/Banger · Fr neue Serie anteasern · Sa Trend-/Zusatz-Einzelvideo · So 15.11.–27.12. zusätzlich Trend-Slot (E33–E40). KW 47 2026 – KW 9 2027 geplant. Werden 4–5 Posts pro Woche zu viel, ersetzt das Trend-Video in seiner Woche den Sa-Slot und das Evergreen-Video rückt nach hinten.
NPC Life zum GTA-6-Launch (19.11.2026): Teaser Fr 13.11. · Folge 1 Mo 16.11. · Abstimmungsgewinner Do 19.11. (Launch-Tag) · danach Mo-Slots bis 14.12.
