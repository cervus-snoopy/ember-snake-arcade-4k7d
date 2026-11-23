SPDX-License-Identifier: MIT

# Day one, day seven — Snake

[![make.fun](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327)
[![rank](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/cervus-snoopy/ember-snake-arcade-4k7d/rank.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)
[![reward](https://make.fun/badge/post-tiktok-day-one-day-seven-20261123-0327/cervus-snoopy/ember-snake-arcade-4k7d/reward.svg)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-tiktok-day-one-day-seven-20261123-0327)

A tiny deterministic Snake game, rendered frame by frame in pure Node
stdlib — no browser, no install, no network — as a Day 1 build (plain
green snake, one red apple, no HUD) and the same game after 7 days of
daily updates (score HUD, level, golden apple, eat particles, trail,
obstacles, a colourful snake). Both builds play the exact same moves
from the same start, so the change is the whole story.

Entry for the [Day one, day seven bounty](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327)
on make.fun ($20, top 10 share the prize). The video is posted on TikTok
from [@snoopy_168](https://www.tiktok.com/@snoopy_168); see VIDEO.json.

## Run

```
MAKEFUN_OUTPUT_DIR=./out node main.ts
```

That copies `VIDEO.json` from the repository root to the output
directory (the competition's gate reads it from `/output`) and renders
the video's gameplay frames there: `day1_0000.png` … `day1_0209.png`
(210 frames, 7 s) and `day7_0000.png` … `day7_0239.png` (240 frames,
8 s), 1080x1920 at 30 fps, plus `frames.json` describing them. Two runs
produce byte-identical output.

Requires Node.js 22.18 or later. Nothing is installed and no network is
used while it runs.

## The video

Cut from the frames this program renders (title → Day 1 → "7 days
later…" → Day 7 → "Start yours at make.fun"), assembled with ffmpeg,
ending with make.fun's referral end card from the press pack
(`makefun-card-9x16-transparent.webm`, blur sigma 28, saturation 0.35,
fade 0.8 s) with referral code `3bzndvs8` typed in the field, and the
make.fun brand badge from the first frame until the card comes in.
Silent — no licensed music. Final cut: 1080x1920, 23.5 s, H.264.

## The game

- One fixed direction script (right, up, left, down, right — 48 moves)
  and one fixed start, shared by both builds; the snake eats the same
  apples at the same ticks either way.
- Day 1: plain green snake, one red apple, black background, no HUD.
- Day 7: score + level HUD, a golden bonus apple worth 50, particle
  bursts on every eat, a fading trail, four magenta obstacle blocks,
  a cyan-to-violet snake, and a dark gradient arena with grid dots.
- Deterministic throughout: spawns, particles and scores come from a
  mulberry32 stream with fixed seed `20261123`; the PNG encoder is
  hand-rolled stdlib (zlib + CRC-32 chunks) and the in-frame text is a
  hand-drawn 5x7 bitmap font.

## Files

```
main.ts                  Node 22+ entry: copies VIDEO.json to
                         $MAKEFUN_OUTPUT_DIR and renders the Day 1 /
                         Day 7 gameplay frames (PNG, stdlib only)
VIDEO.json               {"video_url": "https://www.tiktok.com/@snoopy_168/video/<id>"}
README.md                this file
LICENSE                  MIT
```

## Referral

Optional: earn referral rewards, a second way to make money — start
yours at make.fun with my code `3bzndvs8`: https://make.fun/r/3bzndvs8
