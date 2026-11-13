# Running Gags – Stand

Wird vom /whatif-Skill vor jedem Video gelesen und danach aktualisiert.

## Regel ab 10.11.2026: Gerald und Dr. Steve nur in Serien
- Gerald und Dr. Steve kommen nur noch in Serienfolgen vor. Einzelvideos (E1–E17 und alle neuen) haben keinen Gerald, keinen Gerald-Zähler und keinen Steve-Beat, -Stempel oder -Auftritt. Der genervte Erzähler und der feste Satz (Joker) bleiben. Die Bewertungskarte gibt es seit 11.11.2026 nicht mehr (Loop zurück in den Hook, siehe „Loop-Sätze“).
- Die Steve-Spalten der E-Tabelle unten (Titel, Tipp, Stempel, Vor Ort, Reaktion) sind damit hinfällig; Titel und Tipps dürfen später in einer Serie verwendet werden.
- Die Gerald-Streak zählt nur Serienfolgen.
- Ab E18 sind die Skripte bereits ohne Gerald und Steve geschrieben: Statt Steves Tipp stellt eine Mythos-Karte („THE INTERNET SAYS“ / „MYTH“) die Behauptung auf, Stempel FALSE, der Erzähler widerlegt sie.
- Kanal-Handle in Einzelvideos (seit E1/E6): `CFG.series` bleibt null, die Szene setzt `#chan` per `tick` auf „@whatifthishappenedscenarios“ (oben links über der Badge).
- True Crime (ab TC1, 12.11.2026): `CFG.kind: 'truecrime'`, Badge „True Crime“, Erzähler Declan Sage, ernst und ohne Gags (kein genervter Erzähler, kein fester Satz, kein Slang), Faktenkarte mit Quelle, keine Namen von Verdächtigen.

## Gerald
- Gerald-Streak (über alle Serienfolgen): 11 (ZF1 = 1 … ZF6 = 6, NL1 = 7, EG1 = 8, ZC1 = 9, SA1 = 10, MB1 = 11)
- Nächste Serienfolge mit Gerald: Streak 12

## Gore (`CFG.gore` je Serie)
- Zombie City: `'blood'` (in ZC1 noch keine abgetrennten Teile)
- Swallowed Alive: `'off'` (Magensäure nur als grünlicher Nebel)
- Monsters Are Back: `'off'`

## Fester Satz „And that’s when it got worse.“ (Joker, nicht in jedem Video)
- Regel: höchstens in jedem dritten Video, nie in zwei Videos hintereinander, nur vor dem größten Absturz des Videos. Pro Serie 1–2 Mal.
- Bisherige Einsätze: ZF1–ZF6 (alle, noch nach der alten Regel) · Video 7 (NL1): nein · E19 (gerendert 10.11., Posting Sa 16.1.): ja, vor dem Erdkern · E24 (gerendert 10.11., Posting Mi 3.2.): nein · E1 (gerendert 11.11., Posting Mi 18.11.): nein, Ersatzsatz „One red light. The worst kind.“ · E6 (gerendert 11.11., Posting Sa 21.11.): nein · Bouncing Betty (Erklärvideo, gerendert 11.11., ernstes Thema): nein, Wende über „The war ended in 1945. Not all mines did.“ · Groundskeeper (Einzelvideo, gerendert 11.11., Posting offen): ja, vor dem Wanddurchbruch · D-Day (normales YouTube-Video 16:9 + Short, gerendert 11.11., ernstes Thema ohne Running Gags): nein, zählt wie E14 nicht für die Abstände · Zombie Farm mit Ende (Einzelvideo, gerendert 11.11., Posting offen): nein, Wende über „Then the barn catches fire …“ · EG1 Earth Glitch „Gravity off for 5 seconds“ (11.11.): nein, Wende über „Then gravity remembered you.“ · T24 nuke-mariana-trench (Erklärvideo, 11.11.): nein, Wende über das Bild (Kuppel statt Welle) und „But this warm water is now radioactive.“ · T21 nuclear-pool, T23 oxygen-5-seconds, T22 volcano-trash, T25 iss-falls (Erklärvideos, 11.11.): alle nein, Wende jeweils über die Fakten · H1 night-shift-customer (11.11.): nein, Wende „Then the lights flicker. All three turn to the mirror.“ · H2 mom-came-home-twice (11.11.): nein, Wende „Then the knocking stops. On both doors.“ · ZC1 Zombie City (11.11.): nein, Wende „Then the gates start closing.“ · H7 underground-radio (11.11.): ja, vor der Funkstimme „You can turn around now.“ · robot-fight (Trend-Video, 12.11.): nein, Wende „It can’t see you. So it punches everything.“ · planets-lined-up (Trend-Video, Conspiracy, 12.11.): nein, Wende über die Fakten · SA1 sperm-whale (12.11.): ja, vor dem Magen · E47 lake-natron (Erklärvideo, 12.11.): nein, Wende über die Fakten · E43 heart-stops (Erklärvideo, ernst, 12.11.): nein, Wende „Then someone stops.“ · E46 every-planet (Erklärvideo, 12.11.): nein, Wende „So you try the last place on the list.“ · MB1 megalodon-pool (12.11.): nein, Wende „Then the pool wall cracks.“ · TC1 louvre-heist-guard (True Crime, ernst, 12.11.): nein, Wende über Bild und Ton („A disc cutter screams through the window glass.“), zählt wie D-Day nicht für die Abstände · jerusalem-zombie-wall (Einzelvideo, 13.11.): ja, vor dem Moment, in dem der Zombie-Stapel die Mauerkrone erreicht · bus-stop-types (Testformat, 13.11.): nein, Wende über den Bus, der durchfährt
- Letzter Einsatz in Render-Reihenfolge: jerusalem-zombie-wall (13.11.); die nächsten zwei gebauten Videos ohne festen Satz. In Posting-Reihenfolge: E1, E6, E17, E18, E20 und E21 ohne festen Satz; E16 und E22 passen (je 3 Videos Abstand); Groundskeeper, H7 und SA1 beim Einplanen nicht direkt neben ein anderes Joker-Video legen
- Geplant NPC Life: nur im Weg „Leave Vice City“ (Hurrikan) und im Weg „Go viral“ (neuer Spielstand); vor dem Rendern Abstand prüfen
- E33–E40 (Trend-Slots So 15.11.–So 27.12., zwischen der Reihe gepostet): alle ohne festen Satz, damit die Abstände der Joker-Videos E1, E7, E4, E10 und E13 halten; jedes Skript hat einen eigenen Wende-Satz
- Erklärvideos T21–T25: alle ohne festen Satz (Erklär-Formel, Wende über Fakten)

## Farben (CFG.accent – je Serie eine, nächste Serie/Einzelvideo nicht wie die letzten zwei)
| Serie / Video | Farbe |
|---|---|
| Zombie Farm (ZF1–ZF6) | yellow |
| NPC Life (NL1–) | pink |
| Earth Glitch (EG1–) | blue |
| Zombie City (ZC1–) | purple |
| Swallowed Alive (SA1–) | cyan |
| Monsters Are Back (MB1–) | green |
| E19 tunnel-through-earth (Erklärvideo) | orange |
| E24 pyramids-aliens (Conspiracy, laut Plan; im Posting weit von E19 entfernt) | orange |
| E1 pilot-passed-out (gerendert 11.11.) | blue |
| E6 million-dollar-challenge (gerendert 11.11.) | red |
| bouncing-betty (Erklärvideo, gerendert 11.11., Warnschild-Gelb) | yellow |
| groundskeeper (Einzelvideo, gerendert 11.11.) | lime |
| dday (normales YouTube-Video 16:9, 5:41) + dday-short (9:16-Teaser), gerendert 11.11. | green |
| zombie-farm-ending (Einzelvideo, Remake von ZF1 mit Ende, gerendert 11.11., Serienfarbe zur Wiedererkennung) | yellow |
| gravity-off (EG1, 11.11.) | blue |
| nuke-mariana-trench (T24, Erklärvideo, gerendert 11.11.) | cyan |
| nuclear-pool (T21, Erklärvideo, gerendert 11.11.) | purple |
| oxygen-5-seconds (T23, Erklärvideo, gerendert 11.11.) | blue |
| volcano-trash (T22, Erklärvideo, gerendert 11.11.) | red |
| iss-falls (T25, Erklärvideo, gerendert 11.11.) | green |
| night-shift-customer (H1, Einzelvideo, gerendert 11.11.) | lime |
| mom-came-home-twice (H2, Einzelvideo, gerendert 11.11.) | red |
| zombie-city-ep1 (ZC1, gerendert 11.11.) | purple |
| underground-radio (H7, Einzelvideo, gerendert 11.11.) | orange |
| E41 robot-fight (Trend-Video, Einzelvideo, gebaut 12.11., Render offen) | red |
| E42 planets-lined-up (Trend-Video, Conspiracy, gebaut 12.11., Render offen) | blue |
| sperm-whale (SA1, gerendert 12.11.) | cyan |
| lake-natron (E47, Erklärvideo, gerendert 12.11.) | red |
| heart-stops (E43, Erklärvideo, gerendert 12.11.) | lime |
| every-planet (E46, Erklärvideo, gerendert 12.11.) | yellow |
| megalodon-pool (MB1, gebaut 12.11.) | green |
| louvre-heist-guard (TC1, True Crime, gerendert 12.11.) | red |
| jerusalem-zombie-wall (Einzelvideo, gerendert 13.11., erstes Video mit eigenen Blender-Modellen) | orange |
| bus-stop-types (Testformat „Types of people“, kein What-if, 13.11.) | lime |
| nächste Serie | Vorschlag: orange (danach z. B. pink) |

## Dr. Steve (nur Serien)
- **Fake-Titel (`CFG.steveTitle`, nie wiederholen):** benutzt: „Scientist (online certificate)“ (ZF1–ZF6) · „Expert (10k hours in GTA 5)“ (NL1) · „Gravity Expert (fell off a bike once)“ (EG1) · „Zombie Expert (PhD from a cereal box)“ (ZC1) · „Ocean Expert (went to an aquarium once)“ (SA1) · „Shark Expert (owns a shark-tooth necklace)“ (MB1). Ideen: Expert (watched 1 video) · Scientist (self-declared) · Professor (YouTube comments) · Genius (says his mom) · Doctor (of vibes) · Researcher (Wikipedia, 4 min)
- **Fester Spruch:** „Trust the science, bro.“ – am Ende jedes Tipps
- **Stempel:** `stamp: 'wrong'` jede Serienfolge; `stamp: 'right'` etwa jede 5. Serienfolge, frühestens 4 Serienfolgen nach dem letzten Mal
  - Steve zuletzt recht: noch nie · Serienfolgen seitdem: 11 → darf in der nächsten Serienfolge recht haben
- **Steve vor Ort (`char('steve')`, etwa jede 3. Serienfolge):** zuletzt ZC1 (sitzt schon im gläsernen Wartehäuschen, rennt hinten raus); SA1 und MB1 nur per Anruf → in der nächsten Serienfolge wieder vor Ort
- **Erzähler-Reaktionen (nicht dieselbe wie in der letzten Serienfolge):** zuletzt „Nobody asked, Steve.“ (MB1). Pool: „Steve. No.“ · „Steve, please.“ · „Nobody asked, Steve.“ · Seufzer (`sigh: true`)

| Video | Titel | Stempel | Vor Ort | Reaktion |
|---|---|---|---|---|
| ZF1–ZF6 | Scientist (online certificate) | – | – | – |
| 7 (NL1) | Expert (10k hours in GTA 5) | wrong | ja | Seufzer |
| 8 (EG1) | Gravity Expert (fell off a bike once) | wrong | nein | „Nobody asked, Steve.“ |
| 9 (ZC1) | Zombie Expert (PhD from a cereal box) | wrong | ja | „Steve. No.“ |
| 10 (SA1) | Ocean Expert (went to an aquarium once) | wrong | nein | „Steve, please.“ |
| 11 (MB1) | Shark Expert (owns a shark-tooth necklace) | wrong | nein (Videoanruf) | „Nobody asked, Steve.“ |

## Reserviert für Einzelvideos E1–E40 (Skript fertig; gerendert: E1, E6, E19, E24)
Skript-Doc: https://claude.ai/artifact/2Z119xNQq76RXhF4Tkamhn · Format ca. 45 s, krasses Cold-Open-Intro, Enden teils offen (Cliffhanger mit harter Schwarzblende), teils geschlossen. Diese Titel, Tipps und Farben nicht in anderen Videos verwenden. Beim Rendern in den Video-Log übernehmen.
**Neu (10.11.2026): ohne Gerald und ohne Dr. Steve rendern** – die Steve-Spalten unten entfallen; bei E1–E17 den Steve-Beat im Skript durch einen Erzähler- oder Info-Beat ersetzen. Ab E18 schon so geschrieben (Mythos-Karte statt Steve); ab E25 stehen Look, Umgebung und Thumbnail-Idee im Skript.
Geplante Render-/Posting-Reihenfolge (Gags darauf abgestimmt): E1 (Mi 18.11.) · E6 (Sa 21.11.) · E2 (Mi 25.11.) · E7 (Sa 28.11.) · E3 (Mi 2.12.) · E8 (Sa 5.12.) · E4 (Mi 9.12.) · E9 (Sa 12.12.) · E5 (Mi 16.12.) · E10 (Sa 19.12.) · E11 (Mi 23.12.) · E12 (Sa 26.12.) · E13 (Mi 30.12.) · E15 (Sa 2.1.) · E16 (Mi 6.1.) · E17 (Sa 9.1.) · E18 (Mi 13.1.) · E19 (Sa 16.1.) · E20 (Mi 20.1.) · E21 (Sa 23.1.) · E22 (Mi 27.1.) · E23 (Sa 30.1.) · E24 (Mi 3.2.) · E25 (Sa 6.2.) · E26 (Mi 10.2.) · E27 (Sa 13.2.) · E28 (Mi 17.2.) · E29 (Sa 20.2.) · E30 (Mi 24.2.) · E31 (Sa 27.2.) · E32 (Mi 3.3.). NPC-Life-Folgen dazwischen: Abstände beim Rendern prüfen, sonst Ersatzsatz.
Trend-Slots dazwischen (E33–E40, virale Trends Stand 11.11.2026, zuerst rendern): E33 (So 15.11.) · E34 (So 22.11.) · E35 (Do 26.11.) · E36 (So 29.11.) · E37 (So 6.12.) · E38 (So 13.12.) · E39 (So 20.12.) · E40 (So 27.12.). Farben gegen die zwei Videos davor und danach in dieser Reihenfolge geprüft, NPC Life (pink, montags) eingerechnet. Story-Videos mit „What if“-Badge und „What would you have done?“-Ende; die Mythos-Karte ist dort nur der Info-Beat, nicht das Conspiracy-Format.
**E14 germany-won-ww2 = ernste Sonderfolge ohne Running Gags** (kein Gerald, kein Steve, kein Slang, keine Umfrage, keine NS-Symbole). Zählt nicht für Gag-Abstände; eigener Slot außerhalb der Reihe.
| Video | Steve-Titel | Tipp | Stempel | Vor Ort | Reaktion | Fester Satz | Farbe | Slang | Ende |
|---|---|---|---|---|---|---|---|---|---|
| E1 pilot-passed-out ✅ gerendert 11.11. (ohne Steve/Gerald: Ellbogen kippt die Fuel-Schalter, ausgesperrter Co-Pilot klopft bis zum Schluss) | Pilot (flight simulator, free trial) | „Planes are just big computers. Turn it off and on again.“ | – | – | – | nein · Ersatz „One red light. The worst kind.“ verwendet | blue | – | geschlossen |
| E6 million-dollar-challenge ✅ gerendert 11.11. (ohne Steve/Gerald: Gegnerin am Ende = Oma mit Klappstuhl und Strickzeug) | Challenge Expert (watched 1 video) | „Pretend to sleep. They can’t eliminate you if you’re asleep.“ | – | – | – | nein | red | aura · cooked | geschlossen |
| E2 phone-battery-life | Tech Expert (fixed his mom’s printer) | „Close all your apps. Every five seconds.“ | wrong | nein | „Nobody asked, Steve.“ | nein | green | the audacity | geschlossen |
| E7 endless-livestream | Sleep Doctor (of vibes) | „Coffee is just sleep in liquid form. Drink twelve.“ | wrong | nein (Spende im Chat) | „Steve. No.“ | ja, falls Abstand passt · sonst „Day nine. The worst raid in history.“ | purple | chat, is this real? | geschlossen |
| E3 ocean-drained | Marine Biologist (owns a goldfish) | „Follow the water. Water always knows the way out.“ | wrong | ja (Metalldetektor) | „Steve, please.“ | nein | orange | unhinged | offen |
| E8 ai-clone | AI Engineer (asked a chatbot once) | „AIs can’t do captchas. Make it click all the traffic lights.“ | wrong | nein | „Nobody asked, Steve.“ | nein | blue | it’s giving | offen |
| E4 everyone-vanished | Genius (says his mom) | „Lonely? Play the ice cream truck song. Nobody can resist it.“ | wrong | nein | Seufzer | ja, falls Abstand passt · sonst „On day three, the lights went out. All of them.“ | purple | W | offen |
| E9 bot-views | Social Media Guru (12 followers) | „Fight bots with bots. Buy more views.“ | wrong | nein | „Steve. No.“ | nein | green | ratio · mid | geschlossen |
| E5 black-hole | Astrophysicist (Wikipedia, 4 min) | „Near a black hole, time slows down. So technically, you can never be late again.“ | **right** (erstes Mal) | nein | Sonderreaktion „Wait. That’s actually correct.“ | nein | cyan | fr | offen |
| E10 backrooms | Backrooms Professor (YouTube comments) | „Exits are always behind you. Walk backwards.“ | wrong | ja (seit 2019 verirrt) | Seufzer | ja, falls Abstand passt · sonst „Then the lights started going out.“ | yellow | no shot | offen |
| E11 brainrot-virus | Brain Scientist (self-declared) | „Fight brainrot with brainrot. Six hours straight, like a vaccine.“ | wrong | nein | „Nobody asked, Steve.“ | nein | green | sigma · chat | offen |
| E12 influencer-boxing | Boxing Coach (won one pillow fight) | „Never block. Blocking is for people who are scared.“ | wrong | nein | „Steve, please.“ | nein | red | built different | geschlossen |
| E13 endless-podcast | Podcast Expert (owns a microphone) | „Hosts hate silence. Just say nothing.“ | **right** (zweites Mal, 4 Videos nach E5) | ja (zweiter Gast) | Sonderreaktion „Steve is right. Again. I hate this.“ | ja, falls Abstand passt · sonst „Then he panicked.“ | orange | say less | geschlossen |
| E15 dinosaurs-survived | Paleontologist (owns a dino toy) | „A T. rex can’t see you if you don’t move. Just freeze.“ | wrong | nein | „Steve. No.“ | nein | green | lowkey | geschlossen |
| E16 moon-exploded | Astronomer (has a telescope app) | „The Moon is basically cheese. Catch a piece. Free snack.“ | wrong | nein | Seufzer | ja, falls Abstand passt · sonst „Then gravity took over.“ | blue | – | offen |
| E17 pen-from-space | Physicist (dropped his phone once) | „Throw it down. Pens from space hit like a nuke.“ | wrong | ja (schwebt durch die ISS) | „Nobody asked, Steve.“ | nein | purple | massive L | geschlossen |
| E18 moon-landing-fake | – | Mythos-Karte: „The flag is waving. No wind on the Moon.“ | FALSE (Mythos-Karte) | – | – | nein | cyan | – | geschlossen |
| E19 tunnel-through-earth ✅ gerendert 10.11. | – | Mythos-Karte: „You’d stop in the middle.“ (statt „You’d get there in minutes.“ – 42 min sind auch Minuten) | FALSE (Mythos-Karte) | – | – | ja (eingesetzt, vor dem Erdkern) | orange | – | geschlossen |
| E20 birds-arent-real | – | Mythos-Karte: „Birds sit on power lines to recharge.“ | FALSE (Mythos-Karte) | – | – | nein | yellow | – | geschlossen |
| E21 lightning-strike | – | Mythos-Karte: „Lie flat and lightning can’t find you.“ | FALSE (Mythos-Karte) | – | – | nein | purple | – | geschlossen |
| E22 flat-earth | – | Mythos-Karte: „Just walk to the edge and look over.“ | FALSE (Mythos-Karte) | – | – | ja, falls Abstand passt · sonst „Then the oceans started moving.“ | green | – | geschlossen |
| E23 quicksand | – | Mythos-Karte: „Quicksand swallows you whole.“ | FALSE (Mythos-Karte) | – | – | nein | red | – | geschlossen |
| E24 pyramids-aliens ✅ gerendert 10.11. | – | Mythos-Karte: „Humans couldn’t move stones like that.“ (zweimal: Behauptung nach dem Hook, Stempel FALSE nach den Bandennamen) | FALSE (Mythos-Karte) | – | – | nein | orange | – | geschlossen |
| E25 area-51 | – | Mythos-Karte: „Area 51 hides crashed UFOs.“ | FALSE (Mythos-Karte) | – | – | nein | green | – | geschlossen |
| E26 elevator-fall | – | Mythos-Karte: „Jump at the last second and you’ll survive.“ | FALSE (Mythos-Karte) | – | – | nein | blue | – | geschlossen |
| E27 loch-ness | – | Mythos-Karte: „A dinosaur survived in the lake.“ | FALSE (Mythos-Karte) | – | – | nein | cyan | – | geschlossen |
| E28 space-jump | – | Mythos-Karte: „Up there, you’d freeze instantly.“ | FALSE (Mythos-Karte) | – | – | ja, falls Abstand passt · sonst „Then the spinning started.“ | purple | – | geschlossen |
| E29 bermuda-triangle | – | Mythos-Karte: „Ships vanish there more than anywhere.“ | FALSE (Mythos-Karte) | – | – | nein | blue | – | geschlossen |
| E30 snake-bite | – | Mythos-Karte: „Suck the venom out.“ | FALSE (Mythos-Karte) | – | – | nein | green | – | geschlossen |
| E31 brain-100 | – | Mythos-Karte: „You only use 10 % of your brain.“ | FALSE (Mythos-Karte) | – | – | nein | yellow | – | geschlossen |
| E32 meteorite-hit | – | Mythos-Karte: „Meteorites land red-hot.“ | FALSE (Mythos-Karte) | – | – | ja, falls Abstand passt · sonst „Then it reached your roof.“ | orange | – | geschlossen |
| E33 polar-bear-2026 (Trend, So 15.11.) | – | Mythos-Karte: „The polar bear is a meme sent from 2026.“ | FALSE (Mythos-Karte) | – | – | nein | cyan | – | offen |
| E34 flying-car-update (Trend, So 22.11.) | – | Faktenkarte: echter Prototyp mit Kaltgas-Düsen, Okt. 2026 | – | – | – | nein | orange | – | geschlossen |
| E35 black-friday-free (Trend, Do 26.11.) | – | Mythos-Karte: „It’s called Black Friday because stores finally make a profit.“ | FALSE (Mythos-Karte) | – | – | nein | yellow | – | geschlossen |
| E36 zombie-filter (Trend, So 29.11.) | – | Mythos-Karte: „The zombie fungus could infect humans.“ | FALSE (Mythos-Karte) | – | – | nein | green | – | offen |
| E37 three-days-blackout (Trend, So 6.12.) | – | Mythos-Karte: „A giant blackout has been announced.“ | FALSE (Mythos-Karte) | – | – | nein | yellow | – | geschlossen |
| E38 ai-shutdown (Trend, So 13.12.) | – | Faktenkarte: 53 % des Web-Traffics sind Bots | – | – | – | nein | red | – | geschlossen |
| E39 christmas-every-day (Trend, So 20.12.) | – | Faktenkarte: Nordmanntanne 8–12 Jahre, über 20 Mio. Bäume pro Jahr | – | – | – | nein | orange | – | offen |
| E40 frutiger-aero (Trend, So 27.12.) | – | Faktenkarte: Frutiger Aero ~2004–2013, Name erst 2017 | – | – | – | nein | cyan | – | geschlossen |
| E41 robot-fight (Trend 12.11., volles Skript im Content-Plan, gebaut, Render offen) | – | Fakten-Beat: „Fighting robots keep their brain in the chest.“ | – | – | – | nein · Wende „It can’t see you. So it punches everything.“ | red | – | geschlossen |
| E42 planets-lined-up (Trend 12.11., Conspiracy, volles Skript im Content-Plan, gebaut, Render offen; posten um den 14.–20.11.) | – | Behauptung (gesprochen): „When planets align, their gravity tears Earth apart.“ | FALSE (Stempel am Ende) | – | – | nein | blue | – | geschlossen |

## Vorbild-Themen E43–E50, SA1, MB1 (Skripte: https://claude.ai/artifact/DdpiyqCV82VVmPVwythB69, Render-Reihenfolge SA1 → E47 → E43 → E46 → MB1 → E45 → E44 → E49 → E50 → E48)
| Video | Format | Fester Satz | Farbe | Status |
|---|---|---|---|---|
| SA1 sperm-whale | Story, Serie Swallowed Alive 1 | ja (vor dem Magen) | cyan | ✅ gerendert 12.11. (57,9 s) |
| E47 lake-natron | Erklärung (Mythos „turn to stone“, FALSE) | nein | red | ✅ gerendert 12.11. (44,9 s) |
| E43 heart-stops | Erklärung, ernst, ohne Witze (Mythos „shock a flatline“, FALSE) | nein | lime | ✅ gerendert 12.11. (48,1 s) |
| E46 every-planet | Erklärung (Rate-Frage, Antwort C Nowhere) | nein | yellow | ✅ gerendert 12.11. (50,4 s) |
| MB1 megalodon-pool | Story, Serie Monsters Are Back 1 | nein | green | gebaut 12.11., Render läuft |
| E45, E44, E49, E50, E48 | siehe Skript-Doc | – | – | offen |

## Erklärvideos T21–T25 (Skripte im Skript-Doc, Abschnitt „Erklärvideos T21–T25“, alle gerendert 11.11.2026)
| Video | Format | Rate-Frage / Mythos | Fester Satz | Farbe | Status |
|---|---|---|---|---|---|
| T24 nuke-mariana-trench | Erklärung (Rate-Frage) | „How big is the tsunami?“ 100 m · 10 m · Basically none (C) | nein | cyan | ✅ gerendert 11.11. (41,8 s) |
| T21 nuclear-pool | Erklärung (Rate-Frage) | „Do you survive a swim?“ Dead in seconds · Totally fine (B) · Glowing forever | nein | purple | ✅ gerendert 11.11. (41,8 s) |
| T23 oxygen-5-seconds | Erklärung (Mythos-Karte) | „Concrete turns to dust and your eardrums explode.“ FALSE | nein | blue | ✅ gerendert 11.11. (39,8 s) |
| T22 volcano-trash | Erklärung (Mythos-Karte) | „Volcanoes are nature’s incinerator.“ FALSE | nein | red | ✅ gerendert 11.11. (37,8 s) |
| T25 iss-falls | Erklärung (Rate-Frage) | „Where does it land?“ Your city · The Moon · Loneliest spot on Earth (C) | nein | green | ✅ gerendert 11.11. (40,8 s) |

## Horror-Videos H1, H2, H7 (Skripte: https://claude.ai/artifact/JN7oKUhqoybCxEUzAcL1bg, alle gerendert 11.11.2026, Engine v2.39.x)
| Video | Farbe | Fester Satz | Ende | Status |
|---|---|---|---|---|
| H1 night-shift-customer | lime | nein | geschlossen mit Twist (du fehlst im Spiegel) | ✅ 54,0 s |
| H2 mom-came-home-twice | red | nein | offen (Schwarzblende) → Teil 2 nach Endcard Front door / Back door / Neither | ✅ 56,3 s |
| H7 underground-radio | orange | ja | geschlossen mit Twist (Funk war die ganze Nacht tot) | ✅ 56,8 s |

## True Crime TC1–TC5 (Themenliste, Kategorie ab 12.11.2026)
| Video | Farbe | Fester Satz | Ende | Status |
|---|---|---|---|---|
| TC1 louvre-heist-guard | red | nein | geschlossen · Endcard Chase them / Get everyone out / Hit every alarm | ✅ gerendert 12.11. (56,3 s, Engine v2.50) |

## Serien (Erzähler-Stufe = Folge der Serie: 1 leicht genervt · 2 sarkastisch · 3 flehend · ab 4 aufgegeben)
| Serie | Letzte Folge | Nächste Folge | Erzähler-Stufe nächste Folge |
|---|---|---|---|
| Zombie Farm | 6 (alle 4 Enden fertig) | abgeschlossen | – |
| NPC Life (GTA 6) | 1 (Abstimmung offen) | 2 = Abstimmungsgewinner aus NL1 | Stufe 2 (sarkastisch) |
| Earth Glitch | 1 (Abstimmung offen) | 2 = Abstimmungsgewinner aus EG1 | Stufe 2 (sarkastisch) |
| Zombie City | 1 (Abstimmung offen) | 2 = Abstimmungsgewinner aus ZC1 | Stufe 2 (sarkastisch) |
| Swallowed Alive | 1 (Abstimmung offen) | 2 = Abstimmungsgewinner aus SA1 | Stufe 2 (sarkastisch) |
| Monsters Are Back | 1 (Abstimmung offen) | 2 = Abstimmungsgewinner aus MB1 | Stufe 2 (sarkastisch) |

### Zombie Farm – Entscheidungsbaum (Folgen im Repo: `Leon1304/what-if-engine` → `series/zombie-farm/ep1…ep6`, Cast: `series/zombie-farm/cast.json`)
```
ZF1 Farm-Überfall → Abstimmung: A Silo · B Cellar · C Tractor
├─ B Cellar  → ZF2  ✅ überlebt  (Ending 1 of 4)
├─ A Silo    → ZF3  ✅ überlebt  (Ending 2 of 4, 100 Tage)
└─ C Tractor → ZF4  Abstimmung: A Hay-bale fortress · B Keep driving
     ├─ A Fortress     → ZF5 ☠ nicht geschafft (Ending 3 of 4)
     └─ B Keep driving → ZF6 ☠ nicht geschafft (Ending 4 of 4)
```
Posting: ZF1 zuerst, dann Abstimmungsgewinner, danach die anderen Wege als „What if you chose … instead?“.
Außerhalb des Baums: Remake von ZF1 als Einzelvideo mit eigenem Ende (11.11., `renders/zombie-farm-ending.html`): gleiche Welt, Silo + Feuerwerk, Sonnenaufgang.

### NPC Life – Entscheidungsbaum (Skript: https://claude.ai/artifact/35MNR5URJJhteKhYTMAWQi · Repo: `series/npc-life/ep1`, Cast: `series/npc-life/cast.json`)
Welt in ep1.scene.js (am 10.11. mit Skill v2.6 neu gebaut): Ocean-Drive-Strand mit Pastell-Hotels, Neon „Vice City“, News-Screen, Krankenhaus „Vice City General“, Hotdog-Stand, Promenade mit Laternen, Bänken, Pflanzkübeln, pinkes Cabrio (Gerald immer Beifahrer), schwarzer Sportwagen des Spielers, grüner Spieler-Pfeil, Polizeiautos, Heli mit Suchscheinwerfer. Look „you“: Kappe in Pink, kurze Haare, türkises Shirt (cast.json). Zähler: Dignity-Balken, Hospital bill, Ragdolled, Wanted-Sterne, Gerald streak.
END von NL1: q „How do *you* escape the player?“ · opts ['Hide in the mall', 'Leave Vice City', 'Be the main character']
```
NL1 NPC in GTA 6 ✔ gerendert → Abstimmung: A Mall · B Leave Vice City · C Main character
├─ A Mall            → ✅ überlebt (Ending 1 of 4)
├─ B Leave Vice City → ✅ überlebt (Ending 2 of 4) · fester Satz
└─ C Main character  → Abstimmung: A Heist · B Go viral
     ├─ A Heist    → ☠ despawned (Ending 3 of 4)
     └─ B Go viral → ☠ despawned (Ending 4 of 4) · fester Satz
```

### Earth Glitch – Serie (Repo: `series/earth-glitch/ep1`, Cast: `series/earth-glitch/cast.json`)
Jede Folge ein neuer Glitch der Erde, Abstimmung über den nächsten Glitch. Welt in ep1.scene.js: Vorstadt-Garten mit Haus, Trampolin, Aufstellpool (Wasser wird zur schwebenden Kugel), Grill, Terrassentisch mit Schirm, Liegestühle, Gartenzwerg, Hund, Nachbargarten links hinter dem Zaun mit pinkem Pool und gelbem Schwimmring; Gerald im blauen Liegestuhl mit Beistelltisch und Teller. Look „you“: Kappe blau verkehrt herum, Locken, orangenes Shirt (cast.json). Biom farm. Zähler: Gravity back in (Countdown), Your height, Landing odds, Gerald streak.
END von EG1: q „Which glitch hits *you* next?“ · opts ['Earth stops for 1 second', 'The Moon comes twice as close', 'One day lasts a year']
```
EG1 Gravity off for 5 seconds ✔ gerendert → Abstimmung: A Earth stops 1 s · B Moon twice as close · C One day = one year
```

### Zombie City – Serie (Staffel 2 der Zombie-Welt; Skript: https://claude.ai/artifact/JN7oKUhqoybCxEUzAcL1bg · Repo: `series/zombie-city/ep1`, Cast: `series/zombie-city/cast.json`)
Welt in ep1.scene.js: Innenstadt in der Dämmerung, Straße entlang x mit Bordsteinen und Gullys, Gehwege, Hochhäuser bei z ±21, Straßenlaternen, lila Bus mitten im Stau (Gerald auf dem Busdach), Stau-Autos, gläsernes Wartehäuschen (Steve drin), E-Scooter, Typ mit Handy, Rauchsäulen über der Stadt, am Ende Straßenbrücke mit Schranke und Mauthäuschen (Gerald mit Pommes auf dem Dach). Look „you“: lila Jacke, Locken, kein Hut (cast.json). Gore 'blood'. Zähler: Bridge closes in, Zombies nearby, Scooter battery, Gerald streak.
END von ZC1: q „Where do *you* hide?“ · opts ['The rooftop', 'The subway tunnels', 'The mall']
```
ZC1 Zombies in the city ✔ gerendert → Abstimmung: A Rooftop · B Subway tunnels · C Mall
```

### Swallowed Alive – Serie (Repo: `series/swallowed-alive/ep1`, Cast: `series/swallowed-alive/cast.json`)
Jede Folge verschluckt dich etwas anderes. Welt in ep1.scene.js: offenes Meer, Speedboot mit Touristen, Gerald mit Popcorn auf dem Boot, Pottwal (Engine v2.42), Schlund und Magen als Innenräume. Look „you“: gelbe Jacke (Hoodie), kurze Haare, kein Hut (cast.json). Gore 'off'. Zähler: Air left, Depth, Gerald streak.
END von SA1: q „What swallows *you* next?“ · opts ['A T. rex', 'A giant frog', 'A washing machine']
```
SA1 Sperm whale ✔ gerendert → Abstimmung: A T. rex · B Giant frog · C Washing machine
```

### Monsters Are Back – Serie (Repo: `series/monsters-are-back/ep1`, Cast: `series/monsters-are-back/cast.json`)
Jede Folge kommt ein Urzeit-Monster zurück. Welt in ep1.scene.js: Villa-Terrasse mit Infinity-Pool am Hang über dem Meer (Engine v2.46 swimPool), Sprungbrett, Liegen, Luftmatratze mit Loch, Megalodon (zu lang für den Pool), Gerald auf einem aufblasbaren Flamingo. Look „you“: grüne Badeshorts, weißes Tanktop, kurze Haare (cast.json). Gore 'off'. Zähler: Float air, Lineal Shark vs. pool, Gerald streak.
END von MB1: q „Which monster comes back *next?*“ · opts ['A T. rex in the city', 'Mammoths at the mall', 'A kraken in the harbor']
```
MB1 Megalodon in your pool ✔ gebaut → Abstimmung: A T. rex in the city · B Mammoths at the mall · C Kraken in the harbor
```

## Benutzte Erzähler-Zeilen
- ZF1 (leicht genervt): „And you? Lowkey panicking.“ · „The fence? A few minutes, max.“ · „Barn on fire. You? Cooked.“
- ZF2 (sarkastisch): „You chose the cellar. Bold.“ · „Underground. One door. No Wi-Fi.“
- ZF3 (flehend): „You chose the silo. Please, stay up there.“ · „Please. Just sit still.“
- ZF4 (aufgegeben): „You chose the tractor. Sure.“ · „I don’t even get paid for this.“
- ZF5 (aufgegeben): „I stopped hoping. Respectfully.“ · „No plot twist this time. RIP.“
- ZF6 (aufgegeben): „I’m not even worried. I’m tired.“ · „They close in. It’s so over.“
- NL1 (leicht genervt): „Zero main character energy.“ · „You walk into traffic, fully confident.“ · „Out of a whole city, you’re his favorite NPC.“
- E19 (Erklärvideo, Doku-Stimme): „Took them twenty years. You? Fifty seconds.“ · „You won’t. You’re way too fast.“
- E24 (Conspiracy, Doku-Stimme): „Case closed?“ · „One guy’s only job: pour water.“ · „Aliens don’t need bakeries.“ · „Aliens don’t sign their work.“
- E1 (leicht genervt): „Flight experience? One paper airplane. It hit a teacher.“ · „Somehow, you’re flying a plane.“ · „The co-pilot is still knocking.“
- E6 (leicht genervt): „Your aura? Unshakable.“ · „Just for a second.“ · „And you? Cooked.“
- Bouncing Betty (Erklärvideo, Doku-Stimme, ernstes Thema, keine Witze über Opfer): „Movies say: don’t lift your foot. It fires anyway.“ · „The war ended in 1945. Not all mines did.“
- Groundskeeper (leicht genervt): „You? The Groundskeeper.“ · „Marbles first. Bowling pins.“ · „Four traps, gone — but you kept one secret.“ · „Cellar: full. You: not a scratch.“
- D-Day (Langvideo + Short, Doku-Stimme, ernst): keine Erzähler-Witze; Schlusssatz Langvideo „The white markers above Omaha Beach show what that one day cost.“, Short-Loop „It started with —“
- Zombie Farm mit Ende (leicht genervt): „Easy, right?“ · „Then it folds like a cheap lawn chair.“ · „One tries anyway. For an hour.“ · „Zombies: gone. Barn: crispy. You: alive.“
- EG1 (leicht genervt): „What goes up comes down. Including you.“ · „You grab a floating burger. Priorities.“ · „Floating’s easy. Landing isn’t.“ · „Then gravity remembered you.“
- T24 (Erklärvideo, Doku-Stimme): „Your ship is right above it.“ · „Your ship rocks. No giant wave.“ · „The deep ocean swallows it.“
- T21 (Erklärvideo, Doku-Stimme): „Six meters? Over eighty halvings.“ · „Security would stop you long before the water.“
- T23 (Erklärvideo, Doku-Stimme): „The bridge stays up.“ · „You just hold your breath.“ · „You barely noticed.“
- T22 (Erklärvideo, Doku-Stimme): „All far away.“ · „Steel doesn’t even melt.“ · „Just toxic smoke.“
- T25 (Erklärvideo, Doku-Stimme): „Most of it burns up.“ · „NASA got a littering fine.“
- H1 (leicht genervt, Horror): „He never came back.“ · „Customer one blinks and buys jerky. Human.“ · „And the note? Your handwriting.“
- H2 (leicht genervt, Horror): „Same coat. Same voice.“ · „Same second. Same little laugh.“ · „Who are you texting?“
- ZC1 (leicht genervt): „Last time, one farm. This time, the whole city.“ · „Glass on all sides. Faces on all sides. Thanks, Steve.“ · „Gerald: across, eating fries.“
- H7 (leicht genervt, Horror): „Small problem. You’re the only one on this level.“ · „One step too late.“ · „Radio? It’s been dead all night.“
- robot-fight (leicht genervt): „Your hand regrets it.“ · „Its head leaves the fight.“ · „But nobody rings the bell.“ · „You win. Technically.“
- planets-lined-up (Conspiracy, Doku-Stimme): „First: there is no line.“ · „Nothing happened.“ · „So enjoy the view.“
- SA1 (leicht genervt): „You came for whale watching. The whale came for lunch.“ · „Lucky you.“ · „Steve, please.“ · „Gerald? Still eating popcorn.“
- E47 (Erklärvideo, Doku-Stimme): „So yes, it stings.“ · „Not the relaxing kind.“ · „So: no stone. Just a nasty rash.“
- E43 (Erklärvideo, ernst, keine Witze): „Then someone stops.“ · „Two days later, you wake up.“
- E46 (Erklärvideo, Doku-Stimme): „Again: about two minutes.“ · „The pressure wins in a second.“ · „Home. The only planet with no timer.“
- MB1 (leicht genervt): „One extra guest.“ · „The tail hangs out the back.“ · „The pool is about to lose an argument.“ · „This one missed the memo.“ · „The water picks the ocean.“
- TC1 louvre-heist-guard (True Crime, Doku-Stimme Declan Sage, ernst, keine Witze): „Nobody looks twice.“ · „You hear it before you see it.“ · „Protocol says: people first.“ · „A year later — still missing.“
- jerusalem-zombie-wall (leicht genervt): „On paper.“ · „You relax. First mistake.“ · „Nobody is writing tickets today.“ · „Seats are overrated.“
- bus-stop-types (leicht genervt, Testformat): „Classic.“ · „It’s sunny.“ · „That railing is load-bearing.“

## Benutzte Dr.-Steve-Tipps
- ZF1: „Walk like a zombie. Zero sus.“
- ZF2: „Zombies hate loud music. Blast it, bro.“
- ZF3: „Zombies hate cardio. Do jumping jacks!“
- ZF4: „Tractors start faster if you yell at them.“
- ZF5: „Zombies can’t see yellow. Wave at them!“
- ZF6: „Drive in zigzags. Saves fuel, bro.“
- NL1: „NPCs respawn. You’re basically immortal.“
- EG1: „Flap your arms. Birds do it all day.“
- ZC1: „Zombies can’t see glass. Hide in the bus shelter.“
- SA1: „Whales breathe through the top, bro. Climb out the blowhole.“
- MB1: „Sharks hate splashing, bro. Splash like crazy.“

## Benutzter Slang (frühestens nach 3 Videos wieder)
- ZF1: lowkey · sus · cooked · main character energy · built different · vibes immaculate
- ZF2: vibe · bro · absolute W
- ZF3: no cap · iconic
- ZF4: full send · goated · vibe off
- ZF5: RIP · respectfully · obviously
- ZF6: big L · NPC behavior · it’s so over · bro
- NL1: main character energy
- E19: – (kein Slang)
- E24: – (kein Slang)
- E1: – (kein Slang; „no cap“ aus dem Skript bewusst weggelassen)
- E6: aura · cooked
- Bouncing Betty: – (kein Slang)
- Groundskeeper: – (kein Slang)
- D-Day (Langvideo + Short): – (kein Slang)
- Zombie Farm mit Ende: – (kein Slang)
- EG1: – (kein Slang; nur Steves „bro“ im festen Spruch)
- T24, T21, T23, T22, T25: – (kein Slang)
- H1, H2, ZC1, H7: – (kein Slang; in ZC1 nur Steves „bro“ im festen Spruch)
- robot-fight, planets-lined-up: – (kein Slang)
- SA1, E47, E43, E46, MB1: – (kein Slang; in SA1 und MB1 nur Steves „bro“)
- TC1: – (kein Slang)
- jerusalem-zombie-wall: – (kein Slang)
- bus-stop-types: – (kein Slang)

## Gerald-Momente
- ZF1: Heuballen, Funken fliegen vorbei · ZF2: Kellertür, tanzt zur Musik · ZF3: Silo, isst den letzten Mais
- ZF4: fährt auf der Motorhaube mit · ZF5: sitzt auf der brennenden Mauer · ZF6: fliegt einfach weg (Hühner können nicht fliegen)
- NL1: Beifahrersitz im pinken Cabrio, isst deinen letzten Hotdog
- EG1: sitzt als Einziger ungerührt im Liegestuhl, während alles schwebt; zum Schluss landet der letzte Burger auf seinem Teller
- ZC1: sitzt im Hook auf dem Busdach, ist am Ende schon auf der anderen Seite der Schranke auf dem Mauthäuschen und hat Pommes
- SA1: sitzt die ganze Zeit auf dem Boot und isst Popcorn, bekommt den Wal nicht mit
- MB1: treibt auf einem aufblasbaren Flamingo, der Hai ignoriert ihn; landet sanft im leeren Becken

## Loop-Sätze (`END.loop`, nie wiederholen)
Die Bewertungskarte ist seit 11.11.2026 abgeschafft; jedes Video endet mit Endcard und Loop zurück in den Hook.
- Bouncing Betty: „One star. Never find out —“
- Groundskeeper: „Round two tonight?“
- D-Day Short: „It started with —“
- Zombie Farm mit Ende: „So every farmer asks —“
- EG1: „So neighbors still ask —“
- T24 nuke-mariana-trench: „So people still ask:“
- T21 nuclear-pool: „So, one more time:“
- T23 oxygen-5-seconds: „People still ask:“
- T22 volcano-trash: „Here comes the next truck:“
- T25 iss-falls: „Which raises the question:“
- H1 night-shift-customer: „And once again —“
- H2 mom-came-home-twice: „Knock, knock —“
- ZC1 zombie-city-ep1: „Next stop —“
- H7 underground-radio: „Then the radio says —“
- robot-fight: „Rematch is Friday. So —“
- planets-lined-up: „Still, someone always asks:“
- SA1 sperm-whale: „Round two —“
- E47 lake-natron: „Now picture it again:“
- E43 heart-stops: „Because one day, someone asks:“
- E46 every-planet: „Then the portal opens again —“
- MB1 megalodon-pool: „Next morning, the pool is full again —“
- TC1 louvre-heist-guard: „So ask yourself —“
- jerusalem-zombie-wall: „Tour guides still ask:“
- bus-stop-types: „Because at every bus stop, there are —“
- Archiv der alten Bewertungskarten (Pointen nicht wiederverwenden): ZF1 „Barn: gone. Vibes: immaculate.“ · ZF2 „Great acoustics. Terrible neighbors.“ · ZF3 „Corn every day. Would not recommend.“ · ZF4 „Loud. Smelly. Better than walking.“ · ZF5 „Warm. Way too warm.“ · ZF6 „Great views. Zero fuel.“ · NL1 „Great weather. Zero free will.“ · E19 „Forty-two minutes. No snacks.“ · E24 „Twenty years. Zero lasers.“ · E1 „Perfect landing. Terrible snacks.“ · E6 „Sixty hours, lost to a grandma.“ · Bouncing Betty „Built to jump. Still in the ground.“ · Groundskeeper „Great traps. Cellar smells terrible.“

## Video-Log
| Datum | Video | Folge | Gerald-Streak | Ende/Sterne | Fester Satz |
|---|---|---|---|---|---|
| 2026-11-10 | What if zombies attacked your farm? | ZF1 | 1 | Abstimmung · 1★ | ja |
| 2026-11-10 | You chose the cellar | ZF2 | 2 | ✅ Ending 1 · 4★ | ja |
| 2026-11-10 | You chose the silo | ZF3 | 3 | ✅ Ending 2 · 5★ | ja |
| 2026-11-10 | You chose the tractor | ZF4 | 4 | Abstimmung · 3★ | ja |
| 2026-11-10 | You chose the fortress | ZF5 | 5 | ☠ Ending 3 · 1★ | ja |
| 2026-11-10 | You chose to keep driving | ZF6 | 6 | ☠ Ending 4 · 2★ | ja |
| 2026-11-10 | What if you were an NPC in GTA 6? (mit Skill v2.6 neu gebaut, 71 s, Thumbnails A/B) | NL1 | 7 | Abstimmung · 1★ | nein |
| 2026-11-10 | What if you jumped into a tunnel through the Earth? (Erklärvideo, 71 s, Thumbnails A/B, Posting Sa 16.1.) | E19 | – | geschlossen · 2★ | ja |
| 2026-11-10 | What if aliens built the pyramids? (Conspiracy, 70 s, orange, Posting Mi 3.2.) | E24 | – | geschlossen · 3★ · Endcard Humans / Aliens / Both, somehow | nein |
| 2026-11-11 | What if the pilot passed out and YOU had to land the plane? (77 s, blue, Thumbnails A/B, Posting Mi 18.11.) | E1 | – | geschlossen · 2★ · Endcard Land it myself / Wake the pilot / Free the co-pilot | nein (Ersatzsatz) |
| 2026-11-11 | What if you joined a $1,000,000 YouTuber challenge? (77 s, red, Thumbnails A/B, Posting Sa 21.11.) | E6 | – | geschlossen · 2★ · Endcard Never leave the circle / Take the $500K / Take the pizza | nein |
| 2026-11-11 | What happens if you step on a Bouncing Betty? (Erklärvideo außerhalb der E-Liste, 49,8 s, yellow, Thumbnails A/B, Engine v2.21, keine Musik außer tense im Aufbau, Posting noch offen) | – | – | geschlossen · 1★ · Endcard Ankle / Knee / Waist (Rate-Frage) | nein |
| 2026-11-11 | What if zombies surrounded your house… and you were a retired mercenary? (The Groundskeeper, Einzelvideo außerhalb der E-Liste, 55,5 s, lime, Haus im Querschnitt mit Fallen: Murmeln, Rechen, Netz, Falltür, Fallboden in den Keller; Thumbnails A/B, Engine v2.22, Posting noch offen) | – | – | geschlossen · 4★ · Endcard Marbles / The net / Trap floor | ja |
| 2026-11-11 | D-Day: Why It Happened and What Happened (erstes normales YouTube-Video, 16:9 in 2560 × 1440, 5:41, Doku ohne Running Gags, 7 Kapitel: Why · The wall · The trick · The weather · The night · The landings · The cost; Untertitel statt Karaoke, Lagekarten im Kriegsraum, Friedhof über Omaha am Ende; Engine v2.25, Thumbnails A/B, Posting offen) | – | – | Endcard-Frage The rubber army / The one-day delay / The night jump · ca. 14 s Platz für den YouTube-Abspann | nein |
| 2026-11-11 | D-Day in 45 seconds (9:16-Short als Teaser zum Langvideo, 49 s, gleiche Welt, Endcard „Why D-Day happened: full video above“ – im Short als „Related video“ verlinken; Thumbnails A/B, Posting offen) | – | – | Verweis aufs Langvideo, Loop „It started with —“ | nein |
| 2026-11-11 | What if zombies attacked your farm? – mit Ende (Remake von ZF1 als Einzelvideo, 56,8 s, yellow, ohne Gerald/Steve; Feuerwerkskiste aufs Silo, Scheune brennt, Feuerwerk – alle Zombies bleiben stehen und starren in den Himmel, Sonnenaufgang; Engine v2.27 mit fireworks() und horde gaze; Thumbnails A/B, Posting offen) | – | – | geschlossen · überlebt · Endcard Silo + fireworks / Hide in the cellar / Drive the tractor · Loop „So every farmer asks —“ | nein |
| 2026-11-11 | What if gravity turned off for 5 seconds? (Earth Glitch Folge 1, 54,6 s, blue, Engine v2.28; 5 Sekunden in Zeitlupe gestreckt, du schwebst vom Trampolin auf 25 m, isst einen schwebenden Burger, Steves Flatter-Tipp → Salto und höher, Poolwasser als Kugel, Schwerkraft zurück → Trampolin schleudert dich in den Pool des Nachbarn; Thumbnails A/B, Posting offen) | EG1 | 8 | Abstimmung · Endcard Earth stops for 1 second / The Moon comes twice as close / One day lasts a year · Loop „So neighbors still ask —“ | nein |
| 2026-11-11 | What if a nuke exploded in the Mariana Trench? (T24, Erklärvideo, 41,8 s, cyan, Engine v2.32 mit uwBlast, seaDome, oceanSection, bombCase; Grabengrund in der Tiefsee mit Dampfblase, Forschungsschiff, Museums-Querschnitt mit Tiefen-Lineal, Standbild bei 1 km Blasenbreite, Kuppel statt Tsunami, roter Wärmefleck; Thumbnails A/B, Posting offen) | T24 | – | geschlossen · Endcard 100 m / 10 m / Basically none (Rate-Frage, Antwort C) · Loop „So people still ask:“ | nein |
| 2026-11-11 | What if you swam in a nuclear fuel pool? (T21, Erklärvideo, 41,8 s, purple, Engine v2.33 mit fuelPool; Reaktorhalle bei Nacht, Becken als Querschnitt mit Glasfront und Tiefen-Lineal, Halbierungs-Schichten mit Sonde, Tauchgang zu den Stäben mit Standbild, Alarm; Thumbnails A/B, Posting offen) | T21 | – | geschlossen · Endcard Dead in seconds / Totally fine / Glowing forever (Antwort B) · Loop „So, one more time:“ | nein |
| 2026-11-11 | What if Earth lost oxygen for 5 seconds? (T23, Erklärvideo, 39,8 s, blue; Stadtplatz, alle Flammen gehen aus, Mythos-Karte Beton/Trommelfell, Betonbrücke steht, Lineal „Feels like 2 km“, Standbild beim Luftanhalten, Flammen kommen zurück, du trinkst; Thumbnails A/B, Posting offen) | T23 | – | geschlossen · Endcard Yes / No / Only the ears (Mythos FALSE) · Loop „People still ask:“ | nein |
| 2026-11-11 | What if you threw your trash into a volcano? (T22, Erklärvideo, 37,8 s, red, Engine v2.33 mit lavaLake, trashBag; Müllwagen am Lavasee, Säcke brennen, Globus mit 8 Lavaseen, Stahlträger schmilzt nicht, Kühlschrank-Kiste → Lavafontäne mit Standbild, Giftrauch; Thumbnails A/B (lokal neu gerendert), Posting offen) | T22 | – | geschlossen · Endcard Yes / No / Kind of (Mythos FALSE) · Loop „Here comes the next truck:“ | nein |
| 2026-11-11 | What if the ISS fell on your city? (T25, Erklärvideo, 40,8 s, green, Engine v2.33 mit reentry; Stadt bei Nacht mit Feuerball am Himmel und starrender Menge, Station mit Deorbit-Schlepper im Orbit, Wiedereintritt mit Zerbrechen und Standbild, Globus mit Point Nemo, Faktenkarte Skylab $400; Thumbnails A/B (lokal neu gerendert), Posting offen) | T25 | – | geschlossen · Endcard Your city / The Moon / Loneliest spot on Earth (Antwort C) · Loop „Which raises the question:“ | nein |
| 2026-11-11 | What if one customer wasn't human? (H1 night-shift-customer, 54,0 s, lime, Engine v2.39 + Horror-Kit v2.33.3: 24/7-Shop bei Nacht, Konvexspiegel-Blick mit `lensMask`, „you“ fehlt im Spiegel per `hideDuring`, Trucker, Frau, Kind mit verschränkten Armen; Thumbnails A/B, Posting offen) | – | – | geschlossen mit Twist · Endcard The woman / The kid / You · Loop „And once again —“ | nein |
| 2026-11-11 | What if your mom came home… twice? (H2 mom-came-home-twice, 56,3 s, red; Puppenhaus-Schnitt Wohnzimmer + Küche, zwei gleiche Mütter an Haus- und Hintertür, Türspion-Blick, Klopfen als Zähler, Handy-Twist, harte Schwarzblende; Thumbnails A/B, Posting offen) | – | – | offen → Teil 2 · Endcard Front door / Back door / Neither · Loop „Knock, knock —“ | nein |
| 2026-11-11 | What if zombies took over your city? (Zombie City Folge 1, 55,6 s, purple, Engine v2.39.1 mit tollBooth, boomGate, roadBridge, horn; Bus im Stau, Autoalarme, Steve-Anruf → gläsernes Wartehäuschen, E-Scooter, Schranke schließt, Gerald mit Pommes auf dem Mauthäuschen; Thumbnails A/B, Posting offen) | ZC1 | 9 | Abstimmung · Endcard The rooftop / The subway tunnels / The mall · Loop „Next stop —“ | nein |
| 2026-11-11 | What if the radio said someone's behind you? (H7 underground-radio, 56,8 s, orange, Engine v2.39.2 mit mineTunnel, mineCage, headlamp, walkie; Stollen auf −1000 m, zweite Stirnlampe hinter dir, Förderkorb nach oben, Kontrollraum: Funk war tot; Thumbnails A/B, Posting offen) | – | – | geschlossen mit Twist · Endcard Turn around / Keep walking / Answer Danny · Loop „Then the radio says —“ | ja |
| 2026-11-12 | What if you had to fight a robot? (E41 robot-fight, Trend-Video: Roboter-Käfigkämpfe, Einzelvideo ohne Gerald/Steve, 55,8 s, red; am 12.11. nachmittags mit dem aktualisierten Skill und Engine v2.40.27 neu gebaut (neue Gesichter: determined, nervous, panic); Halle mit Achteck-Käfig und Tribünen, Schlag auf die Brustplatte, Tritt in Zeitlupe → Kopf ab, der Roboter kämpft weiter, „Gehirn sitzt in der Brust“, du wirfst den Kopf aus dem Käfig, der Körper rennt hinterher = Ring-out; Thumbnails A/B; **noch nicht gerendert und nicht im Repo (Push abgelehnt): volles Skript als E41 in what-if-content-plan.md, Leon lässt es aus einem anderen Chat bauen und rendern**) | – | – | geschlossen · gewonnen durch Ring-out · Endcard Kick the head / Unplug it / Run · Loop „Rematch is Friday. So —“ | nein |
| 2026-11-12 | What if all the planets lined up? (E42 planets-lined-up, Trend-Video: Vier-Planeten-Parade ab 14.11., Conspiracy, 43,3 s, blue; am 12.11. nachmittags mit dem aktualisierten Skill und Engine v2.40.27 neu gebaut; Planetenmodell in einer Linie, Strand im Morgengrauen mit Teleskop und Pinnwand, Myth vs. Reality von oben, Standbild auf dem Wasser, Zeitleiste 1974 · 1982 · 2026, Faktenkarte 0.04 mm (NASA), Stempel FALSE; Thumbnails A/B; **noch nicht gerendert und nicht im Repo: volles Skript als E42 in what-if-content-plan.md**) | – | – | geschlossen · Endcard Yes / Not for a second (Mythos FALSE) · Loop „Still, someone always asks:“ | nein |
| 2026-11-12 | What if a sperm whale swallowed you? (SA1, Swallowed Alive Folge 1, 57,9 s, cyan, Engine v2.42 mit Pottwal, Schlund und Magen; Whale-Watching-Boot, Selfie über die Reling, verschluckt, Steves Blasloch-Tipp falsch, Magen, ausgespuckt, Gerald mit Popcorn; Thumbnails A/B, Posting offen) | SA1 | 10 | Abstimmung · Endcard A T. rex / A giant frog / A washing machine · Loop „Round two —“ | ja |
| 2026-11-12 | What if you fell into the lake that turns animals to stone? (E47 lake-natron, Erklärvideo, 44,9 s, red, Engine v2.43 mit petrify, saltCrust, jetty, tripodCam; roter Natronsee, Steg bricht, Flamingos, versteinerter Flamingo, Fotograf mit Stativ, Faktenkarte pH 10.5 (NASA), Stempel FALSE; Thumbnails A/B, Posting offen) | E47 | – | geschlossen · Endcard Yes, totally / Nope · Loop „Now picture it again:“ | nein |
| 2026-11-12 | What happens when your heart stops? (E43 heart-stops, Erklärvideo, ernst, 48,1 s, lime, Engine v2.44 mit cpr, clutch, aedBox; Bushaltestelle am Abend, Zusammenbruch, Röntgen-Standbild, Kurierin leistet Herzdruckmassage, Passant holt den AED, Faktenkarte „No shock“ (AHA), Stempel FALSE, Krankenhaus; Thumbnails A/B, Posting offen) | E43 | – | geschlossen · Endcard Yes / No · Loop „Because one day, someone asks:“ | nein |
| 2026-11-12 | What if you stood on every planet without a suit? (E46 every-planet, Erklärvideo, 50,4 s, yellow, Engine v2.45 mit portal, planetSet und Planeten-Himmeln; Garten mit Portal, Venus, Merkur Tag-Nacht-Kante, Mars mit Standbild, Fall durch Jupiter- und Neptunwolken, zurück im Liegestuhl; Thumbnails A/B, Posting offen) | E46 | – | geschlossen · Endcard Yes, Mars / Yes, a gas giant / Nowhere (Antwort C) · Loop „Then the portal opens again —“ | nein |
| 2026-11-12 | What if a Megalodon was in your pool? (MB1, Monsters Are Back Folge 1, 58,0 s, green, Engine v2.46 mit swimPool, airbed, floatie, divingBoard; Infinity-Pool, Luftmatratze mit Loch, Hai zu lang für den Pool, Steves Planschtipp falsch, Sprungbrett, Glaskante bricht, Wasser spült den Hai ins Meer, Gerald landet auf dem Flamingo im leeren Becken; Render läuft) | MB1 | 11 | Abstimmung · Endcard A T. rex in the city / Mammoths at the mall / A kraken in the harbor · Loop „Next morning, the pool is full again —“ | nein |
| 2026-11-12 | What if you were the guard during the Louvre heist? (TC1 louvre-heist-guard, erstes True-Crime-Video, 56,3 s, red, Engine v2.49/v2.50 mit museumGallery, jewelCase, jewel, liftTruck, grinder, hivis, Outfit guard; Erzähler Declan Sage per ElevenLabs, eine Aufnahme pro Beat; Kai mit Palastflügel, Möbellift zum Balkon, Trennschleifer am Fenster, Besucher werden evakuiert, zwei Vitrinen zerspringen (Zeitlupe), Flucht auf zwei Motorrollern, Krone auf dem Gehweg, Polizei zu spät, Faktenkarte €88M (Paris prosecutor via AFP); Thumbnails A/B, Posting offen) | TC1 | – | geschlossen · Endcard Chase them / Get everyone out / Hit every alarm · Loop „So ask yourself —“ | nein |
| 2026-11-13 | What if the zombie apocalypse reached Jerusalem? (jerusalem-zombie-wall, Einzelvideo, 56 s, orange, Engine v3.13 mit eigenem Blender-Set: Jerusalem-Häuser, Kuppelbau, Schutzmauer mit Wachtürmen, Straßen, Autos, Ampeln; Zombiewelle rennt gegen die 16-m-Mauer, stapelt sich hoch und quillt drüber, Flucht über die rote Ampel, Seil des letzten Hubschraubers; Stimme Denzel; Thumbnails A/B, Posting offen) | – | – | Abstimmung · Endcard Up the wall / Into a basement / Onto the rope · Loop „Tour guides still ask:“ | ja |
