// Ton im Eltern-Fenster: die Welt rendert ihren ganzen Ton offline (whatif.renderAudio → base64-WAV), die Hülle spielt ihn
// mit einem eigenen AudioContext ab (erst nach einem Klick, im iframe gibt es keine Nutzer-Geste) und hält ihn synchron zu live.t / rate / seek.
// Bei anderem Tempo läuft der Ton mit playbackRate mit (Zeitlupe klingt tiefer — gewollt); unter 0,25× bzw. rückwärts: stumm.
export class Sound {
  constructor() { this.ctx = null; this.on = false; this.src = null; this.world = null; this.busy = null; this.gain = null; }
  async enable() {
    this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    this.gain ??= (g => (g.connect(this.ctx.destination), g))(this.ctx.createGain());
    await this.ctx.resume(); this.on = true;
  }
  disable() { this.on = false; this.stop(); this.ctx?.suspend(); }
  async buffer(world) {   // pro Welt einmal rendern (dauert je nach Länge einige Sekunden)
    if (world.audio) return world.audio;
    if (world._audioP) return world._audioP;
    world._audioP = (async () => {
      const b64 = await world.win.whatif.renderAudio(this.ctx.sampleRate), bin = atob(b64), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      world.audio = await this.ctx.decodeAudioData(u.buffer);
      return world.audio;
    })();
    return world._audioP;
  }
  stop() { if (this.src) { try { this.src.stop(); } catch (e) {} this.src.disconnect(); this.src = null; } }
  start(world, t, rate, loop) {
    this.stop(); const buf = world.audio; if (!buf) return;
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = loop; s.playbackRate.value = rate; s.connect(this.gain);
    const off = Math.min(Math.max(0, t), buf.duration - 0.01); s.start(0, off);
    this.src = s; this.state = { world, at: this.ctx.currentTime, off, rate, loop };
  }
  pos() { const S = this.state; if (!S) return 0; let p = S.off + (this.ctx.currentTime - S.at) * S.rate; if (S.loop) p %= S.world.audio.duration; return p; }
  // jedes Bild aufrufen: Ton folgt der Uhr der Welt
  sync(world) {
    if (!this.on || !world?.api) { this.stop(); return; }
    const L = world.api, playing = L.playing, rate = L.rate, t = L.t;
    if (!world.audio) { this.stop(); if (!this.busy) this.busy = this.buffer(world).catch(e => console.error('[Ton]', e)).finally(() => { this.busy = null; }); return; }
    if (!playing || rate < 0.25) { this.stop(); return; }
    const S = this.state, loop = !!world.loop;
    if (!this.src || S.world !== world || S.rate !== rate) { this.start(world, t, rate, loop); return; }
    let d = Math.abs(this.pos() - t); if (loop) d = Math.min(d, world.audio.duration - d);
    if (d > 0.12) this.start(world, t, rate, loop);   // gesprungen (seek, Neustart) oder auseinandergelaufen
  }
}
