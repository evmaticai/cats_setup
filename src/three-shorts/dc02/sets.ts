import * as THREE from 'three';
import { Batch, anemone, brain, fan, finish, grass, kelp, place, rng, rock, starfish, tubes, urchin, type R } from './geo';
import { reefMat } from './mat';
import { fishSet, schooled, wander, type Swimmer } from './fishes';
import { lightRays } from './reef';

// Dive Cats 2 v3: the places each cat hunts in, away from the main reef so each can be dressed for its shot:
// garden eels and the bait ball (on the main reef), the kelp forest, the cave under the rock and the drop-off wall.
// Every set is a group with update(t); everything moving is a closed-form function of t.

const C = (h: string) => new THREE.Color(h);
const SAND = [C('#e2c98e'), C('#cdb078'), C('#f2dca4')];

/** A flat sand patch (size × size) at y ≈ 0 with ripples, centred at (x, z). */
function sandPatch(r: R, x: number, z: number, size: number, h = (_x: number, _z: number) => 0) {
  const g = new THREE.PlaneGeometry(size, size, 70, 70).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i)) + 0.12 * Math.sin(p.getX(i) * 0.5) * Math.sin(p.getZ(i) * 0.4));
  const m = new THREE.Mesh(finish(g, (c) => {
    const rip = Math.sin(c.x * 2.6 + Math.sin(c.z * 0.7) * 2 + c.z * 0.9);
    return rip > 0.6 ? SAND[2] : Math.sin(c.x * 0.3 + c.z * 0.21) > 0.55 ? SAND[1] : SAND[0];
  }, 0, 1, 0.04, r), reefMat({ caustics: 2.2 }));
  m.position.set(x, 0, z);
  m.receiveShadow = true; m.frustumCulled = false;
  return m;
}

const at = (cx: number, cz: number) => (x: number, z: number) => [cx + x, cz + z] as const;

// ---------------------------------------------------------------------------------------------------- garden eels
/** Garden eels around `c` on the sand: thin spotted tubes standing from holes. duck(t, i) in 0..1 pulls eel i
 *  into its hole (0 = fully out). Holes stay visible as dark rings. */
export function gardenEels(c: THREE.Vector3, sandY: (x: number, z: number) => number, lane = new THREE.Vector3(1, 0, 0), n = 56, seed = 31) {
  const r = rng(seed);
  const pts: THREE.Vector3[] = [];
  const H = 0.55, segs = 6;
  for (let k = 0; k < segs; k++) {
    const y0 = (k / segs) * H, y1 = ((k + 1) / segs) * H, b0 = Math.sin(k * 0.6) * 0.05, b1 = Math.sin((k + 1) * 0.6) * 0.05, rad = 0.018;
    for (let j = 0; j < 5; j++) {
      const a0 = (j / 5) * 6.28, a1 = ((j + 1) / 5) * 6.28;
      const p = (y: number, b: number, a: number) => new THREE.Vector3(b + Math.cos(a) * rad, y, Math.sin(a) * rad);
      pts.push(p(y0, b0, a0), p(y1, b1, a0), p(y0, b0, a1), p(y0, b0, a1), p(y1, b1, a0), p(y1, b1, a1));
    }
  }
  pts.push(new THREE.Vector3(0.05 * Math.sin(segs * 0.6) + 0.04, H + 0.02, 0), new THREE.Vector3(0.05 * Math.sin(segs * 0.6) - 0.02, H, 0.02), new THREE.Vector3(0.05 * Math.sin(segs * 0.6) - 0.02, H, -0.02));
  const geo = finish(new THREE.BufferGeometry().setFromPoints(pts), (p) => (p.y > H - 0.04 ? C('#2a2418') : Math.floor(p.y * 30 + p.x * 40) % 3 === 0 ? C('#3a3020') : C('#f2ead0')), 0, 1, 0.08, r);
  const mesh = new THREE.InstancedMesh(geo, reefMat({ caustics: 0.6 }), n);
  mesh.castShadow = true; mesh.frustumCulled = false; mesh.userData.noLook = true;
  const holeG = new THREE.RingGeometry(0.025, 0.06, 6).rotateX(-Math.PI / 2);
  const holes = new THREE.InstancedMesh(finish(holeG, () => C('#8a7650'), 0, 1, 0, r), reefMat({ caustics: 0.3 }), n);
  holes.frustumCulled = false; holes.userData.noLook = true;
  const base: THREE.Vector3[] = [], ph: number[] = [], yaw: number[] = [];
  for (let i = 0; i < n; i++) {
    // a ring field around c, with a clear lane along `lane` (where the puffer swims in)
    let x = 0, z = 0;
    const along = () => (x - c.x) * lane.x + (z - c.z) * lane.z, across = () => Math.abs((x - c.x) * lane.z - (z - c.z) * lane.x);
    do { const a = r() * 6.28, d = 1.2 + r() * 4.5; x = c.x + Math.cos(a) * d; z = c.z + Math.sin(a) * d; } while (along() > 0 && across() < 0.7);
    base.push(new THREE.Vector3(x, sandY(x, z), z)); ph.push(r() * 9); yaw.push(r() * 6.28);
    holes.setMatrixAt(i, place(x, sandY(x, z) + 0.02, z));
  }
  holes.instanceMatrix.needsUpdate = true;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
  const update = (t: number, duck: (i: number, p: THREE.Vector3) => number) => {
    for (let i = 0; i < n; i++) {
      const d = THREE.MathUtils.clamp(duck(i, base[i]), 0, 1), out = 1 - d;
      // they lean into the current and sway, heads turning
      E.set(0.15 * Math.sin(t * 0.9 + ph[i]), yaw[i] + 0.4 * Math.sin(t * 0.5 + ph[i]), 0.18 + 0.1 * Math.sin(t * 1.1 + ph[i]));
      Q.setFromEuler(E);
      P.copy(base[i]).setY(base[i].y - 0.56 * d);
      M.compose(P, Q, S.set(1, Math.max(0.001, out * 0.4 + 0.6), 1)); // shrinks a little as it pulls in
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  const group = new THREE.Group(); group.add(mesh, holes);
  return { group, update };
}

// ---------------------------------------------------------------------------------------------------- bait ball
/** A tight swirling ball of silver bait fish around centre(t), radius rad. */
export function baitBall(centre: Swimmer, n = 380, rad = 1.1, seed = 41) {
  const r = rng(seed), paths: Swimmer[] = [], lens: number[] = [];
  const cc = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const rr = rad * Math.cbrt(0.15 + 0.85 * r()), y = (r() - 0.5) * 2 * rr * 0.75, a0 = r() * 6.28;
    const ring = Math.sqrt(Math.max(0.05, rr * rr - y * y)), w = (1.4 + r() * 0.5) * (i % 2 ? 1 : 1);
    paths.push((t, o) => { centre(t, cc); const a = a0 + t * w / Math.max(0.4, ring); o.set(cc.x + Math.cos(a) * ring, cc.y + y + 0.08 * Math.sin(t * 2 + a0), cc.z + Math.sin(a) * ring); });
    lens.push(0.11 + r() * 0.03);
  }
  return fishSet('sardine', paths, lens, 22);
}

// ---------------------------------------------------------------------------------------------------- sand puff
/** A ring of sand blobs bursting out from a point and settling (age in seconds, < 0 = hidden). With a white
 *  colour and rise > 0 it is a bubble burst instead (a cat splashing in). */
export function sandPuff(n = 40, seed = 5, color = '#e8d4a0', rise = 0) {
  const r = rng(seed);
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshLambertMaterial({ color, emissive: rise > 0 ? color : '#000000', emissiveIntensity: 0.5, transparent: true, opacity: 0.85, flatShading: true }), n);
  mesh.userData.noLook = true; mesh.frustumCulled = false; (mesh.material as THREE.Material).userData.noLook = true;
  const dirs = Array.from({ length: n }, () => { const a = r() * 6.28; return new THREE.Vector3(Math.cos(a), 0.3 + r() * 0.8, Math.sin(a)).multiplyScalar(0.6 + r() * 0.8); });
  const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  const update = (o: THREE.Vector3, age: number, size = 1) => {
    mesh.visible = age >= 0 && age < 2.2;
    if (!mesh.visible) return;
    const k = 1 - Math.exp(-age * 3);
    (mesh.material as THREE.MeshLambertMaterial).opacity = 0.85 * (1 - THREE.MathUtils.smoothstep(age, 1.0, 2.2));
    for (let i = 0; i < n; i++) {
      P.copy(o).addScaledVector(dirs[i], k * size).add(new THREE.Vector3(0, rise > 0 ? rise * age * (0.6 + (i % 5) * 0.2) : -0.045 * age * age, 0));
      M.compose(P, Q, S.setScalar((rise > 0 ? 0.6 : size * (0.6 + 1.6 * k)) * (0.6 + (i % 4) * 0.2)));
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, update };
}

// ---------------------------------------------------------------------------------------------------- kelp forest
/** Paw's kelp forest around (x0, 0, z0): tall swaying kelp, two hero stalks (bendable) at the hiding spot,
 *  rocks and grass on the floor, sun shafts between the stalks and a few fish weaving through. */
export function kelpForest(x0: number, z0: number, seed = 51, clear?: (x: number, z: number, kind: 'kelp' | 'rock') => boolean) /* 'rock': rocks, grass and starfish */ { // clear: extra keep-out (Dive Cats 3's shark lane and camera)
  const r = rng(seed), group = new THREE.Group();
  const p = at(x0, z0);
  group.add(sandPatch(r, x0, z0, 90));
  const hard = new Batch(), leafy = new Batch(), soft = new Batch();
  for (let i = 0; i < 170; i++) {
    const a = r() * 6.28, d = 2.2 + Math.pow(r(), 0.8) * 30, [x, z] = p(Math.cos(a) * d, Math.sin(a) * d);
    if (Math.abs(z - z0 - 0.0) < 1.2 && x > x0 + 0.5 && x < x0 + 9) continue; // the barracuda's lane stays open
    if (clear?.(x, z, 'kelp')) continue;
    leafy.add(kelp(r, 6 + r() * 3), place(x, 0, z, r() * 6.28, 1.4 + r() * 0.3)); // ≤ 11 m: the canopy stays under the surface
  }
  for (let i = 0; i < 40; i++) { const [x, z] = p((r() - 0.5) * 40, (r() - 0.5) * 40); if (clear?.(x, z, 'rock')) continue; hard.add(rock(r, 0.4 + r() * 1.2, 0.5 + r() * 0.5), place(x, -0.1, z, r() * 6)); }
  for (let i = 0; i < 90; i++) { const [x, z] = p((r() - 0.5) * 30, (r() - 0.5) * 30); if (clear?.(x, z, 'rock')) continue; soft.add(grass(r, 0.4 + r() * 0.4), place(x, 0, z, r() * 6)); }
  for (let i = 0; i < 12; i++) { const [x, z] = p((r() - 0.5) * 16, (r() - 0.5) * 16); if (clear?.(x, z, 'rock')) continue; hard.add(starfish(r, ['#ff4a2a', '#ffb02a', '#ff5ab0'][i % 3]), place(x, 0.06, z, r() * 6)); }
  group.add(hard.mesh(reefMat()), soft.mesh(reefMat({ sway: true })), leafy.mesh(reefMat({ sway: true, side: THREE.DoubleSide })));
  // the two hero stalks Paw hides between (separate meshes so they can part)
  const heroMat = reefMat({ sway: true, side: THREE.DoubleSide });
  const hero = [-1, 1].map((s) => {
    const m = new THREE.Mesh(kelp(rng(seed + s + 5), 9), heroMat);
    m.castShadow = true; m.receiveShadow = true; m.userData.noLook = true; m.frustumCulled = false;
    m.scale.setScalar(1.25);
    m.position.set(x0 + 0.35, 0, z0 + s * 0.42);
    group.add(m);
    return m;
  });
  /** part k 0..1: the stalks bend apart around the gap (z), and shake after the shot */
  const part = (k: number, shake: number, t: number) => hero.forEach((m, i) => {
    const s = i ? 1 : -1;
    m.rotation.set(s * (0.14 * k + 0.05 * shake * Math.sin(t * 18)), 0, 0.02 * Math.sin(t * 0.8 + i));
  });
  lightRays(r, 22, x0, z0, 34).forEach((m) => group.add(m));
  // fish weaving through the kelp
  const ps: Swimmer[] = [], ls: number[] = [];
  for (let i = 0; i < 40; i++) { const [cx, cz] = p((r() - 0.5) * 24, (r() - 0.5) * 24), c = new THREE.Vector3(cx, 1 + r() * 6, cz); ps.push(wander(c, 2 + r() * 3, 0.4, 2 + r() * 3, 0.2 + r() * 0.2, r() * 9)); ls.push(0.25 + r() * 0.1); }
  const fs = fishSet('sunny', ps, ls, 9);
  const schoolC: Swimmer = (t, o) => o.set(x0 - 6 + 4 * Math.sin(t * 0.2), 7.5, z0 - 8 + 4 * Math.cos(t * 0.2));
  const sch: Swimmer[] = [], schL: number[] = [];
  for (let i = 0; i < 160; i++) { sch.push(schooled(schoolC, new THREE.Vector3((r() - 0.5) * 7, (r() - 0.5) * 2.5, (r() - 0.5) * 5), r() * 20)); schL.push(0.2); }
  const fs2 = fishSet('fusilier', sch, schL, 14);
  group.add(fs.mesh, fs2.mesh);
  const update = (t: number) => { fs.update(t); fs2.update(t); };
  return { group, update, part, hero, hide: new THREE.Vector3(x0, 2.1, z0) };
}

// ---------------------------------------------------------------------------------------------------- cave
/** Lusya's cave: a hollow rock dome (radius R) at (x0, 0, z0) with its mouth toward +Z. The shell is double
 *  sided and casts the sun's shadow, so the inside is dark and only a torch lights it. Inside: sponges in reds
 *  and oranges, a lobster's feelers, glassfish. The grouper's spot is at the back (grouperAt). */
export function cave(x0: number, z0: number, R = 4, seed = 61) {
  const r = rng(seed), group = new THREE.Group();
  group.add(sandPatch(r, x0, z0, 80));
  const g = new THREE.IcosahedronGeometry(1, 4), pp = g.attributes.position, s = r() * 10;
  const n3 = (x: number, y: number, z: number) => Math.sin(x * 3.1 + s) * Math.sin(y * 2.7 + s * 2) * Math.sin(z * 2.9 + s * 3) + 0.5 * Math.sin(x * 5.3 + z * 4.1 + s);
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), d = 1 + 0.16 * n3(x, y, z);
    pp.setXYZ(i, x * d * R * 1.15, Math.max(y, -0.15) * d * R * 0.72 - 0.05, z * d * R);
  }
  const ng = g.toNonIndexed(), np = ng.attributes.position, keep: number[] = [];
  const mouth = (x: number, y: number, z: number) => z > R * 0.55 && Math.abs(x) < R * 0.55 && y < R * 0.42; // the cave mouth
  for (let f = 0; f < np.count / 3; f++) {
    let cx = 0, cy = 0, cz = 0;
    for (let k = 0; k < 3; k++) { cx += np.getX(f * 3 + k) / 3; cy += np.getY(f * 3 + k) / 3; cz += np.getZ(f * 3 + k) / 3; }
    if (cy < -0.1 || mouth(cx, cy, cz)) continue;
    keep.push(f);
  }
  const arr = new Float32Array(keep.length * 9);
  keep.forEach((f, j) => { for (let k = 0; k < 9; k++) arr[j * 9 + k] = (np.array as Float32Array)[f * 9 + k]; });
  const shellG = new THREE.BufferGeometry(); shellG.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const rockC = [C('#7a6a72'), C('#6a6070'), C('#8a7a6a')];
  const shell = new THREE.Mesh(finish(shellG, (c, n) => {
    const k = n3(c.x * 0.4, c.y * 0.4, c.z * 0.4);
    if (n.y > 0.5 && c.y > R * 0.4 && k > 0.0) return C('#6f9a46'); // algae on the outside top
    if (k < -0.45) return C('#d9789c');
    return rockC[Math.floor((k + 2) * 7) % 3];
  }, 0, 1, 0.1, r), reefMat({ side: THREE.DoubleSide }));
  shell.position.set(x0, 0, z0);
  shell.castShadow = true; shell.receiveShadow = true; shell.frustumCulled = false;
  group.add(shell);
  // a lip of boulders round the mouth and corals on the outside, so it reads as a reef rock from outside
  const hard = new Batch(), soft = new Batch(), leafy = new Batch();
  for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; hard.add(rock(r, 0.5 + r() * 0.5, 0.6), place(x0 + Math.sin(a) * R * 0.75, -0.1, z0 + Math.cos(a) * R * 0.98, r() * 6)); }
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.28, el = 0.3 + r() * 1.1, d = new THREE.Vector3(Math.cos(a) * Math.cos(el) * 1.15, Math.sin(el) * 0.72, Math.sin(a) * Math.cos(el));
    const q = new THREE.Vector3(x0 + d.x * R * 1.02, d.y * R * 1.02, z0 + d.z * R * 1.02);
    if (mouth(q.x - x0, q.y, q.z - z0 - 0.3)) continue;
    const k = r();
    if (k < 0.35) hard.add(brain(r, 0.4 + r() * 0.4, ['#f0a050', '#e27aa8', '#cfd85e'][i % 3]), place(q.x, q.y, q.z, r() * 6, 1, d));
    else if (k < 0.6) leafy.add(fan(r, 1 + r() * 0.8, ['#e8407a', '#9b4be0', '#ffd040'][i % 3]), place(q.x, q.y, q.z, r() * 6));
    else soft.add(anemone(r, 0.9, '#ff7fb0', '#ffe8f4'), place(q.x, q.y, q.z, 0, 1, d));
  }
  // inside: sponges on the walls (they only show in the torch light), a lobster in a crack, urchins
  const inside: THREE.Vector3[] = [];
  for (let i = 0; i < 34; i++) {
    const a = Math.PI * (0.15 + r() * 0.7) + Math.PI, el = r() * 0.9; // back half
    const d = new THREE.Vector3(Math.cos(a) * Math.cos(el) * 1.15, Math.sin(el) * 0.72, -Math.abs(Math.sin(a)) * Math.cos(el));
    const q = new THREE.Vector3(x0 + d.x * R * 0.9, Math.max(0, d.y * R * 0.9), z0 + d.z * R * 0.9);
    const inward = d.clone().negate().setY(Math.max(0.3, -d.y)).normalize();
    hard.add(tubes(r, 0.4 + r() * 0.45, ['#ff3a1a', '#ff8a1a', '#ffd23a', '#ff3a7a', '#a040ff'][i % 5]), place(q.x, q.y, q.z, r() * 6, 1, inward));
    inside.push(q);
  }
  for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = r() * R * 0.7; hard.add(urchin(r), place(x0 + Math.cos(a) * d, 0.02, z0 - Math.abs(Math.sin(a)) * d, r() * 6)); }
  for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 0.5 + r() * R * 0.7; soft.add(grass(r, 0.25), place(x0 + Math.cos(a) * d, 0, z0 + Math.sin(a) * d * 0.6, r() * 6)); }
  group.add(hard.mesh(reefMat()), soft.mesh(reefMat({ sway: true })), leafy.mesh(reefMat({ sway: true, side: THREE.DoubleSide })));
  // lobster: a red body in a crack on the left wall, two long feelers waving out of it
  const red = reefMat({ caustics: 0 });
  const lob = new THREE.Group();
  const body = new THREE.Mesh(finish(new THREE.CylinderGeometry(0.09, 0.05, 0.45, 6).rotateZ(Math.PI / 2), () => C('#d8401a'), 0, 1, 0.1, r), red);
  lob.add(body);
  const feel = [-1, 1].map((s) => {
    const m = new THREE.Mesh(finish(new THREE.CylinderGeometry(0.006, 0.012, 1.1, 4).translate(0, 0.55, 0), () => C('#ff7a3a'), 0, 1, 0, r), red);
    m.position.set(0.22, 0.03, s * 0.04); lob.add(m); return m;
  });
  lob.position.set(x0 - R * 0.7, 0.55, z0 - 0.6); lob.rotation.y = -0.5;
  lob.traverse((o) => { o.userData.noLook = true; (o as THREE.Mesh).castShadow = false; });
  group.add(lob);
  // glassfish swirling under the roof
  const ps: Swimmer[] = [], ls: number[] = [];
  const gc = new THREE.Vector3(x0 + 0.8, 1.7, z0 - 1.2);
  for (let i = 0; i < 70; i++) { ps.push(schooled((t, o) => o.set(gc.x + 0.5 * Math.sin(t * 0.7), gc.y + 0.2 * Math.sin(t), gc.z + 0.4 * Math.cos(t * 0.7)), new THREE.Vector3((r() - 0.5) * 1.4, (r() - 0.5) * 0.6, (r() - 0.5) * 1.0), r() * 20)); ls.push(0.09); }
  const glass = fishSet('glass', ps, ls, 18);
  group.add(glass.mesh);
  const update = (t: number) => {
    glass.update(t);
    feel.forEach((m, i) => m.rotation.set(0.3 * Math.sin(t * 1.3 + i * 2), 0, -1.1 + 0.25 * Math.sin(t * 0.9 + i)));
  };
  return { group, update, centre: new THREE.Vector3(x0, 0, z0), R, grouperAt: new THREE.Vector3(x0 + 0.2, 0.75, z0 - R * 0.6), inside };
}

// ---------------------------------------------------------------------------------------------------- drop-off
/** Zhenya's drop-off at (x0, 0, z0): a reef ledge (y = 0, z < z0) ending at a sheer wall that falls along
 *  z = z0 into the deep (y down to -45). The wall carries sea fans, sponges and corals; marine snow drifts. */
export function dropOff(x0: number, z0: number, seed = 71) {
  const r = rng(seed), group = new THREE.Group();
  // the ledge top: sand + coral, a 70 × 40 strip behind the edge
  const top = sandPatch(r, x0, z0 - 20, 40);
  top.scale.set(1.75, 1, 1);
  group.add(top);
  // the wall: a lumpy vertical sheet
  const W = 80, D = 50;
  const wg = new THREE.PlaneGeometry(W, D, 60, 40).translate(0, -D / 2, 0);
  const wp = wg.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i), y = wp.getY(i);
    wp.setZ(i, -0.6 * (1 + Math.sin(x * 0.7 + y * 0.4)) * Math.sin(y * 0.9 + x * 0.3) - 0.5 * Math.sin(x * 0.23 - y * 0.17) - (y > -0.5 ? 0 : 0.4));
  }
  const wall = new THREE.Mesh(finish(wg, (c) => {
    const k = Math.sin(c.x * 1.7 + c.y * 2.3) * Math.sin(c.y * 1.3);
    if (k > 0.55) return C('#d9789c');
    if (k < -0.6) return C('#4f7a40');
    return c.y < -20 ? C('#4a4a5a') : C('#7a6e78');
  }, 0, 1, 0.12, r), reefMat({ side: THREE.DoubleSide }));
  wall.position.set(x0, 0.2, z0);
  wall.castShadow = true; wall.receiveShadow = true; wall.frustumCulled = false;
  group.add(wall);
  const hard = new Batch(), soft = new Batch(), leafy = new Batch();
  // the wall's life: fans sticking out, barrel sponges, tube clusters, less of it the deeper it goes
  for (let i = 0; i < 260; i++) {
    const y = -Math.pow(r(), 1.3) * 40, x = x0 + (r() - 0.5) * 50, q = r();
    const p = new THREE.Vector3(x, y, z0 + 0.4), out = new THREE.Vector3(0, 0.35, 1).normalize();
    if (q < 0.3) leafy.add(fan(r, 1 + r() * 1.6, ['#e8407a', '#9b4be0', '#ff6a3d', '#ffd040'][i % 4]), place(p.x, p.y, p.z, r() * 0.6 - 0.3));
    else if (q < 0.6) hard.add(tubes(r, 0.5 + r() * 0.7, ['#ff8a2a', '#ffd23a', '#a65be8', '#3fc6ff', '#ff5a8a'][i % 5]), place(p.x, p.y, p.z, r() * 6, 1, out));
    else if (q < 0.8) hard.add(brain(r, 0.3 + r() * 0.5, ['#f0a050', '#e27aa8', '#cfd85e', '#8fd8c0'][i % 4]), place(p.x, p.y, p.z, r() * 6, 1, out));
    else hard.add(rock(r, 0.4 + r() * 0.8, 0.7), place(p.x, p.y - 0.3, p.z - 0.2, r() * 6));
  }
  // the ledge: bommies, garden, kelp
  for (let i = 0; i < 70; i++) {
    const x = x0 + (r() - 0.5) * 60, z = z0 - 1.5 - r() * 22, q = r();
    if (Math.abs(x - x0) < 3 && z > z0 - 9) continue; // Zhenya's run-up
    if (q < 0.35) hard.add(rock(r, 0.6 + r() * 1.4, 0.6 + r() * 0.6), place(x, -0.1, z, r() * 6));
    else if (q < 0.55) hard.add(brain(r, 0.4 + r() * 0.5, ['#f0a050', '#e27aa8', '#cfd85e'][i % 3]), place(x, 0, z, r() * 6));
    else if (q < 0.75) leafy.add(fan(r, 1 + r(), ['#e8407a', '#9b4be0', '#ffd040'][i % 3]), place(x, 0, z, r() * 6));
    else if (q < 0.9) soft.add(anemone(r, 0.9, '#b8f05a', '#e070ff'), place(x, 0, z, 0));
    else leafy.add(kelp(r, 3 + r() * 3), place(x, 0, z, r() * 6));
  }
  for (let i = 0; i < 40; i++) soft.add(grass(r, 0.4), place(x0 + (r() - 0.5) * 30, 0, z0 - 1 - r() * 18, r() * 6));
  group.add(hard.mesh(reefMat()), soft.mesh(reefMat({ sway: true })), leafy.mesh(reefMat({ sway: true, side: THREE.DoubleSide })));
  lightRays(r, 16, x0, z0 + 2, 30, 16).forEach((m) => group.add(m));
  // anthias on the upper wall, a few big silhouettes deep down
  const ps: Swimmer[] = [], ls: number[] = [];
  for (let i = 0; i < 120; i++) { const c = new THREE.Vector3(x0 + (r() - 0.5) * 24, -1 - r() * 9, z0 + 1 + r() * 1.5); ps.push(wander(c, 0.6 + r(), 0.3, 0.4, 0.4 + r() * 0.4, r() * 9)); ls.push(0.12); }
  const anth = fishSet('anthias', ps, ls, 16);
  const deep: Swimmer[] = [], deepL: number[] = [];
  for (let i = 0; i < 7; i++) { const y = -24 - r() * 12, ph = r() * 9, zz = z0 + 7 + r() * 9; deep.push((t, o) => o.set(x0 - 30 + ((t * (1.2 + i * 0.15) + ph * 5) % 60), y + Math.sin(t * 0.3 + ph), zz)); deepL.push(1.2 + r()); }
  const big = fishSet('trevally', deep, deepL, 6);
  group.add(anth.mesh, big.mesh);
  // marine snow: specks all down the drop
  const NP = 1600, pos = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) pos.set([x0 + (r() - 0.5) * 30, -r() * 42, z0 + r() * 14], i * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const snow = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#dff4ff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.55 }));
  snow.userData = { noLook: true, noShadow: true }; (snow.material as THREE.Material).userData.noLook = true; snow.frustumCulled = false;
  group.add(snow);
  const update = (t: number) => { anth.update(t); big.update(t); snow.position.y = -((t * 0.15) % 1); };
  return { group, update, edge: new THREE.Vector3(x0, 0, z0) };
}
