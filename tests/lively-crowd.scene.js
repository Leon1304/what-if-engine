  // v3.59 crowdWave: a standing street crowd (no gaze of its own) and an explosion 30 m away at t = 1.5 — CFG.lively makes the crowd look round in a wave from the blast
  // (front rows first), a share points, gasps, ducks and holds phones up (lit screens). tests/run.sh checks hordes[0]'s automatic gaze and the order of the reaction times.
  ground({ color: '#6A6E72', flat: 90, hills: 0 });
  plaza(world, 0, 0, { w: 40, d: 40 });
  const spots = []; for (let i = 0; i < 48; i++) { const a = hash(i * 3.1) * TAU, r = 1 + Math.sqrt(hash(i * 7.7)) * 6.5; spots.push([Math.sin(a) * r, 13 + Math.cos(a) * r * 0.7, Math.PI + (hash(i) - 0.5) * 0.8]); }
  horde({ kind: 'human', spots, mix: { woman: 0.4, kid: 0.1, old: 0.1 }, jostle: 0.3 });
  explode(0, 0.5, -28, 1.5, { size: 1.6 });
  for (const x of [-16, 16]) tower(world, x, -40, { w: 12, d: 10, floors: 6 });
