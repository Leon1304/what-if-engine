ground({ color: '#7E9A5A', flat: 120, hills: 0 });
// a small kitchen: real window (right wall, café curtain) and back door (right wall, open), detailed units
const R = interior(world, 0, 0, { kind: 'kitchen', w: 4.4, d: 3.6, h: 2.6, items: false, clutter: false, window: false, door: 'left', doorway: true, doorZ: 0.9,
  openings: [{ wall: 'right', kind: 'door', u: -0.5, open: keyed([[0, 0], [5.6, 0], [6.4, 1.2]]), hinge: 'left' }, { wall: 'right', kind: 'window', u: 1.15, w: 1.1, h: 1.0, y: 1.0, curtain: '#C8352A' }] });
const CT = furnish(world, 'counter', -0.5, -1.49, 0, { detail: true, w: 1.8 }); furnish(world, 'stove', -1.85, -1.49, 0, { detail: true, w: 0.7 });
const FR = furnish(world, 'fridge', 1.25, -1.45, 0, { detail: true }); furnish(world, 'sink', 1.9, 1.0, -Math.PI / 2, { detail: true, w: 1.1 });
FURN.wallShelf(world, 2.2, 1.15, -Math.PI / 2, { y: 2.08, w: 0.9 });
const top = CT.top;
// cake under the dome, forks, cake lifted off (shiftItem without hands) and dropped at 2.0, lick, scoop
const D = cakeDome(world, -0.95, top, -1.55); const C = creamCake(world, -0.95, top + 0.0215, -1.55);
shiftItem(null, D.dome, 0.3, 0.9, { to: [-0.35, top, -1.65] }); shiftItem(null, C, 1.0, 1.6, { to: [-0.55, 1.05, -1.0] });
const t1 = C.drop(2.0, { to: [-0.6, -0.72], dir: 0.3 }); rollTo(C.loose, t1, [[-0.5, -0.8], [0.4, -1.0], [1.2, -1.3], [1.32, -1.62]], { r: 0.0115, dur: 2.2 });
C.lick(3.0, 5.0); C.scoop(6.0);
cakeForks(world, -0.1, top, -1.45, { ry: 0.4 });
groundDecal(world, -0.75, -0.95, { kind: 'powder', w: 0.5, d: 0.4, t0: 2.1, from: [-0.15, -0.12], print: { x: 0.04, z: 0.05, ry: 0.35, size: 35, t: 2.6 } });
// pedal bin opening, plate + wads inside
const B = bin(world, 1.95, -1.55, { kind: 'pedal', open: keyed([[0, 0], [4.4, 0], [4.7, 1], [5.4, 1], [5.7, 0]]) });
trashBag(B.inside, 0.02, 0.0, 0.0, { kind: 'wad', size: 1.1 }); trashBag(B.inside, -0.04, 0.02, 0.03, { kind: 'wad', size: 0.9, seed: 3 });
// note with a strawberry magnet on the fridge door
const N = paperNote(FR.door, 'TIMO!\nONE more broken thing\nand you\'re banned\nfrom the kitchen.\nDad', { pad: true, x: 0.24, y: 0.62, z: FR.front + 0.001, rz: 0.05 });
// coat hooks, jacket with the pocket opening, biscuit pack in it
const H = coatHooks(world, 2.2, 1.62, 0.28, { ry: -Math.PI / 2, n: 2, w: 0.5 }); const J = raincoat(world, ...H.hooks[1], { ry: -Math.PI / 2, pocket: keyed([[0, 0], [6.0, 0], [6.4, 1]]) });
biscuitPack(J.inside, 0, 0, 0, {});
wallClock(world, 2.2, 2.27, -0.5, { ry: -Math.PI / 2, time: t => 15 + t * 30 / 3600 });
thermos(world, 2.06, 2.106, 1.35, { ry: -2 });
for (const [i, x, z] of [[1, -0.3, -0.6], [2, 0.7, -1.1], [12, -1.2, -0.4]]) evidenceMarker(world, x, 0, z, { n: i, ry: 0.4 * i });
food(world, 'biscuit', -0.3, top, -1.7, { still: true }); food(world, 'cherry', -0.2, top, -1.75, { still: true, cream: true });
// people: apron + flour, dachshund with collar, cream (from 4) and crumbs (from 5)
const M = figure({ build: 'woman', hairStyle: 'short', hair: '#B5562A', shirt: '#3F6B5A', pants: '#2C2C34', apron: '#F1EDE3', flour: true, expr: 'smug' }); world.add(M.root); M.root.position.set(-1.6, 0, 0.6); M.root.rotation.y = 0.6;
const Bru = animal({ kind: 'dog', breed: 'dachshund', collar: '#2F6FB0', cream: 4.0, crumbs: 5.0, x: 0.2, z: -0.3, ry: -2.2 }); Bru.do('sit', 7);
// outside: blanket over a figure + chalk outline, for the murder cases
coverSheet(world, 7, 0.6, { ry: 0.3 }); groundDecal(world, 7, -1.4, { kind: 'chalk', len: 1.75, ry: -0.2 });
biome('farm', { area: 40, density: 0.5, keep: [[0, 0, 6], [7, 0, 4]] });
