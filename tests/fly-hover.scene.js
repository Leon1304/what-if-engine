  ground({ color: '#8E9A7A', flat: 200, hills: 0 });
  const bad = m => console.error('fly-hover: ' + m);
  // helicopter: vertical take-off from the pad, path with rounded corners, a hover window, then a second fly() segment that lands vertically on the second pad
  for (const [x, z] of [[0, 0], [26, 12]]) { cyl(world, 3.2, 3.2, 0.06, '#5A5E66', x, 0, z, { seg: 24 }); box(world, 0.4, 0.02, 3.2, '#E8E2C8', x, 0.06, z); }
  const H = heli(world, { kind: 'rescue', x: 0, z: 0, ry: Math.PI }); track('heli', H, 0); const y0 = H.g.position.y;
  fly(H, [[0, y0, 0], [0, 12, -14], [18, 13, -20], [26, 10, -6]], { t0: 1, speed: 12, takeoff: 2.5, lift: 6, hover: [[6.5, 7.5]] });
  fly(H, [[26, y0, 12]], { delay: 0.3, speed: 9, landing: 2, lift: 4 });
  // a light plane loops over the field: the corners of its square are flown as arcs
  const P = plane(world, { kind: 'prop' }); fly(P, [[-60, 30, -60], [60, 30, -60], [60, 30, 60], [-60, 30, 60]], { loop: true, speed: 30 });
  DEFER.push(() => { const a = H.g._fly(0.5)[0], b = H.g._fly(2.2)[0], c = H.g._fly(6.6)[0], d = H.g._fly(7.4)[0], e = H.g._fly(17.5)[0];
    if (Math.hypot(a[0], a[2]) > 0.01 || Math.abs(a[1] - y0) > 0.01) bad('not on the pad before take-off');
    if (Math.hypot(b[0], b[2]) > 0.05 || !(b[1] > y0 + 1)) bad('take-off not vertical ' + b.map(v => v.toFixed(2)));
    if (Math.hypot(c[0] - d[0], c[2] - d[2]) > 0.02) bad('hover moved ' + Math.hypot(c[0] - d[0], c[2] - d[2]).toFixed(3));
    if (Math.hypot(e[0] - 26, e[2] - 12) > 0.05 || Math.abs(e[1] - y0) > 0.05) bad('did not land on the second pad ' + e.map(v => v.toFixed(2))); });
  for (const [x, z, k] of [[-14, -20, 'pine'], [12, 14, 'round'], [36, -24, 'pine'], [-10, 12, 'birch']]) tree(world, x, z, { kind: k });
