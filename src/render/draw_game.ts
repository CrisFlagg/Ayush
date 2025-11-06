import { GameState, Snake } from "../core/types";
import { CanvasInfo } from "./canvas";

function drawBrickBorder(ctx: CanvasRenderingContext2D, info: CanvasInfo, gridW: number, gridH: number) {
  const s = info.cellPx;
  const border = 1;
  ctx.fillStyle = "#5a3e2b"; // dark brick
  // Top and bottom
  ctx.fillRect(0, 0, s * (gridW + border * 2), s * border);
  ctx.fillRect(0, s * (gridH + border), s * (gridW + border * 2), s * border);
  // Left and right
  ctx.fillRect(0, 0, s * border, s * (gridH + border * 2));
  ctx.fillRect(s * (gridW + border), 0, s * border, s * (gridH + border * 2));

  // Brick lines
  ctx.strokeStyle = "#7b523a";
  ctx.lineWidth = 2;
  for (let x = 0; x < gridW + border * 2; x++) {
    ctx.beginPath();
    ctx.moveTo(x * s, 0);
    ctx.lineTo(x * s, s);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x * s, s * (gridH + border));
    ctx.lineTo(x * s, s * (gridH + border * 2));
    ctx.stroke();
  }
  for (let y = 0; y < gridH + border * 2; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * s);
    ctx.lineTo(s, y * s);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(s * (gridW + border), y * s);
    ctx.lineTo(s * (gridW + border * 2), y * s);
    ctx.stroke();
  }
}

function drawFood(ctx: CanvasRenderingContext2D, state: GameState, info: CanvasInfo) {
  const s = info.cellPx;
  const border = 1;
  ctx.fillStyle = "#ffd54a";
  for (const f of state.foods) {
    const x = (f.x + border) * s;
    const y = (f.y + border) * s;
    ctx.fillRect(x + Math.floor(s * 0.2), y + Math.floor(s * 0.2), Math.floor(s * 0.6), Math.floor(s * 0.6));
  }
}

function drawSnake(ctx: CanvasRenderingContext2D, snake: Snake, info: CanvasInfo) {
  const s = info.cellPx;
  const border = 1;
  ctx.fillStyle = snake.color.body;
  for (let i = snake.body.length - 1; i >= 1; i--) {
    const seg = snake.body[i];
    const x = (seg.x + border) * s;
    const y = (seg.y + border) * s;
    ctx.fillRect(x, y, s, s);
  }
  // head
  const head = snake.body[0];
  ctx.fillStyle = snake.color.head;
  ctx.fillRect((head.x + border) * s, (head.y + border) * s, s, s);
}

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState, info: CanvasInfo) {
  // Background
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, info.totalWidth, info.totalHeight);

  drawBrickBorder(ctx, info, state.config.gridWidth, state.config.gridHeight);

  // Playfield bg (optional subtle)
  const s = info.cellPx;
  const border = 1;
  ctx.fillStyle = "#bfe8ff";
  ctx.fillRect(border * s, border * s, state.config.gridWidth * s, state.config.gridHeight * s);

  // Foods
  drawFood(ctx, state, info);

  // Snakes
  for (const sn of state.snakes) {
    if (!sn.alive) continue;
    drawSnake(ctx, sn, info);
  }
}