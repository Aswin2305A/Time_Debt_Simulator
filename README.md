# Time Debt Simulator — README

## What is this?

Time Debt Simulator is a browser-based 2D survival game where **time is your only currency**.
You start with 100 years of life. Every action — walking, running, jumping — drains your lifespan.
Collect crystals, avoid enemies, and reach the Escape Portal before your time runs out.

---

## How to Run

1. Open a terminal and navigate to this folder (`web/`)
2. Run:
   ```
   python -m http.server 8000
   ```
3. Open your browser and go to: **http://localhost:8000**
4. No installation, no dependencies — it runs entirely in the browser.

---

## Files

```
web/
  index.html   — Single HTML page that loads the canvas and game.js
  game.js      — The entire game: ~530 lines of JavaScript
  README.md    — This file
```

The whole game lives in two files. No frameworks, no libraries, no build step.

---

## Technology Used

### Language
**JavaScript (ES6+)** — vanilla, no frameworks.

### Rendering
**HTML5 Canvas API** — every pixel is drawn manually each frame using the 2D context:
- `ctx.fillRect` / `ctx.strokeRect` — rectangles for buildings, HUD panels, road
- `ctx.arc` — circles for player, enemies, crystals, portal
- `ctx.roundRect` — rounded panels and buttons
- `ctx.createRadialGradient` — glow effects on player, enemies, portal, crystals
- `ctx.setLineDash` — animated dashed road centre line
- `ctx.shadowBlur` / `ctx.shadowColor` — neon glow on text
- `ctx.globalAlpha` — transparency for overlays, ghosts, notifications
- `ctx.save` / `ctx.restore` — isolating transform and alpha state
- `ctx.translate` / `ctx.rotate` — rotating crystals and enemy hexagons

### Game Loop
**`requestAnimationFrame`** — the standard browser game loop. Called 60 times per second.
Each frame: calculate delta time → update all game logic → draw everything.

```js
function loop(now){
  const dt = (now - last) / 1000;  // seconds since last frame
  update(dt);   // move everything
  draw();       // render everything
  requestAnimationFrame(loop);
}
```

### Input System
Two input sources merged into one unified system:

**Keyboard** — `keydown` / `keyup` events stored in an object `K`:
```js
const K = {};
addEventListener('keydown', e => { K[e.code] = true; });
addEventListener('keyup',   e => { K[e.code] = false; });
```

**On-screen D-Pad / Buttons** — virtual key object `VK` set by mouse/touch events:
```js
const VK = { u:0, d:0, l:0, r:0, run:0, jump:0, e:0 };
```
Both `K` and `VK` are checked simultaneously in the update loop, so keyboard and touch work at the same time.

Touch support uses `touchstart`, `touchend`, and `touchmove` events with `passive:false` to allow `preventDefault()`.

### Coordinate Scaling
Mouse/touch coordinates are scaled from CSS pixels to game pixels so the game works at any browser zoom level:
```js
function gp(e){
  const r = C.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top)  * (H / r.height)
  };
}
```

---

## Game Architecture

Everything is in one file (`game.js`) organised into clear sections:

### 1. Constants
Time values stored in seconds: `MIN=60`, `HR=3600`, `DAY=86400`, `WK=604800`, `MO=2592000`, `YR=31536000`.
World size: 9000 × 1400 pixels. Road runs from y=520 to y=880.

### 2. Zones (8 total)
Each zone is a plain object with `x0`, `x1`, `name`, `col`, `info`.
The player scrolls left-to-right through all 8 zones.

| Zone | Name | Feature |
|------|------|---------|
| 1 | Spawn District | Safe start |
| 2 | Crystal Market | Lots of crystals |
| 3 | Industrial Maze | Narrow maze walls + first enemies |
| 4 | Collector Zone | 3 patrolling enemies |
| 5 | Time Bank District | Deposit / withdraw lifespan |
| 6 | Neon Graveyard | Ghost enemies + trap (red) crystals |
| 7 | Corporate Sector | Fast guards + toll gates |
| 8 | Escape Portal | Win condition |

### 3. Difficulty System
Three presets stored in `DIFF`:

| Preset | Start Life | Walk Cost | Enemy Speed | Crystal Bonus |
|--------|-----------|-----------|-------------|---------------|
| Easy   | 100 years | 0.4 min/s | Patrol 45   | ×1.5 |
| Medium | 100 years | 1 min/s   | Patrol 65   | ×1.0 |
| Hard   | 60 years  | 2 min/s   | Patrol 95   | ×0.7 |

All costs and enemy speeds scale from the selected difficulty at runtime.

### 4. Lifespan Manager (`LM`)
A plain object that acts as the central resource tracker:
- `LM.cur` — current lifespan in seconds
- `LM.eat(seconds, label)` — deduct lifespan, show notification, trigger death if zero
- `LM.add(seconds, label)` — restore lifespan
- `LM.f()` — fraction remaining (0.0 to 1.0), used for the HUD bar and player colour

### 5. Player (`PL`)
A plain object storing position, facing direction, jump timer, bob animation, and checkpoint data:
- Movement uses **AABB collision** — tries X and Y axes separately to allow sliding along walls
- **Bob animation** — `Math.sin` applied to the Y draw position for a walking/jumping bounce
- **Checkpoint save/restore** — `PL.sv()` stores current position and lifespan; `PL.rs()` restores them

### 6. World Generation
Built once at startup using a **seeded pseudo-random number generator** (`mkR(seed)`) — a simple Linear Congruential Generator:
```js
function mkR(seed){
  let s = seed|0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 2**32;
  };
}
```
The same seed always produces the same world layout. Buildings are stored as rectangles in `BLDGS[]` and also pushed into `WALLS[]` for collision. Zone 3 adds extra internal maze walls.

### 7. Enemy AI (3 types)
Each enemy is a plain object with a **Finite State Machine** with 3 states:

```
Patrol  ──(player in range)──►  Chase  ──(close enough)──►  Attack
          ◄──(player escaped)──          ◄──(player moved away)──
```

- `'p'` (patrol) — follows waypoints in sequence, waits briefly at each point
- `'c'` (chase) — moves directly toward the player at chase speed
- `'a'` (attack) — drains lifespan every 2 seconds while adjacent

Three enemy variants scale from the active difficulty:
- `'n'` Normal — standard speed and detection
- `'g'` Ghost — 30% faster, 30% wider detection, deals 1.5× damage
- `'f'` Fast — 60% faster, hits slightly less

### 8. Crystals
Four types stored in `CT`:
- Green (+1 Day), Blue (+1 Week), Gold (+1 Month) — reward crystals
- Red — trap crystal that deducts 3 Months, marked with a `!`

Crystal rewards are multiplied by `df.cb` (the difficulty crystal bonus).
Each crystal animates with a **sine wave bob** and **rotation** each frame.

### 9. Camera
Smooth follow using exponential lerp (10% per frame toward target):
```js
CAM.x += ((PL.x - W/2) - CAM.x) * 0.1;
```
Camera is clamped so it never shows outside the world bounds.

### 10. Special Mechanics
- **Time Banks** — press E near a bank to deposit 1 month; press E again to withdraw it
- **Shortcuts** — press E at a shortcut sign to teleport forward at a cost of 3 months
- **Toll Gates** (Zone 7) — invisible trigger; walking through auto-deducts 3 months
- **Checkpoints** — walk over them to save; on death, respawn at the last activated checkpoint
- **Camera Shake** — triggered on enemy hit, decays over ~0.3 seconds

### 11. Notifications
A simple queue array `NOTIFS[]`. Each item has text and a countdown timer.
Up to 4 notifications stack on screen, fading out as their timer reaches zero.

### 12. Save System
Uses **`localStorage`** (browser built-in key-value store):
```js
localStorage.setItem('tds3', JSON.stringify({ life, crys, score, px, py, ... }));
```
Saves: lifespan, position, checkpoint, crystal count, score, and difficulty key.
Loaded back with `JSON.parse(localStorage.getItem('tds3'))`.

### 13. State Machine
The game has 7 states managed by a single `STATE` string:

```
menu → diff → play → pause → play
                   → over  → menu
                   → win   → menu
menu → how → menu
```

The main loop renders the correct screen and runs update only when `STATE === 'play'`.

---

## Controls

| Input | Action | Cost |
|-------|--------|------|
| WASD / Arrow Keys | Move | -1 min/second |
| Shift / RUN button | Run | -5 min/second |
| Space / JUMP button | Jump | -10 minutes |
| E / [E] button | Interact (bank, shortcut) | varies |
| F5 | Save | — |
| ESC | Pause | — |

---

## Win / Lose Conditions

**Lose:** Lifespan reaches 0 → respawn at last checkpoint (if saved), or Game Over screen.

**Win:** Touch the Escape Portal in Zone 8.

| Years Remaining | Ending |
|----------------|--------|
| More than 50 | Excellent Escape |
| 20 – 50 | Good Escape |
| Less than 20 | Barely Survived |

---

## Design Patterns Used

- **Game loop** — fixed update + render cycle via `requestAnimationFrame`
- **Finite State Machine** — enemy AI (patrol/chase/attack) and game screens
- **Object literals as namespaces** — `LM`, `PL`, `CAM`, `PORTAL` are all plain objects acting as singletons
- **Data-driven design** — zones, difficulties, crystal types, enemy routes all defined as data arrays/objects, not hardcoded logic
- **Seeded RNG** — deterministic world generation from a fixed seed
- **Delta time** — all movement and cost calculations multiplied by `dt` so the game runs at the same speed regardless of frame rate
