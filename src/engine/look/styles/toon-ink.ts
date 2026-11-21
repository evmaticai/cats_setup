import { golden, night, type LookPreset, type Mood } from '../types';

// Style: toon-ink. V2 (Ricks Clips): saturated, no pure black, violet-blue shade, ink on the world, blur on CU/MS.
// Owned by this style's bake-off agent: tune values here only (materials knobs via matParams).

const day: Mood = {
  sky: { zenith: '#3672c4', horizon: '#86a6d8', ground: '#7f9a5a' }, // a deeper morning sky keeps the street wides in range
  fog: { near: 25, far: 420 },
  // low morning key from screen-left, slightly behind (cameras look toward -Z): shadows rake across the frame,
  // and the sun comes through the office's side window as a pool on the counter and the operator (ts01 audit, tier 1)
  sun: { color: '#ffe0b0', intensity: 3.6, az: 35, el: 13 }, // front-right, low: characters and props throw their shadows onto the wall and counter behind them
  hemi: { sky: '#d6dcef', ground: '#a07a5a', intensity: 1.7 },
  rim: 1.5,
  bounce: 1.1,
  exposure: 1.02,
  bloom: { threshold: 1.3, intensity: 0.45 },
  grade: { saturation: 0.95, contrast: 1.15, lift: [0.008, 0.006, 0.014], gain: [1.02, 1.0, 0.97], shadowSat: 0.82 },
  vignette: 0.32,
  aoColor: '#3a2840',
};

export const LOOK: LookPreset = {
  id: 'toon-ink', label: 'Toon-ink (V2)', material: 'toon', envIntensity: 0.2, shadowRadius: 3,
  ao: { radius: 0.45, falloff: 1.0, intensity: 2.2 },
  ink: { color: '#120e18', width: 3.0 },
  dof: { bokeh: 10 }, ps1: false, stepFrames: 1, toneMapping: 'neutral',
  matParams: { rampDark: 62, rampSteps: 3, emissiveBoost: 1.3, grime: 0.12 },
  moods: { day: day, golden: golden(day, { sun: { color: '#ffc984', intensity: 5.2, az: -165, el: 9 } }), night: night(day) },
};
