  // collision + QA blind spots (tests/run.sh 'collide-qa'): expected — QA VEHICLE for the helicopter hovering in the house (heli() is checked part by part, also
  // while it hovers), QA CAMCLIP for the lens inside a head (shot 2) and inside a standing crowd (shot 3). Quiet: the high helicopter, the toppling tower (its neighbour
  // stands where it was told to fall: it picks another way), the crowd round the bus (nobody inside it), the taxi passing the parked car (steers round it), the crane load.
  ground({ color: '#7FA05A', flat: 300, hills: 0, dress: false });
  house(world, -20, 0, { w: 6, d: 6 }); heli(world, { kind: 'news', x: -20, y: 3.5, z: 0 });   // wrong: hovering in the house → VEHICLE
  heli(world, { kind: 'police', x: -20, y: 30, z: -25 });   // right: well clear
  const T1 = tower(world, 0, -20, { w: 6, d: 6, h: 30 }); tower(world, 0, -36, { w: 8, d: 8, h: 34 });   // asked to fall onto its neighbour (dir 0, -1)
  collapse(T1, 2, { style: 'topple', dir: [0, -1] });
  vehicle(world, 20, 0, { kind: 'bus', ry: 0 });   // the crowd spawns over the bus: nobody may rise / stand inside it
  horde({ kind: 'zombie', n: 40, from: [20, 0], r: 6, to: [20, 9], stop: 1, pile: 3, t0: 0, t1: 0.5, speed: [0.8, 1.1] });
  const HD = char('Head', { shirt: '#D94F3D' }); world.add(HD.root); HD.root.position.set(40, 0, 0);   // the lens sits in its head (shot 2)
  horde({ kind: 'human', n: 30, from: [61, 1.5], r: 3, to: [61, 1.5], stop: 0, pile: 3, t0: -3, t1: -2, rise: false, speed: [0.3, 0.5] });   // the lens stands in the crowd (shot 3)
  vehicle(world, 80, 2, { kind: 'car', ry: 0, color: '#2E86AB' });   // parked
  const TX = vehicle(world, 80, -14, { kind: 'taxi' }); drive(TX, [[80, -14], [80, 18]], { t0: 5.5, speed: 7 });   // straight through the parked car → steers round it
  const C = crane(world, 70, -20, { h: 20, jib: 15, ry: 0.3 }); C.load('beam', { len: 6 }); C.move(0.5, 6, { yaw: 0.8, hook: 9 });
  LIVE.crane = C; LIVE.taxi = TX;
