// World: loads map.glb (built in Blender, game/blender/), turns repeated models into InstancedMeshes, merges the remaining static
// meshes per material (few draw calls), builds the collision BVH, wraps every movable part in a pivot (hinge from userData.pivot_w),
// collects interactives, light markers, quest points, trees (trunk circles), ladders and glow groups.
// Blender axes (x east, y north, z up) → three.js (x, y up, z = −north): B(x, y, z) = (x, z, −y).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';

export const B = (x, y, z) => new THREE.Vector3(x, z, -y);
export const Bv = a => B(a[0], a[1], a[2]);

const MOVING = new Set(['door', 'slide', 'lid', 'drawer']);

function ud(o) {                       // userData of the glTF node (multi-material nodes: meshes are children of a Group)
  while (o) { if (o.userData && Object.keys(o.userData).length && !o.userData._inst) return o.userData; o = o.parent; if (o && o.isScene) break; }
  return {};
}
function nodeOf(o) {
  while (o.parent && !o.parent.isScene && !o.parent.userData?._root) { if (Object.keys(o.userData).length) return o; o = o.parent; }
  return o;
}

// quantised attributes (Int16 normalised) → Float32, so geometries can be merged and transformed safely
function floatGeo(src, matrix, keep = ['position', 'normal', 'color']) {
  const g = new THREE.BufferGeometry();
  for (const name of keep) {
    const a = src.attributes[name]; if (!a) continue;
    const n = a.count, size = name === 'color' ? 4 : a.itemSize, arr = new Float32Array(n * size);
    for (let i = 0; i < n; i++) {
      arr[i * size] = a.getX(i); arr[i * size + 1] = a.getY(i); arr[i * size + 2] = a.getZ(i);
      if (size === 4) arr[i * 4 + 3] = a.itemSize === 4 ? a.getW(i) : 1;
    }
    g.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  if (src.index) g.setIndex(Array.from(src.index.array));
  else { const idx = new Uint32Array(src.attributes.position.count); for (let i = 0; i < idx.length; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); }
  if (matrix) g.applyMatrix4(matrix);
  return g;
}

export async function loadWorld(scene, onProgress) {
  const gltf = await new GLTFLoader().loadAsync('map.glb', e => onProgress?.(Math.min(1, e.loaded / (e.total || 6e6))));
  const root = gltf.scene; root.userData._root = true; scene.add(root); root.updateMatrixWorld(true);
  const W = { root, byName: {}, interactives: [], movers: [], lights: [], spots: {}, trees: [], ladders: [], glow: {}, waterMeshes: [], colliders: [] };

  // parse JSON strings from Blender custom properties
  root.traverse(o => {
    for (const [k, v] of Object.entries(o.userData)) if (typeof v === 'string' && /^[\[{]/.test(v)) { try { o.userData[k] = JSON.parse(v); } catch { } }
    if (o.name) W.byName[o.name] = o;
  });

  // ---------------- nodes: light markers, quest points, interactives (wrapped in pivots), trees
  const nodes = []; root.traverse(o => { if (o !== root && o.parent === root) nodes.push(o); });
  for (const n of nodes) {
    const u = n.userData;
    if (n.name.startsWith('light_')) { W.lights.push({ pos: n.getWorldPosition(new THREE.Vector3()), color: new THREE.Color(u.color || '#ffffff'), power: u.power || 30, group: u.group || '', kind: u.kind || 'point', name: n.name }); continue; }
    if (n.name === 'spawn' || n.name.startsWith('ziel_')) { W.spots[n.name] = { pos: n.getWorldPosition(new THREE.Vector3()), quat: n.getWorldQuaternion(new THREE.Quaternion()), ...u }; continue; }
    if (u.collide_r && u.pos_w) { const p = Bv(u.pos_w); W.trees.push({ x: p.x, z: p.z, r: u.collide_r }); }
    if (u.interact || u.ladder) {
      const pivot = new THREE.Group(); pivot.name = n.name + '_pivot';
      pivot.position.copy(u.pivot_w ? Bv(u.pivot_w) : n.getWorldPosition(new THREE.Vector3()));
      root.add(pivot); pivot.updateMatrixWorld(true); pivot.attach(n);
      const it = { node: n, pivot, u, name: n.name, open: 0, target: 0, state: {}, label: u.label || n.name };
      n.traverse(m => { if (m.isMesh) m.userData._it = it; });
      W.interactives.push(it);
      if (MOVING.has(u.interact)) W.movers.push(it);
      if (u.ladder) W.ladders.push(it);
    }
  }

  // ---------------- glow groups: emissive materials that switch with power / lights
  root.traverse(o => {
    if (!o.isMesh) return; const u = ud(o);
    const grp = u.glow_group; if (!grp) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const cl = mats.map(m => { const c = m.clone(); c.userData.baseEmissive = c.emissiveIntensity; return c; });
    o.material = Array.isArray(o.material) ? cl : cl[0];
    (W.glow[grp] ||= []).push(...cl.filter(c => c.emissive && c.emissive.getHex() !== 0));
  });
  // pump displays and other "Display_aus" materials light up with power
  root.traverse(o => {
    if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(m => { if (m.name === 'Display_aus' && !m.userData._reg) { m.userData._reg = 1; (W.glow.display ||= []).push(m); } });
  });

  // ---------------- materials: vertex colours carry the colour; glass double sided, everything else front side
  const seen = new Set();
  root.traverse(o => {
    if (!o.isMesh) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (seen.has(m)) continue; seen.add(m);
      m.vertexColors = true; m.flatShading = true;
      if (m.transparent) { m.depthWrite = false; m.side = THREE.DoubleSide; }
      if (m.name === 'Wasser') { m.transparent = true; m.opacity = .78; m.depthWrite = false; }
      if (m.emissive && m.emissive.getHex() && m.emissiveIntensity > 1.5) m.toneMapped = false;
      m.needsUpdate = true;
    }
    if (o.material.name === 'Wasser') W.waterMeshes.push(o);
  });

  // ---------------- collision: everything static that collides (no trees: those are circles; no movers: own BVH)
  const colGeos = [];
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh) return; const u = ud(o);
    const it = o.userData._it;
    if (u.collide === 0 || u.collide_r || o.material.name === 'Wasser' || (it && (MOVING.has(it.u.interact) || it.u.ladder))) return;
    if (u.ground) { W.ground = o; }
    colGeos.push(floatGeo(o.geometry, o.matrixWorld, ['position']));
  });
  const colGeo = mergeGeometries(colGeos, false); colGeos.forEach(g => g.dispose());
  colGeo.boundsTree = new MeshBVH(colGeo, { maxLeafTris: 8 });
  W.collider = new THREE.Mesh(colGeo, new THREE.MeshBasicMaterial({ visible: false }));
  W.collider.matrixWorld.identity();
  // movers: their own small BVH in pivot space
  for (const it of W.movers) {
    if (it.u.collide === 0) continue;
    const inv = it.pivot.matrixWorld.clone().invert(), gs = [];
    it.node.traverse(m => { if (m.isMesh) gs.push(floatGeo(m.geometry, inv.clone().multiply(m.matrixWorld), ['position'])); });
    if (!gs.length) continue;
    const g = mergeGeometries(gs, false); g.boundsTree = new MeshBVH(g);
    it.bvhGeo = g; it.bounds = new THREE.Box3().setFromBufferAttribute(g.attributes.position);
  }

  // ---------------- instancing (repeated models) + static batching per material (everything else that never moves)
  const staticMeshes = [];
  root.traverse(o => { if (o.isMesh && !o.userData._it && !ud(o).glow_group) staticMeshes.push(o); });
  const byGeo = new Map();
  for (const m of staticMeshes) { const k = m.geometry.uuid + '|' + m.material.uuid; (byGeo.get(k) || byGeo.set(k, []).get(k)).push(m); }
  const batch = new Map();
  for (const list of byGeo.values()) {
    if (list.length >= 4) {
      const im = new THREE.InstancedMesh(list[0].geometry, list[0].material, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m.matrixWorld));
      im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere();
      im.userData.instanced = true; scene.add(im);
    } else for (const m of list) (batch.get(m.material) || batch.set(m.material, []).get(m.material)).push(m);
    for (const m of list) m.removeFromParent();
  }
  for (const [mat, list] of batch) {
    const gs = list.map(m => floatGeo(m.geometry, m.matrixWorld));
    let g; try { g = mergeGeometries(gs, false); } catch { g = null; }
    if (!g) { for (const m of list) scene.add(m); continue; }
    gs.forEach(x => x.dispose());
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = !mat.transparent && mat.name !== 'Boden' && !/^(Markierung|Fuge|Riss|Ölfleck|Gras|Gras_hell|Waldboden|Moos|Laub|Trampelpfad|Bachufer|Asphalt.*|Bankett|Schotter|Fliese.*|Estrich.*|Linoleum.*|Pflaster)$/.test(mat.name);
    mesh.receiveShadow = true; mesh.name = 'batch_' + mat.name; scene.add(mesh);
    if (mat.name === 'Wasser') W.waterMeshes.push(mesh);
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // interactives: size → draw distance; small things (goods, mushrooms, tools) cast no sun shadow
  const bb = new THREE.Box3(), sph = new THREE.Sphere();
  for (const it of W.interactives) {
    bb.setFromObject(it.node); if (bb.isEmpty()) continue; bb.getBoundingSphere(sph);
    it.center = sph.center.clone(); it.radius = sph.radius;
    it.drawDist = Math.min(220, 28 + sph.radius * 70);
    if (sph.radius < .45 && !it.u.ladder) it.node.traverse(m => { if (m.isMesh) m.castShadow = false; });
  }
  // distance culling (called a few times per second): hides far-away small interactives via their pivot
  W.cull = (cam) => { for (const it of W.interactives) if (it.center) { const d = it.drawDist; it.pivot.visible = it.center.distanceToSquared(cam) < d * d; } };

  // tree lookup grid (10 m cells)
  W.treeGrid = new Map();
  for (const t of W.trees) { const k = Math.floor(t.x / 10) + ',' + Math.floor(t.z / 10); (W.treeGrid.get(k) || W.treeGrid.set(k, []).get(k)).push(t); }
  W.treesNear = (x, z) => { const out = []; const cx = Math.floor(x / 10), cz = Math.floor(z / 10);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = W.treeGrid.get((cx + i) + ',' + (cz + j)); if (l) out.push(...l); } return out; };

  // ground height via the collision BVH (straight down)
  const ray = new THREE.Ray(), down = new THREE.Vector3(0, -1, 0);
  W.groundY = (x, z, from = 60) => { ray.origin.set(x, from, z); ray.direction.copy(down);
    const hit = colGeo.boundsTree.raycastFirst(ray, THREE.DoubleSide); return hit ? hit.point.y : 0; };
  W.rayHit = (origin, dir, far) => { ray.origin.copy(origin); ray.direction.copy(dir);
    const hit = colGeo.boundsTree.raycastFirst(ray, THREE.DoubleSide); return hit && hit.distance <= far ? hit : null; };
  return W;
}
