import { golden, night, type LookPreset, type Mood } from '../types';

// Style: ps1. House PS1 baseline: flat Lambert, no post beyond the dither.
// Owned by this style's bake-off agent: tune values here only (materials knobs via matParams).

const day: Mood = {
  // morning: deep blue zenith over a warm haze; PS1 distance fog melts the street into it
  sky: { zenith: '#6aa8e8', horizon: '#f8e4b8', ground: '#6a5a40' },
  fog: { near: 18, far: 85 },
  // warm morning sun from front-right, high enough to clear the office side walls; lights the street's left facades
  sun: { color: '#ffe0b0', intensity: 2.6, az: 28, el: 40 },
  hemi: { sky: '#c4cce0', ground: '#7a5a40', intensity: 1.15 },
  rim: 0,
  exposure: 1.15,
  bloom: { threshold: 9, intensity: 0 },
  grade: { saturation: 1, contrast: 1, lift: [0, 0, 0], gain: [1, 1, 1] },
  vignette: 0,
  aoColor: '#000000',
};

export const LOOK: LookPreset = {
  id: 'ps1', label: 'PS1 low-poly (baseline)', material: 'ps1', envIntensity: 0, shadowRadius: 1,
  ao: null, ink: null, dof: null, ps1: true, stepFrames: 2,
  matParams: { snap: 240 },
  moods: { day: day, golden: golden(day, { bloom: day.bloom }), night: night(day, { bloom: day.bloom }) },
};
