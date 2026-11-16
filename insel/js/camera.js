// Kamera: Orbit um ein Ziel am Boden mit exponentiellem Zoom zum Mauszeiger, abstandsabhängiger Neigung (weit von oben,
// nah „Spaziergänger-Blick“), weicher Dämpfung, Flügen, Grenzen, Zeitraffer-Kreisen und Kollision (Boden + Gebäude).
// Maus: links ziehen = schieben, rechts/mitte ziehen = drehen/kippen, Rad/Trackpad = zoomen. Touch: 1 Finger schieben,
// 2 Finger zoomen + drehen. Tasten: WASD/Pfeile, Q/E, +/-.
import * as THREE from 'three';

const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
const ease = s => s < .5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2;
const TAP_PX = 6;

export class CameraRig {
  constructor(camera, dom, { ground = () => 0, blockers = () => [] } = {}) {
    this.camera = camera; this.dom = dom; this.ground = ground; this.blockers = blockers;
    this.minDist = 1.2; this.maxDist = 160;
    this.pitchNear = 10 * DEG; this.pitchFar = 55 * DEG;          // Neigung ganz nah / weit
    this.minPitch = 2 * DEG; this.maxPitch = 86 * DEG;
    this.clearance = .25;                                         // Mindesthöhe über dem Boden
    this.damping = 9;                                             // höher = direkter
    this.c = { t: new THREE.Vector3(), yaw: .6, po: 0, d: 40 };   // aktueller Zustand
    this.g = { t: new THREE.Vector3(), yaw: .6, po: 0, d: 40 };   // Ziel-Zustand
    this.vel = new THREE.Vector3(); this.bounds = null; this.orbitSpeed = 0; this.fly = null;
    this.onTap = null; this.onHover = null; this.onChange = null; this.onWheel = null; this.onLongPress = null;
    this.enabled = true; this.keys = new Set(); this.ptr = new Map(); this.colDist = 1e9; this._colKey = ''; this._hit = 1e9;
    this.ray = new THREE.Raycaster(); this.camDistance = 40;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._o = new THREE.Vector3();
    this._bind();
    this.c.t.y = this.g.t.y = this._gy(0, 0, 0);
    this._place();
  }

  // ---------------- öffentliche Werte ----------------
  get target() { return this.c.t; }
  get yaw() { return this.c.yaw; }
  set yaw(v) { this.c.yaw = this.g.yaw = v; }
  get distance() { return this.c.d; }
  set distance(v) { this.c.d = this.g.d = clamp(v, this.minDist, this.maxDist); }
  get pitch() { return this._pitch(this.c.d, this.c.po); }
  set pitch(v) { this.c.po = this.g.po = v - this._pitch(this.c.d, 0); }
  get goal() { return this.g; }
  get flying() { return !!this.fly; }

  basePitch(d) { const t = sstep(Math.log(1.5), Math.log(60), Math.log(d)); return lerp(this.pitchNear, this.pitchFar, Math.pow(t, .9)); }
  _pitch(d, po) { return clamp(this.basePitch(d) + po, this.minPitch, this.maxPitch); }
  lift(d) { return Math.min(.35, d * .15) + sstep(10, 1.2, d) * .35; }   // Drehpunkt über dem Boden (nah: Augenhöhe)
  _gy(x, z, fb) { const y = this.ground(x, z); return Number.isFinite(y) ? y : fb; }
  _offset(yaw, pitch, out = this._o) { return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); }

  // Sofort hinsetzen (ohne Dämpfung)
  jumpTo(p, distance = this.g.d, yaw = this.g.yaw, po = this.g.po) {
    this.fly = null; this.vel.set(0, 0, 0);
    for (const s of [this.c, this.g]) { s.t.copy(p); s.d = clamp(distance, this.minDist, this.maxDist); s.yaw = yaw; s.po = po; }
    this.c.t.y = this.g.t.y = this._gy(p.x, p.z, p.y); this.colDist = 1e9; this._colKey = ''; this._place();
  }
  // Sanfter Flug (gibt ein Promise zurück, das am Ziel erfüllt wird)
  flyTo(p, distance = this.g.d, yaw) {
    const f = this.c, to = { t: new THREE.Vector3(p.x, this._gy(p.x, p.z, p.y ?? f.t.y), p.z), d: clamp(distance, this.minDist, this.maxDist), yaw: f.yaw, po: 0 };
    if (yaw !== undefined) { let y = yaw; while (y - f.yaw > Math.PI) y -= 2 * Math.PI; while (y - f.yaw < -Math.PI) y += 2 * Math.PI; to.yaw = y; }
    const travel = Math.hypot(to.t.x - f.t.x, to.t.z - f.t.z), zr = Math.abs(Math.log(to.d / f.d));
    const dur = clamp(.9 + .35 * Math.log(1 + travel / 10) + .25 * zr + Math.abs(to.yaw - f.yaw) * .2, .8, 2.8);
    const hop = clamp(travel / (Math.max(f.d, to.d) * 3), 0, 1.2);
    this.vel.set(0, 0, 0);
    return new Promise(res => { this.fly?.res(false); this.fly = { s: 0, dur, hop, from: { t: f.t.clone(), d: f.d, yaw: f.yaw, po: f.po }, to, res }; this._emit('fly'); });
  }
  setBounds(center, radius) { this.bounds = center ? { c: new THREE.Vector3().copy(center), r: radius } : null; }
  autoOrbit(speed = 0) { this.orbitSpeed = speed; }
  serialize() { const g = this.g; return { x: +g.t.x.toFixed(3), y: +g.t.y.toFixed(3), z: +g.t.z.toFixed(3), yaw: +g.yaw.toFixed(4), po: +g.po.toFixed(4), d: +g.d.toFixed(3) }; }
  restore(o) { if (!o) return; this.jumpTo(new THREE.Vector3(o.x || 0, o.y || 0, o.z || 0), o.d ?? this.g.d, o.yaw ?? this.g.yaw, o.po ?? 0); }

  // ---------------- Bild für Bild ----------------
  update(dt = 1 / 60) {
    dt = clamp(dt, 0, .1); const c = this.c, g = this.g;
    if (this.fly) {
      const F = this.fly; F.s = Math.min(1, F.s + dt / F.dur); const e = ease(F.s);
      c.t.lerpVectors(F.from.t, F.to.t, e);
      c.d = Math.exp(lerp(Math.log(F.from.d), Math.log(F.to.d), e)) * (1 + F.hop * Math.sin(Math.PI * e));
      c.yaw = lerp(F.from.yaw, F.to.yaw, e); c.po = lerp(F.from.po, F.to.po, e);
      g.t.copy(c.t); g.d = c.d; g.yaw = c.yaw; g.po = c.po;
      if (F.s >= 1) { this.fly = null; g.d = F.to.d; F.res(true); }
    } else {
      this._keys(dt);
      if (!this._panning && this.vel.lengthSq() > 1e-6) {                       // Schwung nach dem Loslassen
        g.t.addScaledVector(this.vel, dt); c.t.addScaledVector(this.vel, dt); this.vel.multiplyScalar(Math.exp(-5 * dt));
      }
      if (this.orbitSpeed) g.yaw += this.orbitSpeed * dt;
      this._clampBounds(g.t); this._clampBounds(c.t);
      g.t.y = this._gy(g.t.x, g.t.z, g.t.y);
      const k = 1 - Math.exp(-this.damping * dt);
      c.t.x = lerp(c.t.x, g.t.x, k); c.t.z = lerp(c.t.z, g.t.z, k); c.t.y = lerp(c.t.y, g.t.y, 1 - Math.exp(-6 * dt));
      c.yaw = lerp(c.yaw, g.yaw, k); c.po = lerp(c.po, g.po, k);
      c.d = Math.exp(lerp(Math.log(c.d), Math.log(g.d), k));
    }
    this._place(dt);
  }
  _clampBounds(t) {
    if (!this.bounds) return; const b = this.bounds, dx = t.x - b.c.x, dz = t.z - b.c.z, L = Math.hypot(dx, dz);
    if (L > b.r) { t.x = b.c.x + dx / L * b.r; t.z = b.c.z + dz / L * b.r; if (t === this.g.t) this.vel.multiplyScalar(.5); }
  }

  // Kamera aus dem aktuellen Zustand setzen, mit Kollision
  _place(dt = 0) {
    const c = this.c, cam = this.camera, pitch = this._pitch(c.d, c.po), off = this._offset(c.yaw, pitch);
    // Strahl vom Ziel zur Kamera gegen Hindernisse (nur neu, wenn sich etwas bewegt hat)
    const lift = this.lift(c.d), o = this._v.copy(c.t); o.y += lift;
    const key = `${o.x.toFixed(2)},${o.y.toFixed(2)},${o.z.toFixed(2)},${c.yaw.toFixed(3)},${pitch.toFixed(3)},${c.d.toFixed(2)}`;
    if (key !== this._colKey) {
      this._colKey = key; let h = c.d;
      const bl = this.blockers?.() || [];
      if (bl.length) {
        this.ray.set(o, off); this.ray.near = .02; this.ray.far = c.d + .3;
        const hits = this.ray.intersectObjects(bl, true);
        if (hits.length) h = Math.min(h, hits[0].distance - .22);
      }
      // Boden zwischen Ziel und Kamera
      for (let i = 1; i <= 12; i++) {
        const s = h * i / 12, x = o.x + off.x * s, y = o.y + off.y * s, z = o.z + off.z * s;
        if (y < this._gy(x, z, -1e9) + this.clearance * .6) { h = Math.max(.15, h * (i - 1) / 12); break; }
      }
      this._hit = Math.max(.12, h);
    }
    // nach innen sofort, nach außen weich
    if (this._hit < this.colDist || !dt) this.colDist = this._hit; else this.colDist = lerp(this.colDist, this._hit, 1 - Math.exp(-5 * dt));
    const dist = Math.min(this.colDist, c.d);
    cam.position.copy(o).addScaledVector(off, dist);
    const gy = this._gy(cam.position.x, cam.position.z, -1e9) + this.clearance;
    if (cam.position.y < gy) cam.position.y = gy;
    this.camDistance = dist;
    cam.lookAt(o);
    cam.updateMatrixWorld();
  }

  // ---------------- Zoom / Strahlen ----------------
  // Virtuelle Kamera eines Zustands → Strahl durch ndc
  _rayDir(state, ndcX, ndcY, outO, outD) {
    const pitch = this._pitch(state.d, state.po), off = this._offset(state.yaw, pitch, new THREE.Vector3());
    outO.copy(state.t).addScaledVector(off, state.d); outO.y += this.lift(state.d);
    const f = off.clone().negate(), r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, f);
    const tv = Math.tan(this.camera.fov * DEG / 2);
    outD.copy(f).addScaledVector(r, ndcX * tv * this.camera.aspect).addScaledVector(u, ndcY * tv).normalize();
    return off;
  }
  // Bodenpunkt unter ndc (Boden-Funktion, sonst Ebene in Zielhöhe)
  pick(ndcX, ndcY, state = this.g) {
    const O = new THREE.Vector3(), D = new THREE.Vector3(); this._rayDir(state, ndcX, ndcY, O, D);
    const maxT = state.d * 8, N = 64; let prev = 0;
    for (let i = 1; i <= N; i++) {
      const s = maxT * Math.pow(i / N, 1.6), y = O.y + D.y * s, gy = this._gy(O.x + D.x * s, O.z + D.z * s, -1e9);
      if (y < gy) { let a = prev, b = s; for (let k = 0; k < 8; k++) { const m = (a + b) / 2; if (O.y + D.y * m < this._gy(O.x + D.x * m, O.z + D.z * m, -1e9)) b = m; else a = m; } return O.addScaledVector(D, b); }
      prev = s;
    }
    if (D.y < -1e-3) { const s = (state.t.y - O.y) / D.y; if (s > 0 && s < maxT) return O.addScaledVector(D, s); }
    return null;
  }
  // Ziel so wählen, dass Punkt P bei gegebenem Zustand unter ndc liegt
  _solveTarget(P, ndcX, ndcY, d, yaw, po, ty) {
    const s0 = { t: new THREE.Vector3(0, 0, 0), d, yaw, po }, O = new THREE.Vector3(), D = new THREE.Vector3();
    const off = this._rayDir(s0, ndcX, ndcY, O, D);            // O = Kamera relativ zum Ziel (inkl. Hebung)
    if (D.y > -1e-3) return null;
    let t = null;
    for (let i = 0; i < 3; i++) {                             // Zielhöhe folgt dem Boden → zweimal nachbessern
      const s = (P.y - O.y - ty) / D.y; if (s <= 0) return t;
      t = new THREE.Vector3().copy(P).addScaledVector(D, -s).sub(O);
      ty = this._gy(t.x, t.z, ty);
    }
    return t;
  }
  zoomAt(ndcX, ndcY, factor) {
    this._cancelFly(); const g = this.g, nd = clamp(g.d * factor, this.minDist, this.maxDist);
    if (Math.abs(nd - g.d) < 1e-6) return;
    const P = this.pick(ndcX, ndcY, g);
    if (P) { const t = this._solveTarget(P, ndcX, ndcY, nd, g.yaw, g.po, g.t.y); if (t) { g.t.x = t.x; g.t.z = t.z; this._clampBounds(g.t); } }
    g.d = nd; this._emit('zoom');
  }

  // ---------------- Eingaben ----------------
  ndc(e) { const r = this.dom.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1]; }
  _emit(kind) { this.onChange?.(kind, this); }
  _cancelFly() { if (this.fly) { this.fly.res(false); this.fly = null; } }
  _bind() {
    const d = this.dom; d.style.touchAction = 'none';
    this._h = {
      down: e => this._down(e), move: e => this._move(e), up: e => this._up(e), wheel: e => this._wheel(e),
      ctx: e => e.preventDefault(), kd: e => this._key(e, true), ku: e => this._key(e, false), blur: () => this.keys.clear(),
    };
    d.addEventListener('pointerdown', this._h.down); d.addEventListener('pointermove', this._h.move);
    d.addEventListener('pointerup', this._h.up); d.addEventListener('pointercancel', this._h.up);
    d.addEventListener('wheel', this._h.wheel, { passive: false }); d.addEventListener('contextmenu', this._h.ctx);
    addEventListener('keydown', this._h.kd); addEventListener('keyup', this._h.ku); addEventListener('blur', this._h.blur);
  }
  dispose() {
    const d = this.dom, h = this._h;
    d.removeEventListener('pointerdown', h.down); d.removeEventListener('pointermove', h.move); d.removeEventListener('pointerup', h.up);
    d.removeEventListener('pointercancel', h.up); d.removeEventListener('wheel', h.wheel); d.removeEventListener('contextmenu', h.ctx);
    removeEventListener('keydown', h.kd); removeEventListener('keyup', h.ku); removeEventListener('blur', h.blur);
  }
  _down(e) {
    if (!this.enabled) return;
    this.dom.setPointerCapture?.(e.pointerId);
    const p = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, type: e.pointerType, button: e.button, moved: false, t0: performance.now() };
    this.ptr.set(e.pointerId, p); this._cancelFly(); this.vel.set(0, 0, 0);
    clearTimeout(this._lp); this._lpFired = false;
    if (this.ptr.size === 1) {
      const rot = e.pointerType === 'mouse' && (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey));
      this.mode = rot ? 'rotate' : 'pan'; this._startPan(p);
      if (e.pointerType !== 'mouse' && this.onLongPress) this._lp = setTimeout(() => { if (!p.moved && this.ptr.size === 1) { this._lpFired = true; this.onLongPress(...this.ndc(p), e); } }, 550);
    } else if (this.ptr.size === 2) this._startPinch();
  }
  _startPan(p) { const [nx, ny] = this.ndc({ clientX: p.x, clientY: p.y }); this._grab = this._pickCur(nx, ny); this._lastT = performance.now(); }
  // Bodenpunkt mit der echten (aktuellen) Kamera: Ebene in Zielhöhe
  _pickCur(nx, ny, y = this.c.t.y) {
    const r = this.ray; r.setFromCamera({ x: nx, y: ny }, this.camera); const D = r.ray.direction, O = r.ray.origin;
    if (D.y > -1e-3) return null; const s = (y - O.y) / D.y; if (s <= 0 || s > this.c.d * 12) return null;
    return O.clone().addScaledVector(D, s);
  }
  _startPinch() {
    const [a, b] = [...this.ptr.values()]; this.mode = 'pinch'; this._panning = true;
    for (const p of [a, b]) p.moved = true;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    this._pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), dist0: this.c.d, yaw0: this.c.yaw, grab: this._pickCur(...this.ndc({ clientX: mx, clientY: my })) };
  }
  _move(e) {
    const p = this.ptr.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse' && this.onHover) this.onHover(...this.ndc(e), e); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (!p.moved && Math.hypot(p.x - p.x0, p.y - p.y0) >= TAP_PX) { p.moved = true; clearTimeout(this._lp); }
    if (!p.moved || !this.enabled) return;
    const c = this.c, g = this.g;
    if (this.mode === 'pan' && this.ptr.size === 1) {
      this._panning = true;
      if (!this._grab) { this._startPan(p); return; }
      const Q = this._pickCur(...this.ndc(e), this._grab.y); if (!Q) return;
      const lim = c.d * 2, mx = clamp(this._grab.x - Q.x, -lim, lim), mz = clamp(this._grab.z - Q.z, -lim, lim);
      c.t.x += mx; c.t.z += mz; g.t.x += mx; g.t.z += mz; this._clampBounds(c.t); this._clampBounds(g.t);
      const now = performance.now(), tdt = Math.max(1, now - this._lastT) / 1000; this._lastT = now;
      this.vel.lerp(this._v.set(mx / tdt, 0, mz / tdt), .5); this.vel.clampLength(0, c.d * 6);
      this._place(); this._emit('pan');
    } else if (this.mode === 'rotate') {
      g.yaw -= dx * .006; g.po = clamp(g.po + dy * .004, this.minPitch - this.basePitch(g.d), this.maxPitch - this.basePitch(g.d)); this._emit('rotate');
    } else if (this.mode === 'pinch' && this.ptr.size >= 2) {
      const [a, b] = [...this.ptr.values()], P = this._pinch, dd = Math.hypot(a.x - b.x, a.y - b.y) || 1, ang = Math.atan2(b.y - a.y, b.x - a.x);
      const nd = clamp(P.dist0 * P.d0 / dd, this.minDist, this.maxDist), ny = P.yaw0 - (ang - P.a0);
      c.d = g.d = nd; c.yaw = g.yaw = ny;
      if (P.grab) { const [nx, nyy] = this.ndc({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }); const t = this._solveTarget(P.grab, nx, nyy, nd, ny, c.po, c.t.y); if (t) { c.t.x = g.t.x = t.x; c.t.z = g.t.z = t.z; } }
      this._place(); this._emit('zoom');
    }
  }
  _up(e) {
    const p = this.ptr.get(e.pointerId); if (!p) return;
    this.ptr.delete(e.pointerId); clearTimeout(this._lp);
    if (!p.moved && !this._lpFired && this.ptr.size === 0 && this.mode !== 'pinch' && this.enabled) this.onTap?.(...this.ndc(e), e);
    if (this.ptr.size === 0) {
      if (performance.now() - (this._lastT || 0) > 90) this.vel.set(0, 0, 0);
      this._panning = false; this.mode = null; this._grab = null;
    } else if (this.ptr.size === 1) { const q = [...this.ptr.values()][0]; this.mode = 'pan'; this._startPan(q); this.vel.set(0, 0, 0); }
  }
  _wheel(e) {
    e.preventDefault(); if (!this.enabled) return;
    if (this.onWheel?.(e) === true) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    const f = clamp(Math.exp(dy * (e.ctrlKey ? .012 : .0018)), .5, 2);
    this.zoomAt(...this.ndc(e), f);
  }
  _key(e, down) {
    const el = document.activeElement, tag = el?.tagName;
    if (down && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable || e.ctrlKey || e.metaKey || e.altKey)) return;
    const k = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', KeyQ: 'q', KeyE: 'e' }[e.code]
      || { '+': 'in', '=': 'in', '-': 'out', '_': 'out' }[e.key] || (e.code === 'NumpadAdd' ? 'in' : e.code === 'NumpadSubtract' ? 'out' : null);
    if (!k) return;
    if (down) { this.keys.add(k); this._cancelFly(); } else this.keys.delete(k);
  }
  _keys(dt) {
    if (!this.keys.size || !this.enabled) return; const K = this.keys, g = this.g;
    const fw = (K.has('f') ? 1 : 0) - (K.has('b') ? 1 : 0), st = (K.has('r') ? 1 : 0) - (K.has('l') ? 1 : 0);
    if (fw || st) {
      const sp = g.d * .9 * dt, sy = Math.sin(g.yaw), cy = Math.cos(g.yaw);
      g.t.x += (-sy * fw + cy * st) * sp; g.t.z += (-cy * fw - sy * st) * sp; this._emit('pan');
    }
    if (K.has('q')) { g.yaw += 1.5 * dt; this._emit('rotate'); }
    if (K.has('e')) { g.yaw -= 1.5 * dt; this._emit('rotate'); }
    if (K.has('in')) { g.d = clamp(g.d * Math.exp(-1.6 * dt), this.minDist, this.maxDist); this._emit('zoom'); }
    if (K.has('out')) { g.d = clamp(g.d * Math.exp(1.6 * dt), this.minDist, this.maxDist); this._emit('zoom'); }
  }
}
