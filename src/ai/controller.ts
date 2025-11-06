import { Cell, Direction, GameState, Snake, inBounds } from "../core/types";
import { buildBlockedGrid, bfsDirectionToNearestFood } from "../core/pathfinding";
import { floodFillArea } from "../core/spacefi_code";

type AIState = {
  lastPlannedTick: number;
};

export class AIController {
  private aiStates: Map<number, AIState> = new Map(); // key: snake.id

  constructor(private cadence: number = 2) {}

  plan(state: GameState, snake: Snake): Direction | null {
    if (!snake.alive) return null;

    const ai = this.aiStates.get(snake.id) || { lastPlannedTick: -999 };
    const dticks = state.time.ticks - ai.lastPlannedTick;
    const shouldPlan = dticks >= this.cadence;

    // Build occupancy map, excluding each snake's tail if it will move this tick (approx: assume not growing)
    const blocked = buildBlockedGrid(state);

    if (shouldPlan) {
      // BFS to nearest food; choose move that increases area if ties
      const start = snake.body[0];
      const nextCell = bfsDirectionToNearestFood(state, start, blocked);
      ai.lastPlannedTick = state.time.ticks;
      this.aiStates.set(snake.id, ai);

      if (nextCell) {
        // Choose the direction corresponding to (nextCell - start)
        const dx = nextCell.x - start.x;
        const dy = nextCell.y - start.y;
        let dir: Direction | null = null;
        if (dx === 1 && dy === 0) dir = Direction.Right;
        else if (dx === -1 && dy === 0) dir = Direction.Left;
        else if (dx === 0 && dy === 1) dir = Direction.Down;
        else if (dx === 0 && dy === -1) dir = Direction.Up;

        if (dir !== null) return dir;
      }
    }

    // Fallback: keep moving if safe; else pick a safe neighbor with largest area
    const currentHead = snake.body[0];
    const candidates: { dir: Direction; cell: Cell; area: number }[] = [];

    const addCandidate = (dir: Direction, cell: Cell) => {
      if (!inBounds(cell, state.config.gridWidth, state.config.gridHeight)) return;
      const idx = cell.y * state.config.gridWidth + cell.x;
      if (blocked[idx]) return;
      const area = floodFillArea(state, cell, blocked, 400);
      candidates.push({ dir, cell, area });
    };

    addCandidate(Direction.Up, { x: currentHead.x, y: currentHead.y - 1 });
    addCandidate(Direction.Right, { x: currentHead.x + 1, y: currentHead.y });
    addCandidate(Direction.Down, { x: currentHead.x, y: currentHead.y + 1 });
    addCandidate(Direction.Left, { x: currentHead.x - 1, y: currentHead.y });

    if (!candidates.length) return null;
    candidates.sort((a, b) => b.area - a.area);
    return candidates[0].dir;
  }
}