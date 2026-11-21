# Gates and the critic hunt list

Each gate exists because Dive Cats 2 broke it (details in `cats_setup/reference/RETRO.md`).

## Framing gate (code, every frame, fails the render loudly)
- **The camera is outside all geometry:** a short raycast from the camera to the subject hits the subject first.
- **Every payoff subject's head** is fully on screen and at least 12% of the frame height (tune per shot in the shot sheet).
- **Held or featured props** are fully on screen.
- **No prop's bounding box overlaps a cat's head box,** unless the shot sheet says contact.
- **A threat or other animal keeps a gap** of at least 1.5× its own length from a cat, unless the beat is a contact gag.

The gate is `src/three-shorts/cozy/gate.ts` (`framingGate(camera, [{ name, rig, minHead }], frame)`), called at the end of each frame. The head sphere sits between the `Head` bone (the base of the skull) and `head_end` (its top). The right edge stops at x 0.8 in normalised screen space (−1 to 1 across the frame), to stay clear of the app's buttons. Its error names the box, so the fix is a number, not a guess.

## Staging rules
- **Keep-out zones:** every place a cat stands, lies, walks or reaches is a zone that scattered dressing skips, decided by position, so the rest of the set stays the same.
- **Contact sits on the surface:** a cat lies or stands on the highest surface under its whole body, not on one sampled point.
- **Held things are placed relative to the paws and chest** of the current pose, never to the rig root, which sits at the feet and turns over when the cat tips.
- **Small asks stay small.** "Add a sweat drop" means one sweat drop.

## Asset gate (each new model)
1. **License:** CC0 or CC BY only (not NC, not a paid store item). Write the credit line into the pack's credits on download. Ask the user before any download, with the file size from the API.
2. **Original textures, kept:** turn and scale the model only (`cats_setup/tools/lowpoly_fish.py`, run with Blender, with faces `0`; `-N` decimates but keeps the textures). The `cozy` look makes it low poly on screen. Flat-colouring a model destroys it.
3. **Render it next to its reference image** (side, front, at full size) before it enters a scene.
4. **Transparency:** see-through texture edges are cut (`alphaTest 0.5`), not blended, which leaves white halos. Overlay shells (gloss coats, corneas) with opacity < 0.6 are dropped. They turned the tuna black.
5. **Leftovers:** clear any white emissive from older builds, ignore the importer's bone-shape spheres, and check that the nose and up axes point the right way.

## Critic hunt list (fresh agent, full-size frames + a motion strip)
- **Faces:** every payoff face readable and unblocked; no prop, paw or set piece across it.
- **Contact:** feet on surfaces, nothing sunk in the floor or a rock, no prop through a body.
- **Camera:** not inside anything; no sudden swing through a cat; the framing holds through the whole shot.
- **Assets:** halos, black or untextured parts, holes, inside-out faces, wrong-way models, wrong scale.
- **Look:** matches the approved style still (pixel size, bloom, warmth, no dot screen).
- **Loop:** last frame flows into the first, with no pose or light pop.
- **Sound:** no clicks, no clipping, loudness on target.

Report each finding with the frame, where in the frame, and the likely cause. Fix everything before the user sees the preview.
