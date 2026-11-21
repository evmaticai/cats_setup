import React, { useCallback } from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import * as THREE from 'three';
import { LookStage, type LookContext } from '../../../engine/look/LookStage';
import { loadRigged, type Rig } from '../../../engine/rigged';
import { framingGate } from '../gate';

// "us on vacation?" (Paw and Friends, cozy look): Paw and Silent on a striped beach towel at golden hour, the sea
// and a palm behind them; Silent slowly leans his head onto Paw. An 8 s seamless loop: every motion is periodic in
// LOOP seconds. Soundtrack: added in the YouTube/TikTok app at upload ("La Isla Bonita"), never in our file.

export const ISLA_FPS = 30;
export const LOOP = 8;
export const ISLA_FRAMES = LOOP * ISLA_FPS;
const HEIGHT: Record<string, number> = { paw: 0.95, silent: 0.95 };
const TAU = Math.PI * 2;
const SIT_DROP = 0.3; // how far the hips come down when sitting, in heights

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function canvasTex(w: number, h: number, fn: (g: CanvasRenderingContext2D) => void, rx = 1, ry = rx) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}
const lam = (map: THREE.Texture | null, color = '#ffffff', side: THREE.Side = THREE.FrontSide) => new THREE.MeshLambertMaterial({ map, color, side });

/** sound: 'full' = our own sound at -14 LUFS; 'clean' = quiet ambience to sit under the song added in the app */
/** cover: a staged cover scene (skills/three-shorts/COVERS.md): 'sip' | 'shades' | 'cuddle' (no gate, no motion) */
export const Isla: React.FC<{ sound?: 'full' | 'clean' | 'none'; look?: 'smooth' | 'pixel'; side?: boolean; cover?: string }> = ({ look = 'smooth', sound = 'none', side = false, cover = '' }) => {
  const setup = useCallback(async (ctx: LookContext) => {
    // sand: warm grainy photo-like texture
    const sandT = canvasTex(128, 128, (g) => {
      g.fillStyle = '#e4d8c4'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 2600; i++) { const v = rnd(); g.fillStyle = v < 0.4 ? '#f4e4c4' : v < 0.75 ? '#dcc49a' : '#c8ad82'; g.fillRect(rnd() * 128, rnd() * 128, 1 + (rnd() < 0.2 ? 1 : 0), 1); }
    }, 10);
    const sandG = new THREE.PlaneGeometry(40, 30, 40, 30).rotateX(-Math.PI / 2);
    const sp = sandG.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setY(i, 0.04 * Math.sin(sp.getX(i) * 1.3) * Math.sin(sp.getZ(i) * 0.9) - Math.max(0, -sp.getZ(i) - 4) * 0.05);
    sandG.computeVertexNormals();
    const sand = new THREE.Mesh(sandG, lam(sandT)); sand.receiveShadow = true;
    // sea: a big plane with moving wave bands, and a foam line that rolls in and out (periodic)
    const seaT = canvasTex(128, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#1d6fa8'); gr.addColorStop(1, '#3fb6c8');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 160; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(120,220,235,0.6)'; g.fillRect(rnd() * 128, rnd() * 128, 4 + rnd() * 10, 1); }
    }, 6, 4);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(80, 40).rotateX(-Math.PI / 2), lam(seaT));
    sea.position.set(0, -0.32, -24);
    const foamT = canvasTex(128, 16, (g) => { g.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) g.fillRect(rnd() * 128, rnd() * 16, 3 + rnd() * 8, 2); }, 8, 1);
    foamT.wrapT = THREE.ClampToEdgeWrapping;
    const foamM = new THREE.MeshLambertMaterial({ map: foamT, transparent: true, alphaTest: 0.3, color: '#ffffff' });
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(80, 1.2).rotateX(-Math.PI / 2), foamM);
    // a palm on the left: a curved trunk of rings, fronds as textured planes
    const palm = new THREE.Group();
    const barkT = canvasTex(32, 64, (g) => { g.fillStyle = '#8a6a48'; g.fillRect(0, 0, 32, 64); for (let y = 0; y < 64; y += 6) { g.fillStyle = '#6a4e34'; g.fillRect(0, y, 32, 2); } }, 1, 4);
    let p = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 9; i++) {
      const q = p.clone().add(new THREE.Vector3(0.12 + i * 0.02, 0.62, 0));
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.11 - i * 0.006, 0.13 - i * 0.006, q.distanceTo(p), 7), lam(barkT));
      seg.position.copy(p.clone().add(q).multiplyScalar(0.5)); seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
      seg.castShadow = true; palm.add(seg); p = q;
    }
    const leafT = canvasTex(64, 16, (g) => {
      g.fillStyle = '#3f8a3a'; g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(32, -2, 64, 8); g.quadraticCurveTo(32, 18, 0, 8); g.fill();
      g.strokeStyle = '#2a5f28'; g.lineWidth = 1; for (let x = 4; x < 60; x += 4) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 3, 2); g.moveTo(x, 8); g.lineTo(x + 3, 14); g.stroke(); }
    });
    const fronds: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6, 6, 1).translate(1.2, 0, 0), new THREE.MeshLambertMaterial({ map: leafT, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
      const gp = f.geometry.attributes.position; for (let k = 0; k < gp.count; k++) gp.setY(k, gp.getY(k) - 0.12 * gp.getX(k) ** 2);
      f.geometry.computeVertexNormals();
      f.position.copy(p); f.rotation.set(0.3, (i / 9) * TAU, -0.15); f.castShadow = true; fronds.push(f); palm.add(f);
    }
    palm.position.set(-2.4, 0, -6.5); palm.rotation.y = 0.5;
    // the striped towel, a coconut drink with a straw, a pair of tiny sunglasses resting on the towel
    const towelT = canvasTex(64, 64, (g) => { const c = ['#ff5a6a', '#ffffff', '#3fb6e0', '#ffffff']; for (let i = 0; i < 8; i++) { g.fillStyle = c[i % 4]; g.fillRect(i * 8, 0, 8, 64); } }, 2, 1);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.1, 8, 6).rotateX(-Math.PI / 2), lam(towelT));
    towel.position.set(0.05, 0.02, 0.35); towel.rotation.y = 0.08; towel.receiveShadow = true;
    const coco = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), lam(canvasTex(32, 32, (g) => { g.fillStyle = '#6a4630'; g.fillRect(0, 0, 32, 32); for (let i = 0; i < 120; i++) { g.fillStyle = '#4a3020'; g.fillRect(rnd() * 32, rnd() * 32, 1, 3); } })));
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5), lam(null, '#ff4a8a')); straw.position.set(0.03, 0.12, 0); straw.rotation.z = -0.35;
    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.03, 8), lam(null, '#ffd23a')); umbrella.position.set(-0.03, 0.16, 0.01);
    coco.add(shell, straw, umbrella); coco.position.set(0.62, 0.1, 0.72); coco.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    const grassT = canvasTex(32, 64, (g) => { for (let i = 0; i < 26; i++) { g.strokeStyle = rnd() < 0.5 ? '#9ab04a' : '#c8c068'; g.lineWidth = 2; g.beginPath(); const x = 4 + rnd() * 24; g.moveTo(x, 64); g.quadraticCurveTo(x + (rnd() - 0.5) * 10, 34, x + (rnd() - 0.5) * 16, rnd() * 20); g.stroke(); } });
    const grassM = new THREE.MeshLambertMaterial({ map: grassT, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
    const dune = new THREE.Group();
    for (let i = 0; i < 22; i++) {
      const sideX = (i % 2 ? 1 : -1) * (1.1 + rnd() * 2.2), z = -0.6 - rnd() * 3.5, s = 0.35 + rnd() * 0.4;
      for (let k = 0; k < 2; k++) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * s, 0.9 * s).translate(0, 0.45 * s, 0), grassM); q.position.set(sideX, 0, z); q.rotation.y = k * Math.PI / 2 + rnd(); dune.add(q); }
    }
    const shellM = lam(null, '#fff0e6'), pinkM = lam(null, '#ffb4b4');
    const bits = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.03, 7, 1), rnd() < 0.5 ? shellM : pinkM);
      const x = (rnd() - 0.5) * 3.2, z = 0.6 + rnd() * 1.4;
      if (Math.abs(x) < 0.9 && z < 0.95) continue; // keep-out: the towel and the cats
      sh.position.set(x, 0.015, z); sh.rotation.set(Math.PI / 2, 0, rnd() * 6); bits.add(sh);
    }
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 5), lam(null, '#ff6a3a')); star.position.set(-0.95, 0.01, 1.15); star.rotation.y = 0.4;
    const palm2 = palm.clone(); palm2.position.set(2.6, 0, -6.5); palm2.rotation.y = 2.4; palm2.scale.setScalar(1.1);
    // the low sun behind them (it blooms) and its warm rim light on their fur
    const sunM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.7), fog: false }); // over-bright: it blooms
    const haloM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.45), fog: false, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const halo = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), haloM);
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), sunM); sunDisc.position.set(-1.6, 3.4, -16); halo.position.set(-1.6, 3.4, -16.1); sunDisc.renderOrder = -1;
    const rimL = new THREE.DirectionalLight('#ffb070', 5.5); rimL.position.set(2, 2.2, -6); rimL.target.position.set(0, 0.4, 0.3);
    ctx.scene.add(sand, sea, foam, palm, palm2, towel, coco, dune, bits, star, sunDisc, halo, rimL, rimL.target);

    // the cats
    const load = async (k: string) => {
      const rig = await loadRigged(staticFile(`characters/dc02/${k}.glb`), 1024, true);
      rig.root.scale.multiplyScalar(HEIGHT[k] / rig.height);
      rig.root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m?.emissive) m.emissive.set(0); (o as THREE.Mesh).castShadow = true; });
      ctx.applyLook(rig.root); ctx.scene.add(rig.root);
      return rig;
    };
    const paw = await load('paw'), silent = await load('silent');
    const sit = (rig: Rig, x: number, z: number, yaw: number, lean: number, h: number) => {
      rig.root.position.set(x, 0, z); rig.root.rotation.set(0.05, yaw, lean); rig.root.updateMatrixWorld(true);
    };

    // sitting relaxed: front legs down and a little forward, paws close together; a slow breath; head look and tilt
    const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
    const relax = (rig: Rig, ph: number, look: number, tilt: number) => {
      rig.reset();
      const br = 0.03 * Math.sin(ph * 2), h = rig === paw ? HEIGHT.paw : HEIGHT.silent;
      // a real cat sit: thighs folded forward, shins tucked back under, the hips down on the towel; front legs
      // straight down to the ground in front of the hind paws; the back leaning a little forward
      for (const [side, s] of [['Left', 1], ['Right', -1]] as const) {
        rig.turn(`${side}UpLeg`, X, -1.45); rig.turn(`${side}UpLeg`, Z, s * 0.18);
        rig.turn(`${side}Leg`, X, 1.75);
      }
      rig.hipsOffset(-SIT_DROP * h, -0.04 * h);
      rig.turn('Spine', X, 0.22 + br); rig.turn('neck', X, -0.2 - br);
      rig.turn('LeftArm', Z, -1.42); rig.turn('LeftArm', X, -0.3); rig.turn('LeftForeArm', X, 0.1);
      rig.turn('RightArm', Z, 1.42); rig.turn('RightArm', X, -0.3); rig.turn('RightForeArm', X, 0.1);
      rig.turn('Head', Y, look); rig.turn('Head', Z, tilt);
    };
    // ---- cover props: sunglasses for Paw, a shared coconut with two straws
    const shades = new THREE.Group();
    { const lens = new THREE.MeshBasicMaterial({ color: '#141018' }), frameM = new THREE.MeshBasicMaterial({ color: '#ff3a7a' });
      for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.034, 18), lens); l.position.set(sx * 0.04, 0, 0.002); const r = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.041, 18), frameM); r.position.set(sx * 0.04, 0, 0.003); const g = new THREE.Mesh(new THREE.CircleGeometry(0.009, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })); g.position.set(sx * 0.04 - 0.012, 0.012, 0.004); shades.add(l, r, g); }
      const bridge = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.008), frameM); bridge.position.set(0, 0.006, 0.003); shades.add(bridge);
      shades.traverse((o) => (o.userData.noLook = true)); }
    shades.visible = false; ctx.scene.add(shades);
    const straw2 = straw.clone(); straw2.position.set(-0.03, 0.12, 0); straw2.rotation.z = 0.35; straw2.visible = false; coco.add(straw2);
    const headMid = (rig: Rig) => rig.bone('Head').getWorldPosition(new THREE.Vector3()).lerp(rig.bone('head_end').getWorldPosition(new THREE.Vector3()), 0.45);
    const stageCover = (v: string) => {
      ctx.mood('golden');
      const lean = v === 'shades' ? 0.7 : 1;
      sit(paw, -0.16, 0.3, 0.16, -0.02 - 0.04 * lean, HEIGHT.paw);
      sit(silent, 0.18 - 0.06 * lean, 0.28, -0.16, 0.26 * lean, HEIGHT.silent);
      relax(paw, 0, 0.12 * lean, 0.06 + 0.12 * lean);
      relax(silent, 1.3, -0.12 - 0.1 * lean, -0.5 * lean);
      paw.root.updateMatrixWorld(true); silent.root.updateMatrixWorld(true);
      const pm = headMid(paw), sm = headMid(silent), mid = pm.clone().lerp(sm, 0.5);
      if (v === 'sip') { // one coconut between them, a straw to each mouth
        coco.position.copy(mid).add(new THREE.Vector3(0, -0.2, 0.14)); coco.scale.setScalar(1.15); straw2.visible = true; straw.scale.set(1, 1.5, 1); straw2.scale.set(1, 1.5, 1);
        ctx.camera.position.copy(mid).add(new THREE.Vector3(0, -0.05, 1.55)); ctx.camera.fov = 46; ctx.camera.updateProjectionMatrix(); ctx.camera.lookAt(mid.clone().add(new THREE.Vector3(0, -0.06, 0)));
      } else if (v === 'shades') { // vacation mode: Paw in pink sunglasses
        shades.visible = true; shades.position.copy(pm).add(new THREE.Vector3(0.0, 0.0, 0.0));
        ctx.camera.position.copy(mid).add(new THREE.Vector3(0, -0.05, 1.5)); ctx.camera.fov = 46; ctx.camera.updateProjectionMatrix(); ctx.camera.lookAt(mid.clone().add(new THREE.Vector3(0, -0.04, 0)));
        shades.quaternion.copy(ctx.camera.quaternion); shades.position.add(new THREE.Vector3(0, 0, 0.1).applyQuaternion(ctx.camera.quaternion)).add(new THREE.Vector3(0, 0.012, 0)); shades.scale.setScalar(1.2); shades.renderOrder = 10; shades.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) { m.depthTest = false; } (o as THREE.Mesh).renderOrder = 10; });
      } else { // cuddle: tight on the two faces, the sun glowing right behind them
        ctx.camera.position.copy(mid).add(new THREE.Vector3(0.04, -0.06, 1.25)); ctx.camera.fov = 44; ctx.camera.updateProjectionMatrix(); ctx.camera.lookAt(mid.clone().add(new THREE.Vector3(0, 0.0, 0)));
      }
      ctx.sunFollow(mid, { size: 3, az: 145, el: 20 });
    };
    return (fr: number) => {
      if (cover) { stageCover(cover); return; }
      const t = (fr / ISLA_FPS) % LOOP, ph = (t / LOOP) * TAU;
      ctx.mood('golden');
      // the lean: Silent tips toward Paw and rests there, then eases back (one smooth cycle per loop)
      // Silent leans in (1.2-2.6 s), rests his head on Paw (2.6-5.0 s), eases back (5.0-6.6 s): one cycle per loop
      const ss = (a: number, b: number) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
      const lean = ss(1.2, 2.6) * (1 - ss(5.0, 6.6));
      sit(paw, -0.16, 0.3, 0.16, -0.02 - 0.04 * lean, HEIGHT.paw);
      sit(silent, 0.18 - 0.06 * lean, 0.28, -0.16, 0.26 * lean, HEIGHT.silent); // he slides in and leans: the gap closes
      relax(paw, ph, 0.12 * lean, 0.06 + 0.12 * lean);
      relax(silent, ph + 1.3, -0.12 - 0.1 * lean, -0.5 * lean);
      // waves: foam line rolls in and out twice per loop, fronds sway, sea texture drifts (all periodic)
      const w = 0.5 - 0.5 * Math.cos(ph * 2);
      foam.position.set(0, -0.2, -5.6 + 1.2 * w); foamM.opacity = 1;
      (sea.material as THREE.MeshLambertMaterial).map!.offset.set((t / LOOP) * 1, 0);
      fronds.forEach((f, i) => { f.rotation.z = -0.15 + 0.06 * Math.sin(ph + i); });
      ctx.camera.position.set(0.02, 0.42, 2.2); ctx.camera.fov = 44; ctx.camera.updateProjectionMatrix();
      ctx.camera.lookAt(0.02, 0.6, 0);
      ctx.sunFollow(new THREE.Vector3(0, 0.4, 0), { size: 4, az: 145, el: 20 });
      if (side) { ctx.camera.position.set(2.4, 0.4, 0.3); ctx.camera.lookAt(0, 0.3, 0.3); return; } // debug: the pose from the side
      framingGate(ctx.camera, [{ name: 'Paw', rig: paw, minHead: 0.07 }, { name: 'Silent', rig: silent, minHead: 0.07 }], fr);
    };
  }, [side, cover]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <LookStage setup={setup} style={look === 'pixel' ? 'cozy' : 'cozy-smooth'} />
      {sound !== 'none' && <Audio src={staticFile(`episodes/isla/isla_${sound}.wav`)} />}
    </AbsoluteFill>
  );
};
