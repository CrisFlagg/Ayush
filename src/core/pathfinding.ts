import { Cell, GameState, cellKey, inBounds } from "./types";
import { validNeighbors } from "./grid";

/**
 * Build a boolean blocked grid based on occupied cells.
 */
export function buildBlockedGrid(state: GameState, excludeKeys?: Set<string>): boolean[] {
  const { gridWidth: w, gridHeight: h } = state.config;
  const blocked = new Array(w * h).fill(false);

  const isExcluded = (k: string) => (excludeKeys ? excludeKeys.has(k) : false);

  for (const sn of state.snakes) {
    if (!sn.alive) continue;
    for (let i = 0; i < sn.body.length; i++) {
      const seg = sn.body[i];
      const k = cellKey(seg);
      if (isExcluded(k)) continue;
      blocked[seg.y * w + seg.x] = true;
    }
  }
  return blocked;
}

export function bfsDirectionToNearestFood(state: GameState, start: Cell, blocked: boolean[]): Cell | null {
  const { gridWidth: w, gridHeight: h } = state.config;

  const q: Cell[] = [];
  const visited = new Set<string>();
  const parent = new Map<string, string>();

  const startKey = cellKey(start);
  q.push(start);
  visited.add(startKey);

  let target: Cell | null = null;

  while (q.length) {
    const cur = q.shift() as Cell;
    const ck = cellKey(cur);

    // Found a food?
    if (state.foods.some(f => f.x === cur.x && f.y === cur.y)) {
      target = cur;
      break;
    }

    for (const nb of validNeighbors(cur, w, h)) {
      const idx = nb.y * w + nb.x;
      if (blocked[idx]) continue;
      const nk = cellKey(nb);
      if (visited.has(nk)) continue;
      visited.add(nk);
      parent.set(nk, ck);
      q.push(nb);
    }
  }

  if (!target) return null;

  // Backtrack to find the first step from start to target
  let curKey = cellKey(target);
  let prevKey = parent.get(curKey) || "";
  while (prevKey && prevKey !== startKey) {
    curKey = prevKey;
    prevKey = parent.get(curKey) || "";
  }
  if (!prevKey && curKey !== startKey) {
    // Start is target (on food) or unreachable
    return null;
  }
  // curKey is the first step from start
  const [xStr, yStr] = curKey.split(",");
  return { x: parseInt(xStr, 10), y: parseInt(yStr, 10) };
}