// Visibility check for everything you can pick up or search: from places where the player can actually stand (capsule free,
// 0.8 … 2.4 m away, standing and crouching eye height) rays go to points on the object; anything in between (shelf goods,
// cartons, furniture – visual meshes, not just colliders) hides it. Fails when an object is hidden from every viewpoint.
//   node game/tools/pickups.mjs [--shots dir]        → PICKUPS OK
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const GAME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const p = path.join(GAME, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
await page.goto(`http://localhost:${srv.address().port}/index.html?autostart=1&t=12&power=1`);
await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
const res = await page.evaluate(async () => {
  const { game, player, W, scene, THREE } = window.__game;
  const { computeBoundsTree, acceleratedRaycast } = await import('three-mesh-bvh');
  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree; THREE.Mesh.prototype.raycast = acceleratedRaycast;
  for (const it of W.interactives) if (['door', 'slide', 'lid', 'drawer'].includes(it.u.interact)) { it.target = 1; }     // open everything (doors, fridges, lids)
  for (let i = 0; i < 120; i++) game.update(1 / 30, {});
  scene.updateMatrixWorld(true);
  const occ = []; scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && o.visible !== false && !(o.material?.transparent) && o.geometry) { if (!o.geometry.boundsTree && !o.isInstancedMesh) o.geometry.computeBoundsTree(); if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); occ.push(o); } });
  const rc = new THREE.Raycaster(); rc.firstHitOnly = true;
  const out = [];
  for (const it of W.interactives) {
    if (!['pickup', 'search'].includes(it.u.interact) || !it.center) continue;
    const own = new Set(); it.node.traverse(m => { if (m.isMesh) own.add(m); });
    const pts = []; it.node.traverse(m => { if (!m.isMesh) return; const pa = m.geometry.attributes.position, na = m.geometry.attributes.normal, step = Math.max(1, Math.floor(pa.count / 16));
      const nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);
      for (let i = 0; i < pa.count; i += step) pts.push({ p: new THREE.Vector3().fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld), n: na ? new THREE.Vector3().fromBufferAttribute(na, i).applyMatrix3(nm).normalize() : null }); });
    const c = it.center; let best = 0, bestEye = null;
    const near = occ.filter(o => !own.has(o) && !o.isInstancedMesh &&
      o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld).distanceTo(c) < o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() + 4);
    for (const d of [.8, 1.3, 1.9, 2.4]) for (let a = 0; a < 6.283; a += .3927) {
      const fx = c.x + Math.cos(a) * d, fz = c.z + Math.sin(a) * d, fy = W.groundY(fx, fz, c.y + .35);
      if (fy < c.y - 2.3 || fy > c.y + .4) continue;
      const foot = new THREE.Vector3(fx, fy + .02, fz); if (!player.free(foot)) continue;
      for (const eh of [1.62, 1.0]) {
        const eye = new THREE.Vector3(fx, fy + eh, fz); let vis = 0, n = 0;
        for (const { p, n: nn } of pts) { const dir = p.clone().sub(eye), L = dir.length(); if (nn && nn.dot(dir) > 0) continue;      // back side: not visible anyway
          n++; rc.set(eye, dir.normalize()); rc.far = L - .015; if (!rc.intersectObjects(near, false).length) vis++; }
        if (n < 3) continue; const f = vis / n; if (f > best) { best = f; bestEye = eye.toArray().map(v => +v.toFixed(2)); }
      }
      if (best > .8) break;
    }
    out.push({ name: it.name, label: it.label, best: +best.toFixed(2), eye: bestEye, c: c.toArray().map(v => +v.toFixed(2)) });
  }
  return out;
});
const bad = res.filter(r => r.best < .5);
for (const r of res.sort((a, b) => a.best - b.best).slice(0, 25)) console.log(`${r.best.toFixed(2)}  ${r.name.padEnd(28)} ${r.label}`);
console.log(`${res.length} objects checked, ${bad.length} hidden`);
const si = process.argv.indexOf('--shots');
if (si > 0) {
  const dir = process.argv[si + 1]; fs.mkdirSync(dir, { recursive: true });
  const only = process.argv[process.argv.indexOf('--shots') + 2];
  for (const r of res.filter(r => r.eye && (!only || only.split(',').includes(r.name))).sort((a, b) => a.best - b.best).slice(0, 12)) {
    await page.evaluate(([eye, c]) => { const { player, THREE } = window.__game; const e = new THREE.Vector3(...eye), t = new THREE.Vector3(...c);
      player.setPose(new THREE.Vector3(e.x, e.y - 1.62, e.z), Math.atan2(-(t.x - e.x), -(t.z - e.z))); player.eyeH = player.eye = e.y - player.pos.y;
      player.pitch = Math.atan2(t.y - e.y, Math.hypot(t.x - e.x, t.z - e.z)); player.sync(); }, [r.eye, r.c]);
    await page.waitForTimeout(300); await page.screenshot({ path: path.join(dir, r.name + '.png') });
  }
}
await browser.close(); srv.close();
console.log(bad.length ? 'PICKUPS: ' + bad.map(b => b.name).join(', ') : 'PICKUPS OK');
process.exit(bad.length ? 1 : 0);
