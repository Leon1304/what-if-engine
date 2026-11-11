  ground({ color: '#7FA05A', flat: 500, hills: 0 });
  // 1 duel
  const you = char('you', { outfit: 'hair' }); world.add(you.root); you.root.position.set(-1.0, 0, 0); you.root.rotation.y = Math.PI / 2;
  const kn = figure({ shirt: '#5A6170', pants: '#3A3D45', hatStyle: 'beanie', hat: '#444444' }); world.add(kn.root); kn.root.position.set(1.0, 0, 0); kn.root.rotation.y = -Math.PI / 2;
  weapon(you, 'sword', { guard: true }); weapon(kn, 'axe', { guard: true }); weapon(kn, 'shield');
  duel(you, kn, { t0: 1.0, n: 4, every: 0.8, finish: 'a' });
  // 2 archer vs zombie
  const ar = figure({ shirt: '#3DA56A', pants: '#5A4632', hatStyle: 'cap', hat: '#2E6B3A' }); world.add(ar.root); ar.root.position.set(40, 0, 0);
  const zb = figure({ kind: 'zombie' }); world.add(zb.root); walk(zb, [[41, 16], [40.5, 4]], { t0: 4.5, speed: 1.0, mode: 'shamble' });
  bow(ar, 6.6, { at: zb, draw: 0.75, hold: 0.3 });
  const zb2 = figure({ kind: 'zombie' }); world.add(zb2.root); zb2.root.position.set(37, 0, 12);
  bow(ar, 8.1, { at: zb2, draw: 0.5, hold: 0.15, fire: true });
  // 3 guns
  const so = figure({ shirt: '#4A5A36', pants: '#3A4228', hatStyle: 'cap', hat: '#3A4A2A' }); world.add(so.root); so.root.position.set(78.5, 0, 0); so.root.rotation.y = Math.PI;
  weapon(so, 'rifle'); const h = horde({ n: 30, from: [80, -30], r: 5, to: [79, 0], t0: 6, t1: 8, speed: [1.2, 1.6] });
  shoot(so, 9.4, { at: h, n: 6, rate: 3 });
  const pg = char('you', { outfit: 'cap' }); world.add(pg.root); pg.root.position.set(81.2, 0, 0.6); pg.root.rotation.y = Math.PI;
  weapon(pg, 'pistol'); const zb3 = figure({ kind: 'zombie' }); world.add(zb3.root); walk(zb3, [[83, -14], [82, -5]], { t0: 8.5, speed: 1.1, mode: 'shamble' });
  shoot(pg, 11.2, { at: zb3, n: 3, rate: 2.5, kill: true });
  grenade(so, 12.4, { to: [80, -16] });
  // 4 tank
  const T = tank(world, 120, -8, {}); drive(T, [[120, -8], [120, 4]], { t0: 13.2, speed: 4 });
  const crates = grp(world, 132, 0, 32); for (let i = 0; i < 3; i++) box(crates, 1.6, 1.6, 1.6, '#8A6A44', 0, i * 1.6, 0);
  aimTurret(T, 14.2, [132, 2, 32], { dur: 1.3 }); cannon(T, 16.3, { at: [132, 1.5, 32], size: 1.6 });
  strafe(T, 17.0, 17.9, { at: [128, 0, 24] });
  // 5 jet
  const J = jet(world, { burner: 0.8 }); fly(J, [[160, 28, -260], [160, 26, 300]], { t0: 17, speed: 75 }); track('jet', J.g, 0);
  missile({ from: J, at: [166, 0, 50], t0: 19.4, speed: 80 }); strafe(J, 20.1, 21.2, { at: [158, 0, 30] }); flares(J, 21.6);
  bomb(J, 21.0); biome('farm', { density: 0.3 });
