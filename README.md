# Cats setup

Everything a machine needs to make **Paw and Friends** cat Shorts (`@pawandfriendscats`): the tools, the repos, the
cat models, the skills, the sign-ins, and a check that proves it all works. Six real cats (Paw, Silent, Zhenya, Yeji,
Lusya and Franko the kitten) rebuilt as low-poly 3D characters with their own photo fur, animated in three.js code,
rendered by Remotion, reviewed in VideoHub and posted to YouTube.

Quick start: do the steps below, then open Claude Code anywhere and say **"check my cats setup"**. The `cats-setup`
skill runs every check and tells you what is still missing. Then say **"make a new cat video"** and the `paw-cats`
skill takes it from an idea to a 4K file and its upload pack.

## What is in this repo

| Path | What it is |
|---|---|
| `skills/cats-setup/` | The skill that sets up and checks a machine (this page as steps an agent can run). |
| `skills/paw-cats/` | The skill that makes a cat Short: idea → style lock → shots → build → sound → critic → 4K → pack. `STYLE.md` is the house look, `FORMAT.md` the format and idea bank, `CHECKS.md` the gates. |
| `skills/prepare-to-post/` | The skill that makes the covers and copy and uploads a finished video to YouTube as Private. Shared with the other channels. |
| `reference/RESEARCH.md` | The niche research the format comes from (76 @led3.an posts against the account's median, plus 10 peers). |
| `reference/RETRO.md` | Every mistake of Dive Cats 2 and why it happened. The gates in `CHECKS.md` come from here. |
| `assets/sfx/` | The approved cat sounds (CC0, Freesound; `CREDITS.md` beside them). |
| `tools/lowpoly_fish.py` | The Blender script for the asset gate: turns a downloaded GLB into a clean scene model. |

## The pieces and where each comes from

| Piece | What it does | Where it comes from |
|---|---|---|
| **kipishkrytoi** repo, branch `three-shorts` | The engine (`src/engine/look/`, LookStage, rigs, styles `cozy-smooth` and `reef-smooth`), the cat episodes (`src/three-shorts/cozy/`, `src/three-shorts/dc02/`), the `three-shorts` and `make-character` skills (`skills/`), the channel folders (`channels/pawandfriends/`) and the posting tools (`tools/yt.py`, `tools/hq.py`). | `git@github.com:evmaticai/kipishkrytoi.git` (see **Known gaps**) |
| **Cat models** | `public/characters/dc02/<cat>.glb` (plain) and `geared/` (with dive masks), 108 MB. Heights: Paw .95, Silent .95, Zhenya 1.06, Yeji .89, Lusya 1.0, Franko .68. | Not in git yet (see **Known gaps**) |
| **VideoHub** | Live preview of a film from its code, review notes on frames, the render queue. MCP server `videohub` + skill `2cbinema-videohub`. | `git@github.com:evmatic-labs/videohub.git` |
| **Research engine** | `research-run` and `hype-research` skills + MCP server `research-engine` (search, YouTube search, fetch, a ledger of sources and claims). Used for ideas and for the tag research before posting. | `git@github.com:evmatic-labs/evmatic-research-ultimate.git` |
| **img2threejs** | Builds a new 3D model from reference images. Only needed when a video needs a new character or animal that no free model covers. | `git@github.com:img2threejs/img2threejs.git` (pinned to `v2.0.1`) |
| **This repo** | The cat skills, research, sounds and the setup check. | `git@github.com:evmaticai/cats_setup.git` |

## Setup, step by step

The commands are for Windows PowerShell. On a Mac use Homebrew for the tools and `ln -s` instead of junctions.
Every repo goes in `~/Projects/Evmaticai-projects/`; the skills expect that folder.

### 1. Tools

| Tool | Version that works | Install (Windows) | Needed for |
|---|---|---|---|
| Git + GitHub CLI | any recent | `winget install -e --id Git.Git`, `winget install -e --id GitHub.cli` | cloning, issues and PRs |
| Node.js | 22 LTS (22.23 tested) | `winget install -e --id OpenJS.NodeJS.LTS` | Remotion, VideoHub |
| ffmpeg | 7+ (9.0 tested) | `winget install -e --id Gyan.FFmpeg` | sound mix, loudness, covers, contact sheets |
| Python + uv | 3.12 for the research engine | `winget install -e --id Python.Python.3.12`, `winget install -e --id astral-sh.uv` | research engine, `tools/yt.py`, `tools/hq.py` |
| Blender | 5.2 | `winget install -e --id BlenderFoundation.Blender` | only the asset gate (`tools/lowpoly_fish.py`) |
| Chrome + the Claude in Chrome extension | any | from google.com/chrome | uploading in YouTube Studio |
| Claude desktop app (Code tab) or Claude Code CLI | latest | from claude.ai/download | running the skills |

### 2. GitHub access

Your GitHub account needs read access to `evmaticai/kipishkrytoi`, `evmatic-labs/videohub` and
`evmatic-labs/evmatic-research-ultimate` (ask a founder). Add your SSH key to GitHub, then `gh auth login`.

### 3. Clone the repos

```powershell
mkdir $HOME\Projects\Evmaticai-projects -Force; cd $HOME\Projects\Evmaticai-projects
```

```powershell
git clone -b three-shorts git@github.com:evmaticai/kipishkrytoi.git
```

```powershell
git clone git@github.com:evmaticai/cats_setup.git
```

```powershell
git clone git@github.com:evmatic-labs/videohub.git
```

```powershell
git clone git@github.com:evmatic-labs/evmatic-research-ultimate.git
```

Then install the engine's packages and Remotion's browser:

```powershell
cd $HOME\Projects\Evmaticai-projects\kipishkrytoi; npm ci; npx remotion browser ensure
```

### 4. Cat models

Put the cat models in `kipishkrytoi\public\characters\dc02\` (the six `.glb` files, `geared\`, `fish\`,
`divemask.glb`, `speargun.glb`). Until they are in git, get the folder from Sasha (see **Known gaps**).

### 5. VideoHub

Double-click `videohub\SETUP.cmd`, or run it with the recommended answers:

```powershell
node $HOME\Projects\Evmaticai-projects\videohub\scripts\install.mjs setup --yes --agents claude
```

It makes the workspace (default `~\Documents\VideoHub`), registers the `videohub` MCP server and installs the
`2cbinema-videohub` skill. Open VideoHub from its shortcut; the UI is http://127.0.0.1:7788.

### 6. Research engine

The virtualenv lives outside OneDrive (syncing a venv breaks it).

```powershell
uv venv $HOME\venvs\evmatic-research-ultimate --python 3.12
```

```powershell
uv pip install --python $HOME\venvs\evmatic-research-ultimate\Scripts\python.exe -e "$HOME\Projects\Evmaticai-projects\evmatic-research-ultimate[dev]"
```

```powershell
claude mcp add --scope user research-engine -- "$HOME\venvs\evmatic-research-ultimate\Scripts\python.exe" -m research_engine.mcp_server
```

### 7. Skills

Link every skill into `~\.claude\skills\` so a `git pull` in its repo updates it. Junctions need no admin rights.

```powershell
$S = "$HOME\.claude\skills"; $P = "$HOME\Projects\Evmaticai-projects"; mkdir $S -Force | Out-Null
@{ 'cats-setup'="$P\cats_setup\skills\cats-setup"; 'paw-cats'="$P\cats_setup\skills\paw-cats"; 'prepare-to-post'="$P\cats_setup\skills\prepare-to-post"; 'three-shorts'="$P\kipishkrytoi\skills\three-shorts"; 'make-character'="$P\kipishkrytoi\skills\make-character"; 'research-run'="$P\evmatic-research-ultimate\skill\claude"; 'hype-research'="$P\evmatic-research-ultimate\skill\hype" }.GetEnumerator() | ForEach-Object { if (-not (Test-Path "$S\$($_.Key)")) { New-Item -ItemType Junction -Path "$S\$($_.Key)" -Target $_.Value | Out-Null } }
```

A folder that already exists under that name is left alone; rename it first if you want the linked one. Skills load
in a new session. Remotion's own skills (`remotion-*`) come with the Remotion plugin and are optional.

### 8. Sign-ins and secrets (never commit any of these)

| What | Where it goes | Needed for |
|---|---|---|
| YouTube OAuth client for the channel | `kipishkrytoi\client_secret.pawandfriends.json` (from a founder) | the dashboard's stats and `tools/yt.py post` |
| YouTube token | made by `python tools/yt.py --channel pawandfriends auth --force --no-open` in `kipishkrytoi`, saved as `.yt_token.pawandfriends.json` | the same |
| A Chrome profile signed in to the Paw and Friends channel, with the Claude in Chrome extension connected | Chrome | uploading in YouTube Studio (`prepare-to-post`) |

Cat videos are wordless, so they need no ElevenLabs key. Only narrated videos (`three-shorts`) need `ELEVENLABS_API_KEY`
in `kipishkrytoi\.env`.

### 9. Check it

Open a new Claude session and say **"check my cats setup"**. The `cats-setup` skill runs the checks below and
prints one line per check. Or run them yourself, in `kipishkrytoi`:

```powershell
npx tsc --noEmit -p .
```

```powershell
npx remotion still src/index.ts Cookies out/setup-check.png --frame=60
```

`out\setup-check.png` should show Paw and Silent with cookies in the soft, saturated Dive Cats 1 look (`CozyTest` is the old pixel look, so it is not the check). Then `claude mcp list` should
show `videohub` and `research-engine` as connected.

## Making a video

Say **"make a new cat video"** (or give the idea: "us at 3am?, Paw grooms Silent"). The `paw-cats` skill:

1. **Idea:** one beat from `FORMAT.md` or yours, as one sentence with the caption.
2. **Style lock:** one still in the `cozy-smooth` look next to the Dive Cats 1 frames. You OK it before anything is built.
3. **Shot sheet:** 1–3 shots, each with its payoff (what must read, how big, how long).
4. **Assets:** any new prop or animal passes the asset gate (CC0 / CC BY, side-by-side with its reference).
5. **Build:** the scene in `src/three-shorts/cozy/<ep>/` (start from `cookies/Cookies.tsx`), with the framing gate on every frame.
6. **Sound:** an original wordless bed, a full (−14 LUFS) and a clean (−22 LUFS) version. Popular songs are added in the app at upload, never in the file.
7. **Critic, then preview:** a fresh agent hunts problems in full-size frames; then you watch the 720p preview in VideoHub.
8. **Final and pack:** 4K render, 2–3 covers, `channels/pawandfriends/videos/queue/Pxx · <title>/` with `UPLOAD.md`.
9. **Teach:** each fix becomes a rule in the skill. Commit it to this repo.

Then say **"post it"**: `prepare-to-post` researches the tags, writes the copy and uploads it as **Private**. It goes
Public only on your word.

The format in one line: a 7–9 s wordless loop of two cats in an "us?" moment, frame 1 already cute, the joke in the
caption, AI answered **No**.

## Where things live

| Thing | Path |
|---|---|
| Episode code | `kipishkrytoi/src/three-shorts/cozy/<ep>/` |
| Looks | `kipishkrytoi/src/engine/look/styles/cozy-smooth.ts`, `reef-smooth.ts` |
| Framing gate | `kipishkrytoi/src/three-shorts/cozy/gate.ts` |
| Cat models | `kipishkrytoi/public/characters/dc02/` |
| Channel videos | `kipishkrytoi/channels/pawandfriends/videos/{queue,posted,dropped}/` (layout in `channels/README.md`) |
| Video stats | `kipishkrytoi/channels/pawandfriends/videos/INDEX.md` (made by `python tools/yt.py stats`) |
| Films and renders | the VideoHub workspace: `films/<name>/`, `outputs/<date>/` |

## Known gaps (2026-11-21)

These are only on Sasha's PC today, so a new machine cannot finish step 3 or 4 until they are pushed:

1. **The `three-shorts` branch of kipishkrytoi is not on GitHub.** It is 31 commits ahead of `main` and has never been
   pushed. The cat code on it (`src/three-shorts/cozy/`, the `cozy`, `cozy-smooth`, `reef` and `reef-smooth` styles,
   the LookStage changes) is not even committed yet.
2. **The cat models (108 MB) are not in git.** They need Git LFS in kipishkrytoi or a private download; this repo is
   public, so they do not go here.
3. **The Dive Cats reference films** (Dive Cats 1 4K, the smooth Dive Cats 2 preview) are in Sasha's VideoHub
   workspace only. Dive Cats 1 is on YouTube as P06, which is enough to compare the look.

## Keeping it current

A skill that learns a rule (the `paw-cats` Teach step) writes it into `skills/…` here. Commit and push it, and
everyone gets it with `git pull`.
