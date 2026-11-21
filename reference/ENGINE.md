# Building an episode

Copy the shape of `src/three-shorts/ts01/` (the reference episode).

## Framework

- `Ts01.tsx`: loads `words.json`, builds the shared sets once, loads the cast (`CAST` = role → GLB + height), builds every sequence, and each frame runs the active one. All sets live in one scene, far apart (the street sits at x = 300); a shot picks a set by where it puts the camera.
- `shared.ts`: `Shared` (ctx, words, `W(i)` = start of word i, sets, sparks, cast), `makeActor`, `glideCam`, `setCam`, `kick`, `smooth`, `hash`.
- `seqs.ts`: the sequence list with times (seconds of the voice, word indices in comments). One file per sequence (`seq01.ts` …), one owner per file, so sequences build in parallel.
- A sequence's `build(sh)` creates its objects once and returns `update(t)`, which sets everything it shows at time t: actor poses and visibility (the framework hides every actor each frame), camera, `ctx.mood`, `ctx.focus`, `ctx.sunFollow`.
- Composition: `Ts01` with props `{ style, res: 'preview' | 'final', to }`; `to` cuts the episode (the bake-off renders `to: 10`).
- **Reusable kits from ts02:**
  - `src/three-shorts/ts02/stilts.ts`: stilts on any rig, as poles on the Leg bones with a foot peg and a tip. `stiltPose()` is a stilt walk; `plant()` sets the root so the lowest tip touches the ground, so tips never float.
  - The episode grade: `Ts02.tsx` `grade(t)`.
  - Staged covers built from an episode's own set and cast: `ts02/cover.tsx`.
- The framework resets every actor's root scale (as well as its visibility) each frame, so a sequence may rescale a shared actor (ts02's baby) without leaking it into the next sequence. Set animation (`town.animate`) runs after `update()`: if a sequence needs a set piece's animated position in the same frame, export the formula from the set file instead of copying it (ts02 copied the tower sway into a sequence kit).

## Look: LookStage

`src/engine/look/LookStage.tsx` renders every style through one chain:
- N8AO → ink (its own pass, from depth and normals) → depth of field → tilt-shift band (optional);
- then bloom, tone curve, grade (with `shadowSat`), vignette → SMAA;
- PS1 renders small, grades, then applies a Bayer dither.

A style is one file in `src/engine/look/styles/`: moods (day, golden, night), AO, ink, DOF, tone curve, material kind and `matParams` (`rampDark`, `rampSteps`, `grime`, …). Objects get the style's materials through `ctx.applyLook(group)`.

These flags opt an object out:
- `userData.noLook`: keep its own material (glows, decals, sky);
- `noInk`: no outline;
- `noShadow`: casts no shadow (glass, glows, panes);
- `noGrime`: on a material, no grime;
- `collider`: body QA treats it as solid.

Everything is a pure function of the frame: `composer.render(0)`, no `Math.random` (use `hash`), no accumulation. Prove it: render one frame alone and inside a sequence, then diff the pixels; they must be identical.

### Light rules (ts01 v1 broke all of them: "no shadows" → `reference/video-research/ts01_AUDIT.md` §2)

1. **A sun per shot.** Call `ctx.sunFollow(center, { az, el, size, fill })` in every shot.
   - **Key:** side or back light relative to the camera, so shadows run toward the lens. A camera-side sun throws every shadow behind the subject, where no shot sees it.
   - **Interiors:** take the key through the window, el 13–35.
   - **Size:** the shadow box fits the shot (≈ 8 m office, 40–60 m street).
   - **Fill:** `fill` scales the sky light for that shot.
2. **Rooms are lit through openings.** Build a ceiling and a real window opening, with side walls cut back so a low sun reaches the back wall. A closed box blocks the sun, and walls off the shot's axis block off-axis sun. Panes carry emissive ≤ 0.5 and `noShadow`, or they blow out.
3. **Bias follows the texel:**
   - `bias` = −1e-4;
   - `normalBias` = 1.2 × (2 × size / mapSize).

   Never copy a bias from another project: a 4 cm bias deletes the shadow of everything smaller than 4 cm (the key, the sounder, papers).
4. **Fill stays low enough for form.**
   - **Hemi:** about 1.0–1.7 by day, × 0.5 at night.
   - **Bounce:** camera side.
   - **Toon ramp:** 3 steps with the terminator at N·L = 0 and `rampDark` ≈ 60 (110 kept turned-away faces bright).
   - **Shade colour:** keeps its hue (`shadowSat` ≈ 0.8); never azure grey.
5. **Tone curve.**
   - Neutral (or AgX) needs `toneMappingExposure = 1/0.6`, because ACES carries that lift built in. Switching curves without it darkened ts01 by 30–45 %.
   - Bloom threshold ≈ 1.3, so only true emissives bloom.
6. **AO at prop scale.** N8AO radius ≈ 0.45 m, intensity ≈ 2.2, tinted (`aoColor`). Every actor carries a contact blob, and big props get one too.
7. **Practicals cast shadows** (fire, lamps, a lantern): a 512 map each, bias −2e-3.
8. **Night is lit, not dark.** Moonlit ambient plus a coloured sky fill per set. The gate is per location (CHECKS.md → look gate): night L\* ≥ 38, a space scene with a planet ≥ 30. A planet shows its lit side to the lens, with the night side at a moonlit ambient (≈ 0.16 / 0.2 / 0.36), never black.
9. **Fog and DOF hide far things.** In `day` fog, an object 100+ m away fades out; the window Sun in a ts01 cover vanished. When the far background *is* the story, use `golden`, or a near cheat object, and keep `ctx.focus` strength ≤ 0.1.

### Surfaces, sets and characters (ts01 v1: "locations look undetailed")

1. **No flat material.**
   - `matParams.grime` ≈ 0.12 adds world-space value noise and per-object tint jitter to every non-skinned toon material.
   - Hero surfaces (counters, walls, ground) get painted Canvas2D textures at ≥ 500 texels/m: grain, seams, stains, wear (`paint.ts`, `*_paint.ts`). Cobbles are irregular setts with mortar, never dots.
2. **Dress front, middle and back.** Every location gets:
   - props on every surface the camera sees;
   - background life (extras, smoke, sway, flicker), all a function of t;
   - a blurred foreground object in about 1/3 of MS/CU shots.

   Every built prop must reach a frame; one that never does is wasted work.
3. **Characters read at phone size.**
   - Each role gets one strong colour and one accessory (`costume.ts`).
   - Painted face decals (`faces.ts`) on the Head bone: six expressions switched on story beats (a `FACE_CUES` table by word index), plus seeded blinks every 2.5–4 s.
   - The decal polygon offset stays small (−1/−1), or the eyes draw through a hand held in front of the face.
   - Staged shots set faces through `sh.faceOverride[role]`.
4. **Wires, props and lamps never cross a face.** Route cables along walls and under counters.
5. **Text on signs fits its board.** Size the font to the board width with a margin (measure with `measureText`), and mount the board on the camera side of its post. ts02 lost the W of WELCOME, and a post covered the E of LOSERS.
6. **The Quaternius chibi pack** (Ultimate Animated Character Pack, `characters/_candidates/fixed/q_*.glb`):
   - its eyes are the `Face` material; recolour it to the skin colour in compose and pass `eyeMat = 'Face'` to `makeActor`, so the painted decals are the only face;
   - `compose.cjs` keeps mesh *nodes* by node name (`Body`), not the mesh name (`Cube.004`). A wrong name writes a file with no mesh.

### Look gate before the fan-out

Render 5–6 stub stills of the sets with the cast and run `lookqa` on them **before** splitting sequences across agents. ts02's bright couch palette measured L\* 60–72 and chroma 40–50 in every location of v1 (gate 44–56 / 22–36). It was fixed with an episode grade: a CSS `filter: brightness(…) saturate(…)` on the `AbsoluteFill` around `LookStage`, with captions outside it, set per location as a pure function of the frame, and changing only on hard cuts (`Ts02.tsx`, `grade(t)`). Choosing the palette or grade at the start costs one render instead of a fix round.

## Animation: `src/engine/anim.ts`

- Sources: `glbSource(url, clip)` (Mixamo, Meshy, Quaternius GLB clips), `kimodoSource(url)` (rotation clips from `tools/kimodo.py`), `positionSource(url)` (the old position-only Kimodo clips in `public/motion/`).
- `bake(rig, src, MAP_*, name)`: calibrated retarget onto our rig (keeps twist), root motion split off (in-place cycles get stride-derived travel), foot contacts and pins, slide QA.
- `makePlayer(rig)` + `drive(rig, player, layers, base, yaw)`: weighted layers set from the frame, root motion applied, feet planted by two-bone IK. Code poses go after `drive`.
- Rigs load through `loadRigged(url, size, true)`; Mixamo, Rigify/Quaternius and VRM bone names are mapped to ours (`canonicalBone`).
- **Body guard: `src/engine/body.ts`.**
  - `fitBody(rig)` (once, after scaling) fits shapes to the character's own skinned mesh:
    - a convex hull for the head, hat included;
    - points on each hand;
    - capsules for the torso and arms.
  - Set pieces actors work at carry `userData.collider = true`: counter tops, desks, benches.
  - Every frame, after the sequence poses its actors, the framework calls `guard(body, boxes)`. It does four things:
    - clamps the spine and neck to human ranges;
    - pushes hands out of the head, torso and colliders, re-solving the arm with IK;
    - swivels or lifts an elbow whose arm crosses a desk;
    - with `qa`, logs `measure()` for `tools/animqa.sh`.
  - The guard repairs small contacts. A whole-body clash, such as a crouch into a desk, is a staging bug: fix it in the shot.
  - A prop held in a hand (a lead, a magnet, a pan) is placed after `sh.guard(actor)`. The guard may move the hand, and a prop placed from the unguarded hand is left inside the arm.
- Motion sources by need: Kimodo (`tools/kimodo.py`, needs `HUGGINGFACE_API_KEY`) for specific acting beats; the Meshy animation library for walks, runs and idles; `AnimLab` checks slide (target: planted median ≈ 0, p95 < 3 cm/frame).

### Animation rules (whoever writes a pose follows these; ts01 broke all of them, see `reference/video-research/animation/ANIMATION_QA.md`)

1. **Stage before you pick a clip.** For each acting beat write one line:
   - what is around the actor (counter at hip height in front, wall 0.6 m behind);
   - what the hands touch;
   - what must hold (he stays standing; his head stays above the counter).
2. **A clip must fit that note, not its name.** A borrowed clip from another episode was made for another body in another place:
   - A "scared" crouch behind a counter puts the head in the desk.
   - "Hands to ears" on a bigger cartoon head with a hat puts the hands inside the head.

   Before using a clip, look at its peak frames on this character, in this set. If it doesn't fit, generate one with Kimodo using the note's constraints, or build the beat from code poses.
3. **Skeleton retargeting moves joints, not bodies.** Any clip where a hand comes near the head, face, chest or another hand must be checked on the target character. It has a different head size, hat and face decal, so contacts land inside the body.
4. **Contacts are IK targets, not hopes.** A hand that touches something gets a target on that surface and a pole for the elbow, through `armIK`. Put the target on the surface, never inside it: for a hand on a desk, the palm sits 1–2 cm above the top.
5. **Code accents stay inside human ranges.** Accents such as `jolt`, `lean` and head turns add rotation on top of the clip, so clamp the total:

   | Joint | Range |
   |---|---|
   | Neck | flexion and extension ≤ 45°, rotation ≤ 60° |
   | Elbow | 0–150° |
   | Knee | 0–135° |
   | Spine | lean ≤ 30° per bone |

   A cartoon may exaggerate timing, but not break a joint.
6. **Big-head characters (chibi) cannot raise their arms straight up.** The head is wider than the shoulders, so a raised forearm goes into it, and on a figure flying at the lens raised, sideways and forward arms all cross the face. Use a wide V spread outward and low, fists forward at chest height, or arms swept back (ski jumper). ts02 v1 had Pip's arms in his head at 29.6 s and 36.1 s; the body guard logged about 2,000 hand-head corrections on clips made for adult proportions.
   - **Hands at the face** (cupped hands, a whistle, scissors by the chin) need a target at least 3 cm in front of the head's outline, not at the mouth. The guard's push-out is too small for these heads: in ts02, Otto's cupped fists sank into his jaw in three versions running.
   - **Effect lines and props near a face** (whistle blasts, sneeze puffs) start outside the head's outline and point away from it. ts02's whistle lines ran through Otto's eye.
7. **Nothing passes through anything.** That covers hand into head, hand into torso, body into a set piece, and feet under the floor. If a pose needs it, change the pose or the camera, not the tolerance.

## Sound

- Voice: `tools/vo.py` (one call, alignment → word timings, `tempo` stretch).
- Bed: `episodes/<ep>/bed.py` synthesises an original score + SFX on the picture's cues; each sequence owner writes `cues_<seq>.json`. No samples, so no Content ID risk.
- Final mux: loudness −14 LUFS / −1 dBTP.

## Render

- Preview: `npx remotion render src/index.ts <Comp> out/<ep>/v<N>.mp4 --props='{"style":"…","res":"preview","to":<s>}' --concurrency=4`.
- Final: the same with `"res":"final"` (2160×3840); keep `--concurrency` low (2) for N8AO at 4K. ts01's 64 s took ≈ 4 min.
- **Many stills:** run `npx remotion bundle src/index.ts --out-dir <dir>` once, then `npx remotion still <dir> …` per frame. Re-bundle after every code change.
- **Clean stills for covers:** `"captions": false`.

## Agents and edits (ts01: a lost line, crashed renders, broken template strings)

- **Ownership:** each parallel agent owns named files and edits nothing else. Engine changes go through the owner of the engine.
- **After every merge of agent work:**
  1. Read `git diff` for every changed file. ts01's bedroll line was swallowed into a comment and the miner floated.
  2. Re-run every gate: `tsc`, `lookqa`, `animqa` and the sweeps.
- **Never commit files you did not write.** Another session may share the worktree. Stage paths explicitly, never `git add -A`.
- **A scripted edit that appends a `// comment` to a line swallows any code after it on that line.** After every scripted edit, grep the changed files for code after `//` (`grep -nE "// .*;\s*[a-zA-Z_]+[.(]"`). ts02 lost the LOSERS sign this way for two versions, and no reviewer noticed it was missing.
- **Never leave debug code.** Remove debug lines before any render another agent might run; a leftover debug line in ts01 crashed renders mid-session.
- **CRLF files:** edit with Python `open(…, newline='')` and keep the file's line ending, or use the Edit tool. `sed` must never put a `//` comment inside a one-line object literal.
