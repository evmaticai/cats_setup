import * as THREE from 'three';
import type { Rig } from '../../engine/rigged';

// Dive Cats 3 cartoon effects, all set fresh each frame (pure in t): one pool of bubbles, a cat-shaped bubble cloud
// sampled from the skinned body, speed streaks, the run-in-place blur wheel and one sweat drop.

const noLook = (o: THREE.Object3D) => { o.userData.noLook = true; o.userData.noShadow = true; o.castShadow = false; o.frustumCulled = false; return o; };

/** A frame's bubbles: begin(), add() as many as needed, end(). */
export function bubblePool(max = 900) {
  const mat = new THREE.MeshLambertMaterial({ color: '#e9fdff', emissive: '#7fd8f0', emissiveIntensity: 0.35, transparent: true, opacity: 0.72, depthWrite: false });
  mat.userData.noLook = true;
  const mesh = noLook(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, max)) as THREE.InstancedMesh;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let n = 0;
  return {
    mesh,
    begin: () => { n = 0; },
    add: (p: THREE.Vector3, r: number) => { if (n >= max || r <= 0.0005) return; m.compose(p, q, s.setScalar(r)); mesh.setMatrixAt(n++, m); },
    end: () => { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; mesh.visible = n > 0; },
  };
}

/** Points on a cat's skinned body at its current pose (every `step`-th vertex), in world space. */
export function bodyPoints(rig: Rig, step = 9): THREE.Vector3[] {
  rig.root.updateMatrixWorld(true);
  const pts: THREE.Vector3[] = [];
  rig.root.traverse((o) => {
    const sm = o as THREE.SkinnedMesh;
    if (!sm.isSkinnedMesh || /mask/i.test(sm.name)) return;
    const n = sm.geometry.attributes.position.count;
    for (let i = 0; i < n; i += step) { const v = new THREE.Vector3(); sm.getVertexPosition(i, v); pts.push(sm.localToWorld(v)); }
  });
  return pts;
}

/** Speed streaks: thin white bars trailing behind a mover, facing the camera. */
export function streaks(n = 7) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
  mat.userData.noLook = true;
  const geo = new THREE.PlaneGeometry(1, 1).translate(-0.5, 0, 0); // anchored at its front end
  const bars = Array.from({ length: n }, () => noLook(new THREE.Mesh(geo, mat)) as THREE.Mesh);
  const group = new THREE.Group(); bars.forEach((b) => group.add(b));
  const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  /** behind `at` along -dir, spread over `spread` metres; k 0..1 fades them; cam for facing */
  const update = (at: THREE.Vector3, dir: THREE.Vector3, k: number, cam: THREE.Camera, spread = 0.45, length = 1.2) => {
    group.visible = k > 0.01;
    if (!group.visible) return;
    mat.opacity = 0.85 * Math.min(1, k);
    const d = dir.clone().normalize(), view = cam.position.clone().sub(at).normalize();
    const side = new THREE.Vector3().crossVectors(d, view).normalize();
    bars.forEach((b, i) => {
      const off = (hash(i) - 0.5) * spread, back = 0.15 + hash(i + 9) * 0.5, L = length * (0.5 + hash(i + 3)) * k;
      b.position.copy(at).addScaledVector(side, off).addScaledVector(d, -back);
      // the bar's X runs along -dir, its face toward the camera
      // local X along dir (the bar's geometry runs back from its front end), Z toward the camera
      const z = view.clone().addScaledVector(d, -view.dot(d)).normalize(), y = new THREE.Vector3().crossVectors(z, d);
      b.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, y, z));
      b.scale.set(L, 0.006 + 0.005 * hash(i + 5), 1); // thin: thick bars near the lens read as a fence
    });
  };
  return { group, update };
}

/** The run-in-place wheel: a soft blurred disc with whirl marks, facing the camera. */
export function runWheel() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 10, 64, 64, 62);
  grd.addColorStop(0, 'rgba(255,255,255,0.35)'); grd.addColorStop(0.75, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 5; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(64, 64, 34 + i * 10, i * 2.1, i * 2.1 + 1.3); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  mat.userData.noLook = true;
  const mesh = noLook(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)) as THREE.Mesh;
  const update = (at: THREE.Vector3, r: number, spin: number, cam: THREE.Camera, on: boolean) => {
    mesh.visible = on;
    if (!on) return;
    mesh.position.copy(at); mesh.quaternion.copy(cam.quaternion);
    mesh.rotateZ(spin); mesh.scale.setScalar(2 * r);
  };
  return { mesh, update };
}

/** One glossy sweat drop (the DC2 cover's), placed beside a head. */
export function sweatDrop() {
  const mat = new THREE.MeshBasicMaterial({ color: '#8fe4ff' }), shineM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  mat.userData.noLook = shineM.userData.noLook = true;
  const drop = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.008, 14, 10), mat);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0075, 0.013, 14), mat); tip.position.y = 0.0095;
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), shineM); shine.position.set(-0.0028, 0.002, 0.0065);
  drop.add(ball, tip, shine);
  drop.traverse(noLook);
  return drop;
}
