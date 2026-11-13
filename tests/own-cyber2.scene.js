  ground({ color: '#23262B', flat: 200, hills: 0 });
  const bad = m => console.error('own-cyber2: ' + m);
  // crossing in the middle, a street piece on each arm (along z as is, along x turned by π/2)
  const X = asset(world, 'own/cp_road_cross', 0, 0, { tint: { sig_red: '#3A0A0A', sig_green: '#3CFF8A' } });
  for (const z of [-14, 14]) asset(world, 'own/cp_street', 0, z);
  for (const x of [-14, 14]) asset(world, 'own/cp_street', x, 0, { ry: Math.PI / 2 });
  for (const n of ['signal_1', 'signal_2', 'signal_3', 'signal_4', 'bollard_1', 'bollard_8']) if (!X.parts[n]) bad('cross part ' + n);
  for (const n of ['lane_s', 'lane_e', 'lane_n', 'lane_w', 'cross_s', 'cross_e', 'cross_n', 'cross_w', 'vent']) if (!X.at(n)) bad('cross mark ' + n);
  X.lights({ prefix: 'light_signal', max: 2, color: '#3CFF8A', intensity: 6, dist: 6 });
  // station stairs behind the corner (+x, -z), front (+z) to the crossing; a figure climbs them along path_1…4
  const S = asset(world, 'own/cp_stairs', 12.5, -16.5, { walk: true });
  for (const n of ['turnstile_1', 'turnstile_2', 'turnstile_3', 'door', 'sign']) if (!S.parts[n]) bad('stairs part ' + n);
  animate(S.parts.turnstile_2, [[9, { rx: 0 }], [9.6, { rx: 2.1 }]]);
  const top = S.at('top'); DEFER.push(() => { if (!(groundH(top[0], top[2]) > 4.3)) bad('stairs top groundH ' + groundH(top[0], top[2]).toFixed(2)); });
  S.lights({ prefix: 'light_sign', max: 1, color: '#B784FF', intensity: 20, dist: 10 });
  const climber = figure({ shirt: '#3A2F4A', pants: '#1A1C22' }); world.add(climber.root);
  const P = ['path_1', 'path_2', 'path_3', 'path_4', 'gate'].map(n => S.at(n));
  walk(climber, [[9.5, -6.5], ...P.map(p => [p[0], p[2]])], { t0: 0.5, speed: 1.5 });
  // kiosk on the opposite corner, front (+z) to the street; a customer walks up, the clerk stands inside
  const K = asset(world, 'own/cp_kiosk', -12, -11);
  for (const n of ['shutter', 'awning', 'holo', 'rack', 'door', 'stool']) if (!K.parts[n]) bad('kiosk part ' + n);
  animate(K.parts.shutter, [[7.6, { y: 0 }], [8.6, { y: 0.35 }]]);
  K.lights({ prefix: 'light_', max: 2, color: '#FFD9A0', intensity: 12, dist: 7 });
  const c = K.at('customer'), k = K.at('clerk');
  const buyer = figure({ shirt: '#5A2A2A', pants: '#202228' }); world.add(buyer.root);
  walk(buyer, [[c[0] + 3.5, c[2] + 2.5], [c[0], c[2]]], { t0: 6.6, speed: 1.3 });
  const clerk = figure({ shirt: '#E2B11F', pants: '#202228' }); clerk.root.position.set(k[0], k[1], k[2]); clerk.root.rotation.y = K.dir('clerk'); world.add(clerk.root); noHit(clerk);   // inside the hollow booth
