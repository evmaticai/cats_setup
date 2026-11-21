import * as THREE from 'three';
import { staticFile } from 'remotion';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { patch } from '../dc02/mat';

// Dive Cats 3's hammerhead: "Great Hammerhead Shark" by Alenzo (CC BY 4.0, Sketchfab; credit in
// Documents/VideoHub/films/dive-cats-3/downloads/CREDITS.md), the user's pick against their reference: a real
// mouth under the hammer, modelled teeth, a Rigify skeleton and clips. Prepared by models/prep_alenzo.py: nose +X,
// length 1, Y up (models/README.md). The mesh is skinned to the ORG-* bones only. Swim comes from its Swimming
// clip, played pure in t (mixer.setTime, never update(delta)); the shots' controls (fishU, jaw, ctl) turn ORG bones
// on top. The control names are the old shader-wiggle ones, so the shots' code is unchanged.

/** model-space marks on this shark (from its bones): the hammer, the mouth, the tail where the spear's cup sits */
export const MARK = { head: [0.43, -0.05, -0.044], mouth: [0.35, -0.1, -0.044], tail: [-0.33, -0.03, -0.044], tailEnd: [-0.45, -0.03, -0.044] } as const;

export type Shark = {
  root: THREE.Group; len: number;
  /** swim: uAmp = swim strength (clip weight), uFast = unused (the clip has its own beat), uBend = C-bend (head toward model +Z) */
  fishU: { uAmp: { value: number }; uBend: { value: number }; uFast: { value: number } };
  /** 0 = shut, 1 = the clip's own bite (0.70 rad); capped at 0.78 rad (beyond it the lower jaw stretches) */
  jaw: (k: number) => void;
  /** extra: tail curl toward model +Z (chasing its tail), head yaw (scanning the sand), head nod (pitch) */
  ctl: { curl: number; headYaw: number; nod: number };
  /** world position of a model-space point (x along the body, nose +X) */
  at: (x: number, y: number, z: number, out?: THREE.Vector3) => THREE.Vector3;
  /** set every bone from the clip and the controls for time t (call once per frame, after the shot placed the root) */
  pose: (t: number) => void;
  /** the tail bone the spear's cup rides on (it bends with the tail) */
  tailBone: THREE.Bone;
};

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const R = '_HeadHammerSharkRig';

export async function makeShark(len: number): Promise<Shark> {
  const gltf = await new GLTFLoader().loadAsync(staticFile('characters/dc03/hammerhead.glb'));
  const root = new THREE.Group(), body = new THREE.Group();
  body.scale.setScalar(len); root.add(body); body.add(gltf.scene);
  const bones = new Map<string, THREE.Bone>();
  gltf.scene.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone);
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh) return;
    m.castShadow = true; m.frustumCulled = false; m.userData.noLook = true;
    const src = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];
    // the DC2 fish look: flat Lambert, crunchy texels, both sides drawn, alpha cut (not blended), reef caustics
    const mats = src.map((s) => {
      const map = s.map ?? null;
      if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestMipmapNearestFilter; map.needsUpdate = true; }
      const l = new THREE.MeshLambertMaterial({ map, color: s.color.clone(), flatShading: true, side: THREE.DoubleSide, alphaTest: map ? 0.5 : 0 });
      l.userData.noLook = true;
      return patch(l, { caustics: 0.5 });
    });
    m.material = mats.length === 1 ? mats[0] : mats;
  });
  const b = (n: string) => { const x = bones.get(`ORG${n}${R}`); if (!x) throw new Error(`hammerhead: no bone ORG${n}${R}`); return x; };
  const HEAD = [b('-neck'), b('_head')], JAW = b('-mouth');
  const CHAIN = [b('-spine02'), b('-spine03'), b('-spine04'), b('-spine05'), b('-tailUp01'), b('-tailUp02')];
  const rest = [...bones.values()].map((x) => [x, x.position.clone(), x.quaternion.clone(), x.scale.clone()] as const);
  root.traverse((o) => { o.userData.noLook = true; o.frustumCulled = false; });

  const clip = gltf.animations.find((a) => a.name === 'Swimming');
  if (!clip) throw new Error('hammerhead: no Swimming clip');
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const swim = mixer.clipAction(clip); swim.play();

  const fishU = { uAmp: { value: 1 }, uBend: { value: 0 }, uFast: { value: 1 } };
  const ctl = { curl: 0, headYaw: 0, nod: 0 };
  let jawA = 0;
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), dq = new THREE.Quaternion(), qm = new THREE.Quaternion(), ax = new THREE.Vector3();
  /** rotate a bone about a MODEL-frame axis (like the engine's rig.turn) */
  const turn = (bone: THREE.Bone, axis: THREE.Vector3, angle: number) => {
    if (!angle) return;
    bone.parent!.getWorldQuaternion(q1); bone.getWorldQuaternion(q2);
    ax.copy(axis).applyQuaternion(body.getWorldQuaternion(qm));
    dq.setFromAxisAngle(ax, angle).multiply(q2);
    bone.quaternion.copy(q1.invert().multiply(dq));
    bone.updateMatrixWorld(true);
  };
  const CURL = [0.3, 0.4, 0.5, 0.55, 0.5, 0.4]; // strong: the tail-chasing gag must read from above
  const pose = (t: number) => {
    for (const [x, p, q, s] of rest) { x.position.copy(p); x.quaternion.copy(q); x.scale.copy(s); }
    swim.setEffectiveWeight(THREE.MathUtils.clamp(fishU.uAmp.value, 0, 1));
    mixer.setTime(t); // pure in t
    root.updateMatrixWorld(true);
    const bend = fishU.uBend.value;
    // the head: the C-bend's front half (head toward +Z = a turn about −Y), the scan and the nod, split over neck and head
    for (const hb of HEAD) { turn(hb, Y, 0.5 * (-0.9 * bend + ctl.headYaw)); turn(hb, Z, 0.5 * ctl.nod); }
    // the body and tail: the C-bend's back half (tail toward +Z too), the curl
    CHAIN.forEach((cb, i) => turn(cb, Y, 0.12 * bend + CURL[i] * ctl.curl));
    // the jaw: about its own local −X (prep_alenzo.py's convention)
    if (jawA) { JAW.quaternion.multiply(dq.setFromAxisAngle(X, -jawA)); JAW.updateMatrixWorld(true); }
  };
  void Z;
  const at = (x: number, y: number, z: number, o = new THREE.Vector3()) => { root.updateMatrixWorld(true); return body.localToWorld(o.set(x, y, z)); };
  return { root, len, fishU, ctl, at, pose, tailBone: b('-tailUp01'), jaw: (k: number) => { jawA = Math.min(0.78, 0.7 * Math.max(0, k)); } };
}
