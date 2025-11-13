type SoundName = "eat" | "death" | "ui";

let ctx: AudioContext | null = null;

export function initAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      ctx = null;
    }
  }
}

function beep(freq: number, duration: number, type: OscillatorType = "square", gain = 0.05) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playSound(name: SoundName) {
  if (!ctx) return;
  switch (name) {
    case "eat":
      beep(660, 0.05, "square", 0.06);
      break;
    case "death":
      beep(110, 0.25, "square", 0.08);
      break;
    case "ui":
      beep(440, 0.05, "square", 0.05);
      break;
  }
}