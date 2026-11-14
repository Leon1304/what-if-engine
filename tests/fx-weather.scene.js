  // v3.26 weather: rain round the camera (wrapped field, streaks lean with the wind), branched lightning with its flash light, fogBank, lensRain, a lamp's lightPool;
  // a sandstorm wall rolls in; hail; a tsunami wave rises out of the sea, curls and breaks
  ground({ color: '#5C7A3C', flat: 70, hills: 0, coast: 20 });
  water({ level: 0, waves: 0.3 });
  house(world, -8, -6, { w: 5, d: 4, h: 3, ry: 0.3 }); house(world, 7, -9, { w: 4.5, d: 4, h: 2.8, ry: -0.2 });
  const f = figure({ shirt: '#D94F3D' }); world.add(f.root); f.root.position.set(0, 0, -6);
  lamp(world, 3, -4, { light: false });
  // shot 1: storm
  emit('rain', { t0: 0, t1: 3.2, wind: [3, 0.5] });
  lightning(0.95, { x: -14, z: -40, h: 45 }); lightning(2.3, { x: 18, z: -48, h: 50, branches: 4 });
  fogBank({ at: [0, -24], r: 22, n: 30, density: 0.3 }); lensRain(0, 3);
  // shot 2: sandstorm from the east (+x)
  sandstorm({ t0: 3, t1: 5.6, from: [1, 0], speed: 10, r: 24 });
  // shot 3: hail on the beach, a tsunami coming in
  emit('hail', { t0: 6, t1: 9, rate: 200 });
  tsunami({ from: [0, 120], to: [0, 30], t0: 5.8, t1: 9.4, h: 12, w: 120 });
