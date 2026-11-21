import React, { useCallback } from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import * as THREE from 'three';
import { LookStage, type LookContext } from '../../engine/look/LookStage';
import { loadRigged } from '../../engine/rigged';
import { catPose } from '../dc02/act';

// Style lock test for the cozy (led3.an) look: two of our cats, Zhenya (orange) and Lusya (black), close up at a plate
// of cookies on a white bed against leaf wallpaper, a warm lamp key. Static camera, a slow breathe and head tilt.

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

export const CozyTest: React.FC = () => {
  const setup = useCallback(async (ctx: LookContext) => {
    const lam = (map: THREE.Texture | null, color = '#ffffff') => { const m = new THREE.MeshLambertMaterial({ map, color }); return m; };
    // leaf wallpaper
    const paper = canvasTex(256, 256, (g) => {
      g.fillStyle = '#dfe8f7'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * 256, y = rnd() * 256, a = rnd() * 6.28, L = 16 + rnd() * 18;
        g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = rnd() < 0.5 ? '#4a6aa8' : '#6a86bf';
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
    const sheet = new THREE.Mesh(sheetG, lam(null, '#f4f6ff')); sheet.position.set(0, 0, 0.4); sheet.receiveShadow = true;
    // a plate of chocolate-chip cookies
    const cookieTex = canvasTex(64, 64, (g) => {
      g.fillStyle = '#c8894a'; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 260; i++) { g.fillStyle = rnd() < 0.5 ? '#d9a060' : '#a8683a'; g.fillRect(rnd() * 64, rnd() * 64, 2, 2); }
      for (let i = 0; i < 9; i++) { g.fillStyle = '#3a1e14'; g.fillRect(rnd() * 56 + 4, rnd() * 56 + 4, 6, 5); }
    });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.03, 20), lam(null, '#fbfbf6'));
    plate.position.set(0, 0.03, 0.45); plate.receiveShadow = plate.castShadow = true;
    const cookies = [[-0.09, 0.06, 0.48, 0.2], [0.1, 0.06, 0.47, -0.1], [0.0, 0.1, 0.4, 0.5]].map(([x, y, z, r]) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 14), [lam(cookieTex, '#d8a070'), lam(cookieTex), lam(cookieTex)]);
      c.position.set(x, y, z); c.rotation.set(0.15, r, 0.1); c.castShadow = true; return c;
    });
    ctx.scene.add(wall, sheet, plate, ...cookies);

    // the two cats, sitting behind the plate, heads leaning in to the cookies
    const cats = await Promise.all(['zhenya', 'lusya'].map(async (k) => {
      const rig = await loadRigged(staticFile(`characters/dc02/${k}.glb`), 512, true);
      rig.root.scale.multiplyScalar(HEIGHT[k] / rig.height);
      rig.root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m?.emissive) m.emissive.set(0); (o as THREE.Mesh).castShadow = true; });
      ctx.applyLook(rig.root);
      ctx.scene.add(rig.root);
      return rig;
    }));
    const place = [[-0.24, -0.1, 0.35], [0.26, -0.14, -0.3]] as const;
    const fwd = new THREE.Vector3(1, 0, 0);
    return (fr: number) => {
      const t = fr / 30;
      ctx.mood('day');
      cats.forEach((rig, i) => {
        const [x, z, yaw] = place[i];
        rig.root.position.set(x, -0.42 * HEIGHT[i ? 'lusya' : 'zhenya'] + 0.08, z);
        rig.root.rotation.set(0.18, yaw, 0); // leaning forward over the plate
        rig.root.updateMatrixWorld(true);
        catPose(rig, t, { hug: 0.55, ph: i * 2, rate: 0.3, kick: 0, look: (i ? 0.25 : -0.25) + 0.05 * Math.sin(t * 0.8 + i), tilt: (i ? -0.18 : 0.2) });
      });
      void fwd;
      ctx.camera.position.set(0, 0.62, 2.7); ctx.camera.fov = 34; ctx.camera.updateProjectionMatrix();
      ctx.camera.lookAt(0, 0.38, 0);
      ctx.sunFollow(new THREE.Vector3(0, 0.4, 0), { size: 3, az: 40, el: 38 });
    };
  }, []);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <LookStage setup={setup} style="cozy" />
    </AbsoluteFill>
  );
};
