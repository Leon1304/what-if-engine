  ground({ color: '#7FA05A', flat: 400, hills: 0 });
  const TT = (i) => 0.8 + i * 1.25, man = (x, z, o = {}) => { const f = figure({ shirt: '#3D7BD9', pants: '#2E3A5C', ...o }); world.add(f.root); f.root.position.set(x, 0, z); return f; }, zom = (x, z) => man(x, z, { kind: 'zombie' });
  ['bear', 'pit', 'spikes', 'log', 'pendulum', 'net', 'snare', 'mine', 'flame', 'saw', 'boulder', 'darts', 'cage', 'trapdoor', 'laser', 'electric', 'banana', 'rake'].forEach((k, i) => {
    const x = i * 14, t = TT(i), human = ['bear', 'log', 'net', 'snare', 'cage', 'darts', 'electric', 'banana', 'rake', 'flame'].includes(k);
    const vz = k === 'darts' ? 2.5 : 0, v = human ? man(x, vz) : zom(x, vz);
    if (k === 'boulder') trap(world, k, x, 0, { t0: t - 2.2, path: [[x, -16], [x, 14]], victim: v });
    else if (k === 'pendulum') trap(world, k, x, 0, { t0: t - 1.1, t1: t + 3, victim: v, pass: 1 });
    else if (k === 'saw') trap(world, k, x, 0, { t0: t - 0.7, t1: t + 3, victim: v, pass: 1 });
    else if (k === 'laser' || k === 'electric') trap(world, k, x, 0, { t0: 0, t: t, victim: v });
    else trap(world, k, x, 0, { t, victim: v });
  });
  const tx = (i) => i * 14;
  const T1 = turret(world, tx(18), -2, { kind: 'gatling' }); const h1 = horde({ n: 14, from: [tx(18), -22], r: 3, to: [tx(18), -4], t0: 18, t1: 20, speed: [1.0, 1.3] }); turretFire(T1, TT(18) - 0.4, TT(18) + 1.2, { horde: h1 });
  const T2 = turret(world, tx(19), -2, { kind: 'rocket' }); const cr = grp(world, tx(19), 0, -20); box(cr, 1.6, 1.6, 1.6, '#8A6A44'); turretFire(T2, TT(19) - 0.3, TT(19) + 0.6, { at: [tx(19), 0.8, -20] });
  const T3 = turret(world, tx(20), -2, { kind: 'laser' }); const z3 = zom(tx(20), -12); z3.root.rotation.y = 0; turretFire(T3, TT(20) - 0.2, TT(20) + 0.6, { at: z3 });
  const P = press(world, tx(21), 0, { at: [TT(21) - 0.1], victims: [zom(tx(21), 0)] });
  const D = drone(world, { gun: true }); fly(D, [[tx(18) - 6, 6, 6], [tx(18) + 6, 6, 6]], { t0: 22, speed: 3 });
