  // v3.31 camp-out kit: tent (dome / ridge, pitch, away, open, snow, name), countdownScreen (segments, glitch, messages with strike)
  ground({ color: '#5E6A52', flat: 200, hills: 0 });
  tent(world, -1.6, 0, { color: '#E8772E', name: 'KEVIN', pitch: 0.5, open: 1.5, ry: 0.3 });
  tent(world, 1.8, -0.6, { kind: 'ridge', color: '#3A7AC8', snow: 0.8, snowDur: 1.5, ry: -0.4 });
  tent(world, 0.5, -3.2, { color: '#5AA04A', away: [[1.8, 2.4]] });
  countdownScreen(world, 8, 4.5, { x: 0, y: 4.5, z: 10, segs: [{ from: 3, at: 6, remain: t => 6 - t, glitch: 0.8 }], msgs: [[6.8, 'MAY 26', '', true], [7.8, 'DELAYED', 'TO 2027']], ticks: [3, 4, 5] });
  for (const sx of [-1, 1]) box(world, 0.3, 6.8, 0.3, '#2A2D33', sx * 4.3, 0, 9.8, { kind: 'metal' });
