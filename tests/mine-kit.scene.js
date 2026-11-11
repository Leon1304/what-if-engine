ground({ color: '#3A3530' });
mineTunnel(world, 0, -2, { len: 30, dead: [1] });
mineCage(world, 0, 1.5, { close: 4.2, up: 5, dur: 2.5, h: 10 });
const you = char('you'); world.add(you.root); you.root.position.set(0, 0, -9); you.root.rotation.y = Math.PI; headlamp(you); walkie(you, { talk: [[1, 3]] });
