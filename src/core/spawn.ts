import { Cell, Direction, GameState, Snake } from "./types";
import { randomEmptyCell } from "./grid";

function makeSnake(
  id: number,
  head: Cell,
  dir: Direction,
  color: { head: string; body: string },
  length = 3,
  speed = 1
): Snake {
  const body: Cell[] = [head];
  for (let i = 1; i < length; i++) {
    if (dir === Direction.Right) body.push({ x: head.x - i, y: head.y });
    else if (dir === Direction.Left) body.push({ x: head.x + i, y: head.y });
    else if (dir === Direction.Down) body.push({ x: head.x, y: head.y - i });
    else if (dir === Direction.Up) body.push({ x: head.x, y: head.y + i });
  }
  return {
    id,
    color,
    body,
    dir,
    nextDir: null,
    alive: true,
    grewThisTick: false,
    speed,
    moveAccum: 0
  };
}

export function spawnPlayerAndAIs(state: GameState) {
  const { gridWidth: w, gridHeight: h, aiCount } = state.config;
  // Player near center-left, heading right
  const playerHead = { x: Math.floor(w / 4), y: Math.floor(h / 2) };
  state.snakes.push(
    makeSnake(0, playerHead, Direction.Right, { head: "#3cff3c", body: "#2bbf2b" }, 3, 0.9)
  );
  state.playerIndex = 0;

  // AI colors palette
  const aiColors = [
    { head: "#ff3c3c", body: "#bf2b2b" },
    { head: "#3cc0ff", body: "#2b8fbf" },
    { head: "#ff8f3c", body: "#bf6c2b" },
  ];

  // AI spawn points: disperse across quadrants
  const positions: Cell[] = [
    { x: Math.floor((3 * w) / 4), y: Math.floor(h / 3) },
    { x: Math.floor((3 * w) / 4), y: Math.floor((2 * h) / 3) },
    { x: Math.floor(w / 2), y: Math.floor(h / 4) },
  ];

  for (let i = 0; i < aiCount; i++) {
    const pos = positions[i % positions.length];
    const dir = i % 2 === 0 ? Direction.Left : Direction.Up;
    const id = i + 1;
    state.snakes.push(makeSnake(id, pos, dir, aiColors[i % aiColors.length], 3, 0.8));
  }
}

export function refillFood(state: GameState) {
  const target = state.config.targetFoodCount;
  while (state.foods.length < target) {
    const c = randomEmptyCell(state);
    state.foods.push(c);
  }
}