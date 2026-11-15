const CFG = { dur: 12, seed: 34, locale: 'en-US', kind: 'truecrime', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.0, contrast: 1.05,
  shadows: true, area: 40, nightLift: 0.45, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// v3.35: smuggleTunnel cutaway under a street (strata) · plastic-lined tunnel with rails and a rail bike + cart · slabHole breaking open under a vault floor · prisonCell with the shower hole (CCTV look)
const CAM = [
  { t: 0, p: [6, 2.6, 13], l: [6, 2.4, 0], fov: 50, cut: true }, { t: 3, p: [7, 2.6, 12.5], l: [6, 2.4, 0], fov: 50 },
  { t: 3, cut: true, tr: 'cut', p: [400, 1.3, -3], l: [400, 0.7, -8], fov: 56 }, { t: 6, p: [400, 1.3, -3.5], l: [400, 0.7, -8], fov: 56 },
  { t: 6, cut: true, tr: 'cut', p: [-397.5, 0.6, 2.4], l: [-400, 1.6, 0], fov: 50 }, { t: 8, p: [-397.6, 0.6, 2.3], l: [-400, 1.6, 0], fov: 50 },
  { t: 8, cut: true, tr: 'cut', p: [-801.1, 2.45, -0.5], l: [-799.6, 0.5, -3.0], fov: 72, hand: 0 }, { t: 10, p: [-801.1, 2.45, -0.5], l: [-799.6, 0.5, -3.0], fov: 72, hand: 0 },
  { t: 10, cut: true, tr: 'cut', p: [-799.6, 1.7, 1.6], l: [-799.2, 0.6, -2.9], fov: 52 }, { t: 12, p: [-799.6, 1.7, 1.4], l: [-799.2, 0.6, -2.9], fov: 52 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Test', STATS = [];
const CCTV = [{ t0: 8, t1: 10, label: 'CAM 20', date: '07-11-2015', clock: '20:52:00' }];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'tense', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Tunnel*' };
