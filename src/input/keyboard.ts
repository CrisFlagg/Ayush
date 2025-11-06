import { Direction } from "../core/types";

export type KeyHandlers = {
  onDir: (dir: Direction) => void;
  onPause: () => void;
};

export function attachKeyboard({ onDir, onPause }: KeyHandlers) {
  const handler = (e: KeyboardEvent) => {
    const k = e.key;
    if (k === "Escape") {
      onPause();
      e.preventDefault();
      return;
    }
    let dir: Direction | null = null;
    if (k === "ArrowUp" || k === "w" || k === "W") dir = Direction.Up;
    else if (k === "ArrowRight" || k === "d" || k === "D") dir = Direction.Right;
    else if (k === "ArrowDown" || k === "s" || k === "S") dir = Direction.Down;
    else if (k === "ArrowLeft" || k === "a" || k === "A") dir = Direction.Left;

    if (dir !== null) {
      onDir(dir);
      e.preventDefault();
    }
  };
  window.addEventListener("keydown", handler, { passive: false });

  return () => window.removeEventListener("keydown", handler as any);
}