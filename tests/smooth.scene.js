  ground({ color: '#7FA05A', flat: 300, hills: 0 });
  const P = (x, z, o = {}) => { const f = figure({ skin: '#F1C7A5', ...o }); world.add(f.root); f.root.position.set(x, 0, z); f.root.rotation.y = o.ry ?? 0; return f; };
  // 1 a scene tick that flips between two poses and two look targets (jumping jacks): cross-faded by the engine
  const a = P(0, 0, { shirt: '#F2C230', expr: 'happy' }); tick(t => { pose(a, Math.floor(t * 2) % 2 ? 'cheer' : 'idle', 0, t); a.look = t < 2 ? [3, 1.6, 4] : t < 4 ? [-3, 1.6, 4] : 'cam'; });
  // 2 a tick that only poses for a while (in and out of the idle pose), on a walker too
  const b = P(1.6, 0, { shirt: '#3D7BD9' }); tick(t => { if (t > 1.5 && t < 3.5) pose(b, 'panic', 0, t); });
  const c = P(3.2, -3, { shirt: '#D94F3D' }); walk(c, [[3.2, -3], [3.2, 0]], { t0: 0.2, speed: 1.4 }); tick(t => { if (t > 3) pose(c, 'cheer', 0, t); });
  // 3 two walks on one figure: there and straight back (turns round over a few frames), a zombie too fast to shamble (runs)
  const d = P(6, -3, { shirt: '#3DA56A' }); walk(d, [[6, -3], [6, 1]], { t0: 0.3, speed: 1.6 }); walk(d, [[6, 1], [6, -3]], { t0: 3.4, speed: 1.6 });
  const z = P(8, -4, { kind: 'zombie' }); walk(z, [[8, -4], [8, 4], [11, 4]], { t0: 0.5, speed: 2.6, mode: 'shamble' });
  // 4 traffic rounds its corners, a cow gallops round one
  traffic([[[14, -6], [26, -6], [26, 6], [14, 6]]], { per: 2, speed: 8 });
  const cow = beast({ kind: 'cow', x: 12, z: -8 }); walk(cow, [[12, -8], [12, 8], [20, 8]], { t0: 0.5, speed: 4.5, stride: 3.2 });
  // 5 a ragdoll that the scene tick hands over with `if (t >= T) return` starts where the figure stands
  const e = P(0, 0, { shirt: '#8A4AD9' }); tick(t => { if (t >= 6) return; e.root.position.set(-3 + 0.3 * t, 0, 2); }); ragdoll(e, 6, { from: [-4, 0.8, 2], power: 4 });
