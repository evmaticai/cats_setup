import * as THREE from 'three';
import { finish, rng } from './geo';
import { reefMat } from './mat';

// Reef fish: one low-poly body per species (length 1, nose +X, tail -X), drawn as an InstancedMesh.
// Every fish's place and heading are closed-form functions of t (no simulation), so any frame renders alone.

type Spec = { h: number; w: number; tail: number; dorsal: number; paint: (x: number, y: number, side: number) => string };
const band = (x: number, a: number, b: number) => x > a && x < b;
export const SPECIES: Record<string, Spec> = {
  clown: { h: 0.27, w: 0.4, tail: 0.18, dorsal: 0.1, paint: (x) => (band(x, 0.18, 0.28) || band(x, -0.08, 0.04) || band(x, -0.44, -0.38) ? '#ffffff' : band(x, 0.15, 0.31) || band(x, -0.11, 0.07) ? '#1a1010' : '#ff6a10') },
  blueTang: { h: 0.42, w: 0.22, tail: 0.24, dorsal: 0.08, paint: (x, y) => (x < -0.42 ? '#ffd21a' : y > 0.06 && x > -0.3 && x < 0.2 ? '#101838' : '#2a5cff') },
  yellowTang: { h: 0.46, w: 0.2, tail: 0.22, dorsal: 0.14, paint: (x) => (band(x, -0.46, -0.4) ? '#ffffff' : '#ffe21a') },
  butterfly: { h: 0.5, w: 0.18, tail: 0.18, dorsal: 0.12, paint: (x, y) => (band(x, 0.24, 0.32) ? '#141414' : x < -0.1 && y > 0 ? '#ffd21a' : band(x, -0.36, -0.28) && y > 0.05 ? '#141414' : '#fffbe8') },
  anthias: { h: 0.26, w: 0.24, tail: 0.24, dorsal: 0.08, paint: (x, y) => (y < -0.05 ? '#ffd0a0' : x > 0.25 && y > -0.02 && y < 0.03 ? '#ffe040' : '#ff7a8a') },
  fusilier: { h: 0.2, w: 0.2, tail: 0.24, dorsal: 0.05, paint: (_x, y) => (y > 0.04 ? '#2f6dff' : y > -0.01 ? '#ffd83a' : '#eaf6ff') },
  // v3: the bait ball (silver, blue back) and the cave's glassfish (pale gold)
  sardine: { h: 0.22, w: 0.22, tail: 0.24, dorsal: 0.05, paint: (_x, y) => (y > 0.05 ? '#3a6a9a' : y > 0.0 ? '#a8d0f0' : '#f4fbff') },
  glass: { h: 0.3, w: 0.2, tail: 0.22, dorsal: 0.08, paint: (_x, y) => (y > 0.06 ? '#ffd890' : '#fff4d8') },
  // the six catches (Dive Cats 2), smallest to biggest
  pinkie: { h: 0.34, w: 0.34, tail: 0.24, dorsal: 0.12, paint: (x, y) => (y < -0.06 ? '#ffe0ec' : band(x, 0.05, 0.12) ? '#ffffff' : '#ff6aa8') },
  sunny: { h: 0.4, w: 0.3, tail: 0.24, dorsal: 0.12, paint: (x, y) => (x < -0.4 ? '#ffd21a' : y > 0.08 ? '#2a6cff' : y < -0.08 ? '#ffe880' : '#4fa0ff') },
  snapper: { h: 0.36, w: 0.34, tail: 0.26, dorsal: 0.14, paint: (x, y) => (y < -0.1 ? '#ffe4c8' : (Math.floor((x + 1) * 8) % 2 === 0 && y > -0.05) ? '#ffffff' : '#ff4a2a') },
  parrotBig: { h: 0.4, w: 0.36, tail: 0.22, dorsal: 0.08, paint: (x, y) => (x > 0.36 ? '#ff7ab8' : y < -0.1 ? '#a8ffe0' : (Math.floor((x + 1) * 7) + Math.floor((y + 1) * 9)) % 3 === 0 ? '#ffd040' : '#20c890') },
  trevally: { h: 0.42, w: 0.26, tail: 0.32, dorsal: 0.12, paint: (x, y) => (x < -0.42 ? '#ffd23a' : y > 0.1 ? '#3a78b8' : y < -0.08 ? '#f0f8ff' : '#a8c8e0') },
  grouper: { h: 0.44, w: 0.5, tail: 0.2, dorsal: 0.1, paint: (x, y) => (x > 0.44 && y < 0.0 ? '#ffb0a0' : (Math.floor(x * 23 + 50) * 7 + Math.floor(y * 19 + 50) * 3) % 5 === 0 ? '#2a3a20' : y < -0.12 ? '#c8b880' : '#6f7a3a') },
  parrot: { h: 0.34, w: 0.3, tail: 0.2, dorsal: 0.07, paint: (x, y) => (x > 0.35 ? '#ff7ab8' : (Math.floor((x + 1) * 9) + (y > 0 ? 1 : 0)) % 3 === 0 ? '#ff8ac4' : '#26d4a6') },
};

export function fishGeo(sp: Spec, seed = 1) {
  const r = rng(seed);
  // a blunt rounded head, the deepest point a third back, then a narrow tail stalk (caudal peduncle)
  const xs = [0.5, 0.47, 0.4, 0.3, 0.16, 0.0, -0.16, -0.3, -0.4, -0.47, -0.5], RING = 8;
  const prof = (x: number) => (x > 0.12 ? Math.sqrt(Math.max(0.0, 1 - ((x - 0.12) / 0.4) ** 2)) * 0.98 + 0.02
    : 1 - 0.86 * ((0.12 - x) / 0.62) ** 1.5);
  const halfW = (x: number) => sp.h * sp.w * 0.5 * prof(x);
  const pts: THREE.Vector3[] = [];
  const ring = (x: number) => Array.from({ length: RING }, (_, k) => {
    const a = (k / RING) * Math.PI * 2, s = prof(x);
    return new THREE.Vector3(x, Math.cos(a) * sp.h * 0.5 * s - (x > 0.3 ? (x - 0.3) * 0.12 : 0), Math.sin(a) * halfW(x));
  });
  let prev = ring(xs[0]);
  const tipN = new THREE.Vector3(0.52, -0.03, 0);
  for (let k = 0; k < RING; k++) pts.push(tipN, prev[(k + 1) % RING], prev[k]); // close the nose
  for (let i = 1; i < xs.length; i++) {
    const cur = ring(xs[i]);
    for (let k = 0; k < RING; k++) {
      const a = prev[k], b = prev[(k + 1) % RING], c = cur[k], d = cur[(k + 1) % RING];
      pts.push(a, c, b, b, c, d);
    }
    prev = cur;
  }
  // forked tail: two lobes and a notch
  const tx = -0.48, T = sp.tail * 1.25;
  pts.push(new THREE.Vector3(tx, 0.03, 0), new THREE.Vector3(tx - T, T * 1.05, 0), new THREE.Vector3(tx - T * 0.6, 0, 0));
  pts.push(new THREE.Vector3(tx, -0.03, 0), new THREE.Vector3(tx - T * 0.6, 0, 0), new THREE.Vector3(tx - T, -T * 1.05, 0));
  const D = sp.dorsal * 1.3, top = sp.h * 0.47;
  pts.push(new THREE.Vector3(0.22, top * 0.95, 0), new THREE.Vector3(-0.02, top + D, 0), new THREE.Vector3(-0.36, top * 0.45, 0));
  pts.push(new THREE.Vector3(0.02, -top * 0.9, 0), new THREE.Vector3(-0.2, -top - D * 0.6, 0), new THREE.Vector3(-0.36, -top * 0.4, 0));
  for (const s of [-1, 1]) pts.push(new THREE.Vector3(0.2, -0.04, s * halfW(0.2) * 0.9), new THREE.Vector3(0.02, -0.12, s * halfW(0.2) * 1.9), new THREE.Vector3(0.08, 0.02, s * halfW(0.2) * 1.0));
  // big cartoon eyes (they must read at PS1 size): a white disc and a black pupil on each side
  const ex = 0.33, ey = sp.h * 0.12, er = Math.max(0.045, sp.h * 0.15);
  const disc = (z: number, rad: number, s: number) => {
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
      const c = new THREE.Vector3(ex, ey, z), p0 = new THREE.Vector3(ex + Math.cos(a0) * rad, ey + Math.sin(a0) * rad, z), p1 = new THREE.Vector3(ex + Math.cos(a1) * rad, ey + Math.sin(a1) * rad, z);
      if (s > 0) pts.push(c, p0, p1); else pts.push(c, p1, p0);
    }
  };
  const ez = halfW(ex) * 0.9;
  for (const s of [-1, 1]) { disc(s * (ez + 0.006), er, s); disc(s * (ez + 0.012), er * 0.55, s); }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const black = new THREE.Color('#0a0a10'), white = new THREE.Color('#ffffff');
  return finish(g, (c) => {
    const az = Math.abs(c.z);
    if (az > ez + 0.009) return black;
    if (az > ez + 0.004 && Math.hypot(c.x - ex, c.y - ey) < er * 1.01) return white;
    return new THREE.Color(sp.paint(c.x, c.y, Math.sign(c.z)));
  }, 0, 1, 0.05, r);
}

export type Swimmer = (t: number, out: THREE.Vector3) => void;
const tmp = new THREE.Vector3(), nxt = new THREE.Vector3(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YZX'), S = new THREE.Vector3();

/** One species as instances; each instance has a path p(t) and a length. Heading follows the path. */
export function fishSet(species: string | THREE.BufferGeometry, paths: Swimmer[], lengths: number[], wiggle = 9, mats?: THREE.Material[]) {
  const geo = typeof species === 'string' ? fishGeo(SPECIES[species], species.length * 7) : species;
  const mesh = new THREE.InstancedMesh(geo, mats ?? reefMat({ fish: wiggle, caustics: 0.5 }), paths.length);
  mesh.castShadow = true; mesh.receiveShadow = false; mesh.frustumCulled = false;
  mesh.userData.noLook = true;
  const heading = new Float32Array(paths.length);
  const update = (t: number) => {
    for (let i = 0; i < paths.length; i++) {
      paths[i](t, tmp); paths[i](t + 0.08, nxt);
      const d = nxt.sub(tmp);
      if (d.lengthSq() > 1e-8) {
        const yaw = Math.atan2(-d.z, d.x), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
        heading[i] = yaw;
        E.set(0, yaw, THREE.MathUtils.clamp(pitch, -0.6, 0.6));
      } else E.set(0, heading[i], 0);
      Q.setFromEuler(E);
      M.compose(tmp, Q, S.setScalar(lengths[i]));
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, update };
}

/** A fish wandering around an anchor on a slow Lissajous loop (radii rx, ry, rz; speed w). */
export const wander = (a: THREE.Vector3, rx: number, ry: number, rz: number, w: number, ph: number): Swimmer => (t, o) =>
  o.set(a.x + Math.sin(t * w + ph) * rx, a.y + Math.sin(t * w * 1.7 + ph * 2) * ry, a.z + Math.cos(t * w * 0.83 + ph) * rz);

/** A school member: the school centre c(t) plus its own slot that drifts slowly. */
export const schooled = (c: Swimmer, off: THREE.Vector3, ph: number): Swimmer => {
  const cc = new THREE.Vector3();
  return (t, o) => { c(t, cc); o.set(cc.x + off.x + Math.sin(t * 0.7 + ph) * 0.25, cc.y + off.y + Math.sin(t * 0.9 + ph * 1.3) * 0.15, cc.z + off.z + Math.cos(t * 0.6 + ph) * 0.25); };
};

/** A low-poly sea turtle (shell plates, flapping front flippers). */
export function turtle() {
  const r = rng(77);
  const root = new THREE.Group();
  const shell = new THREE.Mesh(finish(new THREE.IcosahedronGeometry(0.7, 1).scale(1.15, 0.38, 0.9),
    (_c, n, f) => (n.y > 0 ? (f % 3 === 0 ? new THREE.Color('#9a7a3a') : new THREE.Color('#6b5428')) : new THREE.Color('#e8d8a0')), 0, 1, 0.12, r), reefMat({ caustics: 0.5 }));
  const skin = (g: THREE.BufferGeometry) => new THREE.Mesh(finish(g, () => new THREE.Color('#a8b07a'), 0, 1, 0.12, r), reefMat({ caustics: 0.4 }));
  const head = skin(new THREE.IcosahedronGeometry(0.22, 0).scale(1.3, 0.9, 1));
  head.position.set(0.9, 0.05, 0);
  root.add(shell, head);
  const flip = (fx: number, side: number, L: number) => {
    const piv = new THREE.Group(); piv.position.set(fx, 0, side * 0.5);
    const m = skin(new THREE.BoxGeometry(L * 0.45, 0.05, L).translate(-L * 0.1, 0, side * L * 0.5));
    piv.add(m); root.add(piv); return piv;
  };
  const fl = [flip(0.4, -1, 0.9), flip(0.4, 1, 0.9), flip(-0.55, -1, 0.4), flip(-0.55, 1, 0.4)];
  for (const o of [shell, head]) o.castShadow = true;
  const pose = (t: number) => {
    const s = Math.sin(t * 1.6);
    fl[0].rotation.x = 0.6 * s; fl[1].rotation.x = -0.6 * s;
    fl[0].rotation.y = 0.3 * Math.cos(t * 1.6); fl[1].rotation.y = -0.3 * Math.cos(t * 1.6);
    fl[2].rotation.x = 0.25 * s; fl[3].rotation.x = -0.25 * s;
    head.rotation.z = 0.08 * Math.sin(t * 0.8);
  };
  return { root, pose };
}
