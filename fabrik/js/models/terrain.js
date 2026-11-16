// Fließband – Gelände je Grundstück (16×16 Felder): Boden je Welt (Wiese/Wüste/Eis/Mond) mit Farbstreuung je Feld,
// Vorkommen als flache Erz-Felsen (≤ 0,13 hoch, damit Bohrer und Bänder darüber passen), Ruinen mit Kiste,
// Deko (instanziert, nur auf freien Feldern, unter Gebäuden ausblendbar), gesperrte Grundstücke mit Nebel,
// Preisschild (Text kommt von außen) und Vorhängeschloss. Raster: stage.setGrid() (Shader im Bodenmaterial).
import * as THREE from 'three';
import { Kit, instantiate, PI, TAU, hash2, shade, mixc } from '../kit.js';
import { MATS, terrainMat, makeFogMat, oilMat, U } from '../materials.js';
import { ITEM_LOOK } from './items.js';

export const PLOT = 16;
const H = (x, y, s) => hash2(x, y, s);

// ---------- Böden ----------
export const GROUND = {
  wiese: { cells: [0x7cb84a, 0x84bf50, 0x74b046, 0x80b84c], patch: 0x6aa440, edge: 0x7a5a3a, edge2: 0x5e4630, fog: 0xe6eef2 },
  wueste: { cells: [0xe6c68a, 0xe0bf80, 0xeacc92, 0xdcb878], patch: 0xd2aa6c, edge: 0xb88a56, edge2: 0x9a7044, fog: 0xf4e4c6 },
  eis: { cells: [0xeef4fa, 0xe6eef8, 0xf2f7fc, 0xe0eaf4], patch: 0xcfe0f0, edge: 0x9ab4cc, edge2: 0x7a96b2, fog: 0xeef4fa },
  mond: { cells: [0x8a8a94, 0x84848e, 0x90909a, 0x7e7e88], patch: 0x7e7e88, edge: 0x6a6a74, edge2: 0x52525a, fog: 0x4a4e60 },
};

// ---------- Deko-Vorlagen ----------
const DECO = {};
function decoGeo(name) {
  if (DECO[name]) return DECO[name];
  const k = new Kit(500 + name.length * 31 + name.charCodeAt(0)); k.aoH = .35; k.jit = .06;
  switch (name) {
    case 'tree': k.cyl(0x7a5232, [0, 0, 0], .05, .3, 6, { top: .7 }); k.ball(0x4f9a3a, [0, .42, 0], [.24, .22, .24], { detail: 1 }); k.ball(0x5aa842, [.08, .55, .05], [.15, .14, .15], { detail: 1 }); k.ball(0x468e34, [-.1, .36, -.06], [.14, .12, .14], { detail: 1 }); break;
    case 'pine': k.cyl(0x6a4a2c, [0, 0, 0], .04, .18, 6); for (let i = 0; i < 3; i++) k.cone(i % 2 ? 0x3e8a4a : 0x357a40, [0, .12 + i * .17, 0], .26 - i * .06, .3, 7); break;
    case 'bush': k.ball(0x5aa040, [0, .08, 0], [.17, .12, .15], { detail: 1 }); k.ball(0x66ac48, [.1, .1, .04], [.1, .09, .1], { detail: 1 }); k.ball(0xe85a6a, [.05, .17, -.06], .025, { detail: 0 }); k.ball(0xf2f2f2, [-.08, .15, .05], .022, { detail: 0 }); break;
    case 'flowers': for (let i = 0; i < 6; i++) { const a = i * 1.1, r = .08 + (i % 3) * .05, x = Math.cos(a) * r, z = Math.sin(a) * r; k.beam(0x4a8a30, [x, 0, z], [x, .09, z], .01); k.ball([0xf2e04a, 0xe86ad0, 0xffffff, 0xff7a4a][i % 4], [x, .1, z], .028, { detail: 0, ao: false }); } break;
    case 'tuft': for (let i = 0; i < 5; i++) k.cone(0x6aa842, [Math.cos(i * 1.3) * .04, 0, Math.sin(i * 1.3) * .04], .025, .1 + (i % 2) * .04, 4, { r: [Math.cos(i) * .3, 0, Math.sin(i) * .3] }); break;
    case 'rock': k.ball(0x9a968e, [0, .04, 0], [.14, .09, .11], { dod: true }); k.ball(0x8a867e, [.1, .03, .06], [.07, .05, .06], { dod: true }); break;
    case 'cactus': k.cyl(0x5a9a4a, [0, 0, 0], .07, .5, 8, { bevel: .4 }); k.cyl(0x5a9a4a, [.1, .2, 0], .045, .18, 7, { bevel: .4 }); k.beam(0x5a9a4a, [0, .2, 0], [.1, .2, 0], .07); k.cyl(0x5a9a4a, [-.1, .28, 0], .04, .12, 7, { bevel: .4 }); k.beam(0x5a9a4a, [0, .28, 0], [-.1, .28, 0], .06); k.ball(0xf28ab0, [0, .52, 0], .035, { detail: 0 }); break;
    case 'cactus2': k.ball(0x6aa858, [0, .09, 0], [.12, .1, .12], { detail: 1 }); k.ball(0x6aa858, [.1, .06, .07], [.07, .06, .07], { detail: 1 }); k.ball(0xffd040, [0, .19, 0], .03, { detail: 0 }); break;
    case 'drybush': for (let i = 0; i < 7; i++) { const a = i * .9; k.beam(0x9a7a4a, [0, 0, 0], [Math.cos(a) * .14, .12 + (i % 3) * .03, Math.sin(a) * .14], .014); } break;
    case 'dune': k.ball(0xdcb878, [0, 0, 0], [.42, .08, .26], { detail: 1, r: [0, .4, 0] }); k.ball(0xe6c68a, [.18, 0, .08], [.22, .06, .18], { detail: 1 }); break;
    case 'drytuft': for (let i = 0; i < 5; i++) k.cone(0xc8a868, [Math.cos(i * 1.3) * .04, 0, Math.sin(i * 1.3) * .04], .02, .09, 4, { r: [Math.cos(i) * .4, 0, Math.sin(i) * .4] }); break;
    case 'icepine': k.cyl(0x6a4a2c, [0, 0, 0], .04, .16, 6); for (let i = 0; i < 3; i++) { k.cone(0x3a7a5a, [0, .1 + i * .17, 0], .25 - i * .06, .28, 7); k.cone(0xf4f8fc, [0, .2 + i * .17, 0], .17 - i * .045, .2, 7); } break;
    case 'iceblock': k.bev(0xa8dcf4, [0, 0, 0], [.26, .22, .2], .04, { r: [0, .3, 0] }); k.bev(0xc4ecfc, [.14, 0, .1], [.14, .12, .12], .03, { r: [0, .9, 0] }); k.bev(0xf4f8fc, [0, .22, 0], [.24, .03, .18], .015, { r: [0, .3, 0] }); break;
    case 'snowrock': k.ball(0x8a92a0, [0, .04, 0], [.14, .09, .11], { dod: true }); k.ball(0xf4f8fc, [0, .085, 0], [.11, .04, .08], { dod: true }); break;
    case 'snowmound': k.ball(0xf4f8fc, [0, 0, 0], [.2, .07, .16], { detail: 1 }); break;
    case 'snowman': k.ball(0xf6f8fc, [0, .09, 0], .1, { detail: 1 }); k.ball(0xf6f8fc, [0, .23, 0], .07, { detail: 1 }); k.cone(0xf08a2a, [.06, .24, 0], .012, .06, 5, { r: [0, 0, -PI / 2] }); k.cyl(0x2a2a30, [0, .29, 0], .045, .06, 8); k.cyl(0x2a2a30, [0, .29, 0], .07, .01, 8); k.box(0xd03a3a, [0, .17, 0], [.1, .02, .1]); break;
    case 'crater': k.ring(0x7e7e88, [0, 0, 0], .34, .24, .035, 14); k.cyl(0x6e6e78, [0, 0, 0], .25, .004, 14, { ao: false }); k.ball(0x8a8a94, [.3, .02, .1], .04, { dod: true }); break;
    case 'moonrock': k.ball(0x8a8a96, [0, .05, 0], [.15, .1, .12], { dod: true }); k.ball(0x7a7a86, [-.12, .03, .05], [.07, .05, .06], { dod: true }); k.ball(0xa0a0aa, [.08, .02, -.1], .04, { dod: true }); break;
    case 'pebble': for (let i = 0; i < 4; i++) k.ball(0x8a8a94, [Math.cos(i * 1.7) * .1, .01, Math.sin(i * 1.7) * .1], [.035, .022, .03], { dod: true }); break;
  }
  const b = k.build().geos; return (DECO[name] = b);
}
const BIOME_DECO = {
  wiese: [['tuft', 30], ['flowers', 10], ['bush', 9], ['tree', 7], ['pine', 5], ['rock', 6]],
  wueste: [['drytuft', 18], ['cactus', 7], ['cactus2', 8], ['drybush', 9], ['rock', 8], ['dune', 6]],
  eis: [['snowmound', 20], ['icepine', 8], ['iceblock', 7], ['snowrock', 8], ['snowman', 1]],
  mond: [['pebble', 18], ['crater', 9], ['moonrock', 10]],
};
const BIG = new Set(['tree', 'pine', 'icepine', 'cactus', 'snowman', 'iceblock']);
const DECO_RATE = { wiese: .3, wueste: .24, eis: .26, mond: .26 };

// ---------- Erz-Felsen ----------
function oreKit(k, x, z, item, rich, seed) {
  const L = ITEM_LOOK[item] || { color: 0x999999 }, col = L.color, n = rich ? 7 : 5, R = (s) => H(seed, s, 7);
  if (item === 'oel') { k.cyl(0x14101c, [x, .002, z], .34, .006, 12, { ao: false, layer: 'oil' }); if (rich) k.cyl(0x14101c, [x + .2, .002, z - .18], .16, .006, 10, { ao: false, layer: 'oil' }); k.ball(0x3a3040, [x - .3, .02, z + .25], [.07, .03, .06], { dod: true }); return; }
  if (item === 'sand') { k.ball(0xf0d8a0, [x, 0, z], [.38, .1 + (rich ? .03 : 0), .3], { detail: 1 }); k.ball(0xe6cc8a, [x + .2, 0, z + .15], [.2, .07, .18], { detail: 1 }); return; }
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + R(i) * .8, r = i === 0 ? 0 : .16 + R(i + 9) * .2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, s = (i === 0 ? .15 : .08 + R(i + 20) * .06) * (rich ? 1.2 : 1);
    if (item === 'kristall') { k.cone(i % 2 ? 0x9ae4ff : 0x6ac8f8, [px, 0, pz], s * .55, Math.min(.13, s * 2.1), 5, { layer: 'glow', r: [R(i + 3) * .5 - .25, 0, R(i + 4) * .5 - .25], ao: false }); continue; }
    k.ball(i % 4 === 3 ? 0x8a8478 : col, [px, Math.min(.05, s * .3), pz], [s, Math.min(.075, s * .7), s * .85], { dod: true, r: [0, R(i + 2) * 3, 0] });
    if (L.fleck && i % 2 === 0) k.ball(L.fleck, [px + s * .3, s * .7, pz], s * .28, { detail: 0, layer: item === 'titanerz' ? 'metal' : 'base' });
  }
}

// ---------- Ruine mit Kiste ----------
function ruinKit(k, x, z, seed) {
  const R = s => H(seed, s, 3), stone = [0x9a9488, 0x8a8478, 0xa8a296];
  // zerbrochene Mauerecke
  for (let i = 0; i < 7; i++) k.box(stone[i % 3], [x - .55 + i * .16, 0, z - .6], [.15, .12 + R(i) * .35 * (1 - i / 9), .12], { r: [0, R(i + 9) * .1, 0] });
  for (let i = 0; i < 6; i++) k.box(stone[(i + 1) % 3], [x - .6, 0, z - .45 + i * .16], [.12, .1 + R(i + 30) * .3 * (1 - i / 8), .15], { r: [0, R(i + 40) * .1, 0] });
  for (let i = 0; i < 8; i++) k.ball(stone[i % 3], [x - .4 + R(i + 50) * .9, .02, z - .3 + R(i + 60) * .8], [.06, .04, .05], { dod: true });
  // verbogenes Rohr, altes Zahnrad
  k.pipe(0x7a4a2e, [[x + .4, .02, z - .5], [x + .45, .2, z - .45], [x + .62, .26, z - .2]], .03);
  k.gear(0x6a5040, [x + .45, .0, z + .5], .16, .04, 9, { r: [.15, 0, .1] });
  k.ball(0x5a8a3a, [x - .55, .1, z - .6], [.12, .05, .08], { detail: 0 });
}
function crateKit(k) {
  k.bev(0xb07a44, [0, 0, 0], [.34, .3, .34], .03);
  for (const s of [-1, 1]) { k.box(0x6a4a2a, [s * .172, 0, 0], [.006, .3, .34]); k.box(0x6a4a2a, [0, 0, s * .172], [.34, .3, .006]); }
  for (const y of [.04, .26]) k.box(0x8a929c, [0, y, 0], [.352, .03, .352], { layer: 'metal' });
  k.box(0xd8aa40, [.176, .14, 0], [.01, .06, .06], { layer: 'metal' });
  k.star(0xffd040, [0, .3, 0], .07, .012, { layer: 'glow', ao: false });
}

// ---------- Preisschild-Sprite (Text von außen) ----------
// Texturen je Text geteilt und gezählt: releaseLabel gibt eine nicht mehr benutzte Textur frei (Preise steigen mit jedem Kauf)
const TEX = new Map();
function releaseLabel(tex) {
  if (!tex || !tex.userData.key) return;
  if (--tex.userData.refs <= 0) { TEX.delete(tex.userData.key); tex.dispose(); }
}
function labelTexture(text, icon) {
  const key = icon + '|' + text; if (TEX.has(key)) { const t0 = TEX.get(key); t0.userData.refs++; return t0; }
  const c = document.createElement('canvas'), x = c.getContext('2d'), fs = 64, font = `900 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`; x.font = font;
  const tw = text ? x.measureText(text).width : 0, ic = icon ? fs * 1.1 : 0, w = Math.ceil(tw + ic + 64), h = 104;
  c.width = w; c.height = h; const g = c.getContext('2d'); g.font = font;
  const r = 30; g.fillStyle = '#2a2420'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, r); g.fill();
  g.fillStyle = '#fff4dc'; g.beginPath(); g.roundRect(10, 10, w - 20, h - 20, r - 6); g.fill();
  let px = 32;
  if (icon === 'coin') { g.fillStyle = '#e8a820'; g.beginPath(); g.arc(px + fs * .45, h / 2, fs * .42, 0, TAU); g.fill(); g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(px + fs * .45, h / 2, fs * .32, 0, TAU); g.fill(); px += ic; }
  if (icon === 'lock') { g.fillStyle = '#5a5e66'; g.fillRect(px + 8, h / 2 - 6, fs * .7, fs * .5); g.strokeStyle = '#5a5e66'; g.lineWidth = 9; g.beginPath(); g.arc(px + 8 + fs * .35, h / 2 - 6, fs * .22, PI, 0); g.stroke(); px += ic; }
  g.fillStyle = '#2a2420'; g.textBaseline = 'middle'; g.fillText(text || '', px, h / 2 + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { w, h, key, refs: 1 }; TEX.set(key, t); return t;
}
// Schild-Sprite: makePlotSign(label, { icon: 'coin' | 'lock' | null, size }) → THREE.Sprite (Höhe size)
export function makePlotSign(label, { icon = 'coin', size = .9 } = {}) {
  const tex = labelTexture(label, icon), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false }));
  sp.scale.set(size * tex.userData.w / tex.userData.h, size, 1); sp.renderOrder = 20; sp.userData.setLabel = (l, ic = icon) => { const old = sp.material.map, t2 = labelTexture(l, ic); sp.material.map = t2; sp.scale.set(size * t2.userData.w / t2.userData.h, size, 1); releaseLabel(old); };
  sp.userData.dispose = () => { releaseLabel(sp.material.map); sp.material.map = null; sp.material.dispose(); };
  return sp;
}

// =====================================================================================================================
// makePlot(cx, cy, opts) → { group, update(t), setState(state, label), setLabel(label), setOccupied(fn), removeRuin(x, y), dispose() }
// opts: { biome, state: 'open' | 'buyable' | 'locked', deposit(gx, gy) → {item, rich} | null, ruins: [[gx, gy] …], label, seed }
// Felder in Welt-Feldkoordinaten: gx = cx·16 + i, gy = cy·16 + j; Welt-x = gx, Welt-z = gy (Feld reicht bis gx+1).
export function makePlot(cx, cy, opts = {}) {
  const biome = GROUND[opts.biome] ? opts.biome : 'wiese', G = GROUND[biome], seed = opts.seed ?? 1, dep = opts.deposit || (() => null);
  const x0 = cx * PLOT, z0 = cy * PLOT, group = new THREE.Group(); group.name = `plot ${cx},${cy}`;
  const ruins = (opts.ruins || []).map(([x, y]) => [x, y]);
  const isRuin = (gx, gy) => ruins.some(([x, y]) => gx >= x && gx < x + 2 && gy >= y && gy < y + 2);
  // --- Boden (ein Viereck je Feld mit eigener Farbe; Ränder mit Erdschicht) ---
  const pos = [], col = [], c = new THREE.Color(), c2 = new THREE.Color();
  const pushQ = (ax, az, bx, bz, y, color) => { for (const [px, pz] of [[ax, az], [ax, bz], [bx, bz], [ax, az], [bx, bz], [bx, az]]) { pos.push(px, y, pz); col.push(color.r, color.g, color.b); } };
  for (let j = 0; j < PLOT; j++) for (let i = 0; i < PLOT; i++) {
    const gx = x0 + i, gy = z0 + j, h = H(gx, gy, seed);
    c.set(G.cells[Math.floor(h * G.cells.length)]);
    const patch = Math.sin(gx * .37 + seed) * Math.sin(gy * .41 - seed * .3) + Math.sin(gx * .13 + gy * .17) * .6;
    if (patch > .7) c.lerp(c2.set(G.patch), .55);
    const d = dep(gx, gy); if (d) { const L = ITEM_LOOK[d.item]; if (L) c.lerp(c2.set(d.item === 'sand' ? 0xf0d8a0 : d.item === 'oel' ? 0x3a3040 : L.color), d.item === 'oel' ? .3 : .38).multiplyScalar(.9); }
    if (isRuin(gx, gy)) c.lerp(c2.set(0x8a7a64), .35);
    pushQ(gx, gy, gx + 1, gy + 1, 0, c);
  }
  // Seitenwände (Erdschichten) – nur sichtbar am Rand des gekauften Gebiets
  const side = (ax, az, bx, bz) => { for (const [y0, y1, cc] of [[-.18, 0, G.edge], [-.6, -.18, G.edge2]]) { c.set(cc); for (const [px, py, pz] of [[ax, y1, az], [ax, y0, az], [bx, y0, bz], [ax, y1, az], [bx, y0, bz], [bx, y1, bz]]) { pos.push(px, py, pz); col.push(c.r, c.g, c.b); } } };
  side(x0, z0, x0 + PLOT, z0); side(x0 + PLOT, z0, x0 + PLOT, z0 + PLOT); side(x0 + PLOT, z0 + PLOT, x0, z0 + PLOT); side(x0, z0 + PLOT, x0, z0);
  const gGeo = new THREE.BufferGeometry(); gGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, terrainMat); ground.receiveShadow = true; ground.name = 'ground'; group.add(ground);

  // --- Vorkommen + Ruinen (zusammengeführt) ---
  // Erz-Felsen: unter Gebäuden ausgeblendet (setOccupied baut die zusammengeführte Geometrie neu)
  let rocks = null;
  const buildRocks = (occ) => {
    if (rocks) { group.remove(rocks.group); rocks.meshes.forEach(m => m.geometry.dispose()); }
    const k = new Kit(seed * 31 + cx * 7 + cy * 13); k.aoH = .15;
    for (let j = 0; j < PLOT; j++) for (let i = 0; i < PLOT; i++) { const gx = x0 + i, gy = z0 + j, d = dep(gx, gy); if (d && !(occ && occ(gx, gy))) oreKit(k, gx + .5, gy + .5, d.item, !!d.rich, H(gx, gy, seed + 5) * 1e6 | 0); }
    rocks = instantiate(k.build(), { ...MATS, oil: oilMat }); group.add(rocks.group);
  };
  buildRocks(null);
  const ruinObjs = [];
  const owned = [];                                     // eigene Geometrien dieses Grundstücks (dispose gibt sie frei)
  const keep = o => { o.traverse(m => { if (m.isMesh && m.geometry) owned.push(m.geometry); }); return o; };
  if (ruins.length) { const rk = new Kit(seed * 17 + cx); rk.aoH = .15; for (const [rx, ry] of ruins) ruinKit(rk, rx + 1, ry + 1, rx * 31 + ry); group.add(keep(instantiate(rk.build(), MATS).group)); }
  // Kisten der Ruinen einzeln (lassen sich entfernen)
  for (const [rx, ry] of ruins) {
    const ck = new Kit(rx * 7 + ry); ck.aoH = .2; crateKit(ck); const cr = instantiate(ck.build(), MATS);
    cr.group.position.set(rx + 1.15, 0, ry + 1.05); cr.group.rotation.y = .4; group.add(keep(cr.group)); ruinObjs.push({ x: rx, y: ry, obj: cr.group });
  }

  // --- Deko (instanziert, je Art ein Mesh) ---
  const list = BIOME_DECO[biome], tot = list.reduce((a, b) => a + b[1], 0), rate = DECO_RATE[biome];
  const pick = h => { let a = h * tot; for (const [n, w] of list) { if ((a -= w) < 0) return n; } return list[0][0]; };
  const inst = {}; // name → [{gx, gy, m}]
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  for (let j = 0; j < PLOT; j++) for (let i = 0; i < PLOT; i++) {
    const gx = x0 + i, gy = z0 + j; if (dep(gx, gy) || isRuin(gx, gy)) continue;
    const h = H(gx, gy, seed + 11); if (h > rate) continue;
    let name = pick(H(gx, gy, seed + 17));
    // große Deko eher am Rand des Grundstücks (lässt die Mitte zum Bauen frei wirken)
    const edge = Math.min(i, j, PLOT - 1 - i, PLOT - 1 - j);
    if (BIG.has(name) && edge > 2 && H(gx, gy, seed + 23) < .6) name = list[0][0];
    const n = 1 + (name.includes('tuft') || name === 'pebble' || name === 'snowmound' ? Math.floor(H(gx, gy, 3) * 2) : 0);
    for (let q = 0; q < n; q++) {
      const ox = .25 + H(gx, gy, 31 + q) * .5, oz = .25 + H(gx, gy, 37 + q) * .5, sc = .8 + H(gx, gy, 41 + q) * .5;
      Q.setFromAxisAngle(Y, H(gx, gy, 43 + q) * TAU); M.compose(P.set(gx + ox, 0, gy + oz), Q, S.set(sc, sc, sc));
      (inst[name] ||= []).push({ gx, gy, m: M.clone() });
    }
  }
  const decoMeshes = [];
  for (const [name, arr] of Object.entries(inst)) {
    for (const [layer, geo] of Object.entries(decoGeo(name))) {
      const mesh = new THREE.InstancedMesh(geo, MATS[layer] || MATS.base, arr.length); mesh.castShadow = BIG.has(name) || name === 'rock' || name === 'moonrock'; mesh.receiveShadow = true;
      arr.forEach((a, i) => mesh.setMatrixAt(i, a.m)); mesh.computeBoundingSphere(); mesh.userData = { name, arr }; group.add(mesh); decoMeshes.push(mesh);
    }
  }
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  let occKey = '';
  const setOccupied = fn => {
    for (const mesh of decoMeshes) { mesh.userData.arr.forEach((a, i) => mesh.setMatrixAt(i, fn && fn(a.gx, a.gy) ? ZERO : a.m)); mesh.instanceMatrix.needsUpdate = true; }
    let key = ''; if (fn) for (let j = 0; j < PLOT; j++) for (let i = 0; i < PLOT; i++) if (dep(x0 + i, z0 + j) && fn(x0 + i, z0 + j)) key += i + ',' + j + ';';
    if (key !== occKey) { occKey = key; buildRocks(fn); }
  };

  // --- Nebel, Schild, Schloss, Grenzpflöcke ---
  const fogMat = makeFogMat(G.fog, .6);
  const fog = new THREE.Mesh(new THREE.BoxGeometry(PLOT - .04, 1.6, PLOT - .04), fogMat); fog.position.set(x0 + PLOT / 2, .8, z0 + PLOT / 2); fog.renderOrder = 5; group.add(fog);
  const dim = new THREE.Mesh(new THREE.PlaneGeometry(PLOT, PLOT).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: 0x0a0c14, transparent: true, opacity: .35, depthWrite: false }));
  dim.position.set(x0 + PLOT / 2, .02, z0 + PLOT / 2); dim.renderOrder = 4; group.add(dim);
  const pk = new Kit(cx * 3 + cy * 5); pk.aoH = .4;
  // Schild-Halter (Holzpfosten mit Rahmen)
  pk.in([x0 + PLOT / 2, 0, z0 + PLOT / 2], 0, () => {
    pk.box(0x7a5232, [0, 0, 0], [.12, 1.7, .12]); pk.box(0x6a4428, [0, 0, 0], [.3, .08, .3]);
    pk.bev(0x8a5a32, [0, 1.62, 0], [.12, .12, 1.1], .02); for (const s of [-1, 1]) pk.box(0x3a3a40, [0, 1.48, s * .45], [.02, .16, .02], { layer: 'metal' });
    pk.box(0xf2c230, [0, .5, 0], [.14, .08, .14]);
  });
  const signPost = keep(instantiate(pk.build(), MATS).group); group.add(signPost);
  const sign = makePlotSign(opts.label ?? '', { icon: 'coin', size: 1.1 }); sign.position.set(x0 + PLOT / 2, 2.45, z0 + PLOT / 2); group.add(sign);
  // Vorhängeschloss (gesperrt)
  const lk = new Kit(77); lk.aoH = .3;
  lk.in([x0 + PLOT / 2, 0, z0 + PLOT / 2], PI / 4, () => { lk.box(0x6a6e78, [0, 0, 0], [.1, 1.1, .1], { layer: 'metal' }); lk.bev(0xd8aa40, [0, 1.1, 0], [.5, .42, .2], .05, { layer: 'metal' }); lk.torus(0x9aa2ac, [0, 1.52, 0], .17, .045, 12, { arc: PI, layer: 'metal' }); for (const s of [-1, 1]) lk.cyl(0x9aa2ac, [s * .17, 1.42, 0], .045, .1, 8, { layer: 'metal' }); lk.cyl(0x2a2a30, [.0, 1.25, .1], .045, .02, 8, { ax: 'z' }); lk.box(0x2a2a30, [0, 1.14, .105], [.03, .1, .01]); });
  const lock = keep(instantiate(lk.build(), MATS).group); group.add(lock);
  // Grenzpflöcke (kaufbar)
  const bk = new Kit(55); bk.aoH = .2;
  for (let i = 0; i < PLOT; i += 1) for (const [x, z] of [[x0 + i + .5, z0 + .15], [x0 + i + .5, z0 + PLOT - .15], [x0 + .15, z0 + i + .5], [x0 + PLOT - .15, z0 + i + .5]]) { bk.box(i % 2 ? 0x2a2622 : 0xf2c230, [x, 0, z], [.06, .16, .06]); }
  const stakes = keep(instantiate(bk.build(), MATS).group); group.add(stakes);

  let state = 'open';
  const setState = (s, label) => {
    state = s; const open = s === 'open', buy = s === 'buyable';
    fog.visible = !open; dim.visible = !open; fogMat.opacity = buy ? .2 : .42; dim.material.opacity = buy ? .16 : .38;
    signPost.visible = sign.visible = buy; lock.visible = s === 'locked'; stakes.visible = buy;
    for (const m of decoMeshes) m.visible = true;
    if (label !== undefined) sign.userData.setLabel(label);
  };
  setState(opts.state || 'open', opts.label);
  return {
    group, ground, sign, ruins: ruinObjs, biome, cx, cy,
    get state() { return state; },
    setState, setLabel: l => sign.userData.setLabel(l), setOccupied,
    removeRuin(x, y) { const r = ruinObjs.find(o => o.x === x && o.y === y); if (r) r.obj.visible = false; return !!r; },
    update(t) { if (sign.visible) sign.position.y = 2.45 + Math.sin(t * 1.5 + cx) * .05; },
    // alles Eigene freigeben; geteilt bleiben Deko-Geometrien (DECO), Materialien (MATS); Schild-Texturen werden gezählt
    dispose() {
      gGeo.dispose(); fog.geometry.dispose(); fogMat.dispose(); dim.geometry.dispose(); dim.material.dispose(); sign.userData.dispose();
      if (rocks) { rocks.meshes.forEach(m => m.geometry.dispose()); rocks = null; }
      owned.forEach(g => g.dispose()); owned.length = 0;
      for (const m of decoMeshes) m.dispose();
    },
  };
}
