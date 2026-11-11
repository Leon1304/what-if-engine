  ground({ color: '#7FA05A', flat: 300, hills: 0 });
  const P = (x, z, o = {}) => { const f = figure({ skin: '#F1C7A5', ...o }); world.add(f.root); f.root.position.set(x, 0, z); f.root.rotation.y = o.ry ?? 0; return f; };
  // 1 placed inside a table → stands at its edge
  FURN.table(world, 0, 0); P(0.2, 0.1, { shirt: '#3D7BD9' });
  // 2 half inside a wall → stands in front of it
  stat(box(world, 4, 2.5, 0.2, '#C8C0B0', 5, 0, 0)); P(5, 0.15, { shirt: '#D94F3D' });
  // 3 two figures on the same spot → shoulder to shoulder
  P(8, 0, { shirt: '#3DA56A' }); P(8.12, 0.05, { shirt: '#E3B23C' });
  // 4 walks into a crate → slides round it
  stat(box(world, 0.8, 0.8, 0.8, '#8A6A44', 12, 0, 0)); walk(P(12.3, -3, { shirt: '#8A4AD9' }), [[12.3, -3], [12.3, 3]], { t0: 0.5, speed: 1.4 });
  // 5 walks through a standing figure → both make room
  P(16, 0, { shirt: '#2AA8B8' }); walk(P(16.1, -3, { shirt: '#F28A1A' }), [[16.1, -3], [16.1, 3]], { t0: 3.2, speed: 1.4 });
  // 6 sits at a table (not pushed), 7 hug (not pulled apart)
  FURN.table(world, 20, 0); FURN.chair(world, 20, 0.7, Math.PI); const sf = P(20, 0.7, { shirt: '#3D7BD9', ry: Math.PI }); sit(sf, 0, { seat: [20, 0.48, 0.7], ry: Math.PI });
  const h1 = P(23, 0, { shirt: '#D94F3D', ry: Math.PI / 2 }), h2 = P(24.2, 0, { shirt: '#3DA56A', ry: -Math.PI / 2 }); hug(h1, h2, 3.5, 6);
  // 8 deep inside a shed (left alone, the audit reports it) · 9 a dog trots through a standing figure
  stat(box(world, 3, 2.6, 3, '#9A7A5A', 30, 0, 0)); P(30, 0.2, { shirt: '#E3B23C' });
  P(34, 0, { shirt: '#8A4AD9' }); const dg = beast({ kind: 'dog', x: 34.05, z: -4 }); walk(dg, [[34.05, -4], [34.05, 4]], { t0: 6.2, speed: 2.5 });
