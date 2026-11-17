// Cogtopia – Überlagerungen für Strom und Engpässe. Keine festen Texte: Beschriftungen kommen als Parameter (zweisprachig).
//   const ov = new Overlay(scene);
//   ov.setPower(nets)    nets = [{ color?, s (Versorgung 0…1), areas: [{ x, y, w, h, r }] }] → Fläche je Netz (Vereinigung der Quadrate x−r … x+w+r), Randlinie
//   ov.setLines(segs)    segs = [{ a: [x,y,z], b: [x,y,z], s? }] → leuchtende Netzlinien mit wandernden Lichtpunkten (Richtung a → b)
//   ov.setNoPower(list)  list = [{ x, z, y? }] → schwebendes, blinkendes Blitz-Symbol „kein Strom“
//   ov.setIssues(list)   list = [{ x, z, y?, kind: 'missing' | 'jam' | 'power', item?, icon? (Bild/Canvas/Data-URL), label? (Text von außen), sev? 0…1 }]
//   ov.update(t, camera) je Bild · ov.visible = true/false · ov.clear() · ov.dispose()
import * as THREE from 'three';
import { ITEM_LOOK } from './items.js';

const NET_COLORS = [0x4ad8ff, 0x7aff8a, 0xffd04a, 0xff8ad8, 0xb08aff, 0xff9a4a];
const TAU = Math.PI * 2;

// ---------- Zeichnen auf Canvas ----------
function bolt(g, cx, cy, s, fill, stroke) {
  g.beginPath(); const P = [[.1, -.5], [-.28, .06], [-.02, .06], [-.12, .5], [.3, -.1], [.04, -.1], [.18, -.5]];
  P.forEach(([x, y], i) => i ? g.lineTo(cx + x * s, cy + y * s) : g.moveTo(cx + x * s, cy + y * s)); g.closePath();
  if (stroke) { g.lineJoin = 'round'; g.lineWidth = s * .09; g.strokeStyle = stroke; g.stroke(); } g.fillStyle = fill; g.fill();
}
function itemShape(g, id, cx, cy, s) {
  const L = ITEM_LOOK[id] || { color: 0x9a9a9a, shape: 'box' }, c = '#' + new THREE.Color(L.color).getHexString(), d = '#' + new THREE.Color(L.color).multiplyScalar(.6).getHexString();
  g.fillStyle = c; g.strokeStyle = d; g.lineWidth = s * .07; g.lineJoin = 'round';
  const r = s * .38; g.beginPath();
  switch (L.shape) {
    case 'gear': for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, rr = (i % 4 < 2 ? 1 : .78) * r; i ? g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = d; g.beginPath(); g.arc(cx, cy, r * .3, 0, TAU); g.fill(); return;
    case 'orb': case 'lens': g.arc(cx, cy, r * .9, 0, TAU); break;
    case 'bar': g.roundRect(cx - r, cy - r * .45, r * 2, r * .9, r * .15); break;
    case 'plate': g.roundRect(cx - r * .9, cy - r * .9, r * 1.8, r * 1.8, r * .15); break;
    case 'coil': g.arc(cx, cy, r * .9, 0, TAU); g.fill(); g.stroke(); g.strokeStyle = d; for (let i = 1; i < 4; i++) { g.beginPath(); g.arc(cx, cy, r * .22 * i, 0, TAU); g.stroke(); } return;
    case 'chip': g.rect(cx - r * .8, cy - r * .8, r * 1.6, r * 1.6); g.fill(); g.stroke(); g.fillStyle = '#d8c070'; for (let i = 0; i < 4; i++) for (const s2 of [-1, 1]) g.fillRect(cx - r * .7 + i * r * .42, cy + s2 * r * .95 - r * .08, r * .2, r * .16); return;
    case 'pipe': g.roundRect(cx - r, cy - r * .3, r * 2, r * .6, r * .3); break;
    case 'rocket': g.moveTo(cx, cy - r); g.lineTo(cx + r * .45, cy + r * .5); g.lineTo(cx + r * .7, cy + r); g.lineTo(cx - r * .7, cy + r); g.lineTo(cx - r * .45, cy + r * .5); g.closePath(); break;
    case 'chunk': { const P = [[-.9, .2], [-.5, -.7], [.3, -.85], [.9, -.2], [.7, .6], [-.1, .9], [-.7, .7]]; P.forEach(([x, y], i) => i ? g.lineTo(cx + x * r, cy + y * r) : g.moveTo(cx + x * r, cy + y * r)); g.closePath(); break; }
    default: g.roundRect(cx - r * .85, cy - r * .85, r * 1.7, r * 1.7, r * .25);
  }
  g.fill(); g.stroke();
}
// Sprechblase: kind bestimmt Rahmenfarbe und Symbol; Bild (icon) wird nachträglich gezeichnet, wenn es geladen ist
function bubbleTexture(o) {
  const label = o.label ? String(o.label) : '', fs = 44, font = `800 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const meas = document.createElement('canvas').getContext('2d'); meas.font = font;
  const S = 128, tw = label ? Math.ceil(meas.measureText(label).width) + 24 : 0, W = S + tw, H = S + 28;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const col = o.kind === 'jam' ? '#ff9a2a' : o.kind === 'power' ? '#ffd23a' : '#ff4a3a';
  const draw = (img) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#2a2420'; g.beginPath(); g.roundRect(4, 4, W - 8, S - 8, 30); g.fill();
    g.beginPath(); g.moveTo(S / 2 - 16, S - 8); g.lineTo(S / 2, H - 4); g.lineTo(S / 2 + 16, S - 8); g.fill();
    g.fillStyle = '#fff6e4'; g.beginPath(); g.roundRect(12, 12, W - 24, S - 24, 22); g.fill();
    g.strokeStyle = col; g.lineWidth = 8; g.beginPath(); g.roundRect(12, 12, W - 24, S - 24, 22); g.stroke();
    const cx = S / 2, cy = S / 2;
    if (o.kind === 'missing') {
      if (img) g.drawImage(img, cx - 40, cy - 40, 80, 80); else itemShape(g, o.item, cx, cy, 84);
      g.strokeStyle = '#ff3a2a'; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 12, cy + 12); g.lineTo(cx + 40, cy + 40); g.moveTo(cx + 40, cy + 12); g.lineTo(cx + 12, cy + 40); g.stroke();
    } else if (o.kind === 'jam') {
      // Stau: drei Kisten, die sich vor einer Sperre stapeln
      g.fillStyle = '#c08a4a'; g.strokeStyle = '#7a5226'; g.lineWidth = 4;
      for (const [x, y] of [[cx - 36, cy + 4], [cx - 8, cy + 4], [cx - 22, cy - 22]]) { g.fillRect(x, y, 24, 24); g.strokeRect(x, y, 24, 24); }
      g.fillStyle = '#ff4a3a'; g.fillRect(cx + 24, cy - 30, 10, 60); g.fillStyle = '#ffffff'; g.fillRect(cx + 24, cy - 12, 10, 10); g.fillRect(cx + 24, cy + 8, 10, 10);
    } else bolt(g, cx, cy, 82, '#ffd23a', '#7a5a10');
    if (label) { g.font = font; g.fillStyle = '#2a2420'; g.textBaseline = 'middle'; g.fillText(label, S - 6, S / 2 + 2); }
  };
  draw(null);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.aspect = W / H; t.userData.h = H / S;
  if (o.icon && o.kind === 'missing') {
    let img = o.icon;
    if (typeof img === 'string') { const im = new Image(); im.src = img; img = im; }
    if (img instanceof HTMLImageElement && !img.complete) img.onload = () => { draw(img); t.needsUpdate = true; }; else { draw(img); t.needsUpdate = true; }
  }
  return t;
}
function noPowerTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#2a2420'; g.beginPath(); g.arc(64, 64, 60, 0, TAU); g.fill();
  g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.fill();
  bolt(g, 64, 64, 84, '#ffe24a', '#5a1a10');
  g.strokeStyle = '#fff4e4'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(30, 30); g.lineTo(98, 98); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- Materialien ----------
const lineMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });

export class Overlay {
  constructor(scene, { y = .03 } = {}) {
    this.scene = scene; this.y = y; this.root = new THREE.Group(); this.root.name = 'overlay'; scene.add(this.root);
    this.nets = []; this.lines = null; this.dots = null; this.segs = []; this.tex = new Map(); this.bubbles = []; this.np = []; this.npTex = null;
  }
  set visible(v) { this.root.visible = !!v; } get visible() { return this.root.visible; }
  // ---------------- Strom-Reichweiten ----------------
  setPower(nets = []) {
    for (const n of this.nets) { this.root.remove(n.fill, n.edge); n.fill.geometry.dispose(); n.edge.geometry.dispose(); n.fill.material.dispose(); n.edge.material.dispose(); }
    this.nets = [];
    nets.forEach((net, ni) => {
      const cells = new Set(), key = (x, y) => x + ',' + y;
      for (const a of net.areas || []) { const r = a.r ?? 0, w = a.w ?? 1, h = a.h ?? 1; for (let y = a.y - r; y < a.y + h + r; y++) for (let x = a.x - r; x < a.x + w + r; x++) cells.add(key(x, y)); }
      const col = new THREE.Color(net.color ?? NET_COLORS[ni % NET_COLORS.length]); const s = net.s ?? 1; if (s < .999) col.lerp(new THREE.Color(0xff5a2a), (1 - s) * .8);
      const fp = [], ep = [], y = this.y + ni * .002, ew = .06;
      for (const k of cells) {
        const [cx, cz] = k.split(',').map(Number);
        fp.push(cx, y, cz, cx, y, cz + 1, cx + 1, y, cz + 1, cx, y, cz, cx + 1, y, cz + 1, cx + 1, y, cz);
        // Rand dort, wo der Nachbar fehlt (Streifen innen an der Kante)
        const q = (x0, z0, x1, z1) => ep.push(x0, y + .001, z0, x0, y + .001, z1, x1, y + .001, z1, x0, y + .001, z0, x1, y + .001, z1, x1, y + .001, z0);
        if (!cells.has(key(cx - 1, cz))) q(cx, cz, cx + ew, cz + 1);
        if (!cells.has(key(cx + 1, cz))) q(cx + 1 - ew, cz, cx + 1, cz + 1);
        if (!cells.has(key(cx, cz - 1))) q(cx, cz, cx + 1, cz + ew);
        if (!cells.has(key(cx, cz + 1))) q(cx, cz + 1 - ew, cx + 1, cz + 1);
      }
      const mk = (pos, op, add) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeBoundingSphere();
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: add ? col.clone().multiplyScalar(1.6) : col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
        m.renderOrder = 8; this.root.add(m); return m; };
      this.nets.push({ fill: mk(fp, .17, false), edge: mk(ep, .85, true), s });
    });
  }
  // ---------------- Netz-Linien mit wandernden Punkten ----------------
  setLines(segs = []) {
    if (this.lines) { this.root.remove(this.lines); this.lines.geometry.dispose(); this.lines.material.dispose(); this.lines = null; }
    if (this.dots) { this.root.remove(this.dots); this.dots.geometry.dispose(); this.dots.material.dispose(); this.dots = null; }
    this.segs = segs.map(s => ({ a: new THREE.Vector3(...s.a), b: new THREE.Vector3(...s.b), s: s.s ?? 1 }));
    if (!segs.length) return;
    const pos = [], col = [], up = new THREE.Vector3(0, 1, 0), w = .045, c = new THREE.Color();
    let nd = 0;
    for (const S of this.segs) {
      const d = S.b.clone().sub(S.a), L = d.length(); if (L < 1e-3) continue; d.divideScalar(L);
      const side = new THREE.Vector3().crossVectors(d, up); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize().multiplyScalar(w);
      const vert = new THREE.Vector3().crossVectors(side, d).normalize().multiplyScalar(w);
      c.set(S.s >= .999 ? 0x6ae8ff : 0xffa040);
      for (const o of [side, vert]) { const A0 = S.a.clone().add(o), A1 = S.a.clone().sub(o), B0 = S.b.clone().add(o), B1 = S.b.clone().sub(o);
        for (const P of [A0, A1, B1, A0, B1, B0]) { pos.push(P.x, P.y, P.z); col.push(c.r, c.g, c.b); } }
      S.n = Math.max(1, Math.round(L / 1.2)); nd += S.n;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeBoundingSphere();
    this.lines = new THREE.Mesh(g, lineMat()); this.lines.material.side = THREE.DoubleSide; this.lines.material.opacity = .55; this.lines.renderOrder = 9; this.root.add(this.lines);
    this.dots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.075, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.6, 3), fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), nd);
    this.dots.frustumCulled = false; this.dots.renderOrder = 10; this.root.add(this.dots);
  }
  // ---------------- Kein Strom ----------------
  setNoPower(list = []) {
    this.npTex ||= noPowerTexture();
    while (this.np.length < list.length) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.npTex, depthTest: false, depthWrite: false, transparent: true, fog: false })); s.renderOrder = 21; this.root.add(s); this.np.push(s); }
    this.np.forEach((s, i) => { const o = list[i]; s.visible = !!o; if (o) { s.userData = { x: o.x, z: o.z, y: o.y ?? 1.6, ph: i * .7 }; } });
  }
  // ---------------- Engpass-Symbole ----------------
  _tex(o) {
    const iconKey = o.icon ? (typeof o.icon === 'string' ? o.icon.slice(-40) + o.icon.length : (o.icon.src || o.icon.id || 'img')) : '';
    const key = [o.kind, o.item || '', o.label || '', iconKey].join('|'); let t = this.tex.get(key);
    if (!t) { t = bubbleTexture(o); this.tex.set(key, t); if (this.tex.size > 120) { const [k0, t0] = this.tex.entries().next().value; if (!this.bubbles.some(b => b.material.map === t0)) { t0.dispose(); this.tex.delete(k0); } } }
    return t;
  }
  setIssues(list = []) {
    while (this.bubbles.length < list.length) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true, fog: false })); s.renderOrder = 22; this.root.add(s); this.bubbles.push(s); }
    this.bubbles.forEach((s, i) => {
      const o = list[i]; s.visible = !!o; if (!o) return;
      const t = this._tex(o); if (s.material.map !== t) { s.material.map = t; s.material.needsUpdate = true; }
      const aspect = t.userData.aspect; s.center.set(64 / t.image.width, 0);          // Spitze der Blase über dem Punkt
      s.userData = { x: o.x, z: o.z, y: o.y ?? 1.8, sev: o.sev ?? .5, aspect, ph: i * 1.3 };
    });
  }
  // ---------------- Bild für Bild ----------------
  update(t, camera) {
    if (!this.root.visible) return;
    for (const n of this.nets) n.edge.material.opacity = .55 + .3 * Math.sin(t * 2.4) * (n.s < .999 ? 1.6 : .4);
    if (this.dots) {
      const m = new THREE.Matrix4(), p = new THREE.Vector3(); let k = 0;
      for (const S of this.segs) { if (!S.n) continue; for (let i = 0; i < S.n; i++) { const u = ((t * (S.s >= .999 ? .45 : .2) + i / S.n) % 1);
        p.lerpVectors(S.a, S.b, u); const sc = .6 + .4 * Math.sin(u * Math.PI); m.makeScale(sc, sc, sc).setPosition(p); this.dots.setMatrixAt(k++, m); } }
      this.dots.count = k; this.dots.instanceMatrix.needsUpdate = true;
    }
    const dist = o => camera ? Math.max(4, camera.position.distanceTo(new THREE.Vector3(o.x, o.y, o.z))) : 20;
    for (const s of this.np) if (s.visible) { const u = s.userData, d = dist(u), on = Math.sin(t * 6 + u.ph) > -.3;
      s.position.set(u.x, u.y + Math.sin(t * 2 + u.ph) * .08, u.z); const sc = .035 * d * (on ? 1 : .85); s.scale.set(sc, sc, 1); s.material.opacity = on ? 1 : .55; }
    for (const s of this.bubbles) if (s.visible) { const u = s.userData, d = dist(u), h = .045 * d * (1 + .25 * u.sev) * (1 + .06 * Math.sin(t * 3 + u.ph) * u.sev);
      s.position.set(u.x, u.y + Math.sin(t * 1.6 + u.ph) * .06, u.z); s.scale.set(h * u.aspect, h, 1); }
  }
  clear() { this.setPower([]); this.setLines([]); this.setNoPower([]); this.setIssues([]); }
  dispose() {
    this.clear(); for (const s of [...this.np, ...this.bubbles]) { this.root.remove(s); s.material.dispose(); }
    this.np = []; this.bubbles = []; for (const t of this.tex.values()) t.dispose(); this.tex.clear(); this.npTex?.dispose(); this.scene.remove(this.root);
  }
}
