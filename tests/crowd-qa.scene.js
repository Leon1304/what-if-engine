  ground({ color: '#8FA07E', flat: 300, hills: 0 });
  // in front of the lens: 70 zombies on a goal 1.2 m wide (simulation off: the planned paths overlap)
  horde({ n: 70, heroes: 2, from: [0, -14], r: 4, to: [0, 0], stop: 0, pile: 1.2, t0: -4, t1: -2, speed: [1.0, 1.3], behave: false, trips: 0, sim: false });
  // behind the camera: the same cram, never on screen
  horde({ n: 70, from: [0, 44], r: 4, to: [0, 30], stop: 0, pile: 1.2, t0: -4, t1: -2, speed: [1.0, 1.3], behave: false, trips: 0, sim: false });
