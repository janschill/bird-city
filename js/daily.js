/**
 * Daily puzzle generation using a seeded PRNG.
 */

import { SHAPE_KEYS, COLORS, getShape } from './tiles.js';

const TILES_PER_GAME = 22;

/**
 * Puzzle number (days since epoch).
 */
export function getPuzzleNumber() {
  const epoch = new Date('2025-01-01').getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.floor((today - epoch) / (1000 * 60 * 60 * 24));
}

/**
 * Seeded PRNG (mulberry32).
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
 * Each tile gets a random shape and random color.
 */
export function generateTileSequence(puzzleNumber) {
  const rng = createRNG(puzzleNumber * 31337);

  const tiles = [];
  for (let i = 0; i < TILES_PER_GAME; i++) {
    const shapeKey = SHAPE_KEYS[Math.floor(rng() * SHAPE_KEYS.length)];
    const color = COLORS[Math.floor(rng() * COLORS.length)];
    tiles.push({
      shape: getShape(shapeKey),
      type: color,
    });
  }

  return tiles;
}

/**
 * Separate RNG for grid terrain.
 */
export function createGridRNG(puzzleNumber) {
  return createRNG(puzzleNumber * 7919 + 42);
}
