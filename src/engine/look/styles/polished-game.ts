import { golden, night, type LookPreset, type Mood } from '../types';

// Style: polished-game. V1 (Opus game builds, racing XHigh + TD presets): ACES, tinted AO, gentle S-curve, warm key / cool sky.
// Owned by this style's bake-off agent: tune values here only (materials knobs via matParams).

const day: Mood = {
  sky: { zenith: '#3a7ad6', horizon: '#d6e2ec', ground: '#8c7a66' },
  fog: { near: 20, far: 260 },
  // low morning sun from front-right: rakes into the open office front, lights the office-side facades
  sun: { color: '#ffe0b4', intensity: 3.2, az: 45, el: 40 },
  hemi: { sky: '#b4ccf5', ground: '#a07454', intensity: 1.05 },
  rim: 1.0,
  exposure: 1.06,
  bloom: { threshold: 1.0, intensity: 0.5 },
  grade: { saturation: 1.0, contrast: 1.12, lift: [0.006, 0.004, 0.009], gain: [1.03, 0.99, 0.97] },
  vignette: 0.4,
  aoColor: '#2a1208',
};

export const LOOK: LookPreset = {
  id: 'polished-game', label: 'Polished game (V1)', material: 'standard', envIntensity: 0.7, shadowRadius: 2.5,
  ao: { radius: 0.6, falloff: 1.0, intensity: 2.6 },
  ink: null, dof: { bokeh: 3 }, ps1: false, stepFrames: 1,
  matParams: { roughness: 0.72 },
  moods: { day: day, golden: golden(day), night: night(day) },
};
