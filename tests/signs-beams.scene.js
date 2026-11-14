  // signs, screens and light beams: textSign (plate on a wall, neon, two lines, sign on a post), screenPanel (picture drawn from t),
  // spotBeam (searchlight on a mast, sweeping), flashlight({ at: 'track' }) (torch aimed at a walking figure). Signs stand 0.2 m in front of the wall (wall: true).
  ground({ color: '#6E7F58', flat: 300, hills: 0, dress: false });
  const W = stat(grp(world, 0, 0, -3)); box(W, 9, 4.2, 0.3, '#B9A88E', 0, 0, 0, { surf: 'brick' }); box(W, 9.2, 0.2, 0.5, '#8E8270', 0, 4.2, 0);   // wall, front face z = -2.85
  textSign(world, 'HOT DOGS', { w: 2.4, x: -2.2, y: 2.9, z: -2.85, wall: true, bg: '#E8413C' });
  textSign(world, 'OPEN 24/7', { neon: '#FF4FB0', w: 2.6, x: 2.1, y: 3.35, z: -2.85, wall: true, flicker: 0.5, seed: 2 });
  textSign(world, 'NO\nPARKING', { bg: '#F4F4F0', color: '#C62828', border: '#C62828', font: 'sans', w: 0.8, h: 0.62, x: -3.6, y: 1.4, z: -2.85, wall: true });
  screenPanel(world, 1.6, 0.9, (c, w, h, t) => {   // news screen: background, ticker bar moving with t, a clock that counts — all from t
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1C3F7A'); gr.addColorStop(1, '#0A1838'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#FFFFFF'; c.font = signFont(h * 0.2); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BREAKING', w / 2, h * 0.3);
    c.font = signFont(h * 0.16, 'mono'); c.fillStyle = '#FFD54A'; c.fillText('00:0' + Math.floor(t) + '.' + Math.floor((t % 1) * 10), w / 2, h * 0.56);
    c.fillStyle = '#C62828'; c.fillRect(0, h * 0.78, w, h * 0.22); c.fillStyle = '#FFFFFF'; c.font = signFont(h * 0.12, 'sans'); c.textAlign = 'left'; c.fillText('ZOMBIES SPOTTED DOWNTOWN · STAY INSIDE ·', w - ((t * 0.25) % 1) * w * 2, h * 0.89);
  }, { x: 1.4, y: 1.75, z: -2.85, wall: true });
  const post = stat(grp(world, 4.6, 0, 1.2)); cyl(post, 0.05, 0.05, 2.0, '#5A5E66', 0, 0, 0, { seg: 8 });
  textSign(world, 'EXIT →', { w: 1.1, x: 4.6, y: 2.25, z: 1.2, ry: -0.5, bg: '#1E8E4A', board: 0.04 });
  // searchlight on a mast, beam sweeps the yard; the floor spot follows
  const mast = stat(grp(world, -6, 0, -1)); cyl(mast, 0.12, 0.16, 6, '#4A4F57', 0, 0, 0, { seg: 8 }); box(mast, 0.6, 0.4, 0.6, '#2A2D33', 0, 6, 0);
  spotBeam(world, [-6, 6.1, -0.7], t => [-1 + 3 * Math.sin(t * 0.7), 0, 3 + 1.5 * Math.cos(t * 0.5)], { width: 0.22, intensity: 600 });
  // a walker crosses the yard, a guard follows him with a torch (flashlight at: track name)
  const wk = figure({ shirt: '#3D7BD9', pants: '#2E3A5C' }); world.add(wk.root); walk(wk, [[-5, 4.5], [5, 4.5]], { t0: 0, speed: 1.1 }); track('walker', wk);
  const gd = figure({ shirt: '#2A2D33', pants: '#1E2226', hat: '#1E2226', hatStyle: 'cap' }); world.add(gd.root); gd.root.position.set(2.5, 0, 7.5); gd.root.rotation.y = Math.PI;
  flashlight(gd, { t0: 0, at: 'walker', intensity: 60 });
