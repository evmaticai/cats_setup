# The house look: smooth (the Dive Cats 1 look)

The user's pick (2026-11-21), after seeing Dive Cats 2 in both looks: **"this is much better"**. The first led3.an-style PS1 pixel look (style `cozy`) was judged too pixelated and is kept only on request.

Two engine styles share this look (kipishkrytoi three-shorts worktree, `src/engine/look/styles/`):
- **`cozy-smooth`** for home scenes (rooms, beds, kitchens, a beach at sunset). Its moods: `day` = a sunny room or meadow, `golden` = evening lamp or sunset, `night` = a dark room with one warm lamp.
- **`reef-smooth`** for underwater (Dive Cats). Its moods: `day` = the reef, `golden` = the abyss, `night` = inside the cave.

Reference frames: Dive Cats 1 (VideoHub workspace `outputs/2026-11-20/2026-11-20 Dive Cats 4K v1.mp4`) and the smooth Dive Cats 2 (VideoHub workspace `films/dive-cats-2/preview/dive-cats-2-smooth-v1.mp4`; both files are on Sasha's PC only, and Dive Cats 1 is on YouTube as P06).

## What makes the look
| Part | Setting | Why |
|---|---|---|
| **Resolution** | Full resolution (`ps1: false`), SMAA | Clean edges, no pixels or dot pattern. The user found the pixel look "too much" |
| **Shading** | `material: 'standard'`, roughness 0.8, soft shadows (`shadowRadius` 3), contact AO (radius 0.4–0.5) | The soft Blender-like light of Dive Cats 1 |
| **Colour** | ACES, saturation 1.18–1.22, contrast 1.12–1.14, exposure × 0.82 | Deep, saturated, not washed out (the first smooth try was pale) |
| **Glow** | Gentle bloom (threshold 1.0, intensity 0.25–0.3), light vignette | A soft lift on the bright bits, never a blown-out haze |
| **Textures** | The cats' own photo fur, loaded at 1024 px (`loadRigged(url, 1024, true)`); real textures on props | Crisp fur. At 512 px the fur looks blocky in this look |
| **Reef materials** | Set `REEF.snap = false` before building (Dc02 does this for `look: 'smooth'`) | No PS1 vertex wobble |

Episode components take a `look` prop (`'smooth'` default, `'pixel'` for the old led3.an look): `Cookies`, `Isla`, and `Dc02` (`'smooth'` or `'ps1'`).

## Dark scenes
Smooth rendering shows real darkness; the pixel dither used to hide it. Caves, deep water and night rooms need a visible key on the faces (a torch, a warm face light, a rim) and a raised fill. Check them first in the style lock.

## Set and camera
- **One home set, reused:** a bed or sofa in a cozy room (leaf wallpaper, a lamp), plus fixed sets such as the sunny window, kitchen and beach. A recurring set is part of the brand.
- **The camera is level** with the cats, close, and static or slow. One framing per beat; faces big.
- Props get real textures: drawn on canvas (Cookies shows how) or CC0 photo textures (download only after the user's yes).

## Learned on the first videos
- **Sitting:** fold the legs (UpLeg X −1.45, Leg X +1.75, hips down 0.3 × height with `hipsOffset`). The body reads as a block, so frame closer: faces carry the shot. Standing T-pose cats read as toys.
- **The affectionate beat must close a visible gap:** start with the heads apart, slide in and tilt (about 0.5 rad) and hold for 2 s or more. Heads that already touch don't read.
- **Eating:** bring the food up to the mouth with the face to the camera. A head dipping to the plate shows only the skull. Place the camera before posing anything that's placed relative to it.
- **A glowing sun or bulb:** use a basic-material disc with a colour above 1, plus a soft additive halo, inside the sky dome (radius 450). Keep the halo off the faces.

## Changing the look
Change `styles/cozy-smooth.ts` or `styles/reef-smooth.ts` only, and render the style test again next to the reference frames. Engine changes (LookStage) are shared with other sessions, so keep them optional and off by default.
