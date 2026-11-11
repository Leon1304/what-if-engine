  ground({ color: '#8FA860', flat: 200, hills: 0 });
  const K = ['pizza', 'slice', 'burger', 'fries', 'hotdog', 'taco', 'sushi', 'ramen', 'cake', 'cupcake', 'donut', 'icecream', 'popcorn', 'apple', 'orange', 'banana', 'watermelon', 'grapes', 'carrot', 'strawberry',
    'bread', 'baguette', 'croissant', 'pretzel', 'cheese', 'cookie', 'chocolate', 'candy', 'lollipop', 'steak', 'drumstick', 'egg', 'pancakes', 'sandwich', 'cup', 'can', 'mug', 'glass', 'bottle', 'milkshake'];
  for (let g = 0; g < 5; g++) { const tb = stat(grp(world, g * 4, 0, 0)); box(tb, 1.5, 0.74, 0.8, '#8A5A34', 0, 0, 0); for (let i = 0; i < 8; i++) food(world, K[g * 8 + i], g * 4 - 0.54 + (i % 4) * 0.36, 0.74, -0.18 + Math.floor(i / 4) * 0.36); }
  const tb3 = stat(grp(world, 20, 0, 0)); box(tb3, 1.5, 0.74, 0.8, '#8A5A34', 0, 0, 0);
  food(world, 'burger', 19.5, 0.74, -0.15, { state: 'burnt' }); food(world, 'apple', 19.85, 0.74, -0.15, { state: 'frozen' }); food(world, 'bread', 20.2, 0.74, -0.15, { state: 'moldy' }); food(world, 'icecream', 20.5, 0.74, -0.15, { state: 'melting', t0: 0 }); food(world, 'pizza', 19.9, 0.74, 0.2, { state: 'bitten', ry: Math.PI }); food(world, 'cake', 20.4, 0.74, 0.2, { scale: 0.8 });
  const a = figure({ shirt: '#3D7BD9', skin: '#E8B48A', expr: 'happy' }); world.add(a.root); a.root.position.set(0, 0, 12); const B = food(world, 'burger', 0.35, 0.74, 12.45); const tb4 = stat(grp(world, 0.1, 0, 12.55)); box(tb4, 0.9, 0.74, 0.5, '#8A5A34', 0, 0, 0);
  eat(a, B, 1.0, { bites: 3, every: 1.1 }); const c = food(world, 'can', -0.2, 0.74, 12.45, { color: '#D8342A' }); drink(a, c, 5.0, { sips: 1 });
  const b = figure({ shirt: '#D94F3D', skin: '#F1C7A5' }); world.add(b.root); b.root.position.set(30, 0, 0); b.root.rotation.y = Math.PI / 2;
  const d = figure({ shirt: '#3DA56A', skin: '#D9A47E' }); world.add(d.root); d.root.position.set(34, 0, 0); d.root.rotation.y = -Math.PI / 2;
  foodFight(b, d, 2.0, { kind: 'pie' });
  const st = stat(grp(world, 40, 0, 0)); box(st, 2.4, 0.9, 0.6, '#E8E6E2', 0, 0, 0);
  pan(world, 39.3, 0.9, 0, { item: 'egg', t0: 0, flip: [6.5] }); pot(world, 40, 0.9, 0, { t0: 0, boil: 1, over: 6.3 }); toaster(world, 39.9, 0.9, 0.35, { pop: 6.45 });
  grill(world, 50, 0, { t0: 0, flare: [7.6] }); const cf = campfire(world, 53, 0, { t0: 0 }); const m = figure({ shirt: '#F28A1A', skin: '#F1C7A5', expr: 'happy' }); world.add(m.root); m.root.position.set(53.2, 0, 1.3); marshmallow(m, cf, { t0: 0.5, t1: 11, burn: 8.6 });
  foodtruck(world, 70, 0, { ry: -Math.PI / 2 + 0.6 }); counter(world, 80, 0, { kind: 'fastfood', staff: true }); counter(world, 86, 0, { kind: 'bakery' }); shelf(world, 92, 0, { kind: 'grocery' }); shelf(world, 95, 0, { kind: 'produce' }); buffet(world, 100, 0, {});
