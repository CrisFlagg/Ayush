# Snake Arena (Classic 8-bit) — Implementation Plan

This plan implements the v1 scope defined in game_design.md: Classic mode only, solid walls, 90° turns only (no 180° reversal), simple food and scoring, simplified AI, 8-bit blocky visuals, static web deploy.

## 1) Milestones and Deliverables

1. Scaffold and Loop (Day 1)
   - Vite + TypeScript project scaffold (static, no server).
   - Canvas bootstrapped with crisp pixel settings.
   - Fixed-step simulation loop with accumulator; render at 60 fps.
   - Seeded RNG helper.

2. Core Gameplay (Days 2–3)
   - Grid model; walls as solid border.
   - Player snake movement with “no reverse” rule.
   - Food spawning and growth; maintain target food count (2–3).
   - Self/wall collision; game over and results summary.
   - Score (+10/food), length, survival time.

3. AI Opponents (Days 4–5)
   - Basic BFS pathfinding to nearest reachable food.
   - Dead-end avoidance by flood-fill heuristic.
   - Head-to-head resolution (longer survives; tie → both die).
   - Staggered AI planning cadence to stabilize frame times.

4. UI/UX and Settings (Day 6)
   - Scenes: Title → Game → Pause → Results → Title.
   - HUD (score, length, time), pause overlay.
   - Title settings: grid size (S/M/L) and AI count (1–3).
   - Persistence: best score + last-used settings via localStorage.
   - Seed displayed on Results.

5. Visuals and Audio (Day 7)
   - 8-bit pixel aesthetic (brick border, simple blocks for snakes, pellet for food).
   - Pixel font integration; imageSmoothing disabled.
   - Minimal chiptune SFX (eat, death, UI), start only after first user gesture.

6. Testing, Polish, Deploy (Day 8)
   - Unit tests for grid math, movement rules, collisions, BFS.
   - Property tests (no overlap after tick, reverse input ignored, food count maintained).
   - Deterministic replay (seed + input log) for debugging.
   - Build and deploy to Cosine Instant Sites (static bundle).

## 2) Tech Stack and Project Structure

- Platform: HTML5 Canvas in the browser, TypeScript, Vite build.
- No frameworks required; small internal scene/state manager.

Proposed structure:
```
/public
  index.html            # Canvas + minimal boot
  assets/
    fonts/              # Pixel font(s)
    sfx/                # Small UI/chiptune WAV/OGG
/src
  main.ts               # Boot, scene manager, start game
  core/
    game.ts             # Simulation loop (accumulator), tick, render call
    types.ts            # Common types (Vec2, Cell, Direction, Snake, GameState)
    rng.ts              # Seeded RNG (e.g., mulberry32/xorshift)
    grid.ts             # Grid model, walls, empty-cell selection
    collision.ts        # Head-head, body, wall checks; resolution order
    spawn.ts            # Spawn player/AI, spawn food and refill logic
    scoring.ts          # Score, length, time tracking
    pathfinding.ts      # BFS shortest path to food
    spacefill.ts        # Flood-fill area size heuristic
  input/
    keyboard.ts         # Arrows/WASD; 90° only, ignore reverse
    touch.ts            # Swipe detection; same constraints as keyboard
  ai/
    controller.ts       # Per-AI planner; cadence, tie-breaking noise
  render/
    canvas.ts           # Canvas context, pixel scaling, draw helpers
    draw_game.ts        # Tiles, border, snakes, food, HUD
  scenes/
    title.ts            # Title, settings (grid size, AI count), play
    play.ts             # Game loop orchestration
    pause.ts            # Overlay pause
    results.ts          # Summary, seed shown, restart
  persist/
    storage.ts          # localStorage keys, best score, settings
  audio/
    sfx.ts              # User-gesture gated audio init, play SFX helpers
/tests
  grid.test.ts
  movement.test.ts
  collision.test.ts
  bfs.test.ts
  properties.test.ts
```

## 3) Game Data Models

- Direction: enum { Up, Right, Down, Left } with a helper to check “isReverse(a, b)”.
- Cell: { x: number, y: number } on the grid.
- Snake:
  - id: number
  - color: { head: string, body: string }
  - body: Deque<Cell> (head at front)
  - dir: Direction
  - nextDir: Direction | null (applied at next tick if valid)
  - alive: boolean
  - grewThisTick: boolean
  - scoreLength: number (for tie-breaks, usually body.length)
- GameState:
  - grid: { width, height }
  - walls: implicit solid border (or precomputed wall cells)
  - snakes: Snake[]
  - foods: Cell[]
  - rng: PRNG
  - time: { ticks: number, elapsedMs: number }
  - config: { targetFoodCount, aiCount, tickHz, tickRamp }
  - seed: string
  - ui: { scene, pause, hud data }
  - bestScore: number

## 4) Tick and Resolution Order

Per simulation tick:
1) Input commit
   - For each snake, if nextDir set and not reverse of dir, apply it.
2) Next head cells
   - Compute candidate next head for each alive snake (dir → delta).
3) Head-to-head resolution
   - Group snakes by target cell; if >1:
     - Keep the snake with greatest length; in ties, all contenders die.
     - Mark losers as dead; winners proceed to move.
4) Move and eat
   - For each survivor, check food presence on target cell.
     - If food present: grewThisTick = true; remove that food.
     - Else grewThisTick = false.
   - Push new head; if !grewThisTick, pop tail.
5) Wall/body collisions
   - Wall: if head outside bounds or hits wall border → dead.
   - Body: if head cell is occupied by any snake’s body (including own) → dead.
     - Note: entering another snake’s tail cell is safe only if that tail moves this tick (i.e., the other snake did not grow). Handle by checking occupancy before vs after tail pop.
6) Cleanup and spawn
   - Remove dead snakes from occupancy.
   - Refill food up to target count with random empty cells.

## 5) AI Planning

- Goal: nearest reachable food via BFS on the current occupancy map.
- Cadence: compute a fresh path every N ticks (e.g., every 2–3 ticks) per AI; in-between, continue along previous direction if still safe; recompute early if imminent collision risk.
- Dead-end avoidance: After selecting a move, estimate free area in that direction via flood-fill; when multiple moves lead to food, prefer larger area.
- Safety:
  - Disallow moves into walls or occupied cells.
  - If multiple safe directions exist and all are food-equidistant, apply light randomness for variety.
- Head-to-head risk: Penalize target cells that other AI heads are likely to enter on the same tick.

## 6) Rendering and Aesthetic

- Canvas setup:
  - Disable image smoothing; integer scaling for crisp pixels.
  - Sky-blue background; 8-bit “brick” border around playfield.
- Entities:
  - Snakes: filled rectangles per segment; head uses brighter shade.
  - Food: small pellet/coin tile; minimal animation (blink).
- HUD:
  - Score, length, survival time in pixel font.
- Responsive:
  - Compute cell size to fit viewport while preserving integer pixel multiples.

## 7) Input

- Keyboard: Arrow keys/WASD set nextDir; ignore reversals relative to current dir.
- Touch: Swipe detection with threshold; map to Direction; enforce same “no reverse” rule.
- Pause: Esc key or on-screen pause button toggles scene overlay.

## 8) UI Flow

- Title
  - Buttons: Play
  - Settings (simple): Grid size (S/M/L), AI count (1–3)
- Game
  - HUD visible; pause via button/Esc.
- Pause
  - Resume, Restart, Back to Title.
- Results
  - Show score, length, survival time, seed; buttons: Restart, Title.

## 9) Persistence

- localStorage keys:
  - snake_arena_best_score
  - snake_arena_settings (grid size, AI count)
- Save on result screen and when settings change.

## 10) Testing Strategy

- Unit tests:
  - grid: index math, bounds, empty-cell selection.
  - movement: 90° rule, reverse ignored.
  - collision: head-head rules, wall, body, tail-vacate cases.
  - bfs: path to food correctness on small fixtures.
- Property tests:
  - No overlapping segments after a tick.
  - Food count maintained (2–3) after refill.
  - Determinism under fixed seed + input log.
- Replay harness:
  - Record seed + directional inputs with tick indices; ability to replay.

## 11) Performance Notes

- Use typed arrays or pooled objects for cells and queues.
- Stagger AI BFS; avoid per-tick full recompute for all AIs.
- Batch draw operations; one canvas; minimize allocations in tick loop.

## 12) Build and Deployment

- Build: Vite `build` producing a static `dist/` bundle with relative asset paths.
- Cosine Instant Sites:
  - Deploy `/dist` contents.
  - Ensure all asset references are relative (no absolute URLs).
  - No service worker for v1; file name hashing for cache-busting is acceptable.

## 13) Acceptance Criteria (v1)

- Classic mode functional with solid walls; no wrap-around.
- Player controls with 90° turns only; reverse inputs are ignored.
- 2 AI snakes (configurable 1–3) that collect food and can die/collide.
- Food maintained at 2–3 items; +10 points each; growth by +1.
- Correct collision resolution (head-head, wall, body, tail-vacate).
- HUD shows score, length, time; results show final stats and seed.
- Best score persists locally; settings persist; deterministic seeded runs.
- 8-bit visuals (brick border, block snakes, pellet food); minimal SFX after gesture.
- Stable performance at 60 fps render and 12–16 Hz tick on desktop and modern mobile.

## 14) Out of Scope (explicit)

- Power-ups, hazards/obstacles, rare food, combo system.
- Gamepad, assist features, accessibility options.
- Additional modes; wrap-around arenas; PWA/offline.