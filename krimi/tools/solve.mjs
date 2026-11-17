#!/usr/bin/env node
// Red String – löst jeden Fall automatisch über die echte Spiellogik (js/logic.js) → SOLVE OK
//   node krimi/tools/solve.mjs [--cases <ordner mit index.json>] [-q]
// Prüft: kürzester Lösungsweg führt zu solved, jede falsche Anklage wird mit der richtigen Säule abgelehnt,
// perfekter Weg = Rang gold, apply() verändert die Eingabe nicht und ist deterministisch, migrate() übersteht alte/fremde Stände.
// Die Such-Helfer (closure, shortestPath, describe …) nutzt auch case-check.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCase } from '../js/case.js';
import * as L from '../js/logic.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const KRIMI = path.resolve(HERE, '..');
const arr = v => (Array.isArray(v) ? v : []);

// ---------- Fälle lesen ----------
export function readIndex(casesDir) {
  const f = path.join(casesDir, 'index.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const list = Array.isArray(d) ? d : d?.cases;
  if (!Array.isArray(list)) throw new Error('index.json: Liste der Fälle erwartet');
  return list;
}
export function readCase(casesDir, entry) {
  const dir = path.join(casesDir, entry.dir || entry.id);
  return { dir, raw: fs.readFileSync(path.join(dir, 'case.json'), 'utf8') };
}
export function readTexts(dir, lang) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'text', lang + '.json'), 'utf8')); } catch { return {}; }
}

// ---------- Aktionen aufzählen ----------
const sorted = a => [...a].sort();
const knowKey = (c, s, R) => sorted([...L.known(c, s)].filter(id => !R || R.has(id))).join(',');
function boardIds(c, s) { return new Set(L.cards(c, s).map(k => k.id)); }

// Aktionen, die Wissen hinzufügen könnten (Spur finden, Thema fragen, Vorhalten, richtigen Faden ziehen)
export function productive(c, s) {
  const out = [], k = L.known(c, s), b = boardIds(c, s);
  for (const cl of arr(c.clues)) if (!k.has(cl.id) && arr(cl.needs).every(n => k.has(n))) out.push({ type: 'find', clue: cl.id });
  for (const p of arr(c.people)) {
    if (p.lab) continue;
    for (const t of L.topicsFor(c, s, p.id)) {
      const st = arr(c.statements).filter(x => x.person === p.id && x.topic === t && !x.follow);
      if (st.some(x => !k.has(x.id))) out.push({ type: 'ask', person: p.id, topic: t });
    }
  }
  for (const x of arr(c.contradictions)) {
    if (!k.has(x.statement) || k.has(x.follow)) continue;
    const card = arr(x.cards).find(id => b.has(id));
    if (card) out.push({ type: 'present', statement: x.statement, card });
  }
  for (const d of arr(c.deductions)) if (!k.has(d.gives) && arr(d.from).every(id => b.has(id))) out.push({ type: 'thread', from: d.from.slice(), kind: d.kind });
  return out;
}

// Anklage mit gültigen Karten, falls alle drei Säulen auf der Pinnwand liegen
export function accuseAction(c, s) {
  const b = boardIds(c, s), so = c.solution, a = { type: 'accuse', who: so.who.slice() };
  for (const col of ['how', 'when', 'why']) { const card = arr(so.cards[col]).find(id => b.has(id)); if (!card) return null; a[col] = card; }
  return a;
}

// Alles Erreichbare (Wissen wächst nur → Fixpunkt = alles, was je erreichbar ist)
export function closure(c, s0 = L.newState(c)) {
  let s = s0; const steps = [];
  for (let guard = 0; guard < 10000; guard++) {
    const acts = productive(c, s);
    let moved = false;
    for (const a of acts) {
      const before = L.known(c, s).size;
      const r = L.apply(c, s, a);
      if (L.known(c, r.state).size > before) { s = r.state; steps.push(a); moved = true; }
    }
    if (!moved) break;
  }
  return { state: s, steps };
}

// Ids, die für irgendeinen Lösungsweg nötig sein könnten (Rückwärts-Hülle über alle Alternativen)
export function relevant(c) {
  const R = new Set(), stack = [];
  for (const col of ['how', 'when', 'why']) stack.push(...arr(c.solution.cards[col]));
  const clues = new Map(arr(c.clues).map(x => [x.id, x])), stmts = new Map(arr(c.statements).map(x => [x.id, x]));
  const topics = new Map(arr(c.topics).map(x => [x.id, x]));
  while (stack.length) {
    const id = stack.pop();
    if (R.has(id)) continue;
    R.add(id);
    for (const d of arr(c.deductions)) if (d.gives === id) stack.push(...d.from);
    if (clues.has(id)) stack.push(...arr(clues.get(id).needs));
    if (stmts.has(id)) {
      const st = stmts.get(id);
      if (st.follow) for (const x of arr(c.contradictions)) { if (x.follow === id) stack.push(x.statement, ...arr(x.cards)); }
      else stack.push(st.topic);
    }
    if (topics.has(id)) {
      stack.push(...arr(topics.get(id).after));
      for (const s of arr(c.statements)) if (arr(s.unlock).includes(id)) stack.push(s.id);
    }
  }
  return R;
}

// Kürzester Lösungsweg per Breitensuche über die echte Logik (nur Aktionen, die etwas Relevantes bringen)
export function shortestPath(c, cap = 300000) {
  const R = relevant(c);
  const start = L.newState(c);
  const q = [{ s: start, path: [] }], seen = new Set([knowKey(c, start, R)]);
  for (let i = 0; i < q.length; i++) {
    const { s, path } = q[i];
    const acc = accuseAction(c, s);
    if (acc) return { path: [...path, acc], states: seen.size, relevant: R };
    for (const a of productive(c, s)) {
      const r = L.apply(c, s, a);
      const before = L.known(c, s);
      if (![...L.known(c, r.state)].some(id => R.has(id) && !before.has(id))) continue;
      const key = knowKey(c, r.state, R);
      if (seen.has(key)) continue;
      seen.add(key);
      if (seen.size > cap) return { path: null, capped: true, states: seen.size, relevant: R };
      q.push({ s: r.state, path: [...path, a] });
    }
  }
  return { path: null, states: seen.size, relevant: R };
}

export function run(c, actions, s = L.newState(c)) {
  const results = [];
  for (const a of actions) { const r = L.apply(c, s, a); s = r.state; results.push(r.result); }
  return { state: s, results };
}

// ---------- Weg als Text ----------
function hhmm(m) { return m == null ? '' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
export function cardTitle(c, T, id) {
  const find = (list) => arr(list).find(x => x.id === id);
  const fill = (t, o) => String(t ?? id).replace(/\{time\}/g, hhmm(o?.at)).replace(/\{timeEnd\}/g, hhmm(o?.timeEnd));
  if (find(c.people)) return T[`person.${id}.name`] || id;
  if (find(c.places)) return T['place.' + id] || id;
  if (find(c.clues)) return T['clue.' + id] || id;
  const st = find(c.statements);
  if (st) { const t = T['stmt.' + id] || id; return `${T[`person.${st.person}.name`] || st.person}: „${t.length > 60 ? t.slice(0, 57) + '…' : t}“`; }
  const f = find(c.facts);
  if (f) return fill(T['fact.' + id], f);
  return id;
}
const KIND_DE = { red: 'rot', green: 'grün', blue: 'blau' };
export function describe(c, T, a) {
  const view = id => { for (const p of arr(c.places)) for (const v of arr(p.views)) if (v.id === id) return T['view.' + id] || id; return id; };
  switch (a.type) {
    case 'find': { const k = c.clues.find(x => x.id === a.clue); return `Spur finden (${k.find}, ${view(k.view)}): ${cardTitle(c, T, a.clue)}`; }
    case 'ask': return `${cardTitle(c, T, a.person)} fragen: ${T['topic.' + a.topic] || a.topic}`;
    case 'present': return `Vorhalten: ${cardTitle(c, T, a.card)} → ${cardTitle(c, T, a.statement)}`;
    case 'thread': {
      const d = c.deductions.find(d => [...d.from].sort().join() === [...a.from].sort().join() && d.kind === a.kind);
      return `Faden ${KIND_DE[a.kind] || a.kind}: ${a.from.map(id => cardTitle(c, T, id)).join(' + ')}${d ? ' → ' + cardTitle(c, T, d.gives) : ''}`;
    }
    case 'accuse': return `Anklage: ${a.who.map(id => cardTitle(c, T, id)).join(', ')} · Wie: ${cardTitle(c, T, a.how)} · Wann: ${cardTitle(c, T, a.when)} · Warum: ${cardTitle(c, T, a.why)}`;
    default: return JSON.stringify(a);
  }
}

// ---------- Prüfungen ----------
function deepFreeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; }
function lcg(seed) { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }
const accusable = c => arr(c.people).filter(p => !p.lab).map(p => p.id);

export function solveCase(c, T = {}) {
  const E = [], info = [];
  const err = m => E.push(m);
  const sp = shortestPath(c);
  if (!sp.path) { err(sp.capped ? `Suche abgebrochen nach ${sp.states} Zuständen` : 'kein Lösungsweg gefunden'); return { errors: E, info }; }
  const path = sp.path;
  info.push(`kürzester Lösungsweg (${path.length} Schritte, ${sp.states} Zustände durchsucht):`);
  path.forEach((a, i) => info.push(`  ${String(i + 1).padStart(2)}. ${describe(c, T, a)}`));

  // 1) Weg nachspielen
  const { state: end, results } = run(c, path);
  results.forEach((r, i) => { if (!r.ok) err(`Schritt ${i + 1} (${path[i].type}) schlägt fehl: ${JSON.stringify(r)}`); });
  if (!end.solved) err('Lösungsweg endet nicht mit solved');
  if (L.rank(c, end) !== 'gold') err(`perfekter Weg ergibt Rang ${L.rank(c, end)} statt gold`);

  // 2) Determinismus und Reinheit
  const again = run(c, path);
  if (JSON.stringify(again.state) !== JSON.stringify(end)) err('apply ist nicht deterministisch');
  const frozenStart = deepFreeze(L.newState(c));
  try {
    let s = frozenStart;
    for (const a of [...path, { type: 'hint' }, { type: 'event', id: c.objects[0].id, at: 1 }, { type: 'view', id: c.places[0].views[0]?.id ?? null }, { type: 'thread', from: accusable(c).slice(0, 2), kind: 'red' }, { type: 'nonsense' }]) {
      const r = L.apply(c, deepFreeze(s), a); s = r.state;
    }
  } catch (e) { err('apply verändert den Eingabezustand: ' + e.message); }

  // 3) Falsche Anklagen (vom Endzustand der Hülle aus, dort liegen alle Karten)
  const full = closure(c).state;
  const board = L.cards(c, full).map(k => k.id);
  const right = accuseAction(c, full);
  const people = accusable(c);
  const subsets = [];
  for (let m = 1; m < 1 << people.length; m++) subsets.push(people.filter((_, i) => m & (1 << i)));
  const so = c.solution;
  const isWho = w => w.length === so.who.length && so.who.every(x => w.includes(x));
  const expect = a => isWho(a.who) ? (['how', 'when', 'why'].find(col => !so.cards[col].includes(a[col])) || null) : 'who';
  let tested = 0, okCount = 0;
  const tryA = a => {
    tested++;
    const r = L.apply(c, full, { ...a, type: 'accuse' });
    const want = expect(a);
    if (r.result.ok !== !want || r.result.reject !== want) err(`Anklage ${JSON.stringify(a)} → ${JSON.stringify(r.result)}, erwartet reject ${want}`);
    if (!want) okCount++;
    return r;
  };
  for (const who of subsets) tryA({ who, how: right.how, when: right.when, why: right.why });
  for (const col of ['how', 'when', 'why']) for (const card of board) tryA({ ...right, [col]: card });
  const rnd = lcg(7);
  for (let i = 0; i < 4000; i++) {
    const pick = () => board[Math.floor(rnd() * board.length)];
    tryA({ who: subsets[Math.floor(rnd() * subsets.length)], how: pick(), when: pick(), why: pick() });
  }
  // Karten, die nicht auf der Pinnwand liegen, zählen nie (Start: keine Erkenntnisse)
  const early = L.apply(c, L.newState(c), right);
  if (early.result.ok) err('Anklage gelingt ohne die Karten auf der Pinnwand');
  info.push(`Anklagen geprüft: ${tested} (davon richtig: ${okCount}), alle falschen abgelehnt mit der ersten falschen Säule`);
  // Nach einer Fehlanklage bleibt der Fall lösbar, der Rang sinkt
  const wrongWho = subsets.find(w => !isWho(w));
  const last = path[path.length - 1], before = run(c, path.slice(0, -1)).state;
  if (wrongWho) {
    const s1 = L.apply(c, before, { ...last, who: wrongWho }).state;
    const s2 = L.apply(c, s1, last).state;
    if (!s2.solved) err('nach einer Fehlanklage ist der Fall nicht mehr lösbar');
    if (L.rank(c, s2) === 'gold') err('Fehlanklage kostet keinen Rang');
  }
  const hinted = L.apply(c, L.apply(c, before, { type: 'hint' }).state, last).state;
  info.push(`Rang: perfekt ${L.rank(c, end)}, mit 1 Hinweis ${L.rank(c, hinted)}`);

  // 4) Hinweise: jede Stufe 1–3 kommt vor, Text-Ids existieren im Fall
  let hs = L.newState(c);
  for (let i = 0; i < 3; i++) {
    const r = L.apply(c, hs, { type: 'hint' }); hs = r.state;
    if (!r.result.ok || r.result.level !== i + 1) err(`Hinweis ${i + 1}: Stufe ${r.result.level} statt ${i + 1}`);
    if (r.result.text && T && Object.keys(T).length && !T[r.result.text]) err(`Hinweistext ${r.result.text} fehlt`);
  }

  // 5) migrate
  const c2 = JSON.parse(JSON.stringify(c));
  const someClue = c.clues[0].id;
  c2.renamed = { ...(c.renamed || {}), zz_old_clue: someClue };
  const mid = run(c, path.slice(0, Math.max(1, path.length - 1))).state;
  const saved = JSON.parse(JSON.stringify(mid));
  saved.found = [...saved.found.filter(id => id !== someClue), 'zz_old_clue', 'zz_unknown_clue'];
  saved.heard.push('zz_unknown_stmt');
  saved.insights.push('zz_unknown_fact');
  saved.threads.push(['zz_a', 'zz_b', 'red'], [people[0], 'zz_unknown', 'blue'], 'kaputt', [people[0], people[1], 'purple']);
  saved.events.push({ id: 'zz_drawer', at: 3 }, { id: c.objects[0].id, at: 'x' });
  saved.view = 'zz_view';
  saved.extra = { unbekannt: true };
  delete saved.accusations;
  const m = L.migrate(c2, saved);
  if (!m.found.includes(someClue)) err('migrate wendet renamed nicht an');
  const allKnown = JSON.stringify(m);
  if (/zz_/.test(allKnown)) err('migrate lässt unbekannte Ids stehen: ' + allKnown.match(/zz_\w+/g).join(', '));
  if (!Array.isArray(m.accusations) || m.view !== null || m.v !== L.SAVE_VERSION || m.case !== c.id) err('migrate ergänzt fehlende Felder nicht');
  if (JSON.stringify(L.migrate(c2, JSON.parse(JSON.stringify(m)))) !== JSON.stringify(m)) err('migrate ist nicht idempotent');
  for (const bad of [null, 'x', 42, [], { case: 'anderer-fall', found: [someClue] }]) {
    const r = L.migrate(c, bad);
    if (JSON.stringify(r) !== JSON.stringify(L.newState(c))) err(`migrate(${JSON.stringify(bad)}) ergibt keinen frischen Stand`);
  }
  // Ein migrierter Stand ist weiter lösbar
  const cont = closure(c2, m).state, acc = accuseAction(c2, cont);
  if (!acc || !L.apply(c2, cont, acc).state.solved) err('migrierter Stand ist nicht mehr lösbar');
  // Mitten im Fall gespeichert, geladen, weitergespielt = gleiches Ergebnis
  const half = Math.floor(path.length / 2);
  const reloaded = L.migrate(c, JSON.parse(JSON.stringify(run(c, path.slice(0, half)).state)));
  const fin = run(c, path.slice(half), reloaded).state;
  if (JSON.stringify(fin) !== JSON.stringify(end)) err('Speichern/Laden mitten im Fall ändert das Ergebnis');
  info.push('migrate: renamed, unbekannte Ids, fehlende Felder, fremder Fall, Laden mitten im Fall – ok');
  return { errors: E, info, path, end };
}

// ---------- CLI ----------
function main() {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const quiet = args.includes('-q');
  const casesDir = path.resolve(opt('--cases') || path.join(KRIMI, 'cases'));
  let fails = 0;
  let list;
  try { list = readIndex(casesDir); } catch (e) { console.log('FEHLER ' + e.message); process.exit(1); }
  for (const entry of list) {
    let c;
    try { c = loadCase(readCase(casesDir, entry).raw); }
    catch (e) { console.log(`FEHLER ${entry.id}: ${e.message}`); fails++; continue; }
    const T = readTexts(path.join(casesDir, entry.dir || entry.id), 'de');
    const r = solveCase(c, T);
    console.log(`== ${c.id}`);
    if (!quiet) for (const l of r.info) console.log(l);
    for (const e of r.errors) console.log('FEHLER ' + e);
    fails += r.errors.length;
  }
  if (fails) { console.log(`${fails} Fehler`); process.exit(1); }
  console.log('SOLVE OK');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
