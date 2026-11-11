  ground({ color: '#A99B6E', flat: 500, hills: 0 });
  // lineup: bronze muscle cuirass · officer with transverse crest · linothorax · parade (helmet up) · agoge boy
  const a = hoplite({ seed: 11, armor: 'muscle', metal: 'bright', crest: 'fan', device: 'scorpion', weapon: 'dory+aspis', cloak: true, at: [-3, 0] });
  const b = hoplite({ seed: 23, armor: 'muscle', metal: 'aged', crest: 'transverse', device: 'club', weapon: 'dory+aspis', cloak: true, at: [-1.5, 0] });
  const c = hoplite({ seed: 37, armor: 'linen', crest: 'fan', crestColor: '#1E1A18', device: 'snake', weapon: 'dory+aspis', cloak: false, at: [0, 0] });
  const d = hoplite({ seed: 41, kit: 'parade', armor: 'muscle', device: 'gorgon', weapon: 'xiphos+aspis', cloak: true, at: [1.5, 0] });
  const e = hoplite({ seed: 53, kit: 'boy', at: [3, 0] }); e.root.scale.setScalar(0.72);
  helmetUp(c, [[11.3, 1]]);
  const m1 = hoplite({ seed: 61, armor: 'muscle', metal: 'bright', weapon: false, cloak: false, helmet: false, at: [5.5, 0] }), m2 = hoplite({ seed: 67, armor: 'linen', weapon: false, cloak: false, helmet: false, at: [7, 0] });
  // shield devices on posts
  const devs = ['scorpion', 'snake', 'club', 'bull', 'eyes', 'trident', 'gorgon', 'star', 'lambda'];
  devs.forEach((dv, i) => { const x = (i - 4) * 1.15, p = grp(world, x, 0, 12); cyl(p, 0.03, 0.03, 0.75, '#5A4632', 0, 0, -0.1, { seg: 6 });
    const s = grp(p, 0, 1.05, 0); buildAspis(s, { device: dv, offset: 0, face: i === 3 ? '#E8E0CC' : undefined, metal: i % 3 === 2 ? 'aged' : 'bright' }); s.scale.setScalar(0.95); });
  // helmets on stands: fan crest · transverse crest · plain, aged
  [['fan', '#9E1B1B', 'bright'], ['transverse', '#1E1A18', 'aged'], ['none', '', 'dark']].forEach(([cr, cc, mt], i) => { const x = (i - 1) * 0.85, p = grp(world, x, 0, 20);
    cyl(p, 0.035, 0.05, 1.0, '#5A4632', 0, 0, 0, { seg: 8 }); const hd = grp(p, 0, 1.0, 0); corinthHelmet(hd, { crest: cr, crestColor: cc || undefined, metal: mt }); });
  // weapons rack: dory (blade, socket, sauroter) and xiphos
  { const r = grp(world, 0, 0, 28); box(r, 2.4, 0.08, 0.3, '#6A4A30', 0, 0.75, -0.2); for (const sx of [-1, 1]) box(r, 0.08, 0.8, 0.3, '#5A3A22', sx * 1.15, 0, -0.2);
    const sp = buildWeapon('dory', {}); r.add(sp.g); sp.g.position.set(-0.05, 1.05, 0); sp.g.rotation.y = Math.PI / 2;
    const sw = buildWeapon('xiphos', {}); r.add(sw.g); sw.g.position.set(0.7, 0.92, 0.1); sw.g.rotation.set(-Math.PI / 2, 0, 0); }
  // phalanx: 3 ranks of 8, low-detail helmets (squad > 16), every man varied by seed
  squad('spartan', 24, { at: [0, -14], ry: 0, cols: 8, gap: 1.05, jitter: 0.08, seed: 7 });
  biome('farm', { density: 0.12 });
