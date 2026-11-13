// Game logic: state, survival values, interactions (E), items, crafting, quests / tutorial, discoveries, power, lights, weather,
// campfires, save / load. The map's interactive objects come from Blender (userData.interact, see game/blender/core.py).
import * as THREE from 'three';
import { ITEMS, RECIPES } from './items.js';
import { B, Bv } from './world.js';
import { Life, roadX, creekX } from './life.js';

const SAVE = 'waldtank_save_v1';
const POOL = 8;
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const MOVING = new Set(['door', 'slide', 'lid', 'drawer']);

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
    this.chop = 0; this.saveT = 0; this.tipT = 0; this.birdT = 3; this.heartT = 0;
  }
  fresh() {
    return { time: 17.0, day: 1, abs: 17, stats: { health: 100, hunger: 78, thirst: 72, warmth: 85, stamina: 100 }, inv: [], sel: 0,
      battery: 65, genFuel: 0, quest: 0, flags: {}, found: {}, rain: 0, rainUntil: 0, nextRain: 19 + Math.random() * 6, rescueAt: 0 };
  }

  // ---------------------------------------------------------------- inventory
  capacity() { return this.S.flags.bag ? 16 : 4; }
  count(id) { return this.S.inv.filter(s => s.id === id).reduce((a, s) => a + s.n, 0); }
  has(id) { return this.count(id) > 0; }
  brenn() { return this.count('ast') + this.count('holz'); }
  add(id, n = 1, quiet = false) {
    const it = ITEMS[id];
    if (it?.equip === 'bag') { this.S.flags.bag = true; if (!quiet) this.ui.toast('🎒 Rucksack aufgesetzt – jetzt 16 Plätze. Tab öffnet ihn.'); return true; }
    if (it?.equip === 'jacket') { this.S.flags.jacket = true; if (!quiet) this.ui.toast('🧥 Jacke angezogen – du frierst nur noch halb so schnell.'); return true; }
    if (it?.battery && this.has('taschenlampe')) { this.S.battery = 100; if (!quiet) this.ui.toast('🔋 Taschenlampe aufgeladen.'); return true; }
    let s = this.S.inv.find(s => s.id === id && s.n < 10);
    if (!s) { if (this.S.inv.length >= this.capacity()) { this.ui.toast(this.S.flags.bag ? 'Dein Rucksack ist voll.' : 'Kein Platz mehr – du brauchst einen Rucksack.', 'warn'); this.audio.sfx('error'); return false; }
      s = { id, n: 0 }; this.S.inv.push(s); }
    s.n += n; if (!quiet) this.ui.toast(`+ ${it?.icon || ''} ${it?.name || id}`); this.ui.renderHotbar(this.S.inv, this.S.sel); return true;
  }
  take(id, n = 1) {
    for (let i = this.S.inv.length - 1; i >= 0 && n > 0; i--) { const s = this.S.inv[i]; if (s.id !== id) continue; const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) this.S.inv.splice(i, 1); }
    this.S.sel = Math.min(this.S.sel, 4); this.ui.renderHotbar(this.S.inv, this.S.sel);
  }
  swap(a, b) { this.take(a); this.add(b, 1, true); }
  useSlot(i) {
    const s = this.S.inv[i]; if (!s) return; const it = ITEMS[s.id];
    if (s.id === 'fackel') { if (this.torchOn) return this.ui.toast('Die Fackel brennt schon.'); if (!this.has('feuerzeug')) return this.ui.toast('Du brauchst ein Feuerzeug.');
      this.take('fackel'); this.torchOn = true; this.torchT = 240; this.audio.sfx('fire'); return this.ui.toast('🔥 Fackel angezündet (4 Minuten).'); }
    if (it.read) return this.read(s.id);
    if (it.battery && this.has('taschenlampe')) { this.take(s.id); this.S.battery = 100; return this.ui.toast('🔋 Taschenlampe aufgeladen.'); }
    if (!it.use) return this.ui.toast(it.desc || 'Damit kann man so nichts anfangen.');
    const st = this.S.stats;
    for (const [k, v] of Object.entries(it.use)) st[k] = clamp(st[k] + v);
    if (it.use.hunger > 0) this.S.flags.ate = 1; if (it.use.thirst > 0) this.S.flags.drank = 1;
    if (it.boost) this.boostT = it.boost;
    this.audio.sfx(it.use.thirst > it.use.hunger || it.use.thirst > 0 && !it.use.hunger ? 'drink' : 'eat');
    this.take(s.id); if (it.after) this.add(it.after, 1, true);
    if (it.msg) this.ui.toast(it.msg, it.poison ? 'warn' : ''); if (it.poison) this.ui.damage();
  }
  drop(i) { const s = this.S.inv[i]; if (!s) return; this.S.inv.splice(i, 1); this.ui.toast(`${ITEMS[s.id].name} weggeworfen.`); this.ui.renderHotbar(this.S.inv, this.S.sel); }
  canCraft(r) {
    for (const t of r.tools || []) if (!this.has(t)) return false;
    for (const [k, v] of Object.entries(r.needs)) if ((k === 'brenn' ? this.brenn() : this.count(k)) < v) return false;
    return !(r.place === 'fire' && this.insideShop(this.P.pos));
  }
  craft(id) {
    const r = RECIPES.find(r => r.id === id); if (!r || !this.canCraft(r)) return;
    for (const [k, v] of Object.entries(r.needs)) {
      if (k === 'brenn') { let n = v; const a = Math.min(n, this.count('ast')); this.take('ast', a); n -= a; this.take('holz', n); } else this.take(k, v);
    }
    if (r.place === 'fire') {
      const f = this.P.forward(); f.y = 0; f.normalize(); const p = this.P.pos.clone().addScaledVector(f, 1.6); p.y = this.W.groundY(p.x, p.z, this.P.pos.y + 1);
      this.life.addFire(p, 6); this.audio.sfx('fire'); this.ui.toast('🔥 Lagerfeuer brennt. E = Holz nachlegen, kochen.');
    } else { for (const [k, v] of Object.entries(r.gives)) this.add(k, v, true); this.audio.sfx('craft'); this.ui.toast(`🛠️ ${r.name} hergestellt.`); }
    this.ui.renderInventory(this);
  }
  read(id) {
    if (id === 'notiz_hochsitz') { this.S.flags.notiz = 1; this.ui.read('Notizzettel', this.byName.Notizzettel?.u.text || ''); }
  }

  // ---------------------------------------------------------------- world helpers
  insideShop(p) { return p.x > 21.1 && p.x < 36.9 && p.z > -9.9 && p.z < 9.9 && p.y < 4; }
  surface(p) {
    const bx = p.x, by = -p.z;
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
    if (this.S.flags.dead || this.S.flags.won) return;
    this.S.stats.health = clamp(this.S.stats.health - n); this.ui.damage(); this.audio.sfx('hurt'); this.lastCause = cause;
  }
  respawnFall() { const s = this.W.spots.spawn; this.P.setPose(s.pos.clone().setY(s.pos.y - 1.6), this.P.yaw); }

  // ---------------------------------------------------------------- interaction target (what the crosshair points at)
  findTarget() {
    const cam = this.camera, f = this.P.forward(), o = cam.position;
    if (this.P.climb) return null;
    this.ray.set(o, f); this.ray.far = 2.8;
    const hits = this.ray.intersectObjects(this.intMeshes, false).filter(h => { const it = h.object.userData._it; return it && it.node.visible && !it.state.taken; });
    const wall = this.W.rayHit(o, f, 2.8);
    if (hits.length && (!wall || hits[0].distance <= wall.distance + .05)) return { it: hits[0].object.userData._it };
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
    if (this.has('axt')) for (const t of this.W.treesNear(o.x, o.z)) {
      const dx = t.x - o.x, dz = t.z - o.z, dist = Math.hypot(dx, dz); if (dist > 2.2) continue;
      const fl = Math.hypot(f.x, f.z) || 1; if ((dx * f.x + dz * f.z) / (dist * fl) > .92) return { tree: t };
    }
    return null;
  }
  verb(t) {
    if (!t) return '';
    if (t.down) return '[E] Runterklettern';
    if (t.tree) return '[E] Holz hacken (Axt)';
    if (t.fire) { const f = t.fire;
      if (!f.on) return this.brenn() && this.has('feuerzeug') ? '[E] Feuer wieder anzünden' : 'Feuer aus – Holz + Feuerzeug nötig';
      if (this.has('dosensuppe')) return '[E] Suppe am Feuer erwärmen'; if (this.has('topf_wasser')) return '[E] Wasser abkochen';
      if (this.has('steinpilz')) return '[E] Pilze braten'; if (this.brenn()) return '[E] Holz nachlegen'; return 'Lagerfeuer – wärmt dich'; }
    const it = t.it, u = it.u, L = it.label;
    switch (u.interact) {
      case 'door': case 'lid': case 'slide': case 'drawer':
        if (u.interact === 'slide' && u.auto && this.strom()) return L + ' (öffnet automatisch)';
        return `[E] ${L} ${it.target ? 'schließen' : 'öffnen'}`;
      case 'switch': return `[E] ${L} (${this.S.flags.lightsOff ? 'an' : 'aus'})`;
      case 'pickup': return `[E] ${L} aufheben`;
      case 'search': return it.state.searched ? L + ' (leer)' : `[E] ${L} durchsuchen`;
      case 'pump': return `[E] ${L} benutzen`;
      case 'read': return `[E] ${L} lesen`;
    }
    if (u.ladder) return this.onHochsitz ? '[E] Runterklettern' : '[E] Leiter hochklettern';
    return `[E] ${L}`;
  }
  interact(t) {
    if (!t) return;
    const S = this.S, A = this.audio, ui = this.ui;
    if (t.down) return this.climbDown();
    if (t.tree) { A.sfx('chop'); this.chop++; if (this.chop >= 3) { this.chop = 0; this.add('holz'); } return; }
    if (t.fire) return this.fireAction(t.fire);
    const it = t.it, u = it.u;
    if (u.ladder) {
      if (this.onHochsitz) return this.climbDown();
      const top = Bv(u.top); return this.P.startClimb(this.P.pos.clone(), top);
    }
    switch (u.interact) {
      case 'door': case 'lid': case 'slide': case 'drawer': {
        if (u.needs === 'strom' && !this.strom()) { if (it.name.startsWith('Schiebetuer')) S.flags.frontTried = 1; A.sfx('locked'); return ui.toast(u.locked_msg || 'Ohne Strom geht das nicht.'); }
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
        }
        return;
      case 'search':
        if (it.state.searched) return ui.toast('Hier ist nichts mehr.');
        A.sfx('door'); if (this.add(u.item, u.item === 'dosenbohnen' ? 2 : 1, true)) { it.state.searched = 1; if (u.bonus) this.add(u.bonus, 1, true); ui.toast(u.found || `Gefunden: ${ITEMS[u.item].name}`); A.sfx('pickup'); }
        return;
      case 'read': return ui.read(it.label, u.text || '');
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
      case 'wasserhahn': A.sfx('water'); this.S.stats.thirst = clamp(this.S.stats.thirst + 30); this.S.flags.drank = 1; return ui.toast('Du trinkst Leitungswasser.');
      case 'auto': A.sfx('error'); return ui.toast(S.flags.carTried ? 'Keilriemen gerissen. Ohne Werkstatt geht hier nichts.' : (S.flags.carTried = 1, 'Der Anlasser orgelt – nichts. Unter der Haube riecht es verbrannt.'));
      case 'bachwasser':
        if (this.has('topf')) { this.swap('topf', 'topf_wasser'); A.sfx('water'); return ui.toast('Topf mit Bachwasser gefüllt. Am Feuer abkochen!'); }
        A.sfx('drink'); this.S.stats.thirst = clamp(this.S.stats.thirst + 25); this.S.flags.drank = 1;
        if (Math.random() < .4) { this.hurt(10, 'Bachwasser'); return ui.toast('Das Wasser schmeckt modrig … dein Bauch grummelt.', 'warn'); }
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
  takeBrenn(n) { const a = Math.min(n, this.count('ast')); this.take('ast', a); this.take('holz', n - a); }
  fireAction(f) {
    const ui = this.ui;
    if (!f.on) { if (this.brenn() && this.has('feuerzeug')) { this.takeBrenn(1); f.on = true; f.fuel = 3; this.audio.sfx('fire'); return ui.toast('🔥 Wieder angezündet.'); } return; }
    if (this.has('dosensuppe')) { this.swap('dosensuppe', 'suppe_warm'); this.audio.sfx('fire'); return ui.toast('🍲 Heiße Suppe!'); }
    if (this.has('topf_wasser')) { this.swap('topf_wasser', 'topf_abgekocht'); this.audio.sfx('fire'); return ui.toast('Wasser abgekocht – jetzt sicher trinkbar.'); }
    if (this.has('steinpilz')) { this.swap('steinpilz', 'pilz_gebraten'); this.audio.sfx('fire'); return ui.toast('🍳 Pilze gebraten.'); }
    if (this.brenn()) { this.takeBrenn(1); f.fuel += this.has('holz') ? 3 : 2; this.audio.sfx('fire'); return ui.toast('Holz nachgelegt.'); }
  }
  climbDown() {
    const lad = this.W.ladders[0]; if (!lad) return;
    const bot = Bv(lad.u.bottom); bot.y = this.W.groundY(bot.x, bot.z, bot.y + 2) + .05; this.P.startClimb(this.P.pos.clone(), bot);
  }

  // ---------------------------------------------------------------- quests (tutorial → main goal)
  makeQuests() {
    const S = this.S, g = this;
    return [
      { t: 'Gestrandet', x: () => 'Dein Auto ist liegen geblieben. Schau dich mit der <b>Maus</b> um und lauf mit <b>W A S D</b>.', target: () => null,
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
    ];
  }
  win() {
    this.S.flags.won = 1; this.audio.sfx('win'); this.life.clear();
    const st = this.S, found = Object.keys(st.found).length;
    document.getElementById('winstats').innerHTML = `Überlebt bis Tag ${st.day}, ${String(Math.floor(st.time)).padStart(2, '0')}:${String(Math.floor(st.time % 1 * 60)).padStart(2, '0')} · Orte entdeckt: ${found}/${this.places.length}`;
    this.ui.show('win', true); document.exitPointerLock?.(); this.save();
  }

  // ---------------------------------------------------------------- per frame
  update(dt, keys) {
    const S = this.S, st = S.stats, P = this.P;
    if (S.flags.dead || S.flags.won) return;
    // time (1 real second = 1 game minute; Z = wait faster where it is safe and warm)
    const wolfNear = this.life.animals.some(a => a.kind === 'wolf' && a.pos.distanceTo(P.pos) < 45);
    const safe = (this.insideShop(P.pos) && this.strom()) || this.life.fires.some(f => f.on && f.pos.distanceTo(P.pos) < 4) || (this.has('schlafsack') && !wolfNear);
    if (keys.KeyZ && !safe && !this._waitTip) { this._waitTip = 1; this.ui.toast(wolfNear ? 'Zu gefährlich – Wölfe in der Nähe!' : 'Warten geht nur drinnen mit Strom, am Feuer oder mit Schlafsack.', 'warn'); setTimeout(() => this._waitTip = 0, 4000); }
    const waiting = this.waiting = !!keys.KeyZ && safe; const scale = waiting ? 30 : 1;
    S.time += dt * scale / 60; S.abs = (S.day - 1) * 24 + S.time;
    if (S.time >= 24) { S.time -= 24; S.day++; this.ui.toast(`Tag ${S.day} beginnt.`); }
    const dark = this.sky.darkness(S.time);
    // weather: an occasional shower
    if (S.abs > S.nextRain && !S.rainUntil) { S.rainUntil = S.abs + 1 + Math.random() * 2; this.ui.toast('🌧️ Es fängt an zu regnen.'); }
    if (S.rainUntil && S.abs > S.rainUntil) { S.rainUntil = 0; S.nextRain = S.abs + 5 + Math.random() * 8; }
    this.sky.rainAmount += ((S.rainUntil ? 1 : 0) - this.sky.rainAmount) * Math.min(1, dt * .2);
    const rain = this.sky.rainAmount;
    // generator fuel
    if (S.genFuel > 0) { S.genFuel -= dt * scale / 60; if (S.genFuel <= 0) { S.genFuel = 0; this.ui.toast('⚠️ Das Aggregat stottert und geht aus. Tank leer!', 'warn'); } }
    // survival
    const drain = waiting ? scale * .35 : 1, inside = this.insideShop(P.pos);
    st.hunger = clamp(st.hunger - dt * drain * .075 * (P.sprint ? 1.8 : 1));
    st.thirst = clamp(st.thirst - dt * drain * .1 * (P.sprint ? 2 : 1));
    let env = inside ? (this.strom() ? .35 : -.02 - .04 * dark) : -.03 - .2 * dark - .15 * rain;
    if (this.onHochsitz) env *= .6;
    for (const f of this.life.fires) if (f.on) { const d = f.pos.distanceTo(P.pos); if (d < 4.5) env = Math.max(env, 1.2 * (1 - d / 4.5) + .2); }
    if (this.torchOn) env += .06;
    if (env < 0 && S.flags.jacket) env *= .5;
    if (env < 0 && waiting && this.has('schlafsack')) env *= .3;
    st.warmth = clamp(st.warmth + env * dt * (waiting ? scale * .35 : 1));
    if (this.boostT > 0) this.boostT -= dt;
    st.stamina = clamp(st.stamina + (P.sprint ? -15 * (this.boostT > 0 ? .4 : 1) : 11) * dt);
    let hp = 0; if (st.hunger <= 0) hp -= .3; if (st.thirst <= 0) hp -= .4; if (st.warmth <= 0) hp -= .5;
    if (st.hunger > 40 && st.thirst > 40 && st.warmth > 35) hp += .12;
    st.health = clamp(st.health + hp * dt * drain);
    if (hp < 0 && st.health < 100) this.lastCause = st.warmth <= 0 ? 'Kälte' : st.thirst <= 0 ? 'Durst' : 'Hunger';
    this.slow = (st.warmth < 15 ? .85 : 1) * (st.health < 25 ? .85 : 1);
    if (st.health <= 0) return this.die();
    // flashlight / torch
    if (S.flags.flashOn) { S.battery = Math.max(0, S.battery - dt * .2); if (!S.battery) { S.flags.flashOn = false; this.ui.toast('🔦 Batterie leer.', 'warn'); } }
    const flick = S.battery < 15 ? (Math.random() < .1 ? .2 : 1) : 1;
    P.flash.intensity = S.flags.flashOn ? 45 * flick : 0;
    if (this.torchOn) { this.torchT -= dt; if (this.torchT <= 0) { this.torchOn = false; this.ui.toast('Die Fackel ist heruntergebrannt.'); } }
    P.torch.intensity = this.torchOn ? 9 + 3 * Math.sin(performance.now() / 60) : 0;
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
    this.updateLights(dt, dark);
    this.updateAudio(dt, dark, inside, rain);
    // quests + discoveries
    const q = this.quests[S.quest];
    if (q && q.done()) { S.quest++; this.audio.sfx('quest'); q.onDone?.(); this.save(); }
    for (const pl of this.places) if (!S.found[pl.id] && (pl.test ? pl.test(P.pos) : pl.pos && pl.pos.distanceTo(P.pos) < pl.r)) {
      S.found[pl.id] = 1; this.ui.toast(`📍 Entdeckt: ${pl.name} (${Object.keys(S.found).length}/${this.places.length})`, 'good'); }
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
    const grp = { innen: on && !S.flags.lightsOff, aussen: on && dark > .3, dach: on && dark > .3, strom: on, display: on, blinker: blink && S.day < 2 };
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
    A.set('wind', (.05 + .14 * dark + .12 * rain) * out); A.set('rain', .16 * rain * out);
    A.set('creek', Math.max(0, 1 - Math.abs(p.x - creekX(-p.z)) / 26) * .22);
    const gen = this.posOf('Generator'); A.set('generator', this.strom() && gen ? Math.max(0, 1 - gen.distanceTo(p) / 45) * .12 : 0);
    A.set('fridge', this.strom() && inside ? .04 : 0);
    let fd = 99; for (const f of this.life.fires) if (f.on) fd = Math.min(fd, f.pos.distanceTo(p)); A.set('fire', Math.max(0, 1 - fd / 12) * .12);
    this.birdT -= dt; if (this.birdT < 0) { this.birdT = 2 + Math.random() * 6; if (!inside && !rain) A.sfx(dark < .3 ? 'bird' : dark > .8 && Math.random() < .3 ? 'owl' : 'none'); }
    if (this.S.stats.health < 30) { this.heartT -= dt; if (this.heartT < 0) { this.heartT = .9; A.sfx('heart'); } }
  }
  die() {
    this.S.flags.dead = 1; this.audio.sfx('hurt'); document.exitPointerLock?.();
    const cause = { Wolf: 'Die Wölfe waren schneller.', Kälte: 'Du bist erfroren.', Durst: 'Du bist verdurstet.', Hunger: 'Du bist verhungert.', Sturz: 'Ein böser Sturz.', Bachwasser: 'Das Bachwasser war keine gute Idee.' }[this.lastCause] || 'Die Nacht war zu lang.';
    document.getElementById('deadcause').textContent = cause; this.ui.show('dead', true);
  }

  // ---------------------------------------------------------------- save / load (browser storage; works without it too)
  save() {
    if (this.S.flags.dead) return;
    const its = {};
    for (const it of this.W.interactives) if (it.target || Object.keys(it.state).length) its[it.name] = { t: it.target, s: it.state };
    const data = { S: this.S, its, fires: this.life.fires.filter(f => f.on).map(f => ({ p: f.pos.toArray(), fuel: f.fuel })), pos: this.P.pos.toArray(), yaw: this.P.yaw, torch: this.torchOn ? this.torchT : 0 };
    try { localStorage.setItem(SAVE, JSON.stringify(data)); } catch { }
  }
  hasSave() { try { return !!localStorage.getItem(SAVE); } catch { return false; } }
  load() {
    let d; try { d = JSON.parse(localStorage.getItem(SAVE)); } catch { return false; }
    if (!d) return false;
    this.S = Object.assign(this.fresh(), d.S); this.S.flags.dead = 0;
    for (const it of this.W.interactives) {
      const s = d.its[it.name]; if (!s) continue; it.state = s.s || {}; it.target = s.t || 0; it.open = it.target ? .999 : 0;
      if (it.state.taken) it.node.visible = false;
    }
    for (const f of d.fires || []) this.life.addFire(new THREE.Vector3().fromArray(f.p), f.fuel);
    this.P.setPose(new THREE.Vector3().fromArray(d.pos), d.yaw); if (d.torch) { this.torchOn = true; this.torchT = d.torch; }
    this.quests = this.makeQuests(); this.ui.renderHotbar(this.S.inv, this.S.sel);
    return true;
  }
  wipe() { try { localStorage.removeItem(SAVE); } catch { } }
}
