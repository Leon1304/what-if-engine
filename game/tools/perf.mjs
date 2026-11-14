// Performance check: renders N frames at several spots (day / night) and prints frame time, draw calls, triangles, lights.
//   node game/tools/perf.mjs [quality]      quality = hoch | mittel | niedrig (default mittel)
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const GAME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const p = path.join(GAME, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
await page.addInitScript(q => { try { localStorage.setItem('waldtank_quality', q); } catch { } }, process.argv[2] || 'mittel');
await page.goto(`http://localhost:${srv.address().port}/index.html?autostart=1`);
await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
const spots = [['Auto (Start)', 'spawn', 0], ['Vorplatz', [8, -16], 40], ['Laden innen', [26, -6, .25], 90], ['Wald / Bach', [48, 20], 200], ['Hochsitz', [58, 48], 30], ['Wohnwagen', [-40, -36], 250]];
const out = await page.evaluate(async spots => {
  const { game, player, W, renderer, scene, camera, B } = window.__game; const res = [];
  const gl = renderer.getContext();
  for (const night of [false, true]) {
    game.S.time = night ? 22 : 15; if (night) { game.S.flags.flashOn = true; game.S.battery = 100; }
    for (const [name, at, yawDeg] of spots) {
      let p; if (at === 'spawn') p = W.spots.spawn.pos.clone().setY(W.spots.spawn.pos.y - 1.6);
      else { p = B(at[0], at[1], 0); p.y = at[2] !== undefined ? B(0, 0, at[2]).y : W.groundY(p.x, p.z, 3) + .02; }
      player.setPose(p, yawDeg * Math.PI / 180);
      W.cull?.(camera.position); let n = 0; const draw = () => { renderer.shadowMap.needsUpdate = (n++ & 1) === 0; renderer.render(scene, camera); };
      for (let i = 0; i < 20; i++) { game.update(1 / 60, {}); draw(); }
      gl.finish(); const N = 240, t0 = performance.now();
      for (let i = 0; i < N; i++) { game.update(1 / 60, {}); draw(); }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      const ms = (performance.now() - t0) / N; const i = renderer.info.render;
      let lights = 0; scene.traverse(o => { if (o.isLight && o.visible && o.intensity > 0) lights++; });
      res.push(`${night ? 'Nacht' : 'Tag  '} ${name.padEnd(13)} ${ms.toFixed(1).padStart(5)} ms  calls ${String(i.calls).padStart(4)}  tris ${(i.triangles / 1000).toFixed(0).padStart(5)}k  lights ${lights}`);
    }
  }
  const mem = renderer.info.memory; res.push(`geometries ${mem.geometries}  textures ${mem.textures}  programs ${renderer.info.programs.length}`);
  return res;
}, spots);
console.log(out.join('\n'));
await browser.close(); srv.close();
