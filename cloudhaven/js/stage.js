// Bühne: Renderer, Himmel (Verlauf, Sonne, Mond, Sterne), Wolkenmeer, Licht, Tages- und Jahreszeit, Wetter (Regen, Schnee,
// Nebel, Gewitter, Regenbogen) und Post-FX (MSAA → Tilt-Shift → Bloom → Grading + Tonemapping). Alles, was sich bewegt,
// ist eine Funktion von U.uTime (kein aufaddierter Zustand); nur Überblendungen (Wetter, Jahreszeit, Filter) werden gedämpft.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { U } from './materials.js';

// ---------- Höhennebel für alle eingebauten Materialien ----------
// scene.fog ist ein THREE.Fog, aber umgedeutet: fogNear = Abstand, ab dem Dunst beginnt, fogFar = e-Länge des Dunsts.
// Unterhalb der Insel (Richtung Wolkenmeer) wird er dichter, weit oben dünner.
THREE.ShaderChunk.fog_pars_vertex = `#ifdef USE_FOG
varying float vFogDepth; varying float vFogY;
#endif`;
THREE.ShaderChunk.fog_vertex = `#ifdef USE_FOG
vFogDepth = - mvPosition.z;
vFogY = ((mvPosition.xyz - viewMatrix[3].xyz) * mat3(viewMatrix)).y;
#endif`;
THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
uniform vec3 fogColor; varying float vFogDepth; varying float vFogY;
#ifdef FOG_EXP2
uniform float fogDensity;
#else
uniform float fogNear; uniform float fogFar;
#endif
#endif`;
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
#ifdef FOG_EXP2
float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
#else
float fogH = .5 + 1.7 * smoothstep(-6., -70., vFogY) - .25 * smoothstep(20., 90., vFogY);
float fogFactor = 1.0 - exp( - max(vFogDepth - fogNear, 0.) / fogFar * fogH );
#endif
gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;

// ---------- Hilfen ----------
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const cyc = (s, c) => { const d = Math.abs((((s - c) % 4) + 4) % 4); return Math.min(d, 4 - d); };
function hash1(n) { let h = Math.imul(n | 0, 0x9E3779B1) ^ 0x85ebca6b; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const QUALITY = {
  // MSAA kostet unter ANGLE/Metal bei Retina ~5 ms → im Spiel FXAA, beim Foto (capture) 4× MSAA
  // shadowFar: Schattenkarte in der Gesamtansicht (Fokus-Abstand > FAR_IN): deckt dort ±150 m ab, feinere Texel sieht man nicht;
  // weniger Schattenwerfer (world.js shadowLod nach Texelgröße) und weniger Speicher-Bandbreite. Nah bleibt shadow.
  hoch:    { dpr: 2,   msaa: 0, shadow: 4096, shadowFar: 2048, shadowEvery: 2, clouds: 1600, rain: 7000, snow: 4500, bloom: true },
  mittel:  { dpr: 1.5, msaa: 0, shadow: 2048, shadowFar: 1024, shadowEvery: 2, clouds: 1100, rain: 4500, snow: 3000, bloom: true },
  niedrig: { dpr: 1,   msaa: 0, shadow: 1024, shadowFar: 1024, shadowEvery: 3, clouds: 650,  rain: 2500, snow: 1600, bloom: true },
};
const FAR_IN = 90, FAR_OUT = 80;          // Gesamtansicht ab Fokus-Abstand 90 m, zurück unter 80 m (Hysterese wie main.js dyn.far)

// Himmelsfarben nach Sonnenhöhe (Grad): Zenit, Horizont, Glühen zur Sonne, Sonnenlicht, Stärke, Himmelslicht, Dunst
const SKY_KEYS = [
  [-90, 0x040818, 0x0b1430, 0x0b1430, 0x000000, 0,   0x5468a8, .8,  0x0e1830],   // Nacht: kühles, helleres Mondblau
  [-16, 0x050b20, 0x101d40, 0x14183a, 0x000000, 0,   0x5468a8, .8,  0x111c3a],
  [-8,  0x101c48, 0x2e3364, 0x5a3c6c, 0x000000, 0,   0x6670a4, .8,  0x283058],
  [-3,  0x1e3270, 0x7a5a86, 0xd46a58, 0xff7a40, .45, 0xa08aa0, .9,  0x6a5e80],   // Dämmerung: warm statt lila
  [1,   0x34559a, 0xe48e72, 0xff7a3c, 0xff9a50, 1.5, 0xcaa894, .95, 0xc08a80],
  [6,   0x4470b8, 0xf2b088, 0xff9a48, 0xffae62, 2.3, 0xd2c2b2, .95, 0xe8b498],
  [14,  0x4a80c8, 0xd8d4c8, 0xffc890, 0xffc488, 2.7, 0xbccde6, 1.0, 0xd8dcd8],
  [28,  0x3f82d4, 0xb8d8ee, 0xffe8c8, 0xfff0dc, 3.0, 0xc8dcf2, 1.05, 0xc4dcee],
  [70,  0x2d70d0, 0xb4d8f4, 0xfff4e0, 0xfff8ee, 3.2, 0xcfe2f6, 1.1, 0xc2dcf0],
].map(k => [k[0], ...[1, 2, 3, 4].map(i => new THREE.Color(k[i])), k[5], new THREE.Color(k[6]), k[7], new THREE.Color(k[8])]);

// Jahreszeit: Lichtfarbe, Stärke, Himmels-Sättigung, max. Sonnenhöhe
const SEASON_LOOK = [
  { sun: [1, 1, .97],     si: 1,    sky: 1,   ele: 52, hemi: [1, 1.02, .98] },   // Frühling
  { sun: [1.04, 1, .92],  si: 1.07, sky: 1.05, ele: 64, hemi: [1.02, 1, .95] },  // Sommer
  { sun: [1.1, .96, .8],  si: .96,  sky: .9,  ele: 40, hemi: [1.06, .98, .88] }, // Herbst
  { sun: [.92, .97, 1.08], si: .9,  sky: .78, ele: 30, hemi: [.94, .99, 1.1] },  // Winter
];

const WEATHER = {
  klar:     { rain: 0,   snow: 0, fog: 0,   storm: 0, over: 0,   wind: 1 },
  regen:    { rain: 1,   snow: 0, fog: .35, storm: 0, over: .8,  wind: 1.6 },
  schnee:   { rain: 0,   snow: 1, fog: .45, storm: 0, over: .6,  wind: .8 },
  nebel:    { rain: 0,   snow: 0, fog: 1,   storm: 0, over: .45, wind: .4 },
  gewitter: { rain: 1.3, snow: 0, fog: .4,  storm: 1, over: 1,   wind: 2.6 },
};

const FILTERS = {
  normal:   { sat: 1.1,  con: 1.04, gain: 1,   tint: [1.02, 1, .97],  lift: [0, 0, 0],          mono: 0, vig: .24, grain: .022, tilt: 0,  bloom: 1 },
  gold:     { sat: 1.22, con: 1.08, gain: 1.05, tint: [1.1, .98, .82], lift: [.03, .015, 0],     mono: 0, vig: .34, grain: .03,  tilt: 0,  bloom: 1.5 },
  film:     { sat: .86,  con: 1.12, gain: 1,   tint: [1.03, 1, .95],  lift: [.045, .05, .06],   mono: 0, vig: .42, grain: .07,  tilt: 0,  bloom: 1.2 },
  sw:       { sat: 0,    con: 1.28, gain: 1.04, tint: [1, 1, 1],      lift: [.01, .01, .01],    mono: 1, vig: .38, grain: .06,  tilt: 0,  bloom: 1 },
  miniatur: { sat: 1.38, con: 1.12, gain: 1.04, tint: [1.02, 1, .96], lift: [0, 0, 0],          mono: 0, vig: .2,  grain: .015, tilt: 1,  bloom: 1 },
  nacht:    { sat: .45,  con: 1.12, gain: .42, tint: [.6, .8, 1.4], lift: [0, .008, .025],   mono: 0, vig: .5,  grain: .045, tilt: 0,  bloom: 1.6 },
};

// ---------- Passes ----------
// Aufbau (ein einziger Vollbild-Durchgang am Ende, das spart Bandbreite bei Retina):
//   ScenePass (optional MSAA) → FxPass (kleine Pyramiden: Tilt-Shift ½ ¼ ⅛, Bloom ¼ ⅛ ⅟16) → GradePass
//   (FXAA → Tilt-Shift-Mischung → + Bloom → Belichtung/Tönung → ACES → Sättigung, Kontrast, Vignette, Korn, Dithering → sRGB)
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const copyMat = () => new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null } }, vertexShader: VS,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }`, depthTest: false, depthWrite: false });
const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };

// Szene in ein eigenes MSAA-Ziel (falls samples > 0), dann aufgelöst in den Lese-Puffer des Composers
class ScenePass extends Pass {
  constructor(scene, camera, samples) {
    super(); this.scene = scene; this.camera = camera; this.needsSwap = false; this.samples = samples;
    this.ms = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
    this.quad = new FullScreenQuad(copyMat());
  }
  setSamples(n) { if (n === this.samples) return; this.samples = n; const { width, height } = this.ms; this.ms.dispose();
    this.ms = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: n }); }
  setSize(w, h) { this.ms.setSize(w, h); }
  render(r, wb, rb) {
    if (this.samples > 0) {
      r.setRenderTarget(this.ms); r.clear(); r.render(this.scene, this.camera);
      this.quad.material.uniforms.tDiffuse.value = this.ms.texture; r.setRenderTarget(rb); this.quad.render(r);
    } else { r.setRenderTarget(rb); r.clear(); r.render(this.scene, this.camera); }
  }
}

// Kleine Pyramiden für Tilt-Shift und Bloom. Jede Stufe entsteht aus der vorigen, schon weichen Stufe
// (keine weit gespreizten Abtaster → keine Punktmuster).
class FxPass extends Pass {
  constructor() {
    super(); this.needsSwap = false;
    this.tiltRT = [0, 1, 2, 3, 4, 5].map(() => new THREE.WebGLRenderTarget(1, 1, rtOpts));
    this.bloomRT = [0, 1, 2, 3, 4, 5].map(() => new THREE.WebGLRenderTarget(1, 1, rtOpts));
    this.down = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: -1 }, uKnee: { value: .5 } }, vertexShader: VS,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uTexel; uniform float uThr, uKnee; varying vec2 vUv;
void main(){ vec2 o = uTexel;
  vec4 c = .25 * (texture2D(tDiffuse, vUv + vec2(-o.x,-o.y)) + texture2D(tDiffuse, vUv + vec2(o.x,-o.y)) + texture2D(tDiffuse, vUv + vec2(-o.x,o.y)) + texture2D(tDiffuse, vUv + vec2(o.x,o.y)));
  if (uThr >= 0.) { c.rgb = min(c.rgb, vec3(40.)); float br = max(c.r, max(c.g, c.b)); float sf = clamp(br - uThr + uKnee, 0., 2. * uKnee); sf = sf * sf / (4. * uKnee + 1e-4);
    c.rgb *= max(sf, br - uThr) / max(br, 1e-4); }
  gl_FragColor = c; }`, depthTest: false, depthWrite: false }));
    this.blur = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VS,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec4 c = texture2D(tDiffuse, vUv) * .2270270;
  c += (texture2D(tDiffuse, vUv + uDir * 1.3846154) + texture2D(tDiffuse, vUv - uDir * 1.3846154)) * .3162162;
  c += (texture2D(tDiffuse, vUv + uDir * 3.2307692) + texture2D(tDiffuse, vUv - uDir * 3.2307692)) * .0702703;
  gl_FragColor = c; }`, depthTest: false, depthWrite: false }));
    this.tilt = 0; this.bloom = true; this.threshold = 1.4;
  }
  setSize(w, h) {
    const sz = (rts, first) => { for (let i = 0; i < 3; i++) { const s = first << i, W = Math.max(1, Math.round(w / s)), H = Math.max(1, Math.round(h / s)); rts[i * 2].setSize(W, H); rts[i * 2 + 1].setSize(W, H); } };
    sz(this.tiltRT, 2); sz(this.bloomRT, 4);
  }
  _chain(r, src, rts, thr, firstStep) {
    const D = this.down.material.uniforms, B = this.blur.material.uniforms;
    for (let i = 0; i < 3; i++) {
      const a = rts[i * 2], b = rts[i * 2 + 1], sp = i === 0 ? 1 : 1.5;
      // erster Schritt: Abstand so, dass die 4 bilinearen Abtaster den ganzen Quellbereich abdecken
      const st = i === 0 ? firstStep : .5;
      D.tDiffuse.value = src.texture; D.uTexel.value.set(st / src.width, st / src.height); D.uThr.value = i === 0 ? thr : -1;
      r.setRenderTarget(a); this.down.render(r);
      B.tDiffuse.value = a.texture; B.uDir.value.set(sp / a.width, 0); r.setRenderTarget(b); this.blur.render(r);
      B.tDiffuse.value = b.texture; B.uDir.value.set(0, sp / a.height); r.setRenderTarget(a); this.blur.render(r);
      src = a;
    }
  }
  render(r, wb, rb) {
    if (this.tilt > .002) this._chain(r, rb, this.tiltRT, -1, .5);
    if (this.bloom) this._chain(r, rb, this.bloomRT, this.threshold, 1);
  }
}

class GradePass extends Pass {
  constructor(fx) {
    super(); this.fx = fx;
    this.uniforms = {
      tDiffuse: { value: null }, toneMappingExposure: { value: 1 }, uGain: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
      uLift: { value: new THREE.Vector3() }, uSat: { value: 1 }, uCon: { value: 1 }, uMono: { value: 0 }, uVig: { value: .25 }, uGrain: { value: .02 },
      uTime: { value: 0 }, uPx: { value: 1 }, uAspect: { value: 1 }, uFlash: { value: 0 }, uFxaa: { value: 1 }, uTexel: { value: new THREE.Vector2() },
      t1: { value: null }, t2: { value: null }, t3: { value: null }, uTilt: { value: 0 }, uBand: { value: .12 }, uRamp: { value: .34 }, uCenter: { value: .5 },
      b1: { value: null }, b2: { value: null }, b3: { value: null }, uBloom: { value: 0 }, uBloomW: { value: new THREE.Vector3(.6, .8, 1) },
      uGreen: { value: 0 },
    };
    this.material = new THREE.RawShaderMaterial({
      uniforms: this.uniforms, depthTest: false, depthWrite: false,
      defines: { SRGB_TRANSFER: '', ACES_FILMIC_TONE_MAPPING: '' },
      vertexShader: `precision highp float; attribute vec3 position; attribute vec2 uv; varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `precision highp float;
uniform sampler2D tDiffuse, t1, t2, t3, b1, b2, b3; uniform vec2 uTexel; uniform vec3 uTint, uLift, uBloomW;
uniform float uGain, uSat, uCon, uMono, uVig, uGrain, uTime, uPx, uAspect, uFlash, uFxaa, uTilt, uBand, uRamp, uCenter, uBloom, uGreen;
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float lu(vec3 c){ return dot(c / (1. + c), vec3(.299, .587, .114)); }       // Helligkeit, HDR gestaucht
vec3 fxaa(vec2 uv){
  vec3 M = texture2D(tDiffuse, uv).rgb;
  if (uFxaa < .5) return M;
  vec2 o = uTexel * .5;
  vec3 cNW = texture2D(tDiffuse, uv + vec2(-o.x, o.y)).rgb, cNE = texture2D(tDiffuse, uv + o).rgb, cSW = texture2D(tDiffuse, uv - o).rgb, cSE = texture2D(tDiffuse, uv + vec2(o.x, -o.y)).rgb;
  float lNW = lu(cNW), lNE = lu(cNE), lSW = lu(cSW), lSE = lu(cSE), lM = lu(M);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  if (lMax - lMin < max(.03, lMax * .12)) return M;
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
  float red = max((lNW + lNE + lSW + lSE) * .03125, 1. / 128.), rcp = 1. / (min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir * rcp, -6., 6.) * uTexel;
  vec3 A = .5 * (texture2D(tDiffuse, uv - dir / 6.).rgb + texture2D(tDiffuse, uv + dir / 6.).rgb);
  vec3 B = A * .5 + .25 * (texture2D(tDiffuse, uv - dir * .5).rgb + texture2D(tDiffuse, uv + dir * .5).rgb);
  float lB = lu(B); return (lB < lMin || lB > lMax) ? A : B;
}
void main(){
  vec3 c = fxaa(vUv);
  if (uTilt > .002) {
    float a = smoothstep(uBand, uBand + uRamp, abs(vUv.y - uCenter)) * uTilt * 3.;
    if (a > .002) { vec3 s1 = texture2D(t1, vUv).rgb, s2 = texture2D(t2, vUv).rgb, s3 = texture2D(t3, vUv).rgb;
      c = a < 1. ? mix(c, s1, a) : a < 2. ? mix(s1, s2, a - 1.) : mix(s2, s3, min(a - 2., 1.)); }
  }
  if (uBloom > 0.) c += uBloom * (texture2D(b1, vUv).rgb * uBloomW.x + texture2D(b2, vUv).rgb * uBloomW.y + texture2D(b3, vUv).rgb * uBloomW.z);
  c *= uGain * uTint * (1. + uFlash);
  c = ACESFilmicToneMapping(c);
  c = sRGBTransferOETF(vec4(c, 1.)).rgb;
  float gx = max(0., c.g - max(c.r, c.b)); c.g -= gx * uGreen; c.b += gx * uGreen * .25;   /* Grünüberschuss dämpfen, leicht ins Blaue */
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(l), c, uSat);
  c = mix(c, vec3(l), uMono);
  c = (c - .5) * uCon + .5;
  c = c + uLift * (1. - c);
  vec2 q = vUv - .5; q.x *= mix(1., uAspect, .5);
  c *= 1. - uVig * smoothstep(.2, .85, length(q) * 1.15);
  vec2 fc = floor(gl_FragCoord.xy / uPx);
  c += (h12(fc + fract(uTime * 7.31) * 517.) - .5) * uGrain * (1. - .5 * l);
  c += (h12(gl_FragCoord.xy + 71.3) + h12(gl_FragCoord.yx + 13.7) - 1.) / 255.;
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
}`,
    });
    this.quad = new FullScreenQuad(this.material);
  }
  setSize(w, h) { this.uniforms.uTexel.value.set(1 / w, 1 / h); }
  render(r, wb, rb) {
    const u = this.uniforms, f = this.fx;
    u.tDiffuse.value = rb.texture; u.toneMappingExposure.value = r.toneMappingExposure;
    u.t1.value = f.tiltRT[0].texture; u.t2.value = f.tiltRT[2].texture; u.t3.value = f.tiltRT[4].texture; u.uTilt.value = f.tilt;
    u.b1.value = f.bloomRT[0].texture; u.b2.value = f.bloomRT[2].texture; u.b3.value = f.bloomRT[4].texture;
    r.setRenderTarget(this.renderToScreen ? null : wb); this.quad.render(r);
  }
}

// ---------- Himmel ----------
function makeSky() {
  const uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uZen: { value: new THREE.Color() },
    uHor: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uFogC: { value: new THREE.Color() }, uSunC: { value: new THREE.Color() },
    uOverC: { value: new THREE.Color() }, uGlowAmt: { value: 0 }, uNight: { value: 0 }, uSunVis: { value: 1 }, uMoonVis: { value: 0 }, uOver: { value: 0 },
    uFlash: { value: 0 }, uTime: U.uTime, uStars: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, depthWrite: false, depthTest: true, side: THREE.BackSide, fog: false,     // nach der Welt gezeichnet: nur sichtbare Pixel
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uSunDir, uMoonDir, uZen, uHor, uGlow, uFogC, uSunC, uOverC; uniform float uGlowAmt, uNight, uSunVis, uMoonVis, uOver, uFlash, uTime, uStars;
varying vec3 vDir;
vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  float a = h33(i).x, b = h33(i+vec3(1,0,0)).x, c = h33(i+vec3(0,1,0)).x, d = h33(i+vec3(1,1,0)).x;
  float e = h33(i+vec3(0,0,1)).x, g = h33(i+vec3(1,0,1)).x, h = h33(i+vec3(0,1,1)).x, k = h33(i+vec3(1,1,1)).x;
  return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,g,f.x), mix(h,k,f.x), f.y), f.z); }
float starL(vec3 d, float sc, float dens, float sz){
  vec3 p = d * sc, c = floor(p), r = h33(c);
  if (r.x > dens) return 0.;
  vec3 sp = c + .3 + .4 * h33(c + 17.3);
  float px = length(fwidth(p)) * .7, s = sz * (.45 + .9 * r.y);
  float b = 1. - smoothstep(s, s + px, length(p - sp));
  float tw = .55 + .45 * sin(uTime * (1.3 + 3.5 * r.z) + r.y * 60.);
  return b * tw * (.35 + 1.4 * r.y * r.y) * s / max(s, px);
}
void main(){
  vec3 d = normalize(vDir); float y = d.y, up = max(y, 0.);
  vec3 col = mix(uHor, uZen, pow(smoothstep(0., 1., up), .5));
  vec3 sh = normalize(vec3(uSunDir.x, 0., uSunDir.z) + vec3(1e-4, 0., 0.)), dh = normalize(vec3(d.x, 0., d.z) + vec3(1e-4, 0., 0.));
  float az = dot(dh, sh) * .5 + .5;
  col = mix(col, uGlow, clamp(pow(az, 4.) * exp(-abs(y) * 4.5) * uGlowAmt, 0., 1.));
  col += uGlowAmt * .18 * pow(1. - az, 3.) * exp(-abs(y - .1) * 9.) * vec3(1., .5, .7);    // Gegendämmerung (rosa)
  // Sterne, Milchstraße
  if (uStars > .01 && y > -.05) {
    float hz = smoothstep(-.02, .25, y);
    vec3 mwN = normalize(vec3(.35, .5, .79)); float band = exp(-pow(dot(d, mwN) / .22, 2.));
    float neb = vn3(d * 9.) * .6 + vn3(d * 23.) * .4;
    col += vec3(.16, .17, .3) * band * smoothstep(.35, .9, neb) * uStars * hz * .35;
    float s = starL(d, 210., .14 + band * .2, .1) + starL(d, 110., .07, .09) * 1.6 + starL(d, 60., .03, .07) * 2.6;
    col += vec3(.85, .9, 1.) * s * uStars * hz * (1. - uOver);
  }
  // Wolkendecke bei Regen/Gewitter
  if (uOver > .01) col = mix(col, uOverC * (.8 + .3 * vn3(d * 6. + vec3(uTime * .02, 0., 0.))), uOver * smoothstep(-.05, .15, y) * .9);
  // unter dem Horizont: Dunst über dem Wolkenmeer, tief unten bläulich
  col = mix(col, uFogC, smoothstep(.03, -.1, y));
  col = mix(col, uFogC * vec3(.62, .74, .96), smoothstep(-.15, -.85, y));
  // Sonne mit Halo
  float cs = max(dot(d, uSunDir), 0.);
  float disk = smoothstep(.99955, .9998, cs);
  float halo = pow(cs, 900.) * 1.2 + pow(cs, 60.) * .28 + pow(cs, 8.) * .1;
  col += uSunC * (disk * 28. + halo * (1. + 2. * uGlowAmt)) * uSunVis;
  // Mond mit Flecken und Hof
  float cm = max(dot(d, uMoonDir), 0.);
  if (uMoonVis > .001) {
    if (cm > .9993) { float md = smoothstep(.99935, .99962, cm), spots = vn3(d * 900.) * .55 + vn3(d * 2300.) * .45;
      col += vec3(1., .97, .9) * md * (2.2 - .9 * smoothstep(.45, .7, spots)) * uMoonVis; }
    col += vec3(.55, .62, .85) * (pow(cm, 2000.) * .5 + pow(cm, 120.) * .12 + pow(cm, 12.) * .04) * uMoonVis;
  }
  col += vec3(.55, .6, .8) * uFlash * smoothstep(-.1, .3, y);
  gl_FragColor = vec4(col, 1.);
}`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 1000; mesh.scale.setScalar(100);
  return { mesh, uniforms };
}

// ---------- Wolken ----------
function puffGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, r = rng(77), seen = new Map();
  for (let i = 0; i < p.count; i++) {                       // gleiche Ecken gleich verschieben → keine Risse
    const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
    let s = seen.get(k); if (!s) { s = [1 + (r() - .5) * .28, (r() - .5) * .12]; seen.set(k, s); }
    p.setXYZ(i, p.getX(i) * s[0], p.getY(i) * s[0] + s[1], p.getZ(i) * s[0]);
  }
  g.computeVertexNormals(); return g;
}
function makeClouds(maxN) {
  const uniforms = { uTime: U.uTime, uDrift: { value: new THREE.Vector2(1.6, .45) }, uWrap: { value: 1250 }, uTop: { value: new THREE.Color(1, 1, 1) },
    uBot: { value: new THREE.Color(.7, .75, .9) }, uSelf: { value: new THREE.Color(.2, .22, .26) } };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
uniform float uTime, uWrap; uniform vec2 uDrift; varying float vLy;`).replace('#include <project_vertex>', `
vec3 ic = instanceMatrix[3].xyz;
vec3 c2 = ic + vec3(uDrift.x, 0., uDrift.y) * uTime * (1. + .25 * step(-20., ic.y));
c2.xz = mod(c2.xz + uWrap, 2. * uWrap) - uWrap;
float rad = length(instanceMatrix[0].xyz);
float fade = smoothstep(uWrap, uWrap * .8, max(abs(c2.x), abs(c2.z)));
fade *= smoothstep(rad * .8, rad * 2.2 + 6., length(c2 - cameraPosition));   // nicht durch die Kamera ziehen
vec3 lp = transformed; lp.y = max(lp.y, -.38); vLy = lp.y;
vec4 mvPosition = vec4(mat3(instanceMatrix) * lp * fade + c2, 1.);
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uTop, uBot, uSelf; varying float vLy;`).replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb *= mix(uBot, uTop, smoothstep(-.38, .75, vLy));`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += uSelf * diffuseColor.rgb;`);
  };
  mat.customProgramCacheKey = () => 'clouds1';
  const mesh = new THREE.InstancedMesh(puffGeometry(), mat, maxN);
  const r = rng(4242), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  let n = 0;
  const put = (x, y, z, sx, sy, sz) => { if (n >= maxN) return; e.set(0, r() * 6.28, 0); q.setFromEuler(e); m.compose(v.set(x, y, z), q, s.set(sx, sy, sz)); mesh.setMatrixAt(n++, m); };
  // Wolken auf Inselhöhe weit draußen (zuerst, damit sie auch bei wenigen Instanzen bleiben); ziehen in x, also |z| groß
  for (let c = 0; c < 26; c++) {
    const x = (r() - .5) * 2400, z = (r() < .5 ? -1 : 1) * (300 + r() * 650), y = -6 + r() * 34, S = 9 + r() * 12, k = 3 + Math.floor(r() * 5);
    for (let i = 0; i < k; i++) { const a = r() * 6.28, d = r() * S * 1.4; put(x + Math.cos(a) * d * 1.4, y + r() * S * .3, z + Math.sin(a) * d * .6, S * (.7 + r() * .6), S * (.5 + r() * .3), S * (.6 + r() * .5)); }
  }
  // Wolkenmeer: flacher Teppich unten (mit Lücken) + Haufen obendrauf; innen klein, außen groß.
  // Gemischt, damit eine kleinere Anzahl (Qualität) gleichmäßig verteilt bleibt.
  const sea = [], ring = () => Math.pow(r(), .7) * 1250;
  for (let c = 0; c < maxN * .2; c++) {
    const rr = ring(), a = r() * 6.28, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (Math.sin(x * .011 + 1.3) * Math.sin(z * .013 - .4) > .55) continue;                 // Lücken
    const S = 18 + rr * .07 + r() * 10;
    sea.push([x, -60 - r() * 6, z, S * (1.2 + r() * .6), S * (.32 + r() * .12), S * (1 + r() * .5)]);
  }
  while (sea.length < maxN) {
    const rr = ring(), a = r() * 6.28, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (Math.sin(x * .011 + 1.3) * Math.sin(z * .013 - .4) > .45 && r() < .8) continue;
    const S = 6 + rr * .026 + r() * 5, k = 4 + Math.floor(r() * 6), top = -33 - r() * 9 - 20 * sstep(260, 40, rr);   // unter der Insel tiefer
    for (let i = 0; i < k; i++) {
      const b = r() * 6.28, d = i === 0 ? 0 : (.5 + r() * .8) * S, sz = S * (i === 0 ? 1.15 : .55 + r() * .45);
      sea.push([x + Math.cos(b) * d, top - (1 - sz / S) * S * .5 - r() * 3, z + Math.sin(b) * d, sz * (1 + r() * .35), sz * (.62 + r() * .25), sz * (.9 + r() * .4)]);
    }
  }
  for (let i = sea.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [sea[i], sea[j]] = [sea[j], sea[i]]; }
  for (const p of sea) put(...p);
  mesh.count = n; mesh.userData.max = n; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  return { mesh, uniforms };
}

// ---------- Regen, Schnee ----------
function makeRain(maxN) {
  const seed = new Float32Array(maxN * 6), e = new Float32Array(maxN * 2), r = rng(11);
  for (let i = 0; i < maxN; i++) { const a = [r(), r(), r()]; seed.set(a, i * 6); seed.set(a, i * 6 + 3); e[i * 2] = 0; e[i * 2 + 1] = 1; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(seed, 3)); g.setAttribute('e', new THREE.BufferAttribute(e, 1));
  const uniforms = { uTime: U.uTime, uC: { value: new THREE.Vector3() }, uS: { value: new THREE.Vector3(40, 30, 40) }, uAmt: { value: 0 },
    uVel: { value: new THREE.Vector3(-1.6, -13, .9) }, uLen: { value: .8 }, uCol: { value: new THREE.Color(.7, .76, .88) } };
  const mat = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime, uAmt, uLen; uniform vec3 uC, uS, uVel; attribute float e; varying float vA;
void main(){ vec3 sd = position; float pick = fract(sd.x * 91.7 + sd.z * 53.3);
  vec3 vel = uVel * (.85 + .3 * fract(sd.y * 37.1));
  vec3 lo = uC - uS * .5, p = lo + mod(sd * uS + vel * uTime - lo, uS);
  vec3 f3 = min(p - lo, lo + uS - p) / (uS * .5); float edge = smoothstep(0., .35, min(min(f3.x, f3.z), f3.y * 1.4));
  p -= normalize(vel) * uLen * e;
  vA = (1. - e * .85) * edge * step(pick, uAmt);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uAmt; varying float vA; void main(){ if (vA < .01) discard; gl_FragColor = vec4(uCol, vA * .42); }` });
  const mesh = new THREE.LineSegments(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 10;
  return { mesh, uniforms };
}
function makeSnow(maxN) {
  const pos = new Float32Array(maxN * 3), r = rng(12); for (let i = 0; i < pos.length; i++) pos[i] = r();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const uniforms = { uTime: U.uTime, uC: { value: new THREE.Vector3() }, uS: { value: new THREE.Vector3(40, 30, 40) }, uAmt: { value: 0 },
    uPx: { value: 800 }, uSize: { value: .09 }, uCol: { value: new THREE.Color(1, 1, 1) } };
  const mat = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime, uAmt, uPx, uSize; uniform vec3 uC, uS; varying float vA;
void main(){ vec3 sd = position; float pick = fract(sd.x * 91.7 + sd.z * 53.3), ph = sd.y * 40.;
  vec3 vel = vec3(.5, -1.15 - .5 * fract(sd.z * 17.3), .25);
  vec3 lo = uC - uS * .5, p = lo + mod(sd * uS + vel * uTime - lo, uS);
  p.x += sin(uTime * .9 + ph) * .45; p.z += cos(uTime * .7 + ph * 1.3) * .45;
  vec3 f3 = min(p - lo, lo + uS - p) / (uS * .5); float edge = smoothstep(0., .3, min(min(f3.x, f3.z), f3.y * 1.4));
  vec4 mv = viewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
  float px = uSize * (.6 + .8 * fract(sd.x * 13.1)) * uPx / -mv.z;
  gl_PointSize = clamp(px, 1.6, 18.); vA = edge * step(pick, uAmt) * clamp(px / 1.6, .35, 1.); }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main(){ if (vA < .01) discard; vec2 q = gl_PointCoord - .5; float a = smoothstep(.5, .15, length(q)); gl_FragColor = vec4(uCol, a * vA * .9); }` });
  const mesh = new THREE.Points(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 10;
  return { mesh, uniforms };
}

// ---------- Regenbogen: Ebene gegenüber der Sonne, Winkel aus dem Abstand zur Mitte ----------
function makeRainbow() {
  const uniforms = { uAmt: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `varying vec2 vP; varying float vY; void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.); vY = normalize(w.xyz - cameraPosition).y; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uAmt; varying vec2 vP; varying float vY;
vec3 spec(float t){ return clamp(vec3(1.5 - abs(t * 4. - 3.2) * 1.15, 1.35 - abs(t * 4. - 2.1) * 1.2, 1.3 - abs(t * 4. - .8) * 1.25), 0., 1.); }
void main(){
  float ang = degrees(atan(length(vP)));
  float t1 = (ang - 26.6) / 2.4, t2 = (36.6 - ang) / 3.2;          // verkleinert (echt 42°), damit er ins Bild passt
  vec3 c = vec3(0.);
  c += spec(clamp(t1, 0., 1.)) * smoothstep(0., .12, t1) * smoothstep(1., .85, t1);
  c += spec(clamp(t2, 0., 1.)) * smoothstep(0., .15, t2) * smoothstep(1., .8, t2) * .3;
  c += vec3(.05, .055, .06) * smoothstep(26.8, 20., ang) * smoothstep(3., 16., ang);    // innen heller
  gl_FragColor = vec4(c * uAmt * .85, 1.); }` });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * Math.tan(42 * Math.PI / 180), 2 * Math.tan(42 * Math.PI / 180)), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.visible = false;
  return { mesh, uniforms };
}

// =====================================================================================================================
export class Stage {
  constructor(canvas, { quality = 'hoch' } = {}) {
    this.canvas = canvas; this.qName = QUALITY[quality] ? quality : 'hoch'; this.q = QUALITY[this.qName];
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.info.autoReset = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, .05, 2000); this.camera.position.set(40, 40, 60); this.camera.lookAt(0, 0, 0);
    this.scene.fog = new THREE.Fog(0xc0d8ee, 80, 750);

    // Licht: eine Richtungslichtquelle (tags Sonne, nachts Mond) mit Schatten + Himmelslicht (unten: Licht vom Wolkenmeer)
    this.hemi = new THREE.HemisphereLight(0xcfe2f6, 0x9aa8bc, 1); this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff4e0, 3); sun.castShadow = true;
    sun.shadow.mapSize.set(this.q.shadow, this.q.shadow); sun.shadow.bias = -.0002;
    this.scene.add(sun, sun.target);

    this.sky = makeSky(); this.scene.add(this.sky.mesh);
    this.clouds = makeClouds(QUALITY.hoch.clouds); this.scene.add(this.clouds.mesh);
    this.rain = makeRain(QUALITY.hoch.rain); this.scene.add(this.rain.mesh);
    this.snow = makeSnow(QUALITY.hoch.snow); this.scene.add(this.snow.mesh);
    this.bow = makeRainbow(); this.scene.add(this.bow.mesh);

    // Post-FX
    this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true }));
    this.scenePass = new ScenePass(this.scene, this.camera, this.q.msaa);
    this.fxPass = new FxPass();
    this.gradePass = new GradePass(this.fxPass);
    for (const p of [this.scenePass, this.fxPass, this.gradePass]) this.composer.addPass(p);

    // Zustand
    this.time = 10; this.seasonS = 1; this.weather = 'klar'; this.filter = 'normal';
    this.tilt = null;                         // null = automatisch aus dem Fokus-Abstand (setFocus); Zahl = fest
    this.focus = new THREE.Vector3(); this.focusDist = 40; this._autoTilt = 0;
    this.sunDir = new THREE.Vector3(0, 1, 0); this.moonDir = new THREE.Vector3(0, -1, 0); this.lightDir = new THREE.Vector3(0, 1, 0);
    this.lightLevel = 1;                      // grobe Helligkeit 0…1 (für Leben/Ton)
    this.onLightning = null;                  // (stärke) => {} bei jedem Blitz (Donner verzögert abspielen)
    this.wx = { ...WEATHER.klar }; this.wxT = { ...WEATHER.klar }; this.snowAcc = 0;
    this.season = { w: [0, 1, 0, 0], snow: 0 }; this.seasonT = { w: [0, 1, 0, 0], snow: 0 };
    this.fx = structuredClone(FILTERS.normal); this.fxT = FILTERS.normal;
    this.bowAge = 1e9; this.flash = 0; this._frame = 0; this.bloomScale = 1; this._lastBolt = -1; this.t = 0; this._first = true;
    this._shadowKey = ''; this._shMaps = {};
    this._prWant = null; this._se = null; this.far = false;    // setPixelRatio(), shadowEvery, Gesamtansicht (setFocus)

    this.setTime(this.time); this.setSeason(this.seasonS, true); this.setWeather('klar', true);
    this.setQuality(this.qName);
    this.resize();
    if (typeof ResizeObserver !== 'undefined') { this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(canvas); }
  }

  // ---------------- Qualität / Größe ----------------
  setQuality(name) {
    if (!QUALITY[name]) return; this.qName = name; const q = this.q = QUALITY[name];
    const sh = this.sun.shadow, keep = new Set([q.shadow, q.shadowFar || q.shadow]), maps = {};      // Karten anderer Größen freigeben
    for (const m of [...Object.values(this._shMaps), sh.map]) if (m) { if (keep.has(m.width) && m !== sh.map) maps[m.width] = m; else if (!keep.has(m.width)) { m.dispose(); if (m === sh.map) sh.map = null; } }
    this._shMaps = maps; this._shadowSize(this._wantShadow());
    this.scenePass.setSamples(q.msaa);
    this.fxPass.bloom = q.bloom;
    this.clouds.mesh.count = Math.min(this.clouds.mesh.userData.max, q.clouds);
    this.rain.mesh.geometry.setDrawRange(0, q.rain * 2); this.snow.mesh.geometry.setDrawRange(0, q.snow);
    this._shadowKey = ''; this.resize();
  }
  // Pixel-Verhältnis von außen (dynamische Auflösung): r > 0 fest, null/0 = aus der Qualitätsstufe (q.dpr, Bildschirm).
  // Kompatibel: wer stage.q als Kopie mit anderem dpr setzt und resize() ruft, bekommt weiter dieses dpr.
  setPixelRatio(r) { this._prWant = r > 0 ? r : null; this.resize(); }
  // Schatten nur jedes n-te Bild neu rendern (null = aus der Qualitätsstufe bzw. stage.q.shadowEvery)
  get shadowEvery() { return this._se ?? this.q.shadowEvery ?? 1; }
  set shadowEvery(n) { this._se = n > 0 ? Math.round(n) : null; }
  resize() {
    const w = Math.max(1, this.canvas.clientWidth || innerWidth), h = Math.max(1, this.canvas.clientHeight || innerHeight);
    const pr = this._prWant ?? Math.min(window.devicePixelRatio || 1, this.q.dpr);
    if (w === this.width && h === this.height && pr === this.pr) return;
    this.width = w; this.height = h; this.pr = pr; this._applySize(pr);
  }
  _applySize(pr) {
    const { width: w, height: h } = this;
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(pr); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.gradePass.uniforms.uPx.value = pr; this.gradePass.uniforms.uAspect.value = w / h;
    this.snow.uniforms.uPx.value = h * pr / (2 * Math.tan(this.camera.fov * Math.PI / 360));
  }

  // ---------------- Tageszeit ----------------
  setTime(h) {
    this.time = ((h % 24) + 24) % 24; this._lightDirty = true;
  }
  _sky() {
    const h = this.time, sw = this.season.w;
    let maxE = 0; for (let i = 0; i < 4; i++) maxE += sw[i] * SEASON_LOOK[i].ele;
    const th = Math.PI * (h - 6) / 12, e = maxE * Math.PI / 180 * Math.sin(th);
    const Hx = -Math.cos(th), Hz = Math.sin(th) * .55 + .45;                 // Bahn: Ost (−x) → Süd (+z) → West (+x)
    const hl = Math.hypot(Hx, Hz);
    this.sunDir.set(Hx / hl * Math.cos(e), Math.sin(e), Hz / hl * Math.cos(e)).normalize();
    const em = -e * .85 + .12, mth = th + Math.PI + .45, mx = -Math.cos(mth), mz = Math.sin(mth) * .55 + .45, ml = Math.hypot(mx, mz);
    this.moonDir.set(mx / ml * Math.cos(em), Math.sin(em), mz / ml * Math.cos(em)).normalize();
    const eDeg = e * 180 / Math.PI; this.sunElev = eDeg;
    // Schlüsselbilder mischen
    let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] < eDeg) i++;
    const A = SKY_KEYS[i], B = SKY_KEYS[i + 1], t = sstep(0, 1, clamp((eDeg - A[0]) / (B[0] - A[0]), 0, 1));
    const mix = j => (this._c[j] ||= new THREE.Color()).copy(A[j]).lerp(B[j], t);
    this._c ||= [];
    return { e: eDeg, zen: mix(1), hor: mix(2), glow: mix(3), sunC: mix(4), sunI: lerp(A[5], B[5], t), hemiC: mix(6), hemiI: lerp(A[7], B[7], t), fogC: mix(8) };
  }

  // ---------------- Jahreszeit ----------------
  setSeason(s, instant = false) {
    this.seasonS = ((s % 4) + 4) % 4;
    const w = [0, 1, 2, 3].map(c => sstep(1, 0, cyc(this.seasonS, c))), sum = w.reduce((a, b) => a + b, 0) || 1;
    this.seasonT = { w: w.map(x => x / sum), snow: sstep(.62, .2, cyc(this.seasonS, 3)) };
    if (instant || this._first) this.season = structuredClone(this.seasonT);
  }

  // ---------------- Wetter ----------------
  setWeather(name, instant = false) {
    if (!WEATHER[name]) return;
    const wasRain = this.wxT.rain > .5; this.weather = name; this.wxT = { ...WEATHER[name] };
    if (wasRain && this.wxT.rain < .5 && !instant) this.bowAge = 0;      // nach dem Regen: Regenbogen
    if (instant) { this.wx = { ...this.wxT }; this.snowAcc = name === 'schnee' ? 1 : 0; }
  }
  // Regenbogen von Hand (Fotomodus/Test): a = Stärke 0…1
  showRainbow(a = 1) { this.bowAge = a > 0 ? 8 : 1e9; this._bowForce = a; }

  // ---------------- Filter ----------------
  setFilter(name) { if (FILTERS[name]) { this.filter = name; this.fxT = FILTERS[name]; if (this._first) this.fx = structuredClone(this.fxT); } }

  // ---------------- Fokus (Schatten, Tilt-Shift, Partikel) ----------------
  setFocus(target, distance) {
    this.focus.copy(target); this.focusDist = Math.max(.3, distance);
    this._autoTilt = sstep(15, 70, distance);
    if (this.far ? distance < FAR_OUT : distance > FAR_IN) this.far = !this.far;
  }
  _wantShadow() { return this.far && !this._capturing ? (this.q.shadowFar || this.q.shadow) : this.q.shadow; }
  // Schattenkarten-Größe wechseln, ohne neu anzulegen: jede Größe behält ihre eigene Karte (three legt sie beim ersten Mal an)
  _shadowSize(size) {
    const sh = this.sun.shadow; if (sh.mapSize.x === size && (!sh.map || sh.map.width === size)) return;
    if (sh.map) this._shMaps[sh.map.width] = sh.map;
    sh.mapSize.set(size, size); sh.map = this._shMaps[size] || null; this._shadowKey = ''; this._shadowJump = true;
  }
  _updateShadow() {
    this._shadowSize(this._wantShadow());
    const s = this.sun.shadow, cam = s.camera, size = s.mapSize.x;
    let half = clamp(this.focusDist * .8, 5, 150); half = Math.pow(1.12, Math.ceil(Math.log(half) / Math.log(1.12)));   // Stufen → kein Flimmern beim Zoomen
    const L = this.lightDir, right = this._r ||= new THREE.Vector3(), up = this._u ||= new THREE.Vector3();
    right.crossVectors(this._Y ||= new THREE.Vector3(0, 1, 0), L).normalize(); up.crossVectors(L, right);
    const texel = 2 * half / size, f = this.focus;
    const u = Math.round(f.dot(right) / texel) * texel, v = Math.round(f.dot(up) / texel) * texel, w = f.dot(L);
    const c = (this._sc ||= new THREE.Vector3()).copy(right).multiplyScalar(u).addScaledVector(up, v).addScaledVector(L, w);
    if (!this._lastSC || this._lastSC.distanceTo(c) > half * .08 || (this._lastL && this._lastL.dot(L) < .9995)) { this._shadowJump = true; (this._lastSC ||= new THREE.Vector3()).copy(c); (this._lastL ||= new THREE.Vector3()).copy(L); }
    const R = half * 1.6 + 80;
    this.sun.position.copy(c).addScaledVector(L, R); this.sun.target.position.copy(c); this.sun.target.updateMatrixWorld();
    const key = half + ':' + size;
    if (key !== this._shadowKey) {
      this._shadowKey = key; this._shadowJump = true; Object.assign(cam, { left: -half, right: half, top: half, bottom: -half, near: 1, far: R + half * 1.6 + 120 });
      cam.updateProjectionMatrix(); s.normalBias = texel * 1.4; s.bias = -.00012;
    }
  }

  // ---------------- Bild für Bild ----------------
  update(dt = 1 / 60, t = this.t + dt) {
    dt = clamp(dt, 0, .25); this.t = t; U.uTime.value = t;
    const k = this._first ? 1 : damp(.45, dt);
    // Überblendungen
    for (const key of Object.keys(this.wx)) this.wx[key] = lerp(this.wx[key], this.wxT[key], k);
    const ks = this._first ? 1 : damp(.8, dt);
    for (let i = 0; i < 4; i++) this.season.w[i] = lerp(this.season.w[i], this.seasonT.w[i], ks);
    this.season.snow = lerp(this.season.snow, this.seasonT.snow, ks);
    this.snowAcc = lerp(this.snowAcc, this.wxT.snow > .5 ? 1 : 0, this._first ? 0 : damp(1 / 35, dt));
    const kf = this._first ? 1 : damp(4, dt);
    for (const key of Object.keys(this.fx)) { const a = this.fx[key], b = this.fxT[key];
      if (Array.isArray(a)) for (let i = 0; i < a.length; i++) a[i] = lerp(a[i], b[i], kf); else this.fx[key] = lerp(a, b, kf); }
    this.bowAge += dt;
    this._first = false;

    const sw = this.season.w, wx = this.wx;
    U.uSpring.value = sw[0]; U.uSummer.value = sw[1]; U.uAutumn.value = sw[2];
    U.uSnow.value = clamp(Math.max(this.season.snow, this.snowAcc * .85), 0, 1);
    U.uRain.value = clamp(wx.rain, 0, 1); U.uWind.value = wx.wind;

    // Blitz (reine Funktion von t)
    const W = 2.9, kb = Math.floor(t / W), rb = hash1(kb), t0 = kb * W + hash1(kb + 999) * W * .6, lt = t - t0;
    let fl = 0;
    if (wx.storm > .05 && rb < .42 && lt >= 0) {
      fl = (Math.exp(-lt * 16) + (lt > .16 ? Math.exp(-(lt - .16) * 9) * .8 : 0) + (lt > .4 ? Math.exp(-(lt - .4) * 12) * .45 : 0)) * wx.storm;
      if (kb !== this._lastBolt && lt < .5) { this._lastBolt = kb; this.onLightning?.(clamp(wx.storm, 0, 1)); }
    }
    this.flash = clamp(fl, 0, 1.5);

    this._applyLight();
    // Wolken ziehen mit dem Wind
    this.clouds.uniforms.uDrift.value.set(1.4 * (.6 + wx.wind * .4), .4);
    // Regen/Schnee um das Ziel
    const S = clamp(this.focusDist * .75, 14, 110);
    for (const P of [this.rain, this.snow]) { P.uniforms.uS.value.set(S * 1.6, S * 1.1, S * 1.6); P.uniforms.uC.value.set(this.focus.x, this.focus.y + S * .25, this.focus.z); }
    this.rain.uniforms.uAmt.value = clamp(wx.rain, 0, 1); this.rain.uniforms.uLen.value = clamp(S * .03, .5, 3);
    this.rain.uniforms.uVel.value.set(-1.6 * wx.wind, -13, .9 * wx.wind);
    this.rain.mesh.visible = wx.rain > .01; this.snow.mesh.visible = wx.snow > .01;
    this.snow.uniforms.uAmt.value = clamp(wx.snow, 0, 1); this.snow.uniforms.uSize.value = .08 * Math.max(1, S / 30);
  }

  _applyLight() {
    const K = this._sky(), sw = this.season.w, wx = this.wx, sky = this.sky.uniforms;
    // Jahreszeit-Look mischen
    const sc = [0, 0, 0], hc = [0, 0, 0]; let si = 0, ss = 0;
    for (let i = 0; i < 4; i++) { const L = SEASON_LOOK[i]; for (let j = 0; j < 3; j++) { sc[j] += L.sun[j] * sw[i]; hc[j] += L.hemi[j] * sw[i]; } si += L.si * sw[i]; ss += L.sky * sw[i]; }
    const over = clamp(wx.over, 0, 1), fogW = clamp(wx.fog, 0, 1), night = sstep(4, -7, K.e);
    U.uNight.value = night;
    const hx = ((this.time - 22) % 24 + 24) % 24; U.uLate.value = sstep(1, 3.5, hx) * sstep(8.5, 6.5, hx);   // spät nachts (≈ 0–5 Uhr): Fenster gehen aus
    const grey = (this._grey ||= new THREE.Color());
    // Himmel
    const desat = (c, a) => { const l = c.r * .3 + c.g * .55 + c.b * .15; c.r = lerp(l, c.r, a); c.g = lerp(l, c.g, a); c.b = lerp(l, c.b, a); return c; };
    desat(K.zen, ss); desat(K.hor, lerp(1, ss, .6));
    const lum = K.hor.r * .3 + K.hor.g * .55 + K.hor.b * .15;
    grey.setRGB(lum * .78, lum * .82, lum * .9).multiplyScalar(1 - wx.storm * .45);
    sky.uZen.value.copy(K.zen); sky.uHor.value.copy(K.hor); sky.uGlow.value.copy(K.glow);
    sky.uGlowAmt.value = sstep(18, 4, K.e) * sstep(-11, -2, K.e) * (1 - over * .8);
    sky.uOverC.value.copy(grey); sky.uOver.value = over;
    sky.uSunDir.value.copy(this.sunDir); sky.uMoonDir.value.copy(this.moonDir);
    sky.uSunC.value.copy(K.glow);
    sky.uSunVis.value = sstep(-3, 1, K.e) * (1 - over * .92) * (1 - fogW * .6);
    sky.uMoonVis.value = sstep(-1, -8, K.e) * sstep(-.05, .08, this.moonDir.y) * (1 - over * .85);
    sky.uStars.value = sstep(-5, -14, K.e) * (1 - over * .9) * (1 - fogW * .7);
    sky.uFlash.value = this.flash * .9;
    // Dunst
    const fogC = this.scene.fog.color.copy(K.fogC).lerp(grey, Math.max(over * .75, fogW * .55));
    sky.uFogC.value.copy(fogC);
    const fFar = 1 / lerp(1 / 760, 1 / 55, fogW) * (1 - over * .35);
    this.scene.fog.far = fFar; this.scene.fog.near = lerp(70, 2, fogW);
    // Licht: Sonne, unter dem Horizont der Mond
    const sunUp = K.e > -4;
    this.lightDir.copy(sunUp ? this.sunDir : this.moonDir);
    if (this.lightDir.y < .2) { this.lightDir.y = .2; this.lightDir.normalize(); }       // Licht nie flacher als ~11° (Boden bleibt beleuchtet, Schatten endlich)
    const dim = (1 - over * .82) * (1 - fogW * .45);
    if (sunUp) {
      this.sun.color.copy(K.sunC).multiply(grey.setRGB(sc[0], sc[1], sc[2]));
      this.sun.intensity = K.sunI * si * dim * sstep(-4.5, 0, K.e);
    } else {
      this.sun.color.setRGB(.6, .7, 1);                                              // Mondlicht: kühl, hell genug für Formen
      this.sun.intensity = 1.1 * sstep(-4, -7.5, K.e) * lerp(.55, 1, sstep(.02, .2, this.moonDir.y)) * (1 - over * .8);
    }
    const hemiStorm = (1 - wx.storm * .42) * (1 - over * .12);
    this.hemi.color.copy(K.hemiC).multiply(grey.setRGB(hc[0], hc[1], hc[2])); this.hemi.color.lerp(fogC, Math.max(over, fogW) * .5);
    this.hemi.groundColor.copy(fogC).multiplyScalar(.62).lerp(K.hemiC, .25);
    this.hemi.intensity = K.hemiI * hemiStorm * (1 - over * .15) + this.flash * 3.5;
    this.lightLevel = clamp((this.sun.intensity * .3 + this.hemi.intensity * .5) / 1.4, 0, 1);
    // Wolken
    const cu = this.clouds.uniforms;
    cu.uTop.value.setRGB(1, 1, 1).lerp(grey, over * .5).multiplyScalar(1 - wx.storm * .35);
    cu.uBot.value.copy(K.zen).lerp(K.hor, .5).lerp(grey, .3).multiplyScalar(.85).lerp(cu.uTop.value, .25);
    cu.uSelf.value.copy(fogC).multiplyScalar(lerp(.32, .18, night)).addScalar(this.flash * .4);
    cu.uSelf.value.lerp(K.glow, sky.uGlowAmt.value * .22);
    // Regen-/Schneefarbe folgt dem Licht
    this.rain.uniforms.uCol.value.copy(fogC).lerp(grey.setRGB(.75, .8, .9), .5).multiplyScalar(.55 + this.lightLevel * .6 + this.flash);
    this.snow.uniforms.uCol.value.setRGB(1, 1, 1).multiplyScalar(.35 + this.lightLevel * .75 + this.flash);
    // Regenbogen
    const bow = this.bowAge < 1e8 ? (this._bowForce ?? 1) * sstep(0, 5, this.bowAge) * sstep(55, 30, this.bowAge) * (1 - clamp(wx.rain, 0, 1)) * sstep(1, 6, K.e) : 0;
    if (this.bowAge > 60) this._bowForce = undefined;
    this.bow.uniforms.uAmt.value = bow; this.bow.mesh.visible = bow > .003;
    // Belichtung, Bloom, Grading
    const g = this.gradePass.uniforms, fx = this.fx;
    this.renderer.toneMappingExposure = lerp(1, 1.5, night) * (1 - over * .1) * (1 - wx.storm * .22);
    g.uGain.value = fx.gain;
    const gold = sstep(22, 6, K.e) * sstep(-4, 2, K.e) * (1 - over);                     // Gold-Stunde: wärmer
    g.uTint.value.set(fx.tint[0] * lerp(1, .86, night) * (1 + .09 * gold), fx.tint[1] * lerp(1, .95, night) * (1 + .04 * gold), fx.tint[2] * lerp(1, 1.18, night) * (1 - .12 * gold));
    g.uGreen.value = Math.max(night * .6, gold * .3);                                   // Grünstich dämpfen (Dämmerung, Nacht)
    g.uLift.value.set(...fx.lift); g.uSat.value = fx.sat * (1 - over * .22) * lerp(1, .72, night) * (1 - .1 * gold); g.uCon.value = fx.con; g.uMono.value = fx.mono;
    g.uVig.value = fx.vig; g.uGrain.value = fx.grain; g.uTime.value = this.t; g.uFlash.value = this.flash * .25;
    g.uBloom.value = this.fxPass.bloom ? lerp(.1, .6, night) * fx.bloom * this.bloomScale : 0; this.fxPass.threshold = lerp(1.5, .85, night);
    g.uBloomW.value.set(.55, .8, lerp(.8, 1.2, night));
  }

  render() {
    const cam = this.camera;
    cam.updateMatrixWorld();
    U.uUpView.value.set(0, 1, 0).transformDirection(cam.matrixWorldInverse);
    this.sky.mesh.position.copy(cam.position);
    // Regenbogen: gegenüber der Sonne, vom Betrachter aus gesehen
    if (this.bow.mesh.visible) {
      const D = clamp(cam.position.distanceTo(this.focus) + 140, 200, 900), m = this.bow.mesh;   // hinter der Insel, vor dem meisten Wolkenmeer
      m.position.copy(cam.position).addScaledVector(this.sunDir, -D); m.scale.setScalar(D); m.lookAt(cam.position);
    }
    this._updateShadow();
    const tilt = Math.max(this.tilt ?? this._autoTilt, this.fx.tilt);
    this.fxPass.tilt = tilt > .01 ? tilt : 0;
    const g = this.gradePass.uniforms; g.uBand.value = lerp(lerp(.24, .12, tilt), .09, this.fx.tilt); g.uRamp.value = lerp(.36, .26, this.fx.tilt);
    g.uFxaa.value = this.scenePass.samples > 0 ? 0 : 1;
    // Schatten: nur jedes n-te Bild neu (bewegt sich langsam), sofort bei Sprung von Fokus/Licht
    const sm = this.renderer.shadowMap; sm.autoUpdate = false;
    if (++this._frame % this.shadowEvery === 0 || this._shadowJump) { sm.needsUpdate = true; this._shadowJump = false; }
    this.renderer.info.reset(); this.composer.render();
  }

  // PNG in scale-facher Auflösung; der Bildschirm wird danach sofort wieder gleich gezeichnet
  capture(scale = 1, type = 'image/png') {
    const max = Math.min(this.renderer.capabilities.maxTextureSize, 8192);
    const pr = Math.min(this.pr * scale, max / this.width, max / this.height);
    const ms = this.scenePass.samples; this.scenePass.setSamples(4); this._shadowJump = true; this._capturing = true;   // Foto: volle Schattenkarte
    this._applySize(pr); this.render();
    const url = this.renderer.domElement.toDataURL(type);
    this._capturing = false; this._shadowJump = true;
    this.scenePass.setSamples(ms); this._applySize(this.pr); this.render();
    return url;
  }

  dispose() { this._ro?.disconnect(); for (const m of Object.values(this._shMaps)) m.dispose(); this.composer.dispose?.(); this.renderer.dispose(); }
}
