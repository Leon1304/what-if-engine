// Fließband – Bühne: Renderer (Antialias, weiche Schatten, ACES), Licht, Himmel und Nebel je Welt, leichte Post-FX
// (MSAA → Bloom → Grading/Vignette), Qualitätsstufen, Bildschirm ↔ Feld.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { U, BELT } from './materials.js';

const clamp = (x, a, b) => x < a ? a : x > b ? b : x;

export const QUALITY = {
  hoch:    { dpr: 2,    shadow: 4096, msaa: 4, post: true,  bloom: true },
  mittel:  { dpr: 1.5,  shadow: 2048, msaa: 2, post: true,  bloom: true },
  niedrig: { dpr: 1,    shadow: 1024, msaa: 0, post: false, bloom: false },
};

// Himmel, Nebel und Licht je Welt
export const BIOME_LOOK = {
  wiese: { zen: 0x5aa4e6, hor: 0xd6ecf4, fog: 0xcfe4ee, sun: 0xfff0d4, sunI: 2.3, hemiS: 0xd4e8ff, hemiG: 0x8f9a6a, hemiI: .75, exp: 1.0, sat: 1.12, stars: 0, grid: 0x1e3a12, sunDir: [.55, 1, .35] },
  wueste: { zen: 0x5f9fd8, hor: 0xf6dcae, fog: 0xf0d8ae, sun: 0xffe0b0, sunI: 2.6, hemiS: 0xf0e2c8, hemiG: 0xc49a66, hemiI: .7, exp: 1.0, sat: 1.1, stars: 0, grid: 0x5a3a12, sunDir: [.4, 1, .5] },
  eis: { zen: 0x7fb0e0, hor: 0xeaf2fa, fog: 0xe2ecf6, sun: 0xf2f6ff, sunI: 2.2, hemiS: 0xdceaff, hemiG: 0xa8bcd4, hemiI: .7, exp: .9, sat: 1.05, stars: 0, grid: 0x24405a, sunDir: [.6, .8, .3] },
  mond: { zen: 0x02030a, hor: 0x161a2c, fog: 0x0c0e18, sun: 0xffffff, sunI: 2.8, hemiS: 0x55607e, hemiG: 0x2a2a30, hemiI: .55, exp: 1.08, sat: 1.0, stars: 1, grid: 0xb8c0d8, sunDir: [.7, .9, .2] },
};

function makeSky() {
  const uniforms = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uStars: { value: 0 }, uTime: U.uTime, uSun: { value: new THREE.Vector3(0, 1, 0) } };
  const mat = new THREE.ShaderMaterial({
    uniforms, depthWrite: false, side: THREE.BackSide, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uZen, uHor, uFog, uSun; uniform float uStars, uTime; varying vec3 vDir;
vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float starL(vec3 d, float sc, float dens, float sz){ vec3 p = d * sc, c = floor(p), r = h33(c); if (r.x > dens) return 0.;
  vec3 sp = c + .3 + .4 * h33(c + 17.3); float px = length(fwidth(p)) * .7, s = sz * (.45 + .9 * r.y);
  return (1. - smoothstep(s, s + px, length(p - sp))) * (.6 + .4 * sin(uTime * (1. + 3. * r.z) + r.y * 50.)) * (.4 + 1.3 * r.y * r.y) * s / max(s, px); }
void main(){ vec3 d = normalize(vDir); float y = d.y;
  vec3 c = mix(uHor, uZen, pow(smoothstep(0., 1., max(y, 0.)), .55));
  c = mix(c, uFog, smoothstep(.06, -.12, y));
  float cs = max(dot(d, normalize(uSun)), 0.); c += vec3(1., .92, .75) * (pow(cs, 500.) * 4. + pow(cs, 30.) * .18) * (1. - uStars * .5);
  if (uStars > .01) {
    c += vec3(.85, .9, 1.) * (starL(d, 190., .12, .1) + starL(d, 90., .05, .08) * 1.6) * uStars * smoothstep(-.02, .2, y);
    // Erde am Mondhimmel
    vec3 ed = normalize(vec3(-.55, .42, -.72)); float ce = dot(d, ed);
    if (ce > .995) { vec3 q = normalize(d - ed * ce); float e = smoothstep(.995, .9956, ce);
      float land = step(.55, fract(sin(dot(floor(q.xz * 260.), vec2(12.9, 78.2))) * 43758.5));
      vec3 earth = mix(vec3(.16, .4, .85), vec3(.3, .6, .3), land * .7); earth = mix(earth, vec3(1.), step(.75, fract(q.y * 40. + q.x * 22.)) * .4);
      float lit = smoothstep(-.2, .5, dot(q, normalize(vec3(.6, .3, .2))));
      c = mix(c, earth * (.15 + 1.1 * lit), e); }
    c += vec3(.3, .5, 1.) * pow(max(ce, 0.), 900.) * .4;
  }
  gl_FragColor = vec4(c, 1.); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), mat); mesh.frustumCulled = false; mesh.renderOrder = -1000; mesh.scale.setScalar(900);
  return { mesh, uniforms };
}

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uSat: { value: 1.1 }, uVig: { value: .22 }, uLift: { value: .015 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uVig, uLift; varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){ vec4 t = texture2D(tDiffuse, vUv); vec3 c = t.rgb; float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(l), c, uSat); c = c + uLift * (1. - c);
  vec2 q = vUv - .5; c *= 1. - uVig * smoothstep(.25, .85, length(q) * 1.2);
  c += (h12(gl_FragCoord.xy) + h12(gl_FragCoord.yx + 7.1) - 1.) / 255.;
  gl_FragColor = vec4(clamp(c, 0., 1.), t.a); }`,
};

export class Stage {
  constructor(canvas, { quality = 'hoch', biome = 'wiese' } = {}) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: false });
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.info.autoReset = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, .1, 1500); this.camera.position.set(20, 24, 20); this.camera.lookAt(8, 0, 8);
    this.scene.fog = new THREE.Fog(0xcfe4ee, 60, 220);
    const pm = new THREE.PMREMGenerator(r); this.env = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose();
    this.scene.environment = this.env;
    this.hemi = new THREE.HemisphereLight(0xd4e8ff, 0x8f9a6a, 1); this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff0d4, 2.7); sun.castShadow = true; sun.shadow.bias = -.0003; sun.shadow.radius = 3;
    this.scene.add(sun, sun.target);
    this.fill = new THREE.DirectionalLight(0xbcd4ff, .35); this.fill.position.set(-1, .6, -1); this.scene.add(this.fill);
    this.sky = makeSky(); this.scene.add(this.sky.mesh);
    this.focus = new THREE.Vector3(8, 0, 8); this.focusDist = 30; this.sunDir = new THREE.Vector3(.55, 1, .35).normalize();
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.t = 0; this.grid = 0; this.gridT = 0; this.shadowEvery = 1;
    this.setQuality(quality); this.setBiome(biome);
    this.resize();
    if (typeof ResizeObserver !== 'undefined') { this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(canvas); }
  }

  setQuality(name) {
    if (!QUALITY[name]) name = 'hoch'; this.qName = name; const q = this.q = QUALITY[name];
    const s = this.sun.shadow; if (s.mapSize.x !== q.shadow) { s.mapSize.set(q.shadow, q.shadow); s.map?.dispose(); s.map = null; }
    this.composer?.dispose?.(); this.composer = null;
    if (q.post) {
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: q.msaa });
      const c = this.composer = new EffectComposer(this.renderer, rt);
      c.addPass(new RenderPass(this.scene, this.camera));
      if (q.bloom) { this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .35, .45, 1.9); c.addPass(this.bloom); } else this.bloom = null;
      c.addPass(new OutputPass());
      this.grade = new ShaderPass(GradeShader); c.addPass(this.grade);
    }
    this._sized = null; this.resize();
  }
  resize() {
    const w = Math.max(1, this.canvas.clientWidth || innerWidth), h = Math.max(1, this.canvas.clientHeight || innerHeight);
    const pr = Math.min(window.devicePixelRatio || 1, this.q.dpr), key = w + 'x' + h + '@' + pr;
    if (key === this._sized) return; this._sized = key; this.width = w; this.height = h; this.pr = pr;
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
    if (this.composer) { this.composer.setPixelRatio(pr); this.composer.setSize(w, h); if (this.bloom) this.bloom.resolution.set(w * pr / 2, h * pr / 2); }
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  setBiome(name) {
    const L = this.look = BIOME_LOOK[name] || BIOME_LOOK.wiese; this.biome = BIOME_LOOK[name] ? name : 'wiese';
    const s = this.sky.uniforms; s.uZen.value.set(L.zen); s.uHor.value.set(L.hor); s.uFog.value.set(L.fog); s.uStars.value = L.stars;
    this.scene.fog.color.set(L.fog); this.sun.color.set(L.sun); this.sun.intensity = L.sunI;
    this.hemi.color.set(L.hemiS); this.hemi.groundColor.set(L.hemiG); this.hemi.intensity = L.hemiI;
    this.fill.intensity = L.stars ? .5 : .35; this.renderer.toneMappingExposure = L.exp;
    this.sunDir.set(...L.sunDir).normalize(); s.uSun.value.copy(this.sunDir);
    U.uGridColor.value.set(L.grid);
    if (this.grade) this.grade.uniforms.uSat.value = L.sat;
    this.scene.environmentIntensity = L.stars ? .3 : .45;
  }
  // Raster einblenden (weich)
  setGrid(on) { this.gridT = on ? 1 : 0; }
  // Kamera-Ziel und -Abstand: Schatten folgen, Nebel passt sich an
  setFocus(target, dist) { this.focus.copy(target); this.focusDist = Math.max(2, dist); }

  update(dt = 1 / 60) {
    dt = clamp(dt, 0, .25); this.t += dt; U.uTime.value = this.t; U.uBeltPhase.value = (U.uBeltPhase.value + BELT.speed * dt) % 1000;
    this.grid += (this.gridT - this.grid) * (1 - Math.exp(-10 * dt)); U.uGrid.value = this.grid;
  }
  _shadow() {
    const s = this.sun.shadow, cam = s.camera, size = s.mapSize.x;
    let half = clamp(this.focusDist * .95, 8, 120); half = Math.pow(1.15, Math.ceil(Math.log(half) / Math.log(1.15)));
    const L = this.sunDir, right = (this._r ||= new THREE.Vector3()).crossVectors(new THREE.Vector3(0, 1, 0), L).normalize(), up = (this._u ||= new THREE.Vector3()).crossVectors(L, right);
    const texel = 2 * half / size, f = this.focus;
    const u = Math.round(f.dot(right) / texel) * texel, v = Math.round(f.dot(up) / texel) * texel, w = f.dot(L);
    const c = new THREE.Vector3().copy(right).multiplyScalar(u).addScaledVector(up, v).addScaledVector(L, w);
    const R = half + 60;
    if (!this._sc || this._sc.distanceToSquared(c) > 1e-10) { (this._sc ||= new THREE.Vector3()).copy(c); this._smoved = true; }
    this.sun.position.copy(c).addScaledVector(L, R); this.sun.target.position.copy(c); this.sun.target.updateMatrixWorld();
    const key = half + ':' + size;
    if (key !== this._sk) { this._smoved = true; this._sk = key; Object.assign(cam, { left: -half, right: half, top: half, bottom: -half, near: 1, far: R + half + 60 }); cam.updateProjectionMatrix(); s.normalBias = texel * 1.2; }
    const d = this.focusDist; this.scene.fog.near = d * 1.5 + 10; this.scene.fog.far = d * 4.5 + 60;
  }
  render() {
    this.resize();
    const cam = this.camera; cam.updateMatrixWorld(); this.sky.mesh.position.copy(cam.position);
    this._shadow();
    // Schatten nur jedes n-te Bild neu (große Fabriken), sofort bei bewegter Schattenkamera
    const sm = this.renderer.shadowMap, every = Math.max(1, this.shadowEvery | 0);
    sm.autoUpdate = every === 1;
    if (every > 1) { this._sf = ((this._sf || 0) + 1) % every; if (this._smoved || this._sf === 0) sm.needsUpdate = true; }
    this._smoved = false;
    this.renderer.info.reset();
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, cam);
  }

  // Bildschirm (Client-Pixel) → Feld auf der Bodenebene (y = planeY)
  screenToCell(x, y, planeY = 0) {
    const r = this.canvas.getBoundingClientRect(), nd = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(nd, this.camera); this.plane.constant = -planeY;
    const p = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3()); if (!p) return null;
    return { x: Math.floor(p.x), y: Math.floor(p.z), wx: p.x, wz: p.z };
  }
  // Welt → Bildschirm (Client-Pixel)
  screenPos(w) {
    const v = new THREE.Vector3(...(Array.isArray(w) ? w : [w.x, w.y, w.z])).project(this.camera), r = this.canvas.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, visible: v.z > -1 && v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05 };
  }
  // PNG (für Fotos/Tests)
  capture(type = 'image/png') { this.render(); return this.renderer.domElement.toDataURL(type); }
  dispose() { this._ro?.disconnect(); this.composer?.dispose?.(); this.env.dispose(); this.renderer.dispose(); }
}
