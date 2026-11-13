  ground({ color: '#23262B', flat: 200, hills: 0 });
  const bad = m => console.error('own-cyber: ' + m);
  // street: three 12 m pieces along z (same grid as own/jlm_road), sidewalk top y = 0.15
  for (const z of [-12, 0, 12]) asset(world, 'own/cp_street', 0, z);
  // tower on the right, front (+z) turned towards the street (-x); roof is a walk surface
  const T = asset(world, 'own/cp_tower', 16, -2, { ry: -Math.PI / 2, walk: true });
  if (!T.parts.shutter || T.marks.length !== 8) bad('tower parts/marks ' + T.marks.length);
  animate(T.parts.shutter, [[9.5, { y: 0 }], [11.5, { y: 1.3 }]]);
  const roof = T.at('roof'); DEFER.push(() => { if (!(groundH(roof[0], roof[2]) > 30)) bad('tower roof groundH ' + groundH(roof[0], roof[2]).toFixed(2)); });
  T.lights({ prefix: 'light_s', max: 2, color: '#FF4FA3', intensity: 30, dist: 14 });
  // vending machine on the left sidewalk facing the street, a figure walks up to it; ramen stall behind the sidewalk
  const V = asset(world, 'own/cp_vending', -6.9, 2, { y: 0.15, ry: Math.PI / 2 });
  if (!V.parts.flap || V.marks.length !== 3) bad('vending parts/marks');
  animate(V.parts.flap, [[4.6, { rx: 0 }], [4.9, { rx: 0.9 }], [5.6, { rx: 0 }]]);
  const buyer = figure({ shirt: '#2A2F3A', pants: '#1A1C22' }); world.add(buyer.root);
  const f = V.at('front'); walk(buyer, [[f[0] + 3, f[2] + 1.5], [f[0], f[2]]], { t0: 2.6, speed: 1.4 });
  const S = asset(world, 'own/cp_ramen_stall', -12.5, -2, { ry: Math.PI / 2 });
  if (S.marks.filter(n => n.startsWith('seat_')).length !== 4) bad('stall seats');
  S.lights({ prefix: 'light_lan', max: 1, color: '#FF5A3A', intensity: 20, dist: 8 });
  // flying taxi above the left lane: fans spin, doors swing up, it drifts forward
  const C = asset(world, 'own/cp_hovercar', -1.75, 0, { y: 3.4, dyn: true });
  for (const n of ['fan_fl', 'fan_fr', 'fan_rl', 'fan_rr']) { if (!C.parts[n]) bad('car part ' + n); else animate(C.parts[n], [[0, { ry: 0 }], [15, { ry: (n.endsWith('l') ? 1 : -1) * 90 }]], { e: 'lin' }); }
  animate(C.parts.door_l, [[12.5, { rz: 0 }], [13.6, { rz: -1.1 }]]);
  animate(C, [[0, { z: 0, y: 0 }], [12, { z: 0, y: 0.2 }], [15, { z: 2.5, y: 0.3 }]]);
