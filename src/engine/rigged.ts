import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// A rigged GLB (Meshy auto-rig: Hips, Spine, neck, Head, LeftArm, LeftForeArm, ...), posed in code.
export type Rig = {
  root: THREE.Object3D;
  bone: (name: string) => THREE.Object3D;
  reset: () => void;
  /** Move the hips by dy metres (the Meshy armature is in centimetres, scale 0.01). */
  hipsOffset: (dy: number, dz?: number) => void;
  height: number;
  /** Rotate a bone around an axis given in CHARACTER space (+X = his left, +Y up, +Z forward). */
  turn: (name: string, axis: THREE.Vector3, angle: number) => void;
};

// PS1 textures were tiny: shrink the map and sample it with hard pixels.
function ps1Texture(map: THREE.Texture, size = 256): THREE.Texture {
  const img = map.image as CanvasImageSource;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d')!.drawImage(img, 0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.flipY = map.flipY;
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

/** keepMaterials: leave the GLB's own materials for LookStage's applyLook (the PS1 swap is the old default). */
// Bone-name aliases → our Meshy names, so Mixamo, Rigify/Quaternius and VRM-humanoid rigs load as the same Rig.
const SIDE = (s: string) => (s === 'l' || s === 'left' ? 'Left' : 'Right');
export function canonicalBone(raw: string, meshy = false): string {
  const n = raw.replace(/^mixamorig[:_]?/i, '').replace(/^.*:/, '');
  if (meshy) return n; // Meshy rigs already use our names (and their 'Spine' is the top spine bone)
  const k = n.toLowerCase().replace(/[\s_.-]/g, '');
  const fixed: Record<string, string> = {
    hips: 'Hips', pelvis: 'Hips', spine: 'Spine02', spine1: 'Spine01', chest: 'Spine01', spine2: 'Spine', upperchest: 'Spine',
    neck: 'neck', head: 'Head', headtopend: 'head_end', headend: 'head_end',
  };
  if (fixed[k]) return fixed[k];
  // LeftArm / Arm.L / leftUpperArm / upperarm_l / UpperArm.L ...
  const m = k.match(/^(left|right)?(shoulder|upperarm|arm|lowerarm|forearm|hand|upperleg|upleg|thigh|lowerleg|leg|shin|calf|foot|toes|toebase|toe)(l|r|left|right)?$/);
  if (m && (m[1] || m[3])) {
    const side = SIDE(m[1] || m[3]);
    const part: Record<string, string> = {
      shoulder: 'Shoulder', upperarm: 'Arm', arm: 'Arm', lowerarm: 'ForeArm', forearm: 'ForeArm', hand: 'Hand',
      upperleg: 'UpLeg', upleg: 'UpLeg', thigh: 'UpLeg', lowerleg: 'Leg', leg: 'Leg', shin: 'Leg', calf: 'Leg',
      foot: 'Foot', toes: 'ToeBase', toebase: 'ToeBase', toe: 'ToeBase',
    };
    return side + part[m[2]];
  }
  return n;
}

export async function loadRigged(url: string, textureSize = 256, keepMaterials = false): Promise<Rig> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  root.name = url.split('/').pop()!.replace(/\.glb.*$/, ''); // e.g. 'kipish': thumbnails hide a character by name
  const bones = new Map<string, THREE.Object3D>();
  let meshy = false;
  root.traverse((o) => { if ((o as THREE.Bone).isBone && o.name === 'Spine02') meshy = true; });
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) { o.name = canonicalBone(o.name, meshy); bones.set(o.name, o); }
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.frustumCulled = false;
      const old = mesh.material as THREE.MeshStandardMaterial;
      if (!keepMaterials) mesh.material = new THREE.MeshLambertMaterial({ map: old.map ? ps1Texture(old.map, textureSize) : null, flatShading: true });
    }
  });
  const rest = new Map([...bones].map(([n, b]) => [n, b.quaternion.clone()]));
  root.updateMatrixWorld(true);
  const hips = bones.get('Hips')!, hipsRest = hips.position.clone();
  const unit = hips.parent!.getWorldScale(new THREE.Vector3()).y;
  const height = new THREE.Box3().setFromObject(root).max.y;
  const bone = (n: string) => { const b = bones.get(n); if (!b) throw new Error(`no bone ${n}`); return b; };
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), dq = new THREE.Quaternion(), qr = new THREE.Quaternion();
  const ax = new THREE.Vector3();
  return {
    root, bone, height,
    reset: () => { for (const [n, q] of rest) bones.get(n)!.quaternion.copy(q); hips.position.copy(hipsRest); root.updateMatrixWorld(true); },
    hipsOffset: (dy, dz = 0) => { hips.position.set(hipsRest.x, hipsRest.y + dy / unit, hipsRest.z + dz / unit); root.updateMatrixWorld(true); },
    turn: (n, axis, angle) => {
      const b = bone(n);
      b.parent!.getWorldQuaternion(q1);
      b.getWorldQuaternion(q2);
      ax.copy(axis).applyQuaternion(root.getWorldQuaternion(qr));
      dq.setFromAxisAngle(ax, angle).multiply(q2);
      b.quaternion.copy(q1.invert().multiply(dq));
      b.updateMatrixWorld(true);
    },
  };
}
