  // v3.32 beach-city kit: decoHotel (pastel art deco, neon fin, eyebrows, porthole, porch), coldFall (cold-stunned iguana drops from a palm)
  ground({ color: '#7FA25A', flat: 200, hills: 0 });
  decoHotel(world, -8, 0, { color: '#F2B8C6', neon: '#FF4FB0', name: 'CORAL' });
  decoHotel(world, 8, 0, { color: '#A8E0D8', neon: '#4FE0FF', name: 'TIDES', floors: 4, corner: false });
  tree(world, 0.3, 12.9, { kind: 'palm' });
  const ig = lizard(world, { x: 0.3, z: 13.2, scale: 4.2, color: '#4E8E3A' });
  coldFall(ig, 5.5, { from: [0.3, 3.2, 13.2], to: [1.0, 13.8], ry: 0.4 });
