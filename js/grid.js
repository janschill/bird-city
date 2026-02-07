/**
 * Grid model for Bird City.
 * 7 cols x 10 rows. Terrain: empty, rock, tree, river.
 *
 * Placement rule: tiles must touch the river or an existing building.
 * River cells are non-buildable.
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
 */
export function createGrid(rng) {
  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      terrain: TERRAIN.EMPTY,
      building: null,
    }))
  );

  // Place river (meanders top to bottom, 1 cell wide)
  placeRiver(grid, rng);

  // Place rocks (8-10), avoiding river
  const numRocks = 8 + Math.floor(rng() * 3);
  placeFeatures(grid, TERRAIN.ROCK, numRocks, rng);

  // Place trees (4-6), avoiding river and rocks
  const numTrees = 4 + Math.floor(rng() * 3);
  placeFeatures(grid, TERRAIN.TREE, numTrees, rng);

  return grid;
}

function placeRiver(grid, rng) {
  let col = 2 + Math.floor(rng() * 3); // start col 2-4
  for (let row = 0; row < ROWS; row++) {
    grid[row][col].terrain = TERRAIN.RIVER;
    const drift = Math.floor(rng() * 3) - 1; // -1, 0, +1
    col = Math.max(1, Math.min(COLS - 2, col + drift));
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
 * Check if a tile can be placed at anchor [ar, ac].
 *
 * Rules:
 * - All cells must be in bounds
 * - No cell can overlap an existing building
 * - No cell can be on a river
 * - First tile: must be adjacent to the river
 * - Subsequent tiles: must be adjacent to an existing building
 */
export function canPlace(grid, shape, ar, ac) {
  const hasBuildings = gridHasBuildings(grid);
  let touchesRiver = false;
  let touchesBuilding = false;

  for (const [dr, dc] of shape) {
    const r = ar + dr;
    const c = ac + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    if (grid[r][c].building !== null) return false;
    if (grid[r][c].terrain === TERRAIN.RIVER) return false;

    for (const [nr, nc] of neighbors(r, c)) {
      if (grid[nr][nc].terrain === TERRAIN.RIVER) touchesRiver = true;
      if (grid[nr][nc].building !== null) touchesBuilding = true;
    }
  }

  return hasBuildings ? touchesBuilding : touchesRiver;
}

function gridHasBuildings(grid) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].building !== null) return true;
    }
  }
  return false;
}

/**
 * Place a tile on the grid. Mutates grid.
 */
export function placeTile(grid, shape, ar, ac, color) {
  const cells = [];
  for (const [dr, dc] of shape) {
    const r = ar + dr;
    const c = ac + dc;
    grid[r][c].building = color;
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
