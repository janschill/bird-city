/**
 * Share text generation for Bird City.
 */

import { COLORS } from './tiles.js';
import { getStars, calculateScore } from './scoring.js';

const COLOR_EMOJI = {
  rust: '\u{1F7E7}',
  sand: '\u{1F7E8}',
  sage: '\u{1F7E9}',
};

export function generateShareText(grid, score, puzzleNumber, boardVariant, skippedCount, isHardMode) {
  const stars = getStars(score);
  const starStr = '\u2B50'.repeat(stars) + '\u2606'.repeat(5 - stars);
  const label = boardVariant > 1 ? ` (Extra #${boardVariant - 1})` : '';
  const hardLabel = isHardMode ? ' \u{1F525}' : '';

  // Use the day number for display, not the internal offset puzzle number
  const dayNumber = puzzleNumber > 100000 ? puzzleNumber % 100000 : puzzleNumber;

  // Build score breakdown
  const result = calculateScore(grid, skippedCount || 0);
  const d = result.details;

  let breakdown = '';
  for (const c of COLORS) {
    if (d.groups[c] > 0) {
      breakdown += `${COLOR_EMOJI[c]}+${d.groups[c]} `;
    }
  }
  if (d.treesUncovered > 0) {
    breakdown += `\u{1F332}+${d.treesUncovered * 2} `;
  }
  if (d.rocksUncovered > 0) {
    breakdown += `\u{1FAA8}-${d.rocksUncovered * 2} `;
  }
  if (d.emptyUncovered > 0) {
    breakdown += `\u{1F7EB}-${d.emptyUncovered} `;
  }
  if (d.skippedTiles > 0) {
    breakdown += `\u{1F6AB}-${d.skippedTiles * 2}`;
  }
  breakdown = breakdown.trimEnd();

  return `Bird City #${dayNumber}${label}${hardLabel} \u{1F3D9}\uFE0F\n${starStr} ${score}pts\n${breakdown}\nbird-city.janschill.de`;
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
