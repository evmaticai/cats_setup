import { type LookPreset } from '../types';
import { LOOK as cozy } from './cozy';

// Style: cozy-smooth. The paw-cats house look since 2026-11-21 (the user's pick): the Dive Cats 1 look (smooth,
// full resolution, soft shadows, contact AO, crisp textures, saturated but clean) with the cozy moods
// (day = sunny room/meadow, golden = evening lamp, night = a dark room with one warm lamp). No PS1 pixels or dither.
const soft = (m: (typeof cozy.moods)['day']) => ({
  ...m,
  exposure: m.exposure * 0.82,
  grade: { ...m.grade, saturation: 1.18, contrast: 1.12 },
  bloom: { threshold: 1.0, intensity: 0.3 },
  vignette: 0.18,
  aoColor: '#2a1a14',
});

export const LOOK: LookPreset = {
  id: 'cozy-smooth', label: 'Cozy smooth (paw-cats house look)', material: 'standard', envIntensity: 0.55, shadowRadius: 3,
  ao: { radius: 0.4, falloff: 1.0, intensity: 1.6 },
  ink: null, dof: null, ps1: false, stepFrames: 1,
  matParams: { roughness: 0.8 },
  moods: { day: soft(cozy.moods.day), golden: soft(cozy.moods.golden), night: soft(cozy.moods.night) },
};
