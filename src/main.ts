import { Game } from "./core/game";
import { setupCanvas, resizeCanvasForGrid } from "./render/canvas";
import { drawGame } from "./render/draw_game";
import { attachKeyboard } from "./input/keyboard";
import { attachTouch } from "./input/touch";
import { loadBestScore, loadSettings, saveBestScore, saveSettings, gridSizeToDims } from "./persist/storage";
import { Direction } from "./core/types";
import { initAudio, playSound } from "./audio/sfx";

type UI = {
  title: HTMLElement;
  pause: HTMLElement;
  results: HTMLElement;
  hud: HTMLElement;
  scoreEl: HTMLElement;
  lengthEl: HTMLElement;
  timeEl: HTMLElement;
  bestEl: HTMLElement;
  resultsText: HTMLElement;
  playBtn: HTMLButtonElement;
  resumeBtn: HTMLButtonElement;
  restartBtn: HTMLButtonElement;
  toTitleBtn: HTMLButtonElement;
  restart2Btn: HTMLButtonElement;
  title2Btn: HTMLButtonElement;
  gridSel: HTMLSelectElement;
  aiSel: HTMLSelectElement;
};

let game: Game | null = null;
let ctx: CanvasRenderingContext2D;
let canvasInfo: ReturnType<typeof resizeCanvasForGrid>;
let lastTime = 0;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error("Missing element: " + id);
  return el;
}

function setupUI(): UI {
  const ui: UI = {
    title: $("title-overlay"),
    pause: $("pause-overlay"),
    results: $("results-overlay"),
    hud: $("hud"),
    scoreEl: $("hud-score"),
    lengthEl: $("hud-length"),
    timeEl: $("hud-time"),
    bestEl: $("hud-best"),
    resultsText: $("results-text"),
    playBtn: $("play-btn") as HTMLButtonElement,
    resumeBtn: $("resume-btn") as HTMLButtonElement,
    restartBtn: $("restart-btn") as HTMLButtonElement,
    toTitleBtn: $("to-title-btn") as HTMLButtonElement,
    restart2Btn: $("restart2-btn") as HTMLButtonElement,
    title2Btn: $("title2-btn") as HTMLButtonElement,
    gridSel: $("grid-size") as HTMLSelectElement,
    aiSel: $("ai-count") as HTMLSelectElement,
  };

  return ui;
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function startGame(ui: UI) {
  const settings = {
    gridSize: ui.gridSel.value as "S" | "M" | "L",
    aiCount: parseInt(ui.aiSel.value, 10)
  };
  saveSettings(settings);
  const dims = gridSizeToDims(settings.gridSize);
  game = new Game(randomSeed(), { width: dims.w, height: dims.h, aiCount: settings.aiCount });
  game.setBestScore(loadBestScore());

  canvasInfo = resizeCanvasForGrid(
    document.getElementById("game") as HTMLCanvasElement,
    ctx,
    game.state.config.gridWidth,
    game.state.config.gridHeight
  );

  // Hide title, results, pause; show HUD
  ui.title.classList.add("hidden");
  ui.results.classList.add("hidden");
  ui.pause.classList.add("hidden");
  ui.hud.classList.remove("hidden");

  initAudio();

  playSound("ui");

  // Reset frame timer
  lastTime = 0;
}

function toTitle(ui: UI) {
  ui.title.classList.remove("hidden");
  ui.results.classList.add("hidden");
  ui.pause.classList.add("hidden");
  ui.hud.classList.add("hidden");

  // Restore settings
  const s = loadSettings();
  ui.gridSel.value = s.gridSize;
  ui.aiSel.value = String(s.aiCount);

  game = null;

  playSound("ui");
}

function setupEventHandlers(ui: UI) {
  ui.playBtn.onclick = () => startGame(ui);
  ui.resumeBtn.onclick = () => {
    if (game && !game.state.over) {
      game.togglePause();
      ui.pause.classList.add("hidden");
    }
  };
  ui.restartBtn.onclick = () => {
    if (game) {
      const s = loadSettings();
      ui.gridSel.value = s.gridSize;
      ui.aiSel.value = String(s.aiCount);
      startGame(ui);
    }
  };
  ui.toTitleBtn.onclick = () => toTitle(ui);
  ui.restart2Btn.onclick = () => {
    if (game) {
      const s = loadSettings();
      ui.gridSel.value = s.gridSize;
      ui.aiSel.value = String(s.aiCount);
      startGame(ui);
    }
  };
  ui.title2Btn.onclick = () => toTitle(ui);

  attachKeyboard({
    onDir: (dir) => {
      if (!game) return;
      game.requestTurnForPlayer(dir);
    },
    onPause: () => {
      if (!game || game.state.over) return;
      game.togglePause();
      ui.pause.classList.toggle("hidden", !game.state.paused);
    }
  });

  const canvas = document.getElementById("game") as HTMLCanvasElement;
  attachTouch(canvas, (dir) => {
    if (!game) return;
    game.requestTurnForPlayer(dir);
  });

  window.addEventListener("resize", () => {
    if (!game) return;
    canvasInfo = resizeCanvasForGrid(
      canvas,
      ctx,
      game.state.config.gridWidth,
      game.state.config.gridHeight
    );
  });
}

function updateHUD(ui: UI) {
  if (!game) return;
  const player = game.state.snakes[game.state.playerIndex];
  ui.scoreEl.textContent = `Score: ${game.state.score}`;
  ui.lengthEl.textContent = `Length: ${player.body.length}`;
  ui.timeEl.textContent = `Time: ${(game.state.time.elapsedMs / 1000).toFixed(1)}s`;
  ui.bestEl.textContent = `Best: ${game.state.bestScore}`;
}

function loop(ui: UI, t: number) {
  requestAnimationFrame((now) => loop(ui, now));
  if (!game) return;

  const dt = lastTime ? (t - lastTime) : 16.67;
  lastTime = t;
  game.tick(dt);

  updateHUD(ui);

  drawGame(ctx, game.state, canvasInfo);

  if (game.state.over) {
    // Show results once
    if (!ui.results.classList.contains("hidden")) return;
    saveBestScore(game.state.score);
    game.setBestScore(loadBestScore());
    ui.resultsText.innerHTML = `Score: <b>${game.state.score}</b><br/>Length: <b>${game.state.snakes[game.state.playerIndex].body.length}</b><br/>Time: <b>${(game.state.time.elapsedMs / 1000).toFixed(1)}s</b><br/>Seed: <b>${game.state.seed}</b>`;
    ui.results.classList.remove("hidden");
  }
}

function main() {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  ctx = setupCanvas(canvas);
  const ui = setupUI();
  setupEventHandlers(ui);

  // Load settings into UI on start
  const s = loadSettings();
  ui.gridSel.value = s.gridSize;
  ui.aiSel.value = String(s.aiCount);

  // Start loop
  requestAnimationFrame((now) => loop(ui, now));
}

main();