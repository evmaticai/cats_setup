import * as THREE from 'three';
import type { Rig } from '../../engine/rigged';
import type { Cat } from './cast';

// Dive Cats 2 acting: one blended cat pose (swim with the gun forward → upright hug), the root that turns a prone
// swimmer into an upright cat facing the camera, the toy spear on its line, and bubble hearts. All pure in t.

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const lerp = THREE.MathUtils.lerp;
export const clamp01 = (x: number) => THREE.MathUtils.clamp(x, 0, 1);
export const smooth = (x: number) => { const c = clamp01(x); return c * c * c * (c * (c * 6 - 15) + 10); };
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

/** hug 0 = swimming with the gun forward (left paw paddles), 1 = upright, both arms around a fish.
 *  surprise 1 = arms up and frozen (Franko at the end). look = head turn left/right in radians. */
export function catPose(rig: Rig, t: number, o: { hug?: number; surprise?: number; rate?: number; ph?: number; look?: number; tilt?: number; kick?: number } = {}) {
  const { hug = 0, surprise = 0, rate = 1.4, ph = 0, look = 0, tilt = 0, kick = 1 } = o;
  rig.reset();
  const f = t * rate * Math.PI * 2 + ph;
  const fr = 1 - Math.max(hug, surprise);
  // left: paddle → around the fish / up in surprise
  rig.turn('LeftArm', Y, lerp(-Math.PI / 2, -Math.PI / 2 - 0.45, hug) * (1 - surprise));
  rig.turn('LeftArm', Z, 1.2 * surprise);
  rig.turn('LeftArm', X, fr * (-0.45 + 0.6 * Math.sin(f)) + 0.25 * hug);
  rig.turn('LeftForeArm', X, fr * (-0.5 - 0.4 * Math.cos(f)));
  rig.turn('LeftForeArm', Y, -0.7 * hug);
  // right: gun forward along the body → around the fish / up
  rig.turn('RightArm', Y, lerp(0, Math.PI / 2 + 0.45, hug));
  rig.turn('RightArm', Z, lerp(-Math.PI / 2, 0, Math.max(hug, surprise)) - 1.2 * surprise);
  rig.turn('RightArm', X, -0.25 * fr + 0.25 * hug);
  rig.turn('RightForeArm', Y, 0.7 * hug);
  // legs: kick while swimming, a slow tread when upright
  const k = lerp(1, 0.4, Math.max(hug, surprise)) * kick, ff = lerp(f, t * 2.4, Math.max(hug, surprise));
  for (const [side, s] of [['Left', 0], ['Right', Math.PI]] as const) {
    rig.turn(`${side}UpLeg`, X, lerp(-0.55, -0.25, hug) + 0.42 * k * Math.sin(ff + s + 1.2));
    rig.turn(`${side}Leg`, X, lerp(0.5, 0.3, hug) + 0.35 * k * Math.cos(ff + s + 1.2));
  }
  rig.turn('Spine', Y, 0.05 * Math.sin(f) * fr);
  rig.turn('neck', X, lerp(-0.55, 0.12, Math.max(hug, surprise)));
  rig.turn('Head', X, lerp(-0.45, -0.05, Math.max(hug, surprise)));
  rig.turn('Head', Y, look);
  rig.turn('Head', Z, tilt);
}

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
/** Root: prone along `dir` (k = 0) → upright facing `face` (k = 1). The body centre stays put while it turns. */
export function catRoot(cat: Cat, pos: THREE.Vector3, dir: THREE.Vector3, face: THREE.Vector3, k: number, t: number, pitch = 0.22) {
  const rig = cat.rig, h = cat.height;
  qa.setFromEuler(new THREE.Euler(Math.PI / 2 - pitch + 0.04 * Math.sin(t * 8.8), Math.atan2(dir.x, dir.z), 0, 'YXZ'));
  qb.setFromEuler(new THREE.Euler(-0.08, Math.atan2(face.x, face.z), 0.06 * Math.sin(t * 2.2), 'YXZ'));
  rig.root.quaternion.slerpQuaternions(qa, qb, smooth(k));
  // the root is at the feet: prone, the body lies ahead of it; upright, above it
  const centre = pos.clone().addScaledVector(dir.clone().setY(0).normalize(), 0.45 * h * (1 - k));
  rig.root.position.copy(centre).add(new THREE.Vector3(0, -0.45 * h * smooth(k) + 0.04 * Math.sin(t * 5), 0));
  rig.root.updateMatrixWorld(true);
}

/** Forward (head direction) and up (back) of a prone rig. */
export function axes(rig: Rig, fwd: THREE.Vector3, up: THREE.Vector3) {
  const q = rig.root.getWorldQuaternion(new THREE.Quaternion());
  fwd.copy(Y).applyQuaternion(q); up.copy(Z).applyQuaternion(q).negate();
}

/** The toy spear (wooden shaft, red suction cup on the front) and its line back to the gun. */
export function makeSpear(len: number) {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: '#c89a5a', flatShading: true }), red = new THREE.MeshLambertMaterial({ color: '#e82a2a', flatShading: true });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 5).rotateZ(Math.PI / 2).translate(-len / 2, 0, 0), wood);
  const cup = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.06, 8, 1, true).rotateZ(Math.PI / 2).translate(0.02, 0, 0), red);
  cup.material.side = THREE.DoubleSide;
  g.add(shaft, cup);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 4).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: '#f4f4ec' }));
  for (const m of [shaft, cup, line]) { m.userData.noLook = true; m.castShadow = true; (m.material as THREE.Material).userData.noLook = true; }
  const q = new THREE.Quaternion(), d = new THREE.Vector3();
  /** spear tip at `tip`, pointing along `dir`; the line runs from `from` to the spear's tail */
  const set = (tip: THREE.Vector3, dir: THREE.Vector3, from: THREE.Vector3 | null) => {
    g.visible = true;
    g.position.copy(tip); g.quaternion.setFromUnitVectors(X, dir.clone().normalize());
    const tail = tip.clone().addScaledVector(dir.clone().normalize(), -len);
    line.visible = !!from;
    if (from) {
      d.copy(tail).sub(from);
      line.position.copy(from); line.quaternion.copy(q.setFromUnitVectors(Y, d.clone().normalize())); line.scale.set(1, d.length(), 1);
    }
  };
  const hide = () => { g.visible = false; line.visible = false; };
  return { group: g, line, set, hide };
}

/** Five pink bubble hearts that pop up from a point and drift up (0 ≤ k ≤ 1 over their life). */
export function makeHearts() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5); s.bezierCurveTo(-0.9, 0.1, -0.5, 0.9, 0, 0.45); s.bezierCurveTo(0.5, 0.9, 0.9, 0.1, 0, -0.5);
  const geo = new THREE.ShapeGeometry(s, 4);
  const mat = new THREE.MeshBasicMaterial({ color: '#ff5aa8', side: THREE.DoubleSide, transparent: true });
  mat.userData.noLook = true;
  const hearts = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(geo, mat); m.userData.noLook = m.userData.noShadow = true; return m; });
  const group = new THREE.Group(); hearts.forEach((h) => group.add(h));
  const update = (from: THREE.Vector3, k: number, cam: THREE.Camera, size = 0.12) => {
    group.visible = k > 0 && k < 1;
    mat.opacity = 1 - THREE.MathUtils.smoothstep(k, 0.7, 1);
    hearts.forEach((h, i) => {
      const kk = clamp01(k * 1.3 - i * 0.07), a = i * 1.3;
      h.position.copy(from).add(new THREE.Vector3(Math.sin(a) * 0.25 * kk + Math.sin(kk * 9 + i) * 0.04, kk * 0.8 + i * 0.03, Math.cos(a) * 0.15 * kk));
      h.quaternion.copy(cam.quaternion);
      h.scale.setScalar(size * (kk < 0.15 ? kk / 0.15 * 1.2 : 1) * (0.8 + 0.1 * i));
    });
  };
  return { group, update };
}
