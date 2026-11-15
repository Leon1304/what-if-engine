  ground({ color: '#9AAE78', flat: 300, hills: 0 });
  const bad = m => console.error('life: ' + m);
  const P = (x, z, o = {}) => { const f = figure({ skin: '#D9A47E', ...o }); world.add(f.root); f.root.position.set(x, 0, z); f.root.rotation.y = o.ry ?? 0; return f; };
  // 1) close-up: a scene tick poses her with a fixed time (used to freeze everything) — she still breathes, blinks, shifts and looks round; arms relaxed, elbows bent
  const g = P(0, 0, { shirt: '#F28C28', pants: '#3A6EA5', hairStyle: 'bun', hair: 'black', seed: 4 });
  tick(t => { pose(g, 'idle', 1, 1); });
  // 1b) clothing detail (tailor): builds, sleeves, coat, hoodie, jacket, dress, detail: 1 (old plain look) for comparison
  [['man', {}], ['woman', { shirt: '#C8324A' }], ['heavy', { shirt: '#5A8A3C' }], ['kid', { shirt: '#E3B23C' }], ['slim', { sleeves: 'short', shirt: '#2AA8B8' }], ['man', { coat: true, shirt: '#E8E8E4' }],
    ['man', { top: 'hoodie', shirt: '#5A6170' }], ['man', { jacket: true, shirt: '#56613A' }], ['woman', { dress: '#8A4AD9' }], ['man', { detail: 1, shirt: '#3D7BD9' }]].forEach(([b, x], i) => P(-14 + i * 0.6, (i % 2) * 0.4, { build: b, seed: 20 + i, ...x }));
  // 2) reactions in a row (react kinds of v3.42) with a look / point target up in the sky
  const SKYP = [12, 9, -14];
  ['lookUp', 'point', 'gasp', 'cover', 'cower', 'cheer', 'stumble'].forEach((k, i) => { const f = P(8 + i * 1.3, 0, { shirt: ['#3D7BD9', '#D94F3D', '#3DA56A', '#E3B23C', '#8A4AD9', '#2AA8B8', '#5A6170'][i], seed: 10 + i });
    react(f, 2.9, k, { at: SKYP, dur: 2.0 }); });
  // 3) a crowd that stares up (staggered), some point, some gasp
  const spots = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) spots.push([24 + i * 1.1, -2 + j * 1.1, 0]);
  horde({ kind: 'human', spots, gaze: { t: 5.0, at: [30, 14, 30], spread: 1.0, point: 0.3, gasp: 0.2 } });
  // 4) attention: two bystanders turn to an explosion; a third flees from it
  const a = P(48, 2, { shirt: '#3DA56A', ry: 0.3 }), b = P(51, 2, { shirt: '#D94F3D', ry: -0.4 }), c = P(50, 0, { shirt: '#E3B23C' });
  a.tag = 'bysA'; g.tag = 'still';
  explode(55, 0, -12, 7.3, { size: 1.2 });
  react(c, 7.5, 'flee', { from: [55, -12], dist: 14 });
  // checks: the frozen-time pose still moves, attention turns heads
  DEFER.push(() => { if (typeof _attnAt !== 'function') bad('attention missing'); });
