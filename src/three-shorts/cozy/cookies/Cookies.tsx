import React, { useCallback } from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import * as THREE from 'three';
import { LookStage, type LookContext } from '../../../engine/look/LookStage';
import { loadRigged } from '../../../engine/rigged';
import { framingGate } from '../gate';

// "us at midnight?" (Paw and Friends, cozy look): Zhenya (orange) and Lusya (black) on a white bed at night, a warm
// bulb above, sneaking chocolate-chip cookies. They take turns dipping to nibble, then look up chewing. An 8 s
// seamless loop: every motion is periodic in LOOP. Song: added in the app at upload, never in our file.

const HEIGHT: Record<string, number> = { zhenya: 1.06, lusya: 1.0 };

/** a canvas texture drawn by fn, sampled with hard pixels */
function canvasTex(w: number, h: number, fn: (g: CanvasRenderingContext2D) => void, repeat = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  return t;
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

export const COOKIES_FPS = 30, LOOP = 8, COOKIES_FRAMES = LOOP * COOKIES_FPS;
const TAU = Math.PI * 2;
/** sound: 'full' = our own sound at -14 LUFS; 'clean' = quiet, to sit under the song added in the app */
export const Cookies: React.FC<{ sound?: 'full' | 'clean' | 'none'; look?: 'smooth' | 'pixel' }> = ({ look = 'smooth', sound = 'none' }) => {
  const setup = useCallback(async (ctx: LookContext) => {
    const lam = (map: THREE.Texture | null, color = '#ffffff') => { const m = new THREE.MeshLambertMaterial({ map, color }); return m; };
    // leaf wallpaper
    const paper = canvasTex(256, 256, (g) => {
      g.fillStyle = '#c4d0ee'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * 256, y = rnd() * 256, a = rnd() * 6.28, L = 16 + rnd() * 18;
        g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = rnd() < 0.5 ? '#3a54a8' : '#5a74c0';
        g.beginPath(); g.ellipse(0, 0, L, L * 0.28, 0, 0, 6.28); g.fill(); g.restore();
      }
    }, 7);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), lam(paper));
    wall.position.set(0, 1.4, -0.9); wall.receiveShadow = true;
    // a rumpled white bed / tablecloth
    const sheetG = new THREE.PlaneGeometry(6, 3, 30, 15).rotateX(-Math.PI / 2);
    const sp = sheetG.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setY(i, 0.03 * Math.sin(sp.getX(i) * 5 + sp.getZ(i) * 3) + 0.02 * Math.sin(sp.getX(i) * 11));
    sheetG.computeVertexNormals();
    const sheet = new THREE.Mesh(sheetG, lam(null, '#d8e2ff')); sheet.position.set(0, 0, 0.4); sheet.receiveShadow = true;
    // a plate of chocolate-chip cookies
    const cookieTex = canvasTex(64, 64, (g) => {
      g.fillStyle = '#d8a86a'; g.fillRect(0, 0, 64, 64);
      const rg = g.createRadialGradient(32, 32, 10, 32, 32, 34); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(120,60,20,0.55)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 420; i++) { g.fillStyle = rnd() < 0.5 ? '#e8bc80' : '#b07840'; g.fillRect(rnd() * 64, rnd() * 64, 1 + (rnd() < 0.3 ? 1 : 0), 1); }
      for (let i = 0; i < 14; i++) { const x = rnd() * 50 + 7, y = rnd() * 50 + 7; g.fillStyle = '#2a1208'; g.fillRect(x, y, 4 + rnd() * 3, 3 + rnd() * 3); g.fillStyle = '#5a2e18'; g.fillRect(x, y, 2, 1); }
    });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.03, 20), lam(null, '#d9dbe4'));
    plate.position.set(0, 0.03, 0.45); plate.receiveShadow = plate.castShadow = true;
    const cookies = [[-0.09, 0.06, 0.48, 0.2], [0.1, 0.06, 0.47, -0.1], [0.0, 0.1, 0.4, 0.5]].map(([x, y, z, r]) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 14), [lam(cookieTex, '#d8a070'), lam(cookieTex), lam(cookieTex)]);
      c.position.set(x, y, z); c.rotation.set(0.15, r, 0.1); c.castShadow = true; return c;
    });
    const cookieHome = cookies.map((c) => c.position.clone());
    ctx.scene.add(wall, sheet, plate, ...cookies);

    // the two cats, sitting behind the plate, heads leaning in to the cookies
    const cats = await Promise.all(['zhenya', 'lusya'].map(async (k) => {
      const rig = await loadRigged(staticFile(`characters/dc02/${k}.glb`), 1024, true);
      rig.root.scale.multiplyScalar(HEIGHT[k] / rig.height);
      rig.root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m?.emissive) m.emissive.set(0); (o as THREE.Mesh).castShadow = true; });
      ctx.applyLook(rig.root);
      ctx.scene.add(rig.root);
      return rig;
    }));
    const place = [[-0.15, -0.08, 0.35], [0.2, 0.0, -0.3]] as const;
    const fwd = new THREE.Vector3(1, 0, 0);
    // the bulb: a bright bloom-catching glass ball on a cord, and its warm light
    const bulbM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 1.1) });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), bulbM); bulb.position.set(0.5, 1.02, -0.7); bulb.scale.setScalar(0.65);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.2, 4), new THREE.MeshBasicMaterial({ color: '#202020' })); cord.position.set(0.5, 1.64, -0.7);
    const lampL = new THREE.PointLight("#ffc27a", 5, 6, 1.3); lampL.position.copy(bulb.position);
    const faceL = new THREE.PointLight('#ffe2b8', 3.5, 4, 1.5); faceL.position.set(0.45, 0.85, 1.3); faceL.intensity = 5; // the soft glow on their faces (black Lusya needs it)
    ctx.scene.add(faceL);
    ctx.scene.add(bulb, cord, lampL);
    // nibble: a cat dips its head to the plate and comes back up chewing; they take turns (half a loop apart)
    const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
    const nib = (t: number, at: number) => { const k = ((t - at) % LOOP + LOOP) % LOOP; return k < 1.6 ? Math.sin(Math.PI * k / 1.6) ** 2 : 0; };
    const chew = (t: number, at: number) => { const k = ((t - at) % LOOP + LOOP) % LOOP; return k > 1.2 && k < 3.4 ? Math.sin((k - 1.2) * TAU * 2.2) * 0.03 : 0; };
    return (fr: number) => {
      const t = (fr / COOKIES_FPS) % LOOP, ph = (t / LOOP) * TAU;
      ctx.mood('night');
      ctx.camera.position.set(0.03, 0.44, 2.2); ctx.camera.fov = 38; ctx.camera.updateProjectionMatrix();
      ctx.camera.updateMatrixWorld(); ctx.camera.lookAt(0.02, 0.5, 0.05);
      cats.forEach((rig, i) => {
        const [x, z, yaw] = place[i];
        const at = i ? 4.6 : 0.6, d = nib(t, at), h = HEIGHT[i ? 'lusya' : 'zhenya'];
        // the whole cat tips forward and toward the plate to nibble (the head alone stayed behind the body)
        rig.root.position.set(x, -0.42 * h + 0.08, z);
        rig.root.rotation.set(0.18 + 0.06 * d, yaw, 0);
        rig.root.updateMatrixWorld(true);
        rig.reset();
        const br = 0.02 * Math.sin(ph * 2 + i);
        rig.turn('LeftArm', Z, -1.42); rig.turn('LeftArm', X, -0.45); rig.turn('LeftForeArm', X, 0.05);
        rig.turn('RightArm', Z, 1.42); rig.turn('RightArm', X, -0.45); rig.turn('RightForeArm', X, 0.05);
        rig.turn('Spine', X, 0.08 + br);
        rig.turn('neck', X, 0.12 * d); rig.turn('Head', X, 0.08 * d + chew(t, at)); // a small nod into the bite, then chew
        rig.turn('Head', Y, (i ? 0.22 : -0.22) * (1 - d) + 0.04 * Math.sin(ph + i)); rig.turn('Head', Z, (i ? -0.15 : 0.18) * (1 - d));
        // the bite: this cat's cookie rises from the plate to its mouth (faces stay to the camera), then goes back
        rig.root.updateMatrixWorld(true);
        const hb = rig.bone('Head').getWorldPosition(new THREE.Vector3()), he = rig.bone('head_end').getWorldPosition(new THREE.Vector3());
        const sz = hb.distanceTo(he), mouth = hb.clone().add(new THREE.Vector3(i ? 0.01 : 0.035, i ? -0.07 : -0.045, 0)).add(ctx.camera.position.clone().sub(hb).setY(0).normalize().multiplyScalar(i ? 0.42 : 0.3)); // under the nose, in front of the fur (measured per cat: Lusya's fur is deeper)
        const ck = cookies[i], home = cookieHome[i], up = Math.min(1, d * 1.6);
        ck.position.copy(home).lerp(mouth, up);
        ck.rotation.set(0.15 + 1.25 * up, home.x > 0 ? -0.1 : 0.2, 0.1); ck.scale.setScalar(1 - 0.4 * up);
      });
      void fwd;
      ctx.sunFollow(new THREE.Vector3(0, 0.4, 0), { size: 3, az: 40, el: 38 });
      framingGate(ctx.camera, [{ name: 'Zhenya', rig: cats[0], minHead: 0.07 }, { name: 'Lusya', rig: cats[1], minHead: 0.07 }], fr);
    };
  }, []);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <LookStage setup={setup} style={look === 'pixel' ? 'cozy' : 'cozy-smooth'} />
      {sound !== 'none' && <Audio src={staticFile(`episodes/cookies/cookies_${sound}.wav`)} />}
    </AbsoluteFill>
  );
};
