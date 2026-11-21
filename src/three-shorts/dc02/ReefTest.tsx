import React, { useCallback } from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import * as THREE from 'three';
import { LookStage, type LookContext } from '../../engine/look/LookStage';
import { loadRigged, type Rig } from '../../engine/rigged';
import { buildReef } from './reef';
import { patch } from './mat';

// Dive Cats 2, world review: a 12 s flight through the reef (low over the sand, up to the fish school, down to
// the clownfish anemone), with Paw paddling through for scale. No gear yet; this shot is for the world only.

export const REEF_FPS = 30;
export const REEF_FRAMES = 12 * REEF_FPS;
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
const smooth = (x: number) => { const c = THREE.MathUtils.clamp(x, 0, 1); return c * c * c * (c * (c * 6 - 15) + 10); };

/** Dog-paddle pose for a cat rig (T-pose rest): front paws circle under the chest, back legs kick, head up. */
export function swimPose(rig: Rig, t: number, rate = 1.5, ph = 0) {
  rig.reset();
  const f = t * rate * Math.PI * 2 + ph;
  for (const [side, s] of [['Left', 0], ['Right', Math.PI]] as const) {
    const sign = side === 'Left' ? -1 : 1;
    rig.turn(`${side}Arm`, Y, sign * Math.PI / 2); // T-pose arm → pointing out of the chest
    rig.turn(`${side}Arm`, X, -0.45 + 0.6 * Math.sin(f + s));
    rig.turn(`${side}ForeArm`, X, -0.5 - 0.4 * Math.cos(f + s));
    rig.turn(`${side}UpLeg`, X, -0.75 + 0.45 * Math.sin(f + s + 1.2));
    rig.turn(`${side}Leg`, X, 0.6 + 0.35 * Math.cos(f + s + 1.2));
  }
  rig.turn('Spine', Y, 0.05 * Math.sin(f));
  rig.turn('neck', X, -0.55);
  rig.turn('Head', X, -0.45 + 0.04 * Math.sin(f * 2));
}

/** Lay a rig prone, swimming along `dir` (head first, belly down), with a gentle body bob. */
export function swimRoot(rig: Rig, pos: THREE.Vector3, dir: THREE.Vector3, t: number, rate = 1.5) {
  const yaw = Math.atan2(dir.x, dir.z);
  rig.root.position.copy(pos).add(new THREE.Vector3(0, 0.05 * Math.sin(t * rate * Math.PI * 4), 0));
  rig.root.quaternion.setFromEuler(new THREE.Euler(Math.PI / 2 - 0.22 + 0.04 * Math.sin(t * rate * Math.PI * 2), yaw, 0, 'YXZ'));
  rig.root.updateMatrixWorld(true);
}

export const ReefTest: React.FC = () => {
  const setup = useCallback(async (ctx: LookContext) => {
    const reef = buildReef();
    ctx.scene.add(reef.group);
    const paw = await loadRigged(staticFile('characters/dc02/paw.glb'), 1024, true);
    paw.root.scale.setScalar(0.95 / paw.height);
    ctx.applyLook(paw.root);
    paw.root.traverse((o) => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => patch(x, { caustics: 0.45 })); });
    ctx.scene.add(paw.root);

    const hero = reef.anchors.hero;
    const pos = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.6, 1.3, 10), new THREE.Vector3(0.0, 1.6, 4.5), new THREE.Vector3(-3.5, 5.5, 3.5),
      new THREE.Vector3(-1.5, 3.2, 2.5), hero.clone().add(new THREE.Vector3(1.6, 1.1, 2.6)),
    ]);
    const look = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.4, 1.6, -6), new THREE.Vector3(1.0, 1.7, -8), new THREE.Vector3(0.5, 4.0, -16),
      new THREE.Vector3(2.0, 1.6, -4), hero.clone().add(new THREE.Vector3(0, 0.45, 0)),
    ]);
    const p = new THREE.Vector3(), l = new THREE.Vector3();
    return (f: number) => {
      const t = f / REEF_FPS;
      reef.update(t);
      ctx.mood('day');
      const u = 0.06 + 0.94 * smooth(t / 12) ; // never parked: the whole flight is one eased move
      pos.getPoint(u, p); look.getPoint(u, l);
      ctx.camera.position.copy(p);
      ctx.camera.fov = 46 - 8 * smooth((t - 8) / 4);
      ctx.camera.updateProjectionMatrix();
      ctx.camera.lookAt(l);
      ctx.sunFollow(l, { size: 22 });
      // Paw paddles across the channel in front of the camera, left to right
      swimPose(paw, t);
      swimRoot(paw, new THREE.Vector3(-4.5 + t * 1.1, 1.7 + 0.2 * Math.sin(t * 0.6), 0.5 - t * 0.3), new THREE.Vector3(1, 0, -0.27), t);
    };
  }, []);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <LookStage setup={setup} style="reef" />
    </AbsoluteFill>
  );
};
