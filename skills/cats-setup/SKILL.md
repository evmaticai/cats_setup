---
name: cats-setup
description: Set up or check a machine for making Paw and Friends cat Shorts - tools, the kipishkrytoi engine on its three-shorts branch, the cat models, VideoHub, the research engine, the skills and the YouTube sign-ins - and report what is missing. Use when the user says "check my cats setup", sets up a new PC for cat videos, or when a paw-cats step fails because something is not installed.
---

# cats-setup

The full guide for humans is `README.md` in this skill's repo (`~/Projects/Evmaticai-projects/cats_setup`). This
skill runs it as checks. **Check first, report, then fix only what the user says to fix.** Never copy, print or
commit a secret (OAuth clients, tokens, `.env`); check only that the file exists.

`P` = `~/Projects/Evmaticai-projects`. Run each check as its own command, so one failure cannot hide another.

## 1. Run the checks

| # | Check | Command (Git Bash) | Pass when |
|---|---|---|---|
| 1 | Tools | `git --version; gh --version; node -v; ffmpeg -version; python --version; uv --version` | each prints a version; Node is 22+ |
| 2 | Blender (only for the asset gate) | `ls "/c/Program Files/Blender Foundation"` or `which blender` | a Blender 5.x folder; a miss is a warning, not a fail |
| 3 | Repos | `git -C $P/<repo> rev-parse --abbrev-ref HEAD` for `kipishkrytoi`, `cats_setup`, `videohub`, `evmatic-research-ultimate` | each is a git checkout; kipishkrytoi is on `three-shorts` (or a worktree of it exists: `git -C $P/kipishkrytoi worktree list`) |
| 4 | Engine packages | `ls $P/kipishkrytoi/node_modules/remotion` | exists, else `npm ci` |
| 5 | Cat code | `ls <engine>/src/three-shorts/cozy/gate.ts <engine>/src/engine/look/styles/cozy-smooth.ts` | both exist (`<engine>` = the checkout or worktree on `three-shorts`) |
| 6 | Cat models | `ls <engine>/public/characters/dc02/` | `paw silent zhenya yeji lusya franko` `.glb` and `geared/` |
| 7 | Typecheck | `npx tsc --noEmit -p .` in `<engine>` | no errors |
| 8 | Render | `npx remotion still src/index.ts Cookies out/setup-check.png --frame=60` in `<engine>` | the PNG exists; open it and look: cats in the soft, saturated Dive Cats 1 look (`paw-cats/STYLE.md`) |
| 9 | MCP servers | `claude mcp list` | `videohub` and `research-engine` are Connected |
| 10 | Skills | `ls ~/.claude/skills/` | `paw-cats`, `prepare-to-post`, `three-shorts`, `make-character`, `research-run`, `hype-research`, `2cbinema-videohub`, `cats-setup` |
| 11 | Skill links point at the repos | `cmd //c dir /AL "%USERPROFILE%\.claude\skills"` (Windows) or `ls -l ~/.claude/skills` | each of the skills in check 10 except `2cbinema-videohub` is a junction or link into its repo, so `git pull` updates it |
| 12 | Channel sign-in | `ls $P/kipishkrytoi/client_secret.pawandfriends.json $P/kipishkrytoi/.yt_token.pawandfriends.json` | both exist (do not read them) |
| 13 | Channel folder | `ls $P/kipishkrytoi/channels/pawandfriends/videos/` | `queue posted dropped` |
| 14 | Upload browser | `list_connected_browsers` (Claude in Chrome), then open `studio.youtube.com` in the cats' profile | Studio opens on Paw and Friends (`UCD8yrEKEhrXTDwA2negq15g`); only when the user is about to post |

**Done when** every check has a result. Check 8 counts only after you looked at the image.

## 2. Report

One line per check: ✔ / ✘ / ⚠, what you saw, and for each ✘ the one fix from `README.md` (its step number). Then
list the known gaps from the README that still apply on this machine. **Done when** the user has the table.

## 3. Fix, on the user's word

- Installs (`winget`, `npm ci`, `uv pip install`, VideoHub `SETUP.cmd`, `claude mcp add`): run them when the user
  says so. Each changes the machine, so name them first.
- Skill links: the README's step 7 command. It skips a folder that already exists. To replace a real folder with
  the link, move it to the scratchpad first, never delete it.
- Missing cat models, OAuth client, token or `three-shorts` branch: these come from a founder. Say which file is
  missing and who has it (README, **Known gaps** and step 8). Never fetch them from anywhere else.
- After a fix, rerun its check. **Done when** each fixed check passes again, or the user stopped.

## 4. Teach

A check that broke for a new reason, or a fix the README lacked, goes into `README.md` and this file in
`cats_setup`. Commit it there (it is public: no secrets, no personal account names).
