// Atmosphere: morning ground mist, fireflies on warm nights, shooting stars (rarely a fireball that drops a meteorite),
// rain drumming on the roof above you.
// Ground mist is height fog in every material's fog shader (ShaderChunk below): it lies in the low parts of the valley – over the
// lake, the meadows, the village – and thins out upwards, so hills and the lookout tower stick out of it. In the mountains it is a
// sea of mist below the hut. Its uniforms (uMist, uMistColor) are written straight into every compiled program once per frame.
import * as THREE from 'three';
import { creekX } from './life.js';
import { LAKES } from './regions.js';

const C = THREE.ShaderChunk;
C.fog_pars_vertex = `#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vFogWorld;
#endif`;
// world position from the view-space position: w = Rᵀ·mv + camera (works for meshes, instances, points, lines and sprites alike)
C.fog_vertex = `#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vFogWorld = transpose( mat3( viewMatrix ) ) * mvPosition.xyz + cameraPosition;
#endif`;
C.fog_pars_fragment = `#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vFogWorld;
	uniform vec4 uMist;
	uniform vec3 uMistColor;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`;
C.fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	float mistH = clamp( ( uMist.y - vFogWorld.y ) / uMist.z, 0.0, 1.0 );
	float mist = uMist.x * mistH * mistH * ( 3.0 - 2.0 * mistH ) * ( 1.0 - exp( - vFogDepth * uMist.w ) );
	vec3 fogC = mix( fogColor, uMistColor, mist / max( mist + fogFactor, 1e-4 ) );
	fogFactor = 1.0 - ( 1.0 - fogFactor ) * ( 1.0 - mist );
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogC, fogFactor );
#endif`;

const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// fireflies: soft glowing points, size in metres (attenuated), each blinks on its own rhythm
const FLY_N = 140;
const flyMat = new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uA: { value: 0 }, uScale: { value: 600 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float phase; uniform float uT; uniform float uScale; varying float vB;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
      float s = sin(uT * (0.7 + 0.5 * fract(phase * 7.13)) + phase * 6.283); vB = pow(max(0.0, s), 3.0);
      gl_PointSize = clamp(0.32 * uScale / -mv.z, 2.0, 22.0); }`,
  fragmentShader: `uniform float uA; varying float vB;
    void main() { vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard;
      float core = smoothstep(0.35, 0.0, r), halo = (1.0 - r) * (1.0 - r) * 0.35;
      gl_FragColor = vec4(vec3(0.78, 1.0, 0.36) * (core * 1.7 + halo * 1.4) * vB * uA, 1.0); }`,
});

export class Mood {
  constructor(game) {
    this.g = game; this.mist = 0; this.mistTop = 2.5; this.mistColor = new THREE.Color('#dfe4e6'); this.seen = new Set();
    // fireflies
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(FLY_N * 3), ph = new Float32Array(FLY_N);
    for (let i = 0; i < FLY_N; i++) ph[i] = Math.random();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
    this.flies = new THREE.Points(geo, flyMat); this.flies.frustumCulled = false; this.flies.visible = false; game.scene.add(this.flies);
    this.home = Array.from({ length: FLY_N }, () => null); this.flyA = 0;
    // shooting stars: a short streak with a fading tail, far away like the stars (no fog)
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 1, 1, 0, 0, 0]), 3));
    this.star = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.star.frustumCulled = false; this.star.visible = false; game.scene.add(this.star);
    this.starT = 20 + Math.random() * 30; this.shoot = null; this.dripT = 0;
  }
  get S() { return this.g.S; }
  // ---------------------------------------------------------------- morning mist (0 … 1) for the current hour, day and season
  mistAmount() {
    const S = this.S, h = S.time, season = this.g.seasons.season, sky = this.g.sky;
    const k = { Herbst: 1, Winter: .7, Frühling: .8, Sommer: .55 }[season] ?? 1;
    const r = hash(S.day * 3.7 + 1), day = r < .25 ? 0 : .45 + .55 * hash(S.day * 9.1);       // some mornings stay clear
    let a = day * k * sstep(3.2, 5.4, h) * (1 - sstep(7.6, 9.8, h));
    a = Math.max(a, sky.fogBoost * .75);                                                    // fog weather: mist the whole day
    a = Math.max(a, .25 * k * sstep(19.5, 21.5, h) * day);                                  // a little evening mist over the lake
    return a * (1 - .6 * sky.rainAmount);
  }
  update(dt) {
    const g = this.g, S = g.S, sky = g.sky, P = g.P, berg = g.region() === 'berg';
    // mist: smooth, height above ground decides how thick it is (mountains: a sea of mist below the hut)
    const want = this.mistAmount(); this.mist += (want - this.mist) * Math.min(1, dt * .4);
    this.mistTop = berg ? 27 : 2.6; this.mistDepth = berg ? 9 : 4.5;
    const lit = Math.min(1, 1.15 - sky.darkness(S.time));
    this.mistColor.copy(g.scene.fog.color).lerp(new THREE.Color(S.time < 9 ? '#f1e6dc' : '#e4e8ea'), .65 * lit);
    if (this.mist > .45 && P.pos.y < this.mistTop + 1 && !g.inside) this.album('nebel');
    // fireflies: warm, dry nights in the valley (summer most, none in winter)
    const dark = sky.darkness(S.time), season = g.seasons.season;
    const flyWant = berg || g.inside ? 0 : sstep(.62, .85, dark) * ({ Sommer: 1, Frühling: .55, Herbst: .4, Winter: 0 }[season] ?? 0) * (1 - Math.min(1, sky.rainAmount * 3));
    this.flyA += (flyWant - this.flyA) * Math.min(1, dt * .5);
    this.flies.visible = this.flyA > .02;
    if (this.flies.visible) this.updateFlies(dt);
    // shooting stars on clear nights
    this.starT -= dt;
    if (!this.shoot && this.starT < 0 && dark > .8 && sky.rainAmount < .05 && sky.fogBoost < .3) this.launch();
    if (this.shoot) this.updateShoot(dt);
    // rain on the roof: drumming + single drops while you are under a roof, in a house or in the car
    const A = g.audio; if (A.ctx) {
      const under = (g.roof || g.vehicle.driving) ? sky.rainAmount * (sky.snow ? .15 : 1) : 0;
      A.set('roof', under * (g.vehicle.driving ? .28 : .22));
      this.dripT -= dt * under * 6; if (under > .05 && this.dripT < 0) { this.dripT = .15 + Math.random() * .5; A.sfx('drip'); }
    }
  }
  // the uniforms of the mist in every compiled program (called after the scene was rendered once with new materials)
  upload(renderer) {
    const gl = renderer.getContext(), st = renderer.state, c = this.mistColor;
    for (const p of renderer.info.programs || []) {
      if (p._mist === undefined) { let m = null; try { m = p.getUniforms().map; } catch { } p._mist = m?.uMist ? [m.uMist.addr, m.uMistColor?.addr] : null; }
      if (!p._mist) continue;
      st.useProgram(p.program); gl.uniform4f(p._mist[0], this.mist, this.mistTop, this.mistDepth || 4.5, .05); if (p._mist[1]) gl.uniform3f(p._mist[1], c.r, c.g, c.b);
    }
  }
  // ---------------------------------------------------------------- fireflies
  flySpot() {
    const g = this.g, P = g.P;
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * 6.283, d = 4 + Math.random() * 32, x = P.pos.x + Math.cos(a) * d, z = P.pos.z + Math.sin(a) * d, by = -z;
      const nearWater = Math.abs(x - creekX(by)) < 14 || LAKES.some(L => Math.hypot(x - L.x, by - L.y) < L.r + 12);
      if (Math.abs(x - creekX(by)) < 2.5 || LAKES.some(L => Math.hypot(x - L.x, by - L.y) < L.r + 4)) continue;     // not above the water
      if (!nearWater && Math.random() < .5) continue;
      const y = g.W.groundY(x, z, P.pos.y + 8); return new THREE.Vector3(x, y + .3 + Math.random() * 1.6, z);
    }
    return null;
  }
  updateFlies(dt) {
    const arr = this.flies.geometry.attributes.position.array, t = performance.now() / 1000, P = this.g.P;
    for (let i = 0; i < FLY_N; i++) {
      let h = this.home[i];
      if (!h || Math.hypot(h.x - P.pos.x, h.z - P.pos.z) > 40) { h = this.home[i] = this.flySpot(); if (!h) { arr[i * 3 + 1] = -999; continue; } }
      arr[i * 3] = h.x + Math.sin(t * .31 + i) * 1.4; arr[i * 3 + 1] = h.y + Math.sin(t * .53 + i * 2.1) * .4; arr[i * 3 + 2] = h.z + Math.cos(t * .27 + i * 1.3) * 1.4;
    }
    this.flies.geometry.attributes.position.needsUpdate = true;
    flyMat.uniforms.uT.value = t; flyMat.uniforms.uA.value = this.flyA; flyMat.uniforms.uScale.value = innerHeight / (2 * Math.tan(this.g.camera.fov * Math.PI / 360));
    if (this.flyA > .5) this.album('gluehwuermchen');
  }
  // ---------------------------------------------------------------- shooting stars + fireball
  launch(fire) {
    const g = this.g, S = g.S; this.starT = 25 + Math.random() * 50;
    fire = fire ?? (Math.random() < .1 && S.abs > (S.meteorAt || 0) + 36);
    const az = Math.random() * 6.283, el = fire ? .35 + Math.random() * .25 : .35 + Math.random() * .7, dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(), down = fire ? -.75 : -.35 - Math.random() * .3;
    const vel = side.multiplyScalar(Math.random() < .5 ? 1 : -1).add(new THREE.Vector3(0, down, 0)).normalize();
    this.shoot = { p: dir.multiplyScalar(400), v: vel, t: 0, T: fire ? 2.6 : .7 + Math.random() * .6, fire, seen: false, az };
    this.star.material.linewidth = 1;
  }
  updateShoot(dt) {
    const s = this.shoot, g = this.g, cam = g.camera; s.t += dt;
    const k = s.t / s.T, speed = s.fire ? 140 : 260, head = s.p.clone().addScaledVector(s.v, speed * s.t), tail = head.clone().addScaledVector(s.v, -(s.fire ? 60 : 38) * Math.min(1, k * 3));
    const fade = Math.sin(Math.min(1, k) * Math.PI), a = this.star.geometry.attributes.position.array, col = this.star.geometry.attributes.color.array;
    head.add(cam.position); tail.add(cam.position); a.set([head.x, head.y, head.z, tail.x, tail.y, tail.z]); this.star.geometry.attributes.position.needsUpdate = true;
    const c = s.fire ? [1, .62 * fade, .25 * fade] : [fade, fade, fade * .95]; col.set([c[0] * fade, c[1], c[2], 0, 0, 0]); this.star.geometry.attributes.color.needsUpdate = true;
    this.star.visible = true;
    if (!s.seen && k > .2 && k < .8) { const v = head.clone().project(cam); if (v.z < 1 && Math.abs(v.x) < .95 && Math.abs(v.y) < .95) s.seen = true; }
    if (s.t < s.T) return;
    this.star.visible = false; this.shoot = null;
    if (!s.seen) return;
    g.progress.stat('meteor'); this.album('sternschnuppe');
    if (s.fire) return this.fireball(s);
    if (!g.S.flags.wish) { g.S.flags.wish = 1; g.ui.toast('🌠 Eine Sternschnuppe – wünsch dir was!', 'good'); g.progress.add(10, 'Sternschnuppe'); }
    else g.ui.toast('🌠 Sternschnuppe!');
  }
  // the fireball hits the forest 40–80 m away in the direction it fell: a glowing meteorite lies there (a drop, saved)
  fireball(s) {
    const g = this.g, P = g.P, f = new THREE.Vector3(Math.cos(s.az), 0, Math.sin(s.az));
    let p = null;
    for (let k = 0; k < 20 && !p; k++) { const d = 40 + Math.random() * 40, a = s.az + (Math.random() - .5) * .6, x = P.pos.x + Math.cos(a) * d, z = P.pos.z + Math.sin(a) * d;
      const q = g.life.forestSpot(new THREE.Vector3(x, 0, z), 0, 6); if (q && !LAKES.some(L => Math.hypot(q.x - L.x, -q.z - L.y) < L.r + 6)) p = q; }
    if (!p) return;
    g.S.meteorAt = g.S.abs; setTimeout(() => { g.audio.sfx('boom'); g.ui.damage?.(); }, 1500);
    g.addDrop({ id: 'meteorit', n: 1, p: p.toArray().map(v => +v.toFixed(2)) });
    const bx = +p.x.toFixed(1), by = +(-p.z).toFixed(1);
    if (g.S.marks.length < 8) g.S.marks.push({ x: bx, y: by, label: 'Einschlag', c: '#ff9a3a' });
    g.ui.toast('☄️ Ein Feuerball! Er schlägt im Wald ein – dort liegt jetzt etwas (Wegmarker „Einschlag“).', 'good');
    this.album('feuerball');
  }
  album(id) { if (this.seen.has(id)) return; this.seen.add(id); this.g.album?.see('n_' + id); }
}
