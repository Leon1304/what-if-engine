// Seasons and weather.
// Every 4 days the season changes: Herbst → Winter → Frühling → Sommer. The landscape is recoloured (vertex colours of the ground,
// foliage and roofs: snow on everything facing up in winter, green leaves in spring/summer), plants grow at different speeds
// (nothing in winter), it is colder in winter and warmer in summer.
// Weather comes and goes: klar, Regen, Nebel, Gewitter (rain + lightning + thunder), Schnee (winter).
import * as THREE from 'three';

export const SEASONS = ['Herbst', 'Winter', 'Frühling', 'Sommer'];
export const SEASON_DAYS = 4;
const ICON = { Herbst: '🍂', Winter: '❄️', Frühling: '🌱', Sommer: '☀️' };
const WEATHER = {     // chance per season of the next weather
  Herbst: { regen: .4, nebel: .25, gewitter: .15, klar: .2 }, Winter: { schnee: .55, nebel: .2, klar: .25 },
  Frühling: { regen: .45, gewitter: .15, nebel: .1, klar: .3 }, Sommer: { klar: .45, gewitter: .3, regen: .15, nebel: .1 },
};
const GROUND = new Set(['Gras', 'Gras_hell', 'Waldboden', 'Moos', 'Laub', 'Trampelpfad', 'Bankett', 'Bachufer', 'Schotter', 'Pflaster', 'Gehweg', 'Acker', 'Steinbruch']);
const CONIFER = new Set(['Fichte_a', 'Fichte_b', 'Kiefer']);
const LEAVES = new Set(['Laub_orange', 'Laub_gelb', 'Laub_rot', 'Birke_Laub', 'Busch_herbst', 'Linde']);
const GREEN = new Set(['Laub_gruen', 'Busch', 'Farn', 'Grasbuesche', 'Blattwerk', 'Blattwerk_d']);
const ROOF = new Set(['Ziegel_rot', 'Ziegel_braun', 'Schiefer', 'Wellblech', 'Holzschindeln', 'Dachpappe', 'Dach_Bus', 'Hochsitz_Dach', 'Schindeln', 'Dach_Tankstelle', 'Tankdach']);
const C = h => new THREE.Color(h);

export class Seasons {
  constructor(game) {
    this.g = game; this.season = null; this.flashT = 0; this.boltT = 5;
    this.targets = [];
    const seen = new Set();
    game.scene.traverse(o => {
      if (!(o.isMesh || o.isInstancedMesh) || !o.geometry?.attributes.color || seen.has(o.geometry)) return;
      const n = o.material?.name || ''; let kind = GROUND.has(n) ? 'ground' : CONIFER.has(n) ? 'conifer' : LEAVES.has(n) ? 'leaves' : GREEN.has(n) ? 'green' : ROOF.has(n) ? 'roof' : null;
      if (!kind) return; seen.add(o.geometry);
      const a = o.geometry.attributes.color, c0 = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) { c0[i * 3] = a.getX(i); c0[i * 3 + 1] = a.getY(i); c0[i * 3 + 2] = a.getZ(i); }
      this.targets.push({ geo: o.geometry, kind, c0 });
    });
  }
  get S() { return this.g.S; }
  get index() { return Math.floor((this.S.day - 1) / SEASON_DAYS) % 4; }
  get growth() { return { Herbst: 1, Winter: 0, Frühling: 1.3, Sommer: 1.5 }[this.season] ?? 1; }
  get icon() { return ICON[this.season] || ''; }
  // warmth change outside per second (added in game.update)
  warmth(dark) { return this.season === 'Winter' ? -.1 : this.season === 'Sommer' ? .05 * (1 - dark) : 0; }
  recolor(season) {
    const snow = C('#eef3f7'), green = C('#5f9436'), lush = C('#4f8a2e'), frost = C('#cfd2cc'), col = new THREE.Color();
    for (const t of this.targets) {
      const a = t.geo.attributes.color, nrm = t.geo.attributes.normal, c0 = t.c0;
      for (let i = 0; i < a.count; i++) {
        col.setRGB(c0[i * 3], c0[i * 3 + 1], c0[i * 3 + 2]);
        const ny = nrm ? nrm.getY(i) : 1;
        if (season === 'Winter') {
          const k = Math.max(0, Math.min(1, (ny - .45) / .4));
          if (t.kind === 'ground') col.lerp(snow, .9 * k); else if (t.kind === 'roof') col.lerp(snow, .95 * k); else if (t.kind === 'conifer') col.lerp(snow, .75 * k);
          else if (t.kind === 'leaves') col.lerp(frost, .5).lerp(snow, .6 * k); else col.lerp(snow, .55 * k);
        } else if (season === 'Frühling' || season === 'Sommer') {
          const s = season === 'Sommer' ? 1 : .7;
          if (t.kind === 'leaves') col.lerp(season === 'Sommer' ? lush : green, .8 * s);
          else if (t.kind === 'ground') col.lerp(green, .18 * s);
          else if (t.kind === 'green') col.lerp(lush, .25 * s);
        }
        a.setXYZ(i, col.r, col.g, col.b);
      }
      a.needsUpdate = true;
    }
  }
  pick() {
    const tbl = WEATHER[this.season] || WEATHER.Herbst; let r = Math.random(), w = 'klar';
    for (const [k, p] of Object.entries(tbl)) { r -= p; if (r <= 0) { w = k; break; } }
    return w;
  }
  update(dt) {
    const S = this.S, g = this.g, sky = g.sky;
    const season = SEASONS[this.index];
    if (season !== this.season) {
      const first = this.season === null; this.season = season; this.recolor(season); S.season = season;
      if (!first) g.ui.toast(`${ICON[season]} Der ${season === 'Frühling' ? 'Frühling' : season} beginnt.${season === 'Winter' ? ' Es wird bitterkalt – auf den Feldern wächst nichts.' : season === 'Frühling' ? ' Die Felder wachsen schneller.' : ''}`, 'good');
    }
    // weather: S.weather = kind, S.weatherUntil / S.nextWeather (absolute game hours)
    if (!S.weather) S.weather = 'klar';
    if (S.weather === 'klar' && S.abs > (S.nextWeather ?? S.nextRain ?? 19)) {
      const w = this.pick(); if (w !== 'klar') { S.weather = w; S.weatherUntil = S.abs + 1 + Math.random() * 2.5;
        g.ui.toast({ regen: '🌧️ Es fängt an zu regnen.', nebel: '🌫️ Nebel zieht auf.', gewitter: '⛈️ Ein Gewitter zieht auf!', schnee: '🌨️ Es fängt an zu schneien.' }[w]); }
      else S.nextWeather = S.abs + 2 + Math.random() * 4;
    }
    if (S.weather !== 'klar' && S.abs > (S.weatherUntil || 0)) { S.weather = 'klar'; S.nextWeather = S.abs + 4 + Math.random() * 7; }
    if (season !== 'Winter' && S.weather === 'schnee') S.weather = 'regen';
    if (season === 'Winter' && S.weather === 'regen') S.weather = 'schnee';
    const wet = { regen: 1, gewitter: 1, schnee: .8 }[S.weather] || 0, fog = { nebel: 1, gewitter: .3, schnee: .4 }[S.weather] || 0;
    sky.rainAmount += (wet - sky.rainAmount) * Math.min(1, dt * .2);
    sky.fogBoost += (fog - sky.fogBoost) * Math.min(1, dt * .15);
    sky.setSnow(S.weather === 'schnee' || (season === 'Winter' && sky.rainAmount > .05));
    S.rainUntil = wet ? S.weatherUntil : 0;        // older code paths / saves
    // lightning
    if (S.weather === 'gewitter') {
      this.boltT -= dt; if (this.boltT < 0) { this.boltT = 6 + Math.random() * 14; sky.flash = 1; const d = .4 + Math.random() * 2.5; setTimeout(() => g.audio.sfx('thunder'), d * 1000); }
    }
  }
  label() { return `${this.icon} ${this.season || ''}${this.S.weather && this.S.weather !== 'klar' ? ' · ' + { regen: '🌧️', nebel: '🌫️', gewitter: '⛈️', schnee: '🌨️' }[this.S.weather] : ''}`; }
}
