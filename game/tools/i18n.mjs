// Language check: every German text has an English translation.   node game/tools/i18n.mjs [--static] [--list]
// 1. static: string literals in T('…') / TN(n, '…', '…') in js/*.js, data-t elements in index.html, label/text/found/locked_msg/item_label (or name) of interactives
//    in map.glb → must be keys in the English dictionary (js/lang/en.js); T(`…${x}…`) is an error (use {x} placeholders).
//    Also lists string literals with German letters (äöüß) outside T() as "unwrapped" (error unless marked // i18n-ok on that line).
// 2. runtime (skipped with --static): game in English, all handbook chapters, backpack, build menu, pause, map, album, quests …
//    → T() calls without translation (window.__i18nMissing) and visible text with German letters.
// Prints I18N OK when nothing is missing.
import fs from 'fs'; import path from 'path'; import http from 'http';
const GAME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ARGS = process.argv.slice(2), STATIC = ARGS.includes('--static'), LIST = ARGS.includes('--list');
const EN = (await import(path.join(GAME, 'js/lang/en.js'))).default;
const errors = [], unwrapped = [], need = new Map();     // German text → first place it was found
const want = (de, where) => { if (de && !need.has(de)) need.set(de, where); };
const GERMAN = /[äöüÄÖÜß]/;
const GERMAN_WORDS = /\b(und|der|das|nicht|mit|ist|ein|eine|einen|auf|für|zum|zur|dem|ich|dein|deine|sich|noch|kein|keine|oder|wird|bei|aus|nach|schon|auch|hier|wenn|Spielstand|Schwierigkeit)\b/;

// ---- string literal scanner (', ", ` without ${})
function readLit(src, i) {
  const q = src[i]; if (q !== '\'' && q !== '"' && q !== '`') return null;
  let s = '', j = i + 1;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') { const n = src[j + 1]; s += n === 'n' ? '\n' : n === 't' ? '\t' : n; j++; continue; }
    if (q === '`' && c === '$' && src[j + 1] === '{') return { dyn: true, end: j };
    if (c === q) return { s, end: j + 1 };
    s += c;
  }
  return null;
}
const skipWs = (src, i) => { while (i < src.length && /\s/.test(src[i])) i++; return i; };
const lineOf = (src, i) => src.slice(0, i).split('\n').length;

for (const f of fs.readdirSync(path.join(GAME, 'js')).filter(f => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(GAME, 'js', f), 'utf8');
  if (f === 'i18n.js') continue;
  const inT = [];                                          // ranges of literals that are T() arguments
  const re = /\b(TN?)\(/g; let m;
  while ((m = re.exec(src))) {
    if (/[\w.$]/.test(src[m.index - 1] || '')) continue;
    let i = skipWs(src, m.index + m[0].length);
    const lits = [];
    if (m[1] === 'TN') {                                    // skip the count argument
      let depth = 0; for (; i < src.length; i++) { const c = src[i]; if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--; else if (c === ',' && depth === 0) break; }
      i = skipWs(src, i + 1); for (let k = 0; k < 2; k++) { const L = readLit(src, i); if (!L) break; lits.push([i, L]); i = skipWs(src, L.end || i); if (src[i] === ',') i = skipWs(src, i + 1); }
    } else { const L = readLit(src, i); if (L) lits.push([i, L]); }
    for (const [at, L] of lits) {
      if (L.dyn) { errors.push(`${f}:${lineOf(src, at)}  T() with \${…} – use {name} placeholders`); continue; }
      inT.push([at, L.end]); want(L.s, `${f}:${lineOf(src, at)}`);
    }
  }
  // unwrapped German literals (skip comments roughly: only code before // on the line)
  const lines = src.split('\n'); let pos = 0;
  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln];
    if (!line.includes('i18n-ok') && GERMAN.test(line)) {
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '/' && line[i + 1] === '/') break;
        if (c === '/' && line[i + 1] === '*') { const e = line.indexOf('*/', i + 2); if (e < 0) break; i = e + 1; continue; }
        if (c === '\'' || c === '"' || c === '`') {
          const L = readLit(line, i); if (!L) break;
          const end = L.end || line.length, abs = pos + i;
          const text = L.dyn ? line.slice(i + 1, end) : L.s;
          if (GERMAN.test(text) && !inT.some(([a, b]) => abs >= a && abs < b)) unwrapped.push(`${f}:${ln + 1}  ${text.slice(0, 90)}`);
          if (L.dyn) { // jump past the template literal roughly: continue after the closing backtick on this line
            const close = line.indexOf('`', end + 1); if (close < 0) break; i = close; continue; }
          i = end - 1;
        }
      }
    }
    pos += line.length + 1;
  }
}

// ---- index.html: data-t elements (German innerHTML is the key) and data-t-title
const html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
{
  const re = /<(\w+)([^>]*\sdata-t(?:\s|=|(?=>))[^>]*)>/g; let m;
  while ((m = re.exec(html))) {
    const tag = m[1], start = m.index + m[0].length; let depth = 1, i = start;
    const open = new RegExp(`<${tag}[\\s>]`, 'g'), close = new RegExp(`</${tag}>`, 'g');
    while (depth > 0) { open.lastIndex = close.lastIndex = i; const o = open.exec(html), c = close.exec(html); if (!c) break; if (o && o.index < c.index) { depth++; i = o.index + 1; } else { depth--; i = c.index + (depth ? 1 : 0); } }
    want(html.slice(start, i).trim(), `index.html:${lineOf(html, m.index)}`);
  }
  for (const t of html.matchAll(/data-t-title[^>]*?\stitle="([^"]*)"|\stitle="([^"]*)"[^>]*?data-t-title/g)) want(t[1] || t[2], 'index.html title');
}

// ---- map.glb: interactives' label / text (or node name if there is no label)
{
  const buf = fs.readFileSync(path.join(GAME, 'map.glb'));
  const len = buf.readUInt32LE(12), json = JSON.parse(buf.slice(20, 20 + len).toString('utf8'));
  for (const n of json.nodes || []) {
    const u = n.extras || {}; if (!(u.interact || u.ladder)) continue;
    want(u.label || n.name, `map.glb ${n.name}`); for (const k of ['text', 'found', 'locked_msg', 'item_label']) if (typeof u[k] === 'string') want(u[k], `map.glb ${n.name} ${k}`);
  }
}

const missing = [...need].filter(([de]) => EN[de] === undefined);
const unused = Object.keys(EN).filter(k => !need.has(k));
console.log(`static: ${need.size} texts, ${missing.length} without English, ${unwrapped.length} unwrapped German literals, ${unused.length} dictionary entries not found statically (dynamic or stale)`);
for (const [de, w] of missing.slice(0, LIST ? 1e9 : 40)) console.log(`  MISSING ${w}  ${JSON.stringify(de).slice(0, 120)}`);
for (const u of unwrapped.slice(0, LIST ? 1e9 : 40)) console.log(`  UNWRAPPED ${u}`);
for (const e of errors) console.log(`  ERROR ${e}`);
if (LIST) for (const u of unused) console.log(`  UNUSED ${JSON.stringify(u).slice(0, 120)}`);
let bad = missing.length + unwrapped.length + errors.length;

// ---- runtime in English
if (!STATIC) {
  const { chromium } = await import('playwright');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
  const srv = http.createServer((q, r) => { const p = path.join(GAME, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => { console.log('  PAGE ERROR', e.message); bad++; });
  const base = `http://localhost:${srv.address().port}/index.html`;
  // allowed German-looking words in English text: proper names in the world
  const ALLOW = /Glück auf|Waldtank|Tannbach|Hirschkopf|Falkenstein|Steinberg|Müller|Grün|Jäger|Bärbel|Jürgen|Günther|Lüdtke/g;
  const seen = new Set(), germanText = new Map();
  const collect = async (what) => {
    const r = await page.evaluate(() => ({ miss: window.__i18nMissing || [], text: document.body.innerText }));
    for (const m of r.miss) seen.add(m);
    for (const line of r.text.split('\n')) { const l = line.replace(ALLOW, ''); if ((GERMAN.test(l) || GERMAN_WORDS.test(l)) && !germanText.has(line.trim())) germanText.set(line.trim(), what); }
  };
  await page.goto(`${base}?lang=en`); await page.waitForFunction(() => window.__game, null, { timeout: 120000 }); await page.waitForTimeout(500); await collect('start menu');
  await page.goto(`${base}?lang=en&autostart=1&t=21&power=1&give=axt,messer,pistole,karte`); await page.waitForFunction(() => window.__game, null, { timeout: 120000 }); await page.waitForTimeout(1500);
  await collect('in game');
  // panels through the game's own hooks where they exist (window.__game / __ui / __book …), keys otherwise
  for (const key of ['Tab', 'Escape', 'g', 'Escape', 'm', 'Escape', 'j', 'Escape']) { await page.keyboard.press(key); await page.waitForTimeout(250); await collect(`key ${key}`); }
  for (let ch = 0; ch < 40; ch++) {
    const ok = await page.evaluate(n => { const b = window.__book; if (!b || !b.chapters || n >= b.chapters.length) return false; b.show(true, n); return true; }, ch).catch(() => false);
    if (!ok) break; await page.waitForTimeout(80); await collect(`handbook chapter ${ch}`);
  }
  if (fs.existsSync(path.join(GAME, 'tools/i18n-extra.mjs'))) { const extra = (await import(path.join(GAME, 'tools/i18n-extra.mjs'))).default; await extra(page, collect); }
  await browser.close(); srv.close();
  const rtMissing = [...seen].filter(de => EN[de] === undefined);
  console.log(`runtime: ${rtMissing.length} T() texts without English, ${germanText.size} visible lines with German letters`);
  for (const m of rtMissing.slice(0, LIST ? 1e9 : 40)) console.log(`  RUNTIME-MISSING ${JSON.stringify(m).slice(0, 140)}`);
  for (const [l, w] of [...germanText].slice(0, LIST ? 1e9 : 40)) console.log(`  GERMAN-VISIBLE (${w}) ${l.slice(0, 140)}`);
  bad += rtMissing.length + germanText.size;
}
console.log(bad ? `I18N: ${bad} problems` : 'I18N OK');
process.exit(bad ? 1 : 0);
