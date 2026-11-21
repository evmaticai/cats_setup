// LookStage preset types + mood helpers. Each style lives in its own file in ./styles/ (one owner per file).

export type RGB = [number, number, number];

export type Mood = {
  sky: { zenith: string; horizon: string; ground: string };
  fog: { near: number; far: number }; // linear fog in metres, coloured by the sky horizon
  sun: { color: string; intensity: number; az: number; el: number }; // degrees; az 0 = from +Z (camera side)
  hemi: { sky: string; ground: string; intensity: number };
  rim: number; // back-light intensity (0 = none), colour follows the sun
  bounce?: number; // soft camera-side fill (no shadow), warm: fronts read while the sun keeps the shadows
  exposure: number;
  bloom: { threshold: number; intensity: number };
  grade: { saturation: number; contrast: number; lift: RGB; gain: RGB; shadowSat?: number }; // shadowSat: saturation multiplier in the darks (1 = off)
  vignette: number; // darkness
  aoColor: string;
};

export type MaterialKind = 'standard' | 'toon' | 'flat' | 'clay' | 'ps1';

export type MatParams = {
  roughness?: number; // standard/flat/clay base roughness
  saturation?: number; // multiply source colour saturation (flat default 1.2)
  rampDark?: number; // toon: shadow step level 0-255 (default 90)
  rampSteps?: number; // toon: 2 or 3 steps
  normalScale?: number; // clay fingerprints strength (default 0.35)
  smooth?: boolean; // re-compute smooth normals on faceted meshes (soft sculpted forms)
  boil?: number; // clay: per-animFrame jitter of the fingerprint map (stop-motion boil), 0..1
  snap?: number; // ps1: vertex snapping to an N-pixel-high grid (e.g. 240); 0 = off
  keepSpecular?: boolean; // standard: keep the source roughness/metalness of shiny parts (brass, glass)
  grime?: number; // world-space value noise + per-object tint jitter on set materials (0.08-0.15); never on characters
  sheen?: number; // clay sheen (default 0.4)
  emissiveBoost?: number; // multiply emissive intensity of source materials
};

export type LookPreset = {
  id: StyleId;
  label: string;
  material: MaterialKind;
  envIntensity: number;
  shadowRadius: number;
  ao: { radius: number; falloff: number; intensity: number } | null;
  ink: { color: string; width: number } | null; // width in px at 1920 high
  dof: { bokeh: number; range?: number } | null; // max bokeh scale (scenes set strength per shot) + in-focus depth range in m (default 3)
  /** screen-space tilt-shift band (miniature look); applies on every shot, independent of DOF strength */
  tiltShift?: { band: number; strength: number; y?: number };
  ps1: boolean; // render tiny + 15-bit Bayer dither + hard pixels
  /** ps1: render height in px (default 711) and dither levels per channel (default 31; fewer = a coarser dot screen) */
  ps1H?: number;
  ditherLevels?: number;
  /** ps1 only: camcorder post on the tiny frame: bloom (mood bloom values), a vignette (mood vignette), colour fringing in px */
  ps1Post?: { bloom?: boolean; vignette?: boolean; fringe?: number };
  stepFrames: 1 | 2; // characters animate on ones or twos (camera always on ones)
  /** tone curve in the composer (default ACES); V2 asks for Neutral */
  toneMapping?: 'aces' | 'neutral' | 'agx';
  /** material knobs read by materials.ts (all optional) */
  matParams?: MatParams;
  moods: Record<MoodId, Mood>;
};

export type MoodId = 'day' | 'golden' | 'night';
export const STYLE_IDS = ['toon-ink', 'bright-blocky', 'polished-game', 'ps1', 'clay', 'reef', 'reef-hi', 'cozy', 'reef-smooth', 'cozy-smooth'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const m = (base: Mood, over: Partial<Mood> = {}): Mood => ({ ...base, ...over });


export const golden = (base: Mood, extra: Partial<Mood> = {}): Mood => m(base, {
  sky: { zenith: '#6a4f8c', horizon: '#ffd08a', ground: base.sky.ground },
  sun: { color: '#ffc984', intensity: base.sun.intensity * 1.35, az: base.sun.az + 120, el: 10 },
  hemi: { sky: '#8f7fd8', ground: '#7a5a3a', intensity: base.hemi.intensity * 1.2 },
  bloom: { threshold: base.bloom.threshold, intensity: base.bloom.intensity * 1.4 },
  aoColor: '#3a2a5a',
  ...extra,
});

export const night = (base: Mood, extra: Partial<Mood> = {}): Mood => m(base, {
  sky: { zenith: '#0e1a3e', horizon: '#2b3f78', ground: '#1a2238' },
  sun: { color: '#a9c0ff', intensity: base.sun.intensity * 0.5, az: base.sun.az, el: 35 },
  hemi: { sky: '#5b72b8', ground: '#2a3a5c', intensity: base.hemi.intensity * 0.5 }, // night: the moon and the practicals make the shadows
  bloom: { threshold: base.bloom.threshold * 0.8, intensity: base.bloom.intensity * 2 },
  vignette: base.vignette + 0.12,
  bounce: (base.bounce ?? 0) * 0.3,
  aoColor: '#10141e',
  ...extra,
});
