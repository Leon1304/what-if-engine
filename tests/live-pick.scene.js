  ground({ color: '#8FA860', flat: 60, hills: 0 });
  interior(world, 0, 0, { kind: 'kitchen', w: 5, d: 4, h: 2.7, items: false });
  // three pickable things: a red crate (static → bake() puts it into buckets of its own), a tiny coin (hull of 44 px), a bin whose lid opens on an event
  const crate = stat(grp(world, -0.6, 0, 0.2)); box(crate, 0.4, 0.4, 0.4, '#C0392B', 0, 0, 0); pickable(crate, 'crate');
  const coin = grp(world, -0.15, 0, 0.62); box(coin, 0.03, 0.006, 0.03, '#D4AF37', 0, 0, 0, { metal: 0.8, rough: 0.3 }); pickable(coin, 'coin');
  const bin = grp(world, 1.0, 0, -0.3); box(bin, 0.3, 0.45, 0.3, '#4A6E8A', 0, 0, 0);
  const lid = dyn(grp(bin, 0, 0.45, -0.15)); box(lid, 0.32, 0.03, 0.32, '#2E4A60', 0, 0, 0.15); pickable(bin, 'bin'); LIVE.lid = lid;
  tick(t => { lid.rotation.x = -1.7 * EASE.inOut(clamp(liveSince('bin_lid') / 0.5)); });   // game clock: opens 0.5 s after the event
  // note on the back wall: its text comes from the host's language (liveText), redrawn by onLiveLang
  const nh = dyn(grp(world, 0.3, 1.25, -1.94)); LIVE.note = nh;
  onLiveLang(() => { for (const c of nh.children.slice()) nc(c); textSign(nh, liveText('scene.note', 'HELLO'), { w: 0.5, h: 0.32, bg: '#F4F0E4', color: '#1A1A1A', font: 'block', board: 0 }); });
  function nc(c) { c.removeFromParent(); }
  // the actor
  const hilde = figure({ shirt: '#8E44AD', pants: '#2C3E50', hair: '#B0B0B0' }); world.add(hilde.root); hilde.root.position.set(0.75, 0, 0.45); hilde.root.rotation.y = -0.35;
  liveActor('hilde', hilde); LIVE.hilde = hilde;
  tick(t => pose(hilde, 'idle', t, t));
  liveViews({
    v_main: { at: [-0.6, 0.2, 0.2], az: 10, el: 25, dist: 1.8, fov: 50 },
    v_side: { at: [1.0, 0.4, -0.3], az: 60, el: 30, dist: 1.4, fov: 50, yaw: 50 },
    v_wall: { at: [0.3, 1.25, -1.9], az: 0, el: 4, dist: 1.4, fov: 45 }
  });
