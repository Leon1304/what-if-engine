  ground({ color: '#9AAE78', flat: 200, hills: 0 });
  // v3.24 adaptive motion blur: the sprinter passes 2.5 m in front of the lens (many samples, shorter shutter), the car crosses the wide shot (a few more samples);
  // shots do not blur (export only) — the audit plans every frame like the export does (mbPlan) and reports what stays too coarse as QA: GHOST
  asset(world, 'own/jlm_house', -10, -16, { ry: 0 });
  const r = figure({ seed: 5, shirt: '#C0392B' }); world.add(r.root); r.root.position.set(-14, 0, 4.5);
  walk(r, [[-14, 4.5], [14, 4.5]], { t0: 1.2, speed: 7, mode: 'run' });
  const car = asset(world, 'own/car_hatch', -40, -3, { dyn: true, ry: Math.PI / 2 });
  drive(car, [[-40, -3], [40, -3]], { t0: 5, speed: 14 });
