/**
 * Bird City -- Main application module.
 * Orchestrates game state, rendering, and input.
 */

import { COLS, ROWS, createGrid, canPlace, placeTile } from './grid.js';
import { rotateShape, flipShape, shapeBounds } from './tiles.js';
import { calculateScore, getStars, runningScore } from './scoring.js';
import { getPuzzleNumber, generateTileSequence, createGridRNG } from './daily.js';
import { generateShareText, copyToClipboard } from './share.js';
import { loadStats, recordGame, saveGameState, loadGameState, clearGameState, hasCompletedToday } from './stats.js';

// ===== Emoji maps =====
const TERRAIN_EMOJI = {
  empty: '',
  rock: '\u{1FAA8}',
  tree: '\u{1F332}',
  river: '\u{1F30A}',
};

const BUILDING_EMOJI = {
  house: '\u{1F3E0}',
  park: '\u{1F333}',
  shop: '\u{1F3EA}',
  factory: '\u{1F3ED}',
};

// ===== State =====
let puzzleNumber;
let grid;
let tileSequence;
let currentTileIndex;
let currentShape;
let currentType;
let skippedCount;
let gameOver;
let pendingAnchor = null;  // [row, col] -- where the ghost preview is showing
let pendingValid = false;  // whether the pending placement is valid

// ===== DOM references =====
const $grid = document.getElementById('grid');
const $tilePreview = document.getElementById('tile-preview');
const $scoreDisplay = document.getElementById('score-display');
const $tileCounter = document.getElementById('tile-counter');
const $btnRotate = document.getElementById('btn-rotate');
const $btnFlip = document.getElementById('btn-flip');
const $btnPlace = document.getElementById('btn-place');
const $btnSkip = document.getElementById('btn-skip');
const $btnStats = document.getElementById('btn-stats');
const $btnHelp = document.getElementById('btn-help');
const $modalOverlay = document.getElementById('modal-overlay');
const $modal = document.getElementById('modal');
const $modalContent = document.getElementById('modal-content');

// ===== Init =====
function init() {
  puzzleNumber = getPuzzleNumber();

  bindEvents();

  if (hasCompletedToday(puzzleNumber)) {
    startNewGame();
    showAlreadyCompleted();
    return;
  }

  const saved = loadGameState();
  if (saved && saved.puzzleNumber === puzzleNumber) {
    restoreGame(saved);
  } else {
    startNewGame();
  }
}

function startNewGame() {
  const gridRNG = createGridRNG(puzzleNumber);
  grid = createGrid(gridRNG);
  tileSequence = generateTileSequence(puzzleNumber);
  currentTileIndex = 0;
  skippedCount = 0;
  gameOver = false;
  clearPending();

  loadCurrentTile();
  renderGrid();
  renderTilePreview();
  updateHUD();
}

function restoreGame(saved) {
  grid = saved.grid;
  tileSequence = generateTileSequence(puzzleNumber);
  currentTileIndex = saved.currentTileIndex;
  skippedCount = saved.skippedCount;
  gameOver = false;
  clearPending();

  loadCurrentTile();
  renderGrid();
  renderTilePreview();
  updateHUD();
}

function loadCurrentTile() {
  if (currentTileIndex >= tileSequence.length) {
    endGame();
    return;
  }
  const tile = tileSequence[currentTileIndex];
  currentShape = tile.shape.map(([r, c]) => [r, c]);
  currentType = tile.type;
}

// ===== Pending placement helpers =====
function clearPending() {
  pendingAnchor = null;
  pendingValid = false;
  $btnPlace.disabled = true;
}

function setPending(r, c) {
  pendingAnchor = [r, c];
  pendingValid = canPlace(grid, currentShape, r, c);
  $btnPlace.disabled = !pendingValid;
}

// ===== Rendering =====
function createCellElement(r, c) {
  const cell = grid[r][c];
  const $cell = document.createElement('div');
  $cell.className = 'cell';
  $cell.dataset.row = r;
  $cell.dataset.col = c;

  if (cell.building) {
    $cell.classList.add(`cell--${cell.building}`);
    const emoji = BUILDING_EMOJI[cell.building];
    if (emoji) {
      const $e = document.createElement('span');
      $e.className = 'cell-emoji';
      $e.textContent = emoji;
      $cell.appendChild($e);
    }
  } else {
    $cell.classList.add(`cell--${cell.terrain}`);
    const emoji = TERRAIN_EMOJI[cell.terrain];
    if (emoji) {
      const $e = document.createElement('span');
      $e.className = 'cell-emoji';
      $e.textContent = emoji;
      $cell.appendChild($e);
    }
  }

  return $cell;
}

function renderGrid() {
  $grid.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      $grid.appendChild(createCellElement(r, c));
    }
  }
}

function renderTilePreview() {
  if (gameOver || currentTileIndex >= tileSequence.length) {
    $tilePreview.innerHTML = '';
    return;
  }

  const bounds = shapeBounds(currentShape);
  $tilePreview.style.gridTemplateColumns = `repeat(${bounds.cols}, calc(var(--cell-size) * 0.6))`;
  $tilePreview.style.gridTemplateRows = `repeat(${bounds.rows}, calc(var(--cell-size) * 0.6))`;

  $tilePreview.innerHTML = '';
  const filled = new Set(currentShape.map(([r, c]) => `${r},${c}`));

  for (let r = 0; r < bounds.rows; r++) {
    for (let c = 0; c < bounds.cols; c++) {
      const $cell = document.createElement('div');
      $cell.className = 'preview-cell';
      if (filled.has(`${r},${c}`)) {
        $cell.classList.add('preview-cell--filled');
        $cell.style.background = `var(--${currentType})`;
        const emoji = BUILDING_EMOJI[currentType];
        if (emoji) {
          const $e = document.createElement('span');
          $e.className = 'cell-emoji';
          $e.textContent = emoji;
          $cell.appendChild($e);
        }
      } else {
        $cell.classList.add('preview-cell--empty');
      }
      $tilePreview.appendChild($cell);
    }
  }
}

function updateHUD() {
  const score = runningScore(grid, skippedCount);
  $scoreDisplay.textContent = `Score: ${score}`;
  $tileCounter.textContent = currentTileIndex < tileSequence.length
    ? `Tile ${currentTileIndex + 1} / ${tileSequence.length}`
    : 'Done!';
}

function updateGridPreview() {
  // Clear all preview classes and inline styles from non-building cells
  const cells = $grid.querySelectorAll('.cell');
  cells.forEach($c => {
    $c.classList.remove('cell--preview', 'cell--invalid');
    const r = +$c.dataset.row;
    const c = +$c.dataset.col;
    if (!grid[r][c].building) {
      $c.style.removeProperty('background');
      // Restore terrain emoji (preview might have replaced it)
      const terrainEmoji = TERRAIN_EMOJI[grid[r][c].terrain];
      const existing = $c.querySelector('.cell-emoji');
      if (terrainEmoji && !existing) {
        const $e = document.createElement('span');
        $e.className = 'cell-emoji';
        $e.textContent = terrainEmoji;
        $c.appendChild($e);
      } else if (existing) {
        existing.textContent = terrainEmoji || '';
      }
    }
  });

  if (!pendingAnchor || gameOver) return;

  const [ar, ac] = pendingAnchor;

  for (const [dr, dc] of currentShape) {
    const r = ar + dr;
    const c = ac + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const $cell = $grid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (!$cell) continue;

    if (pendingValid) {
      $cell.classList.add('cell--preview');
      $cell.style.background = `var(--${currentType})`;
      // Show building emoji in preview
      let $e = $cell.querySelector('.cell-emoji');
      if (!$e) {
        $e = document.createElement('span');
        $e.className = 'cell-emoji';
        $cell.appendChild($e);
      }
      $e.textContent = BUILDING_EMOJI[currentType];
    } else {
      $cell.classList.add('cell--invalid');
    }
  }
}

// ===== Input =====
function bindEvents() {
  $grid.addEventListener('click', onGridClick);

  // Desktop: show live hover preview
  $grid.addEventListener('pointermove', onGridHover);
  $grid.addEventListener('pointerleave', () => {
    // Only clear on desktop (hover); on touch, keep pending
    if (!('ontouchstart' in window)) {
      clearPending();
      updateGridPreview();
    }
  });

  $btnRotate.addEventListener('click', onRotate);
  $btnFlip.addEventListener('click', onFlip);
  $btnPlace.addEventListener('click', onPlace);
  $btnSkip.addEventListener('click', onSkip);

  $btnStats.addEventListener('click', showStats);
  $btnHelp.addEventListener('click', showHelp);

  $modalOverlay.addEventListener('click', (e) => {
    if (e.target === $modalOverlay) closeModal();
  });
  $modal.querySelector('.modal-close').addEventListener('click', closeModal);

  document.addEventListener('keydown', onKeyDown);
}

function onGridClick(e) {
  if (gameOver) return;
  const $cell = e.target.closest('.cell');
  if (!$cell) return;

  const r = +$cell.dataset.row;
  const c = +$cell.dataset.col;

  // If tapping the same anchor that's already pending and valid -> confirm
  if (pendingAnchor && pendingAnchor[0] === r && pendingAnchor[1] === c && pendingValid) {
    doPlace(r, c);
    return;
  }

  // Otherwise, set/move the pending preview
  setPending(r, c);
  updateGridPreview();
}

function onGridHover(e) {
  if (gameOver) return;
  // Ignore hover on touch devices
  if (e.pointerType === 'touch') return;

  const $cell = document.elementFromPoint(e.clientX, e.clientY);
  if (!$cell || !$cell.classList.contains('cell')) return;

  const r = +$cell.dataset.row;
  const c = +$cell.dataset.col;

  if (!pendingAnchor || pendingAnchor[0] !== r || pendingAnchor[1] !== c) {
    setPending(r, c);
    updateGridPreview();
  }
}

function onRotate() {
  if (gameOver) return;
  currentShape = rotateShape(currentShape);
  renderTilePreview();
  if (pendingAnchor) {
    setPending(pendingAnchor[0], pendingAnchor[1]);
  }
  updateGridPreview();
}

function onFlip() {
  if (gameOver) return;
  currentShape = flipShape(currentShape);
  renderTilePreview();
  if (pendingAnchor) {
    setPending(pendingAnchor[0], pendingAnchor[1]);
  }
  updateGridPreview();
}

function onPlace() {
  if (gameOver || !pendingAnchor || !pendingValid) return;
  doPlace(pendingAnchor[0], pendingAnchor[1]);
}

function onSkip() {
  if (gameOver) return;
  skippedCount++;
  clearPending();
  advanceTile();
}

function onKeyDown(e) {
  if (gameOver) return;
  if (e.key === 'r' || e.key === 'R') onRotate();
  if (e.key === 'f' || e.key === 'F') onFlip();
  if (e.key === 's' || e.key === 'S') onSkip();
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlace(); }
}

// ===== Game Actions =====
function doPlace(r, c) {
  const placed = placeTile(grid, currentShape, r, c, currentType);

  // Update placed cells in DOM
  for (const [pr, pc] of placed) {
    const $cell = $grid.querySelector(`[data-row="${pr}"][data-col="${pc}"]`);
    if ($cell) {
      $cell.className = `cell cell--${currentType} cell--just-placed`;
      $cell.style.removeProperty('background');
      // Update emoji
      let $e = $cell.querySelector('.cell-emoji');
      if (!$e) {
        $e = document.createElement('span');
        $e.className = 'cell-emoji';
        $cell.appendChild($e);
      }
      $e.textContent = BUILDING_EMOJI[currentType];
    }
  }

  clearPending();
  saveProgress();
  advanceTile();
}

function advanceTile() {
  currentTileIndex++;
  if (currentTileIndex >= tileSequence.length) {
    endGame();
  } else {
    loadCurrentTile();
    renderTilePreview();
    updateHUD();
    updateGridPreview();
  }
}

function saveProgress() {
  saveGameState({
    puzzleNumber,
    grid,
    currentTileIndex: currentTileIndex + 1,
    skippedCount,
  });
}

function endGame() {
  gameOver = true;
  clearGameState();

  const result = calculateScore(grid, skippedCount);
  recordGame(puzzleNumber, result.total);

  renderGrid();
  $tilePreview.innerHTML = '';
  updateHUD();

  setTimeout(() => showGameOver(result), 400);
}

// ===== Modals =====
function openModal(html) {
  $modalContent.innerHTML = html;
  $modalOverlay.classList.remove('hidden');
}

function closeModal() {
  $modalOverlay.classList.add('hidden');
}

function showGameOver(result) {
  const stars = getStars(result.total);
  const d = result.details;

  const html = `
    <div class="game-over-title">Bird City #${puzzleNumber}</div>
    <div class="game-over-score">${result.total}</div>
    <div class="game-over-stars">${'\u2B50'.repeat(stars)}${'\u2606'.repeat(5 - stars)}</div>

    <div class="score-breakdown">
      <div class="score-row"><span class="label">\u{1F3E0} Houses (${d.houseBase} cells)</span><span class="value positive">+${d.houseBase}</span></div>
      ${d.houseParkBonus ? `<div class="score-row"><span class="label">&nbsp;&nbsp;\u{1F333} Park adjacency</span><span class="value positive">+${d.houseParkBonus}</span></div>` : ''}
      ${d.houseFactoryPenalty ? `<div class="score-row"><span class="label">&nbsp;&nbsp;\u{1F3ED} Factory penalty</span><span class="value negative">-${d.houseFactoryPenalty * 2}</span></div>` : ''}
      <div class="score-row"><span class="label">\u{1F333} Parks (${Math.floor(d.parkBase / 2)} cells)</span><span class="value positive">+${d.parkBase}</span></div>
      ${d.parkTreeBonus ? `<div class="score-row"><span class="label">&nbsp;&nbsp;\u{1F332} Tree adjacency</span><span class="value positive">+${d.parkTreeBonus}</span></div>` : ''}
      ${d.parkNoHousePenalty ? `<div class="score-row"><span class="label">&nbsp;&nbsp;Parks w/o houses</span><span class="value negative">${d.parkNoHousePenalty} wasted</span></div>` : ''}
      <div class="score-row"><span class="label">\u{1F3EA} Shops (${d.shopBase} cells)</span><span class="value positive">+${d.shopBase}</span></div>
      ${d.shopRiverBonus ? `<div class="score-row"><span class="label">&nbsp;&nbsp;\u{1F30A} River adjacency</span><span class="value positive">+${d.shopRiverBonus}</span></div>` : ''}
      ${d.shopClusterBonus ? `<div class="score-row"><span class="label">&nbsp;&nbsp;Cluster bonus</span><span class="value positive">+${d.shopClusterBonus}</span></div>` : ''}
      <div class="score-row"><span class="label">\u{1F3ED} Factories (${Math.floor(d.factoryBase / 3)} cells)</span><span class="value positive">+${d.factoryBase}</span></div>
      ${d.completeRows ? `<div class="score-row"><span class="label">Complete rows (${d.completeRows})</span><span class="value positive">+${d.completeRows * 2}</span></div>` : ''}
      ${d.uncoveredRocks ? `<div class="score-row"><span class="label">\u{1FAA8} Uncovered rocks (${d.uncoveredRocks})</span><span class="value negative">-${d.uncoveredRocks}</span></div>` : ''}
      ${d.skippedTiles ? `<div class="score-row"><span class="label">Skipped tiles (${d.skippedTiles})</span><span class="value negative">-${d.skippedTiles * 2}</span></div>` : ''}
      <div class="score-row"><span class="label">Total</span><span class="value">${result.total}</span></div>
    </div>

    <button class="btn-share" id="btn-share-result">Share Result</button>
  `;

  openModal(html);

  document.getElementById('btn-share-result').addEventListener('click', async () => {
    const text = generateShareText(grid, result.total, puzzleNumber);
    await copyToClipboard(text);
    showToast('Copied to clipboard!');
  });
}

function showAlreadyCompleted() {
  const stats = loadStats();
  const todayScore = stats.scores.find(s => s.puzzle === puzzleNumber);

  openModal(`
    <div class="game-over-title">Already Played!</div>
    <p style="text-align:center; margin: 16px 0;">You've already completed today's puzzle.</p>
    ${todayScore ? `<div class="game-over-score">${todayScore.score}</div><div class="game-over-stars">${'\u2B50'.repeat(getStars(todayScore.score))}</div>` : ''}
    <p style="text-align:center; color: var(--text-muted);">Come back tomorrow for a new puzzle!</p>
    <button class="btn-share" id="btn-share-result" style="margin-top: 16px;">Share Result</button>
  `);

  document.getElementById('btn-share-result').addEventListener('click', async () => {
    const text = generateShareText(grid, todayScore?.score || 0, puzzleNumber);
    await copyToClipboard(text);
    showToast('Copied to clipboard!');
  });
}

function showStats() {
  const stats = loadStats();
  const avg = stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;

  openModal(`
    <h2>Statistics</h2>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-value">${stats.gamesPlayed}</div><div class="stat-label">Played</div></div>
      <div class="stat-box"><div class="stat-value">${stats.currentStreak}</div><div class="stat-label">Streak</div></div>
      <div class="stat-box"><div class="stat-value">${stats.maxStreak}</div><div class="stat-label">Max Streak</div></div>
      <div class="stat-box"><div class="stat-value">${stats.bestScore}</div><div class="stat-label">Best</div></div>
    </div>
    <div class="score-breakdown">
      <div class="score-row"><span class="label">Average score</span><span class="value">${avg}</span></div>
      <div class="score-row"><span class="label">Games played</span><span class="value">${stats.gamesPlayed}</span></div>
    </div>
  `);
}

function showHelp() {
  openModal(`
    <h2>How to Play</h2>
    <div class="help-section">
      <p>Build your city by placing tiles on the grid. Each day brings a new puzzle with the same tiles for everyone.</p>
    </div>

    <div class="help-section">
      <h3>Controls</h3>
      <p><strong>Tap</strong> a grid cell to preview tile placement.<br>
      <strong>Tap again</strong> or press <strong>Place</strong> to confirm.<br>
      <strong>Rotate</strong> (R) and <strong>Flip</strong> (F) to transform tiles.<br>
      <strong>Skip</strong> (S) to discard a tile (-2 points).</p>
    </div>

    <div class="help-section">
      <h3>Buildings</h3>
      <div class="building-legend">
        <div class="legend-item"><div class="legend-swatch" style="background:var(--house)">\u{1F3E0}</div><div><strong>House</strong><br>1pt, +1 near parks</div></div>
        <div class="legend-item"><div class="legend-swatch" style="background:var(--park)">\u{1F333}</div><div><strong>Park</strong><br>2pt near houses</div></div>
        <div class="legend-item"><div class="legend-swatch" style="background:var(--shop)">\u{1F3EA}</div><div><strong>Shop</strong><br>1pt, river + cluster</div></div>
        <div class="legend-item"><div class="legend-swatch" style="background:var(--factory)">\u{1F3ED}</div><div><strong>Factory</strong><br>3pt, -2 near houses</div></div>
      </div>
    </div>

    <div class="help-section">
      <h3>Terrain</h3>
      <p>\u{1F30A} <strong>River</strong> -- bonus for nearby shops<br>
      \u{1F332} <strong>Trees</strong> -- bonus for nearby parks<br>
      \u{1FAA8} <strong>Rocks</strong> -- penalty if uncovered</p>
    </div>

    <div class="help-section">
      <h3>Scoring</h3>
      <p>Complete rows: +2 bonus. Connected shop clusters earn extra. Avoid uncovered rocks!</p>
    </div>
  `);
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const $toast = document.createElement('div');
  $toast.className = 'toast';
  $toast.textContent = message;
  document.body.appendChild($toast);
  setTimeout(() => $toast.remove(), 2000);
}

// ===== Start =====
init();
