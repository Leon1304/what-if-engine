  ground({ color: '#8FA860', flat: 200, hills: 0 });
  // a: mocap walk and jog (figure({ mocap: true })) · b: the same path with the figure's own gait · d: clips via anim() and back to its own pose (null)
  // z: zombie with mocap shamble · p: walks with its own legs, phone call on top (only: 'upper')
  const a = figure({ shirt: '#3D7BD9', mocap: true, hairStyle: 'short' }); world.add(a.root); track('a', a);
  walk(a, [[-5, 1.2], [4, 1.2]], { t0: 0, speed: 1.4 }); walk(a, [[4, 1.2], [4, -3], [-5, -3]], { t0: 7, speed: 4, mode: 'run' });
  const b = figure({ shirt: '#D94F3D' }); world.add(b.root); walk(b, [[-5, 2.4], [4, 2.4]], { t0: 0, speed: 1.4 });
  const d = figure({ shirt: '#E3B23C', hairStyle: 'long', expr: 'happy' }); world.add(d.root); d.root.position.set(0.6, 0, 0); track('d', d);
  anim(d, [[0.5, 'Idle_Talking_Loop'], [3, 'Dance_Loop'], [6, 'Punch_Cross', { once: true }], [7.2, 'Jump_Start', { once: true }], [8, null], [9, 'Death01', { once: true }]]);
  const z = figure({ kind: 'zombie', mocap: true }); world.add(z.root); walk(z, [[3, -5], [-4, -1]], { t0: 0, speed: 0.8, mode: 'shamble' });
  const p = figure({ shirt: '#3DA56A', coat: true }); world.add(p.root); walk(p, [[-3, -1.6], [3, -1.6]], { t0: 0, speed: 1.0 });
  anim(p, [[0, 'phone']], { only: 'upper' });
  for (let i = 0; i < 4; i++) { const q = figure({ mocap: true }); world.add(q.root); q.root.position.set(-3 + i * 2, 0, -6); anim(q, [[0, ['Idle_FoldArms_Loop', 'Yes', 'Idle_No_Loop', 'Sitting_Idle_Loop'][i]]]); }
  tick(t => { if (t > 2 && !window._mcChk) { window._mcChk = 1; const on = [a, d, z, p].map(f => f._mcOn ?? 0); if (on.some(x => !(x > 0.5))) throw new Error('mocap not applied: ' + on.join(',')); } });
