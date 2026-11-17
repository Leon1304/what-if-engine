// Setzt eine Kachel zusammen: Gelände (terrain.js) + Natur + Gebäude je Kachelart.
// Ergebnis in Kachel-Koordinaten (Ursprung = Kachelmitte auf Höhe 0): Geometrie je Ebene, bewegliche Teile, Markierungen, Gelände-Feld.
import { Kit } from '../kit.js';
import { hash, edgeMid, edgeAngle, INR, R } from '../hex.js';
import { makeField, buildTerrain, WATER_Y } from '../terrain.js';
import * as N from './nature.js';
import { firstEdge, scatter, groundMax, place, bld, rot, meadow, banks, lamp } from './tilekit.js';
const EX = { ...(await import('./extra_land.js').catch(() => ({}))), ...(await import('./extra_town.js').catch(() => ({}))) };
const H = await import('./house.js').catch(e => (console.warn('house.js fehlt', e.message), {}));
const B = await import('./buildings.js').catch(e => (console.warn('buildings.js fehlt', e.message), {}));

export function buildTile(t, E, nb, cx, cz, opts = {}) {
  const seed = hash(t.k, t.q, t.r), k = new Kit(seed), F = makeField(t, E, nb, cx, cz);
  buildTerrain(k, F, nb, seed);
  const S = (type, x, z, extra) => k.spot(type, [x, F.h(x, z), z], extra);
  const o = t.o, info = {};
  const ex = EX['tile_' + t.k];
  if (ex) ex(k, F, { t, E, nb, o, seed, stage: opts.stage || 1, S });
  else switch (t.k) {
    case 'wiese': {
      const taken = meadow(k, F, 1.4);
      if (k.rand() < .45) scatter(k, F, 1, 1.4, (x, y, z) => N.leafTree(k, [x, y, z], k.R(.9, 1.2)), 20, taken);
      scatter(k, F, 1 + Math.floor(k.R(0, 2)), .8, (x, y, z) => N.bush(k, [x, y, z], k.R(.8, 1.1), k.rand() < .4 ? 0xd83a5a : 0), 20, taken);
      S('meadow', 0, 0); break;
    }
    case 'wald': {
      const taken = [], n = 9 + Math.floor(k.R(0, 5));
      scatter(k, F, n, 1.15, (x, y, z) => { const r = k.rand(); r < .5 ? N.pine(k, [x, y, z], k.R(.85, 1.25)) : r < .8 ? N.leafTree(k, [x, y, z], k.R(.9, 1.3)) : N.birch(k, [x, y, z], k.R(.9, 1.2)); }, 40, taken);
      scatter(k, F, 6, .3, (x, y, z) => N.fern(k, [x, y, z], k.R(.8, 1.3)), 20, taken);
      scatter(k, F, 5, .1, (x, y, z) => N.mushroom(k, [x, y, z], k.rand() < .6), 20, taken);
      scatter(k, F, 2, .6, (x, y, z) => N.bush(k, [x, y, z], .9, k.rand() < .5 ? 0x3a3a9a : 0xd83a3a), 20, taken);
      if (k.rand() < .6) scatter(k, F, 1, .4, (x, y, z) => N.stump(k, [x, y, z]), 20, taken);
      if (k.rand() < .5) scatter(k, F, 1, 1.3, (x, y, z) => N.log(k, [x, y, z], k.R(0, 3)), 20, taken);
      scatter(k, F, 12, .1, (x, y, z) => N.grass(k, [x, y, z], .9, 0x4f8a3a), 10, taken);
      S('forest', 0, 0); break;
    }
    case 'bach': case 'bachk': case 'quelle': {
      banks(k, F);
      if (t.k === 'quelle') { for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; N.rock(k, [Math.cos(a) * 1.5, F.h(Math.cos(a) * 1.5, Math.sin(a) * 1.5) + .05, Math.sin(a) * 1.5], k.R(.35, .55)); } }
      const taken = meadow(k, F, .9);
      if (k.rand() < .5) scatter(k, F, 1, 1.3, (x, y, z) => N.leafTree(k, [x, y, z], k.R(.9, 1.1)), 20, taken);
      scatter(k, F, 1, .6, (x, y, z) => N.bush(k, [x, y, z]), 20, taken);
      S('water', 0, 0); break;
    }
    case 'see': {
      for (let i = 0; i < 26; i++) { const a = k.R(0, 6.28), d = k.R(INR * .45, INR * .82), x = Math.cos(a) * d, z = Math.sin(a) * d; const h = F.h(x, z); if (h > WATER_Y - .15 && h < .08) N.reed(k, [x, Math.max(h, WATER_Y), z]); }
      for (let i = 0; i < 9; i++) { const a = k.R(0, 6.28), d = k.R(.5, INR * .55), x = Math.cos(a) * d, z = Math.sin(a) * d; if (F.h(x, z) < WATER_Y - .3) N.lily(k, [x, WATER_Y + .015, z]); }
      const taken = [[0, 0, INR * .7]]; meadow(k, F, .5, taken);
      if (B.jetty && k.rand() < .55) { const a = k.R(0, 6.28), d = INR * .74, x = Math.cos(a) * d, z = Math.sin(a) * d; k.ground = .1; bld(k, [x, .12, z], -(a + Math.PI), () => B.jetty(k, { seed })); k.ground = 0; }
      k.spot('lake', [0, WATER_Y, 0]); break;
    }
    case 'haus': {
      const i = firstEdge(E, 'r'), st = opts.stage || 1;
      const r = place(k, F, 0, 0, 3, rot(i), () => H.house ? H.house(k, { stage: st, seed }) : (k.box(0xeedfc0, [0, 0, 0], [4, 2.6, 5]), {}));
      const rad = r.radius || 3.6, taken = [[0, 0, rad]];
      scatter(k, F, 1 + Math.floor(k.R(0, 2)), 1.2, (x, y, z) => k.rand() < .5 ? N.leafTree(k, [x, y, z], k.R(.8, 1.05)) : N.birch(k, [x, y, z], .9), 30, taken);
      scatter(k, F, 2, .6, (x, y, z) => N.bush(k, [x, y, z], .8), 20, taken);
      meadow(k, F, .6, taken); info.house = true; break;
    }
    case 'weg': case 'wegk': {
      const taken = meadow(k, F, 1);
      const [ex, ez] = edgeMid(firstEdge(E, 'r'), INR * .55), a = edgeAngle(firstEdge(E, 'r')), px = ex - Math.sin(a) * 1.35, pz = ez + Math.cos(a) * 1.35;
      if (F.free(px, pz, .2)) { k.cyl(0x4a3a2a, [px, F.h(px, pz), pz], .06, 2.4, 6); k.box(0x3a3a3a, [px, F.h(px, pz) + 2.3, pz], [.28, .4, .28]); k.box(0xffd890, [px, F.h(px, pz) + 2.36, pz], [.2, .26, .2], { layer: 'glow', tag: 1 }); k.cone(0x2a2a2a, [px, F.h(px, pz) + 2.7, pz], .22, .18, 4); S('light', px, pz); }
      scatter(k, F, 2, .7, (x, y, z) => N.bush(k, [x, y, z], .8), 20, taken);
      if (k.rand() < .4) scatter(k, F, 1, 1.2, (x, y, z) => N.leafTree(k, [x, y, z], .9), 20, taken);
      break;
    }
    case 'feld': {
      const v = k.pick(['wheat', 'wheat', 'pumpkin', 'cabbage', 'sun']), a = k.R(0, Math.PI), ca = Math.cos(a), sa = Math.sin(a);
      for (let u = -4.4; u <= 4.4; u += .62) for (let w = -4.4; w <= 4.4; w += v === 'wheat' ? .34 : .8) {
        const x = u * ca - w * sa, z = u * sa + w * ca; if (Math.hypot(x, z) > INR * .8 || !F.free(x, z, .1)) continue;
        const y = F.h(x, z); k.box(0x6a4a2e, [x, y - .05, z], [.5, .1, .5], { r: [0, a, 0], jit: .05, tag: 0 });   // Furche
        if (v === 'wheat') N.wheat(k, [x, y, z]); else if (v === 'pumpkin') { if (k.rand() < .55) N.pumpkin(k, [x, y, z]); } else if (v === 'cabbage') N.cabbage(k, [x, y, z]); else if (k.rand() < .7) N.sunflower(k, [x, y, z]);
      }
      const ed = k.R(0, 6.28); N.scarecrow(k, [Math.cos(ed) * 1.2, F.h(Math.cos(ed) * 1.2, Math.sin(ed) * 1.2), Math.sin(ed) * 1.2]);
      const ha = k.R(0, 6.28); for (let i = 0; i < 2; i++) { const x = Math.cos(ha) * (INR * .86) + i * .9, z = Math.sin(ha) * (INR * .86); if (F.free(x, z, .4)) N.hay(k, [x, F.h(x, z), z], ha); }
      S('field', 0, 0); break;
    }
    case 'muehle': {
      place(k, F, 0, 0, 2.6, k.R(0, 6.28), () => B.windmill ? B.windmill(k, { seed }) : k.cyl(0xc9b28a, [0, 0, 0], 2, 8, 8, { top: .6 }));
      const taken = [[0, 0, 3.6]];
      for (let i = 0; i < 40; i++) { const a = k.R(0, 6.28), d = k.R(3.8, INR * .85), x = Math.cos(a) * d, z = Math.sin(a) * d; if (F.free(x, z, .1)) N.wheat(k, [x, F.h(x, z), z]); }
      meadow(k, F, .4, taken); break;
    }
    case 'hof': { place(k, F, 0, 0, 3.5, rot(firstEdge(E, 'r')), () => B.farm ? B.farm(k, { seed }) : k.box(0xa83a2a, [0, 0, 0], [5, 4, 6])); break; }
    case 'kapelle': { const tk = [[0, 0, 4.2]]; place(k, F, 0, 0, 3.2, rot(firstEdge(E, 'r')), () => B.chapel ? B.chapel(k, { seed }) : k.box(0xe8e4dc, [0, 0, 0], [6, 4, 3.6])); meadow(k, F, .4, tk); break; }
    case 'bruecke': { banks(k, F); bld(k, [0, 0, 0], rot(o), () => B.bridge ? B.bridge(k, { seed }) : null); meadow(k, F, .6); break; }
    case 'wmuehle': { banks(k, F); bld(k, [0, 0, 0], rot(o), () => B.watermill ? B.watermill(k, { seed }) : null); break; }
    case 'markt': { bld(k, [0, F.h(0, 0), 0], rot(o), () => B.market ? B.market(k, { seed }) : null); meadow(k, F, .3, [[0, 0, 4.4]]); break; }
    case 'start': { bld(k, [0, F.h(0, 0), 0], rot(o), () => B.well ? B.well(k, { seed }) : k.cyl(0x8a8780, [0, 0, 0], .9, .8, 10)); meadow(k, F, .7, [[0, 0, 2.6]]); break; }
    case 'turm': {
      const taken = [[0, 0, 2.8]];
      place(k, F, 0, 0, 2, 0, () => B.lighthouse ? B.lighthouse(k, { seed }) : k.cyl(0xf2f2f2, [0, 0, 0], 1.2, 9, 10, { top: .7 }));
      for (let i = 0; i < 6; i++) scatter(k, F, 1, .7, (x, y, z) => N.rock(k, [x, y, z], k.R(.6, 1.3)), 20, taken);
      meadow(k, F, .6, taken); break;
    }
    case 'berg': {
      const taken = [];
      for (let i = 0; i < 7; i++) scatter(k, F, 1, .7, (x, y, z) => N.rock(k, [x, y, z], k.R(.6, 1.4)), 20, taken);
      for (let i = 0; i < 6; i++) { const a = k.R(0, 6.28), d = k.R(INR * .6, INR * .85), x = Math.cos(a) * d, z = Math.sin(a) * d; if (F.free(x, z, .8)) N.pine(k, [x, F.h(x, z) - .1, z], k.R(.7, 1)); }
      if (B.mine && k.rand() < .6) { const a = k.R(0, 6.28), d = INR * .55, x = Math.cos(a) * d, z = Math.sin(a) * d; k.ground = F.h(x, z); bld(k, [x, F.h(x, z), z], -a, () => B.mine(k, { seed })); k.ground = 0; }
      break;
    }
  }
  const out = k.buildLod();
  return { geo: out, parts: k.parts || [], spots: k.spots || [], F, info };
}
