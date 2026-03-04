import test from 'node:test';
import assert from 'node:assert/strict';

import { createSeededRng } from '../js/utils/rng.js';
import { randomFromArray, shuffle, createBag } from '../js/utils/random.js';

test('seeded RNG yields deterministic sequences for random helpers', () => {
  const seed = 1337;

  const rngA = createSeededRng(seed);
  const rngB = createSeededRng(seed);

  const picksA = Array.from({ length: 8 }, () => randomFromArray(['a', 'b', 'c', 'd'], rngA));
  const picksB = Array.from({ length: 8 }, () => randomFromArray(['a', 'b', 'c', 'd'], rngB));

  assert.deepEqual(picksA, picksB);

  const shuffledA = shuffle([1, 2, 3, 4, 5, 6, 7, 8], createSeededRng(seed));
  const shuffledB = shuffle([1, 2, 3, 4, 5, 6, 7, 8], createSeededRng(seed));
  assert.deepEqual(shuffledA, shuffledB);

  const bagA = createBag(['x', 'y', 'z', 'w'], createSeededRng(seed));
  const bagB = createBag(['x', 'y', 'z', 'w'], createSeededRng(seed));
  const seqA = Array.from({ length: 8 }, () => bagA.next());
  const seqB = Array.from({ length: 8 }, () => bagB.next());
  assert.deepEqual(seqA, seqB);
});
