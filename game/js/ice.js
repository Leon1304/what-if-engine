// Winter event: the forest lake and the mountain lake freeze over. An ice sheet (own collider) lies on the water – you can walk across
// to the island, the rowing boat is frozen in, the ice is slippery. With an axe or spade (E on the ice) you cut a hole and fish there
// (pike bite best at the ice hole). The holes are saved (S.iceHoles) and close again when the ice melts in spring.
import * as THREE from 'three';
import { LAKES } from './regions.js';

const R = { See: 27.6, Bergsee: 11.5 };          // ice disc radius = the water disc (its rim lies under the shore)
const ray = new THREE.Vector3();

export class Ice {
  constructor(game) {
    this.g = game; this.frozen = false; this.sheets = []; this.holes = [];
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .22, metalness: .05, transparent: true, opacity: .93 });
    for (const L of LAKES) {
      const r = R[L.name] || L.r + 2, geo = new THREE.CircleGeometry(r, 44, 0, Math.PI * 2); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {        // milky ice, clearer patches, white rim of snow at the shore
        const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z) / r, n = Math.sin(x * .7) * Math.cos(z * .9) + Math.sin(x * .23 + z * .31);
        c.set('#cfe3ec').lerp(new THREE.Color('#9fc4d6'), Math.max(0, n) * .35).lerp(new THREE.Color('#f2f6f8'), Math.max(0, d - .72) * 2.6); col.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(geo, mat); m.position.set(L.x, L.z + .05, -L.y); m.receiveShadow = true; m.visible = false; m.name = 'Eis_' + L.name; game.scene.add(m);
      this.sheets.push({ L, r, m, y: L.z + .05, col: null });
    }
    this.holeGeo = new THREE.CircleGeometry(.42, 12).rotateX(-Math.PI / 2);
    this.holeMat = new THREE.MeshStandardMaterial({ color: '#16303d', roughness: .1, flatShading: true });
    this.rimGeo = new THREE.RingGeometry(.42, .62, 12).rotateX(-Math.PI / 2);
    this.rimMat = new THREE.MeshStandardMaterial({ color: '#f4f8fa', roughness: .9, flatShading: true });
  }
  get S() { return this.g.S; }
  update() {
    const want = this.g.seasons.season === 'Winter';
    if (want !== this.frozen) this.set(want, this.g.seasons.changed);
    if (this.frozen && this.on(this.g.P.pos)) this.g.album?.see('n_eis');
  }
  set(on, announce) {
    const g = this.g; this.frozen = on;
    for (const s of this.sheets) {
      s.m.visible = on;
      if (on && !s.col) s.col = g.W.addCollider(s.m); else if (!on && s.col) { g.W.removeCollider(s.col); s.col = null; }
    }
    if (on) { if (g.boat?.on) g.boat.exit(); for (const h of this.S.iceHoles || []) this.addHole(h, true); }
    else {
      for (const h of this.holes) g.scene.remove(h.grp); this.holes = []; this.S.iceHoles = [];
      const P = g.P, s = this.sheets.find(s => Math.hypot(P.pos.x - s.L.x, -P.pos.z - s.L.y) < s.r && Math.abs(P.pos.y - s.y) < .6);
      if (s) {                                  // standing on the ice when it melts: wade to the nearest shore
        const dx = P.pos.x - s.L.x, dz = P.pos.z + s.L.y, d = Math.hypot(dx, dz) || 1;
        for (let r = s.L.r; r < s.r + 10; r += .5) { const x = s.L.x + dx / d * r, z = -s.L.y + dz / d * r, y = g.W.groundY(x, z, s.y + 6);
          if (y > s.y - .1) { P.setPose(new THREE.Vector3(x, y + .05, z), P.yaw); g.safePos = null; break; } }
      }
    }
    if (announce) g.ui.toast(on ? '🧊 Der Waldsee ist zugefroren – das Eis trägt! Du kannst zur Insel laufen. Mit Axt oder Spaten (E auf dem Eis) ein Loch hacken und eisangeln.' : '💧 Das Eis auf den Seen taut. Das Ruderboot ist wieder frei.', 'good');
  }
  sheetAt(p, margin = 1) { if (!this.frozen) return null; return this.sheets.find(s => Math.hypot(p.x - s.L.x, -p.z - s.L.y) < s.r - margin) || null; }
  // standing on the ice?
  on(p) { const s = this.sheetAt(p, 2); return !!s && Math.abs(p.y - s.y) < .25; }
  hole(p, r = 1.1) { return this.holes.find(h => Math.hypot(h.x - p.x, h.z - p.z) < r) || null; }
  // E target: the ice in front of you (within reach), when you stand on it
  target(o, f) {
    if (!this.frozen || f.y > -.15) return null; const s = this.sheetAt(this.g.P.pos, 0); if (!s) return null;
    const t = (s.y - o.y) / f.y; if (t < 0 || t > 2.8) return null;
    ray.copy(o).addScaledVector(f, t); if (Math.hypot(ray.x - s.L.x, -ray.z - s.L.y) > s.L.r + 1) return null;      // only where it is deep (no hole into the shore)
    return { ice: { s, p: ray.clone(), hole: this.hole(ray) } };
  }
  verb(t) {
    const g = this.g, h = t.ice.hole;
    if (h) return g.combat.selected() === 'angel' ? 'Eisloch – Linksklick: Angel hineinlassen' : 'Eisloch – nimm die Angel in die Hand (1–5) und angle hier';
    return g.hasAxe() || g.has('spaten') ? '[E] Eisloch hacken (Axt oder Spaten)' : 'Dickes Eis – für ein Eisloch brauchst du eine Axt oder einen Spaten';
  }
  interact(t) {
    const g = this.g; if (t.ice.hole) return g.ui.toast('🎣 Angel auswählen und Linksklick: ins Eisloch angeln.');
    if (!g.hasAxe() && !g.has('spaten')) { g.audio.sfx('error'); return g.ui.toast('Das Eis ist dick. Mit einer Axt oder einem Spaten könntest du ein Loch hacken.'); }
    const p = t.ice.p; g.audio.sfx('chop'); setTimeout(() => g.audio.sfx('chop'), 300); setTimeout(() => g.audio.sfx('splash'), 650);
    this.addHole([+p.x.toFixed(2), +p.z.toFixed(2)]); g.combat.puff(p, '#e8f2f6', 10);
    if (!g.S.flags.icehole) { g.S.flags.icehole = 1; g.progress.add(15, 'Eisloch'); }
    g.ui.toast('🕳️ Eisloch gehackt. Angel in die Hand, aufs Loch zielen, Linksklick!', 'good');
  }
  addHole([x, z], quiet) {
    const s = this.sheetAt(new THREE.Vector3(x, 0, z), 0); if (!s) return;
    const grp = new THREE.Group(); grp.position.set(x, s.y + .006, z);
    const w = new THREE.Mesh(this.holeGeo, this.holeMat), r = new THREE.Mesh(this.rimGeo, this.rimMat); r.position.y = .01; grp.add(w, r); this.g.scene.add(grp);
    this.holes.push({ x, z, grp, s });
    while (this.holes.length > 10) { const o = this.holes.shift(); this.g.scene.remove(o.grp); }
    if (!quiet) this.S.iceHoles = this.holes.map(h => [h.x, h.z]);
  }
  // fishing: where the line goes into the water on a frozen lake (null = not a frozen lake, false = ice in the way)
  castPoint(o, f) {
    if (!this.frozen) return null; const s = this.sheets.find(s => { if (f.y > -.05) return false; const t = (s.y - o.y) / f.y; if (t < 0 || t > 16) return false; ray.copy(o).addScaledVector(f, t); return Math.hypot(ray.x - s.L.x, -ray.z - s.L.y) < s.r; });
    if (!s) return null; const t = (s.y - o.y) / f.y; ray.copy(o).addScaledVector(f, t);
    const h = this.hole(ray, .9); if (!h) return false;
    return { p: new THREE.Vector3(h.x, s.y - .02, h.z), lake: s.L.name };
  }
}
