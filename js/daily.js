/**
 * Daily puzzle generation using a seeded PRNG.
 * All players get the same puzzle for the same date.
 */

import { TILE_POOL, getShape } from './tiles.js';

const TILES_PER_GAME = 22;

/**
 * Get puzzle number (days since epoch).
 */
export function getPuzzleNumber() {
  const epoch = new Date('2025-01-01').getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.floor((today - epoch) / (1000 * 60 * 60 * 24));
}

/**
 * Get a date string for display.
 */
export function getPuzzleDate() {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Create a seeded PRNG (mulberry32).
 */
export function createRNG(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate the daily tile sequence.
 * Returns array of { shape: [[r,c]...], type: string }
 */
export function generateTileSequence(puzzleNumber) {
  const rng = createRNG(puzzleNumber * 31337);

  const tiles = [];
  for (let i = 0; i < TILES_PER_GAME; i++) {
    const poolIndex = Math.floor(rng() * TILE_POOL.length);
    const entry = TILE_POOL[poolIndex];
    tiles.push({
      shape: getShape(entry.shape),
      type: entry.type,
    });
  }

  return tiles;
}

/**
 * Generate the daily grid RNG (separate seed from tile sequence).
 */
export function createGridRNG(puzzleNumber) {
  return createRNG(puzzleNumber * 7919 + 42);
}
