// js/utils/rng.js

// RNG interface: { nextFloat(): number } -> [0, 1)

function normalizeSeed(seed) {
  if (!Number.isFinite(seed)) return 0;
  return seed >>> 0;
}

// Simple 32-bit LCG for deterministic, seedable randomness.
export function createSeededRng(seed = 0) {
  let state = normalizeSeed(seed);
  return {
    nextFloat() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    }
  };
}

// Runtime RNG backed by Math.random.
export const systemRng = {
  nextFloat() {
    return Math.random();
  }
};

export function resolveRng(rng) {
  if (rng && typeof rng.nextFloat === "function") return rng;
  return systemRng;
}
