# Dive Cats 3 models

## hammerhead_alenzo.glb: THE shark for Dive Cats 3 (2026-11-21, the user's pick against their reference)

"Great Hammerhead Shark" by Alenzo (CC BY 4.0, credit in `../downloads/CREDITS.md`). It has a real mouth under the hammer with modelled teeth on both jaws, a Rigify skeleton, and 11 clips (Swimming + _L/_R/_U/_D, Idle, Attacking, AttackingFromLeft/Right, Attacking_shake, Attacking_Shake_Loop). 5,112 triangles.

- **Made by:** `prep_alenzo.py` from the download.
  - It drops the ocean plane, particles and importer icosphere.
  - It warms the mouth interior toward the reference's pink (texels only, the grey skin untouched).
  - It normalises like the old shark: nose +X, length 1, centred, Y up in glTF. That is a transform on the top node, so the clips stay valid.
- **Driving it in code:**
  - The mesh is skinned to the **ORG-*** bones; Rigify's control bones drove them by constraints, which glTF drops. Turn ORG bones only.
  - **Jaw:** `ORG-mouth_HeadHammerSharkRig`, about its own local −X (`bone.quaternion.multiply(axisAngle(+X, −angle))`). 0.70 rad (40°) is the clip's own bite. Cap it at about 0.78 rad (45°): at 60° the lower jaw stretches in side view.
  - **Clips:** play them pure in t with `mixer.setTime(t)`, never `update(delta)`. Attacking reaches its bite at frame 4 of 13 (24 fps).
  - **Other bones:** spine and tail `ORG-spine02..05`, `ORG-tailMd01/02`, `ORG-tailUp01..03` / `ORG-tailDn01/02`; fins `ORG-fin01/02.L/R`; eyes `ORG-eye.L/R`.
- **Checks:**
  - glTF-Validator: 0 errors, 2 harmless warnings.
  - Loaded in three.js 0.187: all 11 clips, the 45° code jaw and the Attacking clip both open the mouth.
  - Side by side with the user's reference: `alenzo/vs_reference.png`. Mouth close-ups: `alenzo/mouth_sheet.png`.

## hammerhead_rigged.glb (2026-11-21): RETIRED, the user rejected its mouth

DC2's hammerhead (CC BY, "sharkingaround", already credited in `dive-cats-2/downloads/CREDITS.md`), with its own mesh, UVs and textures. It now has a skeleton and a real opening jaw. It is not wired into the film yet: block 1 still uses the code jaw in `src/three-shorts/dc03/shark.ts`.

- **Made by:** `rig_hammerhead.py` (background Blender 5.2, run again any time). The source is `hammerhead_rigged.blend`, and `hammerhead_src.glb` is the input.
- **Bones:**
  - `body` → `head` (the hammer) → `jaw`
  - `body` → `spine1` → `spine2` → `tail1` → `tail2`
  - `body` → `fin_L`, `fin_R`
  - Length is 1 along X with the nose at +X, the same as the old model. Scale it to 3.4 m in code as before.
- **Mouth:**
  - The lower jaw is cut free along the lip line.
  - Inside are a dark red mouth bag and two rows of teeth (materials `mouth` and `teeth`), hidden while the mouth is shut.
  - The jaw takes the head's share of the skin weights, so a shut jaw follows every head turn without a seam.
- **Driving it in three.js** (rotate about WORLD axes, like the engine's `rig.turn`):
  - **Jaw:** open it with `jaw` about world −Z (0.66 rad = wide open).
  - **Bending:** bend left or right with `head`, `spine1`, `spine2`, `tail1` and `tail2` about world Y. Pitch them about world Z.
  - **Fins:** rotate `fin_L` and `fin_R` about world X.
  - **Swimming:** swim comes from the spine and tail bones instead of the old shader wiggle.
- **Checks:**
  - glTF-Validator: 0 errors, 2 harmless warnings (no tangents for the unused normal map; the skinned mesh sits under its armature node, as every Blender export does).
  - Pose test in `posetest/` (sheets `sheet_mouth.png`, `sheet_body.png`, `check_below.png`): rest, jaw open, jaw ajar, head turn + jaw, tail curl, S-bend, nose down + fins.
  - Loaded and posed in three.js 0.187 (the project's version): it loads as a skinned mesh with all 9 bones, and the jaw and tail pose correctly.
- **Known limits:**
  - The jaw's cut edge is a sawtooth (the model's own triangles). Wide open it reads as cartoon teeth; slightly open it shows a thin red zigzag.
  - There is no smile shape key: the scripted one opened red gaps along the lip seam, so it was dropped. A happy shark has to come from body language (tail wag, a small open mouth).
