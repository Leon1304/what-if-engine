  ground({ color: '#9AAE78', flat: 400, hills: 0 });
  const bad = m => console.error('motion-fix: ' + m);
  // 1) interior sofa: R.seat gives the floor point under the cushion (+ .h = seat height) → feet on the floor, hips on the cushion; stands up and walks off
  const R = interior(world, -30, 0, { kind: 'living' });
  const S = R.seat('sofa', 0); if (!(S.h > 0.4) || Math.abs(S[1]) > 0.05) bad('R.seat: floor point + h expected, got y ' + S[1] + ' h ' + S.h);
  const g = figure({ seed: 3, shirt: '#8A4A6A' }); world.add(g.root); g.root.position.set(S[0], 0, S[2] + 0.4); g.who = 'sofa';
  sit(g, -1, { seat: S, t1: 1.2 }); walk(g, [[S[0], S[2] + 0.45], [S[0] - 1.6, S[2] + 1.0]], { t0: 1.5, speed: 1.2 });
  // 2) chained walks with hard turns (turn on the spot), and a walk that keeps its built facing until it sets off
  const mk = (x, z, seed, o = {}) => { const f = figure({ seed, ...o }); world.add(f.root); f.root.position.set(x, 0, z); return f; };
  { const f = mk(10, 6, 30); walk(f, [[10, 6], [10, 1]], { t0: 0.5, speed: 1.4 }); walk(f, [[10, 1], [15, 1]], { t0: 4.2, speed: 1.4 }); f.who = 'turn90'; }
  { const f = mk(12, 6, 31); walk(f, [[12, 6], [12, 1]], { t0: 0.5, speed: 1.4 }); walk(f, [[12, 1], [12, 6]], { t0: 4.2, speed: 1.4 }); f.who = 'turn180'; }
  { const f = mk(16, 4, 32); f.root.rotation.y = -Math.PI / 2; walk(f, [[16, 4], [16, -2]], { t0: 4.6, speed: 1.3 }); f.who = 'facing';
    DEFER.push(() => { const y = f._yawAt(3); if (Math.abs(Math.atan2(Math.sin(y + Math.PI / 2), Math.cos(y + Math.PI / 2))) > 0.05) bad('built facing lost before t0: ' + y.toFixed(2)); }); }
  // 3) gaits: walk, jog, sprint (procedural and mocap)
  [[1.4, 'walk'], [2.2, 'run'], [3.5, 'run'], [6.5, 'run']].forEach(([v, m], k) => { const x = k * 1.6; const f = mk(x, 0, 40 + k); walk(f, [[x, 0], [x, -70]], { t0: 6.5, speed: v, mode: m }); f.who = 'gait' + v; });
  // 4) chained drive with a 90° change of direction: the second segment sets off on an arc
  const car = vehicle(world, 40, 0, { kind: 'car' }); drive(car, [[40, 0], [40, -16]], { t0: 9, speed: 8 }); drive(car, [[40, -16], [56, -16]], { speed: 8 });
  // 5) jostling crowd: weight shifts with planted feet and the odd small step; enter() into a car
  const spots = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) spots.push([64 + i * 0.9, -1 + j * 0.9, 0.3 * (i - 1.5)]);
  horde({ kind: 'human', spots, jostle: 0.55, mode: 'walk' });
  const V = vehicle(world, 71, 0, { kind: 'car' }); const d = mk(72.6, 1.5, 50, { shirt: '#2E4A7A' }); d.who = 'driver';
  walk(d, [[72.6, 1.5], [72.2, 0.2]], { t0: 12.6, speed: 1.2 }); enter(d, V, 13.8, { dur: 1.1 });
  // checks on the planned paths (pure functions of t): no crab walk on the turns, no side slip of the car on its corner
  DEFER.push(() => { for (const f of RIGS.filter(r => /turn|facing|sofa/.test(r.who ?? ''))) for (let t = 0; t < 12; t += 0.05) { const a = f._posAt(t - 0.03), b = f._posAt(t + 0.03), vx = (b.x - a.x) / 0.06, vz = (b.z - a.z) / 0.06, sp = Math.hypot(vx, vz), y = f._yawAt(t);
      if (sp > 0.3 && (vx * Math.sin(y) + vz * Math.cos(y)) / sp < 0.5) { bad(`${f.who} walks ${Math.round(Math.acos((vx * Math.sin(y) + vz * Math.cos(y)) / sp) * 57.3)}° off its facing at ${t.toFixed(2)} s`); break; } }
    for (let t = 9; t < 15; t += 0.05) { const a = car._posAt(t - 0.03), b = car._posAt(t + 0.03), vx = (b.x - a.x) / 0.06, vz = (b.z - a.z) / 0.06, sp = Math.hypot(vx, vz), y = car._yawAt(t);
      if (sp > 1 && Math.abs(vx * Math.cos(y) - vz * Math.sin(y)) / sp > 0.25) { bad(`car slides sideways at ${t.toFixed(2)} s`); break; } } });
