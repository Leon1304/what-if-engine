// Builds models/human_m.glb and models/human_f.glb from the free Quaternius packs (CC0):
//   Universal Base Characters [Standard] + Universal Animation Library 1 and 2 [Standard]
// One-off tool, not used at render time. Needs (not in package.json on purpose):
//   npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 sharp
// Usage: node models/build-quaternius.mjs [~/Downloads/quaternius]
//
// What it does: character mesh + eyes + eyebrows + all hairstyles (hidden in the engine except the chosen one) on one
// skeleton; copies every clip of both libraries by bone name. Only rotations are copied (bone lengths differ between the
// mannequin and the characters); the pelvis translation is scaled to the character's hip height. Unused UV/colour sets
// are dropped (three.js would otherwise multiply the colours in), textures go to 1024 px JPEG.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, resample, mergeDocuments } from '@gltf-transform/functions';   // + @gltf-transform/extensions
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import fs from 'fs';

const Q = process.argv[2] ?? path.join(os.homedir(), 'Downloads/quaternius');
const BASE = path.join(Q, 'Universal Base Characters[Standard]');
const LIBS = [path.join(Q, 'Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb'),
  path.join(Q, 'Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb')];
const RM = [path.join(Q, 'Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard_RM.glb'),
  path.join(Q, 'Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard_RM.glb')];
const HAIR = ['Hair_SimpleParted', 'Hair_Buzzed', 'Hair_Long', 'Hair_Buns', 'Hair_BuzzedFemale', 'Hair_Beard'];
const OUT = path.dirname(new URL(import.meta.url).pathname);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// .gltf with external files; some image URIs in the pack point to missing '<x>_png.png' → fall back to '<x>.png'
async function readG(f) {
  if (f.endsWith('.glb')) return io.read(f);
  const dir = path.dirname(f), json = JSON.parse(fs.readFileSync(f, 'utf8')), resources = {};
  for (const r of [...(json.buffers ?? []), ...(json.images ?? [])]) { if (!r.uri) continue;
    let u = decodeURIComponent(r.uri); if (!fs.existsSync(path.join(dir, u))) { const alt = u.replace(/_png\.png$/, '.png'); if (fs.existsSync(path.join(dir, alt))) u = alt; else throw new Error('missing ' + u); }
    r.uri = u; resources[u] = new Uint8Array(fs.readFileSync(path.join(dir, u))); }
  return io.readJSON({ json, resources });
}

const byName = doc => new Map(doc.getRoot().listNodes().map(n => [n.getName(), n]));

// strides from the root-motion versions: metres the root travels per clip cycle (feet stay planted at that rate)
async function strides() {
  const S = {};
  for (const f of RM) {
    const d = await io.read(f);
    for (const a of d.getRoot().listAnimations()) {
      if (!/(Walk|Jog|Sprint|Crouch_Fwd|Swim_Fwd|Run)/.test(a.getName())) continue;
      const ch = a.listChannels().find(c => c.getTargetNode()?.getName() === 'root' && c.getTargetPath() === 'translation');
      if (!ch) continue; const o = ch.getSampler().getOutput().getArray(), n = o.length / 3;
      const dx = o[(n - 1) * 3] - o[0], dy = o[(n - 1) * 3 + 1] - o[1], dz = o[(n - 1) * 3 + 2] - o[2];
      S[a.getName()] = +Math.hypot(dx, dy, dz).toFixed(3);
    }
  }
  return S;
}

async function build(sex) {
  const name = sex === 'm' ? 'Superhero_Male_FullBody' : 'Superhero_Female_FullBody';
  const doc = await readG(path.join(BASE, 'Base Characters/Godot - UE', name + '.gltf'));
  const root = doc.getRoot(), buf = root.listBuffers()[0], skin = root.listSkins()[0], N = byName(doc);
  const armature = N.get('Armature');

  // hairstyles, rigged to the head bone: merge, rebind to the character's skin, drop their own armature
  for (const h of HAIR) {
    const hd = await readG(path.join(BASE, 'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)', h + '.gltf'));
    const before = new Set(root.listNodes()), map = mergeDocuments(doc, hd);
    const added = root.listNodes().filter(n => !before.has(n));
    for (const n of added) if (n.getMesh()) { n.setSkin(skin); n.setName(h); armature.addChild(n); }
    for (const n of added) if (!n.getMesh()) n.dispose();
    for (const s of root.listScenes().slice(1)) s.dispose();
    for (const s of root.listSkins()) if (s !== skin) s.dispose();
    void map;
  }
  for (const b of root.listBuffers()) if (b !== buf) { for (const a of root.listAccessors()) if (a.getBuffer() === b) a.setBuffer(buf); b.dispose(); }

  // strip attributes the materials don't use (COLOR_* would tint everything in three.js)
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) for (const s of p.listSemantics())
    if (/^COLOR_|^TEXCOORD_[1-9]/.test(s)) p.setAttribute(s, null);

  // clothing mask for human() in the engine (painted clothes): per body vertex _CLOTH = (armT, legT, armW, legW)
  //   armT: 0 shoulder → 1 elbow → 2 wrist → 3 fingertips · legT: 0 hip → 1 knee → 2 ankle → 3 toes (projection on the bind-pose bones)
  //   armW / legW: summed skin weight of the arm / leg chain. Mesh extras: neckY, waistY (bind-pose heights), skin (average skin colour of the texture)
  const J = skin.listJoints(), jn = J.map(n => n.getName()), W = n => N.get(n).getWorldTranslation();
  const chain = (names) => names.map(W), seg = (P, C) => {   // nearest point on polyline C → index + fraction
    let best = 1e9, out = 0;
    for (let i = 0; i < C.length - 1; i++) { const a = C[i], b = C[i + 1], ab = [0, 1, 2].map(j => b[j] - a[j]), L2 = ab.reduce((s, v) => s + v * v, 0);
      const u = Math.max(0, Math.min(1, [0, 1, 2].reduce((s, j) => s + (P[j] - a[j]) * ab[j], 0) / L2)), d = [0, 1, 2].reduce((s, j) => s + (P[j] - a[j] - u * ab[j]) ** 2, 0);
      if (d < best) { best = d; out = i + u; } }
    return out; };
  const arm = { l: chain(['upperarm_l', 'lowerarm_l', 'hand_l', 'middle_04_leaf_l']), r: chain(['upperarm_r', 'lowerarm_r', 'hand_r', 'middle_04_leaf_r']) };
  const leg = { l: chain(['thigh_l', 'calf_l', 'foot_l', 'ball_leaf_l']), r: chain(['thigh_r', 'calf_r', 'foot_r', 'ball_leaf_r']) };
  const isArm = jn.map(n => /^(upperarm|lowerarm|hand|index|middle|pinky|ring|thumb)_/.test(n)), isLeg = jn.map(n => /^(thigh|calf|foot|ball)_/.test(n));
  const body = root.listMeshes().find(m => /SuperHero|Superhero|Retopology/.test(m.getName()) || m.listPrimitives()[0].getMaterial()?.getName().startsWith('MI_Superhero'));
  for (const p of body.listPrimitives()) {
    const pos = p.getAttribute('POSITION').getArray(), jo = p.getAttribute('JOINTS_0').getArray(), we = p.getAttribute('WEIGHTS_0').getArray(), n = pos.length / 3, out = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const P = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], side = P[0] >= 0 ? 'l' : 'r';
      let aw = 0, lw = 0; for (let k = 0; k < 4; k++) { const j = jo[i * 4 + k], w = we[i * 4 + k]; if (isArm[j]) aw += w; if (isLeg[j]) lw += w; }
      out.set([seg(P, arm[side]), seg(P, leg[side]), aw, lw], i * 4);
    }
    p.setAttribute('_CLOTH', doc.createAccessor().setType('VEC4').setArray(out).setBuffer(buf));
  }
  const img = body.listPrimitives()[0].getMaterial().getBaseColorTexture().getImage();
  const { data, info } = await sharp(Buffer.from(img)).resize(256, 256).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sr = 0, sg = 0, sb = 0, sn = 0;
  for (let i = 0; i < info.width * info.height; i++) { const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], l = (r + g + b) / 765;
    if (l > 0.3 && r > b + 25) { sr += r; sg += g; sb += b; sn++; } }
  const hex = v => Math.round(v / sn).toString(16).padStart(2, '0');
  body.setExtras({ cloth: { neckY: +(W('neck_01')[1] - 0.02).toFixed(3), waistY: +((W('pelvis')[1] + W('spine_01')[1]) / 2 + 0.02).toFixed(3), skin: '#' + hex(sr) + hex(sg) + hex(sb) } });
  console.log(sex, 'cloth', JSON.stringify(body.getExtras()));

  // clips: rotations of every bone, pelvis translation scaled to this character's hip height
  const hipC = N.get('pelvis').getTranslation()[2];
  for (const f of LIBS) {
    const ld = await io.read(f), L = byName(ld), hipL = L.get('pelvis').getTranslation()[2], k = hipC / hipL;
    for (const a of ld.getRoot().listAnimations()) {
      if (a.getName() === 'A_TPose') continue;
      const A = doc.createAnimation(a.getName()), acc = new Map();
      const copy = (src, scale = 1) => { const key = src; if (scale === 1 && acc.has(key)) return acc.get(key);
        const arr = src.getArray().slice(); if (scale !== 1) for (let i = 0; i < arr.length; i++) arr[i] *= scale;
        const c = doc.createAccessor().setType(src.getType()).setArray(arr).setBuffer(buf); if (scale === 1) acc.set(key, c); return c; };
      for (const ch of a.listChannels()) {
        const tn = ch.getTargetNode()?.getName(), p = ch.getTargetPath(), tgt = N.get(tn);
        if (!tgt || tn === 'root') continue;
        if (p === 'scale' || (p === 'translation' && tn !== 'pelvis')) continue;
        const s = ch.getSampler();
        let out;
        if (p === 'translation') {   // keep the character's own rest offset, add the library's motion scaled by hip height
          const o = s.getOutput().getArray(), r0 = L.get('pelvis').getTranslation(), rc = N.get('pelvis').getTranslation(), arr = new Float32Array(o.length);
          for (let i = 0; i < o.length; i += 3) for (let j = 0; j < 3; j++) arr[i + j] = rc[j] + (o[i + j] - r0[j]) * k;
          out = doc.createAccessor().setType('VEC3').setArray(arr).setBuffer(buf);
        } else out = copy(s.getOutput());
        const S2 = doc.createAnimationSampler().setInput(copy(s.getInput())).setOutput(out).setInterpolation(s.getInterpolation());
        A.addSampler(S2).addChannel(doc.createAnimationChannel().setTargetNode(tgt).setTargetPath(p).setSampler(S2));
      }
    }
  }

  await doc.transform(
    resample({ tolerance: 1e-4 }),
    dedup(), prune({ keepAttributes: false }),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 86 }),
  );
  const out = path.join(OUT, 'human_' + sex + '.glb');
  await io.write(out, doc);
  return out;
}

const S = await strides();
console.log('strides (m per cycle):', JSON.stringify(S));
for (const s of ['m', 'f']) console.log('wrote', await build(s));
