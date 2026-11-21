import * as THREE from 'three';
import { Batch, anemone, brain, clam, fan, finish, grass, kelp, place, rng, rock, staghorn, starfish, table, tubes, urchin } from './geo';
import { U, reefMat } from './mat';
import { fishSet, schooled, turtle, wander, type Swimmer } from './fishes';

// Dive Cats 2: the reef set. A sandy channel runs along Z (x in -3..3, open water for the cats); coral bommies
// line both sides, taller kelp and rock walls behind, everything fading into blue. Floor y = 0 (sand varies a
// little), surface at SURF. update(t) moves water, light, fish and particles; nothing else changes per frame.

export const SURF = 13;
const CH = 3; // half-width of the open channel

export const sandH = (x: number, z: number) => {
  const off = THREE.MathUtils.smoothstep(Math.abs(x), CH, CH + 6);
  return 0.35 * Math.sin(x * 0.17 + 1) * Math.sin(z * 0.13) + 0.18 * Math.sin(x * 0.45 + z * 0.31) + off * (0.6 + 0.4 * Math.sin(z * 0.2 + x * 0.1));
};

const CORAL = {
  brain: ['#f0a050', '#e27aa8', '#cfd85e', '#8fd8c0', '#ffb070'],
  stag: [['#9a5ad8', '#f0c8ff'], ['#3f9cf0', '#c8f0ff'], ['#f08040', '#ffe0a0'], ['#e8d878', '#ff8ad0']],
  table: ['#4fc8a0', '#9ad460', '#d8b858'],
  fan: ['#e8407a', '#9b4be0', '#ff6a3d', '#ffd040'],
  tube: ['#ff8a2a', '#ffd23a', '#a65be8', '#3fc6ff', '#ff5a8a'],
  anem: [['#ff7fb0', '#ffe0f0'], ['#b8f05a', '#e070ff'], ['#ffa040', '#fff0a0']],
  star: ['#ff4a2a', '#3a6aff', '#ffb02a', '#ff5ab0'],
};
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

let rayMat: THREE.ShaderMaterial | null = null;
/** Additive sun-shaft cones hanging from the surface, n of them over a spread x spreadZ area around (cx, cz). */
export function lightRays(r: () => number, n: number, cx: number, cz: number, spread: number, spreadZ = spread) {
  rayMat ??= new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vD;
      void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vD;
      void main() {
        float edge = pow(abs(dot(vN, vV)), 1.6);
        float a = edge * pow(vUv.y, 1.4) * (0.55 + 0.45 * sin(uTime * 0.6 + vUv.x * 12.0));
        a *= 1.0 - smoothstep(18.0, 55.0, vD);
        gl_FragColor = vec4(vec3(0.85, 1.0, 0.95) * a * 0.32, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const sunDir = new THREE.Vector3(Math.sin(0.52) * Math.cos(1.15), Math.sin(1.15), Math.cos(0.52) * Math.cos(1.15)).normalize();
  return Array.from({ length: n }, () => {
    const rad = 0.6 + r() * 1.6, len = SURF + 4;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.8, len, 12, 1, true).translate(0, -len / 2, 0), rayMat!);
    const x = cx + (r() - 0.5) * spread, z = cz + (r() - 0.5) * spreadZ;
    m.position.set(x, SURF, z);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir);
    m.userData = { noLook: true, noShadow: true, noInk: true, cannotReceiveAO: true, ph: r() * 6, x, z };
    m.renderOrder = 5;
    return m;
  });
}

export function buildReef(seed = 7) {
  const r = rng(seed);
  const group = new THREE.Group();
  // Silent's sand patch stays bare: nothing may sit where he lies or where the puffer swims in
  // and Franko's corner round the big rock (the inner bommies at x > 4.6 stay)
  const bare = (p: THREE.Vector3) => (Math.hypot(p.x - 0.3, (p.z + 7) * 0.6) < 2.4 && p.z < -4.5) || (p.x > -3.5 && p.x < 4.3 && p.z < -46 && p.z > -58);
  const hard = new Batch(bare), soft = new Batch(bare), leafy = new Batch(bare);
  const anchors: { anemones: THREE.Vector3[]; heads: THREE.Vector3[]; hero: THREE.Vector3 } = { anemones: [], heads: [], hero: new THREE.Vector3() };

  // sand floor, with ripple bands in the colour
  const sand = new THREE.PlaneGeometry(220, 220, 150, 150).rotateX(-Math.PI / 2);
  const sp = sand.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setY(i, sandH(sp.getX(i), sp.getZ(i)));
  const s1 = new THREE.Color('#e2c98e'), s2 = new THREE.Color('#cdb078'), s3 = new THREE.Color('#f2dca4');
  const sandMesh = new THREE.Mesh(finish(sand, (c) => {
    const rip = Math.sin(c.x * 2.6 + Math.sin(c.z * 0.7) * 2 + c.z * 0.9);
    return rip > 0.6 ? s3 : Math.sin(c.x * 0.3 + c.z * 0.21) > 0.55 ? s2 : s1;
  }, 0, 1, 0.04, r), reefMat({ caustics: 2.2 }));
  sandMesh.receiveShadow = true; sandMesh.userData.noLook = true; sandMesh.frustumCulled = false;
  group.add(sandMesh);

  const onSand = (x: number, z: number) => new THREE.Vector3(x, sandH(x, z) - 0.05, z);
  const coralAt = (b: Batch, g: THREE.BufferGeometry, p: THREE.Vector3, s = 1, tilt?: THREE.Vector3) => b.add(g, place(p.x, p.y, p.z, r() * 6.28, s, tilt));

  // one random coral piece at p (on a rock top or on the sand)
  const garden = (p: THREE.Vector3, up?: THREE.Vector3, big = 1) => {
    const k = r();
    if (k < 0.2) coralAt(hard, brain(r, (0.35 + r() * 0.5) * big, pick(r, CORAL.brain)), p, 1, up);
    else if (k < 0.42) { const [a, b] = pick(r, CORAL.stag); coralAt(soft, staghorn(r, (0.8 + r() * 0.8) * big, a, b), p, 1, up); }
    else if (k < 0.55) coralAt(hard, table(r, (0.5 + r() * 0.6) * big, pick(r, CORAL.table)), p, 1, up);
    else if (k < 0.68) coralAt(leafy, fan(r, (0.9 + r() * 0.9) * big, pick(r, CORAL.fan)), p);
    else if (k < 0.82) coralAt(hard, tubes(r, (0.6 + r() * 0.6) * big, pick(r, CORAL.tube)), p, 1, up);
    else if (k < 0.92) { const [a, b] = pick(r, CORAL.anem); coralAt(soft, anemone(r, 0.9 + r() * 0.6, a, b), p, 1, up); anchors.anemones.push(p.clone()); }
    else coralAt(soft, grass(r, 0.5 + r() * 0.4), p);
  };

  // bommies: a boulder with corals growing on its upper half
  const bommie = (x: number, z: number, rad: number, n: number) => {
    const hk = 0.6 + r() * 0.7, base = onSand(x, z);
    hard.add(rock(r, rad, hk), place(base.x, base.y, base.z, r() * 6.28));
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, el = 0.35 + r() * 1.0; // elevation from the rim to the top
      const d = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      const p = new THREE.Vector3(base.x + d.x * rad * 0.9, base.y + rad * 0.2 + d.y * rad * hk * 0.95, base.z + d.z * rad * 0.9);
      garden(p, d.clone().lerp(new THREE.Vector3(0, 1, 0), 0.55), 0.9);
    }
    anchors.heads.push(new THREE.Vector3(base.x, base.y + rad * (0.2 + hk) + 0.8, base.z));
  };

  for (let z = 16; z > -78; z -= 2.4 + r() * 1.4) {
    for (const side of [-1, 1]) {
      bommie(side * (CH + 1.6 + r() * 3), z + (r() - 0.5) * 2, 0.8 + r() * 1.3, 7 + Math.floor(r() * 7));
      bommie(side * (CH + 7 + r() * 6), z + (r() - 0.5) * 3, 1.4 + r() * 2.2, 8 + Math.floor(r() * 8));
      if (r() < 0.7) bommie(side * (CH + 15 + r() * 10), z, 2 + r() * 3, 6);
      // sand garden between bommies, and a few low pieces at the channel edge
      for (let k = 0; k < 7; k++) garden(onSand(side * (CH + 0.2 + r() * 5), z + (r() - 0.5) * 3), undefined, 0.85);
      for (let k = 0; k < 6; k++) garden(onSand(side * (CH + 5 + r() * 12), z + (r() - 0.5) * 3), undefined, 1);
      for (let k = 0; k < 3; k++) {
        const x = side * (CH + 4 + r() * 16), zz = z + (r() - 0.5) * 3;
        const b = onSand(x, zz);
        leafy.add(kelp(r, 3 + r() * 5), place(b.x, b.y, b.z, r() * 6.28));
      }
    }
    // the channel floor: grass tufts, starfish, urchins, clams, pebbles
    for (let k = 0; k < 9; k++) {
      const p = onSand((r() - 0.5) * 2 * CH, z + (r() - 0.5) * 3), q = r();
      if (q < 0.4) soft.add(grass(r, 0.3 + r() * 0.3), place(p.x, p.y, p.z, r() * 6));
      else if (q < 0.65) hard.add(starfish(r, pick(r, CORAL.star)), place(p.x, p.y + 0.05, p.z, r() * 6));
      else if (q < 0.8) hard.add(urchin(r), place(p.x, p.y, p.z, r() * 6));
      else if (q < 0.9) hard.add(clam(r, 0.8 + r() * 0.8), place(p.x, p.y, p.z, r() * 6));
      else hard.add(rock(r, 0.2 + r() * 0.25, 0.6), place(p.x, p.y, p.z, r() * 6));
    }
  }

  // hero anemone with clownfish, close to the channel for the close-ups
  const hero = onSand(2.6, -3);
  hard.add(rock(r, 0.75, 0.55), place(hero.x, hero.y, hero.z, 0.4));
  const heroTop = new THREE.Vector3(hero.x, hero.y + 0.75 * 0.75 + 0.05, hero.z);
  soft.add(anemone(r, 1.6, '#ff7fb0', '#ffe8f4'), place(heroTop.x, heroTop.y, heroTop.z, 0));
  anchors.hero.copy(heroTop);
  anchors.anemones.unshift(heroTop.clone());

  // far reef walls: big dark masses that melt into the blue
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1, x = side * (34 + r() * 20), z = 20 - i * 4.5;
    hard.add(rock(r, 5 + r() * 6, 0.9 + r() * 0.8), place(x, -1, z, r() * 6));
  }
  for (let i = 0; i < 6; i++) hard.add(rock(r, 8 + r() * 6, 1.2), place((r() - 0.5) * 50, -1, -95 - r() * 20, r() * 6));

  group.add(hard.mesh(reefMat()), soft.mesh(reefMat({ sway: true })), leafy.mesh(reefMat({ sway: true, side: THREE.DoubleSide })));

  // ---------------------------------------------------------------- fish
  const sets: ReturnType<typeof fishSet>[] = [];
  const along = (k: number) => 14 - k * 6; // spread anchors down the reef
  // fusilier school circling above the channel
  const schoolC: Swimmer = (t, o) => o.set(5 * Math.sin(t * 0.16), 6.5 + 0.7 * Math.sin(t * 0.33), -16 + 9 * Math.cos(t * 0.16));
  const fus: Swimmer[] = [], fusL: number[] = [];
  for (let i = 0; i < 300; i++) {
    fus.push(schooled(schoolC, new THREE.Vector3((r() - 0.5) * 9, (r() - 0.5) * 3, (r() - 0.5) * 6), r() * 20));
    fusL.push(0.2 + r() * 0.06);
  }
  sets.push(fishSet('fusilier', fus, fusL, 14));
  // a second, farther school
  const school2: Swimmer = (t, o) => o.set(-9 + 4 * Math.sin(t * 0.21 + 2), 9 + 0.6 * Math.sin(t * 0.4), -38 + 6 * Math.cos(t * 0.21 + 2));
  const fus2: Swimmer[] = [], fus2L: number[] = [];
  for (let i = 0; i < 160; i++) { fus2.push(schooled(school2, new THREE.Vector3((r() - 0.5) * 8, (r() - 0.5) * 3, (r() - 0.5) * 5), r() * 20)); fus2L.push(0.22); }
  sets.push(fishSet('fusilier', fus2, fus2L, 14));
  // anthias clouds hovering over coral heads
  const anth: Swimmer[] = [], anthL: number[] = [];
  for (const h of anchors.heads.filter((_, i) => i % 3 === 0).slice(0, 14))
    for (let k = 0; k < 16; k++) { anth.push(wander(h.clone().add(new THREE.Vector3((r() - 0.5) * 1.5, r() * 1.2, (r() - 0.5) * 1.5)), 0.3 + r() * 0.5, 0.15, 0.3 + r() * 0.5, 0.6 + r() * 0.5, r() * 9)); anthL.push(0.12 + r() * 0.04); }
  sets.push(fishSet('anthias', anth, anthL, 16));
  // reef fish wandering around bommies
  const reefFish = (sp: string, n: number, len: number, rad: number, w: number) => {
    const ps: Swimmer[] = [], ls: number[] = [];
    for (let i = 0; i < n; i++) {
      const h = anchors.heads[Math.floor(r() * anchors.heads.length)];
      ps.push(wander(h.clone().add(new THREE.Vector3(0, -0.4 + r() * 1.2, 0)), rad * (0.6 + r()), 0.3, rad * (0.6 + r()), w * (0.7 + r() * 0.6), r() * 9));
      ls.push(len * (0.85 + r() * 0.3));
    }
    sets.push(fishSet(sp, ps, ls, 8));
  };
  reefFish('yellowTang', 34, 0.32, 2.2, 0.35);
  reefFish('blueTang', 22, 0.34, 2.6, 0.3);
  reefFish('butterfly', 26, 0.26, 1.6, 0.4);
  reefFish('parrot', 9, 0.6, 3.5, 0.18);
  // clownfish: two per anemone, tight loops just above the tentacles
  const cl: Swimmer[] = [], clL: number[] = [];
  for (const a of anchors.anemones.slice(0, 18))
    for (let k = 0; k < 2; k++) { cl.push(wander(a.clone().add(new THREE.Vector3(0, 0.55, 0)), 0.3, 0.12, 0.25, 1.1 + k * 0.3, k * 3 + a.x)); clL.push(0.16); }
  sets.push(fishSet('clown', cl, clL, 12));
  for (const s of sets) group.add(s.mesh);
  void along;

  // a sea turtle gliding across the far reef
  const tur = turtle();
  tur.root.scale.setScalar(1.1);
  group.add(tur.root);
  const turPath = (t: number, o: THREE.Vector3) => o.set(-22 + t * 1.15, 5.5 + Math.sin(t * 0.4) * 0.6, -24 + Math.sin(t * 0.12) * 3);

  // ---------------------------------------------------------------- light, water, particles
  const rays: THREE.Mesh[] = lightRays(r, 18, 0, -18, 30, 60);
  rays.forEach((m) => group.add(m));

  const surface = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000).rotateX(Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime },
    vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform float uTime; varying vec3 vW;
      void main() {
        vec2 p = vW.xz * 0.35;
        float w = sin(p.x * 1.3 + uTime * 0.9 + sin(p.y * 0.8 + uTime * 0.5) * 1.6) * sin(p.y * 1.1 - uTime * 0.7 + sin(p.x * 0.9) * 1.4);
        float bright = smoothstep(0.35, 0.95, w);
        float d = length(vW.xz - cameraPosition.xz);
        vec3 c = mix(vec3(0.42, 0.86, 0.95), vec3(0.95, 1.0, 0.98), bright);
        // Snell's window: the sky shows only inside a cone straight above (~49 deg); outside it the surface mirrors the deep
        vec3 v = normalize(vW - cameraPosition);
        float win = smoothstep(0.6, 0.7, v.y);
        float sunS = smoothstep(0.985, 0.998, dot(v, normalize(vec3(0.32, 0.9, 0.29))));
        c = mix(vec3(0.07, 0.38, 0.52) + 0.12 * bright, c, win) + vec3(1.0, 0.97, 0.85) * sunS * win;
        gl_FragColor = vec4(c, (1.0 - smoothstep(10.0, 70.0, d)) * mix(0.85, 0.92, win));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  surface.position.y = SURF;
  surface.userData = { noLook: true, noShadow: true, cannotReceiveAO: true };
  group.add(surface);

  // plankton motes: tiny bright specks drifting
  const NP = 1400, pp = new Float32Array(NP * 3), ph = new Float32Array(NP);
  for (let i = 0; i < NP; i++) { pp.set([(r() - 0.5) * 40, r() * SURF, 18 - r() * 70], i * 3); ph[i] = r() * 100; }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const motes = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime },
    vertexShader: /* glsl */ `uniform float uTime; attribute float ph; varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.3 + ph) * 0.4, sin(uTime * 0.21 + ph * 1.7) * 0.3, cos(uTime * 0.27 + ph) * 0.4);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = (1.0 - smoothstep(6.0, 26.0, -mv.z)) * (0.5 + 0.5 * sin(uTime * 1.3 + ph * 5.0));
        gl_PointSize = clamp(18.0 / -mv.z, 1.0, 2.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `varying float vA; void main() { gl_FragColor = vec4(vec3(0.9, 1.0, 0.95) * vA * 0.7, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  motes.userData = { noLook: true, noShadow: true, noInk: true, cannotReceiveAO: true };
  motes.frustumCulled = false;
  group.add(motes);

  // bubble streams from a few vents
  const vents = [onSand(-2.2, 2), onSand(3.8, -9), onSand(-4.5, -20), anchors.hero.clone().add(new THREE.Vector3(-0.5, 0, 0.4))];
  const PER = 22, NB = vents.length * PER;
  const bubbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 1), new THREE.MeshBasicMaterial({ color: '#e8ffff', transparent: true, opacity: 0.75 }), NB);
  bubbles.userData = { noLook: true, noShadow: true, cannotReceiveAO: true };
  bubbles.frustumCulled = false;
  group.add(bubbles);
  const bm = new THREE.Matrix4(), bp = new THREE.Vector3(), bq = new THREE.Quaternion(), bs = new THREE.Vector3();

  const tp = new THREE.Vector3(), tn = new THREE.Vector3();
  const update = (t: number) => {
    U.uTime.value = t;
    for (const s of sets) s.update(t);
    turPath(t, tp); turPath(t + 0.1, tn);
    tur.root.position.copy(tp);
    tur.root.rotation.set(0, Math.atan2(-(tn.z - tp.z), tn.x - tp.x), 0.05 * Math.sin(t * 0.4));
    tur.pose(t);
    for (const m of rays) m.scale.set(1 + 0.15 * Math.sin(t * 0.4 + m.userData.ph), 1, 1);
    for (let v = 0; v < vents.length; v++) for (let k = 0; k < PER; k++) {
      const age = (t / 5 + k / PER + v * 0.37) % 1, i = v * PER + k;
      bp.set(vents[v].x + Math.sin(age * 20 + k) * 0.08 * age * 4, vents[v].y + 0.2 + age * (SURF - vents[v].y), vents[v].z + Math.cos(age * 17 + k) * 0.08 * age * 4);
      bm.compose(bp, bq, bs.setScalar(0.35 + age * 0.6 + (k % 3) * 0.15));
      bubbles.setMatrixAt(i, bm);
    }
    bubbles.instanceMatrix.needsUpdate = true;
  };
  return { group, update, anchors, sandH };
}
