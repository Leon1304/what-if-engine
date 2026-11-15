  // env-props street kit: rows of every prop (A z = 0, B z = 6, C z = 14, D z = 20), a dressed wall, four suburb houses, parked cars, a walker leaving footprints; snow from t = 6
  ground({ color: '#7FA052', flat: 200, hills: 0, dress: false }); snowCover(6, 1e9, 1, { rise: 2.5 });
  const A = [g => mailbox(world, g, 0, { kind: 'us', flag: 1.5, number: 42 }), g => mailbox(world, g, 0, { kind: 'post' }), g => bin(world, g, 0, { kind: 'wheelie', number: 7 }), g => bin(world, g - 0.4, 0, { kind: 'dumpster' }), g => bin(world, g, 0, { kind: 'recycling' }), g => bin(world, g, 0, { kind: 'can' }),
    g => crate(world, g, 0, { stack: 2 }), g => crate(world, g, 0, { kind: 'plastic', stack: 3 }), g => crate(world, g, 0, { kind: 'ammo', stack: 2 }), g => barrel(world, g, 0, { kind: 'oil' }), g => barrel(world, g, 0, { kind: 'wood' }), g => barrel(world, g, 0, { kind: 'rain' }),
    g => pallet(world, g, 0, { load: 'boxes', ry: 0.2 }), g => pallet(world, g, 0, { stack: 4, ry: -0.3 }), g => woodpile(world, g - 0.4, 0, { len: 1.6 })];
  A.forEach((f, i) => f(-16 + i * 2.3));
  const B = [g => cones(world, g, 6, { n: 3, gap: 0.7 }), g => cones(world, g, 6, { kind: 'apron', n: 2, gap: 0.8 }), g => barrier(world, g, 6, { kind: 'jersey', stripes: true }), g => barrier(world, g, 6, { kind: 'police' }),
    g => barrier(world, g, 6, { kind: 'construction' }), g => streetSign(world, g, 6, { kind: 'street' }), g => streetSign(world, g, 6, { kind: 'stop' }), g => streetSign(world, g, 6, { kind: 'shop' }), g => streetSign(world, g, 6, { kind: 'realtor', sold: true }), g => streetSign(world, g, 6, { kind: 'warning', text: 'ICE' }),
    g => bollard(world, g, 6, { n: 3, gap: 0.6 }), g => bollard(world, g, 6, { kind: 'concrete' }), g => bollard(world, g, 6, { kind: 'post' }), g => bikeRack(world, g, 6, { n: 3, gap: 0.7, bikes: 2 }), g => newsBox(world, g, 6, {}), g => acUnit(world, g, 6, { kind: 'ground' }),
    g => acUnit(world, g, 6, { kind: 'roof' }), g => snowman(world, g, 6, { seed: 2 }), g => sled(world, g, 6, { ry: 0.5 }), g => sled(world, g, 6, { kind: 'plastic', ry: -0.4 })];
  B.forEach((f, i) => f(-21 + i * 2.2));
  apronKit(world, -22, 14, { kind: 'tug' }); apronKit(world, -15, 14, { kind: 'fuelTruck', ry: Math.PI / 2 }); apronKit(world, -8, 14, { kind: 'baggageCart', ry: Math.PI / 2 }); apronKit(world, -1, 14, { kind: 'stairs', ry: Math.PI / 2 }); apronKit(world, 4, 14, { kind: 'chocks' });
  ['crates', 'barrels', 'coils', 'nets'].forEach((k, i) => deckCargo(world, 7 + i * 2.5, 14, { kind: k, seed: i }));
  ['buckets', 'tools', 'debris', 'cable'].forEach((k, i) => tunnelClutter(world, 17 + i * 2.1, 14, { kind: k, seed: i }));
  debris(world, -10, 20, { kind: 'paper' }); debris(world, -6, 20, { kind: 'leaves' }); debris(world, -2, 20, { kind: 'rubble' });
  groundDecal(world, 2, 20, { kind: 'puddle' }); groundDecal(world, 5, 20, { kind: 'oilStain' }); groundDecal(world, 8, 20, { kind: 'crack' }); groundDecal(world, 12, 20, { kind: 'snowbank' });
  groundDecal(world, 0, 0, { kind: 'tyreTracks', pts: [[14, 18], [18, 20], [22, 22]] });
  const f = figure({ skin: '#E8B890', shirt: '#3D7BD9', pants: '#2E3A5C' }); world.add(f.root); f.root.position.set(-14, 0, 24); walk(f, [[-14, 24], [-2, 24]], { t0: 0.5, speed: 1.3 }); groundDecal(world, 0, 0, { kind: 'footprints', of: f });
  wall(world, [[24, -2], [38, -2]], { kind: 'brick' }); wall(world, [[41, -2], [55, -2]], { dress: true, dressSide: 0 });
  awning(world, 28, -1.82, { w: 2.6 }); mailbox(world, 31.4, -1.82, { kind: 'wall' }); acUnit(world, 35.5, -1.82, { kind: 'wall', y: 1.3 });
  house(world, -18, -16, { yard: true, season: 'xmas', number: 12, lit: 1.2 }); house(world, -6, -16, { variant: 'garage', yard: true, season: 'winter', wall: '#D8E2EA', roof: '#4A5058' });
  house(world, 6, -16, { variant: 'dormer', yard: true, details: true, wall: '#F2E2C4', roof: '#5A3A2A' }); house(world, 18, -16, { variant: 'bay', yard: true, porch: false, season: 'xmas', lights: 'warm', wall: '#E8D0C8', roof: '#3A3D44', lit: 1.2 });
  parkedCars(world, [[-20, -5.4, Math.PI / 2], [-14.5, -5.4, Math.PI / 2], [-9, -5.4, Math.PI / 2], [7, -5.4, -Math.PI / 2]]);
