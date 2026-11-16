// Natur-Bausteine. Alle Funktionen zeichnen in einen Kit an Position p = [x, y, z] (y = Boden).
import { TAG } from '../kit.js';

const TRUNK = [0x6b4a32, 0x5e412c, 0x74523a];
const LEAF = [0x4f9a3a, 0x5fae45, 0x3f8a3a, 0x78b845, 0x6aa040];
const NEEDLE = [0x2f6a3e, 0x2a5e3a, 0x356f44, 0x3d7a48];

export function pine(k, p, s = 1) {
  const h = (4.2 + k.R(0, 2.2)) * s, tr = .16 * s, c = k.pick(NEEDLE);
  k.cyl(k.pick(TRUNK), p, tr, h * .35, 6, { top: .7 });
  const n = 4 + Math.floor(k.R(0, 2));
  for (let i = 0; i < n; i++) {
    const t = i / n, y = p[1] + h * (.18 + t * .62), r = (1.5 - t * 1.1) * s * k.R(.9, 1.1), hh = h * .34;
    k.cone(c, [p[0] + k.R(-.05, .05), y, p[2] + k.R(-.05, .05)], r, hh, 7, { tag: TAG.needle, sway: { k: .09 / s }, swayBase: p[1], jit: .12, r: [0, k.R(0, 1), 0] });
  }
  k.cone(c, [p[0], p[1] + h * .82, p[2]], .35 * s, h * .25, 6, { tag: TAG.needle, sway: { k: .09 / s }, swayBase: p[1] });
}
export function leafTree(k, p, s = 1) {
  const h = (2.4 + k.R(0, 1.2)) * s, c = k.pick(LEAF), tc = k.pick(TRUNK);
  k.cyl(tc, p, .2 * s, h, 7, { top: .65 });
  for (let i = 0; i < 3; i++) {                                   // Äste
    const a = k.R(0, 6.28), y = p[1] + h * k.R(.55, .85), L = k.R(.7, 1.1) * s;
    k.beam(tc, [p[0], y, p[2]], [p[0] + Math.cos(a) * L, y + L * .7, p[2] + Math.sin(a) * L], .1 * s);
  }
  const n = 5 + Math.floor(k.R(0, 4));
  for (let i = 0; i < n; i++) {
    const a = k.R(0, 6.28), d = k.R(0, 1.1) * s, y = p[1] + h + k.R(-.2, 1.2) * s, r = k.R(.8, 1.25) * s;
    k.ball(c, [p[0] + Math.cos(a) * d, y, p[2] + Math.sin(a) * d], [r, r * .85, r], { tag: TAG.leaf, sway: { k: .05 / s }, swayBase: p[1], jit: .14, detail: 0 });
  }
}
export function birch(k, p, s = 1) {
  const h = (4 + k.R(0, 1.5)) * s;
  k.cyl(0xe8e4dc, p, .13 * s, h, 6, { top: .7 });
  for (let i = 0; i < 6; i++) k.box(0x2a2622, [p[0], p[1] + k.R(.4, h * .9), p[2]], [.27 * s, .05, .27 * s], { r: [0, k.R(0, 3), 0], ao: false });
  for (let i = 0; i < 5; i++) {
    const a = k.R(0, 6.28), d = k.R(.1, .6) * s, y = p[1] + h * k.R(.55, 1), r = k.R(.55, .8) * s;
    k.ball(0x9ccf5a, [p[0] + Math.cos(a) * d, y, p[2] + Math.sin(a) * d], [r, r * 1.2, r], { tag: TAG.leaf, sway: { k: .06 / s }, swayBase: p[1], jit: .15 });
  }
}
export function bush(k, p, s = 1, berries) {
  const c = k.pick(LEAF);
  for (let i = 0; i < 4; i++) { const r = k.R(.35, .6) * s; k.ball(c, [p[0] + k.R(-.4, .4) * s, p[1] + r * .6, p[2] + k.R(-.4, .4) * s], [r, r * .8, r], { tag: TAG.leaf, sway: .25 }); }
  if (berries) for (let i = 0; i < 8; i++) k.ball(berries, [p[0] + k.R(-.5, .5) * s, p[1] + k.R(.3, .8) * s, p[2] + k.R(-.5, .5) * s], .06, { ao: false, tag: TAG.flower });
}
export function grass(k, p, s = 1, c = 0x5f9a3e) {
  for (let i = 0; i < 5; i++) {
    const a = k.R(0, 6.28), d = k.R(0, .14) * s, h = k.R(.25, .5) * s;
    k.cone(c, [p[0] + Math.cos(a) * d, p[1] - .02, p[2] + Math.sin(a) * d], .05 * s, h, 3, { tag: TAG.grass, sway: { k: .9 }, swayBase: p[1], r: [k.R(-.25, .25), k.R(0, 3), k.R(-.25, .25)], ao: false });
  }
}
const FLOWERS = [0xf2e14a, 0xffffff, 0xe85a8a, 0x8a6ae8, 0xf28a3a, 0xe84a4a, 0x6aa8f2];
export function flower(k, p, c) {
  c ??= k.pick(FLOWERS); const h = k.R(.2, .4);
  k.cyl(0x4f8a3a, p, .015, h, 3, { sway: { k: 1.2 }, swayBase: p[1], ao: false, tag: TAG.grass });
  k.ball(c, [p[0], p[1] + h, p[2]], [.07, .04, .07], { sway: { k: 1.2 }, swayBase: p[1], tag: TAG.flower, ao: false });
  k.ball(0xf2c43a, [p[0], p[1] + h + .02, p[2]], .025, { sway: { k: 1.2 }, swayBase: p[1], tag: TAG.flower, ao: false });
  k.box(0x4f8a3a, [p[0] + .04, p[1] + h * .4, p[2]], [.08, .015, .04], { r: [0, k.R(0, 3), .4], sway: { k: 1.2 }, swayBase: p[1], ao: false, tag: TAG.grass });
}
export function rock(k, p, s = 1, c) {
  c ??= k.pick([0x8f8b84, 0x7d7a74, 0x9a958c]);
  k.ball(c, [p[0], p[1] + .15 * s, p[2]], [k.R(.5, .8) * s, k.R(.35, .55) * s, k.R(.45, .7) * s], { dod: true, r: [k.R(0, 1), k.R(0, 6), 0], jit: .15 });
  if (k.rand() < .6) k.ball(0x6a9a40, [p[0] + .1 * s, p[1] + .45 * s, p[2]], [.3 * s, .08 * s, .3 * s], { tag: TAG.grass, ao: false });    // Moos
}
export function mushroom(k, p, red = true) {
  const s = k.R(.7, 1.2);
  k.cyl(0xf2ead8, p, .035 * s, .14 * s, 5, { ao: false });
  k.ball(red ? 0xd8302a : 0x9a6a3a, [p[0], p[1] + .15 * s, p[2]], [.1 * s, .06 * s, .1 * s], { ao: false });
  if (red) for (let i = 0; i < 4; i++) k.ball(0xffffff, [p[0] + k.R(-.06, .06) * s, p[1] + .2 * s, p[2] + k.R(-.06, .06) * s], .014, { ao: false });
}
export function fern(k, p, s = 1) {
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + k.R(0, .4); k.box(0x4f8a3a, [p[0] + Math.cos(a) * .22 * s, p[1] + .12 * s, p[2] + Math.sin(a) * .22 * s], [.5 * s, .02, .13 * s], { r: [0, -a, .45], tag: TAG.grass, sway: .6, ao: false }); }
}
export function stump(k, p, s = 1) {
  k.cyl(0x6b4a32, p, .28 * s, .35 * s, 7, { top: .9 });
  k.cyl(0xc9a878, [p[0], p[1] + .35 * s, p[2]], .25 * s, .02, 7, { ao: false });
  k.cyl(0xa8865a, [p[0], p[1] + .36 * s, p[2]], .14 * s, .005, 7, { ao: false });
}
export function log(k, p, a, L = 2.4) {
  k.cyl(0x6b4a32, [p[0], p[1] + .22, p[2]], .22, L, 7, { r: [0, a, Math.PI / 2] });
  k.cyl(0xc9a878, [p[0] + Math.cos(-a) * L / 2, p[1] + .22, p[2] + Math.sin(-a) * L / 2], .2, .02, 7, { r: [0, a, Math.PI / 2], ao: false });
  mushroomIf(k, [p[0], p[1] + .4, p[2]]);
}
function mushroomIf(k, p) { if (k.rand() < .5) mushroom(k, p, false); }
export function reed(k, p) {
  for (let i = 0; i < 5; i++) {
    const h = k.R(.7, 1.3), x = p[0] + k.R(-.2, .2), z = p[2] + k.R(-.2, .2);
    k.cyl(0x7a9a4a, [x, p[1] - .1, z], .02, h, 3, { sway: { k: .5 }, swayBase: p[1], tag: TAG.grass, ao: false, r: [k.R(-.15, .15), 0, k.R(-.15, .15)] });
    if (k.rand() < .5) k.cyl(0x6b4a2a, [x, p[1] + h - .25, z], .045, .22, 5, { sway: { k: .5 }, swayBase: p[1], ao: false });
  }
}
export function lily(k, p) {
  k.cyl(0x4f9a3a, p, .3, .02, 7, { ao: false, r: [0, k.R(0, 3), 0] });
  if (k.rand() < .5) { k.ball(0xffe0ec, [p[0] + .05, p[1] + .05, p[2]], [.09, .06, .09], { ao: false }); k.ball(0xf2d84a, [p[0] + .05, p[1] + .09, p[2]], .03, { ao: false }); }
}
// Getreide-Büschel
export function wheat(k, p) {
  for (let i = 0; i < 4; i++) {
    const x = p[0] + k.R(-.12, .12), z = p[2] + k.R(-.12, .12), h = k.R(.65, .85);
    k.cyl(0x8aa84a, [x, p[1], z], .015, h, 3, { tag: TAG.crop, sway: { k: .8 }, swayBase: p[1], ao: false });
    k.cyl(0x9ab84a, [x, p[1] + h, z], .035, .16, 4, { top: .4, tag: TAG.crop, sway: { k: .8 }, swayBase: p[1], ao: false });
  }
}
export function pumpkin(k, p) {
  const s = k.R(.7, 1.2);
  k.ball(0xe8822a, [p[0], p[1] + .14 * s, p[2]], [.22 * s, .15 * s, .22 * s], { detail: 1, jit: .05 });
  k.cyl(0x5a7a2a, [p[0], p[1] + .27 * s, p[2]], .025, .08, 4, { ao: false });
  k.box(0x4f8a3a, [p[0] + .25, p[1], p[2]], [.3, .03, .25], { r: [0, k.R(0, 3), 0], tag: TAG.grass, ao: false });
}
export function cabbage(k, p) { k.ball(0x8ab86a, [p[0], p[1] + .12, p[2]], [.2, .15, .2], { detail: 1, tag: TAG.grass }); k.ball(0xb8d88a, [p[0], p[1] + .2, p[2]], .1, { ao: false }); }
export function sunflower(k, p) {
  const h = k.R(1.4, 1.9);
  k.cyl(0x5a8a3a, p, .03, h, 4, { sway: { k: .3 }, swayBase: p[1], tag: TAG.grass });
  k.cyl(0xf2c42a, [p[0] + .05, p[1] + h, p[2]], .2, .04, 8, { r: [0, 0, 1.2], sway: { k: .3 }, swayBase: p[1], tag: TAG.flower, ao: false });
  k.cyl(0x5a3a1a, [p[0] + .08, p[1] + h, p[2]], .1, .05, 8, { r: [0, 0, 1.2], sway: { k: .3 }, swayBase: p[1], ao: false });
  k.box(0x4f8a3a, [p[0], p[1] + h * .5, p[2]], [.3, .02, .15], { r: [0, k.R(0, 3), .3], sway: { k: .3 }, swayBase: p[1], tag: TAG.grass, ao: false });
}
export function hay(k, p, a) {
  k.cyl(0xd8b858, [p[0], p[1] + .45, p[2]], .45, .9, 10, { r: [0, a, Math.PI / 2] });
  k.cyl(0xc8a848, [p[0], p[1] + .45, p[2]], .455, .06, 10, { r: [0, a, Math.PI / 2], ao: false, jit: .02 });
}
export function scarecrow(k, p) {
  k.cyl(0x6b4a32, p, .05, 1.8, 5);
  k.beam(0x6b4a32, [p[0], p[1] + 1.35, p[2] - .6], [p[0], p[1] + 1.35, p[2] + .6], .06);
  k.box(0x8a3a2a, [p[0], p[1] + .9, p[2]], [.3, .55, .45]);
  k.beam(0x3a5a8a, [p[0], p[1] + 1.32, p[2] - .55], [p[0], p[1] + 1.32, p[2] + .55], .13);
  k.ball(0xd8c08a, [p[0], p[1] + 1.65, p[2]], .17);
  k.cone(0xc8a848, [p[0], p[1] + 1.75, p[2]], .32, .3, 8, { top: .2 });
  k.cone(0xc8a848, [p[0], p[1] + 1.75, p[2]], .32, .05, 8);
}
export function fencePost(k, a, b, c = 0x8a6a48, pickets = true) {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(1, Math.round(L / 1.4));
  for (let i = 0; i <= n; i++) { const t = i / n; k.box(c, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - .1, a[2] + (b[2] - a[2]) * t], [.09, .95, .09]); }
  for (const y of [.35, .7]) k.beam(c, [a[0], a[1] + y, a[2]], [b[0], b[1] + y, b[2]], .05, { w: .04, d: .08 });
  if (pickets) { const m = Math.round(L / .22); for (let i = 1; i < m; i++) { const t = i / m; k.box(0xe8e0d0, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], [.06, .8, .06]); } }
}
