  ground({ color: '#8FA860', flat: 200, hills: 0 });
  // v3.26 figure moves: fall + get up (knees buckle, own get-up; mocap back falls: LayToIdle), sit with Sitting_Enter / _Exit (static and moving seat),
  // jump (Jump_Start / _Land), hit (Hit_Chest), idleMix, clutch, cpr, walk mode 'swim', flock — plus the argument order of react / gesture / idle / faceFx / hands / b.do
  const P = (x, z, o = {}) => { const f = figure({ seed: Math.round(x * 7 + z * 13 + 50), ...o }); world.add(f.root); f.root.position.set(x, 0, z); if (o.ry != null) f.root.rotation.y = o.ry; return f; };
  // falls: own legs (mocap: false) · mocap back fall (LayToIdle) · mocap front fall (procedural get-up) · walker that falls sideways and walks on
  const a = P(-5, 0, { shirt: '#3D7BD9', mocap: false }); fall(a, 0.6, { dir: 'back', getUp: 2.4 });
  const b = P(-3.4, 0, { shirt: '#D94F3D' }); fall(b, 0.7, { dir: 'back', getUp: 2.5 });
  const c = P(-1.8, 0, { shirt: '#3DA56A' }); fall(c, 0.8, { dir: 'front', getUp: 2.6 });
  const rg = P(-6.6, -0.6, { shirt: '#6A4A9A' }); ragdoll(rg, 0.7, { from: [-6.6, 1.1, 0.6], power: 4, getUp: 2.3 });   // physics, then up through a squat
  const w = figure({ shirt: '#E3B23C' }); world.add(w.root); walk(w, [[-7, -3.8], [1, -3.8]], { t0: 0, speed: 1.2 }); fall(w, 2.2, { from: [-4, 0, -5.8], getUp: 3.8 });
  // sitting: bench (mocap clips Sitting_Enter / _Exit), the same with own poses, and a seat that moves (read at t every frame)
  bench(world, 1.6, -0.4); const s1 = P(1.25, 0.05, { shirt: '#8A4AD9' }); sit(s1, 1.2, { seat: { g: world.children[world.children.length - 1] }, t1: 7.5 });
  const s2 = P(2.3, 0, { shirt: '#2AA8B8', mocap: false }); sit(s2, 1.4, { seat: [2.3, 0, -0.32], t1: 7.8 });
  const cart = dyn(grp(world, 4.6, 0, 0)); box(cart, 0.8, 0.45, 0.6, '#7A5A3A', 0, 0, 0); tick(t => { cart.position.x = 4.6 + 0.9 * Math.sin(t * 0.6); });
  const s3 = P(4.6, 0.45, { shirt: '#C8563E' }); sit(s3, 0.4, { seat: { g: cart } });
  // jumps (mocap and own), a hit on the chest, a slip with a get-up
  const j1 = P(-5, 9, { shirt: '#5A6170' }); jump(j1, 6.6, { h: 0.5 }); react(j1, 8.1, 'hit');
  const j2 = P(-3.4, 9, { shirt: '#B85A2A', mocap: false }); jump(j2, 6.9, { h: 0.5 }); react(j2, 'hit', 8.3);
  // idle actions, first aid (clutch → collapse → cpr), argument order both ways (v3.26)
  const im = P(-1.6, 9, { shirt: '#4A7A9A' }); idleMix(im, 0, 12); gesture(im, 'thumbsup', 9);
  const cl = P(0.2, 9, { shirt: '#9A3A3A' }); clutch(cl, 5.4, 7.0); fall(cl, 7.0, { dir: 'back', dazed: false }); faceFx(cl, 5.4, 'sweat', 7.0);
  const hp = P(1.6, 10.2, { shirt: '#3A6A3A' }); cpr(hp, cl, 7.8, 12); idle(hp, 'watch', 0, 4); hands(hp, 0, 3, 'fist');
  // swimming in a pool (walk mode 'swim') and a flock of birds overhead
  const pool = swimPool(world, 5, -9, { w: 4, d: 8, h: 1.2 }); const sw = figure({ shirt: '#E05050' }); world.add(sw.root);
  walk(sw, [[4.6, -12], [4.6, -6]], { t0: 0, speed: 0.45, mode: 'swim', y: pool.level(0) - 1.0 });
  flock({ at: [0, 18, -10], r: 9, n: 14, kind: 'crow' });
  const dg = beast({ kind: 'dog', x: -6.8, z: 9.3, ry: 0.5 }); dg.do('sit', 2, { dur: 2 }); dg.do(5, 'wag', { dur: 2 });
