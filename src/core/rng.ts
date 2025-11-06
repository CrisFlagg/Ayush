/**
 * Deterministic PRNG seeded from string.
 * Uses xmur3 to hash seed string, then mulberry32 for PRNG.
 */
function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
  h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
  h = (h << 13) | (h >>> 19);
}
  return h >>> 0;
}

export function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFromSeed(seed: string): () => number {
  return mulberry32(xmur3(seed));
}

export function randInt(rng: () => number, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

export function choice<T>(rng: () => number, arr: T[]): T {
  return arr[randInt(rng, arr.length)];
}