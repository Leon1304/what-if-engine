  // v2.34: detailed surroundings — the biome brings clouds, ground texture, hazy mountains and small life on its own; buildings get wall and roof surfaces
  ground({ color: '#5C7A3C', flat: 34, hills: 9 });
  house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6 }); barn(world, -8, -7, { ry: 0.08 }); silo(world, 10.5, -5.5, { h: 8.5 });
  fence(world, [[-14, -12], [14, -12]]); field(world, 1, -29.5, 36, 26, { crop: 'wheat' });
  tower(world, 18, 6, { w: 7, d: 7, h: 13, style: 'brick', ry: -0.3 }); lighthouse(world, -20, -4, {}); pyramid(world, 24, -20, { size: 12 });
  { const g = stat(grp(world, 8, groundH(8, 7), 7, 0.4));   // own building: walls and roof with a surface, flat roof with its kit
    box(g, 5, 3, 4, '#D8CBB4', 0, 0, 0, { surf: 'plaster' }); box(g, 5.2, 0.5, 4.2, '#8A8478', 0, 0, 0, { surf: 'stone' }); box(g, 0.9, 1.9, 0.08, '#4A3220', 0, 0.5, 2.02, { cast: false }); roofKit(g, 5, 4, 3, 4); facadeKit(g, 5, 3, 4, { lamps: [-0.8, 0.8] }); }
  const f = figure({}); world.add(f.root); f.root.position.set(0.5, 0, 1);
  biome('farm');
