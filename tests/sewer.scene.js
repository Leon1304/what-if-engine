  ground({ color: '#5A4A3A', sand: '#4A3E30', flat: 160, hills: 0, coast: 16, dress: false });
  water({ level: t => -0.6 + 0.04 * t, waves: 0.15, color: '#5A6A5A' });
  // the sewer: mouth in the river wall at z = 0, runs to −z; the tide rises from 4 s
  const S = sewer(world, 0, 0, { len: 30, level: t => 0.1 + 0.9 * span(t, 5.5, 3.5, 'inOut'), branches: [{ u: 7, side: 1, y: 0.8 }], grates: [{ u: 15, r: 0.45, open: 6.0 }], crumble: [{ u: 10, side: -1, t: 2 }] });
  for (const [x, w] of [[-14, 11], [0, 12], [14, 10]]) warehouse(world, x, -8, { y: 5.5, w, d: 9, h: 11 + (x === 0 ? 2 : 0), seed: x + 20 });
  backdrop('victorian');
  const you = char('you', { outfit: 'tosher', expr: 'calm' }); world.add(you.root); you.root.position.set(0, 0, -13); you.root.rotation.y = Math.PI * 0.95;
  walk(you, [[0, -13], [0, -11.4], [0, -15.04]], { t0: 0.3, speed: 1.2 });
  climb(you, { ...S.grates[0].climb, ladder: false, t0: 6.3 });
  const P = tosherPole(world, 0, 1, -12); holdItem(you, P, -1, 1e9, { side: 'R', rot: [0.15, 0, 0], reach: false });
  coin(world, 0.25, 0.11, -11.2, { kind: 'penny', rx: 0.3 }); coin(world, -0.3, 0.12, -11.6, { kind: 'shilling', rx: -0.2 });
  // rats run along the left wall toward the camera of shot 3
  rats({ n: 16, path: [[-0.5, -16], [-0.48, -8], [-0.45, -6.2]], t0: 0.2, t1: 1.6, speed: [2.4, 3.4], lane: 0.07, y: (x, z) => S.yAt(x, z) });
  dress('foreshore', { area: [-14, 2, 14, 15] });
