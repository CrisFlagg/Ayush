import { Cell, GameState, Snake, cellKey, inBounds } from "./types";
import { randInt } from "./rng";

export function computeOccupiedSet(snakes: Snake[]): Set<string> {
  const s = new Set<string>();
  for (const sn of snakes) {
    if (!sn.alive) continue;
    for (const seg of sn.body) s.add(cellKey(seg));
  }
  return s;
}

export function isOccupied(snakes: Snake[], c: Cell): boolean {
  const key = cellKey(c);
  for (const sn of snakes) {
    if (!sn.alive) continue;
    for (const seg of sn.body) {
      if (cellKey(seg) === key) return true;
    }
  }
  return false;
}

export function randomEmptyCell(state: GameState): Cell {
  const { gridWidth, gridHeight } = state.config;
  // Try random sampling first
  for (let attempts = 0; attempts < 200; attempts++) {
    const c = { x: randInt(state.rng, gridWidth), y: randInt(state.rng, gridHeight) };
    if (!isOccupied(state.snakes, c) && !cellInFoods(state, c)) return c;
  }
  // Fallback to scanning
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const c = { x, y };
      if (!isOccupied(state.snakes, c) && !cellInFoods(state, c)) return c;
    }
  }
  // If full (shouldn't happen), return center
  return { x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) };
}

export function cellInFoods(state: GameState, c: Cell): boolean {
  return state.foods.some(f => f.x === c.x && f.y === c.y);
}

export function neighbors4(c: Cell): Cell[] {
  return [
    { x: c.x, y: c.y - 1 },
    { x: c.x + 1, y: c.y },
    { x: c.x, y: c.y + 1 },
    { x: c.x - 1, y: c.y },
  ];
}

export function validNeighbors(c: Cell, w: number, h: number): Cell[] {
  return neighbors4(c).filter(n => inBounds(n, w, h));
}