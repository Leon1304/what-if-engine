// Fließband (Cogtopia) – Kamera: schräge Draufsicht auf flachen Boden (y = 0).
// Blickrichtung in 90°-Schritten (yawStep, +45° Versatz → diagonale Sicht), Neigung hängt vom Abstand ab (nah flacher, weit steiler).
// Maus: links/mitte ziehen = schieben (Griffpunkt bleibt unter dem Zeiger), rechts ziehen = frei drehen, rastet beim Loslassen weich ein,
// Rad = zoomen zum Zeiger. Touch: 1 Finger schieben, 2 Finger zoomen + drehen (rastet danach ein). Tasten: WASD/Pfeile, Q/E, +/-.
// Schwung nach dem Schieben, Grenzen als Rechteck. shake(strength, secs) lässt die Kamera wackeln (Erdbeben).
import * as THREE from 'three';

const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180, STEP = Math.PI / 2, OFF = Math.PI / 4;
const ease = s => s < .5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2;
const TAP_PX = 6;
const mod4 = n => ((n % 4) + 4) % 4;

export class CameraRig {
  constructor(camera, dom, { bounds = null, minDist = 6, maxDist = 90 } = {}) {
    this.camera = camera; this.dom = dom;
    this.minDist = minDist; this.maxDist = maxDist;
    this.pitchNear = 38 * DEG; this.pitchFar = 62 * DEG;
    this.damping = 10; this.rotDamping = 8;
    this.step = 0;                                                          // Raster-Schritt (ganzzahlig, ungebunden)
    this.c = { t: new THREE.Vector3(), yaw: OFF, d: 28 };                   // aktuell
    this.g = { t: new THREE.Vector3(), yaw: OFF, d: 28 };                   // Ziel
    this.vel = new THREE.Vector3(); this.bounds = null; this.fly = null;
    this.leftPan = true; this.panGate = null;
    this.onTap = null; this.onHover = null; this.onChange = null;
    this.enabled = true; this.keys = new Set(); this.ptr = new Map(); this.ignored = new Set();
    this.ray = new THREE.Raycaster();
    this._v = new THREE.Vector3(); this._o = new THREE.Vector3(); this._Y = new THREE.Vector3(0, 1, 0);
    this.setBounds(bounds);
    this._bind(); this._place();
  }

  // ---------------- öffentliche Werte ----------------
  get target() { return this.c.t; }
  get distance() { return this.c.d; }
  get yaw() { return this.c.yaw; }
  get yawStep() { return mod4(this.step); }
  get pitch() { return this.pitchAt(this.c.d); }
  get flying() { return !!this.fly; }
  pitchAt(d) { const t = sstep(Math.log(this.minDist), Math.log(this.maxDist), Math.log(clamp(d, this.minDist, this.maxDist))); return lerp(this.pitchNear, this.pitchFar, t); }
  _stepYaw(s) { return s * STEP + OFF; }
  _offset(yaw, pitch, out = this._o) { return out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); }

  setBounds(b) { this.bounds = b ? { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ } : null; this._clamp(this.g.t); this._clamp(this.c.t); }
  _clamp(t) { const b = this.bounds; if (!b) return; t.x = clamp(t.x, b.minX, b.maxX); t.z = clamp(t.z, b.minZ, b.maxZ); t.y = 0; }

  // Einen 90°-Schritt weich drehen (dir = +1 / −1)
  rotateStep(dir = 1) {
    this._cancelFly();
    // vom aktuell angepeilten Raster aus weiterzählen
    this.step = Math.round((this.g.yaw - OFF) / STEP) + Math.sign(dir || 1);
    this.g.yaw = this._stepYaw(this.step); this._emit('rotate');
  }
  // sofort hinsetzen
  jumpTo(x, z, distance = this.g.d, yawStep) {
    this.fly = null; this.vel.set(0, 0, 0);
    if (yawStep !== undefined) this.step = Math.round(yawStep);
    for (const s of [this.c, this.g]) { s.t.set(x, 0, z); this._clamp(s.t); s.d = clamp(distance, this.minDist, this.maxDist); s.yaw = this._stepYaw(this.step); }
    this._place(); this._emit('jump');
  }
  // weicher Flug, Promise wird am Ziel erfüllt (false, wenn abgebrochen)
  flyTo(x, z, distance = this.g.d) {
    const f = this.c, to = { t: new THREE.Vector3(x, 0, z), d: clamp(distance, this.minDist, this.maxDist) }; this._clamp(to.t);
    const travel = Math.hypot(to.t.x - f.t.x, to.t.z - f.t.z), zr = Math.abs(Math.log(to.d / f.d));
    const dur = clamp(.7 + .3 * Math.log(1 + travel / 8) + .25 * zr, .6, 2.4), hop = clamp(travel / (Math.max(f.d, to.d) * 3), 0, .8);
    this.vel.set(0, 0, 0);
    return new Promise(res => { this.fly?.res(false); this.fly = { s: 0, dur, hop, from: { t: f.t.clone(), d: f.d }, to, res }; this._emit('fly'); });
  }
  serialize() { const g = this.g; return { x: +g.t.x.toFixed(3), z: +g.t.z.toFixed(3), d: +g.d.toFixed(3), step: mod4(this.step) }; }
  restore(o) { if (o) this.jumpTo(o.x || 0, o.z || 0, o.d ?? this.g.d, o.step ?? 0); }

  // ---------------- Bild für Bild ----------------
  // Wackeln (Erdbeben, Einschlag): strength ≈ Ausschlag in Einheiten bei Abstand 30, secs = Dauer (klingt weich ab). Mehrere addieren sich.
  shake(strength = .35, secs = 1.6) { this._sk = (this._sk || []).filter(s => s.age < s.dur); this._sk.push({ s: strength, dur: Math.max(.05, secs), age: 0, ph: Math.random() * 100 }); }
  get shaking() { return !!this._sk?.some(s => s.age < s.dur); }
  update(dt = 1 / 60) {
    dt = clamp(dt, 0, .1); const c = this.c, g = this.g;
    if (this._sk) for (const s of this._sk) s.age += dt;
    if (this.fly) {
      const F = this.fly; F.s = Math.min(1, F.s + dt / F.dur); const e = ease(F.s);
      c.t.lerpVectors(F.from.t, F.to.t, e);
      c.d = Math.exp(lerp(Math.log(F.from.d), Math.log(F.to.d), e)) * (1 + F.hop * Math.sin(Math.PI * e));
      g.t.copy(c.t); g.d = c.d;
      if (F.s >= 1) { this.fly = null; g.d = c.d = F.to.d; F.res(true); }
    } else {
      this._keys(dt);
      if (!this._panning && this.vel.lengthSq() > 1e-6) {
        g.t.addScaledVector(this.vel, dt); c.t.addScaledVector(this.vel, dt); this.vel.multiplyScalar(Math.exp(-5 * dt));
        if (this.vel.lengthSq() < 1e-4) this.vel.set(0, 0, 0);
      }
      this._clamp(g.t); this._clamp(c.t);
      const k = 1 - Math.exp(-this.damping * dt);
      c.t.x = lerp(c.t.x, g.t.x, k); c.t.z = lerp(c.t.z, g.t.z, k);
      c.d = Math.exp(lerp(Math.log(c.d), Math.log(g.d), k));
    }
    c.yaw = lerp(c.yaw, g.yaw, 1 - Math.exp(-this.rotDamping * dt));
    if (Math.abs(c.yaw - g.yaw) < 1e-4) c.yaw = g.yaw;
    this._place();
  }
  _place() {
    const c = this.c, cam = this.camera, off = this._offset(c.yaw, this.pitchAt(c.d));
    cam.position.copy(c.t).addScaledVector(off, c.d);
    cam.up.set(0, 1, 0); cam.lookAt(c.t);
    if (this._sk && this._sk.length) {
      let x = 0, y = 0, z = 0, roll = 0;
      for (const s of this._sk) { if (s.age >= s.dur) continue; const u = s.age / s.dur, env = s.s * (1 - u) * (1 - u) * Math.min(1, s.age * 20) * c.d / 30, a = s.age + s.ph;
        x += env * (Math.sin(a * 37) * .6 + Math.sin(a * 23.3) * .4); y += env * (Math.sin(a * 41.7) * .5 + Math.sin(a * 17.1) * .3); z += env * (Math.sin(a * 29.9) * .6 + Math.sin(a * 13.7) * .4);
        roll += env * .02 * Math.sin(a * 31); }
      cam.position.x += x; cam.position.y += y; cam.position.z += z; cam.rotateZ(roll);
      if (this._sk.every(s => s.age >= s.dur)) this._sk = null;
    }
    cam.updateMatrixWorld();
  }

  // ---------------- Strahlen / Zoom ----------------
  // Strahl durch ndc für einen gedachten Zustand (Ziel im Ursprung) → { O, D } relativ zum Ziel
  _rayRel(d, yaw, nx, ny) {
    const off = this._offset(yaw, this.pitchAt(d), new THREE.Vector3()), O = off.clone().multiplyScalar(d);
    const f = off.clone().negate(), r = new THREE.Vector3().crossVectors(f, this._Y).normalize(), u = new THREE.Vector3().crossVectors(r, f);
    const tv = Math.tan(this.camera.fov * DEG / 2), asp = this.camera.aspect || 1;
    const D = f.addScaledVector(r, nx * tv * asp).addScaledVector(u, ny * tv).normalize();
    return { O, D };
  }
  // Bodenpunkt unter ndc (mit dem Ziel-Zustand, damit Zoomen ruhig bleibt)
  pick(nx, ny, state = this.g) {
    const { O, D } = this._rayRel(state.d, state.yaw, nx, ny); if (D.y > -1e-4) return null;
    const s = -O.y / D.y; if (s <= 0 || s > state.d * 20) return null;
    return O.addScaledVector(D, s).add(state.t).setY(0);
  }
  // Bodenpunkt unter ndc mit der echten Kamera
  pickCurrent(nx, ny) {
    this.ray.setFromCamera({ x: nx, y: ny }, this.camera); const D = this.ray.ray.direction, O = this.ray.ray.origin;
    if (D.y > -1e-4) return null; const s = -O.y / D.y; if (s <= 0 || s > this.c.d * 20) return null;
    return O.clone().addScaledVector(D, s).setY(0);
  }
  // Ziel so, dass Bodenpunkt P bei Abstand d / Drehung yaw unter ndc liegt
  _solveTarget(P, nx, ny, d, yaw) {
    const { O, D } = this._rayRel(d, yaw, nx, ny); if (D.y > -1e-4) return null;
    const s = -O.y / D.y; const hit = O.addScaledVector(D, s); return new THREE.Vector3(P.x - hit.x, 0, P.z - hit.z);
  }
  zoomAt(nx, ny, factor) {
    this._cancelFly(); const g = this.g, nd = clamp(g.d * factor, this.minDist, this.maxDist);
    if (Math.abs(nd - g.d) < 1e-6) return;
    const P = this.pick(nx, ny, g);
    if (P) { const t = this._solveTarget(P, nx, ny, nd, g.yaw); if (t) { g.t.copy(t); this._clamp(g.t); } }
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
    this._cancelFly();
  }
  _rec(e) { return { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, type: e.pointerType, button: e.button, moved: false }; }
  _down(e) {
    if (!this.enabled) return;
    const left = e.button === 0 && !(e.pointerType === 'mouse' && e.shiftKey);
    // Linke Taste / erster Finger: darf die Integration für sich beanspruchen (Bänder ziehen)
    if (left && this.ptr.size === 0 && (!this.leftPan || (this.panGate && this.panGate(e) === false))) {
      this.ignored.add(e.pointerId); this._ign = this._rec(e); return;
    }
    // zweiter Finger, während der erste der Integration gehört → beide für Zoom/Drehen übernehmen
    if (e.pointerType !== 'mouse' && this._ign && this._ign.type !== 'mouse' && this.ptr.size === 0) {
      this.ptr.set(this._ign.id, this._ign); this.ignored.clear(); this._ign = null; this._emit('grab');
    }
    try { this.dom.setPointerCapture?.(e.pointerId); } catch (_) { /* synthetische Ereignisse */ }
    const p = this._rec(e); this.ptr.set(e.pointerId, p); this._cancelFly(); this.vel.set(0, 0, 0);
    if (this.ptr.size === 1) {
      const rot = e.pointerType === 'mouse' && (e.button === 2 || (e.button === 0 && e.shiftKey));
      this.mode = rot ? 'rotate' : 'pan';
      if (rot) this._rot0 = { yaw: this.g.yaw }; else this._startPan(p);
    } else if (this.ptr.size === 2) this._startPinch();
  }
  _startPan(p) { this._grab = this.pickCurrent(...this.ndc({ clientX: p.x, clientY: p.y })); this._lastT = performance.now(); }
  _startPinch() {
    const [a, b] = [...this.ptr.values()]; this.mode = 'pinch'; this._panning = true; a.moved = b.moved = true;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    this._pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), dist0: this.c.d, yaw0: this.c.yaw, grab: this.pickCurrent(...this.ndc({ clientX: mx, clientY: my })) };
    this.g.yaw = this.c.yaw;
  }
  _move(e) {
    if (this.ignored.has(e.pointerId) || (this._ign && this._ign.id === e.pointerId)) { if (this._ign) { this._ign.x = e.clientX; this._ign.y = e.clientY; } return; }
    const p = this.ptr.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse' && this.onHover) this.onHover(...this.ndc(e), e); return; }
    const dx = e.clientX - p.x; p.x = e.clientX; p.y = e.clientY;
    if (!p.moved && Math.hypot(p.x - p.x0, p.y - p.y0) >= TAP_PX) p.moved = true;
    if (!p.moved || !this.enabled) return;
    const c = this.c, g = this.g;
    if (this.mode === 'pan' && this.ptr.size === 1) {
      this._panning = true;
      if (!this._grab) { this._startPan(p); return; }
      const Q = this.pickCurrent(...this.ndc(e)); if (!Q) return;
      const lim = c.d * 2, mx = clamp(this._grab.x - Q.x, -lim, lim), mz = clamp(this._grab.z - Q.z, -lim, lim);
      // Schieben zieht das Ziel sofort mit (kein Nachlaufen), damit der Griffpunkt unter dem Zeiger bleibt
      c.t.x += mx; c.t.z += mz; this._clamp(c.t); g.t.copy(c.t);
      const now = performance.now(), tdt = Math.max(1, now - this._lastT) / 1000; this._lastT = now;
      this.vel.lerp(this._v.set(mx / tdt, 0, mz / tdt), .5); this.vel.clampLength(0, c.d * 5);
      this._place(); this._emit('pan');
    } else if (this.mode === 'rotate') {
      g.yaw -= dx * .006; this._emit('rotate');
    } else if (this.mode === 'pinch' && this.ptr.size >= 2) {
      const [a, b] = [...this.ptr.values()], P = this._pinch, dd = Math.hypot(a.x - b.x, a.y - b.y) || 1, ang = Math.atan2(b.y - a.y, b.x - a.x);
      const nd = clamp(P.dist0 * P.d0 / dd, this.minDist, this.maxDist), ny = P.yaw0 + (ang - P.a0);
      c.d = g.d = nd; c.yaw = g.yaw = ny;
      if (P.grab) { const [nx, nyy] = this.ndc({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }); const t = this._solveTarget(P.grab, nx, nyy, nd, ny); if (t) { c.t.copy(t); this._clamp(c.t); g.t.copy(c.t); } }
      this._place(); this._emit('zoom');
    }
  }
  _snap() { this.step = Math.round((this.g.yaw - OFF) / STEP); this.g.yaw = this._stepYaw(this.step); this._emit('snap'); }
  _up(e) {
    if (this._ign && this._ign.id === e.pointerId) { this._ign = null; this.ignored.delete(e.pointerId); return; }
    const p = this.ptr.get(e.pointerId); if (!p) return;
    this.ptr.delete(e.pointerId);
    const wasMode = this.mode;
    if (!p.moved && this.ptr.size === 0 && wasMode !== 'pinch' && this.enabled && p.button === 0) this.onTap?.(...this.ndc(e), e);
    if (this.ptr.size === 0) {
      if (performance.now() - (this._lastT || 0) > 90) this.vel.set(0, 0, 0);
      if (wasMode === 'rotate' || wasMode === 'pinch') this._snap();
      if (wasMode === 'pinch') this.vel.set(0, 0, 0);
      this._panning = false; this.mode = null; this._grab = null;
    } else if (this.ptr.size === 1) {                    // vom Zwei-Finger-Griff zurück zu einem: einrasten, weiter schieben
      if (wasMode === 'pinch') this._snap();
      const q = [...this.ptr.values()][0]; this.mode = 'pan'; this._startPan(q); this.vel.set(0, 0, 0);
    }
  }
  _wheel(e) {
    e.preventDefault(); if (!this.enabled) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    this.zoomAt(...this.ndc(e), clamp(Math.exp(dy * (e.ctrlKey ? .012 : .0016)), .5, 2));
  }
  _key(e, down) {
    const el = typeof document !== 'undefined' ? document.activeElement : null, tag = el?.tagName;
    if (down && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable || e.ctrlKey || e.metaKey || e.altKey)) return;
    const k = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' }[e.code]
      || { '+': 'in', '=': 'in', '-': 'out', '_': 'out' }[e.key] || (e.code === 'NumpadAdd' ? 'in' : e.code === 'NumpadSubtract' ? 'out' : null);
    if (down && !e.repeat && (e.code === 'KeyQ' || e.code === 'KeyE')) { if (this.enabled) this.rotateStep(e.code === 'KeyQ' ? 1 : -1); return; }
    if (!k) return;
    if (down) { this.keys.add(k); this._cancelFly(); } else this.keys.delete(k);
  }
  _keys(dt) {
    if (!this.keys.size || !this.enabled) return; const K = this.keys, g = this.g;
    const fw = (K.has('f') ? 1 : 0) - (K.has('b') ? 1 : 0), st = (K.has('r') ? 1 : 0) - (K.has('l') ? 1 : 0);
    if (fw || st) {
      const sp = g.d * .9 * dt, sy = Math.sin(this.c.yaw), cy = Math.cos(this.c.yaw);
      g.t.x += (-sy * fw + cy * st) * sp; g.t.z += (-cy * fw - sy * st) * sp; this._clamp(g.t); this._emit('pan');
    }
    if (K.has('in')) { g.d = clamp(g.d * Math.exp(-1.6 * dt), this.minDist, this.maxDist); this._emit('zoom'); }
    if (K.has('out')) { g.d = clamp(g.d * Math.exp(1.6 * dt), this.minDist, this.maxDist); this._emit('zoom'); }
  }
}
