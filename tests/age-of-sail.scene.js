water({ size: 2600, waves: 0.35, color: '#24485A' });
// the lower gun deck: guns fire one after another, the boy runs aft with his case, another climbs out of the hatch
const D = gunDeck(world, 0, 0, { y: 2.4, guns: 5, haze: t => 0.4 + 0.5 * sm01((t - 0.5) / 2) });
D.gun(1, 2).fire(0.8); D.gun(1, 3).fire(1.6); D.gun(-1, 1).fire(2.3); D.gun(1, 1).fire(9.6);
const boy = char('you', { outfit: 'powderboy', expr: 'scared' }); world.add(boy.root); boy.root.position.set(1.2, D.y, -5); track('you', boy);
walk(boy, [[1.2, -5], [1.2, 4]], { t0: 0, speed: 3.2, mode: 'run' });
const C = cartridgeCase(world, 0, 0, 0, { open: [[10.2, 11.2]] }); holdItem(boy, C, -1, 1e9, { side: 'L', reach: false, off: [0, -0.32, 0.1] });
const crew = [[4.0, 0.9, 'Push_Loop'], [4.2, -0.6, null], [-4.2, -2.4, 'Crouch_Idle_Loop']].map(([x, z, a], i) => { const f = figure({ costume: 'sailor1805', seed: 3 + i * 4, expr: 'determined' }); world.add(f.root); f.root.position.set(x, D.y, z); f.root.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2; if (a) anim(f, [[0, a]]); return f; });
const climber = char('you', { outfit: 'powderboy', expr: 'calm' }); world.add(climber.root); climb(climber, { ...D.hatch.climb, t0: 9.1, speed: 1.4 });
// the enemy alongside, seen through the ports
const E = ship('firstrate', 17, 0, { ry: Math.PI, tiers: 2 }); bob(E.g, { size: 25, depth: 0 });
// the magazine: the gunner's mate passes a cartridge through the wet screen
const M = powderMagazine(world, 2000, 0, { pass: [4.2] });
const mate = figure({ costume: 'sailor1805', seed: 9, expr: 'calm' }); world.add(mate.root); mate.root.position.set(2000.2, M.y, 0.9);
const kid = char('you', { outfit: 'powderboy', expr: 'nervous' }); world.add(kid.root); kid.root.position.set(1999.9, M.y, 2.4); kid.root.rotation.y = Math.PI;
// outside: a first rate fires a rippling broadside
const V = ship('firstrate', -1000, 0, { ry: 0.3 }); bob(V.g, { size: 28, depth: 0 }); broadside(V, 6.6, { side: 1, n: 14 });
