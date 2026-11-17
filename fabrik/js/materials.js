// Fließband – gemeinsame Materialien. Was sich mit der Zeit ändert (Band-Pfeile, Gold-Funkeln, Glühen, Wasser, Nebel),
// steckt in Uniforms; die Geometrie bleibt fest.
import * as THREE from 'three';

export const U = {
  uTime: { value: 0 },
  uBeltPhase: { value: 0 },                                 // Bandweg in Feldern (stage.update zählt mit uBeltSpeed hoch)
  uBeltColor: { value: new THREE.Color(0x3a3d44) },        // Gummi
  uArrowColor: { value: new THREE.Color(0xf2c230) },       // Pfeile
  uGrid: { value: 0 },                                     // Raster 0…1
  uGridColor: { value: new THREE.Color(0x000000) },
  uNight: { value: 0 },
};
export const BELT = { speed: 1.6 };                       // Felder/s (Integration setzt das Sim-Tempo)
// Bandtempo und -farbe (Deko): setBeltStyle({ speed, color, arrow })
export function setBeltStyle({ speed, color, arrow } = {}) {
  if (speed !== undefined) BELT.speed = speed;
  if (color !== undefined) U.uBeltColor.value.set(color);
  if (arrow !== undefined) U.uArrowColor.value.set(arrow);
}
export const BELT_SKINS = {
  standard: { color: 0x3a3d44, arrow: 0xf2c230 }, mint: { color: 0x2f5a52, arrow: 0xb8f5d8 }, kirsche: { color: 0x5a2630, arrow: 0xffd0d8 },
  nacht: { color: 0x1c2036, arrow: 0x7ad8ff }, gold: { color: 0x4a3a1c, arrow: 0xffe27a }, lila: { color: 0x3c2c58, arrow: 0xf0b0ff },
  regenbogen: { color: 0x3a3d44, arrow: 0xff7a5a },
};

const HASH = `float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }`;
// Weltposition auch für instanzierte Meshes
const WP_VERT = `
#ifdef USE_INSTANCING
  vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;
#else
  vWP = (modelMatrix * vec4(transformed, 1.)).xyz;
#endif`;
function withWP(shader) {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>' + WP_VERT);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\n' + HASH);
}

// ---------- feste Welt: matt, Vertex-Farben, flach schattiert ----------
export const baseMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .78, metalness: 0, envMapIntensity: .55 });
// Metall: glänzt in der Umgebung (stage setzt scene.environment)
export const metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .36, metalness: .62, envMapIntensity: 1.05 });
// Leuchtet immer (Lampen, Anzeigen) – über 1 → Bloom
export const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.6, 2.6, 2.6) });
// Chrom (Mk III): spiegelnd, hell
export const chromeMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .12, metalness: 1, envMapIntensity: 1.6 });
// Glas: durchsichtig, spiegelt
export const glassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .06, metalness: .2, transparent: true, opacity: .42, depthWrite: false, envMapIntensity: 1.6 });

// ---------- Gold: Metall mit funkelnden Sternchen und wanderndem Glanz ----------
export function makeGoldMat(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: o.color ?? 0xffc23a, roughness: .22, metalness: 1, flatShading: true, envMapIntensity: 1.6, vertexColors: !!o.vertexColors });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime; withWP(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ vec3 q = floor(vWP * 26.); float r = h3(q);
  float tw = pow(max(0., sin(uTime * (3. + r * 5.) + r * 40.)), 18.) * step(.82, r);
  float sweep = pow(max(0., sin((vWP.x + vWP.z) * 2.2 - uTime * 2.6)), 24.);
  totalEmissiveRadiance += vec3(1., .86, .45) * (tw * 4.5 + sweep * .55 + .06); }`);
  };
  m.customProgramCacheKey = () => 'gold1' + (o.vertexColors ? 'v' : '');
  return m;
}
export const goldMat = makeGoldMat({ vertexColors: true });

// ---------- Glühen (Ofen, Kolben): je Gebäude eigenes Material, Stärke in .userData.heat (0…1) ----------
export function makeHeatMat(color = 0xff7a20) {
  const u = { uHeat: { value: 0 }, uHeatC: { value: new THREE.Color(color) } };
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .5, metalness: 0 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u); sh.uniforms.uTime = U.uTime; withWP(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uHeat, uTime; uniform vec3 uHeatC;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ float fl = .82 + .18 * vn(vWP.xz * 6. + uTime * 3.) ; totalEmissiveRadiance += (vColor.rgb * .6 + uHeatC * .9) * uHeat * fl * 2.6 + uHeatC * .12; }`);
  };
  m.customProgramCacheKey = () => 'heat1';
  Object.defineProperty(m, 'heat', { get: () => u.uHeat.value, set: v => { u.uHeat.value = v; } });
  m.uniformsHeat = u; return m;
}

// ---------- Band: Gummi mit scrollenden Pfeilen (uv.x quer 0…1, uv.y längs in Feldern) ----------
export const beltMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7, metalness: .05 });
beltMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, { uBeltPhase: U.uBeltPhase, uBeltColor: U.uBeltColor, uArrowColor: U.uArrowColor });
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vBUv; attribute vec2 aBelt; varying vec2 vBelt;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBUv = uv; vBelt = aBelt;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vBUv; varying vec2 vBelt; uniform float uBeltPhase; uniform vec3 uBeltColor, uArrowColor;
float bh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
{ float x = vBUv.x - .5, y = vBUv.y - uBeltPhase * (1. - vBelt.y);
  // Lamellen quer (weich, mit Abstand ausgeblendet gegen Flimmern)
  float ly = fract(y * 7.); float fwl = fwidth(y * 7.);
  float slat = smoothstep(.5 - fwl, .5 + fwl, abs(ly - .5) * 2.) * (1. - smoothstep(.15, .5, fwl));
  vec3 c = uBeltColor * (1. - .16 * slat);
  // Pfeile (Winkel) – zwei je Feld
  float d = y * 2. + abs(x) * 1.3; float f = fract(d); float fw = fwidth(d) * 1.2 + 1e-4;
  float a = smoothstep(.0, fw, f) * (1. - smoothstep(.34 - fw, .34, f)) * (1. - smoothstep(.27, .27 + fwidth(x) * 1.5, abs(x)));
  c = mix(c, uArrowColor, a * .92 * (1. - smoothstep(.3, .9, fw)));
  // Ränder etwas dunkler
  c *= 1. - .35 * smoothstep(.36, .5, abs(x));
  // Frost: eisiger Belag von den Rändern her, Kristall-Glitzern (fest am Band, wandert nicht mit)
  if (vBelt.x > .001) { float f = vBelt.x; vec2 q = vec2(vBUv.x * 9., vBUv.y * 9.); float n = bh(floor(q)) * .5 + bh(floor(q * 2.3)) * .5;
    float edge = smoothstep(.5 - .42 * f, .5, abs(x) + n * .12 * f);
    float cov = clamp(f * (.55 + .45 * n) + edge, 0., 1.);
    c = mix(c, vec3(.82, .9, .98), cov * .85);
    c += vec3(.6, .8, 1.) * step(.985 - .03 * f, bh(floor(q * 3.1))) * f * .8; }
  diffuseColor.rgb = c; }`);
};
beltMat.customProgramCacheKey = () => 'belt2';

// ---------- Wasser / Öl (Becken, Pfützen) ----------
function makeLiquid(a, b, key, gloss = .1) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: gloss, metalness: .2, envMapIntensity: 1.4 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime; withWP(sh);
    sh.uniforms.uA = { value: new THREE.Color(a) }; sh.uniforms.uB = { value: new THREE.Color(b) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec3 uA, uB;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec2 p = vWP.xz * 3.; float w = vn(p + vec2(uTime * .4, uTime * .3)) * .6 + vn(p * 2.3 - uTime * .5) * .4;
  diffuseColor.rgb = mix(uA, uB, w); diffuseColor.rgb += smoothstep(.82, .95, vn(p * 4. + uTime)) * .25; }`);
  };
  m.customProgramCacheKey = () => key; return m;
}
export const waterMat = makeLiquid(0x2a7ca8, 0x6cc6e0, 'water1');
export const oilMat = makeLiquid(0x120e18, 0x3a2e48, 'oil1', .04);

// ---------- Gelände: Vertex-Farben + feines Rauschen + Raster ----------
export const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0, flatShading: false, envMapIntensity: .35 });
terrainMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, { uGrid: U.uGrid, uGridColor: U.uGridColor }); withWP(sh);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGrid; uniform vec3 uGridColor;')
    .replace('#include <color_fragment>', `#include <color_fragment>
{ vec2 p = vWP.xz;
  float n = vn(p * 3.1) * .55 + vn(p * 9.7) * .3 + vn(p * .7) * .15;
  diffuseColor.rgb *= .9 + .2 * n;
  if (uGrid > .001) {
    vec2 g = abs(fract(p) - .5); vec2 fw = fwidth(p);
    float l = max(1. - smoothstep(.5 - fw.x * 1.5, .5, g.x), 1. - smoothstep(.5 - fw.y * 1.5, .5, g.y));
    l = max(smoothstep(.47, .5, max(g.x, g.y)) * .0, l);
    float fade = 1. - smoothstep(.06, .22, max(fw.x, fw.y));
    diffuseColor.rgb = mix(diffuseColor.rgb, uGridColor, l * uGrid * .32 * fade);
  } }`);
};
terrainMat.customProgramCacheKey = () => 'terrain1';

// ---------- Nebel über gesperrten Grundstücken: ziehende Schwaden ----------
export function makeFogMat(color = 0xdfe6ee, opacity = .7) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: true });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime; withWP(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec2 p = vWP.xz * .18 + vec2(uTime * .03, uTime * .018);
  float n = vn(p) * .55 + vn(p * 2.7 - uTime * .02) * .3 + vn(p * 6.) * .15;
  diffuseColor.a *= .55 + .55 * n; diffuseColor.rgb *= .92 + .14 * n; }`);
  };
  m.customProgramCacheKey = () => 'fog1'; return m;
}

// Vorschau (halbdurchsichtig, grün/rot)
export const ghostMat = c => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: .5, emissive: c, emissiveIntensity: .35, depthWrite: false, flatShading: true });

// Standard-Satz für instantiate()
export const MATS = { base: baseMat, metal: metalMat, glow: glowMat, glass: glassMat, gold: goldMat, belt: beltMat, water: waterMat, oil: oilMat, chrome: chromeMat };
