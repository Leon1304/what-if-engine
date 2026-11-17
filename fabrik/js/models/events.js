// Cogtopia – Modelle und Materialien für Ereignis-Effekte (genutzt von fx.js): Meteor-Brocken, Krater mit Kristallen,
// VIP-Laster, Album-Karte, Boden-Adern/-Risse (Decal-Geometrie mit Wachstum), Lichtsäule, Ringe.
// Alles prozedural, keine Texte. Geometrien je Variante zwischengespeichert.
import * as THREE from 'three';
import { Kit, instantiate, rng, PI, TAU } from '../kit.js';
import { MATS } from '../materials.js';

// ---------- Materialien ----------
// Lichtsäule: offener Zylinder (uv.y = Höhe), nach oben ausblendend, Mitte heller als die Ränder, wandernde Bänder
export function pillarMat(color = 0xffffff, alpha = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: alpha }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying float vF; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.);
      vec3 n = (modelViewMatrix * vec4(position.x, 0., position.z, 0.)).xyz; float ln = length(n);
      vF = ln > 1e-5 ? clamp(abs(dot(n / ln, normalize(-mv.xyz))), 0., 1.) : 0.; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uA, uTime; varying vec2 vUv; varying float vF;
      void main(){ float y = clamp(vUv.y, 0., 1.), k = 1. - y; float a = k * sqrt(k) * smoothstep(0., .04, y) * vF * sqrt(vF);
        a *= .75 + .25 * sin(y * 24. - uTime * 7.); gl_FragColor = vec4(max(uColor * a * uA * 1.6, vec3(0.)), 1.);
      }`,
  });
}
// Decal am Boden: Attribute aT (0 Mitte … 1 Ende, steuert das Aufwachsen) und aE (−1…1 quer, weiche Kanten)
export function decalMat(color, { additive = false, pulse = 0 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uGrow: { value: 0 }, uA: { value: 1 }, uTime: { value: 0 }, uPulse: { value: pulse } },
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `attribute float aT; attribute float aE; varying float vT, vE; void main(){ vT = aT; vE = aE; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uGrow, uA, uTime, uPulse; varying float vT, vE;
      void main(){ float g = 1. - smoothstep(uGrow - .06, uGrow, vT); float e = 1. - smoothstep(.35, 1., abs(vE));
        float p = 1. + uPulse * (.5 + .5 * sin(vT * 16. - uTime * 5.));
        float a = uA * g * e; ${additive ? 'gl_FragColor = vec4(uColor * p * a, 1.);' : 'gl_FragColor = vec4(uColor * p, a);'} }`,
  });
  return m;
}

// ---------- Geometrien ----------
export const pillarGeo = (() => { let g; return () => g ||= new THREE.CylinderGeometry(1, 1, 1, 28, 1, true).translate(0, .5, 0); })();
export const ringGeo = (() => { let g; return () => g ||= new THREE.RingGeometry(.86, 1, 56).rotateX(-PI / 2); })();
export const discGeo = (() => { let g; return () => g ||= new THREE.CircleGeometry(1, 40).rotateX(-PI / 2); })();
export const sphereGeo = (() => { let g; return () => g ||= new THREE.IcosahedronGeometry(1, 2); })();

// Verzweigte Linien vom Mittelpunkt (Risse, Adern) als flache Vierecke auf y; seed bestimmt die Form
export function branchGeo(seed, radius, { branches = 6, width = .09, step = .28, sub = .45, y = .014, wiggle = .55 } = {}) {
  const R = rng(seed * 7919 + 13), pos = [], at = [], ae = [];
  const seg = (ax, az, bx, bz, wa, wb, ta, tb) => {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, ex = dx / L * wa * .5, ez = dz / L * wa * .5;
    const A = [ax - ex + nx * wa, az - ez + nz * wa], B = [ax - ex - nx * wa, az - ez - nz * wa], Cq = [bx + ex - nx * wb, bz + ez - nz * wb], D = [bx + ex + nx * wb, bz + ez + nz * wb];
    for (const [p, t, e] of [[A, ta, 1], [B, ta, -1], [Cq, tb, -1], [A, ta, 1], [Cq, tb, -1], [D, tb, 1]]) { pos.push(p[0], y, p[1]); at.push(t); ae.push(e); }
  };
  const walk = (x, z, ang, len, w, t0, depth) => {
    let L = 0;
    while (L < len) {
      const s = step * (.7 + R() * .6), nx = x + Math.cos(ang) * s, nz = z + Math.sin(ang) * s, w2 = Math.max(.008, w * (1 - (L + s) / len * .85));
      const ta = (t0 + L) / radius, tb = (t0 + L + s) / radius;
      seg(x, z, nx, nz, w * (1 - L / len * .85), w2, ta, tb);
      if (depth < 2 && R() < sub * (1 - L / len)) walk(nx, nz, ang + (R() < .5 ? -1 : 1) * (.5 + R() * .7), (len - L) * (.35 + R() * .3), w2 * .7, t0 + L + s, depth + 1);
      x = nx; z = nz; L += s; ang += (R() - .5) * wiggle;
    }
  };
  for (let i = 0; i < branches; i++) { const a = i / branches * TAU + (R() - .5) * .8; walk(Math.cos(a) * .05, Math.sin(a) * .05, a, radius * (.6 + R() * .4), width, 0, 0); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1)); g.setAttribute('aE', new THREE.Float32BufferAttribute(ae, 1));
  g.computeBoundingSphere(); return g;
}

// ---------- Meteor-Brocken (glühende Risse in Ebene 'hot') ----------
let ROCK;
export function meteorRockBuilt() {
  if (ROCK) return ROCK;
  const k = new Kit(311); k.aoH = 1e-3; k.jit = .08;
  k.ball(0x4a3a34, [0, 0, 0], [.36, .32, .34], { dod: true, ao: false, r: [.3, .5, .1] });
  for (let i = 0; i < 7; i++) { const a = i * 2.4, b = (i % 3 - 1) * .6, d = [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
    k.ball(i % 2 ? 0x5a4840 : 0x3a2e2a, d.map(v => v * .26), [.14, .12, .13], { dod: true, ao: false, r: [a, b, 0] }); }
  for (let i = 0; i < 14; i++) { const a = i * 1.7, b = Math.sin(i * 2.3) * 1.1, d = [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
    k.ball(i % 3 ? 0xff7a20 : 0xffd060, d.map(v => v * .33), [.05, .02, .05], { layer: 'hot', ao: false, detail: 0, r: [b, a, 0] }); }
  return (ROCK = k.build());
}

// ---------- Krater mit Kristall-Gruppe (Kristalle als Teile c0…, Ebene 'crys' → eigenes Material) ----------
const CRATER = new Map();
export function craterBuilt(size = 1) {
  const key = Math.round(size * 10); if (CRATER.has(key)) return CRATER.get(key);
  const s = key / 10, k = new Kit(900 + key); k.aoH = .25;
  k.cyl(0x3a3028, [0, 0, 0], 1.45 * s, .012, 20, { ao: false, jit: .02 });                // verbrannter Boden
  k.cyl(0x2a221e, [0, 0, 0], 1.0 * s, .02, 18, { ao: false });                            // Grube
  k.cyl(0x1c1714, [0, 0, 0], .62 * s, .026, 14, { ao: false });
  for (let i = 0; i < 22; i++) { const a = i / 22 * TAU + k.R(-.1, .1), r = (1.05 + k.R(-.08, .12)) * s;           // Wall aus Brocken
    k.ball(k.pick([0x6a5a4c, 0x5a4a40, 0x7a6a58]), [Math.cos(a) * r, .02, Math.sin(a) * r], [k.R(.12, .2) * s, k.R(.07, .13) * s, k.R(.1, .16) * s], { dod: true, r: [k.R(0, 3), a, 0] }); }
  for (let i = 0; i < 26; i++) { const a = k.R(0, TAU), r = k.R(1.3, 2.1) * s;                                       // Auswurf
    k.ball(k.pick([0x6a5a4c, 0x4a3e36, 0x8a7a66]), [Math.cos(a) * r, 0, Math.sin(a) * r], [k.R(.03, .07), k.R(.025, .05), k.R(.03, .06)], { dod: true, r: [k.R(0, 3), k.R(0, 3), 0] }); }
  for (let i = 0; i < 5; i++) { const a = i * 1.3 + .4, r = .55 * s;                                                  // dunkle Rest-Brocken
    k.ball(0x2e2420, [Math.cos(a) * r, .02, Math.sin(a) * r], [.09, .06, .08], { dod: true }); }
  // Kristalle: Sechskant-Prisma mit Spitze, schräg aus der Grube
  const crys = [[0, 0, .55, 0, 0], [.22, .1, .42, .35, .6], [-.2, .16, .38, -.4, 2.2], [.05, -.25, .34, .3, 4.1], [-.14, -.2, .3, -.3, 3.3], [.3, -.12, .26, .5, 5.3], [-.32, -.02, .24, -.55, 1.4], [.12, .3, .22, .45, 1.9]];
  crys.forEach(([x, z, h, tilt, yaw], i) => {
    k.part('c' + i, [x * s, .02, z * s], c => {
      c.in([0, 0, 0], [tilt, yaw, 0], () => {
        const r = h * .26 * s, H = h * s;
        c.cyl(0xffffff, [0, -.04, 0], r, H, 6, { layer: 'crys', ao: false, jit: 0 });
        c.cone(0xffffff, [0, H - .04, 0], r, r * 1.6, 6, { layer: 'crys', ao: false, jit: 0 });
        c.cyl(0xffffff, [0, H * .2, 0], r * 1.02, H * .05, 6, { layer: 'crysHi', ao: false, jit: 0 });
      });
    });
  });
  const B = { built: k.build(), n: crys.length }; CRATER.set(key, B); return B;
}
export function crystalMats(color) {
  const c = new THREE.Color(color);
  return {
    crys: new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .45, roughness: .18, metalness: .1, flatShading: true, transparent: true, opacity: .92 }),
    crysHi: new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.2) }),
  };
}

// ---------- VIP-Laster: vorn = +x, Mitte über dem Boden; Räder 'w0…5' (drehen um z), Dachluke 'hatch', Lichtbalken Ebene 'blink', Scheinwerfer Ebene 'head' ----------
let TRUCK;
export function truckBuilt() {
  if (TRUCK) return TRUCK;
  const k = new Kit(4242); k.aoH = .35;
  const BODY = 0xffffff, DARK = 0x24262c, TRIM = 0x34373e, RUB = 0x1c1d22, CHR = 0xc8ccd6;
  // Fahrgestell
  k.bev(DARK, [0, .12, 0], [1.86, .08, .62], .02, { layer: 'metal' });
  for (const s of [-1, 1]) k.box(TRIM, [-.1, .1, s * .3], [1.5, .04, .03], { layer: 'metal' });
  // Kofferaufbau (Ebene 'paint' → Lackfarbe), goldene Zierleisten, Stern-Emblem
  k.bev(BODY, [-.33, .2, 0], [1.2, .62, .74], .045, { layer: 'paint' });
  for (const y of [.27, .76]) k.box(0xffffff, [-.33, y, 0], [1.21, .025, .745], { layer: 'gold' });
  for (const s of [-1, 1]) { k.star(0xffffff, [-.33, .52, s * .373], .12, .012, { layer: 'gold', r: [PI / 2, 0, 0] });
    for (const x of [-.85, .19]) k.box(0xffffff, [x, .2, s * .37], [.03, .62, .012], { layer: 'gold' }); }
  k.bev(TRIM, [-.33, .82, 0], [1.12, .04, .66], .015, { layer: 'metal' });
  // Dachluke (öffnet zum Beladen)
  k.part('hatch', [-.62, .86, 0], h => { h.bev(0xffffff, [.28, 0, 0], [.56, .035, .44], .012, { layer: 'paint' }); h.box(CHR, [.3, .035, 0], [.4, .012, .03], { layer: 'chrome' }); });
  k.box(0x0c0c10, [-.34, .84, 0], [.54, .012, .42], { ao: false });
  // Hecktür mit Griffen
  k.box(TRIM, [-.94, .24, 0], [.02, .54, .68], { layer: 'metal' }); k.box(CHR, [-.955, .5, -.05], [.01, .14, .02], { layer: 'chrome' }); k.box(CHR, [-.955, .5, .05], [.01, .14, .02], { layer: 'chrome' });
  for (const s of [-1, 1]) k.cyl(0xff3020, [-.95, .32, s * .3], .03, .02, 8, { ax: 'x', layer: 'glow' });
  // Führerhaus
  k.bev(BODY, [.55, .2, 0], [.56, .42, .72], .05, { layer: 'paint' });
  k.bev(BODY, [.47, .62, 0], [.4, .2, .7], .06, { layer: 'paint' });
  k.box(0xffffff, [.5, .25, 0], [.6, .02, .725], { layer: 'gold' });
  k.box(0x9ad4ec, [.67, .64, 0], [.02, .15, .6], { layer: 'glass', r: [0, 0, -.35] });                  // Frontscheibe
  for (const s of [-1, 1]) { k.box(0x9ad4ec, [.46, .64, s * .352], [.28, .13, .01], { layer: 'glass' }); k.box(TRIM, [.46, .44, s * .362], [.3, .2, .006], { layer: 'metal' }); k.box(CHR, [.52, .5, s * .368], [.06, .015, .01], { layer: 'chrome' }); }
  // Grill, Stoßstange, Scheinwerfer
  k.bev(CHR, [.83, .22, 0], [.03, .2, .5], .01, { layer: 'chrome' });
  for (let i = 0; i < 4; i++) k.box(DARK, [.848, .25 + i * .04, 0], [.01, .016, .44], { layer: 'metal' });
  k.bev(CHR, [.86, .1, 0], [.06, .08, .76], .02, { layer: 'chrome' });
  for (const s of [-1, 1]) { k.cyl(CHR, [.82, .34, s * .28], .055, .04, 10, { ax: 'x', layer: 'chrome' }); k.cyl(0xfff2c0, [.845, .34, s * .28], .042, .01, 10, { ax: 'x', layer: 'head' });
    k.box(0xffa020, [.83, .24, s * .33], [.02, .03, .05], { layer: 'glow' }); }
  // Spiegel
  for (const s of [-1, 1]) { k.beam(DARK, [.66, .56, s * .36], [.66, .6, s * .44], .015, { layer: 'metal' }); k.bev(DARK, [.66, .54, s * .45], [.03, .1, .06], .01, { layer: 'metal' }); }
  // Lichtbalken auf dem Dach (blinkt)
  k.bev(DARK, [.48, .82, 0], [.14, .03, .5], .01, { layer: 'metal' });
  for (let i = 0; i < 4; i++) k.bev(0xffffff, [.48, .85, -.18 + i * .12], [.1, .05, .09], .015, { layer: i % 2 ? 'blinkB' : 'blinkA' });
  // Räder: vorn 1 Achse, hinten 2 Achsen
  [[.56, 0], [-.48, 1], [-.72, 2]].forEach(([x, a]) => { for (const s of [-1, 1]) {
    const i = a * 2 + (s > 0 ? 1 : 0);
    k.box(DARK, [x, .2, s * .3], [.26, .06, .1], { layer: 'metal' });                                   // Kotflügel
    k.part('w' + i, [x, .1, s * .33], w => {
      w.cyl(RUB, [0, 0, 0], .1, .09, 14, { ax: 'z', ao: false });
      w.cyl(CHR, [0, 0, s * .046], .058, .01, 10, { ax: 'z', layer: 'chrome', ao: false });
      for (let j = 0; j < 5; j++) w.box(DARK, [Math.cos(j * TAU / 5) * .035, Math.sin(j * TAU / 5) * .035 - .006, s * .052], [.012, .012, .006], { layer: 'metal', ao: false });
    });
  } });
  return (TRUCK = k.build());
}

// ---------- Album-Karte: liegt in der xy-Ebene, Vorderseite +z; Rahmen je Variante ----------
const CARD = new Map();
export const CARD_LOOK = {
  normal: { frame: 0x8ab4e8, layer: 'metal', inner: 0xfff6e0, strip: 0x4a7ad0, star: 0xd8dce4 },
  gold: { frame: 0xffffff, layer: 'gold', inner: 0xfff2c8, strip: 0xe8a820, star: 0xffd84a },
  perfect: { frame: 0xb070ff, layer: 'metal', inner: 0xf6ecff, strip: 0x8a4ae0, star: 0xff8ad8, glow: 0xd8a0ff },
  mega: { frame: 0xff5a3a, layer: 'metal', inner: 0xfff0e0, strip: 0xff8a2a, star: 0xffe27a, glow: 0xff9a40, rainbow: true },
};
export function cardBuilt(variant = 'normal') {
  if (CARD.has(variant)) return CARD.get(variant);
  const L = CARD_LOOK[variant] || CARD_LOOK.normal, k = new Kit(5150); k.aoH = 1e-3; k.jit = 0;
  const W = .62, H = .86, D = .03;
  k.bevc(L.frame, [0, 0, 0], [W, H, D], .03, { layer: L.layer, ao: false });
  k.bevc(L.inner, [0, .05, D / 2], [W - .1, H - .26, .008], .01, { ao: false });                         // Bildfeld
  k.bevc(L.strip, [0, -.33, D / 2], [W - .1, .11, .01], .01, { ao: false });                              // Namensleiste (ohne Text)
  for (let i = 0; i < 3; i++) k.star(L.star, [-.1 + i * .1, -.33, D / 2 + .008], .03, .008, { layer: 'glow', r: [PI / 2, 0, 0] });
  for (const [x, y] of [[-1, 1], [1, 1]]) k.star(L.star, [x * (W / 2 - .06), y * (H / 2 - .06), D / 2 + .004], .035, .008, { layer: 'glow', r: [PI / 2, 0, 0] });
  if (L.glow) { for (const s of [-1, 1]) { k.box(L.glow, [s * (W / 2 + .004), -H / 2 + .05, 0], [.008, H - .1, D * .6], { layer: 'glow' }); k.box(L.glow, [0, s * (H / 2 + .004) - .004, 0], [W - .1, .008, D * .6], { layer: 'glow' }); } }
  if (L.rainbow) { const RB = [0xff5a5a, 0xffc23a, 0x4ad48a, 0x4aa8ff, 0xb070ff]; RB.forEach((c, i) => k.box(c, [-W / 2 + .07 + i * .12, H / 2 - .1, D / 2 + .002], [.1, .02, .006], { layer: 'glow' })); }
  // Rückseite: Zahnrad-Emblem
  k.gear(L.strip, [0, 0, -D / 2 - .006], .17, .008, 10, { r: [PI / 2, 0, 0], hole: .4 });
  k.ring(L.star, [0, 0, -D / 2 - .004], .22, .2, .006, 24, { r: [PI / 2, 0, 0] });
  const B = k.build(); CARD.set(variant, B); return B;
}

export { instantiate, MATS };
