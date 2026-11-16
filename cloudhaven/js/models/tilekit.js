// Hilfen zum Bestücken einer Kachel (für tilemodel.js und die Erweiterungs-Module extra_*.js).
// F = Gelände-Feld (terrain.js makeField): F.h(x,z) Höhe, F.free(x,z,r) frei (kein Wasser/Weg/Rand), F.roadD/riverD Abstände,
// F.rEdges/F.wEdges Kanten mit Weg/Bach, F.roadP/F.riverP Polylinien. Alles in Kachel-Koordinaten (Mitte = 0,0).
import { INR, edgeMid, edgeAngle } from '../hex.js';
import { WATER_Y } from '../terrain.js';
import * as N from './nature.js';
export { INR, edgeMid, edgeAngle, WATER_Y, N };
export const firstEdge = (E, c) => { const i = E.indexOf(c); return i < 0 ? 0 : i; };

// Zufällige freie Punkte in der Kachel
export function scatter(k, F, n, r, fn, tries = 30, taken = []) {
  for (let i = 0; i < n; i++) for (let t = 0; t < tries; t++) {
    const a = k.R(0, 6.283), d = Math.sqrt(k.rand()) * INR, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!F.free(x, z, r)) continue;
    if (taken.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2] + r)) continue;
    taken.push([x, z, r]); k.ground = F.h(x, z); fn(x, k.ground, z); k.ground = 0; break;
  }
  return taken;
}
// Gebäude an (x,z) mit Fundament auf dem höchsten Punkt der Grundfläche
export function groundMax(F, x, z, r) { let m = -9; for (let a = 0; a < 6.28; a += .7) for (const d of [0, r * .5, r]) m = Math.max(m, F.h(x + Math.cos(a) * d, z + Math.sin(a) * d)); return m; }
export function place(k, F, x, z, r, ry, fn) { const y = groundMax(F, x, z, r); k.ground = y; k.push([x, y, z], ry); k.layer = 'bldg'; const out = fn() || {}; k.layer = 'base'; k.pop(); k.ground = 0; return out; }
// Gebäude ohne Bodenanpassung (Brücke, Mühle am Bach, Markt …) – ebenfalls als Hindernis für die Kamera
export function bld(k, p, ry, fn) { k.layer = 'bldg'; k.in(p, ry, fn); k.layer = 'base'; }
export const rot = i => -i * Math.PI / 3;

// Wiesen-Kleinkram (Gras, Blumen, Steine)
export function meadow(k, F, amount = 1, taken = []) {
  scatter(k, F, Math.round(22 * amount), .15, (x, y, z) => N.grass(k, [x, y, z], k.R(.8, 1.3)), 12, taken);
  const fc = k.pick([0xf2e14a, 0xffffff, 0xe85a8a, 0x8a6ae8]);
  for (let c = 0; c < Math.round(4 * amount); c++) {
    const a = k.R(0, 6.28), d = k.R(0, INR * .8), cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    for (let i = 0; i < 7; i++) { const x = cx + k.R(-.7, .7), z = cz + k.R(-.7, .7); if (F.free(x, z, .1)) N.flower(k, [x, F.h(x, z), z], k.rand() < .7 ? fc : undefined); }
  }
  if (k.rand() < .7) scatter(k, F, 1 + Math.floor(k.R(0, 2)), .6, (x, y, z) => N.rock(k, [x, y, z], k.R(.5, 1.1)), 20, taken);
  return taken;
}
export function banks(k, F) {                 // Schilf und Steine entlang des Bachs
  for (const L of F.riverP) for (let i = 0; i < L.length - 1; i++) for (let s = 0; s < 3; s++) {
    const t = k.rand(), x0 = L[i][0] + (L[i + 1][0] - L[i][0]) * t, z0 = L[i][1] + (L[i + 1][1] - L[i][1]) * t;
    const dx = L[i + 1][0] - L[i][0], dz = L[i + 1][1] - L[i][1], l = Math.hypot(dx, dz) || 1, side = k.rand() < .5 ? -1 : 1, off = 1.25 + k.R(0, .35);
    const x = x0 - dz / l * off * side, z = z0 + dx / l * off * side;
    if (Math.hypot(x, z) > INR - .4) continue;
    if (k.rand() < .55) N.reed(k, [x, Math.max(F.h(x, z), WATER_Y), z]);
    else if (k.rand() < .5) N.rock(k, [x0 + k.R(-.4, .4), F.h(x0, z0) + .05, z0 + k.R(-.4, .4)], k.R(.25, .45));
  }
}


// Laterne auf Pfahl (nachts an), mit spot 'light'
export function lamp(k, F, x, z) {
  const y = F.h(x, z); k.cyl(0x3a3028, [x, y - .2, z], .07, 2.6, 6); k.cyl(0x2a2622, [x, y + 2.3, z], .12, .08, 6);
  k.box(0x2e2a26, [x, y + 2.36, z], [.3, .05, .3]); k.box(0xffd890, [x, y + 2.41, z], [.2, .3, .2], { layer: 'glow', tag: 1 });
  k.cone(0x2a2622, [x, y + 2.71, z], .24, .2, 4, { r: [0, Math.PI / 4, 0] }); k.spot('light', [x, y + 2.55, z]);
}
