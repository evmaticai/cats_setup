# Covers (thumbnails)

The founder's rule (2026-11-20): **don't reuse frames from the video**. Build an ultra-hype, bait cover from the episode's own models.

- **Rejected:**
  - ts01's first covers were video frames with the captions burned in.
  - The next was a staged shot that still felt like the video.
- **Picked:** "PLUGGED INTO / THE SUN?!": Boston holding a crackling plug, with the Sun's current running into it, and a giant angry cartoon-faced Sun behind him.

## The recipe

1. **Three scenes, one per hook type.** Each is a new staged composition from the models: cast, sets, props, space objects. Never a timeline frame. Reference: `src/three-shorts/ts01/cover.tsx` (`Ts01Cover`, variants `plug`, `zap`, `attack`, registered in the brand root `src/brand/index.tsx`).
   - **Absurd action** (the strongest pull): the hero doing the impossible thing the story implies. ts01: plugged into the Sun.
   - **Hit or threat:** the danger landing on the hero. ts01: the Sun zaps him at the key.
   - **Giant villain:** the story's force, given a face and filling the frame. ts01: the angry Sun blasts the Earth.
2. **Make the force a character.** If the story's force is not a person (the Sun, a storm, a machine), give it a cartoon face, built as a camera-facing card (`sunFace()` in cover.tsx): angry brows, glaring eyes, gritted teeth. A face reads in one glance at grid size; a realistic Sun does not.
3. **Energy you can see:**
   - lightning (`bolt()`: a jagged HDR core plus an additive halo, so bloom catches it);
   - spark bursts (`makeSparks`, burst at t = 0, still at t ≈ 0.12);
   - the hero's face set to `shock` or `wide`.
4. **Hero rules** (kipishkrytoi `UPLOAD.md` → Thumbnail rules):
   - the face to the lens, upper middle, lit (a key light on the face even when the story light is behind);
   - one glance, one story;
   - nothing important in the bottom 20 %.
5. **Hook text** goes through the channel Thumb pipeline: add a line to `src/brand/thumbs.sh` with `"img"` pointing at the rendered scene (under `public/`), then run `bash src/brand/thumbs.sh <slug>`. It renders:
   - **Line 1:** white, outlined.
   - **Line 2:** in a coloured box, 2–3 words in all, ≤ 12 characters; the text colour is picked by contrast.
   - **Placement:** between y 280 and 1500, never over the eyes.

   The text adds to the title and never repeats it.
6. **Check** all three tiled at phone-grid size (~300 px wide): the hero is recognisable and the text readable. Send them side by side with one recommendation; the founder picks.

## Scene pitfalls (each cost a re-render on ts01)

- **A far object behind glass vanishes** in the `day` fog and the DOF. Use `golden`, keep focus strength ≤ 0.1, or put a near cheat object just outside the pane.
- **The camera ends up behind clutter.** At counter height it sat behind jars and ledgers; raise it or move it closer, over the clutter.
- **Hands and props leave the frame.** Look at the first still for the raised hand, the plug, the lead. Thin wires (4 mm) don't read at phone size; carry the story with a bolt or a thick cable.
- **Bloom eats a story disc.** Don't hide the window glass to "clean up" a Sun; the pane kept the disc readable.
- **Moving the hero for composition can lose him.** Move the camera's look target with him, and re-check the frame.

## Render

```
npx remotion bundle src/brand/index.tsx --out-dir <dir>
npx remotion still <dir> Ts01Cover public/episodes/<ep>/cover_<v>.png --props='{"variant":"<v>"}'
python: save as 1080×1920 JPG (q≈93) → public/episodes/<ep>/cover_<v>.jpg
bash src/brand/thumbs.sh <ep>_<v>   → out/<ep>_<v>/thumbnail.png → JPG < 2 MB for YouTube
```
