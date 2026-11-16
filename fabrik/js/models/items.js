// Fließband – Teile auf den Bändern: instanzierte Meshes je Form (shape) und Gold/normal. Hauptfläche nimmt die
// Item-Farbe an (Instanz-Farbe), Akzente (Stifte, Flansche, Augen …) behalten ihre eigene Farbe.
// Pro Bild: begin() → add(wx, wz, itemId, gold, yaw) … → end(). Bis 20 000+ Teile in 24 Draw Calls.
import * as THREE from 'three';
import { Kit, PI, TAU, BELT_Y } from '../kit.js';
import { U } from '../materials.js';

// Aussehen je Item (Ids aus DESIGN.md). Die Integration kann mit setLook(ITEMS aus data.js) abgleichen.
export const ITEM_LOOK = {
  stein:       { color: 0x9c968c, shape: 'chunk' },
  eisenerz:    { color: 0x8a5e4c, shape: 'chunk', fleck: 0xb8bcc4 },
  kupfererz:   { color: 0xb8683c, shape: 'chunk', fleck: 0x3ab89a },
  kohle:       { color: 0x2c2a30, shape: 'chunk', fleck: 0x5a5866 },
  sand:        { color: 0xe6cc8a, shape: 'chunk', fleck: 0xf6e4b0 },
  kristall:    { color: 0x7ad6ff, shape: 'orb' },
  oel:         { color: 0x2a2238, shape: 'orb' },
  titanerz:    { color: 0x7c8298, shape: 'chunk', fleck: 0xe8eef8 },
  ziegel:      { color: 0xb8543a, shape: 'bar' },
  eisenbarren: { color: 0xa8aeb8, shape: 'bar' },
  kupferbarren:{ color: 0xe0803c, shape: 'bar' },
  glas:        { color: 0xbfeaf4, shape: 'plate' },
  titanbarren: { color: 0xd4dcec, shape: 'bar' },
  kunststoff:  { color: 0x48c6e0, shape: 'box' },
  eisenplatte: { color: 0x9aa2ae, shape: 'plate' },
  zahnrad:     { color: 0xb4bac4, shape: 'gear' },
  kupferdraht: { color: 0xe0803c, shape: 'coil' },
  rohr:        { color: 0x8c94a0, shape: 'pipe' },
  linse:       { color: 0xb8ecff, shape: 'lens' },
  schaltkreis: { color: 0x2a9a50, shape: 'chip' },
  motor:       { color: 0x4a6a9a, shape: 'box' },
  akku:        { color: 0x3ac060, shape: 'box' },
  fenster:     { color: 0x9ad4ec, shape: 'plate' },
  roboter:     { color: 0xf0a030, shape: 'robot' },
  computer:    { color: 0xd8dce4, shape: 'box' },
  laser:       { color: 0xe84040, shape: 'pipe' },
  solarpanel:  { color: 0x2a4aa8, shape: 'plate' },
  rakete:      { color: 0xf2f2f2, shape: 'rocket' },
  schrott:     { color: 0x7a6a5a, shape: 'chunk', fleck: 0x9a5a3a },
};
// Aussehen aus data.js übernehmen (ITEMS: { id: { color: '#hex' | 0xhex, shape } }); wirkt auf Teile, Vorkommen und Bohrer-Erz.
// Vor dem Anlegen der ItemRenderer aufrufen (oder danach renderer.setLook(ITEMS)).
export function setItemLook(items) { for (const [id, v] of Object.entries(items || {})) ITEM_LOOK[id] = { ...(ITEM_LOOK[id] || {}), ...(v.color !== undefined ? { color: v.color } : {}), ...(v.shape ? { shape: v.shape } : {}) }; }
export const SHAPES = ['chunk', 'bar', 'plate', 'gear', 'coil', 'chip', 'box', 'orb', 'pipe', 'lens', 'rocket', 'robot'];
const FALLBACK = { color: 0xff00ff, shape: 'box' };

// ---------- Formen (Mitte unten auf y = 0, ca. 0,22 groß) ----------
// k.layer 'base' = nimmt Item-Farbe an (Vertex-Farbe weiß), 'acc' = feste Akzentfarbe
function shapeGeo(shape) {
  const k = new Kit(77 + SHAPES.indexOf(shape)); k.ground = 0; k.aoH = .12; k.jit = 0;
  const W = 0xffffff, A = (c, fn) => { k.layer = 'acc'; fn(c); k.layer = 'base'; };
  switch (shape) {
    case 'chunk': {
      k.ball(W, [0, .085, 0], [.11, .085, .1], { dod: true, r: [.4, .7, .2] });
      k.ball(W, [.05, .06, .045], [.06, .05, .055], { dod: true, r: [1, .3, .5] });
      A(0xffffff, () => { for (const [x, y, z, r] of [[.04, .15, -.02, .024], [-.07, .1, .04, .02], [.09, .07, -.04, .018], [-.02, .12, -.08, .016]]) k.ball(0xffffff, [x, y, z], r, { detail: 0, ao: false }); });
      break;
    }
    case 'bar': {
      k.bev(W, [0, 0, 0], [.24, .085, .13], .025);
      k.bev(W, [0, .08, 0], [.18, .02, .09], .01, { shade: 1.08 });
      break;
    }
    case 'plate': {
      k.bev(W, [0, 0, 0], [.22, .04, .22], .014);
      k.bev(W, [0, .038, 0], [.15, .012, .15], .006, { shade: 1.07 });
      A(0x3a3e46, () => { for (const [x, z] of [[-.085, -.085], [.085, -.085], [-.085, .085], [.085, .085]]) k.cyl(0x3a3e46, [x, .04, z], .011, .006, 6); });
      break;
    }
    case 'gear': {
      k.gear(W, [0, 0, 0], .12, .05, 10, { hole: .28 });
      k.cyl(W, [0, 0, 0], .045, .07, 10, { shade: .85 });
      A(0x2c2e34, () => k.cyl(0x2c2e34, [0, .01, 0], .022, .065, 8));
      break;
    }
    case 'coil': {
      A(0x7a5636, () => { k.cyl(0x7a5636, [0, .1, -.085], .1, .02, 14, { ax: 'z' }); k.cyl(0x7a5636, [0, .1, .085], .1, .02, 14, { ax: 'z' }); k.cyl(0x5a4028, [0, .1, 0], .03, .19, 8, { ax: 'z' }); });
      for (let i = 0; i < 5; i++) k.torus(W, [0, .1, -.06 + i * .03], .068, .016, 10, { tseg: 4 });
      break;
    }
    case 'chip': {
      k.bev(W, [0, 0, 0], [.22, .025, .17], .006);
      A(0x1e2026, () => k.bev(0x1e2026, [0, .025, 0], [.09, .022, .08], .006));
      A(0xe8c050, () => { for (let i = 0; i < 4; i++) for (const s of [-1, 1]) k.box(0xe8c050, [-.03 + i * .02, .025, s * .052], [.008, .006, .022]); });
      A(0xd8b040, () => { for (let i = 0; i < 3; i++) k.box(0xd8b040, [.08, .025, -.04 + i * .04], [.03, .004, .006]); k.box(0xd8b040, [-.085, .025, 0], [.012, .004, .1]); });
      break;
    }
    case 'box': {
      k.bev(W, [0, 0, 0], [.18, .17, .18], .02);
      A(0x30343c, () => { k.box(0x30343c, [0, .06, 0], [.186, .02, .186]); });
      A(0xf2f2f2, () => k.bev(0xf2f2f2, [.09, .1, 0], [.012, .04, .07], .004));
      break;
    }
    case 'orb': {
      k.ball(W, [0, .095, 0], .095, { detail: 1 });
      k.ball(W, [.03, .14, .02], .03, { detail: 1, shade: 1.25 });
      break;
    }
    case 'pipe': {
      k.lathe(W, [0, .058, 0], [[.055, -.12], [.055, .12], [.038, .12], [.038, -.12], [.055, -.12]], 12, { r: [0, 0, PI / 2] });
      A(0x5a5e66, () => { for (const x of [-.11, .11]) k.ring(0x5a5e66, [x, .058, 0], .066, .04, .025, 12, { r: [0, 0, PI / 2] }); });
      break;
    }
    case 'lens': {
      k.lathe(W, [0, 0, 0], [[0, 0], [.1, .02], [.105, .035], [.1, .05], [0, .07]], 16);
      A(0x9a8a6a, () => k.ring(0x9a8a6a, [0, .022, 0], .112, .098, .02, 16));
      break;
    }
    case 'rocket': {
      k.cyl(W, [0, .03, 0], .05, .16, 10, { bevel: .05 });
      A(0xe04030, () => { k.cone(0xe04030, [0, .19, 0], .05, .09, 10); for (let i = 0; i < 3; i++) k.in([0, 0, 0], i * TAU / 3, () => k.wedge(0xe04030, [.065, .02, 0], .05, .07, .012, { r: [0, 0, 0] })); k.cyl(0x40444c, [0, 0, 0], .035, .035, 8); });
      A(0x3a8ad8, () => k.cyl(0x3a8ad8, [.049, .12, 0], .02, .006, 8, { ax: 'x' }));
      break;
    }
    case 'robot': {
      k.bev(W, [0, .05, 0], [.13, .1, .14], .02);
      k.bev(W, [0, .155, 0], [.1, .08, .1], .02);
      A(0x30343c, () => { for (const z of [-.04, .04]) k.box(0x30343c, [0, 0, z], [.05, .05, .04]); for (const z of [-.08, .08]) k.box(0x30343c, [0, .06, z], [.035, .07, .025]); k.beam(0x30343c, [0, .235, 0], [0, .275, 0], .008); });
      A(0x6ef0ff, () => { for (const z of [-.025, .025]) k.box(0x6ef0ff, [.05, .185, z], [.006, .022, .018]); k.ball(0xff5a4a, [0, .28, 0], .014, { detail: 0 }); });
      break;
    }
  }
  const b = k.build().geos;
  // Tint-Attribut: base → 1, acc → 0
  const list = [];
  for (const [layer, g] of Object.entries(b)) {
    const n = g.attributes.position.count, t = new Float32Array(n).fill(layer === 'acc' ? 0 : 1);
    if (layer === 'acc' && shape === 'chunk') t.fill(.45);
    g.setAttribute('aTint', new THREE.BufferAttribute(t, 1)); list.push(g);
  }
  const g = list.length > 1 ? mergeAll(list) : list[0]; g.computeBoundingSphere(); return g;
}
function mergeAll(list) {
  const out = new THREE.BufferGeometry(), keys = ['position', 'normal', 'color', 'aTint'];
  for (const key of keys) {
    const sz = list[0].attributes[key].itemSize, arr = new Float32Array(list.reduce((a, g) => a + g.attributes[key].count * sz, 0)); let o = 0;
    for (const g of list) { arr.set(g.attributes[key].array, o); o += g.attributes[key].array.length; }
    out.setAttribute(key, new THREE.BufferAttribute(arr, sz));
  }
  return out;
}
const GEO = {};
export function itemGeometry(shape) { return GEO[shape] ||= shapeGeo(SHAPES.includes(shape) ? shape : 'box'); }

// ---------- Materialien: Instanzfarbe nur auf getönten Flächen ----------
function tintMat(gold) {
  const m = gold
    ? new THREE.MeshStandardMaterial({ color: 0xffc23a, vertexColors: true, roughness: .22, metalness: 1, flatShading: true, envMapIntensity: 1.7 })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .1, flatShading: true, envMapIntensity: .9 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTint; attribute vec3 iCol; varying vec3 vWP; varying float vTintK;')
      .replace('#include <color_vertex>', `#include <color_vertex>
vTintK = aTint;
${gold ? 'vColor.rgb = mix(vColor.rgb * vec3(.55, .5, .45), vec3(1.), aTint);' : 'vColor.rgb = mix(vColor.rgb, vColor.rgb * iCol, aTint);'}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;');
    if (gold) sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime; varying vec3 vWP; varying float vTintK;
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ vec3 q = floor(vWP * 30.); float r = h3(q);
  float tw = pow(max(0., sin(uTime * (3. + r * 6.) + r * 40.)), 16.) * step(.8, r);
  float sweep = pow(max(0., sin((vWP.x + vWP.z) * 1.7 - uTime * 3.)), 20.);
  totalEmissiveRadiance += vec3(1., .85, .42) * (tw * 5. + sweep * .7 + .08) * vTintK; }`);
  };
  m.customProgramCacheKey = () => 'item' + (gold ? 'G' : 'N');
  return m;
}
export const itemMat = tintMat(false), itemGoldMat = tintMat(true);

// Einzelnes Teil als Mesh (Symbole, Effekte, Vorschau)
export function makeItemMesh(itemId, gold = false, look = ITEM_LOOK) {
  const L = look[itemId] || FALLBACK, g = itemGeometry(L.shape);
  const m = new THREE.InstancedMesh(g, gold ? itemGoldMat : itemMat, 1);
  m.geometry = g.clone(); m.geometry.setAttribute('iCol', new THREE.InstancedBufferAttribute(new Float32Array(new THREE.Color(L.color).toArray()), 3));
  m.setMatrixAt(0, new THREE.Matrix4()); m.castShadow = true; return m;
}

// ---------- Renderer ----------
export class ItemRenderer {
  constructor(parent, { capacity = 1024, shadows = true, look = ITEM_LOOK } = {}) {
    this.parent = parent; this.shadows = shadows; this.look = { ...look }; this.B = new Map(); this.cap0 = capacity; this._col = new THREE.Color(); this.n = 0;
    this._cols = new Map();
  }
  // Tabelle {id: {color, shape}} übernehmen (z. B. ITEMS aus data.js); fehlende Felder bleiben aus ITEM_LOOK
  setLook(items) { for (const [id, v] of Object.entries(items || {})) this.look[id] = { ...(this.look[id] || FALLBACK), ...(v.color !== undefined ? { color: v.color } : {}), ...(v.shape ? { shape: v.shape } : {}) }; this._cols.clear(); }
  _bucket(shape, gold) {
    const key = shape + (gold ? 'G' : 'N'); let b = this.B.get(key);
    if (!b) { b = { shape, gold, cap: 0, n: 0, mesh: null, mat: null, col: null }; this.B.set(key, b); this._grow(b, this.cap0); }
    return b;
  }
  _grow(b, cap) {
    const old = b.mesh, geo = itemGeometry(b.shape).clone();
    const mesh = new THREE.InstancedMesh(geo, b.gold ? itemGoldMat : itemMat, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const col = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); col.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('iCol', col);
    mesh.castShadow = this.shadows; mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.count = 0;
    if (old) { mesh.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, b.n * 16)); col.array.set(b.col.array.subarray(0, b.n * 3)); this.parent.remove(old); old.geometry.dispose(); old.dispose(); }
    this.parent.add(mesh); b.mesh = mesh; b.col = col; b.cap = cap;
  }
  begin() { for (const b of this.B.values()) b.n = 0; this.n = 0; }
  // Teil an Weltposition (wx, wz) auf Bandhöhe; yaw dreht um y, y überschreibt die Höhe, s skaliert
  add(wx, wz, itemId, gold = false, yaw = 0, y = BELT_Y, s = 1) {
    const L = this.look[itemId] || FALLBACK, b = this._bucket(L.shape, !!gold);
    if (b.n >= b.cap) this._grow(b, b.cap * 2);
    const e = b.mesh.instanceMatrix.array, o = b.n * 16, c = Math.cos(yaw) * s, si = Math.sin(yaw) * s;
    e[o] = c; e[o + 1] = 0; e[o + 2] = -si; e[o + 3] = 0; e[o + 4] = 0; e[o + 5] = s; e[o + 6] = 0; e[o + 7] = 0;
    e[o + 8] = si; e[o + 9] = 0; e[o + 10] = c; e[o + 11] = 0; e[o + 12] = wx; e[o + 13] = y; e[o + 14] = wz; e[o + 15] = 1;
    let rgb = this._cols.get(itemId); if (!rgb) { this._col.set(L.color); rgb = [this._col.r, this._col.g, this._col.b]; this._cols.set(itemId, rgb); }
    const ca = b.col.array, oc = b.n * 3; ca[oc] = rgb[0]; ca[oc + 1] = rgb[1]; ca[oc + 2] = rgb[2];
    b.n++; this.n++;
  }
  end() {
    for (const b of this.B.values()) {
      b.mesh.count = b.n;
      if (b.n) { b.mesh.instanceMatrix.clearUpdateRanges(); b.mesh.instanceMatrix.addUpdateRange(0, b.n * 16); b.mesh.instanceMatrix.needsUpdate = true;
        b.col.clearUpdateRanges(); b.col.addUpdateRange(0, b.n * 3); b.col.needsUpdate = true; }
      b.mesh.visible = b.n > 0;
    }
  }
  get count() { return this.n; }
  dispose() { for (const b of this.B.values()) { this.parent.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.dispose(); } this.B.clear(); }
}
