  ground({ color: '#9AAE78', flat: 300, hills: 0, dress: false });
  const P = (x, z, o = {}) => { const f = figure({ skin: '#D9A47E', ...o }); world.add(f.root); f.root.position.set(x, 0, z); f.root.rotation.y = o.ry ?? 0; return f; };
  // 1) seated under low things: an old woman on a bench with an ad panel behind her head, a prisoner on a bed under a shelf, a figure lying under a table → none folds
  const bn = stat(grp(world, 0, 0, -0.1)); box(bn, 1.6, 0.06, 0.45, '#8A6A44', 0, 0.42, 0); for (const sx of [-0.7, 0.7]) box(bn, 0.06, 0.42, 0.4, '#3A3A40', sx, 0, 0);
  box(bn, 1.8, 0.9, 0.06, '#2E4A6A', 0, 1.25, -0.32);   // ad panel: underside at head height, behind the head
  const old = P(0, 0.05, { build: 'old', shirt: '#3DA56A', hairStyle: 'bun', seed: 3 }); old.tag = 'old'; noHit(old); sit(old, 0, { seat: [0, 0.48, 0.05], ry: 0 });
  const bed = stat(grp(world, 1.8, 0, 0)); box(bed, 0.9, 0.45, 1.9, '#8A8A90', 0, 0, 0); box(bed, 0.7, 0.06, 0.9, '#5A7AB0', 0, 1.42, -0.2);   // shelf over the bed
  const pr = P(1.8, 0.2, { costume: 'prisoner', seed: 5 }); pr.tag = 'pris'; noHit(pr); sit(pr, 0, { seat: [1.8, 0.45, 0.2], ry: 0 });
  // 2) crawler in a low tunnel (0.95 m, frames at 0.87 m): tips forward over the knees, hands stay on the floor
  smuggleTunnel(world, 7, 0, { len: 6, w: 0.8, h: 0.95, y: 0, lining: 'wood', cut: 'right', bulbs: 0, pipe: false });
  const cr = P(7, -0.6, { shirt: '#5A4A3A', seed: 8 }); cr.tag = 'crawl'; walk(cr, [[7, -0.6], [7, -5]], { t0: 0, speed: 0.55, mode: 'crawl' });
  // 3) arms crossed on every build (idle 'cross') + gesture 'cross'
  ['man', 'woman', 'heavy', 'kid', 'slim', 'muscular', 'old'].forEach((b, i) => { const f = P(12 + i * 0.75, 0, { build: b, shirt: ['#3D7BD9', '#D94F3D', '#3DA56A', '#E3B23C', '#8A4AD9', '#2AA8B8', '#5A6170'][i], seed: 30 + i }); idle(f, 0, 20, 'cross'); if (i === 0) f.tag = 'cross'; });
  // 4) cower, gasp, cover; a kneeling figure (crouch clip)
  ['cower', 'gasp', 'cover'].forEach((k, i) => { const f = P(19.6 + i * 1.0, 0, { shirt: ['#8A4AD9', '#E3B23C', '#2AA8B8'][i], seed: 40 + i }); react(f, 2.0, k, { dur: 2.5 }); if (!i) f.tag = 'cower'; });
  const kn = P(22.6, 0, { shirt: '#6A4A3A', jacket: true, seed: 44 }); anim(kn, [[0, 'Crouch_Idle_Loop']]);
  // 5) props in hands: a coffee sip, the phone clip (idle 'phone'), a rider on a motorbike
  const cf = P(25.4, 0, { shirt: '#C8324A', seed: 50 }); cf.tag = 'drink'; const mug = food(world, 'mug', 25.75, 0.95, 0.35, { color: '#F4F1E8' }); stat(box(world, 0.5, 0.95, 0.4, '#7A5A3A', 25.75, 0, 0.35)); drink(cf, mug, 3.6, { sips: 2, every: 1.2 });
  P(26.6, 0, { shirt: '#E0533D', idle: 'phone', seed: 51 }).tag = 'phone';
  const BK = bike(world, { kind: 'motorcycle', x: 27.6, z: 0, ry: -0.5 }); const rd = P(27.6, 0, { shirt: '#3A6A8A', seed: 52 }); rd.tag = 'rider'; rideBike(rd, BK, { t0: 0, t1: 99 });
  // 6) CPR: hands on the centre of the chest
  const vic = P(32, 0, { shirt: '#F2F2F2', seed: 60 }); fall(vic, -2, { dir: [1, 0], dazed: false }); const res = P(32, 1.2, { shirt: '#D94F3D', seed: 61 }); res.tag = 'cpr'; cpr(res, vic, 0, 20);
  // 7) Gerald turning his head (glasses on the head)
  const ger = gerald({ scale: 1.5 }); world.add(ger.root); ger.root.position.set(38, 0, 0); ger.root.rotation.y = 0.3;
  // 8) taxi driver: legs must not show under the car
  const TX = vehicle(world, 44, 0, { kind: 'taxi', ry: 0 }); const dr = P(45.5, 0, { shirt: '#8A5ACD', seed: 70 }); dr.tag = 'driver'; enter(dr, TX, -2);
  // 9) clothing detail close-up: hem, shoulders on builds; closed eyes; hair the colour of the skin; cap with hair
  [['man', { shirt: '#E8862A', expr: 'sleep' }], ['woman', { shirt: '#3D7BD9', hair: '#D9A47E' }], ['heavy', { shirt: '#3DA56A', hatStyle: 'cap', hat: '#C0392B' }], ['man', { shirt: '#D94F3D', hair: '#DAA57F', skin: '#D9A47E' }]].forEach(([b, x], i) => P(49.5 + i * 0.75, 0, { build: b, seed: 80 + i, ...x }));
  // 10) head turned to a look target far to the side: the head turns at most ~26° against the shoulders
  const lk = P(56, 0, { shirt: '#5A6170', seed: 90 }); lk.tag = 'look'; lk.look = [60, 1.6, 0.5]; sit(P(55.2, 0, { shirt: '#B05A3A', seed: 91, look: [50, 1.2, 1] }), 0, { seat: [55.2, 0.45, 0], ry: 0 });
  stat(box(world, 0.5, 0.45, 0.5, '#6A5A4A', 55.2, 0, -0.12));
