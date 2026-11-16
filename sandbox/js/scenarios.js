// Szenario-Karten der Hülle. Die Engine-Seite (world.story.js: SANDBOX_SCEN, world.scene.js: SANDBOX_BUILD) kennt dieselben Schlüssel.
// M1: Eintrag hier + in beiden Tabellen der Welt ergänzen.
//   id        Schlüssel im Hash (#s=<id>)
//   aim       Zielmodus: Radius des Rings in m (= Wirkradius, wird als r= an die Welt gegeben), Farbe
//   marks     Zeitmarken auf der Zeitleiste [t, Text]
//   dur       Länge in s (nur Anzeige, bis die Welt geladen ist — danach zählt whatif.live.dur)
export const SCENARIOS = [
  { id: 'asteroid', name: 'Asteroid', icon: '☄️', tag: 'Einschlag',
    text: 'Ein Brocken von 12 m schlägt ein. Feuerball, Krater, eine Druckwelle reißt alles im Umkreis nieder.',
    aim: { r: 110, color: '#FF5A3A' }, dur: 40, marks: [[4, 'Einschlag']] },
  { id: 'tsunami', name: 'Tsunami', icon: '🌊', tag: 'bald', locked: true, text: 'Eine Welle rollt vom Meer heran.' },
  { id: 'moon', name: 'Mond weg', icon: '🌑', tag: 'bald', locked: true, text: 'Was passiert, wenn der Mond verschwindet?' },
  { id: 'zombies', name: 'Zombies', icon: '🧟', tag: 'bald', locked: true, text: 'Eine Horde erreicht die Stadt.' }
];
export const byId = id => SCENARIOS.find(s => s.id === id);
