import React, { useCallback } from 'react';
import { staticFile } from 'remotion';
import * as THREE from 'three';
import { LookStage, type LookContext } from '../engine/look/LookStage';
import { loadRigged } from '../engine/rigged';

// Casting sheet: every rigged GLB in public/characters in one frame, front view, polished style.
export const LINEUP = ['anime_girl', 'bombit', 'hrunsday', 'ivan', 'jason', 'khrapych', 'kipish', 'lucia', 'mell', 'natashka',
  'recruiter', 'shlemych', 'shredder', 'smith', 'squid_guard'];

/** names: a cast to check instead of LINEUP (pass with --props); posed: a second row with the test poses */
export const CharLineup: React.FC<{ names?: string[]; posed?: boolean }> = ({ names = LINEUP, posed = false }) => {
  const LINEUP_ = names;
  const setup = useCallback(async (ctx: LookContext) => {
    const { scene, camera } = ctx;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: '#b8b8b0' }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    ctx.applyLook(ground);
    const cols = 5;
    const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
    for (let r = 0; r < (posed ? 2 : 1); r++) for (let i = 0; i < LINEUP_.length; i++) {
      const rig = await loadRigged(staticFile(`characters/${LINEUP_[i]}.glb`), 512, true);
      rig.root.scale.setScalar(1.75 / rig.height);
      const row = Math.floor(i / cols) + r * Math.ceil(LINEUP_.length / cols);
      rig.root.position.set(((i % cols) - (cols - 1) / 2) * 1.3, 0, -row * 2.2);
      if (r === 1) { // test poses: left arm up, left knee bent, right forearm bent, head turned
        rig.turn('LeftArm', Z, 1.2); rig.turn('LeftLeg', X, 1.0); rig.turn('RightForeArm', Y, -1.2); rig.turn('Head', Y, 0.6);
      }
      scene.add(rig.root);
      ctx.applyLook(rig.root);
    }
    return () => {
      camera.fov = 30; camera.updateProjectionMatrix();
      camera.position.set(0, 4.5, 11);
      camera.lookAt(0, 0.6, -2.2);
      ctx.sunFollow(new THREE.Vector3(0, 0, -2));
      ctx.mood('day');
    };
  }, [LINEUP_, posed]);
  return <LookStage setup={setup} style="polished-game" />;
};
