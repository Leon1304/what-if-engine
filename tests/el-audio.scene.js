  // v3.25 ElevenLabs audio test: a small farm yard (the sound is what this scene checks)
  ground({ color: '#6E7A45', flat: 60, hills: 3 });
  const f = figure({ shirt: '#7A4A2E' }); world.add(f.root); f.root.position.set(0, 0, 1.5); track('hero', f);
  tick(t => { pose(f, 'idle', t, t); });
