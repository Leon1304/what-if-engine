  // v2.36: things break the way they are built — crumble (house), breakApart (barn), pancake and topple (towers, silo), car crash with damage, a wall, explode({ breaks })
  ground({ color: '#5C7A3C', flat: 300, hills: 0 });
  const H = house(world, -8, 0, { w: 5.2, d: 4, h: 2.9, ry: 0.3 }), B = barn(world, 6, -2, { ry: -0.2 });
  fence(world, [[-14, 6], [12, 6]]);
  collapse(H, 0.8); breakApart(B, 1.8, { power: 6 });
  const T1 = tower(world, 18, -8, { w: 8, d: 8, h: 24, style: 'brick' }), T2 = tower(world, 34, -8, { w: 7, d: 7, h: 20, style: 'glass' }), S = silo(world, 26, 4, { h: 9 });
  collapse(T1, 3.3); collapse(T2, 3.5, { style: 'topple', dir: [0.4, 1] }); collapse(S, 3.4, { style: 'topple', dir: [-1, 0.5] });
  road(world, [[40, 12], [80, 12]], { w: 6 });
  const car = vehicle(world, 46, 12, { kind: 'car', ry: Math.PI / 2 }); drive(car, [[46, 12], [58, 12], [72, 12]], { speed: 12, t0: 5 });
  let tc = 5; while (car._posAt(tc).x < 57.4 && tc < 8) tc += 0.02;   // the moment the car reaches the wall
  const wall = stat(grp(world, 60, 0, 12)); box(wall, 0.4, 2.2, 5, '#A8583E', 0, 0, 0, { surf: 'brick' });
  crash(car, tc, { impulse: [1, 3.5, 1.5], fire: 1.2 }); breakApart(wall, tc + 0.05, { dir: [1, 0.2, 0], power: 6 });
  const van = vehicle(world, 64, 5, { kind: 'van', ry: 0.5 }); wreck(van, 6.4, { side: 'front' });
  const cr = stat(grp(world, 54, 0, 6)); box(cr, 1, 1, 1, '#8C6A48', 0, 0, 0, { surf: 'plank' }); box(cr, 1, 1, 1, '#9C7A58', 0.2, 1, 0, { surf: 'plank' });
  explode(55, 0.5, 7.2, 7.6, { breaks: [cr] });
