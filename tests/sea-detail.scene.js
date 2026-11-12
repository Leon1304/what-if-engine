  const sh = sea({ kind: 'white', y: -10 }); fly(sh.g, [[-20, -10, 0], [30, -10, 0]], { speed: 3 }); sh.do('bite', 0.6); track('shark', sh.g, 0);
  const wh = sea({ kind: 'humpback', y: -14 }); fly(wh.g, [[-40, -14, 30], [40, -14, 30]], { speed: 2.5 }); wh.do('spout', 2.6); track('whale', wh.g, 0);
  jelly(world, { x: 0, y: -6, z: 60 }); jelly(world, { x: 2.5, y: -5, z: 61, color: '#8AD8FF', ph: 1.3 }); school({ at: [0, -6, 62], n: 24, r: 3 }); sea({ kind: 'octopus', x: -3, y: -8, z: 58 });
  const oc = sea({ kind: 'orca', y: -10 }); fly(oc.g, [[-30, -10, 90], [30, -10, 90]], { speed: 4 }); track('orca', oc.g, 0); const dl = sea({ kind: 'dolphin', y: -8 }); fly(dl.g, [[-30, -8, 86], [30, -8, 86]], { speed: 5 });
