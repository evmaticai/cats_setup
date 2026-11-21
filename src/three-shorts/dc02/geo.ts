import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Low-poly reef pieces as plain geometry: every piece is non-indexed (flat faces) with position, normal, color and
// sway (how far the vertex may sway; 0 = rigid). Base at y = 0. Seeded, so the same seed gives the same reef.

export const rng = (seed: number) => { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
export type R = () => number;
const C = (h: string) => new THREE.Color(h);
const n3 = (x: number, y: number, z: number, s = 0) =>
  Math.sin(x * 1.7 + s) * Math.sin(y * 2.3 + s * 2.1) * Math.sin(z * 1.9 + s * 3.7) + 0.5 * Math.sin(x * 3.9 + z * 2.7 + s);

type ColorFn = (c: THREE.Vector3, n: THREE.Vector3, f: number) => THREE.Color;

/** Flat-shade, colour every face, and give each vertex a sway amount (k × (y / h)², h = sway height). */
export function finish(g: THREE.BufferGeometry, color: ColorFn, swayK = 0, swayH = 1, jitter = 0.06, r: R = Math.random) {
  const ng = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(ng.attributes)) if (k !== 'position') ng.deleteAttribute(k);
  ng.computeVertexNormals();
  const pos = ng.attributes.position, nrm = ng.attributes.normal, N = pos.count;
  const col = new Float32Array(N * 3), sw = new Float32Array(N);
  const c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let f = 0; f < N / 3; f++) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.x += pos.getX(f * 3 + k) / 3, c.y += pos.getY(f * 3 + k) / 3, c.z += pos.getZ(f * 3 + k) / 3;
    n.set(nrm.getX(f * 3), nrm.getY(f * 3), nrm.getZ(f * 3));
    const cc = color(c, n, f).clone().multiplyScalar(1 + (r() - 0.5) * 2 * jitter);
    for (let k = 0; k < 3; k++) col.set([cc.r, cc.g, cc.b], (f * 3 + k) * 3);
  }
  for (let i = 0; i < N; i++) { const y = Math.max(0, pos.getY(i)) / swayH; sw[i] = swayK * Math.min(y, 1.5) ** 2; }
  ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
  ng.setAttribute('sway', new THREE.BufferAttribute(sw, 1));
  return ng;
}

/** Collects pieces in world placement and merges them into one mesh per material. */
export class Batch {
  parts: THREE.BufferGeometry[] = [];
  /** pieces placed where skip(position) is true are left out (the rng still runs, so the rest of the set is unchanged) */
  constructor(public skip?: (p: THREE.Vector3) => boolean) {}
  add(g: THREE.BufferGeometry, m: THREE.Matrix4) { if (this.skip?.(new THREE.Vector3().setFromMatrixPosition(m))) return; const c = g.clone(); c.applyMatrix4(m); this.parts.push(c); }
  mesh(mat: THREE.Material, shadow = true) {
    const g = mergeGeometries(this.parts)!;
    const m = new THREE.Mesh(g, mat);
    m.castShadow = shadow; m.receiveShadow = true;
    m.userData.noLook = true;
    m.frustumCulled = false;
    return m;
  }
}

export const place = (x: number, y: number, z: number, ry = 0, s = 1, tilt?: THREE.Vector3) => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0));
  if (tilt) q.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tilt.clone().normalize()));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
};

// ------------------------------------------------------------------ pieces

const ROCK = [C('#8a7884'), C('#76707e'), C('#9a8a7a')];
/** A reef boulder: lumpy, flat-bottomed, crusted with pink coralline and green algae on top. */
export function rock(r: R, rad: number, hk = 0.8) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, s = r() * 10;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + 0.28 * n3(x, y, z, s);
    p.setXYZ(i, x * d * rad, (y < 0 ? y * 0.25 : y * hk) * d * rad + rad * 0.2, z * d * rad);
  }
  const base = ROCK[Math.floor(r() * 3)];
  return finish(g, (c, n) => {
    const k = n3(c.x * 1.3, c.y * 1.3, c.z * 1.3, s + 2);
    if (n.y > 0.55 && k > 0.15) return C('#6f9a46');
    if (k < -0.35) return C('#d9789c');
    if (k > 0.55) return C('#c48a5a');
    return base;
  }, 0, 1, 0.08, r);
}

/** Brain coral: a squashed dome with meandering grooves (dark) and ridges (light). */
export function brain(r: R, rad: number, col: string) {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, s = r() * 6, w = 11 + r() * 5;
  const groove = (x: number, z: number) => Math.sin(w * (x + 0.35 * Math.sin(7 * z + s)) + 3 * z);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < -0.2) y = -0.2;
    const d = 1 + 0.05 * groove(x, z);
    p.setXYZ(i, x * d * rad, (y + 0.2) * 0.75 * d * rad, z * d * rad);
  }
  const a = C(col), b = C(col).multiplyScalar(0.55);
  return finish(g, (c) => (groove(c.x / rad, c.z / rad) > 0 ? a : b), 0, 1, 0.05, r);
}

function cyl(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, seg = 5) {
  const len = a.distanceTo(b), g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q); g.translate(a.x, a.y, a.z);
  return g;
}

/** Staghorn / branching coral: 3-4 levels of tapering branches, tips lighter. */
export function staghorn(r: R, size: number, col: string, tip: string) {
  const parts: THREE.BufferGeometry[] = [];
  const grow = (a: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, lvl: number) => {
    const b = a.clone().addScaledVector(dir, len);
    parts.push(cyl(a, b, rad, rad * 0.7));
    if (lvl === 0) return;
    const kids = 2 + Math.floor(r() * 2);
    for (let k = 0; k < kids; k++) {
      const d = dir.clone().add(new THREE.Vector3((r() - 0.5) * 1.4, 0.35 + r() * 0.5, (r() - 0.5) * 1.4)).normalize();
      grow(b, d, len * (0.65 + r() * 0.2), rad * 0.7, lvl - 1);
    }
  };
  const trunks = 2 + Math.floor(r() * 3);
  for (let t = 0; t < trunks; t++) grow(new THREE.Vector3((r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.2),
    new THREE.Vector3((r() - 0.5) * 0.9, 1, (r() - 0.5) * 0.9).normalize(), 0.32 * size, 0.07 * size, 3);
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  const a = C(col), b = C(tip);
  return finish(g, (c) => a.clone().lerp(b, THREE.MathUtils.smoothstep(c.y / size, 0.35, 1.0)), 0.02, size, 0.06, r);
}

/** Table coral: a short stem under one or two wide flat plates; underside darker. */
export function table(r: R, rad: number, col: string) {
  const parts = [new THREE.CylinderGeometry(rad * 0.1, rad * 0.16, rad * 0.5, 6).translate(0, rad * 0.25, 0)];
  const tiers = 1 + Math.floor(r() * 2);
  for (let t = 0; t < tiers; t++) {
    const R0 = rad * (1 - t * 0.35), y = rad * (0.5 + t * 0.22);
    parts.push(new THREE.CylinderGeometry(R0, R0 * 0.82, rad * 0.07, 11).translate((r() - 0.5) * 0.1, y, (r() - 0.5) * 0.1));
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  const a = C(col), b = C(col).multiplyScalar(0.45);
  return finish(g, (c, n) => (n.y < -0.3 ? b : n.y > 0.5 ? a.clone().lerp(C('#fff2b0'), 0.18) : a), 0, 1, 0.08, r);
}

/** Sea fan: a flat lacework of branches in one plane, gently swaying. */
export function fan(r: R, size: number, col: string) {
  const parts: THREE.BufferGeometry[] = [];
  const grow = (a: THREE.Vector3, ang: number, len: number, w: number, lvl: number) => {
    const b = a.clone().add(new THREE.Vector3(Math.sin(ang) * len, Math.cos(ang) * len, 0));
    const box = new THREE.BoxGeometry(w, len, w * 0.5).translate(0, len / 2, 0).rotateZ(-ang).translate(a.x, a.y, a.z);
    parts.push(box);
    if (lvl === 0) return;
    grow(b, ang - 0.35 - r() * 0.2, len * 0.8, w * 0.75, lvl - 1);
    grow(b, ang + 0.35 + r() * 0.2, len * 0.8, w * 0.75, lvl - 1);
  };
  grow(new THREE.Vector3(), 0, 0.3 * size, 0.06 * size, 5);
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  const a = C(col);
  return finish(g, (c) => a.clone().multiplyScalar(0.8 + 0.3 * Math.min(1, c.y / size)), 0.12, size * 1.5, 0.08, r);
}

/** Tube sponges: a cluster of fat tubes with dark open tops. */
export function tubes(r: R, size: number, col: string) {
  const parts: THREE.BufferGeometry[] = [];
  const n = 3 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const h = size * (0.4 + r() * 0.8), rad = size * (0.09 + r() * 0.06);
    parts.push(new THREE.CylinderGeometry(rad, rad * 0.8, h, 7).translate((r() - 0.5) * size * 0.45, h / 2, (r() - 0.5) * size * 0.45));
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  const a = C(col), top = C(col).multiplyScalar(0.25);
  return finish(g, (_c, nn) => (nn.y > 0.9 ? top : a), 0, 1, 0.08, r);
}

/** Anemone: a short column and a crown of soft swaying tentacles with pale tips. */
export function anemone(r: R, size: number, col: string, tipCol: string) {
  const parts = [new THREE.CylinderGeometry(0.28 * size, 0.32 * size, 0.18 * size, 9).translate(0, 0.09 * size, 0)];
  const N = 80;
  for (let i = 0; i < N; i++) { // two-segment tentacles that curl outward
    const a = i * 2.39996, rr = Math.sqrt((i + 0.5) / N) * 0.27 * size, len = (0.16 + r() * 0.1) * size;
    const base = new THREE.Vector3(Math.cos(a) * rr, 0.17 * size, Math.sin(a) * rr);
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const d1 = out.clone().multiplyScalar((rr / size) * 2.0 + 0.15).add(new THREE.Vector3(0, 1, 0)).normalize();
    const mid = base.clone().addScaledVector(d1, len);
    const d2 = out.clone().multiplyScalar((rr / size) * 3.5 + 0.6).add(new THREE.Vector3(0, 0.8, 0)).normalize();
    parts.push(cyl(base, mid, 0.014 * size, 0.011 * size, 4), cyl(mid, mid.clone().addScaledVector(d2, len * 0.9), 0.011 * size, 0.004 * size, 4));
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  const a = C(col), b = C(tipCol);
  return finish(g, (c) => (c.y < 0.17 * size ? a.clone().multiplyScalar(0.7) : a.clone().lerp(b, THREE.MathUtils.smoothstep(c.y / size, 0.25, 0.55))), 0.07, 0.5 * size, 0.06, r);
}

/** Kelp / tall algae: a stem with alternating leaves, swaying strongly toward the top. */
export function kelp(r: R, h: number) {
  const parts: THREE.BufferGeometry[] = [];
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const y0 = (i / segs) * h, y1 = ((i + 1) / segs) * h, bend = Math.sin(i * 0.9 + r()) * 0.08;
    parts.push(cyl(new THREE.Vector3(bend, y0, 0), new THREE.Vector3(-bend, y1, 0), 0.03, 0.025, 4));
    for (const side of [-1, 1]) {
      const L = 0.35 + r() * 0.35, W = 0.12 + r() * 0.06, y = y0 + (side > 0 ? 0.3 : 0.7) * (y1 - y0);
      const leaf = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, y, 0), new THREE.Vector3(side * L * 0.5, y + W, W * 0.5), new THREE.Vector3(side * L, y + L * 0.5, 0),
        new THREE.Vector3(0, y, 0), new THREE.Vector3(side * L, y + L * 0.5, 0), new THREE.Vector3(side * L * 0.5, y + W * 0.3, -W * 0.5),
      ]);
      parts.push(leaf.rotateY(r() * 6.28));
    }
  }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)).map((p) => { for (const k of Object.keys(p.attributes)) if (k !== 'position') p.deleteAttribute(k); return p; }))!;
  const a = C('#5f9a2e'), b = C('#d8c84a');
  return finish(g, (c) => a.clone().lerp(b, c.y / h), 0.45, h, 0.1, r);
}

/** Sea grass tuft: thin blades. */
export function grass(r: R, h: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 14; i++) {
    const x = (r() - 0.5) * 0.5, z = (r() - 0.5) * 0.5, a = r() * 6.28, w = 0.05, hh = h * (0.5 + r() * 0.6);
    const lean = new THREE.Vector3((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3);
    pts.push(new THREE.Vector3(x - Math.cos(a) * w, 0, z - Math.sin(a) * w), new THREE.Vector3(x + Math.cos(a) * w, 0, z + Math.sin(a) * w),
      new THREE.Vector3(x + lean.x, hh, z + lean.z));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return finish(g, (c) => C('#3f9a3a').lerp(C('#b6e05a'), c.y / h), 0.18, h, 0.12, r);
}

/** Starfish lying on the sand. */
export function starfish(r: R, col: string) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2, rr = i % 2 ? 0.07 : 0.2;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }).rotateX(-Math.PI / 2);
  const a = C(col);
  return finish(g, (_c, n) => (n.y > 0.5 ? a : a.clone().multiplyScalar(0.6)), 0, 1, 0.1, r);
}

/** Sea urchin: a dark ball of spikes. */
export function urchin(r: R) {
  const parts: THREE.BufferGeometry[] = [new THREE.IcosahedronGeometry(0.1, 0).translate(0, 0.08, 0)];
  for (let i = 0; i < 26; i++) {
    const d = new THREE.Vector3(r() - 0.5, r() * 0.8, r() - 0.5).normalize();
    parts.push(cyl(d.clone().multiplyScalar(0.08).add(new THREE.Vector3(0, 0.08, 0)), d.clone().multiplyScalar(0.3).add(new THREE.Vector3(0, 0.08, 0)), 0.012, 0.002, 3));
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  return finish(g, () => C('#2a1638'), 0, 1, 0.15, r);
}

/** Giant clam: a ribbed shell open on an electric-blue mantle. */
export function clam(r: R, size: number) {
  const shell = new THREE.SphereGeometry(0.4 * size, 12, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.55, 0.62).translate(0, 0.2 * size, 0);
  const p = shell.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, p.getY(i) + Math.abs(Math.sin(a * 5)) * 0.06 * size); }
  const mantle = new THREE.SphereGeometry(0.36 * size, 12, 3, 0, Math.PI * 2, 0, 0.6).scale(1, 0.25, 0.5).translate(0, 0.14 * size, 0);
  const g = mergeGeometries([shell.toNonIndexed(), mantle.toNonIndexed()].map((q) => { q.deleteAttribute('uv'); q.deleteAttribute('normal'); return q; }))!;
  return finish(g, (c, n, f) => (n.y > 0.6 && c.y > 0.16 * size ? (f % 5 === 0 ? C('#7fffd8') : C('#1f8fff')) : C('#d8cfb8')), 0, 1, 0.1, r);
}
