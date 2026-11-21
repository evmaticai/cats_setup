import { golden, night, type LookPreset, type Mood } from '../types';

// Style: bright-blocky. V3 (blocky shorts): bright, never grey, strong rim, bloom on neon, packed sets.
// Owned by this style's bake-off agent: tune values here only (materials knobs via matParams).

const day: Mood = {
  sky: { zenith: '#2a5fd6', horizon: '#7fb4f2', ground: '#5aa84a' },
  fog: { near: 60, far: 520 },
  sun: { color: '#ffe2b0', intensity: 2.0, az: 40, el: 42 },
  hemi: { sky: '#94bcff', ground: '#ff9a62', intensity: 2.6 },
  rim: 3.4,
  exposure: 1.3,
  bloom: { threshold: 1.2, intensity: 1.0 },
  grade: { saturation: 1.38, contrast: 1.02, lift: [0.012, 0.008, 0.024], gain: [1.0, 0.98, 0.96] },
  vignette: 0.3,
  aoColor: '#2a1a48',
};

export const LOOK: LookPreset = {
  id: 'bright-blocky', label: 'Bright blocky (V3)', material: 'flat', envIntensity: 1.4, shadowRadius: 4,
  ao: { radius: 0.7, falloff: 1.0, intensity: 1.8 },
  ink: null, dof: null, ps1: false, stepFrames: 1,
  matParams: { roughness: 0.52, saturation: 1.2, emissiveBoost: 1.3 },
  moods: {
    day: day, golden: golden(day),
    night: night(day, { sky: { zenith: '#1a0f3a', horizon: '#5a2a8a', ground: '#201436' } }),
  },
};
