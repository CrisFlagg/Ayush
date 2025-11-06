(() => {
  const Direction = { Up: 0, Right: 1, Down: 2, Left: 3 };
  const DIR_VECS = {
    [Direction.Up]: { x: 0, y: -1 },
    [Direction.Right]: { x: 1, y: 0 },
    [Direction.Down]: { x: 0, y: 1 },
    [Direction.Left]: { x: -1, y: 0 }
  };
  function isReverse(a, b) { return (a + 2) % 4 === b; }
  function addCell(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function inBounds(c, w, h) { return c.x >= 0 && c.y >= 0 && c.x < w && c.y < h; }
  function cellEquals(a, b) { return a.x === b.x && a.y === b.y; }
  function cellKey(c) { return `${c.x},${c.y}`; }

  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFromSeed(seed) { return mulberry32(xmur3(seed)); }
  function randInt(rng, maxExclusive) { return Math.floor(rng() * maxExclusive); }

  function isOccupied(snakes, c) {
    const key = cellKey(c);
    for (const sn of snakes) {
      if (!sn.alive) continue;
      for (const seg of sn.body) {
        if (cellKey(seg) === key) return true;
      }
    }
    return false;
  }
  function cellInFoods(state, c) {
    return state.foods.some(f => f.x === c.x && f.y === c.y);
  }
  function randomEmptyCell(state) {
    const { gridWidth, gridHeight } = state.config;
    for (let attempts = 0; attempts < 200; attempts++) {
      const c = { x: randInt(state.rng, gridWidth), y: randInt(state.rng, gridHeight) };
      if (!isOccupied(state.snakes, c) && !cellInFoods(state, c)) return c;
    }
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const c = { x, y };
        if (!isOccupied(state.snakes, c) && !cellInFoods(state, c)) return c;
      }
    }
    return { x: Math.floor(gridWidth / 2), y: Math.floor(gridHeight / 2) };
  }
  function neighbors4(c) {
    return [
      { x: c.x, y: c.y - 1 },
      { x: c.x + 1, y: c.y },
      { x: c.x, y: c.y + 1 },
      { x: c.x - 1, y: c.y },
    ];
  }
  function validNeighbors(c, w, h) { return neighbors4(c).filter(n => inBounds(n, w, h)); }

  function buildBlockedGrid(state, excludeKeys) {
    const { gridWidth: w, gridHeight: h } = state.config;
    const blocked = new Array(w * h).fill(false);
    const isExcluded = excludeKeys ? (k) => excludeKeys.has(k) : () => false;
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
  function bfsDirectionToNearestFood(state, start, blocked) {
    const { gridWidth: w, gridHeight: h } = state.config;
    const q = [];
    const visited = new Set();
    const parent = new Map();
    const startKey = cellKey(start);
    q.push(start);
    visited.add(startKey);
    let target = null;
    while (q.length) {
      const cur = q.shift();
      if (state.foods.some(f => f.x === cur.x && f.y === cur.y)) { target = cur; break; }
      for (const nb of validNeighbors(cur, w, h)) {
        const idx = nb.y * w + nb.x;
        if (blocked[idx]) continue;
        const nk = cellKey(nb);
        if (visited.has(nk)) continue;
        visited.add(nk);
        parent.set(nk, cellKey(cur));
        q.push(nb);
      }
    }
    if (!target) return null;
    let curKey = cellKey(target);
    let prevKey = parent.get(curKey) || "";
    while (prevKey && prevKey !== startKey) {
      curKey = prevKey;
      prevKey = parent.get(curKey) || "";
    }
    if (!prevKey && curKey !== startKey) return null;
    const [xStr, yStr] = curKey.split(",");
    return { x: parseInt(xStr, 10), y: parseInt(yStr, 10) };
  }
  function floodFillArea(state, origin, blocked, maxLimit = 400) {
    const { gridWidth: w, gridHeight: h } = state.config;
    if (!inBounds(origin, w, h)) return 0;
    const idx0 = origin.y * w + origin.x;
    if (blocked[idx0]) return 0;
    const q = [origin];
    const seen = new Set([cellKey(origin)]);
    let count = 0;
    while (q.length && count < maxLimit) {
      const cur = q.shift();
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

  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
    }
  }
  function beep(freq, duration, type = "square", gain = 0.05) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq; g.gain.value = gain;
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  }
  function playSound(name) {
    if (!audioCtx) return;
    if (name === "eat") beep(660, 0.05, "square", 0.06);
    else if (name === "death") beep(110, 0.25, "square", 0.08);
    else if (name === "ui") beep(440, 0.05, "square", 0.05);
  }

  const BEST_KEY = "snake_arena_best_score";
  const SETTINGS_KEY = "snake_arena_settings";
  function loadBestScore() {
    const v = localStorage.getItem(BEST_KEY);
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }
  function saveBestScore(score) {
    const best = loadBestScore();
    if (score > best) localStorage.setItem(BEST_KEY, String(score));
  }
  function loadSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { gridSize: "M", aiCount: 2 };
    try {
      const s = JSON.parse(raw);
      const gridSize = (s && (s.gridSize === "S" || s.gridSize === "M" || s.gridSize === "L")) ? s.gridSize : "M";
      const aiCount = Math.max(1, Math.min(3, Math.floor((s && s.aiCount) || 2)));
      return { gridSize, aiCount };
    } catch {
      return { gridSize: "M", aiCount: 2 };
    }
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
  function gridSizeToDims(gs) { if (gs === "S") return { w: 24, h: 24 }; if (gs === "L") return { w: 40, h: 40 }; return { w: 32, h: 32 }; }

  function setupCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas not supported");
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }
  function resizeCanvasForGrid(canvas, ctx, gridWidth, gridHeight) {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const border = 1;
    const totalCellsX = gridWidth + border * 2;
    const totalCellsY = gridHeight + border * 2;
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
  function drawBrickBorder(ctx, info, gridW, gridH) {
    const s = info.cellPx;
    const border = 1;
    ctx.fillStyle = "#5a3e2b";
    ctx.fillRect(0, 0, s * (gridW + border * 2), s * border);
    ctx.fillRect(0, s * (gridH + border), s * (gridW + border * 2), s * border);
    ctx.fillRect(0, 0, s * border, s * (gridH + border * 2));
    ctx.fillRect(s * (gridW + border), 0, s * border, s * (gridH + border * 2));
    ctx.strokeStyle = "#7b523a";
    ctx.lineWidth = 2;
    for (let x = 0; x < gridW + border * 2; x++) {
      ctx.beginPath(); ctx.moveTo(x * s, 0); ctx.lineTo(x * s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x * s, s * (gridH + border)); ctx.lineTo(x * s, s * (gridH + border * 2)); ctx.stroke();
    }
    for (let y = 0; y < gridH + border * 2; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * s); ctx.lineTo(s, y * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * (gridW + border), y * s); ctx.lineTo(s * (gridW + border * 2), y * s); ctx.stroke();
    }
  }
  function drawFood(ctx, state, info) {
    const s = info.cellPx;
    const border = 1;
    ctx.fillStyle = "#ffd54a";
    for (const f of state.foods) {
      const x = (f.x + border) * s;
      const y = (f.y + border) * s;
      ctx.fillRect(x + Math.floor(s * 0.2), y + Math.floor(s * 0.2), Math.floor(s * 0.6), Math.floor(s * 0.6));
    }
  }
  function drawSnake(ctx, snake, info) {
    const s = info.cellPx;
    const border = 1;
    ctx.fillStyle = snake.color.body;
    for (let i = snake.body.length - 1; i >= 1; i--) {
      const seg = snake.body[i];
      const x = (seg.x + border) * s;
      const y = (seg.y + border) * s;
      ctx.fillRect(x, y, s, s);
    }
    const head = snake.body[0];
    ctx.fillStyle = snake.color.head;
    ctx.fillRect((head.x + border) * s, (head.y + border) * s, s, s);
  }

  function drawGrid(ctx, state, info) {
    const s = info.cellPx;
    const border = 1;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    for (let gx = 1; gx < state.config.gridWidth; gx++) {
      const x = (border * s) + gx * s + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, border * s);
      ctx.lineTo(x, (border + state.config.gridHeight) * s);
      ctx.stroke();
    }
    for (let gy = 1; gy < state.config.gridHeight; gy++) {
      const y = (border * s) + gy * s + 0.5;
      ctx.beginPath();
      ctx.moveTo(border * s, y);
      ctx.lineTo((border + state.config.gridWidth) * s, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawGame(ctx, state, info) {
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, info.totalWidth, info.totalHeight);
    drawBrickBorder(ctx, info, state.config.gridWidth, state.config.gridHeight);
    const s = info.cellPx;
    const border = 1;
    ctx.fillStyle = "#bfe8ff";
  ctx.fillRect(border * s, border * s, state.config.gridWidth * s, state.config.gridHeight * s);
  drawGrid(ctx, state, info);
  drawFood(ctx, state, info);
    for (const sn of state.snakes) { if (!sn.alive) continue; drawSnake(ctx, sn, info); }
  }

  class AIController {
    constructor(cadence = 2) { this.cadence = cadence; this.aiStates = new Map(); }
    plan(state, snake) {
      if (!snake.alive) return null;
      const ai = this.aiStates.get(snake.id) || { lastPlannedTick: -999 };
      const dticks = state.time.ticks - ai.lastPlannedTick;
      const shouldPlan = dticks >= this.cadence;
      const blocked = buildBlockedGrid(state);
      if (shouldPlan) {
        const start = snake.body[0];
        const nextCell = bfsDirectionToNearestFood(state, start, blocked);
        ai.lastPlannedTick = state.time.ticks;
        this.aiStates.set(snake.id, ai);
        if (nextCell) {
          const dx = nextCell.x - start.x;
          const dy = nextCell.y - start.y;
          let dir = null;
          if (dx === 1 && dy === 0) dir = Direction.Right;
          else if (dx === -1 && dy === 0) dir = Direction.Left;
          else if (dx === 0 && dy === 1) dir = Direction.Down;
          else if (dx === 0 && dy === -1) dir = Direction.Up;
          if (dir !== null) return dir;
        }
      }
      const currentHead = snake.body[0];
      const candidates = [];
      const addCandidate = (dir, cell) => {
        if (!inBounds(cell, state.config.gridWidth, state.config.gridHeight)) return;
        const idx = cell.y * state.config.gridWidth + cell.x;
        if (blocked[idx]) return;
        const area = floodFillArea(state, cell, blocked, 400);
        candidates.push({ dir, cell, area });
      };
      addCandidate(Direction.Up, { x: currentHead.x, y: currentHead.y - 1 });
      addCandidate(Direction.Right, { x: currentHead.x + 1, y: currentHead.y });
      addCandidate(Direction.Down, { x: currentHead.x, y: currentHead.y + 1 });
      addCandidate(Direction.Left, { x: currentHead.x - 1, y: currentHead.y });
      if (!candidates.length) return null;
      candidates.sort((a, b) => b.area - a.area);
      return candidates[0].dir;
    }
  }

  function makeSnake(id, head, dir, color, length = 3, speed = 1) {
    const body = [head];
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
      moveAccum: 0,
      respawnAtTick: null
    };
  }

  function spawnPlayerAndAIs(state) {
    const { gridWidth: w, gridHeight: h, aiCount } = state.config;
    const playerHead = { x: Math.floor(w / 4), y: Math.floor(h / 2) };
    state.snakes.push(
      makeSnake(0, playerHead, Direction.Right, { head: "#3cff3c", body: "#2bbf2b" }, 3, 0.9)
    );
    state.playerIndex = 0;

    const aiColors = [
      { head: "#ff3c3c", body: "#bf2b2b" },
      { head: "#3cc0ff", body: "#2b8fbf" },
      { head: "#ff8f3c", body: "#bf6c2b" },
    ];
    const positions = [
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

  function tryPlaceSnakeAt(state, head, dir, length = 3) {
    const w = state.config.gridWidth, h = state.config.gridHeight;
    const body = [head];
    for (let i = 1; i < length; i++) {
      if (dir === Direction.Right) body.push({ x: head.x - i, y: head.y });
      else if (dir === Direction.Left) body.push({ x: head.x + i, y: head.y });
      else if (dir === Direction.Down) body.push({ x: head.x, y: head.y - i });
      else if (dir === Direction.Up) body.push({ x: head.x, y: head.y + i });
    }
    for (const c of body) {
      if (!inBounds(c, w, h)) return null;
      if (isOccupied(state.snakes, c)) return null;
      if (cellInFoods(state, c)) return null;
    }
    return body;
  }

  function respawnSnake(state, sn, length = 3) {
    const dirs = [Direction.Up, Direction.Right, Direction.Down, Direction.Left];
    for (let attempt = 0; attempt < 200; attempt++) {
      const head = randomEmptyCell(state);
      const startIdx = Math.floor(state.rng() * dirs.length);
      for (let k = 0; k < dirs.length; k++) {
        const dir = dirs[(startIdx + k) % dirs.length];
        const body = tryPlaceSnakeAt(state, head, dir, length);
        if (body) {
          sn.body = body;
          sn.dir = dir;
          sn.nextDir = null;
          sn.alive = true;
          sn.grewThisTick = false;
          sn.moveAccum = 0;
          sn.respawnAtTick = null;
          return true;
        }
      }
    }
    return false;
  }

  function refillFood(state) {
    const target = state.config.targetFoodCount;
    while (state.foods.length < target) {
      const c = randomEmptyCell(state);
      state.foods.push(c);
    }
  }

  function attachKeyboard({ onDir, onPause }) {
    const handler = (e) => {
      const k = e.key;
      if (k === "Escape") { onPause(); e.preventDefault(); return; }
      let dir = null;
      if (k === "ArrowUp" || k === "w" || k === "W") dir = Direction.Up;
      else if (k === "ArrowRight" || k === "d" || k === "D") dir = Direction.Right;
      else if (k === "ArrowDown" || k === "s" || k === "S") dir = Direction.Down;
      else if (k === "ArrowLeft" || k === "a" || k === "A") dir = Direction.Left;
      if (dir !== null) { onDir(dir); e.preventDefault(); }
    };
    window.addEventListener("keydown", handler, { passive: false });
  }
  function attachTouch(el, onDir) {
    let startX = 0, startY = 0, startT = 0;
    const threshold = 24, timeMax = 1000;
    el.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0]; startX = t.clientX; startY = t.clientY; startT = Date.now();
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX; const dy = t.clientY - startY; const dt = Date.now() - startT;
      if (dt > timeMax) return;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      if (Math.abs(dx) > Math.abs(dy)) onDir(dx > 0 ? Direction.Right : Direction.Left);
      else onDir(dy > 0 ? Direction.Down : Direction.Up);
    }, { passive: true });
  }

  class Game {
    constructor(seed, config) {
      const startTickHz = 12, maxTickHz = 18;
      this.state = {
        config: { gridWidth: config.width, gridHeight: config.height, targetFoodCount: 3, aiCount: config.aiCount, startTickHz, maxTickHz },
        snakes: [], playerIndex: 0, foods: [], rng: rngFromSeed(seed),
        time: { ticks: 0, elapsedMs: 0 }, seed, score: 0, bestScore: 0, running: true, over: false, paused: false
      };
      this.ai = new AIController(1);
      this.accumulator = 0;
      spawnPlayerAndAIs(this.state); refillFood(this.state);
    }
    setBestScore(best) { this.state.bestScore = best; }
    togglePause() { if (this.state.over) return; this.state.paused = !this.state.paused; this.state.running = !this.state.paused; }
    requestTurnForPlayer(dir) {
      const player = this.state.snakes[this.state.playerIndex];
      if (!player.alive) return; if (isReverse(player.dir, dir)) return; player.nextDir = dir;
    }
    updateAIIntents(willMove) {
      for (let i = 0; i < this.state.snakes.length; i++) {
        if (i === this.state.playerIndex) continue;
        const sn = this.state.snakes[i]; if (!sn.alive) continue;
        if (!willMove[i]) continue;
        const dir = this.ai.plan(this.state, sn);
        if (dir !== null && !isReverse(sn.dir, dir)) sn.nextDir = dir;
      }
    }
    tick(dtMs) {
      if (!this.state.running || this.state.over) return;
      const tickHz = this.tunedTickHz(), stepMs = 1000 / tickHz;
      this.accumulator += dtMs; if (this.accumulator < stepMs) return; this.accumulator -= stepMs;

      // Determine which snakes move this tick based on per-snake speed
      const willMove = new Array(this.state.snakes.length).fill(false);
      for (let i = 0; i < this.state.snakes.length; i++) {
        const sn = this.state.snakes[i];
        if (!sn.alive) continue;
        sn.moveAccum += sn.speed;
        if (sn.moveAccum >= 1) {
          willMove[i] = true;
          sn.moveAccum -= 1;
        }
      }

      // Plan AI only for snakes that are moving this tick
      this.updateAIIntents(willMove);

      // Apply input for snakes that will move
      for (let i = 0; i < this.state.snakes.length; i++) {
        const sn = this.state.snakes[i];
        if (!sn.alive) continue;
        if (!willMove[i]) continue;
        if (sn.nextDir !== null && !isReverse(sn.dir, sn.nextDir)) sn.dir = sn.nextDir;
        sn.nextDir = null;
      }

      const nextHeads = this.state.snakes.map((sn, i) => (sn.alive && willMove[i]) ? addCell(sn.body[0], DIR_VECS[sn.dir]) : null);
      const conflicts = new Map();
      for (let i = 0; i < nextHeads.length; i++) {
        const n = nextHeads[i]; if (!n) continue;
        const key = cellKey(n); const arr = conflicts.get(key); if (arr) arr.push(i); else conflicts.set(key, [i]);
      }
      const dead = new Set();
      for (const [key, arr] of conflicts.entries()) {
        if (arr.length <= 1) continue;
        let maxLen = -1, winners = [];
        for (const idx of arr) {
          const len = this.state.snakes[idx].body.length;
          if (len > maxLen) { maxLen = len; winners = [idx]; }
          else if (len === maxLen) winners.push(idx);
        }
        if (winners.length > 1) { for (const idx of arr) dead.add(idx); }
        else { const winner = winners[0]; for (const idx of arr) if (idx !== winner) dead.add(idx); }
      }

      // Tail-collision rule: hitting another snake's tail is fatal (even if that tail would vacate)
      const tails = this.state.snakes.map((sn) => sn.alive ? sn.body[sn.body.length - 1] : null);
      for (let i = 0; i < this.state.snakes.length; i++) {
        const target = nextHeads[i];
        if (!target) continue;
        if (dead.has(i)) continue;
        for (let j = 0; j < this.state.snakes.length; j++) {
          if (j === i) continue;
          const t = tails[j];
          if (!t) continue;
          if (cellEquals(t, target)) { dead.add(i); break; }
        }
      }

      for (let i = 0; i < this.state.snakes.length; i++) {
        const sn = this.state.snakes[i]; if (!sn.alive || dead.has(i)) continue;
        const target = nextHeads[i];
        if (!target) continue;
        const foodIndex = this.state.foods.findIndex((f) => cellEquals(f, target));
        if (foodIndex !== -1) { this.state.foods.splice(foodIndex, 1); this.state.score += 10; sn.grewThisTick = true; playSound("eat"); }
        else sn.grewThisTick = false;
        sn.body.unshift(target); if (!sn.grewThisTick) sn.body.pop();
      }
      const occupied = new Set();
      for (let i = 0; i < this.state.snakes.length; i++) {
        const sn = this.state.snakes[i]; if (!sn.alive || dead.has(i)) continue;
        for (let si = 0; si < sn.body.length; si++) occupied.add(cellKey(sn.body[si]));
      }
      for (let i = 0; i < this.state.snakes.length; i++) {
        const sn = this.state.snakes[i]; if (!sn.alive || dead.has(i)) continue;
        const head = sn.body[0];
        if (!inBounds(head, this.state.config.gridWidth, this.state.config.gridHeight)) { dead.add(i); continue; }
        const key = cellKey(head); occupied.delete(key); if (occupied.has(key)) dead.add(i); occupied.add(key);
      }
      for (const idx of dead) {
        const sn = this.state.snakes[idx];
        sn.alive = false;
        if (idx !== this.state.playerIndex) {
          sn.respawnAtTick = this.state.time.ticks + 20;
        }
        playSound("death");
      }
      refillFood(this.state);
      this.state.time.ticks++; this.state.time.elapsedMs += stepMs;

      // Process AI respawns
      for (let i = 0; i < this.state.snakes.length; i++) {
        if (i === this.state.playerIndex) continue;
        const sn = this.state.snakes[i];
        if (sn.alive) continue;
        if (sn.respawnAtTick != null && this.state.time.ticks >= sn.respawnAtTick) {
          const ok = respawnSnake(this.state, sn, 3);
          if (!ok) sn.respawnAtTick = this.state.time.ticks + 10;
        }
      }

      const player = this.state.snakes[this.state.playerIndex];
      if (!player.alive) { this.state.over = true; this.state.running = false; }
    }
    tunedTickHz() {
      const base = this.state.config.startTickHz, max = this.state.config.maxTickHz;
      const bonus = Math.min(max - base, Math.floor(this.state.score / 100));
      return base + bonus;
    }
  }

  function $(id) { const el = document.getElementById(id); if (!el) throw new Error("Missing element: " + id); return el; }
  function setupUI() {
    return {
      title: $("title-overlay"), pause: $("pause-overlay"), results: $("results-overlay"), hud: $("hud"),
      scoreEl: $("hud-score"), lengthEl: $("hud-length"), timeEl: $("hud-time"), bestEl: $("hud-best"),
      resultsText: $("results-text"), playBtn: $("play-btn"), resumeBtn: $("resume-btn"),
      restartBtn: $("restart-btn"), toTitleBtn: $("to-title-btn"), restart2Btn: $("restart2-btn"),
      title2Btn: $("title2-btn"), gridSel: $("grid-size"), aiSel: $("ai-count"),
    };
  }
  function randomSeed() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

  let game = null, ctx = null, canvasInfo = null, lastTime = 0;

  function startGame(ui) {
    const settings = { gridSize: ui.gridSel.value, aiCount: parseInt(ui.aiSel.value, 10) };
    saveSettings(settings);
    const dims = gridSizeToDims(settings.gridSize);
    game = new Game(randomSeed(), { width: dims.w, height: dims.h, aiCount: settings.aiCount });
    game.setBestScore(loadBestScore());
    canvasInfo = resizeCanvasForGrid(document.getElementById("game"), ctx, game.state.config.gridWidth, game.state.config.gridHeight);
    ui.title.classList.add("hidden"); ui.results.classList.add("hidden"); ui.pause.classList.add("hidden"); ui.hud.classList.remove("hidden");
    initAudio(); playSound("ui"); lastTime = 0;
  }
  function toTitle(ui) {
    ui.title.classList.remove("hidden"); ui.results.classList.add("hidden"); ui.pause.classList.add("hidden"); ui.hud.classList.add("hidden");
    const s = loadSettings(); ui.gridSel.value = s.gridSize; ui.aiSel.value = String(s.aiCount); game = null; playSound("ui");
  }
  function setupEventHandlers(ui) {
    ui.playBtn.onclick = () => startGame(ui);
    ui.resumeBtn.onclick = () => { if (game && !game.state.over) { game.togglePause(); ui.pause.classList.add("hidden"); } };
    ui.restartBtn.onclick = () => { if (game) { const s = loadSettings(); ui.gridSel.value = s.gridSize; ui.aiSel.value = String(s.aiCount); startGame(ui); } };
    ui.toTitleBtn.onclick = () => toTitle(ui);
    ui.restart2Btn.onclick = () => { if (game) { const s = loadSettings(); ui.gridSel.value = s.gridSize; ui.aiSel.value = String(s.aiCount); startGame(ui); } };
    ui.title2Btn.onclick = () => toTitle(ui);
    attachKeyboard({
      onDir: (dir) => { if (!game) return; game.requestTurnForPlayer(dir); },
      onPause: () => { if (!game || game.state.over) return; game.togglePause(); ui.pause.classList.toggle("hidden", !game.state.paused); }
    });
    const canvas = document.getElementById("game");
    attachTouch(canvas, (dir) => { if (!game) return; game.requestTurnForPlayer(dir); });
    window.addEventListener("resize", () => {
      if (!game) return;
      canvasInfo = resizeCanvasForGrid(canvas, ctx, game.state.config.gridWidth, game.state.config.gridHeight);
    });
  }
  function updateHUD(ui) {
    if (!game) return;
    const player = game.state.snakes[game.state.playerIndex];
    ui.scoreEl.textContent = `Score: ${game.state.score}`;
    ui.lengthEl.textContent = `Length: ${player.body.length}`;
    ui.timeEl.textContent = `Time: ${(game.state.time.elapsedMs / 1000).toFixed(1)}s`;
    ui.bestEl.textContent = `Best: ${game.state.bestScore}`;
  }
  function loop(ui, t) {
    requestAnimationFrame((now) => loop(ui, now));
    if (!game) return;
    const dt = lastTime ? (t - lastTime) : 16.67; lastTime = t;
    game.tick(dt);
    updateHUD(ui);
    drawGame(ctx, game.state, canvasInfo);
    if (game.state.over) {
      if (!ui.results.classList.contains("hidden")) return;
      saveBestScore(game.state.score);
      game.setBestScore(loadBestScore());
      ui.resultsText.innerHTML = `Score: <b>${game.state.score}</b><br/>Length: <b>${game.state.snakes[game.state.playerIndex].body.length}</b><br/>Time: <b>${(game.state.time.elapsedMs / 1000).toFixed(1)}s</b><br/>Seed: <b>${game.state.seed}</b>`;
      ui.results.classList.remove("hidden");
    }
  }
  function main() {
    const canvas = document.getElementById("game"); ctx = setupCanvas(canvas);
    const ui = setupUI(); setupEventHandlers(ui);
    const s = loadSettings(); ui.gridSel.value = s.gridSize; ui.aiSel.value = String(s.aiCount);
    requestAnimationFrame((now) => loop(ui, now));
  }
  main();
})();