import React, { useCallback } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { LookStage, type LookContext } from '../../engine/look/LookStage';
import { PIX, outline, usePixelFont } from '../../engine/overlays';
import { buildReef } from '../dc02/reef';
import { loadCat } from '../dc02/cast';
import { catPose, catRoot, axes, makeSpear, ramp, smooth, clamp01 } from '../dc02/act';
import { kelpForest } from '../dc02/sets';
import { REEF, U } from '../dc02/mat';
import { place, rng, rock, kelp as kelpGeo } from '../dc02/geo';
import { reefMat } from '../dc02/mat';
import TL2 from '../dc02/timeline.json';
import { makeShark, MARK } from './shark';
import { bubblePool, bodyPoints, streaks, runWheel, sweatDrop } from './fx';
import { framingGate } from '../cozy/gate';
import { makeBlock2, B2, CARD } from './block2';

// Dive Cats 3 "Run, Franko, Run!" — block 1 (0–14 s): the roar, the take-off, the kelp; block 2 (14–37 s) is block2.ts. It opens on Dive Cats 2's
// last frame (rebuilt from DC2's own formulas), then plays as a wordless cartoon chase. Script and shot sheet:
// Documents/VideoHub/films/dive-cats-3/SCRIPT.md, SHOTS.md. Every frame is a pure function of t.

export const DC03_FPS = 30;
export const DC03_DUR = B2.end; // block 1 (0–14) + block 2 (14–37)
export const DC03_FRAMES = Math.round(DC03_DUR * DC03_FPS);

/** block 1 times, seconds */
export const T = {
  cut1: 0.8, open: [1.0, 1.45], roar: [1.8, 3.1], pov: 1.5, react: 2.4, shut: [3.1, 3.45],
  drop: 4.0, spin: [4.3, 5.0], zip: 5.0, gape: [5.45, 5.8], chomp: 5.98, whip: 6.55,
  kelp: 7.0, stop: 7.55, pass: [8.0, 11.2], blups: [9.5, 10.2, 10.75], turn: [11.35, 12.15], sweat: 12.5, out: 13.45,
};

type V3 = THREE.Vector3;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UPV = v3(0, 1, 0);
const lerp = THREE.MathUtils.lerp;
const dirOf = (yaw: number) => v3(-Math.sin(yaw), 0, -Math.cos(yaw));
const rightOf = (a: V3) => new THREE.Vector3().crossVectors(a, UPV).normalize();
const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const KELP = v3(300, -3, 0);
const HIDE = v3(KELP.x + 0.35, KELP.y, 0); // between Paw's two hero stalks (z ±0.42)
const LANE_X = HIDE.x - 5.2; // the shark's pass behind him: 1.5× its length away (the distance rule)

/** soft: log gate failures instead of throwing (for QA stills only, never for a render that ships) */
export const Dc03: React.FC<{ clean?: boolean; soft?: boolean }> = ({ clean = false, soft = false }) => {
  usePixelFont();
  const frame = useCurrentFrame();
  const t = frame / DC03_FPS;
  const sc = useVideoConfig().width / 1080;

  const setup = useCallback(async (ctx: LookContext) => {
    REEF.snap = false; // the smooth (Dive Cats 1) look, as the posted DC2 smooth cut
    const reef = buildReef();
    ctx.scene.add(reef.group);
    // the kelp, with a clear strip behind the hiding place so the shark reads through it
    const kelp = kelpForest(KELP.x, KELP.z, 51, (x, z, kind) =>
      (x > LANE_X - 1.4 && x < HIDE.x - 0.25 && Math.abs(z) < 9) || // the shark's lane and the view of it
      (kind === 'rock' && x > HIDE.x - 0.3 && x < HIDE.x + 6 && Math.abs(z) < 3.5)); // no rock or grass between the lens and him
    kelp.group.position.y = KELP.y;
    ctx.scene.add(kelp.group);
    kelp.hero.forEach((m, i) => (m.position.z = (i ? 1 : -1) * 0.3)); // the two hero stalks hug him (the tall frame is narrow)
    const back = [[-1.3, -0.35, 4.2], [-1.6, -0.72, 5.0], [-1.45, 0.7, 4.6]].map(([dx, z, hh], i) => {
      const m = new THREE.Mesh(kelpGeo(rng(80 + i), hh), reefMat({ sway: true, side: THREE.DoubleSide }));
      m.position.set(HIDE.x + dx, 0, z); m.scale.setScalar(1.2); m.castShadow = true; m.userData.noLook = true; m.frustumCulled = false;
      kelp.group.add(m); return m;
    });
    // two kelp fronds he holds up as his disguise
    const frondM = new THREE.MeshLambertMaterial({ color: '#86c24a', emissive: '#2f5a14', flatShading: true, side: THREE.DoubleSide }); frondM.userData.noLook = true;
    const frondG = new THREE.BufferGeometry().setFromPoints([
      v3(-0.025, 0, 0), v3(0.025, 0, 0), v3(0.06, 0.18, 0), v3(-0.035, 0.2, 0), v3(0.03, 0.4, 0), v3(-0.06, 0.42, 0), v3(-0.005, 0.6, 0)]);
    frondG.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 4, 3, 4, 5, 5, 4, 6]); frondG.computeVertexNormals();
    const fronds = [0, 1].map(() => { const m = new THREE.Mesh(frondG, frondM); m.userData.noLook = true; m.frustumCulled = false; ctx.scene.add(m); return m; });
    const sandY = (x: number, z: number) => reef.sandH(x, z) - 0.05;

    const franko = await loadCat(ctx, 'franko');
    const s0 = franko.rig.root.scale.clone();
    const h = franko.height;
    const shark = await makeShark(TL2.franko.len);
    ctx.scene.add(shark.root);
    const spear = makeSpear(0.42);
    const bub = bubblePool(), trail = streaks(8), wheel = runWheel(), drop = sweatDrop();
    ctx.scene.add(spear.group, spear.line, bub.mesh, trail.group, wheel.mesh, drop);

    // ---------------------------------------------------------------- DC2's last frame (Dc02.tsx frankoShot at its end)
    const F = TL2.franko, A = dirOf(F.yaw), R = rightOf(A), S = v3(F.spot[0], F.spot[1], F.spot[2]);
    const rockAt = S.clone().addScaledVector(A, 7.0); rockAt.y = sandY(rockAt.x, rockAt.z) - 0.15;
    const bigRock = new THREE.Mesh(rock(rng(17), 1.9, 1.7), reefMat());
    bigRock.position.copy(rockAt); bigRock.castShadow = bigRock.receiveShadow = true; bigRock.userData.noLook = true;
    ctx.scene.add(bigRock); void place;
    const sharkRest = rockAt.clone().addScaledVector(A, 2.4).addScaledVector(R, 1.5).add(v3(0, 1.6, 0));
    const FP = rockAt.clone().addScaledVector(A, -2.0).addScaledVector(R, 3.7).setY(sharkRest.y + 0.15);
    const P0 = FP.clone().addScaledVector(A, 0.35); // Franko (body centre) at the end of DC2
    const sp0 = sharkRest.clone().add(v3(0, 2.9, 0)).addScaledVector(A, -1.6).addScaledVector(R, 0.6);
    const toCat0 = P0.clone().add(v3(0, h * 0.5, 0)).sub(sp0);
    sp0.addScaledVector(toCat0.clone().normalize(), 0.3 + Math.max(0, toCat0.length() - 4.6) * 0.5);
    const toCat = P0.clone().add(v3(0, h * 0.5, 0)).sub(sp0);
    const tc = toCat.clone().setY(0).normalize();
    const YAW = Math.atan2(-tc.z, tc.x), PITCH = THREE.MathUtils.clamp(Math.atan2(toCat.y, Math.hypot(toCat.x, toCat.z)), -0.5, 0.5);
    const DIR = toCat.clone().normalize(); // shark → Franko
    const faceShark0 = sp0.clone().sub(P0).setY(0).normalize();
    // the spear on the tail, in the shark's frame (DC2 stored it the same way at its rest pose)
    const yaw0 = Math.atan2(R.z, -R.x), tailAt = sharkRest.clone().addScaledVector(R, 1.3);
    const inv = new THREE.Matrix4().compose(sharkRest, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw0, 0)), v3(1, 1, 1)).invert();
    const spDir = tailAt.clone().sub(FP.clone().add(v3(0, 0.35, 0))).normalize().transformDirection(inv); void inv;
    // the cup sits on the near side of the tail (the new shark's own tail mark, out to its skin toward where Franko shot from)
    const spTip = v3(MARK.tail[0], MARK.tail[1], MARK.tail[2]).multiplyScalar(TL2.franko.len).addScaledVector(spDir, -0.1);
    // the roar: the hammer stops 1.3 m from his face
    const HEAD_X = MARK.head[0] * shark.len;
    const fHead0 = P0.clone().add(v3(0, h * 0.55, 0));
    const spRoar = fHead0.clone().addScaledVector(DIR, -(1.3 + HEAD_X));
    // shot 2: after the cut it hovers level with him, 1.3 m off, nose at his head (its profile reads; from above it didn't)
    const LIFT = v3(0, 0.3, 0); // shot 2 floats him clear of the anemone under him (it read as his feet in it)
    const fHeadL = fHead0.clone().add(LIFT);
    const toShH = spRoar.clone().addScaledVector(DIR, HEAD_X).sub(fHead0).setY(0).normalize();
    const hHead = fHeadL.clone().addScaledVector(toShH, 1.3).add(v3(0, 0.3, 0));
    const hn = fHeadL.clone().sub(hHead).normalize();
    const HYAW = Math.atan2(-hn.z, hn.x), HPITCH = THREE.MathUtils.clamp(Math.atan2(hn.y, Math.hypot(hn.x, hn.z)), -0.5, 0.5);

    // ---------------------------------------------------------------- helpers
    const cam = (p: V3, l: V3, fov = 46) => {
      ctx.camera.position.copy(p); ctx.camera.fov = fov; ctx.camera.updateProjectionMatrix(); ctx.camera.up.set(0, 1, 0); ctx.camera.lookAt(l);
      ctx.sunFollow(l, { size: 12 });
    };
    const kick = (tt: number, at: number, amp = 0.03) => {
      const f = Math.round((tt - at) * 30);
      if (f < 0 || f > 7) return;
      const s = (f % 2 ? -1 : 1) * amp * (1 - f / 8);
      ctx.camera.position.add(v3(s, -s * 0.6, 0).applyQuaternion(ctx.camera.quaternion));
    };
    const fwd = new THREE.Vector3(), up = new THREE.Vector3(), mz = new THREE.Vector3();
    const setShark = (pos: V3, yaw: number, pitch: number, roll = 0) => {
      shark.root.visible = true;
      shark.root.position.copy(pos);
      shark.root.rotation.set(roll, yaw, pitch);
      shark.root.updateMatrixWorld(true);
    };
    // the spear's cup rides the tail BONE (it curls and beats): its tip and direction stored once in that bone's frame
    let cupLocal: { tip: V3; dir: V3 } | null = null;
    const cupWorld = () => {
      if (!cupLocal) { // calibrate at the rest pose with the root at the origin (root frame = world)
        shark.root.position.set(0, 0, 0); shark.root.rotation.set(0, 0, 0); shark.fishU.uAmp.value = 0; shark.pose(0);
        const inv = new THREE.Matrix4().copy(shark.tailBone.matrixWorld).invert();
        cupLocal = { tip: spTip.clone().applyMatrix4(inv), dir: spDir.clone().transformDirection(inv) };
      }
      return { tip: cupLocal.tip.clone().applyMatrix4(shark.tailBone.matrixWorld), dir: cupLocal.dir.clone().transformDirection(shark.tailBone.matrixWorld) };
    };
    cupWorld(); // calibrate now, at setup, so no frame ever moves the shark to do it
    // shots ask for the spear / the dangling gun; the frame places them after the bones are posed (shark.pose)
    let spearReq: { from: V3 | null } | { tt: number; drag: V3 } | null = null;
    const spearOn = (from: V3 | null) => { spearReq = { from: from ? from.clone() : null }; };
    /** the gun hanging off the tail on its line (after he drops it) */
    const gunDangles = (tt: number, drag: V3 = v3(0, 0, 0)) => { spearReq = { tt, drag: drag.clone() }; }; // drag: the way the water pushes it (opposite the shark's motion)
    const placeSpear = () => {
      const r = spearReq; spearReq = null;
      if (!r || !shark.root.visible) return;
      const c = cupWorld();
      if ('from' in r) { spear.set(c.tip, c.dir, r.from); return; }
      const { tt, drag } = r;
      const tail = c.tip.clone().addScaledVector(c.dir, -0.42);
      const g = franko.gun; g.visible = true;
      g.position.copy(tail).add(v3(0.1 * Math.sin(tt * 2.1), -0.45 * (1 - 0.6 * Math.min(1, drag.length())), 0.1 * Math.cos(tt * 1.7))).addScaledVector(drag, 0.7);
      g.quaternion.setFromUnitVectors(v3(1, 0, 0), UPV).multiply(new THREE.Quaternion().setFromAxisAngle(v3(1, 0, 0), tt * 0.9));
      g.scale.setScalar(0.24 * h); g.updateMatrixWorld(true);
      spear.set(c.tip, c.dir, franko.muzzle(mz));
    };
    /** Franko upright facing `face` at body centre `p`; extra: lean (about his own X), roll (about the world axis `rollAx`), squash */
    const stand = (p: V3, face: V3, tt: number, o: { surprise?: number; lean?: number; roll?: number; rollAx?: V3; sx?: number; sy?: number; sz?: number } = {}) => {
      const c = franko;
      c.rig.root.visible = true;
      catRoot(c, p, face, face, 1, tt);
      catPose(c.rig, tt, { hug: 1 - (o.surprise ?? 0), surprise: o.surprise ?? 0, ph: 2 });
      const q = c.rig.root.quaternion;
      if (o.lean) q.multiply(new THREE.Quaternion().setFromAxisAngle(v3(1, 0, 0), o.lean));
      if (o.roll) q.premultiply(new THREE.Quaternion().setFromAxisAngle(o.rollAx ?? v3(1, 0, 0), o.roll));
      c.rig.root.scale.set(s0.x * (o.sx ?? 1), s0.y * (o.sy ?? 1), s0.z * (o.sz ?? 1));
      c.rig.root.updateMatrixWorld(true);
    };
    const maskFront = (out = new THREE.Vector3()) => franko.rig.bone('headfront').getWorldPosition(out);
    /** his regulator: below the goggles, a little in front of the face */
    const regulator = (face: V3) => maskFront().add(v3(0, -0.12 * h / 0.68, 0)).addScaledVector(face, 0.05 * h / 0.68);
    /** a few bubbles rising from his mask, released at `at` */
    const blup = (tt: number, at: number, n = 3, seed = 0, face = faceShark0) => {
      const age = tt - at;
      if (age < 0 || age > 1.6) return;
      const m = regulator(face);
      for (let i = 0; i < n; i++) {
        const a = age - i * 0.09; if (a < 0) continue;
        const off = rightOf(face).negate().multiplyScalar(0.05 + a * 0.16).addScaledVector(face, 0.04); // up and off to the side of his face, not over it
        bub.add(m.clone().add(off).add(v3(0.02 * Math.sin(a * 9 + i + seed), 0.02 + a * 0.55, 0.02 * Math.cos(a * 7 + i))), (0.018 + 0.008 * hash(i + seed)) * Math.min(1, a / 0.08));
      }
    };
    // the bubble cloud he leaves behind: his body at the moment of the zip, sampled once (it is the same every frame)
    let cloud: V3[] | null = null;
    const zipPos = P0.clone().addScaledVector(DIR, 0.35);

    // escape direction and shot-2 camera side: away from the rock
    const L = sp0.clone().add(v3(0, 0, 0)).sub(fHead0);
    let side = new THREE.Vector3().crossVectors(L, UPV).normalize();
    if (side.dot(fHead0.clone().sub(rockAt)) < 0) side.negate();
    // line of sight against the solid set (reef, rock, kelp); see-through shafts and particles don't block
    const ray = new THREE.Raycaster();
    const solid = () => [reef.group, bigRock, kelp.group].filter((o) => o.visible);
    const blocked = (a: V3, b: V3) => {
      const d = b.clone().sub(a), L = d.length();
      ray.set(a, d.normalize()); ray.far = L - 0.15; ray.near = 0.05;
      return ray.intersectObjects(solid(), true).some((x) => { const m = (x.object as THREE.Mesh).material as THREE.Material; return !(x.object as THREE.Points).isPoints && !(x.object as THREE.InstancedMesh).isInstancedMesh && !(Array.isArray(m) ? m[0] : m)?.transparent; }); // the reef's little fish crossing the sightline don't count
    };
    /** both ways: from the camera (it is not behind something) and to it (it is not inside a solid) */
    const seen = (camP: V3, p: V3) => !blocked(camP, p) && !blocked(p, camP);
    // shot 2's side: the nearest yaw to `side` with a clear view of Franko and the hammer (picked once, so it is fixed)
    let side2: V3 | null = null;
    let mouthOff: V3 | null = null; // the shark's mouth from its root at the hover pose (fixed, read once)

    // ---------------------------------------------------------------- shots
    const shot1 = (tt: number) => { // 0–4: DC2's last frame, then the roar
      const kIn = ramp(tt, T.cut1, T.open[0] + 0.25), back = 0.25 * Math.sin(Math.PI * clamp01((tt - T.cut1) / 0.3));
      const sp = sp0.clone().lerp(spRoar, kIn).addScaledVector(DIR, -back);
      const roarK = ramp(tt, T.roar[0], T.roar[0] + 0.2) * (1 - ramp(tt, T.roar[1] - 0.15, T.roar[1]));
      setShark(sp.addScaledVector(DIR, -0.05 * roarK * Math.sin(tt * 40)), YAW, PITCH + 0.12 * roarK);
      shark.jaw(ramp(tt, T.open[0], T.open[1]) * (1 - ramp(tt, T.shut[0], T.shut[1])) * (1 + 0.08 * Math.sin(tt * 30) * roarK));
      shark.fishU.uAmp.value = 1.0 + 1.2 * roarK; shark.fishU.uFast.value = 0.9; shark.fishU.uBend.value = 0;
      // Franko: blown back by the roar, squashed and wobbling
      const blow = ramp(tt, T.roar[0], T.roar[0] + 0.35);
      const p = P0.clone().addScaledVector(DIR, 0.5 * blow);
      const wob = roarK * 0.06 * Math.sin(tt * 26);
      stand(p, faceShark0, tt, { surprise: 1, lean: -0.6 * roarK, sx: 1 + 0.16 * roarK + wob, sy: 1 - 0.2 * roarK - wob, sz: 1 - 0.08 * roarK });
      axes(franko.rig, fwd, up); franko.gun.visible = true;
      const tuck = faceShark0.clone().negate().add(v3(0, -0.6, 0)).normalize(), tk0 = ramp(tt, T.cut1, T.cut1 + 0.4);
      franko.hold(UPV.clone().lerp(tuck, tk0).normalize(), faceShark0.clone().lerp(UPV, tk0).normalize());
      spearOn(null);
      // bubbles: one tiny blup in the silence; then the roar blast from the mouth at him (big at the mouth, fanning out)
      blup(tt, 0.25, 1, 3);
      const mouth = shark.at(...MARK.mouth);
      if (roarK > 0) {
        const to = maskFront().sub(mouth);
        const d = to.clone().normalize(), dist = to.length() + 0.9;
        for (let i = 0; i < 220; i++) {
          const te = T.roar[0] + (i / 220) * (T.roar[1] - T.roar[0] - 0.25), age = tt - te;
          if (age < 0 || age > 0.6) continue;
          const k = age / 0.6, spread = 0.12 + 0.55 * k;
          const q = mouth.clone().addScaledVector(d, dist * k).add(v3((hash(i) - 0.5) * spread, (hash(i + 7) - 0.5) * spread, (hash(i + 13) - 0.5) * spread));
          bub.add(q, (0.02 + 0.035 * hash(i + 21)) * (1.3 - 0.6 * k));
        }
      }
      // camera: DC2's last frame → the shark looming over him → its roar into the lens (his view) → his face in the blast
      const head = shark.at(...MARK.head), fHead = maskFront();
      let gate = 0.05;
      if (tt < T.pov) {
        // DC2's last frame (its own formula), then a slow push-in as the shark closes and the jaw drops
        const fH = P0.clone().add(v3(0, h * 0.55, 0)), toS = head.clone().sub(fH).normalize(), k = ramp(tt, T.cut1, T.pov);
        cam(fH.clone().addScaledVector(toS, -lerp(2.4, 1.75, k)).add(v3(0, lerp(0.9, 0.5, k), 0)).addScaledVector(side, 0.45 * k), head.clone().lerp(fH, 0.38).addScaledVector(side, 0.1 * k), 52);
      } else if (tt < T.react) {
        // his view: the open mouth roaring at the lens (he is behind the camera)
        franko.rig.root.visible = false; franko.gun.visible = false;
        const o = shark.at(0, 0, 0), nose = shark.at(1, 0, 0).sub(o).normalize(), down = shark.at(0, -1, 0).sub(o).normalize();
        const axis = nose.clone().multiplyScalar(Math.cos(0.3)).addScaledVector(down, Math.sin(0.3)).normalize(); // the opening faces forward and down
        const mc = shark.at(...MARK.mouth);
        cam(mc.clone().addScaledVector(axis, lerp(1.55, 1.25, ramp(tt, T.pov, T.react))), mc, 56);
        gate = 0;
      } else {
        // his face in the blast, from the shark's side
        const toS = head.clone().sub(fHead).setY(0).normalize();
        const s2 = rightOf(toS);
        cam(fHead.clone().addScaledVector(toS, 0.98).addScaledVector(s2, 0.36).add(v3(0, 0.06, 0)), fHead.clone().add(v3(0, 0.0, 0)), 46);
        gate = 0.15;
      }
      if (tt > T.cut1 && roarK > 0) { kick(tt, T.roar[0], 0.035); if (roarK > 0.5) ctx.camera.position.add(v3(0.008 * Math.sin(tt * 61), 0.008 * Math.sin(tt * 53), 0).applyQuaternion(ctx.camera.quaternion)); }
      return { gate };
    };

    const shot2 = (tt: number) => { // 4–7: he drops the gun, legs spin, ZIP; the shark chomps his bubble ghost
      const pBase = P0.clone().addScaledVector(DIR, 0.35).add(LIFT);
      // camera first, locked: Franko right of centre with room on his left (screen left = his escape), the hammer above
      const sHead0 = hHead;
      const pre = pBase.clone().lerp(sHead0, 0.58);
      if (!side2) {
        ctx.scene.updateMatrixWorld(true);
        const across = new THREE.Vector3().crossVectors(toShH, UPV).normalize();
        if (across.dot(fHeadL.clone().sub(rockAt)) < 0) across.negate();
        for (const a of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.2, -1.2, 1.5, -1.5, 1.8, -1.8, 2.1, -2.1, 2.45, -2.45, 2.8, -2.8, 3.14]) {
          const sd = across.clone().applyAxisAngle(UPV, a), r0 = sd.clone().negate().cross(UPV).normalize();
          const lk = pre.clone().addScaledVector(r0, -0.35).add(v3(0, -0.1, 0)), cp = lk.clone().addScaledVector(sd, 4.0).add(v3(0, -0.2, 0));
          if (seen(cp, fHeadL) && seen(cp, pBase) && seen(cp, sHead0) && seen(cp, pBase.clone().add(v3(0, -0.42 * h, 0))) && seen(cp, pBase.clone().addScaledVector(r0, -1.2)) && seen(cp, pBase.clone().addScaledVector(r0, 1.2))) { side2 = sd; break; }
        }
        if (!side2) throw new Error('shot 2: no clear camera side around Franko');
      }
      const right0 = side2.clone().negate().cross(UPV).normalize(); // camera looks along −side2
      const esc = hHead.clone().sub(fHeadL).dot(right0) > 0 ? right0.clone().negate() : right0.clone(); // away from the shark's side of the frame
      const look = pre.clone().addScaledVector(esc, 0.35).add(v3(0, -0.1, 0));
      cam(look.clone().addScaledVector(side2, 4.0).add(v3(0, -0.2, 0)), look, 48);
      // shark: shut, hovering; gapes, lunges through the cloud and chomps; then turns after him and shoots off screen left
      const cloudC = pBase.clone().add(v3(0, 0.05 * h, 0));
      const hoverRoot = hHead.clone().addScaledVector(hn, -HEAD_X);
      if (!mouthOff) { setShark(hoverRoot, HYAW, HPITCH); mouthOff = shark.at(...MARK.mouth).sub(hoverRoot); }
      const lungeV = cloudC.clone().sub(hoverRoot.clone().add(mouthOff)); // moves the mouth onto the middle of the cloud
      const lk = ramp(tt, T.gape[1], T.chomp) + 0.05 * Math.sin(Math.PI * clamp01((tt - T.chomp) / 0.25)) * (tt > T.chomp ? 1 : 0);
      const turnK = ramp(tt, T.whip, T.whip + 0.25), goK = clamp01((tt - T.whip - 0.22) / 0.2);
      const escYaw = Math.atan2(-esc.z, esc.x);
      let dy = escYaw - HYAW; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      const spos = hoverRoot.clone().addScaledVector(lungeV, lk).addScaledVector(hn, -0.15 * ramp(tt, T.gape[0], T.gape[1])).add(v3(0, 0.03 * Math.sin(tt * 1.7), 0)).addScaledVector(esc, 9 * goK * goK);
      setShark(spos, HYAW + dy * turnK, HPITCH * (1 - turnK));
      const gape = ramp(tt, T.gape[0], T.gape[1]) * (1 - ramp(tt, T.chomp, T.chomp + 0.07));
      shark.jaw(gape);
      shark.fishU.uAmp.value = 0.6 + 1.6 * ramp(tt, T.gape[1], T.chomp) * (1 - ramp(tt, T.chomp + 0.2, T.chomp + 0.6)) + 1.8 * turnK; shark.fishU.uFast.value = 1 + turnK;
      shark.fishU.uBend.value = -0.3 * Math.sign(dy) * Math.sin(Math.PI * turnK);
      const head = shark.at(...MARK.head);
      if (goK > 0) trail.update(shark.at(...MARK.tailEnd), esc, 0.7 * (1 - goK * 0.5), ctx.camera, 0.35, 0.9); // behind its tail, not across it
      if (tt > T.chomp) kick(tt, T.chomp, 0.05);
      // Franko until the zip
      if (tt < T.zip) {
        const spinK = ramp(tt, T.spin[0], T.spin[0] + 0.15);
        const faceE = faceShark0.clone().lerp(esc, ramp(tt, T.drop + 0.2, T.spin[0])).normalize();
        stand(pBase, faceE, tt, { surprise: 1 - spinK, lean: -0.35 * spinK, sy: 1 + 0.06 * spinK * Math.sin(tt * 40) });
        if (spinK > 0) { // the wheel: legs thrash forward/back
          for (const [s, ph] of [['Left', 0], ['Right', Math.PI]] as const) {
            franko.rig.turn(`${s}UpLeg`, v3(1, 0, 0), 1.15 * spinK * Math.sin(tt * 34 + ph));
            franko.rig.turn(`${s}Leg`, v3(1, 0, 0), 0.9 * spinK * Math.sin(tt * 34 + ph + 1.2));
            franko.rig.turn(`${s}Arm`, v3(1, 0, 0), 0.9 * spinK * Math.sin(tt * 34 + ph + Math.PI));
          }
        }
        const hips = franko.rig.bone('Hips').getWorldPosition(new THREE.Vector3());
        wheel.update(hips.clone().add(v3(0, -0.2 * h, 0)).addScaledVector(side, 0.05), 0.3 * h, tt * 25, ctx.camera, spinK > 0.3);
        // the gun: let go at T.drop, it sinks and tumbles out of frame
        const gk = clamp01((tt - T.drop) / 1.0);
        if (gk <= 0) { axes(franko.rig, fwd, up); franko.gun.visible = true; franko.hold(UPV, faceShark0); }
        else {
          axes(franko.rig, fwd, up); franko.hold(UPV, faceShark0);
          franko.gun.position.add(v3(0, -0.75 * gk * gk, 0).addScaledVector(DIR, 0.2 * gk));
          franko.gun.rotateZ(3 * gk); franko.gun.updateMatrixWorld(true);
        }
        spearOn(null);
      } else {
        // sample his body at the last spin pose once
        if (!cloud) {
          stand(pBase, side2!, T.drop, { surprise: 1 });
          cloud = bodyPoints(franko.rig, 3);
        }
        // the streak: he stretches and shoots off screen left
        const zk = (tt - T.zip) / 0.3, RUN = 3.4;
        if (zk < 1) {
          stand(pBase.clone().addScaledVector(esc, RUN * zk * zk), esc, tt, { lean: 0.5, sz: 1 + 1.0 * Math.sin(Math.PI * Math.min(1, zk + 0.2)), sx: 0.78, sy: 0.85 });
          for (const [s, ph] of [['Left', 0], ['Right', Math.PI]] as const) { franko.rig.turn(`${s}UpLeg`, v3(1, 0, 0), 1.15 * Math.sin(tt * 34 + ph)); franko.rig.turn(`${s}Leg`, v3(1, 0, 0), 0.9 * Math.sin(tt * 34 + ph + 1.2)); }
          franko.gun.visible = false;
        } else franko.rig.root.visible = false;
        if (tt < T.zip + 0.7) trail.update(pBase.clone().addScaledVector(esc, Math.min(RUN, RUN * zk * zk)).add(v3(0, 0.05, 0)), esc, 1 - ramp(tt, T.zip + 0.35, T.zip + 0.7), ctx.camera, 0.4, 1.3);
        // the trail of bubbles along his path: where he went stays readable after he is gone
        for (let i = 0; i < 46; i++) {
          const u = i / 46, at = T.zip + 0.3 * Math.sqrt(u), age = tt - at;
          if (age < 0 || age > 2.2) continue;
          const q = pBase.clone().addScaledVector(esc, RUN * u + 0.25).add(v3((hash(i) - 0.5) * 0.12, (hash(i + 3) - 0.3) * 0.35 * h + age * 0.25, (hash(i + 6) - 0.5) * 0.12));
          bub.add(q, (0.012 + 0.01 * hash(i + 9)) * (1 - age / 2.2));
        }
        // the cloud: hangs, jiggles, then bursts on the chomp
        const burst = clamp01((tt - T.chomp) / 0.45);
        const cen = pBase.clone().add(v3(0, 0.0, 0));
        cloud.forEach((q, i) => {
          if (burst >= 1) return;
          const jig = v3(Math.sin(tt * 3 + i) * 0.01, (tt - T.zip) * 0.05 * hash(i) + 0.015 * Math.sin(tt * 2.2), Math.cos(tt * 2.6 + i) * 0.01);
          const out = q.clone().sub(cen).normalize().multiplyScalar(burst * (0.5 + hash(i + 3) * 0.9));
          bub.add(q.clone().add(jig).add(out).add(v3(0, burst * 0.4 * hash(i + 5), 0)), (0.011 + 0.006 * hash(i + 11)) * (1 - burst * burst));
        });
        // the gun is yanked away on the line as the shark lunges; it trails behind as the shark shoots off
        gunDangles(tt, esc.clone().multiplyScalar(-goK));
      }
      void head;
      return { gate: tt < T.zip ? 0.045 : 0 }; // the payoff here is his whole body and the cloud, not his face (at 3.75 m the side search found a worse angle, the rock over his body)
    };

    const shot3 = (tt: number) => { // 7–14: the kelp. He sways like a stalk; the shark passes behind him... and turns back
      // Franko: streaks in from screen right (−z; this camera looks along −x, so +z is screen left), stops between the stalks, arms up, sways with the kelp
      const arrive = 1 - Math.pow(1 - clamp01((tt - T.kelp) / (T.stop - T.kelp)), 3);
      const sway = 0.16 * Math.sin((tt - T.stop) * 2.4) * ramp(tt, T.stop + 0.2, T.stop + 0.8);
      const toCam = v3(1, 0, 0);
      const runDir = v3(0, 0, 1); // screen left, the chase's direction
      const outK = clamp01((tt - T.out) / 0.3);
      const base = v3(HIDE.x, HIDE.y + 0.02, lerp(-4.5, 0, arrive) + 5 * outK * outK);
      const face = runDir.clone().lerp(toCam, ramp(tt, T.stop, T.stop + 0.2)).normalize();
      const squash = Math.sin(Math.PI * clamp01((tt - T.stop) / 0.25)) * (tt > T.stop ? 1 : 0);
      if (outK < 1) {
        // catRoot puts an upright root 0.45 h below the body centre: pass the centre
        stand(base.clone().add(v3(0, 0.45 * h, 0)), outK > 0 ? runDir : face, tt, {
          surprise: ramp(tt, T.stop + 0.05, T.stop + 0.35) * (1 - (outK > 0 ? 1 : 0)), roll: sway, rollAx: v3(1, 0, 0),
          sy: 1 - 0.18 * squash, sx: 1 + 0.12 * squash, sz: outK > 0 ? 1 + 1.0 * outK : 1,
        });
        franko.gun.visible = false;
      } else franko.rig.root.visible = false;
      kelp.hero.forEach((m, i) => m.rotation.set(sway * 0.8 + 0.02 * Math.sin(tt * 0.8 + i), 0, 0));
      back.forEach((m, i) => m.rotation.set(sway * 0.6 + 0.02 * Math.sin(tt * 0.7 + i), 0, 0));
      // the fronds: from each paw straight up, swaying with him (only while he poses)
      const pose = franko.rig.root.visible && tt > T.stop + 0.15 && outK <= 0;
      fronds.forEach((m, i) => {
        m.visible = pose;
        if (!pose) return;
        franko.rig.bone(i ? 'RightHand' : 'LeftHand').getWorldPosition(m.position).add(v3(0.06 * h / 0.68, 0, 0)); // in front of the paw (toward the lens)
        // up and out, away from his head (in z, the screen's horizontal here), flat to the camera (+x), swaying with him
        const out = Math.sign(m.position.z - base.z) || (i ? 1 : -1);
        const yA = v3(0, 1, 0.06 * out + Math.sin(sway) * 1.2 + 0.1 * Math.sin(tt * 3.1 + i * 2)).normalize();
        const zA = v3(1, 0, 0).addScaledVector(yA, -yA.x).normalize(), xA = new THREE.Vector3().crossVectors(yA, zA);
        m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, yA, zA));
        m.scale.setScalar(0.8 * (h / 0.68) * ramp(tt, T.stop + 0.15, T.stop + 0.4));
      });
      const runK = tt < T.stop ? 1 - ramp(tt, T.stop - 0.1, T.stop) : outK > 0 ? 1 - ramp(tt, T.out + 0.3, T.out + 0.55) : 0;
      trail.update(base.clone().add(v3(0, 0.45 * h, 0)), runDir, runK, ctx.camera, 0.4, 1.4);
      // his exit leaves a bubble trail to screen left (so he is plainly gone, not eaten)
      for (let i = 0; i < 30; i++) {
        const u = i / 30, at = T.out + 0.3 * Math.sqrt(u), age = tt - at;
        if (age < 0) continue;
        bub.add(v3(HIDE.x + (hash(i) - 0.5) * 0.1, HIDE.y + (0.2 + 0.5 * hash(i + 3)) * h + age * 0.25, 5 * u + 0.1), (0.012 + 0.01 * hash(i + 9)) * Math.max(0, 1 - age / 1.5));
      }
      // bubbles betray him
      T.blups.forEach((b, i) => blup(tt, b, 3 + i, i * 5, toCam));
      // sweat drop beside his head once he senses it
      const sk = ramp(tt, T.sweat, T.sweat + 0.15) * (1 - outK);
      drop.visible = sk > 0;
      if (sk > 0) {
        const hf = maskFront();
        drop.position.copy(hf).add(v3(0, 0.06 * h / 0.68, 0)).addScaledVector(v3(0, 0, -1), 0.1 * h / 0.68).add(v3(0, -0.04 * clamp01((tt - T.sweat) / 0.9), 0));
        drop.quaternion.copy(ctx.camera.quaternion); drop.scale.setScalar(2.6 * sk * h / 0.68);
      }
      // the shark: glides in from screen right behind him, swaying with the kelp; halts with its head past him, turns back
      const pk = smooth((tt - T.pass[0]) / (T.pass[1] - T.pass[0]));
      const headZ = lerp(-8.5, 1.0, pk) + 0.12 * Math.sin(Math.PI * clamp01((tt - T.pass[1]) / 0.3)) * (tt > T.pass[1] ? 1 : 0); // a little skid
      const tk = ramp(tt, T.turn[0], T.turn[1]);
      const headP = v3(LANE_X, KELP.y + 1.95, headZ).lerp(v3(HIDE.x - 2.4, KELP.y + 1.75, 0.55), tk); // contact beat: 2.4 m behind him, over his left shoulder // it halts past him on screen left (clear of the app buttons on the right), over his shoulder, not on his head (face-on behind his head it read as a hat)
      const yaw = lerp(-Math.PI / 2, -Math.PI / 2 + 1.3, tk); // nose +z (screen left), then a three-quarter turn toward him and the camera (+x): hammer, eye and body all read
      const nose = v3(Math.cos(yaw), 0, -Math.sin(yaw));
      setShark(headP.clone().addScaledVector(nose, -HEAD_X), yaw, -0.04, 0.1 * Math.sin((tt - T.stop) * 2.4) * (1 - tk));
      shark.jaw(0.45 * ramp(tt, T.turn[1] - 0.2, T.turn[1] + 0.3) * (1 - ramp(tt, T.out - 0.25, T.out - 0.05))); // a toothy grin, shut before he zips (open jaws as he vanished read as 'eaten')
      shark.fishU.uAmp.value = lerp(0.7, 0.25, tk); shark.fishU.uFast.value = 0.6; shark.fishU.uBend.value = -0.25 * Math.sin(Math.PI * tk); // the head leads the turn
      shark.root.visible = tt > T.pass[0] - 0.1;
      if (shark.root.visible) gunDangles(tt); else { spear.hide(); franko.gun.visible = false; }
      if (!shark.root.visible) spear.hide();
      // camera: low, side-on through the kelp; a slow creep in until the turn
      const creep = 0.6 * ramp(tt, T.stop, T.turn[1]);
      cam(v3(HIDE.x + 2.1 - creep, KELP.y + 0.48, 0.05), v3(HIDE.x, KELP.y + 0.62, 0.05), 44);
      if (tt > T.stop) kick(tt, T.stop, 0.02);
      ctx.mood('day', 'golden', 0.12);
      return { gate: tt > T.stop + 0.3 && tt < T.out ? 0.1 : 0 }; // from after the landing squash (0.25 s)
    };

    const b2 = await makeBlock2({ ctx, franko, h, shark, HEAD_X, bub, trail, drop, cam, kick, stand, setShark, gunDangles, maskFront, sandY });

    return (fr: number) => {
      const tt = fr / DC03_FPS;
      reef.update(tt); kelp.update(tt);
      ctx.mood('day'); U.uCaus.value = 1;
      franko.rig.root.visible = false; franko.gun.visible = false; shark.root.visible = false; spear.hide(); drop.visible = false; fronds.forEach((m) => (m.visible = false));
      franko.rig.root.scale.copy(s0);
      trail.update(v3(0, 0, 0), v3(1, 0, 0), 0, ctx.camera); wheel.update(v3(0, 0, 0), 0, 0, ctx.camera, false);
      bub.begin();
      shark.ctl.curl = 0; shark.ctl.headYaw = 0; shark.ctl.nod = 0; shark.fishU.uBend.value = 0;
      kelp.group.visible = tt >= T.kelp && tt < B2.start; bigRock.visible = tt < T.kelp;
      b2.setVisible(tt);
      const g = tt < T.drop ? shot1(tt) : tt < T.kelp ? shot2(tt) : tt < B2.start ? shot3(tt) : tt < B2.sand ? b2.shot4(tt) : tt < B2.grouper ? b2.shot5(tt) : b2.shot6(tt);
      if (shark.root.visible) shark.pose(tt); // the bones, from the controls the shot set
      placeSpear(); // the cup and the gun follow the posed tail
      bub.end();
      if (g.gate > 0 && franko.rig.root.visible) {
        try {
          framingGate(ctx.camera as THREE.PerspectiveCamera, [{ name: 'franko', rig: franko.rig, minHead: g.gate }], fr);
          if (!seen(ctx.camera.position.clone(), franko.rig.bone('Head').getWorldPosition(new THREE.Vector3()))) throw new Error(`framing gate, frame ${fr}: the camera can't see franko's head (blocked, or the camera is inside the set)`);
        }
        catch (e) { if (!soft) throw e; console.log(`GATE-SOFT ${(e as Error).message}`); }
      }
    };
  }, [soft]);

  const title = clamp01((t - 2.5) / 0.2) * (1 - clamp01((t - 3.85) / 0.2));
  const card = clamp01((t - CARD.t0) / 0.3) * (1 - clamp01((t - CARD.t1 + 0.3) / 0.3));
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <LookStage setup={setup} style="reef-smooth" />
      {!clean && t < 0.9 && ( // DC2's depth readout, so the first frame matches its last
        <div style={{ position: 'absolute', right: 48 * sc, top: 230 * sc, fontFamily: PIX, fontSize: 40 * sc, color: '#bff6ff', textShadow: outline(Math.round(5 * sc)), opacity: 1 - clamp01((t - 0.6) / 0.3) }}>10 M</div>
      )}
      {!clean && title > 0 && (
        <AbsoluteFill style={{ alignItems: 'center', top: '11%' }}>
          <div style={{ fontFamily: PIX, fontSize: 70 * sc, color: '#fff', textShadow: outline(Math.round(6 * sc)), letterSpacing: 2, transform: `scale(${0.6 + 0.4 * title})`, opacity: title }}>DIVE CATS 3</div>
        </AbsoluteFill>
      )}
      {!clean && card > 0 && ( // the DC2 species card style
        <AbsoluteFill style={{ alignItems: 'center', top: '74%' }}>
          <div style={{ fontFamily: PIX, fontSize: 60 * sc, color: '#ffe25a', textShadow: outline(Math.round(6 * sc)), transform: `scale(${0.6 + 0.4 * card})`, opacity: card, textAlign: 'center' }}>{CARD.name}</div>
          <div style={{ fontFamily: PIX, fontSize: 30 * sc, color: '#fff', textShadow: outline(Math.round(4 * sc)), marginTop: 14 * sc, opacity: card, textAlign: 'center', maxWidth: 860 * sc }}>{CARD.fact}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
