  // v3.29: aircraft({ kind: 'trijet' }) parked with A.stairOpen, flying with o.lit + airstairRider + paradrop({ rigs, from }), planeCabin() fwd/aft, briefcase / cigarette / necktie / paperNote / money bag + packet
  stat(box(world, 300, 0.05, 300, '#3A3C40', 0, -0.05, 0));
  const P = aircraft({ kind: 'trijet', x: 0, z: 0, ry: 0 }); P.stairOpen(-3);
  const J = aircraft({ kind: 'trijet', x: 600, y: 320, z: 400, lit: true }); fly(J, [[600, 320, 400], [600, 320, -1400]], { t0: 0, speed: 70 }); J.stairOpen(-3); track('jet', J.g, 0); track('stair', J.stair, 0);
  const man = figure({ costume: 'suit', seed: 4, backpack: '#4A5236' }); airstairRider(J, man, { k: 0.75, t0: -1, t1: 3.6 });
  const jumper = figure({ costume: 'suit', seed: 4, backpack: '#4A5236' }); track('jumper', jumper); paradrop(J, 3.6, 1, { rigs: [jumper], from: tt => J.stairPt(0.95, tt), topen: 2.0, chute: '#E8E2D0', carry: 0.7 });
  const C = planeCabin(world, -400, 0, { rows: [12, 18], light: 1, outside: t => '#A8B4BE', reading: [[18, 'E']], tray: [[18, 'E']], aftDoor: 7.3, stairOpen: 7.8, shades: 0.3 });
  const ppl = [['F', 'you'], ['E', 'suit'], ['A', null], ['C', null]].map(([l, cs], i) => { const f = cs === 'you' ? char('you', {}) : figure(cs ? { costume: cs, seed: 4 } : { seed: 11 + i }); board(C, f, C.seat(i < 2 ? 18 : 16, l), { h: 0.44 }); return f; });
  const st = figure({ costume: 'stewardess', seed: 9 }); board(C, st, C.jumpSeat, { h: 0.44 });
  const T = stat(grp(world, -800, 0, 0)); box(T, 1.4, 0.8, 0.8, '#6A4A34', 0, 0, 0);
  briefcase(T, -0.3, 0.8, 0.05, { contents: 'bomb', open: 9.2 }); cigarette(T, 0.12, 0.81, 0.15, { lit: 0, ry: 0.4 }); necktie(T, 0.3, 0.8, 0.05, { ry: 0.3 });
  paperNote(T, 'MISS —\nI HAVE A BOMB\nIN MY BRIEFCASE', { w: 0.14, x: 0.1, y: 0.802, z: -0.1, rx: -Math.PI / 2 });
  money(T, 'bag', 0.5, 0.8, -0.2); money(T, 'packet', 0.2, 0.8, -0.25, { rot: 0.7 }); money(T, 'packet', 0.05, 0.8, 0.28, { ry: 0.5 });
