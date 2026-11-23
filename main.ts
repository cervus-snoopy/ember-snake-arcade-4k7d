// main.ts — "Day one, day seven" (post-tiktok-day-one-day-seven-20261123-0327)
//
// A tiny deterministic Snake game (Day 1 minimal build vs Day 7 busy build)
// plus a frame renderer. Node 22 stdlib only — no install, no network.
//
// What it does when it runs:
//   1. Copies VIDEO.json from this repository root to $MAKEFUN_OUTPUT_DIR
//      (the competition's gate reads it from /output; that is all the
//      program has to do for the grade).
//   2. Renders the gameplay frames the TikTok video is cut from — Day 1
//      (210 frames, 7 s) and Day 7 (240 frames, 8 s) at 30 fps, 1080x1920,
//      both from the same seed, same start, same direction script, same
//      camera — so the two moments are identical except for a week of
//      updates. Frames are pure-stdlib PNGs (zlib + hand-rolled chunks).
//
// Run it:  MAKEFUN_OUTPUT_DIR=./out node main.ts
// Paths resolve from import.meta.url (this file's location), never cwd.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- constants
const W = 1080;
const H = 1920;
const COLS = 27;
const ROWS = 48;
const CELL = 40; // 27*40 = 1080, 48*40 = 1920
const FPS = 30;
const STEP = 5; // frames per snake move (6 cells per second)
const DAY1_FRAMES = 210; // 7 s
const DAY7_FRAMES = 240; // 8 s
const SEED = 20261123;

// ------------------------------------------------------------------- rng
// mulberry32: small deterministic PRNG, fixed seed, no Math.random anywhere.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------- 5x7 font
// Hand-drawn 5-wide, 7-tall bitmap glyphs ("#" = on). Only the characters
// the HUD and labels need.
const FONT = {
  "0": [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
  "3": ["#### ", "    #", "    #", " ### ", "    #", "    #", "#### "],
  "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
  "6": ["  ## ", " #   ", "#    ", "#### ", "#   #", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "  #  ", "  #  ", "  #  ", "  #  "],
  "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
  "9": [" ### ", "#   #", "#   #", " ####", "    #", "   # ", " ##  "],
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
  ".": ["     ", "     ", "     ", "     ", "     ", " ##  ", " ##  "],
  ":": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", "     "],
  "-": ["     ", "     ", "     ", "#####", "     ", "     ", "     "],
  "!": ["  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "     ", "  #  "],
  A: [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  B: ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
  C: [" ### ", "#   #", "#    ", "#    ", "#    ", "#   #", " ### "],
  D: ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
  F: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
  G: [" ### ", "#   #", "#    ", "# ###", "#   #", "#   #", " ### "],
  H: ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  I: [" ### ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  J: ["  ###", "   # ", "   # ", "   # ", "   # ", "#  # ", " ##  "],
  K: ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
  N: ["#   #", "##  #", "##  #", "# # #", "#  ##", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
  Q: [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
  S: [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "#   #", "# # #", "# # #", "## ##", "#   #"],
  X: ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
  Y: ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"],
};

// ------------------------------------------------------------------- png
// CRC-32 (IEEE) table, built once.
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Encode an RGB buffer (W*H*3) as a PNG. Filter: none per row.
function encodePNG(rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = W * 3;
  const raw = Buffer.alloc(H * (stride + 1));
  for (let y = 0; y < H; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 1 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- framebuffer
// RGB buffer, row-major, 3 bytes per pixel. All drawing goes through here.
function newFrame() {
  return Buffer.alloc(W * H * 3);
}

function fillRect(fb, x, y, w, h, color) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  if (x1 <= x0 || y1 <= y0) return;
  const row = Buffer.alloc((x1 - x0) * 3);
  for (let i = 0; i < x1 - x0; i++) {
    row[i * 3] = color[0];
    row[i * 3 + 1] = color[1];
    row[i * 3 + 2] = color[2];
  }
  for (let yy = y0; yy < y1; yy++) row.copy(fb, (yy * W + x0) * 3);
}

function fillBackground(fb, top, bottom) {
  // Vertical gradient in 48 bands (one per grid row).
  for (let band = 0; band < ROWS; band++) {
    const t = band / (ROWS - 1);
    const color = [
      Math.round(top[0] + (bottom[0] - top[0]) * t),
      Math.round(top[1] + (bottom[1] - top[1]) * t),
      Math.round(top[2] + (bottom[2] - top[2]) * t),
    ];
    fillRect(fb, 0, band * CELL, W, CELL, color);
  }
}

function fillCircle(fb, cx, cy, r, color) {
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r2 - dy * dy));
    fillRect(fb, cx - dx, cy + dy, dx * 2 + 1, 1, color);
  }
}

function drawText(fb, text, x, y, scale, color) {
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch] || FONT[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "#") {
          fillRect(fb, cx + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cx += 6 * scale;
  }
}

function textWidth(text, scale) {
  return text.length * 6 * scale - scale;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

// ------------------------------------------------------------ game: snake
// One fixed direction script, one fixed start. Day 1 and Day 7 play the
// exact same moves; only the dressing changes.
const DIRS = [];
for (let i = 0; i < 12; i++) DIRS.push([1, 0]); // right along row 24
for (let i = 0; i < 10; i++) DIRS.push([0, -1]); // up column 20
for (let i = 0; i < 12; i++) DIRS.push([-1, 0]); // left along row 14
for (let i = 0; i < 10; i++) DIRS.push([0, 1]); // down column 8
for (let i = 0; i < 4; i++) DIRS.push([1, 0]); // right along row 24
// 48 moves total.

const START = [8, 24];
const headPos = [[START[0], START[1]]];
for (let t = 0; t < DIRS.length; t++) {
  headPos.push([headPos[t][0] + DIRS[t][0], headPos[t][1] + DIRS[t][1]]);
}

// Head cell after t moves; t < 0 is the starting body trailing left.
function headAt(t) {
  if (t < 0) return [START[0] + t, START[1]];
  return headPos[Math.min(t, headPos.length - 1)];
}

// Apples on the path, each with the tick it appears (right after the
// previous one is eaten). Same apples, same ticks, both days.
const APPLES = [
  { x: 14, y: 24, kind: "red", spawn: 0, points: 10 },
  { x: 20, y: 18, kind: "red", spawn: 6, points: 10 },
  { x: 12, y: 14, kind: "red", spawn: 18, points: 10 },
  { x: 8, y: 20, kind: "gold", spawn: 30, points: 50 },
  { x: 10, y: 24, kind: "red", spawn: 40, points: 10 },
];

function eatTick(apple) {
  // First visit at or after the apple spawns: the snake crosses (10,24)
  // at tick 2, long before that apple appears at tick 40, so a plain
  // first-visit search would credit it (and its 10 points) from the start.
  for (let t = apple.spawn; t < headPos.length; t++) {
    if (headPos[t][0] === apple.x && headPos[t][1] === apple.y) return t;
  }
  return -1;
}
for (const a of APPLES) a.eat = eatTick(a);

// Day 7 obstacles: 2x2 blocks placed clear of the snake's path.
const OBSTACLES = [
  [12, 30],
  [18, 32],
  [10, 38],
  [14, 8],
];

// Particle bursts: deterministic, seeded once, computed analytically per
// frame (position = origin + v*age + gravity*age^2/2), so any frame can be
// rendered without simulating the ones before it.
const PARTICLE_COLORS = [
  [250, 204, 21],
  [244, 114, 182],
  [34, 211, 238],
  [167, 139, 250],
  [74, 222, 128],
];
const BURSTS = [];
{
  const rng = mulberry32(SEED);
  for (const a of APPLES) {
    const parts = [];
    for (let i = 0; i < 26; i++) {
      const ang = rng() * Math.PI * 2;
      const speed = 2 + rng() * 5;
      parts.push({
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 2,
        life: 18 + Math.floor(rng() * 10),
        color: PARTICLE_COLORS[Math.floor(rng() * PARTICLE_COLORS.length)],
      });
    }
    BURSTS.push({ apple: a, parts });
  }
}

function applesEaten(tick, day7) {
  // Day 1 only ever has the first apple; Day 7 has all five.
  return APPLES.filter((a) => a.eat >= 0 && a.eat <= tick && (day7 || a === APPLES[0]));
}

function scoreAt(tick) {
  let s = 0;
  for (const a of APPLES) if (a.eat <= tick) s += a.points;
  return s;
}

// ------------------------------------------------------------ render frame
function cellCenter(cx, cy) {
  return [(cx + 0.5) * CELL, (cy + 0.5) * CELL];
}

function renderFrame(mode, frame) {
  const day7 = mode === "day7";
  const tick = Math.floor(frame / STEP);
  const phase = (frame % STEP) / STEP;
  const fb = newFrame();

  if (day7) {
    fillBackground(fb, [13, 16, 48], [20, 26, 61]);
    // Faint grid dots.
    for (let gx = 0; gx <= COLS; gx += 3) {
      for (let gy = 0; gy <= ROWS; gy += 3) {
        fillRect(fb, gx * CELL - 1, gy * CELL - 1, 3, 3, [40, 48, 90]);
      }
    }
    // Obstacles (make.fun magenta blocks).
    for (const [ox, oy] of OBSTACLES) {
      fillRect(fb, ox * CELL + 2, oy * CELL + 2, CELL * 2 - 4, CELL * 2 - 4, [196, 28, 131]);
      fillRect(fb, ox * CELL + 10, oy * CELL + 10, CELL * 2 - 20, CELL * 2 - 20, [120, 10, 80]);
    }
  } else {
    fillBackground(fb, [5, 5, 5], [5, 5, 5]);
  }

  // Apples: visible once spawned, gone once eaten.
  const apples = day7 ? APPLES : [APPLES[0]];
  for (const a of apples) {
    if (tick < a.spawn || tick > a.eat) continue;
    const [px, py] = cellCenter(a.x, a.y);
    if (a.kind === "gold") {
      fillCircle(fb, px, py, 19, [180, 140, 10]);
      fillCircle(fb, px, py, 15, [250, 204, 21]);
      fillCircle(fb, px - 5, py - 5, 5, [254, 249, 195]);
    } else {
      fillCircle(fb, px, py, 15, [239, 68, 68]);
      fillCircle(fb, px - 5, py - 5, 5, [252, 165, 165]);
    }
  }

  // Snake length and segment positions (interpolated between ticks).
  const eaten = applesEaten(tick, day7).length;
  const len = 5 + eaten;
  const segPos = [];
  for (let i = 0; i < len; i++) {
    const a = headAt(tick - i);
    const b = headAt(tick + 1 - i);
    segPos.push([
      lerp(a[0], b[0], phase),
      lerp(a[1], b[1], phase),
    ]);
  }

  if (day7) {
    // Fading trail behind the head.
    const bg = [16, 20, 50];
    for (let k = 1; k <= 14; k++) {
      const [tx, ty] = cellCenter(headAt(tick - k)[0], headAt(tick - k)[1]);
      const fade = k / 14;
      fillCircle(fb, Math.round(tx), Math.round(ty), Math.max(3, Math.round(16 * (1 - fade * 0.8))), mixColor([34, 197, 94], bg, fade * 0.85));
    }
    // Particle bursts for apples eaten recently.
    for (const burst of BURSTS) {
      const birth = burst.apple.eat * STEP;
      const age = frame - birth;
      if (age < 0) continue;
      const [ox, oy] = cellCenter(burst.apple.x, burst.apple.y);
      for (const p of burst.parts) {
        if (age >= p.life) continue;
        const px = ox + p.vx * age;
        const py = oy + p.vy * age + 0.18 * age * age;
        const fade = 1 - age / p.life;
        fillCircle(fb, Math.round(px), Math.round(py), Math.max(2, Math.round(6 * fade)), mixColor(p.color, [16, 20, 50], 1 - fade));
      }
    }
  }

  // Snake body: circles at each segment plus midpoints, so it reads as one
  // continuous body. Colour runs head -> tail (Day 7: cyan -> green ->
  // violet; Day 1: plain green).
  const HEAD7 = [34, 211, 238];
  const MID7 = [74, 222, 128];
  const TAIL7 = [167, 139, 250];
  for (let i = len - 1; i >= 0; i--) {
    const [sx, sy] = cellCenter(segPos[i][0], segPos[i][1]);
    let color;
    if (day7) {
      const t = len <= 1 ? 0 : i / (len - 1);
      color = t < 0.5 ? mixColor(HEAD7, MID7, t * 2) : mixColor(MID7, TAIL7, (t - 0.5) * 2);
    } else {
      color = i === 0 ? [74, 222, 128] : [34, 197, 94];
    }
    fillCircle(fb, Math.round(sx), Math.round(sy), 17, color);
    if (i > 0) {
      const [nx, ny] = cellCenter(segPos[i - 1][0], segPos[i - 1][1]);
      fillCircle(fb, Math.round((sx + nx) / 2), Math.round((sy + ny) / 2), 17, color);
    }
  }

  // Head eyes, looking along the current direction.
  {
    const [hx, hy] = cellCenter(segPos[0][0], segPos[0][1]);
    const d = DIRS[Math.min(tick, DIRS.length - 1)];
    const px = -d[1];
    const py = d[0];
    for (const s of [-1, 1]) {
      const ex = Math.round(hx + d[0] * 6 + px * 8 * s);
      const ey = Math.round(hy + d[1] * 6 + py * 8 * s);
      fillCircle(fb, ex, ey, 5, [255, 255, 255]);
      fillCircle(fb, Math.round(ex + d[0] * 2), Math.round(ey + d[1] * 2), 2, [10, 10, 10]);
    }
  }

  // Labels / HUD.
  if (day7) {
    fillRect(fb, 0, 0, W, 120, [10, 12, 28]);
    drawText(fb, "DAY 7", 48, 38, 4, [255, 255, 255]);
    const level = 1 + Math.floor(eaten / 2);
    const levelText = "LEVEL " + level;
    drawText(fb, levelText, Math.round((W - textWidth(levelText, 4)) / 2), 38, 4, [250, 204, 21]);
    const scoreText = "SCORE " + scoreAt(tick);
    drawText(fb, scoreText, W - 48 - textWidth(scoreText, 4), 38, 4, [74, 222, 128]);
  } else {
    drawText(fb, "DAY 1", 48, 48, 3, [156, 163, 175]);
  }

  return fb;
}

// --------------------------------------------------------------------- main
function main() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || join(scriptDir, "out");
  mkdirSync(outDir, { recursive: true });

  // The graded job: hand VIDEO.json in (copy repo root -> /output).
  const videoJson = join(scriptDir, "VIDEO.json");
  if (existsSync(videoJson)) {
    writeFileSync(join(outDir, "VIDEO.json"), readFileSync(videoJson));
    console.log("copied VIDEO.json -> " + join(outDir, "VIDEO.json"));
  } else {
    console.log("VIDEO.json not in repo root yet; skipping copy (frames still render).");
  }

  // The video's footage: deterministic frames for both builds.
  const jobs = [
    ["day1", DAY1_FRAMES],
    ["day7", DAY7_FRAMES],
  ];
  for (const [mode, count] of jobs) {
    for (let f = 0; f < count; f++) {
      const png = encodePNG(renderFrame(mode, f));
      writeFileSync(join(outDir, mode + "_" + String(f).padStart(4, "0") + ".png"), png);
    }
    console.log("rendered " + count + " frames: " + mode);
  }

  const manifest = {
    game: "snake",
    seed: SEED,
    fps: FPS,
    width: W,
    height: H,
    day1: { frames: DAY1_FRAMES, seconds: DAY1_FRAMES / FPS, mode: "minimal: green snake, 1 red apple, no HUD" },
    day7: { frames: DAY7_FRAMES, seconds: DAY7_FRAMES / FPS, mode: "7 days of updates: HUD, level, golden apple, particles, trail, obstacles" },
  };
  writeFileSync(join(outDir, "frames.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("wrote frames.json; output dir: " + outDir);
}

main();
