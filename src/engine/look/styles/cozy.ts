import { type LookPreset, type Mood } from '../types';

// Style: cozy. Paw and Friends cat shorts in the led3.an look: photo-textured low-poly cats rendered tiny (~280 px
// high) and blown up with hard square pixels, a strong warm key light whose highlights bloom and clip to white, a
// soft vignette and purple/green colour fringing at the edges; very little dither. day = a warm sunny room or meadow,
// golden = evening lamp light, night = a dark room lit by one lamp.
const day: Mood = {
  sky: { zenith: '#7fc4ff', horizon: '#dff1ff', ground: '#b9a98a' },
  fog: { near: 18, far: 90 },
  sun: { color: '#fff1d8', intensity: 4.2, az: 35, el: 42 },
  hemi: { sky: '#d8ecff', ground: '#c8a888', intensity: 1.35 },
  rim: 0.6,
  exposure: 1.25,
  bloom: { threshold: 0.72, intensity: 1.15 },
  grade: { saturation: 1.3, contrast: 1.12, lift: [0.02, 0.01, 0.03], gain: [1.06, 1.0, 0.95] },
  vignette: 0.45,
  aoColor: '#000000',
};
const golden: Mood = { ...day, sky: { zenith: '#6f9fe0', horizon: '#ffc590', ground: '#c89a6a' }, sun: { color: '#ffc98a', intensity: 4.6, az: 60, el: 18 }, hemi: { sky: '#ffd9b0', ground: '#7a5a48', intensity: 1.0 },
  grade: { ...day.grade, gain: [1.12, 0.98, 0.86] } };
const night: Mood = { ...day, sky: { zenith: '#1a2240', horizon: '#3a3a5a', ground: '#141018' }, fog: { near: 10, far: 40 },
  sun: { color: '#ffc890', intensity: 2.2, az: 20, el: 30 }, hemi: { sky: '#4a5a90', ground: '#2a2028', intensity: 0.55 }, exposure: 1.0, bloom: { threshold: 0.8, intensity: 1.2 }, vignette: 0.65,
  grade: { saturation: 1.25, contrast: 1.15, lift: [0.0, 0.01, 0.05], gain: [0.98, 0.99, 1.04] } };

export const LOOK: LookPreset = {
  id: 'cozy', label: 'Cozy PS1 camcorder (led3.an)', material: 'ps1', envIntensity: 0, shadowRadius: 1,
  ao: null, ink: null, dof: null, ps1: true, ps1H: 210, ditherLevels: 0, stepFrames: 1,
  ps1Post: { bloom: true, vignette: true, fringe: 1.2 },
  matParams: { snap: 160 },
  moods: { day, golden, night },
};
