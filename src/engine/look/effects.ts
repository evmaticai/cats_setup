import * as THREE from 'three';
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';

// V2 ink: near-black lines on depth jumps and normal creases, in its own pass before any blur.
const inkFrag = /* glsl */ `
uniform sampler2D normalBuffer;
uniform vec3 inkColor;
uniform float width;
float vz(vec2 p) { return getViewZ(readDepth(p)); }
vec3 nrm(vec2 p) { return texture2D(normalBuffer, p).xyz * 2.0 - 1.0; }
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec2 o = texelSize * width;
  float z = vz(uv);
  float dz = abs(vz(uv - vec2(o.x, 0.0)) - z) + abs(vz(uv + vec2(o.x, 0.0)) - z)
           + abs(vz(uv - vec2(0.0, o.y)) - z) + abs(vz(uv + vec2(0.0, o.y)) - z);
  dz /= max(abs(z), 1e-3);                                   // relative jump: same weight near and far
  vec3 n = nrm(uv);
  float dn = 4.0 - dot(n, nrm(uv - vec2(o.x, 0.0))) - dot(n, nrm(uv + vec2(o.x, 0.0)))
                 - dot(n, nrm(uv - vec2(0.0, o.y))) - dot(n, nrm(uv + vec2(0.0, o.y)));
  float e = max(smoothstep(0.06, 0.14, dz), smoothstep(0.5, 0.9, dn));
  outputColor = vec4(mix(inputColor.rgb, inkColor, e), inputColor.a);
}`;

export class InkEffect extends Effect {
  constructor(normalBuffer: THREE.Texture, color: string, width: number) {
    super('InkEffect', inkFrag, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['normalBuffer', new THREE.Uniform(normalBuffer)],
        ['inkColor', new THREE.Uniform(new THREE.Color(color))],
        ['width', new THREE.Uniform(width)],
      ]),
    });
  }
}

// V1 racing grade (after ACES, linear): S-curve around mid-grey, lift/gain, saturation.
const gradeFrag = /* glsl */ `
uniform float saturation; uniform float contrast; uniform vec3 lift; uniform vec3 gain; uniform float shadowSat;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
  c = 0.18 * exp2(log2(max(c, vec3(1e-5)) / 0.18) * contrast);
  c = c * gain + lift * (1.0 - c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  outputColor = vec4(mix(vec3(l), c, saturation * mix(shadowSat, 1.0, smoothstep(0.02, 0.4, l))), inputColor.a);
}`;

export class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', gradeFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['saturation', new THREE.Uniform(1)], ['contrast', new THREE.Uniform(1)],
        ['lift', new THREE.Uniform(new THREE.Vector3())], ['gain', new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ['shadowSat', new THREE.Uniform(1)],
      ]),
    });
  }
  set(g: { saturation: number; contrast: number; lift: number[]; gain: number[]; shadowSat?: number }) {
    const u = this.uniforms;
    u.get('saturation')!.value = g.saturation;
    u.get('contrast')!.value = g.contrast;
    (u.get('lift')!.value as THREE.Vector3).fromArray(g.lift);
    (u.get('gain')!.value as THREE.Vector3).fromArray(g.gain);
    u.get('shadowSat')!.value = g.shadowSat ?? 1;
  }
}

// PS1: 15-bit colour with a 4x4 Bayer dither, quantised in sRGB like the old Ps1Stage.
const ditherFrag = /* glsl */ `
const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
uniform float levels;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = toSrgb(clamp(inputColor.rgb, 0.0, 1.0));
  ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
  c = floor(clamp(c + (BAYER[p.y * 4 + p.x] / 16.0 - 0.5) / levels, 0.0, 1.0) * levels + 0.5) / levels;
  outputColor = vec4(toLin(c), inputColor.a);
}`;

export class DitherEffect extends Effect {
  constructor(levels = 31) {
    super('DitherEffect', ditherFrag, { blendFunction: BlendFunction.NORMAL, uniforms: new Map([['levels', new THREE.Uniform(levels)]]) });
  }
}

// Tilt-shift: blur grows with distance from a horizontal focus band (miniature look). Convolution → its own pass.
const tiltFrag = /* glsl */ `
uniform float band; uniform float strength; uniform float focusY;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float d = max(0.0, abs(uv.y - focusY) - band * 0.5);
  float r = strength * smoothstep(0.0, 0.35, d);
  if (r < 0.5) { outputColor = inputColor; return; }
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 2.399963;             // golden-angle spiral
    float rr = sqrt((float(i) + 0.5) / 16.0) * r;
    vec2 o = vec2(cos(a), sin(a)) * rr * texelSize;
    acc += texture2D(inputBuffer, uv + o).rgb; wsum += 1.0;
  }
  outputColor = vec4(acc / wsum, inputColor.a);
}`;

export class TiltShiftBand extends Effect {
  constructor(band: number, strengthPx: number, focusY = 0.45) {
    super('TiltShiftBand', tiltFrag, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['band', new THREE.Uniform(band)], ['strength', new THREE.Uniform(strengthPx)], ['focusY', new THREE.Uniform(focusY)],
      ]),
    });
  }
}
