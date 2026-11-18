ground({ color: '#7A8A6A', flat: 60, hills: 0 });
box(world, 8, 5, 0.3, '#3A3E46', 0, 0, -0.4, { surf: 'concrete' });
stockScreen(world, 5.2, 2.9, { keys: [[0, 100], [2.8, 112], [3.4, 90], [9, 86]], news: [[3.0, 'RELEASE DELAYED', 'bad'], [7.5, 'BUYERS RETURN', 'good']], x: 0, y: 1.2, z: -0.2 });
for (let i = 0; i < 6; i++) { const q = pallet(world, -3 + (i % 3) * 1.4, 8 + Math.floor(i / 3) * 1.0, { load: 'cash', layers: 3 + (i % 3) }); appear(q, 5.3 + i * 0.4, { from: 'drop' }); }
biome('city', { density: 0.3, keep: [[0, 4, 12]] });
cinema(world, 18, 0, { lines: ['NOW SHOWING', 'BIG MOVIE'] });
for (let i = 0; i < 5; i++) gameCase(world, -1 + i * 0.16, 1.2, 5, { rx: -0.2, accent: ['#FF4FB0', '#4FC3FF', '#FF8A2A', '#B07CFF', '#4AE88A'][i] });
const ft = figure({ shirt: '#3A6EA8' }); world.add(ft.root); ft.root.position.set(0.6, 0, 5.5); holdItem(ft, gameCase(world), 0, 9, { side: 'R' });
