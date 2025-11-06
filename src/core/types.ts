export type Vec2 = { x: number; y: number };
export type Cell = Vec2;

export enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3
}

export const DIR_VECS: Record<Direction, Vec2> = {
  [Direction.Up]: { x: 0, y: -1 },
  [Direction.Right]: { x: 1, y: 0 },
  [Direction.Down]: { x: 0, y: 1 },
  [Direction.Left]: { x: -1, y: 0 }
};

export function isReverse(a: Direction, b: Direction): boolean {
  return (a + 2) % 4 === b;
}

export type SnakeColor = { head: string; body: string };

export type Snake = {
  id: number;
  color: SnakeColor;
  body: Cell[]; // head at index 0
  dir: Direction;
  nextDir: Direction | null;
  alive: boolean;
  grewThisTick: boolean;
};

export type GameConfig = {
  gridWidth: number;
  gridHeight: number;
  targetFoodCount: number;
  aiCount: number;
  startTickHz: number;
  maxTickHz: number;
};

export type TimeState = {
  ticks: number;
  elapsedMs: number;
};

export type GameState = {
  config: GameConfig;
  snakes: Snake[];
  playerIndex: number;
  foods: Cell[];
  rng: () => number;
  time: TimeState;
  seed: string;
  score: number;
  bestScore: number;
  running: boolean; // is sim updating
  over: boolean;
  paused: boolean;
};

export function cellEquals(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

export function add(a: Cell, b: Cell): Cell {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function inBounds(c: Cell, w: number, h: number): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < w && c.y < h;
}

export function cellKey(c: Cell): string {
  return `${c.x},${c.y}`;
}