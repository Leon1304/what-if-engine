  ground({ color: '#8FA860', flat: 400, hills: 0 });
  house(world, -16, -14, { w: 6, d: 5 }); house(world, -6, -16, { w: 5, d: 4, ry: 0.15 }); house(world, 6, -15, { w: 6, d: 5, ry: -0.1 });
  house(world, 16, -12, { w: 5, d: 4, ry: -0.3 }); house(world, -12, 2, { w: 5, d: 4, ry: Math.PI }); house(world, 10, 3, { w: 6, d: 5, ry: Math.PI });
  meteor({ from: [80, 140, -220], to: [0, 0, -40], t0: 3.5, t1: 6.2, size: 2 });   // lands behind the houses at 6.2 s (SHAKES)
