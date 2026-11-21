import React, { useCallback } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { LookStage, type LookContext } from '../../engine/look/LookStage';
import { buildReef } from './reef';
import { catchFish } from './catchfish';

export const CATCH: Record<string, [string, number]> = { yeji: ['tiny', 0.28], silent: ['puffer', 0.45], paw: ['barracuda', 1.1], lusya: ['grouper', 1.0], zhenya: ['tuna', 1.4], franko: ['shark', 3.4] };
import { KEYS, bodyAxes, loadCat, swimPose, swimRoot, type Cat } from './cast';

// Dive Cats 2 gear and swim check: the six cats swim left to right in a staggered line over the reef, each with
// the fitted mask and the toy speargun held forward. shot 0 = side line-up, 1 = 3/4 close on Paw, 2 = from below-front.

export type CastProps = { shot: number };
export const CastTest: React.FC<CastProps> = ({ shot }) => {
  const setup = useCallback(async (ctx: LookContext) => {
    const reef = buildReef();
    ctx.scene.add(reef.group);
    const cats: Cat[] = [];
    for (const k of KEYS) cats.push(await loadCat(ctx, k));
    const fwd = new THREE.Vector3(), up = new THREE.Vector3();
    // shot 3: each cat on the left of its row, its catch on the right, Yeji at the top to Franko at the bottom
    const rowY = (i: number) => 8.6 - i * 1.25 - (i === 5 ? 0.25 : 0);
    const catches = KEYS.map((k, i) => {
      const [sp, len] = CATCH[k];
      const fs = catchFish(sp, len);
      fs.root.position.set(0.3 + len * 0.5, rowY(i) - (i === 5 ? 0.4 : 0), 0);
      fs.root.rotation.y = Math.PI; // facing its cat
      fs.root.visible = shot === 3;
      ctx.scene.add(fs.root);
      return fs;
    });
    return (f: number) => {
      const t = f / 30;
      reef.update(t);
      ctx.mood('day');
      cats.forEach((c, i) => {
        const p = shot === 3 ? new THREE.Vector3(-1.4 - c.height * 0.6, rowY(i) - 0.15, 0) : new THREE.Vector3(-4.2 + i * 1.6 + t * 0.6, 2.2 + (i % 2) * 0.5, 1.5 - (i % 2) * 0.6);
        swimRoot(c.rig, p, new THREE.Vector3(1, 0, 0), t + i * 0.3);
        swimPose(c.rig, t, { ph: i * 1.3 });
        bodyAxes(c.rig, fwd, up);
        c.hold(fwd, up);
      });
      const paw = cats[2].rig.root.position;
      const views = [
        { p: new THREE.Vector3(0.6 + t * 0.6, 2.3, 9.5), l: new THREE.Vector3(0.6 + t * 0.6, 2.2, 0), fov: 44 },
        { p: paw.clone().add(new THREE.Vector3(1.6, 0.5, 1.7)), l: paw.clone().add(new THREE.Vector3(0.35, 0.05, 0)), fov: 40 },
        { p: paw.clone().add(new THREE.Vector3(2.0, -0.9, 0.6)), l: paw.clone().add(new THREE.Vector3(0.3, 0.1, 0)), fov: 42 },
        { p: new THREE.Vector3(0.2, 5.4, 12.5), l: new THREE.Vector3(0.2, 5.3, 0), fov: 40 },
      ][shot];
      ctx.camera.position.copy(views.p); ctx.camera.fov = views.fov; ctx.camera.updateProjectionMatrix(); ctx.camera.lookAt(views.l);
      ctx.sunFollow(views.l, { size: 14 });
    };
  }, [shot]);
  return <AbsoluteFill style={{ backgroundColor: '#000' }}><LookStage setup={setup} style="reef" /></AbsoluteFill>;
};
