/**
 * Grid model for Bird City.
 * 8 cols x 11 rows. Terrain: empty, rock, tree, river, church.
 *
 * Placement rule: tiles must touch the river or an existing building.
 * River and church cells are non-buildable.
 */

export const COLS = 8;
export const ROWS = 11;

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

  // Place rocks (6-9), avoiding river
  const numRocks = 6 + Math.floor(rng() * 4);
  placeFeatures(grid, TERRAIN.ROCK, numRocks, rng);

  // Place trees (6-9), avoiding river and rocks
  const numTrees = 6 + Math.floor(rng() * 4);
  placeFeatures(grid, TERRAIN.TREE, numTrees, rng);

  // Place church (3-4 cells, shape varies per puzzle)
  placeChurch(grid, rng);

  return grid;
}

function placeRiver(grid, rng) {
  // 40% chance of a diagonal river that exits from a side
  const diagonal = rng() < 0.4;

  if (diagonal) {
    // Diagonal river: starts at the top, drifts toward one side, exits left or right
    const exitLeft = rng() < 0.5;
    let col = exitLeft
      ? 3 + Math.floor(rng() * (COLS - 4)) // start right-ish
      : Math.floor(rng() * (COLS - 3));     // start left-ish
    const bias = exitLeft ? -1 : 1; // drift direction

    for (let row = 0; row < ROWS; row++) {
      grid[row][col].terrain = TERRAIN.RIVER;
      // Biased drift: 60% toward exit side, 20% straight, 20% away
      const roll = rng();
      const drift = roll < 0.6 ? bias : roll < 0.8 ? 0 : -bias;
      col = Math.max(0, Math.min(COLS - 1, col + drift));
      // If we've reached the edge, stop early (river exits the side)
      if (col === 0 || col === COLS - 1) {
        grid[row + 1 < ROWS ? row + 1 : row][col].terrain = TERRAIN.RIVER;
        break;
      }
    }
  } else {
    // Classic top-to-bottom river
    let col = 2 + Math.floor(rng() * (COLS - 3)); // start col 2 to COLS-2
    for (let row = 0; row < ROWS; row++) {
      grid[row][col].terrain = TERRAIN.RIVER;
      const drift = Math.floor(rng() * 3) - 1; // -1, 0, +1
      col = Math.max(1, Math.min(COLS - 2, col + drift));
    }
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

// 6 church shape variants (3-4 cells), randomly selected per puzzle.
const CHURCH_SHAPES = [
  // Straight 3
  [[0, 0], [1, 0], [2, 0]],
  // Straight 3 horizontal
  [[0, 0], [0, 1], [0, 2]],
  // L-shape (3 cells)
  [[0, 0], [1, 0], [1, 1]],
  // T-shape (4 cells)
  [[0, 0], [-1, 0], [1, 0], [0, 1]],
  // Small L (4 cells)
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  // Square (4 cells)
  [[0, 0], [0, 1], [1, 0], [1, 1]],
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
