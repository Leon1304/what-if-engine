// Synthesised sound (Web Audio, no files): one-shots (steps, doors, pickups, eating …) and loops whose volume the game sets
// every frame (wind, rain, creek, generator, fridge hum, fire, birds by day, owl / wolves at night).
export class Audio {
  constructor() { this.ctx = null; this.loops = {}; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = .8; this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2; this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // brown noise for wind / generator rumble
    this.brownBuf = ctx.createBuffer(1, len, ctx.sampleRate); const b = this.brownBuf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    this.loop('wind', this.brownBuf, 'lowpass', 500, 0);
    this.loop('rain', this.noiseBuf, 'highpass', 1800, 0);
    this.loop('creek', this.noiseBuf, 'bandpass', 900, 0, 1.2);
    this.loop('fire', this.noiseBuf, 'bandpass', 2500, 0, 3);
    this.loop('fridge', null, 'lowpass', 300, 0, 1, 50);
    this.loop('generator', null, 'lowpass', 400, 0, 1, 38, 'sawtooth');
    this.loop('radio', this.noiseBuf, 'bandpass', 1500, 0, .7);
    this.loop('engine', null, 'lowpass', 600, 0, 1, 42, 'sawtooth');
  }
  loop(name, buf, ftype, freq, vol, q = 1, osc = 0, wave = 'sine') {
    const ctx = this.ctx, g = ctx.createGain(); g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    let src;
    if (buf) { src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; }
    else { src = ctx.createOscillator(); src.type = wave; src.frequency.value = osc;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = osc * .03; lfo.connect(lg); lg.connect(src.frequency); lfo.start(); }
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    this.loops[name] = { g, f, src };
  }
  engineRate(v) { const l = this.loops.engine; if (l?.src) l.src.frequency.setTargetAtTime(38 + v * 3.2, this.ctx.currentTime, .1); }
  set(name, vol) { const l = this.loops[name]; if (l) l.g.gain.setTargetAtTime(Math.max(0, vol), this.ctx.currentTime, .3); }
  env(node, t, a, peak, dur) { node.gain.setValueAtTime(0, t); node.gain.linearRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(.0005, t + dur); }
  noise(dur, ftype, freq, vol, q = 1, delay = 0, sweep = 0) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = .8 + Math.random() * .4;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = ctx.createGain(); this.env(g, t, .005, vol, dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + .05);
  }
  tone(freq, dur, vol = .2, wave = 'sine', delay = 0, slide = 0) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = wave; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    const g = ctx.createGain(); this.env(g, t, .01, vol, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .05);
  }
  step(surface) {
    const s = { asphalt: [1600, .12, .07], grass: [700, .18, .1], forest: [500, .2, .12], tile: [2600, .1, .06], wood: [400, .14, .08], gravel: [1200, .22, .14], water: [900, .25, .2] }[surface] || [1000, .15, .08];
    this.noise(s[2], 'bandpass', s[0] * (.85 + Math.random() * .3), s[1], 1.2);
    if (surface === 'wood') this.tone(110 + Math.random() * 20, .08, .08, 'triangle');
  }
  sfx(name) {
    switch (name) {
      case 'pickup': this.tone(660, .08, .12, 'triangle'); this.tone(990, .1, .1, 'triangle', .06); break;
      case 'door': this.noise(.25, 'lowpass', 400, .25); this.tone(140, .2, .08, 'square', 0, .7); break;
      case 'creak': this.tone(300, .5, .05, 'sawtooth', 0, 1.6); this.noise(.2, 'lowpass', 300, .2, 1, .35); break;
      case 'slide': this.noise(.7, 'bandpass', 600, .12, 1, 0, 1.5); this.tone(90, .6, .05, 'sawtooth'); break;
      case 'locked': this.noise(.08, 'bandpass', 2000, .25); this.noise(.08, 'bandpass', 1800, .25, 1, .12); break;
      case 'eat': for (let i = 0; i < 4; i++) this.noise(.07, 'bandpass', 2200, .2, 1, i * .14); break;
      case 'drink': for (let i = 0; i < 3; i++) this.tone(320 - i * 20, .12, .12, 'sine', i * .22, .6); break;
      case 'beep': this.tone(1800, .09, .1, 'square'); break;
      case 'error': this.tone(220, .15, .12, 'square'); this.tone(180, .2, .12, 'square', .15); break;
      case 'switch': this.noise(.03, 'highpass', 3000, .3); break;
      case 'coffee': this.noise(2.2, 'bandpass', 900, .1, 2, 0, 1.4); this.tone(70, 2, .05, 'sawtooth'); break;
      case 'micro': this.tone(110, 3, .05, 'sawtooth'); this.tone(1800, .4, .1, 'sine', 3); break;
      case 'flush': this.noise(2.5, 'lowpass', 1200, .3, 1, 0, .3); break;
      case 'water': this.noise(1.5, 'bandpass', 1400, .15, 1.5); break;
      case 'pump': for (let i = 0; i < 4; i++) { this.noise(.3, 'lowpass', 500, .25, 1, i * .45); this.tone(120, .2, .06, 'square', i * .45 + .15); } break;
      case 'fuel': this.noise(2.0, 'bandpass', 700, .12, 1, 0, 1.3); break;
      case 'genstart': for (let i = 0; i < 5; i++) this.noise(.15, 'lowpass', 300, .4, 1, i * .18); this.tone(40, 1.2, .2, 'sawtooth', .9, 1.2); break;
      case 'radio': this.noise(1.5, 'bandpass', 1500, .15, .7); this.tone(800, .15, .08, 'square', 1.6); break;
      case 'howl': { const t0 = Math.random() * .3; this.tone(380, 2.6, .12, 'sine', t0, 1.5); this.tone(392, 2.4, .06, 'triangle', t0 + .1, 1.45); break; }
      case 'growl': this.tone(80, .6, .2, 'sawtooth', 0, .8); this.noise(.5, 'lowpass', 300, .2); break;
      case 'bite': this.noise(.12, 'lowpass', 900, .5); this.tone(90, .2, .2, 'square', 0, .5); break;
      case 'hurt': this.tone(200, .25, .2, 'sawtooth', 0, .6); break;
      case 'owl': this.tone(420, .35, .08, 'sine', 0, .9); this.tone(380, .5, .08, 'sine', .45, .9); break;
      case 'bird': { const f = 2500 + Math.random() * 1500; for (let i = 0; i < 3; i++) this.tone(f, .07, .04, 'sine', i * .11, 1.3); break; }
      case 'heart': this.tone(55, .12, .3, 'sine'); this.tone(50, .14, .25, 'sine', .2); break;
      case 'craft': this.noise(.3, 'bandpass', 1200, .2); this.tone(500, .1, .1, 'triangle', .3); break;
      case 'chop': this.noise(.12, 'lowpass', 1500, .5); this.tone(150, .1, .15, 'square', 0, .5); break;
      case 'fire': this.noise(.6, 'lowpass', 2000, .3, 1, 0, .3); break;
      case 'horn': this.tone(330, .5, .15, 'square'); this.tone(415, .5, .1, 'square'); break;
      case 'car': this.noise(3, 'lowpass', 300, .25, 1, 0, 1.4); break;
      case 'quest': this.tone(523, .15, .12, 'triangle'); this.tone(659, .15, .12, 'triangle', .14); this.tone(784, .3, .12, 'triangle', .28); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .5, .14, 'triangle', i * .2)); break;
      case 'hazard': this.tone(1200, .04, .03, 'square'); break;
      // weapons
      case 'pistol': this.noise(.18, 'lowpass', 2500, .9, 1, 0, .3); this.tone(140, .12, .3, 'square', 0, .4); break;
      case 'shotgun': this.noise(.45, 'lowpass', 1800, 1.0, 1, 0, .2); this.tone(70, .3, .4, 'sawtooth', 0, .4); this.noise(.12, 'bandpass', 900, .3, 1, .5); break;
      case 'rifle': this.noise(.35, 'lowpass', 3500, 1.0, 1, 0, .15); this.tone(110, .25, .35, 'square', 0, .3); this.noise(.9, 'lowpass', 500, .25, 1, .15, .5); break;
      case 'bow': this.noise(.15, 'bandpass', 600, .25, 2); this.tone(220, .12, .08, 'triangle', 0, .6); break;
      case 'reload': this.noise(.05, 'highpass', 2500, .3); this.noise(.05, 'highpass', 2000, .3, 1, .25); this.tone(900, .04, .06, 'square', .5); break;
      case 'click': this.noise(.03, 'highpass', 4000, .25); break;
      case 'swing': this.noise(.18, 'bandpass', 1200, .25, 1, 0, 2.5); break;
      case 'roar': this.tone(70, 1.2, .35, 'sawtooth', 0, .7); this.noise(1.0, 'lowpass', 400, .35, 1, 0, .6); break;
      case 'grunt': for (let i = 0; i < 3; i++) this.tone(110, .12, .2, 'sawtooth', i * .14, .7); break;
      // building, farming, loot
      case 'build': for (let i = 0; i < 3; i++) { this.noise(.06, 'lowpass', 1800, .45, 1, i * .2); this.tone(260, .06, .12, 'square', i * .2, .6); } break;
      case 'thud': this.noise(.9, 'lowpass', 220, 1.0, 1, 0, .4); this.tone(45, .8, .4, 'sine', 0, .6); break;
      case 'dig': this.noise(.3, 'lowpass', 700, .35, 1, 0, .6); break;
      case 'rustle': this.noise(.4, 'bandpass', 2500, .2, 1, 0, .7); break;
      case 'levelup': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, .25, .12, 'triangle', i * .09)); break;
      case 'alarm': for (let i = 0; i < 3; i++) this.tone(1800, .12, .1, 'square', i * .25); break;
      case 'sleep': this.tone(392, .8, .08, 'sine', 0, .8); this.tone(330, 1.2, .07, 'sine', .4, .8); break;
      case 'cast': this.noise(.35, 'bandpass', 3000, .15, 2, 0, .4); this.noise(.15, 'lowpass', 800, .2, 1, .45); break;
      case 'splash': this.noise(.3, 'lowpass', 1400, .35, 1, 0, .5); this.noise(.2, 'bandpass', 2400, .2, 1, .12); break;
      case 'bark': for (let i = 0; i < 2; i++) { this.tone(420, .09, .2, 'sawtooth', i * .22, .6); this.noise(.08, 'bandpass', 900, .25, 1, i * .22); } break;
      case 'thunder': this.noise(2.5, 'lowpass', 160, 1.0, 1, 0, .4); this.noise(.4, 'lowpass', 900, .5, 1, 0, .3); this.tone(38, 2, .25, 'sine', 0, .6); break;
      case 'coins': for (let i = 0; i < 3; i++) this.tone(1500 + i * 300, .08, .08, 'triangle', i * .07); break;
    }
  }
}
