  ground({ color: '#7FA05A', flat: 500, hills: 0 });
  // 1 zombie loses its right arm (hit from the right), later its left leg (falls)
  const z1 = figure({ kind: 'zombie' }); world.add(z1.root); walk(z1, [[0, -6], [0, 2]], { t0: 0, speed: 0.9, mode: 'shamble' });
  dismember(z1, 'armR', 2.0, { from: [3, 1.3, -4] });
  dismember(z1, 'legL', 5.0);
  dismember(z1, 'armR', 5.5);   // second time: ignored
  dismember(z1, 'random', 6.0, { fluid: 'oil' });
  // 2 a person only gets a cartoon hit (drops, stars, plaster) — also when dismember is asked for
  const p = figure({ shirt: '#3D7BD9', pants: '#2E3A5C', hairStyle: 'short' }); world.add(p.root); p.root.position.set(-3, 0, 0); p.root.rotation.y = 0.4;
  ouch(p, 3.0);
  dismember(p, 'armL', 4.2);   // → warning + ouch
  // 3 crowd: forearm and lower leg
  const h = horde({ n: 8, from: [-1, -16], r: 2.5, to: [-1, -7], t0: 0, t1: 0.8, speed: [1.0, 1.3] });
  h.lose(0, 'armL', 3.5, { from: [2, 1, -6] }); h.lose(1, 'legR', 4.0); dismember({ h, i: 2 }, 'head', 4.4);   // head → arm + warning
  // 4 sword with sever, blood burst, 'off'-style fluid override
  const you = char('you', { outfit: 'hair' }); world.add(you.root); you.root.position.set(2.4, 0, 0); you.root.rotation.y = Math.PI / 2;
  weapon(you, 'sword'); const z2 = figure({ kind: 'zombie' }); world.add(z2.root); z2.root.position.set(3.6, 0, 0); z2.root.rotation.y = -Math.PI / 2;
  swing(you, 6.4, { at: z2, sever: 'foreR' });
  bleed(z2, 7.6, { n: 8 });
  biome('farm', { density: 0.3, keep: [[0, -4, 9], [3, 0, 4]] });
