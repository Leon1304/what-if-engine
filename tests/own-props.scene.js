  ground({ color: '#C2A47A', flat: 200, hills: 0 });
  // own Blender props (full detail, baked AO), one per topic; added here one by one
  // sarcophagus: stone box faces +z, long axis along x, lid leaning at the back, golden coffin inside (head at +x)
  asset(world, 'own/sarcophagus', 0, 0);
  asset(world, 'own/sarcophagus', 9, -6, { ry: -0.5, tint: { stone: '#8E8A84', stone_light: '#A8A49C', gold: '#B8B4AC' } });
  // space telescope: aperture looks to +z, wings along x; here lifted off the ground and tilted like it is tumbling down
  const tel = asset(world, 'own/space_telescope', -14, -8, { y: 6, dyn: true }); tel.rotation.set(0.35, 0.6, 0.25);
  // WW1 trench section: floor at y = 0, banks 2.2 m high, enemy side (parapet, wire) towards +z; second section end to end
  asset(world, 'own/trench', 0, 22); asset(world, 'own/trench', 12, 22);
  // Santa's sleigh: front (shafts) towards +z; one on the ground in snow colours, one flying (lifted, nose up)
  asset(world, 'own/sleigh', -6, 6, { ry: 0.6 });
  const sl = asset(world, 'own/sleigh', -12, 2, { y: 4, dyn: true }); sl.rotation.set(-0.2, -0.4, 0.1);
  // snow globe: real size is 19 cm, scaled up 20× here (3 m glass) to see the village inside
  asset(world, 'own/snow_globe', 6, 10, { scale: 20 });
  // decorated Christmas tree with presents (front with the gift pile towards +z)
  asset(world, 'own/xmas_tree', 10, 4);
  // Mars base (airlock towards +z), far out on its own patch
  asset(world, 'own/mars_habitat', -40, 40);
  // Thanksgiving table with chairs (long side along x, front towards +z)
  asset(world, 'own/feast_table', 16, 14);
