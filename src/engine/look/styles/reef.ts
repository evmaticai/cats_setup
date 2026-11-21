import { type LookPreset, type Mood } from '../types';

// Style: reef. Dive Cats 2: a sunny tropical reef in the "high vibe" PS1 look of the led3.an cat Shorts
// (chunky pixels ~360 px high, a visible ordered-dither dot screen, hard pixel textures, warm saturated sun,
// crisp pixel shadows). The "sky" is the water: bright cyan toward the surface, deep blue at the horizon,
// so fog = horizon colour dissolves the reef into blue.

const day: Mood = {
  sky: { zenith: '#9af4ff', horizon: '#22a6cc', ground: '#0e6488' },
  fog: { near: 8, far: 58 },
  sun: { color: '#fff3d6', intensity: 2.5, az: 30, el: 66 },
  hemi: { sky: '#aef6ff', ground: '#f0cf96', intensity: 1.15 },
  rim: 0,
  exposure: 1.0,
  bloom: { threshold: 9, intensity: 0 },
  grade: { saturation: 1.22, contrast: 1.06, lift: [0.0, 0.01, 0.02], gain: [1.03, 1.0, 0.97] },
  vignette: 0,
  aoColor: '#000000',
};
const deep: Mood = { ...day, sky: { zenith: '#4cc0e0', horizon: '#0f6390', ground: '#06304a' }, fog: { near: 5, far: 40 } };
// v3 reuses the two spare mood slots: golden = the abyss at 30 m (Zhenya's dive), night = inside the cave (Lusya)
const abyss: Mood = {
  ...day, sky: { zenith: '#1f78a8', horizon: '#06365e', ground: '#020f22' }, fog: { near: 2, far: 24 },
  sun: { ...day.sun, color: '#bfe8ff', intensity: 0.55 }, hemi: { sky: '#5aa8d8', ground: '#0a2a48', intensity: 0.45 },
  grade: { ...day.grade, saturation: 1.0 },
};
const cave: Mood = { ...day, fog: { near: 6, far: 40 }, hemi: { sky: '#3a6a80', ground: '#2a2018', intensity: 0.12 } };
void deep;

export const LOOK: LookPreset = {
  id: 'reef', label: 'Reef PS1 (Dive Cats 2)', material: 'ps1', envIntensity: 0, shadowRadius: 1,
  ao: null, ink: null, dof: null, ps1: true, ps1H: 400, ditherLevels: 12, stepFrames: 1,
  matParams: { snap: 220 },
  moods: { day, golden: abyss, night: cave },
};
