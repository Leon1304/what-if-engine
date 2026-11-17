// Die Insel in 3D: hält zu jeder Kachel ihr Modell, baut nur neu, was sich geändert hat (Art, Drehung, Hausstufe,
// Wassernachbarn), lässt neue Kacheln einfallen, dreht bewegliche Teile, zeigt freie Plätze und die Vorschau.
// Leistung: Detailstufen je Kachel nach Abstand (updateLod), Kleinkram-Ebene 'detail' ohne Schatten, die Vorschau-Kachel
// wird beim Setzen übernommen (kein zweiter Neubau), Nachbarn werden in den folgenden Bildern einzeln neu gebaut.
import * as THREE from 'three';
import { key, unkey, center, neighbor, pixelToHex, cornerAt, edgeMid, R, INR } from './hex.js';
import { edgesOf, GROUP, ROAD_OK, MERGE } from './tiles.js';
import { MATS, ghostMat } from './materials.js';
import { buildTile } from './models/tilemodel.js';
import { WATER_Y } from './terrain.js';

const DROP = .55;
export class World {
  constructor(scene, game) {
    this.scene = scene; this.game = game; this.root = new THREE.Group(); scene.add(this.root);
    this.T = new Map(); this.now = 0; this.reveal = null;
    this.slotMesh = null; this.ghost = null; this.ghostKey = '';
    this.ghostOk = ghostMat(0x9fe08a); this.ghostBad = ghostMat(0xe86a5a);
    this.queue = []; this.onRebuilt = null;            // Nachbarn, die in den nächsten Bildern neu gebaut werden
    this.lodOpt = { minPx: 1.2, detailFar: 80, shadowTexel: 0 };
    // Verschmelzen (in jedem Modus): Vorschau (Ringe + Bögen), Animation (Geister fliegen ins Ziel)
    this.mp = null; this.mpKey = ''; this.mAnim = null; this.onMergeFx = null;
    const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false, ...o });
    this.mMat = { flash: basic(0xfff3c8, { blending: THREE.AdditiveBlending, opacity: 0 }),
      step: STEP_COL.map(c => ({ ring: basic(c, { opacity: .8, depthTest: false, side: THREE.DoubleSide }), arc: basic(c, { opacity: .9, depthTest: false }) })) };
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), this.mMat.flash); this.flash.visible = false; this.flash.renderOrder = 6; scene.add(this.flash);
  }
  nb(q, r) { const out = []; for (let i = 0; i < 6; i++) { const n = this.game.at(...neighbor(q, r, i)); out.push(n ? { k: n.k, E: edgesOf(n.k, n.o) } : null); } return out; }
  // Nur das, was terrain.js makeField von den Nachbarn liest: Bachkante → Nachbar da? (sonst Wasserfall),
  // Seekante → Gegenkante, Wiesenkante einer Weg-Kachel → zeigt ein Weg herein? (Andere Nachbarn lösen keinen Neubau aus.)
  nsig(k, o, q, r) {
    const E = edgesOf(k, o), road = ROAD_OK.has(k); let s = '';
    for (let i = 0; i < 6; i++) {
      const e = E[i]; if (e !== 'w' && e !== 'l' && !(road && e === 'g')) continue;
      const n = this.game.at(...neighbor(q, r, i)), ne = n ? edgesOf(n.k, n.o)[(i + 3) % 6] : '-';
      s += e === 'w' ? (n ? 'n' : '-') : e === 'l' ? ne : ne === 'r' ? 'r' : '.';
    }
    return s;
  }
  sig(t) { return t.k + t.o + ':' + this.game.stageOf(t) + ':' + this.nsig(t.k, t.o, t.q, t.r); }
  // Abgleich mit dem Spielstand. animKey: diese Kachel fällt ein; geänderte Nachbarn kommen dann in die Warteschlange
  // (je Bild einer, update()), damit das Setzen nicht in einem Bild alles neu baut.
  sync(animKey) {
    const want = this.game.board;
    for (const [k, o] of this.T) if (!want.has(k)) { this._remove(o); this.T.delete(k); }
    let i = 0;
    for (const [k, t] of want) {
      const s = this.sig(t), o = this.T.get(k);
      if (o && o.sig === s) { o.order = i++; continue; }
      if (animKey && o && k !== animKey) { if (!this.queue.includes(k)) this.queue.push(k); o.order = i++; continue; }
      const born = o ? o.born : (k === animKey ? this.now : -99);
      const n = this._build(t, s, o); n.born = born; n.order = i++; this.T.set(k, n);
      if (o && o.stage !== n.stage && t.k === 'haus') (this.grown ||= []).push(n);   // Haus ist gewachsen (main.js feiert)
    }
    if (!animKey) this.queue.length = 0;
    this.dropGhosts();
    this.updateSlots();
  }
  // einen Eintrag der Warteschlange neu bauen (true, wenn etwas gebaut wurde)
  _drain() {
    while (this.queue.length) {
      const k = this.queue.shift(), t = this.game.board.get(k), o = this.T.get(k); if (!t || !o) continue;
      const s = this.sig(t); if (o.sig === s) continue;
      const n = this._build(t, s, o); n.born = o.born; n.order = o.order; n.g.visible = o.g.visible; this.T.set(k, n);
      const grown = o.stage !== n.stage && t.k === 'haus';
      this.onRebuilt?.(n, grown); return true;
    }
    return false;
  }
  _build(t, sig, old, model) {
    const { x, z } = center(t.q, t.r), E = edgesOf(t.k, t.o), stage = this.game.stageOf(t);
    const m = model || this._adopt(t, stage) || buildTile(t, E, this.nb(t.q, t.r), x, z, { stage });
    if (old) this._remove(old);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.tile = t;
    const meshes = [], lod = [], detail = [], small = [];
    for (const [layer, geo] of Object.entries(m.geo)) {
      const mesh = new THREE.Mesh(geo, MATS[layer] || MATS.base);
      mesh.castShadow = layer === 'base' || layer === 'bldg'; mesh.receiveShadow = layer !== 'fall' && layer !== 'glass';
      if (layer === 'glass' || layer === 'fall') mesh.renderOrder = 2;
      mesh.userData.tile = t; mesh.userData.layer = layer; g.add(mesh); meshes.push(mesh);
      if (geo.userData.lod) { lod.push(mesh); if (mesh.castShadow) { mesh.onBeforeShadow = shadowLod; mesh.onAfterShadow = shadowRestore; } }
      if (layer === 'detail') detail.push(mesh);
    }
    const parts = [];
    const mk = (p, parent) => {
      const outer = new THREE.Group(); outer.applyMatrix4(p.matrix); const inner = new THREE.Group(); outer.add(inner);
      for (const [layer, geo] of Object.entries(p.geo)) { const mm = new THREE.Mesh(geo, MATS[layer] || MATS.base); mm.castShadow = layer === 'base'; mm.receiveShadow = true; mm.userData.tile = t; mm.userData.layer = layer === 'base' ? 'part' : layer; inner.add(mm); meshes.push(mm); small.push(mm); }
      parent.add(outer); parts.push({ ...p, inner, phase: Math.random() * 6 });
      for (const c of p.children || []) mk(c, inner);
    };
    for (const p of m.parts) mk(p, g);
    this.root.add(g);
    const spots = m.spots.map(s => ({ ...s, p: [s.p[0] + x, s.p[1], s.p[2] + z] }));
    for (const f of m.F.falls || []) spots.push({ type: 'fall', p: [f[0] + x, f[1], f[2] + z], a: f[3] });
    const o = { t, g, meshes, lod, detail, small, lodQ: -999, fade: -1, parts, spots, F: m.F, sig, stage, cx: x, cz: z, info: m.info };
    if (this._cam) this._lodTile(o, true);
    return o;
  }
  _remove(o) { this.root.remove(o.g); o.g.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); }
  clear() { this.finishMerges(); this.clearMergePreview(); for (const o of this.T.values()) this._remove(o); this.T.clear(); this.queue.length = 0; this.updateSlots(); }

  // Boden-Höhe an Welt-Punkt (für Kamera, Leben)
  groundAt(x, z) {
    const [q, r] = pixelToHex(x, z), o = this.T.get(key(q, r));
    if (!o) return -60;
    const lx = x - o.cx, lz = z - o.cz; let h = Math.max(o.F.h(lx, lz), o.F.hasWater ? WATER_Y : -9);
    if (o.t.k === 'bruecke' && o.F.roadD(lx, lz) < 1.2) {           // Brückendeck (Form wie in buildings.js bridge)
      const th = -o.t.o * Math.PI / 3, bz = lx * Math.sin(th) + lz * Math.cos(th), Z = 2.6;
      if (Math.abs(bz) < Z) h = Math.max(h, .32 + .73 * (1 - (bz / Z) ** 2));
    }
    return h;
  }
  blockers() { const a = []; for (const o of this.T.values()) if (o.g.visible) for (const m of o.meshes) if (m.userData.layer === 'bldg') a.push(m); return a; }
  pickables() { const a = []; for (const o of this.T.values()) if (o.g.visible) for (const m of o.meshes) if (m.userData.layer !== 'fall' && m.userData.layer !== 'water') a.push(m); return a; }
  // Für das Leben: Kacheln mit Welt-Spots, Gruppen und Wegpunkten
  lifeList() {
    const out = [], gid = new Map(); let next = 1;
    for (const [k, o] of this.T) {
      const t = o.t, g = GROUP[t.k] || null; let id = 0;
      if (g) { if (!gid.has(k)) { const n = next++; for (const kk of this.game.group(t.q, t.r).keys) gid.set(kk, n); } id = gid.get(k); }   // jede Gruppe nur einmal suchen
      const roads = o.F.rEdges.length ? [[o.cx, o.cz], ...o.F.rEdges.map(i => { const [a, b] = edgeMid(i); return [a + o.cx, b + o.cz]; })] : [];
      const paths = o.F.roadP.map(P => P.map(p => [p[0] + o.cx, p[1] + o.cz]));
      out.push({ key: k, kind: t.k, q: t.q, r: t.r, cx: o.cx, cz: o.cz, group: g, groupId: id, spots: o.spots, roads, rEdges: o.F.rEdges, paths });
    }
    return out;
  }
  bounds() { let r = 10; for (const o of this.T.values()) r = Math.max(r, Math.hypot(o.cx, o.cz) + R); return r; }

  // Freie Plätze als weiche Sechseck-Umrisse
  updateSlots(show = true) {
    if (this.slotMesh) { this.scene.remove(this.slotMesh); this.slotMesh.geometry.dispose(); this.slotMesh = null; }
    if (!show) return;
    const pts = [];
    for (const [q, r] of this.game.slots()) {
      const { x, z } = center(q, r);
      for (let i = 0; i < 6; i++) { const a = cornerAt(i), b = cornerAt((i + 1) % 6); const s = .9; pts.push(x + a[0] * s, .25, z + a[1] * s, x + b[0] * s, .25, z + b[1] * s); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.slotMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false }));
    this.slotMesh.renderOrder = 3; this.scene.add(this.slotMesh);
  }
  // Stufe, die eine Kachel nach dem Setzen hätte (Häuser wachsen mit dem Dorf): kurz probeweise aufs Brett legen
  _stageIf(t) {
    if (t.k !== 'haus') return 1;
    const b = this.game.board, kk = key(t.q, t.r), had = b.get(kk); b.set(kk, t);
    try { return this.game.stageOf(t); } finally { had ? b.set(kk, had) : b.delete(kk); }
  }
  // Vorschau der aktuellen Kachel. Das gebaute Modell (gleicher Zufall, gleiche Stufe, gleiche Nachbarn) wird beim Setzen übernommen.
  setGhost(kind, q, r, o, ok) {
    const k = kind + q + ',' + r + ':' + o + ok;
    if (k === this.ghostKey) return; this.clearGhost(); this.ghostKey = k;
    const t = { k: kind, q, r, o }, stage = this._stageIf(t), pk = this._preKey(t, stage), ck = pk + ok;
    this.ghostCache ||= new Map();
    const hit = this.ghostCache.get(ck);
    if (hit) { this.ghost = hit; this.scene.add(hit); return; }
    const other = this.ghostCache.get(pk + !ok);
    const { x, z } = center(q, r), m = other ? other.userData.m : buildTile(t, edgesOf(kind, o), this.nb(q, r), x, z, { stage });
    const g = new THREE.Group(); g.position.set(x, .6, z); g.userData.m = m; g.userData.pk = pk;
    const mat = ok ? this.ghostOk : this.ghostBad;
    for (const [layer, geo] of Object.entries(m.geo)) if (layer !== 'fall') g.add(new THREE.Mesh(geo, mat));
    const gp = (p, par) => { const outer = new THREE.Group(); outer.applyMatrix4(p.matrix); for (const geo of Object.values(p.geo)) outer.add(new THREE.Mesh(geo, mat)); par.add(outer); for (const c of p.children || []) gp(c, outer); };
    for (const p of m.parts) gp(p, g);
    this.ghost = g; this.scene.add(g);
    this.ghostCache.set(ck, g);
    if (this.ghostCache.size > 48) { const [k0, g0] = this.ghostCache.entries().next().value; if (g0 !== g) { this.ghostCache.delete(k0); this._disposeGhost(g0); } }
  }
  _preKey(t, stage) { return t.k + t.q + ',' + t.r + ':' + t.o + ':' + stage + ':' + this.nsig(t.k, t.o, t.q, t.r) + '|'; }
  // gebautes Vorschau-Modell für diese Kachel übernehmen (dann nicht mehr als Vorschau verwerfen)
  _adopt(t, stage) {
    if (!this.ghostCache?.size) return null;
    const pk = this._preKey(t, stage); let m = null;
    for (const ok of [true, false]) { const g = this.ghostCache.get(pk + ok); if (!g) continue; m = g.userData.m; this.scene.remove(g); this.ghostCache.delete(pk + ok); if (this.ghost === g) { this.ghost = null; this.ghostKey = ''; } }
    if (m) m.adopted = true;
    return m;
  }
  _disposeGhost(g) {
    this.scene.remove(g); const m = g.userData.m;
    if (m.adopted) return;
    for (const g2 of this.ghostCache.values()) if (g2.userData.m === m) return;       // gleiches Modell steckt noch in der anderen Farbe
    g.traverse(x => x.isMesh && x.geometry.dispose());
  }
  clearGhost() { if (this.ghost) { this.scene.remove(this.ghost); this.ghost = null; } this.ghostKey = ''; this.clearMergePreview(); }
  // nach dem Setzen ändern sich Nachbarn – alte Vorschauen verwerfen
  dropGhosts() { const all = [...(this.ghostCache?.values() || [])]; this.ghostCache?.clear(); for (const g of all) this._disposeGhost(g); this.ghost = null; this.ghostKey = ''; }

  // Zeitraffer: alle Kacheln ausblenden, dann in Spielreihenfolge einfallen lassen
  startReveal(interval) {
    this.finishMerges(); this.clearMergePreview();
    const order = this.game.S.tiles.map(t => key(t.q, t.r));
    this.reveal = { order, interval, t0: this.now };
    for (const o of this.T.values()) o.g.visible = false;
    this.updateSlots(false);
  }
  stopReveal() { this.reveal = null; for (const o of this.T.values()) { o.g.visible = true; o.g.position.y = 0; o.g.scale.set(1, 1, 1); } this.updateSlots(); }

  // Detailstufen je Kachel (jedes Bild, nach der Kamera). Körper (grob → fein sortiert, kit.buildLod), die kleiner als minPx
  // Bildpunkte wären, werden per drawRange weggelassen; Stufen in 10-%-Schritten mit Hysterese (kein Flackern).
  // Kleinkram ('detail') sinkt zwischen 0,8·detailFar und detailFar in den Boden und ist dahinter aus.
  // Schatten: nur Körper größer als ein Schatten-Texel (shadowTexel), siehe shadowLod.
  updateLod(cam, pxH, opt = {}) {
    Object.assign(this.lodOpt, opt); SH.texel = this.lodOpt.shadowTexel || 0;
    this._cam = cam; this._k = 2 * Math.tan(cam.fov * Math.PI / 360) / Math.max(1, pxH) * this.lodOpt.minPx;
    for (const o of this.T.values()) this._lodTile(o, false);
  }
  _lodTile(o, force) {
    const c = this._cam.position, d = Math.max(.5, Math.hypot(o.cx - c.x, c.y, o.cz - c.z) - R);
    const lq = Math.log(d * this._k) / LSTEP;
    if (force || Math.abs(lq - o.lodQ) > .7) {
      o.lodQ = Math.round(lq); const rMin = Math.exp(o.lodQ * LSTEP);
      for (const m of o.lod) { const n = lodCount(m.geometry.userData.lod, rMin); m.geometry.drawRange.count = n; m.userData.lodOn = n > 0; }
      for (const m of o.small) m.userData.lodOn = m.geometry.boundingSphere.radius > rMin * .6;
      for (const m of o.lod) if (!o.detail.includes(m)) m.visible = m.userData.lodOn;
      for (const m of o.small) m.visible = m.userData.lodOn;
      o.fade = -1;
    }
    if (o.detail.length) {
      const F = this.lodOpt.detailFar, u = Math.min(1, Math.max(0, (F - d) / (F * .2))), f = u * u * (3 - 2 * u);
      if (force || f !== o.fade) { o.fade = f; for (const m of o.detail) { m.scale.y = Math.max(.001, f); m.visible = f > .01 && m.userData.lodOn !== false; } }
    }
  }
  // Probe-Meshes für warmup(): je Material und Schatten-Einstellung eines, wie _build sie anlegt (und die Vorschau)
  probe() {
    const g = new THREE.Group(), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .01, 0, 0, 0, .01, 0], 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    for (const a of ['color']) geo.setAttribute(a, new THREE.Float32BufferAttribute(new Float32Array(9).fill(1), 3));
    for (const a of ['sway', 'tag', 'win']) geo.setAttribute(a, new THREE.Float32BufferAttribute(new Float32Array(3), 1));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(6), 2));
    const add = (mat, cast, recv) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; m.frustumCulled = false; g.add(m); };
    for (const [layer, mat] of Object.entries(MATS)) for (const cast of [true, false]) for (const recv of [true, false]) add(mat, cast, recv);
    add(MATS.base, false, true); add(this.ghostOk, false, false); add(this.ghostOk, false, true); add(this.ghostBad, false, true);
    add(this.mMat.flash, false, false);
    for (const m of this.mMat.step) { add(m.ring, false, false); add(m.arc, false, false); }
    g.userData.dispose = () => geo.dispose();
    return g;
  }

  update(dt) {
    this.now += dt; const now = this.now;
    this.drained = false;
    if (this.queue.length && now - (this._qt || 0) > .05) { if (this._drain()) { this._qt = now; this.drained = true; } }
    if (this.reveal) {
      const R2 = this.reveal, n = Math.floor((now - R2.t0) / R2.interval);
      R2.order.forEach((k, i) => { const o = this.T.get(k); if (!o) return; if (i <= n && !o.g.visible) { o.g.visible = true; o.born = now; } });
      R2.done = n >= R2.order.length + 2;
    }
    for (const o of this.T.values()) {
      const age = now - o.born, g = o.g;
      if (age < DROP + .5) {
        if (age < DROP) { const u = age / DROP; g.position.y = (1 - u * u) * 9; g.scale.set(1, 1, 1); g.rotation.y = (1 - u) * (1 - u) * .5; }
        else { const v = (age - DROP) / .5; g.position.y = 0; g.rotation.y = 0; const s = 1 - Math.sin(v * Math.PI) * .07 * (1 - v); g.scale.set(1 + (1 - s) * .5, s, 1 + (1 - s) * .5); }
      } else if (g.position.y !== 0 || g.scale.y !== 1) { g.position.y = 0; g.rotation.y = 0; g.scale.set(1, 1, 1); }
      for (const p of o.parts) {
        if (p.spin) p.inner.setRotationFromAxisAngle(_ax.set(...p.spin).normalize(), now * (p.speed || 1) + p.phase);
        if (p.bob) { p.inner.position.y = Math.sin(now * 1.3 + p.phase) * p.bob; p.inner.rotation.z = Math.sin(now * .9 + p.phase) * .04; }
        if (p.swing) p.inner.setRotationFromAxisAngle(_ax.set(...p.swing).normalize(), Math.sin(now * (p.speed || 1) + p.phase) * (p.amp || .3));
      }
    }
    if (this.slotMesh) this.slotMesh.material.opacity = .22 + .14 * Math.sin(now * 2.2);
    if (this.ghost) this.ghost.position.y = .5 + Math.sin(now * 3) * .15;
    if (this.mp) this._previewUpdate(now);
    if (this.mAnim) this._mergeUpdate(now);
  }

  // ================= Verschmelzen =================
  // Vorschau: betroffene Kacheln leuchten (Ring je Schritt in eigener Farbe) und heben sich, Bögen mit Pfeilspitze zum Ziel
  setMergePreview(steps, q, r) {
    const k = steps?.length ? q + ',' + r + ':' + steps.map(s => s.to + s.keys.join(';')).join('|') : '';
    if (k === this.mpKey) return;
    this.clearMergePreview(); this.mpKey = k; if (!k) return;
    const g = new THREE.Group(), c = center(q, r), keys = [], dist0 = [];
    const end = new THREE.Vector3(c.x, ARC_Y, c.z);
    steps.forEach((s, i) => {
      const M = this.mMat.step[Math.min(i, STEP_COL.length - 1)];
      for (const kk of s.keys) {
        const [a, b] = unkey(kk), p = center(a, b); keys.push(kk);
        const ring = new THREE.Mesh(RING_GEO, M.ring); ring.position.set(p.x, RING_Y, p.z); ring.renderOrder = 5; g.add(ring);
        const st = new THREE.Vector3(p.x, ARC_Y, p.z), L = st.distanceTo(end);
        const mid = st.clone().lerp(end, .5); mid.y += 2.2 + L * .16;
        const curve = new THREE.QuadraticBezierCurve3(st, mid, end.clone().lerp(mid, .12));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .17, 5), M.arc); tube.renderOrder = 6; g.add(tube);
        const tip = new THREE.Mesh(CONE_GEO, M.arc), tg = curve.getTangent(1);
        tip.position.copy(curve.getPoint(1)); tip.quaternion.setFromUnitVectors(_up, tg); tip.renderOrder = 6; g.add(tip);
        dist0.push(i);
      }
    });
    const tr = new THREE.Mesh(RING_GEO, this.mMat.step[0].ring); tr.position.set(c.x, RING_Y, c.z); tr.scale.setScalar(.8); tr.renderOrder = 5; g.add(tr);
    this.scene.add(g); this.mp = { g, keys, step: dist0, t0: this.now, tr };
  }
  clearMergePreview() {
    const P = this.mp; this.mpKey = ''; if (!P) return; this.mp = null;
    this.scene.remove(P.g); P.g.traverse(m => { if (m.isMesh && m.geometry !== RING_GEO && m.geometry !== CONE_GEO) m.geometry.dispose(); });
    for (const k of P.keys) { const o = this.T.get(k); if (o && this.now - o.born > DROP + .5) { o.g.position.y = 0; } }
  }
  _previewUpdate(now) {
    const P = this.mp, u = now - P.t0;
    P.keys.forEach((k, i) => { const o = this.T.get(k); if (!o || now - o.born < DROP + .5) return; o.g.position.y = .35 + .25 * Math.sin(u * 5 - P.step[i] * 1.2); });
    for (const M of this.mMat.step) M.ring.opacity = .55 + .35 * Math.sin(u * 5);
    P.tr.scale.setScalar(.8 + .06 * Math.sin(u * 5));
  }

  // Animation. Ablauf (main.js): game emittiert je Schritt 'merge' (Brett schon geändert, Welt noch nicht) → captureMerge
  // nimmt die Partner-Kacheln aus T (sync würde sie löschen) und behält sie als Geister; nach 'place' + sync → playMerge.
  // Stufen am Ziel: [gesetzte Art, Zwischenstufen …, Endstufe (echte Kachel aus T)]. Zwischenstufen werden in den
  // folgenden Bildern einzeln gebaut (je ~15 ms), nie mehrere in einem Bild.
  captureMerge(m) {
    let A = this.mAnim;
    if (!A || !A.capturing) {
      this.finishMerges();
      A = this.mAnim = { capturing: true, steps: [], at: m.at, models: [{ kind: m.from, m: null, o: null }] };
      const [q, r] = unkey(m.at), gk = this.ghost?.userData.pk;
      if (gk && gk.startsWith(m.from + q + ',' + r + ':')) { A.models[0].m = this.ghost.userData.m; A.models[0].m.adopted = true; }   // Vorschau-Modell übernehmen
    }
    const ghosts = [];
    for (const k of m.keys) {
      const o = this.T.get(k); if (!o) continue;
      this.T.delete(k); const qi = this.queue.indexOf(k); if (qi >= 0) this.queue.splice(qi, 1);
      o.g.position.y = 0; o.g.scale.set(1, 1, 1); ghosts.push(o);
    }
    A.steps.push({ ...m, ghosts });
    A.models.push({ kind: m.to, m: null, o: null });
  }
  playMerge(d) {
    const A = this.mAnim; if (!A || !A.capturing) return false;
    A.capturing = false; A.t0 = this.now; A.fired = -1;
    const [q, r] = unkey(A.at); A.q = q; A.r = r; A.c = center(q, r);
    const fo = this.T.get(A.at); if (fo) fo.born = -99;                  // Endstufe fällt nicht ein, sie wächst heraus
    A.models.at(-1).real = true;
    this._mergeModel(A, 0);                                               // gesetzte Art sofort (meist aus der Vorschau)
    return true;
  }
  _mergeModel(A, i) {
    const M = A.models[i]; if (M.o || M.real) return false;
    const t = { k: M.kind, q: A.q, r: A.r, o: this.T.get(A.at)?.t.o || 0 };
    M.o = this._build(t, '', null, M.m || buildTile(t, edgesOf(t.k, t.o), this.nb(t.q, t.r), A.c.x, A.c.z, { stage: 1 }));
    M.o.g.scale.setScalar(i ? .001 : 1); M.o.g.visible = !i;
    return true;
  }
  _mergeObj(A, i) { const M = A.models[i]; if (!M) return null; if (M.real) { const o = this.T.get(A.at); return o && o.t.k === M.kind ? o : null; } return M.o; }
  // Zeitplan: Schritt i beginnt bei D0 + i·STEP, Partner fliegen FLY lang, dann Blitz und die neue Stufe wächst (GROW)
  _mergeUpdate(now) {
    const A = this.mAnim; if (A.capturing) return;
    const t = now - A.t0, n = A.steps.length, { D0, STEP, FLY, GROW } = MT;
    for (let i = 1; i < A.models.length; i++) if (!A.models[i].o && !A.models[i].real) { this._mergeModel(A, i); break; }   // höchstens eins je Bild
    const hitT = i => D0 + i * STEP + FLY;
    // gesetzte Kachel fällt ein
    const o0 = this._mergeObj(A, 0);
    if (o0) { const u = Math.min(1, t / D0); o0.g.position.y = (1 - u * u) * 7; }
    A.steps.forEach((S, i) => {
      const s0 = D0 + i * STEP, u = (t - s0) / FLY;
      for (const [j, o] of S.ghosts.entries()) {
        const g = o.g; if (!g.parent) continue;
        if (u < 0) { g.position.y = i ? .3 + .2 * Math.sin(t * 9 + j) : 0; continue; }       // warten (Kette: wippen)
        if (u >= 1) { g.visible = false; continue; }
        const e = u * u * (3 - 2 * u), x0 = o.cx, z0 = o.cz;                                   // Kurve: hoch, hinüber, hinein
        g.position.set(x0 + (A.c.x - x0) * e, Math.sin(u * Math.PI) * (3 + i) + (1 - u) * .4, z0 + (A.c.z - z0) * e);
        g.rotation.y = e * (j % 2 ? 1.6 : -1.6); g.scale.setScalar(Math.max(.05, 1 - e * .85));
      }
      // Stufe i (vor dem Schritt) schrumpft beim Treffer, Stufe i+1 wächst heraus
      const th = hitT(i), from = this._mergeObj(A, i), to = this._mergeObj(A, i + 1);
      if (from && t >= th) { const v = Math.min(1, (t - th) / .12); from.g.scale.setScalar(Math.max(.001, 1 - v)); if (v >= 1) from.g.visible = false; }
      else if (from && i > 0 && t >= hitT(i - 1) + GROW && t < th) { const w = Math.max(0, (t - (th - .25)) / .25); from.g.scale.set(1 + w * .08, 1 - w * .1, 1 + w * .08); }
      if (to) {
        if (t < th) { to.g.visible = false; to.g.scale.setScalar(.001); }
        else { const v = Math.min(1, (t - th) / GROW);                                        // herauswachsen mit kleinem Überschwingen
          to.g.visible = true; to.g.scale.setScalar(v < 1 ? Math.max(.001, Math.min(1.15, v * 1.1 + Math.sin(v * Math.PI) * .18)) : 1); to.g.position.y = 0; }
      }
      if (t >= th && A.fired < i) {
        A.fired = i;
        this.onMergeFx?.('hit', { step: i, from: S.from, to: S.to, level: S.level, pts: S.pts, size: S.size, last: i === n - 1, top: !MERGE[S.to], x: A.c.x, z: A.c.z, q: A.q, r: A.r });
        A.flashT = now;
      }
    });
    // Lichtblitz am Ziel
    const F = this.flash, ft = A.flashT != null ? now - A.flashT : 9;
    if (ft < .45) { const v = ft / .45; F.visible = true; F.position.set(A.c.x, 1.6, A.c.z); F.scale.setScalar(1.5 + v * 7); this.mMat.flash.opacity = (1 - v) * (1 - v) * .9; }
    else F.visible = false;
    if (t > hitT(n - 1) + GROW + .1) this.finishMerges();
  }
  // Animation sofort beenden (neuer Zug, Rückgängig, neue Insel): Geister und Zwischenstufen entsorgen, Endstufe zeigen
  finishMerges() {
    const A = this.mAnim; if (!A) return; this.mAnim = null;
    for (const S of A.steps) for (const o of S.ghosts) this._remove(o);
    A.models.forEach((M, i) => { if (M.o) this._remove(M.o); else if (M.m && !M.real && i === 0) disposeModel(M.m); });
    const fo = this.T.get(A.at); if (fo) { fo.g.visible = !this.reveal; fo.g.scale.set(1, 1, 1); fo.g.position.y = 0; }
    this.flash.visible = false;
    if (!A.capturing) this.onMergeFx?.('done', { q: A.q, r: A.r });
  }
  get merging() { return !!this.mAnim; }
}
const STEP_COL = [0xffd35a, 0xff8fd0, 0x8fd8ff, 0xb6ff8f];               // Ringe/Bögen je Kettenschritt
const RING_Y = .55, ARC_Y = 1.1;
const MT = { D0: .38, STEP: .62, FLY: .42, GROW: .34 };                    // Zeiten der Verschmelz-Animation (s)
const RING_GEO = (() => {                                                  // Sechseck-Ring (Kachelrand), liegt flach
  const p = [], a = .9, b = 1.0;
  for (let i = 0; i < 6; i++) { const c0 = cornerAt(i), c1 = cornerAt((i + 1) % 6), P = (c, f) => [c[0] * f, 0, c[1] * f];
    p.push(...P(c0, a), ...P(c1, b), ...P(c1, a), ...P(c0, a), ...P(c0, b), ...P(c1, b)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g;
})();
const CONE_GEO = new THREE.ConeGeometry(.5, 1.1, 10).translate(0, -.3, 0);
const _up = new THREE.Vector3(0, 1, 0);
function disposeModel(m) { for (const g of Object.values(m.geo)) g.dispose(); const dp = p => { for (const g of Object.values(p.geo)) g.dispose(); (p.children || []).forEach(dp); }; m.parts.forEach(dp); }
const _ax = new THREE.Vector3();
const LSTEP = Math.log(1.1);
// Ecken der Körper mit Größe ≥ rMin (size absteigend sortiert, siehe kit.buildLod)
function lodCount(L, rMin) {
  const s = L.size; if (!s.length || s[s.length - 1] >= rMin) return Infinity;
  let lo = 0, hi = s.length;                       // erster Index mit s[i] < rMin
  while (lo < hi) { const mid = (lo + hi) >> 1; if (s[mid] < rMin) hi = mid; else lo = mid + 1; }
  return lo ? L.end[lo - 1] : 0;
}
// Schatten-Durchgang: Körper kleiner als ein Schatten-Texel werfen keinen sichtbaren Schatten → weglassen
const SH = { texel: 0 };
function shadowLod(r, obj, cam, sc, geo) { if (!SH.texel) return; const n = lodCount(geo.userData.lod, SH.texel); obj.userData._dc = geo.drawRange.count; if (n < geo.drawRange.count) geo.drawRange.count = n; }
function shadowRestore(r, obj, cam, sc, geo) { if (obj.userData._dc !== undefined) { geo.drawRange.count = obj.userData._dc; obj.userData._dc = undefined; } }
