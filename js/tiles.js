/**
 * Tile definitions and transformation utilities.
 *
 * Each tile is a shape (array of [row, col] offsets from origin)
 * plus a building type.
 */

export const BUILDING_TYPES = ['house', 'park', 'shop', 'factory'];

// Shape definitions as [row, col] offset arrays.
// Origin is always [0, 0] and included in the shape.
const SHAPES = {
  // Dominoes (2 cells)
  d_h: [[0,0],[0,1]],
  d_v: [[0,0],[1,0]],

  // Triominoes (3 cells)
  t_i: [[0,0],[0,1],[0,2]],
  t_l: [[0,0],[1,0],[1,1]],
  t_j: [[0,0],[0,1],[1,0]],

  // Tetrominoes (4 cells)
  tt_i: [[0,0],[0,1],[0,2],[0,3]],
  tt_o: [[0,0],[0,1],[1,0],[1,1]],
  tt_t: [[0,0],[0,1],[0,2],[1,1]],
  tt_s: [[0,0],[0,1],[1,1],[1,2]],
  tt_z: [[0,1],[0,2],[1,0],[1,1]],
  tt_l: [[0,0],[1,0],[2,0],[2,1]],
  tt_j: [[0,1],[1,1],[2,0],[2,1]],

  // Pentominoes (5 cells) -- a few common ones
  p_f: [[0,1],[0,2],[1,0],[1,1],[2,1]],
  p_p: [[0,0],[0,1],[1,0],[1,1],[2,0]],
  p_u: [[0,0],[0,2],[1,0],[1,1],[1,2]],
  p_t: [[0,0],[0,1],[0,2],[1,1],[2,1]],
};

/**
 * The tile pool used by the daily generator.
 * Each entry: { shapeKey, buildingType }
 * The generator picks from this pool using the seeded RNG.
 */
export const TILE_POOL = [
  // Houses -- mostly small-medium shapes
  { shape: 'd_h', type: 'house' },
  { shape: 'd_v', type: 'house' },
  { shape: 't_l', type: 'house' },
  { shape: 't_j', type: 'house' },
  { shape: 'tt_l', type: 'house' },
  { shape: 'tt_j', type: 'house' },
  { shape: 'tt_t', type: 'house' },
  { shape: 'tt_o', type: 'house' },

  // Parks -- small shapes
  { shape: 'd_h', type: 'park' },
  { shape: 'd_v', type: 'park' },
  { shape: 't_i', type: 'park' },
  { shape: 't_l', type: 'park' },

  // Shops -- medium shapes, some big
  { shape: 't_i', type: 'shop' },
  { shape: 't_l', type: 'shop' },
  { shape: 'tt_s', type: 'shop' },
  { shape: 'tt_z', type: 'shop' },
  { shape: 'tt_i', type: 'shop' },
  { shape: 'p_u', type: 'shop' },

  // Factories -- medium-large
  { shape: 'tt_t', type: 'factory' },
  { shape: 'tt_l', type: 'factory' },
  { shape: 'tt_s', type: 'factory' },
  { shape: 'tt_o', type: 'factory' },
  { shape: 'p_f', type: 'factory' },
  { shape: 'p_p', type: 'factory' },
];

/**
 * Get the raw shape offsets for a shape key.
 */
export function getShape(key) {
  return SHAPES[key].map(([r, c]) => [r, c]);
}

/**
 * Rotate a shape 90 degrees clockwise.
 * [r, c] -> [c, -r] then normalize to 0-origin.
 */
export function rotateShape(cells) {
  const rotated = cells.map(([r, c]) => [c, -r]);
  return normalize(rotated);
}

/**
 * Flip a shape horizontally (mirror along vertical axis).
 * [r, c] -> [r, -c] then normalize.
 */
export function flipShape(cells) {
  const flipped = cells.map(([r, c]) => [r, -c]);
  return normalize(flipped);
}

/**
 * Normalize shape so minimum row and col are both 0.
 */
function normalize(cells) {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  const shifted = cells.map(([r, c]) => [r - minR, c - minC]);
  // Sort for consistent ordering
  shifted.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return shifted;
}

/**
 * Get the bounding box of a shape: { rows, cols }
 */
export function shapeBounds(cells) {
  const maxR = Math.max(...cells.map(([r]) => r));
  const maxC = Math.max(...cells.map(([, c]) => c));
  return { rows: maxR + 1, cols: maxC + 1 };
}
