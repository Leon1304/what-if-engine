// Compress game/map.glb after the Blender export: dedup + prune + quantised positions / normals / colours (KHR_mesh_quantization,
// read by three's GLTFLoader). Node extras (interact, label, …) stay untouched.
//   node game/blender/shrink.mjs game/map.glb
// needs @gltf-transform/core|extensions|functions@4 (installed in the main checkout's node_modules)
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize } from '@gltf-transform/functions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const before = fs.statSync(f).size;
  const doc = await io.read(f);
  await doc.transform(dedup(), prune({ keepExtras: true }), quantize({ quantizePosition: 16, quantizeNormal: 8, quantizeColor: 16 }));
  await io.write(f, doc);
  console.log(`${f}: ${(before / 1024) | 0} KB → ${(fs.statSync(f).size / 1024) | 0} KB`);
}
