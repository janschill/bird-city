/**
 * Bird City -- Main application module.
 */

import { COLS, ROWS, createGrid, canPlace, placeTile } from './grid.js';
import { COLORS, rotateShape, shapeBounds, getShape } from './tiles.js';
import { calculateScore, getStars, runningScore } from './scoring.js';
import { getPuzzleNumber, getDayNumber, getBoardVariant, generateTileSequence, createGridRNG } from './daily.js';
import { generateShareText, copyToClipboard } from './share.js';
import { loadStats, recordGame, saveGameState, loadGameState, clearGameState, hasCompletedToday } from './stats.js';

// ===== Emoji maps =====
const TERRAIN_EMOJI = {
  empty: '',
  rock: '\u{1FAA8}',
  tree: '\u{1F332}',
  river: '',
};

// Color display names
const COLOR_NAMES = {
  rust: 'Rust',
  sand: 'Sand',
  sage: 'Sage',
};

// ===== State =====
let puzzleNumber;
let boardVariant;
let grid;
let tileSequence;
let currentTileIndex;
let currentShape;
let currentType;
let skippedCount;
let gameOver;
let pendingAnchor = null;
let pendingValid = false;

// Undo stack
let undoStack = [];

// Drag state
let dragState = null; // { pointerId, startX, startY, dragging, source, $ghost }
let rafPending = false;
let lastPointerEvent = null;

// ===== DOM references =====
const $grid = document.getElementById('grid');
const $tilePreview = document.getElementById('tile-preview');
const $seqLeft = document.getElementById('seq-left');
const $seqRight = document.getElementById('seq-right');
const $scoreDisplay = document.getElementById('score-display');
const $tileCounter = document.getElementById('tile-counter');
const $tilePreviewArea = document.getElementById('tile-preview-area');
const $btnUndo = document.getElementById('btn-undo');
const $btnPlace = document.getElementById('btn-place');
const $btnSkip = document.getElementById('btn-skip');
const $btnStats = document.getElementById('btn-stats');
const $btnMenu = document.getElementById('btn-menu');
const $headerMenu = document.getElementById('header-menu');
const $btnHelpMenu = document.getElementById('btn-help-menu');
const $btnEndMenu = document.getElementById('btn-end-menu');
const $btnRestartMenu = document.getElementById('btn-restart-menu');
const $modalOverlay = document.getElementById('modal-overlay');
const $modal = document.getElementById('modal');
const $modalContent = document.getElementById('modal-content');

// ===== Init =====
function displayPuzzleLabel() {
  const day = getDayNumber();
  return boardVariant > 1 ? `Bird City #${day} (Extra)` : `Bird City #${day}`;
}

function init() {
  boardVariant = getBoardVariant();
  puzzleNumber = getPuzzleNumber(boardVariant);
  bindEvents();

  if (hasCompletedToday(puzzleNumber)) {
    startNewGame();
    gameOver = true;
    document.getElementById('tile-panel').classList.add('hidden');
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
  undoStack = [];
  $btnUndo.disabled = true;
  clearPending();
  showTilePanel();

  loadCurrentTile();
  renderGrid();
  renderTilePreview();
  renderSequence();
  updateHUD();
}

function restoreGame(saved) {
  grid = saved.grid;
  tileSequence = generateTileSequence(puzzleNumber);
  currentTileIndex = saved.currentTileIndex;
  skippedCount = saved.skippedCount;
  gameOver = false;
  undoStack = [];
  $btnUndo.disabled = true;
  clearPending();

  loadCurrentTile();
  renderGrid();
  renderTilePreview();
  renderSequence();
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

// ===== Pending placement =====
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

/**
 * Compute anchor row,col so the shape is centered on the given cell.
 */
function centeredAnchor(r, c) {
  const bounds = shapeBounds(currentShape);
  return [r - Math.floor(bounds.rows / 2), c - Math.floor(bounds.cols / 2)];
}

// ===== Rendering =====
function renderGrid() {
  $grid.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = grid[r][c];
      const $cell = document.createElement('div');
      $cell.className = 'cell';
      $cell.dataset.row = r;
      $cell.dataset.col = c;

      if (cell.building) {
        $cell.classList.add(`cell--${cell.building}`);
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

      $grid.appendChild($cell);
    }
  }
}

function renderTilePreview() {
  if (gameOver || currentTileIndex >= tileSequence.length) {
    $tilePreview.innerHTML = '';
    return;
  }

  const bounds = shapeBounds(currentShape);
  $tilePreview.style.gridTemplateColumns = `repeat(${bounds.cols}, calc(var(--cell-size) * 0.5))`;
  $tilePreview.style.gridTemplateRows = `repeat(${bounds.rows}, calc(var(--cell-size) * 0.5))`;

  $tilePreview.innerHTML = '';
  const filled = new Set(currentShape.map(([r, c]) => `${r},${c}`));

  for (let r = 0; r < bounds.rows; r++) {
    for (let c = 0; c < bounds.cols; c++) {
      const $cell = document.createElement('div');
      $cell.className = 'preview-cell';
      if (filled.has(`${r},${c}`)) {
        $cell.classList.add('preview-cell--filled');
        $cell.style.background = `var(--${currentType})`;
      } else {
        $cell.classList.add('preview-cell--empty');
      }
      $tilePreview.appendChild($cell);
    }
  }
}

function renderSequence() {
  $seqLeft.innerHTML = '';
  $seqRight.innerHTML = '';

  // Sort by shape then color (hides sequence order)
  const tiles = tileSequence.map((t, i) => ({ ...t, idx: i }));
  tiles.sort((a, b) => a.shapeKey.localeCompare(b.shapeKey) || a.type.localeCompare(b.type));

  const half = Math.ceil(tiles.length / 2);

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const done = tile.idx < currentTileIndex;
    const shape = getShape(tile.shapeKey);
    const bounds = shapeBounds(shape);
    const filled = new Set(shape.map(([r, c]) => `${r},${c}`));

    const $shape = document.createElement('div');
    $shape.className = 'seq-shape' + (done ? ' seq-shape--done' : '');
    $shape.style.gridTemplateColumns = `repeat(${bounds.cols}, 5px)`;
    $shape.style.gridTemplateRows = `repeat(${bounds.rows}, 5px)`;

    for (let r = 0; r < bounds.rows; r++) {
      for (let c = 0; c < bounds.cols; c++) {
        const $cell = document.createElement('div');
        if (filled.has(`${r},${c}`)) {
          $cell.className = 'seq-cell';
          $cell.style.background = done ? '' : `var(--${tile.type})`;
        } else {
          $cell.className = 'seq-cell seq-cell--empty';
        }
        $shape.appendChild($cell);
      }
    }

    (i < half ? $seqLeft : $seqRight).appendChild($shape);
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
  const cells = $grid.querySelectorAll('.cell');
  cells.forEach($c => {
    $c.classList.remove('cell--preview', 'cell--invalid');
    const r = +$c.dataset.row;
    const c = +$c.dataset.col;
    if (!grid[r][c].building) {
      $c.style.removeProperty('background');
      // Restore terrain emoji
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
      // Hide terrain emoji during preview
      const $e = $cell.querySelector('.cell-emoji');
      if ($e) $e.textContent = '';
    } else {
      $cell.classList.add('cell--invalid');
    }
  }
}

// ===== Input =====
function bindEvents() {
  // Grid: tap to preview (centered), hover for desktop
  $grid.addEventListener('click', onGridClick);
  $grid.addEventListener('pointermove', onGridHover);
  $grid.addEventListener('pointerleave', () => {
    if (!('ontouchstart' in window) && !dragState) {
      clearPending();
      updateGridPreview();
    }
  });

  // Drag: from preview area or from grid
  $grid.addEventListener('pointerdown', onDragPointerDown);
  $tilePreviewArea.addEventListener('pointerdown', onDragPointerDown);

  // Drag move/up on document for cross-element tracking
  document.addEventListener('pointermove', onDragPointerMoveRaw);
  document.addEventListener('pointerup', onDragPointerUp);
  document.addEventListener('pointercancel', onDragPointerCancel);

  $btnUndo.addEventListener('click', onUndo);
  $btnPlace.addEventListener('click', onPlace);
  $btnSkip.addEventListener('click', onSkip);

  $btnStats.addEventListener('click', showStats);

  // Menu dropdown
  $btnMenu.addEventListener('click', toggleMenu);
  $btnHelpMenu.addEventListener('click', () => { closeMenu(); showHelp(); });
  $btnEndMenu.addEventListener('click', () => { closeMenu(); showEndConfirm(); });
  $btnRestartMenu.addEventListener('click', () => { closeMenu(); showRestartConfirm(); });
  document.addEventListener('click', (e) => {
    if (!$headerMenu.classList.contains('hidden') && !$btnMenu.contains(e.target) && !$headerMenu.contains(e.target)) {
      closeMenu();
    }
  });

  $modalOverlay.addEventListener('click', (e) => {
    if (e.target === $modalOverlay) closeModal();
  });
  $modal.querySelector('.modal-close').addEventListener('click', closeModal);

  document.addEventListener('keydown', onKeyDown);
}

// --- Grid interaction: tap to preview position (centered) ---
function onGridClick(e) {
  if (gameOver || dragState) return;
  const $cell = e.target.closest('.cell');
  if (!$cell) return;

  const r = +$cell.dataset.row;
  const c = +$cell.dataset.col;
  const [ar, ac] = centeredAnchor(r, c);

  setPending(ar, ac);
  updateGridPreview();
}

function onGridHover(e) {
  if (gameOver || dragState) return;
  if (e.pointerType === 'touch') return;

  const $cell = document.elementFromPoint(e.clientX, e.clientY);
  if (!$cell || !$cell.classList.contains('cell')) return;

  const r = +$cell.dataset.row;
  const c = +$cell.dataset.col;
  const [ar, ac] = centeredAnchor(r, c);

  if (!pendingAnchor || pendingAnchor[0] !== ar || pendingAnchor[1] !== ac) {
    setPending(ar, ac);
    updateGridPreview();
  }
}

// ===== Haptic feedback =====
function haptic(ms = 10) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// ===== Floating drag ghost =====
function createDragGhost() {
  const bounds = shapeBounds(currentShape);
  const cellPx = $grid.querySelector('.cell')?.offsetWidth || 36;
  const ghostCellSize = cellPx;

  const $ghost = document.createElement('div');
  $ghost.className = 'drag-ghost';
  $ghost.style.gridTemplateColumns = `repeat(${bounds.cols}, ${ghostCellSize}px)`;
  $ghost.style.gridTemplateRows = `repeat(${bounds.rows}, ${ghostCellSize}px)`;

  const filled = new Set(currentShape.map(([r, c]) => `${r},${c}`));

  for (let r = 0; r < bounds.rows; r++) {
    for (let c = 0; c < bounds.cols; c++) {
      const $cell = document.createElement('div');
      if (filled.has(`${r},${c}`)) {
        $cell.className = 'drag-ghost-cell';
        $cell.style.background = `var(--${currentType})`;
      } else {
        $cell.className = 'drag-ghost-cell drag-ghost-cell--empty';
      }
      $ghost.appendChild($cell);
    }
  }

  document.body.appendChild($ghost);
  return { $ghost, width: bounds.cols * (ghostCellSize + 2), height: bounds.rows * (ghostCellSize + 2) };
}

function positionGhost(ghost, x, y, isTouch) {
  // Offset above finger on touch so you can see placement
  const offsetY = isTouch ? -60 : 0;
  const gx = x - ghost.width / 2;
  const gy = y - ghost.height / 2 + offsetY;
  ghost.$ghost.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
}

function removeDragGhost() {
  if (dragState && dragState.ghost) {
    dragState.ghost.$ghost.remove();
    dragState.ghost = null;
  }
}

// ===== Unified drag: preview area OR grid =====
function onDragPointerDown(e) {
  if (gameOver || dragState) return;

  const fromPreview = $tilePreviewArea.contains(e.target);
  const fromGrid = $grid.contains(e.target);

  if (!fromPreview && !(fromGrid && pendingAnchor)) return;

  e.preventDefault();
  dragState = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    dragging: false,
    source: fromPreview ? 'preview' : 'grid',
    isTouch: e.pointerType === 'touch',
    ghost: null,
  };
}

// rAF-throttled pointermove
function onDragPointerMoveRaw(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  lastPointerEvent = e;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(onDragPointerMoveTick);
  }
}

function onDragPointerMoveTick() {
  rafPending = false;
  const e = lastPointerEvent;
  if (!dragState || !e) return;

  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;

  // Start dragging after moving 8px
  if (!dragState.dragging && (dx * dx + dy * dy > 64)) {
    dragState.dragging = true;

    // Create floating ghost
    dragState.ghost = createDragGhost();
    positionGhost(dragState.ghost, e.clientX, e.clientY, dragState.isTouch);

    // Visual feedback
    $tilePreviewArea.classList.add('dragging');
    $grid.classList.add('grid--dragging');
    haptic(12);
  }

  if (dragState.dragging && dragState.ghost) {
    // Move ghost to follow pointer
    positionGhost(dragState.ghost, e.clientX, e.clientY, dragState.isTouch);

    // Snap to grid cell (center the shape)
    const $cell = getCellAtPoint(e.clientX, e.clientY);
    if ($cell) {
      const r = +$cell.dataset.row;
      const c = +$cell.dataset.col;
      const [ar, ac] = centeredAnchor(r, c);
      if (!pendingAnchor || pendingAnchor[0] !== ar || pendingAnchor[1] !== ac) {
        setPending(ar, ac);
        updateGridPreview();
        haptic(6);
      }
    } else {
      if (pendingAnchor) {
        clearPending();
        updateGridPreview();
      }
    }
  }
}

function onDragPointerUp(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;

  const wasDragging = dragState.dragging;

  // Clean up ghost and visual state
  removeDragGhost();
  $tilePreviewArea.classList.remove('dragging');
  $grid.classList.remove('grid--dragging');

  if (!wasDragging && dragState.source === 'preview') {
    // Tap on preview (no drag) → rotate
    onRotate();
  }
  // If was dragging, keep the preview on grid (PLACE to confirm)

  dragState = null;
  lastPointerEvent = null;
}

function onDragPointerCancel(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  removeDragGhost();
  $tilePreviewArea.classList.remove('dragging');
  $grid.classList.remove('grid--dragging');
  clearPending();
  updateGridPreview();
  dragState = null;
  lastPointerEvent = null;
}

/**
 * Find grid cell under a screen point, looking through overlays.
 */
function getCellAtPoint(x, y) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    const cell = el.closest('.cell');
    if (cell && $grid.contains(cell)) return cell;
  }
  return null;
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

function onPlace() {
  if (gameOver || !pendingAnchor || !pendingValid) return;
  doPlace(pendingAnchor[0], pendingAnchor[1]);
}

function onSkip() {
  if (gameOver) return;
  pushUndo();
  skippedCount++;
  clearPending();
  advanceTile();
}

function onKeyDown(e) {
  if (gameOver) return;
  if (e.key === 'r' || e.key === 'R') onRotate();
  if (e.key === 's' || e.key === 'S') onSkip();
  if (e.key === 'u' || e.key === 'U' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); onUndo(); }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlace(); }
}

// ===== Undo =====
function cloneGrid(g) {
  return g.map(row => row.map(cell => ({ ...cell })));
}

function pushUndo() {
  undoStack.push({
    grid: cloneGrid(grid),
    currentTileIndex,
    skippedCount,
  });
  $btnUndo.disabled = false;
}

function onUndo() {
  if (gameOver || undoStack.length === 0) return;
  const snapshot = undoStack.pop();
  grid = snapshot.grid;
  currentTileIndex = snapshot.currentTileIndex;
  skippedCount = snapshot.skippedCount;
  clearPending();

  loadCurrentTile();
  renderGrid();
  renderTilePreview();
  renderSequence();
  updateHUD();

  $btnUndo.disabled = undoStack.length === 0;
  saveProgress();
}

// ===== Game Actions =====
function doPlace(r, c) {
  pushUndo();
  const placed = placeTile(grid, currentShape, r, c, currentType);

  for (const [pr, pc] of placed) {
    const $cell = $grid.querySelector(`[data-row="${pr}"][data-col="${pc}"]`);
    if ($cell) {
      $cell.className = `cell cell--${currentType} cell--just-placed`;
      $cell.style.removeProperty('background');
      const $e = $cell.querySelector('.cell-emoji');
      if ($e) $e.remove();
    }
  }

  haptic(15);
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
    renderSequence();
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
  showPostGamePanel(result);

  setTimeout(() => showGameOver(result), 400);
}

function showTilePanel() {
  const $tilePanel = document.getElementById('tile-panel');
  const $postGame = document.getElementById('post-game-panel');
  $tilePanel.classList.remove('hidden');
  if ($postGame) $postGame.remove();
}

function showPostGamePanel(result) {
  const $tilePanel = document.getElementById('tile-panel');
  $tilePanel.classList.add('hidden');

  const existing = document.getElementById('post-game-panel');
  if (existing) existing.remove();

  const d = result.details;
  const groupRows = COLORS.map(c =>
    `<div class="score-row"><span class="label"><span class="legend-swatch" style="background:var(--${c});display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:middle;margin-right:4px"></span>${COLOR_NAMES[c]}</span><span class="value positive">+${d.groups[c]}</span></div>`
  ).join('');

  const $panel = document.createElement('div');
  $panel.id = 'post-game-panel';
  $panel.innerHTML = `
    <div class="score-breakdown">
      ${groupRows}
      ${d.treesUncovered ? `<div class="score-row"><span class="label">\u{1F332} Trees</span><span class="value positive">+${d.treesUncovered}</span></div>` : ''}
      ${d.rocksUncovered ? `<div class="score-row"><span class="label">\u{1FAA8} Rocks</span><span class="value negative">-${d.rocksUncovered}</span></div>` : ''}
      ${d.skippedTiles ? `<div class="score-row"><span class="label">Skipped (${d.skippedTiles})</span><span class="value negative">-${d.skippedTiles * 2}</span></div>` : ''}
      <div class="score-row"><span class="label">Total</span><span class="value">${result.total}</span></div>
    </div>
    <div class="post-game-actions">
      <button class="btn-share" id="btn-share-inline">Share</button>
      <button class="btn-share" id="btn-details-inline" style="background:var(--bg-surface);color:var(--text);border:1px solid var(--border-color);">Details</button>
    </div>
  `;

  document.getElementById('game-area').appendChild($panel);

  document.getElementById('btn-share-inline').addEventListener('click', async () => {
    const text = generateShareText(grid, result.total, puzzleNumber, boardVariant);
    await copyToClipboard(text);
    showToast('Copied to clipboard!');
  });

  document.getElementById('btn-details-inline').addEventListener('click', () => {
    showGameOver(result);
  });
}

// ===== Menu =====
function toggleMenu() {
  $headerMenu.classList.toggle('hidden');
}

function closeMenu() {
  $headerMenu.classList.add('hidden');
}

function showEndConfirm() {
  if (gameOver) return;
  const remaining = tileSequence.length - currentTileIndex;

  openModal(`
    <h2>End Game?</h2>
    <p>${remaining} tile${remaining === 1 ? '' : 's'} remaining. Remaining tiles won't count against you.</p>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn-share" id="btn-cancel-end" style="background:var(--bg-surface);color:var(--text);border:1px solid var(--border-color);flex:1;">Keep Playing</button>
      <button class="btn-share" id="btn-confirm-end" style="flex:1;">End Game</button>
    </div>
  `);

  document.getElementById('btn-cancel-end').addEventListener('click', closeModal);
  document.getElementById('btn-confirm-end').addEventListener('click', () => {
    closeModal();
    endGame();
  });
}

function showRestartConfirm() {
  openModal(`
    <h2>Restart Puzzle?</h2>
    <p>Your current progress will be lost.</p>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn-share" id="btn-cancel-restart" style="background:var(--bg-surface);color:var(--text);border:1px solid var(--border-color);flex:1;">Cancel</button>
      <button class="btn-share" id="btn-confirm-restart" style="background:var(--accent);flex:1;">Restart</button>
    </div>
  `);

  document.getElementById('btn-cancel-restart').addEventListener('click', closeModal);
  document.getElementById('btn-confirm-restart').addEventListener('click', () => {
    closeModal();
    clearGameState();
    startNewGame();
  });
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

  const groupRows = COLORS.map(c =>
    `<div class="score-row"><span class="label"><span class="legend-swatch" style="background:var(--${c});display:inline-block;width:14px;height:14px;border-radius:2px;vertical-align:middle;margin-right:4px"></span>${COLOR_NAMES[c]} group</span><span class="value positive">+${d.groups[c]}</span></div>`
  ).join('');

  const html = `
    <div class="game-over-title">${displayPuzzleLabel()}</div>
    <div class="game-over-score">${result.total}</div>
    <div class="game-over-stars">${'\u2B50'.repeat(stars)}${'\u2606'.repeat(5 - stars)}</div>

    <div class="score-breakdown">
      ${groupRows}
      ${d.treesUncovered ? `<div class="score-row"><span class="label">\u{1F332} Trees preserved</span><span class="value positive">+${d.treesUncovered}</span></div>` : ''}
      ${d.rocksUncovered ? `<div class="score-row"><span class="label">\u{1FAA8} Uncovered rocks</span><span class="value negative">-${d.rocksUncovered}</span></div>` : ''}
      ${d.skippedTiles ? `<div class="score-row"><span class="label">Skipped tiles (${d.skippedTiles})</span><span class="value negative">-${d.skippedTiles * 2}</span></div>` : ''}
      <div class="score-row"><span class="label">Total</span><span class="value">${result.total}</span></div>
    </div>

    <button class="btn-share" id="btn-share-result">Share Result</button>
  `;

  openModal(html);

  document.getElementById('btn-share-result').addEventListener('click', async () => {
    const text = generateShareText(grid, result.total, puzzleNumber, boardVariant);
    await copyToClipboard(text);
    showToast('Copied to clipboard!');
  });
}

function showAlreadyCompleted() {
  const stats = loadStats();
  const todayScore = stats.scores.find(s => s.puzzle === puzzleNumber);

  // Find the next unplayed board variant
  let nextVariant = boardVariant + 1;
  const nextPuzzle = getPuzzleNumber(nextVariant);
  const nextAlsoPlayed = stats.scores.some(s => s.puzzle === nextPuzzle);
  const extraBoardBtn = nextAlsoPlayed
    ? ''
    : `<a href="?board=${nextVariant}" class="btn-share" style="display:block;text-align:center;margin-top:8px;text-decoration:none;">Play Extra Board</a>`;

  openModal(`
    <div class="game-over-title">Already Played!</div>
    <p style="text-align:center; margin: 16px 0;">You've already completed ${boardVariant > 1 ? 'this extra board' : "today's puzzle"}.</p>
    ${todayScore ? `<div class="game-over-score">${todayScore.score}</div><div class="game-over-stars">${'\u2B50'.repeat(getStars(todayScore.score))}</div>` : ''}
    <p style="text-align:center; color: var(--text-muted);">Come back tomorrow for a new puzzle!</p>
    <button class="btn-share" id="btn-share-result" style="margin-top: 16px;">Share Result</button>
    ${extraBoardBtn}
  `);

  document.getElementById('btn-share-result').addEventListener('click', async () => {
    const text = generateShareText(grid, todayScore?.score || 0, puzzleNumber, boardVariant);
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
      <p>Build your city by placing colored tiles on the grid. Each day everyone gets the same tiles in the same order.</p>
    </div>

    <div class="help-section">
      <h3>Placement</h3>
      <p>Tiles must be placed <strong>next to the river</strong> or <strong>next to existing tiles</strong>. You grow your city outward from the river.</p>
    </div>

    <div class="help-section">
      <h3>Controls</h3>
      <p><strong>Tap the grid</strong> or <strong>drag from the preview</strong> to position a tile.<br>
      <strong>Tap the preview</strong> or press <strong>R</strong> to rotate.<br>
      Press <strong>Place</strong> to confirm.<br>
      <strong>Skip</strong> (S) to discard a tile (-2 pts).<br>
      <strong>Undo</strong> (U / Ctrl+Z) to take back a move.</p>
    </div>

    <div class="help-section">
      <h3>Colors</h3>
      <div class="building-legend">
        <div class="legend-item"><div class="legend-swatch" style="background:var(--rust)"></div><strong>Rust</strong></div>
        <div class="legend-item"><div class="legend-swatch" style="background:var(--sand)"></div><strong>Sand</strong></div>
        <div class="legend-item"><div class="legend-swatch" style="background:var(--sage)"></div><strong>Sage</strong></div>
      </div>
    </div>

    <div class="help-section">
      <h3>Scoring</h3>
      <p>Your <strong>largest connected group</strong> of each color scores points equal to its size. Groups connect horizontally and vertically (not diagonally).<br>
      \u{1F332} Trees left uncovered: +1 each<br>
      \u{1FAA8} Rocks left uncovered: -1 each<br>
      Skipped tiles: -2 each</p>
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
