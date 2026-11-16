// What If Town — one engine page for every state of the game (sandbox/index.html loads it in an iframe).
// Parameters come from location.hash: #s=none (calm city, loops) | #s=asteroid&x=12&z=-40&r=110&from=140 (scenario at that spot; from = azimuth in degrees
//   the threat comes from — the shell picks one across the player's view, so the rock crosses the frame)
//   cam=az,el,dist,atX,atZ,fov → start camera (the shell hands over the player's view when it swaps worlds) · play=0 → wait for whatif.live.play() · q=low → no shadows (slow machines)
// Scenario table: SANDBOX_SCEN (here: length, loop, music, counters) + SANDBOX_BUILD in world.scene.js (what the scene builds).
// M1 adds an entry to both tables; the shell lists the cards in sandbox/js/scenarios.js.
const SBX = (() => {
  const q = new URLSearchParams((typeof location !== 'undefined' ? location.hash : '').replace(/^#/, ''));
  const num = (k, d) => { const v = parseFloat(q.get(k)); return Number.isFinite(v) ? v : d; };
  const cam = (q.get('cam') || '').split(',').map(Number);
  return { s: q.get('s') || 'none', x: num('x', 0), z: num('z', 0), r: num('r', 0), from: num('from', NaN), play: q.get('play') !== '0', low: q.get('q') === 'low', cam: cam.length >= 5 && cam.every(Number.isFinite) ? cam : null };
})();
const fmtM = n => Math.round(n).toLocaleString('de-DE') + ' m', fmtS = n => n.toFixed(1).replace('.', ',') + ' s', fmtI = n => Math.round(n).toLocaleString('de-DE');
const SANDBOX_SCEN = {
  none: { dur: 60, loop: true,
    audio: { style: 'lofi', score: [[0, 'chill']], music: 0.35, sections: [[0, 1]] },
    stats: () => [
      { label: 'Gebäude', value: () => LIVE.buildings ?? 0, fmt: fmtI },
      { label: 'Autos unterwegs', value: () => LIVE.cars ?? 0, fmt: fmtI }
    ] },
  asteroid: { dur: 40, loop: false, t1: 4, radius: 110,
    audio: { style: 'orchestral', score: [[0, 'tense'], [4, 'epic'], [16, 'sad']], music: 0.5, sections: [[0, 1], [3, 2], [4, 3], [14, 1]] },
    stats: S => [
      { label: 'Einschlag in', value: t => Math.max(0, S.t1 - t), fmt: fmtS, hide: S.t1 + 1.2, bad: true },
      { label: 'Druckwelle', value: t => LIVE.front ? LIVE.front(t) : 0, fmt: fmtM, show: S.t1, up: 'bad' },
      { label: 'Gebäude zerstört', value: t => LIVE.destroyed ? LIVE.destroyed(t) : 0, fmt: fmtI, show: S.t1, up: 'bad', bad: true },
      { label: 'Gebäude stehen', value: t => LIVE.standing ? LIVE.standing(t) : 0, fmt: fmtI, up: 'good' }
    ] }
};
const SC = { ...(SANDBOX_SCEN[SBX.s] ?? SANDBOX_SCEN.none) }; if (!SANDBOX_SCEN[SBX.s]) SBX.s = 'none';
if (SBX.r > 0) SC.radius = SBX.r;
const LIVECAM0 = SBX.cam ? { az: SBX.cam[0], el: SBX.cam[1], dist: SBX.cam[2], at: [SBX.cam[3], 0, SBX.cam[4]], fov: SBX.cam[5] || 40 }
  : { az: 32, el: 42, dist: 300, at: [0, 0, 18], fov: 40 };
const CFG = { dur: SC.dur, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.03, vignette: 0.25, saturation: 1.08, contrast: 1.05,
  shadows: !SBX.low, area: 150, renderScale: 1, msaa: 0, sunAz: -35, handheld: 0, coverT: 1, karaoke: false, voice: false, series: null, cast: {}, transition: 'cut',
  loop: false, autoCut: false, statStagger: 0, countUp: 0, endCard: 'quick', mini: { amount: 0 }, motionBlur: false,
  live: { cam: { ...LIVECAM0, min: 25, max: 650 }, autoplay: SBX.play, loop: SC.loop, maxW: 1600 } };
const LIVE = {};   // scene → story bridge (counters)
const BEATS = [];
const CAM = [{ t: 0, p: [0, 520, 460], l: [0, 0, 0], fov: 40 }];   // video camera unused in live mode; kept high above the city (city() clears towers at lens positions)
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => '';
const STATS = SC.stats(SC);
const END = null;
const AUDIO = { ...SC.audio, sfx: 0.95, ambVol: 0.7, hits: [], amb: [[0, SC.dur, 'city', 0.45]] };
