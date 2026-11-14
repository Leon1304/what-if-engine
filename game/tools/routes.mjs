// Walkability check: the player physically walks (W key, real collision) along routes through doors, rooms and the map.
// Fails when the player gets stuck (something in the way) – catches furniture in front of doors, too narrow gaps etc.
//   node game/tools/routes.mjs            (all doors open, power on)
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const GAME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const p = path.join(GAME, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
let errors = 0; page.on('pageerror', e => { console.log('PAGE ERROR', e.message); errors++; });
await page.goto(`http://localhost:${srv.address().port}/index.html?autostart=1&power=1&t=12`);
await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
// Blender (x, y) waypoints; optional z = start on that floor height
export const ROUTES = [
  ['Hintertür (Stufe) → Lager → Büro', [[39.4, -4.1], [36.2, -4.1], [34.3, -2.0], [34.3, 0.5], [35.0, 2.2], [35.0, 4.0], [35.0, 6.0]]],
  ['Büro → Personaltür → Laden', [[35.4, 5.9, .25], [33.8, 5.9], [32.2, 5.9], [30.5, 5.0]]],
  ['Schiebetür → hinter die Kasse → Kühlschränke', [[18.5, 0], [21.5, 0], [23.0, 3.5], [30.0, 4.2], [30.0, 7.5], [25.0, 7.8], [30.0, 7.5], [30.0, 4.2], [30.9, -5.0]]],
  ['Laden → WC', [[27.0, -4.0, .25], [29.9, -5.6], [29.9, -7.4], [31.0, -8.5]]],
  ['Gänge zwischen den Regalen', [[23.0, -7.5, .25], [23.0, 4.0], [30.8, 4.6], [30.8, -6.0], [23.0, -6.0], [23.0, -3.0], [30.8, -3.0], [30.8, 0.7], [23.0, 0.7]]],
  ['Vorplatz um die Zapfsäulen', [[3.0, -14], [3.0, 14], [10.0, 14], [10.0, -14], [17.0, -14], [17.0, 14]]],
  ['Bordstein → Gehweg → Schiebetür', [[16.0, 0], [19.0, 0], [21.6, 0]]],
  ['Ums Gebäude → Hintertür', [[30.0, 16.0], [42.5, 16.0], [42.5, 7.0], [40.5, 3.0], [38.4, 0.0], [38.4, -3.2], [38.9, -4.1]]],
  ['Hof → Schuppen → Dieselfass', [[40.0, -9.0], [41.5, -15.0], [44.0, -15.0], [44.0, -13.0], [44.0, -12.3]]],
  ['Wohnwagen: Stufen → Tür → vor das Bett', [[-48.6, -41.89], [-47.63, -41.63], [-46.81, -41.41], [-45.99, -41.19], [-46.05, -39.81], [-46.23, -39.13]]],
];
const res = await page.evaluate(async routes => {
  const { game, player, W, B, THREE } = window.__game;
  for (const it of W.interactives) if (['door', 'slide'].includes(it.u.interact)) { it.target = 1; }
  for (let i = 0; i < 60; i++) game.update(.1, {});
  const pt = w => {
    const v = B(w[0], w[1], 0); return { x: v.x, z: v.z, fz: w[2] };
  };
  const out = [];
  for (const [name, wps] of routes) {
    const pts = wps.map(pt);
    // door-relative points: step outward from the caravan's centre through the door
    const s = pts[0], st = new THREE.Vector3(s.x, 0, s.z); st.y = s.fz !== undefined ? B(0, 0, s.fz).y : W.groundY(s.x, s.z, 3) + .02;
    if (s.fz === undefined && st.y < -50) st.y = W.groundY(s.x, s.z, 60);
    player.setPose(st, 0); let fail = null;
    for (let k = 1; k < pts.length && !fail; k++) {
      const t = pts[k]; let best = 1e9, still = 0;
      for (let f = 0; f < 30 * 25; f++) {
        const dx = t.x - player.pos.x, dz = t.z - player.pos.z, d = Math.hypot(dx, dz);
        if (d < .35) break;
        player.yaw = Math.atan2(-dx, -dz); player.keys = { KeyW: true }; player.update(1 / 30, game); game.update(1 / 30, {});
        if (d < best - .05) { best = d; still = 0; } else if (++still > 45) { const bp = [player.pos.x, -player.pos.z, player.pos.y]; fail = `hängt bei Blender (${bp.map(v => v.toFixed(2)).join(', ')}) auf dem Weg zu Punkt ${k} (${t.x.toFixed(1)}, ${(-t.z).toFixed(1)}), noch ${d.toFixed(2)} m`; break; }
      }
    }
    player.keys = {};
    out.push([name, fail]);
  }
  return out;
}, ROUTES);
let ok = true;
for (const [n, f] of res) { console.log(`${f ? '✗' : '✓'} ${n}${f ? ': ' + f : ''}`); if (f) ok = false; }
await browser.close(); srv.close();
console.log(ok && !errors ? 'ROUTES OK' : 'ROUTES FAILED'); process.exit(ok && !errors ? 0 : 1);
