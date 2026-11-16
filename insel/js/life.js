// Leben auf der Schwebeinsel: Bewohner, Tiere, Rauch, Gischt, Lichter, Leuchtturm, Ballon, Luftschiff und Feier-Effekte.
// Alles gebündelt: je Art ein InstancedMesh (Knochen-Animation im Vertex-Shader) bzw. ein GPU-Partikel-Pool.
// Bewegungen sind Funktionen der Zeit t (Pfade, Kreisbahnen, Partikel-Alter) – kein Ruckeln nach Tab-Wechsel.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit } from './kit.js';
import { hash, rng, INR } from './hex.js';

const WATER_Y = -.32, TAU = Math.PI * 2, PI = Math.PI;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const fmix = h => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
const h01 = (...a) => fmix(hash(...a)) / 4294967296;            // gut gestreut auch bei fortlaufenden Indizes
const rngH = (...a) => rng(fmix(hash(...a)));
const angLerp = (a, b, t) => { const d = ((b - a + PI) % TAU + TAU) % TAU - PI; return a + d * t; };
const col = s => parseInt(s.slice(1), 16);                     // '#rrggbb' → 24-Bit-Zahl (sRGB, im Shader entpackt)
const pickR = (r, a) => a[Math.floor(r() * a.length)];
const V3 = p => Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p.x, p.y, p.z);

// ---------------------------------------------------------------- GLSL-Bausteine
const GL = `
uniform float uT;
vec3 rotF(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x, v.y * c + v.z * s, -v.y * s + v.z * c); }
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }
vec3 rotZ(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x * c - v.y * s, v.x * s + v.y * c, v.z); }
vec3 rotAx(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1. - c); }
vec3 unpackC(float f){ float r = floor(f / 65536.); float g = floor((f - r * 65536.) / 256.); float b = f - r * 65536. - g * 256.; return pow(vec3(r, g, b) / 255., vec3(2.2)); }
`;

// Beleuchtetes Material mit Knochen-Verformung (+ passendes Schattenmaterial)
function rigMat(U, key, decl, deform, colorCode = '', opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .82, metalness: 0, ...opts });
  const patch = (sh, depth) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${GL}\n${decl}\n${depth ? '' : 'varying vec3 vEm;'}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${depth ? '' : 'vEm = vec3(0.);'}\n${deform}\n${depth ? '' : colorCode}`);
    if (!depth) sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEm;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEm;');
  };
  mat.onBeforeCompile = sh => patch(sh, false); mat.customProgramCacheKey = () => key;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = sh => patch(sh, true); depth.customProgramCacheKey = () => key + 'd';
  return { mat, depth };
}

// Geometrie aus Knochen-Teilen: bone(id, drehpunkt, fn(kit)). tag = Farbplatz, sway = Variante (Gruppe·8 + Nr.)
function rigGeo(seed, def, piv = true) {
  const list = [];
  const bone = (id, p, fn, jit = .07) => {
    const k = new Kit(seed + id * 131); k.jit = jit; fn(k); const g = k.build().base; if (!g) return;
    const n = g.attributes.position.count;
    g.setAttribute('aBone', new THREE.BufferAttribute(new Float32Array(n).fill(id), 1));
    if (piv) { const pv = new Float32Array(n * 3); for (let i = 0; i < n; i++) pv.set(p, i * 3); g.setAttribute('aPiv', new THREE.BufferAttribute(pv, 3)); }
    list.push(g);
  };
  def(bone);
  const g = mergeGeometries(list, false); g.computeBoundingSphere(); return g;
}
const instAttr = (geo, name, n, size = 4) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, a); return a; };

// ================================================================ BEWOHNER
// Knochen: 0 Rumpf, 1 Kopf, 2/3 Bein links (Ober/Unter), 4/5 rechts, 6/7 Arm links (Ober/Unter), 8/9 rechts, 10 Laterne (rechte Hand), 11 Korb/Schirm (linke Hand)
// Farbplätze: 1 Haut, 2 Haar, 3 Hemd, 4 Hose/Rock, 5 Schürze/Weste, 6 Kopfbedeckung, 7 Wangen, 8 Kragen/Bündchen, 9 Laternenglas, 10 Strümpfe, 11 Schal/Schirm
// Varianten: Gruppe 1 Haare (1 kurz, 2 lang, 3 Dutt, 4 alt+Bart, 5 kurz+Schnauzer, 6 Zöpfe), 2 Kopfbedeckung (1 Filzhut, 2 Kopftuch, 3 Strohhut, 4 Mütze, 5 Bäckermütze),
//   3 Rumpf (1 Schürze, 2 Weste, 3 Rock, 4 Rock+Schürze), 4 Laterne, 5 Schal, 6 Hand (1 Korb, 2 Schirm)
function villagerGeo() {
  const W = 0xffffff;
  const o = (slot, v = 0, x = {}) => ({ tag: slot, sway: v, ao: false, ...x });
  const VG = (g, i) => g * 8 + i;
  return rigGeo(101, bone => {
    bone(0, [0, 0, 0], k => {
      k.box(W, [0, .73, 0], [.3, .17, .18], o(4));                             // Hüfte
      k.box(W, [0, .87, 0], [.31, .23, .185], o(3));                           // Bauch
      k.box(W, [0, 1.06, 0], [.35, .2, .2], o(3));                             // Brust
      k.box(W, [0, 1.24, 0], [.3, .05, .18], o(3));                            // Schultern
      k.box(0x3a2a1e, [0, .86, 0], [.318, .045, .19], o(0, 0, { jit: 0 }));    // Gürtel
      k.box(0xc8a850, [0, .865, .094], [.045, .035, .012], o(0, 0, { jit: 0 }));
      k.box(W, [0, 1.26, .012], [.17, .05, .165], o(8));                       // Kragen
      for (const y of [.97, 1.06, 1.15]) k.box(0xece6d8, [0, y, .1], [.022, .022, .012], o(0, 0, { jit: 0 }));
      k.cyl(W, [0, 1.27, 0], .055, .12, 6, o(1));                              // Hals
      for (const v of [1, 4]) {                                                // Schürze
        const q = VG(3, v);
        k.box(W, [0, .48, .103], [.29, .42, .018], o(5, q));
        k.box(W, [0, .9, .103], [.2, .25, .018], o(5, q));
        k.box(W, [0, .84, 0], [.33, .03, .2], o(5, q));
        for (const s of [1, -1]) k.box(W, [.075 * s, 1.15, .0], [.03, .12, .21], o(5, q));
        k.box(W, [0, .62, .113], [.12, .08, .006], o(8, q));                    // Tasche
      }
      { const q = VG(3, 2);                                                    // Weste
        k.box(W, [0, .84, 0], [.365, .42, .212], o(5, q));
        k.box(W, [0, .84, .106], [.07, .42, .004], o(3, q));
        for (const y of [.92, 1.0, 1.08]) for (const s of [1, -1]) k.box(0xd8c060, [.045 * s, y, .107], [.014, .014, .006], o(0, q, { jit: 0 }));
        for (const s of [1, -1]) k.box(W, [.12 * s, .98, .108], [.06, .012, .004], o(8, q));
      }
      for (const v of [3, 4]) {                                                // Rock
        const q = VG(3, v);
        k.cyl(W, [0, .38, 0], .27, .5, 9, o(4, q, { top: .62 }));
        k.cyl(W, [0, .38, 0], .275, .04, 9, o(8, q));
      }
      { const q = VG(5, 1);                                                    // Schal
        k.cyl(W, [0, 1.23, 0], .105, .075, 8, o(11, q));
        k.box(W, [.07, 1.0, .1], [.06, .23, .025], o(11, q, { r: [.15, 0, .05] }));
        k.box(W, [.07, 1.0, .115], [.062, .025, .006], o(8, q));
      }
    });
    bone(1, [0, 1.33, 0], k => {
      k.ball(W, [0, 1.5, 0], [.13, .148, .135], o(1, 0, { detail: 1, jit: .03 }));
      k.box(W, [0, 1.462, .118], [.034, .05, .045], o(1, 0, { jit: 0 }));     // Nase
      k.box(0x8a3a32, [0, 1.42, .116], [.05, .012, .016], o(0, 0, { jit: 0 })); // Mund
      for (const s of [1, -1]) {
        k.box(0xf4f0ea, [.05 * s, 1.494, .112], [.046, .04, .016], o(0, 0, { jit: 0 }));  // Augenweiß
        k.box(0x2a2018, [.05 * s, 1.49, .118], [.028, .036, .012], o(0, 0, { jit: 0 }));  // Pupille
        k.box(0xffffff, [.05 * s + .008, 1.512, .1245], [.009, .009, .003], o(0, 0, { jit: 0 }));
        k.box(W, [.05 * s, 1.552, .114], [.05, .013, .02], o(2, 0, { jit: 0, r: [0, 0, -.12 * s] }));  // Braue
        k.box(W, [.077 * s, 1.44, .1], [.036, .026, .016], o(7, 0, { jit: 0 }));             // Wange
        k.ball(W, [.13 * s, 1.49, -.005], [.026, .046, .034], o(1));                         // Ohr
      }
      const cap = (v) => { k.ball(W, [0, 1.565, -.03], [.142, .11, .14], o(2, v)); k.box(W, [0, 1.578, .08], [.2, .05, .06], o(2, v, { r: [-.25, 0, 0] })); };
      const sides = v => { for (const s of [1, -1]) k.box(W, [.118 * s, 1.43, -.035], [.032, .13, .15], o(2, v)); k.box(W, [0, 1.38, -.1], [.22, .17, .05], o(2, v)); };
      cap(VG(1, 1)); sides(VG(1, 1));
      cap(VG(1, 2)); sides(VG(1, 2)); k.box(W, [0, 1.17, -.108], [.25, .3, .05], o(2, VG(1, 2))); for (const s of [1, -1]) k.box(W, [.125 * s, 1.24, -.01], [.035, .28, .1], o(2, VG(1, 2)));
      cap(VG(1, 3)); sides(VG(1, 3)); k.ball(W, [0, 1.6, -.155], [.07, .065, .06], o(2, VG(1, 3)));
      sides(VG(1, 4)); k.ball(W, [0, 1.405, .075], [.1, .085, .07], o(2, VG(1, 4))); k.box(W, [0, 1.428, .126], [.09, .022, .02], o(2, VG(1, 4)));
      cap(VG(1, 5)); sides(VG(1, 5)); k.box(W, [0, 1.432, .124], [.085, .022, .02], o(2, VG(1, 5)));
      cap(VG(1, 6)); sides(VG(1, 6));
      for (const s of [1, -1]) { k.ball(W, [.15 * s, 1.36, -.05], [.04, .1, .04], o(2, VG(1, 6))); k.ball(W, [.145 * s, 1.44, -.05], [.03, .022, .03], o(5, VG(1, 6))); }
      { const v = VG(2, 1); k.cyl(W, [0, 1.62, -.012], .205, .022, 10, o(6, v)); k.cyl(W, [0, 1.63, -.012], .13, .13, 8, o(6, v, { top: .86 })); k.cyl(0x2a2220, [0, 1.642, -.012], .133, .03, 8, o(0, v, { jit: 0 })); }
      { const v = VG(2, 2); k.ball(W, [0, 1.565, -.025], [.152, .122, .152], o(6, v)); k.ball(W, [0, 1.46, -.15], .045, o(6, v)); k.box(W, [0, 1.33, -.155], [.07, .12, .02], o(6, v, { r: [.2, 0, 0] })); k.box(W, [0, 1.6, .095], [.24, .05, .04], o(6, v, { r: [-.35, 0, 0] })); }
      { const v = VG(2, 3); k.cyl(W, [0, 1.615, -.012], .27, .02, 12, o(6, v)); k.cyl(W, [0, 1.625, -.012], .135, .11, 9, o(6, v, { top: .82 })); k.cyl(0xb83a2a, [0, 1.632, -.012], .137, .028, 9, o(0, v, { jit: 0 })); }
      { const v = VG(2, 4); k.ball(W, [0, 1.585, -.012], [.145, .108, .147], o(6, v)); k.cyl(W, [0, 1.52, -.012], .147, .06, 10, o(11, v)); k.ball(W, [0, 1.705, -.012], .048, o(11, v)); }
      { const v = VG(2, 5); k.cyl(0xf4f2ee, [0, 1.575, -.012], .138, .08, 10, o(0, v)); k.ball(0xfaf8f4, [0, 1.71, -.012], [.165, .1, .165], o(0, v, { jit: .03 })); }
    });
    for (const [s, bt, bs] of [[1, 2, 3], [-1, 4, 5]]) {
      const x = .085 * s;
      bone(bt, [x, .82, 0], k => k.box(W, [x, .46, 0], [.125, .4, .145], o(4)));
      bone(bs, [x, .47, 0], k => {
        k.box(W, [x, .09, 0], [.11, .4, .125], o(10));
        k.box(0x4a3426, [x, 0, .028], [.12, .1, .22], o(0));
        k.box(0x2e2018, [x, 0, .028], [.126, .025, .226], o(0, 0, { jit: 0 }));
      });
    }
    for (const [s, bu, bf] of [[1, 6, 7], [-1, 8, 9]]) {
      const x = .232 * s;
      bone(bu, [x, 1.25, 0], k => { k.box(W, [x, 1.02, 0], [.095, .24, .11], o(3)); k.ball(W, [x, 1.225, 0], [.062, .058, .066], o(3)); });
      bone(bf, [x, 1.03, 0], k => {
        k.box(W, [x, .82, 0], [.086, .22, .096], o(3)); k.box(W, [x, .8, 0], [.092, .035, .102], o(8));
        k.ball(W, [x, .755, .005], [.044, .054, .05], o(1)); k.box(W, [x - .03 * s, .76, .03], [.022, .05, .022], o(1, 0, { r: [0, 0, .4 * s] }));
      });
    }
    bone(10, [-.232, .74, 0], k => {                                            // Laterne
      const v = VG(4, 1), x = -.232;
      k.box(0x2a2622, [x, .64, 0], [.012, .1, .012], o(0, v, { jit: 0 }));
      k.box(0x3a3430, [x, .405, 0], [.11, .025, .11], o(0, v, { jit: 0 }));
      k.box(W, [x, .43, 0], [.085, .14, .085], o(9, v, { jit: 0 }));
      for (const a of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) k.box(0x2a2622, [x + a[0] * .045, .43, a[1] * .045], [.012, .14, .012], o(0, v, { jit: 0 }));
      k.cone(0x3a3430, [x, .57, 0], .075, .07, 4, o(0, v, { jit: 0, r: [0, PI / 4, 0] }));
      k.cyl(0x2a2622, [x, .635, 0], .018, .02, 6, o(0, v, { jit: 0 }));
    });
    bone(11, [.232, .74, 0], k => {                                             // Korb / Schirm
      const v1 = VG(6, 1), v2 = VG(6, 2), x = .232;
      k.box(0xa8784a, [x, .44, .02], [.22, .14, .15], o(0, v1));
      k.box(0x8a5e38, [x, .575, .02], [.23, .02, .16], o(0, v1, { jit: 0 }));
      k.beam(0x8a5e38, [x - .1, .58, .02], [x, .74, .02], .015, o(0, v1));
      k.beam(0x8a5e38, [x + .1, .58, .02], [x, .74, .02], .015, o(0, v1));
      for (const p of [[-.05, .0], [.04, .03], [0, -.03]]) k.ball(0xc8302a, [x + p[0], .6, .02 + p[1]], .035, o(0, v1));
      k.ball(0xc89a5a, [x + .06, .6, -.02], [.06, .03, .035], o(0, v1));
      k.cyl(0x3a2a20, [x, .66, 0], .012, 1.0, 5, o(0, v2, { jit: 0 }));
      k.box(0x3a2a20, [x, .64, .03], [.02, .02, .06], o(0, v2, { jit: 0 }));
      k.cone(W, [x, 1.5, 0], .6, .24, 8, o(11, v2));
      k.cyl(W, [x, 1.47, 0], .6, .03, 8, o(8, v2, { top: 1 }));
      k.cyl(0x3a2a20, [x, 1.72, 0], .014, .06, 4, o(0, v2, { jit: 0 }));
    });
  }, false);
}
const VILLAGER_DECL = `
attribute float aBone; attribute float sway; attribute float tag;
attribute vec4 iPalA; attribute vec4 iPalB; attribute vec4 iSel; attribute vec4 iPose; attribute vec4 iPose2;
const vec3 HIPL = vec3(.085, .82, 0.), HIPR = vec3(-.085, .82, 0.), KNL = vec3(.085, .47, 0.), KNR = vec3(-.085, .47, 0.);
const vec3 SHL = vec3(.232, 1.25, 0.), SHR = vec3(-.232, 1.25, 0.), ELL = vec3(.232, 1.03, 0.), ELR = vec3(-.232, 1.03, 0.);
const vec3 HDL = vec3(.232, .74, 0.), HDR = vec3(-.232, .74, 0.), NECK = vec3(0., 1.33, 0.), ROOT = vec3(0., .84, 0.);`;
const VILLAGER_DEFORM = `{
float b = aBone;
float x1 = floor(iSel.x / 8. + .01), x0 = iSel.x - x1 * 8.;
float y1 = floor(iSel.y / 8. + .01), y0 = iSel.y - y1 * 8.;
float z1 = floor(iSel.z / 8. + .01), z0 = iSel.z - z1 * 8.;
float grp = floor(sway / 8. + .01), vid = sway - grp * 8.;
float sel = grp < .5 ? vid : grp < 1.5 ? x0 : grp < 2.5 ? x1 : grp < 3.5 ? y0 : grp < 4.5 ? y1 : grp < 5.5 ? z0 : z1;
float shown = step(abs(sel - vid), .4);
float ph = iPose.x, wk = iPose.y, st = iPose.z, tk = iPose.w, tt = uT + iPose2.z * 37., wav = iPose2.w;
float sw = sin(ph), cw = cos(ph);
float hL = sw * .5 * wk + st * 1.52, hR = -sw * .5 * wk + st * 1.52;
float kL = -(.06 + .8 * max(0., cw)) * wk - st * 1.55, kR = -(.06 + .8 * max(0., -cw)) * wk - st * 1.55;
float idle = (1. - wk) * (1. - st);
float aL = -sw * .42 * wk + st * .42 + idle * .04 * sin(tt * .9), aR = sw * .42 * wk + st * .42 + idle * .04 * sin(tt * .9 + 1.);
float eL = .16 + .24 * wk + st * .55, eR = eL;
aR = mix(aR, .5 + .3 * sin(tt * 2.1), tk); eR = mix(eR, 1.15 + .35 * sin(tt * 2.9 + 1.), tk);
aL = mix(aL, .12 + .1 * sin(tt * 1.6 + 2.), tk * .7); eL = mix(eL, .6, tk * .7);
aR = mix(aR, 2.75, wav); eR = mix(eR, .35 + .35 * sin(tt * 10.), wav);
float lan = step(.5, y1) * (1. - wav); aR = mix(aR, .3 + aR * .25, lan); eR = mix(eR, .6, lan);
float um = iSel.w; aL = mix(aL, .5, um); eL = mix(eL, 1.4, um);
float bas = 1. - step(.5, abs(z1 - 1.)); aL = mix(aL, aL * .3 + .05, bas);
float abL = .07 + .1 * um, abR = -.07 - .12 * wav;
float lean = .07 * wk - .03 * st, nod = .04 * sin(tt * .7) * idle + .07 * sin(tt * 4.3) * tk;
vec3 p = position;
if (b > 1.5 && b < 3.5) { if (b > 2.5) p = KNL + rotF(p - KNL, kL); p = HIPL + rotF(p - HIPL, hL); }
else if (b > 3.5 && b < 5.5) { if (b > 4.5) p = KNR + rotF(p - KNR, kR); p = HIPR + rotF(p - HIPR, hR); }
else if (b > 5.5 && b < 7.5) { if (b > 6.5) p = ELL + rotF(p - ELL, eL); p = SHL + rotZ(rotF(p - SHL, aL), abL); }
else if (b > 7.5 && b < 9.5) { if (b > 8.5) p = ELR + rotF(p - ELR, eR); p = SHR + rotZ(rotF(p - SHR, aR), abR); }
else if (b > 9.5 && b < 10.5) { vec3 hn = SHR + rotZ(rotF(ELR + rotF(HDR - ELR, eR) - SHR, aR), abR); p = hn + rotF(p - HDR, .14 * sin(tt * 3.) * wk + .04 * sin(tt * 1.3)); }
else if (b > 10.5) { vec3 hn = SHL + rotZ(rotF(ELL + rotF(HDL - ELL, eL) - SHL, aL), abL); p = hn + rotF(p - HDL, .1 * sin(tt * 2.6) * wk * (1. - um)); }
else if (b > .5) { p = NECK + rotY(rotF(p - NECK, nod), iPose2.x); }
else if (grp > 2.5 && grp < 3.5 && position.y < .87 && st > 0.) { vec3 hc = vec3(0., .84, -.02); float f = smoothstep(.87, .66, position.y); p = hc + rotF(p - hc, st * 1.45 * f); p.y -= st * .03 * f; }
p = ROOT + rotF(p - ROOT, lean) + vec3(sw * .012 * wk, (abs(cw) - .7) * .045 * wk - .325 * st, 0.);
transformed = p * shown;
}`;
const VILLAGER_COLOR = `{
float sl = tag; vec3 pc = vec3(1.);
if (sl > .5) {
  vec3 skin = unpackC(iPalA.x);
  pc = sl < 1.5 ? skin : sl < 2.5 ? unpackC(iPalA.y) : sl < 3.5 ? unpackC(iPalA.z) : sl < 4.5 ? unpackC(iPalA.w) : sl < 5.5 ? unpackC(iPalB.x)
     : sl < 6.5 ? unpackC(iPalB.y) : sl < 7.5 ? skin * vec3(1., .72, .68) : sl < 8.5 ? unpackC(iPalA.z) * .72 : sl < 9.5 ? vec3(1., .9, .62)
     : sl < 10.5 ? unpackC(iPalB.z) : unpackC(iPalB.w);
}
vColor.rgb *= pc;
if (sl > 8.5 && sl < 9.5) vEm = vec3(1., .6, .22) * iPose2.y * 4.;
}`;

// ---------------------------------------------------------------- Namen, Berufe, Sätze
const NAMES_M = ['Anton', 'Bruno', 'Carl', 'Emil', 'Friedrich', 'Gustav', 'Hans', 'Jakob', 'Karl', 'Ludwig', 'Max', 'Otto', 'Paul', 'Theo', 'Wilhelm', 'Fritz', 'Konrad', 'Oskar', 'Johann', 'Leo', 'Albert', 'Ferdinand', 'Hugo', 'Kurt', 'Rudi'];
const NAMES_F = ['Anna', 'Berta', 'Clara', 'Elsa', 'Frieda', 'Greta', 'Hedwig', 'Ida', 'Johanna', 'Käthe', 'Lotte', 'Marie', 'Martha', 'Paula', 'Rosa', 'Sophie', 'Thea', 'Wilma', 'Erna', 'Luise', 'Mathilde', 'Ottilie', 'Hanna', 'Liesel', 'Emma'];
const JOBS = [
  { m: 'Bäcker', f: 'Bäckerin', hat: 5, torso: 1, acc: '#f4f0e8', lines: ['Frisches Brot gibt es ab Sonnenaufgang!', 'Riechst du die Zimtschnecken? Die sind gleich fertig.', 'Mein Sauerteig ist älter als der Leuchtturm.'] },
  { m: 'Schmied', f: 'Schmiedin', torso: 1, acc: '#5a3a28', lines: ['Hörst du den Amboss? Das bin ich.', 'Ein Hufeisen bringt Glück – ich mach dir eins.', 'Am Feuer ist es immer warm, sogar im Winter.'] },
  { m: 'Bauer', f: 'Bäuerin', hat: 3, lines: ['Das Korn steht prächtig dieses Jahr.', 'Die Kühe geben heute besonders viel Milch.', 'Ohne Regen kein Brot – so ist das eben.'] },
  { m: 'Fischer', f: 'Fischerin', hat: 1, lines: ['Im See beißen sie heute gut.', 'Gestern hab ich einen Hecht gesehen – sooo groß!', 'Ich lausche dem Bach, der weiß, wo die Fische sind.'] },
  { m: 'Müller', f: 'Müllerin', torso: 1, acc: '#efe9dc', lines: ['Solange der Wind weht, mahlt die Mühle.', 'Mehl in den Haaren ist bei uns ganz normal.'] },
  { m: 'Lehrer', f: 'Lehrerin', torso: 2, lines: ['Wusstest du, dass unsere Insel schwebt? Natürlich wusstest du das.', 'Heute lernen die Kinder, wie man Wolken zählt.'] },
  { m: 'Gärtner', f: 'Gärtnerin', hat: 3, torso: 1, acc: '#6a8a4a', lines: ['Meine Tomaten sind die rötesten der ganzen Insel.', 'Die Bienen lieben meine Lavendelbeete.'] },
  { m: 'Imker', f: 'Imkerin', hat: 1, lines: ['Honig von Wolkenblüten – probier mal!', 'Die Bienen sind heute fleißig wie nie.'] },
  { m: 'Weber', f: 'Weberin', torso: 2, lines: ['Ich webe gerade einen Schal mit Wolkenmuster.', 'Wolle von unseren Schafen ist die weichste.'] },
  { m: 'Schäfer', f: 'Schäferin', hat: 1, lines: ['Hast du meine Schafe gesehen? Eins heißt Wolke.', 'Schafe zählen hilft beim Einschlafen. Ich weiß das.'] },
  { m: 'Postbote', f: 'Postbotin', hat: 1, hatCol: '#2f4f8a', basket: true, lines: ['Ein Brief vom Festland! Na ja, fast.', 'Die Post kommt per Ballon – manchmal etwas windig.'] },
  { m: 'Wirt', f: 'Wirtin', torso: 1, acc: '#e8e0cc', lines: ['Heute gibt es Kürbissuppe im Wirtshaus.', 'Komm doch auf einen Kakao vorbei!'] },
  { m: 'Töpfer', f: 'Töpferin', torso: 1, acc: '#a87a5a', lines: ['Meine Krüge halten hundert Jahre.', 'Ton vom Bachufer ist der beste.'] },
  { m: 'Schneider', f: 'Schneiderin', torso: 2, lines: ['Für den Winter nähe ich warme Mäntel.', 'Ein Knopf fehlt? Bring ihn vorbei.'] },
  { m: 'Nachtwächter', f: 'Nachtwächterin', hat: 1, lantern: true, owl: true, lines: ['Hört, ihr Leut, und lasst euch sagen …', 'Ich pass auf, dass keine Wolke ins Dorf rollt.'] },
  { m: 'Laternenanzünder', f: 'Laternenanzünderin', hat: 1, lantern: true, owl: true, lines: ['Eine Laterne nach der anderen – dann ist das Dorf golden.', 'Im Dunkeln sieht unsere Insel am schönsten aus.'] },
  { m: 'Uhrmacher', f: 'Uhrmacherin', torso: 2, lines: ['Auf unserer Insel tickt die Zeit etwas langsamer.', 'Die Turmuhr geht genau – meistens.'] },
  { m: 'Maler', f: 'Malerin', torso: 1, acc: '#e8e2d6', lines: ['Dieses Licht! Das muss ich malen.', 'Ich male die Insel jeden Tag neu – sie wächst ja ständig.'] },
  { m: 'Musikant', f: 'Musikantin', hat: 1, lines: ['Hörst du die Musik? Die spielt der Wind mit mir.', 'Heute Abend spiele ich auf dem Dorfplatz.'] },
  { m: 'Zimmermann', f: 'Zimmerin', hat: 1, lines: ['Ein neues Haus? Ich hab schon Holz gesägt.', 'Fachwerk hält ewig, wenn man es liebt.'] },
  { m: 'Händler', f: 'Händlerin', torso: 1, acc: '#c8a878', basket: true, lines: ['Äpfel, Birnen, Wolkenzucker – alles frisch!', 'Heute im Angebot: Honig und Käse.'] },
];
const KEEPER_JOB = JOBS.find(j => j.m === 'Händler');
const SAY = {
  spring: ['Riechst du die Blüten? Herrlich!', 'Endlich wieder warm genug für die Bank am Weg.', 'Die ersten Schmetterlinge sind da!', 'Im Frühling ist die Insel am grünsten.'],
  summer: ['Was für ein Sommer! Die Bienen summen überall.', 'Ich hol mir gleich ein Eis vom Markt.', 'So warm heute – ich geh nachher an den See.', 'Die Felder werden schon golden.'],
  autumn: ['Die Blätter sind so bunt dieses Jahr.', 'Riecht nach Kürbissuppe, oder?', 'Bald ist Erntefest!', 'Der Wind pustet die Blätter bis in die Wolken.'],
  winter: ['Brrr! Meine Nase ist ein Eiszapfen.', 'Bald gibt es Bratäpfel.', 'Schnee auf einer schwebenden Insel – ist das nicht wunderbar?', 'Mein Schal ist selbst gestrickt!'],
  rain: ['Gut, dass ich meinen Schirm dabeihabe.', 'Der Regen tut den Feldern gut.', 'Pfützenhüpfen ist mein Lieblingssport.', 'Regen über den Wolken – wie geht das eigentlich?'],
  dusk: ['Die Laternen gehen gleich an.', 'Zeit fürs Abendbrot.', 'Der Himmel ist heute ganz rosa.'],
  night: ['Pssst, die Glühwürmchen tanzen.', 'Ich dreh noch eine Runde mit der Laterne.', 'Siehst du die Sterne? So nah sind sie nur hier oben.', 'Gute Nacht, kleine Insel.'],
  day: ['Schön, dass du vorbeischaust!', 'Hast du den Ballon gesehen? Da will ich auch mal mit!', 'Unsere Insel wird jeden Tag größer.', 'Ich mag den Blick über das Wolkenmeer.', 'Weißt du, wo es hier die besten Äpfel gibt?'],
  kid: ['Ich hab einen Frosch gefunden!', 'Fangen spielen? Du bist dran!', 'Wenn ich groß bin, fahr ich Ballon.', 'Ich kann schon bis hundert zählen!', 'Hast du schon die Enten gesehen?'],
};

// ================================================================ VIERBEINER (Rehe, Kühe, Schafe, Hühner)
// Knochen: 0 Körper, 1 Kopf/Hals, 2 vorn links, 3 vorn rechts, 4 hinten links, 5 hinten rechts, 6 Schwanz. Variante (sway) = Art + 1
const SPECIES = { reh: 0, hirsch: 1, kitz: 2, kuh: 3, schaf: 4, huhn: 5, henne: 6 };
function quadGeo() {
  const o = (v, x = {}) => ({ sway: v, ...x });
  return rigGeo(303, bone => {
    // Rehe (0 Ricke, 1 Bock mit Geweih, 2 Kitz mit Tupfen)
    for (const sp of [0, 1, 2]) {
      const v = sp + 1, C = sp === 2 ? 0xb8804a : 0xa86c38, B = 0xe8dcc4;
      bone(0, [0, 0, 0], k => {
        k.ball(C, [0, .78, 0], [.17, .19, .42], o(v, { detail: 1 }));
        k.ball(B, [0, .7, -.05], [.13, .1, .32], o(v));
        k.ball(0xf4ece0, [0, .84, -.4], [.09, .1, .05], o(v));               // Spiegel
        if (sp === 2) for (let i = 0; i < 9; i++) k.ball(0xf4ecdc, [(i % 2 ? .1 : -.1) + (i % 3) * .02 - .02, .88 + (i % 3) * .03, -.25 + i * .06], .025, o(v, { ao: false, jit: 0 }));
      });
      bone(1, [0, .86, .3], k => {
        k.beam(C, [0, .84, .3], [0, 1.1, .47], .12, o(v));
        k.ball(C, [0, 1.14, .55], [.08, .085, .13], o(v, { r: [.45, 0, 0] }));
        k.ball(0x2a2018, [0, 1.09, .67], .03, o(v));
        k.ball(B, [0, 1.1, .62], [.05, .042, .05], o(v));
        for (const s of [1, -1]) {
          k.box(C, [.075 * s, 1.18, .49], [.06, .1, .018], o(v, { r: [0, -.3 * s, -.8 * s] }));
          k.box(0x1a1410, [.062 * s, 1.165, .59], [.02, .022, .015], o(v, { ao: false, jit: 0 }));
          if (sp === 1) { k.beam(0x8a6a4a, [.035 * s, 1.2, .52], [.08 * s, 1.42, .5], .025, o(v)); k.beam(0x8a6a4a, [.07 * s, 1.35, .51], [.13 * s, 1.42, .58], .02, o(v)); k.beam(0x8a6a4a, [.06 * s, 1.29, .51], [.04 * s, 1.37, .6], .02, o(v)); }
        }
      });
      for (const [id, x, z] of [[2, .1, .3], [3, -.1, .3], [4, .1, -.3], [5, -.1, -.3]]) bone(id, [x, .7, z], k => {
        k.box(C, [x, .05, z], [.055, .6, .065], o(v)); k.box(C, [x, .47, z], [.09, .24, .11], o(v)); k.box(0x2a2018, [x, 0, z], [.06, .06, .075], o(v, { jit: 0 }));
      });
      bone(6, [0, .9, -.42], k => k.box(0xf4ece0, [0, .85, -.45], [.045, .07, .04], o(v)));
    }
    // Kuh
    { const v = 4, Wt = 0xf2eee6, Bk = 0x2a2624;
      bone(0, [0, 0, 0], k => {
        k.box(Wt, [0, .62, 0], [.62, .55, 1.1], o(v));
        k.box(Wt, [0, .7, .5], [.55, .48, .25], o(v));
        for (const [x, y, z, s] of [[.312, .9, .1, .25], [-.312, .8, -.25, .3], [.312, .78, -.35, .18], [-.312, .95, .3, .2]]) k.box(Bk, [x, y - s / 2, z], [.012, s, s * 1.3], o(v, { ao: false, jit: .03 }));
        k.box(Bk, [.1, 1.17, -.1], [.28, .012, .35], o(v, { ao: false }));
        k.ball(0xe8a0a0, [0, .58, -.25], [.13, .08, .12], o(v));
        for (const s of [1, -1]) for (const z of [-.3, -.2]) k.cyl(0xe8a0a0, [.05 * s, .48, z], .022, .07, 4, o(v, { ao: false }));
      });
      bone(1, [0, 1.0, .58], k => {
        k.box(Wt, [0, .82, .62], [.3, .32, .32], o(v, { r: [-.3, 0, 0] }));
        k.box(Bk, [0, .88, .72], [.31, .14, .14], o(v, { r: [-.3, 0, 0], ao: false }));
        k.box(0xe8b0a8, [0, .7, .82], [.24, .14, .14], o(v));
        for (const s of [1, -1]) {
          k.box(0x1a1614, [.08 * s, .76, .89], [.035, .03, .01], o(v, { ao: false, jit: 0 }));
          k.box(0x1a1614, [.1 * s, .99, .74], [.03, .03, .02], o(v, { ao: false, jit: 0 }));
          k.box(Wt, [.19 * s, 1.0, .6], [.14, .05, .08], o(v, { r: [0, 0, -.3 * s] }));
          k.cone(0xe8dcc0, [.13 * s, 1.08, .62], .03, .14, 5, o(v, { r: [0, 0, -.9 * s] }));
        }
      });
      for (const [id, x, z] of [[2, .2, .42], [3, -.2, .42], [4, .2, -.42], [5, -.2, -.42]]) bone(id, [x, .5, z], k => {
        k.box(Wt, [x, .1, z], [.13, .45, .14], o(v)); k.box(0x3a3028, [x, 0, z], [.135, .1, .145], o(v, { jit: 0 }));
      });
      bone(6, [0, 1.12, -.55], k => { k.beam(Wt, [0, 1.12, -.56], [0, .55, -.62], .035, o(v)); k.ball(Bk, [0, .52, -.62], [.05, .08, .05], o(v)); });
    }
    // Schaf
    { const v = 5, Wo = 0xf2efe6, Fc = 0x3a3430;
      bone(0, [0, 0, 0], k => {
        k.ball(Wo, [0, .6, 0], [.3, .27, .42], o(v, { detail: 1, jit: .05 }));
        for (let i = 0; i < 7; i++) k.ball(Wo, [Math.sin(i * 2.3) * .16, .78 + (i % 2) * .05, -.3 + i * .1], .14, o(v, { detail: 0, jit: .06 }));
      });
      bone(1, [0, .72, .35], k => {
        k.ball(Fc, [0, .74, .5], [.1, .11, .15], o(v, { r: [.4, 0, 0] }));
        k.ball(Wo, [0, .83, .45], .09, o(v, { detail: 0 }));
        for (const s of [1, -1]) { k.box(Fc, [.11 * s, .78, .45], [.1, .04, .05], o(v, { r: [0, 0, .3 * s] })); k.box(0xf4f0e0, [.055 * s, .78, .6], [.025, .025, .015], o(v, { ao: false, jit: 0 })); }
      });
      for (const [id, x, z] of [[2, .12, .25], [3, -.12, .25], [4, .12, -.25], [5, -.12, -.25]]) bone(id, [x, .42, z], k => { k.box(0x4a4440, [x, .03, z], [.05, .41, .055], o(v)); k.box(0x2a2624, [x, 0, z], [.055, .04, .06], o(v, { jit: 0 })); });
      bone(6, [0, .7, -.42], k => k.ball(Wo, [0, .64, -.45], .07, o(v)));
    }
    // Hühner (5 weiß, 6 braun)
    for (const sp of [5, 6]) {
      const v = sp + 1, C = sp === 5 ? 0xf4f0e6 : 0xb8743a, C2 = sp === 5 ? 0xe6e0d4 : 0x8a4a22;
      bone(0, [0, 0, 0], k => {
        k.ball(C, [0, .28, 0], [.12, .12, .16], o(v));
        k.box(C2, [0, .34, -.14], [.06, .16, .08], o(v, { r: [-.5, 0, 0] }));
        for (const s of [1, -1]) k.ball(C2, [.11 * s, .29, -.01], [.025, .07, .11], o(v));
      });
      bone(1, [0, .36, .1], k => {
        k.ball(C, [0, .45, .14], [.065, .075, .07], o(v));
        k.cone(0xe8b030, [0, .45, .2], .02, .06, 4, o(v, { r: [PI / 2, 0, 0], ao: false }));
        k.box(0xd8302a, [0, .51, .13], [.018, .05, .08], o(v, { ao: false }));
        k.ball(0xd8302a, [0, .4, .19], [.014, .03, .014], o(v, { ao: false }));
        for (const s of [1, -1]) k.box(0x1a1410, [.05 * s, .47, .17], [.012, .015, .015], o(v, { ao: false, jit: 0 }));
      });
      for (const [id, x] of [[2, .045], [3, -.045]]) bone(id, [x, .2, 0], k => { k.cyl(0xe8b030, [x, 0, 0], .012, .2, 4, o(v, { ao: false })); k.box(0xe8b030, [x, 0, .02], [.05, .012, .06], o(v, { ao: false })); });
    }
  });
}
const QUAD_DECL = `attribute float aBone; attribute vec3 aPiv; attribute float sway; attribute vec4 iP; attribute vec4 iS;`;
const QUAD_DEFORM = `{
float shown = step(abs(sway - (iS.x + 1.)), .4);
vec3 p = position - aPiv; float b = aBone, ph = iP.x, wk = iP.y;
if (b > .5 && b < 1.5) p = rotY(rotF(p, iP.z), iS.z);
else if (b > 1.5 && b < 5.5) { float o = (b < 2.5 || b > 4.5) ? 0. : 3.14159; p = rotF(p, sin(ph + o) * .5 * wk); }
else if (b > 5.5) p = rotZ(rotY(p, sin(uT * 2.3 + iP.w * 9.) * .4 * iS.y), .12 * sin(uT * 1.7 + iP.w));
p += aPiv; p.y += (abs(cos(ph)) - .7) * .03 * wk;
transformed = p * shown;
}`;

// ================================================================ KLEINTIERE (Vögel, Gänse, Adler, Schmetterlinge, Fische, Enten)
// Art (iA.x): 0 Vogel, 1 Gans, 2 Adler, 3 Schmetterling, 4 Fisch, 5 Erpel, 6 Ente, 7 Küken. Variante: 1 Vogel, 2 Falter, 3 Fisch, 4 Ente
// Knochen: 1/2 Flügel links innen/außen, 3/4 rechts, 5 Schwanzflosse, 6 Kopf. Farbplätze 1/2 = Instanzfarben, 3 Kopf, 4 Schnabel, 5 Brust, 6 Halsring
function critterGeo() {
  const o = (slot, v, x = {}) => ({ tag: slot, sway: v, ao: false, ...x });
  const W = 0xffffff;
  return rigGeo(505, bone => {
    bone(0, [0, 0, 0], k => {                                                     // Vogel
      k.ball(W, [0, 0, 0], [.065, .06, .16], o(1, 1));
      k.ball(W, [0, -.01, .02], [.055, .045, .11], o(5, 1));
      k.ball(W, [0, .03, .15], [.05, .05, .055], o(3, 1));
      k.cone(W, [0, .03, .19], .018, .06, 4, o(4, 1, { r: [PI / 2, 0, 0] }));
      k.box(W, [0, -.005, -.2], [.09, .012, .12], o(2, 1));
      for (const s of [1, -1]) k.box(0x101010, [.035 * s, .045, .175], [.012, .012, .012], o(0, 1, { jit: 0 }));
    });
    for (const [s, bi, bo] of [[1, 1, 2], [-1, 3, 4]]) {
      bone(bi, [.04 * s, .02, 0], k => k.boxc(W, [.12 * s, .02, 0], [.17, .014, .13], o(2, 1)));
      bone(bo, [.2 * s, .02, 0], k => { k.boxc(W, [.28 * s, .02, -.015], [.16, .012, .095], o(2, 1)); k.boxc(W, [.36 * s, .02, -.03], [.05, .01, .06], o(1, 1)); });
    }
    bone(0, [0, 0, 0], k => {                                                     // Schmetterling
      k.cyl(0x2a2420, [0, 0, -.05], .012, .11, 5, o(0, 2, { r: [PI / 2, 0, 0] }));
      for (const s of [1, -1]) k.beam(0x2a2420, [.005 * s, .005, .05], [.03 * s, .03, .1], .004, o(0, 2));
    });
    for (const [s, b] of [[1, 1], [-1, 3]]) bone(b, [0, 0, 0], k => {
      k.boxc(W, [.065 * s, 0, .022], [.12, .004, .085], o(1, 2, { r: [0, .25 * s, 0] }));
      k.boxc(W, [.05 * s, 0, -.035], [.085, .004, .065], o(2, 2, { r: [0, -.3 * s, 0] }));
      k.boxc(0x1a1614, [.095 * s, .003, .04], [.02, .002, .02], o(0, 2, { jit: 0 }));
    });
    bone(0, [0, 0, 0], k => {                                                     // Fisch
      k.ball(W, [0, 0, 0], [.045, .065, .17], o(1, 3, { detail: 1 }));
      k.ball(W, [0, .025, 0], [.03, .04, .14], o(2, 3));
      k.box(W, [0, .05, -.03], [.008, .05, .08], o(2, 3));
      for (const s of [1, -1]) k.box(0x101010, [.034 * s, .012, .12], [.012, .012, .012], o(0, 3, { jit: 0 }));
    });
    bone(5, [0, 0, -.14], k => { k.box(W, [0, -.06, -.2], [.008, .12, .09], o(2, 3)); });
    bone(0, [0, 0, 0], k => {                                                     // Ente
      k.ball(W, [0, .08, 0], [.13, .095, .2], o(1, 4, { detail: 1 }));
      k.ball(W, [0, .1, .11], [.11, .09, .1], o(5, 4));
      k.box(W, [0, .12, -.2], [.08, .03, .1], o(1, 4, { r: [-.5, 0, 0] }));
      k.box(0xf2f0ea, [0, .1, -.215], [.03, .02, .03], o(0, 4, { r: [-.5, 0, 0] }));
      for (const s of [1, -1]) { k.box(W, [.12 * s, .1, -.04], [.02, .06, .18], o(2, 4)); k.box(0x3a5ac8, [.13 * s, .11, -.07], [.012, .025, .06], o(0, 4, { jit: 0 })); }
    });
    bone(6, [0, .17, .14], k => {
      k.cyl(W, [0, .14, .15], .045, .12, 6, o(2, 4));
      k.cyl(W, [0, .18, .15], .048, .02, 6, o(6, 4));
      k.ball(W, [0, .29, .17], [.058, .058, .075], o(2, 4));
      k.box(0xe8b030, [0, .27, .245], [.05, .02, .08], o(4, 4));
      for (const s of [1, -1]) k.box(0x101010, [.052 * s, .3, .19], [.01, .014, .014], o(0, 4, { jit: 0 }));
    });
  });
}
const CRIT_DECL = `attribute float aBone; attribute vec3 aPiv; attribute float sway; attribute float tag; attribute vec4 iA; attribute vec4 iB;`;
const CRIT_DEFORM = `{
float kind = iA.x; float want = kind < 2.5 ? 1. : kind < 3.5 ? 2. : kind < 4.5 ? 3. : 4.;
float shown = step(abs(sway - want), .4);
float b = aBone; vec3 p = position;
float fr = kind < .5 ? 13. : kind < 1.5 ? 5.5 : kind < 2.5 ? 3.2 : 19.;
float fl = sin(uT * fr + iA.y) * iA.z;
float bf = (kind > 2.5 && kind < 3.5) ? 1. : 0.;
float aIn = fl * mix(.75, 1.05, bf) + mix(.06, .5, bf), aOut = sin(uT * fr + iA.y - .8) * iA.z * .45;
vec3 SH = vec3(.04, .02, 0.);
if (b > .5 && b < 2.5) { if (b > 1.5) p = aPiv + rotZ(p - aPiv, aOut); vec3 c = b > 1.5 ? SH : aPiv; p = c + rotZ(p - c, aIn); }
else if (b > 2.5 && b < 4.5) { if (b > 3.5) p = aPiv + rotZ(p - aPiv, -aOut); vec3 c = b > 3.5 ? SH * vec3(-1., 1., 1.) : aPiv; p = c + rotZ(p - c, -aIn); }
else if (b > 4.5 && b < 5.5) p = aPiv + rotY(p - aPiv, sin(uT * 16. + iA.w * 9.) * .5 * iB.w);
else if (b > 5.5) p = aPiv + rotF(p - aPiv, -iB.z * 1.2 + .07 * sin(uT * 1.7 + iA.w * 5.));
transformed = p * shown;
}`;
const CRIT_COLOR = `{
float sl = tag, kind = iA.x; vec3 c1 = unpackC(iB.x), c2 = unpackC(iB.y); vec3 pc = vec3(1.);
if (sl > .5) pc = sl < 1.5 ? c1 : sl < 2.5 ? c2 : sl < 3.5 ? ((kind > 1.5 && kind < 2.5) ? vec3(.92, .9, .84) : c2)
  : sl < 4.5 ? (kind < .5 ? vec3(.12) : vec3(.95, .6, .1)) : sl < 5.5 ? ((kind > 4.5 && kind < 5.5) ? vec3(.36, .16, .08) : c1 * 1.1)
  : ((kind > 4.5 && kind < 5.5) ? vec3(.95) : c2);
vColor.rgb *= pc;
}`;

// ================================================================ PARTIKEL-POOLS (GPU)
// Jede Instanz: A = Ort + Größe, B = Farbe + Stärke, C = Art, Startzeit (−1 = Dauerschleife), Lebensdauer, Zufall, D = Geschwindigkeit + Parameter
class GPool {
  constructor(base, N, mat, names) {
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index;
    for (const [k, v] of Object.entries(base.attributes)) g.setAttribute(k, v);
    this.A = names.map(n => instAttr(g, n, N)); g.instanceCount = N;
    for (let i = 0; i < N; i++) this.A[2].array[i * 4] = -1;
    this.N = N; this.g = g; this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false;
    this.layout(0, 0);
  }
  layout(S, D) { this.S = S; this.D = D; this.R0 = S + D; this.next = this.R0; this.dynUsed = 0; this.hi = this.R0; this.g.instanceCount = this.hi; }
  put(i, a, b, c, d) { const A = this.A; for (let j = 0; j < 4; j++) { A[0].array[i * 4 + j] = a[j]; A[1].array[i * 4 + j] = b[j]; A[2].array[i * 4 + j] = c[j]; A[3].array[i * 4 + j] = d ? d[j] : 0; } }
  touch(lo, hi) { if (hi <= lo) return; for (const a of this.A) { a.addUpdateRange(lo * 4, (hi - lo) * 4); a.needsUpdate = true; } }
  clearRange(lo, hi) { for (let i = lo; i < hi; i++) this.A[2].array[i * 4] = -1; }
  // Ringpuffer für Ausbrüche
  spawn(a, b, c, d) {
    const i = this.next; this.next = this.next + 1 >= this.N ? this.R0 : this.next + 1;
    this.put(i, a, b, c, d); this.touch(i, i + 1); if (i + 1 > this.hi) { this.hi = i + 1; this.g.instanceCount = this.hi; } return i;
  }
}
function quadGeoBits() {                                     // Viereck (x −.5….5, y −1…0) für Konfetti/Wimpel/Halme
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, .5, -1, 0, -.5, 0, 0, .5, -1, 0, -.5, -1, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  return g;
}
const FOG_FACTOR = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #else
    float fogF = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
#else
  float fogF = 0.;
#endif`;

function glowMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${GL}
uniform float uLamp, uFire, uDay, uMin;
attribute vec4 gA; attribute vec4 gB; attribute vec4 gC; attribute vec4 gD;
varying vec2 vUv; varying vec3 vCol; varying float vShape;
#include <fog_pars_vertex>
void main(){
  float kind = gC.x, t0 = gC.y, life = gC.z, seed = gC.w;
  vec3 c = gA.xyz; float size = gA.w, I = gB.w, shape = 0., flt = 0., age = 0.;
  vec3 colr = gB.rgb;
  if (kind < -.5) { gl_Position = vec4(2., 2., 2., 1.); return; }
  if (kind < .5) { I *= uLamp * (.86 + .09 * sin(uT * 9. + seed * 30.) + .05 * sin(uT * 23. + seed * 7.)); size = max(size, uMin * 1.3); }
  else if (kind < 1.5) {
    float s = seed * 40.;
    c += vec3(sin(uT * .31 + s) * 1.7 + sin(uT * .77 + s * 2.) * .6, sin(uT * .53 + s) * .5 + .3 * sin(uT * 1.3 + s), cos(uT * .27 + s * 1.3) * 1.7 + cos(uT * .61 + s) * .6) * gD.x;
    float bl = pow(max(0., sin(uT * (.8 + fract(seed * 9.) * .7) + s * 3.)), 4.); I *= uFire * (bl * .85 + .15); size = max(size, uMin * .6);
  }
  else if (kind < 2.5) { }
  else if (kind < 3.5) {
    float tt = uT - t0; age = tt / life; if (age < 0. || age > 1.) { gl_Position = vec4(2., 2., 2., 1.); return; }
    float k = gD.w; c += gD.xyz * (1. - exp(-k * tt)) / max(k, .001) + vec3(0., -1.4 * tt * tt, 0.);
    I *= (1. - age) * (1. - age) * (.65 + .35 * sin(uT * 31. + seed * 50.)); size *= 1. - age * .45;
  }
  else if (kind < 4.5) { flt = 1.; shape = 1.; I *= gD.x > .5 ? 1. : uLamp; }
  else if (kind < 5.5) {
    flt = 1.; shape = 2.; age = t0 < 0. ? fract(uT / life + seed) : (uT - t0) / life;
    if (age < 0. || age > 1.) { gl_Position = vec4(2., 2., 2., 1.); return; }
    size *= .25 + age; I *= (1. - age) * min(1., age * 6.);
  }
  else if (kind < 6.5) { shape = 3.; I *= uDay; }
  else if (kind < 7.5) {
    float tt = uT - t0; age = tt / life; if (age < 0. || age > 1.) { gl_Position = vec4(2., 2., 2., 1.); return; }
    shape = 4.; c += gD.xyz * tt; I *= sin(age * 3.14159) * pow(.5 + .5 * sin(uT * 13. + seed * 40.), 2.);
  }
  else {
    float tt = uT - t0; age = tt / life; if (age < 0. || age > 1.) { gl_Position = vec4(2., 2., 2., 1.); return; }
    float a = seed * 6.283 + tt * gD.x, r = gD.y * (1. + age * .8);
    c += vec3(cos(a) * r, tt * gD.z, sin(a) * r); I *= sin(age * 3.14159); shape = kind > 8.5 ? 4. : 0.;
  }
  vec4 mvPosition;
  if (flt > .5) mvPosition = modelViewMatrix * vec4(c + vec3(position.x * size, 0., -position.y * size), 1.);
  else { mvPosition = modelViewMatrix * vec4(c, 1.); mvPosition.xy += position.xy * size; }
  vUv = position.xy * 2.; vCol = colr * I; vShape = shape;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: `
varying vec2 vUv; varying vec3 vCol; varying float vShape;
#include <fog_pars_fragment>
vec3 hue(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
void main(){
  float r = length(vUv), a;
  vec3 c = vCol;
  if (vShape < .5) { if (r > 1.) discard; float q = 1. - r; a = q * q * .55 + pow(q, 10.) * 1.6; }
  else if (vShape < 1.5) { if (r > 1.) discard; a = pow(1. - r, 2.2) * .5; }
  else if (vShape < 2.5) { a = smoothstep(.13, 0., abs(r - .82)) * .8; if (r > 1.) discard; }
  else if (vShape < 3.5) { float u = (r - .62) / .32; if (u < 0. || u > 1. || vUv.y < 0.) discard; float ang = atan(vUv.y, vUv.x); c *= hue(u * .8); a = sin(u * 3.14159) * .5 * smoothstep(.15, .9, ang) * smoothstep(2.6, 1.6, ang); }
  else { float ax = abs(vUv.x), ay = abs(vUv.y); a = exp(-ax * 16.) * exp(-ay * 2.5) + exp(-ay * 16.) * exp(-ax * 2.5) + exp(-r * r * 9.) * .8; a = min(a, 2.); }
  ${FOG_FACTOR}
  gl_FragColor = vec4(c * (1. - fogF), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
}
function addUniforms(mat, U) { Object.assign(mat.uniforms, U); return mat; }

// Nebel und Gischt: weiche Lichtflecken mit normaler Mischung (Wasserfall-Nebel, Sprühschleier, Staubwolken)
function softMaterial(U) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), fog: true, transparent: true, depthWrite: false,
    vertexShader: `${GL}
uniform float uNightL; uniform vec2 uWind;
attribute vec4 sA; attribute vec4 sB; attribute vec4 sC; attribute vec4 sD;
varying vec2 vUv; varying vec4 vC;
#include <fog_pars_vertex>
void main(){
  float kind = sC.x, t0 = sC.y, life = sC.z, seed = sC.w;
  bool loop = t0 < -.5; float age = loop ? fract(uT / life + seed) : (uT - t0) / life;
  if (kind < -.5 || age < 0. || age > 1.) { gl_Position = vec4(2., 2., 2., 1.); return; }
  vec3 c = sA.xyz; float sz = sA.w, al = sB.w;
  if (kind < 1.5) { c += vec3(sin(seed * 40.) * sD.x, age * sD.y, cos(seed * 40.) * sD.x) * (.5 + age); sz *= .6 + .8 * age; al *= sin(age * 3.14159); }
  else if (kind < 2.5) {
    vec3 d = vec3(sD.x, 0., sD.z), sd = vec3(-d.z, 0., d.x);
    c += d * (sqrt(age) * 2.2 + age * 1.5 + (fract(seed * 7.) - .5) * .5) + vec3(0., -age * age * sD.y, 0.) + sd * (fract(seed * 3.1) - .5) * 1.6 * (.4 + age);
    sz *= .4 + 1.9 * age; al *= smoothstep(0., .12, age) * (1. - age * .6);
  } else { float tt = uT - t0; c += sD.xyz * (1. - exp(-2.5 * tt)) / 2.5 + vec3(0., .35 * tt, 0.); sz *= .5 + 1.3 * age; al *= (1. - age) * (1. - age); }
  vec4 mvPosition = modelViewMatrix * vec4(c, 1.); float rot = seed * 6.283 + uT * .2 * (fract(seed * 5.) - .5);
  vec2 q = vec2(cos(rot) * position.x - sin(rot) * position.y, sin(rot) * position.x + cos(rot) * position.y);
  mvPosition.xy += q * sz;
  vUv = position.xy * 2.; vC = vec4(sB.rgb * mix(1., .22, uNightL), al);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: `varying vec2 vUv; varying vec4 vC;
#include <fog_pars_fragment>
void main(){
  float r = length(vUv); if (r > 1.) discard;
  float a = pow(1. - r, 1.6) * (.75 + .25 * sin(vUv.x * 5. + vUv.y * 3.)) * vC.a;
  gl_FragColor = vec4(vC.rgb, a);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  Object.assign(m.uniforms, U); return m;
}

// Rauch, Gischt, Staub, Tropfen: beleuchtete, halbdurchsichtige Kugeln
function puffMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, metalness: 0, transparent: true, depthWrite: false });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
${GL}
uniform float uSmoke; uniform vec2 uWind;
attribute vec4 pA; attribute vec4 pB; attribute vec4 pC; attribute vec4 pD; varying vec3 vPC; varying float vPA;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float kind = pC.x, t0 = pC.y, life = pC.z, seed = pC.w;
  vec3 c = pA.xyz; float sz = pA.w, al = pB.w, s = 1.;
  bool loop = t0 < -.5;
  float age = loop ? fract(uT / life + seed) : (uT - t0) / life;
  float vis = (kind > -.5 && age >= 0. && age <= 1.) ? 1. : 0.;
  if (kind < .5) {
    vis *= step(fract(seed * 13.7), uSmoke * 1.6); al *= .45 + .55 * uSmoke;
    c += vec3(uWind.x, 0., uWind.y) * age * pD.x * (1. + age) + vec3(sin(age * 6. + seed * 20.) * .22, age * pD.y, cos(age * 5. + seed * 13.) * .22);
    s = sz * (.3 + 1.35 * age); al *= smoothstep(0., .1, age) * (1. - age) * (1. - age * .3);
  } else if (kind < 1.5) {
    c += vec3(sin(seed * 40.) * pD.x, age * pD.y, cos(seed * 40.) * pD.x) * (.5 + age);
    s = sz * (.6 + .8 * age); al *= sin(age * 3.14159);
  } else if (kind < 2.5) {
    vec3 d = vec3(pD.x, 0., pD.z); vec3 sd = vec3(-d.z, 0., d.x);
    c += d * (sqrt(age) * 2.2 + age * 1.5 + (fract(seed * 7.) - .5) * .6) + vec3(0., -age * age * pD.y, 0.) + sd * (fract(seed * 3.1) - .5) * 1.8 * (.4 + age);
    s = sz * (.3 + 1.7 * age); al *= smoothstep(0., .15, age) * (1. - age * .5);
  } else if (kind < 3.5) {
    float tt = uT - t0; c += pD.xyz * (1. - exp(-2.5 * tt)) / 2.5 + vec3(0., .35 * tt, 0.);
    s = sz * (.5 + 1.2 * age); al *= (1. - age) * (1. - age);
  } else {
    float tt = loop ? age * life : uT - t0; c += pD.xyz * tt + vec3(0., -4.9 * tt * tt, 0.);
    s = sz * (1. - age * .5); al *= 1. - age * age;
  }
  transformed = c + position * s * vis;
  vPC = pB.rgb; vPA = al * vis;
}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPC; varying float vPA;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vPC; diffuseColor.a *= vPA;');
  };
  m.customProgramCacheKey = () => 'lifePuff1';
  return m;
}

// Konfetti, Grasbüschel, Ähren, Blätter, Wimpel: beleuchtete Blättchen
function bitsMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: .7, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
${GL}
attribute vec4 bA; attribute vec4 bB; attribute vec4 bC; attribute vec4 bD; varying vec3 vBC;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float kind = bC.x, t0 = bC.y, life = bC.z, seed = bC.w, tt = uT - t0, age = tt / life;
  float vis = (kind > -.5 && age >= 0. && age <= 1.) ? 1. : 0.;
  vec3 c = bA.xyz, lp = position, off; float sz = bA.w, fs = 1.;
  vec3 ax = normalize(vec3(sin(seed * 12.) + .01, cos(seed * 7.), sin(seed * 3.3)));
  if (kind < 3.5) {
    lp.y += .5; lp.x *= bB.w > .5 ? .35 : 1.;
    if (kind < .5) { float k = 1.6; c += bD.xyz * (1. - exp(-k * tt)) / k + vec3(sin(tt * 3. + seed * 20.) * .3, -1.0 * tt, cos(tt * 2.7 + seed * 11.) * .3); lp = rotAx(lp, ax, tt * (7. + seed * 9.)); }
    else if (kind < 1.5) { c += bD.xyz * tt + vec3(0., -6. * tt * tt, 0.); lp = rotAx(lp, ax, tt * 9.); fs = 1. - smoothstep(.75, 1., age); }
    else if (kind < 2.5) { float a = seed * 6.283 + tt * bD.x, r = bD.y * (1. + .6 * age); c += vec3(cos(a) * r, tt * bD.z, sin(a) * r); lp = rotAx(lp, ax, tt * 4.); fs = sin(age * 3.14159) * 1.3; }
    else { c += vec3(sin(tt * 2. + seed * 9.) * .6 + bD.x * tt, -.75 * tt, cos(tt * 1.6 + seed * 7.) * .4 + bD.z * tt); lp = rotAx(lp, ax, sin(tt * 2.5 + seed) * 1.4); fs = 1. - smoothstep(.85, 1., age); }
    off = lp * sz * fs;
  } else {
    lp.x *= (1. + lp.y);
    vec3 d = normalize(bD.xyz + vec3(.0001)); vec3 dn = vec3(0., -1., 0.); vec3 n = normalize(cross(d, dn));
    float swg = sin(uT * 3.2 + seed * 6.) * .35 + .1;
    vec3 dd = dn * cos(swg) + n * sin(swg);
    fs = smoothstep(0., .05, age) * (1. - smoothstep(.9, 1., age));
    off = (d * lp.x * .8 - dd * lp.y) * sz * fs;
  }
  transformed = c + off * vis;
  vBC = bB.rgb;
}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBC;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vBC;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vBC * .32;');
  };
  m.customProgramCacheKey = () => 'lifeBits2';
  return m;
}

// Leuchtturm-Strahlen: zwei Kegel je Turm, kreisen nachts
function beamMesh(U, N = 4) {
  const one = new THREE.CylinderGeometry(1, .07, 1, 18, 6, true).translate(0, .5, 0).rotateZ(-PI / 2);
  const two = one.clone().rotateY(PI);
  const base = mergeGeometries([one, two]);
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; for (const [k, v] of Object.entries(base.attributes)) g.setAttribute(k, v);
  const a = instAttr(g, 'bP', N); g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]), fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `${GL}
uniform float uBeam; attribute vec4 bP; varying float vU; varying float vF;
#include <fog_pars_vertex>
void main(){
  float L = 42., Rr = 4.6; vec3 p = position; vU = abs(p.x);
  vec3 q = vec3(p.x * L, p.y * Rr - vU * L * .07, p.z * Rr);
  q = rotY(q, uT * .55 + bP.w * 6.283);
  vec3 wp = bP.xyz + q;
  vec4 mvPosition = modelViewMatrix * vec4(wp, 1.);
  vec3 n = normalize(normalMatrix * rotY(normal, uT * .55 + bP.w * 6.283));
  vF = abs(dot(n, normalize(-mvPosition.xyz)));
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: `uniform float uBeam; varying float vU; varying float vF;
#include <fog_pars_fragment>
void main(){
  float a = pow(1. - vU, 1.4) * (.25 + .75 * pow(vF, 1.6)) * uBeam * smoothstep(0., .03, vU);
  ${FOG_FACTOR}
  gl_FragColor = vec4(vec3(1., .86, .6) * .38 * (1. - fogF), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  Object.assign(mat.uniforms, U);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 3;
  return { mesh: m, attr: a, geo: g };
}

// ================================================================ HEISSLUFTBALLON + LUFTSCHIFF
function balloonParts(seed = 3) {
  const k = new Kit(seed); k.jit = .04;
  const S = 1.15;
  const prof = [[.75, 0], [1.25, .7], [2.05, 1.9], [2.8, 3.25], [3.2, 4.55], [3.3, 5.6], [3.05, 6.7], [2.45, 7.65], [1.55, 8.3], [.6, 8.62], [0, 8.7]].map(([r, y]) => new THREE.Vector2(r * S, y * S));
  const SEG = 16, lat = new THREE.LatheGeometry(prof, SEG).toNonIndexed(); lat.deleteAttribute('uv');
  const pos = lat.attributes.position, n = pos.count, cc = new Float32Array(n * 3), cl = new THREE.Color();
  const A = new THREE.Color(0xe0402e), Bc = new THREE.Color(0xf6d24a), Cc = new THREE.Color(0x2f6fd0), Dc = new THREE.Color(0xf4efe4);
  for (let f = 0; f < n; f += 3) {
    let x = 0, y = 0, z = 0; for (let v = f; v < f + 3; v++) { x += pos.getX(v); y += pos.getY(v); z += pos.getZ(v); } x /= 3; y /= 3 * S; z /= 3;
    const gi = Math.floor(((Math.atan2(z, x) + PI) / TAU) * SEG + .5) % SEG;
    cl.copy(gi % 4 === 0 ? Cc : gi % 2 ? A : Bc);
    if (y > 4.7 && y < 5.5) cl.copy(Dc); if (y > 5.5 && y < 5.75) cl.copy(Cc);
    if (y > 8.0) cl.copy(A); if (y < 1) cl.multiplyScalar(.82);
    const kk = .94 + k.rand() * .1; for (let v = f; v < f + 3; v++) cc.set([cl.r * kk, cl.g * kk, cl.b * kk], v * 3);
  }
  lat.setAttribute('color', new THREE.BufferAttribute(cc, 3)); lat.computeVertexNormals();
  k.raw(lat, 'env');
  k.cyl(0x8a2a20, [0, -.62, 0], .82, .64, 16, { top: 1.05, layer: 'env', ao: false });
  k.cyl(0x6a6a6a, [0, -.65, 0], .85, .05, 16, { ao: false });
  const BY = -3.4, BH = 1.05;                                       // Korb
  k.box(0x9a6a3a, [0, BY, 0], [1.3, BH, 1.3]);
  for (let i = 0; i < 6; i++) k.box(i % 2 ? 0x8a5e32 : 0xa8784a, [0, BY + .08 + i * .16, 0], [1.31, .07, 1.31], { ao: false, jit: .05 });
  k.box(0x5a3a24, [0, BY + BH - .02, 0], [1.38, .1, 1.38], { ao: false });
  k.box(0x5a3a24, [0, BY - .03, 0], [1.34, .06, 1.34], { ao: false });
  for (const [x, z] of [[.62, .62], [-.62, .62], [.62, -.62], [-.62, -.62]]) {
    k.box(0x5a3a24, [x, BY, z], [.09, BH + .05, .09], { ao: false });
    k.beam(0x7a7068, [x, BY + BH, z], [x * .5, -1.5, z * .5], .035);  // Stangen zum Brenner
  }
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + PI / 8, x = Math.cos(a) * .82, z = Math.sin(a) * .82; k.beam(0x4a4038, [x, -.66, z], [Math.sign(x) * .62, BY + BH, Math.sign(z) * .62], .022); }
  k.box(0x8a8a90, [0, -1.62, 0], [.85, .06, .85], { ao: false });     // Brennerrahmen
  for (const s of [1, -1]) { k.cyl(0x9a9aa2, [.16 * s, -1.6, 0], .13, .42, 8, { ao: false }); k.cyl(0x5a5a62, [.16 * s, -1.18, 0], .1, .06, 8, { ao: false }); }
  for (const [x, z] of [[.71, 0], [-.71, 0], [0, .71], [0, -.71]]) { k.beam(0xc8b89a, [x, BY + BH, z], [x * 1.05, BY + .45, z * 1.05], .012); k.ball(0x8a7048, [x * 1.08, BY + .32, z * 1.08], [.11, .15, .11], { ao: false }); }
  // zwei Mitfahrer
  for (const [x, z, sh, hat, wave] of [[.28, .2, 0x3a6aa8, 0x4a3a2e, true], [-.3, -.15, 0xc8483a, 0xe2c27a, false]]) {
    k.box(sh, [x, BY + .55, z], [.36, .62, .24], { ao: false });
    k.ball(0xf0caa0, [x, BY + 1.33, z], [.13, .15, .13], { ao: false, detail: 1 });
    k.cyl(hat, [x, BY + 1.43, z], .2, .02, 10, { ao: false }); k.cyl(hat, [x, BY + 1.44, z], .12, .12, 8, { top: .85, ao: false });
    if (wave) { k.beam(sh, [x + .2, BY + 1.12, z], [x + .32, BY + 1.62, z + .05], .09); k.ball(0xf0caa0, [x + .33, BY + 1.67, z + .05], .055, { ao: false }); }
    else { k.beam(sh, [x - .2, BY + 1.12, z], [x - .24, BY + .98, z + .25], .09); }
  }
  // Wimpelkette am Korb
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, x = Math.cos(a) * .7, z = Math.sin(a) * .7; k.cone([0xe0402e, 0xf6d24a, 0x2f6fd0, 0xf4efe4][i % 4], [x, BY + BH - .32, z], .07, .22, 3, { r: [PI, 0, 0], ao: false }); }
  const out = k.build();
  // Flamme
  const fk = new Kit(9); fk.jit = 0;
  fk.cone(0xffa030, [0, 0, 0], .28, 1.5, 7, { ao: false }); fk.cone(0xfff0c0, [0, 0, 0], .14, 1.0, 6, { ao: false });
  out.flame = fk.build().base; out.burnerY = -1.12; out.basketY = BY;
  return out;
}
function zeppelinGeo() {
  const k = new Kit(21); k.jit = .03;
  k.ball(0xc8ccd2, [0, 0, 0], [16, 4, 4], { detail: 2, ao: false });
  for (const x of [5, -2, -9]) k.cyl(x === -2 ? 0xc83a2e : 0xb0b4ba, [x + .25, 0, 0], 4 * Math.sqrt(1 - (x / 16) ** 2) + .05, .5, 20, { r: [0, 0, PI / 2], ao: false });
  for (let i = 0; i < 4; i++) { const a = i * PI / 2; k.boxc(i % 2 ? 0xc83a2e : 0xf2f0ea, [-13, Math.cos(a) * 2.6, Math.sin(a) * 2.6], [4, 2.4, .2], { r: [a, 0, 0], ao: false }); }
  k.box(0x5a5a62, [1, -4.6, 0], [6, 1.2, 1.6], { ao: false });
  for (let i = 0; i < 5; i++) k.box(0xffe0a0, [-1.2 + i * 1.1, -4.2, .81], [.6, .45, .02], { ao: false, layer: 'glow', jit: 0 });
  for (let i = 0; i < 5; i++) k.box(0xffe0a0, [-1.2 + i * 1.1, -4.2, -.81], [.6, .45, .02], { ao: false, layer: 'glow', jit: 0 });
  for (const s of [1, -1]) { k.cyl(0x4a4a52, [-3, -3.3, 2.6 * s], .35, 1.2, 8, { r: [0, 0, PI / 2], ao: false }); k.boxc(0x2a2a2a, [-4.3, -3.3, 2.6 * s], [.08, 1.8, .2], { ao: false }); }
  return k.build();
}

// ================================================================ HAUPTKLASSE
export class Life {
  constructor(scene, { groundAt } = {}) {
    this.scene = scene; this.groundAt = groundAt || (() => 0);
    this.U = { uT: { value: 0 }, uLamp: { value: 0 }, uFire: { value: 0 }, uDay: { value: 1 }, uMin: { value: .05 }, uSmoke: { value: .5 },
      uWind: { value: new THREE.Vector2(.8, .3) }, uBeam: { value: 0 }, uBurn: { value: 0 }, uNightL: { value: 0 } };
    this.root = new THREE.Group(); this.root.name = 'life'; scene.add(this.root);
    this.t = 0; this.env = { night: 0, season: 1, rain: 0 }; this.sw = [0, 1, 0, 0]; this.gc = new Map();
    this.tiles = []; this.byKey = new Map(); this.center = new THREE.Vector3(); this.islandR = 12;
    this.vill = []; this.events = []; this.temps = []; this.onSound = null; this._sm = 0; this.stats = { ms: 0, villagers: 0, animals: 0, critters: 0 };
    this._mat = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ'); this._v = new THREE.Vector3(); this._s = new THREE.Vector3();
    this._initVillagers(); this._initAnimals(); this._initFx(); this._initSky();
  }

  // ---------------------------------------------------------------- Aufbau
  _initVillagers() {
    const N = 40, geo = villagerGeo();
    this.vA = { palA: instAttr(geo, 'iPalA', N), palB: instAttr(geo, 'iPalB', N), sel: instAttr(geo, 'iSel', N), pose: instAttr(geo, 'iPose', N), pose2: instAttr(geo, 'iPose2', N) };
    const { mat, depth } = rigMat(this.U, 'lifeVillager1', VILLAGER_DECL, VILLAGER_DEFORM, VILLAGER_COLOR);
    const m = new THREE.InstancedMesh(geo, mat, N); m.customDepthMaterial = depth; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.count = 0;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.vMesh = m; this.root.add(m);
    const pg = new THREE.BoxGeometry(.6, 1.75, .6).translate(0, .875, 0), pm = new THREE.MeshBasicMaterial({ visible: false });
    this.vProxy = []; for (let i = 0; i < N; i++) { const p = new THREE.Mesh(pg, pm); p.matrixAutoUpdate = false; this.vProxy.push(p); this.root.add(p); }
    this._proxyGeo = pg; this._proxyMat = pm;
  }
  _initAnimals() {
    const NQ = 48, gq = quadGeo();
    this.qA = { p: instAttr(gq, 'iP', NQ), s: instAttr(gq, 'iS', NQ) };
    const q = rigMat(this.U, 'lifeQuad1', QUAD_DECL, QUAD_DEFORM, '', { roughness: .9 });
    const mq = new THREE.InstancedMesh(gq, q.mat, NQ); mq.customDepthMaterial = q.depth; mq.castShadow = true; mq.receiveShadow = true; mq.frustumCulled = false; mq.count = 0;
    this.qMesh = mq; this.root.add(mq);
    this.qProxy = []; const pg = new THREE.BoxGeometry(.8, 1.2, 1.3).translate(0, .6, 0);
    for (let i = 0; i < NQ; i++) { const p = new THREE.Mesh(pg, this._proxyMat); p.matrixAutoUpdate = false; this.qProxy.push(p); this.root.add(p); }
    this._qProxyGeo = pg;
    const NC = 220, gc = critterGeo();
    this.cA = { a: instAttr(gc, 'iA', NC), b: instAttr(gc, 'iB', NC) };
    const c = rigMat(this.U, 'lifeCrit1', CRIT_DECL, CRIT_DEFORM, CRIT_COLOR, { side: THREE.DoubleSide });
    const mc = new THREE.InstancedMesh(gc, c.mat, NC); mc.customDepthMaterial = c.depth; mc.castShadow = false; mc.receiveShadow = false; mc.frustumCulled = false; mc.count = 0;
    this.cMesh = mc; this.cN = NC; this.root.add(mc);
    this.qN = NQ;
  }
  _initFx() {
    const U = this.U;
    this.glow = new GPool(new THREE.PlaneGeometry(1, 1), 2600, addUniforms(glowMaterial(U), U), ['gA', 'gB', 'gC', 'gD']);
    this.glow.mesh.renderOrder = 4; this.root.add(this.glow.mesh);
    const ico = new THREE.IcosahedronGeometry(1, 1); ico.deleteAttribute('uv');
    this.puff = new GPool(ico, 1500, puffMaterial(U), ['pA', 'pB', 'pC', 'pD']);
    this.puff.mesh.renderOrder = 2; this.root.add(this.puff.mesh);
    this.soft = new GPool(new THREE.PlaneGeometry(1, 1), 700, softMaterial(U), ['sA', 'sB', 'sC', 'sD']);
    this.soft.mesh.renderOrder = 3; this.root.add(this.soft.mesh);
    this.bits = new GPool(quadGeoBits(), 1400, bitsMaterial(U), ['bA', 'bB', 'bC', 'bD']);
    this.bits.layout(0, 0); this.root.add(this.bits.mesh);
    this.beams = beamMesh(U); this.root.add(this.beams.mesh);
    // Lichtsäulen und Fahnen (wenige, eigene Meshes)
    this.pillars = []; for (let i = 0; i < 2; i++) this.pillars.push(this._makePillar());
    this.flags = []; for (let i = 0; i < 2; i++) this.flags.push(this._makeFlag());
  }
  _makePillar() {
    const g = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true).translate(0, .5, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uT: this.U.uT, uA: { value: 0 }, uC: { value: new THREE.Color(1, .85, .5) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying float vY; varying float vF; void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position, 1.); vec3 n = normalize(normalMatrix * normal); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uT, uA; uniform vec3 uC; varying float vY; varying float vF;
void main(){ float a = uA * pow(1. - vY, 1.3) * (.55 + .45 * sin(vY * 40. - uT * 9.)) * (.2 + .8 * pow(vF, 2.)); gl_FragColor = vec4(uC * 1.6, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
    });
    const m = new THREE.Mesh(g, mat); m.visible = false; m.frustumCulled = false; m.renderOrder = 5; this.root.add(m);
    return { m, t0: -1e9, life: 3.6 };
  }
  _makeFlag() {
    const grp = new THREE.Group(); grp.visible = false; this.root.add(grp);
    const k = new Kit(5); k.jit = .03;
    k.cyl(0xe8e0d0, [0, 0, 0], .05, 4.2, 6, { ao: false, top: .8 }); k.ball(0xe8b830, [0, 4.25, 0], .11, { ao: false, detail: 1 });
    k.cyl(0x6a5a4a, [0, 0, 0], .2, .12, 8, { ao: false });
    const pole = new THREE.Mesh(k.build().base, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .6 }));
    pole.castShadow = true; grp.add(pole);
    const fg = new THREE.PlaneGeometry(1.5, .95, 12, 6).translate(.75, -.475, 0).toNonIndexed();
    const pp = fg.attributes.position, cc = new Float32Array(pp.count * 3), c = new THREE.Color();
    for (let f = 0; f < pp.count; f += 3) {
      const y = (pp.getY(f) + pp.getY(f + 1) + pp.getY(f + 2)) / 3, x = (pp.getX(f) + pp.getX(f + 1) + pp.getX(f + 2)) / 3;
      const d = Math.hypot(x - .66, y + .475), tri = Math.abs(x - .66) < (y + .62) * .9 && y > -.62 && y < -.3;
      c.set(tri ? 0x4fa84a : d < .25 ? 0xfaf6ea : (y > -.12 || y < -.83) ? 0xe8b830 : 0x2f5fb0);
      for (let v = f; v < f + 3; v++) cc.set([c.r, c.g, c.b], v * 3);
    }
    fg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const fm = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, roughness: .7 });
    fm.onBeforeCompile = sh => { Object.assign(sh.uniforms, this.U); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += sin(position.x * 4.5 - uT * 7.) * .13 * position.x + sin(position.x * 9. - uT * 11.) * .03 * position.x;'); };
    fm.customProgramCacheKey = () => 'lifeFlag1';
    const flag = new THREE.Mesh(fg, fm); flag.castShadow = true; grp.add(flag);
    return { grp, pole, flag, t0: -1e9, life: 10 };
  }
  _initSky() {
    const bp = balloonParts();
    const solid = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .8 });
    this._solid = solid;
    const envMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .75, side: THREE.DoubleSide });
    envMat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, this.U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vLY;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLY = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLY; uniform float uBurn, uNightL;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vec3(1., .62, .3) * uBurn * (1. - smoothstep(-1., 6.5, vLY)) * (.35 + 2.2 * uNightL) + diffuseColor.rgb * (.14 * (1. - uNightL) + uNightL * .05);');
    };
    envMat.customProgramCacheKey = () => 'lifeEnv1';
    const b = new THREE.Group(); b.name = 'ballon';
    const body = new THREE.Mesh(bp.base, solid); body.castShadow = true; b.add(body);
    const env = new THREE.Mesh(bp.env, envMat); env.castShadow = true; b.add(env);
    const flame = new THREE.Mesh(bp.flame, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.position.y = bp.burnerY; flame.renderOrder = 4; b.add(flame);
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 1.2, 14, 8).translate(0, 1.5, 0), this._proxyMat);
    proxy.userData = { name: 'Heißluftballon „Wolkenhüpfer“', type: 'ballon', get text() { return '„Familie Sommer dreht ihre tägliche Runde um die Insel. Von hier oben sieht alles aus wie ein Spielzeugdorf!“'; } };
    b.add(proxy); this.balloon = { g: b, flame, env, proxy, burnerY: bp.burnerY }; this.root.add(b);
    const zg = zeppelinGeo(), z = new THREE.Group();
    const zb = new THREE.Mesh(zg.base, solid); z.add(zb);
    const zw = new THREE.Mesh(zg.glow, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, emissive: 0xffc070, emissiveIntensity: 0 })); z.add(zw);
    this.zep = { g: z, win: zw }; z.visible = false; this.root.add(z);
  }

  // ---------------------------------------------------------------- Bodenhöhe (gepuffert, bilinear)
  gy(x, z) {
    const s = 2, fx = x * s, fz = z * s, ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
    const g = (a, b) => { const k = a * 73856093 ^ b * 19349663; let v = this.gc.get(k); if (v === undefined) { v = this.groundAt(a / s, b / s); if (!Number.isFinite(v)) v = 0; if (this.gc.size > 60000) this.gc.clear(); this.gc.set(k, v); } return v; };
    const a = g(ix, iz), b = g(ix + 1, iz), c = g(ix, iz + 1), d = g(ix + 1, iz + 1);
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
  }

  // ---------------------------------------------------------------- Kacheln übernehmen
  setTiles(list) {
    this.tiles = list || []; this.byKey = new Map(this.tiles.map(t => [t.key, t])); this.gc.clear();
    const T = this.tiles;
    // Inselmitte und -radius
    let cx = 0, cz = 0; for (const t of T) { cx += t.cx; cz += t.cz; } if (T.length) { cx /= T.length; cz /= T.length; }
    let r = 6; for (const t of T) r = Math.max(r, Math.hypot(t.cx - cx, t.cz - cz) + INR); this.center.set(cx, 0, cz); this.islandR = r;
    // Spots einsammeln (mit stabilen Schlüsseln)
    const S = this.spots = {};
    for (const t of T) (t.spots || []).forEach((s, i) => { (S[s.type] ||= []).push({ ...s, key: `${t.key}#${s.type}#${i}`, tile: t, x: s.p[0], y: s.p[1], z: s.p[2] }); });
    this._buildGraph();
    this._syncVillagers();
    this._buildAnimals();
    this._buildStaticFx();
  }

  _buildGraph() {
    const nodes = [], cells = new Map();
    const node = (x, z) => {
      const ix = Math.floor(x), iz = Math.floor(z);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const n of cells.get((ix + a) + ',' + (iz + b)) || []) if (Math.hypot(n.x - x, n.z - z) < .35) return n;
      const n = { i: nodes.length, x, z, adj: [], comp: -1 }; nodes.push(n); const k = ix + ',' + iz; (cells.get(k) || cells.set(k, []).get(k)).push(n); return n;
    };
    const link = (a, b) => { if (a === b || a.adj.some(e => e.n === b)) return; const d = Math.hypot(a.x - b.x, a.z - b.z); a.adj.push({ n: b, d }); b.adj.push({ n: a, d }); };
    const poly = P => { let prev = null; for (let i = 0; i < P.length; i++) { if (i > 0) { const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / 1.3)); for (let j = 1; j <= m; j++) { const n = node(lerp(a[0], b[0], j / m), lerp(a[1], b[1], j / m)); link(prev, n); prev = n; } } else prev = node(P[0][0], P[0][1]); } };
    const STOP = new Set(['haus', 'kapelle', 'hof']);
    for (const t of this.tiles) {
      const ends = (t.roads || []).filter(p => Math.hypot(p[0] - t.cx, p[1] - t.cz) > .5), c = [t.cx, t.cz];
      if (!ends.length) continue;
      if (t.kind === 'start' || t.kind === 'markt' || ends.length >= 3) for (const e of ends) poly([e, c]);
      else if (ends.length === 2) { const [A, B] = ends, P = []; for (let i = 0; i <= 12; i++) { const u = i / 12, w = 1 - u; P.push([w * w * A[0] + 2 * u * w * c[0] + u * u * B[0], w * w * A[1] + 2 * u * w * c[1] + u * u * B[1]]); } poly(P); }
      else { const e = ends[0], dx = e[0] - c[0], dz = e[1] - c[1], L = Math.hypot(dx, dz) || 1, st = STOP.has(t.kind) ? 2.3 : 0; poly([e, [c[0] + dx / L * st, c[1] + dz / L * st]]); }
    }
    // Zusammenhang
    let comp = 0; for (const n of nodes) if (n.comp < 0) { const todo = [n]; n.comp = comp; while (todo.length) { const a = todo.pop(); for (const e of a.adj) if (e.n.comp < 0) { e.n.comp = comp; todo.push(e.n); } } comp++; }
    this.nodes = nodes; this.cells = cells;
    // Spots an Wege hängen
    const nearest = (x, z, max) => { let best = null, bd = max; for (const n of nodes) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = n; } } return best; };
    for (const type of ['door', 'sit', 'stall', 'fountain']) for (const s of this.spots[type] || []) {
      const n = nearest(s.x, s.z, type === 'door' ? 7.5 : 6.5); s.node = n;
      let ox = n ? n.x - s.x : Math.sin(s.ry || 0), oz = n ? n.z - s.z : Math.cos(s.ry || 0); const L = Math.hypot(ox, oz) || 1; s.ox = ox / L; s.oz = oz / L;
      if (type === 'sit') {
        const ry = s.ry ?? Math.atan2(s.ox, s.oz); s.face = ry; const fx = Math.sin(ry), fz = Math.cos(ry), tx = fz, tz = -fx;
        s.seats = [-.32, .32].map(o => ({ x: s.x + tx * o, z: s.z + tz * o, sx: s.x + tx * o + fx * .5, sz: s.z + tz * o + fz * .5, who: null }));
      }
      if (type === 'stall') s.slots = [-.6, 0, .6].map(o => ({ x: s.x + s.ox * .85 - s.oz * o, z: s.z + s.oz * .85 + s.ox * o, who: null }));
      if (type === 'fountain') s.slots = [0, 1, 2, 3].map(i => { const a = Math.atan2(s.ox, s.oz) + (i - 1.5) * .7; return { x: s.x + Math.sin(a) * 1.7, z: s.z + Math.cos(a) * 1.7, who: null }; });
    }
  }
  _route(a, b) {                                          // Dijkstra über Wegknoten
    if (!a || !b) return null; if (a === b) return [a];
    const N = this.nodes.length, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const heap = [[0, a.i]]; dist[a.i] = 0;
    const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    while (heap.length) {
      const [d, i] = pop(); if (done[i]) continue; done[i] = 1; if (i === b.i) break;
      for (const e of this.nodes[i].adj) { const nd = d + e.d; if (nd < dist[e.n.i]) { dist[e.n.i] = nd; prev[e.n.i] = i; push(nd, e.n.i); } }
    }
    if (!done[b.i]) return null;
    const out = []; for (let i = b.i; i >= 0; i = prev[i]) out.push(this.nodes[i]); return out.reverse();
  }
  // Weg aus Punkten [x, z]: Rechtsverkehr, geglättet, alle 0,45 m mit Bodenhöhe
  _path(points, keep = .3) {
    const P = []; for (const p of points) { const l = P[P.length - 1]; if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > .12) P.push([p[0], p[1]]); }
    if (P.length < 2) P.push([P[0][0] + .02, P[0][1]]);
    const n = P.length, cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const Lr = cum[n - 1], Q = P.map(p => p.slice());
    for (let i = 1; i < n - 1; i++) { let dx = P[i + 1][0] - P[i - 1][0], dz = P[i + 1][1] - P[i - 1][1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const w = keep * sstep(0, 1.4, cum[i]) * sstep(0, 1.4, Lr - cum[i]); Q[i][0] -= dz * w; Q[i][1] += dx * w; }
    let S = Q;
    if (n > 2) { S = [Q[0]]; for (let i = 0; i < n - 1; i++) { const a = Q[i], b = Q[i + 1]; if (i > 0) S.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]); if (i < n - 2) S.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } S.push(Q[n - 1]); }
    const X = [], Y = [], Z = [], C = [];
    let acc = 0;
    for (let i = 0; i < S.length; i++) {
      if (i > 0) {
        const a = S[i - 1], b = S[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / .45));
        for (let j = 1; j <= m; j++) { const x = lerp(a[0], b[0], j / m), z = lerp(a[1], b[1], j / m); acc += L / m; X.push(x); Z.push(z); Y.push(Math.max(this.gy(x, z), WATER_Y + .05)); C.push(acc); }
      } else { X.push(S[0][0]); Z.push(S[0][1]); Y.push(Math.max(this.gy(S[0][0], S[0][1]), WATER_Y + .05)); C.push(0); }
    }
    return { X, Y, Z, C, L: acc, k: 0 };
  }
  _at(P, s, out) {                                        // Punkt auf dem Weg bei Länge s
    s = clamp(s, 0, P.L); let k = P.k; const C = P.C;
    while (k > 0 && C[k] > s) k--; while (k < C.length - 2 && C[k + 1] < s) k++; P.k = k;
    const k1 = Math.min(k + 1, C.length - 1), d = C[k1] - C[k], f = d > 0 ? (s - C[k]) / d : 0;
    out.x = lerp(P.X[k], P.X[k1], f); out.y = lerp(P.Y[k], P.Y[k1], f); out.z = lerp(P.Z[k], P.Z[k1], f); return out;
  }
  _yawAt(P, s) { const a = this._at(P, Math.max(0, s - .35), {}), b = this._at(P, Math.min(P.L, s + .35), {}); return Math.atan2(b.x - a.x, b.z - a.z); }

  // ---------------------------------------------------------------- Bewohner
  _syncVillagers() {
    const doors = (this.spots.door || []).slice().sort((a, b) => a.key < b.key ? -1 : 1);
    const want = new Map();
    for (const d of doors) { const n = h01('pop', d.key) < .55 ? 2 : 1; for (let i = 0; i < n && want.size < 40; i++) want.set(d.key + '/' + i, d); }
    const keep = [];
    for (const V of this.vill) { const d = want.get(V.id); if (!d) { this._freeSlots(V); continue; } V.home = d; want.delete(V.id); keep.push(V); }
    for (const [id, d] of want) keep.push(this._newVillager(id, d));
    this.vill = keep;
    // Händler an Ständen
    for (const V of this.vill) V.keeper = null;
    for (const s of this.spots.stall || []) {
      if (!s.node) continue; let best = null, bv = 2;
      for (const V of this.vill) { if (V.kid || V.keeper || !V.home.node || V.home.node.comp !== s.node.comp) continue; const v = h01('keep', s.key, V.id); if (v < bv) { bv = v; best = V; } }
      if (best) { best.keeper = s; best.job = KEEPER_JOB; best.look.torso = best.look.torso >= 3 ? 4 : 1; best.look.acc = col(KEEPER_JOB.acc); best.basket = true; }
    }
    // Mindestens ein Laternenträger, damit nachts jemand unterwegs ist
    if (!this.vill.some(V => V.owl)) {
      let best = null, bv = 2; for (const V of this.vill) { if (V.kid || V.keeper) continue; const v = h01('owl', V.id); if (v < bv) { bv = v; best = V; } }
      if (best) { const J = JOBS.find(j => j.m === 'Laternenanzünder'); best.job = J; best.lantern = best.owl = true; best.bed = 2; best.look.hat = 1; }
    }
    // Nach Umbau: Spots und Knoten neu zuordnen, Wege neu planen
    const by = new Map(); for (const k of ['door', 'sit', 'stall', 'fountain']) for (const sp of this.spots[k] || []) by.set(sp.key, sp);
    for (const V of this.vill) {
      V.at = (V.at && by.get(V.at.key)) || V.home; let ok = true;
      if (V.goal?.target?.key) { const ns = by.get(V.goal.target.key); if (ns) V.goal.target = ns; else ok = false; }
      V.slot = null;
      if (V.slotRef) { const ns = by.get(V.slotRef.key), sl = ns && (ns.seats || ns.slots)[V.slotRef.idx]; if (sl && ok) { sl.who = V.id; V.slot = sl; if (V.seat) V.seat = sl; if (V.goal?.seat) V.goal.seat = sl; } else { ok = false; V.slotRef = null; } }
      if (V.st === 'in') { V.node = V.at.node; continue; }
      const P = V.path, end = V.st === 'walk' && P ? [P.X[P.X.length - 1], P.Z[P.Z.length - 1]] : [V.x, V.z];
      V.node = this._nearNode(end[0], end[1]);
      if (!ok || !V.node) { if (V.st === 'sit' && V.seat) { V.x = V.seat.x; V.z = V.seat.z; } V.seat = null; V.slot = null; V.st = 'stand'; V.until = this.t + .3; V.tA = this.t; V.yaw0 = V.yaw; V.face = V.yaw; V.talkAmt = 0; V.partner = null; V.goal = null; }
    }
  }
  _freeSlots(V) { if (V.slot) V.slot.who = null; V.slot = null; V.slotRef = null; }
  _newVillager(id, door) {
    const r = rngH('bw', id), female = r() < .5, kid = r() < .14, old = !kid && r() < .17;
    const job = kid ? null : pickR(r, JOBS);
    const name = pickR(r, female ? NAMES_F : NAMES_M);
    const SKIN = ['#f2d0b0', '#e8b890', '#d8a070', '#b07850', '#8a5a3a', '#f5dcc5', '#eac0a0'];
    const HAIR = ['#3a2a1e', '#5a3a22', '#8a5a2a', '#c89a5a', '#e8d08a', '#2a2220', '#a84a2a', '#6a4a2a'];
    const SHIRT = ['#c8483a', '#3a6aa8', '#e8d8b8', '#5a8a4a', '#d8a03a', '#8a4a8a', '#f0f0e8', '#4a8aa8', '#c86a8a', '#e87a4a', '#6a9ac8'];
    const PANTS = ['#4a4a5a', '#5a4a3a', '#3a4a6a', '#6a5a4a', '#2a3a4a', '#7a6a5a', '#4a5a3a'];
    const SKIRT = ['#8a3a3a', '#3a5a8a', '#5a7a4a', '#7a5a8a', '#a86a3a', '#2a4a6a', '#9a4a6a'];
    let hair = female ? pickR(r, [2, 3, 6, 2, 1, 3]) : old ? pickR(r, [4, 4, 5, 1]) : pickR(r, [1, 1, 5, 1, 4]);
    if (kid) hair = female ? pickR(r, [6, 2, 1]) : 1;
    let torso = job?.torso ?? (r() < .3 ? 2 : 0);
    if (female && r() < .7) torso = torso === 1 ? 4 : 3;
    let hat = job?.hat ?? (r() < .3 ? (female ? 2 : 1) : 0); if (kid) hat = r() < .3 ? 3 : 0;
    const hatCol = job?.hatCol ? col(job.hatCol) : hat === 3 ? col('#e2c27a') : hat === 2 ? col(pickR(r, ['#c84a4a', '#4a7ac8', '#e8c84a', '#f0ece4', '#7aa85a'])) : col(pickR(r, ['#4a3a2e', '#3a3a3a', '#5a4a3a', '#6a4a3a']));
    const pants = torso >= 3 ? col(pickR(r, SKIRT)) : col(pickR(r, PANTS));
    const look = {
      skin: col(pickR(r, SKIN)), hair: old ? col(pickR(r, ['#d8d8d0', '#b8b8b2', '#e8e6e0'])) : col(pickR(r, HAIR)), shirt: col(pickR(r, SHIRT)), pants,
      acc: job?.acc ? col(job.acc) : col(pickR(r, ['#6a3a2a', '#3a4a3a', '#4a3a5a', '#8a6a3a', '#f0ece0'])), hw: hatCol,
      leg: torso >= 3 ? col(pickR(r, ['#f0ece4', '#3a3434', '#8a2a2a', '#e8e0d0'])) : pants, scarf: col(pickR(r, ['#c83a3a', '#3a6ac8', '#e8b83a', '#5a9a5a', '#e86a9a', '#f0ece4'])),
      hairStyle: hair, hat, torso,
    };
    const V = {
      id, home: door, name, female, kid, old, job, look, scale: kid ? .62 : old ? .96 : .97 + r() * .07,
      lantern: !kid && (job?.lantern || r() < .3), owl: !!job?.owl, umbrella: r() < .8, basket: !!job?.basket || r() < .12,
      speed: kid ? 1.5 : old ? .8 : 1.02 + r() * .32, bed: kid ? .32 + r() * .12 : job?.owl ? 2 : .48 + r() * .32, r1: r(), r2: r(), r3: r(),
      ph0: r() * TAU, seed: r(), rand: rngH('bwr', id),
      st: 'in', until: this.t + .5 + r() * 6, x: door.x, y: door.y, z: door.z, yaw: Math.atan2(door.ox, door.oz), face: 0, tA: 0, t0: 0, path: null,
      at: door, slot: null, cool: 0, partner: null, wave: 0, keeper: null, node: door.node,
    };
    return V;
  }
  _wantOut(V) {
    const e = this.env, w = this.sw;
    if (e.night > V.bed && !(V.owl && e.night < .97)) return false;
    if (V.lantern && V.r3 < .5 && e.night > V.bed && e.night < .92) return true;
    if (e.rain > .45 && V.r1 < e.rain * .6) return false;
    if (w[3] > .6 && V.r2 < .3) return false;
    return true;
  }
  _door(d, inside) { return inside ? [d.x - d.ox * .65, d.z - d.oz * .65] : [d.x + d.ox * .35, d.z + d.oz * .35]; }
  _emerge(V, t) {
    const d = V.at || V.home; if (!d) return;
    if (!d.node) { const o = this._door(d, false); V.x = o[0] + d.ox * .5; V.z = o[1] + d.oz * .5; V.st = 'stand'; V.tA = t; V.yaw0 = V.face = Math.atan2(d.ox, d.oz); V.until = t + 12 + V.rand() * 20; V.goal = { kind: 'loiter' }; return; }
    const a = this._door(d, true); V.x = a[0]; V.z = a[1]; V.node = d.node;
    this._plan(V, t, [a, this._door(d, false)]);
  }
  // Nächstes Ziel wählen und Weg bauen. pre = Punkte vor dem Wegnetz (z. B. aus der Tür)
  _plan(V, t, pre = null, rise = false) {
    const r = V.rand, here = [V.x, V.z];
    const start = pre || [here];
    const from = V.node || this._nearNode(V.x, V.z);
    const go = (target, nodeTo, endPts, kind, extra = {}) => {
      if (!from || !nodeTo || from.comp !== nodeTo.comp) return false;
      const route = this._route(from, nodeTo); if (!route) return false;
      const pts = [...start, ...route.map(n => [n.x, n.z]), ...endPts];
      V.path = this._path(pts); V.st = 'walk'; V.t0 = t + (rise ? .7 : 0); V.rise = rise ? t : 0; V.goal = { kind, target, ...extra }; V.node = nodeTo; return true;
    };
    const comp = from ? from.comp : -1;
    // nach Hause
    if (!this._wantOut(V) || V.goal?.kind === 'loiter') {
      const d = V.home; if (go(d, d.node, [this._door(d, false), this._door(d, true)], 'home')) return;
      if (Math.hypot(d.x - V.x, d.z - V.z) < 8) { V.path = this._path([...start, this._door(d, false), this._door(d, true)], 0); V.st = 'walk'; V.t0 = t + (rise ? .7 : 0); V.rise = rise ? t : 0; V.goal = { kind: 'home', target: d }; return; }
      V.st = 'in'; V.at = d; V.until = t + 20; return;
    }
    if (V.keeper && this.env.night < .4) { const s = V.keeper; if (go(s, s.node, [[s.x - s.ox * .75, s.z - s.oz * .75]], 'keeper')) return; }
    for (let tries = 0; tries < 6; tries++) {
      const roll = r() * 10;
      if (roll < 2.2) {                                                    // Besuch
        const ds = (this.spots.door || []).filter(d => d.node && d.node.comp === comp && d !== V.home && (d.tile.groupId == null || d.tile.groupId === V.home.tile.groupId));
        if (ds.length) { const d = pickR(r, ds); if (go(d, d.node, [this._door(d, false), this._door(d, true)], 'visit')) return; }
      } else if (roll < 4.4 && !V.kid) {                                   // Bank
        const ss = (this.spots.sit || []).filter(s => s.node && s.node.comp === comp && s.seats.some(q => !q.who));
        if (ss.length) { const s = pickR(r, ss), q = s.seats.find(q => !q.who); if (go(s, s.node, [[q.sx, q.sz]], 'sit', { seat: q })) { q.who = V.id; V.slot = q; V.slotRef = { key: s.key, idx: s.seats.indexOf(q) }; return; } }
      } else if (roll < 6) {                                               // Markt
        const ss = (this.spots.stall || []).filter(s => s.node && s.node.comp === comp && s.slots.some(q => !q.who));
        if (ss.length) { const s = pickR(r, ss), q = s.slots.find(q => !q.who); if (go(s, s.node, [[q.x, q.z]], 'stall', { seat: q })) { q.who = V.id; V.slot = q; V.slotRef = { key: s.key, idx: s.slots.indexOf(q) }; return; } }
      } else if (roll < 7) {                                               // Brunnen
        const ss = (this.spots.fountain || []).filter(s => s.node && s.node.comp === comp && s.slots.some(q => !q.who));
        if (ss.length) { const s = pickR(r, ss), q = s.slots.find(q => !q.who); if (go(s, s.node, [[q.x, q.z]], 'fountain', { seat: q })) { q.who = V.id; V.slot = q; V.slotRef = { key: s.key, idx: s.slots.indexOf(q) }; return; } }
      } else if (roll < 9.4) {                                             // Spaziergang
        const ns = this.nodes.filter(n => n.comp === comp && Math.hypot(n.x - V.x, n.z - V.z) > 4);
        if (ns.length) { const n = pickR(r, ns); if (go(n, n, [], 'stroll')) return; }
      } else break;
    }
    // nichts gefunden: kurz stehen und umschauen
    V.st = 'stand'; V.tA = t; V.until = t + 2 + r() * 4; V.face = V.yaw + (r() - .5) * 2; V.talkAmt = 0;
  }
  _nearNode(x, z) { let best = null, bd = 9; for (const n of this.nodes) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = n; } } return best; }
  _arrive(V, t) {
    const g = V.goal || {}, r = V.rand; V.tA = t; V.yaw0 = V.yaw; V.talkAmt = 0;
    if (g.kind === 'home' || g.kind === 'visit') { V.st = 'in'; V.at = g.target; V.until = t + (g.kind === 'visit' ? 8 + r() * 25 : 25 + r() * 60); return; }
    if (g.kind === 'sit') { V.st = 'sit'; V.seat = g.seat; V.face = g.target.face; V.until = t + 14 + r() * 30; return; }
    if (g.kind === 'stall') { V.st = 'stand'; V.face = Math.atan2(-g.target.ox, -g.target.oz); V.talkAmt = .75; V.until = t + 7 + r() * 12; return; }
    if (g.kind === 'keeper') { V.st = 'stand'; V.face = Math.atan2(g.target.ox, g.target.oz); V.talkAmt = .35; V.until = t + 25; return; }
    if (g.kind === 'fountain') { V.st = 'stand'; V.face = Math.atan2(g.target.x - V.x, g.target.z - V.z); V.until = t + 6 + r() * 10; return; }
    V.st = 'stand'; V.face = V.yaw + (r() - .5) * 1.6; V.until = t + 2 + r() * 5;
  }
  _think(V, t) {
    if (V.st === 'in') { if (t >= V.until && this._wantOut(V)) this._emerge(V, t); else if (t >= V.until) V.until = t + 3 + V.rand() * 8; return; }
    if (V.st === 'walk') { const s = (t - V.t0) * V.speed; if (s >= V.path.L) this._arrive(V, t); return; }
    if (V.st === 'talk') { if (t >= V.until) { V.st = 'walk'; V.t0 = t - V.sStop / V.speed; V.partner = null; V.cool = t + 45; } return; }
    if (V.st === 'stand' && V.goal?.kind === 'keeper' && t >= V.until && this._wantOut(V) && this.env.night < .4) { V.until = t + 25; return; }
    if (t >= V.until) {
      const rise = V.st === 'sit' && V.seat; const pre = rise ? [[V.seat.x, V.seat.z], [V.seat.sx, V.seat.sz]] : null; V.yaw0 = V.yaw;
      if (V.slot) { V.slot.who = null; V.slot = null; } V.slotRef = null;
      if (rise) { V.x = V.seat.x; V.z = V.seat.z; }
      this._plan(V, t, pre, rise);
    }
  }
  _meet(t) {
    const W = this.vill.filter(V => V.st === 'walk' && t > V.cool && t > V.t0 && !V.kid);
    for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) {
      const a = W[i], b = W[j]; if (a.st !== 'walk' || b.st !== 'walk') continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z); if (d > 1.15 || d < .3) continue;
      if (Math.cos(a.yaw - b.yaw) > -.4) continue;
      if (h01('talk', a.id, b.id, Math.floor(t / 40)) > .55) { a.cool = b.cool = t + 20; continue; }
      const dur = 6 + h01('dur', a.id, t | 0) * 7;
      for (const [p, q] of [[a, b], [b, a]]) { p.st = 'talk'; p.sStop = (t - p.t0) * p.speed; p.until = t + dur; p.partner = q; p.tA = t; p.yaw0 = p.yaw; }
    }
  }
  _villagers(t) {
    const e = this.env, w = this.sw, A = this.vA, m = this.vMesh, M = this._mat, q = this._q, P = { x: 0, y: 0, z: 0 };
    for (const V of this.vill) this._think(V, t);
    this._meet(t);
    const nearCam = e.camTarget && e.camDist < 6;
    let n = 0; this._lanterns = [];
    for (const p of this.vProxy) p.visible = false;
    for (let vi = 0; vi < this.vill.length; vi++) {
      const V = this.vill[vi], proxy = this.vProxy[vi];
      if (V.st === 'in') continue;
      let wk = 0, st = 0, tk = 0, ph = V.ph0, yaw = V.yaw, hy = 0;
      if (V.st === 'walk') {
        const s = clamp((t - V.t0) * V.speed, 0, V.path.L); this._at(V.path, s, P); yaw = this._yawAt(V.path, s);
        wk = Math.min(1, .25 + s / .4, .2 + (V.path.L - s) / .5); ph = V.ph0 + s / (.62 * V.scale) * PI;
        if (V.rise) { const f = sstep(0, .7, t - V.rise); st = 1 - f; wk *= f; if (t < V.t0) yaw = angLerp(V.yaw0 ?? yaw, yaw, f); }
        V.ph = ph;
      } else if (V.st === 'talk') {
        this._at(V.path, V.sStop, P); const o = V.partner; yaw = angLerp(V.yaw0, Math.atan2(o.x - V.x, o.z - V.z), sstep(0, .5, t - V.tA)); tk = sstep(.3, 1, t - V.tA) * (.55 + .45 * Math.max(0, Math.sin(t * .9 + V.seed * 9))); ph = V.ph ?? ph;
      } else if (V.st === 'sit') {
        const f = sstep(0, .75, t - V.tA), S = V.seat; P.x = lerp(S.sx, S.x, f); P.z = lerp(S.sz, S.z, f); P.y = this.gy(P.x, P.z);
        yaw = angLerp(V.yaw0, V.face, sstep(0, .45, t - V.tA)); st = f; hy = .5 * Math.sin(t * .23 + V.seed * 7) * f;
      } else {
        P.x = V.x; P.z = V.z; P.y = this.gy(P.x, P.z);
        yaw = angLerp(V.yaw0 ?? V.yaw, V.face, sstep(0, .55, t - V.tA)); tk = (V.talkAmt || 0) * sstep(.4, 1, t - V.tA); hy = .55 * Math.sin(t * .37 + V.seed * 11) * (1 - tk);
      }
      V.x = P.x; V.y = P.y; V.z = P.z; V.yaw = yaw;
      // Winken, wenn die Kamera ganz nah ist
      let wav = 0;
      if (nearCam && wk < .1 && st < .1 && Math.hypot(P.x - e.camTarget.x, P.z - e.camTarget.z) < 3.2) wav = sstep(0, 1, (t * .25 + V.seed) % 1 < .45 ? 1 : 0) * (V.kid || V.r2 < .6 ? 1 : 0);
      V.wave = lerp(V.wave, wav, .08); wav = V.wave;
      const L = V.look, winter = w[3] > .55, rainy = e.rain > .28;
      let hat = L.hat; if (winter && hat !== 5) hat = 4; if (rainy && V.umbrella && hat === 3) hat = 0;
      const scarf = (winter || (w[2] > .6 && V.r3 < .45)) ? 1 : 0;
      const lanternOn = V.lantern && e.night > .3 && !V.kid;
      const umb = rainy && V.umbrella && V.st !== 'sit' ? 1 : 0;
      const tool = umb ? 2 : (V.basket && !rainy && e.night < .5 ? 1 : 0);
      A.palA.array.set([L.skin, L.hair, L.shirt, L.pants], n * 4);
      A.palB.array.set([L.acc, winter && hat === 4 ? L.scarf : L.hw, L.leg, L.scarf], n * 4);
      A.sel.array.set([L.hairStyle + 8 * hat, L.torso + 8 * (lanternOn ? 1 : 0), scarf + 8 * tool, umb], n * 4);
      A.pose.array.set([ph, wk, st, tk], n * 4);
      A.pose2.array.set([hy, lanternOn ? sstep(.3, .6, e.night) : 0, V.seed, wav], n * 4);
      this._e.set(0, yaw, 0); q.setFromEuler(this._e); M.compose(this._v.set(P.x, P.y, P.z), q, this._s.setScalar(V.scale)); m.setMatrixAt(n, M);
      proxy.matrix.copy(M); if (st > .5) proxy.matrix.scale(this._s.set(1, .75, 1)); proxy.matrixWorld.copy(proxy.matrix); proxy.visible = true;
      if (proxy.userData.id !== V.id) this._villagerInfo(V, proxy);
      if (lanternOn) {                                                  // Laternenlicht (rechte Hand)
        const a = .3 + Math.sin(ph) * .42 * wk * .25, el = .6, ex = -.232 - .07, ey = 1.25 - .22 * Math.cos(a), ez = .22 * Math.sin(a);
        const hx = ex, hy2 = ey - .29 * Math.cos(a + el), hz = ez + .29 * Math.sin(a + el), ly = hy2 - .26 - .325 * st;
        const s = V.scale, cy = Math.cos(yaw), sy = Math.sin(yaw);
        this._lanterns.push([P.x + (hx * cy + hz * sy) * s, P.y + ly * s, P.z + (-hx * sy + hz * cy) * s, P.y]);
      }
      n++;
    }
    m.count = n; m.instanceMatrix.needsUpdate = true; for (const a of Object.values(A)) a.needsUpdate = true;
    this.stats.villagers = n;
  }
  _villagerInfo(V, proxy) {
    const self = this;
    const role = V.kid ? `${6 + Math.floor(V.r1 * 6)} Jahre` : (V.female ? V.job.f : V.job.m);
    proxy.userData = { type: 'bewohner', id: V.id, vorname: V.name, beruf: role, name: `${V.name} · ${role}`, get text() { return self._say(V); } };
  }
  _say(V) {
    const e = this.env, w = this.sw, pool = [];
    const add = (a, n = 1) => { for (let i = 0; i < n; i++) pool.push(...a); };
    if (V.kid) add(SAY.kid, 2); else if (V.job && V.job !== KEEPER_JOB || V.keeper) add((V.keeper ? KEEPER_JOB : V.job).lines, 2);
    const si = w.indexOf(Math.max(...w)); add([SAY.spring, SAY.summer, SAY.autumn, SAY.winter][si], 2);
    if (e.rain > .3) add(SAY.rain, 3);
    if (e.night > .6) add(SAY.night, 3); else if (e.night > .2) add(SAY.dusk, 2); else add(SAY.day);
    const s = pool[Math.floor(h01('say', V.id, Math.floor(this.t / 25)) * pool.length)];
    return '„' + s + '“';
  }

  // ---------------------------------------------------------------- Tiere am Boden
  _buildAnimals() {
    const A = this.animals = [], S = this.spots;
    const add = (sp, cx, cz, rad, L, seed, extra = {}) => { if (A.length < this.qN) A.push({ sp, cx, cz, r: rad, L, seed, off: h01('off', seed) * 60, ...extra }); };
    for (const s of S.cow || []) { add(SPECIES.kuh, s.x, s.z, 1.3, 22, s.key + 'c', { name: 'Kuh ' + pickR(rngH(s.key), ['Berta', 'Elsa', 'Lotte', 'Rosi', 'Liesl', 'Milka']) }); if (h01('kalb', s.key) < .3) add(SPECIES.kuh, s.x + 1.8, s.z + .6, .7, 18, s.key + 'k', { scale: .6, name: 'Kälbchen' }); }
    for (const s of S.chicken || []) for (let i = 0; i < 3; i++) add(i === 0 ? SPECIES.huhn : SPECIES.henne, s.x + Math.cos(i * 2.1) * .7, s.z + Math.sin(i * 2.1) * .7, .55, 7 + i, s.key + 'h' + i, { m0: .6, m1: .8, name: 'Huhn' });
    for (const s of S.meadow || []) if (h01('schaf', s.key) < .55) { const n = 2 + Math.floor(h01('sn', s.key) * 2); for (let i = 0; i < n; i++) add(SPECIES.schaf, s.x + Math.cos(i * 2.1 + 1) * 2, s.z + Math.sin(i * 2.1 + 1) * 2, 1.1, 24 + i * 3, s.key + 's' + i, { name: 'Schaf ' + pickR(rngH(s.key, i), ['Wolke', 'Flocke', 'Watte', 'Bommel', 'Krümel']) }); }
    // Rehe am Waldrand: Nachbarkachel Wiese/Feld
    const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]; let deer = 0;
    for (const t of this.tiles) {
      if (t.kind !== 'wald' || deer >= 4) continue;
      for (let i = 0; i < 6 && deer < 4; i++) {
        const nb = this.byKey.get((t.q + DIRS[i][0]) + ',' + (t.r + DIRS[i][1]));
        if (!nb || !['wiese', 'feld'].includes(nb.kind) || h01('reh', t.key, i) > .5) continue;
        const dx = nb.cx - t.cx, dz = nb.cz - t.cz, L = Math.hypot(dx, dz), ex = t.cx + dx / L * (INR + 1.6), ez = t.cz + dz / L * (INR + 1.6);
        const stag = h01('bock', t.key, i) < .4;
        add(stag ? SPECIES.hirsch : SPECIES.reh, ex, ez, 1.6, 26, t.key + 'r' + i, { name: stag ? 'Rehbock' : 'Reh' }); deer++;
        if (!stag && h01('kitz', t.key, i) < .6) add(SPECIES.kitz, ex + .9, ez + .4, 1.6, 26, t.key + 'r' + i, { scale: .62, follow: true, name: 'Rehkitz' });
      }
    }
    for (const a of A) { a.m0 ??= .7; a.m1 ??= .9; a.scale ??= 1; }
    // Wasserstellen, Wälder, Wiesen, Berge für fliegende/schwimmende Tiere
    this.lakes = (S.lake || []).map(s => ({ x: s.x, z: s.z, key: s.key }));
    this.waters = [...this.lakes.map(l => ({ ...l, r: 2.2 })), ...(S.water || []).slice(0, 8).map(s => ({ x: s.x, z: s.z, key: s.key, r: .5 }))];
    const fg = new Map(); for (const t of this.tiles) if (t.kind === 'wald') { const g = t.groupId ?? t.key; (fg.get(g) || fg.set(g, []).get(g)).push(t); }
    this.flocks = [...fg.values()].sort((a, b) => b.length - a.length).slice(0, 5).map((ts, i) => {
      let x = 0, z = 0; for (const t of ts) { x += t.cx; z += t.cz; } x /= ts.length; z /= ts.length;
      return { x, z, r: 4 + Math.sqrt(ts.length) * 3.5, h: 13 + i * 1.7, n: Math.min(12, 6 + ts.length), dir: i % 2 ? -1 : 1, seed: i };
    });
    this.meadows = (S.meadow || []).slice(0, 9);
    this.mountains = this.tiles.filter(t => t.kind === 'berg').slice(0, 2);
    this.fishState = new Map();
  }
  _wander(a, t) {
    const tt = t + a.off, c = Math.floor(tt / a.L), u = tt / a.L - c;
    const P = k => { const ang = h01(a.seed, k) * TAU, rr = Math.sqrt(h01(a.seed, k, 7)) * a.r; return [a.cx + Math.cos(ang) * rr, a.cz + Math.sin(ang) * rr]; };
    const A0 = P(c - 1), A = P(c), B = P(c + 1), y0 = Math.atan2(A[0] - A0[0], A[1] - A0[1]), y1 = Math.atan2(B[0] - A[0], B[1] - A[1]);
    const dAB = Math.hypot(B[0] - A[0], B[1] - A[1]);
    let x, z, yaw, wk = 0, dist = 0;
    if (u < a.m0) { [x, z] = A; yaw = y0; }
    else if (u < a.m1) { const f = (u - a.m0) / (a.m1 - a.m0), e = sstep(.15, 1, f); x = lerp(A[0], B[0], e); z = lerp(A[1], B[1], e); yaw = angLerp(y0, y1, sstep(0, .2, f)); wk = clamp(Math.min(f * 6, (1 - f) * 5)) * clamp(dAB * 2); dist = e * dAB; }
    else { [x, z] = B; yaw = y1; dist = dAB; }
    return { x, z, yaw, wk, dist: dist + c * 3.1, still: u < a.m0 ? (u * a.L) : u > a.m1 ? (u - a.m1) * a.L : 0, tt };
  }
  _animals(t) {
    const A = this.qA, m = this.qMesh, M = this._mat; let n = 0;
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i], wv = this._wander(a, t), sp = a.sp;
      let x = wv.x, z = wv.z; if (a.follow) { x += Math.sin(wv.yaw) * -.9 + .3; z += Math.cos(wv.yaw) * -.9; }
      const y = this.gy(x, z), hen = sp >= 5;
      let head = 0;
      if (hen) head = wv.wk > .1 ? .1 : -1.2 * Math.pow(Math.max(0, Math.sin(wv.tt * 7.5 + i)), 4) * (Math.sin(wv.tt * .6 + i) > -.3 ? 1 : 0);
      else { const graze = Math.sin(wv.tt * .19 + i * 2.1) > -.35 ? 1 : 0, deep = sp <= 2 ? 1.55 : 1; head = wv.wk > .05 ? -.05 : -(.95 + .08 * Math.sin(wv.tt * 2.2)) * deep * graze * sstep(0, 1.2, wv.still); }
      const ph = wv.dist / ((hen ? .12 : sp === SPECIES.kuh ? .55 : .42) * a.scale) * PI;
      A.p.array.set([ph, wv.wk, head, h01(a.seed)], n * 4);
      A.s.array.set([sp, sp === SPECIES.kuh ? 1 : .5, hen ? 0 : .3 * Math.sin(wv.tt * .3 + i) * (head > -.3 ? 1 : 0), 0], n * 4);
      this._e.set(0, wv.yaw, 0); this._q.setFromEuler(this._e); M.compose(this._v.set(x, y, z), this._q, this._s.setScalar(a.scale)); m.setMatrixAt(n, M);
      const pr = this.qProxy[n]; pr.matrix.copy(M); if (hen) pr.matrix.scale(this._s.set(.45, .45, .4)); pr.matrixWorld.copy(pr.matrix); pr.visible = true;
      pr.userData = { type: 'tier', name: a.name || 'Tier', text: this._animalSay(a) };
      n++;
    }
    for (let i = n; i < this.qN; i++) this.qProxy[i].visible = false;
    m.count = n; m.instanceMatrix.needsUpdate = true; A.p.needsUpdate = A.s.needsUpdate = true; this.stats.animals = n;
  }
  _animalSay(a) {
    const sp = a.sp, k = Math.floor(this.t / 20);
    const L = sp === SPECIES.kuh ? ['„Muuuh.“ (Sie mag frischen Klee.)', '„Muh!“ (Sie schaut dich neugierig an.)'] : sp === SPECIES.schaf ? ['„Mäh!“ (Sehr flauschig.)', '„Määäh.“ (Es kaut zufrieden.)'] : sp >= 5 ? ['„Gack gack!“', '„Pock pock pock …“'] : ['(Es spitzt die Ohren und grast weiter.)', '(Ganz leise, sonst springt es davon.)'];
    return L[k % L.length];
  }

  // ---------------------------------------------------------------- Vögel, Falter, Fische, Enten
  _critters(t, dt) {
    const e = this.env, w = this.sw, M = this._mat, A = this.cA, m = this.cMesh, eul = this._e, q = this._q;
    let n = 0; const N = this.cN;
    const put = (x, y, z, yaw, pitch, roll, s, kind, phase, flap, seed, c1, c2, dip = 0, wig = 0) => {
      if (n >= N) return; eul.set(pitch, yaw, roll); q.setFromEuler(eul); M.compose(this._v.set(x, y, z), q, this._s.setScalar(s)); m.setMatrixAt(n, M);
      A.a.array.set([kind, phase, flap, seed], n * 4); A.b.array.set([c1, c2, dip, wig], n * 4); n++;
    };
    const day = 1 - e.night;
    // Vogelschwärme über Wäldern
    const crowCol = [col('#2a2a30'), col('#1a1a20')], swallow = [col('#3a4a6a'), col('#22283a')];
    for (const f of this.flocks) {
      const nb = Math.round(f.n * (w[3] > .5 ? .6 : 1) * (e.rain > .6 ? .5 : 1));
      for (let j = 0; j < nb; j++) {
        const sj = j * .53 + f.seed * 2, om = .33 * f.dir * (1 + .1 * Math.sin(j));
        const th = t * om + sj, rr = f.r * (1 + .18 * Math.sin(t * .3 + j * 1.7)), y = f.h + 1.4 * Math.sin(t * .5 + j * 1.3) + (j % 3) * .6;
        const x = f.x + Math.cos(th) * rr, z = f.z + Math.sin(th) * rr, vx = -Math.sin(th) * om, vz = Math.cos(th) * om;
        const flap = .25 + .75 * sstep(-.3, .3, Math.sin(t * .4 + j * 2.1));
        const cc = w[3] > .5 ? crowCol : swallow;
        put(x, y, z, Math.atan2(vx, vz), -.05 * Math.cos(t * .5 + j * 1.3), -.35 * f.dir, 1.25, 0, j * 1.7, flap, j / 16, cc[0], cc[1]);
      }
    }
    // Gänse in V-Formation
    { const L = 75, c = Math.floor(t / L), u = t - c * L, mig = w[0] + w[2];
      if (u < 42 && h01('gans', c) < .45 + mig * .4) {
        const a = h01('gdir', c) * TAU, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, D = this.islandR + 100, off = (h01('goff', c) - .5) * this.islandR;
        const lx = this.center.x - dx * D + px * off + dx * u * 7, lz = this.center.z - dz * D + pz * off + dz * u * 7, ly = 27 + h01('gh', c) * 6;
        const ng = 7 + Math.floor(h01('gn', c) * 5);
        for (let k = 0; k < ng; k++) { const side = k % 2 ? 1 : -1, rank = Math.ceil(k / 2); const x = lx - dx * rank * 1.7 + px * side * rank * 1.35, z = lz - dz * rank * 1.7 + pz * side * rank * 1.35; put(x, ly + .15 * Math.sin(t * 1.3 + k), z, Math.atan2(dx, dz), 0, 0, 2.3, 1, rank * .6, .85, k / 12, col('#8a8070'), col('#4a4038')); }
        if (Math.abs(u - 21) < dt * .6 + .001) this._sound('honk', new THREE.Vector3(lx, ly, lz));
      } }
    // Adler über Bergen
    this.mountains.forEach((tm, i) => {
      const th = t * .17 + i * PI, rr = 9 + 2 * Math.sin(t * .1 + i), y = 22 + 2 * Math.sin(t * .2 + i);
      const flap = Math.sin(t * .13 + i * 2) > .82 ? .8 : .08;
      put(tm.cx + Math.cos(th) * rr, y, tm.cz + Math.sin(th) * rr, Math.atan2(-Math.sin(th), Math.cos(th)), 0, -.4, 3.3, 2, i, flap, i / 3, col('#6a4426'), col('#3a2614'));
    });
    // Schmetterlinge über Wiesen (Frühling/Sommer, tags)
    const bw = day * (w[0] + w[1]) * (1 - e.rain);
    const BC = ['#f2d23a', '#f4f2ea', '#e8782a', '#5a8ae8', '#d84a3a', '#c86ad8'];
    for (const s of this.meadows) for (let j = 0; j < 4; j++) {
      if (h01('bf', s.key, j) > bw * 1.1) continue;
      const sd = h01('bfs', s.key, j) * 50, f = .8 + h01('bff', s.key, j) * .5;
      const pos = tt => [s.x + 2.6 * Math.sin(tt * .23 * f + sd) + .8 * Math.sin(tt * .71 + sd * 2), .55 + .35 * Math.sin(tt * 1.7 + sd) + .15 * Math.sin(tt * 6.1 + sd), s.z + 2.6 * Math.cos(tt * .19 * f + sd * 1.3) + .8 * Math.cos(tt * .67 + sd)];
      const p0 = pos(t), p1 = pos(t + .05), cc = col(BC[Math.floor(h01('bfc', s.key, j) * BC.length)]);
      put(p0[0], p0[1] + this.gy(p0[0], p0[2]), p0[2], Math.atan2(p1[0] - p0[0], p1[2] - p0[2]), 0, 0, 1.4, 3, sd, 1, j / 4, cc, cc);
    }
    // Enten auf Seen (nicht im Winter)
    if (w[3] < .6) for (const l of this.lakes) {
      const kids = w[0] + w[1] > .5 ? 3 : 0, base = h01('ente', l.key) * TAU;
      for (let j = 0; j < 2 + kids; j++) {
        const adult = j < 2, th = t * .11 + base + (adult ? j * .55 : .55 - (j - 1) * .22), rr = (adult ? 1.75 : 1.55) + .35 * Math.sin(2 * th + base);
        const x = l.x + Math.cos(th) * rr, z = l.z + Math.sin(th) * rr, yaw = Math.atan2(-Math.sin(th), Math.cos(th)) + .1;
        let pitch = 0, yy = WATER_Y - .015 + .012 * Math.sin(t * 2.1 + j);
        if (adult) { const cyc = (t + j * 5 + base * 3) % 15; const dab = cyc < 2.6 ? Math.sin(cyc / 2.6 * PI) : 0; pitch = 1.75 * sstep(0, .35, dab); yy -= dab * .06; }
        put(x, yy, z, yaw, pitch, 0, adult ? 1 : .45, adult ? (j === 0 ? 5 : 6) : 7, 0, 0, j / 5,
          adult ? (j === 0 ? col('#9a9a96') : col('#8a6a48')) : col('#e8d04a'), adult ? (j === 0 ? col('#1a6a3a') : col('#7a5a3a')) : col('#c8a83a'), 0, 0);
        if (adult) this._dyn.push([x, WATER_Y + .03, z, .9, .7, .8, .85, .35, 5, -1, 2.6, j * .37]);
      }
    }
    // springende Fische
    if (w[3] < .6) for (const wt of this.waters) {
      const L = 7 + h01('fl', wt.key) * 7, off = h01('fo', wt.key) * 20, tt = t + off, c = Math.floor(tt / L), u = tt - c * L;
      const dur = .85, on = h01('fj', wt.key, c) < .55;
      if (on) {
        const a = h01('fa', wt.key, c) * TAU, rr = Math.sqrt(h01('fr', wt.key, c)) * wt.r, sx = wt.x + Math.cos(a) * rr, sz = wt.z + Math.sin(a) * rr, d = h01('fd', wt.key, c) * TAU;
        const len = .9, H = .55 + h01('fh', wt.key, c) * .4;
        this._fishSplash(wt.key + c, sx, sz, d, len, t - u);
        if (u < dur) {
          const f = u / dur, x = sx + Math.cos(d) * len * f, z = sz + Math.sin(d) * len * f, y = WATER_Y - .12 + 4 * H * f * (1 - f), sl = 4 * H * (1 - 2 * f) / len;
          put(x, y, z, Math.atan2(Math.cos(d), Math.sin(d)), -Math.atan(sl), 0, 1, 4, 0, 0, f, col('#9aa8ae'), col('#4a5a52'), 0, 1);
        }
      }
    }
    // Feier-Gäste (Schwarm, Fische, Adler)
    for (const T of this.temps) {
      const age = t - T.t0; if (age < 0 || age > T.life) continue;
      if (T.type === 'flock') for (let j = 0; j < T.n; j++) {
        const p = tt => { const s = h01(T.seed, j), a0 = s * TAU, th = a0 + tt * 1.3, r = .6 + tt * 1.6, out = Math.max(0, tt - 2.2); return [T.x + Math.cos(th) * r + T.dx * out * out * 2.2 + Math.cos(a0) * h01(T.seed, j, 2) * T.size * .5, T.y + 1.5 + tt * 2.6 + out * 1.2, T.z + Math.sin(th) * r + T.dz * out * out * 2.2 + Math.sin(a0) * h01(T.seed, j, 2) * T.size * .5]; };
        const p0 = p(age), p1 = p(age + .05), hd = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
        put(p0[0], p0[1], p0[2], Math.atan2(p1[0] - p0[0], p1[2] - p0[2]), -Math.atan2(p1[1] - p0[1], hd) * .6, .2, 1.2 * (1 - sstep(T.life - 1.2, T.life, age)), 0, j, 1, j / T.n, swallow[0], swallow[1]);
      } else if (T.type === 'fish') {
        const f = age / T.life, x = T.x + Math.cos(T.d) * T.len * f, z = T.z + Math.sin(T.d) * T.len * f, y = WATER_Y - .12 + 4 * T.h * f * (1 - f), sl = 4 * T.h * (1 - 2 * f) / T.len;
        put(x, y, z, Math.atan2(Math.cos(T.d), Math.sin(T.d)), -Math.atan(sl), 0, 1.1, 4, 0, 0, f, T.c1, col('#5a4a3a'), 0, 1);
      } else if (T.type === 'eagle') {
        const inF = Math.max(0, 1 - age / 3.5), outF = Math.max(0, age - (T.life - 4)), th = age * .55 + T.seed;
        const rr = 8 + 34 * inF * inF + outF * outF * 6, y = T.y + 16 + 12 * inF * inF + outF * 3;
        const x = T.x + Math.cos(th) * rr, z = T.z + Math.sin(th) * rr;
        put(x, y, z, Math.atan2(-Math.sin(th), Math.cos(th)), 0, -.45, 3.4, 2, 0, age < 3.5 ? .1 : (Math.sin(age * .9) > .6 ? .8 : .1), .3, col('#6a4426'), col('#3a2614'));
      }
    }
    m.count = n; m.instanceMatrix.needsUpdate = true; A.a.needsUpdate = A.b.needsUpdate = true; this.stats.critters = n;
  }
  _fishSplash(key, sx, sz, d, len, tStart) {
    if (this.fishState.get(key)) return; this.fishState.set(key, 1); if (this.fishState.size > 400) this.fishState.clear();
    if (tStart < this.t - 1) return;
    for (const [f, tt] of [[0, tStart], [1, tStart + .85]]) this._splash(sx + Math.cos(d) * len * f, sz + Math.sin(d) * len * f, tt, .7);
    this._soundAt(tStart + .85, 'splash', new THREE.Vector3(sx, WATER_Y, sz));
  }
  _splash(x, z, t0, s = 1) {
    this.glow.spawn([x, WATER_Y + .03, z, 1.1 * s], [.8, .9, 1, .6], [5, t0, 1.2, 0]);
    this.glow.spawn([x, WATER_Y + .03, z, .7 * s], [.8, .9, 1, .45], [5, t0 + .25, 1.0, 0]);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + Math.random(); this.puff.spawn([x, WATER_Y + .02, z, .045 * s], [.85, .93, 1, .9], [4, t0, .55, i / 7], [Math.cos(a) * .8 * s, 1.9 + Math.random() * 1.1, Math.sin(a) * .8 * s, 0]); }
  }

  // ---------------------------------------------------------------- feste Effekte (Rauch, Gischt, Lichter, Glühwürmchen, Strahlen)
  _buildStaticFx() {
    const S = this.spots, G = this.glow, P = this.puff;
    let gi = 0, pi = 0, si = 0; const Q = this.soft;
    const q = (a, b, c, d) => { if (si < 500) Q.put(si++, a, b, c, d); };
    const g = (a, b, c, d) => { if (gi < 1300) G.put(gi++, a, b, c, d); };
    const p = (a, b, c, d) => { if (pi < 1000) P.put(pi++, a, b, c, d); };
    for (const s of S.light || []) { const y0 = this.gy(s.x, s.z); g([s.x, s.y, s.z, 1.15], [1, .72, .36, 1.5], [0, 0, 0, h01(s.key)]); g([s.x, y0 + .07, s.z, 4.2], [1, .66, .3, .55], [4, 0, 0, 0], [0, 0, 0, 0]); }
    for (const s of S.beam || []) g([s.x, s.y, s.z, 2.6], [1, .9, .7, 2], [0, 0, 0, .3]);
    for (const s of [...(S.forest || []), ...(S.meadow || [])]) for (let j = 0; j < 14; j++) {
      const a = h01('ff', s.key, j) * TAU, rr = Math.sqrt(h01('fr', s.key, j)) * 4, x = s.x + Math.cos(a) * rr, z = s.z + Math.sin(a) * rr;
      g([x, this.gy(x, z) + .5 + h01('fy', s.key, j) * 1.8, z, .32], [.78, 1, .26, 4.5], [1, 0, 0, h01('fs', s.key, j)], [1, 0, 0, 0]);
    }
    // Wasserfälle: Gischt oben, Schleier am Fall, Nebel unten, Regenbogen
    for (const s of S.fall || []) {
      let dx = s.x - s.tile.cx, dz = s.z - s.tile.cz; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      if (s.ry != null && s.dir) { dx = Math.cos(s.ry); dz = Math.sin(s.ry); }
      const bx = s.x + dx * 3.7, bz = s.z + dz * 3.7, by = s.y - 27;
      for (let j = 0; j < 14; j++) q([s.x + dx * .6, s.y + .15, s.z + dz * .6, .7], [.95, .98, 1, .38], [1, -1, 1.8, j / 14 + h01('fa', s.key, j) * .05], [.7, .6, 0, 0]);
      for (let j = 0; j < 40; j++) q([s.x, s.y, s.z, .9 + h01('fz', s.key, j) * .6], [.86, .93, 1, .42], [2, -1, 3.1, j / 40], [dx, 29, dz, 0]);
      for (let j = 0; j < 28; j++) { const a = h01('fm', s.key, j) * TAU, rr = h01('fmr', s.key, j) * 3.5; q([bx + Math.cos(a) * rr, by + h01('fmy', s.key, j) * 2.5, bz + Math.sin(a) * rr, 3 + h01('fms', s.key, j) * 3], [.97, .98, 1, .42], [1, -1, 6, j / 28], [1.8, 3.5, 0, 0]); }
      g([bx + dx * 2, by + 5, bz + dz * 2, 10], [1, 1, 1, .13], [6, 0, 0, 0]);
    }
    // Rauch aus Schornsteinen
    const smoke = S.smoke || [], per = Math.max(8, Math.min(16, Math.floor(800 / Math.max(1, smoke.length))));
    for (const s of smoke) for (let j = 0; j < per; j++) p([s.x, s.y + .1, s.z, .42 + h01('sm', s.key, j) * .2], [.88, .87, .85, .72], [0, -1, 7 + h01('sl', s.key) * 1.5, j / per + h01('sj', s.key, j) * .02], [1.5, 5, 0, 0]);
    // Brunnen: Wasserbogen
    for (const s of S.fountain || []) for (let j = 0; j < 40; j++) { const a = (j % 8) / 8 * TAU + j * .05, k = Math.floor(j / 8) / 5; p([s.x, s.y + .05, s.z, .028], [.78, .9, 1, .7], [4, -1, .8, (j * .618) % 1], [Math.cos(a) * (.75 + k * .2), 2.3 + k * .3, Math.sin(a) * (.75 + k * .2), 0]); }
    G.clearRange(gi, G.N); P.clearRange(pi, P.N); Q.clearRange(si, Q.N);
    G.layout(gi, 160); P.layout(pi, 0); Q.layout(si, 0);
    G.touch(0, G.N); P.touch(0, P.N); Q.touch(0, Q.N);
    // Leuchtturm-Strahlen
    const B = this.beams, bs = (S.beam || []).slice(0, 4);
    bs.forEach((s, i) => B.attr.array.set([s.x, s.y, s.z, h01('beam', s.key)], i * 4)); B.attr.needsUpdate = true; B.geo.instanceCount = bs.length;
  }

  // ---------------------------------------------------------------- Himmel: Ballon und Luftschiff
  _sky(t) {
    const e = this.env, b = this.balloon, c = this.center;
    const th = t * TAU / 260 + 1.3, rr = this.islandR + 13 + 5 * Math.sin(t * .013), y = 17 + 4.5 * Math.sin(t * .021) + 1.6 * Math.sin(t * .053);
    b.g.position.set(c.x + Math.cos(th) * rr, y, c.z + Math.sin(th) * rr); b.g.rotation.set(.02 * Math.sin(t * .4), t * .045, .02 * Math.cos(t * .33));
    // Brenner: kurze Stöße, mehr beim Steigen
    const cy = Math.floor(t / 7), u = t - cy * 7, rising = Math.cos(t * .021) > 0;
    const on = h01('burn', cy) < (rising ? .75 : .35) && u > 2 && u < 3.6 ? sstep(2, 2.15, u) * (1 - sstep(3.4, 3.6, u)) : 0;
    const burn = on * (.85 + .15 * Math.sin(t * 40) * Math.sin(t * 23));
    b.flame.scale.set(.6 + .4 * burn, .2 + 1.1 * burn, .6 + .4 * burn); b.flame.visible = burn > .02; this.U.uBurn.value = burn;
    if (on > .5 && !this._burning) this._sound('burner', b.g.position);
    this._burning = on > .5;
    if (burn > .02) { const p = b.g.position; this._dyn.push([p.x, p.y + b.burnerY + .6, p.z, 1.8, 1, .62, .25, 2.2 * burn * (.4 + e.night), 2, 0, 0, 0]); }
    // Luftschiff weit draußen (alle 4 Minuten eine Durchfahrt)
    const Z = this.zep, L = 240, zc = Math.floor(t / L), zu = t - zc * L;
    if (zu < 150 && h01('zep', zc) < .8) {
      const a0 = h01('za', zc) * TAU, a = a0 + zu / 150 * 1.1, R = this.islandR + 175;
      Z.g.visible = true; Z.g.position.set(c.x + Math.cos(a) * R, 44 + 6 * Math.sin(zu * .03), c.z + Math.sin(a) * R); Z.g.rotation.set(.02 * Math.sin(zu * .2), -a - PI / 2, 0);
      Z.win.material.emissiveIntensity = e.night * 2.2;
      if (e.night > .3) { const blink = Math.sin(t * 4) > .6 ? 1 : 0; Z.g.updateMatrixWorld(); for (const [lp, c, I] of [[[-15.2, 2.2, 0], [1, .2, .15], 3 * blink], [[16, 0, 0], [1, 1, .9], 2 * (Math.sin(t * 4 + 2) > .8 ? 1 : 0)], [[1, -4.3, 0], [1, .7, .35], 1.6]]) { const v = this._v.set(...lp).applyMatrix4(Z.g.matrixWorld); this._dyn.push([v.x, v.y, v.z, 4, ...c, I * e.night, 2, 0, 0, 0]); } }
    } else Z.g.visible = false;
  }

  // ---------------------------------------------------------------- Feiern
  celebrate(type, pos, size = 6) {
    const p = V3(pos), t = this.t, r = Math.random, G = this.glow, P = this.puff, B = this.bits;
    const gy = this.gy(p.x, p.z), y = Number.isFinite(p.y) ? p.y : gy;
    if (type === 'place') {
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + r() * .3, rr = size * (.8 + r() * .2); P.spawn([p.x + Math.cos(a) * rr, y + .05, p.z + Math.sin(a) * rr, .32 + r() * .25], [.8, .72, .58, .8], [3, t, 1.3 + r() * .5, r()], [Math.cos(a) * 1.8, .2, Math.sin(a) * 1.8, 0]); }
      for (let i = 0; i < 26; i++) { const a = i / 26 * TAU + r() * .2, rr = size * (.75 + r() * .25); this.soft.spawn([p.x + Math.cos(a) * rr, y + .3, p.z + Math.sin(a) * rr, 1 + r() * .6], [.86, .8, .68, .5], [3, t, 1.6 + r() * .6, r()], [Math.cos(a) * 2.4, .3, Math.sin(a) * 2.4, 0]); }
      for (let i = 0; i < 46; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * size * .8, gg = [.35, .62, .2].map(v => v * (.8 + r() * .4)); B.spawn([p.x + Math.cos(a) * rr, y + .1, p.z + Math.sin(a) * rr, .16 + r() * .14], [...gg, r() < .7 ? 1 : 0], [1, t + r() * .1, 1.1 + r() * .5, r()], [Math.cos(a) * 1.5, 3 + r() * 2.5, Math.sin(a) * 1.5, 0]); }
      for (let i = 0; i < 10; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * size * .7, c = [[.95, .85, .3], [1, 1, 1], [.9, .45, .6]][i % 3]; B.spawn([p.x + Math.cos(a) * rr, y + .2, p.z + Math.sin(a) * rr, .1], [...c, 0], [1, t, 1.3, r()], [Math.cos(a), 3.5 + r() * 2, Math.sin(a), 0]); }
    } else if (type === 'perfect') {
      for (let k = 0; k < 2; k++) for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, rr = size * (.75 + k * .1); G.spawn([p.x + Math.cos(a) * rr, y + .4, p.z + Math.sin(a) * rr, .5], [1, .78, .28, 2.2], [3, t + k * .28, 1.4, r()], [Math.cos(a) * 3.2, 1.6 + k, Math.sin(a) * 3.2, 1.6]); }
      for (let i = 0; i < 30; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * size * .8; G.spawn([p.x + Math.cos(a) * rr, y + .3, p.z + Math.sin(a) * rr, .55 + r() * .4], [1, .86, .45, 1.6], [7, t + r() * .8, 1.6, r()], [0, 1.6, 0, 0]); }
      this._sound('sparkle', p);
    } else if (type === 'wald') {
      const a = r() * TAU; this.temps.push({ type: 'flock', t0: t, life: 10, x: p.x, y, z: p.z, n: 14, seed: r() * 1e6, dx: Math.cos(a), dz: Math.sin(a), size });
      for (let i = 0; i < 26; i++) { const aa = r() * TAU, rr = Math.sqrt(r()) * size * .7, c = this.sw[2] > .5 ? [.85, .4, .1] : [.35, .6, .2]; B.spawn([p.x + Math.cos(aa) * rr, y + 4 + r() * 3, p.z + Math.sin(aa) * rr, .18], [...c, 1], [3, t + r() * 1.5, 4.5, r()], [r() - .5, 0, r() - .5, 0]); }
      this._sound('flutter', p);
    } else if (type === 'dorf') {
      if (this.env.night > .45) this._fireworks(p, y, size);
      else {
        const CC = [[.95, .3, .3], [.3, .55, .95], [.98, .82, .25], [.35, .8, .4], [.95, .5, .8], [1, 1, 1]];
        for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + r(), bx = p.x + Math.cos(a) * size * .4, bz = p.z + Math.sin(a) * size * .4;
          for (let i = 0; i < 60; i++) { const aa = r() * TAU, sp = r() * 2.2; B.spawn([bx, y + .8, bz, .1 + r() * .05], [...CC[i % 6], 0], [0, t + k * .35, 5.5 + r() * 2, r()], [Math.cos(aa) * sp, 5 + r() * 4, Math.sin(aa) * sp, 0]); }
          this._soundAt(t + k * .35, 'pop', p); }
        for (let gN = 0; gN < 2; gN++) {                                  // Wimpelketten
          const a = r() * PI + gN * PI / 2, dx = Math.cos(a), dz = Math.sin(a), Lh = size * .75, n = 16;
          for (let i = 0; i < n; i++) { const f = i / (n - 1) * 2 - 1, x = p.x + dx * f * Lh, z = p.z + dz * f * Lh, sag = (1 - f * f) * 1.1; B.spawn([x, y + 4.6 - sag, z, .5], [...CC[(i + gN) % 6], 0], [4, t + Math.abs(f) * .5, 13, r()], [dx, 0, dz, 0]); }
        }
      }
    } else if (type === 'wasser') {
      for (let i = 0; i < 5; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * size * .38, x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr, d = r() * TAU, t0 = t + i * .45 + r() * .2;
        this.temps.push({ type: 'fish', t0, life: .95, x, z, d, len: 1.1, h: .7 + r() * .4, c1: col(r() < .5 ? '#e8823a' : '#9aa8ae') });
        this._splash(x, z, t0, 1); this._splash(x + Math.cos(d) * 1.1, z + Math.sin(d) * 1.1, t0 + .95, 1); this._soundAt(t0 + .95, 'splash', p); }
      for (let i = 0; i < 46; i++) { const a = r() * TAU, rr = Math.sqrt(r()) * size * .6; G.spawn([p.x + Math.cos(a) * rr, WATER_Y + .08, p.z + Math.sin(a) * rr, .35 + r() * .35], [.8, .95, 1, 1.8], [7, t + r() * 1.6, 1.2, r()], [0, .1, 0, 0]); }
    } else if (type === 'feld') {
      for (let i = 0; i < 60; i++) B.spawn([p.x, y + .2, p.z, .14 + r() * .08], [.92 + r() * .05, .72 + r() * .1, .25, 1], [2, t + r() * .9, 3 + r(), r()], [1.6 + r(), size * (.15 + r() * .45), 1.2 + r() * 1.4, 0]);
      for (let i = 0; i < 30; i++) G.spawn([p.x, y + .3, p.z, .3], [1, .82, .35, 1.4], [8, t + r() * 1.2, 2.6, r()], [1.4, size * (.2 + r() * .4), 1.6, 0]);
      this._sound('sparkle', p);
    } else if (type === 'berg') {
      this.temps.push({ type: 'eagle', t0: t, life: 17, x: p.x, y, z: p.z, seed: r() * TAU });
      this._soundAt(t + 1.2, 'eagle', p);
    } else if (type === 'unlock') {
      const pl = this.pillars.find(q => t - q.t0 > q.life) || this.pillars[0]; pl.t0 = t; pl.x = p.x; pl.y = y; pl.z = p.z; pl.size = Math.max(1.2, size * .3);
      for (let i = 0; i < 70; i++) G.spawn([p.x, y + .5, p.z, .45], [1, .88, .55, 1.8], [9, t + r() * 2.2, 2.4, r()], [2.2, pl.size * (.9 + r() * .5), 6 + r() * 6, 0]);
      for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; G.spawn([p.x, y + .2, p.z, .5], [1, .85, .45, 2], [3, t, 1.3, r()], [Math.cos(a) * 5, .6, Math.sin(a) * 5, 1.4]); }
      this._sound('sparkle', p);
    } else if (type === 'quest') {
      const f = this.flags.find(q => t - q.t0 > q.life) || this.flags[0]; f.t0 = t; f.grp.position.set(p.x, y, p.z); f.grp.rotation.y = r() * TAU;
      for (let i = 0; i < 50; i++) G.spawn([p.x, y + .3, p.z, .4], [1, .8, .35, 1.8], [8, t + r() * 2.4, 1.8, r()], [2.5, .5 + r() * .5, 1.6 + r(), 0]);
      for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; G.spawn([p.x, y + .1, p.z, .4], [1, .75, .3, 2], [3, t + 2.3, 1.2, r()], [Math.cos(a) * 3.5, 2.5, Math.sin(a) * 3.5, 1.5]); }
    }
  }
  _fireworks(p, y, size) {
    const t = this.t, r = Math.random, G = this.glow;
    const PAL = [[1, .35, .3], [.4, .65, 1], [1, .85, .35], [.5, 1, .55], [1, .5, .9], [1, 1, 1]];
    for (let k = 0; k < 6; k++) {
      const t0 = t + k * .55 + r() * .3, x = p.x + (r() - .5) * size, z = p.z + (r() - .5) * size, H = 15 + r() * 9, up = 2.6, c = PAL[Math.floor(r() * PAL.length)], c2 = PAL[Math.floor(r() * PAL.length)];
      for (let i = 0; i < 14; i++) { const f = i / 14 * .9, tt = t0 + f * up * .55; const hh = H * (1 - Math.exp(-2.2 * f * .55)) / (1 - Math.exp(-2.2 * .55)); G.spawn([x, y + hh * .9, z, .22], [1, .75, .4, 1.6], [3, tt, .5, r()], [(r() - .5) * .3, -.6, (r() - .5) * .3, 1]); }
      const tb = t0 + up * .55, cy = y + H;
      G.spawn([x, cy, z, 6], [...c, 1.6], [3, tb, .45, 0], [0, 0, 0, 0]);
      for (let i = 0; i < 110; i++) { const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u), sp = 7 + r() * 2.5; G.spawn([x, cy, z, .85], [...(i % 3 ? c : c2), 3.2], [3, tb, 1.9 + r() * .8, r()], [Math.cos(a) * s * sp, u * sp, Math.sin(a) * s * sp, 1.3]); }
      for (let i = 0; i < 24; i++) { const a = r() * TAU, u = r() * 2 - 1, s = Math.sqrt(1 - u * u), sp = 5 + r() * 3; G.spawn([x + Math.cos(a) * s * sp, cy + u * sp, z + Math.sin(a) * s * sp, .7], [1, .95, .8, 2.5], [7, tb + .9 + r() * .8, .5, r()], [0, -1.5, 0, 0]); }
      this._soundAt(t0, 'whistle', V3([x, y, z])); this._soundAt(tb, 'firework', V3([x, cy, z]));
    }
  }
  _sound(name, pos) { if (this.onSound) try { this.onSound(name, pos); } catch (e) { /* Ton ist optional */ } }
  _soundAt(t, name, pos) { this.events.push({ t, name, pos }); }

  // ---------------------------------------------------------------- pro Bild
  update(dt, t, env = {}) {
    const t0 = performance.now();
    dt = clamp(dt || 0, 0, .1); this.t = t; const U = this.U; U.uT.value = t;
    const e = this.env; e.night = clamp(env.night ?? e.night); e.season = env.season ?? e.season; e.rain = clamp(env.rain ?? e.rain); e.camTarget = env.camTarget; e.camDist = env.camDist ?? 30;
    const sw = this.sw; for (let i = 0; i < 4; i++) { const d = ((e.season - i) % 4 + 4) % 4; sw[i] = clamp(1 - Math.min(d, 4 - d)); }
    U.uLamp.value = sstep(.18, .62, e.night); U.uFire.value = sstep(.45, .85, e.night) * (sw[1] + sw[2] * .8 + sw[0] * .3) * (1 - e.rain * .8);
    U.uDay.value = (1 - sstep(.2, .55, e.night)) * (1 - e.rain * .6) * .6; U.uBeam.value = sstep(.3, .75, e.night); U.uNightL.value = e.night;
    U.uSmoke.value = clamp(.42 + sw[3] * .58 + sw[2] * .15 + e.night * .12 - e.rain * .2); U.uMin.value = e.camDist * .011;
    U.uWind.value.set(.85, .35).multiplyScalar(1 + e.rain * .6);
    this._dyn = [];
    this._villagers(t);
    this._animals(t);
    this._critters(t, dt);
    this._sky(t);
    for (const L of this._lanterns) { this._dyn.push([L[0], L[1], L[2], .55, 1, .68, .3, 1.8 * U.uLamp.value + .3, 2, 0, 0, 0]); this._dyn.push([L[0], L[3] + .06, L[2], 2.6, 1, .64, .28, .45 * U.uLamp.value, 4, 0, 0, 0, 1]); }
    // dynamische Leuchtpunkte schreiben
    const G = this.glow, D = Math.min(this._dyn.length, G.D);
    for (let i = 0; i < D; i++) { const d = this._dyn[i]; G.put(G.S + i, [d[0], d[1], d[2], d[3]], [d[4], d[5], d[6], d[7]], [d[8], d[9], d[10], d[11]], [d[12] || 0, 0, 0, 0]); }
    G.clearRange(G.S + D, G.S + Math.max(D, G.dynUsed)); G.touch(G.S, G.S + Math.max(D, G.dynUsed)); G.dynUsed = D;
    // Lichtsäulen und Fahnen
    for (const pl of this.pillars) { const a = t - pl.t0; pl.m.visible = a >= 0 && a < pl.life; if (pl.m.visible) { pl.m.position.set(pl.x, pl.y, pl.z); pl.m.scale.set(pl.size * (1 + a * .15), 48, pl.size * (1 + a * .15)); pl.m.material.uniforms.uA.value = sstep(0, .35, a) * (1 - sstep(pl.life - 1.2, pl.life, a)) * .9; } }
    for (const f of this.flags) {
      const a = t - f.t0; f.grp.visible = a >= 0 && a < f.life; if (!f.grp.visible) continue;
      const grow = sstep(0, .6, a) * (1 - sstep(f.life - .8, f.life, a)); f.grp.scale.set(1, Math.max(.001, grow), 1);
      f.flag.position.set(.05, .9 + 3.2 * sstep(.5, 2.6, a), 0); f.flag.scale.setScalar(sstep(.3, .8, a));
    }
    // Feier-Gäste aufräumen, Ton-Ereignisse
    this.temps = this.temps.filter(T => t - T.t0 < T.life + .5);
    if (this.events.length) { const due = this.events.filter(v => v.t <= t); this.events = this.events.filter(v => v.t > t && v.t < t + 30); for (const v of due) if (t - v.t < .5) this._sound(v.name, v.pos); }
    this.stats.ms = this.stats.ms * .9 + (performance.now() - t0) * .1;
  }

  pickables() {
    const out = [];
    for (const p of this.vProxy) if (p.visible) out.push(p);
    for (const p of this.qProxy) if (p.visible) out.push(p);
    out.push(this.balloon.proxy);
    return out;
  }
  // Nähe für den Ton (0..1): Wasser, Wald, Dorf, Wasserfall um einen Punkt (z. B. Kamera-Ziel). Für sound.update({ near }).
  near(pos, range = 22) {
    const p = V3(pos), S = this.spots || {}, out = { water: 0, forest: 0, village: 0, fall: 0 };
    const f = (list, key, r = range) => { for (const s of list || []) { const d = Math.hypot(s.x - p.x, s.z - p.z); out[key] = Math.max(out[key], clamp(1 - d / r)); } };
    f(S.water, 'water'); f(S.lake, 'water'); f(S.fountain, 'water', 10); f(S.forest, 'forest'); f(S.door, 'village'); f(S.stall, 'village'); f(S.fall, 'fall', 30);
    return out;
  }
  dispose() {
    this.scene.remove(this.root);
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } if (o.customDepthMaterial) o.customDepthMaterial.dispose(); });
    this.vill = []; this.temps = []; this.events = [];
  }
}
