  // cross-section: soil block behind, the wood-lined tunnel with its front side cut away and its own earth/street fill, a shaft at each end, houses on the street
  strata(world, 6, -1.6, { w: 40, d: 2, top: 5, layers: [{ h: 0.25, color: '#3A3A3E', name: 'Street' }, { h: 1.6, color: '#9A6A44' }, { h: 9, color: '#7E5634' }] });
  smuggleTunnel(world, -4, -0.2, { len: 20, w: 0.8, h: 0.8, y: 1.1, ry: -Math.PI / 2, lining: 'wood', cut: 'right', shaft: { h: 3.1, w: 0.7 }, endShaft: { h: 3.1, w: 0.7 }, fill: { top: 5, bottom: -4, ext: 6 }, glows: 2 });
  const lift = grp(world, 0, 5, 0); house(lift, -6, -4.5, { ry: 0 }); house(lift, 18, -4.5, { ry: 0 });
  // plastic-lined escape tunnel with rails: a rail bike with a rider and cart comes toward the camera
  smuggleTunnel(world, 400, 5, { len: 60, w: 0.85, h: 1.7, y: 0, lining: 'plastic', rails: true, glows: 2 });
  const V = bike(world, { kind: 'motorcycle', rail: true, x: 400, z: -50, ry: 0 }); drive(V, [[400, -50], [400, -12]], { t0: 3.0, speed: 9, dust: false });
  const r = figure({ seed: 5, shirt: '#5A6A7A', expr: 'determined' }); world.add(r.root); r.root.position.set(400.5, 0, -50); rideBike(r, V, { t0: 0 });
  // vault floor cut from below: drill sparks, then the plug drops out
  slabHole(world, -400, 2.2, 0, { w: 3, d: 3, thick: 0.6, hole: [0.8, 0.8], open: 7.0, drill: [6.0, 7.0] });
  // prison cell with the hole in the shower floor (opens at 9 s), CCTV look 8–10 s
  prisonCell(world, -800, 0, { hole: true, holeOpen: 9.0, light: true });
