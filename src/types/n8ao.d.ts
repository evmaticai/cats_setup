// n8ao ships no TypeScript types; this covers the parts LookStage uses.
declare module 'n8ao' {
  import type { Camera, Color, Scene } from 'three';
  import type { Pass } from 'postprocessing';
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: {
      aoRadius: number; distanceFalloff: number; intensity: number; color: Color;
      halfRes: boolean; accumulate: boolean; gammaCorrection: boolean;
      transparencyAware: boolean; autoDetectTransparency: boolean; [k: string]: unknown;
    };
    setQualityMode(mode: 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra'): void;
  }
}
