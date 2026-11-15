{
  ground({ color: '#9A8C6A', flat: 120 });
  const a = figure({ shirt: '#2E86C1', pants: '#2C3E50', expr: 'scared' }); world.add(a.root); a.root.rotation.y = Math.PI; track('a', a);
  const b = figure({ shirt: '#C0392B', pants: '#3A3A3A', expr: 'surprised' }); world.add(b.root); b.root.position.set(0, 0, -6); track('b', b);
  tick(t => { pose(a, 'idle', t, t); pose(b, 'idle', t, t); a.look = t < 3 ? [0, 18, -30] : 'b'; b.look = t < 5 ? 'cam' : [0, 2, -30]; });
  for (const [x, z, h] of [[-14, -34, 22], [12, -38, 30], [-4, -46, 18]]) box(world, 8, h, 8, '#8A8F98', x, 0, z);
  explode(0, 0, -30, 6.0, { size: 2.5 });
  biome('plain', { keep: [[0, -15, 26]] });
}
