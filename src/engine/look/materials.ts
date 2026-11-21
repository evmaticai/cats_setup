import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MatParams, MaterialKind } from './types';

// One material layer per style, applied to everything (kits, code geometry, GLB and img2threejs characters).
// Keeps each source material's colour, map, vertex colours and emissive; swaps only the shading model.

const ramps = new Map<string, THREE.DataTexture>();
function ramp(dark = 90, steps = 2) { // 2-step toon by default (V2); 3 adds a mid tone
  const key = `${dark}/${steps}`;
  if (!ramps.has(key)) {
    // 3 steps: the terminator sits at N·L = 0 (back half dark), then a mid band and full light
    const lv = steps === 3 ? [dark, dark, Math.round((dark + 255) / 2), 255] : [dark, 255];
    const t = new THREE.DataTexture(new Uint8Array(lv.flatMap((v) => [v, v, v, 255])), lv.length, 1);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    ramps.set(key, t);
  }
  return ramps.get(key)!;
}

let thumbs: THREE.CanvasTexture | null = null;
// Clay fingerprints: a seeded noise height field turned into a tiling normal map.
export function fingerprints() {
  if (thumbs) return thumbs;
  const S = 256, h = new Float32Array(S * S);
  let s = 1234567;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let k = 0; k < 60; k++) { // overlapping thumb smudges: concentric ridges
    const cx = rnd() * S, cy = rnd() * S, r = 20 + rnd() * 40, f = 0.9 + rnd() * 0.6;
    for (let y = -r; y < r; y++) for (let x = -r; x < r; x++) {
      const d = Math.hypot(x, y);
      if (d > r) continue;
      const i = ((Math.floor(cy + y) % S + S) % S) * S + ((Math.floor(cx + x) % S + S) % S);
      h[i] += Math.sin(d * f) * (1 - d / r) * 0.5;
    }
  }
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!, img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const at = (xx: number, yy: number) => h[((yy + S) % S) * S + ((xx + S) % S)];
    const nx = at(x - 1, y) - at(x + 1, y), ny = at(x, y - 1) - at(x, y + 1);
    const p = (y * S + x) * 4;
    img.data[p] = 128 + nx * 60; img.data[p + 1] = 128 + ny * 60; img.data[p + 2] = 255; img.data[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  thumbs = new THREE.CanvasTexture(c);
  thumbs.wrapS = thumbs.wrapT = THREE.RepeatWrapping;
  thumbs.repeat.set(3, 3);
  return thumbs;
}

function saturate(c: THREE.Color, k: number) {
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.clone().setHSL(hsl.h, Math.min(1, hsl.s * k), hsl.l);
}

export function makeMaterial(kind: MaterialKind, src: THREE.Material, p: MatParams = {}): THREE.Material {
  const o = src as THREE.MeshStandardMaterial;
  const base = {
    color: o.color ? o.color.clone() : new THREE.Color('#ffffff'),
    map: o.map ?? null,
    vertexColors: o.vertexColors ?? false,
    transparent: o.transparent, opacity: o.opacity, side: o.side, alphaTest: o.alphaTest,
  };
  const emissive = o.emissive ? { emissive: o.emissive.clone(), emissiveIntensity: (o.emissiveIntensity ?? 1) * (p.emissiveBoost ?? 1), emissiveMap: o.emissiveMap ?? null } : {};
  switch (kind) {
    case 'toon': return new THREE.MeshToonMaterial({ ...base, ...emissive, gradientMap: ramp(p.rampDark, p.rampSteps) });
    case 'flat': return new THREE.MeshStandardMaterial({ ...base, ...emissive, color: saturate(base.color, p.saturation ?? 1.2), roughness: p.roughness ?? 0.55, metalness: 0 });
    case 'clay': return new THREE.MeshPhysicalMaterial({
      ...base, ...emissive, color: saturate(base.color, p.saturation ?? 1), roughness: p.roughness ?? 0.72, metalness: 0, sheen: p.sheen ?? 0.4, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.8,
      normalMap: fingerprints(), normalScale: new THREE.Vector2(p.normalScale ?? 0.35, p.normalScale ?? 0.35),
    });
    case 'ps1': {
      const map = base.map ? ps1Texture(base.map) : null;
      const m = new THREE.MeshLambertMaterial({ ...base, ...emissive, map, flatShading: true });
      if (p.snap) { // PS1 vertex jitter: snap clip-space positions to a coarse pixel grid
        const grid = p.snap;
        m.onBeforeCompile = (sh) => {
          sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
            { vec2 g = vec2(${(grid * 9 / 16).toFixed(1)}, ${grid.toFixed(1)}) * 0.5;
              gl_Position.xy = floor(gl_Position.xy / gl_Position.w * g + 0.5) / g * gl_Position.w; }`);
        };
        m.customProgramCacheKey = () => `ps1snap${grid}`;
      }
      return m;
    }
    default: {
      const shiny = p.keepSpecular !== false && (o.metalness ?? 0) > 0.3; // brass, steel keep their own sheen
      return new THREE.MeshStandardMaterial({ ...base, ...emissive, color: saturate(base.color, p.saturation ?? 1),
        roughness: shiny ? (o.roughness ?? 0.4) : p.roughness ?? Math.max(0.8, o.roughness ?? 0.9), metalness: shiny ? Math.min(o.metalness ?? 0, 0.9) : 0 });
    }
  }
}

function ps1Texture(map: THREE.Texture, size = 256): THREE.Texture {
  const img = map.image as CanvasImageSource | undefined;
  if (!img) return map;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d')!.drawImage(img, 0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.flipY = map.flipY;
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

// Grime (ts01 audit tier 2): three octaves of world-space value noise darken/lighten the base colour, plus a small
// per-object tint jitter, so no surface reads as one flat colour. Pure function of world position: deterministic.
function grime(m: THREE.Material, amt: number) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
varying vec3 vGrimeWP; varying vec3 vGrimeOP;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vGrimeWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vGrimeOP = modelMatrix[3].xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vGrimeWP; varying vec3 vGrimeOP;
float gh3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float gvn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gh3(i), gh3(i + vec3(1,0,0)), f.x), mix(gh3(i + vec3(0,1,0)), gh3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(gh3(i + vec3(0,0,1)), gh3(i + vec3(1,0,1)), f.x), mix(gh3(i + vec3(0,1,1)), gh3(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ float gn = 0.6 * gvn(vGrimeWP * 1.7) + 0.3 * gvn(vGrimeWP * 9.0) + 0.1 * gvn(vGrimeWP * 41.0);
  diffuseColor.rgb *= 1.0 + ${amt.toFixed(3)} * (gn - 0.5) * 2.0 + 0.08 * (gh3(floor(vGrimeOP * 7.0)) - 0.5); }`);
  };
  const key = m.customProgramCacheKey?.bind(m);
  m.customProgramCacheKey = () => `${key ? key() : ''}grime${amt}`;
}

/** Swap every mesh under root to the style's material and turn shadows on. Objects with userData.noLook are skipped. */
export function applyLook(root: THREE.Object3D, kind: MaterialKind, p: MatParams = {}) {
  const cache = new Map<THREE.Material, THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || obj.userData.noLook) return;
    const swap = (mat: THREE.Material) => {
      if (mat.userData.noLook) return mat;
      if (!cache.has(mat)) {
        const made = makeMaterial(kind, mat, p);
        made.name ||= mat.name; // keep the source name, so an episode can find "Shirt"/"Pants" to repaint per frame (sb07)
        if (p.grime && kind !== 'ps1' && !(mesh as THREE.SkinnedMesh).isSkinnedMesh && !mat.userData.noGrime) grime(made, p.grime);
        cache.set(mat, made);
      }
      return cache.get(mat)!;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    if (p.smooth && !mesh.userData.smoothed) { // soft sculpted forms: weld vertices by position, re-derive normals
      mesh.userData.smoothed = true;
      const g = mesh.geometry;
      if (g.attributes.normal && g.attributes.position.count < 60000) {
        const g2 = mergeVertices(g.clone().deleteAttribute('normal'), 1e-4);
        g2.computeVertexNormals();
        mesh.geometry = g2;
      }
    }
    mesh.castShadow = !obj.userData.noShadow; // glass, glows and window panes let the sun through
    mesh.receiveShadow = true;
  });
}
