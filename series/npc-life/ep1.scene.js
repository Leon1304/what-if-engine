// ===== NPC Life · Vice City world (shared by every episode) =====
const KF = (keys, t) => {   // keyframes [[t, x, z], …] → [x, z, vx, vz]
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2], 0, 0];
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, z1] = keys[i], [t0, x0, z0] = keys[i - 1];
    if (t <= t1) { const k = (t - t0) / (t1 - t0 || 1); return [lerp(x0, x1, k), lerp(z0, z1, k), (x1 - x0) / (t1 - t0 || 1), (z1 - z0) / (t1 - t0 || 1)]; }
  }
  const L = keys[keys.length - 1]; return [L[1], L[2], 0, 0];
};
const TEX = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx; };
const plane = (p, w, h, tex, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })); m.position.set(x, y, z); m.rotation.y = ry; p.add(dyn(m)); return m; };
const FONT = (px, it = '') => `${it} 900 ${px}px "Arial Black", Impact, "DejaVu Sans", sans-serif`;
const neonText = (txt, col, w, h, px) => TEX(w, h, g => {
  g.font = FONT(px, 'italic'); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = col; g.shadowBlur = px * 0.35; g.fillStyle = col; for (let i = 0; i < 4; i++) g.fillText(txt, w / 2, h / 2);
  g.shadowBlur = px * 0.08; g.fillStyle = '#FFF0F8'; g.fillText(txt, w / 2, h / 2);
});

// ground, sea, Ocean-Drive-style strip: road · pink promenade · beach
ground({ color: '#C9C0B0', flat: 140, hills: 2, coast: 27, sand: '#F0DDAE', depth: 4 });
water({ level: -0.3, waves: 0.22, color: '#27B5C9' });
road(world, [[-110, 4.5], [120, 4.5]], { w: 8 });
box(world, 240, 0.08, 4.4, '#F3C6BD', 5, 0, 10.7, { cast: false });
box(world, 240, 0.04, 14, '#F0DDAE', 5, 0, 19.8, { cast: false });
box(world, 240, 0.1, 5.4, '#DCD3C4', 5, 0, -3.3, { cast: false });

// art-deco hotels with neon trims
function deco(x, w, h, wall, neon) {
  const d = 10, g = stat(grp(world, x, 0, -11)), nm = mat(neon, { em: neon, ei: 2.4 });
  const win = mat('#2A3550', { rough: 0.3 }), lit = mat('#2A3550', { em: '#FFD9A0', ei: 1.0 });
  box(g, w, h, d, wall); box(g, w * 0.55, 1.6, d * 0.7, wall, 0, h, 0); box(g, w * 0.25, 1.2, d * 0.4, wall, 0, h + 1.6, 0);
  for (let y = 1.6; y < h - 1.5; y += 2.6) {
    box(g, w + 0.3, 0.18, 0.5, '#FFFFFF', 0, y + 1.6, d / 2 + 0.1, { cast: false });
    for (let k = 0; k < Math.floor(w / 2.2); k++) { const xx = -w / 2 + 1.3 + k * 2.2; if (Math.abs(xx) < 0.8) continue; box(g, 1.2, 1.2, 0.08, '', xx, y, d / 2 + 0.03, { mat: rnd() < 0.45 ? lit : win, cast: false }); }
  }
  box(g, 0.35, h + 1.4, 0.3, '', 0, 0.4, d / 2 + 0.2, { mat: nm, cast: false });
  box(g, w + 0.1, 0.22, 0.3, '', 0, h - 0.25, d / 2 + 0.2, { mat: nm, cast: false });
  box(g, 3.2, 2.6, 0.2, '#2B2B33', w / 4, 0, d / 2 + 0.05, { cast: false });
  return g;
}
[[-72, 12, 13, '#C8F0DD', '#B04CFF'], [-58, 12, 11, '#F7C6D9', '#FF3EA5'], [-18, 12, 16, '#D7C8F2', '#B04CFF'], [0, 14, 13, '#FFD3B0', '#FF3EA5'],
 [15, 12, 15, '#C8F0DD', '#2EE6D6'], [30, 13, 10, '#F9C4D2', '#FF8A3D'], [45, 12, 18, '#BFE3F7', '#2EE6D6'], [60, 12, 12, '#FFF0B8', '#FF3EA5'], [75, 12, 14, '#E7D0F5', '#2EE6D6']]
  .forEach(([x, w, h, c, n]) => deco(x, w, h, c, n));

// the big neon sign on the roof + one pink glow
plane(world, 14, 3.5, neonText('Vice City', '#FF4FB0', 1600, 400, 250), 0, 15.0, -6.2);
glow(0, 14.5, -3.5, { intensity: 40, dist: 20, color: '#FF4FB0', flicker: 0 });

// hospital (respawn point)
const hosp = stat(grp(world, -34, 0, -11));
box(hosp, 14, 9, 10, '#EEF1F3'); box(hosp, 14.4, 0.4, 10.4, '#D0D6DC', 0, 9, 0);
box(hosp, 0.8, 2.6, 0.2, '#E23B3B', 0, 5.9, 5.05); box(hosp, 2.6, 0.8, 0.2, '#E23B3B', 0, 6.8, 5.05);
box(hosp, 4, 2.8, 0.2, '#7FB3D5', 0, 0, 5.05, { cast: false });
for (const xx of [-5, -3, 3, 5]) for (const yy of [1.2, 4.2, 6.9]) box(hosp, 1.4, 1.3, 0.1, '#7FB3D5', xx, yy, 5.03, { cast: false });
plane(world, 9, 1.3, TEX(1200, 175, (g, w, h) => { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h); g.font = FONT(96); g.fillStyle = '#C62828'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('VICE CITY GENERAL', w / 2, h / 2 + 4); }), -34, 3.75, -5.8);

// news screen on the mint hotel: tourist ad → breaking news
const scrA = TEX(1280, 720, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#FF4FB0'); gr.addColorStop(1, '#FF9A3D'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFFFFF'; g.font = FONT(70); g.fillText('WELCOME TO', w / 2, 170);
  g.font = FONT(190, 'italic'); g.fillText('VICE CITY', w / 2, 340); g.font = FONT(64); g.fillStyle = '#1B1035'; g.fillText('LAUNCH DAY · 11.19', w / 2, 560);
});
const scrB = TEX(1280, 720, (g, w, h) => {
  g.fillStyle = '#101624'; g.fillRect(0, 0, w, h); g.fillStyle = '#D62839'; g.fillRect(0, 0, w, 150);
  g.textBaseline = 'middle'; g.fillStyle = '#FFFFFF'; g.font = FONT(92); g.fillText('BREAKING NEWS', 48, 80);
  g.fillStyle = '#F3E3B5'; g.fillRect(120, 230, 300, 60); g.fillRect(170, 190, 200, 60);   // straw hat
  g.fillStyle = '#E8B892'; g.fillRect(170, 290, 200, 180); g.fillStyle = '#1A1A1A'; g.fillRect(205, 345, 40, 26); g.fillRect(295, 345, 40, 26);
  g.fillStyle = '#2EC4B6'; g.fillRect(130, 470, 280, 200);
  g.fillStyle = '#FFFFFF'; g.font = FONT(84); g.fillText('HOT DOG MAN', 480, 300); g.fillStyle = '#FF3B4A'; g.fillText('WANTED', 480, 410);
  g.fillStyle = '#FFD23F'; g.font = FONT(110); g.fillText('★★★★★', 470, 560);
});
box(world, 9.6, 5.7, 0.3, '#15161A', 15, 6.65, -5.95, { cast: false, stat: true });
const screen = plane(world, 9, 5.1, scrA, 15, 9.5, -5.75);
tick(t => { const m = t >= 39.6 ? scrB : scrA; if (screen.material.map !== m) { screen.material.map = m; screen.material.needsUpdate = true; } });

// palms, lamps, beach umbrellas, lifeguard tower, boats, skyline
for (let x = -80; x <= 92; x += 9) { const xx = x + rr(-1, 1); if (xx > -3 && xx < 12) continue; tree(world, xx, 13.3, { kind: 'palm', size: rr(1.25, 1.55) }); }
for (let i = 0; i < 12; i++) { const x = rr(-60, 85); if (x > -2 && x < 14) continue; tree(world, x, rr(16, 24), { kind: 'palm', size: rr(1.1, 1.6) }); }
for (let x = -76; x <= 92; x += 18) lamp(world, x, 8.9, { light: false, h: 4.2, color: '#FFE3B0' });
[[-14, 19, '#FF4FB0'], [-9, 21, '#2EC4B6'], [18, 19.5, '#FFD23F'], [32, 21, '#FF4FB0'], [40, 18.5, '#2EC4B6']].forEach(([x, z, c]) => {
  const u = stat(grp(world, x, 0, z)); cyl(u, 0.05, 0.05, 2.2, '#EEEEEE'); cone(u, 1.5, 0.6, c, 0, 2.0, 0); box(u, 0.7, 0.08, 1.8, '#FFFFFF', 1.2, 0, 0.4, { cast: false });
});
const tower0 = stat(grp(world, 24, 0, 21));
for (const [sx, sz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) box(tower0, 0.15, 2.4, 0.15, '#F5F5F5', sx, 0, sz);
box(tower0, 2.2, 1.6, 2.2, '#FF6FAE', 0, 2.4, 0); prism(tower0, 2.6, 0.8, 2.6, '#2EC4B6', 0, 4.0, 0);
for (const [x, z, c] of [[30, 46, '#FF3EA5'], [-22, 58, '#F2F2F2']]) { const b = boat(world, x, z, { color: c }); bob(b.g); }
const C = city({ nx: 5, nz: 2, at: [10, -46], block: 16, street: 6, hmin: 24, hmax: 62, lit: 1 });
traffic(C.loops, { per: 1, speed: 8 });

// NPC traffic on the beach road (gone once the story takes over the road)
[[0, 2.4, -12, '#2EC4B6'], [70, 2.4, -12, '#F2F2F2'], [-20, 5.6, 12, '#FFD23F'], [50, 5.6, 12, '#B04CFF'], [120, 5.6, 12, '#E8413C']].forEach(([x0, z, v, c]) => {
  const car = vehicle(world, 0, 0, { kind: 'car', color: c }); dyn(car.g);
  tick(t => { const x = (((x0 + v * t + 110) % 220) + 220) % 220 - 110; car.g.position.set(x, 0.05, z); car.g.rotation.y = v > 0 ? Math.PI / 2 : -Math.PI / 2; car.g.visible = t < (v < 0 ? 12.4 : 25.5); });
});

// hot dog stand (smashed in the chase)
const stand = dyn(grp(world, 3.0, 0, 10.6));
box(stand, 2.4, 1.0, 1.2, '#F7F7F2', 0, 0.3, 0); box(stand, 2.42, 0.22, 1.22, '#E8413C', 0, 0.75, 0);
box(stand, 0.2, 0.3, 1.0, '#2A2D33', -0.9, 0, 0); box(stand, 0.2, 0.3, 1.0, '#2A2D33', 0.9, 0, 0);
cyl(stand, 0.05, 0.05, 1.8, '#DDDDDD', 0.7, 1.3, 0); cone(stand, 1.6, 0.7, '#FF4FB0', 0.7, 3.0, 0);
for (let k = 0; k < 5; k++) { box(stand, 0.32, 0.1, 0.13, '#D9A55A', -0.85 + k * 0.32, 1.3, 0.25); box(stand, 0.36, 0.09, 0.07, '#B5452E', -0.85 + k * 0.32, 1.36, 0.25); }
plane(stand, 1.9, 0.42, TEX(760, 170, (g, w, h) => { g.fillStyle = '#E8413C'; g.fillRect(0, 0, w, h); g.font = FONT(110); g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HOT DOGS', w / 2, h / 2 + 6); }), 0, 0.86, 0.62);
tick(t => { const k = clamp((t - 47.02) / 0.7); stand.position.set(3.0 + 6 * EASE.out(k), 1.8 * Math.sin(Math.PI * k), 10.6 + 1.5 * k); stand.rotation.set(0.6 * k, 0, -1.9 * EASE.out(k)); });
const dogs = Array.from({ length: 10 }, () => { const d = dyn(grp(world)); box(d, 0.34, 0.1, 0.13, '#D9A55A', 0, 0, 0); box(d, 0.38, 0.09, 0.07, '#B5452E', 0, 0.06, 0); return d; });
tick(t => dogs.forEach((d, i) => { const dt = t - 47.02; d.visible = dt > 0; if (dt <= 0) return; const u = Math.min(dt, 1.5); d.position.set(3 + (2 + 6 * hash(i)) * u, Math.max(0.05, 1.3 + (5 + 4 * hash(i + 9)) * u - 4.9 * u * u), 10.6 + (-1 + 6 * hash(i + 17)) * u); d.rotation.set(u * 9 * hash(i + 3), u * 7, u * 5); }));
emit('debris', { at: [3, 1, 10.6], t0: 47.02, burst: 16, speed: 5 });
emit('dust', { at: [3, 0.3, 10.6], t0: 47.02, t1: 48.2, rate: 14, jitter: 2 });

// the pink convertible ("your car") – later the player's, Gerald always riding shotgun
function convertible(col) {
  const g = dyn(grp(world)), b = mat(col, { rough: 0.35, metal: 0.3 });
  box(g, 1.8, 0.5, 4.3, '', 0, 0.28, 0, { mat: b }); box(g, 1.7, 0.18, 1.3, '', 0, 0.78, 1.35, { mat: b }); box(g, 1.7, 0.2, 1.1, '', 0, 0.78, -1.6, { mat: b });
  box(g, 1.6, 0.42, 0.06, '#BFE6F2', 0, 0.86, 0.66, { opacity: 0.45 });
  for (const sx of [-0.42, 0.42]) { box(g, 0.6, 0.18, 0.6, '#F5EEE2', sx, 0.6, -0.25); box(g, 0.6, 0.6, 0.15, '#F5EEE2', sx, 0.6, -0.6); }
  box(g, 0.34, 0.34, 0.06, '#2A2D33', 0.42, 0.95, 0.3);
  for (const [wx, wz] of [[0.9, 1.35], [-0.9, 1.35], [0.9, -1.35], [-0.9, -1.35]]) { const pv = grp(g, wx, 0.36, wz); cyl(pv, 0.36, 0.36, 0.28, '#1E2026', 0, -0.14, 0, { rz: Math.PI / 2, seg: 12 }); }
  for (const sx of [-0.6, 0.6]) { box(g, 0.35, 0.14, 0.05, '', sx, 0.55, 2.16, { mat: mat('#FFF7D6', { em: '#FFF7D6', ei: 2 }), cast: false }); box(g, 0.35, 0.12, 0.05, '', sx, 0.6, -2.16, { mat: mat('#FF2A3D', { em: '#FF2A3D', ei: 2 }), cast: false }); }
  return g;
}
const pcar = convertible('#FF5FA8');
const chase = new Path([[-60, 4.6], [-6, 4.6], [0, 10.5], [8, 10.5], [14, 4.6], [120, 4.6]]);
const chS = t => t < 47.69 ? 20 * (t - 43.75) : 78.82 + 9 * (t - 47.69);
const PC = t => {
  if (t < 18) return { x: -4, z: 7.6, yaw: Math.PI / 2, v: true };
  if (t < 21.7) return { x: -4 + 5 * (t - 18) ** 2, z: 7.6, yaw: Math.PI / 2, v: true };
  if (t >= 26.4 && t < 31.6) return { x: -70 + 25 * (t - 26.5), z: 5.2, yaw: Math.PI / 2, v: true };
  if (t >= 35.2 && t < 39.45) return { x: -60 + ((t - 35.2) % 1) * 120, z: 5.2, yaw: Math.PI / 2, v: true };
  if (t >= 43.75) { const s = chS(t), P = chase.at(s), D = chase.dir(s); return { x: P.x, z: P.z, yaw: Math.atan2(D.x, D.z), v: true }; }
  return { x: 0, z: -300, yaw: 0, v: false };
};
tick(t => { const c = PC(t); pcar.visible = c.v; pcar.position.set(c.x, 0.05, c.z); pcar.rotation.y = c.yaw; });
track('pcar', pcar, 0.8);
const g = gerald({ scale: 1.5 }); pcar.add(g.root); g.root.position.set(-0.42, 0.62, -0.25);
track('gerald', g.root, 0.4);
const hd = dyn(grp(g.head, 0, -0.02, 0.24)); box(hd, 0.26, 0.07, 0.09, '#D9A55A', 0, -0.03, 0); box(hd, 0.3, 0.06, 0.05, '#B5452E', 0, 0.0, 0);
tick(t => { hd.visible = t >= 47.3; });
const gl = new THREE.PointLight('#FFD9E8', 0, 7, 1.6); gl.position.set(-0.5, 2.8, 2.2); pcar.add(gl);
tick(t => { gl.intensity = t > 48.5 ? 5 : 0; });

// the player: a black car that spawns under a green marker; the marker jumps to your car
const bcar = vehicle(world, 12, 2.6, { kind: 'car', color: '#16181D', ry: -Math.PI / 2 }); dyn(bcar.g); appear(bcar.g, 12.7);
const arrow = dyn(grp(world)), am = mat('#5BFF6A', { em: '#5BFF6A', ei: 2.4 });
const ac = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 4), am); ac.rotation.x = Math.PI; arrow.add(ac);
const as = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8), am); as.position.y = 0.9; arrow.add(as);
tick(t => {
  let x = 12, z = 2.6, hy = 0, v = t >= 12.6;
  if (t >= 16.9 && t < 17.7) { const k = (t - 16.9) / 0.8; x = lerp(12, -4, k); z = lerp(2.6, 7.6, k); hy = 3 * Math.sin(Math.PI * k); }
  else if (t >= 17.7) { const c = PC(t); x = c.x; z = c.z; v = c.v; }
  arrow.visible = v; arrow.position.set(x, 3.3 + hy + 0.22 * Math.sin(t * 4), z); arrow.rotation.y = t * 2.5;
});

// police cars with blinking light bars
const pol = [0.6, 1.0, 1.4].map(d => {
  const v = vehicle(world, 0, 0, { kind: 'car', color: '#F4F5F7' }); dyn(v.g);
  const r = mat('#FF2A3D', { em: '#FF2A3D', ei: 3, own: true }), bl = mat('#2A6BFF', { em: '#2A6BFF', ei: 3, own: true });
  box(v.g, 0.5, 0.16, 0.3, '', -0.3, 1.6, -0.2, { mat: r, cast: false }); box(v.g, 0.5, 0.16, 0.3, '', 0.3, 1.6, -0.2, { mat: bl, cast: false });
  return { v, d, r, bl };
});
tick(t => pol.forEach(({ v, d, r, bl }, i) => {
  const on = t >= 43.75 + d; v.g.visible = on; if (!on) return;
  const s = chS(t - d), P = chase.at(s), D = chase.dir(s); v.g.position.set(P.x, 0.05, P.z); v.g.rotation.y = Math.atan2(D.x, D.z);
  const f = Math.floor(t * 8 + i) % 2; r.emissiveIntensity = f ? 3.5 : 0.2; bl.emissiveIntensity = f ? 0.2 : 3.5;
}));

// police helicopter with a searchlight (on you, then on the chase)
const heli = dyn(grp(world));
box(heli, 1.6, 1.4, 3.4, '#1E2A44', 0, 0, 0); box(heli, 1.4, 0.8, 1.2, '#9FC3D9', 0, 0.3, 1.5, { opacity: 0.7 });
box(heli, 0.35, 0.4, 3.2, '#1E2A44', 0, 0.6, -3.0); box(heli, 0.12, 1.0, 0.7, '#1E2A44', 0, 0.6, -4.5);
for (const sx of [-0.65, 0.65]) box(heli, 0.1, 0.1, 3.0, '#22252B', sx, -0.55, 0);
const rotor = dyn(grp(heli, 0, 1.55, 0)); box(rotor, 0.25, 0.05, 7.5, '#2A2D33'); box(rotor, 7.5, 0.05, 0.25, '#2A2D33');
const HL = new THREE.SpotLight('#EAF2FF', 0, 70, 0.2, 0.5, 1.2); world.add(HL, HL.target);
const hcone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 18, 1, true), mat('#EAF2FF', { basic: true, opacity: 0.08 })); world.add(dyn(hcone));
const HP = new THREE.Vector3(), HT = new THREE.Vector3();
tick(t => {
  const on = t >= 40.6; heli.visible = on; hcone.visible = on; HL.intensity = on ? 1800 : 0; if (!on) return;
  HP.set(5.5 + 3 * Math.sin(t * 0.35), 15 + 10 * (1 - EASE.out(clamp((t - 40.6) / 1.5))), 2 + 1.5 * Math.cos(t * 0.3));
  heli.position.copy(HP); heli.rotation.set(0.12, -0.6 + 0.1 * Math.sin(t * 0.5), 0.05); rotor.rotation.y = t * 30;
  if (t < 45.2) HT.set(5.5, 0, 12.2); else { const c = PC(t); HT.set(c.x, 0, c.z); }
  HL.position.copy(HP); HL.target.position.copy(HT);
  const len = HP.distanceTo(HT); hcone.scale.set(len * 0.22, len, len * 0.22); hcone.position.copy(HP).add(HT).multiplyScalar(0.5); hcone.lookAt(HT); hcone.rotateX(-Math.PI / 2);
});

// ===== Episode 1 cast =====
// you: hot dog stand → "Nice day" walk → stares at the player → walks into traffic → ragdoll
const you = char('you', { expr: t => t < 12.7 ? 'happy' : t < 18 ? 'scared' : t < 21.1 ? 'shout' : t < 25.9 ? 'calm' : t < 29.45 ? 'happy' : 'scared' });
world.add(you.root); track('you', you);
const youK = [[8.3, 3.2, 11.9], [11.9, 9.0, 11.9], [26.0, 9.0, 11.9], [29.0, 5.0, 5.2]];
tick(t => {
  const [x, z, vx, vz] = KF(youK, t), mv = Math.hypot(vx, vz) > 0.01, r = you.root;
  const yaw = t < 8.3 ? 0 : mv ? Math.atan2(vx, vz) : t < 12.6 ? Math.PI / 2 : t < 26 ? Math.PI : -Math.PI / 2;
  r.visible = t < 30.6;
  if (t >= 29.5) { const k = clamp((t - 29.5) / 1.0); r.position.set(x + 10 * k, 5.5 * Math.sin(Math.PI * k), z + 7 * k); r.rotation.set(9 * k, yaw, 5 * k); pose(you, 'panic', t * 12, t); return; }
  r.position.set(x, 0, z); r.rotation.set(0, yaw, 0);
  pose(you, mv ? 'walk' : t > 10.9 && t < 12.6 ? 'point' : 'idle', t * 4.6, t);
});

// you, respawned at the hospital with the bill
const you2 = char('you', { expr: t => t < 31.6 ? 'scared' : 'angry', hold: '#FAFAF5' }); world.add(you2.root); track('you2', you2);
you2.root.position.set(-34, 0, -3.2); appear(you2.root, 29.85);
tick(t => { you2.root.visible = t >= 29.85 && t < 35.05; pose(you2, 'hold', 0, t); });
const bill = dyn(grp(world, -33.66, 0, -2.75)), bV = dyn(grp(bill, 0, 0.95, 0)), bH = dyn(grp(bill, 0, 0.01, 0));
box(bV, 0.4, 1, 0.012, '#FAFAF5', 0, -1, 0, { cast: false }); box(bH, 0.4, 0.012, 1, '#FAFAF5', 0, 0, 0.5, { cast: false });
tick(t => { const k = clamp((t - 30.5) / 1.8); bill.visible = t >= 30.5 && t < 35.05; bV.scale.y = Math.max(0.001, Math.min(1, k * 2)) * 0.95; bH.scale.z = Math.max(0.001, (k - 0.5) * 2 * 4.5); });

// you again: bounced by every lap, then under the searchlight, then dives from the chase
const you3 = char('you', { expr: t => t < 39.4 ? 'angry' : t < 47.2 ? 'scared' : 'shout' }); world.add(you3.root); track('you3', you3);
tick(t => {
  const r = you3.root; r.visible = t >= 34.95;
  if (t < 39.4) {
    const ph = (((t - 35.74) % 1) + 1) % 1, air = t >= 35.74 && ph < 0.75, k = ph / 0.75;
    r.position.set(5, air ? 3.2 * Math.sin(Math.PI * k) : 0, 5.2); r.rotation.set(air ? TAU * k : 0, 0, 0);
    pose(you3, air ? 'panic' : 'idle', t * 10, t); return;
  }
  const k = clamp((t - 47.25) / 0.6);
  r.position.set(5.5 + 1.2 * k, 1.2 * Math.sin(Math.PI * k), 12.2 + 3 * k); r.rotation.set(-1.4 * EASE.out(k), 0, 0);
  pose(you3, t >= 47.25 ? 'panic' : 'idle', t * 8, t);
});
glow(5.5, 2.4, 15.5, { t0: 39.4, intensity: 16, dist: 7, color: '#FFE2C8', flicker: 0 });

// Dr. Steve, on site: pops in for his tip, then runs from the consequences
const steve = char('steve', { expr: t => t < 28.4 ? 'happy' : 'scared' }); world.add(steve.root); track('steve', steve);
appear(steve.root, 20.9);
const stK = [[28.6, 7.0, 12.4], [31.0, 16, 18]];
tick(t => {
  const r = steve.root, [x, z, vx, vz] = KF(stK, t), mv = Math.hypot(vx, vz) > 0.01;
  r.visible = t >= 20.9 && t < 31.2; r.position.set(x, 0, z); r.rotation.set(0, mv ? Math.atan2(vx, vz) : 0.5, 0);
  pose(steve, mv ? 'run' : t > 21.1 && t < 25.8 ? 'point' : 'idle', t * 7, t);
});
