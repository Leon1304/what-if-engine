// render.mjs — headless renderer for /what-if pages (frame-exact, deterministic)
//   node render.mjs page.html --shots 0.5,3,8,12 [--out shots] [--w 540]   → PNGs + <out>/sheet.jpg (contact sheet)
//   node render.mjs page.html --video out.mp4 [--w 1440 (2K, default)|1080|2160] [--fps 30] [--workers 2] [--draft] [--redo 10.2-14.2] [--clean] [--ig] [--shard i/N --frames-only]
//     → out.mp4 (master, YouTube: CRF 18); with --ig also out-ig.mp4 (Instagram: 1080x1920, ~12 Mbps)
//   node render.mjs page.html --cover cover.jpg [--t 1.2]   (THUMB = [A, B] → also cover-b.jpg: A/B test thumbnails)
//   node render.mjs page.html --audio out.wav
//   node render.mjs page.html --srt out.srt   (v2.30: subtitles for YouTube, same pages + timing as the captions)
//   node render.mjs page.html --audit   → MOTION: / HITBOX: / GORE: / QA: lines (pops, snapping joints, jitter, state left over between frames, figures inside props,
//     v3.0: crowd members inside each other or props, feet in the floor, limbs that fell back to boxes); --shots runs it too (--no-audit = off); --strict = exit 3 on any warning
//   --video also checks the finished frames for stray lines (qa_lines.py, LINES:)
//     The audit also opens the page a second time and compares both (anything that depends on earlier frames or differs from page to page pops at the borders of
//     render blocks / flickers between render workers); --no-fresh skips that second page.
// Landscape pages (CFG.aspect: '16:9') render 16:9 with the same --w (short side): 1440 → 2560x1440.
// Needs in this folder: npm i three@0.170.0 playwright ; ffmpeg on PATH.
// Frames stay in <out>.frames/: a stopped run resumes, and --redo a-b re-renders only that time range (after a scene/caption
// change there) before re-encoding. --clean deletes frames + wav after a successful encode. New audio only: --remux.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, renameSync, rmSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';

const argv = process.argv.slice(2), file = argv[0];
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i > -1 ? argv[i + 1] : d; };
const flag = k => argv.includes('--' + k);
const draft = flag('draft');
const W = +opt('w', draft ? 540 : 1440), fps = +opt('fps', draft ? 15 : 30), workers = Math.max(1, +opt('workers', 2));
const HERE = path.dirname(new URL(import.meta.url).pathname);
const THREE_DIR = path.join(HERE, 'node_modules/three');
const src = readFileSync(file, 'utf8');
const LAND = /\baspect:\s*['"](16:9|landscape)['"]/.test(src);   // v2.25: 16:9 page → 1920x1080 viewport; --w is always the short side (1440 = 2K → 2560x1440)
const html = /^\s*<!doctype/i.test(src) ? src : '<!doctype html><html><head><meta charset="utf-8"></head><body>' + src + '</body></html>';

async function openPage(W0 = W) {   // W0: render width of this page (the audit pages draw nothing worth seeing → tiny)
  const browser = await chromium.launch({
    executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined
  });
  const ctx = await browser.newContext({ viewport: LAND ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 }, deviceScaleFactor: W0 / 1080, ignoreHTTPSErrors: true });
  await ctx.addInitScript(() => { window.__EXPORT__ = true; });
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (url === 'http://whatif.local/') return route.fulfill({ contentType: 'text/html', body: html });
    const m = url.match(/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\/(.*)$/);
    if (m) return route.fulfill({ contentType: 'application/javascript', body: readFileSync(path.join(THREE_DIR, m[1])) });
    const c = url.match(/cdn\.jsdelivr\.net\/npm\/(@dimforge\/rapier3d-deterministic-compat)@[\d.]+\/(.*)$/);   // physics engine from node_modules when installed
    if (c && existsSync(path.join(HERE, 'node_modules', c[1], c[2]))) return route.fulfill({ contentType: 'application/javascript', body: readFileSync(path.join(HERE, 'node_modules', c[1], c[2])) });
    return route.continue();
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://whatif.local/');
  try { await page.waitForFunction(() => window.whatif, null, { timeout: 120000 }); }
  catch { console.log('PAGE DID NOT START\n' + errors.join('\n')); await browser.close(); process.exit(1); }
  await page.evaluate(async ([w, F]) => { await document.fonts.ready; window.whatif.setRenderWidth(w); window.whatif.fps?.(F); window.whatif.seek(0); }, [LAND ? Math.round(W0 * 16 / 9) : W0, fps]);
  return { browser, page, errors };
}
const report = errors => { if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 12).join('\n')); };
// purity, second page: a freshly opened page jumps straight to the block starts and sends fingerprints of every moving part; the audit in the first page compares them
async function freshPrints() {
  if (flag('no-fresh')) return null;
  const { browser, page } = await openPage(135);
  try { return await page.evaluate(() => window.whatif.audit({ fresh: true })); } catch (e) { return null; } finally { await browser.close(); }
}
const AF = 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000', igPath = v => v.replace(/\.mp4$/, '') + '-ig.mp4';
const ff = args => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); if (r.status !== 0) { console.log('ffmpeg failed'); process.exit(1); } };

if (opt('srt')) {   // v2.30: subtitles for YouTube (same pages + timing as the burned-in captions)
  const { browser, page, errors } = await openPage();
  const s = await page.evaluate(() => window.whatif.srt ? window.whatif.srt() : '');
  writeFileSync(opt('srt'), s); console.log('wrote', opt('srt'), s.split('\n\n').filter(Boolean).length, 'cues'); report(errors); await browser.close(); process.exit(0);
}
if (opt('probe')) {   // v2.29 debugging: evaluate code inside the engine (after the scene is built), print the result as JSON
  const { browser, page, errors } = await openPage();
  try { console.log(JSON.stringify(await page.evaluate(s => window.whatif.probe(s), opt('probe')), null, 1)); } catch (e) { console.log('PROBE ERROR', e.message); }
  report(errors); await browser.close(); process.exit(0);
}
if (flag('audit') && !opt('shots')) {   // v2.29: node render.mjs page.html --audit → motion + gore check of the whole video, no images
  const t0 = Date.now(), fresh = await freshPrints(), { browser, page, errors } = await openPage(135);
  const A = await page.evaluate(fresh => window.whatif.audit({ fresh }), fresh);
  for (const m of A.motion) console.log('MOTION: ' + m); for (const m of A.hit ?? []) console.log('HITBOX: ' + m); for (const g of A.gore) console.log('GORE: ' + g);
  if (!A.motion.length) console.log('motion: ok (no pops, jitter or left-over state)');
  for (const q of A.qa ?? []) console.log('QA: ' + q); if (!(A.qa ?? []).length) console.log('qa: ok (crowds, feet, skin)');
  const nWarn = A.motion.length + (A.hit ?? []).length + (A.qa ?? []).length; if (flag('strict') && nWarn) { console.log(`STRICT: ${nWarn} warning(s)`); report(errors); await browser.close(); process.exit(3); }
  console.log(`audit ${((Date.now() - t0) / 1000).toFixed(0)} s`); report(errors); await browser.close(); process.exit(0);
}
if (opt('shots')) {
  const out = opt('out', 'shots'); mkdirSync(out, { recursive: true });
  const { browser, page, errors } = await openPage();
  const ts = opt('shots').split(',').map(Number), files = [];
  for (const [k, t] of ts.entries()) {
    const t0 = Date.now();
    await page.evaluate(t => window.whatif.seek(t), t);
    const f = path.join(out, `s${String(k).padStart(2, '0')}_t${String(t).replace('.', '_')}.png`);
    await page.screenshot({ path: f }); files.push(f);
    console.log(f, `${Date.now() - t0} ms`);
  }
  const info = await page.evaluate(() => window.whatif.info()), { gore: G0, ...rest } = info;
  console.log('scene:', JSON.stringify(rest));
  const fresh = flag('no-audit') ? null : await freshPrints();
  const A = flag('no-audit') ? { motion: [], gore: G0 ?? [] } : await page.evaluate(fresh => window.whatif.audit?.({ fresh }) ?? { motion: [], gore: [] }, fresh);   // v2.29 motion + gore audit
  for (const m of A.motion) console.log('MOTION: ' + m);
  for (const m of A.hit ?? []) console.log('HITBOX: ' + m);
  for (const g of A.gore) console.log('GORE: ' + g);
  for (const q of A.qa ?? []) console.log('QA: ' + q);
  if (!A.motion.length) console.log('motion: ok (no pops, jitter or left-over state)');
  report(errors); await browser.close();
  const cols = Math.min(LAND ? 3 : 4, files.length), rows = Math.ceil(files.length / cols), TW = LAND ? 480 : 360, TH = LAND ? 270 : 640;
  const fc = files.length === 1 ? `[0:v]scale=${TW}:-1` :
    files.map((_, i) => `[${i}:v]scale=${TW}:-1[v${i}]`).join(';') + ';' + files.map((_, i) => `[v${i}]`).join('') +
    `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * TW}_${Math.floor(i / cols) * TH}`).join('|')}:fill=black`;
  ff([...files.flatMap(f => ['-i', f]), '-filter_complex', fc, '-frames:v', '1', path.join(out, 'sheet.jpg')]);
  console.log('contact sheet:', path.join(out, 'sheet.jpg'), `(${cols}x${rows}, in order of --shots)`);
}

if (opt('cover')) {
  const { browser, page, errors } = await openPage();
  const t0 = opt('t') != null ? +opt('t') : null;   // --plain: the bare frame without thumbnail text
  const t = flag('plain') || !(await page.evaluate(() => !!window.whatif.thumb)) ? (await page.evaluate(t => { const tt = t ?? window.whatif.cover; window.whatif.seek(tt); return tt; }, t0))
    : await page.evaluate(t => window.whatif.thumb(t), t0);
  await page.screenshot({ path: opt('cover'), type: 'jpeg', quality: 92 });
  console.log('wrote', opt('cover'), 'at t =', t);
  const nv = flag('plain') ? 1 : await page.evaluate(() => window.whatif.thumbs?.() ?? 1); report(errors); await browser.close();
  for (let i = 1; i < nv; i++) {   // A/B thumbnails: THUMB = [A, B, …] → cover-b.jpg, cover-c.jpg …
    const { browser: b2, page: p2, errors: e2 } = await openPage(), f = opt('cover').replace(/(\.\w+)$/, '-' + 'abcdefgh'[i] + '$1');
    const t2 = await p2.evaluate(([t, i]) => window.whatif.thumb(t, i), [t0, i]); await p2.screenshot({ path: f, type: 'jpeg', quality: 92 });
    console.log('wrote', f, 'at t =', t2, '(variant ' + 'ABCDEFGH'[i] + ')'); report(e2); await b2.close();
  }
}

async function renderAudio(wav) {
  const { browser, page, errors } = await openPage();
  const t0 = Date.now();
  const b64 = await page.evaluate(() => window.whatif.renderAudio(48000));
  writeFileSync(wav, Buffer.from(b64, 'base64'));
  const mx = await page.evaluate(() => window.whatif.mixInfo);   // v2.38: how far the narrator stays above music, ambience and sound effects
  if (mx) { console.log(`mix: voice ${mx.after} dB over the background while speaking (scene as written: ${mx.before} dB · tightest 2 s: ${mx.worst} dB at ${mx.worstT} s → ${mx.worstAfter} dB · target ${mx.clarity} dB)`);
    if (mx.before < 4) console.log(`MIX: the scene is much louder than the narrator around ${mx.worstT} s (${mx.worst} dB) — the engine pulls it down, but lower the ambience / effect volumes there (AUDIO.amb vol, hits v) or move the loud moment between two sentences`); }
  console.log('wrote', wav, `${Date.now() - t0} ms`); report(errors); await browser.close();
}
if (opt('audio')) await renderAudio(opt('audio'));

if (opt('remux')) {   // --remux out.mp4 : render audio again and swap it into the finished video (video stream copied)
  const video = opt('remux'), wav = video + '.wav';
  await renderAudio(wav);
  for (const v of [video, igPath(video)].filter(existsSync)) {
    const tmp = v.replace(/\.mp4$/, '') + '.part.mp4';
    ff(['-i', v, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', AF, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', tmp]);
    renameSync(tmp, v); console.log('new audio in', v);
  }
}

if (opt('video')) {
  const video = opt('video'), dir = video + '.frames', wav = video + '.wav';
  mkdirSync(dir, { recursive: true });
  const framesOnly = flag('frames-only');                       // CI shard: frames only, no audio / encode
  if (!framesOnly) await renderAudio(wav);
  if (opt('redo')) { const [a, b] = opt('redo').split('-').map(Number); for (let i = Math.floor(a * fps); i <= Math.ceil(b * fps); i++) rmSync(path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), { force: true }); }
  const probe = await openPage(); const dur = await probe.page.evaluate(() => window.whatif.dur); await probe.browser.close();
  const total = Math.round(dur * fps), fr = i => path.join(dir, `f${String(i).padStart(5, '0')}.jpg`);
  const [si, sn] = (opt('shard') || '0/1').split('/').map(Number);   // --shard i/N : contiguous frame block i of N (0-based)
  const lo = Math.floor(si * total / sn), hi = Math.floor((si + 1) * total / sn);
  const todo = [...Array(total).keys()].filter(i => i >= lo && i < hi && !(existsSync(fr(i)) && statSync(fr(i)).size > 0));
  console.log(`${total} frames at ${W}px, ${fps} fps · ${total - todo.length} already done · ${workers} worker(s)`);
  const started = Date.now(); let done = 0;
  await Promise.all([...Array(Math.min(workers, todo.length || 1)).keys()].map(async w => {
    if (!todo.length) return;
    const { browser, page, errors } = await openPage();
    for (let j = w; j < todo.length; j += workers) {
      const i = todo[j], tmp = fr(i) + '.part.jpg';
      await page.evaluate(t => window.whatif.seek(t), i / fps);
      await page.screenshot({ path: tmp, type: 'jpeg', quality: 92 });
      renameSync(tmp, fr(i)); done++;
      if (done % 30 === 0 || done === todo.length) {
        const per = (Date.now() - started) / done;
        console.log(`frame ${done}/${todo.length} · ${(per / 1000).toFixed(2)} s/frame · ~${Math.ceil((todo.length - done) * per / 60000)} min left`);
      }
    }
    report(errors); await browser.close();
  }));
  if (framesOnly) { console.log(`frames ${lo}-${hi - 1} done in ${Math.round((Date.now() - started) / 60000)} min`); process.exit(0); }
  const missing = [...Array(total).keys()].filter(i => !existsSync(fr(i)));
  if (missing.length) { console.log(`failed: ${missing.length} frames missing (first ${missing[0]})`); process.exit(1); }
  const tmpMp4 = video.replace(/\.mp4$/, '') + '.part.mp4';
  // master (YouTube): CRF 18, capped near YouTube's useful max (1440p ≈ 30 Mbps, 4K ≈ 60 Mbps)
  const cap = W >= 2160 ? 60 : W > 1080 ? 30 : 15;
  ff(['-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-i', wav, '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-profile:v', 'high', '-crf', draft ? '23' : '18',
    '-maxrate', cap + 'M', '-bufsize', 2 * cap + 'M', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-af', AF, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', tmpMp4]);
  renameSync(tmpMp4, video);
  // Instagram copy: 1080x1920 from the same frames (one encode only), ~12 Mbps VBR
  if (W > 1080 && !draft && flag('ig')) {   // Instagram copy only on request (--ig); default output is the YouTube master only
    const ig = igPath(video), tmpIg = ig.replace(/\.mp4$/, '') + '.part.mp4';
    ff(['-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-i', wav, '-map', '0:v', '-map', '1:a',
      '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-profile:v', 'high',
      '-b:v', '12M', '-maxrate', '15M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-r', String(fps),
      '-af', AF, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', tmpIg]);
    renameSync(tmpIg, ig); console.log('wrote', ig, `${(statSync(ig).size / 1e6).toFixed(1)} MB (Instagram 1080x1920)`);
  }
  if (flag('clean')) { rmSync(dir, { recursive: true, force: true }); rmSync(wav, { force: true }); }
  console.log('wrote', video, `${(statSync(video).size / 1e6).toFixed(1)} MB`, `in ${Math.round((Date.now() - started) / 60000)} min`);
  { const ql = path.join(path.dirname(new URL(import.meta.url).pathname), 'qa_lines.py');   // v3.0: stray 1–3 px lines through the picture (every 15th frame)
    if (existsSync(ql)) { const r = spawnSync('python3', [ql, dir, '--every', '15'], { encoding: 'utf8' }); if (r.stdout) process.stdout.write(r.stdout); } }
}
