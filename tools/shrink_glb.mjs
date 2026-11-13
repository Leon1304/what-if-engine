// Compress own Blender models like the CC0 packs (v3.20): dedup + prune + quantised positions / normals / colours (KHR_mesh_quantization,
// read by three's GLTFLoader). The hand-over data in asset.extras (parts, marks, walk surface) is kept; asset() takes the quantisation
// offset of part nodes into account. Updates the "kb" of the model in assets/index.json.
//   node tools/shrink_glb.mjs assets/own/<name>.glb [more.glb …]
// needs (one-off, not in package.json): npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4
import fs from 'fs';
import path from 'path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize } from '@gltf-transform/functions';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const json = b => JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
function setExtras(buf, extras) {   // write asset.extras back into the GLB's JSON chunk (padded to 4 bytes), binary chunk unchanged
  const n = buf.readUInt32LE(12), js = json(buf), rest = buf.subarray(20 + n);
  (js.asset ??= {}).extras = extras;
  let out = Buffer.from(JSON.stringify(js)); out = Buffer.concat([out, Buffer.alloc((4 - out.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(20); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(20 + out.length + rest.length, 8);
  head.writeUInt32LE(out.length, 12); head.writeUInt32LE(0x4E4F534A, 16);
  return Buffer.concat([head, out, rest]);
}
const idxP = path.join(REPO, 'assets/index.json');
for (const f of process.argv.slice(2)) {
  const before = fs.readFileSync(f), extras = json(before).asset?.extras;
  if (json(before).extensionsUsed?.includes('KHR_mesh_quantization')) { console.log(`${path.basename(f)}: already compressed`); continue; }
  const doc = await io.readBinary(new Uint8Array(before));
  await doc.transform(dedup(), prune(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeColor: 8 }));
  let out = Buffer.from(await io.writeBinary(doc));
  if (extras) out = setExtras(out, extras);
  fs.writeFileSync(f, out);
  const key = JSON.stringify('own/' + path.basename(f, '.glb')) + ':', txt = fs.readFileSync(idxP, 'utf8');   // only that model's line changes
  fs.writeFileSync(idxP, txt.split('\n').map(l => l.replace(/^\{/, '').startsWith(key) ? l.replace(/"kb":\d+/, '"kb":' + Math.round(out.length / 1024)) : l).join('\n'));
  console.log(`${path.basename(f)}: ${Math.round(before.length / 1024)} KB → ${Math.round(out.length / 1024)} KB`);
}
