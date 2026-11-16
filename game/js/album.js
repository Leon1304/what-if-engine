// Collection album (handbook → Sammelalbum): animals you have seen, fish you caught, mushrooms and plants you picked, finds (rare items
// from the secret stashes, the boss bear, a meteorite) and natural spectacles. Entries are stored by id in S.album (day of the find).
// Rare items have their own Blender models (bp_r_<id>): the album shows a small picture of each, rendered once into an image.
import * as THREE from 'three';
import { ITEMS, RARE } from './items.js';
import { T } from './i18n.js';

const I = id => [`i_${id}`, ITEMS[id]?.icon || '', ITEMS[id]?.name || id];
export const ALBUM = [
  { id: 'tiere', t: T('🐾 Tiere'), list: [['t_wolf', '🐺', T('Wolf'), T('nachts im Wald')], ['t_boar', '🐗', T('Wildschwein'), T('tagsüber im Unterholz')], ['t_bear', '🐻', T('Braunbär'), T('selten, im Norden')],
    ['t_deer', '🦌', T('Reh'), T('am Waldrand')], ['t_rabbit', '🐇', T('Kaninchen'), T('auf Lichtungen')], ['t_gams', '🐐', T('Gämse'), T('nur im Gebirge')], ['t_dog', '🐕', T('Bello'), T('Kurts Hund')],
    ['t_weiss', '🤍', T('Weißer Hirsch'), T('sehr selten, am Morgen oder Abend')], ['t_grimm', '🐻', T('Der alte Grimm'), T('der Riesenbär vom Steinberg')]] },
  { id: 'fische', t: T('🐟 Fische'), list: [[...I('fisch'), T('Bach und Waldsee')], [...I('saibling'), T('Bergsee')], [...I('hecht'), T('Waldsee, am liebsten am Eisloch')], [...I('goldforelle'), T('selten, überall')]] },
  { id: 'pflanzen', t: T('🍄 Pilze & Pflanzen'), list: [[...I('steinpilz'), T('im Wald')], [...I('pfifferling'), T('im Wald an den Wegen')], [...I('fliegenpilz'), T('giftig!')], [...I('kraeuter'), T('Wiesen und Wegränder')], [...I('edelweiss'), T('hoch oben im Fels')]] },
  { id: 'funde', t: T('💎 Fundstücke'), list: [[...I('goldmuenze'), T('Opa Willis Schatz')], [...I('bergkristall'), T('Stollen „Glück auf“')], ...RARE.filter(k => k !== 'goldforelle').map(k => [...I(k), { meteorit: T('nach einem Feuerball'), kralle: T('vom alten Grimm') }[k] || T('in einem Versteck')])] },
  { id: 'natur', t: T('🌠 Naturschauspiele'), list: [['n_nebel', '🌫️', T('Morgennebel'), T('früh am Morgen in den Senken')], ['n_gluehwuermchen', '✨', T('Glühwürmchen'), T('warme Nächte, am Wasser')], ['n_sternschnuppe', '🌠', T('Sternschnuppe'), T('klare Nächte – nach oben schauen')],
    ['n_feuerball', '☄️', T('Feuerball'), T('ganz selten')], ['n_gewitter', '⛈️', T('Gewitter'), ''], ['n_unwetter', '🌪️', T('Unwetter überstanden'), T('rechtzeitig Schutz suchen')], ['n_schneesturm', '🌨️', T('Schneesturm überstanden'), T('im Winter')], ['n_eis', '🧊', T('Auf dem Eis'), T('Winter: der See friert zu')]] },
];
export const ALBUM_IDS = new Set(ALBUM.flatMap(c => c.list.map(e => e[0])));

export class Album {
  constructor(game) { this.g = game; this.thumbs = {}; this.t = 0; }
  get S() { return this.g.S; }
  see(id, quiet) {
    if (!ALBUM_IDS.has(id)) return false; const A = this.S.album ||= {};
    if (A[id]) return false; A[id] = this.S.day;
    const e = ALBUM.flatMap(c => c.list).find(x => x[0] === id);
    if (!quiet && !this.g.S.creative) { this.g.progress.add(8, ''); this.g.ui.toast(T('📔 Neu im Sammelalbum: {icon} {name} ({n}/{all})', { icon: e[1], name: e[2], n: this.count(), all: ALBUM_IDS.size }), 'good'); }
    return true;
  }
  has(id) { return !!this.S.album?.[id]; }
  count(cat) { const A = this.S.album || {}; return (cat ? ALBUM.find(c => c.id === cat).list : ALBUM.flatMap(c => c.list)).filter(e => A[e[0]]).length; }
  // animals in sight (a few times per second): close enough, alive
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = .5;
    const g = this.g, p = g.P.pos;
    for (const a of g.life.animals) if (a.pos.distanceTo(p) < (a.kind === 'grimm' ? 45 : 28)) this.see(a.white ? 't_weiss' : 't_' + a.kind);
    if (g.life.dog && g.life.dog.pos.distanceTo(p) < 12) this.see('t_dog');
  }
  // a small picture of a rare item's model (rendered once, cached as a data URL)
  thumb(id) {
    if (id in this.thumbs) return this.thumbs[id];
    const tpl = this.g.W.bp['r_' + id], r = this.g.renderer; if (!tpl || !r) return this.thumbs[id] = null;
    const N = 96, rt = new THREE.WebGLRenderTarget(N, N, { samples: 4 }), sc = new THREE.Scene(), o = tpl.clone(true); sc.add(o);
    sc.add(new THREE.HemisphereLight('#fff8ec', '#5a4a3a', 2.4)); const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(1, 2, 1.5); sc.add(sun);
    o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3()).length() || .2;
    const cam = new THREE.PerspectiveCamera(30, 1, s / 50, s * 20); cam.position.copy(c).add(new THREE.Vector3(.55, .5, .8).normalize().multiplyScalar(s * 1.4)); cam.lookAt(c);
    const old = r.getRenderTarget(), cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
    r.setRenderTarget(rt); r.setClearColor('#000000', 0); r.clear(); r.render(sc, cam);
    const buf = new Uint8Array(N * N * 4); r.readRenderTargetPixels(rt, 0, 0, N, N, buf); r.setRenderTarget(old); r.setClearColor(cc, ca); rt.dispose();
    const cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'), img = x.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) { const s0 = ((N - 1 - y) * N + i) * 4, d = (y * N + i) * 4;
      for (let k = 0; k < 3; k++) img.data[d + k] = Math.min(255, Math.pow(buf[s0 + k] / 255, 1 / 2.2) * 255); img.data[d + 3] = buf[s0 + 3]; }
    x.putImageData(img, 0, 0); return this.thumbs[id] = cv.toDataURL();
  }
  html() {
    const A = this.S.album || {}, n = this.count(), stash = this.g.W.interactives.filter(it => it.u.stash), open = stash.filter(it => it.state.searched).length;
    let h = `<p>${T('Was du siehst, fängst und findest, kommt hier hinein: <b>{n}/{all}</b> Einträge · 🗝️ Geheimverstecke: <b>{open}/{stash}</b>. Seltene Fundstücke haben im Rucksack einen goldenen Rahmen.', { n, all: ALBUM_IDS.size, open, stash: stash.length })}</p>`;
    for (const c of ALBUM) {
      h += `<h4>${c.t} <small>${this.count(c.id)}/${c.list.length}</small></h4><div class="album">`;
      for (const [id, icon, name, hint] of c.list) {
        const got = A[id], img = got && id.startsWith('i_') && ITEMS[id.slice(2)]?.rare ? this.thumb(id.slice(2)) : null;
        h += `<div class="alb ${got ? 'on' : ''} ${id.startsWith('i_') && ITEMS[id.slice(2)]?.rare ? 'rare' : ''}">${img ? `<img src="${img}" alt="">` : `<i>${got ? icon : '❔'}</i>`}<b>${got ? name : '???'}</b><small>${got ? T('Tag {d}', { d: got }) : hint}</small></div>`;
      }
      h += `</div>`;
    }
    return h;
  }
}
