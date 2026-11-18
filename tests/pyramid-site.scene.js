ground({ color: '#D9BE8A', flat: 400, hills: 0, size: 900 });
const S = pyramidSite(world, 0, -260, { h: 50, ramp: { slope: 0.25 }, place: { t0: 1, every: 0.8, pre: 10 }, start: 1084000, rate: 2 });
LIVE.blocks = S.count;
const sl = sled(world, 0, 40, { kind: 'sledge' }), crew = [];
for (let i = 0; i < 8; i++) crew.push(figure({ costume: 'egyptworker', seed: 30 + i, headcloth: i % 3 ? true : false }));
const wm = figure({ costume: 'egyptworker', seed: 41 });
haul(sl, { crew, pts: [[0, 40], [0, 24]], t0: 0, speed: 0.5, water: wm, pour: [0, 12] });
const ov = figure({ costume: 'egyptoverseer', seed: 7 }); world.add(ov.root); ov.root.position.set(3, 0, 6); ov.root.rotation.y = -0.6;
for (let i = 0; i < 4; i++) { const f = figure({ costume: 'egyptworker', seed: 50 + i }); world.add(f.root); f.root.position.set(-4 + i * 2.6, S.H, -186 - (i % 2) * 2); }
mudbrick(world, 994, -2, { kind: 'bakery', fire: [0, 12] }); mudbrick(world, 1003, -4, { kind: 'house' }); mudbrick(world, 1012, -12, { kind: 'gallery', ry: 0.3 });
mudbrick(world, 996, 7, { kind: 'tomb', style: 'mastaba' }); mudbrick(world, 999, 8, { kind: 'tomb', style: 'pyramid' }); mudbrick(world, 1002, 8, { kind: 'tomb', style: 'dome' });
const pat = figure({ costume: 'egyptworker', seed: 61 }); world.add(pat.root); pat.root.position.set(1001, 0, 3.5); splint(pat, { side: 'L', t0: 9.5, wrap: [9, 10.5] });
food(world, 'beerjar', 1000.2, 0, 4.3, { open: true }); food(world, 'conebread', 999.7, 0, 4.4, {});
biome('giza', { keep: [...S.keep, [0, 34, 12], [1000, 0, 25]] });
