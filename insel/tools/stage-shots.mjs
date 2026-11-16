// Screenshots, Leistungsmessung und Kamera-Tests für Stage + CameraRig (tools/stage-demo.html, headless Chromium).
//   node insel/tools/stage-shots.mjs <ausgabeordner> [nur=name1,name2] [--no-tests] [--no-bench]
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), out = path.resolve(args.find(a => !a.startsWith('--') && !a.startsWith('nur=')) || 'work/stage-shots');
const only = (args.find(a => a.startsWith('nur=')) || '').slice(4).split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const URL0 = `http://localhost:${srv.address().port}/tools/stage-demo.html?`;

// name → Abfrage. cam = x,z,abstand,yawGrad,pitchVersatzGrad
const SHOTS = {
  mittag:        't=12&cam=0,0,62,30,0',
  morgen:        't=7.2&cam=0,0,55,-40,0',
  sonnenunter:   't=17.7&cam=0,0,50,150,-20',
  daemmerung:    't=18.4&cam=0,0,58,200,-18',
  goldstunde:    't=17.3&cam=4,4,24,160,-6',
  nacht:         't=23&cam=0,0,50,30,-10',
  nacht_nah:     't=21.5&cam=6,3,12,20,0',
  fruehling:     't=10&s=0&cam=0,0,45,30,0',
  herbst:        't=15&s=2&cam=0,0,45,30,0',
  winter:        't=12&s=3&cam=0,0,45,30,0',
  regen:         't=13&w=regen&cam=0,0,30,30,0',
  gewitter:      't=16&w=gewitter&cam=0,0,40,30,0&freeze=1',
  gewitter_dunkel: 't=16&w=gewitter&cam=0,0,40,30,0&freeze=1&tt=1',
  schnee:        't=11&s=3&w=schnee&cam=0,0,28,30,0',
  nebel:         't=9&w=nebel&cam=0,0,45,30,0',
  regenbogen:    't=16.7&w=regen&w2=klar&adv=16&cam=0,0,26,52,-30',
  regenbogen_weit: 't=15&f=normal&bow=1&cam=0,0,90,60,0',
  tilt_weit:     't=11&cam=0,0,140,30,0',
  ganz_nah:      't=11&cam=7,-2,1.3,40,0',
  boden_nah:     't=16.5&cam=0,-2,2.6,180,0',
  f_gold:        't=16.8&f=gold&cam=0,0,45,30,0',
  f_film:        't=11&f=film&cam=0,0,45,30,0',
  f_sw:          't=11&f=sw&cam=0,0,45,30,0',
  f_miniatur:    't=11&f=miniatur&cam=0,0,70,30,0',
  f_nacht:       't=11&f=nacht&cam=0,0,45,30,0',
  q_niedrig:     't=12&q=niedrig&cam=0,0,62,30,0',
};
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let errors = 0;
async function open(query, vp = { width: 1280, height: 800 }, extra = {}) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, ...extra });  // extra kann deviceScaleFactor überschreiben
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { console.log(`  [${m.type()}] ${m.text()}`); if (m.type() === 'error') errors++; } });
  page.on('pageerror', e => { console.log(`  PAGE ERROR: ${e.message}`); errors++; });
  await page.goto(URL0 + query);
  await page.waitForFunction(() => window.__ready, null, { timeout: 90000 });
  return page;
}

for (const [name, query] of Object.entries(SHOTS)) {
  if (only.length && !only.includes(name)) continue;
  const page = await open(query);
  await page.evaluate(() => window.__step(40, 1 / 60));
  if (name === 'gewitter') await page.evaluate(() => { window.__setT(window.__nextFlash(5)); window.__step(1, 0); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, name + '.png') });
  console.log(`[${name}]`, JSON.stringify(await page.evaluate(() => window.__info())));
  await page.close();
}

const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) errors++; };
if (!args.includes('--no-tests')) {
  console.log('--- Kamera-Tests');
  const page = await open('t=12&cam=0,0,40,30,0&freeze=1');
  await page.evaluate(() => window.__step(60));
  // 1) Zoom zum Mauszeiger: Bodenpunkt unter dem Zeiger bleibt dort
  const P = await page.evaluate(() => { const [x, y] = [900, 520]; const ndc = [x / innerWidth * 2 - 1, -(y / innerHeight * 2 - 1)]; const p = window.__rig.pick(ndc[0], ndc[1], window.__rig.c); return p && p.toArray(); });
  await page.mouse.move(900, 520);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(30); }
  await page.evaluate(() => window.__step(240));
  const s2 = await page.evaluate(([x, y, z]) => window.__project(x, y, z), P);
  const d2 = await page.evaluate(() => window.__rig.distance);
  ok(Math.hypot(s2[0] - 900, s2[1] - 520) < 14 && d2 < 30, `Zoom zum Zeiger: Punkt jetzt bei ${s2.map(v => v.toFixed(0))} (soll 900,520), Abstand 40 → ${d2.toFixed(1)}`);
  // 2) Tippen vs. Ziehen
  await page.evaluate(() => window.__events.taps.length = 0);
  await page.mouse.move(640, 400); await page.mouse.down(); await page.mouse.move(643, 402); await page.mouse.up();
  const t0 = await page.evaluate(() => [window.__events.taps.length, window.__rig.target.toArray()]);
  await page.mouse.move(640, 400); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(640 + i * 12, 400 + i * 4);
  await page.mouse.up();
  await page.evaluate(() => window.__step(30));
  const t1 = await page.evaluate(() => [window.__events.taps.length, window.__rig.target.toArray()]);
  ok(t0[0] === 1, `Tippen (< 6 px) löst onTap aus (${t0[0]}×)`);
  ok(t1[0] === 1 && Math.hypot(t1[1][0] - t0[1][0], t1[1][2] - t0[1][2]) > 1, `Ziehen schiebt (${Math.hypot(t1[1][0] - t0[1][0], t1[1][2] - t0[1][2]).toFixed(1)} m) ohne Tap`);
  // 2b) Schieben folgt dem Zeiger: gegriffener Bodenpunkt bleibt unter der Maus
  const G = await page.evaluate(() => { const r = window.__rig, p = r._pickCur(0, 0); return p.toArray(); });
  await page.mouse.move(640, 400); await page.mouse.down(); for (let i = 1; i <= 8; i++) await page.mouse.move(640 - i * 15, 400 + i * 10); await page.mouse.up();
  const g2 = await page.evaluate(([x, y, z]) => window.__project(x, y, z), G);
  ok(Math.hypot(g2[0] - 520, g2[1] - 480) < 6, `Schieben 1:1 – Punkt unter Zeiger bei ${g2.map(v => v.toFixed(0))} (soll 520,480)`);
  // 3) Rechts ziehen dreht
  const y0 = await page.evaluate(() => window.__rig.goal.yaw);
  await page.mouse.move(640, 400); await page.mouse.down({ button: 'right' }); for (let i = 1; i <= 6; i++) await page.mouse.move(640 + i * 20, 400); await page.mouse.up({ button: 'right' });
  const y1 = await page.evaluate(() => window.__rig.goal.yaw);
  ok(Math.abs(y1 - y0) > .3, `Rechts ziehen dreht (yaw ${y0.toFixed(2)} → ${y1.toFixed(2)})`);
  // 4) Tastatur
  const k0 = await page.evaluate(() => window.__rig.goal.t.toArray());
  await page.keyboard.down('KeyW'); await page.evaluate(() => window.__step(30)); await page.keyboard.up('KeyW');
  await page.keyboard.down('Equal'); await page.evaluate(() => window.__step(20)); await page.keyboard.up('Equal');
  const k1 = await page.evaluate(() => [window.__rig.goal.t.toArray(), window.__rig.goal.d]);
  ok(Math.hypot(k1[0][0] - k0[0], k1[0][2] - k0[2]) > 1, `W schiebt (${Math.hypot(k1[0][0] - k0[0], k1[0][2] - k0[2]).toFixed(1)} m), + zoomt (d ${k1[1].toFixed(1)})`);
  // 5) Kollision: hinter ein Haus stellen, Kamera darf nicht im Haus/hinter der Wand landen
  const col = await page.evaluate(() => {
    const T = window.__THREE, r = window.__rig, hs = window.__houses(), base = hs[0], g = base.geometry; g.computeBoundingBox();
    // Hausmitte suchen: erste Box-Ecke reicht nicht → Strahl von oben auf ein Haus über die Bounding-Box aller Häuser
    const pos = g.attributes.position; let best = null;
    for (let i = 0; i < pos.count; i += 97) { const y = pos.getY(i); if (!best || y > best[1]) best = [pos.getX(i), y, pos.getZ(i)]; }
    const res = [];
    for (let k = 0; k < 8; k++) {
      const yaw = k * Math.PI / 4, tx = best[0] + Math.sin(yaw) * -3.2, tz = best[2] + Math.cos(yaw) * -3.2;   // Ziel vor dem Haus, Kamera dahinter
      r.jumpTo(new T.Vector3(tx, 0, tz), 9, yaw, -.35); window.__step(5);
      const cam = window.__stage.camera.position, t = r.target.clone(); t.y += .2;
      const dir = cam.clone().sub(t), L = dir.length(); dir.normalize();
      const rc = new T.Raycaster(t, dir, .05, L - .02), hit = rc.intersectObjects([...hs, ...window.__stage.scene.children.filter(o => o.isMesh && o.geometry.attributes.sway && o.material.type === 'MeshStandardMaterial' && o !== base)], false);
      const gy = window.__ground(cam.x, cam.z);
      res.push({ L: +L.toFixed(2), d: +r.camDistance.toFixed(2), clear: hit.filter(h => hs.includes(h.object)).length === 0, above: !(cam.y < gy + .24) });
    }
    return res;
  });
  ok(col.every(c => c.clear && c.above), `Kollision: Sicht Ziel→Kamera frei & über Boden in 8 Richtungen ${JSON.stringify(col.map(c => c.d))}`);
  ok(col.some(c => c.d < 8.5), `Kollision zieht Kamera vor das Haus (mind. eine Richtung verkürzt)`);
  // 6) Ganz nah am Boden: Mindesthöhe
  const low = await page.evaluate(() => { const T = window.__THREE, r = window.__rig; const res = [];
    for (let i = 0; i < 12; i++) { const x = (i - 6) * 3.1, z = (i % 3 - 1) * 4.3; r.jumpTo(new T.Vector3(x, 0, z), 1.2, i, -1); window.__step(3); const c = window.__stage.camera.position; res.push(+(c.y - window.__ground(c.x, c.z)).toFixed(3)); } return res; });
  ok(low.every(h => !Number.isFinite(h) || h >= .249), `Mindesthöhe 0,25 m über Boden ganz nah: ${low.join(', ')}`);
  // 7) flyTo + serialize/restore
  const fl = await page.evaluate(async () => { const T = window.__THREE, r = window.__rig; const p = r.flyTo(new T.Vector3(10, 0, -5), 8, 1); for (let i = 0; i < 200 && r.flying; i++) window.__step(1); const done = await p;
    const s = r.serialize(); r.jumpTo(new T.Vector3(0, 0, 0), 50, 0); r.restore(s); return [done, s, r.serialize()]; });
  ok(fl[0] === true && JSON.stringify(fl[1]) === JSON.stringify(fl[2]) && Math.abs(fl[1].x - 10) < .01, `flyTo kommt an, serialize/restore gleich ${JSON.stringify(fl[1])}`);
  // 8) Grenzen
  const bd = await page.evaluate(() => { const r = window.__rig; for (let i = 0; i < 300; i++) { r.goal.t.x += 2; window.__step(1); } return Math.hypot(r.target.x, r.target.z); });
  ok(bd < 6 * 3.5 * Math.sqrt(3) + .1, `setBounds hält Ziel über der Insel (r = ${bd.toFixed(1)})`);
  // 9) capture
  const cap = await page.evaluate(() => { const a = window.__stage.capture(2); return [a.length, a.slice(0, 22), window.__stage.renderer.domElement.width]; });
  ok(cap[1] === 'data:image/png;base64,' && cap[0] > 100000 && cap[2] === 1280, `capture(2): PNG ${(cap[0] / 1e6).toFixed(1)} MB, Leinwand danach wieder ${cap[2]} px`);
  fs.writeFileSync(path.join(out, 'capture_x2.png'), Buffer.from((await page.evaluate(() => window.__stage.capture(2))).split(',')[1], 'base64'));
  await page.close();

  // 10) Touch: ein Finger schieben, zwei Finger Pinch + Drehen (CDP-Touch-Events)
  const tp = await open('t=12&cam=0,0,40,30,0&freeze=1', { width: 900, height: 700 }, { hasTouch: true });
  const cdp = await tp.context().newCDPSession(tp);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
  const z0 = await tp.evaluate(() => [window.__rig.goal.d, window.__rig.goal.yaw]);
  await touch('touchStart', [[350, 350], [550, 350]]);
  for (let i = 1; i <= 10; i++) { const a = i * .03, r = 100 + i * 12; await touch('touchMove', [[450 - Math.cos(a) * r, 350 - Math.sin(a) * r], [450 + Math.cos(a) * r, 350 + Math.sin(a) * r]]); }
  await touch('touchEnd', []);
  const z1 = await tp.evaluate(() => [window.__rig.goal.d, window.__rig.goal.yaw]);
  ok(z1[0] < z0[0] * .7 && Math.abs(z1[1] - z0[1]) > .15, `Pinch zoomt (${z0[0].toFixed(1)} → ${z1[0].toFixed(1)}) und dreht (${z0[1].toFixed(2)} → ${z1[1].toFixed(2)})`);
  await tp.evaluate(() => window.__events.taps.length = 0);
  await touch('touchStart', [[450, 350]]); await touch('touchEnd', []);
  const tt = await tp.evaluate(() => window.__events.taps.length);
  ok(tt === 1, `Tippen mit dem Finger → onTap (${tt}×)`);
  await tp.close();
}

if (!args.includes('--no-bench')) {
  console.log('--- Leistung: ms/Bild (Durchsatz, n Bilder + 1× warten), rAF-Takt; 1440×900 bei Pixelfaktor 2 wie MacBook');
  for (const [label, q] of [['hoch, 37 Kacheln', 'q=hoch&n=3'], ['hoch, 331 Kacheln', 'q=hoch&n=10'], ['mittel, 331 Kacheln', 'q=mittel&n=10'], ['niedrig, 331 Kacheln', 'q=niedrig&n=10'],
    ['hoch, 331, Regen', 'q=hoch&n=10&w=regen'], ['hoch, 331, Nacht', 'q=hoch&n=10&t=23'], ['mittel, 331, nah 8 m', 'q=mittel&n=10&cam=5,5,8,30,0']]) {
    const page = await open((q.includes('cam=') ? q : q + '&cam=0,0,90,30,0'), { width: 1440, height: 900 }, { deviceScaleFactor: 2 });
    const r = await page.evaluate(async () => { window.__bench(20); const ms = window.__bench(120); const g = await window.__gpu(90); return { gpu: ms, frame: g ? g.frame : 0 }; }), info = await page.evaluate(() => window.__info());
    // nur die Bühne: Welt ausblenden
    const r2 = await page.evaluate(() => { for (const o of window.__stage.scene.children) if (o.isMesh && !o.isInstancedMesh && o.material.type === 'MeshStandardMaterial') o.visible = false; window.__bench(20); return { gpu: window.__bench(120) }; });
    const cpu = await page.evaluate(() => { const a = performance.now(); for (let i = 0; i < 200; i++) { window.__rig.update(1 / 60); window.__stage.setFocus(window.__rig.target, window.__rig.distance); window.__stage.update(1 / 60, i / 60); } return (performance.now() - a) / 200; });
    console.log(`${label.padEnd(24)} ${r.gpu.toFixed(2)} ms · nur Bühne ${r2.gpu.toFixed(2)} ms · CPU update ${cpu.toFixed(3)} ms · Takt ${r.frame.toFixed(1)} ms · ${(info.tris / 1000).toFixed(0)}k Dreiecke, ${info.calls} Aufrufe`);
    await page.close();
  }
}
await browser.close(); srv.close();
console.log(errors ? `ERRORS: ${errors}` : 'STAGE OK');
process.exit(errors ? 1 : 0);
