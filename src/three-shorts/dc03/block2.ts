import * as THREE from 'three';
import type { LookContext } from '../../engine/look/LookStage';
import type { Cat } from '../dc02/cast';
import { catPose, catRoot, ramp, smooth, clamp01 } from '../dc02/act';
import { cave, sandPuff } from '../dc02/sets';
import { fishSet, type Swimmer } from '../dc02/fishes';
import { catchFish, modelGeo } from '../dc02/catchfish';
import { U } from '../dc02/mat';
import { MARK, type Shark } from './shark';

// Dive Cats 3 block 2 (14–37 s): the fish school (with the shark chasing its own tail first), the sand (its head
// scans like a metal detector; a fact card), the grumpy grouper (Babushka's, from DC2). Same rules as block 1:
// pure in t, the chase always runs to screen left, contact beats are named in SHOTS.md, nothing reads as "eaten".

export const B2 = { start: 14, sand: 21, grouper: 29, end: 37 };
/** the sand shot's fact card, global seconds */
export const CARD = { t0: B2.sand + 2.4, t1: B2.sand + 3.9, name: 'HAMMERHEAD', fact: 'ITS HEAD FINDS ANIMALS HIDDEN IN THE SAND' };

type V3 = THREE.Vector3;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UPV = v3(0, 1, 0);
const lerp = THREE.MathUtils.lerp;
const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const yawOf = (d: V3) => Math.atan2(-d.z, d.x);
const GOLD = new THREE.Color('#3e2a0c'), ANGRY = new THREE.Color('#5c1206'); // gentle: stronger washed its texture out to flat colour // the grouper's lift to golden, and its glare // the shark's / a fish's yaw for nose direction d (nose +X)

export type Kit = {
  ctx: LookContext; franko: Cat; h: number; shark: Shark; HEAD_X: number;
  bub: { add: (p: V3, r: number) => void };
  trail: { update: (at: V3, dir: V3, k: number, cam: THREE.Camera, spread?: number, length?: number) => void };
  drop: THREE.Object3D;
  cam: (p: V3, l: V3, fov?: number) => void;
  kick: (tt: number, at: number, amp?: number) => void;
  stand: (p: V3, face: V3, tt: number, o?: { surprise?: number; lean?: number; roll?: number; rollAx?: V3; sx?: number; sy?: number; sz?: number }) => void;
  setShark: (pos: V3, yaw: number, pitch: number, roll?: number) => void;
  gunDangles: (tt: number, drag?: V3) => void;
  maskFront: (out?: V3) => V3;
  sandY: (x: number, z: number) => number;
};

export async function makeBlock2(k: Kit) {
  const { ctx, franko, h, shark, HEAD_X, bub, trail, drop, cam, kick, stand, setShark, gunDangles, maskFront, sandY } = k;
  const hide = () => { franko.rig.root.visible = false; franko.gun.visible = false; };
  /** Franko swimming prone along dir (body centre p), like a fish: fast flutter */
  const swim = (p: V3, dir: V3, tt: number, rate = 2.4) => {
    franko.rig.root.visible = true; franko.gun.visible = false;
    catRoot(franko, p.clone().addScaledVector(dir, -0.9 * h), dir, dir, 0, tt, 0.1); // prone, catRoot's root (his feet) sits 0.45 h ahead of pos: this centres his body on p
    catPose(franko.rig, tt, { hug: 0, rate, kick: 1, ph: 2 });
  };
  const sweat = (tt: number, at: number, side: V3) => {
    const sk = ramp(tt, at, at + 0.15);
    drop.visible = sk > 0 && franko.rig.root.visible;
    if (!drop.visible) return;
    drop.position.copy(maskFront()).add(v3(0, 0.06 * h / 0.68 - 0.04 * clamp01((tt - at) / 0.9), 0)).addScaledVector(side, 0.1 * h / 0.68);
    drop.quaternion.copy(ctx.camera.quaternion); drop.scale.setScalar(2.6 * sk * h / 0.68);
  };
  /** the bubble trail left along a straight zip (from a to b, started at t0, over dur) */
  const zipTrail = (tt: number, t0: number, a: V3, b: V3, dur = 0.3, n = 34) => {
    for (let i = 0; i < n; i++) {
      const u = i / n, at = t0 + dur * Math.sqrt(u), age = tt - at;
      if (age < 0 || age > 2.0) continue;
      bub.add(a.clone().lerp(b, u).add(v3((hash(i) - 0.5) * 0.12, (hash(i + 3) - 0.3) * 0.3 * h + age * 0.25, (hash(i + 6) - 0.5) * 0.12)), (0.012 + 0.01 * hash(i + 9)) * (1 - age / 2.0));
    }
  };
  /** Franko upright, zipping from p along dir over 0.3 s from t0 (returns false once he is gone) */
  const zip = (tt: number, t0: number, p: V3, dir: V3, run = 4) => {
    const zk = (tt - t0) / 0.3;
    if (zk >= 1) return false;
    stand(p.clone().addScaledVector(dir, run * Math.max(0, zk) ** 2), dir, tt, { lean: 0.5, sz: 1 + Math.sin(Math.PI * Math.min(1, Math.max(0, zk) + 0.2)), sx: 0.78, sy: 0.85 });
    for (const [s, ph] of [['Left', 0], ['Right', Math.PI]] as const) { franko.rig.turn(`${s}UpLeg`, v3(1, 0, 0), 1.15 * Math.sin(tt * 34 + ph)); franko.rig.turn(`${s}Leg`, v3(1, 0, 0), 0.9 * Math.sin(tt * 34 + ph + 1.2)); }
    franko.gun.visible = false;
    trail.update(p.clone().addScaledVector(dir, run * Math.max(0, zk) ** 2).add(v3(0, 0.45 * h, 0)), dir, 1, ctx.camera, 0.4, 1.3);
    return true;
  };

  // ======================================================================= shot 4: the school (14–21)
  // over the channel, mid-water; the school crosses to screen left (camera looks along −z, so screen left = −x)
  const S4 = v3(4, 4.6, -26);
  const SCHOOL_V = 0.9; // m/s, toward −x
  const T4 = { cut: 1.5, sharkIn: 4.0, look: 4.3, burst: 4.6, notice: 5.9, charge: 6.25, zip: 6.55 };
  const centre = (t4: number, o = new THREE.Vector3()) => o.copy(S4).add(v3(-SCHOOL_V * Math.min(t4, T4.burst) - 0.05 * Math.max(0, t4 - T4.burst), 0.08 * Math.sin(t4 * 1.3), 0)); // after the burst he hangs there, alone
  const fishPaths: Swimmer[] = [], fishLens: number[] = [];
  {
    let i = 0;
    while (fishPaths.length < 110) {
      i++;
      const off = v3((hash(i) - 0.5) * 3.6, (hash(i + 50) - 0.5) * 1.5, -1.6 + 2.0 * hash(i + 99)); // none nearer the lens than 0.4 m in front of him
      if (Math.hypot(off.x / 1.0, off.y / 0.55, off.z / 0.7) < 1) continue; // a hole the size of a kitten
      const ph = hash(i + 7) * 20, out = off.clone().normalize().add(v3(-0.4, 0.15, 0)).normalize(), sp = 5 + 5 * hash(i + 31);
      fishPaths.push((t, o) => {
        const t4 = t - B2.start;
        centre(t4, o);
        const wob = v3(Math.sin(t * 2.1 + ph) * 0.08, Math.sin(t * 1.7 + ph) * 0.05, Math.cos(t * 1.9 + ph) * 0.08);
        o.add(off).add(wob).add(v3(-0.25 * Math.sin(t * 0.3 + ph), 0, 0));
        const e = Math.max(0, t4 - T4.burst - hash(ph) * 0.12);
        o.addScaledVector(out, sp * e * (1 - Math.exp(-e * 2)) + 0.4 * e); // the flick: every fish bolts outward at once
      });
      fishLens.push(0.26 + 0.06 * hash(i + 13));
    }
  }
  const school = fishSet('fusilier', fishPaths, fishLens, 14);
  ctx.scene.add(school.mesh);
  const G4 = v3(0.5, 6.2, -40); // the tail-chasing spot: mid-water over the channel, further down

  const shot4 = (tt: number) => {
    const t4 = tt - B2.start;
    school.mesh.visible = t4 >= T4.cut;
    if (t4 < T4.cut) {
      // the running gag: it spins after the gun dangling off its tail, snaps, misses, wobbles dizzy
      const spin = smooth(t4 / 1.15) * Math.PI * 2 * 1.25;
      const dizzy = ramp(t4, 1.15, 1.3) * 0.25 * Math.sin((t4 - 1.15) * 14);
      setShark(G4, 0.6 + spin, 0.05, dizzy);
      shark.ctl.curl = 1.0 * Math.sin(Math.PI * clamp01(t4 / 1.25));
      shark.ctl.headYaw = 0.35 * Math.sin(Math.PI * clamp01(t4 / 1.25));
      shark.jaw(ramp(t4, 0.35, 0.6) * (1 - ramp(t4, 0.85, 0.92)));
      shark.fishU.uAmp.value = 0.5; shark.fishU.uFast.value = 1.4;
      const out = v3(Math.cos(0.6 + spin), 0, -Math.sin(0.6 + spin)).negate();
      gunDangles(tt, out.multiplyScalar(0.6 * Math.sin(Math.PI * clamp01(t4 / 1.25)))); // flung outward by the spin
      cam(G4.clone().add(v3(0.6, 4.4, 6.4)), G4.clone().add(v3(0, -0.1, 0)), 46);
      hide();
      return { gate: 0 };
    }
    // the school, tracked; Franko in the hole, swimming like one of them
    const C = centre(t4);
    const camX = C.x + 0.15;
    const camStop = S4.x - SCHOOL_V * T4.burst + 0.15; // tracking stops at the burst
    cam(v3(t4 < T4.burst ? camX : camStop, C.y + 0.3, C.z + 2.8), v3(t4 < T4.burst ? camX : camStop, C.y + 0.05, C.z), 46);
    // the shark: glides in behind the school (6 m back), turns its head toward it, then charges (stops at 5.2 m)
    const sIn = ramp(t4, T4.sharkIn - 0.4, T4.look + 0.2);
    const behind = C.z - 6.2;
    const charge = ramp(t4, T4.charge, T4.zip + 0.3);
    const sx = lerp(C.x + 7, C.x + 1.3, sIn), sz = lerp(behind, C.z - 5.25, charge);
    const lookK = ramp(t4, T4.look, T4.look + 0.4);
    const dir = v3(-1, 0, 0).lerp(v3(-0.35, 0, 0.94), lookK).normalize();
    shark.root.visible = t4 > T4.sharkIn - 0.45;
    if (shark.root.visible) {
      setShark(v3(sx, C.y + 0.3, sz).addScaledVector(dir, -HEAD_X), yawOf(dir), 0);
      shark.fishU.uAmp.value = 0.6 + 1.2 * charge; shark.fishU.uFast.value = 0.8 + 0.8 * charge;
      shark.ctl.headYaw = 0.25 * Math.sin(Math.PI * lookK);
      gunDangles(tt, dir.clone().negate().multiplyScalar(0.5));
    }
    // Franko
    const fp = C.clone().add(v3(0, 0, 0.1));
    const nk = ramp(t4, T4.notice, T4.notice + 0.25);
    if (t4 < T4.zip) {
      if (nk <= 0) swim(fp, v3(-1, 0, 0), tt);
      else {
        // he stops "being a fish", stands up in the water and looks round: nobody left
        stand(fp.clone().add(v3(0, -0.1, 0)), v3(-0.3, 0, 1).normalize().lerp(v3(0.6, 0, 0.8), 0.5 + 0.5 * Math.sin((t4 - T4.notice) * 5)).normalize(), tt, { surprise: nk });
        sweat(tt, B2.start + T4.notice + 0.15, v3(1, 0, 0));
      }
    } else {
      if (!zip(tt, B2.start + T4.zip, fp.clone().add(v3(0, -0.1, 0)), v3(-1, 0, 0))) hide();
      zipTrail(tt, B2.start + T4.zip, fp, fp.clone().add(v3(-4, 0, 0)));
    }
    return { gate: t4 < T4.zip && t4 > T4.cut + 0.2 ? 0.07 : 0 };
  };

  // ======================================================================= shot 5: the sand (21–29)
  const Bz = -7.5, Bx = 0.3;
  const B = v3(Bx, sandY(Bx, Bz), Bz); // Silent's bare patch from DC2: nothing grows there
  const camP5 = B.clone().add(v3(2.0, 2.4, 4.4)), look5 = B.clone().add(v3(0.35, 0.35, 0)); // wide enough for the whole scan (the shark in frame under the card)
  const fwd5 = look5.clone().sub(camP5).normalize(), right5 = new THREE.Vector3().crossVectors(fwd5, UPV).setY(0).normalize();
  const T5 = { dive: 0.55, bump: 0.75, sharkIn: 0.9, card: [2.4, 3.9], over: 5.0, tremble: 5.8, pop: 6.25, leave: 7.0 };
  // the bump: a low mound with two little ear points (a kitten under the sand)
  const sandM = new THREE.MeshLambertMaterial({ color: '#e2c98e', flatShading: true }); sandM.userData.noLook = true;
  const bump = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.3, 0.2, 0.42), sandM);
  const furM = new THREE.MeshLambertMaterial({ color: '#efeae2', flatShading: true }); furM.userData.noLook = true;
  const ears = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.14, 5), furM); e.position.set(s * 0.1, 0.2, 0.26); e.rotation.z = -s * 0.25; return e; });
  const toCam5 = camP5.clone().sub(B).setY(0).normalize();
  bump.add(mound, ...ears); bump.position.copy(B); bump.rotation.y = Math.atan2(toCam5.x, toCam5.z); // head end toward the lens, so both ears read side by side
  bump.traverse((o) => { o.userData.noLook = true; o.castShadow = o.receiveShadow = true; });
  ctx.scene.add(bump);
  const puffIn = sandPuff(40, 21), puffOut = sandPuff(60, 23, '#ead7a6');
  ctx.scene.add(puffIn.mesh, puffOut.mesh);
  /** the shark's progress toward the bump: quick, slow under the card, then zeroing in (0..1) */
  const prog = (t5: number) => {
    if (t5 < T5.card[0]) return 0.5 * smooth((t5 - T5.sharkIn) / (T5.card[0] - T5.sharkIn));
    if (t5 < T5.card[1]) return 0.5 + 0.1 * (t5 - T5.card[0]) / (T5.card[1] - T5.card[0]);
    return 0.6 + 0.4 * smooth((t5 - T5.card[1]) / (T5.over - T5.card[1]));
  };
  const shot5 = (tt: number) => {
    const t5 = tt - B2.sand;
    cam(camP5, look5, 46);
    U.uCaus.value = 1;
    // Franko: in from screen right, low over the sand, a dive into it; later he pops out and zips left
    const from = B.clone().addScaledVector(right5, 3.5).add(v3(0, 0.9, 0));
    if (t5 < T5.dive) {
      const k = smooth(t5 / T5.dive);
      swim(from.clone().lerp(B.clone().add(v3(0, 0.1, 0)), k), B.clone().sub(from).normalize(), tt, 3);
      trail.update(from.clone().lerp(B, k), B.clone().sub(from).normalize(), 1 - k * 0.5, ctx.camera, 0.3, 1.0);
    } else if (t5 < T5.pop) hide();
    puffIn.update(B, t5 - T5.dive, 0.45);
    // the bump, breathing bubbles, trembling before the pop
    bump.visible = t5 >= T5.bump - 0.2 && t5 < T5.pop;
    bump.scale.set(1, ramp(t5, T5.bump - 0.2, T5.bump) * (1 + 0.08 * Math.sin(t5 * 3) + (t5 > T5.tremble ? 0.12 * Math.sin(t5 * 60) : 0)), 1);
    for (const [i, at] of [[0, 1.3], [1, 2.6], [2, 4.2]] as const) {
      const age = t5 - at;
      if (age > 0 && age < 1.4) for (let j = 0; j < 2; j++) bub.add(B.clone().add(v3(0.03 * j, 0.15 + age * 0.5 + j * 0.06, 0.02 * Math.sin(age * 7 + i))), 0.014);
    }
    // the shark: in from screen right at 0.6 m over the sand, head sweeping like a metal detector; stops over him
    const p = prog(t5);
    const start = B.clone().addScaledVector(right5, 2.7).add(v3(0, 0.6, -0.6)); // its head enters at the right edge, in frame by the card
    const end = B.clone().add(v3(0, 0.95, 0)).addScaledVector(toCam5, -0.6); // just past the bump, so the bump stays in view under the hammer
    const head = start.clone().lerp(end, p);
    const leaveK = ramp(t5, T5.leave, T5.leave + 0.8);
    const recoil = ramp(t5, T5.pop, T5.pop + 0.15) * (1 - leaveK);
    const dirIn = end.clone().sub(start).setY(0).normalize(), dirOut = right5.clone().negate();
    const dir = dirIn.clone().lerp(dirOut, ramp(t5, T5.leave - 0.3, T5.leave + 0.2)).normalize();
    head.addScaledVector(dirIn, -0.6 * recoil).add(v3(0, 0.35 * recoil, 0)).addScaledVector(dirOut, 6 * leaveK * leaveK);
    shark.root.visible = t5 > T5.sharkIn - 0.1;
    if (shark.root.visible) {
      setShark(head.clone().addScaledVector(dir, -HEAD_X), yawOf(dir), -0.06);
      const sweep = t5 < T5.over ? (0.5 - 0.25 * ramp(t5, T5.card[1], T5.over)) * Math.sin(t5 * (t5 < T5.card[0] || t5 > T5.card[1] ? 5 : 2)) : 0;
      const sneeze = t5 > T5.pop && t5 < T5.pop + 0.7 ? 0.35 * Math.sin((t5 - T5.pop) * 40) * (1 - (t5 - T5.pop) / 0.7) : 0;
      shark.ctl.headYaw = sweep + sneeze;
      shark.ctl.nod = 0;
      shark.fishU.uAmp.value = 0.5 + 1.2 * leaveK; shark.fishU.uFast.value = 0.7 + leaveK;
      gunDangles(tt, dir.clone().negate().multiplyScalar(0.3 + 0.6 * leaveK));
    }
    // the pop: sand in the shark's face, Franko up and away to screen left
    puffOut.update(B.clone().add(v3(0, 0.1, 0)), t5 - T5.pop, 0.65);
    if (t5 >= T5.pop) {
      const upK = ramp(t5, T5.pop, T5.pop + 0.25), P = B.clone().add(v3(0, 0.3 + 0.9 * upK, 0));
      const t0 = B2.sand + T5.pop + 0.35;
      if (tt < t0) stand(P, dirOut.clone().lerp(right5, 0.0), tt, { surprise: 1, sy: 1.15, sx: 0.9 });
      else if (!zip(tt, t0, P, dirOut)) hide();
      if (tt >= t0) zipTrail(tt, t0, P, P.clone().addScaledVector(dirOut, 4));
    }
    return { gate: (t5 > 0.38 && t5 < T5.dive - 0.05) || (t5 > T5.pop + 0.1 && t5 < T5.pop + 0.4) ? 0.04 : 0 };
  };

  // ======================================================================= shot 6: the grumpy grouper (29–37)
  const CAVE = v3(-300, -5, 0), R6 = 7;
  const cv = cave(CAVE.x, CAVE.z, R6); cv.group.position.y = CAVE.y;
  ctx.scene.add(cv.group);
  const grouper = catchFish('grouper', 1.7, 6, await modelGeo('grouper'));
  ctx.scene.add(grouper.root);
  (Array.isArray(grouper.mesh.material) ? grouper.mesh.material : [grouper.mesh.material]).forEach((m) => (m as THREE.MeshLambertMaterial).emissive?.set(GOLD)); // Babushka's GOLDEN grouper: out of the torchlight its texture went near-black
  const glowM = new THREE.MeshBasicMaterial({ color: '#fff27a' }); glowM.userData.noLook = true;
  const glow = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), glowM); m.position.set(0.36, 0.06, s * 0.13); m.userData.noLook = true; grouper.mesh.add(m); return m; });
  const GP = v3(CAVE.x + 0.4, CAVE.y + 1.7, CAVE.z + R6 + 3.2); // hovering out in front of the cave mouth, in the sun (in its shade it rendered black)
  const T6 = { gulp: 0.6, sharkIn: 1.8, stop: 3.0, glare: [3.0, 4.2], away: 4.2, hic: 4.9, back: [5.15, 5.7], wave: [5.9, 6.8], zip: 6.85 };
  // stacked for the tall frame: the shark's head stops above-right of the grouper, looking down at it (Franko is
  // inside the grouper); he is spat out low and toward the lens. Side by side, the three never fit the 9:16 width.
  const G_DIR = v3(0.6, 0, 1).normalize(); // the grouper three-quarters to the lens, mouth toward screen right (where Franko comes from)
  const SH6 = GP.clone().add(v3(0.75, 1.2, -0.4));
  const SPAT = GP.clone().addScaledVector(G_DIR, 1.55).add(v3(0, -0.35, 0)); // right in front of its mouth
  const MID6 = GP.clone().add(v3(0.7, 0.3, 0.6)); // centred on the action, which sits right of the grouper (its mouth faces right)
  const shot6 = (tt: number) => {
    const t6 = tt - B2.grouper;
    ctx.mood('day', 'golden', 0.25); U.uCaus.value = 1;
    cv.update(tt);
    // the grouper: three-quarters to the lens; gulps, bulges, glares up at the shark, hiccups him out
    const glareK = ramp(t6, T6.glare[0], T6.glare[0] + 0.3) * (1 - ramp(t6, T6.glare[1], T6.glare[1] + 0.3));
    const toShark0 = SH6.clone().sub(GP).normalize();
    const gdir = G_DIR.clone().lerp(toShark0, glareK * 0.8).normalize();
    grouper.root.visible = true;
    grouper.root.position.copy(GP).add(v3(0, 0.04 * Math.sin(t6 * 1.6), 0)).addScaledVector(gdir, 0.2 * glareK);
    grouper.root.rotation.set(0.04 * Math.sin(t6 * 1.1), yawOf(gdir), Math.asin(THREE.MathUtils.clamp(gdir.y, -0.8, 0.8)));
    const full = ramp(t6, T6.gulp, T6.gulp + 0.25) * (1 - ramp(t6, T6.hic, T6.hic + 0.2));
    const gulp = Math.sin(Math.PI * clamp01((t6 - T6.gulp + 0.1) / 0.35));
    const hic = Math.sin(Math.PI * clamp01((t6 - T6.hic + 0.15) / 0.3));
    // mesh scale is the length: x along the body; y and z swell (bulging cheeks), gulps and the hiccup squash
    grouper.mesh.scale.set(1.7 * (1 + 0.1 * gulp - 0.12 * hic), 1.7 * (1 + 0.12 * full + 0.06 * glareK - 0.1 * gulp + 0.2 * hic), 1.7 * (1 + 0.42 * full + 0.08 * glareK + 0.1 * hic));
    grouper.fishU.uAmp.value = 0.5 + 1.5 * hic; grouper.fishU.uBend.value = 0;
    glow.forEach((m) => (m.visible = false));
    (Array.isArray(grouper.mesh.material) ? grouper.mesh.material : [grouper.mesh.material]).forEach((m) => (m as THREE.MeshLambertMaterial).emissive?.copy(GOLD).lerp(ANGRY, glareK * (0.6 + 0.2 * Math.sin(t6 * 18))));
    const mouth = grouper.root.position.clone().addScaledVector(gdir, 0.85);
    // Franko: zooms in from screen right and is gulped
    const from = mouth.clone().add(v3(2.2, 0.2, 0.9));
    if (t6 < T6.gulp) {
      const k = smooth(t6 / T6.gulp), p = from.clone().lerp(mouth, k);
      swim(p, mouth.clone().sub(from).normalize(), tt, 3);
      const shrink = 1 - ramp(t6, T6.gulp - 0.12, T6.gulp);
      franko.rig.root.scale.multiplyScalar(Math.max(0.01, shrink)); franko.rig.root.updateMatrixWorld(true);
      trail.update(p, mouth.clone().sub(from).normalize(), 1, ctx.camera, 0.3, 1.0);
    } else if (t6 < T6.hic) hide();
    if (t6 > T6.gulp && t6 < T6.hic) for (let j = 0; j < 3; j++) { const age = (t6 - T6.gulp - j * 0.9) % 2.7; if (age > 0 && age < 1.2) bub.add(mouth.clone().add(v3(0.05 * j, 0.1 + age * 0.45, 0.06)), 0.016); }
    // the shark: comes in from screen right above the grouper, sniffs down at it; recoils from the glare; turns away;
    // whips back at the hiccup and noses down at Franko (a contact beat: mouth shut); then shoots off left after him
    const inK = ramp(t6, T6.sharkIn, T6.stop);
    const recoil = ramp(t6, T6.glare[0] + 0.15, T6.glare[0] + 0.6);
    const awayK = ramp(t6, T6.away, T6.away + 0.5) * (1 - ramp(t6, T6.back[0], T6.back[1]));
    const backK = ramp(t6, T6.back[0], T6.back[1]);
    const zipK = ramp(tt, B2.grouper + T6.zip + 0.1, B2.grouper + T6.zip + 0.8);
    const head = SH6.clone().add(v3(4.5 * (1 - inK), 0.2 * (1 - inK), -1.0 * (1 - inK))).add(v3(0.4 * recoil, 0.3 * recoil, 0));
    const spatH = SPAT.clone().add(v3(0, 0.45 * h, 0));
    let sdir = GP.clone().sub(head).normalize(); // down at the grouper
    sdir.lerp(v3(1, 0.15, 0.1).normalize(), awayK).normalize();
    sdir.lerp(spatH.clone().sub(head).normalize(), backK).normalize();
    head.lerp(spatH.clone().add(v3(0.25, 0.95, -0.75)), backK); // close over him for the face-off (a contact beat: mouth shut)
    head.add(v3(-5 * zipK * zipK, -0.5 * zipK, 0));
    if (zipK > 0) sdir.lerp(v3(-1, -0.1, 0), zipK).normalize();
    shark.root.visible = t6 > T6.sharkIn - 0.1;
    if (shark.root.visible) {
      setShark(head.clone().addScaledVector(sdir, -HEAD_X), yawOf(sdir), THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(sdir.y, -1, 1)), -0.55, 0.55));
      shark.ctl.headYaw = (t6 < T6.stop ? 0.3 * Math.sin(t6 * 6) : 0) + 0.2 * Math.sin(Math.PI * recoil);
      shark.fishU.uAmp.value = 0.6 + 1.4 * zipK + 0.8 * awayK; shark.fishU.uFast.value = 0.8 + zipK;
      gunDangles(tt, sdir.clone().negate().multiplyScalar(0.4 + 0.6 * zipK));
    }
    if (t6 >= T6.hic) {
      const sk = smooth((t6 - T6.hic) / 0.45), p = mouth.clone().lerp(SPAT, sk);
      const t0 = B2.grouper + T6.zip;
      if (tt < t0) {
        const toShark = shark.at(...MARK.head).sub(p).setY(0).normalize();
        const toLens = ctx.camera.position.clone().sub(p).setY(0).normalize();
        stand(p, toLens.lerp(toShark, 0.3 * ramp(t6, T6.back[0], T6.back[1])).normalize(), tt, { surprise: 1 - ramp(t6, T6.wave[0], T6.wave[0] + 0.15) * 0.6, roll: (1 - sk) * 6 * (t6 - T6.hic) });
        if (t6 > T6.wave[0] && t6 < T6.wave[1]) franko.rig.turn('RightForeArm', v3(0, 0, 1), 0.55 * Math.sin((t6 - T6.wave[0]) * 16)); // a sheepish little wave
        sweat(tt, B2.grouper + T6.back[1] + 0.1, v3(-1, 0, 0));
      } else if (!zip(tt, t0, p, v3(-1, 0, 0))) hide();
      if (tt >= t0) zipTrail(tt, t0, p, p.clone().add(v3(-4, 0, 0)));
    }
    // one camera for the whole beat, stacked for the tall frame: the shark above, the grouper below, Franko low and near; a push-in on the face-off
    const push = ramp(t6, T6.back[0], T6.back[1] + 0.3);
    cam(MID6.clone().add(v3(-0.25, 0.15, lerp(4.6, 4.0, push))), MID6.clone().add(v3(0, -0.15 * push, 0)), 50);
    if (t6 > T6.glare[0]) kick(tt, B2.grouper + T6.glare[0], 0.02);
    return { gate: (t6 > 0.45 && t6 < T6.gulp - 0.1) ? 0.04 : t6 > T6.back[1] && tt < B2.grouper + T6.zip ? 0.05 : 0 };
  };

  const setVisible = (tt: number) => {
    school.mesh.visible = tt >= B2.start + T4.cut && tt < B2.sand;
    bump.visible = false; puffIn.mesh.visible = false; puffOut.mesh.visible = false;
    cv.group.visible = grouper.root.visible = tt >= B2.grouper && tt < B2.end;
    if (school.mesh.visible) school.update(tt);
  };
  return { shot4, shot5, shot6, setVisible };
}
