// Gesäter Zufall (mulberry32) und Wertrauschen für Vorkommen. Keine Math.random/Date.now – alles reproduzierbar.

// Ein Schritt mulberry32: aus dem (neuen) Zustand s wird eine Zahl in [0, 1).
export function mix(s) {
  let t = s >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const STEP = 0x6D2B79F5;

// Eigenständiger Generator (für einmalige Dinge wie Kartenerzeugung)
export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s = (s + STEP) >>> 0; return mix(s); };
}

// Text → 32-bit-Hash (FNV-1a), z. B. für den Tagesauftrag aus dem Datum
export function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// Ganzzahl-Hash für Gitterpunkte → [0, 1)
export function hash2(seed, x, y) {
  let h = (seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = t => t * t * (3 - 2 * t);
// Wertrauschen, bilinear mit Glättung, Ergebnis [0, 1)
export function valueNoise(seed, x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const a = hash2(seed, ix, iy), b = hash2(seed, ix + 1, iy), c = hash2(seed, ix, iy + 1), d = hash2(seed, ix + 1, iy + 1);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
}
// Zwei Oktaven, normiert auf [0, 1)
export function fbm(seed, x, y, scale) {
  return (valueNoise(seed, x / scale, y / scale) * 0.7 + valueNoise(seed ^ 0x9e3779b9, x * 2 / scale, y * 2 / scale) * 0.3);
}
