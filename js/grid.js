/**
 * Grid model for Bird City.
 * 7 cols x 10 rows. Terrain: empty, rock, tree, river, church.
 *
 * Placement rule: tiles must touch the river or an existing building.
 * River and church cells are non-buildable.
 */

export const COLS = 7;
export const ROWS = 10;

export const TERRAIN = {
  EMPTY: 'empty',
  ROCK: 'rock',
  TREE: 'tree',
  RIVER: 'river',
  CHURCH: 'church',
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

  // Place rocks (5-7), avoiding river
  const numRocks = 5 + Math.floor(rng() * 3);
  placeFeatures(grid, TERRAIN.ROCK, numRocks, rng);

  // Place trees (5-7), avoiding river and rocks
  const numTrees = 5 + Math.floor(rng() * 3);
  placeFeatures(grid, TERRAIN.TREE, numTrees, rng);

  // Place church (5 cells, shape varies per puzzle)
  placeChurch(grid, rng);

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

// 4 church shape variants (each 5 cells), randomly selected per puzzle.
const CHURCH_SHAPES = [
  // Cross / plus sign
  [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]],
  // T-shape (pointing up)
  [[0, 0], [0, -1], [0, 1], [-1, 0], [-2, 0]],
  // L-shape (large)
  [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]],
  // Z-shape / staircase
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
];

function placeChurch(grid, rng) {
  const shape = CHURCH_SHAPES[Math.floor(rng() * CHURCH_SHAPES.length)];

  // Compute the margin needed so all offsets stay in bounds
  const minDR = Math.min(...shape.map(([dr]) => dr));
  const maxDR = Math.max(...shape.map(([dr]) => dr));
  const minDC = Math.min(...shape.map(([, dc]) => dc));
  const maxDC = Math.max(...shape.map(([, dc]) => dc));

  const rMin = -minDR;
  const rMax = ROWS - 1 - maxDR;
  const cMin = -minDC;
  const cMax = COLS - 1 - maxDC;

  for (let attempt = 0; attempt < 100; attempt++) {
    const r = rMin + Math.floor(rng() * (rMax - rMin + 1));
    const c = cMin + Math.floor(rng() * (cMax - cMin + 1));
    if (shape.every(([dr, dc]) => grid[r + dr][c + dc].terrain === TERRAIN.EMPTY)) {
      for (const [dr, dc] of shape) {
        grid[r + dr][c + dc].terrain = TERRAIN.CHURCH;
      }
      return;
    }
  }
}

/**
 * Check whether the church is "connected" -- i.e. at least one
 * building is orthogonally adjacent to any church cell.
 */
function churchIsConnected(grid) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].terrain === TERRAIN.CHURCH) {
        for (const [nr, nc] of neighbors(r, c)) {
          if (grid[nr][nc].building !== null) return true;
        }
      }
    }
  }
  return false;
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
 * - Once any building touches the church, the church counts as a
 *   building for adjacency (you can build off any side of it).
 */
export function canPlace(grid, shape, ar, ac) {
  const hasBuildings = gridHasBuildings(grid);
  const churchConnected = churchIsConnected(grid);
  let touchesRiver = false;
  let touchesBuilding = false;

  for (const [dr, dc] of shape) {
    const r = ar + dr;
    const c = ac + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    if (grid[r][c].building !== null) return false;
    if (grid[r][c].terrain === TERRAIN.RIVER) return false;
    if (grid[r][c].terrain === TERRAIN.CHURCH) return false;

    for (const [nr, nc] of neighbors(r, c)) {
      if (grid[nr][nc].building !== null) touchesBuilding = true;
      if (churchConnected && grid[nr][nc].terrain === TERRAIN.CHURCH) {
        touchesBuilding = true;
      }
      if (grid[nr][nc].terrain === TERRAIN.RIVER) {
        touchesRiver = true;
        // Check across the river for buildings (bridge rule)
        for (const [nnr, nnc] of neighbors(nr, nc)) {
          if (grid[nnr][nnc].building !== null) touchesBuilding = true;
        }
      }
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
