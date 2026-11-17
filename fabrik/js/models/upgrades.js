// Cogtopia – Ausbaustufen Mk II / Mk III der Maschinen (Grundriss bleibt gleich).
// mkDecor(type, k, mk, info): baut Zusatzteile in die Vorlage (lokaler Rahmen wie MACH in buildings.js: Mitte im Ursprung, Ausgabe +x).
// mkAnim(type, P, t, act, mk, state, ctx): bewegt die Zusatzteile (Namen 'mk…'; Rauch 'smokeMk…').
// Erkennung aus der Spielkamera: Mk II = blaue Kantenschienen am Sockel, blaue Poller mit zwei weißen Ringen, Zusatzteile je Maschine;
// Mk III = Chrom-Schienen mit Leuchtpunkten, Poller mit drei Goldringen und Leuchtkappe, Gold/Chrom-Akzente, weitere Schornsteine/Lampen.
import { PI, TAU, BELT_Y } from '../kit.js';
import { C, face, beacon, smokeStack, animSmoke, railing, vstripes } from './parts.js';

export const MK_TYPES = ['bohrer', 'grossbohrer', 'ofen', 'presse', 'drahtzug', 'montage', 'raffinerie', 'experiment', 'labor', 'lager', 'verkauf'];

const TRIM = 0x2f86e8, TRIM_D = 0x1f5aa8, WHITE = 0xf2f4f8, CHROME = 0xe8ecf2, GOLD = 0xffffff, CYAN = 0x7ad8ff, RED_L = 0xff3a2a;
const SIZE = { bohrer: 2, grossbohrer: 4, ofen: 2, presse: 2, drahtzug: 2, montage: 3, raffinerie: 3, experiment: 3, labor: 2, lager: 2, verkauf: 2 };

// ---------- gemeinsame Ausbau-Teile ----------
// Kantenschienen hinten und seitlich (vorn bleibt frei für Rutsche/Warnstreifen) + Poller als Rangzeichen
function plinthTrim(k, n, mk, o = {}) {
  const s = n - .06, h = .06, e = s / 2 - .028, m3 = mk > 2;
  const col = m3 ? CHROME : TRIM, layer = m3 ? 'chrome' : 'base';
  k.bev(col, [-e, h, 0], [.04, .032, s - .02], .01, { layer });
  for (const z of [-e, e]) k.bev(col, [-.03, h, z], [s - .08, .032, .04], .01, { layer });
  if (m3) {                                                     // Leuchtpunkte in den Schienen
    const N = Math.max(3, Math.round(s / .42));
    for (let i = 0; i < N; i++) { const u = -s / 2 + .2 + (s - .4) * i / (N - 1); k.ball(CYAN, [-e, h + .034, u], .014, { layer: 'glow', detail: 0, ao: false }); for (const z of [-e, e]) if (u < s / 2 - .2) k.ball(CYAN, [u, h + .034, z], .014, { layer: 'glow', detail: 0, ao: false }); }
  }
  const c = s / 2 - .08, posts = o.posts || [[-c, -c], [-c, c]];
  for (const [x, z] of posts) bollard(k, [x, h, z], mk);
}
function bollard(k, p, mk) {
  const m3 = mk > 2, [x, y, z] = p;
  k.cyl(C.dark, [x, y, z], .055, .02, 10, { layer: 'metal' });
  k.cyl(m3 ? CHROME : TRIM_D, [x, y + .02, z], .042, .26, 10, { layer: m3 ? 'chrome' : 'base', bevel: .25 });
  for (let i = 0; i < (m3 ? 3 : 2); i++) k.cyl(m3 ? GOLD : WHITE, [x, y + .07 + i * .055, z], .045, .025, 10, { layer: m3 ? 'gold' : 'base' });
  if (m3) { k.cyl(C.dark, [x, y + .28, z], .046, .015, 10, { layer: 'metal' }); k.ball(0xffe07a, [x, y + .31, z], .035, { layer: 'glow', detail: 1 }); }
  else k.cyl(TRIM, [x, y + .28, z], .046, .03, 10, { bevel: .4 });
}
// Leuchtstreifen (Mk III), entlang x
const glowBar = (k, p, L, w = .018, c = CYAN) => k.box(c, p, [L, .008, w], { layer: 'glow', ao: false, jit: 0 });
// Lüfterflügel um y (in einem Teil)
function fanBlades(s, r, n = 4, col = C.steel) { for (let i = 0; i < n; i++) s.in([0, 0, 0], i * TAU / n, () => s.box(col, [r * .5, 0, 0], [r * .9, .012, r * .32], { layer: 'metal', r: [.35, 0, 0] })); s.cyl(C.dark, [0, -.01, 0], r * .2, .03, 8, { layer: 'metal' }); }
// Kleiner Schornstein (Mitte unten p, Radius r, Höhe h) mit Bändern; Rauch 'smokeMk'
function stack(k, p, r, h, mk, bands = TRIM, smoke = 'smokeMk') {
  const m3 = mk > 2, [x, y, z] = p;
  k.cyl(C.dark, [x, y, z], r * 1.3, .05, 10, { layer: 'metal' });
  k.cyl(m3 ? CHROME : C.steel, [x, y + .05, z], r, h, 10, { layer: m3 ? 'chrome' : 'metal' });
  for (let i = 1; i <= 3; i++) k.cyl(i === 3 && m3 ? GOLD : bands, [x, y + .05 + h * i / 3.6, z], r * 1.12, .04, 10, { layer: i === 3 && m3 ? 'gold' : 'base' });
  k.cyl(C.dark, [x, y + .05 + h, z], r * 1.2, .04, 10, { layer: 'metal' });
  if (smoke) smokeStack(k, [x, y + .1 + h, z], smoke, 0xb8b4ae);
}
// Warnlampe (rot, leuchtet immer) auf Stiel
function avLamp(k, p, h = .06, c = RED_L) { k.cyl(C.dark, p, .012, h, 6, { layer: 'metal' }); k.ball(c, [p[0], p[1] + h + .02, p[2]], .025, { layer: 'glow', detail: 1 }); }

// ---------- je Maschine ----------
const D = {
  grossbohrer(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 4, mk, { posts: [[-1.9, -1.0], [-1.9, 1.0], [-.6, -1.9]] });
    // Kühler mit Lüfter vorn links + Leitungen
    k.in([.4, .08, 1.55], 0, () => {
      k.bev(TRIM_D, [0, 0, 0], [.5, .36, .4], .03);
      for (let i = 0; i < 7; i++) k.box(C.steelD, [.252, .05 + i * .042, 0], [.012, .022, .34], { layer: 'metal' });
      k.bev(TRIM, [0, .36, 0], [.52, .04, .42], .015);
      k.ring(C.dark, [0, .4, 0], .17, .15, .03, 14, { layer: 'metal' });
      k.part('mkFan', [0, .415, 0], s => fanBlades(s, .15, 5));
      if (m3) glowBar(k, [0, .22, .201], .4, .016, 0x5aff8a);
    });
    k.pipe(C.copper, [[.4, .3, 1.35], [.2, .3, 1.0], [-.1, .45, .3]], .026, { layer: 'metal' });
    // blaue (Mk II) / Chrom-Kanten (Mk III) an den Plattformen des Turms
    k.in([-.25, 0, -.2], 0, () => {
      k.bev(m3 ? CHROME : TRIM, [0, 1.45, 0], [.9, .03, .9], .01, { layer: m3 ? 'chrome' : 'base' });
      k.bev(m3 ? CHROME : TRIM, [0, 2.69, 0], [.6, .03, .6], .01, { layer: m3 ? 'chrome' : 'base' });
      if (m3) {
        stack(k, [-.2, 1.51, .22], .06, .4, mk, TRIM);
        k.ring(GOLD, [0, .16, 0], .74, .7, .025, 22, { layer: 'gold' });
        for (const [x, z] of [[-.4, -.4], [.4, -.4], [.4, .4]]) k.ball(0xffe07a, [x, 1.58, z], .03, { layer: 'glow', detail: 1 });
        avLamp(k, [-.2, 2.78, -.2], .1, 0xffd040);
      }
    });
  },
  bohrer(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 2, mk);
    // Kühler mit Lüfter hinten rechts + Kühlleitungen zum Turm
    k.in([-.6, .06, .68], 0, () => {
      k.bev(TRIM_D, [0, 0, 0], [.34, .32, .3], .03);
      for (let i = 0; i < 6; i++) k.box(C.steelD, [.172, .05 + i * .042, 0], [.012, .022, .26], { layer: 'metal' });          // Lamellen
      k.bev(TRIM, [0, .32, 0], [.36, .04, .32], .015);
      k.ring(C.dark, [0, .36, 0], .13, .11, .03, 14, { layer: 'metal' });
      k.part('mkFan', [0, .375, 0], s => fanBlades(s, .11, 5));
      k.rivets(C.steel, [-.15, .2, .152], [.15, .2, .152], 4, .01, { r: [PI / 2, 0, 0] });
      if (m3) glowBar(k, [0, .2, -.151], .26, .014, 0x5aff8a);
    });
    k.pipe(C.copper, [[-.6, .25, .53], [-.6, .25, .4], [-.42, .25, .3], [-.36, .5, .3]], .022, { layer: 'metal' });
    k.pipe(C.copper, [[-.5, .15, .53], [-.5, .15, .42], [-.3, .15, .3]], .018, { layer: 'metal' });
    // blaue Plattform-Kante oben und Band am Motor
    k.in([-.1, 0, -.1], 0, () => {
      k.bev(TRIM, [0, 1.335, 0], [.76, .03, .76], .01);
      k.bev(m3 ? CHROME : TRIM, [0, 1.55, .02], [.44, .05, .4], .015, { layer: m3 ? 'chrome' : 'base' });
      if (m3) {
        stack(k, [-.14, 1.77, .1], .045, .26, mk, TRIM);                // Chrom-Auspuff mit Goldring
        avLamp(k, [.12, 1.77, .14], .08, 0xffd040);
        k.ring(GOLD, [0, .11, 0], .36, .27, .02, 18, { layer: 'gold' });  // Goldkragen am Bohrloch
        for (const [x, z] of [[-.3, -.3], [.3, -.3]]) k.ball(0xffe07a, [x, 1.44, z], .025, { layer: 'glow', detail: 1 });
      }
    });
  },
  ofen(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 2, mk);
    // Kantenschutz an den vier Ecken des Ziegelkörpers
    for (const x of [-.68, .52]) for (const z of [-.68, .48]) {
      k.box(m3 ? CHROME : TRIM, [x, .06, z], [.07, .9, .07], { layer: m3 ? 'chrome' : 'base' });
      k.rivets(C.steelD, [x, .2, z + (z > 0 ? .036 : -.036)], [x, .8, z + (z > 0 ? .036 : -.036)], 3, .011, { r: [PI / 2, 0, 0] });
    }
    // zweiter Schornstein (Stahl, blaue Bänder) auf der Haube
    stack(k, [.1, 1.26, .12], .075, .62, mk);
    if (m3) {
      // Goldringe am Ziegelschornstein, Glut-Schlitze an der Seite, Leuchtleiste an der Haube
      for (const y of [1.52, 1.86]) k.torus(GOLD, [-.35, y, -.4], .182, .022, 14, { layer: 'gold', r: [PI / 2, 0, 0] });
      face(k, [-.08, 0, -.68], 3, () => { for (let i = 0; i < 4; i++) { k.box(0x401c10, [.0, .3, -.36 + i * .24], [.02, .3, .06], { ao: false }); k.box(0xff8a30, [.012, .32, -.36 + i * .24], [.01, .26, .04], { layer: 'heat', ao: false }); } });
      glowBar(k, [-.08, 1.0, .53], 1.0, .02, 0xffb040);
      avLamp(k, [-.6, 1.26, .2], .1, 0xffd040);
    }
  },
  presse(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 2, mk);
    // zwei Zusatz-Hydraulikzylinder unter dem Kopf (Kolbenstangen 'mkRod0/1' folgen dem Stößel)
    for (const [i, z] of [[0, -.38], [1, .22]]) {
      k.cyl(C.dark, [-.3, 1.27, z], .07, .04, 10, { layer: 'metal' });
      k.cyl(m3 ? CHROME : TRIM, [-.3, 1.0, z], .055, .28, 10, { layer: m3 ? 'chrome' : 'base', bevel: .2, bevel2: .2 });
      k.cyl(C.dark, [-.3, 1.08, z], .058, .03, 10, { layer: 'metal' });
      k.pipe(C.rubber, [[-.36, 1.2, z], [-.55, 1.2, z], [-.62, .7, z]], .014);
      k.part('mkRod' + i, [-.3, 1.0, z], s => { s.cyl(CHROME, [0, -.3, 0], .024, .3, 8, { layer: 'chrome' }); s.cyl(C.steelD, [0, -.34, 0], .05, .04, 8, { layer: 'metal' }); });
    }
    // zwei Druckzylinder oben auf dem Kopf (aus der Draufsicht gut sichtbar) mit Schläuchen
    for (const z of [-.44, .28]) {
      k.cyl(C.dark, [-.05, 1.68, z], .085, .03, 10, { layer: 'metal' });
      k.cyl(m3 ? CHROME : C.steel, [-.05, 1.71, z], .068, .24, 10, { layer: m3 ? 'chrome' : 'metal', bevel: .25 });
      k.cyl(m3 ? GOLD : TRIM, [-.05, 1.78, z], .072, .05, 10, { layer: m3 ? 'gold' : 'base' });
      k.pipe(C.rubber, [[-.12, 1.88, z], [-.3, 1.88, z], [-.3, 1.7, z]], .014);
    }
    k.bev(TRIM, [-.05, 1.65, -.08], [.64, .035, 1.16], .012);
    // Hydraulikpumpe hinten
    k.in([-.84, .06, -.12], 0, () => {
      k.bev(TRIM_D, [0, 0, 0], [.2, .26, .4], .025);
      k.cyl(C.steel, [0, .33, 0], .07, .3, 10, { ax: 'z', layer: 'metal' });
      for (let i = 0; i < 4; i++) k.cyl(C.steelD, [0, .33, -.11 + i * .07], .075, .012, 10, { ax: 'z', layer: 'metal' });
      k.cyl(m3 ? GOLD : C.red, [0, .26, .18], .04, .08, 8, { layer: m3 ? 'gold' : 'metal' });
      k.box(0x5aff8a, [-.101, .16, -.1], [.004, .05, .08], { layer: 'glow', ao: false });
    });
    if (m3) {
      for (const s of [-1, 1]) for (const y of [.5, 1.0]) k.cyl(CHROME, [-.05, y, -.08 + s * .42], .15, .04, 8, { layer: 'chrome' });
      k.cyl(GOLD, [-.05, 1.9, -.08], .1, .05, 12, { layer: 'gold', bevel: .3 });
      for (const z of [-.6, .44]) avLamp(k, [.2, 1.68, z], .06, 0xffd040);
      glowBar(k, [.26, 1.62, -.08], .02, .9, 0xffb040);
    }
  },
  drahtzug(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 2, mk);
    // blaue Tischkanten
    for (const z of [-.64, .345]) k.bev(m3 ? CHROME : TRIM, [-.08, .44, z], [1.44, .04, .03], .008, { layer: m3 ? 'chrome' : 'base' });
    // Führungsrolle auf Ständer ('mkPul') + Schmiertank
    k.cyl(C.steelD, [-.38, .53, .18], .05, .02, 8, { layer: 'metal' });
    k.cyl(C.steel, [-.38, .55, .18], .02, .3, 6, { layer: 'metal' });
    k.part('mkPul', [-.38, .85, .18], s => { s.cyl(TRIM, [0, 0, 0], .07, .04, 12, { ax: 'z', bevel: .2, bevel2: .2 }); s.cyl(C.copper, [0, 0, 0], .05, .045, 12, { ax: 'z', layer: 'metal' }); s.box(C.yel, [.055, 0, .024], [.02, .02, .004]); });
    k.beam(C.copper, [-.38, .79, .2], [-.05, .64, .05], .01, { layer: 'metal' });
    k.in([.12, .53, .2], 0, () => {
      k.cyl(TRIM_D, [0, 0, 0], .07, .2, 12, { bevel: .15 });
      k.cyl(C.dark, [0, .2, 0], .025, .04, 8, { layer: 'metal' });
      k.box(0xffd040, [0, .07, .071], [.03, .08, .004], { layer: 'glow', ao: false });
      k.pipe(C.rubber, [[0, .22, 0], [0, .28, -.1], [-.1, .2, -.22]], .01);
    });
    if (m3) {
      // Chrom-Portal mit Lampenhaube über dem Tisch
      for (const x of [-.72, .48]) { k.cyl(C.dark, [x, .06, -.8], .05, .03, 8, { layer: 'metal' }); k.cyl(CHROME, [x, .09, -.8], .03, 1.05, 8, { layer: 'chrome' }); k.ball(GOLD, [x, 1.16, -.8], .04, { layer: 'gold', detail: 1 }); }
      k.bev(CHROME, [-.12, 1.08, -.8], [1.28, .06, .08], .015, { layer: 'chrome' });
      k.bev(TRIM_D, [-.12, 1.0, -.58], [.9, .06, .36], .02);
      glowBar(k, [-.12, .995, -.58], .82, .26, 0xfff2c0);
      for (const x of [-.5, .26]) k.beam(C.steelD, [x, 1.06, -.42], [x, 1.1, -.78], .02, { layer: 'metal' });
      avLamp(k, [-.85, .48, .7], .1, 0xffd040);
    }
  },
  montage(k, mk) {
    const m3 = mk > 2, c = 1.39;
    plinthTrim(k, 3, mk, { posts: [[c, -c], [c, c]] });
    // Prüf-Portal mit Scanner ('mkScan' fährt quer)
    for (const z of [-.45, .45]) { k.bev(TRIM_D, [-1.0, .06, z], [.08, .96, .08], .015); vstripes(k, [-.96, .3, z], 0, .2, .06); }
    k.bev(TRIM, [-1.0, 1.0, 0], [.14, .1, 1.0], .03);
    k.part('mkScan', [-1.0, .98, 0], s => { s.bev(C.dark, [0, -.1, 0], [.12, .1, .14], .02, { layer: 'metal' }); s.box(0xff3a3a, [0, -.105, 0], [.1, .006, .02], { layer: 'glow', ao: false }); s.cyl(C.steelD, [0, -.16, 0], .025, .06, 8, { layer: 'metal' }); });
    if (m3) {
      for (const z of [-.85, .85]) k.torus(CHROME, [-.25, .1, z], .22, .03, 16, { layer: 'chrome', r: [PI / 2, 0, 0] });
      for (const s of [-1, 1]) glowBar(k, [-.08, .253, s * .38], 2.2, .014);
      for (const z of [-1.35, -.6, .6, 1.35]) k.ball(0xffd040, [-1.38, .5, z], .028, { layer: 'glow', detail: 1 });
      k.cyl(GOLD, [.45, 1.24, .4], .05, .05, 10, { layer: 'gold' });
      avLamp(k, [.45, 1.24, .4], .05, 0xffd040);
      k.ball(GOLD, [-1.0, 1.1, 0], .05, { layer: 'gold', detail: 1 });
      // Signalsäule (grün/gelb/rot) mit Chromstange
      k.in([-.8, .06, -1.3], 0, () => { k.cyl(C.dark, [0, 0, 0], .07, .04, 10, { layer: 'metal' }); k.cyl(CHROME, [0, .04, 0], .025, .8, 8, { layer: 'chrome' });
        [0x4aff7a, 0xffd040, 0xff4a3a].forEach((c, i) => { k.cyl(c, [0, .84 + i * .09, 0], .055, .08, 10, { layer: 'glow' }); k.cyl(C.dark, [0, .92 + i * .09, 0], .058, .01, 10, { layer: 'metal' }); });
        k.cyl(GOLD, [0, 1.11, 0], .058, .03, 10, { layer: 'gold' }); });
    }
  },
  raffinerie(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 3, mk);
    // blaue Bänder an den Tanks
    for (const z of [-.72, .72]) k.cyl(TRIM, [-.72, .62, z], .495, .06, 16);
    // Kugeltank auf Beinen
    k.in([0, .06, 1.12], 0, () => {
      for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + PI / 4; k.beam(C.steelD, [Math.cos(a) * .22, 0, Math.sin(a) * .22], [Math.cos(a) * .2, .42, Math.sin(a) * .2], .035, { layer: 'metal' }); }
      k.ball(C.white, [0, .52, 0], .27, { smooth: 14 });
      k.cyl(TRIM, [0, .5, 0], .275, .05, 14);
      k.cyl(C.dark, [0, .78, 0], .05, .04, 8, { layer: 'metal' });
      k.pipe(C.steel, [[0, .3, -.2], [0, .2, -.45], [-.25, .2, -.6]], .03, { layer: 'metal' });
      if (m3) { k.torus(GOLD, [0, .62, 0], .245, .018, 16, { layer: 'gold', r: [PI / 2, 0, 0] }); avLamp(k, [0, .82, 0], .04); }
    });
    if (m3) {
      for (const z of [-.72, .72]) k.torus(GOLD, [-.72, 1.31, z], .475, .025, 18, { layer: 'gold', r: [PI / 2, 0, 0] });
      k.ball(CHROME, [0, 2.3, -.95], .12, { layer: 'chrome', detail: 1 });
      avLamp(k, [0, 2.4, -.95], .06);
      stack(k, [.5, .06, 1.22], .07, 1.2, mk, TRIM);
      glowBar(k, [-.72, .9, -.24], .02, .3, 0x5aff8a);
    }
  },
  experiment(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 3, mk);
    // blaue Tischkanten
    for (const z of [-1.165, 1.165]) k.bev(m3 ? CHROME : TRIM, [-.1, .56, z], [1.9, .05, .03], .01, { layer: m3 ? 'chrome' : 'base' });
    // Zentrifuge ('mkCen' dreht) unter Glashaube
    k.in([-.32, .66, -.88], 0, () => {
      k.cyl(TRIM_D, [0, 0, 0], .16, .07, 14, { bevel: .2 });
      k.cyl(C.dark, [0, .07, 0], .03, .04, 8, { layer: 'metal' });
      k.part('mkCen', [0, .11, 0], s => { for (let i = 0; i < 4; i++) s.in([0, 0, 0], i * TAU / 4, () => { s.box(C.steel, [.06, 0, 0], [.12, .012, .02], { layer: 'metal' }); s.cyl([0x9a5aff, 0x5ac8ff, 0xffd040, 0xff6a5a][i], [.12, -.02, 0], .016, .05, 6, { layer: 'glow' }); }); });
      k.lathe(C.glass, [0, .07, 0], [[.15, 0], [.15, .05], [.1, .13], [0, .15]], 14, { layer: 'glass' });
      k.box(0x5aff8a, [.161, .03, 0], [.004, .02, .05], { layer: 'glow', ao: false });
    });
    if (m3) {
      // Beschleuniger-Ring über der Mischkuppel: Chromring auf drei Stützen, Goldknoten, umlaufende Leuchtkugeln ('mkRing')
      const cx = -.1, y = 1.32, R = .6;
      k.torus(CHROME, [cx, y, 0], R, .035, 28, { layer: 'chrome', r: [PI / 2, 0, 0] });
      for (let i = 0; i < 3; i++) { const a = PI / 2 + i * TAU / 3, x = cx + Math.cos(a) * R, z = Math.sin(a) * R; k.beam(CHROME, [x, .66, z], [x, y - .03, z], .025, { layer: 'chrome' }); k.ball(GOLD, [x, y, z], .055, { layer: 'gold', detail: 1 }); k.cyl(C.dark, [x, .66, z], .04, .02, 8, { layer: 'metal' }); }
      k.part('mkRing', [cx, y, 0], s => { for (let i = 0; i < 3; i++) { const a = i * TAU / 3; s.ball(0xb0ffd8, [Math.cos(a) * R, 0, Math.sin(a) * R], .04, { layer: 'glow', detail: 1 }); } });
      avLamp(k, [-1.15, 1.08, 1.1], .02, 0xc0a0ff);
    }
  },
  labor(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 2, mk);
    // Dachfirst-Schiene + Radar ('mkRadar' dreht) am Dach
    k.bev(m3 ? CHROME : TRIM, [-.1, 1.17, -.1], [1.52, .035, .07], .01, { layer: m3 ? 'chrome' : 'base' });
    k.in([.32, 1.1, .26], 0, () => {
      k.cyl(C.dark, [0, 0, 0], .06, .05, 8, { layer: 'metal' });
      k.cyl(C.steelD, [0, .05, 0], .02, .2, 6, { layer: 'metal' });
      k.part('mkRadar', [0, .25, 0], s => { s.bev(m3 ? GOLD : TRIM, [0, 0, 0], [.04, .06, .3], .01, { layer: m3 ? 'gold' : 'base' }); s.box(C.dark, [-.022, .01, 0], [.004, .04, .26]); s.ball(RED_L, [0, .07, 0], .018, { layer: 'glow', detail: 0 }); });
    });
    if (m3) {
      // Chrom-Sternwartenkuppel mit Leuchtschlitz
      k.in([.25, 1.12, -.12], 0, () => {
        k.cyl(C.dark, [0, 0, 0], .2, .05, 16, { layer: 'metal' });
        k.lathe(CHROME, [0, .05, 0], [[.19, 0], [.18, .06], [.14, .13], [.08, .17], [0, .19]], 16, { layer: 'chrome' });
        k.box(0x9ad8ff, [.0, .1, 0], [.36, .012, .04], { layer: 'glow', ao: false, r: [0, 0, .5] });
      });
      for (const z of [-.75, .55]) avLamp(k, [-.78, .86, z], .05, 0xffd040);
      k.ball(GOLD, [.25, 1.86, -.55], .035, { layer: 'gold', detail: 1 });
    }
  },
  lager(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 2, mk);
    // Gabelstapler vor dem Regal ('mkFork' hebt)
    k.in([.66, .06, -.78], 0, () => {
      k.bev(TRIM, [.04, .04, 0], [.3, .12, .2], .025);
      k.bev(C.dark, [.13, .16, 0], [.1, .06, .18], .02, { layer: 'metal' });                                       // Gegengewicht
      for (const x of [-.07, .11]) for (const z of [-.1, .1]) k.cyl(C.black, [x, .04, z], .04, .03, 10, { ax: 'z' });
      for (const z of [-.08, .08]) k.box(C.steelD, [.08, .16, z], [.015, .2, .015], { layer: 'metal' });           // Schutzdach
      k.box(C.dark, [.04, .36, 0], [.14, .015, .19], { layer: 'metal' });
      for (const z of [-.08, .08]) k.box(C.steelD, [-.03, .16, z], [.015, .2, .015], { layer: 'metal' });
      k.box(m3 ? 0xffd040 : 0xffb030, [.04, .375, 0], [.03, .015, .03], { layer: 'glow' });
      for (const z of [-.05, .05]) k.box(C.dark, [-.12, .04, z], [.02, .36, .025], { layer: 'metal' });           // Hubmast
      k.part('mkFork', [-.14, .06, 0], s => { s.box(C.steel, [0, 0, 0], [.02, .08, .16], { layer: 'metal' }); for (const z of [-.05, .05]) s.box(C.steel, [-.07, 0, z], [.14, .012, .025], { layer: 'metal' }); s.bev(C.wood, [-.07, .012, 0], [.12, .02, .14], .005); });
    });
    if (m3) {
      // Vordach über dem Regal (Chrom-Träger, blaues Dach), Lampen, Goldrahmen ums Schild
      for (const x of [-.7, -.35, .05]) for (const z of [-.78, .62]) k.cyl(CHROME, [x, 1.26, z], .022, .26, 8, { layer: 'chrome' });
      k.bev(TRIM_D, [-.32, 1.5, -.08], [.88, .05, 1.52], .02);
      k.bev(CHROME, [-.32, 1.55, -.08], [.82, .02, 1.46], .01, { layer: 'chrome' });
      glowBar(k, [-.32, 1.495, -.08], .6, .02, 0xfff2c0);
      k.bev(GOLD, [-.32, 1.25, -.08], [.1, .24, .54], .015, { layer: 'gold' });
      for (const z of [-.78, .62]) avLamp(k, [.05, 1.57, z], .04, 0xffd040);
    }
  },
  verkauf(k, mk) {
    const m3 = mk > 2;
    plinthTrim(k, 2, mk, { posts: [[-.89, .89], [-.89, -.89]] });
    // Dachkante blau/chrom
    for (const z of [-.73, .63]) k.bev(m3 ? GOLD : TRIM, [.08, .79, z], [1.18, .04, .04], .01, { layer: m3 ? 'gold' : 'base' });
    k.bev(m3 ? GOLD : TRIM, [-.5, .79, -.05], [.04, .04, 1.4], .01, { layer: m3 ? 'gold' : 'base' });
    // Münzzähler-Automat hinten rechts
    k.in([-.72, .06, .58], 0, () => {
      k.bev(TRIM, [0, 0, 0], [.26, .46, .24], .03);
      face(k, [0, 0, -.12], 3, () => { k.box(0x10202a, [.0, .28, 0], [.012, .1, .14], { ao: false }); k.box(0x6aff9a, [.008, .29, 0], [.004, .07, .11], { layer: 'glow', ao: false }); k.box(C.dark, [.01, .16, 0], [.01, .02, .1]); });
      k.bev(C.dark, [0, .46, 0], [.28, .03, .26], .01, { layer: 'metal' });
      k.ball(m3 ? GOLD : 0xffc23a, [0, .52, 0], [.05, .05, .015], { layer: m3 ? 'gold' : 'metal', detail: 1 });
    });
    if (m3) {
      // Laternen vorn (Chrom mit Goldkugel) und zwei Suchscheinwerfer auf dem Dach ('mkSpot0/1')
      for (const z of [-.86, .84]) { k.cyl(C.dark, [.88, .06, z], .05, .03, 8, { layer: 'metal' }); k.cyl(CHROME, [.88, .09, z], .022, .78, 8, { layer: 'chrome' }); k.ball(0xfff0b0, [.88, .92, z], .05, { layer: 'glow', detail: 1 }); k.cyl(GOLD, [.88, .86, z], .04, .03, 8, { layer: 'gold' }); }
      for (const [i, p] of [[0, [.5, .88, -.62]], [1, [-.36, .88, -.62]]]) {
        k.cyl(C.dark, p, .05, .04, 8, { layer: 'metal' });
        k.part('mkSpot' + i, [p[0], p[1] + .07, p[2]], s => { s.cyl(CHROME, [0, 0, 0], .045, .12, 10, { ax: 'x', layer: 'chrome' }); s.cyl(0xfff2c0, [.065, 0, 0], .038, .01, 10, { ax: 'x', layer: 'glow' }); s.box(C.dark, [0, -.05, 0], [.02, .04, .02], { layer: 'metal' }); });
      }
      // Goldmünzstapel auf dem Dach
      for (const [x, z, n] of [[.45, .3, 5], [.38, .42, 3], [-.4, -.55, 4]]) for (let i = 0; i < n; i++) k.cyl(GOLD, [x + (i % 2) * .006, .88 + i * .022, z], .055, .02, 12, { layer: 'gold', bevel: .3, bevel2: .3 });
    }
  },
};

export function mkDecor(type, k, mk, info) {
  const f = D[type]; if (!f || mk < 2) return;
  f(k, mk);
}

export function mkAnim(type, P, t, act, mk, s = {}, ctx = {}) {
  const spin = ctx.spin ?? t * act;
  switch (type) {
    case 'grossbohrer': case 'bohrer': if (P.mkFan) P.mkFan.rotation.y = t * 3 + spin * 22; if (mk > 2) animSmoke(P, 'smokeMk', t + .4, .3 + .6 * act, .7, [.15, .05]); break;
    case 'ofen': animSmoke(P, 'smokeMk', t + .7, .3 + .8 * act, 1.0, [.25, .1]); break;
    case 'presse': { const y = P.ram ? P.ram.position.y * .55 : 0; for (const n of ['mkRod0', 'mkRod1']) if (P[n]) P[n].position.y = y; break; }
    case 'drahtzug': if (P.mkPul) P.mkPul.rotation.z = -spin * 14; break;
    case 'montage': if (P.mkScan) P.mkScan.position.z = Math.sin(t * (1 + act)) * .36; break;
    case 'raffinerie': if (mk > 2) animSmoke(P, 'smokeMk', t + .2, .3 + .7 * act, 1.0, [.2, .1]); break;
    case 'experiment': if (P.mkCen) P.mkCen.rotation.y = t * 1.5 + spin * 30; if (P.mkRing) P.mkRing.rotation.y = t * .9 + spin * 5; break;
    case 'labor': if (P.mkRadar) P.mkRadar.rotation.y = t * 1.8; break;
    case 'lager': if (P.mkFork) { const f = Math.max(0, Math.min(1, s.fill ?? .5)); P.mkFork.position.y = (.5 + .5 * Math.sin(t * .6)) * .26 * (.3 + .7 * Math.max(act, f)); } break;
    case 'verkauf': for (let i = 0; i < 2; i++) { const o = P['mkSpot' + i]; if (o) { o.rotation.y = Math.sin(t * .5 + i * 2) * 1.2 + (i ? PI : 0); o.rotation.z = .5 + .15 * Math.sin(t * .7 + i); } } break;
  }
}
