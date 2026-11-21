import React, { useCallback } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { LookStage, type LookContext } from '../../engine/look/LookStage';
import { PIX, outline, usePixelFont } from '../../engine/overlays';
import { buildReef, SURF } from './reef';
import { KEYS, loadCat, type Cat, type CatKey } from './cast';
import { catchFish, catchGeo, modelGeo, modelMats, type CatchFish, type FishModel } from './catchfish';
import { catPose, catRoot, axes, makeSpear, makeHearts, ramp, smooth, clamp01 } from './act';
import { baitBall, cave, dropOff, gardenEels, kelpForest, sandPuff } from './sets';
import { U, REEF, reefMat } from './mat';
import { fishSet, type Swimmer } from './fishes';
import { place, rng, rock } from './geo';
import TL from './timeline.json';

// Dive Cats 2 "Fishing" (v3): six hunters, six places, one descent. The hook (six cats splash in), then each cat
// hunts its own way: Yeji from the top, Silent lying on the sand, Paw in the kelp, Lusya in a cave with a torch,
// Zhenya down the drop-off to 30 m; then all the catches draw a shark and Franko just shoots it. It turns around
// and looks at him. Times live in timeline.json (the sound mix reads it too). Every frame is a pure function of t.

export const DC02_FPS = TL.fps;
export const DC02_FRAMES = Math.round(TL.dur * TL.fps);
type V3 = THREE.Vector3;
type Shot = (typeof TL.shots)[number] & { land?: number; part?: number; torch?: number; edge?: number; glare?: boolean; card: number; cardLen: number; species: string; fact: string };
const V = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UPV = v3(0, 1, 0), XV = v3(1, 0, 0);
const dirOf = (yaw: number) => v3(-Math.sin(yaw), 0, -Math.cos(yaw)); // yaw 0 = facing -Z
const rightOf = (a: V3) => new THREE.Vector3().crossVectors(a, UPV).normalize();
const lerp = THREE.MathUtils.lerp;
const SH = TL.shots as Shot[];
/** v5 (25 s): a shot plays its own action times from `from`, sped up by `speed` */
type Win = { t0: number; from?: number; speed?: number };
const localT = (w: Win, t: number) => (w.from ?? 0) + (t - w.t0) * (w.speed ?? 1); // no window = real time
const shot = (cat: CatKey) => SH.find((s) => s.cat === cat)!;

// ---------------------------------------------------------------- places (world positions of each set)
const YEJI = v3(-0.5, SURF - 0.42, 4.0);
const SILENT_X = 0.3, SILENT_Z = -7, SILENT_A = new THREE.Vector3(0, 0, -1); // he lies along the channel
const KELP = v3(300, -3, 0), CAVE = v3(-300, -5, 0), WALL = v3(600, -6, 0);
const CAVE_R = 7; // a big cave: she shoots from 4+ m away

// Zhenya's depth over his shot (shared by the shot and the depth counter)
const zhenyaY = (tt: number) => {
  const s = shot('zhenya'), top = WALL.y + 0.9, bottom = SURF - 30;
  if (tt < 1.2) return top;
  if (tt < 3.1) return lerp(top, bottom, smooth((tt - 1.2) / 1.9));
  if (tt < s.hug - 0.1) return bottom + 0.05 * Math.sin(tt * 3);
  return bottom + 8 * smooth((tt - s.hug + 0.1) / 2.4);
};
const hookLeadY = (t: number) => SURF + 0.5 - (2.6 * (1 - Math.exp(-1.6 * Math.max(0, t - 0.35))) + 0.9 * Math.max(0, t - 0.35)) * 0.48;

/** depth in metres under the surface for the corner counter (null = no counter) */
export function depthAt(t: number): number | null {
  if (t < TL.hook.t1) return null; // not under the title
  const s = SH.find((x) => t >= x.t0 && t < x.t1);
  const D: Partial<Record<CatKey, number>> = { yeji: 1, silent: 13, paw: Math.round(SURF - KELP.y - 2.1), lusya: Math.round(SURF - CAVE.y - 0.95) };
  if (!s) return Math.round(SURF - TL.franko.spot[1]);
  if (s.cat === 'zhenya') return Math.round(SURF - zhenyaY(localT(s, t)));
  return D[s.cat as CatKey] ?? null;
}

const NAME: Record<CatKey, string> = { yeji: 'YEJI', silent: 'SILENT', paw: 'PAW', lusya: 'BABUSHKA', zhenya: 'ZHENYA', franko: 'FRANKO' };

/** look: 'ps1' (the posted Dive Cats 2) or 'smooth' (the Dive Cats 1 look) */
export const Dc02: React.FC<{ sound?: boolean; clean?: boolean; cover?: number; look?: 'ps1' | 'smooth' }> = ({ sound = true, clean = false, cover = 0, look = 'ps1' }) => { // clean: no on-screen text; cover 1-3: a staged cover
  usePixelFont();
  const frame = useCurrentFrame();
  const t = frame / DC02_FPS;
  const sc = useVideoConfig().width / 1080; // pixel sizes are authored for 1080 wide

  const setup = useCallback(async (ctx: LookContext) => {
    REEF.snap = look !== 'smooth';
    const reef = buildReef();
    ctx.scene.add(reef.group);
    const kelp = kelpForest(KELP.x, KELP.z); kelp.group.position.y = KELP.y;
    const cv = cave(CAVE.x, CAVE.z, CAVE_R); cv.group.position.y = CAVE.y;
    const wall = dropOff(WALL.x, WALL.z); wall.group.position.y = WALL.y;
    ctx.scene.add(kelp.group, cv.group, wall.group);
    const sandY = (x: number, z: number) => reef.sandH(x, z) - 0.05;
    const G = v3(SILENT_X, sandY(SILENT_X, SILENT_Z), SILENT_Z);
    const eels = gardenEels(G, sandY, SILENT_A);
    ctx.scene.add(eels.group);
    const ballC = (tt: number, o: V3) => o.copy(YEJI).addScaledVector(dirOf(0.3), 1.7).add(v3(0.3 * Math.sin(tt * 0.4), -3.6 + 0.15 * Math.sin(tt * 0.6), 0));
    const ball = baitBall(ballC);
    ctx.scene.add(ball.mesh);
    const puff = sandPuff();
    const splashes = TL.hook.splash.map((_, i) => sandPuff(30, 11 + i, '#eaffff', 1.4));
    ctx.scene.add(puff.mesh, ...splashes.map((s) => s.mesh));

    const cats = {} as Record<CatKey, Cat>;
    for (const k of KEYS) cats[k] = await loadCat(ctx, k);
    const spear = makeSpear(0.42);
    const hearts = makeHearts();
    ctx.scene.add(spear.group, spear.line, hearts.group);
    const geos: Record<string, FishModel | null> = {};
    for (const s of SH) geos[s.fish] = await modelGeo(s.fish);
    const fishes: CatchFish[] = SH.map((s) => { const f = catchFish(s.fish, s.len, 8, geos[s.fish]); ctx.scene.add(f.root); return f; });
    // species cards: the same fish again, turning in the upper part of the frame while Bill names it
    const shows: CatchFish[] = SH.map((s) => { const f = catchFish(s.fish, 1, 6, geos[s.fish]); f.root.userData.noShadow = true; f.mesh.castShadow = false; ctx.scene.add(f.root); return f; });
    const showCard = (i: number, tt: number) => {
      const s = SH[i], f = shows[i], k = tt - s.card;
      f.root.visible = k >= 0 && k < s.cardLen;
      if (!f.root.visible) return;
      const pop = smooth(k / 0.35) * (1 - smooth((k - s.cardLen + 0.3) / 0.3));
      const cq = ctx.camera.quaternion;
      const half = 1.9 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2)); // the same place on screen whatever the lens
      f.root.position.copy(ctx.camera.position).add(v3(0, 0.56 * half, -1.9).applyQuaternion(cq));
      f.root.quaternion.copy(cq).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0.45 * Math.sin(k * 1.4), 0)));
      f.root.scale.setScalar(0.62 * half * pop * (s.fish === 'puffer' ? 0.85 : 1));
      f.fishU.uAmp.value = 0.8;
    };
    const shark = catchFish('shark', TL.franko.len, 5, await modelGeo('shark'));
    ctx.scene.add(shark.root);
    // the grouper's eyes glow in the dark cave
    const glowM = new THREE.MeshBasicMaterial({ color: '#fff27a' }); glowM.userData.noLook = true;
    const glow = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), glowM); m.position.set(0.36, 0.06, s * 0.13); m.userData.noLook = true; fishes[3].mesh.add(m); return m; });
    // Lusya's head torch: a spot light, a faint beam cone and a little lamp on her mask
    const torch = new THREE.SpotLight('#fff0c0', 0, 14, 0.36, 0.5, 1.0);
    ctx.scene.add(torch, torch.target);
    const beamM = new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    beamM.userData.noLook = true;
    const beam = new THREE.Mesh(new THREE.ConeGeometry(3.4 * Math.tan(0.4), 3.4, 16, 1, true).translate(0, -1.7, 0), beamM);
    beam.userData = { noLook: true, noShadow: true };
    const lampM = new THREE.MeshBasicMaterial({ color: '#fff8d0' }); lampM.userData.noLook = true;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6), lampM); lamp.userData.noLook = true;
    ctx.scene.add(beam, lamp);
    const fill = new THREE.PointLight('#7fb0d8', 0, 4, 1.5); // a faint cold fill inside the cave (Lusya is a black cat)
    ctx.scene.add(fill);

    // Zhenya's reason to go deep: a big school of tuna circling at 30 m below the wall
    const tunaC = v3(WALL.x, SURF - 30 + 0.2, WALL.z + 8.5), tunaP: Swimmer[] = [], tunaL: number[] = [];
    { const r = rng(91); for (let i = 0; i < 42; i++) { const a0 = r() * 6.28, rx = 5 + r() * 2.5, rz = 2.6 + r() * 1.4, yy = (r() - 0.5) * 2.6, w = 0.32 + r() * 0.06;
      tunaP.push((t, o) => o.set(tunaC.x + Math.cos(a0 + t * w) * rx, tunaC.y + yy + 0.2 * Math.sin(t + a0), tunaC.z + Math.sin(a0 + t * w) * rz)); tunaL.push(1.15 + r() * 0.5); } }
    const tunaSchool = geos.tuna ? fishSet(geos.tuna.geo, tunaP, tunaL, 7, modelMats(geos.tuna, 7).mats) : fishSet(catchGeo('tuna'), tunaP, tunaL, 7);
    wall.group.add(tunaSchool.mesh); tunaSchool.mesh.position.y = -WALL.y; // the wall group is lowered; the school is in world y
    // Franko's rock: a big boulder ahead of the crew; the shark rests behind it with only its tail showing
    const FA = dirOf(TL.franko.yaw), FR = rightOf(FA), FS = V(TL.franko.spot);
    const rockAt = FS.clone().addScaledVector(FA, 7.0); rockAt.y = sandY(rockAt.x, rockAt.z) - 0.15;
    const bigRock = new THREE.Mesh(rock(rng(17), 1.9, 1.7), reefMat());
    bigRock.position.copy(rockAt); bigRock.castShadow = bigRock.receiveShadow = true; bigRock.userData.noLook = true;
    ctx.scene.add(bigRock); void place;
    const sharkRest = rockAt.clone().addScaledVector(FA, 2.4).addScaledVector(FR, 1.5).add(v3(0, 1.6, 0)); // the tail sticks out past the rock's right edge
    const fwd = new THREE.Vector3(), up = new THREE.Vector3(), mz = new THREE.Vector3();
    const cam = (p: V3, l: V3, fov = 42) => {
      ctx.camera.position.copy(p); ctx.camera.fov = fov; ctx.camera.updateProjectionMatrix(); ctx.camera.up.set(0, 1, 0); ctx.camera.lookAt(l);
      ctx.sunFollow(l, { size: 12 });
    };
    const kick = (tt: number, at: number, amp = 0.03) => {
      const f = Math.round((tt - at) * 30);
      if (f < 0 || f > 7) return;
      const s = (f % 2 ? -1 : 1) * amp * (1 - f / 8);
      ctx.camera.position.add(v3(s, -s * 0.6, 0).applyQuaternion(ctx.camera.quaternion));
    };
    const chestOf = (c: Cat, face: V3, held: number) => c.rig.root.position.clone().add(v3(0, held < 0.4 ? c.height * 0.52 : Math.max(c.height * 0.12, c.height * 0.42 - held * 0.22), 0)).addScaledVector(face, c.height * 0.25 + held * 0.15 + (held < 0.4 ? 0.08 : 0));
    const heldLen = (s: Shot) => s.len * (s.fish === 'puffer' ? 1.45 : 1);
    const puffScale = (s: Shot, tt: number) => (s.fish === 'puffer' && tt >= s.hit ? 1 + 0.45 * (1 - Math.exp(-(tt - s.hit) * 9) * Math.cos((tt - s.hit) * 14)) : 1);

    // ------------------------------------------------------------------ one catch (shared by the five hunts)
    type Core = {
      i: number; tt: number;
      pos: V3; dir: V3; pitch: number; // the swimmer before the hug: root (at the feet), heading, body pitch
      S: V3;                           // where the cat floats upright in the hug
      camP: V3; camL: V3; fov?: number; // the shot's camera before the hug
      fishAt: (tt: number, out: V3) => V3; // the fish before the hit
      back?: boolean;                  // hug camera on the other side (behind the swim direction)
      pose?: { look?: number; tilt?: number; rate?: number; kick?: number };
    };
    const core = (o: Core) => {
      const s = SH[o.i], c = cats[s.cat as CatKey], f = fishes[o.i], tt = o.tt, h = c.height;
      if (tt > s.card) o.S = o.S.clone().add(v3(0, 0.22 * (tt - s.card), 0)); // the card: she swims up with her catch
      const A = o.dir.clone().setY(0).normalize(), R = rightOf(A);
      c.rig.root.visible = c.gun.visible = true; f.root.visible = true;
      // camera: the shot's own until the hug, then it glides round (never through) the cat to its front
      const kH = ramp(tt, s.hug - 0.15, s.hug + 0.45);
      const sgn = o.back ? -1 : 1;
      const centreUp = o.S.clone().add(v3(0, 0.05, 0));
      const camB = centreUp.clone().addScaledVector(A, sgn * (1.2 + s.len * 0.55)).addScaledVector(R, sgn * (0.9 + s.len * 0.2)).add(v3(0, 0.15 + h * 0.2, 0)).addScaledVector(A, -sgn * (tt - s.hug) * 0.08);
      const pull = tt > s.card ? smooth((tt - s.card) / 1.2) : 0;
      // the card: every cat framed like Babushka's (the user's pick): about 4 m out, the cat low, the fish turning above her
      if (pull > 0) {
        const out = camB.clone().sub(centreUp).setY(0).normalize();
        camB.lerp(centreUp.clone().addScaledVector(out, 4.0).add(v3(0, h * 0.2 - 0.1, 0)), pull);
      }
      const lookB = centreUp.clone().add(v3(0, h * 0.05 - 0.15 * pull * s.len, 0));
      if (kH <= 0) cam(o.camP, o.camL, o.fov ?? 42);
      else {
        const Cc = o.S.clone().add(v3(0, h * 0.4, 0)), oa = o.camP.clone().sub(Cc), ob = camB.clone().sub(Cc);
        const qsw = new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(oa.clone().normalize(), ob.clone().normalize()), kH);
        cam(Cc.clone().add(oa.clone().normalize().applyQuaternion(qsw).multiplyScalar(lerp(oa.length(), ob.length(), kH))), o.camL.clone().lerp(lookB, kH), lerp(o.fov ?? 42, 38, kH));
      }
      const face = ctx.camera.position.clone().sub(o.S).setY(0).normalize();
      catRoot(c, o.pos.clone().lerp(o.S, smooth(kH)), A, face, kH, tt, o.pitch * (1 - kH));
      const glare = s.glare ? ramp(tt, s.hug + 0.1, s.hug + 0.3) * (1 - ramp(tt, s.meow - 0.15, s.meow + 0.1)) : 0;
      const happy = (1 - glare) * 0.18 * ramp(tt, s.meow, s.meow + 0.2) * Math.sin(tt * 5);
      catPose(c.rig, tt, { hug: kH, ph: o.i, rate: o.pose?.rate, kick: o.pose?.kick, look: kH > 0.5 ? glare * 0.7 : o.pose?.look ?? 0, tilt: kH > 0.5 ? happy : o.pose?.tilt ?? 0 });
      axes(c.rig, fwd, up);
      const F = o.fishAt(s.hit, new THREE.Vector3());
      const aim = F.clone().sub(c.muzzle(mz)).normalize();
      c.hold(aim.lerp(v3(0, -1, 0).addScaledVector(face, 0.3), kH).normalize(), up.clone().lerp(face, kH).normalize()); // in the hug the gun hangs down
      // fish: its own path until the hit, then reeled in on the line and held at the tummy, wriggling
      const held = heldLen(s), chest = () => chestOf(c, face, held);
      const fp = new THREE.Vector3(), fn = new THREE.Vector3();
      if (tt < s.hit) {
        o.fishAt(tt, fp); o.fishAt(tt + 0.05, fn);
        const d = fn.sub(fp);
        const head = d.lengthSq() > 1e-7 ? d.normalize() : A.clone().negate();
        f.root.quaternion.setFromEuler(new THREE.Euler(0, Math.atan2(-head.z, head.x), THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(head.y, -1, 1)), -0.6, 0.6), 'YZX'));
      } else {
        if (tt < s.hug + 0.45) {
          // reeled in to the gun, then carried to the tummy as the cat turns upright (never toward the feet)
          const kR = smooth((tt - s.hit - 0.15) / (s.hug - s.hit - 0.15)), near = c.muzzle(mz.clone()).lerp(chest(), smooth(kH));
          fp.copy(F).lerp(near, kR * (0.92 + 0.08 * kH));
        } else fp.copy(chest());
        const side = R.clone().negate().multiplyScalar(sgn);
        const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-side.z, side.x), 0));
        o.fishAt(s.hit - 0.05, fn); const d = F.clone().sub(fn);
        const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, d.lengthSq() > 1e-7 ? Math.atan2(-d.z, d.x) : Math.atan2(A.z, -A.x), 0));
        f.root.quaternion.slerpQuaternions(q0, q1, smooth((tt - s.hit) / 0.6));
      }
      f.root.position.copy(fp);
      const boop = tt >= s.hit ? clamp01(1 - (tt - s.hit) / 0.35) : 0;
      f.fishU.uAmp.value = 1 + 2.5 * boop + 0.6 * kH;
      f.root.scale.setScalar(puffScale(s, tt));
      // spear: flies from the muzzle, sticks to the fish's side, the line reels it in; gone at the hug
      const stick = fp.clone().addScaledVector(aim, -0.12 * s.len - 0.03);
      if (tt < s.shoot) spear.hide();
      else if (tt < s.hit) { const m = c.muzzle(mz.clone()); spear.set(m.clone().lerp(stick, (tt - s.shoot) / (s.hit - s.shoot)), aim, m); }
      else if (tt < s.hug) spear.set(stick, aim, c.muzzle(mz.clone()));
      else spear.hide();
      if (tt >= s.hit) kick(tt, s.hit, 0.025);
      hearts.update(c.rig.root.position.clone().add(v3(0, h * 0.9, 0)).addScaledVector(face, 0.1), (tt - s.meow) / 1.0, ctx.camera, 0.11);
      return { c, f, A, R, kH, face };
    };

    // ------------------------------------------------------------------ hook: six cats splash in through the surface
    const hook = (tt: number) => {
      const H = V(TL.hook.spot);
      const slots: Record<CatKey, number[]> = { paw: [0, 0], silent: [-1.1, -1.0], zhenya: [1.2, -1.2], yeji: [-2.1, -2.1], lusya: [2.2, -2.3], franko: [0.1, -2.8] };
      const D = v3(0, 0, -1);
      KEYS.forEach((k, i) => {
        const c = cats[k], s = slots[k], te = TL.hook.splash[i], tau = tt - te;
        const E = v3(H.x + s[0], SURF + 0.5, H.z + s[1]);
        splashes[i].update(E.clone().setY(SURF - 0.4), tau, 1);
        if (tau < 0) return;
        const dist = 2.6 * (1 - Math.exp(-1.6 * tau)) + 0.9 * tau;
        const p = E.clone().add(v3(0, -dist * 0.48, -dist * 0.85));
        c.rig.root.visible = c.gun.visible = true;
        catRoot(c, p, D, D, 0, tt + s[0], lerp(-1.25, -0.4, smooth(tau / 1.4)));
        catPose(c.rig, tt, { ph: s[0] * 2 });
        axes(c.rig, fwd, up); c.hold(fwd, up);
      });
      const ly = hookLeadY(tt);
      cam(v3(2.6, Math.min(SURF - 3.6, ly - 1.8), H.z + 4.4 - tt * 1.0), v3(0, ly - 0.2, H.z - 1.6 - tt * 0.8), 52);
    };

    // ------------------------------------------------------------------ Yeji: floats at the surface, shoots down into a bait ball
    const yejiShot = (tt: number) => {
      const A = dirOf(0.3), R = rightOf(A);
      const pitch = lerp(0.05, -0.95, ramp(tt, 1.3, 2.1));
      const pos = YEJI.clone().add(v3(0, 0.03 * Math.sin(tt * 1.7), 0)).addScaledVector(A, -0.2 * (1 - smooth(tt / 2)));
      const bc = new THREE.Vector3();
      const fishAt = (x: number, o: V3) => { ballC(x, bc); const a = x * 1.5 + 1; return o.copy(bc).add(v3(Math.cos(a) * 1.05, 1.05 + 0.1 * Math.sin(x * 3), Math.sin(a) * 1.05)); };
      ballC(tt, bc);
      const F = fishAt(shot('yeji').hit, new THREE.Vector3());
      let camP: V3, camL: V3, fov = 50;
      if (tt < 1.2) { camP = bc.clone().add(v3(0.5, -2.4, 0.8)).addScaledVector(R, 0.6 * tt); camL = YEJI.clone(); } // under the ball, looking up at her
      else {
        // over her shoulder from just under the surface: down at the ball and the little pink fish she picks
        const k = ramp(tt, 1.2, 1.6);
        camP = YEJI.clone().addScaledVector(R, 1.3).addScaledVector(A, 0.2).add(v3(0, -1.0 - 0.4 * (1 - k), 0));
        const sy = shot('yeji'), kR = ramp(tt, sy.hit, sy.hug);
        // as she reels it up, glide to her front-right, looking at her body (its centre is ahead of the feet root)
        const body = YEJI.clone().addScaledVector(A, 0.3).add(v3(0, -0.35, 0));
        camL = YEJI.clone().lerp(F, 0.6).lerp(body, kR); fov = lerp(62, 46, kR);
        camP.lerp(body.clone().addScaledVector(A, 1.7).addScaledVector(R, 1.1).add(v3(0, 0.05, 0)), kR);
      }
      core({ i: 0, tt, pos, dir: A, pitch, S: YEJI.clone().add(v3(0, -0.4, 0)), camP, camL, fov, fishAt, pose: { rate: 0.6, kick: 0.5 } });
    };

    // ------------------------------------------------------------------ Silent: lands on the sand, lies still like a rock
    const silentShot = (tt: number) => {
      const s = shot('silent'), c = cats.silent, h = c.height, A = SILENT_A.clone(), R = rightOf(A), land = s.land!;
      // he lies ON the sand: the highest sand under his body, plus his belly
      let top = -9;
      for (let k = 0; k <= 4; k++) { const q = G.clone().addScaledVector(A, -0.9 * h * k / 4); top = Math.max(top, sandY(q.x, q.z)); }
      const lying = G.clone().addScaledVector(A, -0.9 * h).setY(top + 0.2 * h);
      const kL = smooth(tt / land);
      const pos = lying.clone().add(A.clone().multiplyScalar(-0.6).add(v3(0, 2.2, 0)).multiplyScalar(1 - kL));
      const pitch = lerp(-1.0, 0.0, kL);
      const head = G.clone().setY(top + 0.25 * h);
      const fishAt = (x: number, o: V3) => o.copy(head).addScaledVector(A, lerp(6.0, 1.7, smooth((x - land) / 2.3))).add(v3(0, 0.1 + 0.04 * Math.sin(x * 3), 0.08 * Math.sin(x * 1.3)));
      let camP: V3, camL: V3, fov = 44;
      if (tt < 1.7) { // low and to the side: he lands, the eels duck
        camP = G.clone().addScaledVector(A, 3.0).addScaledVector(R, -4.8).add(v3(0, lerp(1.6, 1.0, kL), 0)); fov = 34; // from outside the eel field
        camL = G.clone().addScaledVector(A, -0.3 * (1 - kL)).add(v3(0, lerp(1.3, 0.2, kL), 0));
      } else { // his view: just behind his head, along the sand at the puffer swimming in
        camP = head.clone().addScaledVector(A, -1.2).addScaledVector(R, 0.55).add(v3(0, 0.65, 0));
        camL = head.clone().addScaledVector(A, 2.4).add(v3(0, 0.12, 0)); fov = 50;
      }
      camP.y = Math.max(camP.y, sandY(camP.x, camP.z) + 0.3); // never under the sand
      const still = tt > land && tt < s.shoot - 0.25;
      core({ i: 1, tt, pos, dir: A, pitch, S: G.clone().addScaledVector(A, -0.2).setY(top + 0.5 * h + 0.15), camP, camL, fov, fishAt,
        pose: { rate: still ? 0.12 : 1.2, kick: still ? 0.02 : 0.8, tilt: 0.12 * ramp(tt, s.shoot - 0.6, s.shoot - 0.3) } });
      if (ctx.camera.position.y < sandY(ctx.camera.position.x, ctx.camera.position.z) + 0.25) ctx.camera.position.y = sandY(ctx.camera.position.x, ctx.camera.position.z) + 0.25;
      // sand puffs on the landing and when he rises; the garden eels duck, then creep back out
      const rise = s.hug - 0.1;
      puff.update(G.clone().addScaledVector(A, -0.45 * h).setY(top + 0.05), tt < 1.7 ? tt - land : -1, 0.9); void rise; // gone once we look from behind his head (it hung in front of the lens)
      eels.update(tt, (_i, p) => {
        const d = p.distanceTo(G);
        const a = land + d * 0.08, b = rise + d * 0.08;
        return Math.max(ramp(tt, a, a + 0.12) * (1 - ramp(tt, 1.8 + d * 0.25, 2.8 + d * 0.25)), ramp(tt, b, b + 0.12) * (1 - ramp(tt, b + 1.0 + d * 0.2, b + 1.8 + d * 0.2)));
      });
    };

    // ------------------------------------------------------------------ Paw: hides behind two kelp stalks, parts them, strikes
    const pawShot = (tt: number) => {
      const s = shot('paw'), c = cats.paw, h = c.height, A = v3(1, 0, 0);
      const hy = KELP.y + 2.1, x0 = KELP.x;
      const pos = v3(x0 + 0.15 - 0.9 * h, hy - 0.05 * (1 - ramp(tt, 1.6, 2.0)), KELP.z);
      const F = v3(x0 + 3.0, hy + 0.1, KELP.z);
      const fishAt = (x: number, o: V3) => {
        if (x < 1.75) { const k = clamp01((x - 0.3) / 1.4); return o.set(x0 - 6.5, hy + 0.6, KELP.z - 10 + 20 * k); } // pass 1: a silver flash far behind him
        return o.copy(F).add(v3(0, 0.05 * Math.sin(x * 2), (s.hit - x) * 2.4));
      };
      const over = tt >= 1.8;
      const camP = over ? v3(x0 - 1.7, hy + 0.55, KELP.z + 0.7) : v3(x0 + 3.6, hy + 0.45, KELP.z + 1.5).add(v3(-0.2 * tt, 0, 0));
      const camL = over ? v3(x0 + 3, hy + 0.05, KELP.z) : v3(x0 - 0.05, hy + 0.12, KELP.z);
      core({ i: 2, tt, pos, dir: A, pitch: 0.1, S: v3(x0 + 0.9, hy + 0.1, KELP.z), camP, camL, fov: over ? 44 : 36, fishAt,
        pose: { rate: 0.5, kick: 0.4, tilt: over ? 0 : 0.15 * Math.sin(tt * 1.6) } });
      kelp.part(ramp(tt, s.part! - 0.2, s.part! + 0.3), tt > s.hit ? Math.exp(-(tt - s.hit) * 2.5) : 0, tt);
    };

    // ------------------------------------------------------------------ Lusya: torch on, into the big cave, the grouper glares back
    const lusyaShot = (tt: number) => {
      const s = shot('lusya'), c = cats.lusya, h = c.height, A = v3(0, 0, -1), cc = CAVE, R0 = CAVE_R;
      const y = cc.y + 1.0;
      const pA = v3(cc.x, y + 0.05, cc.z + R0 + 5.0), pM = v3(cc.x, y, cc.z + R0 + 0.3), pIn = v3(cc.x, y, cc.z + R0 * 0.25), pOut = v3(cc.x, y + 0.05, cc.z + R0 - 0.4);
      let pos: V3;
      if (tt < 1.4) pos = pA.clone().lerp(pM, smooth(tt / 1.4));
      else if (tt < 3.4) pos = pM.clone().lerp(pIn, smooth((tt - 1.4) / 2.0));
      else if (tt < 4.5) pos = pIn.clone();
      else pos = pIn.clone().lerp(pOut, smooth((tt - 4.5) / 1.2)); // backs out, dragging the grouper on the line
      const gp = v3(cc.x + 0.2, cc.y + 0.9, cc.z - R0 * 0.5);
      const fishAt = (x: number, o: V3) => o.copy(gp).add(v3(0.05 * Math.sin(x * 0.9), 0.04 * Math.sin(x * 1.3), 0));
      const inside = tt >= 1.4 && tt < 4.6;
      const scan = 0.45 * Math.sin((tt - 1.5) * 2.4) * ramp(tt, 1.5, 1.9) * (1 - ramp(tt, 2.9, 3.3));
      const headAt = pos.clone().addScaledVector(A, 0.9 * h).add(v3(0, 0.1, 0));
      let camP: V3, camL: V3, fov = 46;
      if (tt < 1.4) { camP = v3(cc.x + 4.0, cc.y + 2.4, cc.z + R0 + 8.5 - tt * 0.5); camL = v3(cc.x, cc.y + 2.0, cc.z + R0 - 1); fov = 52; }
      else if (tt < 3.6) { camP = headAt.clone().add(v3(0.55, 0.45, 1.3)); camL = headAt.clone().add(v3(-0.05, -0.1, -3.0)); fov = 54; }
      else if (tt < 4.6) { camP = headAt.clone().add(v3(0.42, 0.42, 0.9 - (tt - 3.6) * 0.2)); camL = gp.clone().add(v3(0, 0.05, 0)); fov = 30; } // over her shoulder: the grouper glares back from the far end
      else { camP = v3(cc.x - 2.0, cc.y + 1.8, cc.z + R0 + 5.5); camL = v3(cc.x, cc.y + 1.3, cc.z + R0 + 0.3); }
      const r = core({ i: 3, tt, pos, dir: A, pitch: 0.05, S: v3(cc.x, y + 0.15, cc.z + R0 + 0.9), camP, camL, fov, fishAt, back: true, pose: { rate: inside ? 0.7 : 1.3, tilt: scan } });
      // light: outside a little deeper than the reef; inside only the torch (no sun caustics, almost no fill)
      if (inside) { ctx.mood('day', 'night', 1); U.uCaus.value = 0.08; } else { ctx.mood('day', 'golden', 0.25); U.uCaus.value = 1; }
      glow.forEach((m) => (m.visible = inside));
      fill.intensity = inside ? 1.6 : 0; fill.position.copy(ctx.camera.position).add(v3(0, 0.3, 0));
      const on = tt >= s.torch! ? (tt < s.torch! + 0.12 ? 0.5 : 1) : 0;
      axes(c.rig, fwd, up);
      const dir = (r.kH > 0.5 ? r.face.clone().add(v3(0, -0.6, 0)) : fwd.clone().applyAxisAngle(UPV, scan)).normalize();
      const head = c.rig.bone('Head').getWorldPosition(new THREE.Vector3()).addScaledVector(up, 0.1 * h);
      torch.position.copy(head); torch.target.position.copy(head).addScaledVector(dir, 3); torch.target.updateMatrixWorld();
      torch.intensity = 34 * on * (r.kH > 0.5 ? 0.3 : 1);
      beam.visible = lamp.visible = on > 0;
      beam.position.copy(head); beam.quaternion.setFromUnitVectors(v3(0, -1, 0), dir); beamM.opacity = inside ? 0.09 : 0.04;
      lamp.position.copy(head).addScaledVector(dir, 0.04); lamp.quaternion.setFromUnitVectors(UPV, dir);
    };

    // ------------------------------------------------------------------ Zhenya: sees the tuna school below, dives to 30 m, comes up with one
    const zhenyaShot = (tt: number) => {
      const s = shot('zhenya'), c = cats.zhenya, h = c.height, A = v3(0, 0, 1), x0 = WALL.x;
      const y = zhenyaY(tt);
      const z = tt < 1.2 ? lerp(WALL.z - 5, WALL.z + 0.4, smooth(tt / 1.2)) : lerp(WALL.z + 0.4, WALL.z + 2.2, smooth((tt - 1.2) / 1.9));
      const pitch = lerp(lerp(0.1, -1.35, ramp(tt, 0.9, 1.5)), 0.0, ramp(tt, 2.8, 3.3));
      const pos = v3(x0, y, z);
      const F = v3(x0, SURF - 30 + 0.1, WALL.z + 2.2 + 0.9 * h + 2.4);
      const fishAt = (x: number, o: V3) => o.copy(F).add(v3(-(s.hit - x) * 2.6, 0.08 * Math.sin(x), 0)); // one peels off the school's near edge
      const cat = pos.clone().add(v3(0, 0, 0.45 * h));
      let camP: V3, camL: V3, fov = 46;
      if (tt < 1.2) { camP = cat.clone().add(v3(1.2, 1.4, -2.6)); camL = cat.clone().add(v3(0, -3.5, 6)); fov = 52; } // over the edge: the school far below
      else if (tt < 3.3) { camP = v3(x0 + 1.5, y + 0.3, WALL.z + 7.4); camL = v3(x0, y - 0.9, WALL.z + 2.4); fov = 54; }
      else { camP = cat.clone().add(v3(0.9, 0.55, -1.6)); camL = cat.clone().add(v3(-0.2, 0, 3.0)); fov = 50; }
      core({ i: 4, tt, pos, dir: A, pitch, S: v3(x0, y, WALL.z + 2.4), camP, camL, fov, fishAt });
      // the deeper, the bluer and darker (back up a little on the ascent)
      ctx.mood('day', 'golden', 0.3 + 0.7 * clamp01((WALL.y + 0.9 - y) / (WALL.y + 0.9 - (SURF - 30))));
    };

    // ------------------------------------------------------------------ Franko: a tail behind a rock... he shoots it. It is a shark. It is angry.
    const sharkLocal = { tip: new THREE.Vector3(), dir: new THREE.Vector3() }, sharkHitSet = { v: false };
    // a loose stack above Franko (the frame is tall, not wide): [cat, right, ahead, up]
    const crew: [CatKey, number, number, number][] = [['yeji', -0.7, 0.4, 0.9], ['silent', 0.75, 0.5, 0.7], ['paw', -0.85, 0.9, 1.9], ['lusya', 0.85, 1.0, 1.8], ['zhenya', 0.0, 1.4, 2.9]];
    const frankoShot = (tt: number) => {
      const s = TL.franko as typeof TL.franko & { lunge: number }, c = cats.franko, A = FA, R = FR, S = FS, h = c.height;
      c.rig.root.visible = c.gun.visible = true; shark.root.visible = true;
      // Franko: in front of the crew, then off round the right side of the rock toward the tail
      const FP = rockAt.clone().addScaledVector(A, -2.0).addScaledVector(R, 3.7).setY(sharkRest.y + 0.15); // shoots from ~4.5 m
      const kGo = smooth((tt - 1.2) / 1.3);
      const tailAt = sharkRest.clone().addScaledVector(R, 1.3);
      const yaw0 = Math.atan2(R.z, -R.x); // resting: nose toward -R, the tail sticking out on the +R side of the rock
      // the shark: rests (slow tail), jolts on the hit, rises over the rock, turns on Franko, then comes for him
      const k1 = smooth((tt - s.hit) / (s.stop - s.hit));
      const sp = sharkRest.clone().add(v3(0, 2.9 * k1, 0)).addScaledVector(A, -1.6 * k1).addScaledVector(R, 0.6 * k1);
      const tug = 0.35 * ramp(tt, s.hit, s.stop);
      const pos = S.clone().lerp(FP, kGo).addScaledVector(A, tug);
      const fHead = pos.clone().add(v3(0, h * 0.55, 0)); // from this frame's position (the rig still holds the last frame's)
      const toCat = pos.clone().add(v3(0, h * 0.5, 0)).sub(sp);
      const kL = ramp(tt, s.lunge, s.t1 - s.t0); // the lunge
      sp.addScaledVector(toCat.clone().normalize(), 0.3 * ramp(tt, s.pov, s.lunge) + Math.max(0, toCat.length() - 4.6) * 0.5 * kL * kL); // it comes at him but stops well short (it must not look like it ate him)
      shark.root.position.copy(sp);
      const kT = ramp(tt, s.turn[0], s.turn[1]);
      const tc = toCat.clone().setY(0).normalize(), yaw1 = Math.atan2(-tc.z, tc.x);
      let dy = yaw1 - yaw0; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      const pitchDown = Math.atan2(toCat.y, Math.hypot(toCat.x, toCat.z)) * kT;
      shark.root.rotation.set(0, yaw0 + dy * kT, THREE.MathUtils.clamp(pitchDown, -0.5, 0.5) + 0.04 * Math.sin(tt * 0.9) - 0.25 * Math.sin(Math.PI * k1) * (1 - kT));
      shark.fishU.uFast.value = lerp(0.35, 0.9, kL);
      shark.fishU.uAmp.value = tt < s.hit ? 0.35 : lerp(1.6, 0.35, ramp(tt, s.hit, s.stop)) + 0.8 * Math.sin(Math.PI * kT) + 1.4 * kL;
      shark.fishU.uBend.value = -0.35 * Math.sign(dy) * Math.sin(Math.PI * kT);
      shark.root.updateMatrixWorld(true);
      // the crew hug their catches; they turn to watch Franko, then stare at the shark
      const wideCam = S.clone().addScaledVector(A, -4.6).addScaledVector(R, 1.1).add(v3(0, 1.5, 0));
      crew.forEach(([k, r, a, yy], i) => {
        const cc = cats[k], sh = SH.find((x) => x.cat === k)!, f = fishes[SH.indexOf(sh)];
        cc.rig.root.visible = cc.gun.visible = true; f.root.visible = true;
        const p = S.clone().addScaledVector(R, r).addScaledVector(A, a).add(v3(0, yy + 0.05 * Math.sin(tt * 1.3 + i), 0));
        const toCam = wideCam.clone().sub(p).setY(0).normalize(), toShark = sp.clone().sub(p).setY(0).normalize();
        const face = toCam.clone().lerp(toShark, ramp(tt, s.hit + 0.3, s.stop)).normalize();
        catRoot(cc, p, A, face, 1, tt + i);
        catPose(cc.rig, tt, { hug: 1, ph: i, tilt: 0.15 * Math.sin(tt * 4 + i) * (1 - ramp(tt, 1.0, 1.4)) });
        axes(cc.rig, fwd, up);
        cc.hold(v3(0, -1, 0).addScaledVector(face, 0.3).normalize(), face);
        f.root.position.copy(chestOf(cc, face, heldLen(sh)));
        const side = rightOf(face.clone().negate());
        f.root.quaternion.setFromEuler(new THREE.Euler(0, Math.atan2(-side.z, side.x), 0));
        f.root.scale.setScalar(puffScale(sh, 99));
        f.fishU.uAmp.value = 1.4;
      });
      const kU = ramp(tt, s.pov - 0.6, s.pov - 0.15);
      const faceShark = sp.clone().sub(pos).setY(0).normalize();
      const swimDir = tt < 2.4 ? FP.clone().sub(S).setY(0).normalize().lerp(A, smooth((tt - 1.8) / 0.6)).normalize() : A.clone();
      catRoot(c, pos, swimDir, faceShark, kU, tt);
      catPose(c.rig, tt, { surprise: kU, kick: 1 - 0.8 * kU, ph: 2 });
      axes(c.rig, fwd, up);
      const aimP = tailAt.clone().sub(c.muzzle(mz)).normalize();
      c.hold(aimP.clone().lerp(UPV, kU).normalize(), up.clone().lerp(faceShark, kU).normalize());
      // the spear sticks in the tail end and rides with the shark
      if (tt < s.shoot) { spear.hide(); sharkHitSet.v = false; }
      else if (tt < s.hit) { const m = c.muzzle(mz.clone()); spear.set(m.clone().lerp(tailAt, (tt - s.shoot) / (s.hit - s.shoot)), aimP, m); }
      else {
        if (!sharkHitSet.v) { // the hit stored in the shark's own frame at rest (the same for any frame)
          const inv = new THREE.Matrix4().compose(sharkRest, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw0, 0)), v3(1, 1, 1)).invert();
          sharkLocal.tip.copy(tailAt).applyMatrix4(inv);
          sharkLocal.dir.copy(aimP).transformDirection(inv);
          sharkHitSet.v = true;
        }
        spear.set(sharkLocal.tip.clone().applyMatrix4(shark.root.matrixWorld), sharkLocal.dir.clone().transformDirection(shark.root.matrixWorld), tt < s.pov ? c.muzzle(mz.clone()) : null);
      }
      hearts.update(S.clone().addScaledVector(A, 1.0).add(v3(0, 3.0, 0)), tt / 1.2, ctx.camera, 0.14);
      // camera: the crew from behind (the tail behind the rock in the back) → following Franko round the rock →
      // the shark rising over it and turning → the shark's eye view of Franko → over his shoulder as it comes at him
      const head = shark.root.localToWorld(v3(0.42 * s.len, 0.03 * s.len, 0)); // the hammer
      if (tt < 1.3) cam(wideCam.clone().addScaledVector(A, tt * 0.2), S.clone().addScaledVector(A, 2.5).addScaledVector(R, 1.0).add(v3(0, 1.1, 0)), 50);
      else if (tt < s.shoot - 0.35) { // following him round the rock toward the tail
        cam(pos.clone().addScaledVector(A, -1.7).addScaledVector(R, 0.55).add(v3(0, 0.45, 0)), tailAt.clone().lerp(pos, 0.25), 46);
      } else if (tt < s.hit + 0.7) { // the catch, side-on: Franko, the spear in flight, the cup on the tail
        const mid = pos.clone().lerp(tailAt, 0.5), line = tailAt.clone().sub(pos).setY(0).normalize();
        const perp = rightOf(line); // over his right shoulder: his back, the spear flying, the cup hitting the tail
        cam(pos.clone().addScaledVector(line, -1.5).addScaledVector(perp, 0.6).add(v3(0, 0.75, 0)), tailAt.clone().lerp(pos, 0.15), 46); void mid;
        if (tt >= s.hit) kick(tt, s.hit, 0.04);
      } else if (tt < s.pov) { // wide from behind him: the shark rises over the rock and turns on him
        cam(pos.clone().addScaledVector(A, -3.4).addScaledVector(R, -1.0).add(v3(0, 1.2, 0)), sp.clone().lerp(pos, 0.3).add(v3(0, 0.3, 0)), 52);
      } else if (tt < s.face) {
        cam(head.clone().lerp(fHead, 0.08 + (tt - s.pov) * 0.06).add(v3(0, 0.05, 0)), fHead, 38); // the shark's eye view, creeping closer
      } else {
        // three-quarter on the angry face; the gap closes as it lunges (the camera is where Franko is)
        const side = v3(0, 1, 0).applyQuaternion(shark.root.quaternion).cross(v3(1, 0, 0).applyQuaternion(shark.root.quaternion)).normalize();
        const nose = v3(1, 0, 0).applyQuaternion(shark.root.quaternion);
        // wide from the side and above: the hammer (its T reads from above) facing little Franko, a clear gap between them
        const mid = head.clone().lerp(fHead, 0.5);
        const toS = head.clone().sub(fHead).normalize(); void side;
        cam(fHead.clone().addScaledVector(toS, -2.4).add(v3(0, 0.9, 0)), head.clone().lerp(fHead, 0.3), 52); // behind Franko: him small in front, the hammerhead facing him across the gap
        kick(tt, s.lunge + 0.5, 0.03);
      }
      ctx.focus(null, 0);
    };

    const all = (): THREE.Object3D[] => [...KEYS.flatMap((k) => [cats[k].rig.root, cats[k].gun]), ...fishes.map((f) => f.root), shark.root, bigRock];
    // ------------------------------------------------------------------ staged covers (like Dive Cats 1): big faces, bright reef
    const coverP = v3(0, 2.3, 6);
    const stand = (k: CatKey, p: V3, face: V3, o: { hug?: number; surprise?: number; look?: number; tilt?: number; fish?: number; fishScale?: number } = {}) => {
      const c = cats[k];
      c.rig.root.visible = c.gun.visible = true;
      catRoot(c, p, face, face, 1, 1.3);
      catPose(c.rig, 1.3, { hug: o.hug ?? 1, surprise: o.surprise ?? 0, look: o.look ?? 0, tilt: o.tilt ?? 0 });
      axes(c.rig, fwd, up);
      c.hold(v3(0, -1, 0).addScaledVector(face, 0.3).normalize(), face);
      if (o.fish !== undefined) {
        const sh = SH[o.fish], f = fishes[o.fish], sc = o.fishScale ?? 1;
        f.root.visible = true;
        f.root.position.copy(chestOf(c, face, heldLen(sh) * sc));
        const side = rightOf(face.clone().negate());
        f.root.quaternion.setFromEuler(new THREE.Euler(0, Math.atan2(-side.z, side.x), 0));
        f.root.scale.setScalar(sc * puffScale(sh, 99) * (sh.fish === 'puffer' ? 1 : 1));
        f.fishU.uAmp.value = 1.2;
      }
    };
    // Franko's scared face for cover 2 (his model has no face rig). Measured on his face (camera-facing, metres from
    // the rig's headfront point): eyes at x ±0.047, y 0.098; nose y 0.059; chin y 0.03. Built as small 3D pieces:
    // wide white eyes with pin-prick pupils over his own eyes, a screaming mouth with fangs and tongue, one sweat drop.
    const scared = new THREE.Group(); scared.visible = false; ctx.scene.add(scared);
    let sweat: THREE.Object3D | null = null;
    {
      const mat = (c: string, basic = false) => { const m = basic ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c }); m.userData.noLook = true; return m; };
      const cap = (r: number, depth: number, m: THREE.Material) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, depth), m);
      for (const sd of [-1, 1]) {
        const eye = new THREE.Group(); eye.position.set(sd * 0.047, 0.1, 0.004);
        const rim = cap(0.0215, 0.25, mat('#141018', true)); // dark outline
        const white = cap(0.019, 0.45, mat('#ffffff', true)); white.position.z = 0.0015;
        const pupil = cap(0.0042, 0.4, mat('#0a0a0a', true)); pupil.position.set(-sd * 0.003, -0.002, 0.0095); // tiny, looking at the shark above
        const glint = cap(0.0014, 0.4, mat('#ffffff', true)); glint.position.set(-sd * 0.003 + 0.0016, 0.0005, 0.0115);
        eye.add(rim, white, pupil, glint);
        eye.rotation.z = sd * 0.08;
        // a worried brow over each eye, inner end up
        const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0028, 0.022, 4, 8).rotateZ(Math.PI / 2), mat('#2a2024', true));
        brow.position.set(sd * 0.045, 0.131, 0.008); brow.rotation.z = sd * -0.38;
        scared.add(eye, brow);
      }
      // the screaming mouth: a tall dark oval (it fits between the nose and the chin), two little fangs, a tongue
      const mouth = new THREE.Group(); mouth.position.set(0, 0.038, 0.006); mouth.scale.setScalar(1.3);
      const lip = cap(0.0135, 0.3, mat('#d88a8a')); lip.scale.set(0.95, 1.12, 1);
      const hole = cap(0.0115, 0.35, mat('#2a0810', true)); hole.scale.set(0.95, 1.12, 1); hole.position.z = 0.001;
      const tongue = cap(0.007, 0.5, mat('#ff6f8e', true)); tongue.scale.set(1.25, 0.8, 1); tongue.position.set(0, -0.0065, 0.0035);
      const fang = (x: number) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.0025, 0.0055, 6).rotateZ(Math.PI), mat('#ffffff', true)); f.position.set(x, 0.0095, 0.004); return f; };
      mouth.add(lip, hole, tongue, fang(-0.005), fang(0.005));
      // one glossy sweat drop on his temple
      const drop = new THREE.Group(); drop.position.set(0.09, 0.11, 0.01); drop.scale.setScalar(1.35); drop.rotation.z = -0.25; sweat = drop;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.008, 14, 10), mat('#8fe4ff', true));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0075, 0.013, 14), mat('#8fe4ff', true)); tip.position.y = 0.0095;
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), mat('#ffffff', true)); shine.position.set(-0.0028, 0.002, 0.0065);
      drop.add(ball, tip, shine);
      scared.add(mouth, drop);
      scared.traverse((o) => { o.userData.noLook = true; o.userData.noShadow = true; });
    }
    const stageCover = (n: number) => {
      scared.visible = false;
      const P = coverP, toCam = v3(0, 0, 1);
      ctx.mood('day'); U.uCaus.value = 1;
      if (n === 1) { // all six with their catches, the hammerhead looming behind them
        const row: [CatKey, number, number, number, number][] = [['paw', -0.5, 0.42, -0.35, 2], ['lusya', 0.0, 0.5, -0.45, 3], ['zhenya', 0.52, 0.42, -0.35, 4], ['yeji', -0.48, -0.05, 0.35, 0], ['franko', 0.02, -0.12, 0.45, -1], ['silent', 0.5, -0.05, 0.35, 1]];
        for (const [k, x, y, z, fi] of row) {
          const q = P.clone().add(v3(x, y, z)), face = v3(0, 0, 3.2).sub(v3(x, 0, z)).normalize();
          stand(k, q, face, fi >= 0 ? { fish: fi, fishScale: [0.9, 0.8, 0.45, 0.5, 0.42][fi] } : { surprise: 0.7 });
        }
        shark.root.visible = true; shark.root.position.copy(P.clone().add(v3(0.3, 1.38, -2.2)));
        shark.root.rotation.set(0, Math.atan2(-toCam.z, toCam.x) + 0.25, -0.18); shark.fishU.uAmp.value = 0.6; shark.root.updateMatrixWorld(true);
        cam(P.clone().add(v3(0, 0.6, 3.3)), P.clone().add(v3(0, 0.82, 0)), 46);
      } else if (n === 2) { // Franko scared stiff, the hammerhead head-on right behind him
        stand('franko', P.clone(), toCam, { surprise: 1 });
        cats.franko.gun.visible = false; // the gun hid his body
        // a scared face (the model has no face rig): an open screaming mouth under the nose, sweat drops, shock lines
        const hf = cats.franko.rig.bone('headfront').getWorldPosition(new THREE.Vector3()), hh = cats.franko.height;
        scared.visible = true; scared.children.forEach((c) => (c.visible = c === sweat)); // his own face; only a sweat drop beside it
        scared.position.copy(hf).add(v3(0, -0.012 * hh / 0.68, 0.0)).add(v3(0, 0, 0.06).applyQuaternion(ctx.camera.quaternion)); scared.quaternion.copy(ctx.camera.quaternion);
        scared.scale.setScalar(hh / 0.68);
        shark.root.visible = true; shark.root.position.copy(P.clone().add(v3(-0.1, 0.92, -2.0)));
        shark.root.rotation.set(0, Math.atan2(-toCam.z, toCam.x), -0.12); shark.fishU.uAmp.value = 0.5; shark.root.updateMatrixWorld(true);
        cam(P.clone().add(v3(0, 0.42, 1.65)), P.clone().add(v3(0, 0.5, -0.6)), 54); // all of Franko in the lower half, the hammer above him
      } else { // Granny and the golden grouper, nose to nose
        const toR = v3(1, 0, 0.35).normalize();
        stand('lusya', P.clone(), toR, { hug: 0.25, tilt: -0.1 });
        const f = fishes[3]; f.root.visible = true;
        f.root.position.copy(P.clone().add(v3(0.85, 0.66, 0.15))); f.root.rotation.set(0, Math.atan2(toR.z, -toR.x) + Math.PI + 0.15, 0); f.root.scale.setScalar(0.7);
        cam(P.clone().add(v3(0.45, 0.8, 2.5)), P.clone().add(v3(0.42, 0.75, 0)), 42);
      }
      hearts.update(P, -1, ctx.camera);
    };

    return (fr: number) => {
      const tt = fr / DC02_FPS;
      if (cover) {
        reef.update(tt); ball.update(tt);
        for (const o of all()) o.visible = false;
        for (const f of shows) f.root.visible = false;
        spear.hide(); puff.update(G, -1); splashes.forEach((sp) => sp.update(G, -1)); eels.update(tt, () => 0);
        torch.intensity = 0; fill.intensity = 0; beam.visible = lamp.visible = false; glow.forEach((m) => (m.visible = false));
        kelp.group.visible = cv.group.visible = wall.group.visible = false;
        stageCover(cover);
        return;
      }
      reef.update(tt); kelp.update(tt); cv.update(tt); wall.update(tt); ball.update(tt); tunaSchool.update(tt);
      ctx.mood('day'); U.uCaus.value = 1;
      for (const o of all()) o.visible = false;
      spear.hide(); puff.update(G, -1); splashes.forEach((s) => s.update(G, -1));
      torch.intensity = 0; fill.intensity = 0; beam.visible = lamp.visible = false; glow.forEach((m) => (m.visible = false));
      const i = SH.findIndex((s) => tt >= s.t0 && tt < s.t1);
      const cat = i >= 0 ? SH[i].cat : null;
      kelp.group.visible = cat === 'paw'; cv.group.visible = cat === 'lusya'; wall.group.visible = cat === 'zhenya';
      if (cat !== 'silent') eels.update(tt, () => 0);
      if (tt < TL.hook.t1) { hook(localT(TL.hook, tt)); hearts.update(G, -1, ctx.camera); return; }
      const tl = i >= 0 ? localT(SH[i], tt) : 0;
      for (const f of shows) f.root.visible = false;
      if (cat === 'yeji') yejiShot(tl);
      else if (cat === 'silent') silentShot(tl);
      else if (cat === 'paw') { ctx.mood('day', 'golden', 0.12); pawShot(tl); }
      else if (cat === 'lusya') lusyaShot(tl);
      else if (cat === 'zhenya') zhenyaShot(tl);
      else { bigRock.visible = true; frankoShot(localT(TL.franko, tt)); }
      if (i >= 0) showCard(i, tl);
    };
  }, [cover, look]);

  const hookOn = t > 0.25 && t < 4.6;
  const cur = SH.find((s) => t >= s.t0 && t < s.t1) ?? (t >= TL.franko.t0 ? { cat: 'franko', t0: TL.franko.t0, tag: TL.franko.tag } : null);
  const tagK = cur ? clamp01((t - cur.t0 - 0.25) / 0.15) * (1 - clamp01((t - cur.t0 - 2.1) / 0.2)) : 0;
  const depth = depthAt(t);
  // the species card text (and the hammerhead's name as it rises over the rock)
  const cs = SH.find((x) => t >= x.t0 + x.card && t < x.t1);
  const fr = t - TL.franko.t0;
  const card = cs ? { name: cs.species, fact: cs.fact, k: clamp01((t - cs.t0 - cs.card) / 0.3) * (1 - clamp01((t - cs.t1 + 0.35) / 0.3)) }
    : fr > 3.1 && fr < 5.7 ? { name: TL.franko.species, fact: '', k: clamp01((fr - 3.1) / 0.3) * (1 - clamp01((fr - 5.4) / 0.3)) } : null;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <LookStage setup={setup} style={look === 'smooth' ? 'reef-smooth' : cover ? 'reef-hi' : 'reef'} />
      {!clean && hookOn && (
        <AbsoluteFill style={{ alignItems: 'center', top: '13%' }}>
          <div style={{ fontFamily: PIX, fontSize: 92 * sc, color: '#fff', textShadow: outline(Math.round(7 * sc)), letterSpacing: 4, transform: `scale(${Math.min(1, 0.6 + (t - 0.25) * 4)})` }}>DIVE CATS</div>
        </AbsoluteFill>
      )}
      {!clean && cur && tagK > 0 && (
        <AbsoluteFill style={{ alignItems: 'center', top: '12%' }}>
          <div style={{ fontFamily: PIX, fontSize: 64 * sc, color: '#ffe25a', textShadow: outline(Math.round(6 * sc)), transform: `scale(${0.7 + 0.3 * tagK})`, opacity: tagK }}>{NAME[cur.cat as CatKey]}</div>
          <div style={{ fontFamily: PIX, fontSize: 38 * sc, color: '#fff', textShadow: outline(Math.round(5 * sc)), marginTop: 18 * sc, opacity: tagK }}>{cur.tag}</div>
        </AbsoluteFill>
      )}
      {!clean && card && (
        <AbsoluteFill style={{ alignItems: 'center', top: '76%' }}>
          <div style={{ fontFamily: PIX, fontSize: 60 * sc, color: '#ffe25a', textShadow: outline(Math.round(6 * sc)), transform: `scale(${0.6 + 0.4 * card.k})`, opacity: card.k, textAlign: 'center' }}>{card.name}</div>
          <div style={{ fontFamily: PIX, fontSize: 30 * sc, color: '#fff', textShadow: outline(Math.round(4 * sc)), marginTop: 14 * sc, opacity: card.k, textAlign: 'center', maxWidth: 900 * sc }}>{card.fact}</div>
        </AbsoluteFill>
      )}
      {!clean && depth !== null && !card && (
        <div style={{ position: 'absolute', right: 48 * sc, top: 230 * sc, fontFamily: PIX, fontSize: 40 * sc, color: '#bff6ff', textShadow: outline(Math.round(5 * sc)) }}>{`${depth} M`}</div>
      )}
      {sound && <Audio src={staticFile('episodes/dc02/mix.wav')} />}
    </AbsoluteFill>
  );
};
