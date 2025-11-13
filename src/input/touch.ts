import { Direction } from "../core/types";

export function attachTouch(el: HTMLElement, onDir: (dir: Direction) => void) {
  let startX = 0;
  let startY = 0;
  let startT = 0;

  const threshold = 24; // px
  const timeMax = 1000; // ms

  el.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    startX = t.clientX;
    startY = t.clientY;
    startT = Date.now();
  }, { passive: true });

  el.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = Date.now() - startT;
    if (dt > timeMax) return;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      onDir(dx > 0 ? Direction.Right : Direction.Left);
    } else {
      onDir(dy > 0 ? Direction.Down : Direction.Up);
    }
  }, { passive: true });
}