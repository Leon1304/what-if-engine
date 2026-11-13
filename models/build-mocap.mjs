// Retargets the 84 mocap clips of models/human_m.glb (Quaternius Universal Animation Library 1 + 2, CC0) onto the joints of figure()
// → models/mocap.json. Run: node models/build-mocap.mjs   (needs @gltf-transform/core and three, see models/README.md)
//
// How: every clip is sampled at FPS. For each frame the world rotation of each mocap bone is turned into the world rotation of the matching figure joint:
//   F(t) = W(t) · W_ref⁻¹ · A
// W = bone world rotation, W_ref = the same in the rig's reference pose, A = the figure joint's world rotation when the mocap rig stands in that pose:
// for limbs (upper arm, forearm, hand, thigh, shin) the shortest turn from the figure's rest direction (straight down) onto the bone's direction,
// for hips, chest, head and feet none (relative: standing upright in the reference pose = figure rest). Local joint rotation = F(parent)⁻¹ · F.
// Hip offset = pelvis movement × (figure hip height / mocap hip height), so feet stay on the ground. Stored as int16 (quaternions × 32767, metres × 10000).
import { NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), SRC = path.join(HERE, 'human_m.glb'), OUT = path.join(HERE, 'mocap.json'), FPS = 30;
const HIP = 0.84;   // = template.html: hip joint height of figure()
const doc = await new NodeIO().read(SRC), root = doc.getRoot(), nodes = root.listNodes(), byName = new Map(nodes.map(n => [n.getName(), n]));
const parent = new Map(); for (const n of nodes) for (const c of n.listChildren()) parent.set(c, n);
const need = n => { const x = byName.get(n); if (!x) throw new Error('bone missing: ' + n); return x; };

// rest (reference) local transforms
const REST = new Map(nodes.map(n => [n, { t: new THREE.Vector3(...n.getTranslation()), q: new THREE.Quaternion(...n.getRotation()), s: new THREE.Vector3(...n.getScale()) }]));
function world(local) {   // local: Map(node → {t,q,s}) → Map(node → Matrix4)
  const W = new Map(), get = n => { let m = W.get(n); if (m) return m; const L = local.get(n) ?? REST.get(n); m = new THREE.Matrix4().compose(L.t, L.q, L.s); const p = parent.get(n); if (p) m.premultiply(get(p)); W.set(n, m); return m; };
  for (const n of nodes) get(n); return W;
}
const dec = m => { const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); m.decompose(p, q, s); return { p, q }; };
const W0 = world(new Map()), P0 = n => dec(W0.get(need(n))).p, Q0 = n => dec(W0.get(need(n))).q;

// facing: figures look along +z; if the mocap rig looks along −z, turn everything 180° about y
const fwd = P0('ball_l').clone().sub(P0('foot_l')); const FLIP = fwd.z < 0 ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI) : new THREE.Quaternion();
const fixP = p => p.clone().applyQuaternion(FLIP), fixQ = q => FLIP.clone().multiply(q);
// figure side −x = armL/legL (see figure()): pick the mocap side by position, not by name
const side = fixP(P0('thigh_l')).x < 0 ? { L: '_l', R: '_r' } : { L: '_r', R: '_l' };
const midF = s => ['middle_01' + s, 'middle_01_' + s.slice(1), 'hand' + s].find(n => byName.has(n) && n !== 'hand' + s) ?? null;
// figure joint ← mocap bone (twist) · direction from → to (the figure part points along it; null = relative rotation only) · the part's rest direction in figure()
const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const J = [['hips', 'pelvis'], ['chest', 'spine_03', 'spine_01', 'neck_01', UP], ['neck', 'Head']];   // chest: the line spine → neck (the top spine bone alone bends ~2× too far)
for (const S of ['L', 'R']) { const s = side[S];
  J.push(['leg' + S, 'thigh' + s, 'thigh' + s, 'calf' + s, DOWN], ['shin' + S, 'calf' + s, 'calf' + s, 'foot' + s, DOWN], ['foot' + S, 'foot' + s],
    ['arm' + S, 'upperarm' + s, 'upperarm' + s, 'lowerarm' + s, DOWN], ['fore' + S, 'lowerarm' + s, 'lowerarm' + s, 'hand' + s, DOWN], ['hand' + S, 'hand' + s, 'hand' + s, midF(s), DOWN]); }
const PARENT = { hips: null, chest: 'hips', neck: 'chest', legL: 'hips', legR: 'hips', shinL: 'legL', shinR: 'legR', footL: 'shinL', footR: 'shinR', armL: 'chest', armR: 'chest', foreL: 'armL', foreR: 'armR', handL: 'foreL', handR: 'foreR' };
const A = {}, Wref = {};
for (const [j, b, a, c, d] of J) { Wref[j] = fixQ(Q0(b)).invert(); A[j] = c ? new THREE.Quaternion().setFromUnitVectors(d, fixP(P0(c)).sub(fixP(P0(a))).normalize()) : new THREE.Quaternion(); }
const mcLeg = P0('thigh_l').y;   // hip joint height when standing (ground at y = 0)
const K = HIP / mcLeg, pel0 = fixP(P0('pelvis'));
console.log('facing flip', fwd.z < 0, '· figure L ←', side.L, '· mocap leg', mcLeg.toFixed(3), 'm → scale', K.toFixed(3));

function sample(ch, time) {   // glTF sampler → Vector3 / Quaternion at time
  const s = ch.getSampler(), I = s.getInput().getArray(), O = s.getOutput().getArray(), rot = ch.getTargetPath() === 'rotation', w = rot ? 4 : 3, cub = s.getInterpolation() === 'CUBICSPLINE';
  const at = k => { const o = cub ? (3 * k + 1) * w : k * w; return rot ? new THREE.Quaternion(O[o], O[o + 1], O[o + 2], O[o + 3]) : new THREE.Vector3(O[o], O[o + 1], O[o + 2]); };
  if (time <= I[0]) return at(0); if (time >= I[I.length - 1]) return at(I.length - 1);
  let k = 0; while (I[k + 1] < time) k++; if (s.getInterpolation() === 'STEP') return at(k);
  const u = (time - I[k]) / (I[k + 1] - I[k]), a = at(k), b = at(k + 1); return rot ? a.slerp(b.normalize(), u).normalize() : a.lerp(b, u);
}
// short names for anim(f, [[t, 'talk']]) (as human(): HUMAN.map in template.html)
const ALIAS = { idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop', sprint: 'Sprint_Loop', sneak: 'Crouch_Fwd_Loop', shamble: 'Zombie_Walk_Fwd_Loop', dance: 'Dance_Loop', cheer: 'Dance_Loop',
  talk: 'Idle_Talking_Loop', phone: 'Idle_TalkingPhone_Loop', fold: 'Idle_FoldArms_Loop', sit: 'Sitting_Idle_Loop', swim: 'Swim_Fwd_Loop', tread: 'Swim_Idle_Loop', yes: 'Yes', no: 'Idle_No_Loop' };
const out = { fps: FPS, k: +K.toFixed(4), alias: ALIAS, src: 'Quaternius Universal Animation Library 1 + 2 (CC0), retargeted by models/build-mocap.mjs', joints: J.map(j => j[0]), clips: {} };
let bytes = 0;
for (const an of root.listAnimations()) {
  const name = an.getName(); if (/TPose/i.test(name)) continue;
  const chs = an.listChannels(); let dur = 0; for (const c of chs) { const I = c.getSampler().getInput().getArray(); dur = Math.max(dur, I[I.length - 1]); }
  const n = Math.max(2, Math.round(dur * FPS) + 1), D = new Int16Array(n * (3 + 4 * J.length)), prev = {};
  for (let f = 0; f < n; f++) {
    const time = Math.min(dur, f / FPS), L = new Map();
    for (const c of chs) { const nd = c.getTargetNode(), R = REST.get(nd), cur = L.get(nd) ?? { t: R.t.clone(), q: R.q.clone(), s: R.s.clone() }; const v = sample(c, time), p = c.getTargetPath();
      if (p === 'rotation') cur.q.copy(v); else if (p === 'translation') cur.t.copy(v); else if (p === 'scale') cur.s.copy(v); L.set(nd, cur); }
    const W = world(L), F = {};
    let o = f * (3 + 4 * J.length); const pel = fixP(dec(W.get(need('pelvis'))).p).sub(pel0).multiplyScalar(K);
    for (const v of [pel.x, pel.y, pel.z]) D[o++] = Math.max(-32767, Math.min(32767, Math.round(v * 1e4)));
    const WP = n => fixP(dec(W.get(need(n))).p);
    for (const [j, b, a, c, d] of J) { F[j] = fixQ(dec(W.get(need(b))).q).multiply(Wref[j]).multiply(A[j]);
      if (c) { const now = WP(c).sub(WP(a)).normalize(), pred = d.clone().applyQuaternion(F[j]); F[j].premultiply(new THREE.Quaternion().setFromUnitVectors(pred, now)); } }   // exact direction, twist from the bone
    for (const [j] of J) { const q = PARENT[j] ? F[PARENT[j]].clone().invert().multiply(F[j]) : F[j].clone(); q.normalize();
      if (prev[j] && prev[j].dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); prev[j] = q;   // continuous sign: frames blend without flips
      for (const v of [q.x, q.y, q.z, q.w]) D[o++] = Math.round(v * 32767); }
  }
  const b64 = Buffer.from(D.buffer).toString('base64'); bytes += b64.length;
  out.clips[name] = { n, d: +dur.toFixed(4), q: b64 };
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(Object.keys(out.clips).length, 'clips →', path.relative(process.cwd(), OUT), (bytes / 1024).toFixed(0), 'KB');
