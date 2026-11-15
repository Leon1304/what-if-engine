// The two maps in one world: the forest valley „Nordwald“ (y −110 … 230) and the mountains „Steinberg“ (y 900 … 1160, far north,
// built by game/blender/s14_gebirge.py). Values mirror game/blender/core.py (Blender coordinates: x east, y north).
// The car takes you over the pass (barrier at the north end of the road) – game.travel() swaps the region.
export const REGIONS = {
  tal: { x0: -110, x1: 110, y0: -110, y1: 230, name: 'Nordwald' },
  berg: { x0: -120, x1: 120, y0: 900, y1: 1160, name: 'Steinberg' },
};
export const regionOf = by => by > 600 ? 'berg' : 'tal';
export const PASS = { x: -63.6, y: 222 };             // barrier across the road (north end of the valley)
export const BERG_IN = 904;                            // driving south past this line in the mountains = back to the valley

const BERG_ROAD = [[0, 896], [0, 935], [-22, 958], [-46, 974], [-40, 991], [-4, 1006], [32, 1023], [40, 1041], [16, 1059], [-10, 1074], [-24, 1089]];
function chaikin(pts, it = 3) {
  for (let k = 0; k < it; k++) { const q = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; q.push([.75 * ax + .25 * bx, .75 * ay + .25 * by], [.25 * ax + .75 * bx, .25 * ay + .75 * by]); } q.push(pts[pts.length - 1]); pts = q; }
  return pts;
}
export const BERG_ROAD_S = chaikin(BERG_ROAD);
export const BERG_TRAILS = [[[-18, 1105], [-2, 1111], [6, 1121], [22, 1123], [32, 1131], [49, 1135]], [[37, 1021], [55, 1016], [70, 1010]], [[-45, 993], [-55, 1004], [-62, 1018], [-61, 1026]]];
export function polyDist(x, y, pts) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
    const t = L2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2)) : 0;
    best = Math.min(best, Math.hypot(x - ax - t * vx, y - ay - t * vy));
  }
  return best;
}
export const bergRoadDist = (x, y) => polyDist(x, y, BERG_ROAD_S);
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const bergBase = y => 34 * sstep(930, 1105, y);
// water bodies: deep water (more than 1.1 m) cannot be waded – the rowing boat crosses the forest lake
export const LAKES = [{ x: -86, y: 18, z: -.55, r: 22, name: 'See' }, { x: -70, y: 1030, z: bergBase(1030) - .3, r: 11.5, name: 'Bergsee' }];
export const ISLAND = { x: -90, y: 17 };
