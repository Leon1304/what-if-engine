// Cogtopia – Figuren: Gerald (tollpatschiger Praktikant) und Dr. Steve (Wissenschaftler). Eigene Low-Poly-Spielzeugfiguren
// aus dem Baukasten, Gelenke als verschachtelte Teile (k.part). Ursprung = zwischen den Füßen, Blick nach +x, rechts = +z.
// Bewegung: update(t, state) ist eine reine Funktion von t und state:
//   state = { anim, speed?, since?, prev?, phase? }
//   anim  – 'idle' | 'walk' | 'sit' | 'wave' | 'trip' | 'cheer' | 'tinker' | 'think'
//   speed – Laufgeschwindigkeit in Feldern/s (Schrittfrequenz), Standard .5
//   since – Startzeit der Animation (Einmal-Animationen wie 'trip'; Überblendung von prev)
//   prev  – vorige Animation: wird in den ersten 0,25 s nach since weich übergeblendet
//   phase – Versatz (s), damit mehrere Figuren nicht gleich zappeln
import * as THREE from 'three';
import { Kit, instantiate, PI, TAU } from '../kit.js';
import { MATS } from '../materials.js';

export const SEAT_Y = .2;           // = BELT_Y: Sitzhöhe für 'sit'

const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// =====================================================================================================================
// Skelett: Hüfte → Oberschenkel → Unterschenkel; Hüfte → Rumpf → Kopf (→ Hut), Schultern → Oberarm → Unterarm.
// D = Maße, C = Kleidung (Callbacks zeichnen je Glied im Gelenk-Rahmen)
function skeleton(k, D, C) {
  k.part('hips', [0, D.hip, 0], h => {
    C.pelvis(h);
    for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
      h.part('thigh' + n, [0, -.005, s * D.legZ], th => {
        C.thigh(th, s);
        th.part('shin' + n, [0, -D.thigh, 0], sh => C.shin(sh, s));
      });
    }
    h.part('torso', [0, D.waist, 0], to => {
      C.torso(to);
      to.part('head', [0, D.torsoH + .006, 0], hd => {
        C.head(hd);
        hd.part('eyes', [D.eyeX, D.eyeY, 0], e => C.eyes(e));
        if (C.hat) hd.part('hat', [0, D.hatY, 0], ht => C.hat(ht));
      });
      for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
        to.part('upper' + n, [0, D.shoulderY, s * D.shoulderZ], u => {
          C.upper(u, s);
          u.part('fore' + n, [0, -D.upper, 0], f => C.fore(f, s));
        });
      }
    });
  });
}

// =====================================================================================================================
// Gerald – Praktikant, ~0,5 hoch
const G = {
  skin: 0xf3c39c, cheek: 0xf09a86, hair: 0xd8692a, hat: 0xf6c423, hatRim: 0xe2a712, vest: 0xff7618, vestDark: 0xe0601a,
  stripe: 0xe9eef2, shirt: 0x86b6e2, jeans: 0x3d5c9e, jeansDark: 0x324c84, boot: 0x744a2a, toe: 0x8f5e38, sole: 0x2b2420,
  belt: 0x4a3426, metal: 0x9aa0a8, dark: 0x1e1a1c, white: 0xfbfaf6, freckle: 0xc27a4a,
};
const GD = { hip: .17, legZ: .028, thigh: .08, waist: .016, torsoH: .118, shoulderY: .098, shoulderZ: .079, upper: .062, eyeX: .062, eyeY: .078, hatY: .1 };

function buildGerald() {
  const k = new Kit(4711); k.aoH = .08; k.jit = .03;
  const B = (c, p, s, b = .012, o) => k.bev(c, p, s, b, o);
  skeleton(k, GD, {
    pelvis(h) {
      h.bev(G.jeans, [0, -.032, 0], [.074, .05, .1], .012);
      h.bev(G.belt, [0, .006, 0], [.08, .016, .106], .005);
      h.bev(G.metal, [.04, .007, 0], [.006, .013, .022], .002, { layer: 'metal' });
    },
    thigh(t, s) {
      t.bev(G.jeans, [0, -GD.thigh, 0], [.046, GD.thigh + .004, .044], .012);
      t.bev(G.jeansDark, [.019, -.05, 0], [.012, .02, .03], .004);                 // Knieflicken
    },
    shin(t, s) {
      t.bev(G.jeans, [0, -.05, 0], [.044, .052, .042], .011);
      t.bev(G.jeansDark, [0, -.05, 0], [.047, .008, .045], .003);                  // Saum
      t.bev(G.boot, [.012, -.083, 0], [.082, .038, .054], .014);
      t.bev(G.toe, [.04, -.083, 0], [.034, .031, .056], .012);                     // Stahlkappe
      t.bev(G.sole, [.012, -.085, 0], [.088, .01, .058], .003);
      for (const x of [.0, .012]) t.box(G.white, [x, -.0465, 0], [.004, .0025, .03]);   // Schnürsenkel
    },
    torso(t) {
      t.bev(G.shirt, [0, 0, 0], [.074, .12, .104], .02);
      t.bev(G.vest, [0, .002, 0], [.086, .104, .116], .022);
      for (const y of [.026, .062]) {                                                 // Leuchtstreifen rundum (Ecken frei)
        for (const sx of [-1, 1]) t.box(G.stripe, [sx * .0425, y, 0], [.004, .011, .072], { layer: 'metal' });
        for (const sz of [-1, 1]) t.box(G.stripe, [0, y, sz * .0575], [.042, .011, .004], { layer: 'metal' });
      }
      for (const sz of [-1, 1]) t.box(G.stripe, [.0425, .074, sz * .028], [.004, .028, .01], { layer: 'metal' });   // Träger-Streifen vorn
      t.box(G.vestDark, [.0435, .0, 0], [.003, .1, .006]);                          // Reißverschluss
      t.bev(G.vestDark, [.044, .034, .03], [.006, .02, .026], .004);                // Brusttasche
      t.cyl(0xd23a3a, [.046, .044, .022], .003, .02, 5);                            // Stift
      t.bev(G.shirt, [.004, .098, 0], [.05, .016, .06], .007);                        // Kragen
      t.cyl(G.skin, [0, .112, 0], .02, .016, 8);                                    // Hals
    },
    head(h) {
      h.ball(G.skin, [0, .066, 0], [.074, .07, .076], { smooth: 12 });
      h.ball(G.skin, [0, .068, -.074], [.012, .02, .012], { detail: 1 });           // Ohren
      h.ball(G.skin, [0, .068, .074], [.012, .02, .012], { detail: 1 });
      h.ball(0xf2ad8a, [.077, .056, 0], [.017, .015, .017], { detail: 1 });         // Knubbelnase
      h.ball(G.cheek, [.061, .045, -.043], [.004, .008, .011], { detail: 0, jit: 0 });   // Bäckchen
      h.ball(G.cheek, [.061, .045, .043], [.004, .008, .011], { detail: 0, jit: 0 });
      for (const [z, y] of [[-.05, .058], [-.04, .052], [-.054, .05], [.05, .058], [.042, .05], [.055, .053]])
        h.ball(G.freckle, [.067 - Math.abs(z) * .25, y, z], .0042, { detail: 0, jit: 0 });   // Sommersprossen
      h.bev(G.dark, [.056, .026, .004], [.014, .009, .032], .003, { r: [.14, 0, 0] });   // schiefes Grinsen
      h.box(G.white, [.0625, .028, -.004], [.003, .005, .009]);                      // Zahn
      // Haare unter dem Helm
      for (const [x, y, z, r] of [[-.052, .074, -.048, .026], [-.06, .074, .046, .026], [-.07, .066, 0, .03], [-.03, .085, -.06, .02], [-.03, .085, .06, .02], [.055, .094, .03, .018]])
        h.ball(G.hair, [x, y, z], r, { detail: 0 });
      // Augenbrauen (eine höher → verdutzt)
      h.bev(G.hair, [.064, .097, -.028], [.008, .006, .024], .002, { r: [.25, 0, 0] });
      h.bev(G.hair, [.064, .102, .028], [.008, .006, .024], .002, { r: [-.15, 0, 0] });
    },
    eyes(e) {
      e.ball(G.white, [0, 0, -.026], [.014, .021, .019], { detail: 1, ao: false });
      e.ball(G.white, [0, .002, .027], [.014, .023, .021], { detail: 1, ao: false });
      e.ball(G.dark, [.012, -.002, -.023], .0105, { detail: 1, ao: false });          // schielt leicht
      e.ball(G.dark, [.012, .0, .023], .012, { detail: 1, ao: false });
      e.ball(G.white, [.02, .004, -.02], .0032, { detail: 0, ao: false, layer: 'glow' });
      e.ball(G.white, [.021, .006, .026], .0035, { detail: 0, ao: false, layer: 'glow' });
    },
    hat(t) {
      t.lathe(G.hat, [0, 0, 0], [[0, 0], [.083, 0], [.084, .012], [.078, .038], [.06, .058], [.032, .07], [0, .073]], 12);
      t.cyl(G.hatRim, [0, -.004, 0], .094, .01, 14, { bevel: .3 });                  // Krempe
      t.bev(G.hatRim, [.084, -.004, 0], [.04, .009, .1], .004, { r: [0, 0, .12] });  // Schirm vorn
      t.bev(G.hatRim, [0, .052, 0], [.12, .014, .022], .006, { r: [0, 0, 0] });      // Mittelgrat
      t.bev(G.hatRim, [.068, .02, 0], [.022, .03, .034], .008, { r: [0, 0, -.35] });   // Lampenhalter
      t.cyl(0x55585e, [.08, .036, 0], .012, .018, 8, { ax: 'x', layer: 'metal' });  // Stirnlampe
      t.cyl(0xfff2c0, [.0895, .036, 0], .009, .003, 8, { ax: 'x', layer: 'glow' });
    },
    upper(u, s) {
      u.bev(G.vest, [0, -.022, 0], [.046, .026, .046], .012);                       // Westenschulter
      u.bev(G.shirt, [0, -GD.upper, 0], [.04, GD.upper, .04], .012);
    },
    fore(f, s) {
      f.bev(G.shirt, [0, -.042, 0], [.037, .044, .037], .011);
      f.bev(0xdfe8f2, [0, -.046, 0], [.039, .008, .039], .003);                     // Bündchen
      f.ball(G.skin, [.002, -.062, 0], [.024, .025, .022], { detail: 1 });          // Hand
      f.ball(G.skin, [.016, -.052, -s * .012], [.009, .012, .009], { detail: 0 });  // Daumen
    },
  });
  return k.build();
}

// =====================================================================================================================
// Dr. Steve – ~0,55 hoch, Kittel, runde Brille, wildes graues Haar, Fliege, Klemmbrett, Schraubenschlüssel
const S = {
  skin: 0xf1c8a6, hair: 0xdedfe4, hairDark: 0xb8bac2, coat: 0xf6f5f0, coatShade: 0xdcdcd6, shirt: 0xa9c9ea, tie: 0xd23a3a,
  pants: 0x4a4b5c, shoe: 0x2b2524, sole: 0x1a1616, frame: 0x2a2a32, board: 0x9b6b3c, paper: 0xfaf8f0, clip: 0xb4b8c0,
  wrench: 0xa4aab2, dark: 0x1e1a1c, white: 0xfbfaf6, pen1: 0x2f6fd0, pen2: 0xd23a3a, cheek: 0xeaa48e,
};
const SD = { hip: .185, legZ: .025, thigh: .088, waist: .016, torsoH: .132, shoulderY: .11, shoulderZ: .074, upper: .068, eyeX: .062, eyeY: .078, hatY: .1 };

function buildSteve() {
  const k = new Kit(1337); k.aoH = .08; k.jit = .03;
  skeleton(k, SD, {
    pelvis(h) {
      h.bev(S.pants, [0, -.032, 0], [.07, .05, .094], .012);
      // Kittelschöße: hinten und seitlich (vorn offen, damit die Beine frei schwingen)
      h.bev(S.coat, [-.004, -.03, 0], [.076, .05, .108], .014);                     // Kittel um die Hüfte
      h.bev(S.coat, [-.036, -.1, 0], [.014, .08, .104], .005, { r: [0, 0, -.08] });   // Schoß hinten
      h.bev(S.coat, [-.008, -.096, -.05], [.064, .076, .01], .004, { r: [-.07, 0, 0] });
      h.bev(S.coat, [-.008, -.096, .05], [.064, .076, .01], .004, { r: [.07, 0, 0] });
      h.box(S.coatShade, [-.043, -.08, 0], [.004, .06, .003]);                      // Rückenschlitz
    },
    thigh(t, s) { t.bev(S.pants, [0, -SD.thigh, 0], [.042, SD.thigh + .004, .04], .011); },
    shin(t, s) {
      t.bev(S.pants, [0, -.07, 0], [.04, .072, .038], .01);
      t.bev(S.shoe, [.014, -.097, 0], [.07, .03, .046], .013);
      t.bev(S.sole, [.014, -.098, 0], [.07, .007, .046], .003);
      t.ball(0x55504e, [.04, -.08, 0], [.012, .006, .016], { detail: 0, layer: 'metal' });   // Glanz auf der Kappe
    },
    torso(t) {
      t.bev(S.shirt, [0, 0, 0], [.066, .134, .094], .018);
      t.bev(S.coat, [-.004, -.004, 0], [.074, .132, .108], .02);
      // Revers (zwei Keile, Hemd + Fliege dazwischen)
      t.bev(S.coatShade, [.036, .066, -.022], [.01, .066, .022], .004, { r: [-.22, 0, 0] });
      t.bev(S.coatShade, [.036, .066, .022], [.01, .066, .022], .004, { r: [.22, 0, 0] });
      t.box(S.shirt, [.0345, .07, 0], [.004, .062, .026]);
      t.ball(S.tie, [.04, .118, -.012], [.006, .011, .013], { detail: 0 });         // Fliege
      t.ball(S.tie, [.04, .118, .012], [.006, .011, .013], { detail: 0 });
      t.ball(0xa82a2a, [.043, .118, 0], .006, { detail: 0 });
      for (const y of [.03, .055]) t.ball(S.clip, [.036, y, .004], .004, { detail: 0, layer: 'metal' });   // Knöpfe
      // Brusttasche mit Stiften
      t.bev(S.coatShade, [.0355, .072, .034], [.005, .026, .024], .003);
      t.cyl(S.pen1, [.037, .09, .03], .003, .022, 5); t.cyl(S.pen2, [.037, .09, .038], .003, .018, 5);
      t.bev(S.coatShade, [.034, .02, -.04], [.006, .022, .026], .003);              // Seitentasche
      t.cyl(S.skin, [0, .126, 0], .019, .016, 8);                                    // Hals
      t.bev(S.white, [.004, .118, 0], [.054, .016, .062], .008);                     // Hemdkragen
    },
    head(h) {
      h.ball(S.skin, [0, .064, 0], [.07, .072, .07], { smooth: 12 });
      h.ball(S.skin, [0, .066, -.069], [.011, .019, .011], { detail: 1 });
      h.ball(S.skin, [0, .066, .069], [.011, .019, .011], { detail: 1 });
      h.ball(0xe8b090, [.072, .056, 0], [.02, .014, .014], { detail: 1 });          // lange Nase
      h.ball(S.cheek, [.058, .042, -.038], [.006, .009, .012], { detail: 0, jit: 0 });
      h.ball(S.cheek, [.058, .042, .038], [.006, .009, .012], { detail: 0, jit: 0 });
      h.bev(S.dark, [.065, .028, 0], [.01, .007, .03], .003);                        // Lächeln
      // Schnurrbart
      h.ball(S.hair, [.071, .04, -.014], [.009, .009, .018], { detail: 0 });
      h.ball(S.hair, [.071, .04, .014], [.009, .009, .018], { detail: 0 });
      // wildes Haar: Halbkranz + Büschel, oben licht
      for (let i = 0; i < 11; i++) {
        const a = PI * .32 + i / 10 * PI * 1.36, r = .072, z = Math.sin(a) * r, x = Math.cos(a) * r;
        h.ball(i % 2 ? S.hair : S.hairDark, [x - .006, .082 + (i % 3) * .008, z], .021 + (i % 3) * .005, { detail: 0 });
      }
      for (const [x, y, z, r] of [[-.035, .118, -.04, .019], [-.042, .12, .036, .02], [-.06, .104, 0, .024], [-.02, .13, -.018, .014], [-.028, .132, .016, .015]])
        h.ball(S.hair, [x, y, z], r, { detail: 0 });
      // Brauen buschig
      h.bev(S.hair, [.066, .1, -.026], [.012, .011, .03], .004, { r: [-.18, 0, 0] });
      h.bev(S.hair, [.066, .1, .026], [.012, .011, .03], .004, { r: [.18, 0, 0] });
    },
    eyes(e) {
      e.ball(S.white, [0, 0, -.024], [.012, .017, .016], { detail: 1, ao: false });
      e.ball(S.white, [0, 0, .024], [.012, .017, .016], { detail: 1, ao: false });
      e.ball(S.dark, [.01, 0, -.022], .0095, { detail: 1, ao: false });
      e.ball(S.dark, [.01, 0, .022], .0095, { detail: 1, ao: false });
      // runde Brille: Rahmen + Gläser + Steg + Bügel
      for (const z of [-.025, .025]) {
        e.torus(S.frame, [.016, 0, z], .02, .0035, 12, { r: [0, PI / 2, 0], layer: 'metal', ao: false });
        e.cyl(0xcfe8ff, [.016, 0, z], .018, .002, 12, { ax: 'x', layer: 'glass', ao: false });
      }
      e.beam(S.frame, [.018, .004, -.006], [.018, .004, .006], .004, { layer: 'metal', ao: false });
      e.beam(S.frame, [.012, .004, -.045], [-.05, .008, -.07], .004, { layer: 'metal', ao: false });
      e.beam(S.frame, [.012, .004, .045], [-.05, .008, .07], .004, { layer: 'metal', ao: false });
    },
    upper(u, s) { u.bev(S.coat, [0, -SD.upper, 0], [.042, SD.upper + .008, .042], .013); },
    fore(f, s) {
      f.bev(S.coat, [0, -.046, 0], [.039, .048, .039], .012);
      f.bev(S.coatShade, [0, -.05, 0], [.042, .01, .042], .004);                     // Ärmelaufschlag
      f.ball(S.skin, [.002, -.064, 0], [.022, .024, .02], { detail: 1 });
      f.ball(S.skin, [.016, -.055, -s * .011], [.008, .011, .008], { detail: 0 });
      if (s < 0) f.part('clipboard', [.024, -.07, 0], c => {                          // Klemmbrett (linke Hand)
        c.bev(S.board, [0, -.035, 0], [.008, .1, .074], .004, { r: [0, 0, 0] });
        c.box(S.paper, [.0045, -.03, 0], [.002, .084, .064]);
        for (let i = 0; i < 4; i++) c.box(0x8a98b0, [.006, .035 - i * .014, 0], [.001, .003, .046 - (i % 2) * .012]);
        c.bev(S.clip, [.006, .058, 0], [.008, .012, .03], .003, { layer: 'metal' });
      }, [0, 0, -1.05]);
      else f.part('wrench', [.006, -.066, 0], w => {                                  // Schraubenschlüssel (rechte Hand)
        w.bev(S.wrench, [.0, -.005, 0], [.014, .012, .012], .003, { layer: 'metal' });
        w.beam(S.wrench, [0, 0, 0], [.07, .0, 0], .012, { layer: 'metal', d: .006 });
        w.ring(S.wrench, [.078, -.003, 0], .016, .008, .006, 8, { layer: 'metal', r: [PI / 2, 0, 0] });
        w.part('sparkPoint', [.092, 0, 0], () => {});
      });
    },
  });
  return k.build();
}

// =====================================================================================================================
// Posen. Werte in Radiant: z = vor/zurück (positiv = nach vorn, Rumpf: positiv = nach hinten), x = seitlich.
const JOINTS = ['hy', 'hx', 'hrz', 'hrx', 'hry', 'trz', 'trx', 'try', 'hdz', 'hdx', 'hdy', 'uLz', 'uLx', 'fLz', 'fLx', 'uRz', 'uRx', 'fRz', 'fRx',
  'tLz', 'tLx', 'sLz', 'tRz', 'tRx', 'sRz', 'hatz', 'hatx', 'haty', 'blink'];
const zero = () => { const o = {}; for (const j of JOINTS) o[j] = 0; return o; };

function blinkAt(t, seed) { const u = ((t / 3.4 + seed) % 1 + 1) % 1; return u < .04 ? 1 - Math.abs(u / .02 - 1) : 0; }

function poseIdle(P, t, who) {
  const br = Math.sin(t * 1.7);
  P.hy = br * .0015; P.trz = .02 + br * .015;
  P.uLx = .1 + br * .02; P.uRx = -.1 - br * .02; P.fLz = .2; P.fRz = .2;
  const look = Math.sin(t * .43) + .5 * Math.sin(t * 1.13 + 1);
  P.hdy = sst(-.4, .9, look) * .6 - .3; P.hdz = Math.sin(t * .31) * .06;
  if (who === 'steve') { P.uLz = .35; P.fLz = 1.25; P.uLx = .06; }             // hält das Klemmbrett vor die Brust
  if (who === 'gerald') { P.hatz = Math.sin(t * 1.7) * .01; P.hry = Math.sin(t * .6) * .05; }
}
function poseWalk(P, t, who, speed) {
  const cad = clamp(speed / .34, .6, 4), ph = t * TAU * cad, s = Math.sin(ph), c = Math.cos(ph);
  const amp = who === 'gerald' ? .62 : .48;
  P.tLz = s * amp; P.tRz = -s * amp;
  P.sLz = -Math.max(0, Math.sin(ph - .9)) * .75 - .06; P.sRz = -Math.max(0, Math.sin(ph + PI - .9)) * .75 - .06;
  P.uLz = -s * amp * .85; P.uRz = s * amp * .85; P.fLz = .35 + Math.max(0, -s) * .3; P.fRz = .35 + Math.max(0, s) * .3;
  P.uLx = .12; P.uRx = -.12;
  P.hy = Math.abs(c) * .013 - .008; P.trz = -.06; P.try = s * .12;
  P.hdz = -.02 + Math.abs(c) * .03; P.hdy = -s * .06;
  if (who === 'gerald') { P.hrx = s * .07; P.trx = -s * .04; P.hatz = Math.sin(ph * 2) * .05; P.hatx = s * .05; }
  if (who === 'steve') { P.uLz = .35; P.fLz = 1.25; P.uLx = .2; P.try = s * .06; }
}
function poseSit(P, t, who, D) {
  P.hy = SEAT_Y + .03 - D.hip; P.hx = -.01;
  P.tLz = P.tRz = 1.5; P.tLx = -.08; P.tRx = .08;
  P.sLz = -1.45 + Math.sin(t * 2.6) * .32; P.sRz = -1.45 + Math.sin(t * 2.6 + 2.2) * .32;   // baumelnde Beine
  P.trz = .1 + Math.sin(t * 1.3) * .02; P.uLz = -.35; P.uRz = -.35; P.uLx = .32; P.uRx = -.32; P.fLz = .25; P.fRz = .25;
  P.hdy = Math.sin(t * .5) * .5; P.hdz = .1 + Math.sin(t * .9) * .05; P.hdx = Math.sin(t * .37) * .08;
  if (who === 'steve') { P.uLz = .35; P.fLz = 1.25; P.uLx = .2; }
}
function poseWave(P, t, who) {
  poseIdle(P, t, who);
  P.uRx = -2.55; P.uRz = .15; P.fRx = -.35 + Math.sin(t * 9) * .5; P.fRz = .1;
  P.trx = .06; P.hdx = .12 + Math.sin(t * 4.5) * .04; P.hdy = 0; P.hdz = .1; P.hy = Math.abs(Math.sin(t * 4.5)) * .006;
}
function poseCheer(P, t, who) {
  const per = .56, j = Math.abs(Math.sin(t * PI / per)), air = sst(.15, .7, j);
  P.hy = j * .075; P.uLx = 2.5 + Math.sin(t * 11) * .14; P.uRx = -2.5 - Math.sin(t * 11 + 1) * .14; P.uLz = .2; P.uRz = .2;
  P.fLz = .25 + Math.sin(t * 11) * .2; P.fRz = .25 + Math.sin(t * 11 + 1) * .2;
  P.tLz = air * .55; P.tRz = air * .4; P.sLz = -air * 1.0; P.sRz = -air * .8; P.tLx = -.05; P.tRx = .05;
  P.trz = .12 * air; P.hdz = .25; P.hatz = Math.sin(t * 22) * .05 * air; P.haty = air * .012;
}
function poseTinker(P, t) {
  const w = Math.sin(t * 7.5), w2 = Math.sin(t * 3.1);
  P.hy = -.012; P.tLz = .32; P.tRz = .12; P.sLz = -.42; P.sRz = -.2; P.hrz = -.05;
  P.trz = -.5; P.hdz = -.3 + w2 * .05; P.hdy = w2 * .15;
  P.uLz = 1.0; P.uLx = .15; P.fLz = .85 + Math.sin(t * 2.3) * .1;
  P.uRz = 1.05 + w * .1; P.uRx = -.12; P.fRz = .7 + w * .3; P.fRx = w * .1;
}
function poseThink(P, t) {
  poseIdle(P, t, 'steve');
  P.uRz = 1.5; P.uRx = .34; P.fRz = 1.6; P.fRx = .1;                        // Hand ans Kinn
  P.uLz = .45; P.fLz = 1.45; P.uLx = .12;
  P.hdx = .14 + Math.sin(t * .8) * .04; P.hdz = .14; P.hdy = Math.sin(t * .4) * .2;
  P.trz = .05; P.hrx = Math.sin(t * 1.1) * .02;
  P.tRz = Math.max(0, Math.sin(t * 6)) * .06;                                  // wippt mit dem Fuß
}
// Stolpern: 0–.18 Fuß hakt · –.7 stolpert nach vorn, rudert · –1.15 fängt sich · –1.8 kratzt sich verlegen am Kopf
const TRIP_LEN = 1.8;
function poseTrip(P, u, t, who) {
  const a = sst(0, .18, u), b = sst(.18, .32, u), rec = sst(.62, 1.1, u), done = sst(1.55, 1.8, u);
  const fl = Math.sin(u * 31), fl2 = Math.sin(u * 27 + 2), stum = a * (1 - rec);
  P.hrz = -.55 * stum; P.trz = -.45 * stum + rec * (1 - done) * .14; P.hx = .07 * sst(.1, .55, u) * (1 - rec) + .04 * rec * (1 - done);
  P.hy = -.022 * stum + Math.abs(Math.sin(u * 14)) * .01 * b * (1 - rec);
  P.tRz = -.7 * a * (1 - b) + Math.sin(u * 22) * .6 * b * (1 - rec); P.tLz = .5 * a * (1 - b) - Math.sin(u * 22) * .6 * b * (1 - rec) + .3 * stum;
  P.sRz = -.6 * a * (1 - rec); P.sLz = -.3 * stum;
  P.uLz = (1.4 + fl * .9) * stum; P.uRz = (1.1 + fl2 * .9) * stum; P.uLx = (1.4 + fl2 * .6) * stum; P.uRx = -(1.4 + fl * .6) * stum;
  P.fLz = .6 * stum; P.fRz = .6 * stum;
  P.hdz = .35 * stum; P.hdy = 0;
  const wob = Math.exp(-Math.max(0, u - .2) * 2.8) * sst(.05, .25, u);
  P.hatz = Math.sin(u * 24) * .3 * wob; P.hatx = Math.sin(u * 19 + 1) * .2 * wob; P.haty = .025 * wob * Math.abs(Math.sin(u * 12));
  // verlegen: Hand an den Hinterkopf
  const sc = rec * (1 - done);
  if (sc > 0) { P.uRz += -.15 * sc; P.uRx += -2.1 * sc; P.fRz += .35 * sc; P.fRx += -(1.95 + Math.sin(t * 16) * .14) * sc; P.hdx += -.16 * sc; P.hdz += -.1 * sc; P.uLx += .1 * sc; }
  if (done > 0) { const I = zero(); poseIdle(I, t, who); for (const j of JOINTS) P[j] = lerp(P[j], I[j], done); }
}

function computePose(anim, t, st, who, D) {
  const P = zero();
  switch (anim) {
    case 'walk': poseWalk(P, t, who, st.speed ?? .5); break;
    case 'sit': poseSit(P, t, who, D); break;
    case 'wave': poseWave(P, t, who); break;
    case 'cheer': poseCheer(P, t, who); break;
    case 'tinker': poseTinker(P, t); break;
    case 'think': poseThink(P, t); break;
    case 'trip': { const u = st.since !== undefined ? t - st.since : ((t % 2.8) + 2.8) % 2.8; if (u >= TRIP_LEN) poseIdle(P, t, who); else poseTrip(P, u, t, who); break; }
    default: poseIdle(P, t, who);
  }
  return P;
}

function apply(J, P, who) {
  const set = (o, x, y, z) => o && o.rotation.set(x, y, z, 'YXZ');
  J.hips.position.set(P.hx, P.hy, 0); set(J.hips, P.hrx, P.hry, P.hrz);
  set(J.torso, P.trx, P.try, P.trz); set(J.head, P.hdx, P.hdy, P.hdz);
  set(J.upperL, P.uLx, 0, P.uLz); set(J.foreL, P.fLx, 0, P.fLz); set(J.upperR, P.uRx, 0, P.uRz); set(J.foreR, P.fRx, 0, P.fRz);
  set(J.thighL, P.tLx, 0, P.tLz); set(J.shinL, 0, 0, P.sLz); set(J.thighR, P.tRx, 0, P.tRz); set(J.shinR, 0, 0, P.sRz);
  if (J.hat) { set(J.hat, P.hatx, 0, P.hatz); J.hat.position.y = P.haty; }
  J.eyes.scale.y = 1 - .88 * clamp(P.blink);
}

// Füße auf dem Boden halten: tiefster Sohlenpunkt (aus den Gelenken) → Hüfte so verschieben, dass er bei y = 0 liegt.
// Nur für Posen mit Bodenkontakt (nicht sitzen, nicht springen).
function planted(anim) { return anim === 'idle' || anim === 'walk' || anim === 'wave' || anim === 'tinker' || anim === 'think' || anim === 'trip' || !anim; }

const CACHE = {};
function makeFigure(who, opts) {
  const built = CACHE[who] ||= (who === 'gerald' ? buildGerald() : buildSteve());
  const D = who === 'gerald' ? GD : SD;
  const { group, parts } = instantiate(built, { ...MATS, ...(opts.mats || {}) });
  group.name = who;
  const J = parts, seed = opts.seed ?? (who === 'gerald' ? .13 : .61);
  const soles = ['shinL', 'shinR'].map(n => { const o = new THREE.Object3D(); o.position.set(.012, -(D.hip - .005 - D.thigh), 0); J[n].add(o); return o; });
  const toes = ['shinL', 'shinR'].map(n => { const o = new THREE.Object3D(); o.position.set(.05, -(D.hip - .005 - D.thigh), 0); J[n].add(o); return o; });
  const heels = ['shinL', 'shinR'].map(n => { const o = new THREE.Object3D(); o.position.set(-.025, -(D.hip - .005 - D.thigh), 0); J[n].add(o); return o; });
  const _v = new THREE.Vector3();
  const height = who === 'gerald' ? .5 : .55;
  if (J.sparkPoint) J.sparkPoint.name = 'sparkPoint';
  function update(t, state = {}) {
    const anim = state.anim || 'idle', tt = t + (state.phase || 0);
    let P = computePose(anim, tt, state, who, D);
    if (state.prev && state.prev !== anim && state.since !== undefined) {
      const k = sst(0, .25, t - state.since);
      if (k < 1) { const Q = computePose(state.prev, tt, { ...state, since: undefined }, who, D); for (const j of JOINTS) P[j] = lerp(Q[j], P[j], k); }
    }
    P.blink = Math.max(P.blink, blinkAt(tt, seed));
    if (J.wrench) J.wrench.visible = anim === 'tinker';
    if (J.clipboard) J.clipboard.visible = anim !== 'tinker' && anim !== 'cheer' && anim !== 'wave';
    apply(J, P, who);
    if (planted(anim) && !(state.prev === 'sit' && t - (state.since ?? -9) < .25)) {
      group.updateMatrixWorld(true);
      let lo = 1e9; const inv = group.matrixWorld.clone().invert();
      for (const arr of [soles, toes, heels]) for (const o of arr) { _v.setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv); lo = Math.min(lo, _v.y); }
      J.hips.position.y -= lo;
    }
  }
  update(0, { anim: 'idle' });
  return { group, update, height, joints: J, sparkPoint: J.sparkPoint || null, who };
}

export function makeGerald(opts = {}) { return makeFigure('gerald', opts); }
export function makeSteve(opts = {}) { return makeFigure('steve', opts); }
export const ANIMS = { gerald: ['idle', 'walk', 'sit', 'wave', 'trip', 'cheer'], steve: ['idle', 'walk', 'tinker', 'cheer', 'wave', 'think'] };
