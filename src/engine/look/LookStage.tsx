import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import {
  BloomEffect, DepthOfFieldEffect, EffectComposer, EffectPass, NormalPass, RenderPass,
  ChromaticAberrationEffect, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import type { StageContext } from '../Ps1Stage';
import { LOOKS, type LookPreset, type Mood, type MoodId, type StyleId } from './presets';
import { DitherEffect, GradeEffect, InkEffect, TiltShiftBand } from './effects';
import { applyLook, fingerprints } from './materials';

// LookStage: the three-shorts renderer. One stage, five style presets (src/engine/look/presets.ts).
// Every pixel is a pure function of the frame: composer.render(0), no accumulation, no wall clock.

export type LookContext = StageContext & {
  renderer: THREE.WebGLRenderer;
  look: LookPreset;
  /** Swap materials under root to this style (call once per loaded object). */
  applyLook: (root: THREE.Object3D) => void;
  /** Light/fog/grade for this frame: one mood, or a lerp a→b by k. */
  mood: (a: MoodId, b?: MoodId, k?: number) => void;
  /** Depth of field: keep `target` sharp; strength 0 (wides) to 1 (CU). No-op in styles without DOF. */
  focus: (target: THREE.Vector3 | null, strength?: number) => void;
  /** Centre of the sun's shadow box (texel-snapped so shadows don't shimmer while the camera moves), plus per-shot
   *  overrides: az/el (degrees, world: az 0 = from +Z), box half-size in m (default 20), fill multiplier for the sky light. */
  sunFollow: (center: THREE.Vector3, o?: SunShot) => void;
  /** The frame characters should pose at (twos in the clay style; the camera stays on ones). */
  animFrame: (frame: number) => number;
};
export type SunShot = { az?: number; el?: number; size?: number; fill?: number };
export type LookSetup = (ctx: LookContext) => Promise<(frame: number) => void>;

const PS1_H = 711; // the PS1 baseline renders tiny and scales up with hard pixels

const skyVert = /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const skyFrag = /* glsl */ `
uniform vec3 zenith; uniform vec3 horizon; uniform vec3 ground; varying vec3 vDir;
void main() {
  float y = vDir.y;
  vec3 c = y > 0.0 ? mix(horizon, zenith, pow(y, 0.6)) : mix(horizon, ground, pow(-y, 0.4));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

function makeSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() } },
    vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), mat);
  mesh.userData.noLook = true;
  mesh.frustumCulled = false;
  return mesh;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ca = new THREE.Color(), cb = new THREE.Color();
const lerpHex = (out: THREE.Color, a: string, b: string, k: number) => out.copy(ca.set(a)).lerp(cb.set(b), k);
const lerp3 = (a: number[], b: number[], k: number) => a.map((v, i) => lerp(v, b[i], k));

export const LookStage: React.FC<{ setup: LookSetup; style: StyleId }> = ({ setup, style }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef<((f: number) => void) | null>(null);
  const [ready, setReady] = useState(false);
  const look = LOOKS[style];
  const ps1H = look.ps1H ?? PS1_H;
  const W = look.ps1 ? Math.round((ps1H * width) / height) : width;
  const H = look.ps1 ? ps1H : height;

  useEffect(() => {
    const handle = delayRender(`look stage ${style}`);
    let done = false;
    const finish = () => { if (!done) { done = true; continueRender(handle); } };
    const px = H / 1920; // pixel-sized parameters are authored at 1920 high

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current!, antialias: false, stencil: false, depth: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the composer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = look.ps1 ? THREE.BasicShadowMap : THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.3, 1000);
    const sky = makeSky();
    scene.add(sky);
    scene.fog = new THREE.Fog('#ffffff', 30, 300);

    const sun = new THREE.DirectionalLight('#ffffff', 3);
    sun.castShadow = true;
    const map = H >= 1920 ? 4096 : 2048;
    sun.shadow.mapSize.set(map, map);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 300 });
    sun.shadow.bias = -1e-4; sun.shadow.radius = look.shadowRadius; // normalBias follows the texel size (placeLights)
    const hemi = new THREE.HemisphereLight('#ffffff', '#888888', 1);
    const rim = new THREE.DirectionalLight('#ffffff', 0);
    const bounce = new THREE.DirectionalLight('#ffe6cc', 0);
    scene.add(sun, sun.target, hemi, rim, rim.target, bounce, bounce.target);

    // Environment light per mood: the gradient sky rendered once into PMREM (V1), cached per mood.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envCache = new Map<MoodId, THREE.Texture>();
    const envFor = (id: MoodId) => {
      if (look.envIntensity <= 0) return null;
      if (!envCache.has(id)) {
        const s = new THREE.Scene(), m = look.moods[id].sky, k = makeSky();
        (k.material as THREE.ShaderMaterial).uniforms.zenith.value.set(m.zenith);
        (k.material as THREE.ShaderMaterial).uniforms.horizon.value.set(m.horizon);
        (k.material as THREE.ShaderMaterial).uniforms.ground.value.set(m.ground);
        s.add(k);
        envCache.set(id, pmrem.fromScene(s, 0.02).texture);
      }
      return envCache.get(id)!;
    };
    scene.environmentIntensity = look.envIntensity;

    // Post chain (BEST_PRACTICES §2.1): AO → ink → lens blur → bloom, ACES, grade, vignette → SMAA.
    const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    composer.setSize(W, H, false);
    composer.addPass(new RenderPass(scene, camera));
    let ao: InstanceType<typeof N8AOPostPass> | null = null;
    if (look.ao) {
      ao = new N8AOPostPass(scene, camera, W, H);
      ao.setQualityMode(H >= 1920 ? 'High' : 'Medium');
      Object.assign(ao.configuration, {
        aoRadius: look.ao.radius, distanceFalloff: look.ao.falloff, intensity: look.ao.intensity,
        halfRes: false, accumulate: false, gammaCorrection: false, transparencyAware: false, autoDetectTransparency: false,
      });
      composer.addPass(ao);
    }
    if (look.ink) {
      const normals = new NormalPass(scene, camera);
      // soft sprites, sparks and glows (userData.noInk) stay out of the normal buffer, or the ink outlines their quads
      const renderNormals = normals.render.bind(normals);
      normals.render = (...args: Parameters<typeof normals.render>) => {
        const hidden: THREE.Object3D[] = [];
        scene.traverse((o) => { if (o.visible && (o.userData.noInk || (o as THREE.Sprite).isSprite)) { o.visible = false; hidden.push(o); } });
        renderNormals(...args);
        for (const o of hidden) o.visible = true;
      };
      composer.addPass(normals);
      composer.addPass(new EffectPass(camera, new InkEffect(normals.texture, look.ink.color, Math.max(1, look.ink.width * px))));
    }
    let dof: DepthOfFieldEffect | null = null;
    if (look.dof) {
      dof = new DepthOfFieldEffect(camera, { focusDistance: 5, focusRange: look.dof.range ?? 3, bokehScale: 0 });
      composer.addPass(new EffectPass(camera, dof));
    }
    const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 1, luminanceSmoothing: 0.35, intensity: 0.5, radius: 0.72 });
    const grade = new GradeEffect();
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.3 });
    let smaaReady: Promise<void> = Promise.resolve();
    if (look.tiltShift) {
      composer.addPass(new EffectPass(camera, new TiltShiftBand(look.tiltShift.band, look.tiltShift.strength * px, look.tiltShift.y ?? 0.45)));
    }
    if (look.ps1) {
      // optional camcorder post on the tiny frame (the led3.an cozy look): bloom on blown highlights, a vignette, colour fringing
      const pp = look.ps1Post;
      const fx = [...(pp?.bloom ? [bloom] : []), grade, ...(pp?.vignette ? [vignette] : []), ...((look.ditherLevels ?? 31) > 0 ? [new DitherEffect(look.ditherLevels)] : [])];
      composer.addPass(new EffectPass(camera, ...fx)); // grade first, then quantise
      if (pp?.fringe) composer.addPass(new EffectPass(camera, new ChromaticAberrationEffect({ offset: new THREE.Vector2(pp.fringe / W, pp.fringe * 0.4 / H), radialModulation: true, modulationOffset: 0.25 })));
    } else {
      const tm = look.toneMapping === 'neutral' ? ToneMappingMode.NEUTRAL : look.toneMapping === 'agx' ? ToneMappingMode.AGX : ToneMappingMode.ACES_FILMIC;
      // ACES here carries a built-in 1/0.6 exposure lift; give Neutral and AgX the same, so switching curves keeps the brightness
      if (look.toneMapping === 'neutral' || look.toneMapping === 'agx') renderer.toneMappingExposure = 1 / 0.6;
      composer.addPass(new EffectPass(camera, bloom, new ToneMappingEffect({ mode: tm }), grade, vignette));
      const smaa = new SMAAEffect({ preset: SMAAPreset.HIGH });
      // SMAA decodes its lookup images asynchronously; frame 0 would render without AA otherwise.
      smaaReady = new Promise<void>((r) => {
        (smaa as unknown as THREE.EventDispatcher<{ load: object }>).addEventListener('load', () => r());
        setTimeout(r, 3000);
      });
      composer.addPass(new EffectPass(camera, smaa));
    }

    // Per-frame state the scene sets through the context.
    let moodA: MoodId = 'day', moodB: MoodId = 'day', moodK = 0;
    let focusTarget: THREE.Vector3 | null = null, focusStrength = 0;
    const sunCenter = new THREE.Vector3();
    let sunShot: SunShot = {};
    const dir = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();

    const applyMood = () => {
      const a: Mood = look.moods[moodA], b: Mood = look.moods[moodB], k = moodK;
      const u = (sky.material as THREE.ShaderMaterial).uniforms;
      lerpHex(u.zenith.value, a.sky.zenith, b.sky.zenith, k);
      lerpHex(u.horizon.value, a.sky.horizon, b.sky.horizon, k);
      lerpHex(u.ground.value, a.sky.ground, b.sky.ground, k);
      const fog = scene.fog as THREE.Fog;
      fog.color.copy(u.horizon.value);
      fog.near = lerp(a.fog.near, b.fog.near, k); fog.far = lerp(a.fog.far, b.fog.far, k);
      const exposure = lerp(a.exposure, b.exposure, k);
      lerpHex(sun.color, a.sun.color, b.sun.color, k);
      sun.intensity = lerp(a.sun.intensity, b.sun.intensity, k) * exposure;
      const az = THREE.MathUtils.degToRad(sunShot.az ?? lerp(a.sun.az, b.sun.az, k)), el = THREE.MathUtils.degToRad(sunShot.el ?? lerp(a.sun.el, b.sun.el, k));
      dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      lerpHex(hemi.color, a.hemi.sky, b.hemi.sky, k);
      lerpHex(hemi.groundColor, a.hemi.ground, b.hemi.ground, k);
      hemi.intensity = lerp(a.hemi.intensity, b.hemi.intensity, k) * exposure * (sunShot.fill ?? 1);
      rim.color.copy(sun.color);
      rim.intensity = lerp(a.rim, b.rim, k) * exposure;
      bounce.color.copy(sun.color).lerp(new THREE.Color('#ffffff'), 0.5);
      bounce.intensity = lerp(a.bounce ?? 0, b.bounce ?? 0, k) * exposure * (sunShot.fill ?? 1);
      bloom.intensity = lerp(a.bloom.intensity, b.bloom.intensity, k);
      bloom.luminanceMaterial.threshold = lerp(a.bloom.threshold, b.bloom.threshold, k);
      grade.set({
        saturation: lerp(a.grade.saturation, b.grade.saturation, k), contrast: lerp(a.grade.contrast, b.grade.contrast, k),
        lift: lerp3(a.grade.lift, b.grade.lift, k), gain: lerp3(a.grade.gain, b.grade.gain, k),
        shadowSat: lerp(a.grade.shadowSat ?? 1, b.grade.shadowSat ?? 1, k),
      });
      vignette.darkness = lerp(a.vignette, b.vignette, k);
      if (ao) lerpHex(ao.configuration.color, a.aoColor, b.aoColor, k);
      scene.environment = envFor(k < 0.5 ? moodA : moodB);
    };

    const placeLights = () => {
      // Sun: shadow box per shot (half-size), normal bias tied to its texel (a fixed 4 cm bias erased every small prop)
      const size = sunShot.size ?? 20, sc = sun.shadow.camera;
      if (sc.right !== size) { Object.assign(sc, { left: -size, right: size, top: size, bottom: -size }); sc.updateProjectionMatrix(); }
      sun.shadow.normalBias = 1.2 * (2 * size / sun.shadow.mapSize.x);
      // shadow box centred on sunCenter, snapped to the shadow-map texel grid (V1 racing build).
      const texel = (sun.shadow.camera.right - sun.shadow.camera.left) / sun.shadow.mapSize.x;
      right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      up.crossVectors(right, dir).normalize();
      const r = Math.round(sunCenter.dot(right) / texel) * texel, u = Math.round(sunCenter.dot(up) / texel) * texel;
      const d = sunCenter.dot(dir);
      sun.target.position.copy(right).multiplyScalar(r).addScaledVector(up, u).addScaledVector(dir, d);
      sun.position.copy(sun.target.position).addScaledVector(dir, 150);
      // Rim: from behind the subject, opposite the camera, a little above (V3 premium pass).
      const subject = focusTarget ?? sunCenter;
      rim.target.position.copy(subject);
      rim.position.copy(subject).sub(camera.position).setY(0).normalize().multiplyScalar(10).add(subject).setY(subject.y + 2.5); // low back light: outlines, doesn't blow out tops
      // bounce: from just above and beside the camera, toward the subject
      bounce.target.position.copy(subject);
      bounce.position.copy(camera.position).add(new THREE.Vector3(0.6, 1.2, 0)).sub(subject).normalize().multiplyScalar(10).add(subject);
      sky.position.copy(camera.position);
    };

    const ctx: LookContext = {
      scene, camera, renderer, look,
      applyLook: (root) => applyLook(root, look.material, look.matParams),
      mood: (a, b = a, k = 0) => { moodA = a; moodB = b; moodK = THREE.MathUtils.clamp(k, 0, 1); },
      focus: (target, strength = 1) => { focusTarget = target; focusStrength = strength; },
      sunFollow: (c, o = {}) => { sunCenter.copy(c); sunShot = o; },
      animFrame: (f) => Math.floor(f / look.stepFrames) * look.stepFrames,
    };

    let cancelled = false;
    Promise.all([setup(ctx), smaaReady])
      .then(([update]) => {
        if (cancelled) return finish();
        renderRef.current = (f) => {
          sunShot = {};
          update(f);
          applyMood();
          placeLights();
          if (dof) {
            dof.target = focusTarget;
            dof.bokehScale = look.dof!.bokeh * px * focusStrength;
          }
          if (look.matParams?.boil) { // stop-motion boil: the clay surface shifts once per held pose
            const af = Math.floor(f / look.stepFrames);
            const hsh = (n: number) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
            fingerprints().offset.set(hsh(af) * 0.02 * look.matParams.boil, hsh(af + 7) * 0.02 * look.matParams.boil);
          }
          composer.render(0); // 0: never let the composer read its wall clock
        };
        setReady(true);
        finish();
      })
      .catch((e) => cancelRender(e));
    return () => {
      cancelled = true; renderRef.current = null; finish();
      composer.dispose(); pmrem.dispose(); envCache.forEach((t) => t.dispose()); renderer.dispose();
    };
  }, [setup, style, W, H]);

  useLayoutEffect(() => { renderRef.current?.(frame); }, [frame, ready]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: '100%', height: '100%', imageRendering: look.ps1 ? 'pixelated' : 'auto' }} />
    </AbsoluteFill>
  );
};
