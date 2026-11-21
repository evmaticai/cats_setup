import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, cancelRender, continueRender, delayRender, useCurrentFrame } from 'remotion';
import * as THREE from 'three';

// PS1 look: render tiny, cut colour to 15-bit with a 4x4 Bayer dither, scale up with hard pixels (CSS).
export const PS1_W = 400;
export const PS1_H = 711;

export type StageContext = { scene: THREE.Scene; camera: THREE.PerspectiveCamera };
export type Setup = (ctx: StageContext) => Promise<(frame: number) => void>;

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const fragmentShader = /* glsl */ `
uniform sampler2D tScene;
varying vec2 vUv;
const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); // linear -> sRGB
  ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
  float d = (BAYER[p.y * 4 + p.x] / 16.0 - 0.5) / 31.0;
  c = floor(clamp(c + d, 0.0, 1.0) * 31.0 + 0.5) / 31.0; // 5 bits per channel
  gl_FragColor = vec4(c, 1.0);
}`;

export const Ps1Stage: React.FC<{ setup: Setup }> = ({ setup }) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef<((f: number) => void) | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = delayRender('PS1 stage setup');
    let done = false;
    const finish = () => { if (!done) { done = true; continueRender(handle); } };
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current!, antialias: false, preserveDrawingBuffer: true,
      logarithmicDepthBuffer: true, // headless ANGLE depth is coarse; the tutorial's one-line fix
    });
    renderer.setPixelRatio(1);
    renderer.setSize(PS1_W, PS1_H, false);
    const target = new THREE.WebGLRenderTarget(PS1_W, PS1_H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, PS1_W / PS1_H, 0.05, 200);
    const post = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ uniforms: { tScene: { value: target.texture } }, vertexShader, fragmentShader })));

    let cancelled = false;
    setup({ scene, camera })
      .then((update) => {
        if (cancelled) return finish();
        renderRef.current = (f) => {
          update(f);
          renderer.setRenderTarget(target);
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);
          renderer.render(post, postCam);
        };
        setReady(true);
        finish();
      })
      .catch((e) => cancelRender(e));
    return () => { cancelled = true; renderRef.current = null; finish(); target.dispose(); renderer.dispose(); };
  }, [setup]);

  useLayoutEffect(() => { renderRef.current?.(frame); }, [frame, ready]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <canvas ref={canvasRef} width={PS1_W} height={PS1_H}
        style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
    </AbsoluteFill>
  );
};
