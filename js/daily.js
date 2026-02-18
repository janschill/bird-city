/**
 * Daily puzzle generation using a seeded PRNG.
 */

import { SHAPE_KEYS, COLORS, getShape } from './tiles.js';
import { ROWS, COLS, TERRAIN, createGrid } from './grid.js';

/**
 * Read the board variant from the URL (?board=2, etc). Default is 1.
 */
export function getBoardVariant() {
  const params = new URLSearchParams(window.location.search);
  const v = parseInt(params.get('board'), 10);
  return v > 1 ? v : 1;
}

/**
 * Puzzle number (days since epoch), offset by board variant.
 */
export function getPuzzleNumber(variant) {
  if (variant === undefined) variant = getBoardVariant();
  const epoch = new Date('2025-01-01').getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayNumber = Math.floor((today - epoch) / (1000 * 60 * 60 * 24));
  if (variant <= 1) return dayNumber;
  return dayNumber + variant * 100000;
}

/**
 * The base day number (no variant offset), for display purposes.
 */
export function getDayNumber() {
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
 *
 * Uses a budget-based approach: count the buildable cells on the board,
 * then generate random tiles until their total cell count covers ~90-100%
 * of the buildable area. This ensures players always get enough tiles
 * to achieve good coverage, while the random coverage ratio keeps it
 * from being perfectly predictable.
 */
export function generateTileSequence(puzzleNumber) {
  const rng = createRNG(puzzleNumber * 31337);

  // Simulate the board to count buildable (non-river) cells
  const gridRNG = createRNG(puzzleNumber * 7919 + 42);
  const tempGrid = createGrid(gridRNG);
  let buildable = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (tempGrid[r][c].terrain !== TERRAIN.RIVER) buildable++;
    }
  }

  // Target: cover 90-100% of buildable area (randomized per puzzle)
  const coverageRatio = 0.90 + rng() * 0.10;
  const targetCells = Math.round(buildable * coverageRatio);

  const tiles = [];
  let totalCells = 0;

  while (totalCells < targetCells && tiles.length < 25) {
    const shapeKey = SHAPE_KEYS[Math.floor(rng() * SHAPE_KEYS.length)];
    const color = COLORS[Math.floor(rng() * COLORS.length)];
    const shape = getShape(shapeKey);
    tiles.push({ shapeKey, shape, type: color });
    totalCells += shape.length;
  }

  return tiles;
}

/**
 * Separate RNG for grid terrain.
 */
export function createGridRNG(puzzleNumber) {
  return createRNG(puzzleNumber * 7919 + 42);
}
