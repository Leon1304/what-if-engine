// two neighbours on a quiet street: 'you' on the left, the neighbour waving on the right; a lamp post and a house for scale
  ground({ color: '#8FA860', flat: 300, hills: 0 });
  const you = char('you', { expr: t => t < 9.5 ? 'calm' : 'surprised' }); world.add(you.root); you.root.position.set(-2, 0, 2); you.root.rotation.y = 0.3; track('you', you);
  const nb = figure({ shirt: '#D94F3D', pants: '#2A2D33', expr: 'happy' }); world.add(nb.root); nb.root.position.set(3, 0, 1); nb.root.rotation.y = -0.4; track('other', nb);
  tick(t => { pose(you, 'idle', 0, 0); pose(nb, 'idle', 0, 0); });   // frozen: no idle sway (the hook must read as still)
  gesture(nb, 1.6, 'wave', { dur: 2.2 });
  house(world, 0, -12, { ry: 0 });
