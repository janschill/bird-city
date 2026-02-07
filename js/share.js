/**
 * Share text generation for Bird City.
 */

import { ROWS, COLS } from './grid.js';
import { COLORS } from './tiles.js';
import { getStars, calculateScore } from './scoring.js';

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

export function generateShareText(grid, score, puzzleNumber, boardVariant, skippedCount) {
  const stars = getStars(score);
  const starStr = '\u2B50'.repeat(stars) + '\u2606'.repeat(5 - stars);
  const label = boardVariant > 1 ? ` (Extra #${boardVariant - 1})` : '';

  // Use the day number for display, not the internal offset puzzle number
  const dayNumber = puzzleNumber > 100000 ? puzzleNumber % 100000 : puzzleNumber;

  // Build score breakdown
  const result = calculateScore(grid, skippedCount || 0);
  const d = result.details;

  let breakdown = '';
  for (const c of COLORS) {
    if (d.groups[c] > 0) {
      breakdown += `${COLOR_EMOJI[c]} +${d.groups[c]}  `;
    }
  }
  if (d.treesUncovered > 0) {
    breakdown += `\u{1F332} +${d.treesUncovered}  `;
  }
  if (d.rocksUncovered > 0) {
    breakdown += `\u{1FAA8} -${d.rocksUncovered}  `;
  }
  if (d.skippedTiles > 0) {
    breakdown += `\u{1F6AB} -${d.skippedTiles * 2}`;
  }
  breakdown = breakdown.trimEnd();

  // Compact grid (every other row)
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

  return `Bird City #${dayNumber}${label} \u{1F3D9}\uFE0F\n${starStr} ${score}pts\n${breakdown}\n${gridText}\nbird-city.janschill.de`;
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
