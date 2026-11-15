  // v3.42 cover styles: a barn and a big blast next to it at 5 s (explode → SHAKES / FLASHES / explosion sound → impactTimes = [5]; the split cover's 'before' is 2.5 s)
  ground({ color: '#6E8A45', flat: 120, hills: 2 });
  barn(world, 0, 0, { ry: 0.3 });
  explode(5, 0.5, 4, 5, { size: 2.2 });
