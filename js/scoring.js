/**
 * Scoring for Bird City.
 *
 * - Uncovered trees: +1 each
 * - Uncovered rocks: -1 each
 * - Largest connected group per color: +size each
 * - Skipped tiles: -2 each
 */

import { ROWS, COLS, TERRAIN, neighbors } from './grid.js';
import { COLORS } from './tiles.js';

export function calculateScore(grid, skippedCount) {
  const details = {
    treesUncovered: 0,
    rocksUncovered: 0,
    groups: {},
    skippedTiles: skippedCount,
  };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (cell.building === null) {
        if (cell.terrain === TERRAIN.TREE) details.treesUncovered++;
        if (cell.terrain === TERRAIN.ROCK) details.rocksUncovered++;
      }
    }
  }

  for (const color of COLORS) {
    details.groups[color] = findLargestGroup(grid, color);
  }

  const groupTotal = COLORS.reduce((sum, c) => sum + details.groups[c], 0);

  const total =
    groupTotal +
    details.treesUncovered -
    details.rocksUncovered -
    details.skippedTiles * 2;

  return { total, details };
}

function findLargestGroup(grid, color) {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  let largest = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].building === color && !visited[r][c]) {
        const size = bfs(grid, visited, r, c, color);
        if (size > largest) largest = size;
      }
    }
  }

  return largest;
}

function bfs(grid, visited, startR, startC, color) {
  const queue = [[startR, startC]];
  visited[startR][startC] = true;
  let size = 0;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    size++;
    for (const [nr, nc] of neighbors(cr, cc)) {
      if (!visited[nr][nc] && grid[nr][nc].building === color) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  return size;
}

export function getStars(score) {
  if (score >= 50) return 5;
  if (score >= 40) return 4;
  if (score >= 30) return 3;
  if (score >= 20) return 2;
  if (score > 0) return 1;
  return 0;
}

export function runningScore(grid, skippedCount) {
  return calculateScore(grid, skippedCount).total;
}
