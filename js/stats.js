/**
 * Stats persistence using localStorage.
 */

const STORAGE_KEY = 'birdcity_stats';
const GAME_STATE_KEY = 'birdcity_game';
const COMPLETED_KEY = 'birdcity_completed';

function defaultStats() {
  return {
    gamesPlayed: 0,
    currentStreak: 0,
    maxStreak: 0,
    bestScore: 0,
    totalScore: 0,
    lastPuzzle: -1,
    scores: [], // last 30 scores as { puzzle, score }
  };
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultStats(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultStats();
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

/**
 * Record a completed game.
 */
export function recordGame(puzzleNumber, score) {
  const stats = loadStats();

  stats.gamesPlayed += 1;
  stats.totalScore += score;

  if (score > stats.bestScore) {
    stats.bestScore = score;
  }

  // Streak: consecutive days
  if (stats.lastPuzzle === puzzleNumber - 1 || stats.lastPuzzle === -1) {
    stats.currentStreak += 1;
  } else if (stats.lastPuzzle !== puzzleNumber) {
    stats.currentStreak = 1;
  }
  stats.lastPuzzle = puzzleNumber;

  if (stats.currentStreak > stats.maxStreak) {
    stats.maxStreak = stats.currentStreak;
  }

  // Keep last 30 scores
  stats.scores.push({ puzzle: puzzleNumber, score });
  if (stats.scores.length > 30) {
    stats.scores = stats.scores.slice(-30);
  }

  saveStats(stats);
  return stats;
}

/**
 * Save in-progress game state so player can resume.
 */
export function saveGameState(state) {
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function loadGameState() {
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function clearGameState() {
  try {
    localStorage.removeItem(GAME_STATE_KEY);
  } catch { /* ignore */ }
}

/**
 * Save completed game board so it can be restored later.
 */
export function saveCompletedGame(puzzleNumber, grid, skippedCount) {
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify({ puzzleNumber, grid, skippedCount }));
  } catch { /* ignore */ }
}

export function loadCompletedGame(puzzleNumber) {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.puzzleNumber === puzzleNumber) return data;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Check if today's puzzle has already been completed.
 */
export function hasCompletedToday(puzzleNumber) {
  const stats = loadStats();
  return stats.scores.some(s => s.puzzle === puzzleNumber);
}
