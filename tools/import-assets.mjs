// Imports CC0 asset packs (FBX / glTF) as compact GLBs into assets/<pack>/<name>.glb + assets/index.json.
// Runs three.js' own loaders and GLTFExporter in headless Chromium (playwright), so no Blender is needed.
//   node tools/import-assets.mjs [packsDir=~/Downloads/quaternius] [--only pack1,pack2] [--dry]
// --dry prints sizes (to pick a pack's scale) without writing. Only packs listed in PACKS below are imported:
// every one is CC0 (Quaternius, Kay Lousberg / KayKit). Packs that forbid redistribution must never be added here.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
// needs (one-off tool, not in package.json): npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 sharp
const gio = new NodeIO().registerExtensions(ALL_EXTENSIONS);
// shrink: textures ≤ 512 px (colour atlases and PBR maps of these packs don't need more), positions/normals quantised (KHR_mesh_quantization, read by GLTFLoader)
const shrink = async (buf, tex = 512) => { const d = await gio.readBinary(new Uint8Array(buf));
  await d.transform(dedup(), prune(), quantize({ quantizePosition: 14, quantizeNormal: 10 }), textureCompress({ encoder: sharp, resize: [tex, tex] }));
  return Buffer.from(await gio.writeBinary(d)); };

const argv = process.argv.slice(2), flag = k => argv.includes('--' + k), opt = k => { const i = argv.indexOf('--' + k); return i > -1 ? argv[i + 1] : null; };
const SRC = argv[0] && !argv[0].startsWith('--') ? argv[0] : path.join(os.homedir(), 'Downloads/quaternius');
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), OUT = path.join(REPO, 'assets');
const THREE_DIR = path.join(REPO, 'node_modules/three');

// pack: folder (in SRC), sub-folder with the models, ext, scale (→ metres), author, url. anim: rigged + clips (use with model()).
const QUAT = 'Quaternius (CC0 1.0)', KAY = 'Kay Lousberg / KayKit (CC0 1.0)';
const PACKS = {
  dino:      { dir: 'Dinosaur Animated Pack - Dec 2018/FBX', ext: 'fbx', anim: true, by: QUAT },
  farmanim:  { dir: 'Farm Animals Animated  by Quaternius/FBX', ext: 'fbx', anim: true, by: QUAT },
  fish:      { dir: 'Fish Pack Animated by Quaternius/FBX', ext: 'fbx', anim: true, by: QUAT },
  critters:  { dir: 'Easy Animated Enemy Pack - Jan 2019/FBX', ext: 'fbx', anim: true, by: QUAT },
  scifi:     { dir: 'Sci-Fi Essentials Kit[Standard]/glTF', ext: 'gltf', tex: 256, by: QUAT },   // PBR-textured: 256 px keeps it at ~8 MB
  farm:      { dir: 'Farm Buildings by Quaternius/FBX', ext: 'fbx', by: QUAT },
  cars:      { dir: 'Realistic Car Pack - Nov 2018/FBX', ext: 'fbx', upZ: true, by: QUAT },
  nature:    { dir: 'Ultimate Nature Pack by Quaternius/FBX', ext: 'fbx', by: QUAT },
  street:    { dir: 'Modular Street Pack by Quaternius/FBX', ext: 'fbx', by: QUAT },
  city:      { dir: 'KayKit_City_Builder_Bits_1.0_FREE/Assets/gltf', ext: 'gltf', by: KAY },
  space:     { dir: 'KayKit_Space_Base_Bits_1.0_FREE/Assets/gltf', ext: 'gltf', by: KAY },
  resources: { dir: 'KayKit_ResourceBits_1.0_FREE/Assets/gltf', ext: 'gltf', by: KAY },
  furniture: { dir: 'KayKit_Furniture_Bits_1.0_FREE/Assets/gltf', ext: 'gltf', by: KAY },
  tools:     { dir: 'KayKit_RPGToolsBits_1.0_FREE/Assets/gltf', ext: 'gltf', by: KAY },
};
const SCALE = JSON.parse(fs.existsSync(path.join(REPO, 'tools/asset-scales.json')) ? fs.readFileSync(path.join(REPO, 'tools/asset-scales.json'), 'utf8') : '{}');

// real-world length in metres (larger horizontal extent) for animals: tools/asset-sizes.json
const LEN = JSON.parse(fs.existsSync(path.join(REPO, 'tools/asset-sizes.json')) ? fs.readFileSync(path.join(REPO, 'tools/asset-sizes.json'), 'utf8') : '{}');
const only = opt('only')?.split(','), dry = flag('dry');
const slug = s => s.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
const MIME = { js: 'text/javascript', fbx: 'application/octet-stream', gltf: 'model/gltf+json', glb: 'model/gltf-binary', bin: 'application/octet-stream', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', tga: 'image/x-tga' };

const PAGE = `<!doctype html><script type="importmap">{ "imports": { "three": "http://lib.local/three/build/three.module.js", "three/addons/": "http://lib.local/three/examples/jsm/" } }</script>
<script type="module">
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
window.convert = async (url, ext, scale, upZ, len) => {
  let root, clips = [];
  if (ext === 'fbx') { root = await new FBXLoader().loadAsync(url); clips = root.animations ?? []; }
  else { const g = await new GLTFLoader().loadAsync(url); root = g.scene; clips = g.animations ?? []; }
  const drop = []; root.traverse(o => { if (o.isLight || o.isCamera) drop.push(o); }); drop.forEach(o => o.parent.remove(o));
  // FBX comes as Phong/Lambert: turn into Standard (the engine lights Standard materials), keep colour, map, transparency
  root.traverse(o => { if (!o.isMesh) return; const conv = m => { if (m.isMeshStandardMaterial) return m;
      const s = new THREE.MeshStandardMaterial({ name: m.name, color: m.color, map: m.map ?? null, transparent: ext === 'fbx' ? false : m.transparent, opacity: ext === 'fbx' ? 1 : m.opacity,   // FBXLoader reads these packs' TransparencyFactor as fully transparent
        side: m.side, roughness: 0.85, metalness: 0, vertexColors: m.vertexColors, flatShading: m.flatShading });
      return s; };
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material); });
  // FBX from Blender stores linear colour values; FBXLoader treats them as sRGB and darkens them a second time → undo (no-op for glTF)
  if (ext === 'fbx') root.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) m.color?.convertLinearToSRGB(); });
  // these FBX packs carry a meaningless all-white COLOR attribute: drop it, the material colours are the look
  if (ext === 'fbx') root.traverse(o => { if (o.isMesh && o.geometry.attributes.color) { o.geometry.deleteAttribute('color'); for (const m of [].concat(o.material)) m.vertexColors = false; } });
  const top = new THREE.Group(); top.add(root); top.scale.setScalar(scale); if (upZ) top.rotation.x = -Math.PI / 2; top.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(top, true), size = box.getSize(new THREE.Vector3());
  if (len) { top.scale.multiplyScalar(len / Math.max(size.x, size.z)); top.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(top, true); size = box.getSize(new THREE.Vector3()); }
  let verts = 0; top.traverse(o => { if (o.isMesh) verts += o.geometry.attributes.position.count; });
  const glb = await new GLTFExporter().parseAsync(top, { binary: true, animations: clips, onlyVisible: true }); window._glb = glb;
  const u8 = new Uint8Array(glb); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), size: [size.x, size.y, size.z].map(v => +v.toFixed(3)), min: [box.min.x, box.min.y, box.min.z].map(v => +v.toFixed(3)), verts,
    clips: clips.map(c => [c.name.replace(/^.*\\|/, ''), +c.duration.toFixed(3)]) };
};
// thumbnail of the last converted model: auto-framed 3/4 view, ground grid 1 m, returns a PNG data URL
const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setSize(240, 240); R.outputColorSpace = THREE.SRGBColorSpace;
window.thumb = async () => { const G = await new GLTFLoader().parseAsync(window._glb.slice(0), ''); window._last = G.scene;
  if (G.animations[0]) { const mx = new THREE.AnimationMixer(G.scene); mx.clipAction(G.animations.find(c => /idle|swim|fly/i.test(c.name)) ?? G.animations[0]).play(); mx.update(0.3); }
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#dfe6ec');
  sc.add(new THREE.HemisphereLight('#ffffff', '#8a7a6a', 2.2)); const d = new THREE.DirectionalLight('#ffffff', 2.2); d.position.set(3, 5, 4); sc.add(d);
  const o = window._last; sc.add(o); o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o, true), c = b.getCenter(new THREE.Vector3()), r = b.getSize(new THREE.Vector3()).length() / 2 || 1;
  const g = new THREE.GridHelper(Math.max(2, Math.ceil(r * 2.4)), Math.max(2, Math.ceil(r * 2.4)), '#9aa4ad', '#b9c2ca'); g.position.y = b.min.y; sc.add(g);
  const cam = new THREE.PerspectiveCamera(35, 1, r / 50, r * 50); cam.position.copy(c).add(new THREE.Vector3(1.1, 0.8, 1.5).normalize().multiplyScalar(r * 3.4)); cam.lookAt(c);
  R.render(sc, cam); sc.remove(o); return R.domElement.toDataURL('image/jpeg', 0.8); };
window.ready = true;
</script>`;

const browser = await chromium.launch(), page = await browser.newPage();
page.on('pageerror', e => console.error('page:', e.message));
await page.route('http://lib.local/**', r => {
  const u = decodeURIComponent(new URL(r.request().url()).pathname);
  const f = u.startsWith('/three/') ? path.join(THREE_DIR, u.slice(7)) : u.startsWith('/src/') ? path.join(SRC, u.slice(5)) : null;
  if (!f || !fs.existsSync(f)) return r.fulfill({ status: 404, body: 'missing ' + u });
  r.fulfill({ status: 200, contentType: MIME[f.split('.').pop().toLowerCase()] ?? 'application/octet-stream', body: fs.readFileSync(f) });
});
await page.route('http://lib.local/index.html', r => r.fulfill({ status: 200, contentType: 'text/html', body: PAGE }));
await page.goto('http://lib.local/index.html'); await page.waitForFunction(() => window.ready);

const idxFile = path.join(OUT, 'index.json'), index = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : {};
let total = 0; const thumbs = [];
for (const [pk, P] of Object.entries(PACKS)) {
  if (only && !only.includes(pk)) continue;
  const dir = path.join(SRC, P.dir); if (!fs.existsSync(dir)) { console.warn('skip ' + pk + ': ' + dir + ' not found'); continue; }
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.' + P.ext)).sort();
  // scale: exact 'pack/name' > first matching 'pack/*part*' pattern > pack
  const scaleOf = n => SCALE[n] ?? Object.entries(SCALE).find(([k]) => k.includes('*') && new RegExp('^' + k.replace(/\*/g, '.*') + '$').test(n))?.[1] ?? SCALE[pk] ?? 1, sc = SCALE[pk] ?? 1;
  console.log(`## ${pk}: ${files.length} × .${P.ext}, scale ${sc}`);
  for (const f of files) {
    const name = pk + '/' + slug(f), url = 'http://lib.local/src/' + encodeURIComponent(path.join(P.dir, f)).replace(/%2F/g, '/');
    let r; try { r = await page.evaluate(([u, e, s, z, l]) => window.convert(u, e, s, z, l), [url, P.ext, scaleOf(name), !!P.upZ, LEN[name] ?? null]); } catch (e) { console.error('FAIL', name, e.message.split('\n')[0]); continue; }
    const glb = await shrink(Buffer.from(r.b64, 'base64'), P.tex), bytes = glb.length; total += bytes;
    console.log(`${name.padEnd(36)} ${String(r.size).padEnd(22)} ${String(r.verts).padStart(6)} v ${(bytes / 1024).toFixed(0).padStart(5)} KB ${r.clips.length ? r.clips.map(c => c[0]).join(',') : ''}`);
    thumbs.push([name, await page.evaluate(() => window.thumb()), r.size]);
    if (dry) continue;
    fs.mkdirSync(path.join(OUT, pk), { recursive: true }); fs.writeFileSync(path.join(OUT, name + '.glb'), glb);
    index[name] = { by: P.by, src: path.join(P.dir, f), size: r.size, min: r.min, verts: r.verts, kb: Math.round(bytes / 1024), ...(r.clips.length ? { clips: r.clips } : {}) };
  }
}
if (!dry) fs.writeFileSync(idxFile, JSON.stringify(Object.fromEntries(Object.entries(index).sort()), null, 0).replace(/\},"/g, '},\n"') + '\n');
console.log(`total ${(total / 1048576).toFixed(1)} MB${dry ? ' (dry run)' : ''}`);
// contact sheet: one HTML page with every thumbnail, name and size in metres (work/asset-catalog.html, or --sheet <file>)
const sheet = opt('sheet') ?? (dry ? null : path.join(REPO, 'work/asset-catalog.html'));   // work/ is git-ignored
if (sheet) { fs.mkdirSync(path.dirname(sheet), { recursive: true }); fs.writeFileSync(sheet, '<!doctype html><meta charset=utf-8><title>Asset catalog</title><style>body{font:12px system-ui;margin:12px;background:#f4f6f8}div{display:inline-block;margin:4px;text-align:center;width:240px}img{display:block;border-radius:6px}</style>' +
  thumbs.map(([n, u, s]) => `<div><img src="${u}"><b>${n}</b><br>${s.map(v => v.toFixed(2)).join(' × ')} m</div>`).join('')); console.log('sheet:', sheet); }
await browser.close();
