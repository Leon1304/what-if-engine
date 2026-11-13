# Asset library

Low-poly models in real-world metres for `asset(p, 'pack/name', x, z, …)` and `model('pack/name')` (animated). Built by
`node tools/import-assets.mjs ~/Downloads/quaternius` from the unzipped packs (needs `npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 sharp`).
`index.json` lists every model with size (m), vertex count, KB and clips. Picture catalogue: `work/asset-catalog.html` (written by the import, not committed).

Every pack here is **CC0 1.0** (public domain). Only add packs whose licence allows redistribution in this public repo.

| Folder | Source pack | Author | Licence |
|---|---|---|---|
| `dino/` | Dinosaur Animated Pack (Dec 2018) | Quaternius | CC0 1.0 |
| `farmanim/` | Farm Animals Animated | Quaternius | CC0 1.0 |
| `fish/` | Fish Pack Animated | Quaternius | CC0 1.0 |
| `critters/` | Easy Animated Enemy Pack (Jan 2019) | Quaternius | CC0 1.0 |
| `scifi/` | Sci-Fi Essentials Kit [Standard] | Quaternius | CC0 1.0 |
| `farm/` | Farm Buildings | Quaternius | CC0 1.0 |
| `cars/` | Realistic Car Pack (Nov 2018) | Quaternius | CC0 1.0 |
| `nature/` | Ultimate Nature Pack | Quaternius | CC0 1.0 |
| `street/` | Modular Street Pack | Quaternius | CC0 1.0 |
| `city/` | KayKit City Builder Bits 1.0 FREE | Kay Lousberg | CC0 1.0 |
| `space/` | KayKit Space Base Bits 1.0 FREE | Kay Lousberg | CC0 1.0 |
| `resources/` | KayKit Resource Bits 1.0 FREE | Kay Lousberg | CC0 1.0 |
| `furniture/` | KayKit Furniture Bits 1.0 FREE | Kay Lousberg | CC0 1.0 |
| `tools/` | KayKit RPG Tools Bits 1.0 FREE | Kay Lousberg | CC0 1.0 |
| `own/` | built by us in Blender (`assets/own/src/*.py` → `tools/blender_asset.py`) | what-if-engine | CC0 1.0 |

Changes made on import: FBX → glTF, Z-up cars rotated, scaled to metres (`tools/asset-scales.json`, animals to real length in `tools/asset-sizes.json`),
FBX colours corrected (Blender writes linear values), textures ≤ 512 px (sci-fi 256 px), geometry quantised (KHR_mesh_quantization).
Not imported on purpose: Atomic Realm packs (no redistribution allowed) and packs without a known author or licence.
