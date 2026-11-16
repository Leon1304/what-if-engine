// Ton für die Schwebeinsel: Atmo (Wind, Vögel, Grillen, Wasser, Wasserfall, Dorf, Regen), ruhige generative Musik
// (pentatonische Zupfklänge, Glocken, weiche Flächen; je Jahreszeit eigene Tonart) und befriedigende Effekte.
// Alles prozedural mit WebAudio, keine Dateien. Lautstärken werden weich angefahren.
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// Tonarten: Grundton (MIDI), Pentatonik, Akkordfolge (Halbtöne relativ zum Grundton), Tempo
const KEYS = [
  { name: 'Frühling', root: 62, pent: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], bpm: 74 },   // D  Hm  G  A
  { name: 'Sommer', root: 67, pent: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [-7, -3, 0], [-3, 0, 4], [-5, -1, 2]], bpm: 80 },     // G  C  Em  D
  { name: 'Herbst', root: 57, pent: [0, 3, 5, 7, 10], chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], bpm: 68 },     // Am F  C  G
  { name: 'Winter', root: 64, pent: [0, 3, 5, 7, 10], chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], bpm: 60 },     // Em C  G  D
];
const VOWELS = [[800, 1200], [500, 1900], [320, 2300], [520, 900], [360, 800]];

export class Sound {
  constructor(opts = {}) {
    this.ctx = null; this.vol = { music: .55, sfx: .8 }; this.ready = false;
    this.env = { night: 0, season: 1, rain: 0, camDist: 30, near: { water: 0, forest: 0, village: 0, fall: 0 } };
    this.ks = new Map(); this._last = 0;
    if (opts.context) { this.ctx = opts.context; this.offline = true; this._build(); }
  }
  unlock() {
    try {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC({ latencyHint: 'playback' }); this._build(); }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { console.warn('Ton nicht verfügbar', e); }
  }
  setVolumes(music, sfx) {
    this.vol.music = clamp(music); this.vol.sfx = clamp(sfx);
    if (this.ready) { const t = this.ctx.currentTime; this.musicVol.gain.setTargetAtTime(this.vol.music, t, .1); this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, .05); this.ambVol.gain.setTargetAtTime(this.vol.sfx, t, .1); }
  }

  // ---------------------------------------------------------------- Aufbau
  _build() {
    const c = this.ctx, sr = c.sampleRate;
    this.master = c.createGain(); this.master.gain.value = .9;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = .005; comp.release.value = .25;
    this.master.connect(comp); comp.connect(c.destination);
    // Hall (erzeugte Impulsantwort) und Echo
    this.rev = c.createConvolver(); this.rev.buffer = this._impulse(3.2, 2.6); const revOut = c.createGain(); revOut.gain.value = .55; this.rev.connect(revOut); revOut.connect(this.master);
    this.musicVol = c.createGain(); this.musicVol.gain.value = this.vol.music; this.musicTone = c.createBiquadFilter(); this.musicTone.type = 'lowpass'; this.musicTone.frequency.value = 12000;
    this.music = c.createGain(); this.music.gain.value = .5; this.music.connect(this.musicTone); this.musicTone.connect(this.musicVol); this.musicVol.connect(this.master);
    this.musicRev = c.createGain(); this.musicRev.gain.value = .5; this.musicRev.connect(this.rev); this.musicTone.connect(this.musicRev);
    this.delay = c.createDelay(2); this.delay.delayTime.value = .42; const fb = c.createGain(); fb.gain.value = .32; const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2600;
    this.delay.connect(dl); dl.connect(fb); fb.connect(this.delay); this.delaySend = c.createGain(); this.delaySend.gain.value = .22; this.delaySend.connect(this.delay); dl.connect(this.music);
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.vol.sfx; this.sfxBus.connect(this.master);
    this.sfxRev = c.createGain(); this.sfxRev.gain.value = .35; this.sfxRev.connect(this.rev); this.sfxBus.connect(this.sfxRev);
    this.ambVol = c.createGain(); this.ambVol.gain.value = this.vol.sfx; this.ambVol.connect(this.master);
    this.amb = c.createGain(); this.amb.gain.value = 1; this.amb.connect(this.ambVol);
    const ambRev = c.createGain(); ambRev.gain.value = .25; this.amb.connect(ambRev); ambRev.connect(this.rev);
    // Rauschen
    const noise = (sec, brown) => { const b = c.createBuffer(1, Math.floor(sr * sec), sr), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } const f = Math.floor(sr * .05); for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[d.length - f + i] * (1 - k); } return b; };
    this.white = noise(3, false); this.brown = noise(5, true);
    const loop = (buf, dest) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start(0, Math.random() * buf.duration * .9); return s; };
    const filt = (type, f, q = .7) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const gain = v => { const g = c.createGain(); g.gain.value = v; return g; };
    // Wind (Böen über zwei langsame Schwingungen)
    this.gWind = gain(0); const wbp = filt('bandpass', 420, .55), gust = gain(.6); loop(this.brown, wbp); wbp.connect(gust); gust.connect(this.gWind); this.gWind.connect(this.amb);
    const lfo = (f, amt, param) => { const o = c.createOscillator(); o.frequency.value = f; const g = gain(amt); o.connect(g); g.connect(param); o.start(); return o; };
    lfo(.047, 170, wbp.frequency); lfo(.11, .35, gust.gain); lfo(.031, .2, gust.gain);
    // Regen
    this.gRain = gain(0); const rh = filt('highpass', 1100), rl = filt('lowpass', 7000); loop(this.white, rh); rh.connect(rl); rl.connect(this.gRain); this.gRain.connect(this.amb);
    // Bach: drei schmale Bänder, deren Frequenz ständig springt (Blubbern)
    this.gWater = gain(0); this.babble = [0, 1, 2].map(() => { const b = filt('bandpass', R(500, 1800), 14), g = gain(.9); loop(this.white, b); b.connect(g); g.connect(this.gWater); return b; }); this.gWater.connect(this.amb);
    const wl = filt('lowpass', 500); loop(this.brown, wl); const wlg = gain(.5); wl.connect(wlg); wlg.connect(this.gWater);
    // Wasserfall
    this.gFall = gain(0); const fl = filt('lowpass', 750), fh = filt('bandpass', 1900, .5), fhg = gain(.22); loop(this.brown, fl); loop(this.white, fh); fl.connect(this.gFall); fh.connect(fhg); fhg.connect(this.gFall); this.gFall.connect(this.amb);
    // Pegel der gestreuten Klänge
    this.gBirds = gain(0); this.gBirds.connect(this.amb); this.gNight = gain(0); this.gNight.connect(this.amb); this.gVillage = gain(0); this.gVillage.connect(this.amb);
    this.lv = { birds: 0, crickets: 0, village: 0, owl: 0, drips: 0 };
    const t0 = c.currentTime;
    this.next = { bird: t0 + .5, cricket: t0 + .3, voice: t0 + 1, owl: t0 + 8, drip: t0 + .2, babble: t0, hammer: t0 + 6 };
    this.m = { t: t0 + .3, step: 0, chord: -1, key: 1, deg: 4, phrase: true, phraseEnd: 0 };
    this.ready = true;
    if (!this.offline && typeof setInterval !== 'undefined') this._timer = setInterval(() => this._tick(), 120);
    this.update(this.env);
  }
  _impulse(sec, decay) {
    const c = this.ctx, sr = c.sampleRate, n = Math.floor(sr * sec), b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (t < .012 ? t / .012 : 1); } }
    return b;
  }

  // ---------------------------------------------------------------- Zustand
  update(env = {}) {
    Object.assign(this.env, env); if (env.near) this.env.near = { water: 0, forest: 0, village: 0, fall: 0, ...env.near };
    if (!this.ready) return;
    const c = this.ctx, now = c.currentTime;
    if (now - this._last < .1 && !this.offline) { return; }
    this._last = now;
    const e = this.env, n = e.near, s = ((e.season % 4) + 4) % 4, w = [0, 1, 2, 3].map(i => { const d = Math.abs(s - i); return clamp(1 - Math.min(d, 4 - d)); });
    const day = 1 - clamp(e.night), far = clamp((e.camDist - 12) / 50), rain = clamp(e.rain);
    const T = (g, v, k = .6) => g.gain.setTargetAtTime(v, now, k);
    T(this.gWind, .05 + far * .22 + w[3] * .07 + rain * .06 + w[2] * .03);
    T(this.gRain, rain * .32);
    T(this.gWater, clamp(n.water) * .2 * (1 - far * .6) * (1 - w[3] * .7));
    T(this.gFall, clamp(n.fall) * .42 + clamp(n.fall) * far * .1);
    this.lv.birds = day * (1 - rain * .85) * (.25 + clamp(n.forest) * .75) * (1 - w[3] * .75) * (1 - far * .5);
    this.lv.crickets = clamp(e.night * 1.4 - .3) * (w[1] + w[2] * .8 + w[0] * .4) * (1 - rain);
    this.lv.owl = clamp(e.night * 1.5 - .5) * (1 - rain);
    this.lv.village = clamp(n.village) * (.25 + day * .75) * (1 - rain * .5) * (1 - far * .7);
    this.lv.drips = rain;
    T(this.gBirds, 1, .3); T(this.gNight, 1, .3); T(this.gVillage, 1, .3);
    // Musik: nachts leiser und dunkler, Regen dämpft
    this.music.gain.setTargetAtTime(.5 * (1 - .45 * e.night), now, 1.5);
    this.musicTone.frequency.setTargetAtTime(12000 - e.night * 6500 - rain * 3000, now, 1.5);
    this._tick();
  }

  // Planung (vorausschauend): Musik und gestreute Atmo-Klänge
  _tick(horizon = .45) {
    if (!this.ready) return;
    const c = this.ctx, now = c.currentTime, until = now + horizon, L = this.lv, N = this.next;
    if (N.babble < until) { for (const b of this.babble) b.frequency.setTargetAtTime(R(450, 2100), N.babble, .04); N.babble += R(.06, .16); if (N.babble < now) N.babble = now; }
    while (N.bird < until) { if (L.birds > .02) this._birdSong(N.bird, L.birds); N.bird += R(.6, 2.6) / Math.max(.25, L.birds * 1.4); }
    while (N.cricket < until) { if (L.crickets > .02) this._cricket(N.cricket, L.crickets); N.cricket += R(.12, .32) / Math.max(.3, L.crickets); }
    while (N.owl < until) { if (L.owl > .1 && Math.random() < .5) this._owl(N.owl, L.owl); N.owl += R(14, 30); }
    while (N.voice < until) { if (L.village > .02) this._voice(N.voice, L.village); N.voice += R(.5, 1.6) / Math.max(.4, L.village * 1.5); }
    while (N.hammer < until) { if (L.village > .1 && Math.random() < .45) this._hammer(N.hammer, L.village); N.hammer += R(8, 20); }
    while (N.drip < until) { if (L.drips > .1) this._drip(N.drip, L.drips); N.drip += R(.02, .12) / Math.max(.2, L.drips); }
    this._musicTick(until);
  }

  // ---------------------------------------------------------------- Musik
  _key() { const s = ((Math.round(this.env.season) % 4) + 4) % 4; return KEYS[s]; }
  _musicTick(until) {
    const m = this.m, e = this.env, night = clamp(e.night);
    if (m.t < this.ctx.currentTime - 1) m.t = this.ctx.currentTime + .05;
    while (m.t < until) {
      const K = KEYS[m.key], bpm = K.bpm * (1 - night * .2), dt = 60 / bpm / 2, t = m.t, st = m.step;
      if (st % 16 === 0) {                                               // neuer Akkord alle zwei Takte
        m.chord = (m.chord + 1) % 4; if (m.chord === 0) { m.key = ((Math.round(e.season) % 4) + 4) % 4; }
        const K2 = KEYS[m.key], ch = K2.chords[m.chord];
        this._pad(t, ch.map(x => K2.root - 12 + x), dt * 16 + .5, night);
        if (night < .6) this._bass(t, K2.root - 24 + ch[0], .9 * (1 - night));
        if (st % 64 === 0 && Math.random() < .5) m.phrase = !m.phrase || Math.random() < .5;
      }
      const K3 = KEYS[m.key], ch = K3.chords[Math.max(0, m.chord)];
      if (st % 8 === 4 && night < .5 && Math.random() < .55) this._bass(t, K3.root - 24 + ch[0] + (Math.random() < .3 ? 7 : 0), .5 * (1 - night));
      // Melodie
      const strong = st % 4 === 0, dens = (m.phrase ? .5 : .14) * (1 - night * .55) * (1 - e.rain * .25);
      if (Math.random() < dens * (strong ? 1.3 : .8)) {
        m.deg = clamp(m.deg + pick([-2, -1, -1, 1, 1, 2, 0]), 0, 10);
        if (strong && Math.random() < .5) { const tones = ch.map(x => ((x % 12) + 12) % 12); for (let k = 0; k < 3; k++) { const midi = this._degMidi(K3, m.deg); if (tones.includes(((midi - K3.root) % 12 + 12) % 12)) break; m.deg = clamp(m.deg + (Math.random() < .5 ? 1 : -1), 0, 10); } }
        const midi = this._degMidi(K3, m.deg);
        this._pluck(t, midi, R(.35, .6) * (strong ? 1 : .8), R(-.4, .4));
        if (Math.random() < .12) this._pluck(t + dt, this._degMidi(K3, clamp(m.deg + 1, 0, 10)), .3, R(-.4, .4));
      }
      if (Math.random() < (.025 + night * .05 + (m.key === 3 ? .05 : 0))) this._bell(t + R(0, dt), this._degMidi(K3, Math.floor(R(5, 10))) + 12, .12 + night * .05, this.music, R(-.6, .6));
      m.t += dt * (st % 2 ? .94 : 1.06); m.step++;                            // leichter Swing
    }
  }
  _degMidi(K, d) { return K.root + K.pent[d % 5] + 12 * Math.floor(d / 5) - 5; }
  _ksBuffer(midi) {
    let b = this.ks.get(midi); if (b) return b;
    const c = this.ctx, sr = c.sampleRate, f = mtof(midi), N = Math.max(2, Math.floor(sr / f)), len = Math.floor(sr * 2.6), d = new Float32Array(len);
    const decay = Math.pow(.001, 1 / (2.2 * f)) ;                         // ~2,2 s Nachklang
    let prev = 0; for (let i = 0; i < N; i++) { const w = Math.random() * 2 - 1; prev = prev * .45 + w * .55; d[i] = prev; }
    d[N] = d[0] * decay; for (let i = N + 1; i < len; i++) d[i] = (d[i - N] + d[i - N - 1]) * .5 * decay;
    for (let i = 0; i < len; i++) d[i] *= .7 + .3 * Math.exp(-i / (sr * .02));
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
    for (let i = 0; i < len; i++) d[i] /= peak || 1;
    b = c.createBuffer(1, len, sr); b.copyToChannel(d, 0); b.rate = f / (sr / (N + .5)); this.ks.set(midi, b); return b;
  }
  _pluck(t, midi, vel = .5, pan = 0, dest = this.music, send = true) {
    const c = this.ctx, buf = this._ksBuffer(midi), s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = buf.rate;
    const g = c.createGain(); g.gain.setValueAtTime(vel * .5, t); g.gain.setTargetAtTime(0, t + 1.6, .4);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200 + vel * 2500;
    // weicher Sinus-Kern (Kalimba-Charakter)
    const o = c.createOscillator(); o.frequency.value = mtof(midi); const og = c.createGain(); og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(vel * .16, t + .004); og.gain.exponentialRampToValueAtTime(.0001, t + .9);
    const p = this._pan(pan); s.connect(lp); lp.connect(g); o.connect(og); og.connect(g); g.connect(p); p.connect(dest); if (send) p.connect(this.delaySend);
    s.start(t); s.stop(t + 2.6); o.start(t); o.stop(t + 1);
  }
  _bell(t, midi, vel = .2, dest = this.sfxBus, pan = 0) {
    const c = this.ctx, f = mtof(midi), p = this._pan(pan); p.connect(dest);
    for (const [r, a, d] of [[1, 1, 2.4], [2.0, .3, 1.5], [2.76, .22, 1.1], [5.4, .1, .5], [8.9, .04, .25]]) {
      if (f * r > c.sampleRate * .45) continue;
      const o = c.createOscillator(); o.frequency.value = f * r; const g = c.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * a * .4, t + .003); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(p); o.start(t); o.stop(t + d + .05);
    }
  }
  _pad(t, notes, dur, night) {
    const c = this.ctx, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650 + (1 - night) * 500; lp.Q.value = .4;
    const g = c.createGain(), lvl = .05 * (1 + night * .4); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + 2.2); g.gain.setValueAtTime(lvl, t + dur - 1); g.gain.linearRampToValueAtTime(0, t + dur + 2.5);
    lp.connect(g); g.connect(this.music);
    for (const n of notes) for (const [type, det, a] of [['triangle', 0, .5], ['sawtooth', 5, .22], ['sine', -4, .4]]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = mtof(n); o.detune.value = det + R(-3, 3);
      const og = c.createGain(); og.gain.value = a / notes.length; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 2.6);
    }
  }
  _bass(t, midi, vel) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16 * vel, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + 1.6);
    o.connect(g); g.connect(this.music); o.start(t); o.stop(t + 1.7);
  }

  // ---------------------------------------------------------------- Atmo-Klänge
  _pan(p) { const c = this.ctx; if (c.createStereoPanner) { const s = c.createStereoPanner(); s.pan.value = clamp(p, -1, 1); return s; } return c.createGain(); }
  _tone(t, { f0, f1 = f0, dur, vol, type = 'sine', dest, pan = 0, attack = .004, curve = 'exp' }) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), p = this._pan(pan); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) curve === 'exp' ? o.frequency.exponentialRampToValueAtTime(f1, t + dur) : o.frequency.linearRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(p); p.connect(dest); o.start(t); o.stop(t + dur + .02); return o;
  }
  _noise(t, { dur, vol, type = 'bandpass', f = 1000, f1, q = 1, dest, pan = 0, attack = .003, buf }) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = buf || this.white; const b = c.createBiquadFilter(); b.type = type; b.frequency.setValueAtTime(f, t); b.Q.value = q;
    if (f1) b.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(), p = this._pan(pan); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(b); b.connect(g); g.connect(p); p.connect(dest); s.start(t, Math.random() * 2); s.stop(t + dur + .02);
  }
  _birdSong(t, lvl) {
    const pan = R(-.8, .8), v = R(.025, .055) * lvl, kind = Math.random(), D = this.gBirds;
    if (kind < .45) { let tt = t; const base = R(2600, 4200); for (let i = 0, n = 2 + Math.floor(R(0, 4)); i < n; i++) { const d = R(.05, .11); this._tone(tt, { f0: base * R(.9, 1.15), f1: base * R(.7, 1.35), dur: d, vol: v, dest: D, pan }); tt += d + R(.025, .07); } }
    else if (kind < .7) { const f = R(3300, 4300); for (let i = 0, n = 6 + Math.floor(R(0, 9)); i < n; i++) this._tone(t + i * .042, { f0: f * (i % 2 ? 1.08 : 1), f1: f * (i % 2 ? .96 : 1.05), dur: .035, vol: v * .8, dest: D, pan }); }
    else { let tt = t; const base = R(1500, 2300); for (let i = 0, n = 3 + Math.floor(R(0, 3)); i < n; i++) { const d = R(.1, .2), f = base * pick([1, 1.125, 1.25, 1.5, 1.33]); this._tone(tt, { f0: f, f1: f * R(.92, 1.1), dur: d, vol: v * 1.1, dest: D, pan, attack: .02 }); tt += d + R(.04, .1); } }
  }
  _cricket(t, lvl) { const f = R(4300, 4900), pan = R(-.9, .9), v = .016 * lvl; for (let i = 0; i < 3; i++) this._tone(t + i * .028, { f0: f, dur: .016, vol: v, dest: this.gNight, pan, attack: .002 }); }
  _owl(t, lvl) { const pan = R(-.7, .7), v = .045 * lvl; this._tone(t, { f0: 410, f1: 380, dur: .5, vol: v, dest: this.gNight, pan, attack: .06, curve: 'lin' }); this._tone(t + .85, { f0: 400, f1: 390, dur: .2, vol: v * .8, dest: this.gNight, pan, attack: .03 }); this._tone(t + 1.12, { f0: 405, f1: 370, dur: .65, vol: v, dest: this.gNight, pan, attack: .06, curve: 'lin' }); }
  _voice(t, lvl) {
    const c = this.ctx, f0 = Math.random() < .5 ? R(105, 150) : R(185, 260), o = c.createOscillator(); o.type = 'sawtooth';
    const n = 3 + Math.floor(R(0, 7)), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.Q.value = 6; f2.Q.value = 8;
    const g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; const p = this._pan(R(-.7, .7)); const g2 = c.createGain(); g2.gain.value = .6;
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(p); p.connect(this.gVillage);
    g.gain.setValueAtTime(0, t); let tt = t; const v = .03 * lvl;
    for (let i = 0; i < n; i++) {
      const d = R(.1, .22), [a, b] = pick(VOWELS); f1.frequency.setValueAtTime(a, tt); f2.frequency.setValueAtTime(b, tt);
      o.frequency.setValueAtTime(f0 * R(.88, 1.15), tt); o.frequency.linearRampToValueAtTime(f0 * R(.85, 1.1), tt + d);
      g.gain.linearRampToValueAtTime(v * R(.6, 1), tt + .03); g.gain.linearRampToValueAtTime(v * .2, tt + d - .02); tt += d + (Math.random() < .2 ? R(.08, .2) : .01);
    }
    g.gain.linearRampToValueAtTime(0, tt + .05); o.start(t); o.stop(tt + .1);
  }
  _hammer(t, lvl) { const pan = R(-.6, .6); for (let i = 0; i < 3; i++) { this._bell(t + i * .55, 88 + (i % 2), .05 * lvl, this.gVillage, pan); this._noise(t + i * .55, { dur: .05, vol: .04 * lvl, f: 2500, q: 1.5, dest: this.gVillage, pan }); } }
  _drip(t, lvl) { this._tone(t, { f0: R(1800, 3600), f1: R(900, 1500), dur: .025, vol: .012 * lvl, dest: this.amb, pan: R(-1, 1) }); }

  // ---------------------------------------------------------------- Effekte
  // play(name, { vol, pan, pts }) – pts: Punkte, ergeben aufsteigende Töne nach dem Setzen
  play(name, o = {}) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime + .005, D = this.sfxBus, v = o.vol ?? 1, pan = o.pan ?? 0, K = this._key();
    const deg = d => this._degMidi(K, d) + 12;
    switch (name) {
      case 'click': this._tone(t, { f0: 1900, f1: 1500, dur: .03, vol: .1 * v, dest: D, pan }); this._noise(t, { dur: .012, vol: .05 * v, type: 'highpass', f: 4000, dest: D, pan }); break;
      case 'place': {
        this._tone(t, { f0: 560, f1: 130, dur: .16, vol: .55 * v, dest: D, pan, attack: .002 });
        this._tone(t, { f0: 95, f1: 70, dur: .18, vol: .35 * v, dest: D, pan });
        this._noise(t, { dur: .05, vol: .25 * v, f: 950, q: 2.2, dest: D, pan });
        this._noise(t + .02, { dur: .22, vol: .05 * v, type: 'highpass', f: 3200, dest: D, pan, attack: .02 });
        const n = o.pts ? clamp(Math.round(o.pts / 2), 1, 8) : 0;
        for (let i = 0; i < n; i++) this._pluck(t + .12 + i * .065, deg(i + 2), .45 + i * .03, pan + (i - n / 2) * .05, D, false);
        break;
      }
      case 'points': { const n = clamp(Math.round((o.pts || 4) / 2), 1, 8); for (let i = 0; i < n; i++) this._pluck(t + i * .065, deg(i + 2), .45, pan, D, false); break; }
      case 'perfect': for (let i = 0; i < 6; i++) this._bell(t + i * .075, deg(i + 3), .32 * v, D, (i - 2.5) * .15); for (let i = 0; i < 6; i++) this._bell(t + .55 + i * .03, deg(8 + (i % 3)) + 12, .08 * v, D, R(-.5, .5)); break;
      case 'invalid': this._tone(t, { f0: 220, f1: 200, dur: .14, vol: .22 * v, type: 'triangle', dest: D, pan }); this._tone(t + .13, { f0: 185, f1: 165, dur: .2, vol: .2 * v, type: 'triangle', dest: D, pan }); break;
      case 'rotate': this._noise(t, { dur: .13, vol: .1 * v, f: 700, f1: 2400, q: 1.2, dest: D, pan, attack: .03 }); this._tone(t + .1, { f0: 1500, dur: .02, vol: .06 * v, dest: D, pan }); break;
      case 'milestone': {
        const ch = [0, 4, 7, 14].map(x => K.root + x + (K.pent[1] === 3 && x === 4 ? -1 : 0));
        ch.forEach((m, i) => { this._pluck(t + i * .045, m, .6, (i - 1.5) * .2, D, false); this._bell(t + .02 + i * .045, m + 12, .22 * v, D, (i - 1.5) * .2); });
        this._pad(t, ch.map(m => m - 12), 1.5, 0); this._bell(t + .5, ch[3] + 12, .12 * v, D);
        break;
      }
      case 'unlock': {
        this._tone(t, { f0: 330, f1: 1320, dur: 1.1, vol: .1 * v, dest: D, pan, attack: .3 });
        for (let i = 0; i < 8; i++) this._bell(t + .2 + i * .09 + R(0, .04), deg(4 + i), .16 * v, D, R(-.6, .6));
        [0, 4, 7].forEach((x, i) => this._pluck(t + .95 + i * .03, K.root + 12 + x - (K.pent[1] === 3 && x === 4 ? 1 : 0), .5, (i - 1) * .3, D, false));
        break;
      }
      case 'quest': { const m = [7, 4, 12].map(x => K.root + 12 + x - (K.pent[1] === 3 && x === 4 ? 1 : 0)); m.forEach((x, i) => { this._pluck(t + i * .14, x, .65, 0, D, false); this._tone(t + i * .14, { f0: mtof(x), dur: i === 2 ? .6 : .14, vol: .05 * v, type: 'square', dest: D }); }); this._bell(t + .3, m[2] + 12, .2 * v, D); break; }
      case 'undo': this._tone(t, { f0: 900, f1: 620, dur: .08, vol: .12 * v, dest: D, pan }); this._tone(t + .08, { f0: 620, f1: 400, dur: .1, vol: .12 * v, dest: D, pan }); this._noise(t, { dur: .18, vol: .06 * v, f: 2400, f1: 600, q: 1, dest: D, pan, attack: .1 }); break;
      case 'photo': this._noise(t, { dur: .03, vol: .35 * v, type: 'highpass', f: 2200, dest: D }); this._tone(t, { f0: 220, f1: 140, dur: .02, vol: .15 * v, type: 'square', dest: D }); this._noise(t + .075, { dur: .045, vol: .3 * v, type: 'highpass', f: 1800, dest: D }); this._tone(t + .075, { f0: 180, f1: 120, dur: .025, vol: .12 * v, type: 'square', dest: D }); break;
      // Zusätzliche Klänge (für life.onSound)
      case 'burner': this._noise(t, { dur: 1.3, vol: .22 * v, type: 'lowpass', f: 700, q: .8, dest: D, pan, attack: .08, buf: this.brown }); this._noise(t, { dur: 1.2, vol: .06 * v, f: 1800, q: .6, dest: D, pan, attack: .1 }); break;
      case 'splash': this._noise(t, { dur: .28, vol: .16 * v, f: 1500, f1: 700, q: .9, dest: D, pan }); this._tone(t, { f0: 320, f1: 900, dur: .07, vol: .08 * v, dest: D, pan }); break;
      case 'honk': for (let i = 0; i < 2; i++) this._tone(t + i * .32, { f0: 390, f1: 330, dur: .2, vol: .05 * v, type: 'sawtooth', dest: this.amb, pan: R(-.4, .4), attack: .02 }); break;
      case 'eagle': this._tone(t, { f0: 2300, f1: 1500, dur: .7, vol: .06 * v, dest: D, pan, attack: .05 }); this._tone(t + .8, { f0: 2100, f1: 1600, dur: .4, vol: .04 * v, dest: D, pan, attack: .04 }); break;
      case 'whistle': this._tone(t, { f0: 900, f1: 2400, dur: .9, vol: .035 * v, dest: D, pan, attack: .1 }); break;
      case 'firework': this._noise(t, { dur: 1.1, vol: .4 * v, type: 'lowpass', f: 380, q: .7, dest: D, pan, buf: this.brown }); for (let i = 0; i < 16; i++) this._noise(t + .25 + R(0, .9), { dur: .015, vol: R(.03, .07) * v, type: 'highpass', f: 3000, dest: D, pan: R(-.8, .8) }); break;
      case 'pop': this._noise(t, { dur: .06, vol: .3 * v, f: 1200, q: .8, dest: D, pan }); this._tone(t, { f0: 420, f1: 180, dur: .06, vol: .15 * v, dest: D, pan }); for (let i = 0; i < 6; i++) this._noise(t + .05 + R(0, .4), { dur: .02, vol: .03 * v, type: 'highpass', f: 5000, dest: D, pan: R(-.6, .6) }); break;
      case 'sparkle': for (let i = 0; i < 6; i++) this._bell(t + i * .06 + R(0, .03), deg(5 + Math.floor(R(0, 5))) + 12, .1 * v, D, R(-.6, .6)); break;
      case 'flutter': for (let i = 0; i < 14; i++) this._noise(t + i * .07 + R(0, .02), { dur: .05, vol: .06 * v * (1 - i / 14), f: 900, q: .7, dest: D, pan: pan + R(-.3, .3) }); break;
      case 'chirp': this._birdSong(t, 1); break;
      case 'moo': this._tone(t, { f0: 140, f1: 110, dur: 1.1, vol: .1 * v, type: 'sawtooth', dest: D, pan, attack: .15, curve: 'lin' }); break;
      case 'bell': this._bell(t, K.root - 12, .35 * v, D, pan); this._bell(t, K.root, .15 * v, D, pan); break;
      default: break;
    }
  }

  dispose() { if (this._timer) clearInterval(this._timer); try { this.ctx?.close?.(); } catch (e) { /* schon zu */ } this.ready = false; }

  // Selbsttest ohne Lautsprecher: rendert Atmo, Musik und alle Effekte offline und misst Pegel
  static async selfTest(sec = 16) {
    const sr = 44100, ctx = new OfflineAudioContext(2, sr * sec, sr), s = new Sound({ context: ctx });
    s.update({ night: 0, season: 1, rain: 0, camDist: 25, near: { water: .7, forest: .6, village: .8, fall: .4 } });
    s._tick(sec);
    const names = ['click', 'place', 'perfect', 'invalid', 'rotate', 'milestone', 'unlock', 'quest', 'undo', 'photo', 'burner', 'splash', 'firework', 'pop', 'sparkle'];
    const at = {}; names.forEach((n, i) => { at[n] = 1 + i * .95; });
    // Effekte zu festen Zeiten einplanen (play nutzt currentTime → kurz umgelenkt)
    const fake = { v: 0 }; Object.defineProperty(ctx, 'currentTime', { get: () => fake.v, configurable: true });
    for (const [n, tt] of Object.entries(at)) { fake.v = tt; s.play(n, { pts: 7 }); }
    delete ctx.currentTime;
    const buf = await ctx.startRendering(), d0 = buf.getChannelData(0), d1 = buf.getChannelData(1);
    let peak = 0, nan = 0; const rms = [];
    for (let k = 0; k < sec; k++) { let q = 0; for (let i = k * sr; i < (k + 1) * sr; i++) { const a = d0[i], b = d1[i]; if (!Number.isFinite(a) || !Number.isFinite(b)) nan++; peak = Math.max(peak, Math.abs(a), Math.abs(b)); q += a * a; } rms.push(+Math.sqrt(q / sr).toFixed(4)); }
    const sfx = {}; for (const [n, tt] of Object.entries(at)) { let p = 0; for (let i = Math.floor(tt * sr); i < Math.floor((tt + .5) * sr); i++) p = Math.max(p, Math.abs(d0[i])); sfx[n] = +p.toFixed(3); }
    return { peak: +peak.toFixed(3), nan, rms, sfx, ks: s.ks.size };
  }
}
