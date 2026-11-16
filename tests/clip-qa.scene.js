  // clip QA (render.mjs --audit → QA: OVERLAP / INSIDE / HEADCLIP). Expected: one OVERLAP (two houses in each other), one INSIDE ('Inside' in the van), one HEADCLIP ('Beam');
  // nothing for the houses side by side, the room, the doorway, the car, the hug, the awning that is high enough and the city figure (its tower is left out).
  ground({ color: '#7FA05A', flat: 300, hills: 0, dress: false });
  // wrong: two houses 1 m into each other → OVERLAP · right: two houses with 0.6 m between the walls (0.1 m between the roofs) → no line
  house(world, -10, -8, { w: 5, d: 4 }); house(world, -6.5, -8, { w: 5, d: 4 });
  house(world, 3, -9, { w: 5, d: 4 }); house(world, 8.6, -9, { w: 5, d: 4 });
  // wrong: a figure standing 0.25 m deep in the side of a van that drove there (moving things are no hitbox: nothing pushes it out) → INSIDE
  const VN = vehicle(world, -9, 4, { kind: 'van' }); dyn(VN.g); const A = char('Inside', { shirt: '#D94F3D' }); A.duck = false; world.add(A.root);   // p3: headDuck would crouch it under the van roof (the INSIDE probe wants it standing in the side)
  A.root.position.set(-8.25, 0, 4.5);
  // wrong: a figure under a beam at head height that may not duck → HEADCLIP · right: the same beam over one that ducks (headDuck) → no line
  const gal = stat(grp(world, -3, 0, 4)); for (const s of [-1, 1]) box(gal, 0.15, 1.58, 0.15, '#5A4A3A', s * 1.2, 0, 0); box(gal, 2.6, 0.18, 0.4, '#6A5440', 0, 1.58, 0);
  const B = char('Beam', { shirt: '#3D7BD9' }); world.add(B.root); B.root.position.set(-3.6, 0, 4.05); noHit(B); B.duck = false;
  const B2 = char('Duck', { shirt: '#5AA0D9' }); world.add(B2.root); B2.root.position.set(-2.4, 0, 4.05); noHit(B2);
  // right: a figure in a room, one walking in through the open front door, one in a car, two hugging, one under an awning that is high enough
  interior(world, 4, 18, { kind: 'living' }); const C = char('Room', { shirt: '#3DA56A' }); world.add(C.root); C.root.position.set(4.4, 0, 18.3);
  const H = house(world, 10, 6, { w: 5, d: 4, porch: false }); openDoor(H, 0); const D = char('Door', { shirt: '#E3B23C' }); world.add(D.root); D.root.position.set(10, 0, 11); walk(D, [[10, 11], [10, 8.6], [10, 7.3]], { t0: 2.5, speed: 1 });
  const V = vehicle(world, 15, 2, { kind: 'car', ry: 0.3 }); const E = char('Driver', { shirt: '#8A5ACD' }); world.add(E.root); E.root.position.set(16.5, 0, 2); enter(E, V, -2);
  const F1 = char('HugA', { shirt: '#F2F2F2' }), F2 = char('HugB', { shirt: '#2A2D33' }); world.add(F1.root, F2.root); F1.root.position.set(-1, 0, 9); F2.root.position.set(-0.2, 0, 9); hug(F1, F2, 0, 6);
  awning(world, 5, -3, { w: 2.4, d: 1.2 }); const G = char('Shade', { shirt: '#C8C4B8' }); world.add(G.root); G.root.position.set(5, 0, -2.4); stat(box(world, 2.6, 2.6, 0.3, '#B8A68A', 5, 0, -3.2));
  // right: crawling through a low tunnel (0.95 m, frames at 0.87 m) and riding a motorbike through a 1.7-m tunnel — both duck under the frames / beams (headDuck) → no line
  smuggleTunnel(world, 30, 0, { len: 8, w: 0.8, h: 0.95, y: 0, lining: 'wood', cut: 'right', bulbs: 0, pipe: false });
  const CR = char('Crawl', { shirt: '#5A4A3A' }); world.add(CR.root); CR.root.position.set(30, 0, -1); walk(CR, [[30, -1], [30, -7]], { t0: 0, speed: 0.55, mode: 'crawl' });   // crawls from the start (it stood up in the 0.95-m tunnel before)
  smuggleTunnel(world, 40, 10, { len: 40, w: 1.2, h: 1.7, y: 0, lining: 'earth', rails: true, bulbs: 0, pipe: false });
  const BK = bike(world, { kind: 'motorcycle', rail: true, x: 40, z: 8, ry: Math.PI }); drive(BK, [[40, 8], [40, -2]], { t0: 9, speed: 4 });
  const RD = char('Rider', { shirt: '#3A6A8A' }); world.add(RD.root); RD.root.position.set(40, 0, 7.7); rideBike(RD, BK, { t0: 8.5, t1: 99 });
  // right: a driver in every procedural vehicle kind — the seat (SEATS) keeps the head under the roof → no line
  ['sports', 'taxi', 'police', 'van', 'pickup', 'truck', 'bus'].forEach((k, i) => { const v = vehicle(world, 60 + i * 5, 0, { kind: k }); const d = char('Seat' + k, { shirt: '#7A7A7A' }); world.add(d.root); d.root.position.set(61.5 + i * 5, 0, 0); enter(d, v, -2); });
  // generator: city() leaves out the tower where a figure stands → no INSIDE for 'City'
  city({ at: [100, 0], nx: 1, nz: 1, block: 14, street: 6, props: false, backdrop: false });
  const K = char('City', { shirt: '#FF8A3D' }); world.add(K.root); K.root.position.set(100 + 0.23 * 14, 0, 0.23 * 14);
