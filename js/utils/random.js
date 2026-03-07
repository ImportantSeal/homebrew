// homebrew/js/utils/random.js
import { resolveRng, systemRng } from './rng.js';

function normalizeNextFloat(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

function randomIndex(length, rng = systemRng) {
  if (!Number.isInteger(length) || length <= 0) return -1;
  const activeRng = resolveRng(rng);
  return Math.floor(normalizeNextFloat(activeRng.nextFloat()) * length);
}

export function randomFromArray(arr, rng = systemRng) {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  const idx = randomIndex(arr.length, rng);
  if (idx < 0) return undefined;
  return arr[idx];
}

// Fisher–Yates shuffle (returns a NEW shuffled copy)
export function shuffle(arr, rng = systemRng) {
  const activeRng = resolveRng(rng);
  const a = (Array.isArray(arr) ? arr : []).slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, activeRng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shuffle-bag / "deck" style random:
 * - Shuffles the whole list, then returns items one-by-one without replacement.
 * - When empty, reshuffles and continues.
 * - Avoids immediate repeats across bag boundaries when possible.
 */
export function createBag(items, rng = systemRng) {
  const activeRng = resolveRng(rng);
  const source = (Array.isArray(items) ? items : []).slice();
  let bag = shuffle(source, activeRng);
  let last = null;

  function refill() {
    bag = shuffle(source, activeRng);
	
    // Avoid immediate repeat across refill boundary if possible
    if (bag.length > 1 && last != null) {
      const lastName = getComparableKey(last);
      if (getComparableKey(bag[bag.length - 1]) === lastName) {
        // swap last element with some other element
        const swapIndex = randomIndex(bag.length - 1, activeRng);
        const tmp = bag[bag.length - 1];
        bag[bag.length - 1] = bag[swapIndex];
        bag[swapIndex] = tmp;
      }
    }
  }

  function next() {
    if (source.length === 0) return undefined;
    if (bag.length === 0) refill();

    let picked = bag.pop();

    // Extra guard: if we somehow still repeat immediately, try once more
    if (bag.length > 0 && last != null) {
      const lastKey = getComparableKey(last);
      const pickedKey = getComparableKey(picked);
      if (pickedKey === lastKey) {
        // take one more and put this back
        bag.unshift(picked);
        picked = bag.pop();
      }
    }

    last = picked;
    return picked;
  }

  function reset() {
    bag = shuffle(source, activeRng);
    last = null;
  }

  return { next, reset };
}

// Internal helper: compare objects/strings consistently
function getComparableKey(v) {
  if (v && typeof v === "object") {
    // subcategory objects have name; fallback to JSON-ish
    return String(v.id ?? v.name ?? v.label ?? v.instruction ?? JSON.stringify(v));
  }
  return String(v);
}
