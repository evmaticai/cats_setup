import { type LookPreset } from '../types';
import { LOOK as reef } from './reef';

// Style: reef-smooth. Dive Cats 2 in the Dive Cats 1 look (Blender-like): full resolution, smooth shading, soft
// shadows and contact AO, gentle saturation, crisp textures; no PS1 pixels, dither or vertex snap. Same moods as
// `reef` (day, abyss, cave), softened.
const soft = (m: (typeof reef.moods)['day']) => ({
  ...m,
  grade: { ...m.grade, saturation: 1.22, contrast: 1.14 },
  exposure: m.exposure * 0.82,
  bloom: { threshold: 1.0, intensity: 0.25 },
  vignette: 0.15,
  aoColor: '#0a2a40',
});

export const LOOK: LookPreset = {
  id: 'reef-smooth', label: 'Reef smooth (Dive Cats 1 look)', material: 'standard', envIntensity: 0.55, shadowRadius: 3,
  ao: { radius: 0.5, falloff: 1.0, intensity: 1.6 },
  ink: null, dof: null, ps1: false, stepFrames: 1,
  matParams: { roughness: 0.8 },
  moods: { day: soft(reef.moods.day), golden: soft(reef.moods.golden), night: soft(reef.moods.night) },
};
