// Echtes Laternenlicht bei Nacht: ein fester Vorrat an Punktlichtern (feste Anzahl → kein Shader-Neubau),
// die jedes Bild den Laternen (spot 'light') nächst dem Kameraziel zugeordnet werden. Tagsüber aus.
import * as THREE from 'three';

export class Lamps {
  constructor(scene, n = 10) {
    this.lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffb45a, 0, 11, 1.6); l.castShadow = false; scene.add(l); this.lights.push(l);
    }
    this.spots = []; this.t = 0;
  }
  setSpots(list) { this.spots = list.filter(s => s.type === 'light').map(s => new THREE.Vector3(s.p[0], s.p[1], s.p[2])); }
  update(dt, night, target, dist, camPos) {
    this.t += dt;
    const on = Math.max(0, Math.min(1, (night - .15) / .5)) * Math.max(.25, Math.min(1, 1.6 - dist / 80));
    if (on <= 0.01 || !this.spots.length) { for (const l of this.lights) l.intensity = 0; return; }
    // nächste Laternen zum Ziel (alle 0,25 s neu sortieren)
    if (!this._sorted || this.t - this._st > .25) { this._st = this.t; this._sorted = this.spots.slice().sort((a, b) => a.distanceToSquared(target) - b.distanceToSquared(target)); }
    this.lights.forEach((l, i) => {
      const p = this._sorted[i]; if (!p) { l.intensity = 0; return; }
      l.position.set(p.x, p.y - .15, p.z);
      const near = Math.min(1, camPos ? camPos.distanceTo(p) / 4 : 1);   /* ganz nah weniger blenden */
      l.intensity = on * 6 * (.45 + .55 * near) * (.93 + .07 * Math.sin(this.t * 9 + i * 1.7) * Math.sin(this.t * 3.1 + i));
    });
  }
}
