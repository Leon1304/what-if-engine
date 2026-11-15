  // v3.42 post-FX QA: a normal set, a dark wall with a row of tiny lamps in front of it, a white veil in front of the lens of shot 4 (CFG.washVeil)
  ground({ color: '#5C7A3C', flat: 300, hills: 0 });
  house(world, -4, -4, { w: 5, d: 4, h: 2.9, ry: 0.2 });
  const f = figure({ shirt: '#3D7BD9' }); world.add(f.root); f.root.position.set(0, 0, 0);
  box(world, 30, 15, 0.4, '#2A2C33', 0, 0, -1.2);   // dark wall behind shot 2 with a grid of light window frames (fine detail for the blur)
  const gridM = mat('#C9C2B0');
  for (let i = 0; i < 25; i++) box(world, 0.12, 6, 0.1, '', -12 + i, 7.5, -0.95, { mat: gridM, cast: false });
  for (let j = 0; j < 7; j++) box(world, 25, 0.12, 0.1, '', 0, 7.5 + j, -0.95, { mat: gridM, cast: false });
  const lampM = mat('#FFFFFF', { basic: true, glow: 40 });   // very hot (HDR) tiny lamps high in the frame
  for (let i = 0; i < 28; i++) ball(world, 0.04, '', -8.1 + i * 0.6, 11.2, -0.6, { mat: lampM, detail: 1, cast: false });
  if (CFG.washVeil) {   // a sheet of white 1 m in front of the shot-4 lens, fading out over 0.8 s after the flash: the frame stays milky
    const vm = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false });
    const v = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), vm); v.position.set(5.5, 2.85, 11.1); v.lookAt(6, 3, 12); world.add(dyn(v));
    tick(t => { const k = t < 9.6 ? 0 : 1 - clamp((t - 9.6) / 0.8); vm.opacity = 0.85 * k; v.visible = k > 0; });
  }
