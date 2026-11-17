// Cogtopia – Strom und Drohnen: Kraftwerk (3×3), Solarfeld (2×2), Strommast (1×1), Heizer (1×1), Drohnenhafen (2×2)
// als Zusatz-Typen für makeBuilding (POWER_DEFS), dazu Kabel mit Durchhang (makeCable, CableSet).
// Jedes Strom-Gebäude hat spots.cable (Anschlusspunkt im lokalen Rahmen) → b.anchor('cable') liefert die Weltlage.
// state je Typ: kraftwerk { load 0…1 (sonst busy), fuel: 'kohle' | 'oel' }, solar { sun 0…1, storm bool }, mast { power 0…1 },
//               heizer { power 0…1 (sonst busy) }, drohnenhafen { busy, docked (Drohnen daheim, Zahl) }
import * as THREE from 'three';
import { PI, TAU, BELT_Y } from '../kit.js';
import { U } from '../materials.js';
import { C, face, plinth, chute, intake, fstripes, vstripes, beacon, panel, smokeStack, animSmoke, lattice, ladder, railing, bricks } from './parts.js';
import { droneKit } from './drones.js';

const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;

// große Dampf-/Rauchwolke (vier Bälle, Teil name0…3 – Namen mit 'smoke' werden bei der Grundriss-Prüfung übergangen)
function cloud(k, p, name, col, r) {
  k.part(name, p, s => { for (let i = 0; i < 4; i++) s.part(name + i, [0, 0, 0], q => { q.ball(col, [0, 0, 0], r, { detail: 1, ao: false, jit: .02 }); q.ball(col, [r * .6, r * .3, r * .3], r * .7, { detail: 1, ao: false, jit: .02 }); q.ball(col, [-r * .5, r * .2, -r * .4], r * .65, { detail: 1, ao: false, jit: .02 }); }); });
}
function animCloud(P, name, t, amt, rise, drift, rate = .45) {
  for (let i = 0; i < 4; i++) {
    const o = P[name + i]; if (!o) continue; const f = (t * rate + i / 4) % 1;
    o.position.set(drift[0] * f + Math.sin(t * 1.1 + i) * .05, f * rise, drift[1] * f);
    const sc = amt * Math.sin(Math.min(1, f * 1.15) * PI) * (.55 + f * 1.1); o.scale.setScalar(Math.max(.001, sc)); o.visible = sc > .01;
  }
}
// Isolator: Stapel aus Scheiben (Porzellan), von p nach unten (dir −1) oder oben (+1)
function insulator(k, p, n = 4, dir = -1, col = 0x7a5a48) {
  k.cyl(C.steelD, [p[0], p[1] + (dir < 0 ? -.03 : 0), p[2]], .008, .03, 6, { layer: 'metal' });
  for (let i = 0; i < n; i++) { const y = p[1] + dir * (.035 + i * .028); k.cyl(col, [p[0], y - .007, p[2]], .03, .014, 10, { bevel: .4, bevel2: true, layer: 'metal' }); }
  k.cyl(C.steelD, [p[0], p[1] + dir * (.04 + n * .028) - (dir < 0 ? .02 : 0), p[2]], .012, .02, 6, { layer: 'metal' });
}
// Blitz-Symbol (flach, auf einer Fläche in der y/z-Ebene des Rahmens, Blick +x)
function boltSign(k, p, s = 1, col = C.yel) {
  k.in(p, 0, () => {
    k.prism(col, [0, -.09 * s, 0], .2 * s, .18 * s, .01, { r: [0, PI / 2, 0], order: 'YXZ' });
    k.prism(C.dark, [.006, -.07 * s, 0], .15 * s, .135 * s, .01, { r: [0, PI / 2, 0], order: 'YXZ' });
    k.prism(col, [.012, -.06 * s, -.005 * s], .03 * s, .06 * s, .01, { r: [0, PI / 2, PI], order: 'YXZ' });
    k.prism(col, [.012, -.005 * s, .005 * s], .03 * s, .06 * s, .01, { r: [0, PI / 2, 0], order: 'YXZ' });
  }, s);
}

// =====================================================================================================================
// Kraftwerk 3×3: Kühlturm mit Dampf, rot-weißer Schornstein mit Rauch, Kesselhaus (Fenster glühen mit der Last),
// Kohlebunker mit Schrägband, Generator mit Schwungrad, Trafo mit Portal und Isolatoren (Kabelanschluss).
const kraftwerk = {
  size: 3,
  build(k) {
    plinth(k, 3, { stripes: false });
    // Kühlturm (Hyperboloid auf schrägen Stützen)
    const tx = -.62, tz = -.58, y0 = .32;
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, b = a + PI / 14; k.beam(C.concrete2, [tx + Math.cos(a) * .6, .06, tz + Math.sin(a) * .6], [tx + Math.cos(b) * .62, y0 + .02, tz + Math.sin(b) * .62], .035); }
    k.cyl(C.dark, [tx, .062, tz], .55, .01, 18, { ao: false });
    const prof = [[.64, 0], [.58, .35], [.47, .95], [.42, 1.35], [.44, 1.62], [.49, 1.78]];
    k.lathe(0xddd6ca, [tx, y0, tz], [...prof, [.45, 1.78], [.39, 1.6], [.38, 1.35], [.43, .95], [.54, .35], [.6, .03]], 20);
    k.lathe(C.red, [tx, y0, tz], [[.443, 1.42], [.446, 1.52]].map(([r, y]) => [r + .012, y]), 20, { jit: 0 });
    k.lathe(C.red, [tx, y0, tz], [[.47, 1.68], [.49, 1.78]].map(([r, y]) => [r + .012, y]), 20, { jit: 0 });
    k.torus(C.concrete2, [tx, y0 + 1.78, tz], .47, .025, 20, { r: [PI / 2, 0, 0], tseg: 4 });
    ladder(k, [tx + .6, .06, tz + .12], .5, -.2, .1, C.yel);
    cloud(k, [tx, y0 + 1.9, tz], 'smokeSteam', 0xf6f6f4, .2);
    // Kesselhaus (Wellblech, Fensterband glüht, Sägezahndach)
    const hx = .38, hz = .3, hw = 1.24, hd = 1.24, hh = .82;
    k.bev(C.steelD, [hx, .06, hz], [hw, .08, hd], .02, { layer: 'metal' });
    k.bev(0x6a7a8a, [hx, .14, hz], [hw - .04, hh, hd - .04], .03);
    for (const a of [0, 1]) face(k, a === 0 ? [hx + hw / 2 - .02, 0, hz] : [hx, 0, hz + hd / 2 - .02], a, () => {
      for (let z = -.55; z <= .55; z += .07) k.box(0x5a6a7a, [.006, .14, z], [.012, hh - .02, .025], { jit: .03 });
      for (const y of [.42, .74]) { k.box(C.dark, [.01, y - .03, 0], [.02, .17, 1.1], { ao: false }); for (let z = -.45; z <= .46; z += .18) k.box(0xe09048, [.014, y + .01, z], [.012, .08, .1], { layer: 'heat', ao: false }); k.box(C.dark, [.02, y + .13, 0], [.02, .02, 1.14], { layer: 'metal' }); }
    });
    fstripes(k, [hx + hw / 2, .2, hz], 0, 1.1, .06); fstripes(k, [hx, .2, hz + hd / 2], 1, 1.1, .06);
    // Kesseltür mit Glut
    face(k, [hx + hw / 2, 0, hz + .2], 0, () => { k.box(0x401c10, [.01, .14, 0], [.02, .26, .28], { ao: false }); k.box(0xff8a30, [.02, .16, 0], [.012, .2, .22], { layer: 'heat', ao: false }); for (let i = 0; i < 4; i++) k.box(C.dark, [.03, .15, -.09 + i * .06], [.012, .24, .02], { layer: 'metal' }); });
    k.in([hx, .14 + hh, hz], 0, () => {
      for (let i = 0; i < 3; i++) { const z = -.42 + i * .41; k.in([0, 0, z], -PI / 2, () => k.wedge(C.dark, [0, 0, 0], .4, .2, hw - .02, { layer: 'metal' })); k.box(0xd89050, [0, .06, z + .195], [hw - .2, .07, .012], { layer: 'heat', ao: false }); }
      k.rivets(C.steel, [-.6, .01, -.62], [.6, .01, -.62], 8, .014);
      k.part('fan', [.3, .22, .1], f => { f.cyl(C.dark, [0, -.04, 0], .17, .04, 14, { layer: 'metal' }); for (let i = 0; i < 5; i++) f.in([0, 0, 0], i * TAU / 5, () => f.boxc(C.steel, [.08, .005, 0], [.15, .01, .05], { layer: 'metal', r: [.3, 0, 0] })); f.cyl(C.red, [0, 0, 0], .03, .03, 8); });
      k.torus(C.steelD, [.3, .2, .1], .18, .02, 16, { r: [PI / 2, 0, 0], layer: 'metal', tseg: 4 });
      beacon(k, [-.5, .0, .5], .12);
    });
    // Schornstein rot-weiß mit Laufstegen und Flugwarnlicht
    const sx = 1.0, sz = -.98;
    k.bev(C.concrete2, [sx, .06, sz], [.36, .14, .36], .03);
    for (let i = 0; i < 8; i++) { const r0 = .15 - i * .007; k.cyl(i % 2 ? C.white : C.red, [sx, .2 + i * .32, sz], r0, .32, 12, { top: (r0 - .007) / r0 }); }
    for (const y of [1.1, 2.0]) { k.cyl(C.dark, [sx, y, sz], .19, .025, 12, { layer: 'metal' }); k.in([sx, 0, sz], 0, () => railing(k, y + .025, .17, .17, C.yel)); }
    k.cyl(C.dark, [sx, 2.76, sz], .11, .05, 12, { layer: 'metal' });
    k.ball(0xff3020, [sx + .08, 2.78, sz], .025, { layer: 'lamp', detail: 1 });
    ladder(k, [sx - .15, .2, sz], 2.5, PI, .08, C.steel);
    smokeStack(k, [sx, 2.84, sz], 'smoke', 0x6a6664);
    // Kohlebunker hinten rechts mit Kohlehaufen und Schrägband zum Kessel
    const bx = -.88, bz = .75;
    k.bev(C.dark, [bx, .06, bz], [.5, .08, .6], .02, { layer: 'metal' });
    for (const [x, z] of [[-.2, -.25], [.2, -.25], [-.2, .25], [.2, .25]]) k.box(C.orangeD, [bx + x, .14, bz + z], [.05, .34, .05], { layer: 'metal' });
    k.in([bx, .48, bz], 0, () => { k.wedge(C.orange, [0, -.18, 0], .48, .18, .56, { r: [0, 0, PI], order: 'XYZ' }); k.bev(C.orange, [0, 0, 0], [.48, .2, .56], .02); for (const s of [-1, 1]) k.box(C.orangeD, [0, .2, s * .27], [.48, .03, .03], { layer: 'metal' }); });
    for (let i = 0; i < 16; i++) k.ball(C.coal, [bx + k.R(-.18, .18), .68 + k.R(0, .06), bz + k.R(-.22, .22)], [k.R(.04, .07), k.R(.03, .05), k.R(.04, .07)], { dod: true, r: [k.R(0, 3), k.R(0, 3), 0] });
    const a0 = [bx + .2, .7, bz - .1], a1 = [hx - hw / 2 + .05, .14 + hh - .05, .05];
    k.beam(C.steelD, a0, a1, .12, { layer: 'metal', d: .16 });
    k.beam(C.rubber, [a0[0], a0[1] + .06, a0[2]], [a1[0], a1[1] + .06, a1[2]], .02, { w: .02, d: .12 });
    k.beam(C.steelD, [a0[0] + .25, .06, a0[2] - .1], [a0[0] + .25, .82, a0[2] - .1], .04, { layer: 'metal' });
    for (let i = 0; i < 4; i++) { const u = .15 + i * .22; k.ball(C.coal, [lerp(a0[0], a1[0], u), lerp(a0[1], a1[1], u) + .1, lerp(a0[2], a1[2], u)], .03, { dod: true }); }
    // Generator mit Schwungrad (Teil 'turb', dreht um x) vor dem Kesselhaus
    const gz = -.5;
    k.bev(C.dark, [.38, .06, gz], [.8, .1, .3], .02, { layer: 'metal' });
    k.cyl(C.green, [.3, .3, gz], .17, .62, 14, { ax: 'x', bevel: .05 });
    for (const x of [.08, .3, .52]) k.cyl(C.greenD, [x, .3, gz], .178, .04, 14, { ax: 'x' });
    k.cyl(C.steel, [.72, .3, gz], .04, .12, 8, { ax: 'x', layer: 'metal' });
    k.part('turb', [.8, .3, gz], f => { f.cyl(C.dark, [0, 0, 0], .2, .05, 16, { ax: 'x', layer: 'metal' }); for (let i = 0; i < 4; i++) f.in([0, 0, 0], 0, () => f.box(C.red, [0, -.01, 0], [.03, .2, .03], { r: [i * PI / 2, 0, 0] })); f.cyl(C.yel, [.03, 0, 0], .04, .02, 8, { ax: 'x' }); });
    k.pipe(C.copper, [[.05, .45, gz], [.05, .7, gz], [-.05, .7, gz + .3]], .025, { layer: 'metal' });
    // Dampfleitung Kessel → Kühlturm
    k.pipe(C.steel, [[hx - hw / 2, .5, -.2], [-.3, .5, -.2], [-.3, .5, tz + .35], [tx + .3, .38, tz + .35]], .045, { layer: 'metal', flange: C.steelD });
    for (const p of [[-.3, .06, -.2], [-.3, .06, -.4]]) k.box(C.steelD, p, [.04, .44, .04], { layer: 'metal' });
    // Trafo mit Kühlrippen, drei Durchführungen, Portal mit Isolator (Kabelanschluss)
    const qx = .2, qz = -1.12;
    k.bev(C.concrete2, [qx, .06, qz], [.66, .05, .36], .015);
    k.bev(0x6a8a5a, [qx, .11, qz], [.42, .34, .24], .03);
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) k.box(0x5a7a4a, [qx - .18 + i * .06, .13, qz + s * .135], [.012, .28, .04]);
    for (let i = 0; i < 3; i++) insulator(k, [qx - .12 + i * .12, .45, qz], 3, 1, 0x8a6a58);
    boltSign(k, [qx + .212, .3, qz], .5);
    for (const x of [qx - .32, qx + .32]) { k.beam(C.steel, [x, .06, qz + .12], [x, 1.12, qz + .12], .04, { layer: 'metal' }); k.beam(C.steelD, [x, .4, qz + .12], [x + (x < qx ? .1 : -.1), .8, qz + .12], .015, { layer: 'metal' }); }
    k.beam(C.steel, [qx - .34, 1.12, qz + .12], [qx + .34, 1.12, qz + .12], .045, { layer: 'metal' });
    insulator(k, [qx, 1.1, qz + .12], 3, -1, 0x8a6a58);
    for (let i = 0; i < 3; i++) { const x = qx - .12 + i * .12; k.beam(C.copper, [x, .58, qz], [qx + (i - 1) * .03, .99, qz + .12], .008, { layer: 'metal' }); }
    // Zaun um den Trafo (gelb-schwarz)
    for (const z of [qz - .17]) for (let i = 0; i <= 4; i++) k.box(i % 2 ? C.dark : C.yel, [qx - .32 + i * .16, .06, z], [.02, .22, .02], { layer: 'metal' });
    k.box(C.yel, [qx, .26, qz - .17], [.66, .015, .015], { layer: 'metal' });
    // Einlässe für Kohle/Öl (alle Seiten), Pult
    intake(k, 0, 1.44, -.25, C.steelD); intake(k, 2, 1.44, .25, C.steelD); intake(k, 1, 1.44, .0, C.steelD); intake(k, 3, 1.44, -.45, C.steelD);
    panel(k, [1.18, .06, .95], 0, C.steelD);
    return { badge: [1.3, .065, .25], heatColor: 0xff8a30, spots: { cable: [qx, .96, qz + .12] } };
  },
  anim(c, t, s) {
    const P = c.P, L = clamp(s.load ?? c.act), st = c.store;
    st.L = lerp(st.L ?? L, L, 1 - Math.exp(-2 * c.dt));
    const l = st.L;
    c.heat.heat = .06 + .5 * l * (.88 + .12 * Math.sin(t * 6.1) * Math.sin(t * 2.3));
    st.a = (st.a || 0) + c.dt * (1 + 14 * l); P.turb.rotation.x = st.a; P.fan.rotation.y = st.a * .8 + t * .5;
    animSmoke(P, 'smoke', t, .25 + .95 * l, 1.4, [.35, .1]);
    animCloud(P, 'smokeSteam', t * .55, .2 + 1.1 * l, 1.6, [.4, .1], .4);
    c.lamp.color.setRGB(1.6, .2, .1).multiplyScalar(Math.sin(t * 3) > .3 ? 2.2 : .3);
  },
};

// =====================================================================================================================
// Solarfeld 2×2: zwei Nachführ-Reihen (Teile 'pan0', 'pan1', drehen um z), Wechselrichter, Anschlussmast
function solarPanel(k, L, W) {
  k.bev(C.steel, [0, -.012, 0], [W, .025, L], .008, { layer: 'metal' });
  k.box(0x1a2a5a, [0, .012, 0], [W - .04, .008, L - .04], { jit: 0 });
  const nx = 4, nz = 10;
  for (let i = 1; i < nx; i++) k.box(0x8aa0d0, [-W / 2 + .02 + i * (W - .04) / nx, .02, 0], [.006, .002, L - .04], { jit: 0, ao: false });
  for (let j = 1; j < nz; j++) k.box(0x8aa0d0, [0, .02, -L / 2 + .02 + j * (L - .04) / nz], [W - .04, .002, .006], { jit: 0, ao: false });
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (k.rand() < .3) k.box(0x24386e, [-W / 2 + .02 + (i + .5) * (W - .04) / nx, .021, -L / 2 + .02 + (j + .5) * (L - .04) / nz], [(W - .04) / nx - .012, .001, (L - .04) / nz - .012], { jit: .08, ao: false });
  k.box(0xbfe6f2, [0, .024, 0], [W - .03, .004, L - .03], { layer: 'glass', ao: false });
  k.cyl(C.steelD, [0, -.05, 0], .03, L - .1, 8, { ax: 'z', layer: 'metal' });
  for (const z of [-L / 2 + .2, 0, L / 2 - .2]) k.box(C.steelD, [0, -.045, z], [W - .1, .025, .03], { layer: 'metal' });
}
const solar = {
  size: 2,
  build(k) {
    plinth(k, 2, { stripes: false });
    k.bev(0xa49c8c, [-.02, .06, 0], [1.8, .025, 1.8], .01, { ao: false });                        // Kiesbett
    for (let i = 0; i < 30; i++) k.ball(0x8a8478, [k.R(-.85, .85), .085, k.R(-.85, .85)], [.025, .012, .02], { detail: 0, ao: false });
    const rows = [-.42, .4], L = 1.62, W = .7, py = .5;
    rows.forEach((x, i) => {
      for (const z of [-.62, 0, .62]) { k.bev(C.concrete2, [x, .06, z], [.12, .06, .12], .015); k.box(C.steel, [x, .12, z], [.05, py - .14, .05], { layer: 'metal' }); }
      k.bev(C.dark, [x + .07, .3, 0], [.1, .12, .14], .02, { layer: 'metal' });                // Antrieb
      k.ball(0x4aff7a, [x + .121, .38, .04], .01, { layer: 'glow', detail: 0 });
      k.part('pan' + i, [x, py, 0], p => solarPanel(p, L, W));
    });
    k.pipe(C.rubber, [[-.35, .25, .1], [-.35, .1, .3], [.3, .1, .3], [.75, .1, .55]], .015, { caps: false });
    // Wechselrichter-Schrank
    k.in([.82, .06, -.72], 0, () => { k.bev(0xe6e2d8, [0, 0, 0], [.22, .38, .26], .02); k.box(C.dark, [.112, .2, 0], [.01, .1, .14], { ao: false }); k.box(0x4aff7a, [.118, .28, -.06], [.004, .02, .02], { layer: 'lamp' });
      for (let i = 0; i < 4; i++) k.box(C.steelD, [.112, .06 + i * .03, 0], [.008, .012, .16], { layer: 'metal' }); boltSign(k, [.112, .34, .07], .3); });
    // Anschlussmast mit Isolator
    k.in([.84, .06, .84], 0, () => { k.cyl(C.woodD, [0, 0, 0], .035, .78, 8); k.beam(C.steel, [0, .74, -.1], [0, .74, .1], .025, { layer: 'metal' }); insulator(k, [0, .76, 0], 2, 1, 0x8a6a58); k.cyl(C.dark, [0, .3, .04], .03, .12, 8, { layer: 'metal' }); });
    k.beam(C.rubber, [.84, .4, .84], [.84, .08, .6], .012);
    return { badge: [-.9, .086, -.3], small: true, spots: { cable: [.84, .92, .84] } };
  },
  anim(c, t, s) {
    const st = c.store, storm = !!s.storm;
    // Sonne wandert langsam; die Reihen folgen träge (Motor ~0,25 rad/s), im Sturm flach (Sicherheitsstellung)
    const want = storm ? 0 : .55 * Math.sin(t * .045 + .6) + (s.sunAngle ?? 0);
    for (let i = 0; i < 2; i++) { const k = 'a' + i, cur = st[k] ?? want, d = clamp(want - cur, -.25 * c.dt, .25 * c.dt) * (i ? .9 : 1); st[k] = cur + d; c.P['pan' + i].rotation.z = st[k] + Math.sin(t * 7 + i) * .002 * (storm ? 1 : 0); }
    const sun = s.sun ?? 1;
    c.lamp.color.setRGB(.3, 1, .45).multiplyScalar(storm ? .2 : (1.2 + 1.4 * sun) * (Math.sin(t * 2) > -.6 ? 1 : .3));
  },
};

// =====================================================================================================================
// Strommast 1×1: Gittermast, Querträger mit Isolatorketten, Spitze mit Anschluss (Kabel), Warnschild, Flugwarnlicht
const mast = {
  size: 1, aoH: .5,
  build(k) {
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.bev(C.concrete2, [x * .3, 0, z * .3], [.14, .08, .14], .02);
    lattice(k, .3, .1, .06, 1.62, C.steel, C.steelD);
    k.bev(C.steelD, [0, 1.6, 0], [.24, .04, .24], .01, { layer: 'metal' });
    // Querträger (entlang z) mit Streben
    k.beam(C.steel, [0, 1.66, -.44], [0, 1.66, .44], .05, { layer: 'metal' });
    for (const s of [-1, 1]) { k.beam(C.steelD, [0, 1.42, s * .1], [0, 1.64, s * .4], .025, { layer: 'metal' }); insulator(k, [0, 1.64, s * .4], 4, -1); }
    // Spitze
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.beam(C.steel, [x * .1, 1.64, z * .1], [0, 1.92, 0], .03, { layer: 'metal' });
    insulator(k, [0, 1.92, 0], 3, 1, 0x8a6a58);
    k.ball(0xff3020, [.06, 1.7, 0], .022, { layer: 'lamp', detail: 1 });
    // Warnschild + Steigbügel
    face(k, [.235, 0, 0], 0, () => { k.bev(0xffffff, [0, .5, 0], [.012, .14, .14], .004, { r: [0, 0, 0] }); boltSign(k, [.008, .65, 0], .55, C.red); });
    ladder(k, [-.22, .1, 0], 1.3, PI, .08, C.steelD);
    for (let i = 0; i < 3; i++) k.ball(0x6a7a4a, [k.R(-.4, .4), .03, k.R(-.4, .4)], [.06, .03, .05], { detail: 0 });
    return { spots: { cable: [0, 2.04, 0] } };
  },
  anim(c, t, s) {
    const on = (s.power ?? 1) > .05;
    c.lamp.color.setRGB(1.6, .15, .1).multiplyScalar(on ? (Math.sin(t * 2.4) > .5 ? 2.4 : .3) : .15);
  },
};

// =====================================================================================================================
// Heizer 1×1: Rippen-Heizkörper (glüht), Kessel mit Manometer, Wärmeflimmern (Teil 'fxShimmer', eigenes Material)
const shimmerMat = (() => {
  const m = new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime; varying vec3 vLP;
float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ float a = atan(vLP.z, vLP.x); vec2 p = vec2(a * 2.2 + sin(vLP.y * 9. - uTime * 3.) * .5, vLP.y * 7. - uTime * 2.4);
  float w = smoothstep(.55, .95, vn(p)) * (1. - smoothstep(.2, 1., vLP.y)) * smoothstep(0., .08, vLP.y);
  diffuseColor.a *= w * .55; }`);
  };
  m.customProgramCacheKey = () => 'shimmer1'; return m;
})();
const heizer = {
  size: 1, aoH: .4,
  mats: { shimmer: shimmerMat },
  build(k) {
    k.bev(C.concrete, [0, 0, 0], [.9, .05, .9], .02, { ao: false });
    k.stripes([0, .05, -.4], .8, .05, .004);
    // Heizkörper: Sockel, 9 Rippen (glühen), Deckel, Füße
    k.bev(C.dark, [0, .05, 0], [.56, .08, .36], .02, { layer: 'metal' });
    for (let i = 0; i < 9; i++) { const x = -.24 + i * .06; k.bev(0x8a4a30, [x, .13, 0], [.04, .44, .3], .012, { layer: 'heat' }); }
    k.bev(C.dark, [0, .57, 0], [.58, .05, .38], .015, { layer: 'metal' });
    k.rivets(C.steel, [-.26, .62, .17], [.26, .62, .17], 6, .012);
    for (const s of [-1, 1]) k.pipe(C.copper, [[s * .29, .2, -.1], [s * .36, .2, -.1], [s * .36, .5, -.1], [s * .29, .5, -.1]], .022, { layer: 'metal' });
    // Kessel mit Manometer und Ventilrad
    k.cyl(C.red, [.0, .62, -.02], .1, .14, 12, { layer: 'metal', bevel: .3 });
    k.in([0, .7, .085], 0, () => { k.cyl(C.dark, [0, 0, 0], .045, .02, 12, { ax: 'z', layer: 'metal' }); k.cyl(0xf6f0e0, [0, 0, .012], .036, .004, 12, { ax: 'z', layer: 'glow' }); });
    k.part('needle', [0, .7, .1], s => s.box(0xe03a2a, [0, 0, 0], [.004, .03, .004], { ao: false }));
    k.torus(C.red, [.08, .78, -.02], .04, .008, 10, { layer: 'metal' });
    k.cyl(C.steelD, [-.06, .76, -.02], .015, .1, 6, { layer: 'metal' }); k.cyl(C.dark, [-.06, .86, -.02], .025, .02, 8, { layer: 'metal' });
    k.ball(0xffffff, [.2, .68, .12], .02, { layer: 'lamp', detail: 1 });
    // Flimmern (Zylinder ohne Deckel, eigenes Material)
    k.part('fxShimmer', [0, .6, 0], s => s.add(new THREE.CylinderGeometry(.3, .26, 1, 16, 4, true).translate(0, .5, 0), 0xffffff, [0, 0, 0], [1, 1, 1], { layer: 'shimmer', ao: false, jit: 0 }));
    return { spots: { cable: [.2, .7, .12] }, heatColor: 0xff5a1a };
  },
  anim(c, t, s) {
    const p = clamp(s.power ?? (s.busy !== undefined ? c.act : 1)), st = c.store;
    st.p = lerp(st.p ?? p, p, 1 - Math.exp(-1.5 * c.dt));
    c.heat.heat = .05 + .95 * st.p * (.9 + .1 * Math.sin(t * 3.3));
    c.P.fxShimmer.scale.set(1, .4 + .7 * st.p, 1); c.P.fxShimmer.visible = st.p > .08;
    c.P.needle.rotation.z = lerp(1.2, -1.1, st.p) + Math.sin(t * 5) * .03 * st.p;
    c.lamp.color.setRGB(1, .45, .1).multiplyScalar(.3 + 2.4 * st.p);
  },
};

// =====================================================================================================================
// Drohnenhafen 2×2: Landeplattform mit Ring und Kreuz, Lauflichter (Teile 'li0…7'), geparkte Drohne (Teil 'drone',
// Rotoren 'rot0…3'), Leitstand mit drehendem Radar ('radar'), Windsack ('sock'), Ausgaberutsche vorn.
const drohnenhafen = {
  size: 2,
  build(k) {
    plinth(k, 2); chute(k, 2, .5, C.teal);
    const px = -.22, pz = -.2, R = .6, H = .5;
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; k.bev(C.steelD, [px + Math.cos(a) * .4, .06, pz + Math.sin(a) * .4], [.08, H - .06, .08], .015, { layer: 'metal' }); }
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4, b = a + PI / 2; k.beam(C.steel, [px + Math.cos(a) * .4, .1, pz + Math.sin(a) * .4], [px + Math.cos(b) * .4, H - .05, pz + Math.sin(b) * .4], .018, { layer: 'metal' }); }
    k.cyl(C.dark, [px, H, pz], R, .06, 8, { layer: 'metal', r: [0, PI / 8, 0] });
    k.cyl(0x3a3e46, [px, H + .06, pz], R - .03, .012, 8, { r: [0, PI / 8, 0] });
    k.ring(C.yel, [px, H + .072, pz], .4, .35, .006, 32, { ao: false, jit: 0 });
    for (const r of [0, PI / 2]) k.box(0xffffff, [px, H + .072, pz], [.36, .006, .05], { r: [0, r, 0], ao: false, jit: 0 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + PI / 8, x = px + Math.cos(a) * (R - .08), z = pz + Math.sin(a) * (R - .08);
      k.box(C.dark, [x, H + .066, z], [.05, .01, .05], { layer: 'metal' });
      k.part('li' + i, [x, H + .08, z], s => s.ball(0x6ae0ff, [0, 0, 0], .022, { layer: 'glow', detail: 1 })); }
    // Geländer an zwei Seiten + Treppe
    k.in([px, 0, pz], PI / 8, () => { for (const a of [2, 3, 4]) { const a0 = a * PI / 4, a1 = (a + 1) * PI / 4; k.beam(C.yel, [Math.cos(a0) * R, H + .2, Math.sin(a0) * R], [Math.cos(a1) * R, H + .2, Math.sin(a1) * R], .015, { layer: 'metal' }); k.box(C.yel, [Math.cos(a0) * R, H + .06, Math.sin(a0) * R], [.015, .15, .015], { layer: 'metal' }); } });
    for (let i = 0; i < 5; i++) k.box(C.steel, [px + .5 + i * .0, .06 + i * .09, pz + .45 + i * .06], [.18, .02, .07], { layer: 'metal' });
    // geparkte Drohne
    k.part('drone', [px, H + .072, pz], d => droneKit(d, { accent: C.teal }), PI / 4);
    // Leitstand mit Glas und Radar
    k.in([.55, .06, -.62], 0, () => {
      k.bev(C.teal, [0, 0, 0], [.42, .4, .4], .03);
      for (const a of [0, 1]) face(k, a ? [0, 0, .2] : [.21, 0, 0], a, () => { k.box(0xfff4d0, [-.01, .2, 0], [.01, .14, .26], { layer: 'glow' }); k.box(C.glass, [.004, .2, 0], [.01, .14, .26], { layer: 'glass' }); });
      k.bev(C.tealD, [0, .4, 0], [.46, .05, .44], .015);
      k.cyl(C.steelD, [0, .45, 0], .02, .12, 6, { layer: 'metal' });
      k.part('radar', [0, .58, 0], r => { r.box(C.dark, [0, 0, 0], [.04, .03, .04], { layer: 'metal' }); r.bev(C.white, [0, .03, 0], [.04, .08, .26], .01, { r: [0, 0, .25] }); r.ball(0xff3a2a, [0, .12, .12], .012, { layer: 'glow', detail: 0 }); });
      beacon(k, [-.15, .45, -.12], .06);
    });
    // Windsack
    k.cyl(C.steel, [-.86, .06, .78], .018, .7, 6, { layer: 'metal' });
    k.part('sock', [-.86, .74, .78], s => { for (let i = 0; i < 4; i++) s.cyl(i % 2 ? 0xffffff : C.orange, [.04 + i * .055, 0, 0], .045 - i * .006, .055, 8, { ax: 'x', top: .9 }); s.torus(C.steelD, [0, 0, 0], .045, .006, 10, { r: [0, PI / 2, 0], layer: 'metal' }); });
    // Ladesäule mit Kabel, Teilekisten
    k.in([.1, .06, .62], 0, () => { k.bev(C.white, [0, 0, 0], [.12, .36, .12], .02); k.box(0x4aff7a, [.062, .25, 0], [.004, .06, .05], { layer: 'glow' }); boltSign(k, [.062, .16, 0], .25, C.teal); });
    k.pipe(C.rubber, [[.1, .3, .55], [-.05, .35, .3], [px + .25, H + .02, pz + .3]], .012, { caps: false });
    for (const [x, z] of [[-.75, .25], [-.62, .45]]) k.in([x, .06, z], k.R(-.3, .3), () => { k.bev(C.wood, [0, 0, 0], [.16, .12, .16], .015); k.box(C.woodD, [0, .06, 0], [.165, .02, .165]); });
    intake(k, 2, .66, -.2, C.tealD); intake(k, 1, .66, -.4, C.tealD); intake(k, 3, .66, .1, C.tealD);
    return { badge: [.5, .065, .1], spots: { cable: [.55, .5, -.62], pad: [px, H + .072, pz] } };
  },
  anim(c, t, s) {
    const P = c.P, st = c.store, docked = s.docked ?? 1, busy = c.act;
    for (let i = 0; i < 8; i++) { const f = ((t * 1.4 - i / 8) % 1 + 1) % 1; P['li' + i].scale.setScalar(.6 + (busy > .1 ? 1.2 * Math.pow(1 - f, 6) : .3 * (.5 + .5 * Math.sin(t * 2)))); }
    P.drone.visible = docked > 0;
    const sp = docked > 0 ? (busy > .1 ? 1 : .08) : 0; st.r = (st.r || 0) + c.dt * (3 + 45 * sp);
    for (let i = 0; i < 4; i++) if (P['rot' + i]) P['rot' + i].rotation.y = st.r * (i % 2 ? -1 : 1);
    P.drone.position.y = busy > .1 ? .02 + Math.sin(t * 2.5) * .01 : 0;
    P.radar.rotation.y = t * 1.6;
    P.sock.rotation.y = -.6 + Math.sin(t * .7) * .4; P.sock.rotation.z = -.25 + Math.sin(t * 2.3) * .08;
  },
};

export const POWER_DEFS = { kraftwerk, solar, mast, heizer, drohnenhafen };
export const POWER_TYPES = Object.keys(POWER_DEFS);

// =====================================================================================================================
// Kabel mit Durchhang zwischen zwei Weltpunkten a, b ([x,y,z]). sag = Durchhang in Einheiten (Standard: 6 % der Länge + 0,08).
// cableGeometry(a, b, o) → BufferGeometry (dünner Schlauch, 6 Kanten); makeCable(a, b, o) → Mesh mit setEnds(a, b), update(t) (leichtes Schwingen im Wind).
// CableSet: viele Kabel in einem Draw Call: set([[a, b], …]).
export const cableMat = new THREE.MeshStandardMaterial({ color: 0x24262c, roughness: .55, metalness: .3, flatShading: false });
function cablePts(a, b, sag, n, sway = 0) {
  const pts = [], L = Math.hypot(b[0] - a[0], b[2] - a[2]), s = sag ?? (.08 + .06 * L);
  const nx = -(b[2] - a[2]) / (L || 1), nz = (b[0] - a[0]) / (L || 1);
  for (let i = 0; i <= n; i++) { const u = i / n, d = 4 * u * (1 - u);
    pts.push(new THREE.Vector3(lerp(a[0], b[0], u) + nx * sway * d, lerp(a[1], b[1], u) - s * d, lerp(a[2], b[2], u) + nz * sway * d)); }
  return pts;
}
export function cableGeometry(a, b, o = {}) {
  const r = o.radius ?? .018, seg = o.seg ?? 14, rad = 5, pts = cablePts(a, b, o.sag, seg, o.sway || 0);
  const pos = [], idx = [], up = new THREE.Vector3(0, 1, 0), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    T.subVectors(pts[Math.min(seg, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    N.crossVectors(T, up); if (N.lengthSq() < 1e-6) N.set(1, 0, 0); N.normalize(); B.crossVectors(N, T).normalize();
    for (let j = 0; j < rad; j++) { const ang = j / rad * TAU, c = Math.cos(ang) * r, s = Math.sin(ang) * r;
      pos.push(pts[i].x + N.x * c + B.x * s, pts[i].y + N.y * c + B.y * s, pts[i].z + N.z * c + B.z * s); }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a0 = i * rad + j, a1 = i * rad + (j + 1) % rad, b0 = a0 + rad, b1 = a1 + rad; idx.push(a0, b0, a1, a1, b0, b1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function makeCable(a, b, o = {}) {
  const mesh = new THREE.Mesh(cableGeometry(a, b, o), o.material || cableMat); mesh.castShadow = true; mesh.receiveShadow = false; mesh.name = 'cable';
  let A = [...a], Bp = [...b], ph = Math.random() * 10;
  mesh.userData.setEnds = mesh.setEnds = (a2, b2) => { A = [...a2]; Bp = [...b2]; mesh.geometry.dispose(); mesh.geometry = cableGeometry(A, Bp, o); };
  // Wind: alle ~0,25 s neu (billig), Ausschlag o.wind (0…1)
  let last = -1;
  mesh.update = (t, wind = o.wind ?? 0) => { if (!wind || t - last < .25) return; last = t; mesh.geometry.dispose(); mesh.geometry = cableGeometry(A, Bp, { ...o, sway: Math.sin(t * 1.3 + ph) * .05 * wind }); };
  mesh.dispose = () => mesh.geometry.dispose();
  return mesh;
}
export class CableSet {
  constructor(parent, o = {}) { this.parent = parent; this.o = o; this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), o.material || cableMat); this.mesh.castShadow = true; this.mesh.name = 'cables'; parent.add(this.mesh); this.key = ''; }
  // pairs: [[a, b], …] mit a, b = [x,y,z] (z. B. aus b.anchor('cable'))
  set(pairs) {
    const key = pairs.map(([a, b]) => a.concat(b).map(v => v.toFixed(2)).join(',')).join(';'); if (key === this.key) return; this.key = key;
    const geos = pairs.map(([a, b]) => cableGeometry(a, b, this.o).toNonIndexed());
    this.mesh.geometry.dispose();
    this.mesh.geometry = geos.length ? mergeGeos(geos) : new THREE.BufferGeometry(); this.mesh.visible = geos.length > 0;
    geos.forEach(g => g.dispose());
  }
  dispose() { this.parent.remove(this.mesh); this.mesh.geometry.dispose(); }
}
function mergeGeos(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0;
  for (const g of list) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.computeBoundingSphere(); return g;
}
