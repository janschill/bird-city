/**
 * Share text generation for Bird City.
 */

import { ROWS, COLS, TERRAIN } from './grid.js';
import { getStars } from './scoring.js';

const BUILDING_EMOJI = {
  house: '\u{1F7E7}',   // orange square
  park: '\u{1F7E9}',    // green square
  shop: '\u{1F7E6}',    // blue square
  factory: '\u{1F7EA}', // purple square
};

const TERRAIN_EMOJI = {
  empty: '\u2B1C',      // white square
  rock: '\u{1F7EB}',    // brown square
  tree: '\u{1F332}',    // evergreen tree
  river: '\u{1F4A7}',   // droplet
};

/**
 * Generate a shareable text representation of the finished game.
 * We compress the 7x10 grid into a smaller representation (every other row).
 */
export function generateShareText(grid, score, puzzleNumber) {
  const stars = getStars(score);
  const starStr = '\u2B50'.repeat(stars);

  // Sample grid: take rows 0,2,4,6,8 (5 rows) for compact display
  let gridText = '';
  for (let r = 0; r < ROWS; r += 2) {
    let row = '';
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (cell.building) {
        row += BUILDING_EMOJI[cell.building];
      } else {
        row += TERRAIN_EMOJI[cell.terrain] || TERRAIN_EMOJI.empty;
      }
    }
    gridText += row + '\n';
  }

  return `Bird City #${puzzleNumber} \u{1F3D9}\uFE0F\nScore: ${score} ${starStr}\n${gridText}`;
}

/**
 * Copy text to clipboard and show toast.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}
