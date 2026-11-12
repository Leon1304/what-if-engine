  ground({ color: '#8FA860', flat: 200, hills: 0 });
  // every expression, 0.6 s each (changes blend), talking now and then
  const you = char('you', { expr: t => XS[Math.min(XS.length - 1, Math.floor(t / 0.6))], look: 'cam', talk: [[1.2, 2.3], [6.2, 7.0], [18.4, 21.5]] });
  world.add(you.root); track('you', you); tick(t => { you.look = t >= 12 && t < 15 ? [4, 1.6, -1] : 'cam'; });
  // Steve talks calmly, then an explosion behind him: his face startles on its own (close-up), react() adds a body flinch
  const steve = char('steve', { expr: t => t < 14 ? 'calm' : 'scared', talk: [[12.2, 13.4]], look: 'cam' }); world.add(steve.root); steve.root.position.set(4, 0, -1); track('steve', steve);
  explode(9, 0, -9, 13.6, { size: 1.2 });
  react(you, 15.6, 'facepalm'); react(you, 16.6, 'shrug'); react(you, 17.4, 'nod');
  // counter drop at 19.5 → worried flash while talking; sigh at 22.5
  react(you, 22.5, 'sigh');
  const zed = figure({ kind: 'zombie' }); world.add(zed.root); zed.root.position.set(-4, 0, -1); track('zed', zed); pose(zed, 'shamble', 0, 0);
  const astro = astronaut({ expr: t => t < 28.5 ? 'surprised' : 'happy', talk: [[27.4, 28.4]] }); world.add(astro.root); astro.root.position.set(-8, 0, -1); track('astro', astro);
  glow(-8, 2.4, 1.5, { intensity: 4, dist: 6, flicker: 0, color: '#FFE0C0' });
