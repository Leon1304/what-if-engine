// Werbe-Clip für TikTok/Reels/Shorts (9:16, 1080×1920, 30 fps) direkt aus dem Spiel:
// Spielzeit wird Bild für Bild gesteuert (ruckelfrei, unabhängig von der Rechenlast), Texte als Overlay,
// Ton = echte Spielmusik + Spielgeräusche, offline passgenau gerendert.
//   node cloudhaven/tools/promo.mjs <ausgabeordner> [--fps 30] [--preview]   → <ordner>/cloudhaven-promo.mp4
import http from 'http'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'work/cloudhaven-promo'); fs.mkdirSync(out, { recursive: true });
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const FPS = +arg('--fps', 30), PREVIEW = process.argv.includes('--preview');
const W = PREVIEW ? 540 : 1080, H = PREVIEW ? 960 : 1920;
const frames = path.join(out, 'frames'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'en-US' });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGE ERROR ' + e.message));

// Steuerbare Uhr: bis __manual(true) läuft alles normal, danach nur noch über __advance(ms)
await page.addInitScript(() => {
  let s = 12345; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const realNow = performance.now.bind(performance), realRaf = window.requestAnimationFrame.bind(window), realST = window.setTimeout.bind(window);
  let manual = false, fake = 0, raf = [], timers = [], tid = 1;
  performance.now = () => manual ? fake : realNow();
  window.requestAnimationFrame = cb => manual ? (raf.push(cb), raf.length) : realRaf(cb);
  window.setTimeout = (fn, ms = 0, ...a) => { if (!manual) return realST(fn, ms, ...a); const id = tid++; timers.push({ id, t: fake + ms, fn: () => fn(...a) }); return id; };
  const realCT = window.clearTimeout.bind(window); window.clearTimeout = id => { timers = timers.filter(x => x.id !== id); realCT(id); };
  window.__manual = on => { if (on && !manual) fake = realNow(); manual = on; };
  window.__now = () => fake;
  window.__advance = ms => { fake += ms; const due = timers.filter(x => x.t <= fake); timers = timers.filter(x => x.t > fake); for (const x of due) try { x.fn(); } catch (e) { console.error(e); } const cbs = raf; raf = []; for (const cb of cbs) cb(fake); };
});
await page.goto(`http://localhost:${srv.address().port}/index.html?neu&dyn=0&q=hoch`);
await page.waitForFunction(() => window.__insel && __insel.ui.mode === 'menu', null, { timeout: 120000 });
await page.locator('[data-act="new"]').first().click(); await page.waitForTimeout(400);
await page.locator('[data-act="create"]').first().click(); await page.waitForTimeout(1500);

// Insel aufbauen (ohne Verschmelzen, damit ein volles Dorf entsteht) + Bühne für die Verschmelz-Szene vorbereiten
const setup = await page.evaluate(async () => {
  const { game, world, ui, app, life } = __insel, S = game.S;
  ui._closeAll?.(); S.tut = 99; S.merge = false; app.settings.merge = false; app.settings.visitors = false;
  const POOL = ['haus', 'haus', 'haus', 'wald', 'wald', 'nadelwald', 'weg', 'kreuzung', 'feld', 'feld', 'muehle', 'bach', 'bachk', 'see', 'teich', 'obst', 'wiese', 'gasthaus', 'baecker',
    'platz', 'kapelle', 'markt', 'hof', 'schafe', 'imker', 'wein', 'huette', 'reihe', 'turm', 'burg', 'steine', 'pavillon', 'berg', 'felsen', 'schmiede', 'wmuehle', 'bruecke'];
  S.unlocked = [...new Set(POOL)];
  const seq = []; for (let i = 0; i < 74; i++) seq.push({ k: POOL[i % POOL.length] }); S.stack = seq; S.pick = 0;
  for (let i = 0; i < 74 && S.stack.length; i++) {
    const c = game.current(); let best = null;
    for (const [q, r] of game.slots()) { const dd = Math.abs(q) + Math.abs(r) + Math.abs(q + r); for (let o = 0; o < 6; o++) { const e = game.evaluate(c.k, q, r, o); if (!e.ok) continue; const sc = e.pts - dd * .6 + Math.random(); if (!best || sc > best.sc) best = { q, r, o, sc }; } }
    if (best) game.place(best.q, best.r, best.o); else S.stack.splice(S.pick, 1);
    if (i % 8 === 7) await new Promise(r => setTimeout(r, 30));
  }
  // Verschmelz-Bühne: freies Feld s am Rand, 2× Felsen + 2× Blockhütte als Nachbarn
  const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]], key = (q, r) => q + ',' + r;
  let stage = null;
  for (const [q, r] of game.slots()) {
    const free = DIRS.map(([a, b]) => [q + a, r + b]).filter(([a, b]) => !game.at(a, b));
    if (free.length >= 4 && free.length <= 5) { stage = { q, r, free }; break; }
  }
  if (stage) {
    const [a, b, c, d] = stage.free;
    for (const [[x, y], k] of [[a, 'felsen'], [b, 'felsen'], [c, 'huette'], [d, 'huette']]) game._put({ k, q: x, r: y, o: 0 });
    world.sync(); life.setTiles(world.lifeList());
  }
  S.merge = true; app.settings.merge = true; S.stack = [{ k: 'felsen' }, { k: 'wald' }, { k: 'haus' }]; S.pick = 0; game.emit('stack');
  // Haus für den Fenster-Hook: Front zeigt in Richtung der Wegkante
  // Haus mit freier Sicht nach vorn (vor der Tür kein Gebäude, besser noch ein Weg oder freies Feld)
  const BLD = new Set(['haus', 'huette', 'reihe', 'gasthaus', 'baecker', 'schmiede', 'saege', 'kapelle', 'hof', 'muehle', 'wmuehle', 'turm', 'burg', 'markt', 'platz', 'pavillon', 'wald', 'nadelwald', 'obst']);
  const front = o => { const e = (o.t.o) % 6, [a, b] = DIRS[e], n = game.at(o.t.q + a, o.t.r + b), [a2, b2] = DIRS[e], n2 = game.at(o.t.q + 2 * a2, o.t.r + 2 * b2); return (n && BLD.has(n.k) ? 2 : 0) + (n2 && BLD.has(n2.k) ? 1 : 0); };
  const house = [...world.T.values()].filter(o => o.t.k === 'haus').sort((x, y) => front(x) - front(y) || game.stageOf(y.t) - game.stageOf(x.t) || Math.hypot(x.cx, x.cz) - Math.hypot(y.cx, y.cz))[0];
  const center = [0, 0]; let n = 0; for (const o of world.T.values()) { center[0] += o.cx; center[1] += o.cz; n++; }
  return { tiles: game.board.size, stage, house: house && { cx: house.cx, cz: house.cz, o: house.t.o, stage: game.stageOf(house.t) }, center: [center[0] / n, center[1] / n], R: world.bounds() };
});
console.log('Insel:', JSON.stringify(setup));

// Oberfläche weg, Text-Overlay rein, Ton mitschreiben
await page.evaluate(() => {
  const css = document.createElement('style'); css.textContent = `
  #ui, .camrot, #boot { display: none !important; }
  #promo { position: fixed; inset: 0; pointer-events: none; z-index: 99; font-family: Fredoka, Nunito, system-ui, sans-serif; }
  #promo .cap { position: absolute; left: 7%; right: 13%; top: 14%; text-align: center; color: #fff; font-weight: 700; font-size: ${Math.round(innerWidth * .072)}px; line-height: 1.12;
    text-shadow: 0 3px 0 #6b3f1d, 0 6px 18px rgba(40,20,5,.55), 0 0 2px #6b3f1d; letter-spacing: .01em; }
  #promo .cap small { display: block; font-size: .5em; font-weight: 600; margin-top: .35em; color: #ffe9b8; }
  #promo .end { position: absolute; left: 8%; right: 8%; top: 30%; text-align: center; color: #fff; opacity: 0; }
  #promo .end .logo { font-size: ${Math.round(innerWidth * .15)}px; font-weight: 700; line-height: 1; text-shadow: 0 5px 0 #6b3f1d, 0 10px 30px rgba(40,20,5,.6); }
  #promo .end .sub { font-size: ${Math.round(innerWidth * .052)}px; font-weight: 600; margin-top: .6em; text-shadow: 0 3px 0 #6b3f1d, 0 4px 14px rgba(40,20,5,.5); }
  #promo .end .pill { display: inline-block; margin-top: 1.1em; padding: .45em 1.1em; border-radius: 99px; background: #6fbf4a; color: #fff; font-size: ${Math.round(innerWidth * .05)}px; font-weight: 700;
    box-shadow: 0 6px 0 #3f8a2a, 0 10px 24px rgba(0,0,0,.3); }
  #promo .end .url { margin-top: 1em; font-size: ${Math.round(innerWidth * .032)}px; color: #ffe9b8; text-shadow: 0 2px 6px rgba(0,0,0,.6); }
  #promo .vign { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(30,15,5,.35)); }`;
  document.head.appendChild(css);
  const d = document.createElement('div'); d.id = 'promo';
  d.innerHTML = `<div class="vign"></div><div class="cap"></div><div class="end"><div class="logo">Cloudhaven</div><div class="sub">Build a cozy village<br>above the clouds</div><div class="pill">Free · play in your browser</div><div class="url">Link in bio</div></div>`;
  document.body.appendChild(d);
  const s = __insel.sound, orig = s.play.bind(s); window.__sfx = [];
  s.play = (name, o) => { window.__sfx.push({ name, o: o || {}, t: (__now() - (window.__t0 || 0)) / 1000 }); return orig(name, o); };
  __insel.app.photo(true);
});

// ---------------- Drehbuch ----------------
// Jede Einstellung: Kamera (Ziel, Abstand, Drehung), Uhrzeit, Jahreszeit, Wetter, Text – als Funktion der Zeit
await page.evaluate(({ setup, FPS }) => {
  const { game, world, rig, stage, app, life, THREE } = __insel, set = app.settings;
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const elog = (a, b, t) => Math.exp(lerp(Math.log(a), Math.log(b), t));
  const C = new THREE.Vector3(setup.center[0], 0, setup.center[1]), R = setup.R;
  const hc = setup.house, ang = hc ? hc.o * Math.PI / 3 : 0, fx = Math.cos(ang), fz = Math.sin(ang);
  const win = hc ? new THREE.Vector3(hc.cx + fx * 4.2, 0, hc.cz + fz * 4.2) : C.clone();   // vor der Haustür auf dem Weg
  const hookYaw = Math.atan2(fx, fz);
  const st = setup.stage, sp = st ? (() => { const x = 6 * Math.sqrt(3) * (st.q + st.r / 2), z = 9 * st.r; return new THREE.Vector3(x, 0, z); })() : C.clone();
  const cap = document.querySelector('#promo .cap'), end = document.querySelector('#promo .end');
  const CAPS = [
    [0.0, 3.0, 'I built a tiny village<br>above the clouds ☁️'],
    [3.4, 8.9, 'Place tiles.<br>Watch it come alive 🌱'],
    [9.4, 13.9, 'Merge 3 → level up 🔮<small>rock → cabin → house → … → castle</small>'],
    [14.4, 18.9, 'Every window<br>lights up at night ✨'],
    [19.4, 22.0, 'Seasons, weather<br>& tiny villagers ❄️'],
  ];
  let reveal = false, placed = false, fw = false, winter = false, hovered = false;
  window.__DUR = 26;
  window.__shot = t => {
    // Texte
    let html = '', op = 0; for (const [a, b, s] of CAPS) if (t >= a - .3 && t <= b + .3) { html = s; op = clamp(Math.min((t - a + .3) / .3, (b + .3 - t) / .3), 0, 1); }
    if (cap.innerHTML !== html) cap.innerHTML = html; cap.style.opacity = op; cap.style.transform = `translateY(${(1 - op) * -18}px) scale(${.96 + .04 * op})`;
    const eo = clamp((t - 22.3) / .6, 0, 1); end.style.opacity = eo; end.style.transform = `translateY(${(1 - ease(eo)) * 30}px)`;
    // Einstellungen
    set.dayCycle = false; set.weather = 'klar';
    if (t < 3.2) {                                   // A: Fenster → Insel (Dämmerung)
      const u = ease(clamp(t / 3.1, 0, 1)); set.time = 19.2; set.season = 1;
      rig.jumpTo(new THREE.Vector3(lerp(win.x, C.x, u), 0, lerp(win.z, C.z, u)), elog(9, R * 2.2, u), hookYaw + u * .9, lerp(.12, 0, u));
    } else if (t < 9.2) {                            // B: Zeitraffer
      if (!reveal) { reveal = true; world.startReveal(5.2 / game.S.tiles.length); }
      const u = (t - 3.2) / 6; set.time = 10.5; set.season = 1;
      rig.jumpTo(C, R * (2.5 - .3 * u), hookYaw + .9 + u * 1.1, 0);
    } else if (t < 14.2) {                           // C: Verschmelzen
      if (reveal) { reveal = false; world.stopReveal(); }
      const u = (t - 9.2) / 5; set.time = 15; set.season = 1;
      rig.jumpTo(sp, lerp(26, 20, ease(u)), hookYaw + 2 + u * .5, 0);
      if (!hovered && t > 9.5) { hovered = true; const p = sp.clone(); p.y = .2; p.project(stage.camera); rig.onHover?.(p.x, p.y); }
      if (!placed && t > 10.6 && st) { placed = true; game.place(st.q, st.r, 0); }
    } else if (t < 19.2) {                           // D: Tag → Nacht
      const u = (t - 14.2) / 5; set.time = lerp(17.6, 22.8, ease(u)); set.season = 1;
      rig.jumpTo(C, R * 1.55, hookYaw + 2.5 + u * .8, 0);
      if (!fw && t > 17.2) { fw = true; life.celebrate('dorf', new THREE.Vector3(C.x, 2, C.z), 20); }
    } else if (t < 22.2) {                           // E: Winter
      if (!winter) { winter = true; set.season = 3; stage.setSeason(3, true); stage.setWeather('klar', true); }
      const u = (t - 19.2) / 3; set.time = 12; set.season = 3;
      rig.jumpTo(C, R * lerp(1.8, 2.1, u), hookYaw + 3.3 + u * .6, 0);
    } else {                                         // F: Endkarte (goldene Stunde)
      if (winter) { winter = false; set.season = 1; stage.setSeason(1, true); stage.setWeather('klar', true); }
      const u = (t - 22.2) / 3.8; set.time = 16.8; set.season = 1;
      rig.jumpTo(C, R * lerp(2.3, 2.8, u), hookYaw + 3.9 + u * .4, 0);
    }
  };
}, { setup, FPS });

// Einschwingen (Leben, Shader), dann Aufnahme
await page.evaluate(() => { __insel.rig.blockers = () => []; __insel.app.settings.weather = 'klar'; __insel.stage.setWeather('klar', true); __manual(true); for (let i = 0; i < 60; i++) { __shot(0); __advance(1000 / 30); } window.__t0 = __now(); __sfx.length = 0; });
const N = Math.round(await page.evaluate(() => __DUR) * FPS), t0 = Date.now();
for (let i = 0; i < N; i++) {
  await page.evaluate(([i, FPS]) => { __shot(i / FPS); __advance(1000 / FPS); }, [i, FPS]);
  await page.screenshot({ path: path.join(frames, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 94 });
  if (i % 60 === 0) console.log(`  Bild ${i}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
const logged = await page.evaluate(() => __sfx);
const sfx = logged.filter(e => e.t >= 9 && e.name !== 'burner');
for (let t = 3.45; t < 8.9; t += .34) sfx.push({ name: 'pop', o: { vol: .55 }, t });          // Zeitraffer: Kacheln ploppen
for (const t of [17.25, 17.6, 17.95, 18.3, 18.55]) sfx.push({ name: 'firework', o: { vol: .8 }, t });
sfx.push({ name: 'unlock', o: {}, t: 22.35 });                                                     // Endkarte
sfx.sort((a, b) => a.t - b.t);
fs.writeFileSync(path.join(out, 'sfx.json'), JSON.stringify(sfx, null, 1));
console.log('Geräusche:', sfx.map(s => `${s.name}@${s.t.toFixed(2)}`).join(' '));

// Ton offline: Spielmusik + Atmo + die mitgeschriebenen Geräusche
const wavB64 = await page.evaluate(async ({ dur, sfx }) => {
  const { Sound } = await import('./js/audio.js');
  const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr), s = new Sound({ context: ctx });
  s.setVolumes?.(.75, .9);
  s.update({ night: 0, season: 1, rain: 0, camDist: 30, near: { water: .35, forest: .4, village: .7, fall: .2 } });
  s._tick(dur);
  const fake = { v: 0 }; Object.defineProperty(ctx, 'currentTime', { get: () => fake.v, configurable: true });
  for (const e of sfx) if (e.t >= 0 && e.t < dur - .2) { fake.v = e.t; try { s.play(e.name, e.o); } catch (er) { /* unbekannt */ } }
  delete ctx.currentTime;
  const buf = await ctx.startRendering(), L = buf.getChannelData(0), Rr = buf.getChannelData(1), n = L.length;
  // sanft ein-/ausblenden
  for (let i = 0; i < n; i++) { const g = Math.min(1, i / (sr * .4), (n - i) / (sr * 1.2)); L[i] *= g; Rr[i] *= g; }
  const dv = new DataView(new ArrayBuffer(44 + n * 4)), w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, Rr[i])) * 32767, true); }
  const u8 = new Uint8Array(dv.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin);
}, { dur: N / FPS, sfx });
fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(wavB64, 'base64'));
await browser.close(); srv.close();

const mp4 = path.join(out, 'cloudhaven-promo.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, '%05d.jpg'), '-i', path.join(out, 'audio.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-shortest', mp4]);
console.log(`PROMO OK – ${mp4} (${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB, ${N} Bilder, ${(N / FPS).toFixed(1)} s)`);
