// Game logic: state, survival values, interactions (E), items, crafting, quests / tutorial, discoveries, power, lights, weather,
// campfires, save / load. The map's interactive objects come from Blender (userData.interact, see game/blender/core.py).
import * as THREE from 'three';
import { ITEMS, RECIPES, WEAPONS, BLUEPRINTS, TRADE } from './items.js';
import { B, Bv } from './world.js';
import { Life, roadX, creekX, DIFF } from './life.js';
import { Build } from './build.js';
import { Combat } from './combat.js';
import { Progress } from './progress.js';
import { Vehicle } from './vehicle.js';
import { Seasons } from './seasons.js';
import { Health } from './health.js';
import { Boat } from './boat.js';
import { REGIONS, regionOf, PASS, BERG_IN, LAKES, bergRoadDist } from './regions.js';
import { Mood } from './mood.js';
import { Album } from './album.js';
import { Story } from './story.js';
import { Ice } from './ice.js';
import { Orders } from './orders.js';

// Save games: slots auto / 1 / 2 / 3 in localStorage (+ export / import as a file). Everything is stored by name or id, so a newer
// version of the map or the game can load an older save: unknown objects / items are skipped, new ones start in their default state.
export const SLOTS = ['auto', 'kreativ', '1', '2', '3'];            // 'kreativ' = the automatic slot of the creative mode
const SAVE_PREFIX = 'waldtank_save_', OLD_SAVE = 'waldtank_save_v1', SAVE_VERSION = 4;
const POOL = 8;
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const MOVING = new Set(['door', 'slide', 'lid', 'drawer']);
const DIFF_DMG = g => g.creative ? 0 : Math.max(.5, DIFF[g.S.diff]?.dmg || .5);         // storms hurt a little even without enemies

export class Game {
  constructor(scene, camera, W, player, audio, sky, ui) {
    Object.assign(this, { scene, camera, W, P: player, audio, sky, ui });
    this.S = this.fresh(); this.extraLights = []; this.slow = 1; this.torchOn = false; this.onHochsitz = false;
    this.pool = [];
    for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight('#ffffff', 0, 16, 1.6); scene.add(l); this.pool.push(l); }
    this.life = new Life(scene, W, this);
    this.ray = new THREE.Raycaster(); this.ray.far = 2.8;
    this.intMeshes = [];
    for (const it of W.interactives) {
      it.basePos = it.pivot.position.clone(); it.baseQuat = it.pivot.quaternion.clone();
      it.center = new THREE.Box3().setFromObject(it.node).getCenter(new THREE.Vector3());
      it.node.traverse(m => { if (m.isMesh) this.intMeshes.push(m); });
    }
    this.byName = Object.fromEntries(W.interactives.map(it => [it.name, it]));
    this.hazardMats = []; scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.name === 'Warnblinker' && !this.hazardMats.includes(m)) this.hazardMats.push(m); });
    this.quests = this.makeQuests(); this.places = this.makePlaces();
    this.chop = 0; this.saveT = 0; this.tipT = 0; this.birdT = 3; this.heartT = 0; this.candleT = 0;
    this.progress = new Progress(this); this.build = new Build(this); this.combat = new Combat(this);
    this.vehicle = new Vehicle(this); this.seasons = new Seasons(this); this.drops = []; this.secT = 0;
    this.health = new Health(this); this.boat = new Boat(this); this.waterT = 0; this.edgeT = 0; this.traveling = false;
    this.mood = new Mood(this); this.album = new Album(this); this.story = new Story(this); this.ice = new Ice(this); this.orders = new Orders(this); this.shake = 0;
    for (const it of W.interactives) if (it.u.hidden) it.node.visible = false;          // e.g. the treasure chest: shows up when dug out
    this.funkMats = []; scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.name === 'Display_Funk' && !this.funkMats.includes(m)) { m.emissive = new THREE.Color('#000000'); this.funkMats.push(m); } });
    try { this.S.diff = localStorage.getItem('waldtank_diff') || 'mittel'; } catch { }
  }
  fresh() {
    return { time: 17.0, day: 1, abs: 17, stats: { health: 100, hunger: 78, thirst: 72, warmth: 85, stamina: 100 }, inv: [], sel: 0,
      battery: 65, genFuel: 0, quest: 0, flags: {}, found: {}, known: {}, marks: [], felled: {}, ammo: {}, mag: {}, diff: 'mittel',
      xp: 0, side: {}, stat: {}, notes: {}, money: 0, car: { fixed: 0, fuel: 0 }, dog: { tame: 0, sit: 0 }, drops: [], weather: 'klar', ill: { erk: 0, mag: 0 }, badges: {}, boat: null,
      rain: 0, rainUntil: 0, nextRain: 19 + Math.random() * 6, rescueAt: 0, album: {}, diary: {}, radio: {}, iceHoles: [], creative: 0 };
  }
  // creative mode: no survival values, no damage, building and crafting without material, tools or level (Kreativ-Menü K)
  get creative() { return !!this.S.creative; }
  startCreative() {
    const S = this.S; S.creative = 1; S.flags.free = 1; S.flags.bag = S.flags.expbag = 1; S.quest = this.quests.length; S.money = 999; S.time = 10;
    for (const k of ['axt', 'hammer', 'spaten', 'saege', 'angel', 'messer', 'taschenlampe', 'karte', 'feuerzeug', 'handfunk']) if (!this.has(k)) this.add(k, 1, true);
    for (const p of this.places) S.known[p.id] = 1;
    this.ui.toast('🎨 Kreativ-Modus: kein Hunger, kein Schaden – bauen und herstellen ohne Material. K = Kreativ-Menü (Gegenstände, Zeit, Wetter, Ereignisse), V = fliegen.', 'good');
  }

  // ---------------------------------------------------------------- inventory
  // backpack tiers: pockets 10 · Rucksack 20 · Großer 28 · Trekking 36 · Expedition 48 (a bag you wear only ever upgrades)
  capacity() { const f = this.S.flags; return this.creative ? 48 : f.expbag ? 48 : f.trekbag ? 36 : f.bigbag ? 28 : f.bag ? 20 : 10; }
  wearBag(flag, name, quiet) {
    const before = this.capacity(); this.S.flags.bag = true; this.S.flags[flag] = true; const now = this.capacity();
    if (!quiet) this.ui.toast(now > before ? `🎒 ${name} aufgesetzt – jetzt ${now} Plätze.${flag === 'bag' ? ' Tab öffnet ihn.' : ''}` : `🎒 ${name} – dein Rucksack ist schon größer (${now} Plätze).`, now > before ? 'good' : '');
    return true;
  }
  hasAxe() { return this.has('axt') || this.has('profiaxt') || this.creative; }
  blueprints() { return BLUEPRINTS; } recipes() { return RECIPES; }
  // several items at once – only if all fit
  addAll(gives) {
    const need = Object.entries(gives).filter(([k]) => !ITEMS[k]?.ammo && !ITEMS[k]?.equip), free = this.capacity() - this.S.inv.length;
    const newSlots = need.reduce((a, [k, n]) => { const max = ITEMS[k]?.mat ? 30 : 10, room = this.S.inv.filter(s => s.id === k).reduce((b, s) => b + max - s.n, 0); return a + Math.max(0, Math.ceil((n - room) / max)); }, 0);
    if (newSlots > free) { this.ui.toast('Dein Rucksack ist voll.', 'warn'); this.audio.sfx('error'); return false; }
    for (const [k, n] of Object.entries(gives)) this.add(k, n, true); return true;
  }
  // inside a building (shop, village houses, chapel, mill, trailer, caravan, your cabin)? → warm-ish, dry, safe from animals
  indoor(p) {
    if (this.insideShop(p)) return 'shop';
    const bx = p.x, by = -p.z, bz = p.y;
    for (const r of this.W.indoor) if (bx > r.x0 && bx < r.x1 && by > r.y0 && by < r.y1 && bz > r.z0 && bz < r.z1) return r.name;
    return this.build.indoor(p) ? 'cabin' : null;
  }
  count(id) { return this.S.inv.filter(s => s.id === id).reduce((a, s) => a + s.n, 0); }
  has(id) { return this.count(id) > 0; }
  brenn() { return this.count('ast') + this.count('holz'); }
  add(id, n = 1, quiet = false, f) {
    const it = ITEMS[id];
    if (['bag', 'bigbag', 'trekbag', 'expbag'].includes(it?.equip)) return this.wearBag(it.equip, it.name, quiet);
    if (it?.equip === 'jacket') { this.S.flags.jacket = true; if (!quiet) this.ui.toast('🧥 Jacke angezogen – du frierst nur noch halb so schnell.'); return true; }
    if (it?.battery && this.has('taschenlampe')) { this.S.battery = 100; if (!quiet) this.ui.toast('🔋 Taschenlampe aufgeladen.'); return true; }
    if (it?.ammo) { for (let i = 0; i < n; i++) this.combat.addAmmo(id); return true; }
    if (id === 'geld') { this.S.money = +(this.S.money + 43.2 * n).toFixed(2); if (!quiet) this.ui.toast('💶 43,20 € eingesteckt. Im Dorf gibt es einen Händler …'); return true; }
    if (it?.equip === 'fur') { this.S.flags.fur = true; if (!quiet) this.ui.toast('🧥 Fellmantel angezogen – dir wird so schnell nicht mehr kalt.'); return true; }
    const max = it?.mat ? 30 : 10, inv = this.S.inv;
    const room = inv.filter(s => s.id === id).reduce((a, s) => a + max - s.n, 0) + (this.capacity() - inv.length) * max;
    if (room < n) { this.ui.toast(this.S.flags.bag ? 'Dein Rucksack ist voll.' : 'Deine Taschen sind voll – du brauchst einen Rucksack.', 'warn'); this.audio.sfx('error'); return false; }
    let left = n;
    const fresh = it?.spoil ? (f ?? it.spoil) : undefined;                 // food: the stack keeps the oldest freshness
    while (left > 0) { let s = inv.find(s => s.id === id && s.n < max); if (!s) { s = { id, n: 0 }; if (fresh !== undefined) s.f = fresh; inv.push(s); } else if (fresh !== undefined) s.f = Math.min(s.f ?? it.spoil, fresh);
      const k = Math.min(left, max - s.n); s.n += k; left -= k; }
    this.album?.see('i_' + id);
    if (!quiet) this.ui.toast(`+ ${n > 1 ? n + '× ' : ''}${it?.icon || ''} ${it?.name || id}${it?.rare ? ' ★ selten!' : ''}`, it?.rare ? 'good' : ''); this.ui.renderHotbar(inv, this.S.sel); return true;
  }
  take(id, n = 1) {
    for (let i = this.S.inv.length - 1; i >= 0 && n > 0; i--) { const s = this.S.inv[i]; if (s.id !== id) continue; const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) this.S.inv.splice(i, 1); }
    this.S.sel = Math.min(this.S.sel, 4); this.ui.renderHotbar(this.S.inv, this.S.sel);
  }
  swap(a, b) { this.take(a); this.add(b, 1, true); }
  // put backpack slot i into hand slot k (1–5 bar = the first five backpack slots): swap the two; a gap in the bar → it goes to the end
  toHand(i, k = this.S.sel) {
    const inv = this.S.inv; if (!inv[i] || k < 0 || k > 4) return false;
    if (k >= inv.length) k = inv.length - 1;
    if (i !== k) [inv[i], inv[k]] = [inv[k], inv[i]];
    this.S.sel = k; this.audio.sfx('pickup'); this.ui.renderHotbar(inv, k);
    this.ui.toast(`✋ ${ITEMS[inv[k].id].icon} ${ITEMS[inv[k].id].name} in der Hand (Platz ${k + 1}).`); return true;
  }
  useSlot(i) {
    const s = this.S.inv[i]; if (!s) return; const it = ITEMS[s.id];
    if (s.id === 'fackel') { if (this.torchOn) return this.ui.toast('Die Fackel brennt schon.'); if (!this.has('feuerzeug')) return this.ui.toast('Du brauchst ein Feuerzeug.');
      this.take('fackel'); this.torchOn = true; this.torchT = 240; this.audio.sfx('fire'); return this.ui.toast('🔥 Fackel angezündet (4 Minuten).'); }
    if (it.read) return this.read(s.id);
    if (it.weapon) return this.ui.toast(`${it.icon} ${it.name}: Linksklick = ${WEAPONS[it.weapon].melee ? 'zustechen' : 'schießen, R = nachladen, rechte Maustaste = zielen'}.`);
    if (s.id === 'spieluhr') { this.audio.sfx('musicbox'); return this.ui.toast('🎶 Die Spieluhr klimpert ein altes Wiegenlied …'); }
    if (s.id === 'kerze') { if (!this.has('feuerzeug')) return this.ui.toast('Du brauchst ein Feuerzeug.'); this.take('kerze'); this.candleT = 180; return this.ui.toast('🕯️ Die Kerze brennt.'); }
    if (it.battery && this.has('taschenlampe')) { this.take(s.id); this.S.battery = 100; return this.ui.toast('🔋 Taschenlampe aufgeladen.'); }
    if (!it.use) return this.ui.toast(it.desc || 'Damit kann man so nichts anfangen.');
    const st = this.S.stats;
    const table = this.build.near('tisch', this.P.pos, 2.2) ? 1.2 : 1;
    for (const [k, v] of Object.entries(it.use)) st[k] = clamp(st[k] + (k === 'hunger' && v > 0 ? v * table : v));
    if (it.use.hunger > 0) this.S.flags.ate = 1; if (it.use.thirst > 0) this.S.flags.drank = 1; this.progress.stat('eaten'); this.health.eat(s.id);
    if (it.boost) this.boostT = it.boost;
    this.audio.sfx(it.use.thirst > it.use.hunger || it.use.thirst > 0 && !it.use.hunger ? 'drink' : 'eat');
    this.take(s.id); if (it.after) this.add(it.after, 1, true);
    if (it.msg) this.ui.toast(it.msg, it.poison ? 'warn' : ''); if (it.poison) this.ui.damage();
  }
  // dropped items stay on the ground (saved) – E picks them up again
  drop(i) {
    const s = this.S.inv[i]; if (!s) return; this.S.inv.splice(i, 1);
    const f = this.P.forward(new THREE.Vector3()); f.y = 0; f.normalize(); const p = this.P.pos.clone().addScaledVector(f, .9);
    const fl = this.build.room(p)?.floor; p.y = fl ?? this.W.groundY(p.x, p.z, this.P.pos.y + 1.2);
    this.addDrop({ id: s.id, n: s.n, p: p.toArray().map(v => +v.toFixed(2)), f: s.f });
    this.ui.toast(`${ITEMS[s.id].icon} ${ITEMS[s.id].name} abgelegt – mit E wieder aufheben.`); this.ui.renderHotbar(this.S.inv, this.S.sel);
  }
  addDrop(d) {
    const it = ITEMS[d.id]; if (!it) return; const g = new THREE.Group(); g.position.fromArray(d.p);
    const tpl = this.W.bp['r_' + d.id];
    let bag; if (tpl) { bag = tpl.clone(true); bag.scale.multiplyScalar(d.id === 'meteorit' ? 2.2 : 1.6); bag.traverse(m => { if (m.isMesh) m.castShadow = true; }); }
    else if (d.id === 'meteorit') { bag = new THREE.Mesh(new THREE.DodecahedronGeometry(.22, 0), new THREE.MeshStandardMaterial({ color: '#2a2422', emissive: '#ff6a1a', emissiveIntensity: .6, flatShading: true, roughness: .8 })); bag.position.y = .12; }
    else { bag = new THREE.Mesh(new THREE.DodecahedronGeometry(.13, 0), new THREE.MeshStandardMaterial({ color: '#b08d57', flatShading: true, roughness: .95 })); bag.scale.set(1.2, .7, 1); bag.position.y = .08; bag.castShadow = true; }
    g.add(bag);
    if (d.id === 'meteorit') { d.light = { pos: g.position.clone().add(new THREE.Vector3(0, .5, 0)), color: new THREE.Color('#ff7a2a'), power: 14, group: 'fire' }; this.extraLights.push(d.light); }
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = '48px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(it.icon, 32, 36);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false })); sp.scale.setScalar(.32); sp.position.y = .42; g.add(sp);
    this.scene.add(g); const rec = { ...d, g }; this.drops.push(rec); this.S.drops = this.drops.map(({ id, n, p, f }) => ({ id, n, p, f })); return rec;
  }
  takeDrop(r) { if (!this.add(r.id, r.n, false, r.f)) return; this.scene.remove(r.g); if (r.light) { r.light.power = 0; this.extraLights.splice(this.extraLights.indexOf(r.light), 1); } this.drops.splice(this.drops.indexOf(r), 1); this.S.drops = this.drops.map(({ id, n, p, f }) => ({ id, n, p, f })); this.audio.sfx('pickup'); }
  dropTarget(o, f) { let best = null, ba = .2; for (const r of this.drops) { const d = r.g.position.clone().add(new THREE.Vector3(0, .15, 0)).sub(o), L = d.length(); if (L > 2.6) continue; const a = d.normalize().angleTo(f); if (a < ba) { ba = a; best = r; } } return best; }
  // trader Kurt
  buy(id) { const pr = TRADE.buy[id]; if (!pr || this.S.money < pr) return;
    const eq = ITEMS[id]?.equip; if (eq && this.S.flags[eq]) return this.ui.toast(`Kurt: „Den ${ITEMS[id].name} hast du doch schon auf dem Rücken.“`); if (!this.add(id, 1)) return; this.S.money = +(this.S.money - pr).toFixed(2); this.audio.sfx('coins'); this.progress.add(2, ''); }
  sell(id, all) { const pr = TRADE.sell[id], n = all ? this.count(id) : Math.min(1, this.count(id)); if (!pr || !n) return; this.take(id, n); this.S.money = +(this.S.money + pr * n).toFixed(2);
    this.progress.stat('sold_' + id, n); this.progress.stat('earned', pr * n); this.audio.sfx('coins'); this.ui.toast(`💶 ${n}× ${ITEMS[id].name} verkauft: +${(pr * n).toFixed(2).replace('.', ',')} €`); }
  talk(what) {
    if (what === 'story' && Object.keys(this.S.notes).length >= 5) { this.S.flags.kurtStory = 1; this.add('patronen_gewehr', 1, true); this.ui.toast('Kurt: „Brandt! Hab ich’s doch gewusst. Hier, nimm die Patronen – für alle Fälle.“', 'good'); what = 'radio'; }
    if (what === 'radio' && this.S.flags.kurtStory && !this.S.flags.gotRadio) { if (!this.add('handfunk', 1, true)) return; this.S.flags.gotRadio = 1; this.audio.sfx('radio');
      setTimeout(() => this.ui.toast('Kurt: „Und nimm mein altes Funkgerät. Kanal 7 – abends hört man manchmal Leute aus der Stadt. Find raus, was Brandt vorhat!“', 'good'), 1800); }
    if (what === 'order') this.orders.accept(); if (what === 'deliver') this.orders.deliver();
  }
  // sleep in a bed until 7:00 (from 18:00): time passes, you heal, fields grow, the night's animals are gone
  sleep(bed) {
    const S = this.S, ui = this.ui, P = this.P;
    if (S.time > 6 && S.time < 18) return ui.toast('Du bist nicht müde. Schlafen geht ab 18 Uhr.');
    const foe = this.life.animals.some(a => ['wolf', 'boar', 'bear', 'grimm'].includes(a.kind) && a.state !== 'dead' && a.pos.distanceTo(P.pos) < 30);
    if (foe && !this.indoor(P.pos)) { this.audio.sfx('error'); return ui.toast('Zu gefährlich – Raubtiere in der Nähe!', 'warn'); }
    const hours = S.time >= 18 ? 24 - S.time + 7 : 7 - S.time;
    ui.fade?.(); this.audio.sfx('sleep');
    setTimeout(() => {
      S.time += hours; if (S.time >= 24) { S.time -= 24; S.day++; } S.abs = (S.day - 1) * 24 + S.time;
      const st = S.stats, warm = this.indoor(P.pos) || this.life.fires.some(f => f.on && f.pos.distanceTo(P.pos) < 5);
      st.hunger = clamp(st.hunger - hours * 1.6); st.thirst = clamp(st.thirst - hours * 2.1); st.warmth = warm ? Math.max(st.warmth, 70) : clamp(st.warmth - hours * 3 * (S.flags.fur ? .25 : 1));
      st.health = clamp(st.health + (bed?.type === 'bett' ? 45 : 30)); st.stamina = 100;
      if (S.genFuel > 0) S.genFuel = Math.max(0, S.genFuel - hours);
      for (const f of this.life.fires) { f.fuel -= hours; if (f.fuel <= 0) { f.fuel = 0; f.on = false; } }
      this.build.update(0, hours); this.health.update(0, hours, true); this.life.clear(); this.S.flags.slept = 1; this.progress.stat('slept');
      ui.toast(`☀️ Gut geschlafen. Tag ${S.day}, 7:00 Uhr.${st.hunger < 30 || st.thirst < 30 ? ' Du hast Hunger und Durst.' : ''}`, 'good'); this.save();
    }, 1200);
  }
  canCraft(r) {
    if (this.creative) return !(r.place === 'fire' && this.insideShop(this.P.pos));
    if (r.bench && !this.build.hasBench(this.P.pos)) return false;
    if (r.lvl && this.progress.level < r.lvl) return false;
    for (const t of r.tools || []) if (!this.has(t)) return false;
    if (r.anyTool && !r.anyTool.some(t => this.has(t))) return false;
    for (const [k, v] of Object.entries(r.needs)) if ((k === 'brenn' ? this.brenn() : this.count(k)) < v) return false;
    return !(r.place === 'fire' && this.insideShop(this.P.pos));
  }
  craft(id) {
    const r = RECIPES.find(r => r.id === id); if (!r || !this.canCraft(r)) return;
    if (!this.creative) for (const [k, v] of Object.entries(r.needs)) {
      if (k === 'brenn') { let n = v; const a = Math.min(n, this.count('ast')); this.take('ast', a); n -= a; this.take('holz', n); } else this.take(k, v);
    }
    if (r.place === 'fire') {
      const f = this.P.forward(); f.y = 0; f.normalize(); const p = this.P.pos.clone().addScaledVector(f, 1.6); p.y = this.W.groundY(p.x, p.z, this.P.pos.y + 1);
      this.life.addFire(p, 6); this.audio.sfx('fire'); this.ui.toast('🔥 Lagerfeuer brennt. E = Holz nachlegen, kochen.');
    } else {
      if (r.ammoN) { const w = ITEMS[Object.keys(r.gives)[0]].ammo[0]; this.S.ammo[w] = (this.S.ammo[w] || 0) + r.ammoN; }
      else for (const [k, v] of Object.entries(r.gives)) this.add(k, r.id === 'bretter' && this.has('saege') ? 4 : v, true);
      this.audio.sfx('craft'); this.ui.toast(`🛠️ ${r.name} hergestellt.`); this.progress.add(r.bench ? 8 : 4, r.name); this.progress.stat('crafted');
    }
    this.ui.renderInventory(this);
  }
  read(id) {
    if (id === 'notiz_hochsitz') { this.S.flags.notiz = 1; this.ui.read('Notizzettel', this.byName.Notizzettel?.u.text || ''); }
  }

  // ---------------------------------------------------------------- world helpers
  insideShop(p) { return p.x > 21.1 && p.x < 36.9 && p.z > -9.9 && p.z < 9.9 && p.y < 4; }
  region(p = this.P.pos) { return regionOf(-p.z); }
  surface(p) {
    const bx = p.x, by = -p.z;
    if (this.boat?.on) return 'water';
    if (this.onIce) return 'ice';
    if (this.region(p) === 'berg') { const d = bergRoadDist(bx, by); return this.indoor(p) ? 'wood' : d < 3 ? 'asphalt' : d < 4.2 ? 'gravel' : p.y > 40 ? 'gravel' : 'grass'; }
    if (this.insideShop(p)) return 'tile';
    if (this.onHochsitz || (bx > 42.4 && bx < 45.6 && by > -13.4 && by < -10.6)) return 'wood';
    if (Math.abs(bx - creekX(by)) < 2.2) return 'water';
    if (bx > 38 && bx < 47 && by > -15 && by < 15) return 'gravel';
    if (bx > -2.5 && bx < 38 && by > -24 && by < 26) return 'asphalt';
    const d = Math.abs(bx - roadX(by));
    return d < 3.6 ? 'asphalt' : d < 4.6 ? 'gravel' : d < 11 ? 'grass' : 'forest';
  }
  strom() { return this.S.genFuel > 0; }
  posOf(name) { const it = this.byName[name]; if (it) return it.center; const s = this.W.spots[name]; return s ? s.pos : null; }
  hurt(n, cause) {
    if (this.S.flags.dead || this.S.flags.won || this.creative) return;
    this.S.stats.health = clamp(this.S.stats.health - n); this.ui.damage(); this.audio.sfx('hurt'); this.lastCause = cause;
  }
  respawnFall() { const s = this.W.spots.spawn; this.P.setPose(s.pos.clone().setY(s.pos.y - 1.6), this.P.yaw); }

  // ---------------------------------------------------------------- interaction target (what the crosshair points at)
  findTarget() {
    const cam = this.camera, f = this.P.forward(), o = cam.position;
    if (this.P.climb) return null;
    for (const fi of this.life.fires) if (fi.owned) { const d = fi.pos.clone().sub(o); if (d.length() < 2.4 && d.normalize().angleTo(f) < .35) return { fire: fi }; }   // fireplace inside a structure
    if (this.vehicle.driving) return { exit: true };
    if (this.boat.on) return { boatExit: true };
    const dog = this.life.dogTarget(o, f); if (dog) return { dog };
    const dr = this.dropTarget(o, f); if (dr) return { drop: dr };
    const bt = this.build.target(o, f);
    this.ray.set(o, f); this.ray.far = 2.8;
    const hits = this.ray.intersectObjects(this.intMeshes, false).filter(h => { const it = h.object.userData._it; return it && it.node.visible && !it.state.taken; });
    const wall = this.W.rayHit(o, f, 2.8);
    if (hits.length && (!wall || hits[0].distance <= wall.distance + .05) && (!bt || hits[0].distance < bt.d)) return { it: hits[0].object.userData._it };
    if (bt && (!wall || bt.d <= wall.distance + .05)) return bt;
    const carc = this.life.carcass(o, f); if (carc) return { carcass: carc };
    const ice = this.ice.target(o, f); if (ice && !hits.length) { let near = false; for (const it of this.W.interactives) if (['pickup', 'search'].includes(it.u.interact) && it.node.visible && !it.state.taken && it.center.distanceTo(o) < 2.6 && it.center.clone().sub(o).normalize().angleTo(f) < .13) near = true; if (!near) return ice; }
    // small pickups: forgiving cone
    let best = null, ba = .13;
    for (const it of this.W.interactives) {
      if (!['pickup', 'search', 'use', 'read'].includes(it.u.interact) || !it.node.visible || it.state.taken) continue;
      const d = it.center.clone().sub(o), dist = d.length(); if (dist > 2.6) continue;
      const a = d.normalize().angleTo(f); if (a < ba && (!wall || dist <= wall.distance + .1)) { ba = a; best = it; }
    }
    if (best) return { it: best };
    // campfires
    for (const fi of this.life.fires) { const d = fi.pos.clone().sub(o); if (d.length() < 2.6 && d.normalize().angleTo(f) < .5) return { fire: fi }; }
    if (this.onHochsitz) return { down: true };
    // trees (axe)
    if (this.hasAxe()) for (const t of this.W.treesNear(o.x, o.z)) {
      if (t.kind === 'stumpf' || t.kind === 'fest') continue;          // felled stump / ant hill, cairn (collide only)
      const dx = t.x - o.x, dz = t.z - o.z, dist = Math.hypot(dx, dz); if (dist > 2.2) continue;
      const fl = Math.hypot(f.x, f.z) || 1; if ((dx * f.x + dz * f.z) / (dist * fl) > .92) return { tree: t };
    }
    return null;
  }
  verb(t) {
    if (!t) return '';
    if (t.down) return '[E] Runterklettern';
    if (t.tree) return t.tree.fixed || t.tree.kind === 'Linde' ? 'Ein mächtiger Baum' : `[E] Baum fällen (Axt) ${t.tree.hits || 0}/${this.build.chopsNeeded()}`;
    if (t.build || t.log) return this.build.verb(t);
    if (t.exit) return this.vehicle.verb();
    if (t.boatExit) return this.boat.verb();
    if (t.dog) return this.life.dogVerb();
    if (t.drop) return `[E] ${ITEMS[t.drop.id].icon} ${ITEMS[t.drop.id].name}${t.drop.n > 1 ? ' ×' + t.drop.n : ''} aufheben`;
    if (t.carcass) return this.has('messer') ? '[E] Zerlegen (Messer)' : 'Erlegtes Tier – ein Messer zum Zerlegen fehlt';
    if (t.ice) return this.ice.verb(t);
    if (t.fire) { const f = t.fire;
      if (!f.on) return this.brenn() && this.has('feuerzeug') ? '[E] Feuer wieder anzünden' : 'Feuer aus – Holz + Feuerzeug nötig';
      const c = this.cookable(); if (c) return `[E] ${c[2]}`; if (this.brenn()) return '[E] Holz nachlegen'; return 'Lagerfeuer – wärmt dich'; }
    const it = t.it, u = it.u, L = it.label;
    switch (u.interact) {
      case 'door': case 'lid': case 'slide': case 'drawer':
        if (u.interact === 'slide' && u.auto && this.strom()) return L + ' (öffnet automatisch)';
        if (u.code && u.locked && !it.state.unlocked) return `[E] ${L}: Code eingeben`;
        return `[E] ${L} ${it.target ? 'schließen' : 'öffnen'}`;
      case 'switch': return `[E] ${L} (${this.S.flags.lightsOff ? 'an' : 'aus'})`;
      case 'pickup': return `[E] ${L} aufheben`;
      case 'search': return it.state.searched ? L + ' (leer)' : `[E] ${L} durchsuchen`;
      case 'pickup': return `[E] ${L} aufheben`;
      case 'pump': return `[E] ${L} benutzen`;
      case 'read': return u.diary && this.S.diary?.[u.diary] ? `[E] ${L} (gelesen) – nochmal lesen` : `[E] ${L} lesen`;
      case 'trade': return `[E] Mit ${L.split(' ')[0]} reden / handeln`;
      case 'talk': return `[E] Mit ${L.split(' ')[0]} reden`;
      case 'use':
        if (u.use === 'auto') return this.vehicle.verb(); if (u.use === 'bett') return `[E] ${L}: schlafen`; if (u.use === 'boot') return this.boat.verb();
        if (u.use === 'graben') return it.state.dug ? 'Hier ist schon alles ausgegraben' : this.has('spaten') ? '[E] Unter dem Steinkreuz graben (Spaten)' : 'Ein Kreuz aus Steinen – der Boden darunter ist locker';
        if (u.use === 'sprengen') return '[E] Geröll sprengen (2 Sprengpulver, Zündschnur, Feuerzeug)';
        if (u.use === 'zuender') return this.S.flags.ending ? 'Zündmaschine – ' + (this.S.flags.ending === 'wahrheit' ? 'Kabel gekappt' : 'leer') : '[E] Zündmaschine untersuchen';
        if (u.use === 'funkaggregat') return this.S.flags.funkPower ? 'Notstrom-Aggregat läuft' : '[E] Aggregat betanken (voller Kanister)';
        if (u.use === 'sender') return this.S.flags.funkPower ? `[E] Funksender: ${this.S.flags.funkCalled ? 'Wetterbericht abfragen' : 'Bergwacht rufen'}` : 'Funksender – kein Strom';
        break;
    }
    if (u.ladder) return this.onHochsitz ? '[E] Runterklettern' : '[E] Leiter hochklettern';
    return `[E] ${L}`;
  }
  interact(t) {
    if (!t) return;
    const S = this.S, A = this.audio, ui = this.ui;
    if (t.down) return this.climbDown();
    if (t.tree) return this.build.chopTree(t.tree);
    if (t.build || t.log) return this.build.interact(t);
    if (t.exit) return this.vehicle.exit();
    if (t.boatExit) return this.boat.exit();
    if (t.dog) return this.life.dogUse();
    if (t.drop) return this.takeDrop(t.drop);
    if (t.carcass) return this.life.butcher(t.carcass);
    if (t.ice) return this.ice.interact(t);
    if (t.fire) return this.fireAction(t.fire);
    const it = t.it, u = it.u;
    if (u.ladder) {
      if (this.onHochsitz) return this.climbDown();
      const top = Bv(u.top); return this.P.startClimb(this.P.pos.clone(), top);
    }
    switch (u.interact) {
      case 'door': case 'lid': case 'slide': case 'drawer': {
        if (u.needs === 'strom' && !this.strom()) { if (it.name.startsWith('Schiebetuer')) S.flags.frontTried = 1; A.sfx('locked'); return ui.toast(u.locked_msg || 'Ohne Strom geht das nicht.'); }
        if (u.locked && !it.state.unlocked && u.code) { this.codeFor = it; A.sfx('key'); return this.openPanel?.('code'); }
        if (u.locked && !it.state.unlocked) {
          if (it.name === 'Hintertuer') S.flags.backTried = 1;
          if (u.key && this.has(u.key)) { it.state.unlocked = 1; A.sfx('switch'); ui.toast('🔑 Aufgeschlossen.'); }
          else if (this.has('brecheisen')) { it.state.unlocked = 1; A.sfx('chop'); ui.toast('🔧 Mit dem Brecheisen aufgebrochen.'); }
          else { A.sfx('locked'); return ui.toast(u.locked_msg || 'Abgeschlossen.'); }
        }
        it.target = it.target ? 0 : 1; A.sfx(u.interact === 'slide' ? 'slide' : it.name.includes('Kuehl') ? 'switch' : u.interact === 'door' ? 'creak' : 'door');
        if (it.target && u.item && !it.state.got) { it.state.got = 1; setTimeout(() => this.add(u.item), 400); }
        if (it.target && u.search && !it.state.got) { it.state.got = 1; setTimeout(() => this.add(u.search), 500); }
        return;
      }
      case 'switch':
        if (!this.strom()) { A.sfx('switch'); return ui.toast('Klick. Nichts passiert – kein Strom.'); }
        S.flags.lightsOff = !S.flags.lightsOff; A.sfx('switch'); return;
      case 'pickup':
        if (this.add(u.item)) {
          A.sfx('pickup');
          if (!u.infinite) { it.node.visible = false; it.state.taken = 1; }
          if (u.item === 'notiz_hochsitz') this.read('notiz_hochsitz');
          if (u.item === 'bergkristall') { this.progress.stat('kristall'); this.progress.add(20, 'Bergkristall'); }
        }
        return;
      case 'search': {
        if (it.state.searched) return ui.toast('Hier ist nichts mehr.');
        A.sfx(it.name.startsWith('Sack') ? 'rustle' : 'door');
        if (u.loot) {                    // loot list: hand out what fits, the rest stays inside
          const left = (it.state.left || u.loot).filter(([id]) => ITEMS[id]); const keep = [];
          for (const [id, n] of left) if (!this.add(id, n, true)) keep.push([id, n]);
          const got = left.filter(x => !keep.includes(x));
          if (got.length) ui.toast(u.found && !keep.length && !it.state.left ? u.found : 'Gefunden: ' + got.map(([id, n]) => `${n > 1 ? n + '× ' : ''}${ITEMS[id].icon} ${ITEMS[id].name}`).join(', '), 'good');
          if (keep.length) { it.state.left = keep; ui.toast('Dein Rucksack ist voll – der Rest bleibt hier.', 'warn'); } else { it.state.searched = 1; delete it.state.left; this.emptySack(it); if (it.name.startsWith('Sack')) this.progress.stat('sacks'); }
          if (it.name === 'Schatzkiste' && got.length) { S.flags.treasure = 1; this.audio.sfx('win'); }
          if (u.stash && got.length) { this.progress.stat('stash'); this.progress.add(40, 'Geheimversteck'); this.audio.sfx('badge'); setTimeout(() => ui.toast(`🗝️ Geheimversteck gefunden! (${this.W.interactives.filter(x => x.u.stash && (x.state.searched || x === it)).length}/${this.W.interactives.filter(x => x.u.stash).length})`, 'good'), 500); }
          if (got.length) A.sfx('pickup'); return;
        }
        if (this.add(u.item, u.item === 'dosenbohnen' ? 2 : 1, true)) { it.state.searched = 1; if (u.bonus) this.add(u.bonus, 1, true); ui.toast(u.found || `Gefunden: ${ITEMS[u.item].name}`); A.sfx('pickup'); }
        return;
      }
      case 'trade': this.S.flags.metKurt = 1; return this.openPanel?.('trade');
      case 'talk': return this.talkNpc(it);
      case 'read':
        if (u.diary) return this.story.readPage(it);
        if (u.note && !this.S.notes[u.note]) { this.S.notes[u.note] = 1; this.progress.add(15, 'Notiz'); setTimeout(() => ui.toast(`📜 Notiz ${Object.keys(this.S.notes).length}/5 gefunden (Nebenaufgabe „Das stille Dorf“).`, 'good'), 400); }
        if (it.name === 'Tagebuch_Henning') S.flags.diary = 1;
        if (u.reveal) { const ids = u.reveal === 'all' ? this.places.filter(p => p.region === 'tal').map(p => p.id) : u.reveal === 'berg_all' ? this.places.filter(p => p.region === 'berg').map(p => p.id) : u.reveal.split(','); let n = 0;
          for (const id of ids) if (!this.S.known[id] && !this.S.found[id]) { this.S.known[id] = 1; n++; }
          if (n) setTimeout(() => ui.toast(`🗺️ ${n} ${n > 1 ? 'Orte' : 'Ort'} auf deiner Karte eingetragen.`, 'good'), 300); }
        return ui.read(it.label, u.text || '');
      case 'pump':
        if (!this.strom()) { A.sfx('error'); return ui.toast('Das Display bleibt dunkel. Ohne Strom pumpt hier nichts.'); }
        if (this.has('kanister')) { A.sfx('fuel'); this.swap('kanister', 'kanister_voll'); return ui.toast('⛽ Kanister mit Diesel gefüllt.'); }
        A.sfx('beep'); return ui.toast('Die Säule ist bereit – aber du hast kein Auto hier. Mit einem leeren Kanister könntest du tanken.');
      case 'use': return this.use(it);
    }
  }
  use(it) {
    const S = this.S, A = this.audio, ui = this.ui, u = it.u, on = this.strom();
    switch (u.use) {
      case 'generator':
        if (this.has('kanister_voll')) {
          this.swap('kanister_voll', 'kanister'); const was = on; S.genFuel = Math.min(14, S.genFuel + 10); A.sfx('genstart');
          return ui.toast(was ? '⛽ Nachgetankt. Tank wieder voll.' : '⚡ Das Aggregat springt an! Die Tankstelle hat Strom.', 'good');
        }
        if (on) return ui.toast(`Das Aggregat brummt. Tank: ${Math.round(S.genFuel / 14 * 100)} %.`);
        A.sfx('error'); S.flags.genTried = 1; return ui.toast('Der Tank ist leer. Du brauchst einen Kanister mit Diesel.');
      case 'handpumpe':
        if (this.has('kanister')) { A.sfx('pump'); this.swap('kanister', 'kanister_voll'); return ui.toast('🛢️ Kanister mit Diesel gefüllt (20 Liter).', 'good'); }
        return ui.toast(this.has('kanister_voll') ? 'Dein Kanister ist schon voll.' : 'Ein Fass Diesel mit Handpumpe. Dafür bräuchtest du einen Kanister.');
      case 'sicherung':
        S.flags.fuse = 1; A.sfx('switch');
        return ui.toast(on ? 'Alle Sicherungen drin. Notstrom läuft.' : 'Hauptschalter an – trotzdem nichts. Das Netz ist tot. Ein Zettel: „Notstrom: Aggregat hinterm Haus“.');
      case 'funk':
        if (S.flags.radioCalled) return ui.toast('„Bergwacht hier. Wir kommen bei Sonnenaufgang. Halten Sie durch!“');
        if (!on) { A.sfx('error'); S.flags.funkTried = S.flags.funkTried || 0; return ui.toast('Das Funkgerät hängt am Netz – ohne Strom bleibt es tot.'); }
        if (this.has('batterie_9v')) {
          this.take('batterie_9v'); S.flags.radioCalled = 1; A.sfx('radio');
          const now = S.abs; let r = (S.day - 1) * 24 + 6.5; while (r < now + 3) r += 24; S.rescueAt = r;
          return ui.read('Funkgerät', '„… hier Bergwacht Nordwald. Wir haben Sie. Die Forststraße ist blockiert, wir kommen bei Sonnenaufgang mit dem Geländewagen. Bleiben Sie, wo es warm ist – und halten Sie sich von den Wölfen fern. Ende.“');
        }
        S.flags.funkTried = 1; A.sfx('radio'); return ui.toast('Es knackt, das Display flackert und geht aus. Der Notakku ist leer – ein 9-V-Block fehlt.');
      case 'telefon': A.sfx('beep'); return ui.toast('Kein Freizeichen. Die Leitung ist tot.');
      case 'kasse': if (!on) return ui.toast('Die Kasse ist aus.'); A.sfx('beep'); return ui.toast('Piep. „Bitte Kassierer anmelden.“');
      case 'kaffee':
        if (!on) { A.sfx('error'); return ui.toast('Kein Strom.'); }
        A.sfx('coffee'); setTimeout(() => this.add('kaffee'), 2200); return ui.toast('☕ Die Maschine brüht einen Kaffee …');
      case 'mikrowelle':
        if (!on) return ui.toast('Kein Strom.');
        if (!this.has('dosensuppe')) return ui.toast('Eine Mikrowelle. Mit einer Dosensuppe wäre sie nützlich.');
        A.sfx('micro'); this.take('dosensuppe'); setTimeout(() => this.add('suppe_warm'), 3000); return ui.toast('Die Suppe dreht sich …');
      case 'atm': if (!on) return ui.toast('Der Bildschirm ist schwarz.'); A.sfx('beep'); return ui.toast('„Verbindung zur Bank nicht möglich.“');
      case 'spuelen': A.sfx('flush'); return;
      case 'brunnen':
        if (this.has('topf')) { this.swap('topf', 'topf_klar'); A.sfx('water'); return ui.toast('🫕 Topf mit klarem Brunnenwasser gefüllt.'); }
        A.sfx('drink'); this.S.stats.thirst = clamp(this.S.stats.thirst + 35); this.S.flags.drank = 1; return ui.toast('Klares, kaltes Brunnenwasser.');
      case 'wasserhahn': A.sfx('water'); this.S.stats.thirst = clamp(this.S.stats.thirst + 30); this.S.flags.drank = 1; return ui.toast('Du trinkst Leitungswasser.');
      case 'auto': return this.vehicle.use();
      case 'boot': if (this.ice.frozen && this.region() === 'tal') { this.audio.sfx('error'); return ui.toast('Das Ruderboot ist im Eis festgefroren. Lauf einfach übers Eis!'); } return this.boat.enter();
      case 'graben': return this.dig(it);
      case 'sprengen': return this.blast(it);
      case 'funkaggregat':
        if (S.flags.funkPower) return ui.toast('Das Aggregat tuckert. Der Sender hat Strom.');
        if (!this.has('kanister_voll')) { A.sfx('error'); return ui.toast('Der Tank ist leer. Ein voller Kanister Diesel würde reichen (Dieselfass im Schuppen der Tankstelle).'); }
        this.swap('kanister_voll', 'kanister'); S.flags.funkPower = 1; A.sfx('genstart'); this.progress.add(30, 'Notstrom'); return ui.toast('⚡ Das Aggregat springt an – in der Funkhütte leuchten die Anzeigen.', 'good');
      case 'sender': return this.radio();
      case 'zuender': return this.story.zuender();
      case 'bett': return this.sleep(it);
      case 'bachwasser':
        if (this.has('topf')) { this.swap('topf', 'topf_wasser'); A.sfx('water'); return ui.toast('Topf mit Bachwasser gefüllt. Am Feuer abkochen!'); }
        A.sfx('drink'); this.S.stats.thirst = clamp(this.S.stats.thirst + 25); this.S.flags.drank = 1;
        if (Math.random() < .4) { this.hurt(10, 'Bachwasser'); this.health.upset(40); return ui.toast('Das Wasser schmeckt modrig … dein Bauch grummelt.', 'warn'); }
        return ui.toast('Kaltes Bachwasser. Riskant, aber es löscht den Durst.');
      case 'lagerfeuer': {
        const p = it.center.clone(); p.y = this.W.groundY(p.x, p.z, p.y + 1);
        const f = this.life.fires.find(f => f.pos.distanceTo(p) < 1.5); if (f) return this.fireAction(f);
        if (!this.has('feuerzeug')) return ui.toast('Eine alte Feuerstelle. Mit 3 Holz und einem Feuerzeug könntest du sie anzünden.');
        if (this.brenn() < 3) return ui.toast(`Du brauchst 3 Äste oder Brennholz (hast ${this.brenn()}).`);
        this.takeBrenn(3); this.life.addFire(p, 8, false); this.audio.sfx('fire'); return ui.toast('🔥 Das Feuer brennt.');
      }
    }
    ui.toast(it.label);
  }
  // ---------------------------------------------------------------- puzzles: code locks, digging, blasting, the radio station, Henning
  tryCode(code) {
    const it = this.codeFor; if (!it) return false; const u = it.u;
    if (String(code) !== String(u.code)) { this.audio.sfx('error'); this.ui.toast('❌ Falscher Code.', 'warn'); return false; }
    it.state.unlocked = 1; it.target = 1; this.codeFor = null; this.audio.sfx('switch'); this.progress.add(40, 'Code geknackt');
    this.ui.toast('🔓 Klick – das Schloss springt auf!', 'good'); return true;
  }
  dig(it) {
    const ui = this.ui;
    if (it.state.dug) return ui.toast('Hier ist schon alles ausgegraben.');
    if (!this.has('spaten')) { this.audio.sfx('error'); return ui.toast('Der Boden unter dem Steinkreuz ist locker. Mit einem Spaten könntest du hier graben.'); }
    it.state.dug = 1; this.S.flags.dug = 1; this.audio.sfx('dig'); setTimeout(() => this.audio.sfx('dig'), 450); this.progress.add(30, 'gegraben');
    const box = this.byName.Schatzkiste; if (box) { box.state.shown = 1; box.node.visible = true; }
    ui.toast('⛏️ Du gräbst … und stößt auf eine alte Holzkiste!', 'good');
  }
  blast(it) {
    const ui = this.ui, need = [['schwarzpulver', 2], ['seil', 1], ['feuerzeug', 1]], miss = need.filter(([k, n]) => this.count(k) < n);
    if (it.state.gone) return;
    if (miss.length) { this.audio.sfx('error'); return ui.toast(`Zum Sprengen fehlt: ${miss.map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ')}. (Zündschnur = Seil)`, 'warn'); }
    if (it.state.fuse) return;
    this.take('schwarzpulver', 2); this.take('seil', 1); it.state.fuse = 1; this.audio.sfx('fuse');
    ui.toast('🧨 Die Zündschnur brennt – schnell weg vom Geröll!', 'warn');
    setTimeout(() => {
      this.audio.sfx('boom'); it.node.visible = false; it.state.gone = 1; delete it.state.fuse; this.S.flags.blasted = 1;
      const d = it.center.distanceTo(this.P.pos); if (d < 7) { this.hurt((7 - d) * 9, 'Sprengung'); ui.damage(); }
      this.combat.puff(it.center, '#9a948a', 30); this.progress.add(60, 'Sprengung');
      ui.toast('💥 BUMM! Der Weg ist frei – dahinter funkelt es violett.', 'good'); this.save();
    }, 3200);
  }
  radio() {
    const S = this.S, ui = this.ui;
    if (!S.flags.funkPower) { this.audio.sfx('error'); return ui.toast('Der Sender ist tot. Draußen hinter der Hütte steht ein Notstrom-Aggregat.'); }
    this.audio.sfx('radio');
    if (!S.flags.funkCalled) {
      S.flags.funkCalled = 1; for (const id of ['pass', 'berghuette']) if (!S.found[id]) S.known[id] = 1;
      return ui.read('Funksender – Kanal 3', '„… Funkstation Nordwald? Hier Bergwacht! Wir dachten, die Station ist verlassen. Sie suchen Förster Albers? Der hat sich vor einer Woche von der <b>Steinberghütte</b> gemeldet – seitdem nichts mehr. Die Passstraße ist seit dem Steinschlag gesperrt; den Schlüssel für die Schranke finden Sie dort am Haken neben der Tür. Mit einem Auto kommen Sie hoch. Und: Kanal 3 gibt Ihnen jederzeit den Wetterbericht. Ende.“<br><i>Pass-Schranke und Steinberghütte sind auf deiner Karte eingetragen.</i>');
    }
    return ui.toast(`📻 Wetterbericht: ${this.seasons.forecast()}`);
  }
  talkNpc(it) {
    const S = this.S, ui = this.ui;
    if (it.u.npc !== 'henning') return ui.toast(it.label);
    if (!S.flags.henning) {
      S.flags.henning = 1; this.addAll({ patronen_gewehr: 1, medizin: 1 }); this.audio.sfx('quest');
      return ui.read('Henning, der Förster', '„Mensch, ein Mensch! Ich sitz hier oben fest, seit mir der Steinschlag die Straße zugemacht hat – das Bein ist verstaucht, und das Funkgerät der Hütte ist hin. Du bist mit dem Auto über den Pass? Respekt.<br>Hier, nimm die Patronen und die Tabletten – ich hab genug. Und hör zu: Im alten <b>Stollen „Glück auf“</b> drüben am Osthang liegen hinter dem Geröll noch Bergkristalle. Mit Sprengpulver und einer Zündschnur kriegst du das frei. Die Kiste mit dem Pulver steht vorm Eingang.<br>Grüß mir Kurt – und Bello, falls du ihn findest!“');
    }
    const tips = ['„Auf den Gipfel geht’s hinter der Hütte rauf. Das Gipfelbuch trägt dir alle Wege ein.“', '„Im Bergsee beißen Saiblinge. Angel hast du?“', '„Hier oben wird’s nachts bitterkalt. Bleib nicht draußen, sonst holst du dir was weg.“',
      '„Gämsen sind schnell – mit dem Gewehr musst du gut zielen.“', '„Die Bären kommen im Herbst bis an die Hütte. Feuer hilft.“',
      S.flags.grimm ? '„Du hast den alten Grimm erlegt? Respekt. Jetzt kann ich wieder ruhig schlafen.“' : '„Und lass dich nicht vom alten Grimm erwischen – drüben in der Bärenhöhle am Osthang.“'];
    if (!S.flags.grimmTold && !S.flags.grimm) { S.flags.grimmTold = 1; this.audio.sfx('quest');
      return ui.read('Henning, der Förster', '„Noch was: Drüben am Osthang, in der <b>Bärenhöhle</b>, haust der <i>alte Grimm</i> – ein Riesenbär, anderthalbmal so groß wie die anderen. Feuer schreckt ihn nicht. Wenn er sich duckt, stürmt er geradeaus los – dann spring zur Seite! Nimm das Gewehr und viel Munition mit. Wer ihn erlegt, dem zahl ich 40 Euro.“'); }
    this.npcTip = ((this.npcTip ?? -1) + 1) % tips.length; return ui.toast(`🧔 Henning: ${tips[this.npcTip]}`);
  }
  // ---------------------------------------------------------------- two maps: travel over the pass, region borders, deep water
  travel(to) {
    if (this.traveling) return; const V = this.vehicle, S = this.S; this.traveling = true; this.ui.fade?.(); this.audio.sfx('car');
    setTimeout(() => {
      const sp = this.W.spots[to === 'berg' ? 'berg_start' : 'pass_tal'];
      if (sp) { V.pos.copy(sp.pos); V.pos.y = this.W.groundY(V.pos.x, V.pos.z, V.pos.y + 3) + .02; }
      const dy = V.yaw; V.yaw = to === 'berg' ? 0 : Math.PI; V.v = 5; V.pitch = V.roll = 0; V.camPos = null; this.P.yaw += V.yaw - dy; V.enterYaw += V.yaw - dy; V.pose();
      S.time += .5; if (S.time >= 24) { S.time -= 24; S.day++; } S.abs = (S.day - 1) * 24 + S.time; S.car.fuel = Math.max(1, S.car.fuel - 8);
      this.life.clear(); if (this.life.car) { this.scene.remove(this.life.car.mesh); this.life.car = null; }
      if (to === 'berg' && !S.flags.berg) { S.flags.berg = 1; this.progress.add(80, 'Über den Pass'); }
      this.ui.toast(to === 'berg' ? '⛰️ Eine halbe Stunde Serpentinen später: das Hochtal am Steinberg. Hier oben ist es kälter.' : '🌲 Zurück im Nordwald – vor dir liegt das Dorf Tannbach.', 'good');
      this.traveling = false; this.save();
    }, 1200);
  }
  borders() {
    const P = this.P, V = this.vehicle, reg = this.region();
    if (V.driving) {                                 // over the pass and back
      const vb = -V.pos.z;
      if (reg === 'tal' && vb > PASS.y + 3 && Math.abs(V.pos.x - PASS.x) < 9) return this.travel('berg');
      if (reg === 'berg' && vb < BERG_IN) return this.travel('tal');
      return;
    }
    if (this.boat.on) return;
    const R = REGIONS[reg], bx = P.pos.x, by = -P.pos.z; let nx = Math.max(R.x0 + 1.5, Math.min(R.x1 - 1.5, bx)), ny = Math.max(R.y0 + 1.5, Math.min(R.y1 - 1.5, by)), why = '';
    if (reg === 'tal' && ny > PASS.y + 3 && Math.abs(bx - PASS.x) < 12) { ny = PASS.y + 3; why = 'Zu Fuß ist der Pass zu weit – 12 km bergauf. Nimm das Auto.'; }
    if (reg === 'berg' && ny < BERG_IN + 1) { ny = BERG_IN + 1; why = 'Zu Fuß ist es zu weit ins Tal – fahr mit dem Auto zurück.'; }
    if (nx !== bx || ny !== by) { P.pos.x = nx; P.pos.z = -ny; P.vel.x = P.vel.z = 0; P.sync(); if (why && this.edgeT <= 0) { this.edgeT = 5; this.ui.toast(why, 'warn'); } }
  }
  waterGuard() {
    const P = this.P; if (this.boat.on || this.vehicle.driving) { this.safePos = null; return; }
    const bx = P.pos.x, by = -P.pos.z;
    for (const L of LAKES) if (Math.hypot(bx - L.x, by - L.y) < L.r && P.pos.y < L.z - 1.1) {
      if (this.safePos) { P.pos.copy(this.safePos); P.vel.set(0, 0, 0); P.sync(); }
      if (this.waterT <= 0) { this.waterT = 5; this.ui.toast(L.name === 'See' ? 'Zu tief zum Waten. Am Steg liegt ein Ruderboot.' : 'Zu tief – hier geht es nicht weiter.', 'warn'); }
      return;
    }
    if (P.onGround) (this.safePos ||= new THREE.Vector3()).copy(P.pos);
  }
  // a lightning strike close by (storm): only when you stand in the open – a bright bolt, a bang, damage within 5 m
  stormStrike() {
    const P = this.P; if (this.roof || this.vehicle.driving || this.inside) return false;
    const a = Math.random() * 6.283, d = 3 + Math.random() * 7, p = new THREE.Vector3(P.pos.x + Math.cos(a) * d, 0, P.pos.z + Math.sin(a) * d); p.y = this.W.groundY(p.x, p.z, P.pos.y + 20);
    const pts = [], top = p.clone().setY(p.y + 60); let q = top.clone();
    for (let i = 0; i < 9; i++) { pts.push(q.clone()); q.lerp(p, 1 / (9 - i)); q.x += (Math.random() - .5) * 2.4 * (i < 8 ? 1 : 0); q.z += (Math.random() - .5) * 2.4 * (i < 8 ? 1 : 0); }
    pts.push(p.clone()); const bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#eef4ff', fog: false }));
    this.scene.add(bolt); setTimeout(() => this.scene.remove(bolt), 180); this.audio.sfx('strike'); this.combat.puff(p, '#ffe9a0', 14);
    if (d < 5) { this.hurt(28 * DIFF_DMG(this), 'Blitz'); this.ui.toast('⚡ Der Blitz schlägt direkt neben dir ein! Runter vom freien Feld!', 'warn'); }
    else if (!this.S.flags.strikeTip) { this.S.flags.strikeTip = 1; this.ui.toast('⚡ Ein Blitz schlägt ganz in der Nähe ein – such dir Schutz!', 'warn'); }
    return true;
  }
  takeBrenn(n) { const a = Math.min(n, this.count('ast')); this.take('ast', a); this.take('holz', n - a); }
  fireAction(f) {
    const ui = this.ui;
    if (!f.on) { if (this.brenn() && this.has('feuerzeug')) { this.takeBrenn(1); f.on = true; f.fuel = 3; this.audio.sfx('fire'); return ui.toast('🔥 Wieder angezündet.'); } return; }
    const c = this.cookable();
    if (c) { const [from, to, , msg] = c; for (const [k, n] of Object.entries(from)) { this.take(k, n); const back = ITEMS[k].after; if (back && k !== Object.keys(from)[0] && to !== 'topf_abgekocht') this.add(back, 1, true); }
      this.add(to, from.hecht ? 2 : 1, true); this.audio.sfx('fire'); this.progress.stat('cooked'); return ui.toast(msg); }
    if (this.brenn()) { this.takeBrenn(1); f.fuel += this.has('holz') ? 3 : 2; this.audio.sfx('fire'); return ui.toast('Holz nachgelegt.'); }
  }
  // what can be cooked at a fire right now: [needs, gives, verb, message]
  cookable() {
    const water = ['topf_klar', 'topf_abgekocht', 'wasser'].find(k => this.has(k));
    return this.cookList(water).find(([need]) => Object.entries(need).every(([k, n]) => this.count(k) >= n));
  }
  cookList(water) {
    return [[{ dosensuppe: 1 }, 'suppe_warm', 'Suppe am Feuer erwärmen', '🍲 Heiße Suppe!'], [{ topf_wasser: 1 }, 'topf_abgekocht', 'Wasser abkochen', 'Wasser abgekocht – jetzt sicher trinkbar.'],
      [{ fleisch: 1 }, 'fleisch_gebraten', 'Fleisch braten', '🍖 Fleisch gebraten.'], [{ steinpilz: 1 }, 'pilz_gebraten', 'Pilze braten', '🍳 Pilze gebraten.'],
      [{ fisch: 1 }, 'fisch_gebraten', 'Fisch braten', '🍣 Fisch gebraten.'], [{ saibling: 1 }, 'fisch_gebraten', 'Saibling braten', '🍣 Saibling gebraten.'], [{ hecht: 1 }, 'fisch_gebraten', 'Hecht braten', '🍣 Hecht gebraten – reicht für zwei.'],
      [{ pfifferling: 1 }, 'pilz_gebraten', 'Pfifferlinge braten', '🍳 Pfifferlinge gebraten.'], [{ kaninchen: 1 }, 'kaninchen_gebraten', 'Kaninchen braten', '🍗 Kaninchenbraten!'],
      water && [{ kraeuter: 1, [water]: 1 }, 'tee', 'Kräutertee kochen', '🍵 Kräutertee – hilft gegen Erkältung.'],
      [{ kartoffel: 1 }, 'ofenkartoffel', 'Kartoffel in die Glut legen', '🥔 Ofenkartoffel!'], [{ kuerbis: 1, topf: 1 }, 'kuerbissuppe', 'Kürbissuppe kochen', '🍲 Kürbissuppe!'],
      water && [{ mehl: 1, [water]: 1 }, 'fladenbrot', 'Fladenbrot backen', '🫓 Fladenbrot gebacken.']].filter(Boolean);
  }
  // pickups glow softly when you are close, the target under the crosshair glows brighter (Pause → "Gegenstände hervorheben")
  highlight(t, pos) {
    const now = performance.now() / 1000, on = this.hlOn !== false, tgt = t?.it;
    for (const it of this.W.interactives) {
      const u = it.u; if (u.interact !== 'pickup' && u.interact !== 'search') continue;
      let k = 0;
      if (it.node.visible && !it.state.taken && it.center) {
        const d = it.center.distanceTo(pos);
        if (it === tgt && !(u.interact === 'search' && it.state.searched)) k = .5 + .15 * Math.sin(now * 6);
        else if (on && d < 6 && ((u.interact === 'pickup' && !u.infinite) || (u.interact === 'search' && it.name.startsWith('Sack') && !it.state.searched))) k = (.16 + .1 * Math.sin(now * 3 + it.center.x)) * (1 - d / 6);
      }
      if (Math.abs(k - (it.hlK || 0)) < .005) continue;
      if (!it.hlMats) { it.hlMats = []; it.node.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.emissive = new THREE.Color('#ffe2a0'); it.hlMats.push(m.material); } }); }
      for (const m of it.hlMats) m.emissiveIntensity = k; it.hlK = k;
    }
  }
  emptySack(it) { if (it.name.startsWith('Sack')) it.node.scale.set(1.15, .4, 1.15); }
  climbDown() {
    const lad = this.W.ladders[0]; if (!lad) return;
    const bot = Bv(lad.u.bottom); bot.y = this.W.groundY(bot.x, bot.z, bot.y + 2) + .05; this.P.startClimb(this.P.pos.clone(), bot);
  }

  // ---------------------------------------------------------------- quests (tutorial → main goal)
  makeQuests() {
    const S = this.S, g = this;
    return [
      { t: 'Gestrandet', x: () => 'Dein Auto ist liegen geblieben. Schau dich mit der <b>Maus</b> um und lauf mit <b>W A S D</b>. <b>B</b> öffnet dein Handbuch mit allen Tasten und Tipps.', target: () => null,
        done: () => g.P.pos.distanceTo(g.W.spots.spawn.pos) > 4 },
      { t: 'Kofferraum', x: () => 'Öffne den Kofferraum deines Autos: hinsehen und <b>E</b> drücken.', target: () => g.posOf('Auto_Kofferraum'), done: () => g.byName.Auto_Kofferraum?.target === 1 },
      { t: 'Ausrüstung', x: () => 'Nimm <b>Rucksack</b> und <b>Taschenlampe</b> mit (E). <b>Tab</b> öffnet den Rucksack, <b>F</b> schaltet die Lampe ein.',
        target: () => g.posOf(!S.flags.bag ? 'Rucksack' : 'Taschenlampe'), done: () => S.flags.bag && g.has('taschenlampe') },
      { t: 'Zur Tankstelle', x: () => 'Folge der Straße nach <b>Norden</b> zur Tankstelle „Waldtank“. <b>Shift</b> = sprinten (kostet Ausdauer).',
        target: () => B(4, -14, 0), done: () => { const p = g.P.pos; return p.x > -3 && p.x < 40 && -p.z > -24 && -p.z < 26; } },
      { t: 'Hineinkommen', x: () => S.flags.backTried ? 'Abgeschlossen. Irgendwo hier ist bestimmt ein Schlüssel versteckt – such rund um die Hintertür.'
          : S.flags.frontTried ? 'Die Schiebetür klemmt ohne Strom. Versuch es hinten – um das Gebäude herum zur <b>Hintertür</b>.' : 'Die Tankstelle ist dunkel. Versuch hineinzukommen (Eingang vorne).',
        target: () => S.flags.backTried ? (g.has('schluessel_hinten') ? g.posOf('Hintertuer') : g.posOf('Blumenkuebel')) : S.flags.frontTried ? g.posOf('Hintertuer') : g.posOf('Schiebetuer_S'),
        done: () => g.insideShop(g.P.pos) },
      { t: 'Stärken', x: () => 'Iss <b>und</b> trink etwas. Aufheben (E), in der Leiste mit <b>1–5</b> wählen und <b>Q</b> drücken – oder im Rucksack (Tab).',
        target: () => null, done: () => S.flags.ate && S.flags.drank },
      { t: 'Kein Licht', x: () => 'Finde den <b>Sicherungskasten</b> im Büro (Tür „Personal“ hinter den Kühlregalen).', target: () => g.posOf('Sicherungskasten'), done: () => S.flags.fuse },
      { t: 'Notstrom', x: () => 'Das Netz ist tot. Das Aggregat braucht Diesel: Hol den <b>Kanister</b> aus dem Lager.', target: () => g.posOf('Kanister'), done: () => g.has('kanister') || g.has('kanister_voll') || g.strom() },
      { t: 'Diesel', x: () => 'Füll den Kanister am <b>Dieselfass im Schuppen</b> hinter dem Haus (Handpumpe).', target: () => g.posOf('Dieselfass'), done: () => g.has('kanister_voll') || g.strom() },
      { t: 'Strom!', x: () => 'Betanke das <b>Stromaggregat</b> hinter dem Haus und wirf es an.', target: () => g.posOf('Generator'), done: () => g.strom() },
      { t: 'Hilferuf', x: () => 'Licht! Ruf mit dem <b>Funkgerät</b> im Büro Hilfe.', target: () => g.posOf('Funkgeraet'), done: () => S.flags.funkTried || S.flags.radioCalled },
      { t: 'Ein Hinweis', x: () => 'Der Notakku ist leer. Auf dem Schreibtisch liegt ein <b>Notizzettel</b>.', target: () => g.posOf('Notizzettel'), done: () => S.flags.notiz || S.flags.radioCalled,
        onDone: () => g.ui.toast('🎓 Tutorial abgeschlossen! Ab jetzt bist du auf dich gestellt.', 'good') },
      { t: 'Bernds Hochsitz', x: () => 'Hol den <b>9-V-Block</b> aus dem Hochsitz. Pfad hinter dem Holzstapel, dann am <b>Bach</b> entlang nach Norden. Nachts: Wölfe!',
        target: () => g.has('batterie_9v') ? null : g.posOf('Batterie_9V'), done: () => g.has('batterie_9v') || S.flags.radioCalled },
      { t: 'Funkspruch', x: () => 'Zurück ins Büro und mit dem <b>Funkgerät</b> Hilfe rufen.', target: () => g.posOf('Funkgeraet'), done: () => S.flags.radioCalled },
      { t: 'Durchhalten', x: () => { const left = Math.max(0, S.rescueAt - S.abs); return `Die Bergwacht kommt bei Sonnenaufgang (6:30) – noch ${Math.floor(left)} h ${Math.floor(left % 1 * 60)} min. Bleib warm, satt und weg von den Wölfen. Halte <b>Z</b> gedrückt, um drinnen (mit Strom) oder am Feuer zu warten.`; },
        target: () => null, done: () => S.rescueAt && S.abs >= S.rescueAt, onDone: () => g.win() },
    ];
  }
  makePlaces() {
    const sp = this.W.spots;
    return [
      { id: 'panne', name: 'Deine Panne', pos: sp.spawn?.pos, r: 8 }, { id: 'tanke', name: 'Tankstelle „Waldtank“', pos: B(14, 0, 0), r: 20 },
      { id: 'schuppen', name: 'Schuppen', pos: B(44, -12, 0), r: 5 }, { id: 'bach', name: 'Der Bach', test: p => Math.abs(p.x - creekX(-p.z)) < 5 },
      { id: 'hochsitz', name: 'Bernds Hochsitz', pos: sp.ziel_hochsitz?.pos, r: 10 }, { id: 'feuer', name: 'Alte Feuerstelle', pos: sp.ziel_feuerstelle?.pos, r: 7 },
      { id: 'bus', name: 'Bushaltestelle', pos: B(roadX(40) - 5.2, 40, 0), r: 7 }, { id: 'camp', name: 'Verlassener Wohnwagen', pos: sp.ziel_wohnwagen?.pos, r: 10 },
      { id: 'dorf', name: 'Dorf Tannbach', pos: B(-60, 182, 0), r: 24, icon: '🏘️' }, { id: 'kapelle', name: 'Kapelle Tannbach', pos: B(-48, 197.5, 0), r: 8, icon: '⛪' },
      { id: 'hof', name: 'Bauernhof mit Scheune', pos: B(-38, 158, 0), r: 12, icon: '🌾' }, { id: 'turm', name: 'Aussichtsturm Hirschkopf', pos: sp.ziel_turm?.pos, r: 12, icon: '🗼', flat: 1 },
      { id: 'ruine', name: 'Burgruine Falkenstein', pos: sp.ziel_ruine?.pos, r: 14, icon: '🏰' }, { id: 'steinbruch', name: 'Alter Steinbruch', pos: sp.ziel_steinbruch?.pos, r: 18, icon: '⛏️' },
      { id: 'muehle', name: 'Alte Mühle', pos: sp.ziel_muehle?.pos, r: 10, icon: '⚙️' },
      { id: 'see', name: 'Waldsee', pos: sp.ziel_see?.pos, r: 20, icon: '🎣', flat: 1 }, { id: 'werkstatt', name: 'Werkstatt „KFZ Brandt“', pos: B(-52.8, 167.5, 0), r: 7, icon: '🔧' },
      { id: 'insel', name: 'Insel im Waldsee', pos: sp.ziel_insel?.pos, r: 4.5, icon: '🏝️', flat: 1 }, { id: 'forsthaus', name: 'Forsthaus Eichengrund', pos: sp.ziel_forsthaus?.pos, r: 11, icon: '🏠', flat: 1 },
      { id: 'funkturm', name: 'Funkstation Nordwald', pos: sp.ziel_funkturm?.pos, r: 12, icon: '📡', flat: 1 }, { id: 'pass', name: 'Pass-Schranke', pos: B(PASS.x, PASS.y, 0), r: 9, icon: '🚧', flat: 1 },
      // the mountains (second map)
      { id: 'steinberg', name: 'Hochtal Steinberg', pos: sp.berg_start?.pos, r: 22, icon: '⛰️', flat: 1 }, { id: 'berghuette', name: 'Steinberghütte', pos: sp.ziel_berghuette?.pos, r: 14, icon: '🛖', flat: 1 },
      { id: 'bergwerk', name: 'Stollen „Glück auf“', pos: sp.ziel_bergwerk?.pos, r: 12, icon: '⛏️', flat: 1 }, { id: 'gipfel', name: 'Gipfel des Steinbergs', pos: sp.ziel_gipfel?.pos, r: 7, icon: '⛳', flat: 1 },
      { id: 'bergsee', name: 'Bergsee', pos: sp.ziel_bergsee?.pos, r: 15, icon: '💧', flat: 1 }, { id: 'heustadel', name: 'Heustadel auf der Alm', pos: sp.ziel_heustadel?.pos, r: 9, icon: '🌾', flat: 1 },
    ].map(p => { if (p.flat && p.pos) p.test = q => Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < p.r; p.region = p.pos ? regionOf(-p.pos.z) : 'tal'; return p; });
  }
  win() {
    this.S.flags.won = 1; this.audio.sfx('win'); this.life.clear();
    const st = this.S, found = Object.keys(st.found).length;
    document.getElementById('winstats').innerHTML = `Überlebt bis Tag ${st.day}, ${String(Math.floor(st.time)).padStart(2, '0')}:${String(Math.floor(st.time % 1 * 60)).padStart(2, '0')} · Orte entdeckt: ${found}/${this.places.length}`;
    this.ui.show('win', true); document.exitPointerLock?.(); this.save();
  }
  freePlay() {          // after the rescue: keep living in the forest (building, farming, exploring)
    this.S.flags.won = 0; this.S.flags.free = 1; this.S.quest = this.quests.length; this.ui.show('win', false);
    this.ui.toast('Freies Spiel: Die Bergwacht wartet unten im Tal. Bau dir eine Hütte, leg Felder an, erkunde alles.', 'good');
  }

  // ---------------------------------------------------------------- per frame
  update(dt, keys) {
    const S = this.S, st = S.stats, P = this.P;
    if (S.flags.dead || S.flags.won) return;
    this.waterT -= dt; this.edgeT -= dt; this.waterGuard(); this.borders();
    this.onIce = this.ice.on(P.pos);
    if (this.creative) { for (const k in st) st[k] = 100; this.S.battery = 100; }
    if (!this.vehicle.driving && !this.boat.on && P.onGround) { const m = this._lastP ? Math.hypot(P.pos.x - this._lastP.x, P.pos.z - this._lastP.z) : 0; if (m < 2) this.walkAcc = (this.walkAcc || 0) + m; }
    (this._lastP ||= new THREE.Vector3()).copy(P.pos);
    // time (1 real second = 1 game minute; Z = wait faster where it is safe and warm)
    const wolfNear = this.life.animals.some(a => ['wolf', 'boar', 'bear', 'grimm'].includes(a.kind) && a.state !== 'dead' && a.pos.distanceTo(P.pos) < 45);
    const roof = this.build.shelter(P.pos), bed = this.build.near('bett', P.pos, 2.5), indoor = this.indoor(P.pos);
    this.roof = roof || indoor; this.bed = bed; this.inside = indoor;
    const safe = (this.insideShop(P.pos) && this.strom()) || this.life.fires.some(f => f.on && f.pos.distanceTo(P.pos) < 4) || ((this.has('schlafsack') || roof || bed) && !wolfNear)
      || (indoor && indoor !== 'shop');
    if (keys.KeyZ && !safe && !this._waitTip) { this._waitTip = 1; this.ui.toast(wolfNear ? 'Zu gefährlich – Raubtiere in der Nähe!' : 'Warten geht in Häusern, in deiner Hütte, am Feuer, im Unterstand, am Bett oder mit Schlafsack.', 'warn'); setTimeout(() => this._waitTip = 0, 4000); }
    const waiting = this.waiting = !!keys.KeyZ && safe; const scale = waiting ? 30 : 1;
    S.time += dt * scale / 60; S.abs = (S.day - 1) * 24 + S.time;
    if (S.time >= 24) { S.time -= 24; S.day++; this.ui.toast(`Tag ${S.day} beginnt.`); }
    const dark = this.sky.darkness(S.time);
    // seasons + weather (seasons.js)
    this.seasons.update(dt * scale); this.ice.update();
    const rain = this.sky.rainAmount * (this.roof ? 0 : 1);
    this.build.update(dt, dt * scale / 60);
    for (const sp of this.W.spinners) sp.pivot.rotateOnAxis(sp.axis, sp.speed * dt);
    // generator fuel
    if (S.genFuel > 0) { S.genFuel -= dt * scale / 60; if (S.genFuel <= 0) { S.genFuel = 0; this.ui.toast('⚠️ Das Aggregat stottert und geht aus. Tank leer!', 'warn'); } }
    // survival
    const drain = waiting ? scale * .35 : 1, inside = !!indoor, shop = indoor === 'shop';
    this.health.update(dt, dt * scale / 60);
    st.hunger = clamp(st.hunger - dt * drain * .075 * (P.sprint ? 1.8 : 1) * this.health.foodK);
    st.thirst = clamp(st.thirst - dt * drain * .1 * (P.sprint ? 2 : 1) * this.health.foodK);
    const berg = this.region() === 'berg' ? -.04 - Math.max(0, P.pos.y - 20) * .002 : 0;
    let env = shop ? (this.strom() ? .35 : -.02 - .04 * dark) : inside ? -.02 - .03 * dark : -.03 - .2 * dark - .15 * rain + this.seasons.warmth(dark) + berg;
    if (env < 0) env *= this.health.coldLossK;
    if (inside && this.build.near('teppich', P.pos, 4)) env += .015;
    if (this.onHochsitz) env *= .6;
    for (const f of this.life.fires) if (f.on) { const d = f.pos.distanceTo(P.pos); if (d < 4.5) env = Math.max(env, 1.2 * (1 - d / 4.5) + .2); }
    if (this.torchOn) env += .06;
    if (env < 0 && S.flags.fur) env *= .25; else if (env < 0 && S.flags.jacket) env *= .5;
    if (this.candleT > 0) { this.candleT -= dt; env += .02; }
    // storm: hail and gale (Unwetter) or a blizzard (Schneesturm) hurt and chill you out in the open – shelter: a roof, a house, the car
    const storm = this.seasons.storm, open = storm && !this.roof && !this.vehicle.driving && !this.onHochsitz;
    if (open) {
      env -= storm === 'schneesturm' ? .55 : .18; const hail = (storm === 'schneesturm' ? .15 : .6) * DIFF_DMG(this) * dt;
      if (hail > 0) { st.health = clamp(st.health - hail); this.S.stormHurt = (this.S.stormHurt || 0) + hail; this.lastCause = storm === 'schneesturm' ? 'Schneesturm' : 'Hagel';
        if ((this.hailT = (this.hailT || 0) - dt) < 0) { this.hailT = 1.2 + Math.random(); this.ui.damage(); this.audio.sfx(storm === 'schneesturm' ? 'none' : 'hail');
          if (!this._stormTip) { this._stormTip = 1; this.ui.toast(storm === 'schneesturm' ? '🥶 Der Schneesturm frisst deine Wärme – schnell unter ein Dach!' : '🧊 Hagelkörner prasseln auf dich ein – such dir ein Dach!', 'warn'); setTimeout(() => this._stormTip = 0, 15000); } } }
    }
    if (env < 0 && waiting && this.has('schlafsack')) env *= .3;
    st.warmth = clamp(st.warmth + env * dt * (waiting ? scale * .35 : 1));
    if (this.boostT > 0) this.boostT -= dt;
    st.stamina = clamp(st.stamina + (P.sprint ? -15 * (this.boostT > 0 ? .4 : 1) * (2 - this.health.staminaK) : 11 * this.health.staminaK) * dt);
    let hp = -this.health.hpDrain(); if (st.hunger <= 0) hp -= .3; if (st.thirst <= 0) hp -= .4; if (st.warmth <= 0) hp -= .5;
    if (st.hunger > 40 && st.thirst > 40 && st.warmth > 35) hp += .12 * (waiting && this.bed ? 6 : 1);
    st.health = clamp(st.health + hp * dt * drain);
    if (hp < 0 && st.health < 100) this.lastCause = st.warmth <= 0 ? 'Kälte' : st.thirst <= 0 ? 'Durst' : st.hunger <= 0 ? 'Hunger' : this.health.ill.erk > 60 ? 'Fieber' : 'Magen';
    this.slow = (st.warmth < 15 ? .85 : 1) * (st.health < 25 ? .85 : 1);
    if (st.health <= 0) return this.die();
    // flashlight / torch
    if (S.flags.flashOn) { S.battery = Math.max(0, S.battery - dt * .2); if (!S.battery) { S.flags.flashOn = false; this.ui.toast('🔦 Batterie leer.', 'warn'); } }
    const flick = S.battery < 15 ? (Math.random() < .1 ? .2 : 1) : 1;
    P.flash.intensity = S.flags.flashOn ? 45 * flick : 0;
    if (this.torchOn) { this.torchT -= dt; if (this.torchT <= 0) { this.torchOn = false; this.ui.toast('Die Fackel ist heruntergebrannt.'); } }
    P.torch.intensity = this.torchOn ? 9 + 3 * Math.sin(performance.now() / 60) : this.candleT > 0 ? 2.2 + .4 * Math.sin(performance.now() / 90) : 0;
    // movers (doors …) ease to their target; automatic door opens with power when someone is near
    for (const it of this.W.movers) {
      if (it.u.auto) it.target = this.strom() && it.pivot.position.distanceTo(P.pos) < 3.2 ? 1 : (this.strom() ? 0 : it.target);
      if (Math.abs(it.open - it.target) < 1e-4) continue;
      it.open += Math.sign(it.target - it.open) * Math.min(Math.abs(it.target - it.open), dt * (it.u.interact === 'slide' ? 1.6 : 2.2));
      const e = it.open * it.open * (3 - 2 * it.open), u = it.u;
      if (u.interact === 'door') { it.pivot.quaternion.copy(it.baseQuat); it.pivot.rotateY((u.angle || 1.6) * e); }
      else if (u.interact === 'lid') { const a = u.axis || [1, 0, 0]; const ax = new THREE.Vector3(a[0], a[2], -a[1]).normalize(); it.pivot.quaternion.copy(it.baseQuat).premultiply(new THREE.Quaternion().setFromAxisAngle(ax, (u.angle || 1.5) * e)); }
      else { const s = u.slide || [0, 0, 0]; it.pivot.position.copy(it.basePos).add(new THREE.Vector3(s[0], s[2], -s[1]).multiplyScalar(e)); }
      it.pivot.updateMatrixWorld(true);
    }
    // Hochsitz platform?
    const hs = this.W.spots.ziel_hochsitz; this.onHochsitz = !!hs && Math.hypot(P.pos.x - hs.pos.x, P.pos.z - hs.pos.z) < 1.3 && P.pos.y > hs.pos.y - 1;
    this.life.update(dt, P, dark);
    this.mood.update(dt); this.album.update(dt); this.story.update(dt); this.story.frame(dark); this.orders.update(dt);
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); const k = this.shake * .05; this.camera.position.x += (Math.random() - .5) * k; this.camera.position.y += (Math.random() - .5) * k; }
    this.updateLights(dt, dark);
    this.updateAudio(dt, dark, shop, rain);
    // quests + discoveries
    const q = this.quests[S.quest];
    if (q && q.done()) { S.quest++; this.audio.sfx('quest'); this.progress.add(50, q.t); q.onDone?.(); this.save(); }
    for (const pl of this.places) if (!S.found[pl.id] && (pl.test ? pl.test(P.pos) : pl.pos && pl.pos.distanceTo(P.pos) < pl.r)) {
      S.found[pl.id] = 1; this.progress.add(40, pl.name); this.ui.toast(`📍 Entdeckt: ${pl.name} (${Object.keys(S.found).length}/${this.places.length})`, 'good'); }
    this.secT -= dt; if (this.secT < 0) { this.secT = 1; if (this.walkAcc) { this.progress.stat('walk', this.walkAcc); this.walkAcc = 0; } this.progress.update(); }
    for (const r of this.drops) r.g.children[1].position.y = .42 + .04 * Math.sin(performance.now() / 400 + r.p[0]);
    // tips
    this.tipT -= dt;
    if (this.tipT < 0) {
      this.tipT = 6;
      if (dark > .55 && this.has('taschenlampe') && !S.flags.flashOn && !inside && !S.flags.tipFlash) { S.flags.tipFlash = 1; this.ui.toast('Es wird dunkel. F = Taschenlampe.'); }
      else if (st.warmth < 30 && !S.flags.tipCold) { S.flags.tipCold = 1; this.ui.toast('Dir ist kalt! Geh rein, zieh dir was an oder mach ein Feuer (C).', 'warn'); }
      else if ((st.hunger < 25 || st.thirst < 25) && !S.flags.tipFood) { S.flags.tipFood = 1; this.ui.toast('Du brauchst Essen und Trinken.', 'warn'); }
    }
    this.saveT += dt; if (this.saveT > 20) { this.saveT = 0; this.save(); }
  }
  updateLights(dt, dark) {
    const S = this.S, on = this.strom(), blink = Math.floor(performance.now() / 500) % 2 === 0;
    const grp = { innen: on && !S.flags.lightsOff, aussen: on && dark > .3, dach: on && dark > .3, strom: on, display: on, blinker: blink && S.day < 2, funk: dark > .3 && blink, kristall: true };
    for (const m of this.funkMats) { m.emissive.set(S.flags.funkPower ? '#4aff9a' : '#000000'); m.emissiveIntensity = S.flags.funkPower ? .9 : 0; }
    for (const [g, mats] of Object.entries(this.W.glow)) for (const m of mats) {
      const lit = grp[g] ?? true;
      if (g === 'display') { m.emissive.set(lit ? '#7dffb0' : '#000000'); m.emissiveIntensity = lit ? 1.2 : 0; }
      else m.emissiveIntensity = lit ? (m.userData.baseEmissive ?? 1) : 0;
    }
    for (const m of this.hazardMats) m.emissiveIntensity = grp.blinker ? 3 : 0;
    if (grp.blinker !== this._blink) { this._blink = grp.blinker; if (grp.blinker && this.P.pos.distanceTo(this.W.spots.spawn.pos) < 25) this.audio.sfx('hazard'); }
    const p = this.P.pos, cand = [];
    for (const l of this.W.lights) if (grp[l.group]) cand.push(l);
    for (const l of this.extraLights) if (l.power > 0) cand.push(l);
    cand.sort((a, b) => a.pos.distanceToSquared(p) / a.power - b.pos.distanceToSquared(p) / b.power);   // strongest nearby first
    for (let i = 0; i < POOL; i++) {
      const L = this.pool[i], c = cand[i];
      if (!c) { L.intensity += (0 - L.intensity) * Math.min(1, dt * 8); continue; }
      L.position.copy(c.pos); L.color.copy(c.color);
      // physical units (decay 2): roughly 1–2 lux-equivalents on the floor under a lamp, like the sun's ~2.4 by day
      const k = { innen: .3, blinker: .25, fire: .1, dach: .3, aussen: .32 }[c.group] ?? .3;
      L.intensity = c.power * k; L.distance = c.group === 'innen' ? 10 : 26; L.decay = 2;
    }
  }
  updateAudio(dt, dark, inside, rain) {
    const A = this.audio; if (!A.ctx) return;
    const p = this.P.pos, out = inside ? .25 : 1;
    const gale = this.sky.gale || 0;
    A.set('wind', (.05 + .14 * dark + .12 * rain + .3 * gale) * out); A.set('rain', .16 * rain * out * (1 + .5 * gale));
    A.set('creek', Math.max(0, 1 - Math.abs(p.x - creekX(-p.z)) / 26) * .22);
    const gen = this.posOf('Generator'); A.set('generator', this.strom() && gen ? Math.max(0, 1 - gen.distanceTo(p) / 45) * .12 : 0);
    A.set('fridge', this.strom() && inside ? .04 : 0);
    let fd = 99; for (const f of this.life.fires) if (f.on) fd = Math.min(fd, f.pos.distanceTo(p)); A.set('fire', Math.max(0, 1 - fd / 12) * .12);
    this.birdT -= dt; if (this.birdT < 0) { this.birdT = 2 + Math.random() * 6; if (!inside && !rain) A.sfx(dark < .3 ? 'bird' : dark > .8 && Math.random() < .3 ? 'owl' : 'none'); }
    if (this.S.stats.health < 30) { this.heartT -= dt; if (this.heartT < 0) { this.heartT = .9; A.sfx('heart'); } }
  }
  die() {
    this.S.flags.dead = 1; this.audio.sfx('hurt'); document.exitPointerLock?.();
    const cause = { Bär: 'Der Bär war stärker.', Wildschwein: 'Das Wildschwein hat dich erwischt.', Wolf: 'Die Wölfe waren schneller.', Kälte: 'Du bist erfroren.', Durst: 'Du bist verdurstet.', Hunger: 'Du bist verhungert.', Sturz: 'Ein böser Sturz.', Bachwasser: 'Das Bachwasser war keine gute Idee.', Unfall: 'Ein schwerer Unfall.', Fieber: 'Das Fieber war zu stark.', Magen: 'Dein Magen hat nicht mitgemacht.', Sprengung: 'Zu nah an der Sprengung.',
      Hagel: 'Das Unwetter hat dich draußen erwischt.', Blitz: 'Vom Blitz getroffen.', Schneesturm: 'Im Schneesturm erfroren.', Grimm: 'Der alte Grimm war stärker.' }[this.lastCause] || 'Die Nacht war zu lang.';
    document.getElementById('deadcause').textContent = cause; this.ui.show('dead', true);
  }

  // ---------------------------------------------------------------- save / load (browser storage; works without it too)
  snapshot() {
    const its = {};
    for (const it of this.W.interactives) if (!it.built && (it.target || Object.keys(it.state).length)) its[it.name] = { t: it.target, s: it.state };
    this.S.questId = this.quests[this.S.quest]?.t || '';
    if (this.boat.ok) this.S.boat = this.boat.save();
    return { v: SAVE_VERSION, at: Date.now(), S: this.S, its, build: this.build.save(), car: this.vehicle.ok ? this.vehicle.save() : null,
      fires: this.life.fires.filter(f => f.on && !f.owned).map(f => ({ p: f.pos.toArray(), fuel: f.fuel })), pos: this.P.pos.toArray(), yaw: this.P.yaw, torch: this.torchOn ? this.torchT : 0 };
  }
  save(slot = 'auto') {
    if (this.S.flags.dead) return false; if (slot === 'auto' && this.creative) slot = 'kreativ';
    try { localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(this.snapshot())); return true; } catch { return false; }
  }
  slotInfo(slot) {
    try { const d = this.readSlot(slot); if (!d) return null; return { at: d.at || 0, day: d.S?.day || 1, time: d.S?.time || 0, diff: d.S?.diff || 'mittel', creative: !!d.S?.creative }; } catch { return null; }
  }
  readSlot(slot) {
    let raw = null; try { raw = localStorage.getItem(SAVE_PREFIX + slot); if (!raw && slot === 'auto') raw = localStorage.getItem(OLD_SAVE); } catch { }
    return raw ? JSON.parse(raw) : null;
  }
  latestSlot() { let best = null, t = -1; for (const s of SLOTS) { const i = this.slotInfo(s); if (i && i.at >= t) { t = i.at; best = s; } } return best; }
  hasSave() { return !!this.latestSlot(); }
  load(slot) {
    let d; try { d = typeof slot === 'object' ? slot : this.readSlot(slot || this.latestSlot()); } catch { return false; }
    if (!d || !d.S) return false;
    // state: defaults first, then the saved values (keys a newer version added keep their defaults)
    const F = this.fresh();
    this.S = Object.assign(F, d.S); for (const k of ['stats', 'flags', 'found', 'known', 'ammo', 'mag', 'felled', 'side', 'stat', 'notes', 'car', 'dog', 'ill', 'badges', 'album', 'diary', 'radio']) this.S[k] = Object.assign(this.fresh()[k], d.S[k] || {});
    this.S.marks = Array.isArray(d.S.marks) ? d.S.marks : []; this.S.flags.dead = 0;
    this.S.inv = (d.S.inv || []).filter(x => ITEMS[x.id] && x.n > 0);           // items removed in a newer version
    if (!DIFF[this.S.diff]) this.S.diff = 'mittel';
    for (const it of this.W.interactives) {
      if (it.built) continue; const s = d.its?.[it.name]; if (!s) continue; it.state = s.s || {}; it.target = s.t || 0; it.open = it.target ? .999 : 0;
      if (it.state.taken || it.state.gone) it.node.visible = false; if (it.state.shown) it.node.visible = true; if (it.state.searched) this.emptySack(it); delete it.state.fuse;
    }
    for (const f of d.fires || []) this.life.addFire(new THREE.Vector3().fromArray(f.p), f.fuel);
    this.build.load(d.build);
    if (d.car) this.vehicle.load(d.car);
    if (this.S.boat) this.boat.load(this.S.boat);
    for (const r of [...this.drops]) this.scene.remove(r.g); this.drops = []; for (const x of d.S.drops || []) this.addDrop(x);
    // quest by name (robust against inserted quest steps)
    this.quests = this.makeQuests(); const qi = this.quests.findIndex(q => q.t === d.S.questId); if (qi >= 0) this.S.quest = qi;
    const p = new THREE.Vector3().fromArray(d.pos || [0, 0, 0]);
    this.P.setPose(p, d.yaw || 0); if (!this.P.free()) this.P.unstick();          // the map may have changed under the saved position
    if (d.torch) { this.torchOn = true; this.torchT = d.torch; }
    this.ui.renderHotbar(this.S.inv, this.S.sel);
    return true;
  }
  exportSave() { return JSON.stringify(this.snapshot()); }
  wipe(slot = 'auto') { try { localStorage.removeItem(SAVE_PREFIX + slot); if (slot === 'auto') localStorage.removeItem(OLD_SAVE); } catch { } }
}
