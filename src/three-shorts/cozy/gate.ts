import * as THREE from 'three';
import type { Rig } from '../../engine/rigged';

// The paw-cats framing gate (skill CHECKS.md): run every frame after the camera and poses are set. A broken rule
// throws, so the render fails loudly at the frame that broke it instead of shipping it.

export type GateCat = { name: string; rig: Rig; minHead: number }; // minHead: head height as a fraction of the frame

const ndc = (cam: THREE.Camera, p: THREE.Vector3) => p.clone().project(cam);

/** Throws if a payoff head leaves the frame, is smaller than minHead, or two heads interpenetrate on screen. */
export function framingGate(cam: THREE.PerspectiveCamera, cats: GateCat[], frame: number) {
  cam.updateMatrixWorld(true);
  const boxes = cats.map((c) => {
    c.rig.root.updateMatrixWorld(true);
    const head = c.rig.bone('Head').getWorldPosition(new THREE.Vector3());
    const top = c.rig.bone('head_end').getWorldPosition(new THREE.Vector3());
    // the Head bone sits at the base of the skull and head_end at its top: the head is the sphere between them
    const mid = head.clone().lerp(top, 0.5), r = head.distanceTo(top) * 0.55;
    const a = ndc(cam, mid.clone().add(new THREE.Vector3(0, r, 0))), b = ndc(cam, mid.clone().add(new THREE.Vector3(0, -r, 0)));
    const cx = ndc(cam, mid).x, w = Math.abs(a.y - b.y) / 2 / cam.aspect; // a head is about as wide as it is tall
    const box = { name: c.name, x0: cx - w, x1: cx + w, y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y), h: Math.abs(a.y - b.y) / 2 };
    if ((globalThis as any).GATE_LOG) console.log("GATE", JSON.stringify({ ...box, r: +r.toFixed(3) }));
    // the right edge keeps clear of the app's buttons (TikTok / Shorts), the others keep a small margin
    if (box.x0 < -0.96 || box.x1 > 0.8 || box.y0 < -0.96 || box.y1 > 0.96) throw new Error(`framing gate, frame ${frame}: ${c.name}'s head leaves the frame (x ${box.x0.toFixed(2)}..${box.x1.toFixed(2)}, y ${box.y0.toFixed(2)}..${box.y1.toFixed(2)})`);
    if (box.h < c.minHead) throw new Error(`framing gate, frame ${frame}: ${c.name}'s head is ${(box.h * 100).toFixed(1)}% of the frame (min ${c.minHead * 100}%)`);
    return box;
  });
  return boxes;
}
