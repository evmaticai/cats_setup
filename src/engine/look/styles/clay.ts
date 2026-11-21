import { golden, night, type LookPreset, type Mood } from '../types';

// Style: clay. Clay stop-motion diorama: softbox light, strong contact AO, warm, shallow miniature focus.
// Owned by this style's bake-off agent: tune values here only (materials knobs via matParams).

const day: Mood = {
  sky: { zenith: '#6f9fd8', horizon: '#f6cfa0', ground: '#a88a6a' },
  fog: { near: 80, far: 420 },
  sun: { color: '#ffe2bd', intensity: 3.4, az: 28, el: 36 },
  hemi: { sky: '#cfdcf5', ground: '#b08a66', intensity: 1.1 },
  rim: 1.4,
  exposure: 1.05,
  bloom: { threshold: 0.9, intensity: 0.35 },
  grade: { saturation: 1.12, contrast: 1.15, lift: [0.025, 0.015, 0.005], gain: [1.03, 1.0, 0.95] },
  vignette: 0.5,
  aoColor: '#2a160c',
};

export const LOOK: LookPreset = {
  id: 'clay', label: 'Clay stop-motion diorama', material: 'clay', envIntensity: 0.6, shadowRadius: 9,
  ao: { radius: 0.6, falloff: 1.0, intensity: 4.5 },
  ink: null, dof: { bokeh: 28, range: 0.9 }, ps1: false, stepFrames: 2,
  tiltShift: { band: 0.34, strength: 7, y: 0.5 },
  matParams: { roughness: 0.9, saturation: 1.15, normalScale: 0.24, sheen: 0.3, emissiveBoost: 1, smooth: true, boil: 1 },
  moods: { day: day, golden: golden(day), night: night(day) },
};
