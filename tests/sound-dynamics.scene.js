  // v3.42 sound dynamics: the sound is what this scene checks — a plain field and a figure
  ground({ color: '#6E7A45', flat: 60, hills: 3 });
  const f = figure({ shirt: '#3D7BD9' }); world.add(f.root); f.root.position.set(0, 0, 1.5);
  tick(t => { pose(f, 'idle', t, t); });
