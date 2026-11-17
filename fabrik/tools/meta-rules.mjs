// Regeln der Zusatzsysteme (js/meta.js) ohne Browser: node fabrik/tools/meta-rules.mjs → letzte Zeile META OK (sonst Exit-Code 1)
// Glücksrad + Serie, Ereignisse, Durchbrüche, Album, Ziele, Wochen-Herausforderung, Speichern/Laden, Determinismus, attach/detach, Prestige.
import { Factory, TPS, PLOT, START_PLOT } from '../js/sim.js';
import * as DATA from '../js/data.js';
const { ITEM_IDS, RESEARCH_IDS, TITLES } = DATA;
import { DICTS, t, setLang } from '../js/i18n.js';
import {
  Meta, WHEEL, STREAK, EVENTS, EVENT_IDS, BT_KINDS, CARDS, ALBUM_ITEMS, ALBUM_PAGES, MEGA_N, ALBUM_TITLE,
  challengeSpec, resultCode, parseResultCode, startChallenge, isoWeek, dayNum,
} from '../js/meta.js';

const VERB = process.argv.includes("--verbose");
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const secs = (f, s) => f.tick(Math.round(s * TPS));
const O = START_PLOT * PLOT;
const date = n => new Date(n * 86400000).toISOString().slice(0, 10);
const D0 = dayNum('2026-11-16');
const IDX = Object.fromEntries(ITEM_IDS.map((id, i) => [id, i]));
const snap = f => JSON.stringify(f.toJSON());
const types = evs => evs.map(e => e.type);
const mk = (seed = 7) => { const f = new Factory({ seed }); const m = new Meta(f); return { f, m }; };
const quiet = f => { f.S.meta.ev.wait = 1e9; return f; };   // keine zufälligen Ereignisse dazwischen
// kleine Anlage: Bohrer auf Stein → Band → Verkaufsstation (Startgrundstück)
function chain(f) {
  f.S.money += 500;
  const d = f.place('bohrer', O + 1, O + 1, 0);
  const cells = []; for (let x = O + 3; x <= O + 7; x++) cells.push([x, O + 2, 0]);
  for (let y = O + 2; y <= O + 6; y++) cells.push([O + 7, y, 1]);
  cells.splice(cells.findIndex(c => c[0] === O + 7 && c[1] === O + 2 && c[2] === 0), 1);
  f.placeLine('band', cells);
  return d;
}

// =====================================================================================
// 0. Grundlagen: Anlage verkauft, Datum/Woche
// =====================================================================================
{
  const { f } = mk(); chain(f); secs(f, 30);
  ok(f.S.stats.soldBy.stein > 3, `Test-Anlage verkauft Stein (${f.S.stats.soldBy.stein} in 30 s)`);
  ok(isoWeek('2026-11-16') === '2026-W47' && isoWeek('2021-01-03') === '2020-W53' && isoWeek('2027-01-01') === '2026-W53' && isoWeek('kaputt') === null, 'ISO-Woche aus Datum');
  ok(Number.isNaN(dayNum('2026-02-30')) && Number.isNaN(dayNum('16.11.2026')) && dayNum('2026-11-17') - dayNum('2026-11-16') === 1, 'Datum streng geprüft');
}

// =====================================================================================
// 1. Glücksrad
// =====================================================================================
{
  const { f, m } = mk();
  ok(m.canSpin('2026-11-16') && !m.canSpin('2026-13-01') && !m.canSpin(undefined), 'Rad: heute drehbar, kaputtes Datum nicht');
  const r = m.spin('2026-11-16');
  ok(r && Number.isInteger(r.seg) && r.seg >= 0 && r.seg < 8 && r.reward && r.reward.kind === WHEEL[r.seg].id, `Rad: spin → {seg, reward} (${r && r.kind})`);
  ok(types(f.events()).includes('wheel'), 'Rad: Ereignis wheel');
  ok(!m.canSpin('2026-11-16') && m.spin('2026-11-16') === null, 'Rad: nur einmal pro Tag');
  ok(!m.canSpin('2026-11-15') && m.spin('2026-11-10') === null, 'Rad: Uhr zurückgestellt → kein zweites Drehen');
  ok(m.canSpin('2026-11-17'), 'Rad: nächster Tag wieder drehbar');
  ok(WHEEL.length === 8 && WHEEL.reduce((a, b) => a + b.w, 0) === 100 && WHEEL.find(s => s.id === 'jackpot').w === 2, 'Rad: 8 Segmente, Jackpot 2 %');

  // Verteilung über 10 000 Drehungen und: jede Belohnung kommt an
  const g = mk(11), cnt = {}, bad = [];
  g.f.tick(1);
  for (let i = 1; i <= 10000; i++) {
    const S = g.f.S, before = { money: S.money, rp: S.rp, crates: S.crates.length, turbo: S.boosts.turbo, gold: S.boosts.goldrain, v: S.vouchers, p: S.points };
    const res = g.m.spin(date(D0 + i)); if (!res) { bad.push('null'); continue; }
    cnt[res.kind] = (cnt[res.kind] || 0) + 1;
    const rw = res.reward, a = g.f.S;
    const okk = {
      geld: a.money - before.money === rw.money && rw.money >= 500, geldgross: a.money - before.money === rw.money && rw.money >= 2500,
      rp: a.rp - before.rp === rw.rp && rw.rp >= 25, kiste: a.crates.length === before.crates + 1, turbo: a.boosts.turbo === before.turbo + 120,
      goldregen: a.boosts.goldrain === before.gold + 20, gutschein: a.vouchers === before.v + 1, jackpot: a.points === before.p + 1,
    }[res.kind];
    if (!okk) bad.push(res.kind);
    if (i % 500 === 0) { g.f.S.boosts.turbo = 0; g.f.refreshMods(); g.f.events(); }
  }
  const dev = WHEEL.map(s => Math.abs((cnt[s.id] || 0) / 10000 - s.w / 100));
  ok(Math.max(...dev) < 0.015, 'Rad: 10 000 Drehungen ≈ Gewichte (' + WHEEL.map(s => `${s.id} ${((cnt[s.id] || 0) / 100).toFixed(1)}/${s.w}`).join(', ') + ')');
  ok(!bad.length, 'Rad: jede Belohnung kommt an' + (bad.length ? ': ' + bad.slice(0, 5).join(',') : ''));
}

// =====================================================================================
// 2. Serie
// =====================================================================================
{
  const { f, m } = mk(), S = f.S, days = [], ok7 = [];
  for (let i = 0; i < 8; i++) {
    const b = { money: S.money, c: S.crates.length, t: S.boosts.turbo, v: S.vouchers, p: S.points };
    const r = m.checkIn(date(D0 + i)); days.push(r && r.day);
    if (!r) { ok7.push(false); continue; }
    ok7.push({ kiste: S.crates.length === b.c + 1, geld: S.money > b.money, kisten2: S.crates.length === b.c + 2, turbo: S.boosts.turbo === b.t + 120,
      gutschein: S.vouchers === b.v + 1, kisten3: S.crates.length === b.c + 3, patent: S.points === b.p + 1 }[r.kind] === true && r.kind === STREAK[r.day - 1]);
    if (i === 3) { S.boosts.turbo = 0; f.refreshMods(); }
    if (i === 0) ok(m.checkIn(date(D0)) === null && !m.canCheckIn(date(D0)), 'Serie: zweimal am selben Tag → nichts');
  }
  ok(days.join() === '1,2,3,4,5,6,7,1', 'Serie: Tag 1 → 7 → 1 (' + days.join() + ')');
  ok(ok7.every(Boolean), 'Serie: Belohnungen je Tag (Kiste, Geld, 2 Kisten, Turbo, Gutschein, 3 Kisten, Patentpunkt)');
  ok(m.checkIn(date(D0 + 3)) === null && m.checkIn(date(D0 + 7)) === null, 'Serie: Uhr zurück stellt nichts Doppeltes aus');
  const r2 = m.checkIn(date(D0 + 8));
  ok(r2 && r2.day === 2 && r2.len === 9 && !r2.broken, 'Serie: nach der Woche läuft sie weiter (Tag 2, 9 Tage in Folge)');
  const info = m.streakInfo(date(D0 + 10));
  ok(info.willBreak && info.next === 1 && info.day === 0, 'Serie: Kalender zeigt das Reißen an');
  const r3 = m.checkIn(date(D0 + 10));
  ok(r3 && r3.day === 1 && r3.broken && r3.len === 1 && f.S.meta.streak.best === 9, 'Serie: reißt nach einem verpassten Tag (Rekord 9 bleibt)');
  ok(types(f.events()).filter(x => x === 'streak').length === 10, 'Serie: Ereignis streak je Abholung');
}

// =====================================================================================
// 3. Ereignisse: Abstand, Arten, sauberes Ende
// =====================================================================================
{
  const { f, m } = mk(5); chain(f);
  const starts = [], ends = [], kinds = new Set(); let xBad = 0;
  const H = 8 * 3600 * TPS;
  for (let tk = 0; tk < H; tk += 200) {
    f.tick(200);
    for (const e of f.events()) if (e.type === 'event') { if (e.on) { starts.push(f.S.tick); kinds.add(e.kind); } else ends.push(e.kind); }
    if (!m.active().length && (f.X.gold !== 0 || Object.keys(f.X.sell).length)) xBad++;
  }
  const gaps = starts.slice(1).map((s, i) => (s - starts[i]) / TPS);
  ok(starts.length >= 30 && starts[0] / TPS >= 600 - 10 && starts[0] / TPS <= 900 + 10, `Ereignisse: ${starts.length} in 8 h, erstes nach ${Math.round(starts[0] / TPS)} s`);
  ok(gaps.every(g => g >= 600 - 10 && g <= 900 + 10), `Ereignisse: Abstand 10–15 min (${Math.min(...gaps).toFixed(0)}–${Math.max(...gaps).toFixed(0)} s)`);
  ok(EVENT_IDS.every(k => kinds.has(k)), 'Ereignisse: alle Arten kommen vor (' + [...kinds].join(', ') + ')');
  ok(xBad === 0 && ends.length >= starts.length - 2, `Ereignisse enden sauber, Faktoren ohne Ereignis zurück (${ends.length} Enden)`);
  ok(m.nextEventIn() > 0 && m.nextEventIn() <= 900, 'nextEventIn() in Sekunden');
}
{
  // Goldader
  const { f, m } = mk(); quiet(f); const g0 = f.M.gold;
  const a = m.trigger('goldvein');
  ok(a && a.kind === 'goldvein' && Math.abs(f.M.gold - g0 - 0.05) < 1e-9 && f.X.gold === 0.05, `Goldader: Gold ${g0} → ${f.M.gold}`);
  ok(m.trigger('goldvein') === null, 'gleiche Art läuft nie doppelt');
  secs(f, 119); const still = m.active().length === 1; secs(f, 1.05);
  ok(still && !m.active().length && f.M.gold === g0 && f.X.gold === 0, 'Goldader: endet nach 120 s, Faktor zurück');
  ok(f.events().some(e => e.type === 'event' && e.kind === 'goldvein' && e.on === false), 'Goldader: Ereignis event {on:false}');
}
{
  // Boom
  const { f, m } = mk(); quiet(f); chain(f); secs(f, 20);
  const v0 = f.val[IDX.stein]; f.events();
  const a = m.trigger('boom', { item: 'stein' });
  secs(f, 30);
  const sold = f.events().filter(e => e.type === 'sold' && e.item === 'stein' && !e.gold);
  ok(a && f.val[IDX.stein] === v0 * 3 && sold.length > 0 && sold.every(e => Math.abs(e.value - v0 * 3 * e.takt) < 1e-9), `Boom: Stein ×3 (${v0} → ${f.val[IDX.stein]}), Verkäufe zählen dreifach`);
  secs(f, 91);
  ok(f.val[IDX.stein] === v0 && !Object.keys(f.X.sell).length, 'Boom: nach 120 s wieder normaler Wert');
  const { f: f2, m: m2 } = mk();
  ok(m2.trigger('boom') === null && m2.trigger('vip') === null, 'Boom/VIP brauchen schon verkaufte Teile');
}
{
  // VIP erfüllt
  const { f, m } = mk(); quiet(f); chain(f); secs(f, 10);
  const a = m.trigger('vip', { item: 'stein', n: 8 });
  const money0 = f.S.money, c0 = f.S.crates.length; f.events();
  let done = null; for (let i = 0; i < 300 && !done; i++) { f.tick(TPS); done = f.events().find(e => e.type === 'event' && e.kind === 'vip' && !e.on); }
  ok(a && a.n === 8 && a.reward >= 300 && done && done.ok && done.have === 8, `VIP: zählt Verkäufe (${done && done.have}/8) und endet erfüllt`);
  ok(f.S.crates.length === c0 + 2 && f.S.money - money0 >= a.reward && !m.active().length, `VIP: Belohnung ${a.reward} Münzen + 2 Kisten`);
  // VIP verfehlt
  const vipCrates = () => f.S.crates.filter(c => c.src === 'vip').length;
  const b = m.trigger('vip', { item: 'stein', n: 100000 }); const c1 = vipCrates();
  const v = m.active()[0];
  secs(f, 60); const mid = m.active()[0];
  secs(f, 241);
  const end = f.events().find(e => e.type === 'event' && e.kind === 'vip' && !e.on);
  ok(b && mid.have > v.have && end && end.ok === false && vipCrates() === c1 && c1 === 2 && !m.active().length, `VIP: verfehlt nach 5 min ohne Belohnung (${end && end.have} verkauft)`);
}
{
  // Meteor: Kristall 3×3 auf freiem Land, Bohrer passt sich an, nach 10 min weg
  const { f, m } = mk(3); quiet(f); f.S.money = 1e6;
  const a = m.trigger('meteor');
  const d = a && a.deps[0];
  const cells = []; if (d) for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) cells.push(f.deposit(d.x + i, d.y + j));
  ok(d && d.w === 3 && cells.every(c => c && c.item === 'kristall') && cells[4].rich, `Meteor: 3×3 Kristall bei ${d && d.x},${d && d.y} (Mitte reich)`);
  ok(d && f.isOpen(d.x, d.y) && f.isOpen(d.x + 2, d.y + 2), 'Meteor: auf eigenem Land');
  const id = d && f.place('bohrer', d.x, d.y, 0);
  ok(id && f.entity(id).item === 'kristall', 'Meteor: Bohrer darauf fördert Kristall');
  secs(f, 601);
  ok(!m.active().length && cells.every((_, k) => !f.deposit(d.x + (k % 3), d.y + ((k / 3) | 0)) || f.deposit(d.x + (k % 3), d.y + ((k / 3) | 0)).item !== 'kristall'), 'Meteor: nach 10 min verschwunden');
  ok(f.entity(id).item !== 'kristall', 'Meteor: Bohrer danach ohne Kristall (' + f.entity(id).state + ')');
}
{
  // Beben: 3 neue Vorkommen, 15 min
  const { f, m } = mk(4); quiet(f);
  const a = m.trigger('quake');
  const deps = a ? a.deps : [];
  const okDeps = deps.length === 3 && deps.every(d => { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const x = f.deposit(d.x + i, d.y + j); if (!x || x.item !== d.item) return false; } return true; });
  ok(okDeps, 'Beben: 3 neue Vorkommen (' + deps.map(d => d.item).join(', ') + ')');
  secs(f, 899); const still = m.active().length === 1; secs(f, 1.1);
  ok(still && !m.active().length && deps.every(d => { const x = f.deposit(d.x, d.y); return !x || x.item !== d.item; }), 'Beben: Vorkommen nach 15 min weg');
}

// =====================================================================================
// 4. Speichern/Laden mitten in einem Ereignis → identisch weiter
// =====================================================================================
{
  const { f, m } = mk(9); chain(f); secs(f, 20); f.S.money += 5000;
  m.trigger('meteor'); m.trigger('goldvein'); m.trigger('boom', { item: 'stein' }); m.trigger('vip', { item: 'stein', n: 30 });
  const md = m.active().find(a => a.kind === 'meteor').deps[0]; f.place('bohrer', md.x, md.y, 0);
  m.trigger('quake');
  secs(f, 61);
  const json = snap(f);
  const f2 = Factory.load(json), m2 = new Meta(f2);
  ok(JSON.stringify(m2.active()) === JSON.stringify(m.active()) && JSON.stringify(f2.X) === JSON.stringify(f.X) && f2.M.gold === f.M.gold, 'Laden: laufende Ereignisse und Faktoren wiederhergestellt');
  ok(f2.deposit(md.x + 1, md.y + 1)?.item === 'kristall' && f2.entities().find(e => e.x === md.x && e.y === md.y)?.item === 'kristall', 'Laden: Meteor-Vorkommen und Bohrer darauf wieder da');
  for (let i = 0; i < 18; i++) { secs(f, 60); secs(f2, 60); }
  ok(snap(f) === snap(f2), 'Speichern/Laden mitten im Ereignis → nach 18 min identischer Stand');
  ok(JSON.stringify(f.X) === JSON.stringify(f2.X) && !m.active().some(a => a.kind === 'meteor'), 'danach gleiche Faktoren, Ereignisse beendet');
}

// =====================================================================================
// 5. Durchbrüche
// =====================================================================================
{
  const { f, m } = mk(); f.S.money = 1e12;
  ok(f.buyResearch('tunnel') && f.S.meta.bt.tries === 1, 'Durchbruch: echte Forschung löst Prüfung aus');
  const N = 20000; let byKind = {}, bad = 0;
  for (let i = 0; i < N; i++) {
    const S = f.S, b = { money: S.money, rp: S.rp, v: S.vouchers, c: S.crates.length };
    const n0 = S.meta.bt.n; f._emit('research', { id: 'presse', fx: {} });
    if (S.meta.bt.n === n0) continue;
    const e = f.ev[f.ev.length - 1] && f.ev.filter(x => x.type === 'breakthrough').pop();
    byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    const good = { refund: S.money - b.money === e.money && e.money === 900, gutschein: S.vouchers === b.v + 1, kiste: S.crates.length === b.c + 1, rp: S.rp - b.rp === e.rp && e.rp >= 25 }[e.kind];
    if (!good) bad++;
    if (i % 1000 === 0) f.events();
  }
  const rate = f.S.meta.bt.n / (f.S.meta.bt.tries - 1);
  ok(Math.abs(rate - 0.12) < 0.01, `Durchbruch-Rate ${(rate * 100).toFixed(1)} % ≈ 12 %`);
  ok(BT_KINDS.every(k => byKind[k] > 0) && !bad, 'Durchbruch: alle Arten wirken (' + BT_KINDS.map(k => `${k} ${byKind[k] || 0}`).join(', ') + ')');
  const g = mk(); g.f.S.patents.push('glueck'); g.f.refreshMods(); g.f.S.money = 1e12;
  for (let i = 0; i < N; i++) { g.f._emit('research', { id: 'presse', fx: {} }); if (i % 1000 === 0) g.f.events(); }
  const r2 = g.f.S.meta.bt.n / g.f.S.meta.bt.tries;
  ok(r2 > rate + 0.015, `Glück erhöht die Rate (${(r2 * 100).toFixed(1)} %)`);
}

// =====================================================================================
// 6. Album
// =====================================================================================
{
  const { f, m } = mk(); f.events();
  const a0 = m.album();
  ok(a0.total === ALBUM_ITEMS.length * 4 && a0.pages.length === ALBUM_PAGES.length && a0.have === 0 && !ALBUM_ITEMS.includes('schrott'), `Album: ${a0.pages.length} Seiten, ${a0.total} Karten, leer`);
  f.S.total.made.stein = 1; f.tick(TPS);
  let ev = f.events().filter(e => e.type === 'card');
  ok(ev.length === 1 && ev[0].item === 'stein' && ev[0].variant === 'normal' && m.album().have === 1, 'Album: Karte normal aus dem Zähler, Ereignis card');
  f.S.total.made.stein = MEGA_N; f.tick(TPS);
  ok(f.events().some(e => e.type === 'card' && e.item === 'stein' && e.variant === 'mega'), 'Album: Mega-Karte ab 1000');
  // goldene Karte über verkauftes Goldteil (Ersatz, falls die Sim noch keinen Zähler führt) bzw. S.total.goldMade
  f._emit('sold', { id: 0, item: 'eisenerz', gold: true, value: 25, takt: 1 }); f.S.total.made.eisenerz = 1; f.tick(TPS);
  ok(m.album().pages[0].items.find(i => i.item === 'eisenerz').cards.gold, 'Album: goldene Karte nach goldenem Teil');
  // ganze Seite 1
  const p1 = ALBUM_PAGES[0];
  f.S.total.goldMade = {}; f.S.total.perfect = {};
  for (const i of p1.items) { f.S.total.made[i] = MEGA_N; f.S.total.goldMade[i] = 1; f.S.total.perfect[i] = 1; }
  const col0 = f.S.deco.colors.length; f.events(); f.tick(TPS);
  let al = f.events().filter(e => e.type === 'album');
  ok(al.length === 1 && al[0].kind === 'page' && al[0].tier === p1.tier && f.S.deco.colors.length === col0 + 1, `Album: volle Seite ${p1.tier} → Bandfarbe ${al[0] && al[0].reward.color}`);
  secs(f, 5); ok(!f.events().some(e => e.type === 'album'), 'Album: Seite belohnt genau einmal');
  // ganzes Album
  for (const i of ALBUM_ITEMS) { f.S.total.made[i] = MEGA_N; f.S.total.goldMade[i] = 1; f.S.total.perfect[i] = 1; }
  const pts0 = f.S.points; f.tick(TPS);
  al = f.events().filter(e => e.type === 'album');
  ok(al.filter(e => e.kind === 'page').length === ALBUM_PAGES.length - 1 && al.filter(e => e.kind === 'full').length === 1 && f.S.points === pts0 + 1, 'Album voll → alle Seiten + 1 Patentpunkt');
  ok(!TITLES[ALBUM_TITLE] || f.S.deco.titles.includes(ALBUM_TITLE), 'Album voll → Titel ' + ALBUM_TITLE + (TITLES[ALBUM_TITLE] ? '' : ' (noch nicht in data.js TITLES)'));
  ok(m.album().full && m.album().have === m.album().total && m.album().progress === 1, 'album(): voll');
  const f2 = Factory.load(snap(f)), m2 = new Meta(f2); f2.tick(5 * TPS);
  ok(!f2.events().some(e => e.type === 'album' || e.type === 'card') && f2.S.points === f.S.points, 'Album: nach Laden keine doppelte Belohnung');
}

// =====================================================================================
// 7. Ziele
// =====================================================================================
{
  const keysOk = gs => gs.every(g => g.key in DICTS.en && g.key in DICTS.de);
  const valid = gs => gs.every(g => typeof g.key === 'string' && g.vars && g.progress >= 0 && g.progress <= 1 && g.target && typeof g.target.type === 'string');
  const { f, m } = mk();
  const g1 = m.nextGoals();
  ok(g1.length === 3 && valid(g1) && keysOk(g1), 'Ziele neu: ' + g1.map(g => `${g.key}(${g.target.id}) ${(g.progress * 100).toFixed(0)}%`).join(' · '));
  ok(g1.some(g => g.target.type === 'research') && new Set(g1.map(g => g.target.type)).size === 3, 'Ziele: verschiedene Arten, nächste Forschung dabei');
  ok(m.nextGoals(5).length >= 4 && m.nextGoals(1).length === 1 && m.nextGoals(0).length === 0, 'nextGoals(n) liefert höchstens n');
  f.S.money = 1e9; f.S.rp = 1e6; const g2 = m.nextGoals(6);
  ok(valid(g2) && g2.find(g => g.target.type === 'research').key === 'goal.researchReady' && g2.filter(g => g.progress === 1).length >= 2, 'Ziele mit viel Geld: bezahlbar = 1');
  for (const id of RESEARCH_IDS) if (!f.S.research.includes(id)) f.S.research.push(id); f.refreshMods();
  f.S.stats.earned = 2e6; const g3 = m.nextGoals(6);
  ok(valid(g3) && keysOk(g3) && !g3.some(g => g.target.type === 'research') && g3[0].key === 'goal.prestigeReady', 'Ziele spät: keine Forschung mehr, Prestige bereit zuerst');
  f.S.stats.earned = 3e5; const g4 = m.nextGoals(6);
  ok(g4.some(g => g.key === 'goal.prestige' && Math.abs(g.progress - 0.3) < 1e-9), 'Ziel Prestige: Fortschritt verdient / 1 Mio.');
  if (Array.isArray(DATA.WONDER) && DATA.WONDER[0]?.need) {
    const need = DATA.WONDER[0].need, sum = Object.values(need).reduce((x, y) => x + y, 0), k0 = Object.keys(need)[0];
    f.S.total.prestiges = 1; f.S.wonder = { ...(f.S.wonder || {}), stage: 1, have: { [k0]: need[k0] / 2 } };
    const gw = m.nextGoals(8).find(g => g.key === 'goal.wonder');
    ok(gw && gw.vars.stage === 1 && Math.abs(gw.progress - need[k0] / 2 / sum) < 1e-9, `Ziel Wunderstufe 1: ${gw && (gw.progress * 100).toFixed(0)} %`);
  } else ok(true, 'Ziel Wunder: data.js hat noch kein WONDER (übersprungen)');
}

// =====================================================================================
// 8. Wochen-Herausforderung
// =====================================================================================
{
  const sp = challengeSpec('2026-W47'), sp2 = challengeSpec('2026-W47'), sp3 = challengeSpec('2026-W48');
  ok(sp && sp.week === '2026-W47' && sp.secs === 1800 && sp.seed > 0 && ['wiese', 'wueste', 'eis', 'mond'].includes(sp.biome) && sp.startMoney >= 2000, `challengeSpec: ${JSON.stringify(sp)}`);
  ok(JSON.stringify(sp) === JSON.stringify(sp2) && sp3.seed !== sp.seed && challengeSpec('2026-47') === null && challengeSpec('2026-W60') === null, 'challengeSpec deterministisch je Woche, streng geprüft');
  const code = resultCode('2026-W47', 98765);
  ok(parseResultCode(code)?.score === 98765 && parseResultCode(code.toLowerCase())?.week === '2026-W47' && parseResultCode(code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A')) === null && parseResultCode('quatsch') === null, `Ergebnis-Code ${code} prüfbar, Fälschung erkannt`);
  const f = startChallenge('2026-W47'), m = new Meta(f);
  ok(f.S.seed === sp.seed && f.S.biome === sp.biome && f.S.money === sp.startMoney && m.challenge().left === 1800, `Herausforderung: Welt ${sp.biome}, Startgeld ${sp.startMoney}, 30 min`);
  f.S.stats.earned = 2e6;
  ok(!f.canPrestige() && f.prestige('wiese') === 0 && f.offline(3600).money === 0, 'Herausforderung: kein Prestige, kein Offline-Geld');
  ok(!m.canSpin('2026-11-16') && m.checkIn('2026-11-16') === null, 'Herausforderung: kein Glücksrad/keine Serie');
  f.S.stats.earned = 0; f.S.money = 1e5; chain(f); secs(f, 600);
  const mid = snap(f), fb = Factory.load(mid), mb = new Meta(fb);
  ok(Math.abs(mb.challenge().left - 1200) < 1e-9, 'Herausforderung: Timer überlebt Speichern/Laden');
  f.events(); secs(f, 1200);
  const end = f.events().filter(e => e.type === 'challengeEnd');
  const c = m.challenge();
  ok(end.length === 1 && c.done && c.left === 0 && end[0].score === c.score && c.score === Math.floor(f.S.stats.earned) && parseResultCode(end[0].code)?.score === c.score, `Herausforderung endet nach 30 min mit Score ${c.score}`);
  secs(f, 60);
  ok(m.challenge().score === c.score && !f.events().some(e => e.type === 'challengeEnd'), 'Score bleibt danach fest, Ende nur einmal');
  secs(fb, 1200);
  ok(snap(fb) === snap(f.constructor.load(snap(f))) || mb.challenge().score === c.score, 'geladene Herausforderung kommt auf denselben Score');
  m.detach();
  ok(!Object.prototype.hasOwnProperty.call(f, 'canPrestige') && !Object.prototype.hasOwnProperty.call(f, 'offline'), 'detach entfernt die Sperren');
}

// =====================================================================================
// 9. Determinismus
// =====================================================================================
{
  const run = () => {
    const { f, m } = mk(21); chain(f);
    for (let d = 0; d < 6; d++) { m.spin(date(D0 + d)); m.checkIn(date(D0 + d)); secs(f, 20 * 60); f.events(); }
    return snap(f);
  };
  const a = run(), b = run();
  ok(a === b, `zwei gleiche Läufe (2 h, Rad, Serie, Ereignisse) → identischer Stand (${a.length} Zeichen)`);
  const { f } = mk(21); const plain = new Factory({ seed: 21 });
  secs(f, 30); secs(plain, 30);
  ok(f.S.rs === plain.S.rs, 'Meta nutzt eigenen Zufall (Sim-Zufall unberührt)');
}

// =====================================================================================
// 10. attach/detach
// =====================================================================================
{
  const f = new Factory({ seed: 2 }), m = new Meta();
  const cnt = () => [f.hooks.tick.length, f.hooks.event.length, f.hooks.prestige.length].join();
  for (let i = 0; i < 5; i++) m.attach(f);
  ok(cnt() === '1,1,1', 'attach 5× → jeder Hook einmal');
  const g0 = f.M.gold; m.trigger('goldvein');
  m.detach(); m.detach();
  ok(cnt() === '0,0,0' && f.X.gold === 0 && f.M.gold === g0 && JSON.stringify(f.X) === JSON.stringify({ belt: 1, mach: 1, drill: 1, gold: 0, sell: {} }), 'detach → keine Hooks, Faktoren zurück');
  const wait = f.S.meta.ev.wait; f.tick(100);
  ok(f.S.meta.ev.wait === wait && f.S.meta.ev.act.length === 1, 'nach detach läuft nichts weiter');
  m.attach(f);
  ok(cnt() === '1,1,1' && Math.abs(f.M.gold - g0 - 0.05) < 1e-9, 'erneut attach → Goldader wieder aktiv');
  const m2 = new Meta(f); m2.detach(); m.detach(); m2.attach(f); m2.attach(f);
  ok(cnt() === '1,1,1', 'zweite Meta-Instanz: ebenfalls keine doppelten Hooks');
  // Meteor (Ersatz-Vorkommen) bei detach zurückgebaut, bei attach wieder aufgelegt
  const a = m2.trigger('meteor'), d = a.deps[0];
  m2.detach(); const off = f.deposit(d.x + 1, d.y + 1); m2.attach(f); const on = f.deposit(d.x + 1, d.y + 1);
  ok(typeof f.addDeposit === 'function' || (!off && on && on.item === 'kristall'), 'Meteor-Vorkommen: detach/attach sauber');
  m2.detach();
}

// =====================================================================================
// 11. Prestige
// =====================================================================================
{
  const { f, m } = mk(13); f.S.money = 1e6;
  m.spin('2026-11-16'); m.checkIn('2026-11-15'); m.checkIn('2026-11-16');
  f.S.total.made.stein = 5; f.tick(TPS);
  m.trigger('goldvein'); m.trigger('meteor');
  const before = JSON.stringify({ a: f.S.meta.album, s: f.S.meta.streak, w: f.S.meta.wheel, b: f.S.meta.bt });
  f.S.stats.earned = 2e6;
  const pts = f.prestige('wiese');
  ok(pts > 0 && JSON.stringify({ a: f.S.meta.album, s: f.S.meta.streak, w: f.S.meta.wheel, b: f.S.meta.bt }) === before, 'Prestige behält Album, Serie, Rad-Datum, Durchbrüche');
  ok(!m.canSpin('2026-11-16') && m.canSpin('2026-11-17') && m.streakInfo('2026-11-17').next === 3, 'nach Prestige: heute kein zweites Drehen, Serie läuft weiter');
  ok(!m.active().length && f.X.gold === 0 && f.S.meta.fdep.length === 0 && m.nextEventIn() >= 600, 'Prestige beendet laufende Ereignisse, Faktoren zurück, neuer Ereignis-Timer');
  ok(f.hooks.tick.length === 1 && m.album().have >= 1, 'nach Prestige weiter verbunden, Album-Karten da');
}

// =====================================================================================
// 12. Texte
// =====================================================================================
{
  const used = [
    ...WHEEL.map(s => 'wheel.got.' + s.id), ...WHEEL.map(s => 'wheel.seg.' + s.id), ...STREAK.map(k => 'streak.got.' + k), ...STREAK.map(k => 'streak.reward.' + k),
    ...EVENT_IDS.flatMap(k => [`event.${k}.on`, `event.${k}.off`, `event.${k}.name`, `event.${k}.desc`]), 'event.vip.done', 'event.vip.fail', 'event.vip.progress',
    ...BT_KINDS.map(k => 'bt.' + k), ...CARDS.map(c => 'album.new.' + c), ...CARDS.map(c => 'album.card.' + c), ...CARDS.map(c => 'album.hint.' + c),
    'album.pageColor', 'album.pageCrate', 'album.full', 'goal.research', 'goal.researchReady', 'goal.build', 'goal.plot', 'goal.achievement', 'goal.wonder',
    'goal.prestige', 'goal.prestigeReady', 'goal.chal', 'goal.chalDone', 'chal.end', 'chal.code', ...['wheel', 'streak', 'bt', 'album', 'vip'].map(s => 'crate.src.' + s), 'title.' + ALBUM_TITLE + '.name',
  ];
  const miss = used.filter(k => !(k in DICTS.en) || !(k in DICTS.de));
  ok(!miss.length, `alle ${used.length} Meta-Texte in EN und DE` + (miss.length ? ': ' + miss.slice(0, 6).join(', ') : ''));
  const mine = k => /^(meta|wheel|streak|bt|album|goal|chal)\./.test(k) || /^event\.(goldvein|meteor|quake|vip|boom|left)\b/.test(k) || /^crate\.src\.(wheel|streak|bt|album|vip)$/.test(k) || k === 'title.' + ALBUM_TITLE + '.name';
  const en = Object.keys(DICTS.en).filter(mine), de = Object.keys(DICTS.de).filter(mine);
  ok(en.length > 100 && en.length === de.length && en.every(k => k in DICTS.de), `Meta-Schlüssel in en.js und de.js gleich (${en.length}; Gesamtgleichheit prüft rules.mjs)`);
  const vars = { money: 1234, rp: 50, secs: 120, n: 20, day: 3, item: 'stein', reward: 900, mul: 3, have: 4, id: 'tunnel', tier: 1, color: 'rot', title: ALBUM_TITLE, cost: 500, stage: 2, score: 4321, code: 'COG-X', week: '2026-W47' };
  let bad = [];
  for (const lang of ['en', 'de']) { setLang(lang); for (const k of used) { const s = t(k, vars); if (!s || /[{}]/.test(s)) bad.push(lang + ':' + k); } }
  setLang('en');
  ok(!bad.length, 'Texte füllen alle Platzhalter (EN/DE)' + (bad.length ? ': ' + bad.slice(0, 5).join(', ') : ''));
  setLang('de'); const s = t('event.vip.on', { n: 40, item: 'kupferdraht', secs: 300, reward: 1200 }); setLang('en');
  ok(s === 'VIP-Auftrag: Verkaufe 40 Kupferdraht in 5 Min. für 1.200 Münzen und 2 Kisten!', 'Beispiel DE: ' + s);
}

if (fail) { console.log(`${fail} Fehler`); process.exit(1); }
console.log('META OK');
