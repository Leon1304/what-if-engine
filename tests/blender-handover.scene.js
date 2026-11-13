  ground({ color: '#8FA860', flat: 200, hills: 0 });
  const bad = m => console.error('blender-handover: ' + m);
  // own/bunker with its hand-over points: parts door (+ wheel, bars), hatch, searchlight, mg · 12 marks · walk surface (roof, entrance cap, steps)
  const B = asset(world, 'own/bunker', 2, -4, { ry: 0.35, walk: true }); track('bunker', B, 0);
  if (B.marks.length !== 12) bad('marks ' + B.marks.length);
  for (const n of ['door', 'wheel', 'bars', 'hatch', 'searchlight', 'mg']) if (!B.parts[n]) bad('part ' + n + ' missing');
  if (B.parts.wheel.parent !== B.parts.door || B.doors?.[0] !== B.parts.door) bad('part nesting / doors');
  // door sequence: wheel turns, bars slide towards the hinge, door swings out (openDoor knows the hinge side and angle from Blender)
  animate(B.parts.wheel, [[0.4, { rz: 0 }], [1.6, { rz: -2 * Math.PI }]], { sound: 'tick' });
  animate(B.parts.bars, [[1.6, { x: 0 }], [1.9, { x: -0.3 }, 'out']]);
  openDoor(B, 2.0, { dur: 0.9 });
  // searchlight sweeps, MG turns towards the path, back hatch swings up at 9.4
  animate(B.parts.searchlight, [[0, { ry: 0.7 }], [4, { ry: -0.7 }], [8, { ry: 0.5 }], [12, { ry: -0.2 }]]);
  animate(B.parts.mg, [[5.8, { ry: 0 }], [7.2, { ry: 0.6 }]]);
  animate(B.parts.hatch, [[9.4, { rx: 0 }], [10.4, { rx: 1.3 }, 'back']]);
  B.lights({ max: 2 }); track('hatch', B.parts.hatch, 0);
  // soldier across the yard along the path marks to the door, then into the opening; another one walks on the roof (walk surface)
  const soldier = figure({ shirt: '#5C6B45', pants: '#4A5238' }); world.add(soldier.root);
  const pth = B.path('path_door_'), din = B.at('doorway');
  walk(soldier, [...pth, [din[0], din[2]]], { t0: 0.2, speed: 1.6 }); vanish(soldier.root, 5.63, { dur: 0.01 });   // gone in the dark passage at the cut
  const roof = B.at('roof'); DEFER.push(() => { if (!(groundH(din[0], din[2]) < 0.6)) bad('walk surface over the doorway: groundH ' + groundH(din[0], din[2]).toFixed(2)); if (!(groundH(roof[0], roof[2]) > 4)) bad('walk surface: groundH on the roof ' + groundH(roof[0], roof[2]).toFixed(2)); });
  const guard = figure({ shirt: '#6B5B45' }); world.add(guard.root); track('guard', guard);
  const yaw = B.dir('roof'), rx = Math.sin(yaw + Math.PI / 2), rz = Math.cos(yaw + Math.PI / 2);
  walk(guard, [[roof[0] - rx * 1.6, roof[2] - rz * 1.6], [roof[0] + rx * 1.6, roof[2] + rz * 1.6], [roof[0] - rx * 1.6, roof[2] - rz * 1.6]], { t0: 5.6, speed: 1.1 });
  const hp = B.parts.hatch.getWorldPosition(new THREE.Vector3()); if (!(hp.y > 1.5 && hp.y < 3)) bad('hatch pivot height ' + hp.y.toFixed(2));
  // the same model without the walk option: no surface, nothing changes for older scenes
  asset(world, 'own/bunker', -22, -16, { ry: -0.5 });
