/**
 * Leaderboard module -- local-first score storage.
 *
 * Stores a username and score entries in localStorage.
 * Data structure is sync-ready: each entry has all the
 * fields a future server would need.
 */

const USERNAME_KEY = 'birdcity_username';
const LEADERBOARD_KEY = 'birdcity_leaderboard';

export function loadUsername() {
  try {
    return localStorage.getItem(USERNAME_KEY) || '';
  } catch { return ''; }
}

export function saveUsername(name) {
  try {
    localStorage.setItem(USERNAME_KEY, name.trim());
  } catch { /* ignore */ }
}

export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveLeaderboard(entries) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

/**
 * Record a score. One entry per user per puzzle.
 */
export function addScore(username, score, puzzleNumber, hardMode) {
  if (!username) return;
  const entries = loadLeaderboard();

  // One score per user per puzzle
  const idx = entries.findIndex(
    e => e.username === username && e.puzzleNumber === puzzleNumber
  );
  const entry = {
    username,
    score,
    puzzleNumber,
    hardMode,
    date: new Date().toISOString().split('T')[0],
  };

  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }

  saveLeaderboard(entries);
}

/**
 * Get scores for a specific puzzle, sorted by score descending.
 */
export function getScoresForPuzzle(puzzleNumber) {
  return loadLeaderboard()
    .filter(e => e.puzzleNumber === puzzleNumber)
    .sort((a, b) => b.score - a.score);
}

/**
 * Get all-time best score per user, sorted by score descending.
 */
export function getAllTimeBest() {
  const entries = loadLeaderboard();
  const bestByUser = {};

  for (const e of entries) {
    if (!bestByUser[e.username] || e.score > bestByUser[e.username].score) {
      bestByUser[e.username] = e;
    }
  }

  return Object.values(bestByUser).sort((a, b) => b.score - a.score);
}
