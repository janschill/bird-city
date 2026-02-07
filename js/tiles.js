/**
 * Tile definitions for Bird City.
 *
 * 7 fixed shapes, 3 colors. Each tile in a game
 * gets a shape + color assigned by the daily RNG.
 */

export const COLORS = ['rust', 'sand', 'sage'];

// The 7 shapes from the game design, as [row, col] offsets.
const SHAPES = {
  // ▪▪ (2 cells)
  domino: [[0,0],[0,1]],

  // ▪▪▪▪ (4 cells, I-bar)
  bar: [[0,0],[0,1],[0,2],[0,3]],

  //  ▪
  // ▪▪▪ (4 cells, J-shape)
  jay: [[0,0],[1,0],[1,1],[1,2]],

  // ▪
  // ▪▪
  // ▪  (4 cells, T-rotated)
  tee: [[0,0],[1,0],[1,1],[2,0]],

  // ▪▪
  //  ▪▪ (4 cells, S-shape)
  ess: [[0,0],[0,1],[1,1],[1,2]],

  // ▪▪
  // ▪▪ (4 cells, square)
  square: [[0,0],[0,1],[1,0],[1,1]],

  // ▪▪
  // ▪  (3 cells, small L)
  ell: [[0,0],[0,1],[1,0]],
};

export const SHAPE_KEYS = Object.keys(SHAPES);

export function getShape(key) {
  return SHAPES[key].map(([r, c]) => [r, c]);
}

export function rotateShape(cells) {
  const rotated = cells.map(([r, c]) => [c, -r]);
  return normalize(rotated);
}

export function flipShape(cells) {
  const flipped = cells.map(([r, c]) => [r, -c]);
  return normalize(flipped);
}

function normalize(cells) {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  const shifted = cells.map(([r, c]) => [r - minR, c - minC]);
  shifted.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return shifted;
}

export function shapeBounds(cells) {
  const maxR = Math.max(...cells.map(([r]) => r));
  const maxC = Math.max(...cells.map(([, c]) => c));
  return { rows: maxR + 1, cols: maxC + 1 };
}
