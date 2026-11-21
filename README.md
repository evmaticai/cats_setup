# Cats setup

Everything needed to make **Paw and Friends** cat Shorts (`@pawandfriendscats`), in one repo: the render project,
the engine, the cat episodes, the 3D cat models, the sounds, the skills, the research and the channel's video
packs. Six real cats (Paw, Silent, Zhenya, Yeji, Lusya and Franko the kitten) rebuilt as low-poly 3D characters
with their own photo fur, animated in three.js code and rendered by Remotion. **No other repo is needed.**

Quick start: do the four setup steps below, open Claude Code and say **"check my cats setup"**. Then say
**"make a new cat video"**.

## What is in this repo

| Path | What it is |
|---|---|
| `package.json`, `src/`, `remotion.config.ts` | The Remotion project. `src/Root.tsx` registers the cat videos: `Cookies`, `Isla` (P08), `Dc02` (Dive Cats 2), `Dc03` (Dive Cats 3, in progress), plus tests (`CozyTest`, `Dc02Reef`, `Dc02Cast`, `CharLineup`). |
| `src/engine/look/` | The engine: LookStage and the looks. `styles/cozy-smooth.ts` is the house look, `reef-smooth.ts` its underwater twin. |
| `src/three-shorts/cozy/` | Home-scene episodes (`cookies/Cookies.tsx` is the template for a new video) and the framing gate (`gate.ts`). |
| `src/three-shorts/dc02/`, `dc03/` | The Dive Cats underwater episodes (reef, fish, shark). |
| `public/characters/dc02/` | The six cats (`<cat>.glb`), `geared/` (with dive masks), `fish/`, props. `dc03/` holds the hammerhead. Heights: Paw .95, Silent .95, Zhenya 1.06, Yeji .89, Lusya 1.0, Franko .68. |
| `public/episodes/` | The sound beds of Cookies, Isla and Dive Cats 2. |
| `skills/cats-setup/` | Sets up and checks a machine. |
| `skills/paw-cats/` | Makes a cat Short: idea → style lock → shots → build → sound → critic → 4K → pack. `STYLE.md` is the look, `FORMAT.md` the format and idea bank, `CHECKS.md` the gates. |
| `skills/prepare-to-post/` | Covers, tag research, copy, and the upload to YouTube as Private. |
| `videos/` | The channel's video folders: `posted/` (P01–P06) and `queue/` (P08, P09), each with `UPLOAD.md`, the thumbnail and covers. New videos go in `queue/`. The mp4 files are not in git (too big). |
| `films/` | Notes, scripts and sound-mix scripts of the cat films (`isla/build/mix_isla.py` is the template for a loop's sound). |
| `reference/` | `RESEARCH.md` (the niche), `RETRO.md` (Dive Cats 2's mistakes), `ENGINE.md` (how the engine works), `COVERS.md` (how covers are staged). |
| `assets/sfx/` | Approved cat sounds (CC0, credits beside them). |
| `tools/lowpoly_fish.py` | The Blender script of the asset gate. |

## Setup (Windows PowerShell; on a Mac use Homebrew and `ln -s`)

### 1. Tools

```powershell
winget install -e --id Git.Git; winget install -e --id OpenJS.NodeJS.LTS; winget install -e --id Gyan.FFmpeg; winget install -e --id Python.Python.3.12
```

Optional: Blender 5.2 (`winget install -e --id BlenderFoundation.Blender`), only for adding new 3D models. Chrome with
the Claude in Chrome extension, only for uploading.

### 2. Clone

```powershell
mkdir $HOME\Projects\Evmaticai-projects -Force; cd $HOME\Projects\Evmaticai-projects; git clone https://github.com/evmaticai/cats_setup.git
```

### 3. Install

```powershell
cd $HOME\Projects\Evmaticai-projects\cats_setup; npm ci; npx remotion browser ensure
```

### 4. Skills

Link the three skills into Claude, so a `git pull` updates them (junctions need no admin rights):

```powershell
$S = "$HOME\.claude\skills"; $R = "$HOME\Projects\Evmaticai-projects\cats_setup\skills"; mkdir $S -Force | Out-Null; 'cats-setup','paw-cats','prepare-to-post' | ForEach-Object { if (-not (Test-Path "$S\$_")) { New-Item -ItemType Junction -Path "$S\$_" -Target "$R\$_" | Out-Null } }
```

Start a new Claude session so it loads them.

### 5. Check

```powershell
npx tsc --noEmit -p .
```

```powershell
npx remotion still src/index.ts Cookies out/setup-check.png --frame=60
```

`out\setup-check.png` should show Paw and Silent with cookies in the soft, saturated Dive Cats 1 look. Or say
**"check my cats setup"** and the `cats-setup` skill runs every check.

### Optional extras

| Extra | What it adds | Without it |
|---|---|---|
| [VideoHub](https://github.com/evmatic-labs/videohub) (founders' repo) | Live preview, notes on frames, render queue | Watch the 720p preview mp4 as a file; render with `npx remotion render` |
| [Research engine](https://github.com/evmatic-labs/evmatic-research-ultimate) (founders' repo) | Hype research for ideas, tag research before posting | Use the idea bank in `FORMAT.md` and plain web search |
| YouTube Studio access to Paw and Friends (a founder adds you) | Uploading | A founder uploads the finished folder |

## Making a video

Say **"make a new cat video"** (or give the idea: "us at 3am?, Paw grooms Silent"). The `paw-cats` skill:

1. **Idea:** one beat from `FORMAT.md` or yours, as one sentence with the caption.
2. **Style lock:** one still in the `cozy-smooth` look next to the Dive Cats 1 look. You OK it before anything is built.
3. **Shot sheet:** 1–3 shots, each with its payoff (what must read, how big, how long).
4. **Assets:** any new prop or animal passes the asset gate (CC0 / CC BY, side-by-side with its reference).
5. **Build:** a new folder in `src/three-shorts/cozy/<ep>/` (start from `cookies/Cookies.tsx`), registered in `src/Root.tsx`, with the framing gate on every frame.
6. **Sound:** an original wordless bed, a full (−14 LUFS) and a clean (−22 LUFS) version. Popular songs are added in the app at upload, never in the file.
7. **Critic, then preview:** a fresh agent hunts problems in full-size frames; then you watch the 720p preview.
8. **Final and pack:** 4K render, 2–3 covers, `videos/queue/Pxx · <title>/` with `UPLOAD.md`.
9. **Teach:** each fix becomes a rule in the skill.

Then commit and push: the episode code, the pack and any skill change. Say **"post it"** to upload as **Private**
with `prepare-to-post`; it goes Public only on the channel owner's word.

The format in one line: a 7–9 s wordless loop of two cats in an "us?" moment, frame 1 already cute, the joke in the
caption, AI answered **No**.

Useful commands (in the repo folder):

| Command | Does |
|---|---|
| `npx remotion studio src/index.ts` | Opens the Remotion studio to scrub any video |
| `npx remotion still src/index.ts <Comp> out/x.png --frame=<n>` | One frame |
| `npx remotion render src/index.ts <Comp> out/x.mp4` | The 720p video |
| `npx remotion render src/index.ts <Comp> out/x-4k.mp4 --width=2160 --height=3840 --concurrency=2` | The 4K final (the engine draws at the size it is given; `--scale` would only upscale 720p) |

## Where this came from

The project was split out of the founders' `kipishkrytoi` repo (branch `three-shorts`, 2026-11-21), keeping only
what the cat videos use. Work on cat videos happens here from now on; a change made there to the shared engine is
copied here by hand when a cat video needs it.

Not in this repo: the video files (25–620 MB each; posted ones are on YouTube) and the Dive Cats 1 Blender
project (P06 was made in Blender, not in this engine).
