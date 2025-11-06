import { Cell, GameState, cellKey, inBounds } from "./types";
import { validNeighbors } from "./grid";

/**
 * Estimate free area size reachable from origin using flood-fill,
 * given a blocked[] grid (true = blocked).
 */
export function floodFillArea(state: GameState, origin: Cell, blocked: boolean[], maxLimit = 400): number {
  const { gridWidth: w, gridHeight: h } = state.config;
  if (!inBounds(origin, w, h)) return 0;
  const idx0 = origin.y * w + origin.x;
  if (blocked[idx0]) return 0;

  const q: Cell[] = [origin];
  const seen = new Set<string>([cellKey(origin)]);
  let count = 0;

  while (q.length && count < maxLimit) {
    const cur = q.shift() as Cell;
    count++;
    for (const nb of validNeighbors(cur, w, h)) {
      const idx = nb.y * w + nb.x;
      if (blocked[idx]) continue;
      const key = cellKey(nb);
      if (seen.has(key)) continue;
      seen.add(key);
      q.push(nb);
    }
  }

  return count;
}