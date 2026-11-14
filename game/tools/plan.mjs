// Floor plan of obstacles: rasterises everything the player collides with between 0.15 m and 1.7 m above a floor height
// (static collider + open doors + tree trunks) into a PNG, with a 1 m grid in Blender coordinates.
//   node game/tools/plan.mjs out.png x0 x1 y0 y1 [floorZ=0.25] [px/m=40]
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const GAME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const p = path.join(GAME, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const [out, x0, x1, y0, y1, fz = .25, ppm = 40] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=metal'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto(`http://localhost:${srv.address().port}/index.html?autostart=1&power=1&t=12`);
await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
const url = await page.evaluate(([x0, x1, y0, y1, fz, ppm]) => {
  const { game, W, THREE } = window.__game;
  for (const it of W.interactives) if (['door', 'slide'].includes(it.u.interact)) { it.target = 1; }
  for (let i = 0; i < 60; i++) game.update(.1, {});
  W.root.updateMatrixWorld(true);
  const cv = document.createElement('canvas'); cv.width = (x1 - x0) * ppm; cv.height = (y1 - y0) * ppm; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
  const X = x => (x - x0) * ppm, Y = y => (y1 - y) * ppm;          // Blender x → right, Blender y → up
  const lo = fz + .15, hi = fz + 1.7;
  const tri = (a, b, cc, col) => { const ys = [a.y, b.y, cc.y]; if (Math.max(...ys) < lo || Math.min(...ys) > hi) return;
    c.fillStyle = col; c.strokeStyle = col; c.beginPath(); c.moveTo(X(a.x), Y(-a.z)); c.lineTo(X(b.x), Y(-b.z)); c.lineTo(X(cc.x), Y(-cc.z)); c.closePath(); c.fill(); c.stroke(); };
  const draw = (geo, m, col) => { const p = geo.attributes.position, ix = geo.index, a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
    const n = ix ? ix.count : p.count; for (let i = 0; i < n; i += 3) { const g = k => ix ? ix.getX(i + k) : i + k;
      a.fromBufferAttribute(p, g(0)); b.fromBufferAttribute(p, g(1)); d.fromBufferAttribute(p, g(2)); if (m) { a.applyMatrix4(m); b.applyMatrix4(m); d.applyMatrix4(m); }
      // skip near-horizontal floor triangles
      const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize(); if (Math.abs(nrm.y) > .9 && Math.max(a.y, b.y, d.y) < lo + .2) continue;
      tri(a, b, d, col); } };
  draw(W.collider.geometry, null, '#333');
  for (const it of W.movers) if (it.bvhGeo) draw(it.bvhGeo, it.pivot.matrixWorld, '#c33');
  c.fillStyle = '#2a7'; for (const t of W.trees) { c.beginPath(); c.arc(X(t.x), Y(-t.z), t.r * ppm, 0, 7); c.fill(); }
  c.fillStyle = '#06c'; c.font = '11px sans-serif';
  for (const it of W.interactives) { if (!it.center) continue; const x = it.center.x, y = -it.center.z; if (x < x0 || x > x1 || y < y0 || y > y1) continue; c.fillText(it.name.slice(0, 14), X(x) + 2, Y(y)); c.fillRect(X(x) - 1.5, Y(y) - 1.5, 3, 3); }
  c.strokeStyle = 'rgba(0,0,0,.15)'; c.fillStyle = '#888'; c.lineWidth = 1;
  for (let x = Math.ceil(x0); x <= x1; x++) { c.beginPath(); c.moveTo(X(x), 0); c.lineTo(X(x), cv.height); c.stroke(); if (x % 2 === 0) c.fillText(x, X(x) + 1, 10); }
  for (let y = Math.ceil(y0); y <= y1; y++) { c.beginPath(); c.moveTo(0, Y(y)); c.lineTo(cv.width, Y(y)); c.stroke(); if (y % 2 === 0) c.fillText(y, 1, Y(y) - 1); }
  return cv.toDataURL('image/png');
}, [+x0, +x1, +y0, +y1, +fz, +ppm]);
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
await browser.close(); srv.close(); console.log('wrote', out);
