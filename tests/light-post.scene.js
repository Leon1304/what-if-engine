  // v3.45 light / post test: night faces near the lens and under a hot lamp, a room, a close-up with the look-at point behind the figure, a white veil (no flash)
  ground({ color: '#5C7A3C', flat: 300, hills: 0 });
  house(world, -6, -14, { w: 6, d: 5, h: 3, ry: 0.2 });
  const near = figure({ shirt: '#D94A3D' }); world.add(near.root); near.root.position.set(0.15, 0, 3.9); near.root.rotation.y = Math.PI;   // face 0.6 m from the lens
  const lit = figure({ shirt: '#3D7BD9' }); world.add(lit.root); lit.root.position.set(-1.2, 0, -2); lit.root.rotation.y = 0.3;
  glow(-1.2, 2.75, -2, { color: '#FFE6CC', intensity: 30, dist: 14, flicker: 0 });   // hot lamp 1 m above the head
  interior(world, 39, -1, { kind: 'living', w: 6, d: 5, h: 2.8, window: false, door: false });
  const sub = figure({ shirt: '#3DB06A' }); world.add(sub.root); sub.root.position.set(-10, 0, 1.4); sub.root.rotation.y = Math.PI * 0.95;   // 1.8 m from the lens, the look-at point 4 m behind it
  for (let i = 0; i < 6; i++) box(world, 1, 2 + (i % 3), 1, ['#C9A06A', '#8FA9C4', '#B86A5A'][i % 3], -14 + i * 1.6, 0, -9);
  const vm = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false });   // a white veil 1 m in front of the lens of shot 4, no flash
  const v = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), vm); v.position.set(11.25, 2.4, 9.35); v.lookAt(12, 2.5, 10); world.add(dyn(v));
  tick(t => { const k = t >= 10 && t < 11.5 ? 1 : 0; vm.opacity = 0.7 * k; v.visible = k > 0; });
