// Logik-Test ohne Browser: Geometriegrößen, 100 s Simulation mit Tag/Nacht/Jahreszeiten, wiederholtes setTiles, alle Feiern, dispose.
//   node insel/tools/life-logic.mjs   → endet mit LIFE LOGIC OK
import * as THREE from 'three';
const { Life } = await import('../js/life.js');
const scene = new THREE.Scene(); const L = new Life(scene, { groundAt: () => 0 });
for (const [n, m] of [['villager', L.vMesh], ['quad', L.qMesh], ['critter', L.cMesh]]) console.log(n, m.geometry.attributes.position.count / 3, 'tris/instance');
let n = 0; L.balloon.g.traverse(o => { if (o.isMesh && o.material.visible !== false) n += o.geometry.attributes.position.count / 3; }); console.log('balloon', n);
// Logik-Test ohne Grafik: Wegnetz, Bewohner, Update
const R = 6, S3 = Math.sqrt(3), c = (q, r) => ({ x: R * S3 * (q + r / 2), z: R * 1.5 * r });
const em = i => { const a = i * Math.PI / 3, d = R * S3 / 2; return [Math.cos(a) * d, Math.sin(a) * d]; };
const tiles = [];
const T = (q, r, kind, roads, spots = []) => { const C = c(q, r); tiles.push({ key: q + ',' + r, kind, q, r, cx: C.x, cz: C.z, group: 'dorf', groupId: 1, roads: roads.length ? [[C.x, C.z], ...roads.map(i => [C.x + em(i)[0], C.z + em(i)[1]])] : [], spots: spots.map(([type, x, z]) => ({ type, p: [C.x + x, 0, C.z + z] })) }); };
T(0, 0, 'start', [0, 3], [['sit', 0, 2]]); T(1, 0, 'haus', [3], [['door', em(3)[0] * .45, 0], ['smoke', 0, 0]]); T(-1, 0, 'haus', [0], [['door', em(0)[0] * .45, 0]]);
L.setTiles(tiles); let t = 0, errs = 0;
const t0 = performance.now(); for (let i = 0; i < 3000; i++) { t += 1 / 30; try { L.update(1 / 30, t, { night: (Math.sin(t / 40) + 1) / 2, season: t / 50 % 4, rain: 0 }); } catch (e) { errs++; if (errs < 3) console.log(e); } if (i % 500 === 0) L.setTiles(tiles); }
console.log('logic: 100 s simuliert in', (performance.now() - t0).toFixed(0), 'ms, Fehler', errs, 'Bewohner', L.vill.length, L.vill.map(v => v.st).join(','));
L.celebrate('dorf', [0, 0, 0]); for (const k of ['place', 'perfect', 'wald', 'wasser', 'feld', 'berg', 'unlock', 'quest']) L.celebrate(k, new THREE.Vector3(0, 0, 0), 6);
for (let i = 0; i < 300; i++) { t += 1 / 30; L.update(1 / 30, t, { night: .8 }); }
console.log('celebrate ok, events', L.events.length, 'temps', L.temps.length); L.dispose(); console.log('dispose ok', scene.children.length);
if (errs) process.exit(1); console.log('LIFE LOGIC OK');
