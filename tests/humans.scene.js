  ground({ color: '#8FA860', flat: 200, hills: 0 });
  // a walker (long sleeves, jeans), a jogger (shorts), a dancer/talker (woman, long hair) and a random crowd of five
  const a = human({ sex: 'm', shirt: '#2E86C1', pants: '#2E3A5C', shoes: '#EEEEEE', sleeves: 'long', hair: 'parted', hairColor: '#3A2614', beard: true, skin: '#E0AC80' }); world.add(a.root); track('a', a);
  walk(a, [[-5, 1], [3, 1], [3, -2], [-3, -2]], { t0: 0, speed: 1.4 });
  const b = human({ sex: 'm', shirt: '#C0392B', legs: 'shorts', sleeves: 'none', hair: 'buzzed', skin: '#8D5A3B' }); world.add(b.root);
  walk(b, [[-8, -4], [8, -4]], { t0: 1, speed: 4, mode: 'run' });
  const f = human({ sex: 'f', shirt: '#F1C40F', pants: '#1F2A44', hair: 'long', hairColor: '#A87B4F', skin: '#E8B48F' }); world.add(f.root); f.root.position.set(0.8, 0, 0); track('f', f);
  anim(f, [[0, 'Idle_Loop'], [1.5, 'Idle_Talking_Loop'], [4, 'Dance_Loop'], [7, 'Punch_Jab'], [8, 'Idle_TalkingPhone_Loop'], [10, 'Death01', { once: true }]]);
  for (let i = 0; i < 5; i++) { const p = human({ sex: i % 2 ? 'f' : 'm', seed: 20 + i }); world.add(p.root); p.root.position.set(-4 + i * 1.6, 0, -6); p.root.rotation.y = 0.3 * (i - 2);
    anim(p, [[0, ['Idle_Loop', 'Idle_FoldArms_Loop', 'Idle_Talking_Loop', 'Yes', 'Idle_No_Loop'][i]]]); }
