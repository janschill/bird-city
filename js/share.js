/**
 * Share text generation for Bird City.
 */

import { ROWS, COLS } from './grid.js';
import { getStars } from './scoring.js';

const COLOR_EMOJI = {
  rust: '\u{1F7E7}',
  sand: '\u{1F7E8}',
  sage: '\u{1F7E9}',
};

const TERRAIN_EMOJI = {
  empty: '\u2B1C',
  rock: '\u{1FAA8}',
  tree: '\u{1F332}',
  river: '\u{1F4A7}',
};

export function generateShareText(grid, score, puzzleNumber, boardVariant) {
  const stars = getStars(score);
  const starStr = '\u2B50'.repeat(stars);
  const label = boardVariant > 1 ? ` (Extra #${boardVariant - 1})` : '';

  let gridText = '';
  for (let r = 0; r < ROWS; r += 2) {
    let row = '';
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      if (cell.building) {
        row += COLOR_EMOJI[cell.building] || '\u2B1C';
      } else {
        row += TERRAIN_EMOJI[cell.terrain] || TERRAIN_EMOJI.empty;
      }
    }
    gridText += row + '\n';
  }

  // Use the day number for display, not the internal offset puzzle number
  const dayNumber = puzzleNumber > 100000 ? puzzleNumber % 100000 : puzzleNumber;
  return `Bird City #${dayNumber}${label} \u{1F3D9}\uFE0F\nScore: ${score} ${starStr}\n${gridText}`;
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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
