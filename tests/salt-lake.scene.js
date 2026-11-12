ground({ color: '#C9B48A', coast: -4, depth: 1 }); water({ level: -0.3, color: '#B4473C', shallow: '#C8563E', reflect: 0.3 });
saltCrust(world, 0, 2, { y: -0.28, r: 5 });
const b = bird({ kind: 'flamingo', x: 0.5, y: -0.25, z: 1 }); petrify(b, { t0: 2, dur: 3 });
const f = figure({ shirt: '#C8B48A' }); world.add(f.root); f.root.position.set(-1.5, 0, -5); petrify(f);
