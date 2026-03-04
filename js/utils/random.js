// homebrew/js/utils/random.js
import { systemRng } from './rng.js';

export function randomFromArray(arr, rng = systemRng) {
  return arr[Math.floor(rng.nextFloat() * arr.length)];
}

// Fisher–Yates shuffle (returns a NEW shuffled copy)
export function shuffle(arr, rng = systemRng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
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
  const source = items.slice();
  let bag = shuffle(source, rng);
  let last = null;

  function refill() {
    bag = shuffle(source, rng);

    // Avoid immediate repeat across refill boundary if possible
    if (bag.length > 1 && last != null) {
      const lastName = getComparableKey(last);
      if (getComparableKey(bag[bag.length - 1]) === lastName) {
        // swap last element with some other element
        const swapIndex = Math.floor(rng.nextFloat() * (bag.length - 1));
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
    bag = shuffle(source, rng);
    last = null;
  }

  return { next, reset };
}

// Internal helper: compare objects/strings consistently
function getComparableKey(v) {
  if (v && typeof v === "object") {
    // subcategory objects have name; fallback to JSON-ish
    return String(v.name ?? v.instruction ?? JSON.stringify(v));
  }
  return String(v);
}
