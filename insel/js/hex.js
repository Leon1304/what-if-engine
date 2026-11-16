// Sechseck-Raster (spitze Ecke nach +z). Axiale Koordinaten (q, r). Kante i zeigt in Richtung 60°·i (von +x nach +z).
// Ecke i liegt bei 60°·i − 30° – zwischen Kante i−1 und Kante i. Alles in Metern.
export const SQ3 = Math.sqrt(3);
export const R = 6;                                   // Eckradius einer Kachel
export const INR = R * SQ3 / 2;                       // Innenradius (Mitte → Kantenmitte)
export const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
export const key = (q, r) => q + ',' + r;
export const unkey = k => k.split(',').map(Number);
export const opp = i => (i + 3) % 6;
export const center = (q, r) => ({ x: R * SQ3 * (q + r / 2), z: R * 1.5 * r });
export const cornerAt = i => { const a = (60 * i - 30) * Math.PI / 180; return [R * Math.cos(a), R * Math.sin(a)]; };
export const edgeMid = (i, d = INR) => { const a = 60 * i * Math.PI / 180; return [d * Math.cos(a), d * Math.sin(a)]; };
export const edgeAngle = i => 60 * i * Math.PI / 180;
export const neighbor = (q, r, i) => [q + DIRS[i][0], r + DIRS[i][1]];
export const dist = (q1, r1, q2, r2) => (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;

export function pixelToHex(x, z) {
  const q = (SQ3 / 3 * x - z / 3) / R, r = (2 / 3 * z) / R;
  let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
  const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dy = Math.abs(ry + q + r);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dz > dy) rz = -rx - ry;
  return [rx, rz];
}

// Liegt ein lokaler Punkt (x, z) in der Kachel? (mit Rand m)
export function insideHex(x, z, m = 0) {
  for (let i = 0; i < 6; i++) { const a = edgeAngle(i); if (x * Math.cos(a) + z * Math.sin(a) > INR - m) return false; }
  return true;
}

// Deterministischer Zufall
export function hash(...a) { let h = 2166136261; for (const v of a) { const s = String(v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 0x9e37; } return h >>> 0; }
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Weiches Rauschen über Weltkoordinaten (nahtlos zwischen Kacheln)
function vh(ix, iz) { let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = vh(ix, iz), b = vh(ix + 1, iz), c = vh(ix, iz + 1), d = vh(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}
export const fbm = (x, z) => noise(x, z) * .55 + noise(x * 2.1 + 17, z * 2.1 - 9) * .3 + noise(x * 4.7 - 3, z * 4.7 + 5) * .15;
