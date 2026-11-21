---
name: prepare-to-post
description: Get a finished video ready to publish (cover image, niche research, title, description with hashtags, tags) and upload it to the channel as Private for the user's review. Use when the user asks to post, upload or publish a video, or to prepare one for posting.
---

# Prepare to post

A finished video goes in. It comes out uploaded to the right channel as **Private**, with a cover, title, description, hashtags and tags. The user watches it there, and it goes Public only on the user's own word.

**Where it lives.** Every video has one folder in the kipishkrytoi repo: `channels/<channel>/videos/queue/<CODE> · <title>/` (layout and codes in `channels/README.md`). The VIDEO FACTORY panel reads it from there. Make that folder first if the video doesn't have one, and copy the render into it as `youtube_4k.mp4`. Everything this skill writes goes into that folder.

## Rules
- **Private first.** Every upload is saved as Private. Switch it to Public only when the user says so in this conversation, about this video.
- **No AI label (the user's rule).** On every platform, answer the AI / altered or synthetic content question **No**. The videos are our own 3D models and animation. Check that answer on screen before saving.
- **Audience:** "No, it's not made for kids". **Paid promotion:** No.

## Steps

### 1. Know the video
- Get the file path. Run `ffprobe` to get its length, size and resolution.
- Make a contact sheet: about 8 frames with ffmpeg `xstack`. Look at it.
- Read whatever explains the episode: its doc in `channels/<channel>/episodes/`, the scene's `shots.json`, the posting notes from earlier videos, and the memory notes on the channel and cast.
- **Done when** you can say in one sentence what happens in the video, who is in it, and its best moment (the frame a viewer would stop scrolling for).

### 2. Cover image
- Make **two or three cover options** at 1080x1920 (9:16). Each is a JPG **under 2 MB**: YouTube's thumbnail limit.
- **three-shorts episodes (three.js, Remotion):** never a frame of the video (the user, 2026-11-20: "don't reuse the frames… make from created models some ultra hype and bait hook"). Follow `skills/three-shorts/COVERS.md` in the kipishkrytoi repo:
  - three staged scenes built from the models, one each: absurd action, hit/threat, giant villain;
  - the story's force gets a cartoon face;
  - finished through `src/brand/thumbs.sh`.

  ts01's pick was "PLUGGED INTO / THE SUN?!".
- **Base for other videos:** the strongest real frame from the render. Use the full-resolution source frames when they exist (Blender `frames4k/` or `frames/`). Otherwise grab a frame with `ffmpeg -ss <t> -i video -frames:v 1`. If the video has burned-in captions, render a clean still instead, because captions on a cover read as a cheap frame grab.
- Faces big and bright, the main character in the upper-middle, and no important detail in the bottom 20 % (the app's UI covers it).
- **Text:** two to four words at most, and only when they add a hook. Use a thick outline in the channel's style: the pixel font `Press Start 2P` for our low-poly videos. Draw it with Python PIL or an ffmpeg `drawtext` filter.
- **A posed cover:** when no real frame carries the hook, build a poster scene in the film's own code, as `scenes/sb01-poster` and `scenes/sb02-poster` do. It reuses the episode's set, cast looks and clips, and its `overlay()` draws the titles. Render it with `node make.mjs <poster> --snap <t>`. This is the user's choice (2026-11-18: "make it from the existing code in Three.js").
- **An AI-made cover** (Higgsfield `gpt_image_2_6`) only when the user asks for one. State the credit cost first.
- Show the user the options, using `SendUserFile` or a side-by-side image. Recommend one.
- Save the options in the folder's `covers/`, and the chosen one as `thumbnail.jpg` (or `.png`).
- **Done when** the user has a recommended cover, and its file is on disk under 2 MB.

### 3. Research the niche
Before writing any copy, find out what the channels that already win in this niche put in their tags, hashtags, titles and descriptions. The user asked for this on every post (2026-11-18).
1. Find 8 to 15 of the niche's most-viewed videos with the research engine's `youtube_search`: 3 to 5 queries covering the format, the episode's topic and the current trend. Keep the ones with real reach: big channels, and small channels with outsized views.
2. Read each one's public metadata (tags, description, hashtags, views, subscribers) with yt-dlp, from the engine's venv: `extract_info(url, download=False)` and its `tags` and `description` fields. When the engine's `fetch` works, record the sources in a `research-run` and validate the brief.
3. Write down the patterns: how tags handle the series name and its misspellings; the topical hook; format and mood words; hashtag count; title shape; description shape.
4. Weigh them against YouTube's rules:
   - title, thumbnail and description matter more than tags, and tags help mostly with misspellings;
   - up to three hashtags show by the title, and past 60 YouTube ignores them all;
   - unrelated hashtags can get the video removed;
   - sexual or vulgar hashtags can bring an age restriction.
- Write `research/tag-research.md` in the video's folder: each video with its link, views and what it does, the patterns, and how they shape this video's copy.
- **Done when** `tag-research.md` names at least eight videos with their links, and every tag and hashtag choice in step 4 traces back to a pattern or a rule in it.

### 4. Copy
Write it into the folder's `UPLOAD.md`, shaped by `tag-research.md`. Keep the block headings of `channels/README.md` exactly (`Title`, `YouTube description`, `Pinned comment`, each followed by a fenced block) and the `- **Status:** ready to post` line, because the panel and `tools/yt.py` read them. Tags and the other platforms go in their own sections below:
- **Title:** 100 characters at most. The hook goes in the first 40 characters, the part phones show. Add `#shorts` for a vertical video under 3 minutes. Offer one option in the niche's own title pattern.
- **Description:**
  - first, one to three lines on what happens and who is in it, with the cast named; teasing questions work in story niches;
  - then the channel's call to action (for Paw and Friends: "Comment your cat's name, one winner joins the next episode", plus subscribe);
  - then **8 to 15 hashtags**, every one about this video, the strongest first;
  - last, any credits the models or music need.
- **Tags** (YouTube): 15 to 30 phrases, 500 characters at most, comma-separated:
  - first the series or channel name with every common misspelling and transliteration;
  - then the cast's names, the episode's topic words and the trend of the moment;
  - then the format and mood words the niche uses.
- **TikTok:** a caption of up to 4,000 characters, with 3 to 5 hashtags.
- **Instagram:** a caption with exactly 5 hashtags.
- **Done when** every field fits its limit (count the characters), and the hashtags in the title and description are spelled the same way.

### 5. Upload as Private (YouTube Studio, through Claude in Chrome)
1. **Find the right browser.** Run `list_connected_browsers` and `select_browser`. Open `studio.youtube.com`, then check the channel name before touching anything.
   - **"Browser 1 / 2" are connection-order labels, not identities.** On 2026-11-20 "Browser 2" was the Evmatic AI Chrome, and the Paw and Friends Chrome was "Browser 1". Identify a browser by the channel Studio opens on.
   - **If the user names a browser** ("the Evmatic AI browser") and none of the connected ones opens on its channel, stop. Ask them to open that Chrome and connect the Claude extension. Never treat "the only connected browser" as the right one, and never switch another channel's account to reach it. ts01: I switched the Paw and Friends Chrome's Studio to Evmatic Cinematic, and the user had to correct me.

   | Channel | Handle | Channel id | Chrome |
   |---|---|---|---|
   | Paw and Friends (the cats) | `@pawandfriendscats` | `UCD8yrEKEhrXTDwA2negq15g` | the cats' Chrome profile |
   | Evmatic Cinematic (three-shorts, English) | — | `UC7nmTD8n8f6VexnX98D-huw` | the Evmatic AI Chrome (account evmaticai) |
   | Stinky Bo | `@Stinky-Bo` | — | — |
2. **Get the file in.** Open `studio.youtube.com/channel/<id>/videos/upload?d=ud`.
   - Chrome's `file_upload` only takes files under 10 MB.
   - A bigger video goes in by the user's drag. Run `explorer.exe "/select,<path>"` to show them the file, and wait for them to say it is in.
3. **Fill the Details step:**
   - the title;
   - the description;
   - the cover, through the hidden file input next to "Upload file". It needs the channel's phone verified; if it doesn't take, say so;
   - the audience;
   - "Show more": paid promotion **No**, AI **No**, and the tags.
   - **The `Escape` key closes the whole upload window.** To close the hashtag suggestion list, click the "Details" heading instead.
   - **Channel upload defaults are pre-filled; check them against this video.** Evmatic Cinematic pre-fills the description "Modelled and animated by Evmatic Cinematic in Blender and Unreal Engine." and the tags `3d animation, 3d modeling, blender, evmatic cinematic`. A three.js video is none of those. Replace the description with the one in `UPLOAD.md`, plus a true credit line, and remove the untrue tags and any duplicates. Keep the channel-name tag.
   - **Read every field back with JavaScript** (the `#textbox` elements, the radio `checked` states, the tag chips). Screenshots of a background Chrome window can time out; `find`, `get_page_text` and `javascript_tool` still work.
4. Click Next through to **Visibility**, choose **Private**, and click **Save**.
   - **Save stays disabled until the file finishes uploading** (175 MB took about 15 minutes). The draft is already saved as Private meanwhile. Wait, then Save; don't leave the dialog unsaved.
5. **Read the result back.** Open `studio.youtube.com/video/<id>/edit`. Check the title, every hashtag (each with its `#`), the tags, AI = No, and visibility = Private.
6. Add `- **YouTube:** https://youtube.com/shorts/<id>` to `UPLOAD.md`. The panel now shows it as uploaded, not public yet.
7. **Done when** that read-back matches `UPLOAD.md` and the video shows as Private in the channel's Content list.

### 6. Report and hand over
- Tell the user:
  - the video's link;
  - that it is **Private**;
  - which cover is on it, or that the cover needs phone verification first;
  - anything that didn't take.
- Ask the user to watch it in Studio. When they say "publish", switch the visibility to Public, save, and read it back again. Then move its folder from `videos/queue/` to `videos/posted/` and run the channel's sync (`channels/README.md` → *Sync with the panel*).
- Never pin comments, reply to comments or post on other platforms without the user asking.
