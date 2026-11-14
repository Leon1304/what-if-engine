  // coverage for ship and aircraft actions used in videos: rampDown + board + seatAt (troops leave a landing craft over the ramp),
  // salvo (battleship turrets fire, staggered), paradrop (paratroopers from a cargo plane with the ramp open)
  ground({ coast: 30, beach: 18, flat: 120, color: '#5D7C3A' }); water({ level: -0.3, size: 1400, seg: 140 });
  const L = ship(world, 'landing', 0, 40, { ry: Math.PI }); bob(L.g, { size: 5, depth: 0 }); rampDown(L, 0.3);
  for (let i = 0; i < 4; i++) { const f = figure({ shirt: '#5E6A4E', pants: '#4E5A3E', hat: '#4E5A3E', hatStyle: 'beanie', seed: i + 1 }), tj = 1.2 + i * 0.35, a0 = seatAt(L, i, tj);
    board(L, f, i, { t1: tj }); walk(f, [a0, [(i - 1.5) * 0.5, 33.5], [(i - 1.5) * 1.6, 26]], { t0: tj, speed: 2.6, mode: 'run' }); }
  const B = ship(world, 'battleship', -260, 300, { ry: 0.5 }); bob(B.g, { size: 200, depth: 0 }); salvo(B, 3.6, { at: [-120, 0, 120] });
  const A = aircraft({ kind: 'cargo', x: 0, y: 80, z: 100 }); fly(A, [[0, 80, 100], [0, 80, -700]], { t0: 0, speed: 46 }); A.rampOpen(4.5); paradrop(A, 6.2, 5, { every: 0.4 });
