// Cogtopia – gemeinsame Bauteile aller Gebäude (Farben, Sockel, Rutsche, Einlass, Lampe, Pult, Rauch, Gitter, Leiter, Geländer, Ziegel).
// Bauen im lokalen Rahmen des Gebäudes (Mitte im Ursprung, Ausgabe nach +x). Genutzt von buildings.js, power.js, wonder.js, upgrades.js.
import { PI, TAU, BELT_Y } from '../kit.js';

export const OUT_INDEX = n => Math.floor(n / 2);
// ---------- Farben ----------
export const C = {
  concrete: 0xc2baab, concrete2: 0xa89f90, seam: 0x8e8678, steel: 0x9aa2ac, steelD: 0x5c626c, dark: 0x34373e, rubber: 0x26282c, black: 0x1a1b1f,
  yel: 0xf2c230, orange: 0xe8742a, orangeD: 0xb85a20, red: 0xd2463a, brick: 0xb44c3a, brick2: 0xa44234, mortar: 0x8a7a6c, blue: 0x3a78c8, blueD: 0x2a5a9a,
  teal: 0x26a296, tealD: 0x1c7a72, purple: 0x7a5ac8, purpleD: 0x5a3e98, green: 0x4aa046, greenD: 0x357a32, white: 0xeef0f2, cream: 0xf4ecd8,
  pink: 0xe25a9a, pinkD: 0xb03e78, wood: 0xb07a44, woodD: 0x8a5a30, copper: 0xd8783a, brass: 0xd8aa40, glass: 0xbfe6f2, coal: 0x2a2826, mint: 0x7ae0b8,
};
export const LEVEL_C = [0x8a8a8a, 0x9a9aa2, 0xcd7f32, 0xc8ccd6, 0xffc23a, 0xff6ad5];

// ---------- gemeinsame Bauteile ----------
// Wandrahmen: Außenseite zeigt in Richtung a (0 = +x, 1 = +z, 2 = −x, 3 = −z), lokale x = nach außen, z = entlang der Wand
export const faceRot = a => [0, -PI / 2, PI, PI / 2][a];
export function face(k, p, a, fn) { k.in(p, faceRot(a), fn); }

// Betonsockel n×n mit Fugen, Ecken-Bolzen, Warnstreifen an der Vorderkante
export function plinth(k, n, o = {}) {
  const s = n - .06, h = o.h ?? .06;
  k.bev(C.concrete, [0, 0, 0], [s, h, s], .025, { ao: false, shade: .98 });
  for (let i = 1; i < n; i++) { const v = -n / 2 + i; k.box(C.seam, [v, h - .004, 0], [.012, .006, s - .06], { ao: false }); k.box(C.seam, [0, h - .004, v], [s - .06, .006, .012], { ao: false }); }
  for (const x of [-1, 1]) for (const z of [-1, 1]) { k.cyl(C.steelD, [x * (s / 2 - .06), h, z * (s / 2 - .06)], .022, .012, 6, { layer: 'metal' }); }
  const cz = o.cz ?? (OUT_INDEX(n) + .5 - n / 2);
  if (o.stripes !== false) for (const [za, zb] of [[-s / 2 + .1, cz - .3], [cz + .3, s / 2 - .1]]) if (zb - za > .1) k.stripes([s / 2 - .07, h, (za + zb) / 2], zb - za, .07, .006, { r: [0, PI / 2, 0] });
  // Gebrauchsspuren: Ölflecken, Kratzer
  for (let i = 0; i < n * 2; i++) k.cyl(0x7a7468, [k.R(-s / 2 + .15, s / 2 - .15), h, k.R(-s / 2 + .15, s / 2 - .15)], k.R(.03, .08), .003, 7, { ao: false, jit: .1 });
}
// Ausgabe-Rutsche an der Vorderkante (x = n/2) bei z = zc: Gehäuse, dunkle Öffnung, Gummilappen (Teil 'flap'), grüner Pfeil
export function chute(k, n, zc, body = C.steel) {
  const x = n / 2, y0 = BELT_Y - .03;
  k.bev(C.steelD, [x - .2, 0, zc], [.36, y0, .5], .02, { layer: 'metal' });                // Unterbau
  k.box(C.rubber, [x - .17, y0, zc], [.34, .012, .36]);                                       // Gleitbahn
  for (const s of [-1, 1]) { k.bev(body, [x - .2, y0, zc + s * .22], [.36, .3, .05], .012, { layer: 'metal' }); k.stripes([x - .2, y0 + .3, zc + s * .22], .34, .05, .004); }
  k.bev(body, [x - .26, y0 + .26, zc], [.26, .08, .5], .02, { layer: 'metal' });           // Haube
  k.box(C.black, [x - .36, y0, zc], [.02, .26, .38], { ao: false });                          // Öffnung (dunkel)
  k.part('flap', [x - .14, y0 + .26, zc], s => { for (let i = 0; i < 4; i++) s.box(C.rubber, [0, -.2, -.135 + i * .09], [.012, .2, .08], { ao: false, jit: .08 }); });
  // grüner Pfeil (leuchtet) auf der Haube
  k.in([x - .2, y0 + .345, zc], 0, () => { k.box(0x3adf6a, [-.02, 0, 0], [.08, .008, .03], { layer: 'glow' }); k.prism(0x3adf6a, [.04, 0, 0], .07, .008, .07, { layer: 'glow', r: [0, PI / 2, 0], order: 'YXZ' }); });
}
// Einlass-Klappe an einer Seite (Pfeil nach innen): a = Seite, w = Abstand der Wand von der Mitte
export function intake(k, a, w, z = 0, col = C.steel) {
  face(k, [0, 0, 0], a, () => {
    k.bev(col, [w - .02, BELT_Y - .04, z], [.1, .3, .42], .02, { layer: 'metal' });
    k.box(C.black, [w + .03, BELT_Y - .01, z], [.012, .2, .3], { ao: false });
    k.in([w + .042, BELT_Y + .26, z], 0, () => { k.prism(C.yel, [0, -.035, 0], .07, .06, .008, { r: [PI / 2, 0, PI], order: 'XYZ', layer: 'glow', jit: 0 }); });
  });
}
// Warnstreifen auf einer senkrechten Fläche (Seite a): fstripes = waagrechtes Band (L entlang der Wand, w hoch), vstripes = senkrecht (L hoch, w breit)
export function fstripes(k, p, a, L, w) { face(k, p, a, () => k.in([0, 0, 0], PI / 2, () => k.stripes([0, 0, 0], L, w, .006, { r: [PI / 2, 0, 0] }))); }
export function vstripes(k, p, a, L, w) { face(k, p, a, () => k.stripes([0, 0, 0], L, w, .006, { r: [0, 0, -PI / 2] })); }
// Statuslampe (Ebene 'lamp' → je Gebäude eigenes Material)
export function beacon(k, p, h = .14) {
  k.cyl(C.steelD, p, .018, h, 6, { layer: 'metal' });
  k.cyl(C.dark, [p[0], p[1] + h, p[2]], .045, .03, 10, { layer: 'metal' });
  k.cyl(0xffffff, [p[0], p[1] + h + .03, p[2]], .036, .05, 10, { layer: 'lamp', bevel: .4 });
  k.cyl(C.dark, [p[0], p[1] + h + .08, p[2]], .03, .012, 10, { layer: 'metal' });
}
// Steuerpult mit Knöpfen und Fortschrittsbalken (Teil 'bar', Skala x)
export function panel(k, p, ry = 0, body = C.steelD) {
  k.in(p, ry, () => {
    k.bev(body, [0, 0, 0], [.16, .34, .26], .02, { layer: 'metal' });
    k.in([0, .34, 0], 0, () => {
      k.bev(C.dark, [0, -.04, 0], [.2, .06, .3], .015, { r: [0, 0, .5] });
      k.box(0x1a2a22, [.012, .025, 0], [.11, .01, .22], { r: [0, 0, .5], ao: false });
      k.part('bar', [.02, .035, -.1], s => s.box(0x5aff8a, [0, 0, .1], [.03, .006, .2], { layer: 'glow', ao: false }), [0, 0, .5]);
      for (const [i, c] of [[0, 0xff4a3a], [1, 0x4aff7a], [2, 0xffd040]]) k.cyl(c, [-.05, .012, -.08 + i * .08], .018, .02, 8, { layer: 'glow', r: [0, 0, .5] });
    });
  });
}
// kleine Rauchwolken (Teil 'smoke'): vier Bälle, die nach oben ziehen
export function smokeStack(k, p, name = 'smoke', col = 0xe8e4de) {
  k.part(name, p, s => { for (let i = 0; i < 4; i++) s.part(name + i, [0, 0, 0], q => { q.ball(col, [0, 0, 0], .1, { detail: 1, ao: false, jit: .02 }); q.ball(col, [.06, .03, .03], .07, { detail: 1, ao: false, jit: .02 }); q.ball(col, [-.05, .02, -.04], .065, { detail: 1, ao: false, jit: .02 }); }); });
}
export function animSmoke(P, name, t, amt, rise = .9, drift = [.25, .1]) {
  for (let i = 0; i < 4; i++) {
    const o = P[name + i]; if (!o) continue; const f = (t * .45 + i / 4) % 1;
    o.position.set(drift[0] * f + Math.sin(t * 1.3 + i) * .03, f * rise, drift[1] * f);
    const sc = amt * Math.sin(Math.min(1, f * 1.15) * PI) * (.6 + f * .9); o.scale.setScalar(Math.max(.001, sc)); o.visible = sc > .01;
  }
}
// Gitter-Turm (Bohrer): vier Pfosten von unten (b) nach oben (t), Kreuzstreben
export function lattice(k, b, tp, y0, y1, col, brace) {
  const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [x, z] of P) k.beam(col, [x * b, y0, z * b], [x * tp, y1, z * tp], .06, { layer: 'metal' });
  const lv = 3;
  for (let i = 0; i < lv; i++) {
    const ya = y0 + (y1 - y0) * i / lv, yb = y0 + (y1 - y0) * (i + 1) / lv, wa = b + (tp - b) * i / lv, wb = b + (tp - b) * (i + 1) / lv;
    for (let j = 0; j < 4; j++) { const [x1, z1] = P[j], [x2, z2] = P[(j + 1) % 4];
      if (j !== 0 || i > 0) k.beam(brace, [x1 * wa, ya, z1 * wa], [x2 * wb, yb, z2 * wb], .022, { layer: 'metal' });
      k.beam(brace, [x1 * wb, yb, z1 * wb], [x2 * wb, yb, z2 * wb], .026, { layer: 'metal' }); }
  }
}
// Leiter (entlang y) an Stelle p, Breite w, Höhe h, Richtung ry
export function ladder(k, p, h, ry = 0, w = .16, col = C.yel) {
  k.in(p, ry, () => { for (const z of [-w / 2, w / 2]) k.box(col, [0, 0, z], [.02, h, .02], { layer: 'metal' }); for (let y = .08; y < h; y += .09) k.box(col, [0, y, 0], [.014, .014, w], { layer: 'metal' }); });
}
// Geländer um ein Rechteck (Halbmaße hx, hz) auf Höhe y
export function railing(k, y, hx, hz, col = C.yel, skip = -1) {
  const P = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
  for (let j = 0; j < 4; j++) { if (j === skip) continue; const a = P[j], b = P[(j + 1) % 4];
    k.beam(col, [a[0], y + .16, a[1]], [b[0], y + .16, b[1]], .018, { layer: 'metal' }); k.beam(col, [a[0], y + .08, a[1]], [b[0], y + .08, b[1]], .012, { layer: 'metal' });
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / .25)); for (let i = 0; i <= n; i++) { const t = i / n; k.box(col, [a[0] + (b[0] - a[0]) * t, y, a[1] + (b[1] - a[1]) * t], [.018, .17, .018], { layer: 'metal' }); } }
}
// Ziegel auf einer Wand (Rahmen face): z0…z1, y0…y1
export function bricks(k, z0, z1, y0, y1, skip) {
  const ch = .085; let row = 0;
  for (let y = y0; y < y1 - .03; y += ch, row++) {
    let z = z0 - (row % 2 ? .07 : 0);
    while (z < z1 - .02) { const L = .14 + k.R(0, .03), za = Math.max(z, z0), zb = Math.min(z + L, z1);
      if (zb - za > .04 && !(skip && skip((za + zb) / 2, y + ch / 2))) k.boxc(k.rand() < .2 ? C.brick2 : C.brick, [.008, y + ch / 2, (za + zb) / 2], [.03, ch - .014, zb - za - .014], { jit: .06 });
      z += L; }
  }
}
