  ground({ color: '#BFAE86', flat: 400, hills: 0 });
  // wall along z = 0, its outside (the attackers' side) facing +z: barrier segments in 12 m slots, towers in 6 m slots, all at ry 0
    // (names written out in full: assemble.py embeds only 'pack/name' strings it finds literally in the code)
  const B = 'own/wall_barrier', T = 'own/wall_tower', seq = [B, B, B, T, B, B, B, T, B, B, B];
  let cur = -seq.reduce((s, n) => s + (n === T ? 6 : 12), 0) / 2;
  for (const n of seq) { const w = n === T ? 6 : 12; asset(world, n, cur + w / 2, 0); cur += w; }
  // the city behind it (-z): houses, courtyard houses, blocks on a loose grid, the golden dome at the back
  asset(world, 'own/jlm_golden_dome', 0, -92);
  const kinds = ['own/jlm_house', 'own/jlm_house', 'own/jlm_courtyard', 'own/jlm_block'];
  let k = 0;
  for (let gx = -3; gx <= 3; gx++) for (let gy = 0; gy < 4; gy++) {
    const x = gx * 19, z = -16 - gy * 17;
    if (Math.hypot(x, z + 92) < 36) continue;
    asset(world, kinds[(k * 7 + gx + 3) % 4], x, z, { ry: (k++ % 4) * Math.PI / 2 });
  }
  asset(world, 'nature/commontree_1', -20, 14); asset(world, 'nature/rock_2', 9, 18);
