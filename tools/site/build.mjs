#!/usr/bin/env node
// Baut die Spiele-Seite: Übersicht (hub/) + jedes Spiel mit `game.json` in einem Ordner der Repo-Wurzel → _site/
// Ein neues Spiel erscheint automatisch, sobald sein Ordner eine game.json hat (Felder: docs/spiele-seite.md).
//   node tools/site/build.mjs                 → _site/ bauen
//   node tools/site/build.mjs --serve [port]  → bauen und lokal zeigen (Standard 8080)
//   node tools/site/build.mjs --check         → nur Manifeste prüfen (Exit 1 bei Fehlern)
//   node tools/site/build.mjs --unchanged [--from A --to B]
//        Exit 0 = für die Seite hat sich nichts geändert (Netlify „ignore“: Build überspringen), Exit 1 = bauen.
//        Ohne --from/--to gelten Netlifys $CACHED_COMMIT_REF/$COMMIT_REF.
import fs from 'fs';
import path from 'path';
import http from 'http';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, '_site');
const HUB = path.join(ROOT, 'hub');
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
// Was nie online geht, wenn ein Spiel keine `files`-Liste hat
const SKIP = new Set(['tools', 'blender', 'node_modules', 'package.json', 'package-lock.json', 'game.json', '.DS_Store']);
const SITE_PATHS = ['hub/', 'tools/site/', 'netlify.toml'];
const STATUS = new Set(['neu', 'spielbar', 'beta', 'bald']);

const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

function findGames() {
  const games = [], errors = [];
  for (const d of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('.') || d.name.startsWith('_') || ['node_modules', 'hub', 'work'].includes(d.name)) continue;
    const mf = path.join(ROOT, d.name, 'game.json');
    if (!fs.existsSync(mf)) continue;
    let g;
    try { g = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch (e) { errors.push(`${d.name}/game.json: kein gültiges JSON (${e.message})`); continue; }
    const err = m => errors.push(`${d.name}/game.json: ${m}`);
    if (!g.title) err('„title“ fehlt');
    if (!g.tagline) err('„tagline“ fehlt');
    if (!fs.existsSync(path.join(ROOT, d.name, g.entry || 'index.html'))) err(`Startdatei ${g.entry || 'index.html'} fehlt`);
    if (g.status && !STATUS.has(g.status)) err(`„status“ muss eines von ${[...STATUS].join(', ')} sein`);
    const coverFile = g.cover;
    if (g.cover && !fs.existsSync(path.join(ROOT, d.name, g.cover))) { console.warn(`⚠ ${d.name}: Cover ${g.cover} fehlt – die Übersicht zeigt ein Ersatzbild (node tools/site/covers.mjs ${d.name})`); g.cover = null; }
    for (const f of g.files || []) if (f !== coverFile && !fs.existsSync(path.join(ROOT, d.name, f))) err(`Datei/Ordner „${f}“ aus „files“ fehlt`);
    const updated = git('log', '-1', '--format=%cs', '--', d.name) || g.updated || null;
    const added = g.added || git('log', '--reverse', '--format=%cs', '--', d.name).split('\n')[0] || updated;
    games.push({
      id: d.name, path: `${d.name}/${g.entry && g.entry !== 'index.html' ? g.entry : ''}`,
      title: g.title, tagline: g.tagline, description: g.description || '', genre: g.genre || '',
      tags: g.tags || [], controls: g.controls || [], status: g.status || 'spielbar',
      color: g.color || '#6b7cff', emoji: g.emoji || '🎮', cover: g.cover ? `${d.name}/${g.cover}` : null,
      save: g.save || null, order: g.order ?? 100, added, updated, files: g.files || null,
    });
  }
  games.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'de'));
  return { games, errors };
}

function copyGame(g) {
  const src = path.join(ROOT, g.id), dst = path.join(OUT, g.id);
  fs.mkdirSync(dst, { recursive: true });
  const list = g.files ? [...new Set([g.path.slice(g.id.length + 1) || 'index.html', ...g.files, ...(g.cover ? [g.cover.slice(g.id.length + 1)] : [])])]
    : fs.readdirSync(src).filter(f => !SKIP.has(f) && !f.endsWith('.md'));
  for (const f of list) {
    const s = path.join(src, f);
    if (!fs.existsSync(s)) continue;
    fs.cpSync(s, path.join(dst, f), { recursive: true, filter: p => !p.split(path.sep).some(x => x === '.DS_Store' || x === 'node_modules') });
  }
}

function build() {
  const { games, errors } = findGames();
  if (errors.length) { for (const e of errors) console.error('✗ ' + e); process.exit(1); }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const g of games) if (g.status !== 'bald') copyGame(g);
  const pub = games.map(({ files, order, ...g }) => g);
  const built = new Date().toISOString();
  fs.cpSync(HUB, OUT, { recursive: true });
  // Spieleliste direkt in die Seite (kein Nachladen nötig) und zusätzlich als games.json
  const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')
    .replace(/<script id="games-data" type="application\/json">[\s\S]*?<\/script>/,
      `<script id="games-data" type="application/json">${JSON.stringify({ built, games: pub }).replace(/</g, '\\u003c')}</script>`);
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  fs.writeFileSync(path.join(OUT, 'games.json'), JSON.stringify({ built, games: pub }, null, 2));
  let bytes = 0; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : bytes += fs.statSync(p).size; } }; walk(OUT);
  console.log(`SITE OK – ${games.length} Spiele (${games.map(g => g.title).join(', ')}), ${(bytes / 1e6).toFixed(1)} MB in _site/`);
  return games;
}

function unchanged() {
  const from = arg('--from', process.env.CACHED_COMMIT_REF), to = arg('--to', process.env.COMMIT_REF || 'HEAD');
  if (!from || /^0+$/.test(from) || from === to) { console.log('bauen: kein Vergleichsstand'); process.exit(1); }
  if (!git('rev-parse', '--verify', '-q', from + '^{commit}')) { console.log('bauen: Vergleichsstand unbekannt'); process.exit(1); }
  const diff = git('diff', '--name-only', from, to);
  const dirs = findGames().games.map(g => g.id + '/');
  const live = f => !/(^|\/)(tools|blender)\//.test(f.slice(f.indexOf('/') + 1)) && !f.endsWith('.md');
  const hit = diff.split('\n').filter(Boolean).find(f => SITE_PATHS.some(p => f.startsWith(p)) || (dirs.some(d => f.startsWith(d)) && live(f)) || /^[^/]+\/game\.json$/.test(f));
  if (hit) { console.log('bauen: ' + hit); process.exit(1); }
  console.log('überspringen: keine Änderung an Spielen oder Übersicht'); process.exit(0);
}

if (args.includes('--unchanged')) unchanged();
else if (args.includes('--check')) { const { games, errors } = findGames(); for (const e of errors) console.error('✗ ' + e); if (errors.length) process.exit(1); console.log(`MANIFEST OK – ${games.length} Spiele`); }
else {
  build();
  if (args.includes('--serve')) {
    const port = +arg('--serve', 8080) || 8080;
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
    http.createServer((q, r) => {
      let p = path.join(OUT, decodeURIComponent(q.url.split('?')[0]));
      if (!p.startsWith(OUT)) { r.writeHead(403); return r.end(); }
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) { r.writeHead(404); return r.end('404'); }
      r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
    }).listen(port, () => console.log(`→ http://localhost:${port}/`));
  }
}
