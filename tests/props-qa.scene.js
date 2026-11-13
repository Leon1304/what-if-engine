  // v3.24 prop QA (render.mjs --audit → QA: FLOAT / BURIED). Expected: one FLOAT line (the crate) and two BURIED lines (car, taxi) — the rest is correct or opted out.
  ground({ color: '#7FA05A', flat: 300, hills: 0, dress: false });
  // correct: goal on the grass, a crate on a table, a lamp hanging from a beam on a cord
  goal(world, -4, -3, { ry: 0.3 }); FURN.table(world, 0, 0); stat(box(world, 0.4, 0.3, 0.4, '#8A6A44', 0, 0.79, 0));
  const gal = stat(grp(world, 3, 0, 0)); for (const s of [-1, 1]) box(gal, 0.12, 2.6, 0.12, '#5A4A3A', s * 0.9, 0, 0); box(gal, 2, 0.12, 0.12, '#5A4A3A', 0, 2.6, 0);
  cyl(gal, 0.01, 0.01, 0.6, '#222222', 0, 2.0, 0); ball(gal, 0.12, '#FFE9A8', 0, 1.95, 0);
  // wrong: a crate 0.6 m above the ground → QA: FLOAT
  stat(box(world, 0.8, 0.8, 0.8, '#9A7A54', -1.5, 0.6, 2.5));
  // meant to float: a hologram cube with { float: true } → no line
  stat(box(world, 0.5, 0.5, 0.5, '#4AC8F0', 1.5, 1.4, 2.5, { float: true }));
  // wrong: a parked car 0.4 m in the ground → QA: BURIED
  vehicle(world, 8, 0, { ry: 0.4 }).g.position.y = -0.4;
  // meant to sink: a wreck in the mud with { buried: true } → no line
  vehicle(world, 12, -3, { kind: 'pickup', buried: true }).g.position.y = -0.5;
  // auto-fix: KayKit city cars (wheels 0.28 m below the model's origin) stand on the ground when y is left out → no line
  asset(world, 'city/car_sedan', 12, 3, { ry: -0.3 });
  // wrong: an asset model given y below the ground → QA: BURIED
  asset(world, 'cars/taxi', 16, 0, { y: -0.45, ry: 1.2 });
