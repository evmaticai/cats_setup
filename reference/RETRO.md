# Dive Cats 2: retro of every fix (v1 → v11, covers, posting)

Dive Cats 2 needed 11 preview versions, a re-cut and many cover rounds before it was right. This page lists what went wrong, why Claude didn't get it right the first time, and the rules that prevent each class of mistake. The new cat-shorts skill is built on these rules.

## 1. What we fixed, grouped by kind of mistake

### A. Cameras and framing (the biggest group, about 20 fixes)
- The hug camera moved straight through the cat (v2).
- Franko was hidden behind corals.
- The shark's-eye view was too far away, and its face read as a ring when seen head-on.
- Silent's camera went under the sand.
- Yeji's catch was never shown: we didn't see what she caught.
- Franko's actual catch (the spear hitting) had no shot at all.
- The camera sat inside coral or a rock (the cave, Franko's rock).
- The shark was filmed from underneath; the lunge was from the side.
- Fish were half out of frame during the hugs and cards.
- Every species card had different framing; only Babushka's was right.
- On the covers, Franko was cut off, then too small, then cut off again.

### B. Staging, distances and contact (about 12 fixes)
- The gun went through faces; the spear went through the fish and through the rock.
- Big fish hid the cats' faces; the puffed-up puffer hid Silent.
- Silent was stuck in the sand, then stuck in a rock.
- The puffer swam through a clam, and a sand puff hung in front of the lens.
- Yeji's fish hung the wrong way, then was reeled toward her feet.
- Franko stood too close to the shark: twice it looked like it ate him.
- The cave was too small, and the shot inside it too short.

### C. Assets and models (about 12 fixes)
- The cats rendered pure white (a leftover glow from the previous build).
- The code-made fish looked like pills, and the grouper got a black blotch.
- 5 of the 6 models you linked were not usable: paid, download turned off, or non-commercial only.
- The model conversion destroyed the look: flat colour per triangle threw away the textures, and decimating damaged the shapes. You said the fish didn't look like the links.
- The tuna rendered black (a see-through gloss layer drawn solid).
- White halos showed around fins (see-through texture edges blended white).
- The puffer's texture tore when it was decimated too far.
- The code-made hammerhead didn't read as a shark.

### D. Story, timing and edit (about 8 fixes)
- The narrator lines overlapped (timed before the audio existed).
- v3 needed your full restructure: one style and one place per cat.
- Zhenya had no reason to dive deep (no tuna school yet).
- The ending gave the twist away ("aims at a shark"); you wanted "spots a fish → caught a shark → run".
- **v5, the 25 s cut, made by speeding every shot up 1.3–1.8×, was "much worse".** It was reverted.
- Every species needed a named card with a fact.

### E. Process and honesty (the ones that cost trust)
- **A false report.** The painted-face cover was shown as "painted into his skin". In fact a failed `cp` in an `&&` chain skipped the swap, and the old sticker face was rendered. The result wasn't checked before reporting.
- **Covers.** The scared face went through three rejected tries: flat stickers, then 3D stickers, then the painted face that never really rendered. The fix you actually wanted was small: his own face plus one sweat drop.
- **The panel didn't update.** It reads a generated `hq/pipeline.json`. Editing `UPLOAD.md` doesn't refresh it until `hq.py sync` runs.
- **Reviews were too small.** Most checks were done on 150–260 px contact sheets, which hide face, clipping and framing problems. Nothing was watched in motion before you saw it.

## 2. Why it didn't come out right the first time (root causes)
1. **Blind authoring.** Cameras, poses and distances were written as coordinate maths and checked afterwards on tiny thumbnails. Nothing checked, frame by frame, "is the subject fully in frame, is anything intersecting, is the camera inside geometry".
2. **No payoff shot per beat.** The story beats were written as actions ("she shoots", "he catches the shark"), not as the shot that proves them. So the most important moments (the catch, the hit, the fish's face) had no dedicated, readable shot.
3. **Scatter ignored the action.** The random reef dressing didn't know where the cats would be. Any spot could get a rock, clam or coral.
4. **Assets were trusted, not inspected.** The leftover glow, the tuna's gloss layer, alpha edges and bone-shape spheres were all discovered only after they broke a render. There was no per-asset check: license, a look next to its reference, scale, transparency, extra layers.
5. **The conversion matched the wrong style.** "Low poly" was read as "flat colour". Your target (led3.an) uses real photo textures on simple shapes; pixelation comes from the low render resolution, not from flat colours.
6. **Constraints met mechanically.** "25 s cap" was solved by speeding everything up, not by cutting beats. That kept every beat and ruined the pace.
7. **No fresh critic until you asked for one.** The one time a fresh critic looked (fish models), it found the tuna, halo and shark problems in one pass. Those had been in front of you for several versions.
8. **Chained shell commands and unverified claims.** `a && b && c` hid a failed step. The result was reported from intent, not from a check of the actual output file.
9. **The style was never locked.** Our reef look (clean, flat, cyan, dithered) never went through a side-by-side test against the reference. The led3.an look is different (see section 4).

## 3. Rules for next time (they go into the new skill)
1. **Style lock first.** Before any build, put one test frame next to two reference frames, and get your OK.
2. **Beat sheet = shot sheet.** Every beat names its payoff shot: what must be readable (a face, the catch, the fish's face), at what size in the 9:16 frame, and for how long (at least 1 s).
3. **The framing gate runs in code, on every frame of every shot:**
   - the camera is not inside geometry;
   - the subject's head is fully on screen and at least 12% of the frame height;
   - held props are fully on screen;
   - no prop intersects a face (bounding-box checks).

   The render fails loudly if any check is broken.
4. **Action zones.** Every place a cat stands, lies or swims is a keep-out zone for scatter. Every scattered piece is checked against those zones.
5. **Distance rule.** A threat (shark, dog, vacuum) keeps a minimum on-screen gap from a cat, about 1.5× its own length, unless the beat is a contact gag.
6. **Asset gate,** for each model:
   - the license is CC0 or CC BY (not NC or paid) and its credit is written down;
   - it is rendered next to its reference image;
   - the original textures are kept, with nearest-neighbour filtering;
   - see-through edges are cut, not blended;
   - extra overlay layers are dropped;
   - scale and facing are checked.
7. **Length comes from the edit, not the speed.** Plan the length from the narration. To fit a cap, cut or merge beats and say which. Never speed shots up.
8. **Fresh critic before every preview you see.** An independent agent watches the full-size frames at each beat, plus a motion strip, and lists problems. They get fixed first.
9. **Verify, then report.** One step per command. Check the output file (time, size, a crop) before saying it's done. Never claim a result that wasn't looked at.
10. **Regenerate derived data.** After changing a pack, run the sync that feeds the panel, or say that it still needs to run.
11. **Small changes when asked for small.** "Add a sweat drop" means a sweat drop, not a new face system.

## 4. Style gap: what we made vs what you want (led3.an)
| | Dive Cats 2 (what we built) | led3.an (what you want) |
|---|---|---|
| Surfaces | flat colour per triangle, clean | **photo textures** (real fur, real cookies) on very simple low-poly shapes |
| Resolution | 400 px + an ordered dither (a visible dot screen) | ~240–300 px, **nearest-neighbour upscale**, chunky square pixels, little or no dither |
| Light | even underwater light, caustics | **strong warm key light with bloom and blown-out highlights**, lamp flares, light leaks |
| Colour | cyan, saturated | saturated, warm, high contrast; whites clip to glow |
| Lens | clean | **chromatic fringing** (purple/green edges), soft vignette, slight VHS feel |
| Camera | moving, many cuts | mostly one **static or slow** framing, close on the cats, 7–10 s |
| Scenes | an action adventure | **cozy everyday moments:** cookies, a train window, a hammock, a meadow, a room at night |
| Sound | narrator plus music | chill / cozy, no narrator (to be confirmed by the research) |
