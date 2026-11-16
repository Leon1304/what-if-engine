// Boden einer Kachel: Sechseck-Gitter mit Höhenrauschen (Weltkoordinaten → nahtlos), Bach- und Seebett, Wege,
// Felswände an den Seiten, schroffe Unterseite mit Wurzeln und Leuchtkristallen, Wasserfläche und Wasserfälle an offenen Bachkanten.
import * as THREE from 'three';
import { R, INR, cornerAt, edgeMid, edgeAngle, fbm, noise, hash, rng } from './hex.js';
import { TILES } from './tiles.js';
import { TAG } from './kit.js';

export const WATER_Y = -.32;
const N = 14;                     // Unterteilung je Sektor-Kante
const RIVER_HW = 1.35, RIVER_D = .9, LAKE_D = 1.25, ROAD_HW = .85;

const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hexd = (x, z) => { let m = 0; for (let i = 0; i < 6; i++) { const a = edgeAngle(i); m = Math.max(m, (x * Math.cos(a) + z * Math.sin(a)) / INR); } return m; };
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; const t = L ? clamp01(((px - ax) * dx + (pz - az) * dz) / L) : 0; return Math.hypot(px - ax - t * dx, pz - az - t * dz); }
// Pfad (Bach/Weg) als Polylinie: zwei Kanten → Bogen über die Mitte, eine Kante → zur Mitte (Ende bei stop)
function paths(list, stop = 0) {
  const out = [];
  if (list.length === 2) {
    const [a, b] = list.map(i => edgeMid(i)), P = [];
    for (let s = 0; s <= 16; s++) { const t = s / 16, u = 1 - t; P.push([u * u * a[0] + t * t * b[0], u * u * a[1] + t * t * b[1]]); }
    out.push(P);
  } else for (const i of list) { const a = edgeMid(i), b = edgeMid(i, stop); out.push([a, b]); }
  return out;
}
function polyDist(P, x, z) { let d = 1e9; for (const L of P) for (let i = 0; i < L.length - 1; i++) d = Math.min(d, segDist(x, z, L[i][0], L[i][1], L[i + 1][0], L[i + 1][1])); return d; }

// Gelände-Feld einer Kachel: Höhe, Abstand zu Bach/Weg, Wasser. nb[i] = Nachbar-Kachel an Kante i oder null.
export function makeField(t, E, nb, cx, cz) {
  const kind = t.k, info = TILES[kind];
  const wEdges = [], rEdges = [], lakeEdges = [];
  for (let i = 0; i < 6; i++) {
    if (E[i] === 'w') wEdges.push(i);
    if (E[i] === 'r') rEdges.push(i);
    if (E[i] === 'l' && nb[i]) { const ne = nb[i].E[(i + 3) % 6]; if (ne === 'w') wEdges.push(i); else if (ne === 'l') lakeEdges.push(i); }
  }
  const isLake = kind === 'see';
  const riverP = isLake ? wEdges.map(i => [edgeMid(i), [0, 0]]) : wEdges.length ? paths(wEdges, 0) : [];
  const roadStop = kind === 'haus' || kind === 'kapelle' || kind === 'hof' ? 2.3 : 0;
  const roadP = !rEdges.length ? [] : kind === 'start' || kind === 'markt' ? rEdges.map(i => [edgeMid(i), [0, 0]]) : paths(rEdges, roadStop);
  const lakeP = lakeEdges.map(i => [edgeMid(i), [0, 0]]);
  const mountain = kind === 'berg', rnd = rng(hash('m', cx, cz));
  const peak = mountain ? [rnd() * 1.6 - .8, rnd() * 1.6 - .8] : null, peakH = mountain ? 5.5 + rnd() * 2.5 : 0;
  const F = {
    kind, E, wEdges, rEdges, cx, cz, riverP, roadP, hasWater: !!(wEdges.length || isLake),
    riverD(x, z) { return riverP.length ? polyDist(riverP, x, z) : 1e9; },
    roadD(x, z) { return roadP.length ? polyDist(roadP, x, z) : 1e9; },
    carve(x, z) {
      let d = 0;
      if (riverP.length) { const rd = polyDist(riverP, x, z) / RIVER_HW; d = Math.max(d, RIVER_D * (1 - sstep(.45, 1.25, rd))); }
      if (isLake) {
        let m = sstep(.8, .42, hexd(x, z));
        for (const L of lakeP) m = Math.max(m, sstep(1, .45, segDist(x, z, L[0][0], L[0][1], 0, 0) / (.45 * R)));
        d = Math.max(d, LAKE_D * m);
      }
      return d;
    },
    h(x, z) {
      const wx = x + cx, wz = z + cz;
      let h = .06 + fbm(wx * .16, wz * .16) * .32;
      if (mountain) { const r = Math.hypot(x - peak[0], z - peak[1]); const fall = sstep(.98, .2, hexd(x, z));
        h += fall * (peakH * Math.pow(Math.max(0, 1 - r / (R * .95)), 1.5) + (noise(wx * .8, wz * .8) - .5) * 1.1 * fall); }
      return h - this.carve(x, z);
    },
    // Darf hier etwas stehen? (nicht im Wasser, nicht auf dem Weg, innerhalb der Kachel)
    free(x, z, r = .5) {
      if (hexd(x, z) > (INR - r - .15) / INR) return false;
      if (this.riverD(x, z) < RIVER_HW + r + .2) return false;
      if (this.roadD(x, z) < ROAD_HW + r) return false;
      if (isLake && this.carve(x, z) > .05) return false;
      return true;
    },
  };
  return F;
}

// Farbe des Bodens an einer Stelle
const C = {
  grass: new THREE.Color(0x6aa84f), grass2: new THREE.Color(0x8fbf55), grass3: new THREE.Color(0x4f8f45), dirt: new THREE.Color(0x8a6a48),
  path: new THREE.Color(0xb09468), path2: new THREE.Color(0x9a7f58), sand: new THREE.Color(0xc9b88a), mud: new THREE.Color(0x6e5a42), bed: new THREE.Color(0x58605a),
  rock: new THREE.Color(0x8a8780), rock2: new THREE.Color(0x6e6b66), soil: new THREE.Color(0x7a5a3a), forest: new THREE.Color(0x4f7a3a), cobble: new THREE.Color(0xa49a8c),
};
function groundColor(F, x, z, y, out) {
  const wx = x + F.cx, wz = z + F.cz, n = fbm(wx * .3, wz * .3), n2 = noise(wx * 1.7, wz * 1.7);
  out.copy(C.grass).lerp(C.grass2, sstep(.35, .75, n)).lerp(C.grass3, sstep(.6, .9, n2) * .5);
  let tag = TAG.grass;
  if (F.kind === 'wald') out.lerp(C.forest, .6).lerp(C.dirt, sstep(.55, .8, n2) * .35);
  if (F.kind === 'feld' && hexd(x, z) < .84) { out.copy(C.soil).lerp(C.dirt, n2 * .4); tag = TAG.none; }
  if (F.kind === 'berg') { const k = sstep(.9, 2.6, y) + sstep(.5, .8, n2) * sstep(.6, 1.4, y); out.lerp(n2 > .5 ? C.rock : C.rock2, clamp01(k)); if (k > .5) tag = TAG.none; }
  if (F.kind === 'markt' || F.kind === 'start') { const r = Math.hypot(x, z); if (r < 3.6) { out.copy(C.cobble).multiplyScalar(.85 + .3 * noise(wx * 3, wz * 3)); tag = TAG.none; } }
  const rd = F.roadD(x, z); if (rd < ROAD_HW + .25) { const k = sstep(ROAD_HW + .25, ROAD_HW - .2, rd); out.lerp(C.path, k).lerp(C.path2, k * sstep(.4, .7, n2) * .5); if (k > .5) tag = TAG.none; }
  if (y < .04) { const k = sstep(.04, -.12, y); out.lerp(F.kind === 'see' ? C.sand : C.mud, k); if (k > .5) tag = TAG.none; }
  if (y < WATER_Y - .1) out.lerp(C.bed, sstep(WATER_Y - .1, WATER_Y - .6, y));
  return tag;
}

// Baut Boden, Seitenwände, Unterseite, Wasser und Wasserfälle in den Baukasten
export function buildTerrain(kit, F, nb, seed) {
  const pos = [], col = [], tag = [], c = new THREE.Color(), corners = [0, 1, 2, 3, 4, 5].map(cornerAt);
  const vert = (x, z) => { const y = F.h(x, z); return [x, y, z]; };
  const cache = new Map(), V = (x, z) => { const k = x.toFixed(3) + ',' + z.toFixed(3); let v = cache.get(k); if (!v) { v = vert(x, z); cache.set(k, v); } return v; };
  const vcol = new Map(), VC = v => { let e = vcol.get(v); if (!e) { const cc = new THREE.Color(); const tg = groundColor(F, v[0], v[2], v[1], cc); e = [cc, tg]; vcol.set(v, e); } return e; };
  const _n = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const tri = (a, b, d) => {
    for (const v of [a, b, d]) pos.push(...v);
    _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _b.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]); _n.crossVectors(_a, _b).normalize();
    const steep = sstep(.92, .62, Math.abs(_n.y)), k = .95 + kit.rand() * .08;
    for (const v of [a, b, d]) { const [cc, tg] = VC(v); c.copy(cc); if (steep > 0) c.lerp(C.mud, steep * .7); col.push(c.r * k, c.g * k, c.b * k); tag.push(steep > .5 ? 0 : tg); }
  };
  for (let s = 0; s < 6; s++) {
    const A = corners[s], B = corners[(s + 1) % 6];
    const P = (a, b) => V(A[0] * a / N + B[0] * b / N, A[1] * a / N + B[1] * b / N);
    for (let a = 0; a < N; a++) for (let b = 0; b < N - a; b++) {
      tri(P(a, b), P(a, b + 1), P(a + 1, b));
      if (a + b < N - 1) tri(P(a + 1, b), P(a, b + 1), P(a + 1, b + 1));
    }
  }
  // Seitenwände mit Gesteinsschichten
  const BOT = -1.7;
  for (let s = 0; s < 6; s++) {
    const A = corners[s], B = corners[(s + 1) % 6];
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N, x0 = A[0] + (B[0] - A[0]) * t0, z0 = A[1] + (B[1] - A[1]) * t0, x1 = A[0] + (B[0] - A[0]) * t1, z1 = A[1] + (B[1] - A[1]) * t1;
      const y0 = V(x0, z0)[1], y1 = V(x1, z1)[1];
      const layers = [[Math.min(y0, y1), .28, 0x6b4f35], [-.35, .55, 0x7d6a55], [-.95, .75, 0x8d8679]];
      let top0 = y0, top1 = y1;
      for (let L = 0; L < layers.length; L++) {
        const bot = L === layers.length - 1 ? BOT : Math.min(top0, top1, layers[L + 1][0]) - .02;
        const b0 = Math.min(bot, top0 - .05), b1 = Math.min(bot, top1 - .05);
        const q = [[x0, top0, z0], [x1, top1, z1], [x1, b1, z1], [x0, b0, z0]];
        pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
        c.set(L === 0 ? 0x6b4f35 : layers[L][2]).multiplyScalar(.9 + kit.rand() * .2);
        for (let k = 0; k < 6; k++) { col.push(c.r, c.g, c.b); tag.push(0); }
        top0 = b0; top1 = b1;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('tag', new THREE.Float32BufferAttribute(tag, 1));
  g.computeVertexNormals(); kit.raw(g);

  // Unterseite: schroffer Felszapfen, Wurzeln, Kristalle
  const r = rng(seed ^ 0x51), wx = F.cx, wz = F.cz;
  const depth = 4 + fbm(wx * .05, wz * .05) * 9 + r() * 2;
  const ring = (y, s, j) => { const out = []; for (let i = 0; i < 12; i++) { const a = (i * 30 - 30) * Math.PI / 180, rr = (i % 2 ? INR : R) * s * (1 + (r() - .5) * j); out.push([Math.cos(a) * rr, y, Math.sin(a) * rr]); } return out; };
  const rings = [ring(BOT, 1, 0), ring(BOT - depth * .25, .82, .25), ring(BOT - depth * .55, .55, .35), ring(BOT - depth * .82, .26, .4)];
  const tip = [(r() - .5) * 1.5, BOT - depth, (r() - .5) * 1.5], up = [], uc = [];
  const ucol = [0x7d6a55, 0x6f6458, 0x5f5850, 0x524c47];
  for (let L = 0; L < rings.length; L++) {
    const a = rings[L], b = rings[L + 1];
    for (let i = 0; i < 12; i++) {
      const j = (i + 1) % 12, cc = c.set(ucol[L]).multiplyScalar(.85 + r() * .3);
      if (b) { up.push(...a[i], ...a[j], ...b[i], ...a[j], ...b[j], ...b[i]); for (let k = 0; k < 6; k++) uc.push(cc.r, cc.g, cc.b); }
      else { up.push(...a[i], ...a[j], ...tip); for (let k = 0; k < 3; k++) uc.push(cc.r, cc.g, cc.b); }
    }
  }
  const ug = new THREE.BufferGeometry(); ug.setAttribute('position', new THREE.Float32BufferAttribute(up, 3)); ug.setAttribute('color', new THREE.Float32BufferAttribute(uc, 3)); ug.computeVertexNormals(); kit.raw(ug);
  for (let i = 0, n = 3 + Math.floor(r() * 4); i < n; i++) {         // Wurzeln hängen heraus
    const a = r() * Math.PI * 2, rr = R * (.55 + r() * .4), x = Math.cos(a) * rr, z = Math.sin(a) * rr, L = 1.2 + r() * 2.8;
    kit.cone(0x5a3f2a, [x, BOT + .3 - L, z], .06 + r() * .06, L, 4, { r: [Math.PI, 0, (r() - .5) * .5], ao: false });
  }
  if (r() < .45) for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) {   // Leuchtkristalle
    const a = r() * Math.PI * 2, rr = R * (.3 + r() * .35), y = BOT - depth * (.2 + r() * .4), L = .6 + r() * 1.1;
    kit.cyl(0x64e0ff, [Math.cos(a) * rr * .8, y, Math.sin(a) * rr * .8], .16 + r() * .1, L, 5, { top: .1, r: [Math.PI + (r() - .5) * .8, 0, (r() - .5) * .8], layer: 'glow', tag: 2, ao: false, jit: .2 });
  }

  // Wasserfläche
  if (F.hasWater) {
    const hx = new THREE.BufferGeometry(), hp = [];
    for (let s = 0; s < 6; s++) { const A = corners[s], B = corners[(s + 1) % 6]; hp.push(0, WATER_Y, 0, B[0] * .999, WATER_Y, B[1] * .999, A[0] * .999, WATER_Y, A[1] * .999); }
    hx.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hx.computeVertexNormals();
    kit.raw(hx, 'water');
  }
  // Wasserfälle an offenen Bachkanten
  for (const i of F.wEdges) if (!nb[i] && F.E[i] === 'w') {
    const [mx, mz] = edgeMid(i, INR - .02), a = edgeAngle(i), ox = Math.cos(a), oz = Math.sin(a), tx = -oz, tz = ox;
    const pos2 = [], uv = [], W = 1.15, H = 30, S = 24;
    for (let k = 0; k <= S; k++) {
      const v = k / S, drop = v * v * H, out = Math.sqrt(v) * 2.2 + v * 1.5, y = WATER_Y + .02 - drop, w = W * (1 + v * .9);
      pos2.push(mx + ox * out - tx * w, y, mz + oz * out - tz * w, mx + ox * out + tx * w, y, mz + oz * out + tz * w);
      uv.push(0, v, 1, v);
    }
    const idx = []; for (let k = 0; k < S; k++) { const b = k * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx);
    fg.computeVertexNormals();
    const ng = fg.toNonIndexed(); kit.raw(ng, 'fall', true);
    F.falls = (F.falls || []).concat([[mx + ox * 1.5, WATER_Y, mz + oz * 1.5, a]]);
  }
}
