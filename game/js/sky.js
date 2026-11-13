// Sky, sun, moon, stars, fog, rain – everything that changes with the time of day (hours 0..24) and the weather.
import * as THREE from 'three';

const C = (h) => new THREE.Color(h);
// key colours over the day: [hour, sky, fog, sun colour, sun intensity, hemi intensity]
const KEYS = [
  [0, C('#05070d'), C('#06080e'), C('#8fa6ff'), 0.0, 0.06],
  [5.2, C('#0b1020'), C('#0c1120'), C('#8fa6ff'), 0.0, 0.08],
  [6.3, C('#e7a27a'), C('#c99b85'), C('#ffb27a'), 0.9, 0.5],
  [8, C('#9dc3e6'), C('#b7cfdf'), C('#fff1d6'), 2.4, 1.05],
  [16, C('#9dc3e6'), C('#b7cfdf'), C('#fff1d6'), 2.2, 1.0],
  [17.6, C('#f0a46c'), C('#d9a184'), C('#ffa060'), 1.3, 0.7],
  [18.6, C('#5a4a78'), C('#3a3550'), C('#ff7a50'), 0.25, 0.32],
  [19.6, C('#121628'), C('#0f1222'), C('#8fa6ff'), 0.0, 0.09],
  [24, C('#05070d'), C('#06080e'), C('#8fa6ff'), 0.0, 0.06],
];

export class Sky {
  constructor(scene) {
    this.scene = scene;
    scene.background = new THREE.Color('#9dc3e6');
    scene.fog = new THREE.Fog('#b7cfdf', 30, 260);
    this.hemi = new THREE.HemisphereLight('#cfe3ff', '#5a4a30', .7); scene.add(this.hemi);
    this.amb = new THREE.AmbientLight('#ffffff', .05); scene.add(this.amb);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.4);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.near = 1; sc.far = 220;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun); scene.add(this.sun.target);
    this.moon = new THREE.DirectionalLight('#8fa6ff', 0.0); scene.add(this.moon); scene.add(this.moon.target);
    // sun / moon discs
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff3c4', fog: false }));
    this.moonDisc = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), new THREE.MeshBasicMaterial({ color: '#e8ecff', fog: false }));
    scene.add(this.sunDisc, this.moonDisc);
    // stars
    const n = 1400, pos = new Float32Array(n * 3), r = new THREE.Vector3();
    for (let i = 0; i < n; i++) { r.set(Math.random() * 2 - 1, Math.random() * .9 + .1, Math.random() * 2 - 1).normalize().multiplyScalar(420); pos.set([r.x, r.y, r.z], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(this.stars);
    // rain: short streaks around the player
    const rn = 3000, rp = new Float32Array(rn * 6);
    for (let i = 0; i < rn; i++) { const x = Math.random() * 60 - 30, y = Math.random() * 30, z = Math.random() * 60 - 30; rp.set([x, y, z, x, y - .5, z], i * 6); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#a9bfd6', transparent: true, opacity: .45 }));
    this.rain.visible = false; this.rain.frustumCulled = false; scene.add(this.rain);
    this.rainAmount = 0; this.fogBoost = 0;
  }
  sample(h) {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const a = KEYS[i], b = KEYS[i + 1];
      if (h >= a[0] && h <= b[0]) { const t = (h - a[0]) / (b[0] - a[0]); return a.map((v, k) => k === 0 ? h : v.isColor ? v.clone().lerp(b[k], t) : v + (b[k] - v) * t); }
    }
    return KEYS[0];
  }
  // darkness 0 (day) .. 1 (deep night) – used by the game for warmth, wolves, auto lights
  darkness(h) { const s = this.sample(h); return 1 - Math.min(1, s[4] / 1.2); }
  update(h, playerPos, dt) {
    const [, sky, fog, sunC, sunI, hemiI] = this.sample(h);
    const wet = this.rainAmount;
    this.scene.background.copy(sky).lerp(C('#59606a'), wet * .6 * Math.min(1, sunI));
    this.scene.fog.color.copy(fog).lerp(C('#6c737c'), wet * .6 * Math.min(1, sunI));
    const night = 1 - Math.min(1, hemiI / .35);
    this.scene.fog.near = 20 - 12 * night - 10 * wet; this.scene.fog.far = 260 - 170 * night - 120 * wet - 60 * this.fogBoost;
    // sun path: rises east (+x), sets west, low in autumn (max 38°)
    const a = (h - 6.3) / (18.6 - 6.3) * Math.PI;
    const el = Math.sin(a) * .66, az = a;
    const dir = new THREE.Vector3(Math.cos(az), Math.max(-.3, el), -.45).normalize();
    this.sun.position.copy(playerPos).addScaledVector(dir, 120); this.sun.target.position.copy(playerPos);
    this.sun.color.copy(sunC); this.sun.intensity = sunI * (1 - .55 * wet); this.sun.visible = sunI > .01;
    this.sunDisc.position.copy(playerPos).addScaledVector(dir, 400); this.sunDisc.visible = el > -.05; this.sunDisc.material.color.copy(sunC).lerp(C('#ffffff'), .4);
    const md = new THREE.Vector3(-Math.cos(az), Math.max(.15, -el + .2), .4).normalize();
    this.moon.position.copy(playerPos).addScaledVector(md, 120); this.moon.target.position.copy(playerPos);
    this.moon.intensity = .16 * night * (1 - wet); this.moonDisc.position.copy(playerPos).addScaledVector(md, 400); this.moonDisc.visible = night > .3 && wet < .5;
    this.hemi.intensity = hemiI * (1 - .3 * wet); this.hemi.color.copy(sky).lerp(C('#ffffff'), .5);
    this.stars.material.opacity = Math.max(0, night - .3) * (1 - wet); this.stars.position.copy(playerPos);
    // rain streaks follow the player and fall
    this.rain.visible = wet > .02; this.rain.material.opacity = .45 * wet;
    if (this.rain.visible) {
      const p = this.rain.geometry.attributes.position, arr = p.array;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= 22 * dt; arr[i + 4] -= 22 * dt;
        if (arr[i + 1] < -2) { arr[i + 1] += 30; arr[i + 4] += 30; }
      }
      p.needsUpdate = true; this.rain.position.set(playerPos.x, playerPos.y - 5, playerPos.z);
    }
  }
}
