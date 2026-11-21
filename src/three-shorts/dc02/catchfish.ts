import * as THREE from 'three';
import { staticFile } from 'remotion';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { finish, rng } from './geo';
import { patch, reefMat, type FishU } from './mat';

// Dive Cats 2: the six catches, each its own body plan (not a recolour): a tiny reef fish, a pufferfish,
// a barracuda, a grouper, a yellowfin tuna and a shark. Every body is length 1 along X (nose +0.5, tail -0.5),
// built from a profile: half-height h(x), half-width w(x), centre line y(x), plus fins and eyes as triangles.

type V = THREE.Vector3;
const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
type Def = {
  h: (x: number) => number; w: (x: number) => number; y?: (x: number) => number; nose?: number;
  fins: (add: (...p: V[]) => void, both: (...p: V[]) => void) => void;
  eye: { x: number; y: number; r: number; pupil?: number; brow?: boolean; white?: string; z?: number };
  paint: (c: V, n: V) => string;
  spikes?: number;
};

const XS = Array.from({ length: 17 }, (_, i) => 0.5 - i / 16);

function build(d: Def, seed: number) {
  const r = rng(seed), RING = 10, pts: V[] = [];
  const yc = d.y ?? (() => 0);
  const ring = (x: number) => Array.from({ length: RING }, (_, k) => {
    const a = (k / RING) * Math.PI * 2;
    return v(x, yc(x) + Math.cos(a) * d.h(x), Math.sin(a) * d.w(x));
  });
  let prev = ring(XS[0]);
  const tip = v(0.5 + (d.nose ?? 0.02), yc(0.5));
  for (let k = 0; k < RING; k++) pts.push(tip, prev[(k + 1) % RING], prev[k]);
  for (let i = 1; i < XS.length; i++) {
    const cur = ring(XS[i]);
    for (let k = 0; k < RING; k++) { const a = prev[k], b = prev[(k + 1) % RING], c = cur[k], e = cur[(k + 1) % RING]; pts.push(a, c, b, b, c, e); }
    prev = cur;
  }
  const end = v(-0.5, yc(-0.5));
  for (let k = 0; k < RING; k++) pts.push(end, prev[k], prev[(k + 1) % RING]);
  const add = (...p: V[]) => { for (let i = 0; i + 2 < p.length; i += 3) pts.push(p[i], p[i + 1], p[i + 2], p[i], p[i + 2], p[i + 1]); };
  const both = (...p: V[]) => { add(...p); add(...p.map((q) => v(q.x, q.y, -q.z))); };
  d.fins(add, both);
  if (d.spikes) for (let i = 0; i < d.spikes; i++) { // puffer spines: short cones on the skin
    const x = 0.36 - r() * 0.75, a = r() * Math.PI * 2, n = v(0, Math.cos(a), Math.sin(a));
    const base = v(x, yc(x) + n.y * d.h(x), n.z * d.w(x)), out = base.clone().addScaledVector(n, 0.07);
    const s = n.clone().cross(v(1, 0, 0)).multiplyScalar(0.018);
    add(base.clone().add(s), out, base.clone().sub(s), base.clone().add(v(0.018, 0, 0)), out, base.clone().sub(v(0.018, 0, 0)));
  }
  // eyes: white disc + black pupil (cartoon), an angry brow on the grumpy ones
  const E = d.eye, ez = E.z ?? d.w(E.x) * 0.95, n = 8, pr = E.r * (E.pupil ?? 0.55);
  const disc = (z: number, rad: number, cx: number, cy: number) => {
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      add(v(cx, cy, z), v(cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad, z), v(cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad, z));
    }
  };
  for (const s of [-1, 1]) {
    disc(s * (ez + 0.006), E.r, E.x, E.y);
    disc(s * (ez + 0.012), pr, E.x + E.r * 0.15, E.y);
    if (E.brow) add(v(E.x - E.r * 1.2, E.y + E.r * 0.7, s * (ez + 0.016)), v(E.x + E.r * 1.3, E.y + E.r * 0.25, s * (ez + 0.016)), v(E.x - E.r * 1.0, E.y + E.r * 1.35, s * (ez + 0.016)));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const black = new THREE.Color('#0a0a10'), white = new THREE.Color(d.eye.white ?? '#ffffff');
  return finish(g, (c, nn) => {
    const az = Math.abs(c.z), near = Math.hypot(c.x - E.x, c.y - E.y) < E.r * 1.9;
    if (near && az > ez + 0.009) return black;
    if (az > ez + 0.004 && Math.hypot(c.x - E.x, c.y - E.y) < E.r * 1.02) return white;
    return new THREE.Color(d.paint(c, nn));
  }, 0, 1, 0.05, r);
}

const ell = (x: number, c: number, a: number) => Math.sqrt(Math.max(0, 1 - ((x - c) / a) ** 2));
/** a body that is round at the head and narrows to a stalk at the tail */
const body = (H: number, peak = 0.08, stalk = 0.12) => (x: number) =>
  x > peak ? H * (0.06 + 0.94 * ell(x, peak, 0.5 - peak + 0.04)) : H * (stalk + (1 - stalk) * (1 - ((peak - x) / (peak + 0.5)) ** 1.6));

// The six catches, each drawn after the Sketchfab model the user picked (those models cannot be downloaded:
// paid store items or downloads turned off), as our own low-poly bodies in their colours and shapes.
const wave = (a: number, b: number) => Math.sin(a) * Math.sin(b);
export const CATCH_DEFS: Record<string, Def> = {
  // Yeji: a Klunzinger wrasse (slim, teal with blue-violet bars, a pink face with green lines, lunate yellow-edged tail)
  tiny: {
    h: body(0.13, 0.1, 0.17), w: body(0.065, 0.1, 0.17), nose: 0.015,
    fins: (add, both) => {
      add(v(-0.44, 0), v(-0.72, 0.22), v(-0.58, 0), v(-0.44, 0), v(-0.58, 0), v(-0.72, -0.22)); // lunate tail
      add(v(0.24, 0.12), v(0.0, 0.17), v(-0.4, 0.07)); add(v(0.0, -0.12), v(-0.16, -0.16), v(-0.4, -0.07)); // long dorsal and anal
      both(v(0.24, -0.03, 0.06), v(0.1, -0.1, 0.13), v(0.14, 0.01, 0.065));
    },
    eye: { x: 0.36, y: 0.035, r: 0.045, pupil: 0.6 },
    paint: (c) => {
      if (c.x < -0.47) return Math.abs(c.y) > 0.12 ? '#ffd23a' : '#ff8ac0';
      if (Math.abs(c.y) > 0.125) return '#c8e84a'; // fin edges
      if (c.x > 0.26) return Math.floor(Math.hypot(c.x - 0.5, c.y + 0.02) * 46) % 2 ? '#ff4aa8' : '#3ee0b0'; // the face
      if (c.y < -0.075) return '#bfe6ff';
      return Math.floor((c.x + 1) * 30) % 2 ? '#5a6cff' : '#36c8b4'; // bars
    },
  },
  // Silent: a Cross River puffer (olive with dark rings and red dots, cream belly, yellow-ringed eye, big fan tail)
  puffer: {
    h: (x) => 0.24 * (0.12 + 0.88 * ell(x, 0.06, 0.52)), w: (x) => 0.22 * (0.12 + 0.88 * ell(x, 0.06, 0.52)), nose: 0.0, spikes: 36,
    fins: (add, both) => {
      for (let k = 0; k < 5; k++) { const a0 = -0.7 + k * 0.28, a1 = a0 + 0.28; add(v(-0.44, 0), v(-0.44 - 0.26 * Math.cos(a0), 0.26 * Math.sin(a0)), v(-0.44 - 0.26 * Math.cos(a1), 0.26 * Math.sin(a1))); } // fan tail
      add(v(-0.22, 0.17), v(-0.3, 0.3), v(-0.38, 0.1)); add(v(-0.22, -0.17), v(-0.38, -0.1), v(-0.3, -0.28));
      both(v(0.12, 0.0, 0.2), v(0.0, 0.07, 0.3), v(0.02, -0.07, 0.28));
    },
    eye: { x: 0.26, y: 0.1, r: 0.08, pupil: 0.5, white: '#ffd84a' },
    paint: (c) => {
      if (c.x < -0.45) return '#2a5a3a';
      if (c.y < -0.07 && c.x > -0.3) return '#f2ecc8';
      if (c.x > 0.44 && c.y < 0.02) return '#e8dcb0'; // the beak
      const sp = wave(c.x * 34, c.y * 26 + c.z * 30);
      if (sp > 0.62) return sp > 0.86 ? '#e8404a' : '#1e3a24';
      return '#7a9a4a';
    },
  },
  // Paw: a great barracuda (long and slim, green-grey back with dark bars, silver flanks, underbite with teeth)
  barracuda: {
    h: (x) => (x > 0.3 ? 0.075 * ell(x, 0.3, 0.22) + 0.012 : 0.075 * (0.3 + 0.7 * (1 - ((0.3 - x) / 0.8) ** 2))), w: (x) => (x > 0.3 ? 0.05 * ell(x, 0.3, 0.22) + 0.01 : 0.05 * (0.3 + 0.7 * (1 - ((0.3 - x) / 0.8) ** 2))),
    y: (x) => (x > 0.38 ? -(x - 0.38) * 0.12 : 0), nose: 0.04,
    fins: (add, both) => {
      add(v(-0.46, 0), v(-0.64, 0.15), v(-0.56, 0), v(-0.46, 0), v(-0.56, 0), v(-0.64, -0.15));
      add(v(0.05, 0.07), v(-0.03, 0.15), v(-0.08, 0.07)); add(v(-0.25, 0.06), v(-0.3, 0.12), v(-0.34, 0.05)); add(v(-0.24, -0.06), v(-0.29, -0.11), v(-0.33, -0.05));
      both(v(0.28, -0.03, 0.04), v(0.18, -0.07, 0.09), v(0.22, -0.01, 0.045));
      for (let i = 0; i < 5; i++) { const x = 0.42 + i * 0.022; both(v(x, -0.012, 0.012), v(x + 0.01, -0.03, 0.012), v(x + 0.02, -0.012, 0.012)); }
    },
    eye: { x: 0.36, y: 0.02, r: 0.032, pupil: 0.55, white: '#e8e070' },
    paint: (c) => {
      if (c.x < -0.47) return '#4a5e50';
      if (c.x > 0.42 && c.y < -0.02) return '#ffffff';
      if (c.y < -0.025) return '#eef4f6';
      if (c.y > 0.0 && c.x < 0.3 && c.x > -0.42 && Math.floor((c.x - c.y * 0.9) * 20 + 40) % 3 === 0) return '#2a3a2e'; // slanted bars
      return c.y > 0.03 ? '#6a8a5a' : '#b4c4c8';
    },
  },
  // Lusya: a goliath grouper (huge head and lips, mottled olive-grey-brown blotches, rounded fins, small eyes)
  grouper: {
    h: body(0.22, 0.14, 0.24), w: body(0.17, 0.14, 0.24), y: (x) => (x > 0.35 ? -(x - 0.35) * 0.18 : 0), nose: 0.0,
    fins: (add, both) => {
      for (let k = 0; k < 4; k++) { const a0 = -0.55 + k * 0.28, a1 = a0 + 0.28; add(v(-0.44, 0), v(-0.44 - 0.2 * Math.cos(a0), 0.2 * Math.sin(a0)), v(-0.44 - 0.2 * Math.cos(a1), 0.2 * Math.sin(a1))); } // rounded tail
      add(v(0.2, 0.2), v(0.05, 0.29), v(-0.36, 0.16)); add(v(-0.1, 0.24), v(-0.3, 0.27), v(-0.38, 0.12));
      add(v(0.0, -0.2), v(-0.18, -0.29), v(-0.34, -0.15));
      both(v(0.18, -0.04, 0.16), v(0.0, -0.16, 0.3), v(0.06, 0.04, 0.17)); both(v(0.12, -0.18, 0.06), v(0.02, -0.3, 0.1), v(0.0, -0.18, 0.08));
      both(v(0.5, -0.04, 0.07), v(0.46, -0.11, 0.1), v(0.43, -0.03, 0.13)); // fat lips
    },
    eye: { x: 0.32, y: 0.09, r: 0.04, pupil: 0.55, brow: true },
    paint: (c) => {
      if (c.x > 0.44 && c.y < 0.0) return '#9a8a6a';
      const m = wave(c.x * 17 + c.z * 9, c.y * 15 + 1.3) + 0.5 * wave(c.x * 31, c.y * 27 + c.z * 21);
      if (m > 0.55) return '#2e3226';
      if (c.y < -0.13) return '#a89a78';
      return m < -0.4 ? '#8a8a6a' : '#5f6a4c';
    },
  },
  // Zhenya: a yellowfin tuna (navy back, yellow and blue side stripe, silver belly, long yellow sickle fins, finlets)
  tuna: {
    h: body(0.15, 0.05, 0.08), w: body(0.13, 0.05, 0.1), nose: 0.03,
    fins: (add, both) => {
      add(v(-0.46, 0), v(-0.68, 0.34), v(-0.56, 0.02), v(-0.46, 0), v(-0.56, -0.02), v(-0.68, -0.34));
      add(v(0.12, 0.14), v(0.02, 0.24), v(-0.06, 0.14)); add(v(-0.08, 0.13), v(-0.26, 0.42), v(-0.22, 0.1)); add(v(-0.08, -0.13), v(-0.22, -0.1), v(-0.26, -0.42));
      for (let i = 0; i < 6; i++) { const x = -0.26 - i * 0.033, h = body(0.15, 0.05, 0.08)(x); add(v(x, h * 0.95), v(x - 0.012, h + 0.03), v(x - 0.025, h * 0.95)); add(v(x, -h * 0.95), v(x - 0.025, -h * 0.95), v(x - 0.012, -h - 0.03)); }
      both(v(0.24, 0.0, 0.11), v(-0.06, -0.04, 0.22), v(0.18, -0.03, 0.12));
    },
    eye: { x: 0.36, y: 0.03, r: 0.035, pupil: 0.6 },
    paint: (c, n) => {
      if (c.x < -0.47) return '#1c2c58';
      if (Math.abs(c.y) > 0.16) return '#ffd21a'; // the sickle fins and finlets
      if (c.y > 0.045) return '#122458';
      if (c.y > 0.02 && c.x < 0.3 && c.x > -0.4) return '#ffd21a';
      if (c.y > -0.005 && c.x < 0.3 && c.x > -0.4) return '#3ab4e0';
      return c.y < -0.05 && n.y < 0 && Math.floor(c.x * 40) % 3 === 0 ? '#d8e2ec' : '#f2f6fa';
    },
  },
  // Franko: a great hammerhead: a narrow swept T-hammer across the head with an eye at each tip, a crescent mouth
  // under it, gills, a tall sickle dorsal, grey back and white belly (the pectorals stay grey)
  shark: {
    h: (x) => (x > 0.12 ? 0.105 * ell(x, 0.12, 0.42) + 0.006 : 0.105 * (0.18 + 0.82 * (1 - ((0.12 - x) / 0.62) ** 1.7))),
    w: (x) => (x > 0.12 ? 0.09 * ell(x, 0.12, 0.42) + 0.005 : 0.09 * (0.16 + 0.84 * (1 - ((0.12 - x) / 0.62) ** 1.7))),
    y: (x) => (x > 0.3 ? (x - 0.3) * 0.04 : x < -0.3 ? (-0.3 - x) * 0.25 : 0), nose: 0.0,
    fins: (add, both) => {
      // the hammer: a flat blade, swept back toward its tips, with a little thickness at the front edge
      both(v(0.5, 0.012, 0), v(0.46, 0.008, 0.25), v(0.41, 0.008, 0.25));
      both(v(0.5, 0.012, 0), v(0.41, 0.008, 0.25), v(0.43, 0.01, 0));
      both(v(0.5, 0.012, 0), v(0.46, -0.008, 0.25), v(0.5, -0.004, 0));
      both(v(0.46, 0.008, 0.25), v(0.46, -0.008, 0.25), v(0.41, 0.008, 0.25)); // the tip's end
      add(v(0.1, 0.1), v(-0.06, 0.4), v(-0.14, 0.09)); // the tall sickle dorsal
      add(v(-0.3, 0.06), v(-0.33, 0.12), v(-0.36, 0.06)); add(v(-0.28, -0.05), v(-0.31, -0.12), v(-0.34, -0.05));
      add(v(-0.44, 0.04), v(-0.8, 0.38), v(-0.62, 0.06), v(-0.44, 0.0), v(-0.62, 0.06), v(-0.6, -0.18));
      both(v(0.2, -0.06, 0.07), v(-0.04, -0.2, 0.3), v(0.06, -0.06, 0.08));
    },
    eye: { x: 0.44, y: 0.0, r: 0.022, pupil: 0.7, brow: true, z: 0.252 }, // on the hammer's tips; angry
    paint: (c, n) => {
      if (c.x > 0.36 && c.x < 0.44 && c.y < -0.03 && Math.abs(c.z) < 0.05 && n.y < -0.3) return '#3a1a20'; // the crescent mouth
      if (c.x > 0.18 && c.x < 0.28 && Math.abs(c.z) > 0.05 && Math.floor(c.x * 50) % 2 === 0 && Math.abs(c.y) < 0.05) return '#4a5868'; // gills
      if (Math.abs(c.z) > 0.11) return c.x > 0.38 ? '#7c8a94' : '#8a96a0'; // hammer and pectorals: grey, not belly white
      return c.y < -0.02 - c.x * 0.02 ? '#f0f2f0' : '#7c8a94';
    },
  },
};

export type CatchFish = { root: THREE.Group; mesh: THREE.Mesh; len: number; fishU: { uAmp: { value: number }; uBend: { value: number }; uFast: { value: number } } };

/** The body geometry of a catch (for instanced schools, e.g. Zhenya's tuna). */
export const catchGeo = (kind: string) => build(CATCH_DEFS[kind], kind.length * 13);

// Free CC BY Sketchfab fish the user picked (dive-cats-2/downloads/CREDITS.md), kept as made: their mesh and textures,
// only turned and scaled by build/lowpoly_fish.py (faces 0): length 1 along X, nose +X, centred. The film's look
// (PS1 nearest-pixel textures, flat facets, the dither) makes them low poly on screen. The puffer is a 329k-face sculpt cut to 40k.
const MODEL: Record<string, string> = { tiny: 'smallfish', puffer: 'puffer2', barracuda: 'barracuda2', grouper: 'grouper2', tuna: 'tuna2', shark: 'hammerhead' };
export type FishModel = { geo: THREE.BufferGeometry; maps: (THREE.Texture | null)[]; colors: THREE.Color[]; cut: boolean[] };
// Granny's catch is the GOLDEN grouper: its brown texture is warmed toward gold
const TINT: Record<string, string> = { grouper: '#ffd27a' };
const cache: Record<string, Promise<FishModel>> = {};
/** The model for a catch kind (null = no model: the code-made one): one geometry, a group per material. */
export function modelGeo(kind: string): Promise<FishModel | null> {
  const f = MODEL[kind];
  if (!f) return Promise.resolve(null);
  return (cache[kind] ??= new GLTFLoader().loadAsync(staticFile(`characters/dc02/fish/${f}.glb`)).then((g) => {
    g.scene.updateMatrixWorld(true);
    const parts: THREE.BufferGeometry[] = [], maps: (THREE.Texture | null)[] = [], colors: THREE.Color[] = [], cut: boolean[] = [];
    g.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (((m.material as THREE.MeshStandardMaterial).transparent && (m.material as THREE.MeshStandardMaterial).opacity < 0.6)) return; // gloss/cornea overlay shells (the tuna's made it black)
      const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', geo.attributes.position);
      out.setAttribute('uv', geo.attributes.uv ?? new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (geo.index) out.setIndex(geo.index);
      parts.push(out.index ? out.toNonIndexed() : out);
      const mat = m.material as THREE.MeshStandardMaterial;
      const map = mat.map ?? null;
      if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestMipmapNearestFilter; map.needsUpdate = true; } // PS1: crunchy texels
      const tint = TINT[kind] ? new THREE.Color(TINT[kind]) : new THREE.Color('#ffffff');
      maps.push(map); colors.push((mat.color?.clone() ?? new THREE.Color('#ffffff')).multiply(tint));
      cut.push(mat.transparent || mat.alphaTest > 0); // fins drawn with alpha: cut, not blended (blending left white halos)
    });
    const geo = mergeGeometries(parts, true)!;
    geo.computeVertexNormals();
    geo.setAttribute('sway', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1));
    return { geo, maps, colors, cut };
  }));
}
/** Flat-shaded Lambert materials for a model (one per group), all sharing one set of swim uniforms. */
export function modelMats(model: FishModel, wiggle: number, fishU?: FishU) {
  const shared: FishU = fishU ?? { uAmp: { value: 1 }, uBend: { value: 0 }, uFast: { value: 1 } };
  const mats = model.maps.map((map, i) => {
    const m = new THREE.MeshLambertMaterial({ map, color: model.colors[i], flatShading: true, side: THREE.DoubleSide, alphaTest: 0.5 }); // fin edges cut by the texture's alpha (blending them left white halos)
    m.userData.noLook = true;
    return patch(m, { snap: true, fish: wiggle, caustics: 0.5, fishU: shared });
  });
  return { mats, fishU: shared };
}

/** One catch fish as a posable object (the root is at the body centre; nose along +X). */
export function catchFish(kind: string, len: number, wiggle = 8, model: FishModel | null = null): CatchFish {
  // both sides drawn: the hammerhead's flat hammer and thin fins showed holes from some angles
  const mat = reefMat({ fish: wiggle, caustics: 0.5, side: THREE.DoubleSide });
  const mm = model ? modelMats(model, wiggle, mat.userData.fishU) : null;
  const mesh = new THREE.Mesh(model ? model.geo : build(CATCH_DEFS[kind], kind.length * 13), mm ? mm.mats : mat);
  mesh.castShadow = true; mesh.userData.noLook = true; mesh.frustumCulled = false;
  const root = new THREE.Group();
  mesh.scale.setScalar(len);
  root.add(mesh);
  return { root, mesh, len, fishU: mat.userData.fishU };
}
