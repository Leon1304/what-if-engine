ground({ color: '#4A5A44' });
roadBridge(world, 22, 70, 0);
const B = tollBooth(world, 20, 6.5);
boomGate(world, 19, 5, { w: 9, ry: Math.PI / 2, close: 2, dur: 2 });
const g = gerald(); world.add(g.root); g.root.position.set(...B.roof);
