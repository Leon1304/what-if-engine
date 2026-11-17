// Red String – Fall laden und Schema prüfen.
// Reines ES-Modul ohne DOM- und Node-APIs: läuft im Browser und in den Prüfskripten (tools/case-check.mjs).
// case.json enthält nur Logik und Ids, nie Text. Alle Texte stehen in cases/<id>/text/<sprache>.json (siehe textKeys).

export const FINDS = ['look', 'zoom', 'open', 'tool:uv', 'tool:powder', 'tool:tape', 'person', 'combine'];
export const KINDS = ['red', 'green', 'blue'];
export const CASE_KINDS = ['theft', 'sabotage', 'fraud', 'missing', 'murder'];
export const OBJ_ROLES = ['clue', 'container', 'prop', 'extra'];
export const EXPRS = ['calm', 'happy', 'scared', 'angry', 'shout', 'sad', 'surprised', 'smug', 'annoyed', 'disgust', 'confused',
  'nervous', 'relieved', 'determined', 'panic', 'deadpan', 'cry', 'blush', 'sweat', 'tears'];
export const REACTS = ['startle', 'flinch', 'hit', 'facepalm', 'sigh', 'shrug', 'nod', 'shake', 'wave', 'point', 'gasp', 'lookUp'];
export const MOODS = [...EXPRS, 'guilty'];
export const DEATHS = ['poison', 'fall', 'accident'];
export const PLACEHOLDERS = ['time', 'timeEnd', 'name', 'n'];

// Erlaubte Zeichen in Werten von case.json: Ids, Farben (#hex), Verweise mit „!“ (Gegenteil) und Ausdrücke mit „+“.
const ID = /^[a-z][a-z0-9_]*$/;
const CASE_ID = /^[a-z0-9][a-z0-9-]*$/;
const NOTEXT = /^[A-Za-z0-9_#.:+!-]*$/;

// Höchstlängen der Texte (Zeichen) je Schlüsselart – Karten, Zettel und Sprechblasen
export const MAX = {
  'meta.title': 40, 'meta.intro': 420, 'meta.brief': 400, 'solution.text': 1600, accuse: 200, place: 40, view: 40,
  name: 32, role: 48, bio: 260, topic: 44, stmt: 300, clue: 48, detail: 300, fact: 160, hint: 220, lab: 220, scene: 200,
};

const arr = v => (Array.isArray(v) ? v : []);

// Alle Bausteine mit Id, die als Karte, Wissen oder Spielstand-Eintrag vorkommen können
export function allIds(c) {
  const out = new Map(); // id → art
  const add = (id, kind) => { if (typeof id === 'string') out.set(id, out.has(id) ? out.get(id) + '+' + kind : kind); };
  for (const p of arr(c.places)) { add(p.id, 'place'); for (const v of arr(p.views)) add(v.id, 'view'); }
  for (const x of arr(c.people)) add(x.id, 'person');
  for (const x of arr(c.facts)) add(x.id, 'fact');
  for (const x of arr(c.topics)) add(x.id, 'topic');
  for (const x of arr(c.clues)) add(x.id, 'clue');
  for (const x of arr(c.statements)) add(x.id, 'statement');
  for (const x of arr(c.contradictions)) add(x.id, 'contradiction');
  for (const x of arr(c.deductions)) add(x.id, 'deduction');
  for (const x of arr(c.hints)) add(x.id, 'hint');
  for (const x of arr(c.objects)) add(x.id, 'object');
  for (const x of arr(c.extras?.lab)) add(x.id, 'lab');
  return out;
}

// Schema prüfen → Liste von Fehlertexten (leer = in Ordnung)
export function validateCase(c) {
  const E = [];
  const err = m => E.push(m);
  if (!c || typeof c !== 'object' || Array.isArray(c)) return ['case.json ist kein Objekt'];
  if (typeof c.id !== 'string' || !CASE_ID.test(c.id)) err(`id fehlt oder ungültig (${c.id})`);

  // kein Text in case.json: jeder String muss wie eine Id aussehen
  (function walk(v, path) {
    if (typeof v === 'string') { if (!NOTEXT.test(v)) err(`Text in case.json bei ${path}: „${v.slice(0, 40)}“ (nur Ids erlaubt)`); return; }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (!/^[a-zA-Z0-9_-]+$/.test(k)) err(`ungültiger Schlüssel ${path}.${k}`); walk(v[k], `${path}.${k}`); }
  })(c, 'case');

  // meta
  const m = c.meta || {};
  if (!c.meta || typeof c.meta !== 'object') err('meta fehlt');
  if (![1, 2, 3].includes(m.level)) err(`meta.level muss 1, 2 oder 3 sein (${m.level})`);
  if (!(typeof m.minutes === 'number' && m.minutes > 0)) err('meta.minutes fehlt');
  if (!(Number.isInteger(m.version) && m.version >= 1)) err('meta.version muss eine ganze Zahl ≥ 1 sein');
  if (!CASE_KINDS.includes(m.kind)) err(`meta.kind unbekannt (${m.kind}); erlaubt: ${CASE_KINDS.join(', ')}`);
  if (!(typeof m.replay === 'number' && m.replay > 0)) err('meta.replay (Länge der Nachstellung in s) fehlt');
  if (m.at != null && !isTime(m.at)) err('meta.at muss eine Uhrzeit in Minuten (0–1439) sein');

  for (const k of ['places', 'people', 'facts', 'topics', 'clues', 'statements', 'contradictions', 'deductions', 'hints', 'objects'])
    if (!Array.isArray(c[k])) err(`${k} fehlt (Liste)`);
  if (E.length) return E;

  // Ids eindeutig über alle Bausteine
  const seen = new Map();
  const reg = (id, where) => {
    if (typeof id !== 'string' || !ID.test(id)) { err(`${where}: ungültige id „${id}“ (a-z, 0-9, _)`); return; }
    if (seen.has(id)) err(`id „${id}“ doppelt (${seen.get(id)} und ${where})`); else seen.set(id, where);
  };
  for (const p of c.places) { reg(p.id, 'places'); for (const v of arr(p.views)) reg(v.id, `places.${p.id}.views`); }
  for (const k of ['people', 'facts', 'topics', 'clues', 'statements', 'contradictions', 'deductions', 'hints', 'objects'])
    for (const x of c[k]) reg(x?.id, k);
  for (const x of arr(c.extras?.lab)) reg(x?.id, 'extras.lab');

  const ids = (list) => new Set(list.map(x => x.id));
  const places = ids(c.places), people = ids(c.people), facts = ids(c.facts), topics = ids(c.topics);
  const clues = ids(c.clues), stmts = ids(c.statements), objects = ids(c.objects);
  const views = new Map(); for (const p of c.places) for (const v of arr(p.views)) views.set(v.id, p.id);
  const lab = new Set(c.people.filter(p => p.lab).map(p => p.id));
  const cardable = new Set([...places, ...people].filter(id => !lab.has(id)));
  for (const id of [...clues, ...stmts, ...facts]) cardable.add(id);
  const knowable = new Set([...clues, ...stmts, ...facts, ...topics, ...objects]);
  const objOf = new Map(c.objects.map(o => [o.id, o]));

  // Orte
  for (const p of c.places) {
    if (p.walk != null && (typeof p.walk !== 'object' || Array.isArray(p.walk))) err(`places.${p.id}.walk muss ein Objekt {ort: minuten} sein`);
    for (const [to, min] of Object.entries(p.walk || {})) {
      if (!places.has(to)) err(`places.${p.id}.walk: Ort „${to}“ unbekannt`);
      if (!(typeof min === 'number' && min >= 0)) err(`places.${p.id}.walk.${to}: Minuten fehlen`);
    }
  }
  // Personen
  for (const p of c.people) {
    if (!['human', 'dog', 'cat', 'animal'].includes(p.type)) err(`people.${p.id}.type unbekannt (${p.type})`);
    if (typeof p.suspect !== 'boolean') err(`people.${p.id}.suspect muss true/false sein`);
    if (p.lab && p.suspect) err(`people.${p.id}: Labor-Figur kann nicht verdächtig sein`);
    if (p.mood != null && !MOODS.includes(p.mood)) err(`people.${p.id}.mood unbekannt (${p.mood})`);
    if (p.stand != null && !views.has(p.stand)) err(`people.${p.id}.stand: Standpunkt „${p.stand}“ unbekannt`);
    if (p.cleared != null && !facts.has(p.cleared)) err(`people.${p.id}.cleared: Fakt „${p.cleared}“ unbekannt`);
  }
  if (!c.people.some(p => p.suspect)) err('kein Verdächtiger (people[].suspect)');
  // Fakten
  for (const f of c.facts) {
    if (f.person != null && !people.has(f.person)) err(`facts.${f.id}.person „${f.person}“ unbekannt`);
    if (f.place != null && !places.has(f.place)) err(`facts.${f.id}.place „${f.place}“ unbekannt`);
    if (f.at != null && !isTime(f.at)) err(`facts.${f.id}.at muss Minuten seit Mitternacht sein`);
    if (f.timeEnd != null && (!isTime(f.timeEnd) || f.at == null || f.timeEnd < f.at)) err(`facts.${f.id}.timeEnd ungültig (braucht at ≤ timeEnd)`);
    if (f.truth != null && typeof f.truth !== 'boolean') err(`facts.${f.id}.truth muss true/false sein`);
    if (f.refuted != null && !facts.has(f.refuted)) err(`facts.${f.id}.refuted: Fakt „${f.refuted}“ unbekannt`);
  }
  // Themen
  for (const t of c.topics) for (const a of arr(t.after)) if (!knowable.has(a)) err(`topics.${t.id}.after: „${a}“ unbekannt`);
  // Spuren
  for (const k of c.clues) {
    if (!places.has(k.place)) err(`clues.${k.id}.place „${k.place}“ unbekannt`);
    if (k.view != null && views.get(k.view) !== k.place) err(`clues.${k.id}.view „${k.view}“ gehört nicht zu ${k.place}`);
    if (!objects.has(k.obj)) err(`clues.${k.id}.obj „${k.obj}“ fehlt in objects`);
    else if (objOf.get(k.obj).place !== k.place) err(`clues.${k.id}: Objekt ${k.obj} liegt nicht in ${k.place}`);
    if (!FINDS.includes(k.find)) err(`clues.${k.id}.find unbekannt (${k.find})`);
    if (k.find === 'open') {
      if (!objects.has(k.opens)) err(`clues.${k.id}: find „open“ braucht opens (Objekt-Id des Behälters)`);
      else if (objOf.get(k.opens).role !== 'container') err(`clues.${k.id}.opens: ${k.opens} ist kein container`);
    }
    if (k.find === 'combine' && !(arr(k.from).length === 2 && k.from.every(x => clues.has(x)))) err(`clues.${k.id}: combine braucht from: [spur, spur]`);
    for (const n of arr(k.needs)) if (!knowable.has(n)) err(`clues.${k.id}.needs: „${n}“ unbekannt`);
    for (const s of arr(k.supports)) if (!facts.has(s)) err(`clues.${k.id}.supports: Fakt „${s}“ unbekannt`);
    if (!(typeof k.born === 'number' && k.born >= 0)) err(`clues.${k.id}.born fehlt (Sekunde in der Nachstellung)`);
    if (k.optional != null && typeof k.optional !== 'boolean') err(`clues.${k.id}.optional muss true/false sein`);
  }
  // Aussagen
  for (const s of c.statements) {
    if (!people.has(s.person)) err(`statements.${s.id}.person „${s.person}“ unbekannt`);
    else if (lab.has(s.person)) err(`statements.${s.id}: Labor-Figuren haben keine Aussagen (lab.* nutzen)`);
    if (!topics.has(s.topic)) err(`statements.${s.id}.topic „${s.topic}“ unbekannt`);
    if (s.kind != null && !['speech', 'action'].includes(s.kind)) err(`statements.${s.id}.kind muss speech oder action sein`);
    if (s.expr != null && !String(s.expr).split('+').every(e => EXPRS.includes(e))) err(`statements.${s.id}.expr unbekannt (${s.expr})`);
    if (s.react != null && !REACTS.includes(s.react)) err(`statements.${s.id}.react unbekannt (${s.react})`);
    for (const cl of arr(s.claims)) if (!facts.has(String(cl).replace(/^!/, ''))) err(`statements.${s.id}.claims: Fakt „${cl}“ unbekannt`);
    for (const u of arr(s.unlock)) if (!topics.has(u)) err(`statements.${s.id}.unlock: Thema „${u}“ unbekannt`);
    for (const b of ['lie', 'guess', 'follow']) if (s[b] != null && typeof s[b] !== 'boolean') err(`statements.${s.id}.${b} muss true/false sein`);
  }
  // Widersprüche
  const follows = new Set();
  for (const x of c.contradictions) {
    const st = c.statements.find(s => s.id === x.statement);
    if (!st) err(`contradictions.${x.id}.statement „${x.statement}“ unbekannt`);
    if (!arr(x.cards).length) err(`contradictions.${x.id}.cards fehlt`);
    for (const k of arr(x.cards)) if (!cardable.has(k)) err(`contradictions.${x.id}.cards: „${k}“ ist keine Karte`);
    const fo = c.statements.find(s => s.id === x.follow);
    if (!fo) err(`contradictions.${x.id}.follow „${x.follow}“ unbekannt`);
    else { if (!fo.follow) err(`statements.${fo.id} ist Folgeaussage und braucht follow: true`); if (st && fo.person !== st.person) err(`contradictions.${x.id}: Folgeaussage von anderer Person`); follows.add(fo.id); }
  }
  for (const s of c.statements) if (s.follow && !follows.has(s.id)) err(`statements.${s.id}: follow: true, aber kein Widerspruch führt hierher`);
  // Schlüsse
  const dk = new Set();
  for (const d of c.deductions) {
    const f = arr(d.from);
    if (f.length < 2 || f.length > 3 || new Set(f).size !== f.length) err(`deductions.${d.id}.from braucht 2–3 verschiedene Karten`);
    for (const k of f) if (!cardable.has(k)) err(`deductions.${d.id}.from: „${k}“ ist keine Karte`);
    if (!KINDS.includes(d.kind)) err(`deductions.${d.id}.kind muss red, green oder blue sein`);
    if (!facts.has(d.gives)) err(`deductions.${d.id}.gives: Fakt „${d.gives}“ unbekannt`);
    if (f.includes(d.gives)) err(`deductions.${d.id}: gives steht schon in from`);
    const key = [...f].sort().join('|') + '#' + d.kind;
    if (dk.has(key)) err(`deductions.${d.id}: dieselben Karten und Art wie ein anderer Schluss`); dk.add(key);
  }
  // Lösung
  const so = c.solution;
  if (!so || typeof so !== 'object') err('solution fehlt');
  else {
    if (!arr(so.who).length) err('solution.who fehlt');
    for (const w of arr(so.who)) { const p = c.people.find(x => x.id === w); if (!p) err(`solution.who: „${w}“ unbekannt`); else if (!p.suspect) err(`solution.who: ${w} ist nicht verdächtig (suspect: true)`); }
    for (const col of ['how', 'when', 'why']) {
      if (!facts.has(so[col])) err(`solution.${col}: Fakt „${so[col]}“ unbekannt`);
      const cs = arr(so.cards?.[col]);
      if (!cs.length) err(`solution.cards.${col} fehlt`);
      for (const k of cs) if (!cardable.has(k)) err(`solution.cards.${col}: „${k}“ ist keine Karte`);
    }
  }
  // Hinweise
  for (const h of c.hints) if (!(h.goal === 'accuse' || facts.has(h.goal))) err(`hints.${h.id}.goal muss ein Fakt oder „accuse“ sein`);
  // Szenen-Objekte
  for (const o of c.objects) {
    if (!places.has(o.place)) err(`objects.${o.id}.place „${o.place}“ unbekannt`);
    if (o.view != null && views.get(o.view) !== o.place) err(`objects.${o.id}.view „${o.view}“ gehört nicht zu ${o.place}`);
    if (!OBJ_ROLES.includes(o.role)) err(`objects.${o.id}.role unbekannt (${o.role})`);
    if (!(Array.isArray(o.size) && o.size.length === 3 && o.size.every(n => typeof n === 'number' && n > 0))) err(`objects.${o.id}.size braucht [b, h, t] in m`);
    if (o.proxy != null && !(Array.isArray(o.proxy) && o.proxy.length === 3)) err(`objects.${o.id}.proxy braucht [b, h, t]`);
    for (const r of ['on', 'in']) if (o[r] != null && !(objects.has(o[r]) || people.has(o[r]))) err(`objects.${o.id}.${r}: „${o[r]}“ unbekannt`);
    if (o.role === 'clue' && !c.clues.some(k => k.obj === o.id)) err(`objects.${o.id}: role clue, aber keine Spur nutzt es`);
  }
  // Extras
  const ex = c.extras || {};
  for (const l of arr(ex.lab)) {
    if (!lab.has(l.who)) err(`extras.lab.${l.id}.who muss eine Labor-Figur sein`);
    if (!(l.on === 'start' || l.on === 'solved' || knowable.has(l.on))) err(`extras.lab.${l.id}.on: „${l.on}“ unbekannt`);
  }
  if (ex.thermos && !objects.has(ex.thermos.obj)) err('extras.thermos.obj fehlt in objects');
  if (m.kind === 'murder') {
    const v = ex.victim;
    if (!v) err('Mordfall ohne extras.victim');
    else {
      if (v.covered !== true) err('extras.victim.covered muss true sein (Darstellungsregel 2)');
      if (v.inspect !== false) err('extras.victim.inspect muss false sein (Lupe am Opfer gesperrt)');
      if (!DEATHS.includes(v.cause)) err(`extras.victim.cause „${v.cause}“ nicht erlaubt (${DEATHS.join(', ')})`);
    }
  }
  // Umbenennungen: alt → neu, alt existiert nicht mehr, neu existiert
  const all = allIds(c);
  for (const [o, n] of Object.entries(c.renamed || {})) {
    if (all.has(o)) err(`renamed: alte Id „${o}“ existiert noch`);
    if (!all.has(n) && !(c.renamed || {})[n]) err(`renamed: neue Id „${n}“ unbekannt`);
  }
  return E;
}

function isTime(n) { return typeof n === 'number' && n >= 0 && n < 1440; }

// Fall aus JSON-Text oder Objekt laden; wirft bei Schemafehlern
export function loadCase(json) {
  let c = json;
  if (typeof json === 'string') { try { c = JSON.parse(json); } catch (e) { throw new Error('case.json: kein gültiges JSON – ' + e.message); } }
  const errs = validateCase(c);
  if (errs.length) { const e = new Error(`Fall ${c?.id || '?'}: ${errs.length} Fehler\n- ` + errs.join('\n- ')); e.errors = errs; throw e; }
  return c;
}

// Alle Textschlüssel, die ein Fall in text/<sprache>.json braucht.
// → [{ key, max, time, timeEnd }]; time/timeEnd = der Baustein hat at/timeEnd, darf also {time}/{timeEnd} nutzen.
export function textKeys(c) {
  const out = [];
  const add = (key, max, src) => out.push({ key, max, time: src?.at != null, timeEnd: src?.timeEnd != null });
  add('meta.title', MAX['meta.title']); add('meta.intro', MAX['meta.intro']); add('meta.brief', MAX['meta.brief'], c.meta);
  add('solution.text', MAX['solution.text']);
  add('accuse.ok', MAX.accuse);
  for (const k of ['who', 'how', 'when', 'why']) add('accuse.reject.' + k, MAX.accuse);
  for (const p of arr(c.places)) { add('place.' + p.id, MAX.place); for (const v of arr(p.views)) add('view.' + v.id, MAX.view); }
  for (const p of arr(c.people)) { add(`person.${p.id}.name`, MAX.name); add(`person.${p.id}.role`, MAX.role); add(`person.${p.id}.bio`, MAX.bio); }
  for (const t of arr(c.topics)) add('topic.' + t.id, MAX.topic);
  for (const s of arr(c.statements)) add('stmt.' + s.id, MAX.stmt, s);
  for (const k of arr(c.clues)) { add('clue.' + k.id, MAX.clue, k); add(`clue.${k.id}.detail`, MAX.detail, k); }
  for (const f of arr(c.facts)) add('fact.' + f.id, MAX.fact, f);
  for (const h of arr(c.hints)) for (const n of [1, 2, 3]) add(`hint.${h.id}.${n}`, MAX.hint);
  for (const l of arr(c.extras?.lab)) add('lab.' + l.id, MAX.lab);
  for (const o of arr(c.objects)) if (o.readable) add('scene.' + o.id, MAX.scene);
  return out;
}
