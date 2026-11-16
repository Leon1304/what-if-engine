// Fließband (Cogtopia) – Ton: alles prozedural mit WebAudio, keine Dateien.
// Effekte (Bau-Klack, Abriss, Münze mit steigender Tonhöhe, Gold-Jackpot, Entdeckungs-Fanfare, Fehler, Kiste, Gerald-Quietschen …),
// leises Fabrik-Grundrauschen abhängig von der Maschinenzahl, ruhige Musik-Schleife (Marimba, weiche Flächen, leichter Bass).
// Musik und Effekte über getrennte Lautstärken; bis unlock() (Nutzergeste) bleibt alles still.
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// Musik: F-Dur-Pentatonik, gemütlich, ~84 bpm. Akkorde relativ zum Grundton (MIDI 65 = F4)
const ROOT = 65, PENT = [0, 2, 4, 7, 9], BPM = 84;
const CH = {
  I: [0, 4, 7, 11], vi: [-3, 0, 4, 7], IV: [-7, -3, 0, 4], V: [-5, -1, 2, 7], ii: [-10, -7, -3, 0], iii: [-8, -5, -1, 2],
};
const PROGS = [['I', 'vi', 'IV', 'V'], ['I', 'iii', 'IV', 'V'], ['IV', 'I', 'ii', 'V'], ['vi', 'IV', 'I', 'V']];
const VOWELS = { i: [320, 2300], e: [500, 1900], a: [800, 1200], o: [520, 900], u: [360, 800] };

export const SOUND_NAMES = ['build', 'remove', 'rotate', 'click', 'coin', 'jackpot', 'discover', 'error', 'crate', 'squeak', 'levelup', 'contract', 'plot', 'research', 'cheer'];

export class Sound {
  constructor(opts = {}) {
    this.ctx = null; this.ready = false; this.offline = false;
    this.vol = { music: opts.music ?? .5, sfx: opts.sfx ?? .8 }; this.musicOn = opts.musicOn ?? true;
    this.fac = { machines: 0, busy: 0 }; this._coins = [];
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
  // Fabrik-Atmo: machines = Anzahl Maschinen, busy = Anteil 0…1 (oder Anzahl beschäftigter Maschinen)
  setFactory({ machines = 0, busy } = {}) {
    machines = Math.max(0, machines | 0);
    let b = busy ?? (machines ? 1 : 0); if (b > 1) b = machines ? b / machines : 0;
    this.fac = { machines, busy: clamp(b) };
    if (!this.ready) return; const t = this.ctx.currentTime, L = this._facLevel();
    this.humG.gain.setTargetAtTime(machines ? .02 + .05 * L : 0, t, .9);
    this.rumbleG.gain.setTargetAtTime(machines ? (.015 + .05 * L) * (.5 + .5 * this.fac.busy) : 0, t, .9);
    this.humLp.frequency.setTargetAtTime(120 + 160 * L * this.fac.busy, t, 1.2);
  }
  _facLevel() { return 1 - Math.exp(-this.fac.machines / 14); }

  // ---------------------------------------------------------------- Aufbau
  _build() {
    const c = this.ctx, sr = c.sampleRate;
    this.out = c.createGain(); this.out.gain.value = .8;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08;
    this.out.connect(comp); comp.connect(lim); lim.connect(c.destination);
    // Hall
    this.rev = c.createConvolver(); this.rev.buffer = this._impulse(2.2, 3); const revOut = this._g(.42); this.rev.connect(revOut); revOut.connect(this.out);
    // Musik
    this.musicVol = this._g(this.vol.music); this.musicVol.connect(this.out);
    this.musicTone = this._f('lowpass', 9000); this.musicTone.connect(this.musicVol);
    this.musicMix = this._g(this.musicOn ? 1 : 0); this.musicMix.connect(this.musicTone);
    this.music = this._g(.55); this.music.connect(this.musicMix);
    const mRev = this._g(.45); this.music.connect(mRev); mRev.connect(this.rev);
    // Echo für die Marimba
    this.delay = c.createDelay(2); this.delay.delayTime.value = 60 / BPM * .75; const fb = this._g(.28), dl = this._f('lowpass', 2400);
    this.delay.connect(dl); dl.connect(fb); fb.connect(this.delay); dl.connect(this.music); this.echo = this._g(.18); this.echo.connect(this.delay);
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
    const t0 = c.currentTime;
    this.m = { t: t0 + .25, step: 0, bar: 0, prog: PROGS[0], motif: null, motifAt: -1 };
    this.nf = t0 + .4;                                    // nächster Fabrik-Takt
    this.ready = true;
    if (!this.offline && typeof setInterval !== 'undefined') this._timer = setInterval(() => this._tick(), 100);
    this.setFactory(this.fac);
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
    const g = this._g(o.gain ?? 1); g.connect(this.sfx); this._d = g;
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

  // ---------------------------------------------------------------- Planung
  _tick(horizon = .45) {
    if (!this.ready) return;
    const c = this.ctx, now = c.currentTime, until = now + horizon;
    this._factoryTick(now, until);
    if (this.musicOn && this.vol.music > 0) this._musicTick(now, until); else this.m.t = Math.max(this.m.t, until);
  }
  // Fabrik-Takt: weiche Stampfer und Klonks, passend zum Musiktempo
  _factoryTick(now, until) {
    const beat = 60 / BPM, L = this._facLevel(), B = this.fac.busy;
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
    const m = this.m, dt8 = 60 / BPM / 2;
    if (m.t < now - .5) m.t = now + .05;
    while (m.t < until) {
      const st = m.step % 8, t = m.t + (st % 2 ? dt8 * .08 : 0);             // leichter Swing
      if (st === 0) this._bar(t, m);
      const chord = CH[m.prog[m.bar % 4]];
      // Melodie (Motiv über 2 Takte, wird wiederholt und leicht verändert)
      const ev = m.motif[(m.bar % 2) * 8 + st];
      if (ev && !(m.vary && Math.random() < .15)) this._mallet(t, ev.midi, ev.v, this._mdest());
      // Bass: Grundton auf 1, Quinte auf 3
      if (st === 0 || st === 4) {
        const n = ROOT - 24 + chord[0] + (st === 4 ? 7 : 0);
        this._tone(t, mtof(n), .55, { type: 'triangle', g: .12, lp: 600, dest: this.music, a: .01 });
        this._tone(t, mtof(n), .45, { g: .1, dest: this.music, a: .01 });
      }
      // Schellen auf den Achteln dazwischen, Holz auf 2 und 4
      if (st % 2) this._noise(t, .04, { type: 'highpass', f: 7000, g: st === 3 || st === 7 ? .022 : .012, dest: this.music });
      if (st === 2 || st === 6) this._noise(t, .03, { f: 1800, q: 3, g: .04, dest: this.music });
      m.step++; m.t += dt8;
      if (m.step % 8 === 0) m.bar++;
    }
  }
  _mdest() { if (!this._md) { this._md = this._g(1); this._md.connect(this.music); this._md.connect(this.echo); } return this._md; }
  _bar(t, m) {
    if (m.bar % 16 === 0) { m.prog = m.bar === 0 ? PROGS[0] : pick(PROGS); }
    if (m.bar % 8 === 0 || !m.motif) { m.motif = this._makeMotif(); m.vary = false; } else if (m.bar % 4 === 0) m.vary = true;
    const chord = CH[m.prog[m.bar % 4]];
    // weiche Fläche (zwei verstimmte Dreiecke je Ton, langsam ein und aus)
    const dur = 60 / BPM * 4;
    for (const d of chord) {
      const f = mtof(ROOT - 12 + d);
      for (const det of [-6, 6]) this._tone(t, f, .9, { type: 'triangle', a: .5, hold: dur - .6, g: .022, lp: 900, detune: det, dest: this.music });
    }
    if (m.bar % 4 === 0 && Math.random() < .6) this._bell(t, mtof(ROOT + 24 + pick(PENT)), .022, 1.6, { dest: this.music });
  }
  _makeMotif() {
    const out = new Array(16).fill(null), rhythm = pick([[0, 2, 3, 4, 6], [0, 3, 4, 6, 7], [0, 2, 4, 5, 6], [0, 1, 2, 4, 6], [0, 3, 6]]);
    let deg = 5 + Math.floor(R(0, 3));                                           // Index in zwei Oktaven Pentatonik
    for (let half = 0; half < 2; half++) for (const s of rhythm) {
      if (half && s >= 6 && Math.random() < .5) continue;                        // Atempause am Ende
      deg = clamp(deg + pick([-2, -1, -1, 0, 1, 1, 2]), 0, 9);
      out[half * 8 + s] = { midi: ROOT + PENT[deg % 5] + 12 * Math.floor(deg / 5), v: s === 0 ? .9 : R(.5, .8) };
    }
    return out;
  }
}
