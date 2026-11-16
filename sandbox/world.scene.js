// What If Town — the town (same in every state) + the scenario from the hash (SBX / SC from world.story.js).
// Only engine functions here (city, suburb, traffic, horde, biome, asteroidImpact …) — new things belong in template.html.
ground({ color: '#7E8A5E', flat: 230, hills: 14, size: 1100 });
const C = city({ nx: 4, nz: 3, block: 22, street: 9, at: [0, 0], hmin: 10, hmax: 40, backdrop: false });
const S1 = suburb({ at: [0, 86], nx: 7, rows: 1, seed: 4 });
const S2 = suburb({ at: [0, -88], nx: 7, rows: 1, seed: 9 });
const HOUSES = [...S1.houses, ...S2.houses], BLD = [...C.towers, ...HOUSES];
const cars = traffic([...C.loops, ...S1.loops, ...S2.loops], { per: 1 });
// people strolling on the green strips between the city and the suburbs (pre-simulated crowds, pure function of t).
// Crowd lanes clear city() towers they touch (clip QA) — so they stay off the blocks.
const WALKERS = [
  { from: [-58, 55], to: [58, 55] }, { from: [56, 56], to: [-60, 56] }, { from: [60, -56], to: [-58, -56] }, { from: [-56, -55], to: [60, -55] }
].map((w, i) => horde({ kind: 'human', n: 6, ...w, r: 1.6, mode: 'walk', speed: [1.0, 1.4], t0: 0, t1: 0.1, mix: { woman: 0.4, kid: 0.12, old: 0.15 } }));
LIVE.buildings = BLD.length; LIVE.cars = cars.length;
const SANDBOX_BUILD = {
  none() {},
  asteroid() {
    const at = [SBX.x, SBX.z], R = SC.radius, fa = (Number.isFinite(SBX.from) ? SBX.from : 142) * Math.PI / 180, fe = 20 * Math.PI / 180;
    const I = asteroidImpact({ at, t1: SC.t1, t0: 0, size: 6, radius: R, speed: 48, dist: 520, breaks: BLD,
      from: [Math.sin(fa) * Math.cos(fe), Math.sin(fe), Math.cos(fa) * Math.cos(fe)] });
    // counters: when the front reaches each building (centre of its footprint) → destroyed from then on
    const bb = new THREE.Box3(), hits = [];
    for (const b of BLD) { const g = b.g ?? b; bb.setFromObject(g); const c = bb.getCenter(new THREE.Vector3()); if (Math.hypot(c.x - at[0], c.z - at[1]) <= R) hits.push(I.hitT(c.x, c.z)); }
    hits.sort((a, b) => a - b);
    const nHit = t => { let lo = 0, hi = hits.length; while (lo < hi) { const m = (lo + hi) >> 1; if (hits[m] <= t) lo = m + 1; else hi = m; } return lo; };
    LIVE.destroyed = nHit; LIVE.standing = t => BLD.length - nHit(t); LIVE.front = t => I.front(t);
    track('rock', I.rock);
  }
};
(SANDBOX_BUILD[SBX.s] ?? SANDBOX_BUILD.none)();
biome('plain', { area: 150, density: 0.8 });
