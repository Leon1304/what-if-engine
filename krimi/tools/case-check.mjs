#!/usr/bin/env node
// Red String – Prüfskript für alle Fälle → CASE OK
//   node krimi/tools/case-check.mjs [--cases <ordner mit index.json>] [--ui <krimi-ordner>] [--lock] [-q]
// Läuft ohne Browser auf der echten Spiellogik (js/logic.js). Prüft je Fall aus cases/index.json:
//   Schema und Ids (case.js), kein Text in case.json, Übersetzungen je Sprache (fehlend, überzählig, leer, Platzhalter, zu lang),
//   Lösbarkeits-Graph (Regeln 2, 3 + kürzester Lösungsweg als Text), Belege (Regel 1, 6), Eindeutigkeit (4, 10), Rate-Schutz (5),
//   Zeitleiste mit Wegzeiten (7), Nachstellung (8, 9), Sprache (11), Stufe, Ton-Sperrliste, Namen, ids.lock.json.
// Dazu die Oberflächentexte: t('…') / data-t="…" aus js/*.js und index.html gegen js/lang/<code>.json.
// --lock schreibt neue Ids in cases/ids.lock.json (nie entfernen). Fehler → Liste und Exit 1.
import fs from 'node:fs';
import path from 'node:path';
import { validateCase, textKeys, allIds, PLACEHOLDERS } from '../js/case.js';
import * as L from '../js/logic.js';
import { KRIMI, readIndex, readTexts, closure, shortestPath, describe, accuseAction, run } from './solve.mjs';

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const QUIET = args.includes('-q');
const CASES = path.resolve(opt('--cases') || path.join(KRIMI, 'cases'));
const UIROOT = path.resolve(opt('--ui') || KRIMI);
const REQUIRED_LANGS = ['de', 'en'];
const CASE_PREFIX = /^(meta|place|view|person|topic|stmt|clue|fact|accuse|hint|lab|solution|scene)\./;
const LOCK_KINDS = ['place', 'view', 'person', 'fact', 'topic', 'clue', 'statement', 'hint', 'object'];

const errors = [], warns = [];
let section = '';
const err = m => errors.push(`${section}: ${m}`);
const warn = m => warns.push(`${section}: ${m}`);
const info = m => { if (!QUIET) console.log(m); };
const arr = v => (Array.isArray(v) ? v : []);
const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));

const BLOCK = (() => { try { return readJSON(path.join(KRIMI, 'tools', 'blocklist.json')); } catch { return { words: {}, names: [] }; } })();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = w => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'iu');
function blockWords(lang, murder) {
  const W = BLOCK.words || {};
  const langs = W[lang] ? ['*', lang] : Object.keys(W);
  const out = [];
  for (const l of langs) { out.push(...arr(W[l]?.all)); if (!murder) out.push(...arr(W[l]?.murder)); }
  return [...new Set(out)].map(w => [w, wordRe(w)]);
}
const NAME_RES = arr(BLOCK.names).map(n => [n, wordRe(n)]);
function tone(obj, lang, murder, where) {
  const words = blockWords(lang, murder);
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'string') continue;
    for (const [w, re] of words) if (re.test(v)) err(`${where} ${lang} ${k}: Sperrwort „${w}“`);
    for (const [n, re] of NAME_RES) if (re.test(v)) warn(`${where} ${lang} ${k}: Name „${n}“ gehört zu einem echten Fall / einer bekannten Person`);
  }
}
const placeholders = s => new Set([...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]));
const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

// ---------- Sprachen der Oberfläche ----------
function uiLanguages() {
  const f = path.join(UIROOT, 'js', 'lang', 'languages.json');
  if (!fs.existsSync(f)) return null;
  try {
    const d = readJSON(f);
    const list = Array.isArray(d) ? d : Array.isArray(d?.languages) ? d.languages : Object.entries(d || {}).map(([code, v]) => ({ code, ...(v || {}) }));
    return list.filter(l => l && l.code);
  } catch (e) { return { error: e.message }; }
}

// ---------- Belege ----------
function sourcesOf(c, factId, depth = 0) {
  const fact = c.facts.find(f => f.id === factId);
  const lab = new Set(c.people.filter(p => p.lab).map(p => p.id));
  const clues = new Set(), persons = new Map();
  const addStmt = s => {
    if (!s || s.lie || s.guess || lab.has(s.person) || (fact && s.person === fact.person)) return;
    if (!persons.has(s.person)) persons.set(s.person, []);
    persons.get(s.person).push(s.id);
  };
  for (const k of c.clues) if (arr(k.supports).includes(factId)) clues.add(k.id);
  for (const s of c.statements) if (arr(s.claims).includes(factId)) addStmt(s);
  if (depth < 6) for (const d of c.deductions) if (d.gives === factId) for (const id of d.from) {
    if (c.clues.some(k => k.id === id)) clues.add(id);
    else if (c.statements.some(s => s.id === id)) addStmt(c.statements.find(s => s.id === id));
    else if (c.facts.some(f => f.id === id) && id !== factId) {
      const sub = sourcesOf(c, id, depth + 1);
      sub.clues.forEach(x => clues.add(x));
      for (const [p, l] of sub.persons) { if (fact && p === fact.person) continue; persons.set(p, [...(persons.get(p) || []), ...l]); }
    }
  }
  return { clues, persons, n: clues.size + persons.size };
}
const fmtSources = s => [...s.clues, ...[...s.persons].map(([p, l]) => `${p}(${[...new Set(l)].join('/')})`)].join(', ') || '–';

// erschließbar = als Erkenntnis erreichbar oder durch gefundene Spuren/gehörte Aussagen belegt
function derivable(c, full, factId) {
  if (full.insights.includes(factId)) return true;
  const s = sourcesOf(c, factId);
  return [...s.clues].some(id => full.found.includes(id)) || [...s.persons.values()].flat().some(id => full.heard.includes(id));
}

// ---------- ein Fall ----------
function checkCase(entry, lock, langs) {
  section = entry?.id || '?';
  const dir = path.join(CASES, entry.dir || entry.id || '');
  const file = path.join(dir, 'case.json');
  if (!fs.existsSync(file)) { err(`case.json fehlt (${path.relative(KRIMI, file)})`); return; }
  let c;
  try { c = readJSON(file); } catch (e) { err('case.json ist kein gültiges JSON: ' + e.message); return; }
  const schema = validateCase(c);
  schema.forEach(m => err('Schema: ' + m));
  if (schema.length) return;
  if (c.id !== entry.id) err(`index.json-Id ${entry.id} ≠ case.id ${c.id}`);
  if (entry.level !== c.meta.level) err(`index.json level ${entry.level} ≠ meta.level ${c.meta.level}`);
  if (entry.kind !== c.meta.kind) err(`index.json kind ${entry.kind} ≠ meta.kind ${c.meta.kind}`);
  const murder = c.meta.kind === 'murder';
  info(`== ${c.id} (Stufe ${c.meta.level}, ${c.meta.kind}, v${c.meta.version})`);

  // --- Übersetzungen ---
  const keys = textKeys(c), keyMap = new Map(keys.map(k => [k.key, k]));
  const tdir = path.join(dir, 'text');
  const files = fs.existsSync(tdir) ? fs.readdirSync(tdir).filter(f => f.endsWith('.json')).sort() : [];
  const T = {};
  for (const f of files) { try { T[f.replace(/\.json$/, '')] = readJSON(path.join(tdir, f)); } catch (e) { err(`text/${f}: kein gültiges JSON (${e.message})`); } }
  const need = new Set(REQUIRED_LANGS);
  if (Array.isArray(langs)) for (const l of langs) if (!l.draft) need.add(l.code);
  for (const l of need) if (!T[l]) err(`text/${l}.json fehlt`);
  const ref = T.en || T.de || {};
  for (const [lang, obj] of Object.entries(T)) {
    const draft = obj.draft === true;
    if (draft && need.has(lang)) err(`text/${lang}.json ist draft, muss aber vollständig sein`);
    const missing = keys.filter(k => !(k.key in obj)).map(k => k.key);
    const extra = Object.keys(obj).filter(k => !keyMap.has(k) && k !== 'draft' && !k.startsWith('_'));
    if (missing.length) (draft ? warn : err)(`text/${lang}.json: ${missing.length} Texte fehlen: ${missing.join(', ')}`);
    if (extra.length) err(`text/${lang}.json: ${extra.length} überzählige Ids (ohne Gegenstück in case.json): ${extra.join(', ')}`);
    for (const k of keys) {
      if (!(k.key in obj)) continue;
      const v = obj[k.key];
      if (typeof v !== 'string' || !v.trim()) { err(`text/${lang}.json ${k.key}: leer`); continue; }
      if (v.length > k.max) err(`text/${lang}.json ${k.key}: zu lang (${v.length} > ${k.max} Zeichen)`);
      const ph = placeholders(v);
      for (const p of ph) {
        if (!PLACEHOLDERS.includes(p)) err(`text/${lang}.json ${k.key}: unbekannter Platzhalter {${p}}`);
        if (p === 'time' && !k.time) err(`text/${lang}.json ${k.key}: {time}, aber der Baustein hat kein at`);
        if (p === 'timeEnd' && !k.timeEnd) err(`text/${lang}.json ${k.key}: {timeEnd}, aber der Baustein hat kein timeEnd`);
      }
      if (ref !== obj && typeof ref[k.key] === 'string' && !sameSet(ph, placeholders(ref[k.key])))
        err(`text/${lang}.json ${k.key}: Platzhalter {${[...ph].join('},{')}} ≠ ${T.en ? 'en' : 'de'} {${[...placeholders(ref[k.key])].join('},{')}}`);
    }
    tone(obj, lang, murder, `text/${lang}.json`);
  }
  const TX = T.de || T.en || {};
  info(`Texte: ${Object.keys(T).join(', ') || '–'} (${keys.length} Schlüssel je Sprache)`);

  // --- Lösbarkeit (Regeln 2, 3, 8) ---
  const start = L.newState(c);
  const { state: full, steps } = closure(c);
  const required = c.clues.filter(k => !k.optional);
  for (const k of required) if (!full.found.includes(k.id)) err(`Regel 2: Pflichtspur ${k.id} ist vom Start aus nicht erreichbar`);
  const optional = new Set(c.clues.filter(k => k.optional).map(k => k.id));
  const needsOf = id => arr(c.clues.find(k => k.id === id)?.needs);
  for (const k of required) {
    const seen = new Set(), stack = [...arr(k.needs)];
    while (stack.length) { const n = stack.pop(); if (seen.has(n)) continue; seen.add(n); if (optional.has(n)) err(`Regel 2: Pflichtspur ${k.id} hängt an der optionalen Spur ${n}`); stack.push(...needsOf(n)); }
    if (!k.view) err(`Pflichtspur ${k.id} braucht einen Standpunkt (view), von dem sie zu sehen ist`);
  }
  for (const d of c.deductions) if (!full.insights.includes(d.gives)) warn(`Schluss ${d.id} ist nie ziehbar (Karten ${d.from.join(', ')} nicht alle erreichbar)`);
  for (const s of c.statements) if (!full.heard.includes(s.id)) warn(`Aussage ${s.id} ist nie zu hören`);
  for (const t of c.topics) if (!full.topics.includes(t.id)) warn(`Thema ${t.id} öffnet sich nie`);
  const acc = accuseAction(c, full);
  if (!acc) err('Regel 2/8: die Lösungskarten sind nicht alle erreichbar');
  for (const col of ['how', 'when', 'why']) if (!derivable(c, full, c.solution[col])) err(`Regel 8: Lösungsfakt ${c.solution[col]} (${col}) ist nicht erschließbar`);

  const sp = shortestPath(c);
  if (!sp.path) err(sp.capped ? `Zustandssuche nach ${sp.states} Zuständen abgebrochen` : 'kein Lösungsweg gefunden');
  else {
    info(`Kürzester Lösungsweg (${sp.path.length} Schritte, ${sp.states} Zustände):`);
    sp.path.forEach((a, i) => info(`  ${String(i + 1).padStart(2)}. ${describe(c, TX, a)}`));
    const r = run(c, sp.path);
    if (!r.state.solved) err('kürzester Weg führt nicht zu solved');
  }
  info(`Erreichbar: ${full.found.length}/${c.clues.length} Spuren, ${full.heard.length}/${c.statements.length} Aussagen, ${full.insights.length} Erkenntnisse, ${full.topics.length}/${c.topics.length} Themen (${steps.length} Aktionen)`);

  // Regel 3: keine Sackgassen – jede Aktion lässt Wissen nur wachsen, danach bleibt der Fall lösbar
  const probes = [start];
  if (sp.path) { const half = run(c, sp.path.slice(0, Math.ceil(sp.path.length / 2))).state; probes.push(half); }
  probes.push(full);
  let tried = 0;
  for (const s of probes) {
    const k0 = L.known(c, s), board = L.cards(c, s).map(k => k.id);
    const acts = [];
    for (const k of c.clues) acts.push({ type: 'find', clue: k.id });
    for (const p of c.people) for (const t of c.topics) acts.push({ type: 'ask', person: p.id, topic: t.id });
    for (const st of s.heard) for (const b of board) acts.push({ type: 'present', statement: st, card: b });
    for (const d of c.deductions) for (const kind of L.THREAD_KINDS) acts.push({ type: 'thread', from: d.from, kind });
    for (let i = 0; i < board.length; i++) for (let j = i + 1; j < board.length; j++) acts.push({ type: 'thread', from: [board[i], board[j]], kind: 'red' });
    acts.push({ type: 'accuse', who: c.people.filter(p => !p.lab).map(p => p.id), how: board[0], when: board[0], why: board[0] });
    if (acc) acts.push(acc);
    acts.push({ type: 'hint' }, { type: 'event', id: c.objects[0].id, at: 1 }, { type: 'view', id: c.places[0].views?.[0]?.id ?? null }, { type: 'bogus' });
    const sampleTypes = new Set();
    for (const a of acts) {
      tried++;
      let r;
      try { r = L.apply(c, s, a); } catch (e) { err(`Regel 3: apply(${JSON.stringify(a)}) wirft: ${e.message}`); continue; }
      const k1 = L.known(c, r.state);
      for (const id of k0) if (!k1.has(id)) { err(`Regel 3: ${JSON.stringify(a)} löscht Wissen (${id})`); break; }
      if (s.solved && !r.state.solved) err(`Regel 3: ${a.type} macht „gelöst“ rückgängig`);
      // je Aktionsart einmal prüfen, dass der Fall danach lösbar bleibt
      const tk = a.type + (r.result?.ok ? '+' : '-');
      if (!sampleTypes.has(tk)) {
        sampleTypes.add(tk);
        const after = closure(c, r.state).state, ac = accuseAction(c, after);
        if (!ac || !L.apply(c, after, ac).state.solved) err(`Regel 3: nach ${JSON.stringify(a)} ist der Fall nicht mehr lösbar`);
      }
    }
  }
  info(`Regel 3: ${tried} Aktionen aus ${probes.length} Zuständen geprüft, Wissen geht nie verloren`);

  // --- Regel 1: zwei unabhängige Belege ---
  const check1 = new Map();
  for (const col of ['how', 'when', 'why']) check1.set(c.solution[col], 'Lösung/' + col);
  for (const d of c.deductions) if (!check1.has(d.gives)) check1.set(d.gives, 'Erkenntnis');
  for (const p of c.people) if (p.cleared && !check1.has(p.cleared)) check1.set(p.cleared, 'entlastet ' + p.id);
  for (const f of c.facts) if (f.refuted && !check1.has(f.refuted)) check1.set(f.refuted, 'widerlegt ' + f.id);
  for (const [fid, why] of check1) {
    const s = sourcesOf(c, fid);
    info(`Regel 1 ${fid} (${why}): ${s.n} Belege – ${fmtSources(s)}`);
    if (s.n < 2) err(`Regel 1: ${fid} (${why}) hat nur ${s.n} unabhängige(n) Beleg(e): ${fmtSources(s)}`);
    if (why.startsWith('Lösung') && !s.clues.size) err(`Regel 1: Lösungsfakt ${fid} braucht mindestens eine Spur als Beleg`);
  }
  // Regel 6: Lügen aufdeckbar
  const lies = c.statements.filter(s => s.lie);
  const core = new Set([c.solution.how, c.solution.when, c.solution.why, ...c.people.map(p => p.cleared).filter(Boolean)]);
  for (const s of lies) {
    if (!c.contradictions.some(x => x.statement === s.id)) err(`Regel 6: Lüge ${s.id} hat keinen Widerspruch`);
    else if (!c.contradictions.some(x => x.statement === s.id && x.cards.some(k => L.cards(c, full).some(b => b.id === k)))) err(`Regel 6: Widerspruch zu ${s.id} ist mit keiner erreichbaren Karte vorzuhalten`);
  }
  const coreLies = lies.filter(s => arr(s.claims).some(cl => core.has(String(cl).replace(/^!/, ''))));

  // --- Regel 4 und 10: Unschuldige entlasten, falsche Fährten auflösen ---
  for (const p of c.people) {
    if (p.lab || c.solution.who.includes(p.id)) continue;
    if (!p.suspect) { info(`Regel 4: ${p.id} ist nicht verdächtig (Anklage wird immer abgelehnt)`); continue; }
    if (!p.cleared) { err(`Regel 4: ${p.id} ist verdächtig, aber unschuldig und hat keinen Entlastungs-Fakt (people.cleared)`); continue; }
    if (!derivable(c, full, p.cleared)) err(`Regel 4: Entlastung ${p.cleared} für ${p.id} ist nicht erschließbar`);
  }
  for (const f of c.facts) {
    if (f.truth !== false) continue;
    const claimed = c.statements.filter(s => arr(s.claims).includes(f.id));
    if (!f.refuted) { if (claimed.length) err(`Regel 10: falsche Fährte ${f.id} (behauptet von ${claimed.map(s => s.id).join(', ')}) hat kein refuted`); continue; }
    if (!derivable(c, full, f.refuted)) err(`Regel 10: Widerlegung ${f.refuted} von ${f.id} ist nicht erschließbar`);
    if (c.clues.some(k => arr(k.supports).includes(f.id))) err(`Regel 10: Spur belegt den falschen Fakt ${f.id}`);
  }
  for (const s of c.statements) for (const cl of arr(s.claims)) {
    const f = c.facts.find(x => x.id === String(cl).replace(/^!/, ''));
    const saysFalse = (f?.truth === false) !== String(cl).startsWith('!');
    if (saysFalse && !s.lie && !s.guess) err(`Aussage ${s.id} behauptet etwas Falsches (${cl}) ohne lie/guess`);
    if (!saysFalse && s.lie) warn(`Aussage ${s.id} ist als Lüge markiert, behauptet aber Wahres (${cl})`);
  }

  // --- Regel 5: Rate-Schutz ---
  const board = L.cards(c, full).map(k => k.id), N = board.length;
  const suspects = c.people.filter(p => p.suspect).length;
  const W = 2 ** suspects - 1;
  let P = 1 / W;
  for (const col of ['how', 'when', 'why']) P *= c.solution.cards[col].filter(id => board.includes(id)).length / N;
  info(`Regel 5: ${N} Karten, ${W} Täter-Kombinationen → Rate-Wahrscheinlichkeit ${(P * 100).toPrecision(2)} %`);
  if (P > 0.01) err(`Regel 5: Rate-Wahrscheinlichkeit ${(P * 100).toFixed(2)} % > 1 %`);
  for (const col of ['how', 'when', 'why']) if (c.solution.cards[col].some(id => c.people.some(p => p.id === id))) err(`Regel 5: Personenkarte als ${col}-Karte – Tippen auf einen Verdächtigen darf nie reichen`);

  // --- Regel 7: Zeitleiste ---
  const walk = (a, b) => (a === b ? 0 : c.places.find(p => p.id === a)?.walk?.[b] ?? c.places.find(p => p.id === b)?.walk?.[a]);
  const timed = c.facts.filter(f => f.truth !== false && f.person && f.place && f.at != null);
  const byP = new Map();
  for (const f of timed) { if (!byP.has(f.person)) byP.set(f.person, []); byP.get(f.person).push(f); }
  let pairs = 0;
  for (const [p, list] of byP) {
    list.sort((a, b) => a.at - b.at);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const A = list[i], B = list[j], aEnd = A.timeEnd ?? A.at;
      if (A.place === B.place) continue;
      pairs++;
      const w = walk(A.place, B.place);
      if (w == null) { err(`Regel 7: keine Wegzeit zwischen ${A.place} und ${B.place} (${A.id}/${B.id})`); continue; }
      if (B.at <= aEnd) err(`Regel 7: ${p} ist zur selben Zeit an zwei Orten (${A.id} ${A.place} bis ${aEnd}, ${B.id} ${B.place} ab ${B.at})`);
      else if (B.at - aEnd < w) err(`Regel 7: ${p} schafft den Weg ${A.place} → ${B.place} nicht (${B.at - aEnd} min < ${w} min, ${A.id} → ${B.id})`);
    }
  }
  info(`Regel 7: ${timed.length} Fakten mit Zeit und Ort, ${pairs} Ortswechsel geprüft`);

  // --- Regel 9: Nachstellung ---
  for (const k of c.clues) if (k.born > c.meta.replay) err(`Regel 9: ${k.id}.born ${k.born} s liegt nach dem Ende der Nachstellung (${c.meta.replay} s)`);
  // --- Regel 11: lesbare Texte im Bild ---
  for (const o of c.objects) if (o.readable && o.langCheck !== true) err(`Regel 11: ${o.id} trägt lesbaren Text, langCheck: true fehlt (in jeder Sprache geprüft?)`);
  for (const h of c.hints) if (h.langCheck != null && h.langCheck !== true) err(`Regel 11: Hinweis ${h.id} langCheck muss true sein`);

  // --- Stufe ---
  const depth = sp.path ? sp.path.length : 0;
  const herrings = c.people.filter(p => p.cleared).length + c.facts.filter(f => f.truth === false).length;
  info(`Stufe ${c.meta.level}: ${required.length} Pflichtspuren, ${lies.length} Lügen (${coreLies.length} im Kern), ${herrings} falsche Fährten, Tiefe ${depth}`);
  const LV = { 1: { clues: 8, depth: 30 }, 2: { clues: 14, depth: 60 }, 3: { clues: 22, depth: 120 } }[c.meta.level];
  if (required.length > LV.clues) err(`Stufe ${c.meta.level}: ${required.length} Pflichtspuren > ${LV.clues}`);
  if (depth > LV.depth) err(`Stufe ${c.meta.level}: Lösungsweg ${depth} Schritte > ${LV.depth}`);
  if (c.meta.level === 1 && coreLies.length) err(`Stufe 1: keine Lüge im Kern erlaubt (${coreLies.map(s => s.id).join(', ')})`);
  if (c.meta.level === 3 && !lies.length) warn('Stufe 3 ohne Lüge – erwartet sind Lügen, die erst über die Zeitleiste fallen');
  if (c.meta.level >= 2 && !c.contradictions.length) warn(`Stufe ${c.meta.level} ohne Widerspruch zum Vorhalten`);

  // --- ids.lock ---
  const ids = allIds(c);
  const lockable = [...ids].filter(([, k]) => LOCK_KINDS.some(x => k.split('+').includes(x))).map(([id]) => id).sort();
  const locked = arr(lock[c.id]);
  for (const id of locked) if (!ids.has(id) && !(c.renamed && c.renamed[id])) err(`ids.lock: Id „${id}“ ist verschwunden (Umbenennen nur über renamed)`);
  const fresh = lockable.filter(id => !locked.includes(id));
  if (!locked.length) warn('noch nicht in ids.lock.json (vor dem Veröffentlichen: case-check.mjs --lock)');
  else if (fresh.length) info(`ids.lock: ${fresh.length} neue Ids (mit --lock eintragen): ${fresh.join(', ')}`);
  if (args.includes('--lock')) lock[c.id] = [...new Set([...locked, ...lockable])].sort();
}

// ---------- Oberflächentexte ----------
function checkUi(langs) {
  section = 'ui';
  const jsDir = path.join(UIROOT, 'js');
  const sources = [];
  if (fs.existsSync(jsDir)) for (const f of fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort()) sources.push(path.join(jsDir, f));
  const html = path.join(UIROOT, 'index.html');
  if (fs.existsSync(html)) sources.push(html);
  const used = new Map(); // key → erste Datei
  for (const f of sources) {
    // Kommentare entfernen (Beispiele in Kommentaren sind keine Aufrufe)
    const src = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;{}()])\/\/.*$/gm, '$1');
    const rel = path.relative(UIROOT, f);
    const add = k => { if (!k || k.includes('${') || k.endsWith('.') || CASE_PREFIX.test(k) && !k.startsWith('ui.')) return; if (!used.has(k)) used.set(k, rel); };
    for (const m of src.matchAll(/(?<![\w$])t\(\s*(['"])([^'"\n]+)\1/g)) add(m[2]);
    for (const m of src.matchAll(/data-t(?:-(?!vars)[a-z]+)?\s*=\s*(['"])([^'"\n]+)\1/g)) add(m[2]);
  }
  if (!sources.length) { warn('keine Oberflächendateien (js/*.js, index.html) gefunden'); return; }
  if (langs == null) { warn(`js/lang/languages.json fehlt noch – Oberflächentexte (${used.size} Schlüssel in ${sources.length} Dateien) nicht geprüft`); return; }
  if (langs.error) { err('js/lang/languages.json: ' + langs.error); return; }
  const codes = langs.map(l => l.code);
  for (const l of REQUIRED_LANGS) if (!codes.includes(l)) err(`languages.json: Sprache ${l} fehlt`);
  const flat = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o || {})) { const key = p ? p + '.' + k : k; if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out); else out[key] = v; } return out; };
  const D = {};
  for (const l of langs) {
    const f = path.join(UIROOT, 'js', 'lang', l.code + '.json');
    if (!fs.existsSync(f)) { (l.draft ? warn : (REQUIRED_LANGS.includes(l.code) ? err : err))(`js/lang/${l.code}.json fehlt`); continue; }
    try { D[l.code] = flat(readJSON(f)); } catch (e) { err(`js/lang/${l.code}.json: kein gültiges JSON (${e.message})`); }
  }
  const ref = D.en || D.de || {};
  for (const l of langs) {
    const d = D[l.code]; if (!d) continue;
    const missing = [...used.keys()].filter(k => !(k in d));
    if (missing.length) (l.draft ? warn : err)(`js/lang/${l.code}.json: ${missing.length} Texte fehlen: ${missing.slice(0, 40).map(k => `${k} (${used.get(k)})`).join(', ')}${missing.length > 40 ? ' …' : ''}`);
    const extra = Object.keys(d).filter(k => !used.has(k) && !k.startsWith('_') && k !== 'draft');
    if (extra.length) warn(`js/lang/${l.code}.json: ${extra.length} Schlüssel ohne festen t()-Aufruf (evtl. dynamisch): ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' …' : ''}`);
    for (const [k, v] of Object.entries(d)) {
      if (typeof v === 'string' && !v.trim()) err(`js/lang/${l.code}.json ${k}: leer`);
      if (d !== ref && typeof v === 'string' && typeof ref[k] === 'string' && !sameSet(placeholders(v), placeholders(ref[k]))) err(`js/lang/${l.code}.json ${k}: Platzhalter weichen von ${D.en ? 'en' : 'de'} ab`);
    }
    // Oberfläche: nur die harte Sperrliste (Wörter wie „Mord“ dürfen in Einstellungen vorkommen)
    const words = blockWords(l.code, true);
    for (const [k, v] of Object.entries(d)) if (typeof v === 'string') for (const [w, re] of words) if (re.test(v)) err(`js/lang/${l.code}.json ${k}: Sperrwort „${w}“`);
  }
  if (!Object.keys(D).length) warn('noch keine js/lang/<code>.json vorhanden');
  console.log(`ui: ${used.size} Schlüssel aus ${sources.length} Dateien, Sprachen ${codes.join(', ')}`);
}

// ---------- Ablauf ----------
let index;
section = 'index';
try { index = readIndex(CASES); } catch (e) { err('cases/index.json: ' + e.message); index = []; }
const ids = new Set();
for (const e of index) {
  if (!e || !e.id || !e.dir) err(`Eintrag ohne id/dir: ${JSON.stringify(e)}`);
  else if (ids.has(e.id)) err(`Fall ${e.id} doppelt`); else ids.add(e.id);
}
const lockFile = path.join(CASES, 'ids.lock.json');
let lock = {};
if (fs.existsSync(lockFile)) { try { lock = readJSON(lockFile); } catch (e) { section = 'ids.lock'; err('kein gültiges JSON: ' + e.message); } }
for (const id of Object.keys(lock)) if (!id.startsWith('_') && !ids.has(id)) { section = 'ids.lock'; err(`veröffentlichter Fall ${id} fehlt in index.json`); }
const langs = uiLanguages();
for (const e of index) if (e && e.id) { checkCase(e, lock, Array.isArray(langs) ? langs : null); if (!QUIET) console.log(''); }
checkUi(langs);
if (args.includes('--lock') && !errors.length) { fs.writeFileSync(lockFile, '{\n' + Object.entries(lock).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v).replace(/","/g, '", "')}`).join(',\n') + '\n}\n'); console.log('ids.lock.json geschrieben'); }

for (const w of warns) console.log('WARN ' + w);
for (const e of errors) console.log('FEHLER ' + e);
if (errors.length) { console.log(`${errors.length} Fehler`); process.exit(1); }
console.log('CASE OK');
