// Kachel-Bilder (echte 3D-Renderings für Stapel und Handbuch) und Video-Aufnahme des Zeitraffers.
import * as THREE from 'three';
import { MATS, U } from './materials.js';
import { buildTile } from './models/tilemodel.js';
import { edgesOf } from './tiles.js';

export function makeThumbs(renderer, kinds, size = 192) {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 200);
  scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x705a40, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0dd, 2.4); sun.position.set(8, 14, 6); scene.add(sun);
  const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  const keep = {}; for (const k of ['uNight', 'uSnow', 'uAutumn', 'uSpring', 'uSummer', 'uRain']) { keep[k] = U[k].value; U[k].value = 0; }
  const prevTarget = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  const buf = new Uint8Array(size * size * 4), cv = document.createElement('canvas'); cv.width = cv.height = size; const cx = cv.getContext('2d');
  const out = {};
  for (const kind of kinds) {
    const m = buildTile({ k: kind, q: 0, r: 0, o: 0 }, edgesOf(kind, 0), [null, null, null, null, null, null], 0, 0, { stage: 2 });
    const g = new THREE.Group();
    for (const [layer, geo] of Object.entries(m.geo)) if (layer !== 'fall') g.add(new THREE.Mesh(geo, MATS[layer] || MATS.base));
    const gp = (p, par) => { const o = new THREE.Group(); o.applyMatrix4(p.matrix); for (const [layer, geo] of Object.entries(p.geo)) o.add(new THREE.Mesh(geo, MATS[layer] || MATS.base)); par.add(o); for (const c of p.children || []) gp(c, o); };
    for (const p of m.parts) gp(p, g);
    scene.add(g);
    const box = new THREE.Box3().setFromObject(g), top = Math.max(2, box.max.y);
    cam.position.set(13, 11 + top * .6, 13); cam.lookAt(0, Math.min(top * .35, 3) - .6, 0);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
    const img = cx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    cx.putImageData(img, 0, 0); out[kind] = cv.toDataURL('image/png');
    scene.remove(g); g.traverse(o => o.isMesh && o.geometry.dispose());
  }
  renderer.setRenderTarget(prevTarget); renderer.setClearColor(prevClear, prevAlpha); rt.dispose();
  for (const k in keep) U[k].value = keep[k];
  return out;
}

// Video vom Canvas aufnehmen (MP4, wenn der Browser es kann, sonst WebM)
export class Recorder {
  constructor(canvas) { this.canvas = canvas; this.rec = null; }
  static type() { for (const t of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']) if (window.MediaRecorder?.isTypeSupported?.(t)) return t; return ''; }
  start(fps = 60) {
    const type = Recorder.type(); if (!type) return false;
    const stream = this.canvas.captureStream(fps); this.chunks = []; this.type = type;
    this.rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 16e6 });
    this.rec.ondataavailable = e => e.data.size && this.chunks.push(e.data); this.rec.start(250); return true;
  }
  stop(name = 'insel') {
    return new Promise(res => {
      if (!this.rec) return res(null);
      this.rec.onstop = () => { const blob = new Blob(this.chunks, { type: this.type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + (this.type.includes('mp4') ? '.mp4' : '.webm'); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); res(blob); };
      this.rec.stop(); this.rec = null;
    });
  }
}
