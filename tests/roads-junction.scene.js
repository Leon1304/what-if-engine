  // vNEXT roads: junctions without z-fighting (world-space asphalt, one depth order per road colour), markings with gaps at crossings and zebras,
  // zebras / manholes only where a road continues, sidewalk paving inside a real kerb, terrain flattened under roads beyond ground({ flat }),
  // snow with tyre tracks per lane, light pools projected in the surface shaders (no draped mesh)
  ground({ color: '#5C7A3C', flat: 30, hills: 9 });
  city({ nx: 2, nz: 2, at: [0, 0], hmin: 8, hmax: 16, backdrop: false });
  road(world, [[20, 4], [70, 8], [120, 30], [150, 70]], { w: 7, color: '#45464C' });   // leaves the city, runs into the hills (different colour: depth order)
  road(world, [[70, -40], [70, 60]], { w: 6 });   // crosses the country road out in the hills
  snowCover(6, 9, 1, { rise: 0.01 });
  streetlight(world, 66, 12, Math.PI / 2);
