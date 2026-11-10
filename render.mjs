// render.mjs — headless renderer for /what-if pages (frame-exact, deterministic)
//   node render.mjs page.html --shots 0.5,3,8,12 [--out shots] [--w 540]   → PNGs + <out>/sheet.jpg (contact sheet)
//   node render.mjs page.html --video out.mp4 [--w 1440 (2K, default)|1080|2160] [--fps 30] [--workers 2] [--draft] [--redo 10.2-14.2] [--clean] [--no-ig]
//     → out.mp4 (master, YouTube: CRF 18) + out-ig.mp4 (Instagram: 1080x1920, ~12 Mbps) when --w > 1080
//   node render.mjs page.html --cover cover.jpg [--t 1.2]
//   node render.mjs page.html --audio out.wav
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
const html = /^\s*<!doctype/i.test(src) ? src : '<!doctype html><html><head><meta charset="utf-8"></head><body>' + src + '</body></html>';

async function openPage() {
  const browser = await chromium.launch({
    executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined
  });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: W / 1080, ignoreHTTPSErrors: true });
  await ctx.addInitScript(() => { window.__EXPORT__ = true; });
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (url === 'http://whatif.local/') return route.fulfill({ contentType: 'text/html', body: html });
    const m = url.match(/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\/(.*)$/);
    if (m) return route.fulfill({ contentType: 'application/javascript', body: readFileSync(path.join(THREE_DIR, m[1])) });
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
  await page.evaluate(async w => { await document.fonts.ready; window.whatif.setRenderWidth(w); window.whatif.seek(0); }, W);
  return { browser, page, errors };
}
const report = errors => { if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 12).join('\n')); };
const AF = 'loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000', igPath = v => v.replace(/\.mp4$/, '') + '-ig.mp4';
const ff = args => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); if (r.status !== 0) { console.log('ffmpeg failed'); process.exit(1); } };

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
  const info = await page.evaluate(() => window.whatif.info());
  console.log('scene:', JSON.stringify(info));
  report(errors); await browser.close();
  const cols = Math.min(4, files.length), rows = Math.ceil(files.length / cols);
  const fc = files.length === 1 ? '[0:v]scale=360:-1' :
    files.map((_, i) => `[${i}:v]scale=360:-1[v${i}]`).join(';') + ';' + files.map((_, i) => `[v${i}]`).join('') +
    `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 360}_${Math.floor(i / cols) * 640}`).join('|')}:fill=black`;
  ff([...files.flatMap(f => ['-i', f]), '-filter_complex', fc, '-frames:v', '1', path.join(out, 'sheet.jpg')]);
  console.log('contact sheet:', path.join(out, 'sheet.jpg'), `(${cols}x${rows}, in order of --shots)`);
}

if (opt('cover')) {
  const { browser, page, errors } = await openPage();
  const t = +opt('t', await page.evaluate(() => window.whatif.cover));
  await page.evaluate(t => window.whatif.seek(t), t);
  await page.screenshot({ path: opt('cover'), type: 'jpeg', quality: 92 });
  console.log('wrote', opt('cover'), 'at t =', t); report(errors); await browser.close();
}

async function renderAudio(wav) {
  const { browser, page, errors } = await openPage();
  const t0 = Date.now();
  const b64 = await page.evaluate(() => window.whatif.renderAudio(48000));
  writeFileSync(wav, Buffer.from(b64, 'base64'));
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
  await renderAudio(wav);
  if (opt('redo')) { const [a, b] = opt('redo').split('-').map(Number); for (let i = Math.floor(a * fps); i <= Math.ceil(b * fps); i++) rmSync(path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), { force: true }); }
  const probe = await openPage(); const dur = await probe.page.evaluate(() => window.whatif.dur); await probe.browser.close();
  const total = Math.round(dur * fps), fr = i => path.join(dir, `f${String(i).padStart(5, '0')}.jpg`);
  const todo = [...Array(total).keys()].filter(i => !(existsSync(fr(i)) && statSync(fr(i)).size > 0));
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
  const tmpMp4 = video.replace(/\.mp4$/, '') + '.part.mp4';
  // master (YouTube): CRF 18, capped near YouTube's useful max (1440p ≈ 30 Mbps, 4K ≈ 60 Mbps)
  const cap = W >= 2160 ? 60 : W > 1080 ? 30 : 15;
  ff(['-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-i', wav, '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-profile:v', 'high', '-crf', draft ? '23' : '18',
    '-maxrate', cap + 'M', '-bufsize', 2 * cap + 'M', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-af', AF, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', tmpMp4]);
  renameSync(tmpMp4, video);
  // Instagram copy: 1080x1920 from the same frames (one encode only), ~12 Mbps VBR
  if (W > 1080 && !draft && !flag('no-ig')) {
    const ig = igPath(video), tmpIg = ig.replace(/\.mp4$/, '') + '.part.mp4';
    ff(['-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-i', wav, '-map', '0:v', '-map', '1:a',
      '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-profile:v', 'high',
      '-b:v', '12M', '-maxrate', '15M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-r', String(fps),
      '-af', AF, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', tmpIg]);
    renameSync(tmpIg, ig); console.log('wrote', ig, `${(statSync(ig).size / 1e6).toFixed(1)} MB (Instagram 1080x1920)`);
  }
  if (flag('clean')) { rmSync(dir, { recursive: true, force: true }); rmSync(wav, { force: true }); }
  console.log('wrote', video, `${(statSync(video).size / 1e6).toFixed(1)} MB`, `in ${Math.round((Date.now() - started) / 60000)} min`);
}
