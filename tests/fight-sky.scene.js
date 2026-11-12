arenaHall(world, {});
const C = fightCage(world, 0, 0, { door: 3 }); ringBell(C, 0.5);
const bot = fightBot(); world.add(bot.root); bot.root.position.set(-1, 0, 0); bot.root.rotation.y = Math.PI / 2;
const you = char('you', { outfit: 'buzz' }); world.add(you.root); you.root.position.set(1, 0, 0); you.root.rotation.y = -Math.PI / 2; gloves(you);
punch(you, 1, { at: bot, hit: false }); kick(you, 2, { at: bot, hit: false }); headOff(bot, 2.05, { to: [-2.5, -1.5], face: 0.3 });
walk(bot, [[-1, 0], [3, 0], [6.5, 0]], { t0: 2.6, speed: 3.5, mode: 'run' });
telescope(world, 2.5, 3, { ry: 0.4 });
spaceSky({});
orrery(world, 4000, 0, 0, { align: [5, 2] });
