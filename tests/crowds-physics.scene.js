  ground({ color: '#8FA860', flat: 400, hills: 0 });
  const P = (x, z, o = {}) => { const f = figure({ skin: '#F1C7A5', ...o }); world.add(f.root); f.root.position.set(x, 0, z); f.root.rotation.y = o.ry ?? 0; return f; };
  // crowd on bleachers: La-Ola, cheering, then everyone flees from a threat
  audience(world, 0, 0, { rows: 6, cols: 26, ola: { t0: 0.3, t1: 6, speed: 9 }, cheer: [[6.2, 8.5]], flee: { at: [0, 8], t: 9.3, speed: 5 } });
  // pouring water from a jug
  const pw = P(20, 0, { shirt: '#3D7BD9', expr: 'happy' }), jug = dyn(grp(world, 20, 0, 0)); cyl(jug, 0.08, 0.09, 0.22, '#E8F4FA', 0, -0.11, 0, { opacity: 0.7, seg: 12 });
  holdItem(pw, jug, 0, 20, { rot: [0, 0, 0.9] }); pour(pw, 1, 6, { to: [20.33, 0.55] });
  // water bursting through a doorway, flooding a room
  const wall = stat(grp(world, 32, 0, 0)); box(wall, 0.3, 3, 6, '#C9C2B4', 0, 0, 0); gush([32.2, 0.6, 0], [1, 0.3, 0], 1, 8, { w: 3 }); floodRoom({ x: 38, z: 0, w: 10, d: 6 }, 1.5, 8, { h: 0.9 });
  // swing with a rider, hanging rope between posts
  swingSet(world, 50, 0, { rider: P(50, 0, { shirt: '#E3B23C', expr: 'happy' }), t0: 0.5, amp: 0.8 });
  cyl(world, 0.08, 0.08, 2.4, '#5A3A1E', 54, 0, -2); cyl(world, 0.08, 0.08, 2.4, '#5A3A1E', 54, 0, 2); rope([54, 2.3, -2], [54, 2.3, 2], { sag: 0.5 });
  // rope bridge between two cliffs, someone crossing
  box(world, 6, 3, 6, '#8A7A66', 60, 0, -3.2); box(world, 6, 3, 6, '#8A7A66', 60, 0, 17.2);
  const bw = P(60, 0.3, { shirt: '#D94F3D', expr: 'scared' }); ropeBridge(world, [60, 0], [60, 14], { y: 3, walkers: [bw] }); walk(bw, [[60, 0.3], [60, 13.7]], { t0: 7, speed: 1.2, mode: 'tiptoe' });
  // jello on a table
  const tb = stat(grp(world, 70, 0, 0)); box(tb, 1, 0.78, 0.7, '#8A5A34', 0, 0, 0); jello(world, 70, 0.78, 0, { poke: [10.7, 11.2] });
  // fire spreads along a row of crates
  const cr = [0, 1, 2, 3].map(i => { const g = grp(world, 78 + i * 3, 0, 0); box(g, 1, 1, 1, '#A07A4A', 0, 0, 0); return g; }); spreadFire(cr, 11.6, { speed: 4, dur: 8 });
  // glass pane cracking
  const gp = stat(grp(world, 90, 0, 0)); box(gp, 1.6, 2.4, 0.04, '', 0, 0.3, 0, { mat: mat('#BFE6FF', { opacity: 0.35, rough: 0.05 }) }); box(gp, 1.7, 0.1, 0.1, '#5A5E64', 0, 0.25, 0); box(gp, 1.7, 0.1, 0.1, '#5A5E64', 0, 2.7, 0);
  crackGlass([90.1, 1.6, 0.03], 13.7, { size: 0.55 });
  // vertigo on a hero in a colonnade, crash zoom on another
  P(100, 0, { shirt: '#8E5BD9', expr: 'scared' }); for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) cyl(world, 0.25, 0.25, 4, '#E8E2D4', 100 + sx * 2.5, 0, -2 - i * 4, { seg: 10 });
  vertigo(14.6, 16.4, { amount: 1.2 });
  P(110, 0, { shirt: '#3DA56A', expr: 'surprised' }); crashZoom(16.7, { amount: 0.6 });
  // drone flight over the stadium, handheld shake
  droneShot(17.5, 20, [[-30, 14, 30], [0, 18, 26], [30, 14, 30]], { look: [0, 2, -2] }); shaky(17.5, 20, { amp: 1.5 });
