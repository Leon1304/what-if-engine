  // v3.2 light & post: buildings, trees and a figure under day, golden and night skies — rim light, god rays, height fog, dust, far shadows, softer auto DOF
  ground({ color: '#5C7A3C', flat: 60, hills: 6 });
  house(world, -7, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6 }); barn(world, -9, -8, { ry: 0.08 }); silo(world, 11, -6, { h: 8.5 });
  tower(world, 20, 8, { w: 7, d: 7, h: 16, style: 'brick', ry: -0.3 }); tower(world, -24, 18, { w: 6, d: 8, h: 22, style: 'glass', ry: 0.4 }); tower(world, 30, -26, { w: 8, d: 6, h: 12, style: 'brick' });
  for (const [x, z, k] of [[4, -4, 'round'], [-3, -12, 'pine'], [14, 12, 'round'], [-16, 2, 'birch'], [36, 10, 'pine'], [-38, -20, 'round'], [26, 30, 'pine'], [-30, 34, 'round']]) tree(world, x, z, { kind: k });
  streetlight(world, 2.5, 3.5, 0); lamp(world, -4, 1.5, { light: true });
  const f = figure({ shirt: '#D94F3D' }); world.add(f.root); f.root.position.set(0.5, 0, 1); track('hero', f);
  tick(t => { pose(f, 'idle', t, t); });
  biome('farm');
