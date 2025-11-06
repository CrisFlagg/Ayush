import { AIController } from "../ai/controller";
import { playSound } from "../audio/sfx";
import { refillFood, spawnPlayerAndAIs } from "./spawn";
import {
  Cell,
  Direction,
  GameState,
  Snake,
  add,
  cellEquals,
  cellKey,
  inBounds,
  DIR_VECS,
  isReverse,
} from "./types";
import { rngFromSeed } from "./rng";

export class Game {
  state: GameState;
  private ai: AIController;

  private accumulator = 0;
  private lastTime = 0;

  constructor(seed: string, config: { width: number; height: number; aiCount: number }) {
    const startTickHz = 12;
    const maxTickHz = 18;

    this.state = {
      config: {
        gridWidth: config.width,
        gridHeight: config.height,
        targetFoodCount: 3,
        aiCount: config.aiCount,
        startTickHz,
        maxTickHz,
      },
      snakes: [],
      playerIndex: 0,
      foods: [],
      rng: rngFromSeed(seed),
      time: { ticks: 0, elapsedMs: 0 },
      seed,
      score: 0,
      bestScore: 0,
      running: true,
      over: false,
      paused: false,
    };

    spawnPlayerAndAIs(this.state);
    refillFood(this.state);

    this.ai = new AIController(1);
  }

  setBestScore(best: number) {
    this.state.bestScore = best;
  }

  togglePause() {
    if (this.state.over) return;
    this.state.paused = !this.state.paused;
    this.state.running = !this.state.paused;
  }

  requestTurnForPlayer(dir: Direction) {
    const player = this.state.snakes[this.state.playerIndex];
    if (!player.alive) return;
    // Apply 90-degree rule: ignore reverse
    if (isReverse(player.dir, dir)) return;
    player.nextDir = dir;
  }

  updateAIIntents(willMove: boolean[]) {
    for (let i = 0; i < this.state.snakes.length; i++) {
      if (i === this.state.playerIndex) continue;
      const sn = this.state.snakes[i];
      if (!sn.alive) continue;
      if (!willMove[i]) continue; // plan on movement ticks
      const dir = this.ai.plan(this.state, sn);
      if (dir !== null && !isReverse(sn.dir, dir)) {
        sn.nextDir = dir;
      }
    }
  }

  tick(dtMs: number) {
    if (!this.state.running || this.state.over) return;

    const tickHz = this.tunedTickHz();
    const stepMs = 1000 / tickHz;

    this.accumulator += dtMs;

    if (this.accumulator < stepMs) return;

    // Only process one tick at a time to keep pace stable
    this.accumulator -= stepMs;

    // Determine which snakes move this tick using per-snake speed
    const willMove: boolean[] = new Array(this.state.snakes.length).fill(false);
    for (let i = 0; i < this.state.snakes.length; i++) {
      const sn = this.state.snakes[i];
      if (!sn.alive) continue;
      sn.moveAccum += sn.speed;
      if (sn.moveAccum >= 1) {
        willMove[i] = true;
        sn.moveAccum -= 1;
      }
    }

    // Update AI intents before committing inputs, only for snakes that will move
    this.updateAIIntents(willMove);

    // 1) Input commit (only apply when the snake will move)
    for (let i = 0; i < this.state.snakes.length; i++) {
      const sn = this.state.snakes[i];
      if (!sn.alive) continue;
      if (!willMove[i]) continue;
      if (sn.nextDir !== null && !isReverse(sn.dir, sn.nextDir)) {
        sn.dir = sn.nextDir;
      }
      sn.nextDir = null;
    }

    // 2) Next head cells (only for snakes that will move)
    const nextHeads: (Cell | null)[] = this.state.snakes.map((sn, i) =>
      sn.alive && willMove[i] ? add(sn.body[0], DIR_VECS[sn.dir]) : null
    );

    // 3) Head-to-head resolution
    const conflicts = new Map<string, number[]>();
    for (let i = 0; i < nextHeads.length; i++) {
      const n = nextHeads[i];
      if (!n) continue;
      const key = cellKey(n);
      const arr = conflicts.get(key);
      if (arr) arr.push(i);
      else conflicts.set(key, [i]);
    }

    const dead = new Set<number>();
    for (const [key, arr] of conflicts.entries()) {
      if (arr.length <= 1) continue;
      // Longest survives; ties -> all die
      let maxLen = -1;
      let winners: number[] = [];
      for (const idx of arr) {
        const len = this.state.snakes[idx].body.length;
        if (len > maxLen) {
          maxLen = len;
          winners = [idx];
        } else if (len === maxLen) {
          winners.push(idx);
        }
      }
      if (winners.length > 1) {
        // All die
        for (const idx of arr) dead.add(idx);
      } else {
        // Kill losers
        const winner = winners[0];
        for (const idx of arr) if (idx !== winner) dead.add(idx);
      }
    }

    // 4) Move and eat
    const grew = new Set<number>();
    for (let i = 0; i < this.state.snakes.length; i++) {
      const sn = this.state.snakes[i];
      if (!sn.alive || dead.has(i)) continue;
      const target = nextHeads[i];
      if (!target) continue; // snake did not move this tick
      // Eat?
      const foodIndex = this.state.foods.findIndex((f) => cellEquals(f, target));
      if (foodIndex !== -1) {
        this.state.foods.splice(foodIndex, 1);
        this.state.score += 10;
        sn.grewThisTick = true;
        grew.add(i);
        playSound("eat");
      } else {
        sn.grewThisTick = false;
      }
      sn.body.unshift(target);
      if (!sn.grewThisTick) {
        sn.body.pop();
      }
    }

    // 5) Wall/body collisions
    // Build occupancy excluding tails that moved this tick
    const occupied = new Set<string>();
    for (let i = 0; i < this.state.snakes.length; i++) {
      const sn = this.state.snakes[i];
      if (!sn.alive || dead.has(i)) continue;
      for (let si = 0; si < sn.body.length; si++) {
        occupied.add(cellKey(sn.body[si]));
      }
      // If did not grow, its last segment was popped; already reflected above
    }

    for (let i = 0; i < this.state.snakes.length; i++) {
      const sn = this.state.snakes[i];
      if (!sn.alive || dead.has(i)) continue;
      const head = sn.body[0];
      // Wall
      if (!inBounds(head, this.state.config.gridWidth, this.state.config.gridHeight)) {
        dead.add(i);
        continue;
      }
      // Body - if head overlaps any other body segment
      // Remove own head from occupancy check
      const key = cellKey(head);
      occupied.delete(key);
      if (occupied.has(key)) {
        dead.add(i);
      }
      // Restore if needed
      occupied.add(key);
    }

    // Apply deaths
    for (const idx of dead) {
      const sn = this.state.snakes[idx];
      sn.alive = false;
      playSound("death");
    }

    // Remove dead snakes from occupancy - not strictly necessary
    // 6) Refill food
    refillFood(this.state);

    // Time
    this.state.time.ticks++;
    this.state.time.elapsedMs += stepMs;

    // Check player status
    const player = this.state.snakes[this.state.playerIndex];
    if (!player.alive) {
      this.state.over = true;
      this.state.running = false;
    }
  }

  tunedTickHz(): number {
    // Simple ramp: every 100 points increase tickHz up to max
    const base = this.state.config.startTickHz;
    const max = this.state.config.maxTickHz;
    const bonus = Math.min(max - base, Math.floor(this.state.score / 100));
    return base + bonus;
  }
}