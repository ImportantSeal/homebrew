import { resolveRng } from '../utils/rng.js';

export function clampInt(n, min, max, fallback) {
  const x = Number.parseInt(String(n), 10);
  if (Number.isNaN(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

export function randomDieValues(sides, qty, rng) {
  const activeRng = resolveRng(rng);
  return Array.from({ length: qty }, () => Math.floor(activeRng.nextFloat() * sides) + 1);
}

export function formatSignedInt(value) {
  const n = Number(value) || 0;
  if (n > 0) return `+${n}`;
  return String(n);
}

export function formatNotation(qty, sides, modifier = 0) {
  const mod = Number(modifier) || 0;
  const base = `${qty}d${sides}`;
  if (mod === 0) return base;
  return `${base}${formatSignedInt(mod)}`;
}

function extractRollArray(dieResults) {
  if (Array.isArray(dieResults)) return dieResults;
  if (Array.isArray(dieResults?.rolls)) return dieResults.rolls;
  if (Array.isArray(dieResults?.results)) return dieResults.results;
  if (Array.isArray(dieResults?.dice)) return dieResults.dice;
  return [];
}

export function parseDieResults(dieResults, sides) {
  const rolls = extractRollArray(dieResults);

  return rolls
    .map((r) => {
      const raw = r && (r.value ?? r.result ?? r.roll ?? r.face);
      const numericRaw = (raw && typeof raw === 'object') ? (raw.value ?? raw.result ?? raw.roll) : raw;
      const value = Number(numericRaw);
      if (!Number.isInteger(value)) return null;
      // Many dice libs encode d10 "10" as 0.
      if (sides === 10 && value === 0) return 10;
      if (value < 1 || value > sides) return null;
      return value;
    })
    .filter((v) => v !== null);
}

export function currentPlayerName(state) {
  const p = state.players?.[state.currentPlayerIndex];
  return p?.name || 'Someone';
}
