/**
 * Bird City -- Main application module.
 */

import { COLS, ROWS, createGrid, canPlace, placeTile } from './grid.js';
import { COLORS, rotateShape, shapeBounds, getShape } from './tiles.js';
import { calculateScore, getStars, runningScore } from './scoring.js';
import { getPuzzleNumber, getDayNumber, getBoardVariant, generateTileSequence, createGridRNG } from './daily.js';
import { generateShareText, copyToClipboard } from './share.js';
import { loadStats, recordGame, saveGameState, loadGameState, clearGameState, hasCompletedToday, saveCompletedGame, loadCompletedGame } from './stats.js';
import { initI18n, t, getLang, setLang, getAvailableLanguages } from './i18n.js';

// ===== Emoji maps =====
const TERRAIN_EMOJI = {
  empty: '',
  rock: '\u{1FAA8}',
  tree: '\u{1F332}',
  river: '',
};

// Color display names (localized via i18n)
function getColorName(color) {
  return t(color);
}

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
let hardMode = false;

// Undo (single-step only -- prevents peeking at tile order)
let undoSnapshot = null;

// ===== Hard mode persistence =====
const HARD_MODE_KEY = 'birdcity_hardmode';

function loadHardModePref() {
  try { return localStorage.getItem(HARD_MODE_KEY) === '1'; } catch { return false; }
}

function saveHardModePref(on) {
  try { localStorage.setItem(HARD_MODE_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}

// Drag state
let dragState = null; // { pointerId, startX, startY, dragging, source, $ghost }
let rafPending = false;
let lastPointerEvent = null;

// ===== DOM references =====
const $grid = document.getElementById('grid');
const $tilePreview = document.getElementById('tile-preview');
const $seqBar = document.getElementById('seq-bar');
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
const $modalOverlay = document.getElementById('modal-overlay');
const $modal = document.getElementById('modal');
const $modalContent = document.getElementById('modal-content');

// ===== Init =====
function displayPuzzleLabel() {
  const day = getDayNumber();
  const template = boardVariant > 1 ? t('puzzleLabelExtra') : t('puzzleLabel');
  return template.replace('%d', day);
}

function init() {
  boardVariant = getBoardVariant();
  puzzleNumber = getPuzzleNumber(boardVariant);
  bindEvents();

  if (hasCompletedToday(puzzleNumber)) {
    restoreCompletedView();
    return;
  }

  const saved = loadGameState();
  if (saved && saved.puzzleNumber === puzzleNumber) {
    restoreGame(saved);
  } else {
    startNewGame();
  }
}

function applyHardMode() {
  document.getElementById('app').classList.toggle('hard-mode', hardMode);
}

function startNewGame() {
  const gridRNG = createGridRNG(puzzleNumber);
  grid = createGrid(gridRNG);
  tileSequence = generateTileSequence(puzzleNumber);
  currentTileIndex = 0;
  skippedCount = 0;
  gameOver = false;
  undoSnapshot = null;
  $btnUndo.disabled = true;
  applyHardMode();
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
  hardMode = saved.hardMode || false;
  gameOver = false;
  undoSnapshot = null;
  $btnUndo.disabled = true;
  applyHardMode();
  clearPending();

  loadCurrentTile();
  renderGrid();
  renderTilePreview();
  renderSequence();
  updateHUD();
}

function restoreCompletedView() {
  const completed = loadCompletedGame(puzzleNumber);
  if (completed) {
    grid = completed.grid;
    skippedCount = completed.skippedCount;
  } else {
    // Fallback for games completed before this feature
    const gridRNG = createGridRNG(puzzleNumber);
    grid = createGrid(gridRNG);
    skippedCount = 0;
  }
  tileSequence = generateTileSequence(puzzleNumber);
  currentTileIndex = tileSequence.length;
  gameOver = true;
  undoSnapshot = null;

  renderGrid();
  updateHUD();
  document.getElementById('tile-panel').classList.add('hidden');

  // Show post-game actions if we have the completed board
  if (completed) {
    const result = calculateScore(grid, skippedCount);
    showPostGamePanel(result);
  }

  showAlreadyCompleted();
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
  $seqBar.innerHTML = '';

  // Sort by shape then color (hides sequence order)
  const tiles = tileSequence.map((t, i) => ({ ...t, idx: i }));
  tiles.sort((a, b) => a.shapeKey.localeCompare(b.shapeKey) || a.type.localeCompare(b.type));

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

    $seqBar.appendChild($shape);
  }
}

function updateHUD() {
  const score = runningScore(grid, skippedCount);
  $scoreDisplay.textContent = t('score').replace('%d', score);
  $tileCounter.textContent = currentTileIndex < tileSequence.length
    ? t('tileCounter').replace('%d', currentTileIndex + 1).replace('%d', tileSequence.length)
    : t('done');
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

  // Hard mode toggle in menu
  const $menuToggleHard = document.getElementById('menu-toggle-hard');
  $menuToggleHard.checked = hardMode;
  $menuToggleHard.addEventListener('change', () => {
    hardMode = $menuToggleHard.checked;
    saveHardModePref(hardMode);
    applyHardMode();
    // Clear undo snapshot when switching to hard mode
    if (hardMode) {
      undoSnapshot = null;
      $btnUndo.disabled = true;
    }
    saveProgress();
  });
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
  if (gameOver || hardMode) return;
  pushUndo();
  skippedCount++;
  clearPending();
  advanceTile();
}

function onKeyDown(e) {
  if (gameOver) return;
  if (e.key === 'r' || e.key === 'R') onRotate();
  if (!hardMode && (e.key === 's' || e.key === 'S')) onSkip();
  if (!hardMode && (e.key === 'u' || e.key === 'U' || (e.key === 'z' && (e.ctrlKey || e.metaKey)))) { e.preventDefault(); onUndo(); }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlace(); }
}

// ===== Undo =====
function cloneGrid(g) {
  return g.map(row => row.map(cell => ({ ...cell })));
}

function pushUndo() {
  undoSnapshot = {
    grid: cloneGrid(grid),
    currentTileIndex,
    skippedCount,
    currentShape: currentShape.map(([r, c]) => [r, c]),
  };
  $btnUndo.disabled = false;
}

function onUndo() {
  if (gameOver || hardMode || !undoSnapshot) return;
  grid = undoSnapshot.grid;
  currentTileIndex = undoSnapshot.currentTileIndex;
  skippedCount = undoSnapshot.skippedCount;
  const savedShape = undoSnapshot.currentShape;
  undoSnapshot = null;
  $btnUndo.disabled = true;
  clearPending();

  loadCurrentTile();
  if (savedShape) currentShape = savedShape;
  renderGrid();
  renderTilePreview();
  renderSequence();
  updateHUD();
  saveProgress();
}

// ===== Game Actions =====
function doPlace(r, c) {
  if (!hardMode) pushUndo();
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
    hardMode,
  });
}

function endGame() {
  gameOver = true;
  saveCompletedGame(puzzleNumber, grid, skippedCount);
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

  const $panel = document.createElement('div');
  $panel.id = 'post-game-panel';
  $panel.innerHTML = `
    <div class="post-game-actions">
      <button class="btn-share" id="btn-share-inline">${t('share')}</button>
      <button class="btn-share" id="btn-details-inline" style="background:var(--bg-surface);color:var(--text);border:1px solid var(--border-color);">${t('details')}</button>
    </div>
  `;

  document.getElementById('game-area').appendChild($panel);

  document.getElementById('btn-share-inline').addEventListener('click', async () => {
    const text = generateShareText(grid, result.total, puzzleNumber, boardVariant, skippedCount, hardMode);
    await copyToClipboard(text);
    showToast(t('copiedToClipboard'));
  });

  document.getElementById('btn-details-inline').addEventListener('click', () => {
    showGameOver(result);
  });
}

// ===== Menu =====
function toggleMenu() {
  // Sync hard mode toggle state before showing
  const $menuToggleHard = document.getElementById('menu-toggle-hard');
  if ($menuToggleHard) $menuToggleHard.checked = hardMode;
  $headerMenu.classList.toggle('hidden');
}

function closeMenu() {
  $headerMenu.classList.add('hidden');
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
    `<div class="score-row"><span class="label"><span class="legend-swatch" style="background:var(--${c});display:inline-block;width:14px;height:14px;border-radius:2px;vertical-align:middle;margin-right:4px"></span>${t('colorGroup').replace('%s', getColorName(c))}</span><span class="value positive">+${d.groups[c]}</span></div>`
  ).join('');

  const hardBadge = hardMode ? `<div style="text-align:center;margin-bottom:8px;"><span style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;">\u{1F525} ${t('hardModeBadge')}</span></div>` : '';

  const html = `
    <div class="game-over-title">${displayPuzzleLabel()}</div>
    ${hardBadge}
    <div class="game-over-score">${result.total}</div>
    <div class="game-over-stars">${'\u2B50'.repeat(stars)}${'\u2606'.repeat(5 - stars)}</div>

    <div class="score-breakdown">
      ${groupRows}
      ${d.treesUncovered ? `<div class="score-row"><span class="label">${t('treesPreserved').replace('%d', d.treesUncovered)}</span><span class="value positive">+${d.treesUncovered * 2}</span></div>` : ''}
      ${d.rocksUncovered ? `<div class="score-row"><span class="label">${t('uncoveredRocks').replace('%d', d.rocksUncovered)}</span><span class="value negative">-${d.rocksUncovered * 2}</span></div>` : ''}
      ${d.emptyUncovered ? `<div class="score-row"><span class="label">${t('openFields').replace('%d', d.emptyUncovered)}</span><span class="value negative">-${d.emptyUncovered}</span></div>` : ''}
      ${d.skippedTiles ? `<div class="score-row"><span class="label">${t('skippedTiles').replace('%d', d.skippedTiles)}</span><span class="value negative">-${d.skippedTiles * 2}</span></div>` : ''}
      <div class="score-row"><span class="label">${t('total')}</span><span class="value">${result.total}</span></div>
    </div>

    <button class="btn-share" id="btn-share-result">${t('shareResult')}</button>
  `;

  openModal(html);

  document.getElementById('btn-share-result').addEventListener('click', async () => {
    const text = generateShareText(grid, result.total, puzzleNumber, boardVariant, skippedCount, hardMode);
    await copyToClipboard(text);
    showToast(t('copiedToClipboard'));
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
    : `<a href="?board=${nextVariant}" class="btn-share" style="display:block;text-align:center;margin-top:8px;text-decoration:none;">${t('playExtraBoard')}</a>`;

  const completedMsg = boardVariant > 1 ? t('alreadyCompletedExtra') : t('alreadyCompletedMain');

  openModal(`
    <div class="game-over-title">${t('alreadyPlayed')}</div>
    <p style="text-align:center; margin: 16px 0;">${completedMsg}</p>
    ${todayScore ? `<div class="game-over-score">${todayScore.score}</div><div class="game-over-stars">${'\u2B50'.repeat(getStars(todayScore.score))}</div>` : ''}
    <p style="text-align:center; color: var(--text-muted);">${t('comeBackTomorrow')}</p>
    <button class="btn-share" id="btn-share-result" style="margin-top: 16px;">${t('shareResult')}</button>
    ${extraBoardBtn}
  `);

  document.getElementById('btn-share-result').addEventListener('click', async () => {
    const text = generateShareText(grid, todayScore?.score || 0, puzzleNumber, boardVariant, skippedCount, hardMode);
    await copyToClipboard(text);
    showToast(t('copiedToClipboard'));
  });
}

function showStats() {
  const stats = loadStats();
  const avg = stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;

  openModal(`
    <h2>${t('statistics')}</h2>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-value">${stats.gamesPlayed}</div><div class="stat-label">${t('played')}</div></div>
      <div class="stat-box"><div class="stat-value">${stats.currentStreak}</div><div class="stat-label">${t('streak')}</div></div>
      <div class="stat-box"><div class="stat-value">${stats.maxStreak}</div><div class="stat-label">${t('maxStreak')}</div></div>
      <div class="stat-box"><div class="stat-value">${stats.bestScore}</div><div class="stat-label">${t('best')}</div></div>
    </div>
    <div class="score-breakdown">
      <div class="score-row"><span class="label">${t('averageScore')}</span><span class="value">${avg}</span></div>
      <div class="score-row"><span class="label">${t('gamesPlayed')}</span><span class="value">${stats.gamesPlayed}</span></div>
    </div>
  `);
}

function showHelp() {
  openModal(`
    <h2>${t('helpTitle')}</h2>
    <div class="help-section">
      <p>${t('helpIntro')}</p>
    </div>

    <div class="help-section">
      <h3>${t('helpPlacementTitle')}</h3>
      <p>${t('helpPlacement')}</p>
    </div>

    <div class="help-section">
      <h3>${t('helpControlsTitle')}</h3>
      <p>${t('helpControls')}</p>
    </div>

    <div class="help-section">
      <h3>${t('helpHardModeTitle')}</h3>
      <p>${t('helpHardMode')}</p>
    </div>

    <div class="help-section">
      <h3>${t('helpColorsTitle')}</h3>
      <div class="building-legend">
        <div class="legend-item"><div class="legend-swatch" style="background:var(--rust)"></div><strong>${getColorName('rust')}</strong></div>
        <div class="legend-item"><div class="legend-swatch" style="background:var(--sand)"></div><strong>${getColorName('sand')}</strong></div>
        <div class="legend-item"><div class="legend-swatch" style="background:var(--sage)"></div><strong>${getColorName('sage')}</strong></div>
      </div>
    </div>

    <div class="help-section">
      <h3>${t('helpScoringTitle')}</h3>
      <p>${t('helpScoring')}</p>
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

// ===== Welcome Screen =====
function showWelcomeScreen() {
  const $welcome = document.getElementById('welcome-screen');
  const $app = document.getElementById('app');
  const $puzzleNum = document.getElementById('welcome-puzzle-number');
  const $date = document.getElementById('welcome-date');
  const $statsEl = document.getElementById('welcome-stats');
  const $toggleHard = document.getElementById('toggle-hard');

  // Puzzle number and date
  const dayNum = getDayNumber();
  $puzzleNum.textContent = t('puzzleNumber').replace('%d', dayNum);

  const today = new Date();
  $date.textContent = today.toLocaleDateString(t('dateLocale'), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Hard mode toggle
  $toggleHard.checked = loadHardModePref();
  $toggleHard.addEventListener('change', () => {
    saveHardModePref($toggleHard.checked);
  });

  // Show stats for returning players
  const stats = loadStats();
  if (stats.gamesPlayed > 0) {
    $statsEl.classList.remove('hidden');
    $statsEl.innerHTML = `
      <div class="welcome-stat">
        <div class="welcome-stat-value">${stats.gamesPlayed}</div>
        <div class="welcome-stat-label">${t('played')}</div>
      </div>
      <div class="welcome-stat">
        <div class="welcome-stat-value">${stats.currentStreak}</div>
        <div class="welcome-stat-label">${t('streak')}</div>
      </div>
      <div class="welcome-stat">
        <div class="welcome-stat-value">${stats.bestScore}</div>
        <div class="welcome-stat-label">${t('best')}</div>
      </div>
    `;
  }

  function startGame() {
    hardMode = $toggleHard.checked;
    $welcome.remove();
    init();
  }

  document.getElementById('btn-play').addEventListener('click', startGame);

  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    startGame();
    showHelp();
  });
}

// ===== i18n =====

/**
 * Apply translations to all elements with data-i18n attributes,
 * and update the page title.
 */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val !== key) el.textContent = val;
  });
  document.title = t('appName');
}

/**
 * Build the language switcher buttons inside the hamburger menu.
 */
function initLangSwitcher() {
  const $container = document.getElementById('lang-options');
  if (!$container) return;

  $container.innerHTML = '';
  for (const [code, name] of getAvailableLanguages()) {
    const $btn = document.createElement('button');
    $btn.className = 'lang-btn' + (code === getLang() ? ' lang-btn--active' : '');
    $btn.textContent = name;
    $btn.addEventListener('click', () => {
      if (code === getLang()) return;
      setLang(code);
      applyI18n();
      initLangSwitcher();
      closeMenu();
    });
    $container.appendChild($btn);
  }
}

// ===== Start =====
initI18n();
applyI18n();
initLangSwitcher();
showWelcomeScreen();
