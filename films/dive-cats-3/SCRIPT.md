# Dive Cats 3: "Run, Franko, Run!" (draft v1, 2026-11-21)

The sequel to Dive Cats 2. It opens on DC2's last frame: the hammerhead, with Franko's red suction cup stuck on its tail, turns on him. The whole episode is the chase, done as a wordless cartoon like Tom & Jerry: every hiding place fails, each time for a different and funnier reason, and the hides get faster and tighter until a final reversal.

- **Look:** locked to Dive Cats 2 as it is (the user's OK, 2026-11-21). Shot sheet: `SHOTS.md`.
- **Length:** about 64 s (DC2 was 63.6 s), 9:16, 30 fps, final in 4K. Built in the dc02 engine (three-shorts), not the cozy-loop format.
- **Shark:** the same `hammerhead.glb`. Its real quirks drive the gags: the wide head jams in narrow gaps, it can't see right in front of its nose, and it sweeps the sand for buried animals.
- **Engine of the story:** the cup is stuck on its tail and it can't reach it. Running gag: in each scene the shark tries to bite the cup off and spins after its own tail like a dog. That pays off at the end.
- **Music:** recommended: "In the Hall of the Mountain King" (Grieg) in Kevin MacLeod's recording, CC BY 4.0 (check the licence before download, and download only after a yes). It builds from tiptoe to frantic. Before each hide fails the music cuts to silence plus a heartbeat, then slams back in.
- **SFX (all code-made):** slide whistle, xylophone tiptoe, bonk, boing, zip, bubble pop, a "metal-detector" beep, a cup "POP".
- **Narrator:** none during the chase. Bill only in the first and last lines (optional).

## Beats

| Time | Beat | What happens | Payoff (must read, at least 1 s) |
|---|---|---|---|
| 0:00–0:04 | **Hook: the roar** | DC2's last frame: the hammer face fills the frame, no music. One tiny bubble rises from Franko's regulator: *blup*. The shark lets out a roar of bubbles that blows Franko's fur flat. "DIVE CATS 3". | Franko's face and the open mouth in one close two-shot |
| 0:04–0:07 | **Take-off** | He drops the speargun (continuity: DC2 ends with the gun's line running to the cup on the tail, so from here on the gun dangles from the shark's tail on its line, which annoys it even more). His legs spin in place (wheel-run with swirl lines), then ZIP. A Franko-shaped bubble cloud hangs in the water; the shark bites it, *pop*. The music slams in. | The bubble silhouette, held 1 s |
| 0:07–0:14 | **Hide 1: kelp** | He stands in the kelp with his arms up, swaying like a stalk. The shark glides past behind him, swaying with him. He holds his breath, but his mask gives him away: *blup… blup-blup*, a column of bubbles rises from him. The shark halts and turns its hammer straight at him, right over his head. A sweat drop. ZIP. | His bubbles and the hammer, face-on behind his head, in one frame |
| 0:14–0:21 | **Hide 2: fish school** | First the running gag: the shark spins after the gun dangling off its tail, snaps, misses, wobbles dizzy. Then Franko swims inside a school of fusiliers, like one of them. The shark glides in behind; the whole school bolts at once and leaves him alone in open water, still swimming. He stops, looks round: nobody. A sweat drop. ZIP. | Franko alone in the water, the shark behind him |
| 0:21–0:29 | **Hide 3: sand** | He buries himself; only his bubbles rise. The hammerhead sweeps its head over the sand like a metal detector: *beep... beep... beep-beep-beep*. Freeze card: **HAMMERHEAD: its head finds animals hidden in the sand.** The beep stops right over the Franko-shaped bump. | The head hovering over the bump |
| 0:29–0:37 | **Hide 4: the grumpy grouper** | He darts into the huge mouth of Babushka's golden grouper (from DC2), which gulps him; its cheeks bulge. The shark comes nosing down from above; the grouper glares up at it with glowing eyes, and it backs off and turns away... the grouper hiccups and spits Franko out. The shark whips back; face to face, Franko gives a sheepish little wave. ZIP. | Bulging cheeks, the glare and the shark's face |
| 0:37–0:45 | **Hide 5: the crack** | Into a narrow crack in the rock. The shark charges: BONK, the hammer jams across the crack and its eyes squash. Inside, Franko blows a bubble raspberry. The shark pulls back, turns its head 90° on its side... and slides in. Franko's face drops; out the back he goes. | The hammer jammed across the crack, Franko safe inside |
| 0:45–0:51 | **The blind spot** | Cornered in open water, he does the bravest thing: he swims right up to the tip of its nose. The eyes are on the ends: it looks left, it looks right, and can't see him. Shark's-eye view as a split screen with a black gap in the middle, where Franko is. He copies every move it makes (the mirror gag). Card: **HAMMERHEAD: can't see right in front of its nose.** Then he sneezes a bubble onto its nose. | Franko dead centre on the nose, one eye at each side (also the best cover) |
| 0:51–0:57 | **Dead end** | Up toward the light, the canoe's hull above, and the reef wall stops him. The shark looms and opens its mouth. Silence plus a heartbeat. Franko shuts his eyes... and as the shark curls round he sees the red cup on its tail. He grabs it and pulls. **POP!** | Franko's paws on the cup, the tail and his face in frame |
| 0:57–1:04 | **Payoff** | The shark freezes, then melts with relief, scratches its tail on the coral, and nuzzles Franko like a giant puppy, tail wagging. The crew peek over the rock with their jaws dropped; Babushka Lusya faints. Last shot: Franko rides the hammerhead and holds the hammer like handlebars as they zoom past the lens. | Franko riding the hammer, big in frame |

Bill (optional), at the end: "And that... is how the Dive Cats got a shark." End card: "DIVE CATS 4?"

## Build changes (block 2, 2026-11-21)
- **Shark:** the rigged hammerhead (`models/hammerhead_rigged.glb`) replaced the code jaw: jaw, head, spine and tail bones. That makes the tail-chasing gag possible.
- **Grouper:** it spits Franko out instead of his mask popping out (his mask is part of his model).
- **Grouper shot:** it is stacked vertically: the shark above, the grouper below, Franko low and near. Side by side, the three never fit the 9:16 width.

## Build changes (block 1, 2026-11-21)
- **Kelp hide:** Franko's model has no tail bone, so the hide fails on his escaping bubbles, not a wagging tail.
- **Roar:** a single two-shot can't hold both: beside the 3.4 m hammerhead, Franko's head is 6% of the frame. The roar is three cuts instead: DC2's own angle pushing in as the jaw drops → the mouth roaring into the lens (his view) → his face in the bubble blast, with the title.
- **Take-off:** there's no whip pan (it swung into the coral). After the chomp, the shark turns and shoots off screen left after him, with the gun dangling from its tail.

## Ending: A, the pet shark (picked by the user, 2026-11-21)

## Endings not picked (kept as ideas for later episodes)
- **B, the line:** the spear's line still ties Franko's gun to the cup, which is why the shark always finds him. He swims circles round a coral pillar, the line winds the shark up like a yo-yo, and it spins off into the blue.
- **C, Babushka:** furious that someone is chasing her grandkitten, Babushka Lusya swims up and bonks the hammerhead on the head with her speargun. It flees; she drags Franko home by the scruff.

## Spare gags (to swap in)
- **Holes in the rock (the doors gag):** Franko and the shark pop in and out of different holes in a rock, swapping faster and faster, until both pop out of the same hole face to face.
- **The clam:** he hides in a giant clam; the shark knocks; it opens; the clam snaps shut on the shark's nose.
- **The puffer:** he hides behind Silent's puffer; the shark nudges it, it puffs up, and the shark bounces off.
- **Decoy:** he leaves his mask on a rock; the shark attacks the mask while Franko tiptoes away behind it.

## Cartoon toolkit for the build
- An anticipation hold (about 0.3 s) before every zip, stretch along the motion on the zip (about 1.6×), and squash on stops.
- Speed lines, impact stars and bubbles, one sweat drop (the face the user approved for DC2: his own face plus a drop).
- The music hits every action (Mickey-mousing): tiptoe on the xylophone, a bonk on the jam, a slide whistle on the zips.
- A whip pan between scenes, camera shake on impacts, and the shark's split-screen view.
- Suspense: the audience sees the danger before Franko does (a fin rising behind him while he sighs with relief), silence before each catch, and the hides get shorter and the shark faster.

## Lessons from the references (patterns, nothing copied)
- **Finding Nemo (the shark chase):** a trigger makes the friendly shark lose it; its face fills a small opening for the scare; the prey escapes through gaps too small for the hunter; the hunter's head crashes through and jams. → Hides 5 and 6.
- **Tom & Jerry ("Shark Attack" clips, 3.4 M and 5.7 M views on Boomerang UK):** the small one is the clever one; every hide fails through one detail sticking out; pain is comic and never real; a reversal at the end. → The tail, the mask, the bubble.
- **Road Runner:** a fixed rule, repeated with a twist each time. → The shark's tail-chasing runner.
- **Shark Tale (the chase scene, 1.2 M views):** slalom speed through the set between the gags, so the chase never stops.

## DC2 retro rules this script must keep
- The distance rule: outside the planned contact gags (the crack, the nose, the nuzzle) the shark stays at least 1.5× its length from Franko. Nothing may look as if it ate him (DC2 had this twice by accident).
- Every beat above names its payoff shot; the framing gate runs on every frame.
- If it runs long, cut a hide (the fish school first); never speed shots up.
