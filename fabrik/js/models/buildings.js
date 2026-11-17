// Fließband – alle Gebäude. makeBuilding(type, opts) → { group, update(t, state), ports, size, type, setRot(r), setLevel(l), dispose() }
// Gebaut wird im lokalen Rahmen: Mitte des Gebäudes im Ursprung, Ausgabe nach +x (rot 0), links = −z, rechts = +z.
// Die Gruppe hat ihren Ursprung an der Ecke von Feld (0,0) (Integration: group.position.set(x, 0, y)), 1 Feld = 1 Einheit.
// Drehung rot 0–3 um die Gebäudemitte: 0 = +x, 1 = +z, 2 = −x, 3 = −z. Geometrie wird je Typ/Variante zwischengespeichert.
// state: { busy (bool|0…1), progress (0…1), level (1…5), mk (1…3), gold (bool), fill (0…1, Lager), takt (0…1, Verkauf), filterColor, ore, power (0…1, < 0.05 = Lampe blinkt rot) }
// Neue Typen (power.js, wonder.js) lesen zusätzlich: load (0…1, Kraftwerk), sun (Solar), storm (bool), stage/progress (Wunder) – siehe dort.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit, instantiate, PI, TAU, BELT_Y, starGeo, shade, tpl } from '../kit.js';
import { MATS, makeHeatMat, makeGoldMat, beltMat, U } from '../materials.js';
import { ITEM_LOOK } from './items.js';
import { POWER_DEFS } from './power.js';
import { WONDER_DEFS } from './wonder.js';
import { mkDecor, mkAnim, MK_TYPES } from './upgrades.js';
import { C, LEVEL_C, face, plinth, chute, intake, fstripes, vstripes, beacon, panel, smokeStack, animSmoke, lattice, ladder, railing, bricks, OUT_INDEX } from './parts.js';

export { BELT_Y };
export const SIZES = { band: 1, tunnel: 1, verteiler: 1, sortierer: 1, bohrer: 2, ofen: 2, presse: 2, drahtzug: 2, montage: 3, raffinerie: 3, experiment: 3, labor: 2, verkauf: 2, lager: 2,
  kraftwerk: 3, solar: 2, mast: 1, heizer: 1, drohnenhafen: 2, wunder: 5, grossbohrer: 4 };
// Zusatz-Gebäude aus eigenen Dateien: { size, aoH, build(k, o) → info, anim(ctx, t, state), api(ctx, b) → Methoden, dispose(ctx) }
const EXT = { ...POWER_DEFS, ...WONDER_DEFS };
export const BUILDING_TYPES = Object.keys(SIZES);
// Feld vor der Mitte der Vorderkante (Index entlang der Kante, von −z nach +z gezählt): 2×2 → 1, 3×3 → 1
export { OUT_INDEX };
// Kurvenart aus Ein- und Ausgangsrichtung (Bewegungsrichtung der Teile)
export function beltKind(inDir, outDir) { if (inDir === undefined || inDir === null) return 'straight'; const d = ((outDir - inDir) % 4 + 4) % 4; return d === 1 ? 'right' : d === 3 ? 'left' : 'straight'; }

// Sterne-Plakette: zwei Meshes (an/aus), Geometrie je Stufe zwischengespeichert
const STAR_GEO = {};
function starGeos(n) {
  if (STAR_GEO[n]) return STAR_GEO[n];
  const on = new Kit(5), off = new Kit(6); on.jit = off.jit = 0;
  for (let i = 0; i < 5; i++) { const z = (i - 2) * .085, kk = i < n ? on : off; kk.star(i < n ? 0xffffff : 0x4a4c54, [0, 0, z], .042, .018, { ao: false, r: [0, PI / 2, 0] }); }
  return (STAR_GEO[n] = [on.build().geos.base || null, off.build().geos.base || null]);
}
const starOnMat = MATS.gold, starOffMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .3, flatShading: true });
// Plakette: Geometrie einmal gebaut und von allen Gebäuden geteilt (nur das Stufen-Material ist je Gebäude eigen)
let BADGE_BUILT = null;
const EMPTY_GEO = new THREE.BufferGeometry();
function badgeBuilt() {
  if (BADGE_BUILT) return BADGE_BUILT;
  const k = new Kit(9); k.jit = 0;
  k.bev(0xffffff, [0, 0, 0], [.16, .03, .5], .012, { ao: false, layer: 'lv' });
  k.bev(C.dark, [0, .028, 0], [.12, .006, .46], .004, { ao: false });
  return (BADGE_BUILT = k.build());
}
function makeBadge(levelMat) {
  const g = new THREE.Group();
  const b = instantiate(badgeBuilt(), { ...MATS, lv: levelMat }); g.add(b.group);
  const on = new THREE.Mesh(EMPTY_GEO, starOnMat), off = new THREE.Mesh(EMPTY_GEO, starOffMat); on.position.y = off.position.y = .034; on.castShadow = off.castShadow = false;
  g.add(on, off);
  g.userData.set = n => { const [a, c] = starGeos(Math.max(0, Math.min(5, n | 0))); on.geometry = a || EMPTY_GEO; off.geometry = c || EMPTY_GEO; on.visible = !!a; off.visible = !!c; };
  return g;
}

// ---------- Band-Oberflächen (mit uv für die Pfeile) ----------
const HW = .36;                                          // halbe Bandbreite
function surfStraight(x0 = -.5, x1 = .5, v0 = 0) {
  const g = new THREE.BufferGeometry(), y = BELT_Y;
  const p = [x0, y, -HW, x1, y, HW, x1, y, -HW, x0, y, -HW, x0, y, HW, x1, y, HW];
  const uv = [0, v0, 1, v0 + (x1 - x0), 0, v0 + (x1 - x0), 0, v0, 1, v0, 1, v0 + (x1 - x0)];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
// Kurve: s = +1 rechts (Mitte (−.5, +.5)), −1 links (Mitte (−.5, −.5)); Winkel a von −π/2 bis 0
function arcPt(s, r, a) { return [-.5 + r * Math.cos(a), .5 * s + s * r * Math.sin(a)]; }
function surfCurve(s) {
  const g = new THREE.BufferGeometry(), y = BELT_Y, N = 12, p = [], uv = [];
  for (let i = 0; i < N; i++) {
    const a0 = -PI / 2 + PI / 2 * i / N, a1 = -PI / 2 + PI / 2 * (i + 1) / N, v0 = i / N, v1 = (i + 1) / N;
    const A = arcPt(s, .5 - HW, a0), B = arcPt(s, .5 + HW, a0), Cc = arcPt(s, .5 + HW, a1), D = arcPt(s, .5 - HW, a1);
    const ux = s > 0 ? [0, 1] : [1, 0];
    const q = [[A, ux[0], v0], [B, ux[1], v0], [Cc, ux[1], v1], [A, ux[0], v0], [Cc, ux[1], v1], [D, ux[0], v1]];
    for (const [P, u, v] of q) { p.push(P[0], y, P[1]); uv.push(u, v); }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  // nach oben ausrichten (Dreiecke ggf. umdrehen)
  if (g.attributes.normal.getY(0) < 0) { const P = g.attributes.position.array, UV = g.attributes.uv.array; for (let i = 0; i < P.length; i += 9) for (let j = 0; j < 3; j++) { const t = P[i + 3 + j]; P[i + 3 + j] = P[i + 6 + j]; P[i + 6 + j] = t; }
    for (let i = 0; i < UV.length; i += 6) for (let j = 0; j < 2; j++) { const t = UV[i + 2 + j]; UV[i + 2 + j] = UV[i + 4 + j]; UV[i + 4 + j] = t; } g.computeVertexNormals(); }
  return g;
}
// Seitenschiene als Folge von Kisten entlang Punkten
function railPts(k, pts, col, h = .05, w = .05, y = BELT_Y - .03) {
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) + .004, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    k.in([(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2], -ang, () => { k.box(col, [0, 0, 0], [L, h + .03, w], { layer: 'metal' }); k.box(C.yel, [0, h + .03, 0], [L, .012, w * .7], { layer: 'metal', jit: 0 }); }); }
}
// open = { '-1': true, '1': true }: Einmündung von der Seite (−z links / +z rechts): Schiene dort offen, Übergangsplatte bis zur Feldkante
function beltFrameStraight(k, x0 = -.5, x1 = .5, legs = true, open = {}) {
  const L = x1 - x0, xm = (x0 + x1) / 2;
  k.box(C.steelD, [xm, BELT_Y - .075, 0], [L, .06, HW * 2 - .02], { layer: 'metal' });              // Wanne unter dem Gurt
  k.box(C.rubber, [xm, BELT_Y - .034, 0], [L, .026, HW * 2]);                                          // Gurt-Kante
  for (const s of [-1, 1]) {
    if (!open[s]) { railPts(k, [[x0, s * (HW + .025)], [x1, s * (HW + .025)]], C.steel); k.rivets(C.steelD, [x0 + .1, BELT_Y + .0, s * (HW + .052)], [x1 - .1, BELT_Y + .0, s * (HW + .052)], 3, .01, { r: [PI / 2, 0, 0] }); continue; }
    // Schienenstummel an beiden Ecken (biegen nach außen ab und gehen in die Schienen des einmündenden Bands über)
    for (const e of [-1, 1]) { const xe = e * (HW + .025); railPts(k, [[e * .5, s * (HW + .025)], [xe, s * (HW + .025)], [xe, s * .5]], C.steel); }
    // Übergangsplatte (Gummi auf Stahl) zwischen Gurt und Feldkante, gelbe Einfädel-Pfeile
    k.box(C.steelD, [0, BELT_Y - .075, s * (HW + .07)], [HW * 2, .06, .14], { layer: 'metal' });
    k.box(C.dark, [0, BELT_Y - .02, s * (HW + .07)], [HW * 2 - .02, .03, .15]);
    for (const xx of [-.18, .18]) k.in([xx, BELT_Y + .0, s * (HW + .07)], s > 0 ? PI / 2 : -PI / 2, () => k.prism(C.yel, [0, 0, 0], .1, .008, .07, { layer: 'metal', jit: 0, r: [0, PI / 2, 0], order: 'YXZ' }));
  }
  if (legs) for (const x of [xm]) for (const s of [-1, 1]) { k.box(C.steelD, [x, 0, s * (HW - .02)], [.05, BELT_Y - .08, .04], { layer: 'metal' }); k.box(C.dark, [x, 0, s * (HW - .02)], [.1, .012, .08], { layer: 'metal' }); }
  // Rollen sichtbar unter der Kante
  for (let x = x0 + .125; x < x1; x += .25) k.cyl(C.steel, [x, BELT_Y - .05, 0], .028, HW * 2 + .03, 8, { ax: 'z', layer: 'metal' });
}
// Ringsektor (Viertelkreis um die Kurvenmitte), Höhe h ab y = 0
function sectorGeo(s, ri, ro, h) {
  return tpl(`sector${s}_${ri}_${ro}_${h}`, () => { const sh = new THREE.Shape(), N = 14;
    for (let i = 0; i <= N; i++) { const p = arcPt(s, ro, -PI / 2 + PI / 2 * i / N); i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1]); }
    for (let i = N; i >= 0; i--) { const p = arcPt(s, ri, -PI / 2 + PI / 2 * i / N); sh.lineTo(p[0], -p[1]); }
    return new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 1 }).rotateX(-PI / 2); });
}
function beltFrameCurve(k, s) {
  const N = 10, inner = [], outer = [], innerR = .5 - HW - .025, outerR = .5 + HW + .025;
  for (let i = 0; i <= N; i++) { const a = -PI / 2 + PI / 2 * i / N; inner.push(arcPt(s, innerR, a)); outer.push(arcPt(s, outerR, a)); }
  railPts(k, inner, C.steel); railPts(k, outer, C.steel);
  k.add(sectorGeo(s, .5 - HW + .01, .5 + HW - .01, .06), C.steelD, [0, BELT_Y - .075, 0], [1, 1, 1], { layer: 'metal' });
  k.add(sectorGeo(s, .5 - HW, .5 + HW, .026), C.rubber, [0, BELT_Y - .034, 0], [1, 1, 1]);
  const m = arcPt(s, .5, -PI / 4); for (const r of [-1, 1]) { const q = arcPt(s, .5 + r * (HW - .03), -PI / 4); k.box(C.steelD, [q[0], 0, q[1]], [.05, BELT_Y - .08, .05], { layer: 'metal' }); k.box(C.dark, [q[0], 0, q[1]], [.09, .012, .09], { layer: 'metal' }); }
  k.cyl(C.steelD, [m[0], BELT_Y - .06, m[1]], .05, .02, 10, { layer: 'metal' });
}

// ---------- Vorlagen-Bau je Typ ----------
const DEFS = {};
function beltTemplate(kind) {
  const k = new Kit(11); k.aoH = .25;
  if (kind === 'straight' || kind === 'straightL' || kind === 'straightR' || kind === 'straightLR') {
    const open = { '-1': kind === 'straightL' || kind === 'straightLR', '1': kind === 'straightR' || kind === 'straightLR' };
    beltFrameStraight(k, -.5, .5, true, open); k.add(surfStraight(), 0xffffff, [0, 0, 0], [1, 1, 1], { layer: 'belt', keepUv: true, ao: false, jit: 0 }); }
  else if (kind === 'left' || kind === 'right') { const s = kind === 'right' ? 1 : -1; beltFrameCurve(k, s); k.add(surfCurve(s), 0xffffff, [0, 0, 0], [1, 1, 1], { layer: 'belt', keepUv: true, ao: false, jit: 0 }); }
  else if (kind === 'tunnelIn' || kind === 'tunnelOut') tunnelBuild(k, kind === 'tunnelOut');
  return k;
}
// Tunnel: Portal aus Beton mit dunkler Öffnung; Eingang (Teile verschwinden nach +x) / Ausgang (kommen von −x heraus)
function tunnelBuild(k, exit) {
  const sx = exit ? -1 : 1;                                // Portal-Seite
  k.in([0, 0, 0], exit ? PI : 0, () => {
    beltFrameStraight(k, -.5, .1, true);
    k.add(surfStraight(-.5, .1, 0), 0xffffff, [0, 0, 0], [1, 1, 1], { layer: 'belt', keepUv: true, ao: false, jit: 0 });
    // Rampe nach unten im Portal
    k.box(C.black, [.28, 0, 0], [.4, BELT_Y - .02, HW * 2], { ao: false });
    // Portal
    for (const s of [-1, 1]) { k.bev(C.concrete, [.26, 0, s * .43], [.5, .62, .13], .03); vstripes(k, [.01, .28, s * .43], 2, .44, .11); }
    k.bev(C.concrete2, [.26, .5, 0], [.54, .14, 1], .035);
    k.bev(C.concrete, [.3, .62, 0], [.46, .05, .9], .02);
    k.box(C.black, [.2, BELT_Y - .02, 0], [.5, .5 - BELT_Y + .02, .74], { ao: false });
    fstripes(k, [-.01, .57, 0], 2, .74, .1);
    // Hut mit Lampe + Pfeil-Symbol (rein/raus)
    k.cyl(C.dark, [.3, .67, -.3], .03, .05, 8, { layer: 'metal' }); k.ball(0xffb040, [.3, .74, -.3], .03, { layer: 'glow', detail: 1 });
    k.in([.35, .68, .15], 0, () => { k.bev(C.blue, [0, 0, 0], [.16, .015, .16], .01); k.prism(0xffffff, [.0, .015, 0], .1, .006, .09, { layer: 'glow', r: [0, exit ? -PI / 2 : PI / 2, 0], order: 'YXZ' }); });
    // Gebrauchsspuren, Bolzen
    k.rivets(C.steelD, [.5, .55, -.44], [.5, .55, .44], 4, .015, { r: [0, 0, PI / 2] });
    for (let i = 0; i < 3; i++) k.ball(0x6a7a4a, [k.R(.1, .45), .6, k.R(-.4, .4)], [.05, .02, .04], { detail: 0 });
  });
}

// Maschinen bauen (k, opts) → info { badge: [x,y,z], lamp: true, heatColor, chuteZ }
const MACH = {
  bohrer(k, o) {
    const n = 2; plinth(k, n); chute(k, n, .5, C.orange);
    // Bohrloch mit Kragen und Erzbrocken (Ebene 'ore' → Farbe des Vorkommens)
    k.cyl(C.black, [-.1, .061, -.1], .26, .006, 14, { ao: false });
    k.ring(C.steelD, [-.1, .06, -.1], .34, .25, .05, 16, { layer: 'metal' });
    k.stripes([-.1, .11, -.1], .5, .05, .004, { r: [0, PI / 4, 0] });
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + k.R(0, .4), r = k.R(.36, .5); k.ball(0xffffff, [-.1 + Math.cos(a) * r, .07, -.1 + Math.sin(a) * r], [k.R(.04, .07), k.R(.03, .05), k.R(.04, .06)], { dod: true, layer: 'ore', r: [k.R(0, 3), k.R(0, 3), 0] }); }
    // Turm
    k.in([-.1, 0, -.1], 0, () => {
      lattice(k, .52, .26, .06, 1.38, C.orange, C.orangeD);
      k.bev(C.dark, [0, 1.36, 0], [.72, .06, .72], .02, { layer: 'metal' });
      railing(k, 1.42, .34, .34, C.yel, 0);
      // Motor oben
      k.bev(C.orange, [0, 1.42, .02], [.42, .3, .38], .04);
      for (let i = 0; i < 5; i++) k.box(C.steelD, [-.22, 1.47 + i * .045, .02], [.02, .025, .3], { layer: 'metal' });
      k.bev(C.dark, [0, 1.72, .02], [.3, .05, .26], .02, { layer: 'metal' });
      k.pipe(C.steelD, [[.12, 1.7, -.1], [.12, 1.9, -.1], [.2, 1.98, -.1]], .03, { layer: 'metal' });
      smokeStack(k, [.24, 2.0, -.1], 'smoke', 0x8a8680);
      beacon(k, [-.12, 1.72, .12], .08);
      // Bohrkopf (stampft) mit drehendem Bohrer
      k.part('head', [0, .95, 0], h => {
        h.cyl(C.orange, [0, 0, 0], .19, .3, 12, { bevel: .1, bevel2: .1 });
        h.cyl(C.dark, [0, .3, 0], .12, .12, 10, { layer: 'metal' });
        h.beam(C.steelD, [0, .4, 0], [0, .44, 0], .2, { layer: 'metal' });
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; h.ball(C.steelD, [Math.cos(a) * .19, .27, Math.sin(a) * .19], .016, { detail: 0, layer: 'metal' }); }
        h.cyl(C.yel, [0, .12, 0], .195, .06, 12);
        for (const s of [-1, 1]) h.box(C.steel, [0, .02, s * .2], [.08, .26, .03], { layer: 'metal' });       // Führungsschuhe
        h.part('bit', [0, 0, 0], b => {
          b.cyl(C.steelD, [0, -.12, 0], .08, .12, 8, { layer: 'metal' });
          for (let i = 0; i < 12; i++) b.in([0, -.14 - i * .045, 0], i * .55, () => b.box(C.steel, [0, 0, 0], [.13 - i * .006, .03, .035], { layer: 'metal', r: [.25, 0, 0] }));
          b.cone(C.steel, [0, -.62, 0], .05, .1, 8, { layer: 'metal', r: [PI, 0, 0] });
          b.cyl(C.steelD, [0, -.66, 0], .03, .56, 6, { layer: 'metal' });
        });
      });
    });
    // Seitlicher Erzbehälter
    k.in([.35, 0, -.55], 0, () => {
      k.wedge(C.orangeD, [0, .06, 0], .5, .25, .4, { r: [0, PI, 0] });
      k.bev(C.orange, [0, .06, 0], [.5, .1, .4], .02);
      for (const x of [-.24, .24]) k.box(C.orangeD, [x, .06, 0], [.03, .26, .42]);
      for (let i = 0; i < 6; i++) k.ball(0xffffff, [k.R(-.18, .18), .2, k.R(-.14, .14)], [.06, .04, .05], { dod: true, layer: 'ore' });
    });
    ladder(k, [-.68, .06, .3], 1.3, PI / 2);
    panel(k, [.55, .06, -.08], 0, C.orangeD);
    return { badge: [.55, .065, .62], heatColor: 0xff8a30 };
  },
  // Großbohrer 4×4 (aus 4 Bohrern verschmolzen): Bohrturm mit Kronenrad über der Hauptbohrung, vier Nebenbohrer in den Ecken,
  // Sammelrohre in einen Erztrichter, EIN Ausgang vorn; Leitstand mit Fenstern, Tanks, Leitern, Geländer, Schornsteine.
  grossbohrer(k, o) {
    const n = 4; plinth(k, n, { h: .08 }); chute(k, n, .5, C.orange);
    // Hauptbohrung mit Kragen, Warnring und Erzbrocken
    const cx = -.25, cz = -.2;
    k.cyl(C.black, [cx, .081, cz], .5, .006, 18, { ao: false });
    k.ring(C.steelD, [cx, .08, cz], .66, .5, .07, 22, { layer: 'metal' });
    k.ring(C.yel, [cx, .15, cz], .7, .64, .012, 22);
    for (let i = 0; i < 12; i++) k.cyl(C.dark, [cx + Math.cos(i / 12 * TAU) * .58, .15, cz + Math.sin(i / 12 * TAU) * .58], .022, .02, 6, { layer: 'metal' });
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + k.R(0, .3), r = k.R(.72, .95); k.ball(0xffffff, [cx + Math.cos(a) * r, .1, cz + Math.sin(a) * r], [k.R(.05, .1), k.R(.04, .07), k.R(.05, .09)], { dod: true, layer: 'ore', r: [k.R(0, 3), k.R(0, 3), 0] }); }
    // Bohrturm (Gitter), zwei Plattformen, Kronenrad
    k.in([cx, 0, cz], 0, () => {
      lattice(k, .62, .3, .08, 1.5, C.orange, C.orangeD);
      k.in([0, 1.5, 0], 0, () => lattice(k, .3, .2, 0, 1.25, C.orange, C.orangeD));
      k.bev(C.dark, [0, 1.48, 0], [.86, .06, .86], .02, { layer: 'metal' });
      railing(k, 1.54, .42, .42, C.yel, 0);
      k.bev(C.dark, [0, 2.72, 0], [.56, .06, .56], .02, { layer: 'metal' });
      railing(k, 2.78, .27, .27, C.yel, -1);
      // Kronenrad mit Lagerböcken (Teil 'crown' dreht sich um x)
      for (const z of [-.16, .16]) k.bev(C.steelD, [0, 2.78, z], [.12, .3, .05], .015, { layer: 'metal' });
      k.part('crown', [0, 3.0, 0], c => {
        c.gear(C.orange, [0, 0, 0], .26, .07, 14, { r: [PI / 2, 0, 0], hole: .25 });
        c.cyl(C.dark, [0, 0, 0], .07, .36, 10, { layer: 'metal', r: [PI / 2, 0, 0] });
        for (let i = 0; i < 6; i++) c.in([0, 0, 0], 0, () => c.box(C.steelD, [Math.cos(i / 6 * TAU) * .13, Math.sin(i / 6 * TAU) * .13, 0], [.03, .03, .09], { layer: 'metal' }));
      });
      beacon(k, [.2, 2.78, .2], .16);
      // Seile vom Kronenrad zum Bohrkopf
      for (const x of [-.05, .05]) k.box(C.dark, [x, 1.62, 0], [.012, 1.36, .012], { layer: 'metal', ao: false });
      // Motorhaus auf der unteren Plattform
      k.in([.18, 1.54, -.22], 0, () => {
        k.bev(C.orange, [0, 0, 0], [.42, .34, .3], .04);
        for (let i = 0; i < 6; i++) k.box(C.steelD, [-.215, .05 + i * .045, 0], [.02, .025, .24], { layer: 'metal' });
        k.bev(C.dark, [0, .34, 0], [.32, .05, .24], .02, { layer: 'metal' });
        k.pipe(C.steelD, [[.1, .36, .06], [.1, .62, .06], [.18, .7, .06]], .03, { layer: 'metal' });
        smokeStack(k, [.22, .74, .06], 'smoke', 0x8a8680);
      });
      // Großer Bohrkopf (stampft) mit drehendem Bohrer
      k.part('head', [0, 1.05, 0], h => {
        h.cyl(C.orange, [0, 0, 0], .3, .36, 14, { bevel: .1, bevel2: .1 });
        h.cyl(C.yel, [0, .16, 0], .305, .07, 14);
        h.cyl(C.dark, [0, .36, 0], .18, .14, 12, { layer: 'metal' });
        h.beam(C.steelD, [0, .5, 0], [0, .56, 0], .26, { layer: 'metal' });
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; h.ball(C.steelD, [Math.cos(a) * .3, .32, Math.sin(a) * .3], .02, { detail: 0, layer: 'metal' }); }
        for (const s of [-1, 1]) h.box(C.steel, [0, .04, s * .31], [.1, .32, .04], { layer: 'metal' });
        h.part('bit', [0, 0, 0], b => {
          b.cyl(C.steelD, [0, -.14, 0], .13, .14, 10, { layer: 'metal' });
          for (let i = 0; i < 14; i++) b.in([0, -.16 - i * .05, 0], i * .5, () => b.box(C.steel, [0, 0, 0], [.22 - i * .009, .035, .05], { layer: 'metal', r: [.25, 0, 0] }));
          b.cone(C.steel, [0, -.86, 0], .08, .14, 8, { layer: 'metal', r: [PI, 0, 0] });
        });
      });
    });
    ladder(k, [cx - .66, .08, cz + .3], 1.42, PI / 2);
    // Vier Nebenbohrer in den Ecken mit Sammelrohren zum Erztrichter
    const hop = [1.15, .5];
    const sat = [[-1.42, -1.42], [-1.42, 1.42], [1.4, -1.42], [1.42, 1.48]];
    sat.forEach(([x, z], i) => {
      k.ring(C.steelD, [x, .08, z], .3, .2, .05, 14, { layer: 'metal' });
      for (let j = 0; j < 5; j++) { const a = j / 5 * TAU + i; k.ball(0xffffff, [x + Math.cos(a) * .32, .1, z + Math.sin(a) * .32], [.05, .035, .045], { dod: true, layer: 'ore' }); }
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.beam(C.orangeD, [x + a * .22, .08, z + b * .22], [x + a * .1, .72, z + b * .1], .035, { layer: 'metal' });
      k.bev(C.orange, [x, .7, z], [.3, .2, .3], .03);
      k.bev(C.dark, [x, .9, z], [.22, .05, .22], .015, { layer: 'metal' });
      k.part('drl' + i, [x, .7, z], d => {
        d.cyl(C.steelD, [0, -.1, 0], .07, .1, 8, { layer: 'metal' });
        for (let j = 0; j < 7; j++) d.in([0, -.12 - j * .06, 0], j * .6, () => d.box(C.steel, [0, 0, 0], [.12 - j * .008, .03, .03], { layer: 'metal', r: [.25, 0, 0] }));
      });
      // Sammelrohr (Förderschlauch) zum Trichter
      const mid = [(x + hop[0]) / 2, .62, (z + hop[1]) / 2];
      k.pipe(C.steelD, [[x, .82, z], [x + (hop[0] - x) * .2, .82, z + (hop[1] - z) * .2], mid, [hop[0] - .08 * Math.sign(hop[0] - x || 1), .6, hop[1]]], .055, { layer: 'metal' });
      for (let j = 1; j <= 3; j++) { const t = j / 4; k.cyl(C.yel, [x + (hop[0] - x) * t, .78 - .12 * t, z + (hop[1] - z) * t], .065, .03, 8); }
    });
    // Erztrichter über der Rutsche
    k.in([hop[0], 0, hop[1]], 0, () => {
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.box(C.steelD, [a * .22, .08, b * .22], [.05, .5, .05], { layer: 'metal' });
      k.wedge(C.orangeD, [0, .5, 0], .56, .22, .56, { r: [0, 0, PI] });
      k.bev(C.orange, [0, .56, 0], [.6, .14, .6], .03);
      for (let j = 0; j < 8; j++) k.ball(0xffffff, [k.R(-.2, .2), .72, k.R(-.2, .2)], [.07, .05, .06], { dod: true, layer: 'ore' });
      k.stripes([.31, .62, 0], .56, .06, .004, { r: [0, PI / 2, 0] });
    });
    // Leitstand mit Fenstern, Tür, Antenne
    k.in([-1.45, 0, 0], 0, () => {
      k.bev(C.cream, [0, .08, 0], [.6, .62, .9], .04);
      k.bev(C.orangeD, [0, .7, 0], [.68, .06, .98], .02);
      face(k, [0, 0, 0], 0, () => { for (const z of [-.24, .24]) { k.box(C.dark, [.305, .5, z], [.01, .22, .3], { ao: false }); k.box(C.glass, [.31, .5, z], [.006, .18, .26], { layer: 'glow', ao: false }); } });
      face(k, [0, 0, 0], 3, () => { k.box(C.steelD, [.46, .3, 0], [.012, .4, .22], { layer: 'metal' }); k.cyl(C.yel, [.47, .32, .08], .015, .012, 6, { ax: 'x' }); });
      k.cyl(C.steelD, [.18, .76, .3], .012, .5, 6, { layer: 'metal' }); k.ball(0xff3a2a, [.18, 1.27, .3], .025, { layer: 'glow', detail: 1 });
      k.cyl(C.dark, [-.12, .76, -.25], .09, .03, 10, { layer: 'metal' });
      k.part('dish', [-.12, .82, -.25], d => { d.cyl(C.white, [0, .06, 0], .14, .03, 12, { r: [.5, 0, 0] }); d.cyl(C.steelD, [0, 0, 0], .02, .08, 6, { layer: 'metal' }); });
    });
    // Tanks hinten (Kühlwasser, Diesel) mit Rohren zum Turm
    for (const [x, col] of [[-.15, C.blue], [.55, C.red]]) {
      k.cyl(col, [x, .08, -1.6], .24, .6, 14, { bevel: .15, bevel2: .15 });
      for (const y of [.2, .5]) k.cyl(C.steelD, [x, .08 + y, -1.6], .245, .03, 14, { layer: 'metal' });
      k.ring(C.yel, [x, .69, -1.6], .2, .16, .02, 12);
    }
    k.pipe(C.copper, [[-.15, .5, -1.36], [-.15, .5, -1.0], [cx, .5, cz - .7]], .028, { layer: 'metal' });
    k.pipe(C.copper, [[.55, .3, -1.36], [.55, .3, -.95], [cx + .5, .3, cz - .5]], .024, { layer: 'metal' });
    panel(k, [1.55, .08, -.55], 0, C.orangeD);
    beacon(k, [1.75, .08, 1.0], .2);
    for (const z of [-1.0, 1.0]) k.stripes([0, .081, z * 1.92], 3.6, .06, .005, {});
    return { badge: [1.6, .085, -1.75], heatColor: 0xff8a30 };
  },
  ofen(k, o) {
    const n = 2; plinth(k, n); chute(k, n, .5, C.steelD);
    // Ziegelkörper
    const W = .68;
    k.bev(C.mortar, [-.08, .06, -.1], [W * 2 - .16, .9, W * 2 - .2], .03);
    const mouth = (z, y) => Math.abs(z + .1) < .3 && y > .14 && y < .62;
    for (const a of [0, 1, 2, 3]) {
      const hx = a % 2 === 0 ? (W - .08) : (W - .1), sx = a === 0 ? .08 * -1 : a === 2 ? -.08 : 0;
      face(k, a % 2 === 0 ? [a === 0 ? -.08 + W - .08 : -.08 - W + .08, 0, -.1] : [-.08, 0, a === 1 ? -.1 + W - .1 : -.1 - W + .1], a, () =>
        bricks(k, -(a % 2 === 0 ? W - .1 : W - .08), (a % 2 === 0 ? W - .1 : W - .08), .07, .95, a === 0 ? (z, y) => mouth(z, y) : null));
    }
    // Feuermaul vorn (Ebene 'heat')
    face(k, [.52, 0, -.1], 0, () => {
      k.box(0x401c10, [-.06, .14, 0], [.12, .48, .6], { ao: false });
      k.box(0xff9a40, [-.04, .16, 0], [.03, .42, .54], { layer: 'heat', ao: false });
      k.prism(0xff7a20, [-.03, .62, 0], .54, .12, .04, { layer: 'heat', r: [0, PI / 2, 0], order: 'YXZ' });
      for (let i = 0; i < 5; i++) k.box(C.dark, [.015, .15, -.24 + i * .12], [.025, .46, .03], { layer: 'metal' });
      k.box(C.dark, [.015, .4, 0], [.025, .03, .6], { layer: 'metal' });
      k.bev(C.steelD, [.0, .62, 0], [.08, .1, .74], .02, { layer: 'metal' });
      k.box(0xff8a30, [.02, .065, 0], [.06, .02, .5], { layer: 'heat', ao: false });       // Glut-Schale
    });
    // Haube und Schornstein
    k.bev(C.dark, [-.08, .96, -.1], [1.3, .1, 1.24], .04, { layer: 'metal' });
    k.bev(C.steelD, [-.12, 1.06, -.1], [.9, .2, .9], .08, { layer: 'metal' });
    k.rivets(C.steel, [-.6, 1.02, .5], [.45, 1.02, .5], 7, .016);
    k.cyl(C.brick, [-.35, 1.2, -.4], .17, .9, 10);
    for (const y of [1.35, 1.7, 2.0]) k.cyl(C.dark, [-.35, y, -.4], .185, .05, 10, { layer: 'metal' });
    k.cyl(C.dark, [-.35, 2.1, -.4], .2, .05, 10, { layer: 'metal' });
    k.cone(C.dark, [-.35, 2.22, -.4], .24, .1, 10, { layer: 'metal' });
    for (let i = 0; i < 3; i++) k.beam(C.dark, [-.35 + Math.cos(i * 2.1) * .14, 2.15, -.4 + Math.sin(i * 2.1) * .14], [-.35 + Math.cos(i * 2.1) * .14, 2.23, -.4 + Math.sin(i * 2.1) * .14], .02, { layer: 'metal' });
    smokeStack(k, [-.35, 2.3, -.4]);
    // Kohlekasten hinten
    k.in([-.72, .06, .35], 0, () => { k.bev(C.woodD, [0, 0, 0], [.32, .26, .44], .02); for (let i = 0; i < 7; i++) k.ball(C.coal, [k.R(-.1, .1), .27, k.R(-.15, .15)], [.05, .04, .05], { dod: true }); k.box(C.dark, [.0, .27, -.2], [.02, .2, .02], { layer: 'metal', r: [.4, 0, 0] }); });
    // Thermometer-Zifferblatt (Zeiger als Teil 'needle')
    face(k, [-.08, 0, .58], 1, () => {
      k.cyl(C.dark, [0, .72, 0], .12, .04, 14, { ax: 'x', layer: 'metal' });
      k.cyl(0xf6f0e0, [.025, .72, 0], .1, .01, 14, { ax: 'x', layer: 'glow' });
      for (let i = 0; i < 7; i++) { const a = -2.2 + i * 4.4 / 6; k.box(i > 4 ? 0xe03a2a : C.dark, [.032, .72 + Math.cos(a) * .08, Math.sin(a) * .08], [.004, .018, .006], { r: [a, 0, 0], ao: false }); }
      k.part('needle', [.035, .72, 0], s => s.box(0xe03a2a, [0, 0, 0], [.004, .075, .01], { ao: false }));
    });
    k.pipe(C.copper, [[.3, .7, .58], [.3, .9, .58], [.3, .9, .3]], .025, { layer: 'metal' });
    intake(k, 2, .66, -.1);
    beacon(k, [.42, 1.06, -.6], .1);
    return { badge: [.5, 1.07, .32], heatColor: 0xff6a18 };
  },
  presse(k, o) {
    const n = 2; plinth(k, n); chute(k, n, .5, C.blue);
    // Bett mit Gesenk
    k.bev(C.dark, [-.05, .06, -.08], [1.3, .16, 1.0], .03, { layer: 'metal' });
    k.bev(C.blueD, [-.05, .22, -.08], [.6, .06, .6], .02);
    k.bev(C.steel, [-.05, .28, -.08], [.36, .05, .36], .015, { layer: 'metal' });
    k.box(C.dark, [-.05, .33, -.08], [.28, .006, .28], { layer: 'metal' });
    // Säulen + Kopf
    for (const s of [-1, 1]) { k.bev(C.blue, [-.05, .22, -.08 + s * .42], [.26, 1.1, .2], .04); vstripes(k, [.08, .45, -.08 + s * .42], 0, .4, .16); for (const y of [.4, .9, 1.2]) k.rivets(C.steelD, [.08, y, -.08 + s * .42 - .07], [.08, y, -.08 + s * .42 + .07], 2, .014, { r: [0, 0, PI / 2] }); }
    k.bev(C.blue, [-.05, 1.3, -.08], [.6, .38, 1.12], .06);
    k.bev(C.blueD, [-.05, 1.68, -.08], [.4, .08, .5], .03);
    k.cyl(C.steel, [-.05, 1.76, -.08], .14, .14, 12, { layer: 'metal', bevel: .2 });
    fstripes(k, [.25, 1.49, -.08], 0, .9, .2);
    // Stößel (stampft)
    k.part('ram', [-.05, 1.3, -.08], r => {
      r.cyl(C.steel, [0, -.42, 0], .07, .42, 10, { layer: 'metal' });
      r.bev(C.steelD, [0, -.6, 0], [.42, .18, .42], .03, { layer: 'metal' });
      fstripes(r, [.21, -.51, 0], 0, .4, .14);
      r.bev(C.steel, [0, -.66, 0], [.32, .06, .32], .015, { layer: 'metal' });
    });
    // Schwungrad mit Speichen (Teil 'fly', dreht um z)
    k.bev(C.blueD, [-.5, .22, -.78], [.24, .64, .16], .03);
    k.part('fly', [-.5, .95, -.82], f => {
      f.ring(C.dark, [0, 0, -.04], .34, .27, .08, 20, { r: [PI / 2, 0, 0], layer: 'metal' });
      for (let i = 0; i < 6; i++) f.in([0, 0, 0], 0, () => f.beam(C.steel, [0, 0, 0], [Math.cos(i * TAU / 6) * .28, Math.sin(i * TAU / 6) * .28, 0], .035, { layer: 'metal' }));
      f.cyl(C.red, [0, 0, -.03], .07, .1, 10, { ax: 'z', layer: 'metal' });
      f.box(C.yel, [.29, 0, .02], [.05, .05, .02]);
    });
    k.beam(C.rubber, [-.5, 1.28, -.78], [-.5, 1.48, -.36], .03);
    k.beam(C.rubber, [-.5, .62, -.78], [-.42, 1.4, -.36], .03);
    // Hydrauliktank hinten + Schläuche
    k.cyl(C.red, [-.6, .3, .45], .16, .2, 12, { ax: 'x', layer: 'metal' });
    k.cyl(C.red, [-.6, .06, .45], .17, .5, 12, { layer: 'metal', bevel: .15 });
    k.pipe(C.rubber, [[-.6, .56, .45], [-.6, 1.5, .45], [-.3, 1.5, .3]], .025);
    panel(k, [.55, .06, -.62], 0, C.blueD);
    beacon(k, [-.25, 1.68, -.4], .06);
    intake(k, 2, .66, -.08, C.blueD);
    return { badge: [.55, .065, .1] };
  },
  drahtzug(k, o) {
    const n = 2; plinth(k, n); chute(k, n, .5, C.teal);
    // Tisch
    k.bev(C.teal, [-.08, .06, -.15], [1.4, .42, .95], .05);
    k.bev(C.dark, [-.08, .48, -.15], [1.44, .05, .99], .02, { layer: 'metal' });
    k.stripes([.63, .3, -.15], .02, .9, .12, { r: [0, 0, 0] });
    for (const x of [-.7, .55]) for (const z of [-.6, .3]) k.box(C.tealD, [x, .06, z], [.06, .42, .06]);
    // Drei Zugtrommeln (Teile c0…c2) + Draht
    const cap = [[-.5, -.35], [-.05, -.1], [.32, -.35]];
    cap.forEach(([x, z], i) => {
      k.cyl(C.steelD, [x, .53, z], .05, .04, 8, { layer: 'metal' });
      k.part('c' + i, [x, .57, z], s => { s.cyl(C.steel, [0, 0, 0], .15, .14, 14, { layer: 'metal', bevel: .1, bevel2: .1 }); s.cyl(C.copper, [0, .03, 0], .152, .08, 14, { layer: 'metal' }); s.cyl(C.dark, [0, .14, 0], .05, .03, 8, { layer: 'metal' }); s.box(C.yel, [.1, .14, 0], [.05, .012, .02]); });
    });
    for (let i = 0; i < 2; i++) { const [a, b] = [cap[i], cap[i + 1]]; k.beam(C.copper, [a[0], .64, a[1] + .15], [b[0], .64, b[1] - .15], .012, { layer: 'metal' }); }
    k.beam(C.copper, [cap[2][0] + .1, .64, cap[2][1] + .1], [.45, .7, .25], .012, { layer: 'metal' });
    // Ziehstein-Block
    k.bev(C.steelD, [-.75, .53, -.35], [.14, .18, .18], .02, { layer: 'metal' });
    k.cone(C.steel, [-.68, .62, -.35], .05, .08, 8, { layer: 'metal', r: [0, 0, -PI / 2] });
    // große Spule (Teil 'spool', dreht um z)
    k.bev(C.tealD, [.42, .53, .28], [.16, .2, .4], .02);
    for (const s of [-1, 1]) k.box(C.steelD, [.42, .53, .28 + s * .2], [.05, .32, .03], { layer: 'metal' });
    k.part('spool', [.42, .8, .28], s => {
      for (const z of [-.16, .16]) s.cyl(C.wood, [0, 0, z], .22, .03, 14, { ax: 'z' });
      s.cyl(C.woodD, [0, 0, 0], .07, .34, 10, { ax: 'z' });
      for (let i = 0; i < 6; i++) s.torus(C.copper, [0, 0, -.125 + i * .05], .13, .028, 16, { layer: 'metal' });
      s.box(C.yel, [.19, 0, .17], [.04, .04, .01]);
    });
    // Motor mit Lüfter hinten
    k.bev(C.tealD, [-.75, .06, .35], [.4, .5, .48], .05);
    face(k, [-.95, 0, .35], 2, () => { k.cyl(C.dark, [0, .32, 0], .17, .03, 14, { ax: 'x', layer: 'metal' }); for (let i = -2; i <= 2; i++) k.box(C.steel, [.03, .32 + i * .055, 0], [.012, .012, .3], { layer: 'metal' });
      k.part('fan', [.012, .32, 0], f => { for (let i = 0; i < 4; i++) f.boxc(C.steelD, [0, 0, 0], [.01, .26, .05], { r: [i * PI / 4, 0, 0], layer: 'metal' }); }); });
    k.pipe(C.rubber, [[-.75, .56, .2], [-.75, .7, .0], [-.5, .66, -.2]], .02);
    panel(k, [.55, .06, -.62], 0, C.tealD);
    beacon(k, [-.85, .56, .52], .1);
    return { badge: [-.3, .54, .26] };
  },
  montage(k, o) {
    const n = 3; plinth(k, n); chute(k, n, 0, C.purple);
    // Arbeitsband in der Mitte (Teile laufen zur Rutsche)
    k.bev(C.purpleD, [-.1, .06, 0], [2.3, .1, .62], .03);
    k.in([0, 0, 0], 0, () => { k.add(surfStraight(-1.2, 1.05, 0), 0xffffff, [0, 0, 0], [1, 1, 1], { layer: 'belt', keepUv: true, ao: false, jit: 0 }); });
    for (const s of [-1, 1]) { k.box(C.steel, [-.08, .1, s * .38], [2.25, .14, .05], { layer: 'metal' }); k.box(C.yel, [-.08, .24, s * .38], [2.25, .012, .035], { layer: 'metal' }); }
    // zwei Roboterarme (yaw → Schulter → Ellbogen → Greifer)
    for (const [i, z] of [[0, -.85], [1, .85]]) {
      k.cyl(C.dark, [-.25, .06, z], .22, .08, 12, { layer: 'metal', bevel: .2 });
      k.part('arm' + i, [-.25, .14, z], a => {
        a.cyl(C.purple, [0, 0, 0], .17, .2, 12, { bevel: .2 });
        a.cyl(C.yel, [0, .2, 0], .12, .04, 12);
        a.part('sh' + i, [0, .3, 0], s => {
          s.cyl(C.dark, [0, 0, 0], .085, .26, 10, { ax: 'z', layer: 'metal' });
          s.bev(C.purple, [0, 0, 0], [.13, .55, .14], .04);
          vstripes(s, [.066, .3, 0], 0, .2, .1);
          s.part('el' + i, [0, .52, 0], e => {
            e.cyl(C.dark, [0, 0, 0], .065, .2, 10, { ax: 'z', layer: 'metal' });
            e.bev(C.purple, [0, 0, 0], [.1, .45, .11], .03);
            e.pipe(C.rubber, [[.06, .05, 0], [.07, .25, 0], [.06, .42, 0]], .012);
            e.part('wr' + i, [0, .45, 0], w => {
              w.cyl(C.steelD, [0, 0, 0], .05, .06, 8, { layer: 'metal' });
              for (const s2 of [-1, 1]) w.part('fg' + i + (s2 > 0 ? 'b' : 'a'), [0, .06, s2 * .03], f => { f.box(C.steel, [0, 0, 0], [.03, .1, .02], { layer: 'metal' }); f.box(C.rubber, [0, .08, -s2 * .01], [.03, .03, .02]); });
            });
          });
        });
      });
    }
    // Schutzzaun hinten (gelbe Pfosten mit Kette)
    for (const z of [-1.35, -.6, .6, 1.35]) { k.cyl(C.yel, [-1.38, .06, z], .025, .4, 8); k.ball(C.yel, [-1.38, .47, z], .03, { detail: 0 }); }
    for (const [a, b] of [[-1.35, -.6], [.6, 1.35]]) for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6, sag = y => .36 - Math.sin(y * PI) * .05; k.beam(i % 2 ? C.black : C.yel, [-1.38, sag(t0), a + (b - a) * t0], [-1.38, sag(t1), a + (b - a) * t1], .014, { layer: 'metal' }); }
    // Schaltschrank mit Bildschirm
    k.in([-1.15, .06, 1.1], 0, () => { k.bev(C.purpleD, [0, 0, 0], [.3, .75, .4], .03); k.box(0x10202a, [.152, .4, 0], [.01, .22, .3], { ao: false }); k.box(0x6af0ff, [.158, .42, -.04], [.004, .14, .18], { layer: 'glow', ao: false }); k.box(0xff5ad0, [.158, .36, .1], [.004, .04, .06], { layer: 'glow', ao: false });
      for (let i = 0; i < 3; i++) k.cyl([0xff4a3a, 0x4aff7a, 0xffd040][i], [.15, .2, -.1 + i * .1], .02, .015, 8, { ax: 'x', layer: 'glow' }); k.bev(C.dark, [0, .75, 0], [.34, .04, .44], .015, { layer: 'metal' }); });
    // Teilekisten
    for (const [x, z, c] of [[.95, -1.15, C.blue], [.95, 1.15, C.red], [-1.15, -1.1, C.green]]) k.in([x, .06, z], k.R(-.2, .2), () => { k.bev(c, [0, 0, 0], [.4, .2, .3], .03); k.box(0x000000, [0, .19, 0], [.34, .012, .24], { ao: false, shade: .2 });
      for (let i = 0; i < 5; i++) k.ball(C.steel, [k.R(-.14, .14), .2, k.R(-.1, .1)], .035, { detail: 0, layer: 'metal' }); });
    // Portal mit Lampe über dem Band
    for (const z of [-.5, .5]) k.box(C.dark, [.45, .06, z], [.06, 1.1, .06], { layer: 'metal' });
    k.bev(C.purple, [.45, 1.14, 0], [.12, .1, 1.12], .03);
    k.box(0xfff2c0, [.45, 1.12, 0], [.06, .02, .7], { layer: 'glow' });
    k.cyl(0xffffff, [.45, 1.24, -.4], .035, .04, 8, { layer: 'lamp' });
    intake(k, 2, 1.44, 0, C.purpleD); intake(k, 1, 1.44, -.3, C.purpleD); intake(k, 3, 1.44, .3, C.purpleD);
    panel(k, [1.05, .06, .65], 0, C.purpleD);
    return { badge: [1.05, .065, -.6] };
  },
  raffinerie(k, o) {
    const n = 3; plinth(k, n); chute(k, n, 0, C.green);
    // zwei Tanks hinten
    for (const [i, z] of [[0, -.72], [1, .72]]) {
      const x = -.72;
      k.cyl(C.white, [x, .06, z], .48, 1.25, 16, { bevel: .03 });
      k.lathe(C.white, [x, 1.31, z], [[.48, 0], [.42, .14], [.28, .24], [0, .28]], 16);
      for (const y of [.3, .75, 1.15]) k.cyl(C.green, [x, .06 + y, z], .49, .07, 16);
      k.cyl(C.dark, [x, 1.59, z], .08, .06, 8, { layer: 'metal' });
      ladder(k, [x + .49, .06, z + (i ? -.15 : .15)], 1.3, 0);
      k.box(C.dark, [x + .47, .64, z], [.04, .2, .14], { layer: 'metal' });
      // Füllstands-Rohr
      k.cyl(C.glass, [x + .44, .2, z - (i ? -.3 : .3)], .025, .9, 6, { layer: 'glass' });
      k.part('lvl' + i, [x + .44, .2, z - (i ? -.3 : .3)], s => s.cyl(0x1a1424, [0, 0, 0], .02, .9, 6));
    }
    // Destillationssäule
    k.cyl(C.steel, [.0, .06, -.95], .16, 2.2, 12, { layer: 'metal', bevel: .1 });
    for (const y of [.6, 1.2, 1.8]) { k.cyl(C.dark, [0, y, -.95], .3, .03, 12, { layer: 'metal' }); k.in([0, 0, -.95], 0, () => railing(k, y + .03, .2, .2, C.yel)); }
    k.ball(C.steel, [0, 2.26, -.95], .16, { layer: 'metal', detail: 1 });
    // Fackel mit Flamme (Ebene 'heat')
    k.cyl(C.steelD, [.3, .06, -1.25], .04, 1.8, 8, { layer: 'metal' });
    k.cyl(C.red, [.3, 1.4, -1.25], .045, .2, 8, { layer: 'metal' }); k.cyl(C.white, [.3, 1.6, -1.25], .045, .2, 8, { layer: 'metal' });
    k.part('flame', [.3, 1.86, -1.25], f => { f.cone(0xffb040, [0, 0, 0], .08, .3, 7, { layer: 'heat' }); f.cone(0xfff0a0, [0, 0, 0], .04, .18, 6, { layer: 'heat' }); });
    // Pferdekopfpumpe (Teile 'beam', 'crank')
    k.in([.65, .06, -.5], 0, () => {
      k.bev(C.dark, [0, 0, 0], [.95, .06, .3], .02, { layer: 'metal' });
      for (const s of [-1, 1]) { k.beam(C.green, [-.2, .06, s * .12], [0, .7, s * .03], .05); k.beam(C.green, [.2, .06, s * .12], [0, .7, s * .03], .05); }
      k.part('beam', [0, .72, 0], b => {
        b.bev(C.greenD, [0, -.04, 0], [.9, .08, .08], .02);
        b.in([.45, 0, 0], 0, () => { b.bev(C.yel, [.04, -.2, 0], [.12, .32, .1], .03); b.cyl(C.dark, [.08, -.2, 0], .02, .2, 6, { layer: 'metal' }); });
        b.cyl(C.dark, [0, 0, 0], .05, .14, 8, { ax: 'z', layer: 'metal' });
      });
      k.bev(C.greenD, [-.4, .06, 0], [.16, .3, .2], .03);
      k.part('crank', [-.4, .3, 0], c => { for (const s of [-1, 1]) c.bev(C.red, [-.06, -.04, s * .13], [.24, .08, .04], .015); c.cyl(C.dark, [0, 0, 0], .04, .32, 8, { ax: 'z', layer: 'metal' }); });
      k.cyl(C.steelD, [.5, .06, 0], .05, .22, 8, { layer: 'metal' }); k.cyl(C.dark, [.5, .28, 0], .07, .03, 8, { layer: 'metal' });
    });
    // Ölbecken
    k.in([.7, .06, .65], 0, () => { k.bev(C.concrete2, [0, 0, 0], [.7, .08, .6], .02); k.box(0xffffff, [0, .08, 0], [.6, .03, .5], { layer: 'oil', ao: false }); for (const s of [-1, 1]) { k.bev(C.concrete, [0, 0, s * .27], [.7, .16, .06], .015); k.bev(C.concrete, [s * .32, 0, 0], [.06, .16, .6], .015); } k.stripes([0, .16, -.27], .66, .05, .003); });
    // Rohrleitungen mit Ventilrädern
    k.pipe(C.steel, [[-.72, .5, -.24], [-.72, .5, .24]], .05, { layer: 'metal', flange: C.steelD });
    k.pipe(C.steel, [[-.24, .9, -.72], [0, .9, -.72], [0, .9, -.8]], .045, { layer: 'metal', flange: C.steelD });
    k.pipe(C.dark, [[-.72, .25, .24], [-.3, .25, .2], [.3, .25, .2], [.3, .25, .45]], .04, { layer: 'metal' });
    for (const p of [[-.72, .58, 0], [-.3, .33, .2]]) { k.torus(C.red, p, .07, .012, 10, { layer: 'metal' }); k.beam(C.red, [p[0] - .07, p[1], p[2]], [p[0] + .07, p[1], p[2]], .01, { layer: 'metal' }); }
    intake(k, 2, 1.44, 0, C.greenD); intake(k, 1, 1.44, -.3, C.greenD); intake(k, 3, 1.44, .5, C.greenD);
    beacon(k, [-.72, 1.62, .72], .08);
    panel(k, [1.05, .06, .25], 0, C.greenD);
    return { badge: [1.05, .065, -1.05], heatColor: 0xff8a20 };
  },
  experiment(k, o) {
    const n = 3; plinth(k, n); chute(k, n, 0, C.pink);
    // großer Labortisch
    for (const x of [-.9, .7]) for (const z of [-1, 1]) k.box(C.pinkD, [x, .06, z], [.08, .5, .08]);
    k.bev(C.pink, [-.1, .56, 0], [1.9, .08, 2.3], .03);
    k.bev(C.cream, [-.1, .64, 0], [1.8, .02, 2.2], .01);
    k.box(C.pinkD, [-.1, .2, 0], [1.7, .03, 2.1]);
    // Mischkuppel in der Mitte (Glas) mit wirbelnder Flüssigkeit (Teil 'swirl')
    k.cyl(C.steelD, [-.1, .66, 0], .38, .08, 16, { layer: 'metal', bevel: .1 });
    k.part('swirl', [-.1, .74, 0], s => { s.cyl(0x7affb0, [0, 0, 0], .3, .16, 16, { layer: 'glow', top: .9 }); s.ball(0xb0ffd8, [.12, .17, 0], .05, { layer: 'glow' }); s.ball(0xb0ffd8, [-.1, .15, .1], .035, { layer: 'glow' }); });
    k.ball(C.glass, [-.1, .74, 0], [.34, .42, .34], { layer: 'glass', detail: 2 });
    k.cyl(C.steelD, [-.1, 1.12, 0], .08, .05, 10, { layer: 'metal' });
    // zwei Einlauftrichter (Zutaten)
    for (const z of [-.75, .75]) { k.lathe(C.glass, [-.85, .66, z], [[.04, 0], [.04, .3], [.22, .55], [.24, .58]], 12, { layer: 'glass' }); k.ring(C.steelD, [-.85, 1.2, z], .25, .21, .04, 14, { layer: 'metal' });
      k.pipe(C.copper, [[-.85, .7, z], [-.45, .7, z * .4], [-.3, .72, 0]], .025, { layer: 'metal' }); for (const s of [-1, 1]) k.box(C.steelD, [-.85, .66, z + s * .22], [.03, .58, .03], { layer: 'metal' }); }
    // Kolben mit blubbernder Flüssigkeit (Teile 'b0…')
    const flasks = [[.45, -.75, 0x9a5aff], [.6, -.45, 0x5ac8ff], [.45, .7, 0xffd040], [.62, .45, 0xff6a5a]];
    flasks.forEach(([x, z, c], i) => {
      k.lathe(C.glass, [x, .66, z], [[0, 0], [.1, .01], [.12, .08], [.1, .16], [.035, .22], [.035, .34], [.045, .35]], 12, { layer: 'glass' });
      k.lathe(c, [x, .665, z], [[0, 0], [.09, .01], [.105, .07], [.085, .13], [0, .13]], 12, { layer: 'glow' });
      k.part('b' + i, [x, .72, z], b => { b.ball(shade(c, 1.3), [0, 0, 0], .025, { layer: 'glow', detail: 1 }); b.ball(shade(c, 1.3), [.03, -.04, .02], .018, { layer: 'glow', detail: 1 }); });
    });
    // Bunsenbrenner mit Flamme
    k.cyl(C.steelD, [.2, .66, -.35], .05, .02, 8, { layer: 'metal' }); k.cyl(C.steel, [.2, .68, -.35], .018, .12, 6, { layer: 'metal' });
    k.part('burn', [.2, .8, -.35], f => f.cone(0x5ab0ff, [0, 0, 0], .03, .1, 6, { layer: 'heat' }));
    // Teslaspule hinten rechts mit Funken (Teil 'zap')
    k.in([-1.15, .06, 1.1], 0, () => { k.bev(C.dark, [0, 0, 0], [.34, .1, .34], .03, { layer: 'metal' }); k.cyl(C.cream, [0, .1, 0], .07, .8, 10); for (let i = 0; i < 9; i++) k.torus(C.copper, [0, .16 + i * .075, 0], .075, .012, 10, { layer: 'metal', r: [PI / 2, 0, 0] });
      k.torus(C.steel, [0, .95, 0], .16, .055, 14, { layer: 'metal', r: [PI / 2, 0, 0] }); k.ball(C.steel, [0, 1.0, 0], .08, { layer: 'metal', detail: 1 });
      k.part('zap', [0, .97, 0], z => { for (let i = 0; i < 4; i++) { const a = i * TAU / 4; z.beam(0xc0a0ff, [Math.cos(a) * .2, 0, Math.sin(a) * .2], [Math.cos(a + .4) * .34, .08 * (i % 2 ? 1 : -1), Math.sin(a + .4) * .34], .012, { layer: 'glow', ao: false }); } }); });
    // Fragezeichen-Tafel (Symbol, kein Text)
    k.in([-1.3, .06, -1.05], PI / 4, () => { for (const z of [-.25, .25]) k.box(C.woodD, [0, 0, z], [.04, 1.1, .04]); k.bev(0x2a3a34, [0, .55, 0], [.05, .55, .6], .015);
      k.torus(0xf4f4ec, [.03, .92, 0], .11, .025, 12, { arc: PI * 1.5, r: [0, PI / 2, -PI / 2], layer: 'glow', order: 'YXZ' }); k.box(0xf4f4ec, [.03, .7, 0], [.01, .1, .045], { layer: 'glow' }); k.ball(0xf4f4ec, [.035, .64, 0], .028, { layer: 'glow', detail: 0 }); });
    intake(k, 2, 1.44, -.75, C.pinkD); intake(k, 2, 1.44, .75, C.pinkD); intake(k, 1, 1.44, 0, C.pinkD); intake(k, 3, 1.44, 0, C.pinkD);
    beacon(k, [.75, .66, -1.0], .1);
    panel(k, [1.05, .06, .7], 0, C.pinkD);
    return { badge: [.3, .665, .1], heatColor: 0x7aa8ff };
  },
  labor(k, o) {
    const n = 2; plinth(k, n); chute(k, n, .5, C.blue);
    // kleines Haus: weiße Wände, blaues Tonnendach
    k.bev(C.white, [-.1, .06, -.1], [1.4, .78, 1.3], .04);
    k.bev(C.blue, [-.1, .06, -.1], [1.44, .08, 1.34], .02);
    k.in([-.1, .84, -.1], 0, () => { k.cyl(C.blue, [0, 0, 0], .7, 1.52, 18, { ax: 'x' }); for (const x of [-.6, -.2, .2, .6]) k.cyl(C.blueD, [x, 0, 0], .71, .04, 18, { ax: 'x' }); }, [1, .5, 1]);
    k.box(C.white, [-.1, .84, -.1], [1.48, .01, 1.3], { ao: false });
    k.bev(C.blueD, [-.1, .84, -.1], [1.52, .06, .08], .02);
    // Fenster (Glas) mit hellem Innenraum
    face(k, [.6, 0, -.1], 0, () => {
      k.box(0xfff4d0, [-.02, .36, -.3], [.02, .3, .34], { layer: 'glow' }); k.box(C.glass, [.0, .36, -.3], [.02, .3, .34], { layer: 'glass' });
      k.bev(C.blueD, [0, .34, -.3], [.04, .04, .42], .01); k.bev(C.blueD, [0, .66, -.3], [.04, .04, .42], .01); k.box(C.blueD, [.005, .36, -.3], [.02, .3, .02]);
      // Kolben-Piktogramm an der Tür
      k.bev(C.blueD, [0, .06, .3], [.04, .6, .34], .015); k.box(C.dark, [.022, .3, .42], [.01, .04, .03]);
      k.lathe(C.glass, [.04, .44, .3], [[.0, 0], [.09, .01], [.04, .11], [.02, .16], [.025, .17]], 10, { layer: 'glass', r: [0, 0, 0] });
      k.lathe(0x7affb0, [.04, .445, .3], [[0, 0], [.08, .01], [.05, .07], [0, .07]], 10, { layer: 'glow' });
    });
    // Satellitenschüssel (Teile 'dish' (Gieren) → 'tilt')
    k.cyl(C.steelD, [-.4, 1.35, -.35], .04, .2, 8, { layer: 'metal' });
    k.part('dish', [-.4, 1.55, -.35], d => {
      d.cyl(C.dark, [0, 0, 0], .07, .06, 10, { layer: 'metal' });
      d.part('tilt', [0, .08, 0], t2 => {
        t2.lathe(C.white, [0, 0, 0], [[0, 0], [.18, .04], [.32, .14], [.33, .16], [.17, .07], [0, .03]], 16, { r: [0, 0, -PI / 2.6] });
        t2.beam(C.steelD, [0, 0, 0], [.27, .15, 0], .015, { layer: 'metal' }); t2.ball(C.red, [.27, .15, 0], .03, { layer: 'metal', detail: 0 });
      }, [0, 0, 0]);
    });
    // Antenne mit Blinklicht
    k.cyl(C.steelD, [.25, 1.3, -.55], .015, .5, 6, { layer: 'metal' });
    for (const y of [1.5, 1.65]) k.beam(C.steelD, [.25, y, -.65], [.25, y, -.45], .01, { layer: 'metal' });
    k.ball(0xffffff, [.25, 1.82, -.55], .03, { layer: 'lamp', detail: 1 });
    // Klimagerät mit Lüfter
    k.in([-.88, .3, .3], 0, () => { k.bev(C.steel, [0, 0, 0], [.14, .3, .34], .02, { layer: 'metal' }); face(k, [-.07, 0, 0], 2, () => { k.cyl(C.dark, [0, .15, 0], .12, .01, 12, { ax: 'x' }); k.part('fan', [.01, .15, 0], f => { for (let i = 0; i < 3; i++) f.boxc(C.steel, [0, 0, 0], [.006, .2, .04], { r: [i * PI / 3, 0, 0], layer: 'metal' }); }); }); });
    // Briefschlitz-Trichter auf der Seite (nimmt Teile an)
    intake(k, 2, .62, -.1, C.blueD); intake(k, 3, .62, -.1, C.blueD);
    k.pipe(C.copper, [[.3, .86, .5], [.3, 1.2, .5], [.1, 1.25, .5]], .02, { layer: 'metal' });
    return { badge: [.52, .065, -.62], spots: { steve: [.82, 0, -.55] } };
  },
  verkauf(k, o) {
    const n = 2; plinth(k, n, { stripes: false });
    // Kiosk
    k.bev(C.green, [.08, .06, -.05], [1.1, .7, 1.3], .04);
    k.bev(C.cream, [.1, .06, -.05], [1.04, .14, 1.36], .03);
    face(k, [.63, 0, -.05], 0, () => {           // Tresen vorn mit Kasse
      k.bev(C.cream, [.0, .2, 0], [.14, .08, 1.1], .02);
      k.box(0x2a2224, [-.02, .28, 0], [.04, .36, 1.0], { ao: false });
      k.in([.0, .28, -.25], 0, () => { k.bev(C.steelD, [0, 0, 0], [.16, .14, .22], .02, { layer: 'metal' }); k.box(0x6aff9a, [.06, .12, 0], [.03, .04, .14], { layer: 'glow', r: [0, 0, .6] });
        k.part('drawer', [.06, .02, 0], d => d.bev(C.steel, [.0, 0, 0], [.08, .05, .18], .01, { layer: 'metal' })); });
    });
    // Markise (grün/weiß gestreift)
    for (let i = 0; i < 8; i++) k.in([.7, .78, -.7 + i * .1625 + .08], 0, () => k.wedge(i % 2 ? C.white : C.green, [-.05, 0, 0], .3, .16, .16, { r: [0, PI, 0] }));
    for (let i = 0; i < 8; i++) k.ball(i % 2 ? C.white : C.green, [.86, .76, -.7 + i * .1625 + .08], [.02, .04, .08], { detail: 0 });
    // Dach mit Münz-Schild
    k.bev(C.greenD, [.08, .76, -.05], [1.16, .08, 1.36], .03);
    k.bev(C.cream, [.08, .84, -.05], [1.04, .04, 1.2], .02);
    k.cyl(C.steelD, [.08, .88, -.05], .05, .2, 8, { layer: 'metal' });
    k.part('coin', [.08, 1.38, -.05], c => {
      c.cyl(0xffffff, [0, 0, -.04], .3, .08, 24, { ax: 'z', layer: 'gold', bevel: .12, bevel2: .12, r: [PI / 2, 0, 0] });
      // $-Symbol (beidseitig, erhaben)
      for (const s of [-1, 1]) c.in([0, 0, s * .045], s > 0 ? 0 : PI, () => {
        c.torus(0xffffff, [0, .07, 0], .07, .022, 12, { arc: PI * 1.5, r: [0, 0, PI * .25], layer: 'gold', tseg: 5 });
        c.torus(0xffffff, [0, -.07, 0], .07, .022, 12, { arc: PI * 1.5, r: [0, 0, PI * 1.25], layer: 'gold', tseg: 5 });
        c.box(0xffffff, [0, -.21, 0], [.03, .42, .03], { layer: 'gold' });
        c.ring(0xffffff, [0, 0, 0], .27, .24, .015, 24, { r: [PI / 2, 0, 0], layer: 'gold' });
      });
    });
    // Takt-Ring auf dem Dach (Ebene 'takt' → eigenes Material mit Füllstand)
    k.ring(0xffffff, [.08, .885, -.05], .48, .4, .03, 32, { layer: 'takt', ao: false });
    // Münzschlitz-Trichter hinten oben (nimmt Teile an)
    k.lathe(C.steel, [-.3, .86, .5], [[.05, 0], [.05, .08], [.16, .2], [.18, .22]], 12, { layer: 'metal' });
    k.cyl(C.black, [-.3, 1.0, .5], .14, .07, 12, { ao: false });
    // Lieferwagen-Rampe hinten mit kleinem Wagen (Teil 'van')
    k.bev(C.concrete2, [-.76, .06, -.35], [.42, .03, .7], .01); k.stripes([-.76, .09, -.71 + .03], .4, .04, .003);
    k.part('van', [-.76, .09, -.38], v => {
      v.bev(C.white, [-.05, .07, 0], [.42, .32, .3], .05); v.bev(C.red, [.22, .07, 0], [.14, .24, .28], .05);
      v.box(C.glass, [.29, .2, 0], [.02, .08, .24], { layer: 'glass' }); v.box(C.green, [-.05, .2, .152], [.36, .06, .004]); v.box(C.green, [-.05, .2, -.152], [.36, .06, .004]);
      for (const x of [-.17, .18]) for (const z of [-.15, .15]) v.cyl(C.black, [x, .055, z], .055, .04, 10, { ax: 'z' });
      v.box(0xffe080, [.3, .1, .1], [.01, .03, .04], { layer: 'glow' }); v.box(0xffe080, [.3, .1, -.1], [.01, .03, .04], { layer: 'glow' });
    }, PI / 2);
    for (const a of [1, 3]) intake(k, a, .66, -.05, C.greenD);
    intake(k, 0, .66, .3, C.greenD);
    beacon(k, [.45, .84, -.55], .06);
    return { badge: [.42, .845, .44], takt: true, chuteNone: true };
  },
  lager(k, o) {
    const n = 2; plinth(k, n); chute(k, n, .5, C.wood);
    // Regal: orange Pfosten, blaue Träger, Holzböden – 2 Fächer × 3 Böden; Kisten als Teile 'cr0…' (Füllstand)
    const xs = [-.62, -.02], zs = [-.72, .0, .55], ys = [.08, .45, .82];
    for (const x of [-.7, -.35, .05]) for (const z of [-.78, .62]) k.bev(C.orange, [x, .06, z], [.05, 1.15, .05], .01, { layer: 'metal' });
    for (const y of ys) { for (const z of [-.78, .62]) k.box(C.blue, [-.32, y + .02, z], [.8, .05, .04], { layer: 'metal' }); k.box(C.wood, [-.32, y + .07, -.08], [.78, .025, 1.36]); for (const x of [-.7, -.35, .05]) k.box(C.blue, [x, y + .02, -.08], [.04, .05, 1.36], { layer: 'metal' }); }
    for (const z of [-.78, .62]) for (let i = 0; i < 3; i++) k.beam(C.orangeD, [-.7, .1 + i * .35, z], [-.35, .4 + i * .35, z], .015, { layer: 'metal' });
    let ci = 0;
    for (const y of ys) for (const x of [-.52, -.15]) for (const z of [-.5, .3]) {
      const c = [C.wood, C.woodD, 0xc89a5a][ci % 3];
      k.part('cr' + ci, [x, y + .095, z], s => { const w = s.R(.26, .3), h = s.R(.2, .27); s.bev(c, [0, 0, 0], [w, h, .5], .02); for (const zz of [-.18, .18]) s.box(shade(c, .75), [0, 0, zz], [w + .006, h, .03]); s.box(shade(c, .75), [0, h * .5, 0], [w + .006, .03, .5]); s.box(C.steel, [w / 2 + .004, h * .6, 0], [.004, .05, .1], { layer: 'metal' }); }, k.R(-.08, .08));
      ci++;
    }
    // Kopfträger mit Firmenschild (Kisten-Symbol) + Füllstandsanzeige
    for (const z of [-.78, .62]) k.bev(C.orange, [-.32, 1.2, z], [.8, .06, .06], .015, { layer: 'metal' });
    k.in([-.32, 1.26, -.08], 0, () => { k.bev(C.blue, [0, 0, 0], [.08, .2, .5], .02); face(k, [.04, 0, 0], 0, () => { k.bev(C.wood, [.005, .05, 0], [.01, .1, .12], .01); k.box(C.woodD, [.011, .095, 0], [.004, .012, .13]); }); });
    k.bev(C.dark, [.35, .06, -.45], [.16, .5, .2], .02, { layer: 'metal' });
    k.box(0x10202a, [.432, .3, -.45], [.006, .16, .1], { ao: false });
    k.part('gauge', [.437, .23, -.45], g => g.box(0x5aff8a, [0, 0, 0], [.004, .14, .07], { layer: 'glow', ao: false }));
    intake(k, 2, .66, -.08, C.woodD); intake(k, 1, .66, -.3, C.woodD); intake(k, 3, .66, -.3, C.woodD);
    beacon(k, [.35, .56, -.45], .04);
    return { badge: [.5, .065, -.15], crates: ci };
  },
  verteiler(k, o) {
    beltFrameStraight(k, -.5, .5, true); k.add(surfStraight(), 0xffffff, [0, 0, 0], [1, 1, 1], { layer: 'belt', keepUv: true, ao: false, jit: 0 });
    // Ecken-Pfosten mit offenem Rahmen, Nabe in der Mitte mit drei Pfeilen
    for (const x of [-.42, .42]) for (const z of [-.44, .44]) { k.bev(C.yel, [x, BELT_Y - .03, z], [.06, .4, .06], .012); vstripes(k, [x + Math.sign(x) * .03, BELT_Y + .16, z], x > 0 ? 0 : 2, .26, .05); }
    for (const z of [-.44, .44]) k.box(C.dark, [0, BELT_Y + .37, z], [.9, .04, .05], { layer: 'metal' });
    for (const x of [-.42, .42]) k.box(C.dark, [x, BELT_Y + .37, 0], [.05, .04, .9], { layer: 'metal' });
    k.beam(C.dark, [-.42, BELT_Y + .39, 0], [.42, BELT_Y + .39, 0], .04, { layer: 'metal' });
    k.bev(C.dark, [0, BELT_Y + .36, 0], [.3, .06, .3], .02, { layer: 'metal' });
    k.bev(C.yel, [0, BELT_Y + .42, 0], [.26, .025, .26], .01);
    const arrow = (ry) => k.in([0, BELT_Y + .445, 0], ry, () => { k.box(0x3adf6a, [.05, 0, 0], [.07, .008, .03], { layer: 'glow' }); k.prism(0x3adf6a, [.1, 0, 0], .06, .008, .05, { layer: 'glow', r: [0, PI / 2, 0], order: 'YXZ' }); });
    arrow(0); arrow(PI / 2); arrow(-PI / 2);
    // Drehteller mit drei Schaufeln (Teil 'paddle')
    k.cyl(C.steelD, [0, BELT_Y + .26, 0], .03, .1, 8, { layer: 'metal' });
    k.part('paddle', [0, BELT_Y + .26, 0], p => { p.cyl(C.dark, [0, -.02, 0], .07, .04, 10, { layer: 'metal' }); for (let i = 0; i < 3; i++) p.in([0, 0, 0], i * TAU / 3, () => { p.box(C.orange, [.17, -.05, 0], [.28, .05, .025]); p.box(C.rubber, [.17, -.085, 0], [.26, .03, .02]); }); });
    return { badge: [.42, BELT_Y + .39, 0], small: true };
  },
  sortierer(k, o) {
    beltFrameStraight(k, -.5, .5, true); k.add(surfStraight(), 0xffffff, [0, 0, 0], [1, 1, 1], { layer: 'belt', keepUv: true, ao: false, jit: 0 });
    // Bogen über dem Band mit Anzeige (Ebene 'filter' → Farbe des eingestellten Teils)
    for (const z of [-.44, .44]) k.bev(C.blue, [-.1, BELT_Y - .03, z], [.12, .52, .08], .02);
    k.bev(C.blueD, [-.1, BELT_Y + .46, 0], [.16, .12, .98], .03);
    k.in([-.1, BELT_Y + .52, 0], 0, () => { k.bev(C.dark, [0, 0, 0], [.2, .2, .26], .03, { layer: 'metal' }); for (const a of [0, 2]) face(k, [0, 0, 0], a, () => { k.box(0x10161c, [.1, .04, 0], [.01, .14, .2], { ao: false }); k.ball(0xffffff, [.11, .11, 0], [.012, .045, .045], { layer: 'filter', detail: 1 }); }); k.cyl(C.dark, [0, .2, 0], .015, .08, 6, { layer: 'metal' }); k.ball(0xffffff, [0, .29, 0], .025, { layer: 'lamp', detail: 1 }); });
    // Klappe (Teil 'flap', Scharnier links vorn, schwenkt nach links)
    k.cyl(C.steelD, [.2, BELT_Y - .03, -.4], .025, .25, 8, { layer: 'metal' });
    k.part('flap', [.2, BELT_Y + .02, -.4], f => { f.bev(C.orange, [-.33, 0, 0], [.66, .14, .035], .012, { r: [0, 0, 0] }); f.stripes([-.33, .14, 0], .66, .035, .004, {}); f.box(C.rubber, [-.33, -.015, 0], [.64, .02, .03]); });
    // Pfeil nach links (Ausgang für das gewählte Teil)
    k.in([.2, BELT_Y + .23, -.37], PI / 2, () => { k.box(0x3adf6a, [0, 0, 0], [.05, .008, .025], { layer: 'glow' }); k.prism(0x3adf6a, [.045, 0, 0], .045, .008, .05, { layer: 'glow', r: [0, PI / 2, 0], order: 'YXZ' }); });
    return { badge: [-.1, BELT_Y + .585, .24], small: true };
  },
};

// Vorlage (zwischengespeichert): Typ + Variante (Bandkurve/Tunnel) + Ausbaustufe mk (1–3)
const CACHE = new Map();
export const MK_MAX = 3;
const mkOf = (type, mk) => MK_TYPES.includes(type) ? Math.max(1, Math.min(MK_MAX, (mk | 0) || 1)) : 1;
function templateFor(type, variant, mk = 1) {
  const key = type + ':' + variant + ':' + mk; let T = CACHE.get(key);
  if (T) return T;
  let k, info = {};
  if (type === 'band') k = beltTemplate(variant);
  else if (type === 'tunnel') k = beltTemplate(variant === 'exit' ? 'tunnelOut' : 'tunnelIn');
  else {
    k = new Kit(1000 + BUILDING_TYPES.indexOf(type)); k.aoH = EXT[type]?.aoH ?? .7;
    info = (EXT[type] ? EXT[type].build(k, {}) : MACH[type](k, {})) || {};
    if (mk > 1) mkDecor(type, k, mk, info);
  }
  T = { built: k.build(), info }; CACHE.set(key, T); return T;
}

// ---------- Hülle für weit entfernte Gebäude (LOD): alle Ebenen inkl. Teile in Ruhelage zusammengeführt ----------
// Eigene Materialien der Gebäude (Lampe, Glut, Erz, Stufe, Takt, Filter) werden auf gemeinsame abgebildet.
// mirror = true: an z gespiegelt (2×2 bei rot 1/2), Dreiecke umgedreht → Instanzen ohne negative Determinante.
const HULL = new Map();
const HULL_SKIP = /^(smoke|fx|zap|glint|b\d$)/;
const HULL_LAYER = { lamp: 'hlamp', heat: 'hheat', ore: 'hore', lv: 'metal', takt: 'base', filter: 'glow' };
export function hullFor(type, variant = '', mk = 1, mirror = false) {
  mk = mkOf(type, mk); const key = type + ':' + variant + ':' + mk + (mirror ? ':m' : ''); let H = HULL.get(key);
  if (H) return H;
  const T = templateFor(type, variant, mk), L = {}, M = new THREE.Matrix4();
  const walk = (node, m) => {
    for (const [layer, g] of Object.entries(node.geos)) { const c = g.clone(); if (c.attributes.uv && layer !== 'belt') c.deleteAttribute('uv'); c.applyMatrix4(m); (L[HULL_LAYER[layer] || layer] ||= []).push(c); }
    for (const p of node.parts) if (!HULL_SKIP.test(p.name)) walk(p, m.clone().multiply(p.matrix));
  };
  walk(T.built, M);
  H = {};
  for (const [layer, list] of Object.entries(L)) {
    let g = mergeGeometries(list, false); list.forEach(x => x.dispose());
    if (!g) continue;
    if (mirror) { g.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, -1)); for (const name of Object.keys(g.attributes)) { const A = g.attributes[name], s = A.itemSize, arr = A.array;
      for (let i = 0; i < A.count; i += 3) for (let j = 0; j < s; j++) { const t = arr[(i + 1) * s + j]; arr[(i + 1) * s + j] = arr[(i + 2) * s + j]; arr[(i + 2) * s + j] = t; } } }
    g.computeBoundingSphere(); H[layer] = g;
  }
  HULL.set(key, H); return H;
}
export const HULL_MATS = (() => {
  const heat = makeHeatMat(0xff7a20); heat.heat = .35;
  return { ...MATS, belt: beltMat, hlamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb030).multiplyScalar(2.2) }), hheat: heat,
    hore: new THREE.MeshStandardMaterial({ color: 0x8a7a6c, roughness: .7, flatShading: true }) };
})();

const lerp = (a, b, t) => a + (b - a) * t;
const goldPlain = makeGoldMat();
const LAMP = { busy: new THREE.Color(0x4aff7a).multiplyScalar(3), idle: new THREE.Color(0xffb030).multiplyScalar(2.6), off: new THREE.Color(0x3a3c40) };

// Taktring-Material (Füllstand 0…1, farbig von grün zu gold)
function makeTaktMat() {
  const u = { uFill: { value: 0 }, uTime: U.uTime };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uFill, uTime; varying vec3 vP; void main(){ float a = atan(vP.z, vP.x) / 6.2831853 + .5; float seg = step(.12, fract(a * 24.));
      float on = step(a, uFill); vec3 c = mix(vec3(.25, 1., .45), vec3(1., .78, .2), smoothstep(.5, 1., uFill));
      c *= 1.4 + .5 * step(.98, uFill) * sin(uTime * 8.); gl_FragColor = vec4(mix(vec3(.12, .13, .15), c, on) * mix(.55, 1., seg), 1.);
      #include <colorspace_fragment>
    }` });
  m.fill = u.uFill; return m;
}

// =====================================================================================================================
// makeBuilding(type, { rot, level, mk, ore, filter, inDir, kind, exit }) →
//   { group, update(t, state), ports, size, type, kind, parts, spots, mk, setRot, setLevel, setMk(1–3), setOre, setFilter, anchor(name) → [x,y,z] Welt,
//     lodKey(), lodMatrix(), dispose(), … Zusatz je Typ (z. B. wunder: setStage, launch) }
// Gebäude ohne Ausgang (keine Rutsche): Verkauf, Kraftwerk, Solar, Mast, Heizer, Wunder.
const NO_OUT = new Set(['verkauf', 'kraftwerk', 'solar', 'mast', 'heizer', 'wunder']);
export function makeBuilding(type, opts = {}) {
  if (!SIZES[type]) throw new Error('unknown building ' + type);
  const n = SIZES[type];
  let variant = '';
  if (type === 'band') variant = opts.kind || beltKind(opts.inDir, opts.rot ?? 0);
  if (type === 'tunnel') variant = opts.exit ? 'exit' : 'entry';
  let mk = mkOf(type, opts.mk);
  let T = templateFor(type, variant, mk), info = T.info;
  const mats = { ...MATS, belt: beltMat, ...(EXT[type]?.mats || {}) };
  const heat = mats.heat = makeHeatMat(info.heatColor ?? 0xff7a20);
  const lamp = mats.lamp = new THREE.MeshBasicMaterial({ color: LAMP.idle.clone() });
  const filt = mats.filter = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff) });
  const ore = mats.ore = new THREE.MeshStandardMaterial({ color: 0x9c968c, roughness: .7, flatShading: true });
  const lvMat = new THREE.MeshStandardMaterial({ color: LEVEL_C[1], roughness: .35, metalness: .7, flatShading: true });
  let takt = null; if (info.takt) takt = mats.takt = makeTaktMat();
  const own = [heat, lamp, filt, ore, lvMat, takt].filter(Boolean);
  const root = new THREE.Group(), pivot = new THREE.Group();
  pivot.position.set(n / 2, 0, n / 2); root.add(pivot);
  root.userData.type = type; root.name = type;
  // Sterne (nicht bei Bändern/Tunneln) und Gold-Funkeln an der Rutsche: einmal angelegt, beim Ausbau umgehängt
  let badge = null; if (info.badge) { badge = makeBadge(lvMat); if (info.small) badge.scale.setScalar(.8); }
  let glint = null;
  if (n >= 2 && !NO_OUT.has(type)) { glint = new THREE.Group(); glint.name = 'glint'; const sg = starGeo(4, .3); for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(sg, goldPlain); m.scale.set(.06, .01, .06); m.rotation.x = PI / 2; glint.add(m); }
    glint.position.set(n / 2 - .15, BELT_Y + .45, n === 3 ? 0 : OUT_INDEX(n) + .5 - n / 2); glint.visible = false; }
  let inst = null, P = {};
  let rot = opts.rot ?? 0;
  // Kurven: Vorlage läuft von −x nach ±z → so drehen, dass der Ausgang in Richtung rot zeigt
  const rOff = variant === 'right' ? -1 : variant === 'left' ? 1 : 0;
  // gerade Größen (2×2): die Sim nimmt immer das Feld mit Index n/2 in Weltrichtung → bei rot 1 und 2 spiegeln
  const mir = r => (n % 2 === 0 && n > 1 && (((r % 4) + 4) % 4 === 1 || ((r % 4) + 4) % 4 === 2)) ? -1 : 1;
  const mount = () => {
    if (inst) pivot.remove(inst.group);
    inst = instantiate(T.built, mats); P = inst.parts; pivot.add(inst.group);
    if (badge) { badge.position.set(...(T.info.badge || info.badge)); inst.group.add(badge); }
    if (glint) inst.group.add(glint);
    inst.group.scale.z = mir(rot);
  };
  mount();
  // Ausgänge (Mitte der Kante des Ausgabefeldes, in Gruppenkoordinaten) – bei jeder Drehung neu
  const outs = [];
  const loc2grp = (x, z) => { const r = ((rot + rOff) % 4 + 4) % 4, a = -r * PI / 2, c = Math.cos(a), s = Math.sin(a); return [n / 2 + x * c + z * s, n / 2 - x * s + z * c]; };
  const portOf = (x, z, d) => { const [gx, gz] = loc2grp(x, z * mir(rot)); return { x: gx, z: gz, dir: ((rot + rOff + d) % 4 + 4) % 4 }; };
  const calcPorts = () => {
    outs.length = 0;
    if (type === 'verteiler') outs.push(portOf(.5, 0, 0), portOf(0, -.5, 3), portOf(0, .5, 1));
    else if (type === 'sortierer') outs.push(portOf(.5, 0, 0), portOf(0, -.5, 3));
    else if (type === 'band') outs.push(portOf(variant === 'straight' ? .5 : 0, variant === 'left' ? -.5 : variant === 'right' ? .5 : 0, variant === 'left' ? 3 : variant === 'right' ? 1 : 0));
    else if (type === 'tunnel') { if (variant === 'exit') outs.push(portOf(.5, 0, 0)); }
    else if (!NO_OUT.has(type)) outs.push(portOf(n / 2, OUT_INDEX(n) + .5 - n / 2, 0));
  };
  const setRot = r => { rot = r; pivot.rotation.y = -(((r + rOff) % 4 + 4) % 4) * PI / 2; inst.group.scale.z = mir(r); root.userData.rot = r; calcPorts(); };
  setRot(rot);
  const setLevel = l => { l = Math.max(0, Math.min(5, l | 0)); if (badge) badge.userData.set(l); lvMat.color.set(LEVEL_C[l] ?? LEVEL_C[1]); };
  setLevel(opts.level ?? 1);
  const setOre = id => { const L = ITEM_LOOK[id]; if (L) ore.color.set(L.color); };
  if (opts.ore) setOre(opts.ore);
  const setFilter = c => { if (c === null || c === undefined) { filt.color.setRGB(.3, .32, .36); return; } const L = typeof c === 'string' ? ITEM_LOOK[c] : null; filt.color.set(L ? L.color : c).multiplyScalar(1.4); };
  setFilter(opts.filter ?? null);
  // Ausbaustufe: Vorlage tauschen, Grundriss bleibt
  const setMk = m => { m = mkOf(type, m); if (m === mk) return mk; mk = m; T = templateFor(type, variant, mk); mount(); root.userData.mk = mk; lastT = null; return mk; };
  root.userData.mk = mk;
  // Ankerpunkt (info.spots[name], z. B. 'cable') in Weltkoordinaten
  const _a = new THREE.Vector3();
  const anchor = (name = 'cable') => { const s = (T.info.spots || {})[name]; if (!s) return null; root.updateWorldMatrix(true, true); return _a.set(s[0], s[1], s[2]).applyMatrix4(inst.group.matrixWorld).toArray(); };

  // ---------- Bewegung ----------
  let lastT = null, act = 0, spin = 0, cyc = 0, flyA = 0;
  const ext = EXT[type] || null;
  const ctx = { type, root, mats, heat, lamp, ore, store: {}, get P() { return P; }, get info() { return T.info; }, get mk() { return mk; }, act: 0, spin: 0, cyc: 0, dt: 0 };
  const update = (t, s = {}) => {
    const dt = lastT === null ? 0 : Math.min(.1, Math.max(0, t - lastT)); lastT = t;
    const busy = typeof s.busy === 'number' ? s.busy : s.busy ? 1 : 0;
    act = lerp(act, busy, 1 - Math.exp(-4 * dt)); if (lastT !== null && dt === 0 && busy) act = Math.max(act, busy * .999);
    spin += act * dt; cyc += act * dt;
    if (s.level !== undefined && s.level !== root.userData.level) { root.userData.level = s.level; setLevel(s.level); }
    if (s.mk !== undefined && s.mk !== mk) setMk(s.mk);
    if (s.ore !== undefined && s.ore !== root.userData.ore) { root.userData.ore = s.ore; setOre(s.ore); }
    if (s.filterColor !== undefined && s.filterColor !== root.userData.filter) { root.userData.filter = s.filterColor; setFilter(s.filterColor); }
    if (!root.visible) return;                                   // ausgeblendet (LOD-Hülle zeigt es): keine Bewegung rechnen
    lamp.color.copy(busy > .5 ? LAMP.busy : LAMP.idle).multiplyScalar(.8 + .2 * Math.sin(t * (busy > .5 ? 6 : 2)));
    if (s.power !== undefined && s.power < .05 && !NO_OUT.has(type)) lamp.color.setRGB(1.6, .15, .1).multiplyScalar(Math.sin(t * 5) > 0 ? 1.4 : .25);   // kein Strom: rot blinkend
    if (P.bar) P.bar.scale.z = Math.max(.02, s.progress ?? 0);
    if (P.flap) P.flap.rotation.z = act * (.25 + .15 * Math.sin(t * 9)) * (type === 'sortierer' ? 0 : 1);
    if (glint) { glint.visible = !!s.gold; if (s.gold) glint.children.forEach((m, i) => { const a = t * 2 + i * 2.1; m.position.set(Math.cos(a) * .12, Math.sin(t * 5 + i) * .08, Math.sin(a) * .22); const k2 = .5 + .5 * Math.sin(t * 9 + i * 2); m.scale.set(.05 * k2 + .02, .01, .05 * k2 + .02); m.rotation.z = t * 3 + i; }); }
    if (ext) { ctx.act = act; ctx.spin = spin; ctx.cyc = cyc; ctx.dt = dt; ext.anim?.(ctx, t, s); return; }
    switch (type) {
      case 'grossbohrer': {
        P.bit.rotation.y = spin * 10; P.crown.rotation.z = -spin * 6;
        const st = cyc * 1.6; P.head.position.y = -.14 * act - .07 * act * Math.abs(Math.sin(st * PI)); P.head.position.x = act * .008 * Math.sin(t * 36);
        for (let i = 0; i < 4; i++) { const d = P['drl' + i]; d.rotation.y = spin * (16 + i * 2) * (i % 2 ? -1 : 1); d.position.y = -.04 * act * Math.abs(Math.sin(st * PI + i)); }
        P.dish.rotation.y = Math.sin(t * .3) * 1.4;
        animSmoke(P, 'smoke', t, .35 + .65 * act, 1.0, [.25, -.05]); break;
      }
      case 'bohrer': {
        P.bit.rotation.y = spin * 14;
        const st = cyc * 2.2; P.head.position.y = -.1 * act - .05 * act * Math.abs(Math.sin(st * PI)); P.head.position.x = act * .006 * Math.sin(t * 40);
        animSmoke(P, 'smoke', t, .35 + .65 * act, .8, [.2, -.05]); break;
      }
      case 'ofen': {
        heat.heat = .2 + .8 * act * (.85 + .15 * Math.sin(t * 7.3) * Math.sin(t * 3.1));
        P.needle.rotation.x = lerp(-2.0, 1.4, act) + Math.sin(t * 3) * .05 * act;
        animSmoke(P, 'smoke', t, .3 + .9 * act, 1.1, [.3, .05]); break;
      }
      case 'presse': {
        const ph = (cyc * 1.1) % 1; let d; if (ph < .18) d = ph / .18; else if (ph < .3) d = 1; else d = 1 - (ph - .3) / .7; d = d * d * (3 - 2 * d);
        P.ram.position.y = -.42 * d * Math.min(1, act * 1.5); flyA += act * dt * 5; P.fly.rotation.z = flyA; break;
      }
      case 'drahtzug': {
        for (let i = 0; i < 3; i++) P['c' + i].rotation.y = spin * (6 + i * 2) * (i % 2 ? -1 : 1);
        P.spool.rotation.z = -spin * 4; P.fan.rotation.x = spin * 20 + t * 2; break;
      }
      case 'montage': {
        for (let i = 0; i < 2; i++) {
          const ph = cyc * 1.2 + i * .5, sgn = i ? -1 : 1, w = Math.sin(ph * PI), w2 = Math.sin(ph * PI * 2 + .6);
          P['arm' + i].rotation.y = sgn * (.6 + .6 * w) * act + sgn * .1 * Math.sin(t * .7);
          P['sh' + i].rotation.z = -(.35 + .35 * w2) * (.3 + act * .7);
          P['el' + i].rotation.z = -(.9 + .4 * w) * (.4 + act * .6);
          P['wr' + i].rotation.y = ph * 2;
          const g = .4 * Math.max(0, Math.sin(ph * PI * 2)); P['fg' + i + 'a'].position.z = -g * .05; P['fg' + i + 'b'].position.z = g * .05;
        }
        break;
      }
      case 'raffinerie': {
        const a = cyc * 2.4; P.crank.rotation.z = -a; P.beam.rotation.z = Math.sin(a) * .28 * Math.min(1, act * 2 + .05);
        heat.heat = .5 + .5 * act; P.flame.scale.set(1, .6 + .5 * act + .15 * Math.sin(t * 13) * Math.sin(t * 7), 1); P.flame.rotation.y = t * 3;
        for (let i = 0; i < 2; i++) P['lvl' + i].scale.y = .35 + .55 * (.5 + .5 * Math.sin(t * .15 + i * 2 + cyc));
        break;
      }
      case 'experiment': {
        P.swirl.rotation.y = t * .6 + spin * 6; P.swirl.position.y = Math.sin(t * 2.3) * .01 * act;
        for (let i = 0; i < 4; i++) { const f = (t * (.6 + i * .17) + i * .3) % 1, b = P['b' + i]; b.position.y = f * .2 * (.3 + act * .7); b.scale.setScalar(Math.sin(f * PI) * (.4 + act * .8) + .001); }
        heat.heat = .3 + .7 * act; P.burn.scale.y = .7 + .4 * Math.sin(t * 17) * .5 + .3 * act;
        P.zap.visible = act > .2 && Math.sin(t * 23) * Math.sin(t * 7.7) > .1; P.zap.rotation.y = Math.floor(t * 12) * 1.7; break;
      }
      case 'labor': {
        P.dish.rotation.y = Math.sin(t * .25) * 1.2 + spin * .8; P.tilt.rotation.z = .2 + .15 * Math.sin(t * .4);
        P.fan.rotation.x = t * 6 + spin * 10;
        lamp.color.setRGB(1, .2, .2).multiplyScalar((Math.sin(t * 4) > .6 ? 3.5 : .25)); break;
      }
      case 'verkauf': {
        P.coin.rotation.y = t * .8 + spin * 2.5; P.coin.position.y = Math.sin(t * 1.6) * .03;
        if (takt) takt.fill.value = Math.max(0, Math.min(1, s.takt ?? 0));
        P.drawer.position.x = act > .3 ? .05 * Math.max(0, Math.sin(t * 5)) : 0;
        P.van.position.y = act * .006 * Math.abs(Math.sin(t * 13)); P.van.position.x = -act * .02 * (.5 + .5 * Math.sin(t * .8)); break;
      }
      case 'lager': {
        const crates = T.info.crates || 0, f = Math.max(0, Math.min(1, s.fill ?? 0)), show = Math.round(f * crates);
        for (let i = 0; i < crates; i++) P['cr' + i].visible = i < show;
        P.gauge.scale.y = Math.max(.02, f); P.gauge.position.y = -.07 * (1 - f); break;
      }
      case 'verteiler': P.paddle.rotation.y = -spin * 3 - t * .3; break;
      case 'sortierer': { const sw = s.flap ?? act; P.flap.rotation.y = lerp(0, .85, sw) ; break; }
    }
    if (mk > 1) mkAnim(type, P, t, act, mk, s, ctx);
  };
  update(0, { busy: 0, level: opts.level ?? 1 });
  const api = {
    group: root, update, ports: { out: outs }, size: n, type, kind: variant, get parts() { return P; }, setRot, setLevel, setOre, setFilter, setMk, anchor,
    get mk() { return mk; }, get spots() { return T.info.spots || {}; }, get rot() { return rot; },
    // LOD: Schlüssel der Hülle (hullFor) und Lage der Vorlage in der Welt
    lodKey() { return { type, variant, mk, mirror: mir(rot) < 0 }; },
    lodMatrix(out = new THREE.Matrix4()) { root.updateWorldMatrix(true, false); pivot.updateMatrix(); return out.multiplyMatrices(root.matrixWorld, pivot.matrix); },
    dispose() { own.forEach(m => m.dispose()); ext?.dispose?.(ctx); },
  };
  if (ext?.api) Object.defineProperties(api, Object.getOwnPropertyDescriptors(ext.api(ctx, api)));   // Getter bleiben Getter
  return api;
}

// =====================================================================================================================
// Bänder und Tunnel als Instanzen (für viele hundert Felder): begin() → add(x, y, rot, kind) … → end()
// kind: 'straight' | 'left' | 'right' | 'tunnelIn' | 'tunnelOut'; add(x, y, rot, kind, frost 0…1, speed Tempo-Faktor)
export class BeltInstancer {
  constructor(parent, { capacity = 512, shadows = true } = {}) { this.parent = parent; this.K = new Map(); this.cap0 = capacity; this.shadows = shadows; this._m = new THREE.Matrix4(); }
  _kind(kind) {
    let K = this.K.get(kind); if (K) return K;
    const variant = kind === 'tunnelIn' ? 'entry' : kind === 'tunnelOut' ? 'exit' : kind;
    const T = templateFor(kind.startsWith('tunnel') ? 'tunnel' : 'band', variant);
    K = { layers: Object.entries(T.built.geos).map(([layer, geo]) => ({ layer, geo: layer === 'belt' ? geo.clone() : geo })), meshes: [], cap: 0, n: 0, fb: null }; this.K.set(kind, K); this._grow(K, this.cap0); return K;
  }
  _grow(K, cap) {
    const mats = { ...MATS, belt: beltMat };
    const old = K.meshes, oldFb = K.fb;
    // je Instanz: Frost 0…1 und Verlangsamung (1 − Tempo-Faktor) für Pfeile und Gurt (Attribut aBelt, nur Ebene 'belt')
    const bl = K.layers.find(l => l.layer === 'belt');
    if (bl) { K.fb = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2); K.fb.setUsage(THREE.DynamicDrawUsage); if (oldFb) K.fb.array.set(oldFb.array.subarray(0, K.n * 2)); bl.geo.setAttribute('aBelt', K.fb); }
    K.meshes = K.layers.map(({ layer, geo }, i) => {
      const m = new THREE.InstancedMesh(geo, mats[layer] || MATS.base, cap); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.castShadow = this.shadows && layer !== 'belt'; m.receiveShadow = true; m.frustumCulled = false; m.count = 0;
      if (old[i]) { m.instanceMatrix.array.set(old[i].instanceMatrix.array.subarray(0, K.n * 16)); this.parent.remove(old[i]); old[i].dispose(); }
      this.parent.add(m); return m;
    });
    K.cap = cap;
  }
  begin() { for (const K of this.K.values()) K.n = 0; }
  // frost 0…1 (Eiswelt: Band außerhalb eines Heizers), speed = Tempo-Faktor des Bands (n.slow, Sandsturm …), 1 = normal
  add(x, y, rot = 0, kind = 'straight', frost = 0, speed = 1) {
    const K = this._kind(kind); if (K.n >= K.cap) this._grow(K, K.cap * 2);
    const off = kind === 'right' ? -1 : kind === 'left' ? 1 : 0;
    const a = -(((rot + off) % 4 + 4) % 4) * PI / 2, c = Math.cos(a), s = Math.sin(a), o = K.n * 16;
    for (const m of K.meshes) { const e = m.instanceMatrix.array; e[o] = c; e[o + 1] = 0; e[o + 2] = -s; e[o + 3] = 0; e[o + 4] = 0; e[o + 5] = 1; e[o + 6] = 0; e[o + 7] = 0; e[o + 8] = s; e[o + 9] = 0; e[o + 10] = c; e[o + 11] = 0; e[o + 12] = x + .5; e[o + 13] = 0; e[o + 14] = y + .5; e[o + 15] = 1; }
    if (K.fb) { K.fb.array[K.n * 2] = frost; K.fb.array[K.n * 2 + 1] = 1 - Math.max(0, Math.min(1, speed)); }
    K.n++;
  }
  end() { for (const K of this.K.values()) { for (const m of K.meshes) { m.count = K.n; m.visible = K.n > 0; if (K.n) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } } if (K.fb && K.n) K.fb.needsUpdate = true; } }
  dispose() { for (const K of this.K.values()) { for (const m of K.meshes) { this.parent.remove(m); m.dispose(); } for (const l of K.layers) if (l.layer === 'belt') l.geo.dispose(); } this.K.clear(); }
}
