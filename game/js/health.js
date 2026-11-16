// Health: illnesses and food that spoils.
//   Erkältung (cold): caught when you are cold (warmth < 30) or wet in the rain outside, more easily in the mountains. It gets worse while
//   you stay cold and heals when you are warm and fed (sleep heals fastest). Effects: you cough, tire faster (stamina), lose warmth faster;
//   above 60 % fever costs health. Cure: Kräutertee (−40 %), Medizin (all of it).
//   Magenverstimmung (upset stomach): from spoiled food, raw meat / fish, creek water. Hunger and thirst drop faster, above 50 % it costs
//   health. Heals by itself in a few hours; tea / medicine help.
//   Food spoils: items with ITEMS[id].spoil (game hours) carry s.f = hours left on their stack (backpack, storage, dropped bundles).
//   Cold keeps food longer: the cool box (×0.2), winter (×0.5), the mountains (×0.7). Spoiled food turns into „Verdorbenes Essen“.
import { ITEMS } from './items.js';
import { T, TN } from './i18n.js';

export const ILL = { erk: { name: T('Erkältung'), icon: '🤧' }, mag: { name: T('Magenverstimmung'), icon: '🤢' } };
const COOL = { kuehlbox: .2 };
const RISK = { aus: .5, leicht: .6, mittel: 1, schwer: 1.4 };

export class Health {
  constructor(game) { this.g = game; this.coughT = 15; }
  get S() { return this.g.S; }
  get ill() { const S = this.S; if (!S.ill || typeof S.ill !== 'object') S.ill = { erk: 0, mag: 0 }; return S.ill; }
  // how fast food spoils at a place (1 = normal)
  coldK(p) { const g = this.g; let k = 1; if (g.seasons?.season === 'Winter') k *= .5; if (g.region(p) === 'berg') k *= .7; return k; }
  stamp(s) { const sp = ITEMS[s.id]?.spoil; if (sp && s.f === undefined) s.f = sp; return s; }
  // let a list of stacks age by `hours` × k; returns how many items went off
  age(list, hours, k) {
    let n = 0;
    for (const s of list) { const sp = ITEMS[s.id]?.spoil; if (!sp) continue; if (s.f === undefined) s.f = sp; s.f -= hours * k; if (s.f <= 0) { n += s.n; s.id = 'verdorben'; delete s.f; } }
    return n;
  }
  freshText(s) {
    const sp = ITEMS[s.id]?.spoil; if (!sp) return ''; const f = s.f ?? sp;
    return f < 4 ? T('⚠️ verdirbt bald ({n} h)', { n: Math.max(0, f).toFixed(0) }) : T('🕒 frisch: noch {n} h', { n: Math.round(f) });
  }
  // eating / drinking: cures and risks
  eat(id) {
    const it = ITEMS[id], I = this.ill, g = this.g; if (!it) return;
    if (it.cure) {
      const had = I.erk > 0 || I.mag > 0;
      I.erk = Math.max(0, I.erk - (it.cure.erk || 0)); I.mag = Math.max(0, I.mag - (it.cure.mag || 0));
      if (had && !I.erk && !I.mag) this.cured();
    }
    if (it.sick && Math.random() < (it.sickP ?? 1)) this.upset(it.sick);
  }
  upset(n) {
    const I = this.ill, was = I.mag; I.mag = Math.min(100, Math.max(I.mag, n));
    if (!was) { this.g.ui.toast(T('🤢 Dir wird übel – Magenverstimmung. Hunger und Durst steigen schneller. Kräutertee oder Medizin helfen.'), 'warn'); this.g.progress.stat('ill'); this.g.audio.sfx('retch'); }
  }
  catchCold() {
    const I = this.ill; I.erk = 25; this.g.progress.stat('ill'); this.g.audio.sfx('cough');
    this.g.ui.toast(T('🤧 Hatschi! Du hast dich erkältet. Halt dich warm, trink Kräutertee oder nimm Medizin.'), 'warn');
  }
  cured() { this.g.progress.stat('cured'); this.g.ui.toast(T('😊 Du bist wieder gesund!'), 'good'); }
  // effects the game applies every frame
  get staminaK() { return this.ill.erk > 0 ? .6 : 1; }
  get coldLossK() { return this.ill.erk > 0 ? 1.25 : 1; }
  get foodK() { return this.ill.mag > 0 ? 1.6 : 1; }
  hpDrain() { const I = this.ill; return (I.erk > 60 ? .05 : 0) + (I.mag > 50 ? .035 : 0); }
  label() { const I = this.ill, out = []; if (I.erk > 0) out.push(`${ILL.erk.icon} ${Math.ceil(I.erk)} %`); if (I.mag > 0) out.push(`${ILL.mag.icon} ${Math.ceil(I.mag)} %`); return out.join(' '); }
  // dt = real seconds, hours = game hours passed (also called by sleep() with the hours slept)
  update(dt, hours, sleeping = false) {
    const g = this.g, S = this.S, I = this.ill, st = S.stats, P = g.P;
    if (hours > 0) {
      // spoiling: backpack, storage, dropped bundles
      const k = this.coldK(P.pos), n = this.age(S.inv, hours, k);
      if (n) { g.ui.toast(TN(n, '🤢 Etwas in deinem Rucksack ist verdorben.', '🤢 {n} Sachen in deinem Rucksack sind verdorben.'), 'warn'); g.ui.renderHotbar(S.inv, S.sel); }
      for (const s of g.build.list) if (s.inv) this.age(s.inv, hours, (COOL[s.type] ?? 1) * this.coldK(s.grp.position));
      for (const r of [...g.drops]) {
        const sp = ITEMS[r.id]?.spoil; if (!sp) continue; r.f = (r.f ?? sp) - hours * this.coldK(r.g.position);
        if (r.f <= 0) { g.scene.remove(r.g); g.drops.splice(g.drops.indexOf(r), 1); g.addDrop({ id: 'verdorben', n: r.n, p: r.p }); }
      }
      g.S.drops = g.drops.map(({ id, n, p, f }) => ({ id, n, p, f }));
      // a cold: catching it, getting better or worse
      const wet = g.sky.rainAmount > .3 && !g.roof && !g.vehicle?.driving, berg = g.region(P.pos) === 'berg';
      if (!I.erk && !sleeping && S.day >= 2) {                                // the first day is spared (tutorial)
        const risk = (st.warmth < 30 ? .3 : 0) + (wet && st.warmth < 60 ? .12 : 0) + (berg && st.warmth < 45 ? .08 : 0);
        if (risk && Math.random() < risk * hours * (RISK[S.diff] ?? 1)) this.catchCold();
      } else if (I.erk > 0) {
        const warm = st.warmth > 55 && st.hunger > 25;
        I.erk = Math.min(100, I.erk + hours * (warm ? (sleeping ? -12 : -5) : st.warmth < 30 ? 6 : 1.5));
        if (I.erk <= 0) { I.erk = 0; if (!I.mag) this.cured(); }
      }
      if (I.mag > 0) { I.mag -= hours * (sleeping ? 12 : 8); if (I.mag <= 0) { I.mag = 0; if (!I.erk) this.cured(); } }
    }
    if (dt > 0 && (I.erk > 0 || I.mag > 0)) {
      this.coughT -= dt;
      if (this.coughT < 0) { this.coughT = 18 + Math.random() * 30; g.audio.sfx(I.erk > 0 ? 'cough' : 'retch'); }
    }
  }
}
