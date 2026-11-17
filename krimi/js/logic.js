// Red String – Spiellogik: Wissen, Themen, Vorhalten, Fäden/Schlüsse, Anklage, Hinweise, Rang, Spielstand-Migration.
// Rein und deterministisch: keine DOM-/Node-APIs, keine Zeit, kein Zufall. apply() verändert die Eingabe nie.
// Der Spielstand enthält nur Ids und Zahlen (JSON-fähig, sprachunabhängig). Siehe README „Logik-API“.

export const SAVE_VERSION = 1;
export const THREAD_KINDS = ['red', 'green', 'blue'];

// Rang: Punkte = 3 je Fehlanklage + 1 je Hinweis + 0,5 je losem Faden über FREE_LOOSE hinaus
const RANK = { gold: 1, silver: 6, freeLoose: 2 };

const arr = v => (Array.isArray(v) ? v : []);
const uniq = a => [...new Set(a)];

// ---------- Index je Fall (einmal gebaut, im WeakMap gemerkt) ----------
const IDX = new WeakMap();
function ix(c) {
  let x = IDX.get(c);
  if (x) return x;
  const by = list => new Map(arr(list).map(o => [o.id, o]));
  const people = by(c.people), clues = by(c.clues), stmts = by(c.statements), facts = by(c.facts), topics = by(c.topics);
  const places = by(c.places), objects = by(c.objects);
  const views = new Map(); for (const p of arr(c.places)) for (const v of arr(p.views)) views.set(v.id, p.id);
  const follows = new Set(arr(c.contradictions).map(k => k.follow));
  for (const s of arr(c.statements)) if (s.follow) follows.add(s.id);
  const stmtBy = new Map(); // person|topic → [stmtIds] ohne Folgeaussagen
  for (const s of arr(c.statements)) {
    if (follows.has(s.id)) continue;
    const k = s.person + '|' + s.topic;
    if (!stmtBy.has(k)) stmtBy.set(k, []);
    stmtBy.get(k).push(s.id);
  }
  const ded = new Map(); for (const d of arr(c.deductions)) ded.set(dkey(d.from, d.kind), d);
  const gives = uniq(arr(c.deductions).map(d => d.gives));
  const actors = arr(c.people).filter(p => !p.lab).map(p => p.id);
  const required = arr(c.clues).filter(k => !k.optional).map(k => k.id);
  const startTopics = arr(c.topics).filter(t => !arr(t.after).length).map(t => t.id);
  x = { people, clues, stmts, facts, topics, places, objects, views, follows, stmtBy, ded, gives, actors, required, startTopics };
  IDX.set(c, x);
  return x;
}
const dkey = (from, kind) => [...arr(from)].map(String).sort().join('|') + '#' + kind;

// ---------- Zustand ----------
export function newState(c) {
  return {
    v: SAVE_VERSION, case: c.id, caseV: c.meta?.version ?? 1,
    found: [], heard: [], topics: ix(c).startTopics.slice(), threads: [], insights: [], accusations: [],
    hints: 0, hinted: {}, events: [], view: null, solved: false,
  };
}

function clone(s) {
  return {
    ...s,
    found: arr(s.found).slice(), heard: arr(s.heard).slice(), topics: arr(s.topics).slice(),
    threads: arr(s.threads).map(t => arr(t).slice()), insights: arr(s.insights).slice(),
    accusations: arr(s.accusations).map(a => ({ ...a, who: arr(a?.who).slice() })),
    hints: s.hints | 0, hinted: { ...(s.hinted || {}) },
    events: arr(s.events).map(e => ({ ...e })), view: s.view ?? null, solved: !!s.solved,
  };
}

// Alles, was der Spieler weiß (für needs, Themen-Freischaltung)
export function known(c, s) {
  return new Set([...arr(s.found), ...arr(s.heard), ...arr(s.insights), ...arr(s.topics), ...arr(s.events).map(e => e?.id)]);
}

// Karten-Ids, die gerade auf der Pinnwand liegen
function boardSet(c, s) {
  const x = ix(c);
  return new Set([...x.actors, ...x.places.keys(), ...arr(s.found), ...arr(s.heard), ...arr(s.insights)]);
}

// Themen neu berechnen; gibt die neu geöffneten zurück (verändert s – nur auf Kopien aufrufen)
function refreshTopics(c, s) {
  const k = known(c, s), have = new Set(s.topics), add = [];
  const byStmt = new Set(); for (const id of s.heard) for (const u of arr(ix(c).stmts.get(id)?.unlock)) byStmt.add(u);
  for (const t of arr(c.topics)) {
    if (have.has(t.id)) continue;
    const after = arr(t.after);
    if (!after.length || after.some(a => k.has(a)) || byStmt.has(t.id)) { add.push(t.id); k.add(t.id); }
  }
  s.topics.push(...add);
  // Themen können über andere Themen freigeschaltet werden → bis nichts mehr dazukommt
  if (add.length) add.push(...refreshTopics(c, s));
  return add;
}

const needsMet = (c, s, needs) => { const k = known(c, s); return arr(needs).every(n => k.has(n)); };

// ---------- Aktionen ----------
export function apply(c, s0, action) {
  const x = ix(c);
  const s = clone(s0 || newState(c));
  const a = action || {};
  let result;
  switch (a.type) {
    case 'find': {
      const k = x.clues.get(a.clue);
      if (!k || !needsMet(c, s, k.needs)) { result = { ok: false, new: false, unlocks: [] }; break; }
      if (s.found.includes(k.id)) { result = { ok: true, new: false, unlocks: [] }; break; }
      s.found.push(k.id);
      result = { ok: true, new: true, unlocks: refreshTopics(c, s) };
      break;
    }
    case 'ask': {
      const p = x.people.get(a.person);
      const list = p && !p.lab && s.topics.includes(a.topic) ? (x.stmtBy.get(p.id + '|' + a.topic) || []) : [];
      if (!list.length) { result = { ok: false, statements: [], new: [], unlocks: [] }; break; }
      const fresh = list.filter(id => !s.heard.includes(id));
      s.heard.push(...fresh);
      result = { ok: true, statements: list.slice(), new: fresh, unlocks: refreshTopics(c, s) };
      break;
    }
    case 'present': {
      const b = boardSet(c, s);
      const hit = s.heard.includes(a.statement) && b.has(a.card)
        ? arr(c.contradictions).find(k => k.statement === a.statement && arr(k.cards).includes(a.card)) : null;
      if (!hit) { result = { ok: false, follow: null, unlocks: [] }; break; }
      const fresh = !s.heard.includes(hit.follow);
      if (fresh) s.heard.push(hit.follow);
      result = { ok: true, follow: hit.follow, new: fresh, unlocks: refreshTopics(c, s) };
      break;
    }
    case 'thread': {
      const from = arr(a.from).map(String);
      const b = boardSet(c, s);
      if (from.length < 2 || from.length > 3 || new Set(from).size !== from.length || !from.every(id => b.has(id)) || !THREAD_KINDS.includes(a.kind)) {
        result = { ok: false, gives: null, stored: false, unlocks: [] }; break;
      }
      const key = dkey(from, a.kind);
      const dup = s.threads.some(t => dkey(t.slice(0, -1), t[t.length - 1]) === key);
      if (!dup) s.threads.push([...from, a.kind]);
      const d = x.ded.get(key);
      if (!d) { result = { ok: false, gives: null, stored: !dup, unlocks: [] }; break; }
      const fresh = !s.insights.includes(d.gives);
      if (fresh) s.insights.push(d.gives);
      result = { ok: true, gives: d.gives, new: fresh, stored: !dup, unlocks: refreshTopics(c, s) };
      break;
    }
    case 'accuse': {
      const reject = judge(c, s, a);
      if (!s.solved) s.accusations.push({ who: uniq(arr(a.who).map(String)), how: a.how ?? null, when: a.when ?? null, why: a.why ?? null, reject });
      if (!reject) s.solved = true;
      result = { ok: !reject, reject };
      break;
    }
    case 'hint': {
      const h = arr(c.hints).find(h => !goalDone(s, h.goal));
      if (!h) { result = { ok: false, level: 0, text: null, args: {} }; break; }
      const level = Math.min(3, (s.hinted[h.id] | 0) + 1);
      s.hinted[h.id] = level;
      s.hints += 1;
      result = { ok: true, level, text: `hint.${h.id}.${level}`, args: {}, goal: h.goal };
      break;
    }
    case 'event': {
      if (!x.objects.has(a.id) || typeof a.at !== 'number' || !Number.isFinite(a.at)) { result = { ok: false }; break; }
      s.events.push({ id: a.id, at: a.at });
      result = { ok: true };
      break;
    }
    case 'view': {
      if (a.id != null && !x.views.has(a.id)) { result = { ok: false }; break; }
      s.view = a.id ?? null;
      result = { ok: true };
      break;
    }
    default:
      result = { ok: false, error: 'type' };
  }
  return { state: s, result };
}

const goalDone = (s, goal) => (goal === 'accuse' ? s.solved : s.insights.includes(goal));

// Erste Säule, die nicht trägt (Reihenfolge who → how → when → why), sonst null
function judge(c, s, a) {
  const so = c.solution, b = boardSet(c, s);
  const who = uniq(arr(a.who).map(String)), want = uniq(arr(so.who));
  if (who.length !== want.length || !want.every(w => who.includes(w))) return 'who';
  for (const col of ['how', 'when', 'why']) {
    const card = a[col];
    if (!(b.has(card) && arr(so.cards?.[col]).includes(card))) return col;
  }
  return null;
}

// ---------- Abfragen ----------
export function topicsFor(c, s, person) {
  const x = ix(c), p = x.people.get(person);
  if (!p || p.lab) return [];
  const open = new Set(arr(s.topics));
  return arr(c.topics).map(t => t.id).filter(t => open.has(t) && x.stmtBy.has(person + '|' + t));
}

// Pinnwand-Karten. ref = Textschlüssel-Anfang (person.<id> → .name/.role, clue.<id>, stmt.<id>, fact.<id>, place.<id>)
export function cards(c, s) {
  const x = ix(c), out = [];
  for (const id of x.actors) out.push({ id, kind: 'person', ref: 'person.' + id });
  for (const p of arr(c.places)) out.push({ id: p.id, kind: 'place', ref: 'place.' + p.id });
  for (const id of arr(s.found)) if (x.clues.has(id)) out.push({ id, kind: 'clue', ref: 'clue.' + id, place: x.clues.get(id).place });
  for (const id of arr(s.heard)) if (x.stmts.has(id)) out.push({ id, kind: 'statement', ref: 'stmt.' + id, person: x.stmts.get(id).person });
  for (const id of arr(s.insights)) if (x.facts.has(id)) { const f = x.facts.get(id); out.push({ id, kind: 'insight', ref: 'fact.' + id, at: f.at ?? null, timeEnd: f.timeEnd ?? null }); }
  return out;
}

export function progress(c, s) {
  const x = ix(c), f = new Set(arr(s.found));
  return { clues: [x.required.filter(id => f.has(id)).length, x.required.length], insights: [arr(s.insights).length, x.gives.length] };
}

// lose Fäden = gespeicherte Fäden ohne passenden Schluss
export function looseThreads(c, s) {
  const x = ix(c);
  return arr(s.threads).filter(t => !x.ded.has(dkey(t.slice(0, -1), t[t.length - 1])));
}

export function score(c, s) {
  const wrong = arr(s.accusations).filter(a => a && a.reject).length;
  const loose = looseThreads(c, s).length;
  const r = { ...RANK, ...(c.meta?.rank || {}) };
  return { wrong, hints: s.hints | 0, loose, points: wrong * 3 + (s.hints | 0) + Math.max(0, loose - r.freeLoose) / 2 };
}

export function rank(c, s) {
  const r = { ...RANK, ...(c.meta?.rank || {}) }, p = score(c, s).points;
  return p < r.gold ? 'gold' : p < r.silver ? 'silver' : 'bronze';
}

// Spuren eines Ortes für die 3D-Brücke (was ist anklickbar, wie wird es gefunden)
export function cluesAt(c, place) {
  return arr(c.clues).filter(k => k.place === place).map(k => ({
    id: k.id, obj: k.obj, find: k.find, needs: arr(k.needs).slice(), opens: k.opens ?? null, view: k.view ?? null, born: k.born,
  }));
}

// Laborsätze, die zu einem Auslöser gehören ('start', 'solved', Spur-Id oder Objekt-Id)
export function labFor(c, on) { return arr(c.extras?.lab).filter(l => l.on === on).map(l => ({ id: l.id, who: l.who, text: 'lab.' + l.id })); }

// ---------- Spielstand übernehmen ----------
// Alter oder fremder Stand → gültiger Zustand. Unbekanntes wird übersprungen, renamed übersetzt alte Ids.
export function migrate(c, saved) {
  const x = ix(c), base = newState(c);
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base;
  if (saved.case != null && saved.case !== c.id) return base;
  const ren = c.renamed || {};
  const map = id => { let v = String(id), n = 0; while (Object.prototype.hasOwnProperty.call(ren, v) && n++ < 20) v = ren[v]; return v; };
  const keep = (list, ok) => uniq(arr(list).filter(v => typeof v === 'string').map(map).filter(ok));
  const s = base;
  s.found = keep(saved.found, id => x.clues.has(id));
  s.heard = keep(saved.heard, id => x.stmts.has(id));
  s.insights = keep(saved.insights, id => x.gives.includes(id));
  s.topics = uniq([...base.topics, ...keep(saved.topics, id => x.topics.has(id))]);
  const cardOk = id => x.actors.includes(id) || x.places.has(id) || x.clues.has(id) || x.stmts.has(id) || x.facts.has(id);
  const seen = new Set();
  for (const t of arr(saved.threads)) {
    if (!Array.isArray(t) || t.length < 3 || t.length > 4) continue;
    const kind = t[t.length - 1], from = t.slice(0, -1).map(v => (typeof v === 'string' ? map(v) : ''));
    if (!THREAD_KINDS.includes(kind) || !from.every(cardOk) || new Set(from).size !== from.length) continue;
    const k = dkey(from, kind);
    if (seen.has(k)) continue;
    seen.add(k); s.threads.push([...from, kind]);
  }
  for (const a of arr(saved.accusations)) {
    if (!a || typeof a !== 'object') continue;
    const col = v => (typeof v === 'string' ? map(v) : null);
    const reject = ['who', 'how', 'when', 'why'].includes(a.reject) ? a.reject : null;
    s.accusations.push({ who: keep(a.who, id => x.people.has(id)), how: col(a.how), when: col(a.when), why: col(a.why), reject });
  }
  s.hints = Number.isFinite(saved.hints) && saved.hints > 0 ? Math.floor(saved.hints) : 0;
  for (const [h, lv] of Object.entries(saved.hinted && typeof saved.hinted === 'object' ? saved.hinted : {})) {
    const id = map(h);
    if (arr(c.hints).some(k => k.id === id) && Number.isFinite(lv)) s.hinted[id] = Math.max(1, Math.min(3, Math.floor(lv)));
  }
  for (const e of arr(saved.events)) {
    if (e && typeof e.id === 'string' && Number.isFinite(e.at) && x.objects.has(map(e.id))) s.events.push({ id: map(e.id), at: e.at });
  }
  const v = typeof saved.view === 'string' ? map(saved.view) : null;
  s.view = v && x.views.has(v) ? v : null;
  s.solved = !!saved.solved && s.accusations.some(a => !a.reject);
  refreshTopics(c, s);
  return s;
}
