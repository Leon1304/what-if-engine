  ground({ color: '#6E6A5E', flat: 200, hills: 0 });
  // v3.47: a lane of Roman townhouses (sealed doors, shutters swing shut at 4 s), an arch, a ringing belltower, the plague doctor costume, the three herbs() kinds
  const A = alley(world, 0, -24, { len: 36, w: 4.4, seed: 3, sealed: 0.35, shut: 4, arch: -0.2 });
  const T = belltower(world, 6, -52, { h: 22, ring: [[3, 9]] });
  const you = char('you', { outfit: 'plaguedoctor', herbs: true, expr: 'calm' }); world.add(you.root); you.root.position.set(0, 0, 0);
  walk(you, [[0, 0], [0, -4]], { t0: 1.5, speed: 1.1 });
  const pd = figure({ costume: 'plaguedoctor', seed: 5 }); world.add(pd.root); pd.root.position.set(4.6, 0, -0.9);
  const D = stat(grp(world, 3.0, 0, 1.6)); box(D, 1.4, 2.4, 0.1, '#4A3020', 0, 0, -0.05); doorMark(D, 0, 0, 0.0, { paint: 1.0, nail: 2.0 });
  stat(box(world, 1.6, 0.9, 0.7, '#6A4A2E', 4.7, 0, 0.45));
  herbs(world, 5.2, 0.9, 0.35, { kind: 'bundle', rz: 1.3 }); herbs(world, 4.2, 0.9, 0.35, { kind: 'bowl', smoke: 0.5 }); herbs(world, 4.7, 0.9, 0.55, { kind: 'pouch' });
  glow(1.0, 2.6, 2.0, { intensity: 4, dist: 10, color: '#FFB060', flicker: 0.1 });
  glow(5.0, 2.2, 2.0, { intensity: 3, dist: 8, color: '#FFC890', flicker: 0 });
  backdrop('hills');
