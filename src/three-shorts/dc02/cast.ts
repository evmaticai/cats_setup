import * as THREE from 'three';
import { staticFile } from 'remotion';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LookContext } from '../../engine/look/LookStage';
import { loadRigged, type Rig } from '../../engine/rigged';
import { patch } from './mat';

// Dive Cats 2 cast: the six cats exported from the approved Dive Cats build with their fitted masks skinned to the
// head (public/characters/dc02/geared/), plus the toy speargun, re-gripped each frame like the Blender build:
// grip point in the right paw, barrel along an aim direction, top toward an up direction (no bone-roll flips).

export const KEYS = ['yeji', 'silent', 'paw', 'lusya', 'zhenya', 'franko'] as const;
export type CatKey = (typeof KEYS)[number];
/** standing height in metres (the Dive Cats sizes: Zhenya big, Franko little) */
export const HEIGHT: Record<CatKey, number> = { paw: 0.95, silent: 0.95, zhenya: 1.06, yeji: 0.89, lusya: 1.0, franko: 0.68 };

const GRIP = new THREE.Vector3(0.4, -0.05, -0.16); // gun-mesh point held in the paw (barrel is mesh -X, top +Y)
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

export type Cat = {
  key: CatKey; rig: Rig; gun: THREE.Object3D; height: number;
  /** grip the gun: barrel along aim (world), top toward up (world) */
  hold: (aim: THREE.Vector3, up?: THREE.Vector3) => void;
  /** world position of the gun's muzzle (where the spear leaves) */
  muzzle: (out: THREE.Vector3) => THREE.Vector3;
};

let gunSrc: Promise<THREE.Object3D> | null = null;

export async function loadCat(ctx: LookContext, key: CatKey): Promise<Cat> {
  const rig = await loadRigged(staticFile(`characters/dc02/geared/${key}.glb`), 1024, true);
  const height = HEIGHT[key];
  rig.root.scale.multiplyScalar(height / rig.height);
  // the Dive Cats render added a white emission to every cat material (its sea grade); the reef has its own light
  rig.root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m?.emissive) m.emissive.set(0); });
  ctx.applyLook(rig.root);
  rig.root.traverse((o) => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => patch(x, { caustics: 0.45 })); });
  ctx.scene.add(rig.root);

  gunSrc ??= new GLTFLoader().loadAsync(staticFile('characters/dc02/speargun.glb')).then((g) => g.scene);
  const gun = new THREE.Group();
  const inner = (await gunSrc).clone(true);
  inner.position.copy(GRIP).multiplyScalar(-1);
  gun.add(inner);
  ctx.applyLook(gun);
  gun.traverse((o) => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => patch(x, { caustics: 0.4 })); });
  ctx.scene.add(gun);

  const hand = rig.bone('RightHand'), fore = rig.bone('RightForeArm');
  const hp = new THREE.Vector3(), fp = new THREE.Vector3(), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3();
  const M = new THREE.Matrix4();
  const hold = (aim: THREE.Vector3, up = Y) => {
    rig.root.updateMatrixWorld(true);
    hand.getWorldPosition(hp); fore.getWorldPosition(fp);
    hp.addScaledVector(hp.clone().sub(fp), 0.35); // the paw centre sits a little past the wrist
    bx.copy(aim).normalize().negate();
    by.copy(up).addScaledVector(bx, -up.dot(bx)).normalize();
    bz.crossVectors(bx, by);
    M.makeBasis(bx, by, bz);
    gun.quaternion.setFromRotationMatrix(M);
    gun.position.copy(hp);
    gun.scale.setScalar(0.24 * height);
    gun.updateMatrixWorld(true);
  };
  const tip = new THREE.Vector3(-0.95, 0, 0).sub(GRIP);
  const muzzle = (out: THREE.Vector3) => out.copy(tip).applyMatrix4(gun.matrixWorld);
  return { key, rig, gun, height, hold, muzzle };
}

/** Swim pose (T-pose rest): left paw paddles, right arm reaches forward with the gun, back legs kick, head up. */
export function swimPose(rig: Rig, t: number, o: { rate?: number; ph?: number; aim?: number; kick?: number } = {}) {
  const { rate = 1.4, ph = 0, aim = 1, kick = 1 } = o;
  rig.reset();
  const f = t * rate * Math.PI * 2 + ph;
  // left front paw: dog-paddle circle under the chest
  rig.turn('LeftArm', Y, -Math.PI / 2);
  rig.turn('LeftArm', X, -0.45 + 0.6 * Math.sin(f));
  rig.turn('LeftForeArm', X, -0.5 - 0.4 * Math.cos(f));
  // right front paw: from the paddle (aim 0) to straight ahead along the body holding the gun (aim 1)
  rig.turn('RightArm', Y, Math.PI / 2 * (1 - aim));
  rig.turn('RightArm', Z, -Math.PI / 2 * aim);
  rig.turn('RightArm', X, (1 - aim) * (-0.45 + 0.6 * Math.sin(f + Math.PI)) - 0.25 * aim);
  rig.turn('RightForeArm', X, (1 - aim) * (-0.5 - 0.4 * Math.cos(f + Math.PI)));
  for (const [side, s] of [['Left', 0], ['Right', Math.PI]] as const) {
    rig.turn(`${side}UpLeg`, X, -0.55 + 0.42 * kick * Math.sin(f + s + 1.2));
    rig.turn(`${side}Leg`, X, 0.5 + 0.35 * kick * Math.cos(f + s + 1.2));
  }
  rig.turn('Spine', Y, 0.05 * Math.sin(f));
  rig.turn('neck', X, -0.55);
  rig.turn('Head', X, -0.45 + 0.04 * Math.sin(f * 2));
}

/** Lay a rig prone, swimming along dir (head first, belly down), with a gentle bob. */
export function swimRoot(rig: Rig, pos: THREE.Vector3, dir: THREE.Vector3, t: number, rate = 1.4, pitch = 0.22) {
  const yaw = Math.atan2(dir.x, dir.z);
  rig.root.position.copy(pos).add(new THREE.Vector3(0, 0.04 * Math.sin(t * rate * Math.PI * 4), 0));
  rig.root.quaternion.setFromEuler(new THREE.Euler(Math.PI / 2 - pitch + 0.04 * Math.sin(t * rate * Math.PI * 2), yaw, 0, 'YXZ'));
  rig.root.updateMatrixWorld(true);
}

/** Forward and up of a swimming rig in world space (for aiming the gun along the body). */
export function bodyAxes(rig: Rig, fwd: THREE.Vector3, up: THREE.Vector3) {
  const q = rig.root.getWorldQuaternion(new THREE.Quaternion());
  fwd.copy(Y).applyQuaternion(q); // character up = head direction when prone
  up.copy(Z).applyQuaternion(q).negate(); // character front faces down; its back faces up
}
