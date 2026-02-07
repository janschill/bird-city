/**
 * Grid model for Bird City.
 *
 * Grid is 7 cols x 10 rows.
 * Each cell has a terrain type and optionally a building.
 */

export const COLS = 7;
export const ROWS = 10;

export const TERRAIN = {
  EMPTY: 'empty',
  ROCK: 'rock',
  TREE: 'tree',
  RIVER: 'river',
};

/**
 * Create a fresh grid with terrain features.
 * Terrain is deterministic per daily seed (passed via the RNG).
 */
export function createGrid(rng) {
  // Initialize all empty
  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      terrain: TERRAIN.EMPTY,
      building: null,
    }))
  );

  // Place river -- flows roughly down the grid through col 4-5
  placeRiver(grid, rng);

  // Place rocks (5-7)
  const numRocks = 5 + Math.floor(rng() * 3);
  placeFeatures(grid, TERRAIN.ROCK, numRocks, rng);

  // Place trees (4-6)
  const numTrees = 4 + Math.floor(rng() * 3);
  placeFeatures(grid, TERRAIN.TREE, numTrees, rng);

  return grid;
}

function placeRiver(grid, rng) {
  // River flows top to bottom, meandering around col 4-5
  let col = 3 + Math.floor(rng() * 2); // start at col 3 or 4
  for (let row = 0; row < ROWS; row++) {
    grid[row][col].terrain = TERRAIN.RIVER;
    // Meander
    const drift = Math.floor(rng() * 3) - 1; // -1, 0, or 1
    col = Math.max(2, Math.min(COLS - 2, col + drift));
  }
}

function placeFeatures(grid, terrain, count, rng) {
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < 100) {
    const r = Math.floor(rng() * ROWS);
    const c = Math.floor(rng() * COLS);
    if (grid[r][c].terrain === TERRAIN.EMPTY) {
      grid[r][c].terrain = terrain;
      placed++;
    }
    attempts++;
  }
}

/**
 * Check if a tile (array of [row, col] offsets) can be placed at anchor [ar, ac].
 */
export function canPlace(grid, shape, ar, ac) {
  for (const [dr, dc] of shape) {
    const r = ar + dr;
    const c = ac + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    if (grid[r][c].building !== null) return false;
  }
  return true;
}

/**
 * Place a tile on the grid. Mutates grid. Returns the placed cells.
 */
export function placeTile(grid, shape, ar, ac, buildingType) {
  const cells = [];
  for (const [dr, dc] of shape) {
    const r = ar + dr;
    const c = ac + dc;
    grid[r][c].building = buildingType;
    cells.push([r, c]);
  }
  return cells;
}

/**
 * Get 4-directional neighbors of a cell.
 */
export function neighbors(r, c) {
  const n = [];
  if (r > 0) n.push([r - 1, c]);
  if (r < ROWS - 1) n.push([r + 1, c]);
  if (c > 0) n.push([r, c - 1]);
  if (c < COLS - 1) n.push([r, c + 1]);
  return n;
}
