# Dive Cats 2: "Fishing" (v3, six hunters, six places)

The sequel to Dive Cats. Every cat hunts in its own way, in its own place, and every place is a little deeper than the last. The film is one long descent, from the sunny surface down into the dark blue. A depth counter in the corner (PS1 font) ticks down with every cat. At the end all the catches together attract a shark, and little Franko, the smallest cat, just shoots it. The shark turns around and looks at him: the hook for episode 3.

- **Length:** about 40 s, vertical 9:16, 30 fps, final in 4K.
- **Look:** three.js, low-poly PS1 in the led3.an style (as approved in v1/v2).
- **Voice:** Bill (calm storyteller). **Music:** "Island Meet and Greet" (CC BY), with a darker drone when Zhenya goes deep, and a dead stop when the shark turns.
- **Gear:** the same masks and toy spearguns, red suction-cup tip. Lusya gets a little head torch on her mask.
- **Title card per cat:** a name tag pops in for 1 s, for example `YEJI · FROM THE TOP · 1 M`.

## The descent

| Time | Cat | Style | Place | Depth | Fish |
|---|---|---|---|---|---|
| 0–3 | all | Hook: six cats jump in, title "DIVE CATS" | surface | 0 m | none |
| 3–9 | **Yeji** | Floater: hunts from the top, never dives | sunny lagoon just under the surface | 1 m | tiny silver fish from a bait ball |
| 9–15 | **Silent** | Bottom ambush: lies still on the sand like a rock | sand flat with seagrass and garden eels | 6 m | the pufferfish |
| 15–21 | **Paw** | Stalker: hides in the kelp, strikes from cover | kelp forest | 9 m | the barracuda |
| 21–28 | **Babushka Lusya** | Cave hunter: crawls under the rock with a torch | dark cave under a ledge | 14 m | the grumpy grouper |
| 28–34 | **Zhenya** | Deep diver: down the drop-off into the dark blue, then up with the big one | reef wall, then the open blue | 30 m | the tuna |
| 34–42 | **Franko** | Just shoots it | open blue, everyone with their catch | 8 m | the shark (it turns around) |

## The shots

**1. Yeji, from the top (1 m).** Shot from below: Yeji floats belly down at the surface, a black cat silhouette against the shimmering bright water, sun rays fanning around her. Below her a bait ball of tiny silver fish swirls in a tight ball. She doesn't dive. She just points straight down, pop, boop, and pulls one tiny fish up. Then the camera breaks the surface. The frame is half above (sky, sun) and half below (her legs, the bait ball). She lifts the fish into the air and meows.
Narrator: "Yeji hunts from the top."

**2. Silent, the bottom ambush (6 m).** Silent duck-dives and lands on the sand flat in a puff of sand. The garden eels around him pop back into their holes. He lies flat and perfectly still. Seagrass sways over him, and a little sand settles on his back. The eels slowly come back up. A curious puffer swims right up to his nose. His eyes open. Boop. The puffer inflates into a spiky ball.
Narrator: "Silent waits on the bottom..."

**3. Paw, the kelp stalker (9 m).** Tall kelp stalks, light shafts between them, everything swaying. Paw hides behind a stalk: only the mask peeks out. A barracuda slides through the kelp as a silver flash. Paw parts two blades with his paws, aims through the gap, boop. The kelp shakes, and he comes out hugging the long barracuda.
Narrator: "Paw hides in the kelp."

**4. Babushka Lusya, the cave (14 m).** A big rock with a dark mouth under its ledge. Lusya switches on her head torch (click) and crawls in. Inside it's dark, and only the torch cone shows things: red and orange sponges, a lobster's antennae, a swirl of glassfish, and two glowing eyes in the back. The torch finds the grouper. Grouper and granny glare at each other. Boop. She backs out of the cave pulling the grumpy grouper into the daylight, still glaring, then her happy sound.
Narrator: "Babushka goes under the rocks."

**5. Zhenya, the deep dive (30 m).** Zhenya swims over the edge of the reef, and below is a vertical wall with sea fans dropping into blue nothing. He dives head first. The counter runs 15... 20... 30 m. The light fades, the colours go blue, sea snow drifts past. The music thins into a low drone. A huge tuna passes in the dark. Boop. A long pull. Then the ascent: Zhenya rises toward the light with the big tuna, bubbles all around, and the colours come back.
Narrator: "Zhenya goes deep... and comes back with the big one."

**6. Franko, the shark (8 m).** All five cats float together showing off their catches, with hearts everywhere. That much fish in the water... a big shadow passes over them. The shark. Everyone freezes, except little Franko. He shoots it, casually. Boop: the cup sticks to its side. The music stops. The shark stops, slowly turns around, and looks straight at Franko. We see the shark's view of the tiny cat. Then the shark's face.
Narrator: "And Franko... just caught a shark." ... "Uh-oh."

## How each place is built (engine notes)

All six places are one continuous set laid along the descent, so the camera never jumps to an unrelated world. Each shot sets its own fog, sun and hemisphere values (pure functions of t, so the look changes smoothly in the deep dive).

- **Surface (Yeji).** The existing wavy surface gets a Snell's-window material: bright and sunlit straight above, mirrored deep blue at grazing angles (a fresnel term in its shader). For the half-and-half shot: a sky dome and a sun above the water, the water top as a second wavy plane, and the camera at the waterline with a thin wobbling line. The bait ball reuses the `schooled` paths with a tight sphere and a fast swirl, about 400 silver instances.
- **Sand flat (Silent).** Flat sand with ripples (a vertex sine), seagrass from the grass piece. Garden eels are about 60 instanced thin tubes. Each one's height is a pure function of t and its distance from Silent's landing spot, so they duck on the impact and come back up after it. The sand puff is a short-lived ring of particles, and "sand on his back" is a few small sand-coloured flecks parented to his spine.
- **Kelp forest (Paw).** The kelp piece scaled up to 8–10 m stalks with wide blades, swaying with the `sway` attribute and denser than now, with light-ray cones between stalks. The "parting" is two blades bent by a per-blade bend uniform, keyed to Paw's paw positions.
- **Cave (Lusya).** An overhang made from the rock pieces: a dome with an open mouth, closed enough that its shadow covers the inside. In that shot the caustics get a strength uniform (0 inside, 1 outside), the sun and hemisphere drop, and a SpotLight on Lusya's mask with a narrow cone does the lighting (Lambert materials take it, and the PS1 dither makes the falloff look great). Inside props: sponge clusters in saturated red/orange (they only pop in the torch light), lobster antennae, a glassfish swirl, and emissive eyes on the grouper in the dark.
- **Drop-off (Zhenya).** A tall reef wall built from stacked rocks, sea fans and sponges, ending in a dark gradient. The deep look is a lerp of fog colour toward navy, nearer fog, the sun down to about 15 %, and more marine snow. The depth counter is text keyed to the camera's y, and the ascent reverses the lerp.
- **Open blue (Franko).** The v2 shark shot, now with the five cats and their catches floating in a ring, so the shark has a reason to come.

## Sound

- **Happy sounds:** each cat's approved meow on its catch.
- **Effects:**
  - spear pop, suction boing, reel bubbles, puffer puff (as in v2);
  - a sand thump for Silent;
  - kelp rustle for Paw;
  - a torch click and a cave echo for Lusya;
  - a pressure drone for Zhenya's deep dive;
  - a splash and air sound at the waterline for Yeji;
  - the shark sting.
- All effects are synthesised, so there are no downloads.
