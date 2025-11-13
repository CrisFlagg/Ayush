export type CanvasInfo = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cellPx: number;
  totalWidth: number;
  totalHeight: number;
};

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas not supported");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/**
 * Resize canvas to fit the grid with a 1-cell border around.
 */
export function resizeCanvasForGrid(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  gridWidth: number,
  gridHeight: number
): CanvasInfo {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const border = 1;
  const totalCellsX = gridWidth + border * 2;
  const totalCellsY = gridHeight + border * 2;

  // Compute integer cell size
  const availW = window.innerWidth;
  const availH = window.innerHeight;
  const cellPx = Math.max(4, Math.floor(Math.min(availW / totalCellsX, availH / totalCellsY)));
  const totalWidth = totalCellsX * cellPx;
  const totalHeight = totalCellsY * cellPx;

  canvas.width = Math.floor(totalWidth * dpr);
  canvas.height = Math.floor(totalHeight * dpr);
  canvas.style.width = `${totalWidth}px`;
  canvas.style.height = `${totalHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { canvas, ctx, cellPx, totalWidth, totalHeight };
}