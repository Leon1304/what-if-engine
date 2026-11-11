ground({ color: '#6E8A46', flat: 30 });
const M = boundingMine(world, 0, 0, { scale: 1.6, t: 0.6, launch: 2.4, h: 1, xray: [0.8, 2.0] });
boundingMine(world, 0.6, 0.3, { scale: 1.2, rust: true, buried: false, t: 0.5, launch: 2.5, h: 0.9, burst: false });
callout(M.at.prongs, 1.0, { dur: 1, text: 'Prongs' });
warnSign(world, 3, 0, { kind: 'mines' }); markerFlag(world, 2.5, 0.6, { t: 4.8 });
