// Seasons and weather.
// Every 4 days the season changes: Herbst → Winter → Frühling → Sommer. The landscape is recoloured (vertex colours of the ground,
// foliage and roofs: snow on everything facing up in winter, green leaves in spring/summer), plants grow at different speeds
// (nothing in winter), it is colder in winter and warmer in summer.
// Weather comes and goes: klar, Regen, Nebel, Gewitter (rain + lightning + thunder), Schnee (winter) – and now and then a severe
// storm (Unwetter: hail, gale, lightning strikes near you; in winter a Schneesturm). A storm is announced an hour before (toast, radio):
// find shelter in time – outside it hurts and chills you (game.update), under a roof, in a house or in the car you are safe.
import * as THREE from 'three';

export const SEASONS = ['Herbst', 'Winter', 'Frühling', 'Sommer'];
export const SEASON_DAYS = 4;
const ICON = { Herbst: '🍂', Winter: '❄️', Frühling: '🌱', Sommer: '☀️' };
const WEATHER = {     // chance per season of the next weather
  Herbst: { regen: .37, nebel: .23, gewitter: .14, unwetter: .08, klar: .18 }, Winter: { schnee: .48, nebel: .18, schneesturm: .11, klar: .23 },
  Frühling: { regen: .42, gewitter: .14, nebel: .1, unwetter: .06, klar: .28 }, Sommer: { klar: .42, gewitter: .27, regen: .13, nebel: .08, unwetter: .1 },
};
export const STORMS = new Set(['unwetter', 'schneesturm']);
const NAME = { klar: 'klar und trocken', regen: 'Regen', nebel: 'Nebel', gewitter: 'Gewitter', schnee: 'Schnee', unwetter: 'ein schweres Unwetter mit Hagel', schneesturm: 'ein Schneesturm' };
const ICONW = { regen: '🌧️', nebel: '🌫️', gewitter: '⛈️', schnee: '🌨️', unwetter: '🌪️', schneesturm: '🌨️❄️' };
const GROUND = new Set(['Gras', 'Gras_hell', 'Waldboden', 'Moos', 'Laub', 'Trampelpfad', 'Bankett', 'Bachufer', 'Schotter', 'Pflaster', 'Gehweg', 'Acker', 'Steinbruch', 'Laubstreu', 'Laubstreu_gelb', 'Nadelstreu', 'Moospolster']);
const CONIFER = new Set(['Fichte_a', 'Fichte_b', 'Kiefer', 'Latsche']);
const LEAVES = new Set(['Laub_orange', 'Laub_gelb', 'Laub_rot', 'Birke_Laub', 'Busch_herbst', 'Linde']);
const GREEN = new Set(['Laub_gruen', 'Busch', 'Farn', 'Grasbuesche', 'Blattwerk', 'Blattwerk_d', 'Gras_hoch', 'Schilf', 'Bluete_Stiel']);
// flowers: faded in autumn, under snow in winter, bright in spring / summer
const BLOOM = new Set(['Bluete_Margerite', 'Bluete_Hahnenfuss', 'Bluete_Glocke', 'Bluete_Mohn', 'Enzian', 'Alpenrose']);
const ROOF = new Set(['Ziegel_rot', 'Ziegel_braun', 'Schiefer', 'Wellblech', 'Holzschindeln', 'Dachpappe', 'Dach_Bus', 'Hochsitz_Dach', 'Schindeln', 'Dach_Tankstelle', 'Tankdach']);
const C = h => new THREE.Color(h);

export class Seasons {
  constructor(game) {
    this.g = game; this.season = null; this.flashT = 0; this.boltT = 5;
    this.targets = [];
    const seen = new Set();
    game.scene.traverse(o => {
      if (!(o.isMesh || o.isInstancedMesh) || !o.geometry?.attributes.color || seen.has(o.geometry)) return;
      const n = o.material?.name || ''; let kind = GROUND.has(n) ? 'ground' : CONIFER.has(n) ? 'conifer' : LEAVES.has(n) ? 'leaves' : GREEN.has(n) ? 'green' : ROOF.has(n) ? 'roof' : BLOOM.has(n) ? 'bloom' : null;
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
          if (t.kind === 'bloom') col.lerp(snow, .85);
          else if (t.kind === 'ground') col.lerp(snow, .9 * k); else if (t.kind === 'roof') col.lerp(snow, .95 * k); else if (t.kind === 'conifer') col.lerp(snow, .75 * k);
          else if (t.kind === 'leaves') col.lerp(frost, .5).lerp(snow, .6 * k); else col.lerp(snow, .55 * k);
        } else if (season === 'Herbst' && t.kind === 'bloom') col.lerp(C('#9a8a5a'), .35);
        else if (season === 'Frühling' || season === 'Sommer') {
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
    if (this.S.forecast) { const f = this.S.forecast; delete this.S.forecast; return f; }      // the radio's forecast comes true
    const tbl = WEATHER[this.season] || WEATHER.Herbst; let r = Math.random(), w = 'klar';
    for (const [k, p] of Object.entries(tbl)) { r -= p; if (r <= 0) { w = k; break; } }
    if (STORMS.has(w) && (this.S.day < 2 || this.S.abs < (this.S.lastStorm || 0) + 30)) w = w === 'schneesturm' ? 'schnee' : 'gewitter';   // not on the first day, at most every 30 h
    return w;
  }
  update(dt) {
    const S = this.S, g = this.g, sky = g.sky;
    const season = SEASONS[this.index];
    this.changed = false;
    if (season !== this.season) {
      const first = this.season === null; this.season = season; this.recolor(season); S.season = season; this.changed = !first;
      if (!first) g.ui.toast(`${ICON[season]} Der ${season === 'Frühling' ? 'Frühling' : season} beginnt.${season === 'Winter' ? ' Es wird bitterkalt – auf den Feldern wächst nichts.' : season === 'Frühling' ? ' Die Felder wachsen schneller.' : ''}`, 'good');
    }
    // weather: S.weather = kind, S.weatherUntil / S.nextWeather (absolute game hours)
    if (!S.weather) S.weather = 'klar';
    if (S.weather === 'klar' && !S.stormAt && S.abs > (S.nextWeather ?? S.nextRain ?? 19)) {
      const w = this.pick();
      if (STORMS.has(w)) this.warn(w);
      else if (w !== 'klar') { S.weather = w; S.weatherUntil = S.abs + 1 + Math.random() * 2.5;
        g.ui.toast({ regen: '🌧️ Es fängt an zu regnen.', nebel: '🌫️ Nebel zieht auf.', gewitter: '⛈️ Ein Gewitter zieht auf!', schnee: '🌨️ Es fängt an zu schneien.' }[w]); }
      else S.nextWeather = S.abs + 2 + Math.random() * 4;
    }
    // storm: warning an hour ahead, then 1–1.5 hours of hail / blizzard
    if (S.stormAt && S.weather === 'klar' && S.abs >= S.stormAt) {
      S.weather = S.stormKind || 'unwetter'; S.weatherUntil = S.abs + 1 + Math.random() * .5; S.stormHurt = 0; S.lastStorm = S.abs; delete S.stormAt;
      g.audio.sfx('thunder'); g.ui.toast(S.weather === 'schneesturm' ? '🌨️ Der Schneesturm ist da! Draußen erfrierst du schnell – rein ins Warme!' : '🌪️ Das Unwetter ist da – Hagel und Blitze! Draußen bist du in Gefahr.', 'warn');
    }
    if (STORMS.has(S.weather) && S.abs > (S.weatherUntil || 0)) {           // the storm passes
      const kind = S.weather, ok = (S.stormHurt || 0) < 8; g.progress.stat('storms'); if (ok) g.progress.stat('storm_ok');
      g.album?.see(kind === 'schneesturm' ? 'n_schneesturm' : 'n_unwetter');
      g.ui.toast(ok ? `${kind === 'schneesturm' ? '🌨️ Der Schneesturm' : '🌪️ Das Unwetter'} ist vorbei – gut, dass du rechtzeitig Schutz gesucht hast.` : `${kind === 'schneesturm' ? 'Der Schneesturm' : 'Das Unwetter'} zieht ab. Das war knapp.`, 'good');
    }
    if (S.weather !== 'klar' && S.abs > (S.weatherUntil || 0)) { S.weather = 'klar'; S.nextWeather = S.abs + 4 + Math.random() * 7; }
    if (season !== 'Winter' && S.weather === 'schnee') S.weather = 'regen';
    if (season === 'Winter' && S.weather === 'regen') S.weather = 'schnee';
    if (season !== 'Winter' && S.weather === 'schneesturm') S.weather = 'unwetter';
    if (season === 'Winter' && S.weather === 'unwetter') S.weather = 'schneesturm';
    const warnK = S.stormAt ? Math.max(0, 1 - (S.stormAt - S.abs)) : 0;        // the sky darkens before a storm
    const wet = { regen: 1, gewitter: 1, schnee: .8, unwetter: 1, schneesturm: 1 }[S.weather] || 0, fog = Math.max({ nebel: 1, gewitter: .3, schnee: .4, unwetter: .5, schneesturm: .9 }[S.weather] || 0, warnK * .35);
    this.storm = STORMS.has(S.weather) ? S.weather : null;
    sky.rainAmount += (wet - sky.rainAmount) * Math.min(1, dt * .2);
    sky.fogBoost += (fog - sky.fogBoost) * Math.min(1, dt * .15);
    sky.setSnow(S.weather === 'schnee' || S.weather === 'schneesturm' || ((season === 'Winter' || g.region?.() === 'berg') && sky.rainAmount > .05));      // up in the mountains it snows
    sky.gale = this.storm ? 1 : 0;
    S.rainUntil = wet ? S.weatherUntil : 0;        // older code paths / saves
    // lightning
    if (S.weather === 'gewitter' || S.weather === 'unwetter') {
      if (S.weather === 'gewitter') g.album?.see('n_gewitter');
      this.boltT -= dt; if (this.boltT < 0) { const st = S.weather === 'unwetter'; this.boltT = st ? 3 + Math.random() * 6 : 6 + Math.random() * 14; sky.flash = 1;
        if (st && Math.random() < .3 && g.stormStrike?.()) return;           // a strike right next to you (only out in the open)
        const d = .4 + Math.random() * 2.5; setTimeout(() => g.audio.sfx('thunder'), d * 1000); }
    }
  }
  warn(kind) {
    const S = this.S, g = this.g; if (this.season === 'Winter') kind = 'schneesturm'; else if (kind === 'schneesturm') kind = 'unwetter';
    S.stormAt = S.abs + 1; S.stormKind = kind; g.audio.sfx('alarm');
    g.ui.toast(kind === 'schneesturm' ? '⚠️ Unwetterwarnung: In einer Stunde kommt ein Schneesturm! Such dir rechtzeitig ein Dach über dem Kopf.' : '⚠️ Unwetterwarnung: In einer Stunde zieht ein schweres Unwetter mit Hagel auf! Such dir rechtzeitig Schutz.', 'warn');
  }
  // radio weather report (Funkstation): fixes the next weather so the report is right
  forecast() {
    const S = this.S, N = NAME;
    if (S.stormAt) return `⚠️ UNWETTERWARNUNG: In ${Math.max(1, Math.round((S.stormAt - S.abs) * 60))} Minuten kommt ${N[S.stormKind]}. Suchen Sie sofort Schutz!`;
    if (S.weather !== 'klar') { const h = Math.max(0, (S.weatherUntil || S.abs) - S.abs); return `Zurzeit ${N[S.weather]}, noch etwa ${Math.max(1, Math.round(h))} Stunde${Math.round(h) > 1 ? 'n' : ''}. Danach klart es auf.`; }
    if (!S.forecast) { let w = 'klar'; for (let i = 0; i < 4 && w === 'klar'; i++) w = this.pick(); S.forecast = w; }
    if (STORMS.has(S.forecast)) { const h = Math.max(1, Math.round((S.nextWeather ?? S.abs + 3) - S.abs)); return `Die nächsten ${h} Stunde${h > 1 ? 'n' : ''} trocken, danach droht ${N[S.forecast]}. Halten Sie Ihre Hütte bereit!`; }
    const h = Math.max(1, Math.round((S.nextWeather ?? S.nextRain ?? S.abs + 3) - S.abs)); S.nextWeather = S.abs + h;
    return `Die nächsten ${h} Stunde${h > 1 ? 'n' : ''} bleibt es trocken, danach ${N[S.forecast]}.${this.season === 'Winter' ? ' Strenger Frost!' : ''}`;
  }
  label() { return `${this.icon} ${this.season || ''}${this.S.weather && this.S.weather !== 'klar' ? ' · ' + (ICONW[this.S.weather] || '') : ''}${this.S.stormAt ? ` · ⚠️ Unwetter in ${Math.max(1, Math.round((this.S.stormAt - this.S.abs) * 60))} min` : ''}`; }
}
