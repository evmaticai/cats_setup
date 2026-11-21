import * as THREE from 'three';

// Dive Cats 2 reef materials: PS1 Lambert (flat, vertex colours) plus four shader patches, all functions of uTime:
// sway (algae, fans, anemone tentacles; per-vertex `sway` attribute), fish (tail wiggle on instanced fish),
// caustics (sun-net light on up-facing surfaces) and the PS1 vertex snap that the style gives every other mesh.

/** PS1 vertex snap for reef materials made after this is set (the smooth look turns it off) */
export const REEF = { snap: true };
export const U = { uTime: { value: 0 }, uCaus: { value: 1 } }; // uCaus: caustic strength for the whole frame (0 in the cave)
export const SNAP = 220;

export const CAUSTIC_GLSL = /* glsl */ `
float causticF(vec2 uv, float time) {
  vec2 p = uv * 6.28318; vec2 i = p; float c = 1.0;
  for (int n = 0; n < 4; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(1.235 / (sin(i.x + t) + 1e-4), 1.235 / (cos(i.y + t) + 1e-4)));
  }
  c /= 4.0; c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 3.0);
}`;

export type FishU = { uAmp: { value: number }; uBend: { value: number }; uFast: { value: number } };
export type Patch = { sway?: boolean; fish?: number; caustics?: number; snap?: boolean; fishU?: FishU };

/** Add the reef shader patches to a Lambert/Standard material (also the cats' materials after applyLook). */
export function patch(m: THREE.Material, o: Patch) {
  const prev = m.onBeforeCompile;
  const caus = o.caustics ?? 0;
  // per-material fish controls: tail wiggle amount and speed, and a C-bend of the body (head swings, tail stays)
  const fishU = o.fishU ?? { uAmp: { value: 1 }, uBend: { value: 0 }, uFast: { value: 1 } }; // shared by every material of one fish
  m.userData.fishU = fishU;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.uniforms.uTime = U.uTime; sh.uniforms.uCaus = U.uCaus;
    if (o.fish) Object.assign(sh.uniforms, fishU);
    let v = sh.vertexShader.replace('#include <common>', `#include <common>
uniform float uTime; varying vec3 vCW;${o.sway ? '\nattribute float sway;' : ''}${o.fish ? '\nuniform float uAmp; uniform float uBend; uniform float uFast;' : ''}`);
    v = v.replace('#include <begin_vertex>', `#include <begin_vertex>
${o.sway ? `transformed.x += sin(uTime * 1.3 + position.x * 0.45 + position.z * 0.3 + position.y * 0.8) * sway;
transformed.z += cos(uTime * 1.05 + position.z * 0.5 + position.y * 0.6) * sway * 0.7;` : ''}
${o.fish ? `{ float ph = 0.0;
#ifdef USE_INSTANCING
  ph = instanceMatrix[3].x * 3.1 + instanceMatrix[3].y * 1.7 + instanceMatrix[3].z * 2.3;
#endif
  float tail = clamp(0.3 - position.x, 0.0, 2.0);
  transformed.z += sin(uTime * ${o.fish.toFixed(2)} * uFast + ph - position.x * 5.0) * 0.16 * uAmp * tail * tail;
  transformed.z += uBend * (position.x + 0.5) * (position.x + 0.5); }` : ''}`);
    // a PS1 snap that already exists (applyLook's ps1 material) is kept; ours is added after it otherwise
    const hasSnap = v.includes('gl_Position.xy = floor');
    v = v.replace('#include <project_vertex>', `#include <project_vertex>
{ vec4 cw = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  cw = instanceMatrix * cw;
#endif
  vCW = (modelMatrix * cw).xyz; }
${o.snap && !hasSnap ? `{ vec2 g = vec2(${(SNAP * 9 / 16).toFixed(1)}, ${SNAP.toFixed(1)}) * 0.5;
  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * g + 0.5) / g * gl_Position.w; }` : ''}`);
    sh.vertexShader = v;
    if (caus > 0) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime; uniform float uCaus; varying vec3 vCW;
${CAUSTIC_GLSL}`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ float upF = clamp(dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)), 0.0, 1.0);
  float c = causticF(vCW.xz * 0.3, uTime * 0.55) * 0.6 + causticF(vCW.xz * 0.53 + 7.3, uTime * 0.43) * 0.4;
  totalEmissiveRadiance += diffuseColor.rgb * c * ${caus.toFixed(3)} * uCaus * (0.2 + 0.8 * upF) * smoothstep(-6.0, 4.0, vCW.y); }`);
    }
  };
  const key = m.customProgramCacheKey?.bind(m);
  m.customProgramCacheKey = () => `${key ? key() : ''}reef:${o.sway ? 1 : 0}:${o.fish ?? 0}:${caus}:${o.snap ? 1 : 0}`;
  return m;
}

/** The reef's own material: PS1 flat Lambert with vertex colours. */
export const reefMat = (o: Patch & { side?: THREE.Side } = {}) => {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: o.side ?? THREE.FrontSide });
  m.userData.noLook = true;
  return patch(m, { snap: REEF.snap, caustics: 0.9, ...o });
};
