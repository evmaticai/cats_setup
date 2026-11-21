# Dive Cats 3: shot sheet (v1, 2026-11-21)

Look: locked to Dive Cats 2 as it is (the user's OK, 2026-11-21). The style-lock strip is in `stylelock/strip.png`. Same engine (`src/three-shorts/dc02`), same reef, same cast models, the same pixel-font cards.
Ending: A, the pet shark.

Sizes are the share of the 9:16 frame height. "Face" means the head is fully in frame. The DC2 rules hold: the framing gate runs on every frame, and the shark stays at least 1.5× its length from Franko except in the contact gags marked **contact**.

| # | Time | Set (DC2 code to reuse) | Camera | Payoff that must read | Min size | Hold |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:04 | Franko's rock, exactly DC2's last frame | 0–1.5 s: DC2's camera pushing in as the shark closes and the jaw drops; 1.5–2.4 s: his view, the mouth roaring into the lens; 2.4–4 s: his face in the bubble blast | **contact (roar, the hammer 1.3 m from his face):** the open mouth (hammer, teeth, red gullet); then his face, squashed and blown back | Mouth 40% in his view; Franko's face 15% | 0.9 s on the mouth, 1.6 s on his face |
| 2 | 0:04–0:07 | The same place; he floats 0.3 m higher after the cut (the anemone under him read as his feet in it) | Locked, across the line between him and the shark, with a clear line of sight (picked by raycast); he is right of centre with room on his left | **contact (the chomp, on the empty cloud):** the shark hovers level with him, 1.3 m off; he drops the gun; his legs spin; ZIP to screen left, leaving a bubble trail; the bubble cloud keeps his ears-up silhouette; the shark's mouth closes on the middle of the cloud; it shoots off left with the gun trailing on its line | Bubble cloud 20% | 1.0 s on the cloud |
| 3 | 0:07–0:14 | `kelpForest`: Paw's two bendable hero stalks are Franko's spot. A keep-out clears kelp from the shark's lane and rocks and grass from the lens zone | Low, facing him through the kelp, creeping in | Franko swaying with arms up and a kelp frond in each paw; bubbles from his mouth giving him away; the shark passing 5.2 m behind him; then **contact ('it's right behind you'):** it turns three-quarters and noses in to 2.4 m behind him, grinning over his left shoulder (face-on behind his head read as a hat); its jaw shuts before he zips off left, leaving a bubble trail (open jaws as he vanished read as 'eaten'). No tail bone, so no tail wag | Franko's head 10%; the shark's head and teeth clear of the fronds | 1.3 s on the grin plus the sweat drop |
| 4 | 0:14–0:21 | Mid-water over the channel; the running gag further down it; a school of 110 code-made fusiliers (`fishSet`) with a kitten-sized hole | 0–1.5 s: high three-quarter on the shark chasing its tail; then tracking with the school, stopping at the burst | The tail-chasing spin with the gun flung out; Franko swimming inside the school; the school bolting at once; Franko alone with the shark 5.2 m or more behind (no contact) | Franko's head 7% | 1.3 s alone |
| 5 | 0:21–0:29 | Silent's bare sand patch from DC2 (the reef keeps it clear) | High three-quarter, locked, wide enough for the whole scan | A sand bump with two kitten ears, breathing bubbles; the shark sweeping its head while the card shows; **contact (the scan):** its head stops just past the bump, the bump still in view; the pop with sand in its face | Bump and both ears clear | 1.5 s card; 0.8 s over the bump |
| 6 | 0:29–0:37 | In front of DC2's cave, in the sun; Babushka's golden grouper at 1.7 m | One camera, stacked vertically (the shark above, the grouper below, Franko low and near), a push-in on the face-off | The gulp and the bulging cheeks; the glare up at the shark (glowing eyes); the hiccup spitting him out; **contact (the face-off, mouth shut):** the shark noses down at him and he waves | Grouper 25%; Franko's head 5% | 1.2 s on the glare; 0.9 s on the wave |
| 7 | 0:37–0:45 | New: a split rock, two `rock()` halves with a gap Franko's width (about 0.35 m) | Inside the crack looking out, then behind the shark | **contact:** the hammer jammed across the crack, Franko safe inside, eyes squashed | Hammer across 70% of width | 1.2 s on the jam |
| 8 | 0:45–0:51 | Open water at the `dropOff` wall | Head-on, symmetric; then the split-screen shark's-eye view | **contact:** Franko dead centre at the nose, one eye on each side; the mirror moves | Franko 18% | 2.0 s (the mirror needs time) |
| 9 | 0:51–0:57 | Up the `dropOff` wall toward the light, the canoe hull above | Under Franko, looking up: the hull, the light and the shark looming | The open mouth; then Franko's paws on the red cup, the tail and his face in one frame; POP | Cup and face 12% each | 1.0 s on the pull |
| 10 | 0:57–1:04 | The same, then down to the crew's rock | Two-shot on the nuzzle; the crew peeking; a close fly-by of the ride | **contact:** the nuzzle; the crew's dropped jaws; Babushka fainting; Franko riding with the hammer as handlebars | Franko's face 15% on the ride | 1.5 s on the ride |

## New work (each goes through the asset gate)
| Asset | Source | Why it is needed |
|---|---|---|
| A shark jaw (open mouth) | Code: hinge the hammerhead's lower-front vertices in its shader. The model (CC BY, "sharkingaround", already credited) has no rig or morphs | The roar (1) and the dead end (9) |
| The shark rolled on its side | Code: rotate the root (no new asset) | The crack (7) |
| The gun dangling on its line from the tail | Code: DC2's spear line with its two ends swapped | Every beat from 2 to 9 |
| The split rock | Code: two `rock()` halves | The crack (7) |
| The canoe hull from below | Our own jukung from `dive-team/build/dive-cats.blend`, exported to glb | The dead end (9). Fallback: the drop-off wall alone, no hull |
| Franko's cartoon poses: wheel-run, kelp sway, fish swim, buried, mirror moves, the pull, the ride | Code poses in `act.ts` (DC2 has no face rig: no cheek-puff) | Beats 2 to 10 |
| Cartoon FX: speed lines, impact stars, the bubble cloud, a sweat drop, the split screen | Code (sprites and a post pass) | Beats 2, 7, 8, 9 |
| The crew peeking, Babushka fainting | Existing cat models; one new pose (faint) | Beat 10 |

## Build order (a preview after each block, the critic before each)
1. Beats 1 to 3 (hook, take-off, kelp): about 14 s; this proves the jaw, the dangling gun and the cartoon FX.
2. Beats 4 to 6.
3. Beats 7 to 10.
