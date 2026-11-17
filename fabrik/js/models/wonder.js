// Cogtopia – Weltwunder: Raketen-Startplatz 5×5 mit fünf sichtbaren Baustufen und Startanimation.
// Stufen (setStage(done, progress)): done = fertige Stufen 0…5, progress = Fortschritt der nächsten Stufe 0…1 (wächst sichtbar von unten).
//   1 Fundament (Starttisch, Flammengraben, Abweiser) · 2 Rumpf (Raketenrumpf + Startturm) · 3 Triebwerke (Düsen, Flossen, Tanks)
//   4 Cockpit (Kapsel, Rettungsturm, Zugangsarm) · 5 startbereit (Tankarme, Flutlicht, Dampf, Countdown-Lichter)
// Startanimation launch(t0) (t wie in update): 0–2,5 s Countdown, Arme schwenken weg, Dampf; 2,5 s Zündung (Feuer, Rauchwolken
// über den Platz); ab 3 s hebt die Rakete ab und ist nach ~12 s weg. Danach launched = true, resetLaunch() stellt sie wieder hin.
// Während des Baus dreht ein Baukran (Teil 'crane'). Keine Texte.
import * as THREE from 'three';
import { PI, TAU } from '../kit.js';
import { C, plinth, lattice, ladder, railing, beacon, panel, fstripes, vstripes, face } from './parts.js';

const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const RX = .35, RZ = 0, TOP = .62;                 // Raketenachse und Oberkante des Starttisches
const HULL0 = .34, HULL1 = 2.9, HR = .34;          // Rumpf (relativ zur Raketenbasis)

function hullBands(k, y0, y1, r, cols) {
  const n = cols.length, h = (y1 - y0) / n;
  cols.forEach((c, i) => k.cyl(c, [0, y0 + i * h, 0], r, h, 18, { jit: .02 }));
}
// Countdown-Leuchten (gemeinsames Material; es gibt nur ein Wunder je Fabrik)
const cdMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) });
const wunder = {
  size: 5, aoH: 1,
  build(k) {
    // ---------- Gelände (immer): Platte, Markierungen, Zaunpfosten, Bunker, Flutlichtmasten ----------
    plinth(k, 5, { stripes: false });
    k.ring(C.yel, [RX, .062, RZ], 1.25, 1.17, .004, 40, { ao: false, jit: 0 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; k.box(i % 2 ? C.dark : C.yel, [RX + Math.cos(a) * 1.55, .062, RZ + Math.sin(a) * 1.55], [.16, .004, .06], { r: [0, -a, 0], ao: false, jit: 0 }); }
    for (let i = 0; i < 18; i++) k.cyl(0x6a645a, [k.R(-2.2, 2.2), .062, k.R(-2.2, 2.2)], k.R(.05, .14), .003, 7, { ao: false, jit: .1 });
    for (const [x, z] of [[-2.38, -2.38], [2.38, -2.38], [-2.38, 2.38], [2.38, 2.38], [0, -2.38], [0, 2.38], [-2.38, 0]]) { k.cyl(C.yel, [x, .06, z], .03, .32, 8); k.ball(C.yel, [x, .38, z], .035, { detail: 0 }); }
    // Leitbunker vorn rechts mit Fenstern und Antenne
    k.in([1.75, .06, 1.75], 0, () => {
      k.bev(C.concrete2, [0, 0, 0], [.8, .32, .7], .06);
      k.prism(C.concrete2, [0, .32, 0], .8, .12, .7, { r: [0, PI / 2, 0], order: 'YXZ' });
      face(k, [.4, 0, 0], 0, () => { for (const z of [-.18, .18]) { k.box(0xfff0c0, [-.005, .14, z], [.01, .08, .2], { layer: 'glow' }); k.box(C.dark, [.0, .22, z], [.03, .02, .24], { layer: 'metal' }); } });
      k.cyl(C.steelD, [-.2, .38, -.15], .015, .5, 6, { layer: 'metal' }); k.ball(0xff3020, [-.2, .9, -.15], .025, { layer: 'lamp', detail: 1 });
      k.lathe(C.white, [.15, .44, .1], [[0, 0], [.12, .03], [.2, .1], [.21, .11], [0, .05]], 12, { r: [0, 0, -.6] });
    });
    panel(k, [2.1, .06, .9], 0, C.steelD);
    // Flutlichtmasten (Lampen leuchten ab Stufe 5: Teile 'lit0…3')
    [[-2.1, -2.1], [2.1, -2.1], [-2.1, 1.3]].forEach(([x, z], i) => {
      k.cyl(C.steel, [x, .06, z], .045, 2.3, 8, { layer: 'metal' });
      k.bev(C.dark, [x, 2.3, z], [.36, .05, .1], .01, { layer: 'metal' });
      const a = Math.atan2(RZ - z, RX - x);
      k.in([x, 2.36, z], -a, () => { for (const s of [-1, 1]) k.bev(C.dark, [.04, 0, s * .1], [.08, .12, .14], .015, { layer: 'metal', r: [0, 0, -.5] }); });
      k.part('lit' + i, [x, 2.42, z], s => s.in([0, 0, 0], -a, () => { for (const q of [-1, 1]) s.box(0xfff6d0, [.08, -.02, q * .1], [.012, .08, .11], { layer: 'glow', r: [0, 0, -.5] }); }));
    });

    // ---------- Stufe 1: Starttisch mit Flammengraben und Abweiser ----------
    k.part('st1', [RX, .06, RZ], s => {
      s.bev(C.concrete, [0, 0, 0], [1.7, TOP - .06, 1.7], .05);
      s.box(C.black, [.55, 0, 0], [.7, .4, .7], { ao: false });                              // Graben-Öffnung (+x)
      s.box(0x2a2622, [0, .0, 0], [1.6, .01, .62], { ao: false });
      s.wedge(C.steelD, [.55, 0, 0], .66, .38, .64, { layer: 'metal' });                      // Abweiser
      for (const z of [-.5, .5]) s.bev(C.concrete2, [.95, 0, z], [.22, .4, .32], .03);
      s.bev(C.dark, [0, TOP - .06, 0], [.96, .04, .96], .02, { layer: 'metal' });
      s.ring(C.steelD, [0, TOP - .02, 0], .42, .3, .03, 20, { layer: 'metal' });
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; s.bev(C.yel, [Math.cos(a) * .38, TOP - .02, Math.sin(a) * .38], [.12, .1, .12], .02); s.box(C.dark, [Math.cos(a) * .38, TOP + .08, Math.sin(a) * .38], [.06, .03, .06], { layer: 'metal' }); }
      fstripes(s, [-.85, .4, 0], 2, 1.5, .08); fstripes(s, [0, .4, .85], 1, 1.5, .08); fstripes(s, [0, .4, -.85], 3, 1.5, .08);
      for (let i = 0; i < 6; i++) s.box(C.steel, [-.85 - .1, .06 + i * .09, .6], [.18, .02, .1], { layer: 'metal' });  // Treppe
      s.rivets(C.steelD, [-.8, TOP - .04, -.8], [.8, TOP - .04, -.8], 9, .015);
    });
    // ---------- Stufe 2 (außen): Startturm aus Gitter mit Bühnen ----------
    const TX = -.95, TZ = 0;
    k.part('st2', [TX, .06, TZ], s => {
      s.bev(C.concrete2, [0, 0, 0], [.6, .08, .6], .03);
      lattice(s, .24, .2, .08, 4.0, C.red, C.orangeD);
      for (const y of [1.2, 2.2, 3.2]) { s.bev(C.dark, [0, y, 0], [.56, .04, .56], .01, { layer: 'metal' }); railing(s, y + .04, .27, .27, C.yel, 0); }
      s.bev(C.dark, [0, 4.0, 0], [.5, .06, .5], .015, { layer: 'metal' });
      s.cyl(C.steelD, [0, 4.06, 0], .02, .5, 6, { layer: 'metal' });
      s.ball(0xff3020, [0, 4.58, 0], .035, { layer: 'lamp', detail: 1 });
      ladder(s, [-.25, .08, 0], 3.9, PI, .12, C.steel);
      s.pipe(C.steel, [[.2, .1, .2], [.2, 3.0, .2]], .03, { layer: 'metal', caps: false });
      s.pipe(C.copper, [[.2, .1, -.2], [.2, 2.6, -.2]], .025, { layer: 'metal', caps: false });
    });

    // ---------- Rakete (Teil 'rocket'): Rumpf (rk2), Triebwerke (rk3), Kapsel (rk4), Feuer (fxFire) ----------
    k.part('rocket', [RX, TOP, RZ], r => {
      r.part('rk2', [0, 0, 0], s => {
        hullBands(s, HULL0, HULL1, HR, [C.white, C.white, C.dark, C.white, C.white, C.white, C.dark, C.white]);
        s.cyl(C.orange, [0, HULL0 + .95, 0], HR + .006, .14, 18);
        for (const y of [HULL0 + .5, HULL0 + 1.6, HULL1 - .25]) s.torus(C.steel, [0, y, 0], HR + .004, .008, 18, { r: [PI / 2, 0, 0], layer: 'metal', tseg: 4 });
        for (let i = 0; i < 4; i++) { const a = i * PI / 2; s.box(C.steelD, [Math.cos(a) * (HR + .005), HULL0 + .1, Math.sin(a) * (HR + .005)], [.03, HULL1 - HULL0 - .3, .03], { layer: 'metal', r: [0, -a, 0] }); }
        s.in([0, 0, 0], PI / 4, () => vstripes(s, [HR - .02, HULL0 + 1.9, 0], 0, .5, .12));
        s.cyl(C.dark, [0, HULL1, 0], HR - .02, .04, 18, { layer: 'metal' });
      });
      r.part('rk3', [0, 0, 0], s => {
        s.cyl(C.dark, [0, .18, 0], HR, HULL0 - .18, 18, { layer: 'metal' });
        s.cyl(0xffffff, [0, .2, 0], HR + .005, .1, 18, { layer: 'gold' });               // Goldfolie
        s.cyl(C.steelD, [0, .12, 0], HR - .04, .06, 18, { layer: 'metal' });
        for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4, x = Math.cos(a) * .17, z = Math.sin(a) * .17;
          s.lathe(C.steelD, [x, 0, z], [[.11, 0], [.09, .04], [.06, .1], [.045, .14], [.05, .16]], 12, { layer: 'metal' });
          s.cyl(C.dark, [x, .005, z], .1, .01, 12, { ao: false }); }
        s.lathe(C.steelD, [0, .02, 0], [[.1, 0], [.08, .05], [.05, .12], [.055, .14]], 12, { layer: 'metal' });
        for (let i = 0; i < 4; i++) { const a = i * PI / 2; s.in([Math.cos(a) * HR, .12, Math.sin(a) * HR], -a, () => { s.wedge(C.red, [.1, 0, 0], .2, .5, .03, { r: [0, PI, 0] }); s.box(C.dark, [.2, 0, 0], [.02, .14, .035], { layer: 'metal' }); }); }
      });
      r.part('rk4', [0, HULL1, 0], s => {
        s.lathe(C.white, [0, 0, 0], [[HR - .02, 0], [HR - .05, .2], [.24, .42], [.14, .62], [.06, .72], [0, .74]], 18);
        s.lathe(C.dark, [0, .1, 0], [[HR - .028, 0], [HR - .045, .08]], 18, { jit: 0 });
        for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + PI / 6; s.in([Math.cos(a) * .262, .32, Math.sin(a) * .262], -a, () => { s.boxc(0x6ad0ff, [0, 0, 0], [.03, .07, .08], { layer: 'glow', r: [0, 0, -.45] }); s.boxc(C.dark, [-.005, 0, 0], [.03, .09, .1], { layer: 'metal', r: [0, 0, -.45] }); }); }
        // Rettungsturm
        for (let i = 0; i < 4; i++) { const a = i * PI / 2; s.beam(C.steel, [Math.cos(a) * .05, .72, Math.sin(a) * .05], [0, 1.02, 0], .016, { layer: 'metal' }); }
        s.cyl(C.red, [0, 1.0, 0], .035, .14, 8, { bevel: .3 }); s.cone(C.red, [0, 1.14, 0], .035, .1, 8);
      });
      r.part('fxFire', [0, 0, 0], f => {
        for (let i = 0; i < 5; i++) { const a = i * PI / 2 + PI / 4, x = i < 4 ? Math.cos(a) * .17 : 0, z = i < 4 ? Math.sin(a) * .17 : 0;
          f.cone(0xffa030, [x, 0, z], .1, .9, 8, { layer: 'heat', r: [PI, 0, 0], ao: false });
          f.cone(0xfff2b0, [x, 0, z], .05, .55, 6, { layer: 'glow', r: [PI, 0, 0], ao: false }); }
        f.cone(0xff6a20, [0, -.05, 0], .4, 1.6, 10, { layer: 'heat', r: [PI, 0, 0], ao: false });
      });
    });

    // ---------- Stufe 3 (außen): Treibstofftanks hinten links mit Leitung ----------
    k.part('st3', [-1.75, .06, -1.6], s => {
      for (const [x, c] of [[0, C.white], [.6, C.blue]]) { s.bev(C.concrete2, [x, 0, 0], [.4, .1, .4], .02); for (const q of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.box(C.steelD, [x + q[0] * .12, .1, q[1] * .12], [.03, .22, .03], { layer: 'metal' });
        s.ball(c, [x, .5, 0], .26, { detail: 2, layer: 'metal' }); s.torus(C.steelD, [x, .5, 0], .262, .01, 18, { r: [PI / 2, 0, 0], layer: 'metal', tseg: 4 }); }
      s.pipe(C.steel, [[0, .3, .24], [0, .14, .55], [.75, .14, 1.0], [.75, .14, 1.45]], .03, { layer: 'metal', flange: C.steelD });
      s.pipe(C.blue, [[.6, .3, .24], [.6, .2, .45], [1.0, .2, .9], [1.0, .2, 1.45]], .025, { layer: 'metal' });
    });
    // ---------- Stufe 4 (außen): Zugangsarm vom Turm zur Kapsel (Teil 'arm', schwenkt beim Start weg) ----------
    k.part('st4', [TX + .24, .06 + 3.2, TZ], s => {
      s.part('arm', [0, 0, 0], a => {
        const L = RX - TX - .24 - HR - .02;
        a.bev(C.red, [L / 2, 0, 0], [L, .06, .2], .015);
        for (const z of [-.1, .1]) a.beam(C.yel, [0, .06, z], [L, .06, z], .015, { layer: 'metal' });
        a.bev(C.white, [L - .06, .06, 0], [.12, .2, .22], .02); a.box(0xfff0c0, [L - .005, .1, 0], [.01, .12, .12], { layer: 'glow' });
        for (let i = 0; i < 4; i++) a.beam(C.red, [i * L / 4, -.02, 0], [(i + .5) * L / 4, -.18, 0], .015);
      });
    });
    // ---------- Stufe 5: Tankarme, Countdown-Leuchten, Dampfventile ----------
    k.part('st5', [0, 0, 0], s => {
      for (const [i, y] of [[0, 1.2], [1, 2.2]]) s.part('fuel' + i, [TX + .24, .06 + y, TZ], a => {
        const L = RX - TX - .24 - HR;
        a.beam(C.steel, [0, 0, 0], [L, -.05, 0], .05, { layer: 'metal' });
        a.pipe(C.copper, [[0, .04, .03], [L, -.01, .03]], .015, { layer: 'metal', caps: false });
        a.cyl(C.orange, [L, -.05, 0], .045, .07, 8, { ax: 'x' });
      });
      for (let i = 0; i < 5; i++) s.part('cd' + i, [1.32, .06, -.8 + i * .4], q => { q.cyl(C.dark, [0, 0, 0], .04, .12, 8, { layer: 'metal' }); q.ball(0xffffff, [0, .16, 0], .045, { layer: 'cd', detail: 1 }); });
      for (const z of [-.5, .5]) s.part('smokeVent' + (z < 0 ? 'A' : 'B'), [RX + .3, TOP + .8, RZ + z * .9], v => { for (let i = 0; i < 4; i++) v.part('smokeVent' + (z < 0 ? 'A' : 'B') + i, [0, 0, 0], q => q.ball(0xf4f4f2, [0, 0, 0], .14, { detail: 1, ao: false, jit: .02 })); });
    });
    // ---------- Baukran (nur während des Baus, Teil 'crane'; Ausleger schwenkt nach innen ±40°) ----------
    k.part('crane', [-1.95, .06, 1.95], s => {
      s.bev(C.concrete2, [0, 0, 0], [.4, .1, .4], .02);
      lattice(s, .12, .12, .1, 3.6, C.yel, C.orangeD);
      s.bev(C.dark, [0, 3.6, 0], [.3, .2, .3], .03, { layer: 'metal' });
      s.part('jib', [0, 3.8, 0], j => {
        j.beam(C.yel, [-.5, 0, 0], [2.0, 0, 0], .08, { layer: 'metal' });
        j.beam(C.yel, [0, .4, 0], [2.0, .02, 0], .02, { layer: 'metal' }); j.beam(C.yel, [0, .4, 0], [-.5, .02, 0], .02, { layer: 'metal' });
        j.beam(C.yel, [0, 0, 0], [0, .42, 0], .05, { layer: 'metal' });
        j.bev(C.concrete2, [-.42, -.12, 0], [.18, .14, .16], .02);
        j.bev(C.steelD, [.1, -.18, 0], [.16, .14, .14], .02, { layer: 'metal' }); j.box(0xbfe6f2, [.18, -.14, 0], [.01, .08, .1], { layer: 'glass' });
        j.part('trolley', [1.4, -.04, 0], tr => { tr.box(C.dark, [0, -.04, 0], [.1, .04, .1], { layer: 'metal' }); tr.part('hook', [0, -.06, 0], h => { h.beam(C.dark, [0, 0, 0], [0, -1.0, 0], .008, { layer: 'metal' }); h.bev(C.yel, [0, -1.12, 0], [.07, .1, .05], .01); h.bev(C.steel, [0, -1.3, 0], [.22, .14, .22], .02, { layer: 'metal' }); }); });
      }, PI / 4);
    });
    // Rauchsäule hinter der Rakete (Teil 'smokeTrail', Höhe 1 → mit der Flughöhe skaliert)
    k.part('smokeTrail', [RX, TOP, RZ], q => { q.cyl(0xf2f0ec, [0, 0, 0], .3, 1, 9, { top: .4, ao: false, jit: .02 }); });
    // Rauchwolken beim Start (Teile 'smokeL0…11', am Boden des Starttischs)
    for (let i = 0; i < 12; i++) k.part('smokeL' + i, [RX + .6, .3, RZ], q => { q.ball(0xeeeae4, [0, 0, 0], .32, { detail: 1, ao: false, jit: .03 }); q.ball(0xd8d4ce, [.2, .1, .1], .24, { detail: 1, ao: false, jit: .03 }); });
    return { badge: [2.2, .065, -.9], heatColor: 0xff8a20, spots: { rocket: [RX, TOP, RZ], pad: [RX, TOP, RZ] } };
  },
  anim(c, t, s) {
    const P = c.P, st = c.store; st.lastT = t;
    if (s.stage !== undefined && (s.stage !== st.done || (s.progress ?? 0) !== st.prog)) c.setStage(s.stage, s.progress ?? 0);
    const done = st.done ?? 0, prog = st.prog ?? 0, building = done < 5;
    // Baukran: schwenkt und senkt den Haken (nur während des Baus)
    P.crane.visible = building && !st.launchT;
    if (P.crane.visible) { P.jib.rotation.y = .7 * Math.sin(t * .25); P.trolley.position.x = .5 + .5 * (.5 + .5 * Math.sin(t * .4)); P.hook.scale.y = 1; P.hook.position.y = -.3 * (.5 + .5 * Math.sin(t * .6 + 1)); }
    // wachsende Stufe leicht pulsieren lassen
    const grow = st.growPart; if (grow && !st.launchT) grow.scale.y = Math.max(.02, prog) * (1 + .004 * Math.sin(t * 6));
    // Stufe 5: Flutlicht, Countdown-Lauflicht, Dampf
    const ready = done >= 5;
    for (let i = 0; i < 3; i++) P['lit' + i].visible = ready;
    const L = st.launchT !== undefined ? t - st.launchT : -1;
    for (let i = 0; i < 5; i++) {
      const on = L >= 0 ? L > i * .5 : ((Math.floor(t * 2) - i) % 5 + 5) % 5 === 0;   // Countdown: eins nach dem anderen, sonst Lauflicht
      P['cd' + i].scale.setScalar(on ? 1.15 : .85);
    }
    cdMat.color.setRGB(L >= 2.5 ? .3 : 1.8, L >= 2.5 ? 2.2 : (L >= 0 ? 1.6 : .4), .2).multiplyScalar(ready ? 1.4 : .5);
    const vent = ready ? (L < 0 ? .45 : L < 2.5 ? .9 : Math.max(0, 1 - (L - 2.5))) : 0;
    for (const n of ['A', 'B']) for (let i = 0; i < 4; i++) { const o = P['smokeVent' + n + i]; const f = (t * .6 + i / 4 + (n === 'B' ? .5 : 0)) % 1; o.position.set(f * .35, f * .5, (n === 'A' ? -1 : 1) * f * .15);
      const sc = vent * Math.sin(Math.min(1, f * 1.2) * PI) * (.6 + f); o.scale.setScalar(Math.max(.001, sc)); o.visible = sc > .02; }
    // Start
    const R = P.rocket; R.visible = !st.gone;
    if (L < 0) {
      R.position.y = 0; P.fxFire.visible = false; P.smokeTrail.visible = false; for (let i = 0; i < 12; i++) P['smokeL' + i].visible = false;
      P.arm.rotation.y = 0; for (let i = 0; i < 2; i++) P['fuel' + i].rotation.y = 0;
      c.heat.heat = .2; return;
    }
    P.arm.rotation.y = -1.5 * sst(.3, 1.6, L); for (let i = 0; i < 2; i++) P['fuel' + i].rotation.y = (i ? 1.2 : -1.2) * sst(.8 + i * .3, 2.0 + i * .3, L);
    const ign = sst(2.4, 2.8, L), up = Math.max(0, L - 3);
    const y = .45 * up * up + .3 * up;
    R.position.y = y; R.rotation.z = -.04 * sst(5, 9, L); R.position.x = .3 * up * up * .05;
    st.gone = y > 90; R.visible = !st.gone;
    P.smokeTrail.visible = ign > 0 && L < 15; P.smokeTrail.scale.set(1 + .6 * sst(3, 9, L), Math.max(.01, Math.min(y, 40)) + .01, 1 + .6 * sst(3, 9, L)); P.smokeTrail.position.x = R.position.x * .5;
    P.fxFire.visible = ign > 0; P.fxFire.scale.set(.7 + .6 * ign, ign * (1.6 + .5 * Math.sin(t * 31) * Math.sin(t * 13) + 1.4 * sst(3, 6, L)), .7 + .6 * ign);
    c.heat.heat = 1.5 * ign;
    for (let i = 0; i < 12; i++) {
      const o = P['smokeL' + i], a = i / 12 * TAU + .3 * Math.sin(i * 7.1), u = Math.max(0, L - 2.5 - (i % 3) * .15);
      const r = 2.6 * (1 - Math.exp(-u * .8)), life = 1 - sst(9, 15, L);
      o.visible = u > 0 && life > .01; o.position.set(Math.cos(a) * r - .2, .1 + .6 * (1 - Math.exp(-u * .4)) + (i % 4) * .15, Math.sin(a) * r * 1.1);
      o.scale.setScalar(Math.max(.001, (.4 + 1.6 * (1 - Math.exp(-u * .6))) * life));
    }
  },
  api(c, b) {
    const st = c.store;
    const PARTS = ['st1', 'rk2', 'rk3', 'rk4', 'st5'], EXTRA = { 2: ['st2'], 3: ['st3'], 4: ['st4'] };
    c.setStage = (done, progress = 0) => {
      done = Math.max(0, Math.min(5, done | 0)); progress = clamp(progress); st.done = done; st.prog = progress; st.growPart = null;
      const P = c.P;
      PARTS.forEach((n, i) => { const k = i + 1, p = P[n]; const vis = k <= done || (k === done + 1 && progress > 0); p.visible = vis; p.scale.y = 1;
        for (const e of EXTRA[k] || []) { P[e].visible = vis; P[e].scale.y = 1; }
        if (k === done + 1 && progress > 0) { st.growPart = p; p.scale.y = Math.max(.02, progress); for (const e of EXTRA[k] || []) P[e].scale.y = Math.max(.02, progress); } });
      // Kapsel und Triebwerke sitzen am Rumpf: ohne Rumpf ausblenden
      if (!P.rk2.visible) { P.rk3.visible = false; P.rk4.visible = false; }
      return done;
    };
    c.setStage(0, 0);
    return {
      setStage: (d, p) => c.setStage(d, p),
      get stage() { return st.done; },
      // Start bei Zeit t0 (gleiche Uhr wie update); ohne Argument: beim nächsten update
      launch(t0) { if (st.done < 5) c.setStage(5, 0); st.launchT = t0 ?? st.lastT ?? 0; st.gone = false; },
      get launched() { return !!st.gone; },
      get launching() { return st.launchT !== undefined && !st.gone; },
      resetLaunch() { delete st.launchT; st.gone = false; },
    };
  },
};
wunder.mats = { cd: cdMat };
export const WONDER_DEFS = { wunder };
