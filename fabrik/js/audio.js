// Fließband (Cogtopia) – Ton: alles prozedural mit WebAudio, keine Dateien.
// Effekte (Bau-Klack, Abriss, Münze mit steigender Tonhöhe, Gold-Jackpot, Entdeckungs-Fanfare, Fehler, Kiste, Gerald-Quietschen,
// Strom, Stromausfall, Drohne, Meteor, Beben, Sturm, Glücksrad, Serie, Durchbruch, Album-Karte, Upgrade, Wunder, Raketenstart …),
// Fabrik-Grundrauschen abhängig von der Maschinenzahl, Kraftwerks-Brummen, Sturmwind,
// Musik je Welt (setWorld: wiese / wueste / eis / mond, eigene Tonart, Tempo, Instrumente), Dichte-Schichten wachsen mit der Fabrik.
// Musik und Effekte über getrennte Lautstärken; bis unlock() (Nutzergeste) bleibt alles still.
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// Grundwerte der Wiese (auch von den Effekten benutzt): F-Dur-Pentatonik
const ROOT = 65, PENT = [0, 2, 4, 7, 9];
const VOWELS = { i: [320, 2300], e: [500, 1900], a: [800, 1200], o: [520, 900], u: [360, 800] };

// Dichte-Schichten: ab dieser Maschinenzahl blendet die Schicht ein (Fläche + Melodie immer)
export const LAYERS = { pad: 0, mel: 0, bass: 5, perc: 15, counter: 40, extra: 100 };

// ---------------------------------------------------------------- Musikstile je Welt
// root (MIDI), scale (Halbtöne), bpm, swing (Anteil einer Achtel), chords (relativ zu root), progs, rhythms (16tel-Raster je Takt),
// melOct (Oktavlage der Melodie), echo (Verzögerung in Vierteln), fb (Rückkopplung), rev (Hallanteil).
// Je Schicht eine Funktion (s = Sound, t = Zeit, st = 16tel im Takt 0…15, ch = Akkord, m = Planungszustand).
const STYLES = {
  // Grüne Wiese: gemütliche Marimba, F-Dur-Pentatonik, ~84 bpm
  wiese: {
    root: 65, scale: PENT, bpm: 84, swing: .08, melOct: 0, echo: .75, fb: .28, rev: .45, tone: 9000,
    chords: { I: [0, 4, 7, 11], vi: [-3, 0, 4, 7], IV: [-7, -3, 0, 4], V: [-5, -1, 2, 7], ii: [-10, -7, -3, 0], iii: [-8, -5, -1, 2] },
    progs: [['I', 'vi', 'IV', 'V'], ['I', 'iii', 'IV', 'V'], ['IV', 'I', 'ii', 'V'], ['vi', 'IV', 'I', 'V']],
    rhythms: [[0, 4, 6, 8, 12], [0, 6, 8, 12, 14], [0, 4, 8, 10, 12], [0, 2, 4, 8, 12], [0, 6, 12]], degStart: 5,
    pad(s, t, ch, bar) { const dur = 60 / this.bpm * 4; for (const d of ch) for (const det of [-6, 6]) s._tone(t, mtof(this.root - 12 + d), .9, { type: 'triangle', a: .5, hold: dur - .6, g: .022, lp: 900, detune: det, dest: s.L.pad }); if (bar % 4 === 0 && Math.random() < .6) s._bell(t, mtof(this.root + 24 + pick(PENT)), .022, 1.6, { dest: s.L.pad }); },
    mel(s, t, midi, v) { s._mallet(t, midi, v, s.L.mel); },
    bass(s, t, st, ch) { if (st === 0 || st === 8) { const n = this.root - 24 + ch[0] + (st === 8 ? 7 : 0); s._tone(t, mtof(n), .55, { type: 'triangle', g: .12, lp: 600, dest: s.L.bass, a: .01 }); s._tone(t, mtof(n), .45, { g: .1, dest: s.L.bass, a: .01 }); } },
    perc(s, t, st) { if (st % 4 === 2) s._noise(t, .04, { type: 'highpass', f: 7000, g: st === 6 || st === 14 ? .022 : .012, dest: s.L.perc }); if (st === 4 || st === 12) s._noise(t, .03, { f: 1800, q: 3, g: .04, dest: s.L.perc }); },
    counter(s, t, st, ch, m) { if (st % 8 === 4 && Math.random() < .7) s._bell(t, mtof(this.root + 12 + ch[(m.bar + st / 4) % ch.length]), .03, 1, { dest: s.L.counter }); },
    extra(s, t, st, ch) { if (st % 2 === 0) s._mallet(t, this.root - 12 + ch[(st / 2) % ch.length] + (st >= 8 ? 12 : 0), .45, s.L.extra); },
  },
  // Wüste: D-Hijaz (phrygisch-dominant), gezupfte Oud, Darbuka (Maqsum), Bordun D/A, Ney als Gegenstimme, ~92 bpm
  wueste: {
    root: 62, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 92, swing: 0, melOct: 0, echo: .5, fb: .22, rev: .35, tone: 7000,
    chords: { I: [0, 4, 7], II: [1, 5, 8], iv: [-7, -4, 0], vii: [-2, 1, 5] },
    progs: [['I', 'II', 'I', 'vii'], ['I', 'iv', 'II', 'I'], ['iv', 'II', 'I', 'I'], ['I', 'I', 'II', 'vii']],
    rhythms: [[0, 2, 3, 4, 6, 8, 11, 12], [0, 3, 6, 8, 10, 12, 14], [0, 1, 2, 4, 8, 10, 12], [0, 4, 6, 7, 8, 12]], degStart: 7,
    pad(s, t, ch, bar) { const dur = 60 / this.bpm * 4; for (const [n, g] of [[this.root - 24, .05], [this.root - 17, .03]]) for (const det of [-5, 5]) s._tone(t, mtof(n), .9, { type: 'sawtooth', a: .4, hold: dur - .5, g: g * .5, lp: 520, detune: det, dest: s.L.pad }); },
    mel(s, t, midi, v) { s._pluck(t, midi, v, s.L.mel); if (Math.random() < .18) s._pluck(t - .05, midi + 1, v * .45, s.L.mel); },
    bass(s, t, st, ch) { if (st === 0 || st === 6 || st === 10) s._pluck(t, this.root - 24 + ch[0] + (st === 10 ? 7 : 0), 1.1, s.L.bass, 1600); },
    perc(s, t, st) { // Maqsum: D T . T D . T .
      const D = st === 0 || st === 10, T = st === 4 || st === 8 || st === 14, K = st % 2 === 1 && Math.random() < .35;
      if (D) { s._tone(t, 120, .22, { f2: 62, glide: .12, g: .2, dest: s.L.perc }); s._noise(t, .07, { type: 'lowpass', f: 350, g: .12, dest: s.L.perc }); }
      if (T) { s._noise(t, .05, { f: 3600, q: 2.5, g: .1, dest: s.L.perc }); s._tone(t, 820, .03, { g: .03, dest: s.L.perc }); }
      if (K) s._noise(t, .025, { f: 2400, q: 3, g: .04, dest: s.L.perc, pan: R(-.4, .4) });
    },
    counter(s, t, st, ch, m) { if (st === 0 && m.bar % 2 === 0) s._ney(t, this.root + 12 + ch[Math.floor(Math.random() * ch.length)], 60 / this.bpm * 3.5, s.L.counter); },
    extra(s, t, st, ch) { if (st % 2 === 1 && Math.random() < .6) s._pluck(t, this.root + 12 + pick(ch), .35, s.L.extra, 5000); },
  },
  // Eiswelt: E-Lydisch, Celesta/Glocken, kristallene Flächen, Glasharmonika, ~70 bpm, viel Hall
  eis: {
    root: 64, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 70, swing: 0, melOct: 12, echo: 1, fb: .38, rev: .75, tone: 11000,
    chords: { I: [0, 4, 7, 11], II: [2, 6, 9, 13], vi: [-3, 0, 4, 7], iii: [-8, -5, -1, 2] },
    progs: [['I', 'II', 'I', 'vi'], ['vi', 'II', 'I', 'I'], ['I', 'iii', 'II', 'I'], ['I', 'vi', 'II', 'II']],
    rhythms: [[0, 6, 8], [0, 4, 10], [0, 8, 12], [0, 6, 10, 12]], degStart: 7,
    pad(s, t, ch, bar) { const dur = 60 / this.bpm * 4; for (const d of ch) { s._tone(t, mtof(this.root - 12 + d), 1.4, { a: 1.2, hold: dur - 1.1, g: .028, dest: s.L.pad, vib: [.3, 6] }); s._tone(t, mtof(this.root + d), 1.2, { type: 'triangle', a: 1.5, hold: dur - 1.4, g: .007, lp: 4000, detune: 7, dest: s.L.pad }); }
      s._noise(t, dur, { type: 'bandpass', f: 7000, q: 6, g: .006, a: 1.5, dest: s.L.pad }); },
    mel(s, t, midi, v) { s._celesta(t, midi, v, s.L.mel); },
    bass(s, t, st, ch) { if (st === 0) s._tone(t, mtof(this.root - 24 + ch[0]), 1.6, { a: .08, hold: 1.2, g: .1, dest: s.L.bass }); if (st === 8) s._tone(t, mtof(this.root - 24 + ch[0] + 7), 1.2, { a: .08, g: .06, dest: s.L.bass }); },
    perc(s, t, st) { if (st % 4 === 2 && Math.random() < .8) s._noise(t, .025, { f: R(6500, 9000), q: 9, g: .05, dest: s.L.perc, pan: R(-.6, .6) }); if (st === 8) s._tone(t, 2637, .15, { g: .015, dest: s.L.perc }); },
    counter(s, t, st, ch, m) { if (st === 0 && m.bar % 2 === 1) s._glassHarp(t, this.root + ch[1 + (m.bar >> 1) % (ch.length - 1)], 60 / this.bpm * 3.6, s.L.counter); },
    extra(s, t, st, ch) { if (st % 2 === 0) s._celesta(t, this.root + 12 + ch[(st / 2) % ch.length], .35, s.L.extra); },
  },
  // Mond: A-Äolisch, Synth-Arpeggio, analoger Bass, tiefe Flächen, Sinus-Glocken, weites Echo, ~96 bpm
  mond: {
    root: 57, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 96, swing: 0, melOct: 12, echo: 1.5, fb: .45, rev: .6, tone: 8000,
    chords: { i: [0, 3, 7, 10], VI: [-4, 0, 3, 7], VII: [-2, 2, 5, 9], iv: [5, 8, 12, 15] },
    progs: [['i', 'VI', 'VII', 'i'], ['i', 'iv', 'VI', 'VII'], ['VI', 'VII', 'i', 'i'], ['i', 'i', 'iv', 'VII']],
    rhythms: [[0, 2, 4, 6, 8, 10, 12, 14]], degStart: 5, arp: true,
    pad(s, t, ch, bar) { const dur = 60 / this.bpm * 4; for (const d of ch.slice(0, 3)) for (const det of [-9, 9]) s._tone(t, mtof(this.root - 12 + d), 1, { type: 'sawtooth', a: .9, hold: dur - .8, g: .018, lp: 520, q: 2, detune: det, dest: s.L.pad }); },
    mel(s, t, midi, v) { s._tone(t, mtof(midi), .22, { type: 'square', g: .045 * v, lp: 1700, q: 3, dest: s.L.mel }); },
    bass(s, t, st, ch) { if (st % 2 === 0) s._synBass(t, this.root - 24 + ch[0] + (st % 8 === 6 ? 12 : 0), st % 8 === 0 ? 1 : .6, s.L.bass); },
    perc(s, t, st) { if (st === 0 || st === 8 || st === 11) { s._tone(t, 130, .22, { f2: 42, glide: .12, g: .22, dest: s.L.perc }); }
      if (st % 4 === 2) s._noise(t, .035, { type: 'highpass', f: 8500, g: .03, dest: s.L.perc }); if (st === 4 || st === 12) s._noise(t, .09, { f: 1600, q: .8, g: .05, dest: s.L.perc }); },
    counter(s, t, st, ch, m) { if (st === 0 || (st === 10 && Math.random() < .5)) s._bell(t, mtof(this.root + 24 + ch[Math.floor(Math.random() * ch.length)]), .03, 2.2, { dest: s.L.counter }); },
    extra(s, t, st, ch) { s._tone(t, mtof(this.root + 24 + ch[st % ch.length]), .1, { type: 'sawtooth', g: .012, lp: 2600, dest: s.L.extra }); },
  },
};
export const WORLDS = Object.keys(STYLES);

export const SOUND_NAMES = ['build', 'remove', 'rotate', 'click', 'coin', 'jackpot', 'discover', 'error', 'crate', 'squeak', 'levelup', 'contract', 'plot', 'research', 'cheer',
  'power', 'blackout', 'drone', 'meteor', 'quake', 'storm', 'wheel', 'win', 'streak', 'breakthrough', 'card', 'upgrade', 'wonder', 'launch'];

// Pegel der großen Effekte (Spitze ≈ 0,7 allein, nichts läuft in den Begrenzer)
const FX_GAIN = { power: .7, blackout: .65, meteor: .5, quake: .42, breakthrough: .55, card: .75, upgrade: .65, wonder: .4, launch: .45, win: .85, discover: .8 };

export class Sound {
  constructor(opts = {}) {
    this.ctx = null; this.ready = false; this.offline = false;
    this.vol = { music: opts.music ?? .5, sfx: opts.sfx ?? .8 }; this.musicOn = opts.musicOn ?? true;
    this.fac = { machines: 0, busy: 0 }; this._coins = []; this.world = STYLES[opts.world] ? opts.world : 'wiese';
    this.pow = { plants: 0, load: 0 }; this.stormOn = false;
    if (opts.context) { this.ctx = opts.context; this.offline = true; this._build(); }
  }
  get context() { return this.ctx; }
  // auf Nutzergeste aufrufen (Klick/Taste); legt den Kontext an bzw. weckt ihn
  unlock() {
    try {
      if (!this.ctx) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return false;
        this.ctx = new AC({ latencyHint: 'interactive' }); this._build();
      }
      if (this.ctx.state === 'suspended' && !this.offline) this.ctx.resume?.()?.catch?.(() => {});
      return true;
    } catch (e) { console.warn('Audio unavailable', e); return false; }
  }
  setVolumes(music, sfx) {
    if (music !== undefined) this.vol.music = clamp(music);
    if (sfx !== undefined) this.vol.sfx = clamp(sfx);
    if (!this.ready) return; const t = this.ctx.currentTime;
    this.musicVol.gain.setTargetAtTime(this.vol.music, t, .08);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, .05); this.ambBus.gain.setTargetAtTime(this.vol.sfx, t, .1);
  }
  setMusic(on) {
    this.musicOn = !!on; if (!this.ready) return;
    this.musicMix.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, on ? .6 : .25);
    if (on) this.m.t = Math.max(this.m.t, this.ctx.currentTime + .1);
  }
  // Welt wechseln (Musikstil): weich aus- und wieder einblenden, Wechsel zum nächsten Taktanfang
  setWorld(biome) {
    if (!STYLES[biome] || biome === this.world && !this.m?.pending) return;
    this.world = biome; if (!this.ready) return;
    const now = this.ctx.currentTime, m = this.m;
    if (!m.started) { this._applyStyle(biome, now); return; }
    m.pending = biome; m.switchAt = now + .9;
    this.styleG.gain.cancelScheduledValues(now); this.styleG.gain.setTargetAtTime(0, now, .25);
  }
  // Fabrik-Atmo: machines = Anzahl Maschinen, busy = Anteil 0…1 (oder Anzahl beschäftigter Maschinen); steuert auch die Musik-Schichten
  setFactory({ machines = 0, busy } = {}) {
    machines = Math.max(0, machines | 0);
    let b = busy ?? (machines ? 1 : 0); if (b > 1) b = machines ? b / machines : 0;
    this.fac = { machines, busy: clamp(b) };
    if (!this.ready) return; const t = this.ctx.currentTime, L = this._facLevel();
    this.humG.gain.setTargetAtTime(machines ? .02 + .05 * L : 0, t, .9);
    this.rumbleG.gain.setTargetAtTime(machines ? (.015 + .05 * L) * (.5 + .5 * this.fac.busy) : 0, t, .9);
    this.humLp.frequency.setTargetAtTime(120 + 160 * L * this.fac.busy, t, 1.2);
    for (const [k, th] of Object.entries(LAYERS)) {
      const v = th <= 0 ? 1 : sst(th * .6, th * 1.25, machines); this.lv[k] = v;
      this.L[k].gain.setTargetAtTime(v * (k === 'mel' ? .9 : 1), t, 1.5);
    }
  }
  // Kraftwerks-Brummen (Dauer): plants = Anzahl Kraftwerke, load = Auslastung 0…1
  setPower({ plants = 0, load = 0 } = {}) {
    this.pow = { plants: Math.max(0, plants | 0), load: clamp(load) };
    if (!this.ready) return; const t = this.ctx.currentTime, P = this.pow, L = P.plants ? 1 - Math.exp(-P.plants / 2.5) : 0;
    this.powG.gain.setTargetAtTime(L * (.025 + .05 * P.load), t, .6);
    this.powLp.frequency.setTargetAtTime(160 + 500 * P.load, t, .8);
    this.powBuzz.gain.setTargetAtTime(L * .012 * P.load, t, .6);
  }
  // Sandsturm-Wind (Dauer)
  setStorm(on) {
    this.stormOn = !!on; if (!this.ready) return;
    this.windG.gain.setTargetAtTime(on ? .16 : 0, this.ctx.currentTime, on ? 1.2 : 1.8);
  }
  // Glücksrad: abbremsende Tickfolge über secs Sekunden (segs Segmente je Umdrehung, turns Umdrehungen) → Anzahl Ticks
  wheelSpin(secs = 4, { segs = 8, turns = 4 } = {}) {
    if (!this.ready) return 0;
    const t0 = this.ctx.currentTime + .02, total = segs * turns; let n = 0;
    // Winkel (in Segmenten) θ(t) = total·(1 − (1 − t/secs)²) → Tick bei jedem ganzen Segment
    for (let k = 1; k <= total; k++) { const u = 1 - Math.sqrt(1 - k / total), at = u * secs; this.play('wheel', { at: at + (t0 - this.ctx.currentTime), gain: .7 + .3 * (k / total) }); n++; }
    this.play('win', { at: secs + .15 }); return n;
  }
  _facLevel() { return 1 - Math.exp(-this.fac.machines / 14); }

  // ---------------------------------------------------------------- Aufbau
  _build() {
    const c = this.ctx, sr = c.sampleRate;
    this.out = c.createGain(); this.out.gain.value = .8;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08;
    // Sicherheits-Begrenzer: linear bis 0,8, darüber weich bis höchstens 0,98 (nie Übersteuern)
    const clip = c.createWaveShaper(), N = 2048, cv = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = i / (N - 1) * 4 - 2, a = Math.abs(x); cv[i] = Math.sign(x) * (a <= .8 ? a : .8 + .18 * Math.tanh((a - .8) / .18)); }
    clip.curve = cv; clip.oversample = 'none';
    this.out.connect(comp); comp.connect(lim); lim.connect(clip); clip.connect(c.destination);
    // Hall
    this.rev = c.createConvolver(); this.rev.buffer = this._impulse(2.6, 3); const revOut = this._g(.42); this.rev.connect(revOut); revOut.connect(this.out);
    // Musik: Schichten → Stil-Blende → Mischung → Klang → Lautstärke
    this.musicVol = this._g(this.vol.music); this.musicVol.connect(this.out);
    this.musicTone = this._f('lowpass', 9000); this.musicTone.connect(this.musicVol);
    this.musicMix = this._g(this.musicOn ? 1 : 0); this.musicMix.connect(this.musicTone);
    this.music = this._g(.55); this.music.connect(this.musicMix);
    this.mRev = this._g(.45); this.music.connect(this.mRev); this.mRev.connect(this.rev);
    this.styleG = this._g(1); this.styleG.connect(this.music);
    // Echo (Melodie, Gegenstimme)
    this.delay = c.createDelay(4); this.delay.delayTime.value = .5; this.dFb = this._g(.28); const dl = this._f('lowpass', 2400);
    this.delay.connect(dl); dl.connect(this.dFb); this.dFb.connect(this.delay); dl.connect(this.styleG); this.echo = this._g(.18); this.echo.connect(this.delay);
    this.L = {}; this.lv = {};
    for (const k of Object.keys(LAYERS)) { const g = this._g(LAYERS[k] <= 0 ? (k === 'mel' ? .9 : 1) : 0); g.connect(this.styleG); this.L[k] = g; this.lv[k] = LAYERS[k] <= 0 ? 1 : 0; }
    this.L.mel.connect(this.echo); this.L.counter.connect(this.echo);
    // Effekte
    this.sfxBus = this._g(this.vol.sfx); this.sfxBus.connect(this.out);
    this.sfx = this._g(1); this.sfx.connect(this.sfxBus); const sRev = this._g(.22); this.sfx.connect(sRev); sRev.connect(this.rev);
    // Atmo
    this.ambBus = this._g(this.vol.sfx); this.ambBus.connect(this.out);
    this.amb = this._g(.6); this.amb.connect(this.ambBus); const aRev = this._g(.3); this.amb.connect(aRev); aRev.connect(this.rev);
    // Rauschen
    const noise = (sec, brown) => {
      const b = c.createBuffer(1, Math.floor(sr * sec), sr), d = b.getChannelData(0); let last = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
      const f = Math.floor(sr * .05); for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[d.length - f + i] * (1 - k); }
      return b;
    };
    this.white = noise(2, false); this.brown = noise(4, true);
    // Fabrik-Brummen: tiefer Sägezahn + Sinus, gefiltert; Grollen aus braunem Rauschen
    this.humG = this._g(0); this.humLp = this._f('lowpass', 140, .8); const wob = this._g(1); this.humLp.connect(wob); wob.connect(this.humG); this.humG.connect(this.amb);
    for (const [type, f, g] of [['sawtooth', 55, .5], ['sine', 110, .6], ['triangle', 82.5, .25]]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = R(-6, 6); const og = this._g(g); o.connect(og); og.connect(this.humLp); o.start();
    }
    const lfo = c.createOscillator(); lfo.frequency.value = .13; const lg = this._g(.18); lfo.connect(lg); lg.connect(wob.gain); lfo.start();
    this.rumbleG = this._g(0); const rl = this._f('lowpass', 260); const rs = c.createBufferSource(); rs.buffer = this.brown; rs.loop = true; rs.connect(rl); rl.connect(this.rumbleG); this.rumbleG.connect(this.amb); rs.start(0, R(0, 3));
    // Kraftwerk: Netzbrummen 50/100/150 Hz + leises Knistern
    this.powG = this._g(0); this.powLp = this._f('lowpass', 200, 1.2); this.powLp.connect(this.powG); this.powG.connect(this.amb);
    for (const [type, f, g] of [['sawtooth', 50, .35], ['sine', 100, .8], ['sine', 150, .3]]) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const og = this._g(g); o.connect(og); og.connect(this.powLp); o.start(); }
    this.powBuzz = this._g(0); const pb = c.createBufferSource(); pb.buffer = this.white; pb.loop = true; const pbf = this._f('bandpass', 3200, 4); pb.connect(pbf); pbf.connect(this.powBuzz); this.powBuzz.connect(this.amb); pb.start(0, R(0, 1));
    // Sturm: Rauschen durch wandernde Bandpässe
    this.windG = this._g(0); this.windG.connect(this.amb);
    for (const [f, q, rate, g] of [[500, 1.4, .13, 1], [1300, 3, .21, .5], [240, .9, .08, .8]]) {
      const s = c.createBufferSource(); s.buffer = this.white; s.loop = true; const bp = this._f('bandpass', f, q), gg = this._g(g * .5);
      const l = c.createOscillator(); l.frequency.value = rate; const lg2 = this._g(f * .45); l.connect(lg2); lg2.connect(bp.frequency);
      const l2 = c.createOscillator(); l2.frequency.value = rate * 1.7; const lg3 = this._g(g * .35); l2.connect(lg3); lg3.connect(gg.gain);
      s.connect(bp); bp.connect(gg); gg.connect(this.windG); s.start(0, R(0, 1.5)); l.start(); l2.start();
    }
    const t0 = c.currentTime;
    this.m = { t: t0 + .25, step: 0, bar: 0, prog: null, motif: null, vary: false, pending: null, switchAt: 0, started: false };
    this.nf = t0 + .4;                                    // nächster Fabrik-Takt
    this._plk = new Map();
    this.ready = true;
    this._applyStyle(this.world, t0);
    if (!this.offline && typeof setInterval !== 'undefined') this._timer = setInterval(() => this._tick(), 100);
    this.setFactory(this.fac); this.setPower(this.pow); this.setStorm(this.stormOn);
  }
  // Stil sofort setzen (Echo, Hall, Klang), Planung neu beginnen
  _applyStyle(name, t) {
    const S = this.st = STYLES[name], m = this.m;
    this.delay.delayTime.setValueAtTime(60 / S.bpm * S.echo, t); this.dFb.gain.setValueAtTime(S.fb, t);
    this.mRev.gain.setValueAtTime(S.rev, t); this.musicTone.frequency.setValueAtTime(S.tone, t);
    this.styleG.gain.cancelScheduledValues(t); this.styleG.gain.setValueAtTime(this.styleG.gain.value, t); this.styleG.gain.setTargetAtTime(1, t, .5);
    m.step = 0; m.bar = 0; m.prog = S.progs[0]; m.motif = null; m.t = Math.max(m.t, t);
  }
  dispose() { clearInterval(this._timer); try { if (!this.offline) this.ctx?.close(); } catch (e) { /* egal */ } this.ready = false; }
  _impulse(sec, decay) {
    const c = this.ctx, sr = c.sampleRate, n = Math.floor(sr * sec), b = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) { const t = i / sr; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (t < .01 ? t / .01 : 1); } }
    return b;
  }

  // ---------------------------------------------------------------- Bausteine
  _g(v) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  _f(type, f, q = .7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  // Hüllkurve: 0 → peak (Anstieg a) → halten → abklingen (dec ≈ Zeit bis fast still)
  _env(p, t, a, peak, dec, hold = 0) {
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
    if (hold) p.setValueAtTime(peak, t + a + hold);
    p.setTargetAtTime(0, t + a + hold, Math.max(.004, dec / 5));
  }
  // Ton: o = { type, g, a, hold, f2, glide, lp, q, bp, detune, dest, pan, vib: [rate, cents] }
  _tone(t, f, dec, o = {}) {
    const c = this.ctx, os = c.createOscillator(); os.type = o.type || 'sine';
    f = Math.min(f, 18000); os.frequency.setValueAtTime(f, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.min(18000, Math.max(1, o.f2)), t + (o.glide ?? dec));   // über Nyquist klemmt WebAudio mit Warnung
    if (o.detune) os.detune.value = o.detune;
    const end = t + (o.a ?? .004) + (o.hold || 0) + dec + .08;
    if (o.vib) { const l = c.createOscillator(); l.frequency.value = o.vib[0]; const lg = this._g(o.vib[1]); l.connect(lg); lg.connect(os.detune); l.start(t); l.stop(end); }
    const g = c.createGain(); this._env(g.gain, t, o.a ?? .004, o.g ?? .2, dec, o.hold || 0);
    let n = os;
    if (o.lp) { const b = this._f('lowpass', o.lp, o.q ?? .7); n.connect(b); n = b; }
    if (o.bp) { const b = this._f('bandpass', o.bp, o.q ?? 2); n.connect(b); n = b; }
    n.connect(g); this._out(g, o);
    os.start(t); os.stop(end); return os;
  }
  // Rauschstoß: o = { type: Filtertyp, f, f2, q, g, a, hold, brown, dest, pan }
  _noise(t, dec, o = {}) {
    const c = this.ctx, s = c.createBufferSource(), buf = o.brown ? this.brown : this.white; s.buffer = buf; s.loop = true;
    const b = this._f(o.type || 'bandpass', o.f ?? 1500, o.q ?? 1);
    if (o.f2) b.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide ?? dec));
    const g = c.createGain(); this._env(g.gain, t, o.a ?? .002, o.g ?? .2, dec, o.hold || 0);
    s.connect(b); b.connect(g); this._out(g, o);
    s.start(t, R(0, buf.duration * .8)); s.stop(t + (o.a ?? .002) + (o.hold || 0) + dec + .08);
  }
  _out(node, o) {
    let dest = o.dest || this._d || this.sfx;
    if (o.pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); node.connect(p); p.connect(dest); }
    else node.connect(dest);
  }
  // Glocke (unharmonische Teiltöne)
  _bell(t, f, g = .1, dec = 1.2, o = {}) {
    this._tone(t, f, dec, { g, ...o }); this._tone(t, f * 2.76, dec * .45, { g: g * .35, ...o }); this._tone(t, f * 5.4, dec * .2, { g: g * .15, ...o });
  }
  // Marimba-Schlag
  _mallet(t, midi, v = 1, dest) {
    const f = mtof(midi), o = { dest };
    this._tone(t, f, .7, { ...o, g: .2 * v, a: .003 });
    this._tone(t, f * 4, .12, { ...o, g: .06 * v, a: .002 });
    this._tone(t, f * 9.9, .035, { ...o, g: .025 * v, a: .001 });
  }
  // Münze: zwei kurze Töne, k = Tonhöhenschub in Halbtönen
  _coin(t, k = 0, g = .1, pan = 0) {
    const s = Math.pow(2, k / 12);
    this._tone(t, 988 * s, .06, { type: 'square', g: g * .55, lp: 4200, hold: .045, pan });
    this._tone(t + .07, 1319 * s, .32, { type: 'square', g: g * .55, lp: 4600, pan });
    this._tone(t + .07, 2638 * s, .2, { g: g * .25, pan });
  }
  // Blech (gefilterter Doppel-Sägezahn mit Filterhüllkurve)
  _brass(t, midi, dur, g = .07, dest) {
    const c = this.ctx, f = mtof(midi), b = this._f('lowpass', 500, 1.2), gn = c.createGain(), end = t + dur + .5;
    b.frequency.setValueAtTime(500, t); b.frequency.linearRampToValueAtTime(2600, t + .06); b.frequency.setTargetAtTime(1300, t + .08, .15);
    this._env(gn.gain, t, .03, g, .35, dur);
    for (const dt of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(b); o.start(t); o.stop(end); }
    b.connect(gn); this._out(gn, { dest });
  }
  // Stimme (Formanten), für Dr. Steve
  _voice(t, f0, f1, dur, v1, v2, g = .08) {
    const c = this.ctx, o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * .7);
    const gn = c.createGain(); this._env(gn.gain, t, .03, g, .12, dur);
    const A = VOWELS[v1], B = VOWELS[v2];
    for (let i = 0; i < 2; i++) { const b = this._f('bandpass', A[i], i ? 9 : 6); b.frequency.setValueAtTime(A[i], t); b.frequency.linearRampToValueAtTime(B[i], t + dur * .6); o.connect(b); const bg = this._g(i ? .6 : 1); b.connect(bg); bg.connect(gn); }
    this._out(gn, {}); o.start(t); o.stop(t + dur + .3);
  }

  // ---------------------------------------------------------------- Effekte
  // play(name, { combo 0…1 | takt 1…2, gain, pan, at (s Verzögerung) }) → true, wenn gespielt
  play(name, o = {}) {
    if (!this.ready) return false;
    const c = this.ctx, t = c.currentTime + .01 + (o.at || 0);
    const fn = this['_s_' + name]; if (!fn) return false;
    const g = this._g((o.gain ?? 1) * (FX_GAIN[name] ?? 1)); g.connect(this.sfx); this._d = g;
    let r = true;
    try { r = fn.call(this, t, o) !== false; } finally { this._d = null; }
    return r;
  }
  _s_build(t) {
    const p = R(.92, 1.08);
    this._tone(t, 190 * p, .16, { f2: 62, glide: .09, g: .42 });
    this._noise(t, .045, { f: 2100 * p, q: 1.6, g: .36 });
    this._noise(t + .065, .04, { f: 3300 * p, q: 2, g: .22 });
    this._tone(t + .065, 540 * p, .05, { type: 'triangle', g: .09 });
    this._tone(t + .065, 120 * p, .08, { f2: 70, g: .18 });
  }
  _s_remove(t) {
    this._tone(t, 520, .16, { f2: 85, glide: .14, g: .3 });
    this._noise(t, .4, { type: 'lowpass', f: 1000, f2: 260, g: .3, brown: true });
    this._noise(t, .08, { f: 1800, q: .8, g: .22 });
    for (let i = 0; i < 6; i++) this._noise(t + R(.05, .38), .03, { f: R(1200, 3400), q: 3, g: R(.06, .12), pan: R(-.5, .5) });
  }
  _s_rotate(t) {
    this._noise(t, .018, { type: 'highpass', f: 3500, g: .18 });
    this._tone(t, 1400, .03, { type: 'triangle', g: .06 });
    this._tone(t + .035, 950, .035, { type: 'triangle', g: .05 });
  }
  _s_click(t) {
    this._tone(t, 1050, .04, { g: .1 });
    this._noise(t, .01, { type: 'highpass', f: 5000, g: .04 });
  }
  _s_coin(t, o) {
    const now = this.ctx.currentTime; this._coins = this._coins.filter(x => x > now - 1);
    const n = this._coins.length; if (n >= 14 && !o.force) return false;        // höchstens ~14 Münzen je Sekunde
    if (!o.force && n && t - this._coins[n - 1] < .045) t = this._coins[n - 1] + .045;  // nicht übereinander
    this._coins.push(t);
    const k = o.takt !== undefined ? clamp(o.takt - 1) : clamp(o.combo ?? 0);
    this._coin(t, k * 12, .16 / Math.sqrt(1 + n / 4), o.pan ?? R(-.25, .25));
  }
  _s_jackpot(t) {
    const notes = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    notes.forEach((d, i) => { const tt = t + i * .055; this._tone(tt, mtof(ROOT + 12 + d), .35, { type: 'triangle', g: .07 }); this._bell(tt, mtof(ROOT + 24 + d), .025, .5); });
    for (let i = 0; i < 26; i++) this._tone(t + R(.1, 1.4), R(2400, 6400), R(.05, .12), { g: R(.01, .03), pan: R(-.8, .8) });
    for (let i = 0; i < 9; i++) this._coin(t + .2 + i * R(.07, .13), R(0, 7), .09, R(-.6, .6));
    const te = t + notes.length * .055 + .05;
    for (const d of [0, 4, 7, 12]) this._bell(te, mtof(ROOT + 12 + d), .045, 1.6);
    this._noise(te, 1.2, { type: 'highpass', f: 6500, g: .05, a: .05 });
  }
  _s_discover(t) {
    const b = 60 / 132;
    [[67, 0, .16], [72, .5, .16], [76, 1, .16], [79, 1.5, .9]].forEach(([m, at, d]) => this._brass(t + at * b, m, d, .065));
    const tc = t + 1.5 * b;
    for (const m of [60, 64, 67, 72]) this._brass(tc, m, .9, .035);
    this._tone(tc, 98, .5, { f2: 60, glide: .3, g: .32 });                                        // Pauke
    this._noise(tc, .3, { type: 'lowpass', f: 400, g: .18, brown: true });
    this._noise(tc - .15, 1.6, { type: 'highpass', f: 6000, g: .06, a: .2 });                    // Becken-Schwelle
    for (let i = 0; i < 8; i++) this._bell(tc + .1 + i * .07, mtof(84 + PENT[i % 5] + 12 * Math.floor(i / 5)), .02, .7);
  }
  _s_error(t) {
    this._tone(t, 220, .09, { type: 'square', g: .06, lp: 900, hold: .05 });
    this._tone(t + .14, 175, .12, { type: 'square', g: .06, lp: 800, hold: .06 });
    this._tone(t, 110, .2, { g: .07 });
  }
  _s_crate(t) {
    this._tone(t, 85, .22, { type: 'sawtooth', f2: 150, glide: .22, bp: 700, q: 3, g: .07, hold: .04 });   // Knarzen
    this._noise(t + .2, .05, { f: 1600, q: 1.2, g: .25 });
    this._tone(t + .2, 300, .12, { f2: 900, glide: .06, g: .18 });                                       // Plopp
    [0, 4, 7, 12, 16].forEach((d, i) => this._bell(t + .28 + i * .06, mtof(ROOT + 24 + d), .03, .6));
    for (let i = 0; i < 10; i++) this._tone(t + R(.3, .9), R(3000, 6500), .06, { g: .015, pan: R(-.7, .7) });
  }
  _s_squeak(t) {
    // Gummi-Quietschen hoch – runter, dann ein kleines „hoppla“ (zwei Töne abwärts)
    const sq = (tt, a, b, c2, dur, g) => {
      const os = this.ctx.createOscillator(); os.type = 'triangle';
      os.frequency.setValueAtTime(a, tt); os.frequency.exponentialRampToValueAtTime(b, tt + dur * .35); os.frequency.exponentialRampToValueAtTime(c2, tt + dur);
      const l = this.ctx.createOscillator(); l.frequency.value = 28; const lg = this._g(45); l.connect(lg); lg.connect(os.detune);
      const bp = this._f('bandpass', 1500, 1.5), gn = this.ctx.createGain(); this._env(gn.gain, tt, .01, g, .06, dur * .8);
      os.connect(bp); bp.connect(gn); this._out(gn, {}); os.start(tt); l.start(tt); os.stop(tt + dur + .2); l.stop(tt + dur + .2);
    };
    sq(t, 720, 1550, 950, .2, .2); sq(t + .24, 1250, 1300, 760, .22, .14);
    this._tone(t + .5, mtof(76), .15, { type: 'triangle', g: .05 }); this._tone(t + .62, mtof(71), .25, { type: 'triangle', g: .05 });
  }
  _s_levelup(t) {
    [72, 76, 79, 84].forEach((m, i) => this._tone(t + i * .075, mtof(m), .25, { type: 'triangle', g: .08 }));
    this._bell(t + .3, mtof(96), .05, 1.1); this._bell(t + .3, mtof(91), .035, .9);
  }
  _s_contract(t) {
    this._noise(t, .06, { f: 2600, q: 1.5, g: .16 });                               // Kasse
    this._tone(t, 160, .08, { f2: 90, g: .2 });
    this._bell(t + .08, 1568, .07, .9); this._bell(t + .16, 2093, .07, 1.2);
    for (let i = 0; i < 3; i++) this._coin(t + .22 + i * .09, i * 2, .08, R(-.4, .4));
  }
  _s_plot(t) {
    this._tone(t, 110, .9, { a: .25, g: .14, hold: .2 }); this._tone(t, 165, .8, { a: .3, g: .06, hold: .2, type: 'triangle' });
    this._noise(t, .9, { f: 700, f2: 2400, q: .7, g: .05, a: .3 });
    [0, 4, 7].forEach((d, i) => this._bell(t + .35 + i * .12, mtof(ROOT + 12 + d), .06, 1));
  }
  _s_research(t) {
    for (let i = 0; i < 6; i++) { const tt = t + i * R(.06, .1), f = R(300, 600); this._tone(tt, f, .08, { f2: f * R(2, 3), glide: .06, g: .09, pan: R(-.4, .4) }); }
    this._bell(t + .55, mtof(84), .05, .8); this._bell(t + .67, mtof(91), .05, 1);
  }
  _s_cheer(t) {
    this._voice(t, 230, 330, .38, 'i', 'e', .09);                                    // „yay!“
    this._voice(t + .02, 290, 410, .36, 'i', 'a', .045);
    this._tone(t + .05, mtof(79), .2, { type: 'triangle', f2: mtof(86), glide: .15, g: .05 });     // Tröte
    for (let i = 0; i < 7; i++) this._noise(t + R(.05, .6), .03, { f: R(900, 1500), q: 1.2, g: .1, pan: R(-.6, .6) });   // Klatschen
  }

  // ---------------------------------------------------------------- Instrumente der Weltmusik
  // gezupfte Saite (Karplus-Strong, als Puffer je Ton vorberechnet und zwischengespeichert)
  _pluckBuf(midi) {
    const key = midi | 0; let b = this._plk.get(key); if (b) return b;
    const c = this.ctx, sr = c.sampleRate, f = mtof(key), P = Math.max(2, Math.round(sr / f)), n = Math.floor(sr * 1.6), d = new Float32Array(n);
    let lp = 0; for (let i = 0; i < P; i++) { lp = lp * .5 + (Math.random() * 2 - 1) * .5; d[i] = lp; }
    const damp = .4985 + .0012 * clamp((84 - key) / 40);
    for (let i = P; i < n; i++) d[i] = damp * (d[i - P] + d[i - P + 1 < i ? i - P + 1 : i - P]);
    let mx = 0; for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(d[i])); const k = mx ? .9 / mx : 1;
    b = c.createBuffer(1, n, sr); const ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = d[i] * k;
    this._plk.set(key, b); return b;
  }
  _pluck(t, midi, v = 1, dest, lp = 3800) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this._pluckBuf(midi);
    const f = this._f('lowpass', lp, .8), body = this._f('peaking', 420, 1.2); body.gain.value = 5;
    const g = this._g(.11 * v); s.connect(f); f.connect(body); body.connect(g); this._out(g, { dest });
    s.start(Math.max(t, c.currentTime)); s.stop(t + 1.6);
  }
  // Ney (Flöte): Sinus mit Vibrato + Atemrauschen
  _ney(t, midi, dur, dest) {
    const f = mtof(midi);
    this._tone(t, f, .5, { a: .25, hold: dur, g: .045, vib: [5, 14], dest });
    this._tone(t, f * 2, .4, { a: .3, hold: dur * .8, g: .008, dest });
    this._noise(t, .5, { f, q: 6, a: .2, hold: dur, g: .02, dest });
  }
  // Celesta: heller Glockenton
  _celesta(t, midi, v = 1, dest) {
    const f = mtof(midi), o = { dest };
    this._tone(t, f, 1.1, { ...o, g: .07 * v, a: .002 });
    this._tone(t, f * 2, .5, { ...o, g: .025 * v, a: .002 });
    this._tone(t, f * 3.01, .18, { ...o, g: .012 * v, a: .001 });
  }
  // Glasharmonika: langsam einschwingend, leicht schwebend
  _glassHarp(t, midi, dur, dest) {
    const f = mtof(midi);
    this._tone(t, f, 1, { a: .5, hold: dur, g: .04, vib: [4.5, 5], dest });
    this._tone(t, f * 2, .8, { a: .6, hold: dur * .8, g: .012, detune: 4, dest });
  }
  // analoger Synth-Bass: Sägezahn mit Filterhüllkurve
  _synBass(t, midi, v, dest) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), f = mtof(midi); o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f / 2;
    const b = this._f('lowpass', 200, 6), g = c.createGain(), end = t + .4;
    b.frequency.setValueAtTime(220, t); b.frequency.linearRampToValueAtTime(900 * v + 200, t + .015); b.frequency.setTargetAtTime(220, t + .02, .07);
    this._env(g.gain, t, .005, .07 * v, .25, .06);
    const g2 = this._g(.5); o.connect(b); o2.connect(g2); g2.connect(b); b.connect(g); this._out(g, { dest });
    o.start(t); o2.start(t); o.stop(end); o2.stop(end);
  }
  // Ton mit wanderndem Panorama (Drohne, Meteor)
  _sweep(node, t, p0, p1, dur) {
    const c = this.ctx; if (!c.createStereoPanner) { this._out(node, {}); return; }
    const p = c.createStereoPanner(); p.pan.setValueAtTime(p0, t); p.pan.linearRampToValueAtTime(p1, t + dur); node.connect(p); p.connect(this._d || this.sfx);
  }

  // ---------------------------------------------------------------- neue Effekte
  _s_power(t) {                                                   // Kraftwerk fährt an: Relais-Klack, Brummen steigt
    this._noise(t, .03, { f: 2500, q: 2, g: .2 });
    this._tone(t, 90, .1, { f2: 50, glide: .08, g: .2 });
    const c = this.ctx, b = this._f('lowpass', 150, 2), g = c.createGain(), end = t + 1.7;
    b.frequency.setValueAtTime(150, t); b.frequency.exponentialRampToValueAtTime(900, t + 1);
    g.gain.setValueAtTime(0, t); this._env(g.gain, t + .05, .5, .1, .5, .7);
    for (const [ty, f] of [['sawtooth', 50], ['sawtooth', 100.6], ['sine', 150]]) { const o = c.createOscillator(); o.type = ty; o.frequency.setValueAtTime(f * .5, t); o.frequency.exponentialRampToValueAtTime(f, t + .8); o.connect(b); o.start(t); o.stop(end); }
    b.connect(g); this._out(g, {});
    this._noise(t + .3, .9, { f: 3200, q: 5, g: .03, a: .3 });
  }
  _s_blackout(t) {                                                // Strom weg: Sinkflug, Knistern, Klonk
    const c = this.ctx, b = this._f('lowpass', 1200, 3), g = c.createGain(), end = t + 2;
    b.frequency.setValueAtTime(1200, t); b.frequency.exponentialRampToValueAtTime(90, t + 1.4);
    this._env(g.gain, t, .01, .12, .9, .5);
    for (const f of [120, 241]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f / 5, t + 1.5); o.connect(b); o.start(t); o.stop(end); }
    b.connect(g); this._out(g, {});
    for (let i = 0; i < 14; i++) this._noise(t + R(0, .9), R(.008, .03), { type: 'highpass', f: R(2500, 6000), g: R(.04, .12), pan: R(-.6, .6) });
    this._tone(t + 1.45, 70, .3, { f2: 40, g: .22 }); this._noise(t + 1.45, .12, { type: 'lowpass', f: 500, g: .12, brown: true });
  }
  _s_drone(t) {                                                   // Rotor-Surren fliegt vorbei (Doppler + Panorama)
    const c = this.ctx, dur = 1.8, g = c.createGain(), b = this._f('bandpass', 900, 1.5), am = this._g(.5), end = t + dur + .1;
    this._env(g.gain, t, .5, .09, .5, .7);
    for (const [ty, f] of [['sawtooth', 180], ['square', 362]]) { const o = c.createOscillator(); o.type = ty; o.frequency.setValueAtTime(f * 1.06, t); o.frequency.linearRampToValueAtTime(f, t + dur * .5); o.frequency.linearRampToValueAtTime(f * .92, t + dur); o.connect(b); o.start(t); o.stop(end); }
    const l = c.createOscillator(); l.frequency.value = 34; const lg = this._g(.5); l.connect(lg); lg.connect(am.gain); l.start(t); l.stop(end);
    b.connect(am); am.connect(g); this._sweep(g, t, -.8, .8, dur);
  }
  _s_meteor(t) {                                                  // Pfeifen im Fall, dann Einschlag
    const c = this.ctx, fall = 1.5, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(2600, t); o.frequency.exponentialRampToValueAtTime(380, t + fall);
    this._env(g.gain, t, fall * .8, .06, .05, .1); o.connect(g); this._sweep(g, t, .7, -.1, fall); o.start(t); o.stop(t + fall + .2);
    this._noise(t, .2, { type: 'highpass', f: 1500, f2: 600, glide: fall, g: .07, a: fall * .9 });
    const ti = t + fall;
    this._tone(ti, 75, 1.2, { f2: 28, glide: .8, g: .4 });
    this._noise(ti, 1.6, { type: 'lowpass', f: 900, f2: 120, glide: 1.2, g: .32, brown: true });
    this._noise(ti, .15, { f: 1800, q: .7, g: .2 });
    for (let i = 0; i < 12; i++) this._noise(ti + R(.1, 1.2), .03, { f: R(1500, 4000), q: 3, g: R(.03, .07), pan: R(-.7, .7) });
    [0, 7, 12].forEach((d, i) => this._bell(ti + .35 + i * .09, mtof(88 + d), .025, 1));      // Kristalle klingen
  }
  _s_quake(t) {                                                   // Beben: tiefes Grollen mit Wanken + Klappern
    const c = this.ctx, dur = 2.2, s = c.createBufferSource(); s.buffer = this.brown; s.loop = true;
    const b = this._f('lowpass', 140, 1), g = c.createGain(), trem = this._g(.6);
    this._env(g.gain, t, .25, .45, .8, dur - .9);
    const l = c.createOscillator(); l.frequency.value = 7; const lg = this._g(.4); l.connect(lg); lg.connect(trem.gain);
    s.connect(b); b.connect(trem); trem.connect(g); this._out(g, {}); s.start(t, R(0, 2)); s.stop(t + dur + .3); l.start(t); l.stop(t + dur + .3);
    this._tone(t, 36, .9, { a: .3, hold: dur - 1, g: .25, vib: [3, 30] });
    for (let i = 0; i < 22; i++) { const tt = t + R(.15, dur - .2); this._noise(tt, .02, { f: R(1800, 4500), q: 4, g: R(.02, .06), pan: R(-.8, .8) }); if (i % 4 === 0) this._tone(tt, R(500, 900), .06, { g: .015 }); }
  }
  _s_storm(t) {                                                   // Sturm-Böe
    const c = this.ctx, dur = 2.4, s = c.createBufferSource(); s.buffer = this.white; s.loop = true;
    const b = this._f('bandpass', 400, 1.2), g = c.createGain();
    b.frequency.setValueAtTime(350, t); b.frequency.exponentialRampToValueAtTime(1400, t + dur * .45); b.frequency.exponentialRampToValueAtTime(450, t + dur);
    this._env(g.gain, t, dur * .4, .2, .9, dur * .2);
    s.connect(b); b.connect(g); this._sweep(g, t, -.5, .5, dur); s.start(t, R(0, 1)); s.stop(t + dur + .5);
    for (let i = 0; i < 10; i++) this._noise(t + R(.3, dur), .015, { type: 'highpass', f: 5000, g: R(.02, .05), pan: R(-.8, .8) });   // Sandkörner
  }
  _s_wheel(t) {                                                   // ein Rad-Tick
    this._noise(t, .012, { type: 'highpass', f: 3800, g: .2 });
    this._tone(t, 2100, .025, { type: 'triangle', g: .07 });
    this._tone(t, 520, .03, { g: .05 });
  }
  _s_win(t) {                                                     // Gewinn
    [0, 4, 7, 12, 16].forEach((d, i) => { this._tone(t + i * .07, mtof(72 + d), .3, { type: 'triangle', g: .08 }); this._bell(t + i * .07, mtof(84 + d), .03, .6); });
    const te = t + .4; for (const d of [0, 4, 7, 12]) this._brass(te, 60 + d, .5, .04);
    for (let i = 0; i < 6; i++) this._coin(te + .1 + i * .08, i, .08, R(-.5, .5));
    for (let i = 0; i < 16; i++) this._tone(te + R(0, .9), R(3000, 6500), .07, { g: .015, pan: R(-.8, .8) });
  }
  _s_streak(t) {                                                  // Serie / Tagesbonus: aufsteigende Glocken + Tröte
    [0, 7, 12, 19].forEach((d, i) => this._bell(t + i * .12, mtof(76 + d), .05, 1));
    this._tone(t + .5, mtof(79), .35, { type: 'triangle', f2: mtof(91), glide: .2, g: .06 });
    this._noise(t + .45, .8, { type: 'highpass', f: 7000, g: .04, a: .1 });
    for (let i = 0; i < 4; i++) this._coin(t + .55 + i * .07, 2 + i * 2, .07);
  }
  _s_breakthrough(t) {                                            // Durchbruch: Sog nach oben, großer Akkord, Tiefton
    this._noise(t, .7, { f: 300, f2: 6000, glide: .7, q: 1.5, g: .12, a: .6 });
    this._tone(t, 200, .7, { f2: 1600, glide: .7, type: 'sawtooth', lp: 3000, g: .03, a: .6 });
    const tc = t + .7;
    this._tone(tc, 110, 1.2, { f2: 45, glide: .6, g: .3 });
    for (const m of [60, 67, 72, 76, 79, 84]) { this._bell(tc, mtof(m + 12), .03, 2); this._tone(tc, mtof(m), 1.5, { type: 'triangle', a: .02, g: .025, lp: 2500 }); }
    for (let i = 0; i < 20; i++) this._tone(tc + R(0, 1.2), R(2500, 7000), .08, { g: .012, pan: R(-.9, .9) });
  }
  _s_card(t, o) {                                                 // Album-Karte: Wusch, Schnapp, Glöckchen (reicher je Variante)
    const v = o.variant || 'normal', lvl = { normal: 0, gold: 1, perfect: 2, mega: 3 }[v] ?? 0;
    this._noise(t, .2, { f: 800, f2: 3500, glide: .18, q: 1, g: .12, a: .1 });
    this._noise(t + .2, .02, { type: 'highpass', f: 3000, g: .18 }); this._tone(t + .2, 1200, .03, { type: 'triangle', g: .06 });
    this._bell(t + .24, mtof(84), .05, .8); this._bell(t + .32, mtof(91), .04, 1);
    if (lvl >= 1) { for (let i = 0; i < 10; i++) this._tone(t + .3 + R(0, .7), R(3500, 7000), .06, { g: .018, pan: R(-.8, .8) }); this._bell(t + .42, mtof(96), .04, 1.4); }
    if (lvl >= 2) [0, 4, 7, 12, 16, 19].forEach((d, i) => this._tone(t + .45 + i * .05, mtof(79 + d), .2, { type: 'triangle', g: .045 }));
    if (lvl >= 3) { for (const m of [60, 64, 67, 72]) this._brass(t + .75, m, .7, .035); this._tone(t + .75, 98, .5, { f2: 60, glide: .3, g: .25 }); }
  }
  _s_upgrade(t) {                                                 // Upgrade: Ratsche steigt, Aufladen, Akkord
    for (let i = 0; i < 8; i++) { const tt = t + i * .055; this._noise(tt, .015, { f: 1800 + i * 300, q: 4, g: .12 }); this._tone(tt, 300 + i * 90, .03, { type: 'square', g: .02, lp: 2500 }); }
    this._tone(t + .1, 220, .5, { type: 'sawtooth', f2: 1760, glide: .45, lp: 2800, g: .04, a: .05 });
    const tc = t + .55; for (const d of [0, 4, 7, 12]) this._bell(tc, mtof(76 + d), .04, 1.1);
    this._tone(tc, 130, .3, { f2: 65, g: .2 }); this._noise(tc, .5, { type: 'highpass', f: 6000, g: .05, a: .02 });
  }
  _s_wonder(t, o) {                                               // Wunder-Stufe: Pauken-Wirbel + Blechfanfare, wächst mit der Stufe
    const k = clamp(((o.stage ?? 1) - 1) / 4), b = 60 / 108, base = 55 + Math.round(k * 5);
    for (let i = 0; i < 12; i++) this._tone(t + i * .045, 92, .12, { f2: 70, glide: .08, g: .06 + i * .012 });
    const tf = t + .6;
    const line = [[0, 0, .3], [4, .5, .3], [7, 1, .3], [12, 1.5, 1.4]];
    line.forEach(([d, at, du]) => this._brass(tf + at * b, base + 12 + d, du, .05 + .02 * k));
    const tc = tf + 1.5 * b, voices = [0, 7, 12, 16, 19, 24].slice(0, 3 + Math.round(k * 3));
    for (const d of voices) this._brass(tc, base + d, 1.5, .03);
    this._tone(tc, 82, 1, { f2: 41, glide: .5, g: .35 }); this._noise(tc, .5, { type: 'lowpass', f: 400, g: .2, brown: true });
    this._noise(tc - .2, 2, { type: 'highpass', f: 5500, g: .05 + .03 * k, a: .25 });
    for (let i = 0; i < 6 + k * 10; i++) this._bell(tc + .2 + i * .06, mtof(84 + PENT[i % 5] + 12 * Math.floor(i / 5)), .018, .8);
  }
  _s_launch(t) {                                                  // Raketenstart: 3 Pieper, Zündung, Brüllen, Abklingen (~9 s)
    for (let i = 0; i < 3; i++) { this._tone(t + i, 880, .12, { type: 'square', g: .035, lp: 3000, hold: .08 }); this._tone(t + i, 1760, .08, { g: .015 }); }
    const ti = t + 3; this._tone(ti, 1320, .4, { type: 'square', g: .04, lp: 3000, hold: .25 });
    this._noise(ti, .25, { f: 1200, q: .6, g: .3 }); this._tone(ti, 60, 1.5, { f2: 30, glide: 1, g: .4 });
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.brown; s.loop = true;
    const b = this._f('lowpass', 200, .8), g = c.createGain(), dur = 6;
    b.frequency.setValueAtTime(200, ti); b.frequency.exponentialRampToValueAtTime(1100, ti + 1.5); b.frequency.exponentialRampToValueAtTime(260, ti + dur);
    g.gain.setValueAtTime(0, ti); g.gain.linearRampToValueAtTime(.55, ti + .4); g.gain.setValueAtTime(.55, ti + 1.8); g.gain.exponentialRampToValueAtTime(.001, ti + dur);
    s.connect(b); b.connect(g); this._out(g, {}); s.start(ti, R(0, 2)); s.stop(ti + dur + .1);
    const w = c.createBufferSource(); w.buffer = this.white; w.loop = true; const wb = this._f('bandpass', 900, .7), wg = c.createGain();
    wg.gain.setValueAtTime(0, ti); wg.gain.linearRampToValueAtTime(.12, ti + .3); wg.gain.exponentialRampToValueAtTime(.001, ti + dur * .8);
    w.connect(wb); wb.connect(wg); this._out(wg, {}); w.start(ti, R(0, 1)); w.stop(ti + dur);
    this._tone(ti + .2, 42, 2, { a: .4, hold: 1.8, g: .22, vib: [9, 40] });
    for (let i = 0; i < 18; i++) this._noise(ti + R(.1, 2.5), .04, { type: 'lowpass', f: 900, g: R(.05, .12), brown: true, pan: R(-.8, .8) });   // Knallen im Strahl
    for (const d of [0, 4, 7, 12]) this._brass(ti + 2.2, 60 + d, 1.8, .03);
  }

  // ---------------------------------------------------------------- Planung
  // horizon: so weit im Voraus planen (offline z. B. die ganze Länge: _tick(8))
  _tick(horizon = .45) {
    if (!this.ready) return;
    const c = this.ctx, now = c.currentTime, until = now + horizon;
    this._factoryTick(now, until);
    if (this.musicOn && this.vol.music > 0) this._musicTick(now, until); else this.m.t = Math.max(this.m.t, until);
  }
  // offline: Musik und Atmo für secs Sekunden im Voraus planen (Tests, Export)
  renderAhead(secs = 8) { this._tick(secs); }
  // Fabrik-Takt: weiche Stampfer und Klonks, passend zum Musiktempo
  _factoryTick(now, until) {
    const beat = 60 / (this.st?.bpm || 84), L = this._facLevel(), B = this.fac.busy;
    if (this.nf < now - .5) this.nf = now + .05;
    while (this.nf < until) {
      const t = this.nf; this.nf += beat / 2;
      if (L < .01) continue;
      const on = Math.round((t - 0) / (beat / 2)) % 2 === 0, d = this.amb;
      if (on && Math.random() < .55 + .35 * B) {                                             // Stampfer
        this._tone(t, R(70, 90), .14, { f2: 48, glide: .1, g: .07 * L, dest: d });
        this._noise(t, .06, { type: 'lowpass', f: 500, g: .05 * L, brown: true, dest: d });
      }
      if (!on && Math.random() < .22 * L * (.4 + B)) {                                         // Klonk (Metall)
        const p = R(.85, 1.2), pan = R(-.6, .6);
        this._noise(t, .05, { f: 2600 * p, q: 4, g: .035 * L, dest: d, pan });
        this._tone(t, 620 * p, .14, { g: .018 * L, dest: d, pan }); this._tone(t, 987 * p, .1, { g: .012 * L, dest: d, pan });
      }
      if (Math.random() < .025 * L) this._noise(t, .5, { type: 'highpass', f: 3000, f2: 1500, g: .025 * L, a: .03, dest: d, pan: R(-.7, .7) });   // Zischen
    }
  }
  _musicTick(now, until) {
    const m = this.m;
    if (m.t < now - .5) m.t = now + .05;
    m.started = true;
    while (m.t < until) {
      if (m.pending && m.t >= m.switchAt) { const p = m.pending; m.pending = null; this._applyStyle(p, m.t); }
      const S = this.st, d16 = 60 / S.bpm / 4, st = m.step % 16, t = m.t + (st % 4 === 2 ? S.swing * d16 * 2 : 0);
      if (st === 0) this._bar(t, m);
      const ch = S.chords[m.prog[m.bar % 4]], on = k => this.lv[k] > .02;
      // Melodie (Motiv über 2 Takte, wird wiederholt und leicht verändert); Mond: Arpeggio aus Akkordtönen
      if (S.arp) { if (st % 2 === 0) { const i = (st / 2) % 4, up = (m.bar % 2) ? 3 - i : i; S.mel(this, t, S.root + S.melOct + ch[up % ch.length] + (st >= 8 ? 12 : 0), st % 8 === 0 ? 1 : .7); } }
      else { const ev = m.motif[(m.bar % 2) * 16 + st]; if (ev && !(m.vary && Math.random() < .15)) S.mel(this, t, ev.midi, ev.v); }
      if (on('bass')) S.bass(this, t, st, ch);
      if (on('perc')) S.perc(this, t, st);
      if (on('counter')) S.counter(this, t, st, ch, m);
      if (on('extra')) S.extra(this, t, st, ch, m);
      m.step++; m.t += d16;
      if (m.step % 16 === 0) m.bar++;
    }
  }
  _bar(t, m) {
    const S = this.st;
    if (m.bar % 16 === 0) m.prog = m.bar === 0 ? S.progs[0] : pick(S.progs);
    if (m.bar % 8 === 0 || !m.motif) { m.motif = this._makeMotif(); m.vary = false; } else if (m.bar % 4 === 0) m.vary = true;
    S.pad(this, t, S.chords[m.prog[m.bar % 4]], m.bar);
  }
  _makeMotif() {
    const S = this.st, L = S.scale.length, out = new Array(32).fill(null), rhythm = pick(S.rhythms);
    let deg = S.degStart + Math.floor(R(0, 3));                                   // Index in zwei Oktaven der Tonleiter
    for (let half = 0; half < 2; half++) for (const s of rhythm) {
      if (half && s >= 12 && Math.random() < .5) continue;                        // Atempause am Ende
      deg = clamp(deg + pick([-2, -1, -1, 0, 1, 1, 2]), 0, L * 2 - 1);
      out[half * 16 + s] = { midi: S.root + S.melOct + S.scale[deg % L] + 12 * Math.floor(deg / L), v: s === 0 ? .9 : R(.5, .8) };
    }
    return out;
  }
}
