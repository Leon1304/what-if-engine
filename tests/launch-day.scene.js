  // v3.30 launch-day kit: blackout() before the city, gameConsole, gameScreen, gamepad, alarmClock, generator
  const B = blackout({ cuts: [{ t: 6.4, from: [-40, -80], speed: 70, flicker: 0.6 }] });
  ground({ color: '#55604A', flat: 300, hills: 0 });
  city({ nx: 3, nz: 2, at: [0, -70], lit: 1 });
  // living room (front open toward +z): gamer on the sofa with a gamepad, TV game screen in front of him, console under it, alarm clock on a side table
  const R = interior(world, 0, 0, { kind: 'living', night: true });
  const [sx, , sz] = R.seat('sofa');
  const f = figure({ shirt: '#3A7AC8', pants: '#2E3240', hairStyle: 'short', expr: 'determined' });
  world.add(f.root); f.root.position.set(sx, 0, sz + 0.3);
  sit(f, -1, { seat: [sx, 0, sz], h: 0.55 }); noHit(f); gamepad(f, { t0: 0.1 }); track('gamer', f, 1.0);
  gameScreen(world, 1.6, 0.9, { t0: 0.2, load: 2, x: 0, y: 1.2, z: 2.6, ry: Math.PI });
  gameConsole(world, 0.9, 0.0, 2.4, { ry: Math.PI, on: 0.1 });
  box(world, 0.45, 0.5, 0.45, '#7A5236', 1.25, 0, -1.7); alarmClock(world, 1.25, 0.5, -1.7, { ring: 0.5, stop: 2.5 });
  // generator in the yard with a cable to the house
  generator(world, 5, 4.5, { on: 3.4, ry: -0.6, cable: [[4, 0.05, 4], [3.6, 0.05, 3.2]] });
