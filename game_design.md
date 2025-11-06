# Snake Arena (Classic 8-bit) — Game Design Document

## Scope (v1)
- Single-player Snake with AI opponent snakes on the same grid.
- Classic mode only.
- Solid walls (no wrap-around).
- No power-ups, no hazards/obstacles. These are future options.
- No rare food, no combo system. These are future options.
- No gamepad support.
- No assist features.
- No accessibility options.
- Visuals: 8-bit Nintendo–style (Mario-like platformer aesthetic).
- Snakes are simple block segments (no fancy skins/effects).
- Input rule: Only 90° turns allowed; all 180° reverse inputs are ignored.

## High concept
Classic Snake, refined for a competitive arena feel: you and AI snakes race to eat food and survive. Pure fundamentals with an authentic 8-bit look.

## Core loop
1. Navigate the grid and collect food.
2. Grow longer and manage space.
3. Avoid collisions with walls, yourself, AI snakes, and their trails.
4. Outlast or trap AI snakes to survive longer and raise score.
5. Repeat as speed and density gradually rise.

## World and rules
- Grid: Discrete grid (e.g., 32×32 on desktop; responsive scale for mobile).
- Boundaries: Solid walls. Collision with walls is fatal.
- Spawning:
  - Player spawns slightly off-center on a safe line.
  - AIs spawn at dispersed, non-overlapping safe points.
  - Food spawns in empty cells; maintain a target count concurrently.
- Movement:
  - Fixed-tick simulation (e.g., 12 Hz base).
  - 90° turns only; 180° reverse inputs are ignored at all times.
  - One direction change can be applied per tick per snake.
- Collisions (per tick):
  1) Each snake selects its next head cell (honoring the no-reverse rule).
  2) Resolve head-to-head conflicts: longer snake survives; tie → both die.
  3) Move heads/tails; if a snake ate food, it grows (tail doesn’t advance that tick).
  4) Apply collisions with walls and any bodies; remove casualties.
  5) Refill food up to target count.

## Entities
- Player snake: Blocky segments; head uses a distinct color.
- AI snakes: Same physics and growth; can die from collisions.
- Food: Single type; +1 length on eat; adds to score.

## Scoring
- +10 per food eaten.
- Scoreboard tracks current run score and best score (local).
- Results screen shows final score, length, and survival time.

## AI behavior (v1 simplified)
- Targeting: Nearest reachable food using BFS on the current grid.
- Safety: Avoid cells occupied by walls/bodies; avoid head-to-head ties when possible (prefer a safe neighbor).
- Dead-end avoidance: Simple flood-fill heuristic—prefer moves leading to larger free regions.
- Imperfection: Light randomness in tie-breaking so AIs aren’t perfectly optimal.
- Planning cadence: Full BFS not every tick—stagger across AIs to keep performance steady.

## Controls
- Keyboard: Arrow keys or WASD; no reverse allowed.
- Touch: Swipe gestures (up/down/left/right). Ignore reverse swipes; apply on next tick.
- Pause: Esc or on-screen pause button.
- No gamepad support.

## UI and UX
- HUD: Score, length, survival time.
- Menus: Title screen (Play), in-game Pause, Results (Restart, Back to Title).
- Simple settings on title: grid size (Small/Medium/Large) and AI count (1–3).

## Visual and audio style
- Style: 8-bit NES-inspired. Simple tiles: sky-blue backdrop, pixel “brick” border as walls.
- Snakes: Solid-color block segments; head uses a brighter shade.
- Food: Single pixel-art coin/pellet.
- Animations: Minimal, 1–2 frame pixel blinks; no glow or trails.
- Fonts: Pixel font for HUD and titles.
- Audio: Classic-style chiptune SFX (eat, death, UI). No autoplay; starts after first input. Single volume slider or mute.

## Technical architecture (static web)
- Platform: HTML5 Canvas (single canvas), JavaScript/TypeScript, entirely client-side.
- Loop: Fixed-step simulation with accumulator; decoupled 60 fps render loop.
- RNG: Seeded RNG for reproducible runs (seed shown on Results).
- Systems: Input, Grid/Collision, AI, Spawning, Renderer, UI State, Persistence (localStorage for best score and minimal settings).

## Performance targets
- 60 fps rendering; consistent 12–18 Hz simulation ticks.
- Optimizations: Grid-based arrays, object pooling for segments, staggered AI planning, draw batching.

## Deployment (Cosine Instant Sites)
- Static bundle: index.html, CSS, JS, pixel font, tiny SFX. All assets referenced via relative paths.
- No service worker for v1; simple filename versioning for cache-busting.

## QA and testing
- Unit tests for grid indexing, movement rules (no reverse), collision resolution, BFS path validity.
- Property tests: “no overlapping segments after tick,” “food count maintained,” “reverse input ignored.”
- Deterministic replay via seed + recorded inputs for debugging AI issues.

## Default parameters (initial tuning)
- Grid: 32×32 default; options for 24×24 (Small), 40×40 (Large).
- Ticks: 12 Hz start; ramp slowly to ~16–18 Hz as score increases.
- AI count: 2 (configurable 1–3).
- Food: Maintain 2–3 items concurrently.
- Scoring: +10 per food.

## Future roadmap (explicitly deferred)
- Power-ups (e.g., shield, speed, multiplier, magnet, ghost).
- Hazards/obstacles (static blocks, moving obstacles, portals).
- Rare food and combo scoring.
- Additional modes (Arena Rumble, Survival, Time Attack, Zen).
- Wrap-around variants.
- Accessibility options (rebinds, colorblind palettes, reduced motion) and gamepad support.
- AI tiers and deeper personalities.
- PWA/offline with service worker and “update available” flow.
- Cosmetic upgrades and themes.