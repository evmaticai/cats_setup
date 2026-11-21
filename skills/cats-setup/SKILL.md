---
name: cats-setup
description: Set up or check a machine for making Paw and Friends cat Shorts from the cats_setup repo alone - tools, npm packages, Remotion's browser, the cat models, the skill links and the optional extras (VideoHub, research engine, YouTube sign-in) - and report what is missing. Use when the user says "check my cats setup", sets up a new PC or account for cat videos, or when a paw-cats step fails because something is not installed.
---

# cats-setup

`cats_setup` (`~/Projects/Evmaticai-projects/cats_setup`) holds everything a cat video needs: the Remotion
project, the engine, the cat episodes, the cat models, the sounds, the skills and the channel's video packs. No
other repo is needed. The guide for humans is its `README.md`; this skill runs it as checks. **Check first, report,
then fix only what the user says to fix.** Never copy, print or commit a secret (OAuth clients, tokens, `.env`);
check only that the file exists.

`R` = the cats_setup folder. Run each check as its own command, so one failure cannot hide another.

## 1. Run the checks

| # | Check | Command (Git Bash, in `R`) | Pass when |
|---|---|---|---|
| 1 | Tools | `git --version; node -v; ffmpeg -version; python --version` | each prints a version; Node is 22+ |
| 2 | Repo | `git -C R status -sb` | a clone of `evmaticai/cats_setup` on `main`, not behind `origin` (`git pull` if it is) |
| 3 | Packages | `ls node_modules/remotion` | exists, else `npm ci` |
| 4 | Render browser | `npx remotion browser ensure` | prints "Has browser" |
| 5 | Cat models | `ls public/characters/dc02/` | `paw silent zhenya yeji lusya franko` `.glb`, `geared/`, `fish/` |
| 6 | Typecheck | `npx tsc --noEmit -p .` | no errors |
| 7 | Render | `npx remotion still src/index.ts Cookies out/setup-check.png --frame=60` | the PNG exists; open it and look: Paw and Silent with cookies in the soft, saturated Dive Cats 1 look (`skills/paw-cats/STYLE.md`) |
| 8 | Skills | `ls ~/.claude/skills/` | `cats-setup`, `paw-cats`, `prepare-to-post` |
| 9 | Skill links | `cmd //c dir /AL "%USERPROFILE%\.claude\skills"` (Windows) or `ls -l ~/.claude/skills` (Mac) | those three are junctions or links into `R/skills/`, so `git pull` updates them |
| 10 | Optional: Blender | `which blender` or `ls "/c/Program Files/Blender Foundation"` | Blender 5.x; only the asset gate needs it |
| 11 | Optional: MCP servers | `claude mcp list` | `videohub` (preview and notes) and `research-engine` (idea and tag research) connected; without them, watch the 720p preview as a file and use plain web search |
| 12 | Optional: upload browser | `list_connected_browsers` (Claude in Chrome), then `studio.youtube.com` | Studio opens on Paw and Friends (`UCD8yrEKEhrXTDwA2negq15g`); only when the user is about to post |

**Done when** every check has a result. Check 7 counts only after you looked at the image.

## 2. Report

One line per check: ✔ / ✘ / ⚠, what you saw, and for each ✘ the one fix from `README.md` (its step number). A
missing optional piece is ⚠, never a blocker. **Done when** the user has the table.

## 3. Fix, on the user's word

- Installs (`winget`, `npm ci`, `npx remotion browser ensure`): run them when the user says so, naming them first.
- Skill links: README step 4. It skips a folder that already exists. To replace a real folder with the link, move it
  to the scratchpad first, never delete it.
- YouTube Studio access for the channel comes from a founder. Say what is missing and who has it.
- After a fix, rerun its check. **Done when** each fixed check passes again, or the user stopped.

## 4. Teach

A check that broke for a new reason, or a fix the README lacked, goes into `README.md` and this file. Commit it to
`cats_setup` (it is public: no secrets, no personal account names).
