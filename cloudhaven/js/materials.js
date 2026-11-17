// Gemeinsame Materialien. Alles, was sich mit der Zeit ändert (Wind, Jahreszeit, Schnee, Nacht, Wasser), steckt in Uniforms –
// die Geometrie bleibt fest, die Grafikkarte animiert.
import * as THREE from 'three';

export const U = {
  uTime: { value: 0 }, uWind: { value: 1 }, uAutumn: { value: 0 }, uSnow: { value: 0 }, uSpring: { value: 0 }, uSummer: { value: 0 },
  uNight: { value: 0 }, uLate: { value: 0 }, uUpView: { value: new THREE.Vector3(0, 1, 0) }, uRain: { value: 0 },
};

const HASH = `float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }`;

// Fenster je Fenster: Wert w (Attribut win, sonst Weltraster; Glas mit Zimmer dahinter trägt win + 1 und leuchtet dezenter). Abends gehen die Fenster nacheinander an (Schwelle gegen uNight),
// einige bleiben dunkel, spät nachts (uLate) gehen etwa 45 % wieder aus. Lichtfarbe je Fenster: warmweiß, gelb, orange, selten Fernseher.
const WIN = `
float winW(float w, vec3 p){ return w > .001 ? w : .02 + .98 * hh(floor(p.xz * .9) + floor(p.y * .8)); }
float winOn(float w){
  float th = .1 + .72 * fract(w * 13.71);
  float on = smoothstep(th, th + .06, uNight) * step(.12, fract(w * 5.37));
  float lt = .08 + .8 * fract(w * 7.73);
  return on * (1. - step(fract(w * 31.17), .45) * smoothstep(lt, lt + .05, uLate));
}
vec3 winCol(float w){
  float c = fract(w * 3.13);
  if (c < .4) return vec3(1., .76, .5);
  if (c < .72) return vec3(1., .66, .3);
  if (c < .94) return vec3(1., .52, .22);
  return vec3(.5, .66, 1.) * (.55 + .45 * abs(sin(uTime * 9. + w * 40.)) * (.75 + .25 * sin(uTime * 2.3 + w * 9.)));
}`;

function windVertex(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
attribute float sway; attribute float tag; attribute float win; varying float vTag; varying float vWin; varying vec3 vWP; uniform float uTime; uniform float uWind;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
vec4 wpp = modelMatrix * vec4(transformed, 1.0);
float ph = uTime * 1.6 + wpp.x * .23 + wpp.z * .19;
transformed += vec3(sin(ph) + .4 * sin(ph * 2.3 + 1.7), 0., cos(ph * .8 + .5)) * sway * .07 * uWind;
vTag = tag; vWin = win; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
}

// Feste Welt: Flächenfarbe aus Vertex-Farben, Wind, Herbstlaub, Blüte, Schnee auf allem, was nach oben zeigt
export const worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .88, metalness: 0 });
worldMat.onBeforeCompile = shader => {
  Object.assign(shader.uniforms, U);
  windVertex(shader);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
varying float vTag; varying float vWin; varying vec3 vWP; uniform float uAutumn, uSnow, uSpring, uSummer, uTime, uNight, uLate; uniform vec3 uUpView;
${HASH}${WIN}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
{
  float t = floor(vTag + .5); float h = vn(vWP.xz * .35);
  vec3 c = diffuseColor.rgb; float L = dot(c, vec3(.3,.55,.15));
  if (t == 1.) {                                       // Laub
    vec3 aut = mix(vec3(.62,.12,.03), vec3(.85,.42,.04), h); aut = mix(aut, vec3(.9,.65,.08), step(.7, hh(floor(vWP.xz*.5))));
    c = mix(c, aut * (L * 2.6 + .25), uAutumn);
    c = mix(c, mix(c, vec3(1., .62, .78), .75), uSpring * step(.55, hh(floor(vWP.xz * .4))));
    c = mix(c, c * vec3(.9, 1.05, .8), uSummer);
  } else if (t == 2.) {                                // Gras, Boden
    c = mix(c, c * vec3(1.25, .98, .55), uAutumn * .6); c = mix(c, c * vec3(1.05, 1.08, .8), uSummer * .5);
  } else if (t == 3.) {                                // Getreide
    vec3 ripe = vec3(.78, .58, .16) * (.8 + .4 * h);
    c = mix(c, ripe, clamp(uSummer + uAutumn * .6, 0., 1.)); c = mix(c, vec3(.45, .32, .16), uAutumn * .5);
  } else if (t == 4.) {                                // Nadeln
    c = mix(c, c * vec3(.85, .95, .85), uAutumn * .4);
  } else if (t == 5.) {                                // Blumen
    c = mix(c, vec3(.55, .45, .2), uAutumn * .7);
  } else if (t == 8.) {                                // Obst: Frühling Blüten, Sommer teils noch grün, Herbst reif, Winter Schnee
    float hb = hh(floor(vWP.xz * 9.) + floor(vWP.y * 9.) * 7.);
    float wi = clamp(1. - uSpring - uSummer - uAutumn, 0., 1.);
    c = mix(c, mix(c, vec3(.5, .66, .2), .6), uSummer * step(.55, hb));
    c = mix(c, mix(vec3(1., .96, .97), vec3(1., .7, .83), step(.5, hb)), uSpring);
    c = mix(c, vec3(.9, .93, .98), wi);
  }
  diffuseColor.rgb = c;
}`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float up = dot(normal, uUpView); float t = floor(vTag + .5);
  float s = uSnow * smoothstep(.35, .8, up) * (t == 5. ? 1.4 : t == 7. ? 0. : 1.) * smoothstep(.2, .5, vn(vWP.xz * 1.3) * .6 + uSnow * .7);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.93, .96, 1.), clamp(s, 0., 1.));
}`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (floor(vTag + .5) == 7.) {                          /* Innenraum: tags aufgehellt, nachts warm wie das eigene Fenster */
  float w = winW(vWin, vWP);
  totalEmissiveRadiance += diffuseColor.rgb * (vec3(.5) * (1. - uNight) + winCol(w) * winOn(w) * uNight * .8 + vec3(.02, .03, .05) * uNight);
}`);
};
worldMat.customProgramCacheKey = () => 'world2';

// Fenster und Lampen: tags dunkles Glas mit Himmelsspiegelung, nachts warmes Licht (Bloom)
export const glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .25, metalness: .3, emissive: 0xffb050, emissiveIntensity: 0 });
glowMat.onBeforeCompile = shader => {
  Object.assign(shader.uniforms, U);
  windVertex(shader);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
varying float vTag; varying float vWin; varying vec3 vWP; uniform float uNight, uLate, uTime;
${HASH}${WIN}`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ float t = floor(vTag + .5), fl = .92 + .08 * sin(uTime * 7. + vWP.x * 3.);
  if (t == 1.) totalEmissiveRadiance = vec3(1., .66, .3) * uNight * 6.2 * fl;            /* Lampe: immer an */
  else if (t > 1.5 && t != 7.) totalEmissiveRadiance = vColor * (.35 + uNight * 2.2) * fl; /* farbiges Leuchten */
  else {                                                                                  /* Fenster (0) und Zimmerlampe (7): je Fenster an/aus */
    float w = winW(vWin, vWP), rm = step(1., w); w -= rm;                                   /* win > 1: Zimmer dahinter */
    float on = winOn(w);
    totalEmissiveRadiance = winCol(w) * uNight * on * (t == 7. ? 4. : rm > .5 ? .5 : 1.4) * fl + vec3(.025, .04, .075) * uNight * (1. - on);   /* Glas nur leicht: das warme Zimmer dahinter trägt das Licht */
    if (t == 0.) diffuseColor.a *= mix(.6, 1., uNight);                                    /* tags klarer: man sieht ins Zimmer */
  } }`);
};
glowMat.customProgramCacheKey = () => 'glow2';
// Glas: wie glow, aber durchsichtig (man sieht in die Zimmer); nachts deckender
export const glassMat = glowMat.clone(); glassMat.transparent = true; glassMat.opacity = .5; glassMat.depthWrite = false;
glassMat.onBeforeCompile = glowMat.onBeforeCompile; glassMat.customProgramCacheKey = () => 'glass2';

// Wasser: Wellenmuster, Glitzern, Ufer heller, Regentropfen-Kringel
export const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f8fb0, roughness: .12, metalness: .15, transparent: true, opacity: .9, flatShading: false });
waterMat.onBeforeCompile = shader => {
  Object.assign(shader.uniforms, U);
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
varying vec3 vWP2; uniform float uTime;`).replace('#include <begin_vertex>', `#include <begin_vertex>
vec4 w0 = modelMatrix * vec4(transformed, 1.); transformed.y += sin(uTime * 1.3 + w0.x * .9 + w0.z * .7) * .025;
vWP2 = (modelMatrix * vec4(transformed, 1.)).xyz;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec3 vWP2; uniform float uTime, uSnow, uNight, uRain; ${HASH}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
{ vec2 p = vWP2.xz;
  float w = vn(p * .8 + vec2(uTime * .25, uTime * .18)) * .6 + vn(p * 2.3 - vec2(uTime * .3, -uTime * .2)) * .4;
  diffuseColor.rgb = mix(vec3(.08, .36, .45), vec3(.28, .66, .72), w);
  float sp = smoothstep(.86, .97, vn(p * 6. + uTime * .9)) * (1. - uNight * .6);
  diffuseColor.rgb += sp * .55;
  float ice = smoothstep(.55, .9, uSnow); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.78, .88, .95) * (.9 + .1 * w), ice);
  if (uRain > .01) { vec2 cell = floor(p * 1.4); vec2 f = fract(p * 1.4) - .5; float t0 = fract(uTime * .8 + hh(cell) * 7.);
    float r = abs(length(f) - t0 * .45); diffuseColor.rgb += uRain * (1. - t0) * smoothstep(.04, 0., r) * .5; }
}`);
};
waterMat.customProgramCacheKey = () => 'water1';

// Wasserfall: Streifen fallen nach unten, unten Gischt
export const fallMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide });
fallMat.onBeforeCompile = shader => {
  Object.assign(shader.uniforms, U);
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
varying vec2 vUv2;`).replace('#include <begin_vertex>', `#include <begin_vertex>
vUv2 = uv;`);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vUv2; uniform float uTime, uNight, uSnow; ${HASH}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
{ float x = vUv2.x, y = vUv2.y;
  float s = vn(vec2(x * 9., y * 3. + uTime * 2.6)) * .6 + vn(vec2(x * 23., y * 7. + uTime * 4.1)) * .4;
  vec3 c = mix(vec3(.35, .7, .82), vec3(.95, 1., 1.), smoothstep(.45, .8, s));
  float edge = smoothstep(0., .18, x) * smoothstep(1., .82, x);
  float a = edge * (.55 + .45 * s) * smoothstep(1., .55, y) * mix(1., .25, smoothstep(.6, 1., y));
  diffuseColor = vec4(c * (1. - uNight * .55), a * (1. - uSnow * .85)); }`);
};
fallMat.customProgramCacheKey = () => 'fall1';

export const MATS = { base: worldMat, bldg: worldMat, glow: glowMat, glass: glassMat, water: waterMat, fall: fallMat };

// Vorschau-Kachel (halbdurchsichtig, grün/rot)
export const ghostMat = c => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: .55, emissive: c, emissiveIntensity: .25, depthWrite: false, flatShading: true });
