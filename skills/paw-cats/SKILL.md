---
name: paw-cats
description: Make a Paw and Friends cat Short in the smooth Dive Cats 1 look (photo-fur low-poly cats, soft light, full resolution), with @led3.an's cozy "us?" format, from idea to 4K and the channel's upload pack. Use when the user asks for a new cat video, "us?" loop, cozy cat Short or Paw and Friends episode, or to fix or re-render one.
---

# paw-cats

Short wordless loops (7–9 s) of the user's six real cats, rebuilt as low-poly characters with their real fur. A cozy everyday moment that viewers send to someone ("us?"). The format comes from research on @led3.an and its niche. The look is the smooth Dive Cats 1 render (the user's pick, 2026-11-21), not led3.an's pixels. The gates come from the Dive Cats 2 retro. For the engine itself (Remotion + LookStage, pure-in-t frames, rigs) see `~/.claude/skills/three-shorts/ENGINE.md`. Dive Cats-style narrated adventures are a different format: use three-shorts for those.

**Where things live** (`cats_setup` = `~/Projects/Evmaticai-projects/cats_setup`, this skill's repo; a machine is set up with the `cats-setup` skill)
- Engine and episode code: the kipishkrytoi repo on its `three-shorts` branch (`~/Projects/Evmaticai-projects/kipishkrytoi`; on Sasha's PC the worktree `kipishkrytoi/.claude/worktrees/three-shorts`). Episodes go in `src/three-shorts/cozy/<ep>/`, and `cookies/Cookies.tsx` is the starting template. The look is the `cozy-smooth` style (`reef-smooth` underwater); see STYLE.md.
- Cast: `public/characters/dc02/<cat>.glb` (plain) and `geared/` (with dive masks). Heights: Paw .95, Silent .95, Zhenya 1.06, Yeji .89, Lusya 1.0, Franko .68 (kitten).
- Channel: `kipishkrytoi/channels/pawandfriends`. Each video gets a folder `videos/queue/Pxx · <title>/` holding `youtube_4k.mp4`, `thumbnail.jpg`, `covers/` and `UPLOAD.md` (P07 is the worked example).
- Evidence: `cats_setup/reference/RESEARCH.md` (the niche) and `cats_setup/reference/RETRO.md` (every mistake of Dive Cats 2 and why it happened).

## Steps

1. **Idea.** Pick one beat from [FORMAT.md](FORMAT.md) (or the user's idea) and write it as one sentence: who, where, what happens, the caption. Done when the user picks it, or full auto takes the top idea.
2. **Style lock.** Render one still of the planned set and cast in the `cozy-smooth` look. Show it next to Dive Cats 1 reference frames (STYLE.md). Change the look only through [STYLE.md](STYLE.md). Done when the user OKs the still. This is the gate Dive Cats 2 skipped.
3. **Shot sheet.** Write the beat as 1–3 shots. Each shot names its **payoff**: what must read (whose face, which action, which prop), its minimum size in the 9:16 frame, and how long it holds (≥ 1 s). Done when every beat has a payoff that a still can prove.
4. **Assets.** Every new prop or animal model passes the asset gate in [CHECKS.md](CHECKS.md) before it goes in a scene. Done when each one has its license row, a side-by-side with its reference, and a clean render.
5. **Build.** Code the scene: set dressing with keep-out zones around every place a cat stands or moves, a static or slow camera, and the cats' poses. Run the framing gate (CHECKS.md) over every frame. Done when the whole loop renders at 720p with the gate green.
6. **Sound.** One original bed: room tone plus the cat's own sounds (purr, soft meow, chewing). No narrator. Approved meows: `cats_setup/assets/sfx` (CC0, credits beside them). New sounds are code-made, or downloaded only after the user's yes. Loop it by making twice the length and crossfading the second half onto the first. Render two versions: **full** (our sound, −14 LUFS) and **clean** (−22 LUFS, so a song added in the app sits on top). A soft bed won't reach −14 with one loudnorm pass: add gain and an `alimiter` at −1 dBTP. Popular songs (the user picks them, e.g. La Isla Bonita) are added **in the YouTube or TikTok app** at upload, never mixed into the file: that's how they stay licensed and the video stays up. Done when both versions measure on target and the loop has no click.
7. **Critic, then preview.** A fresh critic agent gets full-size frames at every payoff, plus a motion strip (12 frames across the loop), and the CHECKS.md hunt list. Fix everything it finds, then show the 720p preview to the user. Done when the user accepts it. Never compress length by speeding shots up: cut a beat and say which.
8. **Final and pack.** Render 4K (2160×3840) and measure the loudness. Make 2–3 covers the Dive Cats way (staged scene, big faces, no text unless the user asks), and test them at feed size. Put everything in the channel's `videos/queue/Pxx · <title>/` with UPLOAD.md: the caption ("us?" style), the credits, AI = No, Private first. Then refresh the dashboard: `python -c "import sys;sys.path.insert(0,'tools');import yt;yt.use_channel('pawandfriends');import hq;hq.sync()"` (run in the kipishkrytoi root). Done when the folder holds every file and `hq/pipeline.json` shows the new title.
9. **Teach.** Write each new fix into this skill's files as a rule. Done when the diff names each fix.

**Verify, then report.** Check each step on its real output (file time, size, a full-size crop) before saying it is done. Keep a copy step and the render that uses it as separate commands, so a failed step can't hide behind `&&`.
