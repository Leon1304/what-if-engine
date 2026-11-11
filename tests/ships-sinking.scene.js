  water({ size: 2400, z: 350, seg: 160 });
  const cr = ship('cruise', 0, 0, { ry: Math.PI / 2 }); bob(cr.g, { size: 120, depth: 0 }); sink(cr, 0.5, { mode: 'bow', dur: 10, lifeboats: 4 });
  const fb = ship('fishing', 300, 0, { ry: 0.3 }); bob(fb.g, { size: 11, depth: 0 }); tentacles({ at: fb, t0: 0.6, grab: 2.6, drag: 3.6, dragDur: 6 });
  const vk = ship('viking', -300, -20); sail(vk, [[-300, -20], [-300, 60]], { t0: 0, speed: 3 }); vk.seats.forEach((st, i) => board(vk, warrior('viking', { seed: i + 1 }), i));
  ship('carrier', 0, 700, { ry: 0.4 });
  ship('battleship', 300, 700, { ry: 0.4 });
  const sp = ship('speedboat', -300, 700); bob(sp.g, { size: 4, depth: 0 }); sink(sp, 6.2, { mode: 'capsize', dur: 4, lifeboats: 0 });
