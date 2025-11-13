export type Settings = {
  gridSize: "S" | "M" | "L";
  aiCount: number;
};

const BEST_KEY = "snake_arena_best_score";
const SETTINGS_KEY = "snake_arena_settings";

export function loadBestScore(): number {
  const v = localStorage.getItem(BEST_KEY);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function saveBestScore(score: number) {
  const best = loadBestScore();
  if (score > best) {
    localStorage.setItem(BEST_KEY, String(score));
  }
}

export function loadSettings(): Settings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { gridSize: "M", aiCount: 2 };
  try {
    const s = JSON.parse(raw) as Settings;
    if (!s || (s.gridSize !== "S" && s.gridSize !== "M" && s.gridSize !== "L")) {
      return { gridSize: "M", aiCount: 2 };
    }
    const ai = Math.max(1, Math.min(3, Math.floor(s.aiCount || 2)));
    return { gridSize: s.gridSize, aiCount: ai };
  } catch {
    return { gridSize: "M", aiCount: 2 };
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function gridSizeToDims(gs: Settings["gridSize"]): { w: number; h: number } {
  if (gs === "S") return { w: 24, h: 24 };
  if (gs === "L") return { w: 40, h: 40 };
  return { w: 32, h: 32 };
}