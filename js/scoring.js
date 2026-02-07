/**
 * Scoring engine for Bird City.
 */

import { ROWS, COLS, TERRAIN, neighbors } from './grid.js';

/**
 * Calculate full score breakdown for a finished game.
 * Returns { total, buildings, rows, rocks, skips, details }
 */
export function calculateScore(grid, skippedCount) {
  const details = {
    houseBase: 0,
    houseParkBonus: 0,
    houseFactoryPenalty: 0,
    parkBase: 0,
    parkTreeBonus: 0,
    parkNoHousePenalty: 0,
    shopBase: 0,
    shopRiverBonus: 0,
    shopClusterBonus: 0,
    factoryBase: 0,
    completeRows: 0,
    uncoveredRocks: 0,
    skippedTiles: skippedCount,
  };

  // Scan all cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      const nb = neighbors(r, c);

      if (cell.building === 'house') {
        details.houseBase += 1;
        for (const [nr, nc] of nb) {
          if (grid[nr][nc].building === 'park') details.houseParkBonus += 1;
          if (grid[nr][nc].building === 'factory') details.houseFactoryPenalty += 1;
        }
      }

      if (cell.building === 'park') {
        // Parks only score if adjacent to at least one house
        const adjHouse = nb.some(([nr, nc]) => grid[nr][nc].building === 'house');
        if (adjHouse) {
          details.parkBase += 2;
          for (const [nr, nc] of nb) {
            if (grid[nr][nc].terrain === TERRAIN.TREE && grid[nr][nc].building === null) {
              details.parkTreeBonus += 1;
            }
          }
        }
        // If not adjacent to house, 0 points (tracked for display)
        if (!adjHouse) {
          details.parkNoHousePenalty += 1;
        }
      }

      if (cell.building === 'shop') {
        details.shopBase += 1;
        // River adjacency
        for (const [nr, nc] of nb) {
          if (grid[nr][nc].terrain === TERRAIN.RIVER) {
            details.shopRiverBonus += 1;
          }
        }
      }

      if (cell.building === 'factory') {
        details.factoryBase += 3;
      }

      // Uncovered rocks
      if (cell.terrain === TERRAIN.ROCK && cell.building === null) {
        details.uncoveredRocks += 1;
      }
    }
  }

  // Shop cluster bonus: for each connected group of shops, bonus = (size - 1)
  details.shopClusterBonus = calcShopClusterBonus(grid);

  // Complete rows: +2 per fully filled row
  for (let r = 0; r < ROWS; r++) {
    let full = true;
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].building === null) { full = false; break; }
    }
    if (full) details.completeRows += 1;
  }

  // Totals
  const buildingScore =
    details.houseBase +
    details.houseParkBonus +
    details.parkBase +
    details.parkTreeBonus +
    details.shopBase +
    details.shopRiverBonus +
    details.shopClusterBonus +
    details.factoryBase;

  const bonuses = details.completeRows * 2;

  const penalties =
    details.houseFactoryPenalty * 2 +
    details.uncoveredRocks * 1 +
    details.skippedTiles * 2;

  const total = buildingScore + bonuses - penalties;

  return {
    total,
    buildingScore,
    bonuses,
    penalties,
    details,
  };
}

function calcShopClusterBonus(grid) {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  let bonus = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].building === 'shop' && !visited[r][c]) {
        // BFS to find connected shop cluster
        const queue = [[r, c]];
        visited[r][c] = true;
        let size = 0;
        while (queue.length > 0) {
          const [cr, cc] = queue.shift();
          size++;
          for (const [nr, nc] of neighbors(cr, cc)) {
            if (!visited[nr][nc] && grid[nr][nc].building === 'shop') {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }
        bonus += size - 1;
      }
    }
  }
  return bonus;
}

/**
 * Get star rating from score.
 */
export function getStars(score) {
  if (score >= 100) return 5;
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score > 0) return 1;
  return 0;
}

/**
 * Calculate a running score estimate (for display during play).
 * Same as final score but without end-game knowledge.
 */
export function runningScore(grid, skippedCount) {
  return calculateScore(grid, skippedCount).total;
}
