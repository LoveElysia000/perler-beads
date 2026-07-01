// Main application logic
import { autoRemoveBorderBackground, cloneGrid, excludeAndRemapColor } from './grid-operations.js';
import { renderPattern, computeCellSize } from './renderer.js';
import { downloadPNG, downloadCSV, printPattern } from './exporter.js';
import { buildPaletteFromMapping, validateColorSystemMapping, getColorCode, getColorEntry, COLOR_SYSTEMS, DEFAULT_COLOR_SYSTEM } from './color-systems.js';

const SAMPLE_SCALE = 6;

// ── State ──
let worker = null;
let currentImage = null;       // original Image object
let currentGrid = null;        // { grid, counts }
let currentColorSystem = DEFAULT_COLOR_SYSTEM;
let highlightHex = null;
let showCodes = true;
let zoomLevel = 1;
let colorMapping = {};
let unifiedPalette = [];
let gridActionSnapshot = null;
let excludedColorHexes = new Set();
let pendingExcludedColorHexes = null;

// ── DOM ──
const $ = (id) => document.getElementById(id);

function setStatus(text, isError = false) {
  const el = $('statusMessage');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('!bg-red-100', isError);
  el.classList.toggle('!text-red-800', isError);
  el.classList.remove('hidden');
}

function clearStatus() {
  $('statusMessage')?.classList.add('hidden');
}

// ── Worker Init ──
function initWorker() {
  worker = new Worker('/js/worker.js', { type: 'module' });
  worker.onmessage = handleWorkerMessage;
  fetch('/palettes/color-system-mapping.json')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(mapping => {
      const validation = validateColorSystemMapping(mapping);
      if (validation.errors.length > 0) {
        setStatus('色号映射数据无效，请检查数据文件。', true);
        console.error('Color mapping validation errors:', validation.errors);
        return;
      }
      if (validation.warnings.length > 0) {
        console.warn('Color mapping warnings:', validation.warnings);
      }
      colorMapping = mapping;
      unifiedPalette = buildPaletteFromMapping(mapping);
      worker.postMessage({ type: 'init', payload: { palette: unifiedPalette } });
      clearStatus();
    })
    .catch(err => {
      setStatus('色号映射加载失败，请刷新重试。', true);
      console.error('Failed to load color system mapping:', err);
    });
}

function handleWorkerMessage(e) {
  const { type, payload } = e.data;
  if (type === 'ready') {
    console.log('Worker ready with unified color system palette');
  } else if (type === 'result') {
    currentGrid = applyPendingColorExclusions(payload);
    renderFromGrid();
    updateCountsList();
    refreshExcludedColorsPanel();
    $('exportSection').classList.remove('hidden');
    $('countsSection').classList.remove('hidden');
    $('generateBtn').disabled = false;
    $('generateBtn').innerHTML = '<span class="material-symbols-outlined">replay</span>重新生成';
  }
}

// ── Image Loading ──
function loadImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      $('generateBtn').disabled = unifiedPalette.length === 0;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Aspect Ratio ──
function prepareSourceImageData(img, targetW, targetH, mode) {
  const canvas = document.createElement('canvas');
  canvas.width = targetW * SAMPLE_SCALE;
  canvas.height = targetH * SAMPLE_SCALE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const outputW = canvas.width;
  const outputH = canvas.height;
  const imgRatio = img.width / img.height;
  const targetRatio = targetW / targetH;

  if (mode === 'fill') {
    ctx.drawImage(img, 0, 0, outputW, outputH);
  } else if (mode === 'fit') {
    let dw, dh;
    if (imgRatio > targetRatio) { dw = outputW; dh = outputW / imgRatio; }
    else { dh = outputH; dw = outputH * imgRatio; }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputW, outputH);
    ctx.drawImage(img, (outputW - dw) / 2, (outputH - dh) / 2, dw, dh);
  } else {
    let sw, sh;
    if (imgRatio > targetRatio) { sh = img.height; sw = img.height * targetRatio; }
    else { sw = img.width; sh = img.width / targetRatio; }
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, outputW, outputH);
  }
  return ctx.getImageData(0, 0, outputW, outputH);
}

// ── Matching ──
function runMatch(options = {}) {
  if (!currentImage || !worker) return;
  const w = parseInt($('gridW').value) || 58;
  const h = parseInt($('gridH').value) || 58;
  const mode = $('aspectMode').value;

  $('previewEmpty').classList.add('hidden');
  $('previewArea').classList.remove('hidden');
  $('generateBtn').disabled = true;
  $('generateBtn').textContent = '处理中...';
  const pendingExclusions = options.excludedColorHexes || null;
  if (pendingExclusions) {
    pendingExcludedColorHexes = new Set(pendingExclusions);
  }
  resetGridActionState({ preservePending: Boolean(pendingExclusions) });

  const processed = prepareSourceImageData(currentImage, w, h, mode);

  let skipColor = null;
  if ($('enableSkipColor').checked) {
    const hex = $('skipColorPicker').value;
    skipColor = [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
  }

  worker.postMessage({
    type: 'match',
    payload: {
      imageData: processed,
      gridW: w, gridH: h,
      skipColor,
      skipTransparent: $('skipTransparent').checked,
      fidelity: parseInt($('fidelity').value) || 60,
      samplingMode: $('samplingMode')?.value || 'lineart'
    }
  });
}

// ── Rendering ──
function renderFromGrid() {
  if (!currentGrid) return;
  const w = currentGrid.grid[0].length, h = currentGrid.grid.length;
  const container = $('previewContainer');
  const cellSize = computeCellSize(w, h, container.clientWidth - 20, container.clientHeight - 20) * zoomLevel;

  renderPattern($('patternCanvas'), currentGrid.grid, {
    showCodes,
    showBoardLines: true,
    highlightColor: highlightHex,
    cellSize,
    colorSystem: currentColorSystem,
    colorMapping,
  });
}

function saveGridActionSnapshot() {
  if (!currentGrid) return;
  gridActionSnapshot = {
    grid: cloneGrid(currentGrid.grid),
    counts: { ...currentGrid.counts },
    excludedColorHexes: new Set(excludedColorHexes),
  };
  $('undoGridActionBtn').disabled = false;
}

function refreshExcludedColorsPanel() {
  const panel = $('excludedColorsPanel');
  const list = $('excludedColorsList');
  if (!panel || !list) return;
  panel.classList.toggle('hidden', excludedColorHexes.size === 0);
  list.innerHTML = [...excludedColorHexes].map((hex) => `
    <li class="flex items-center justify-between gap-2">
      <span>${getColorCode(hex, currentColorSystem, colorMapping)} ${hex}</span>
      <button class="restore-excluded-color-btn rounded border border-outline-variant px-2 py-1" data-restore-hex="${hex}" type="button">恢复</button>
    </li>`).join('');
  list.querySelectorAll('.restore-excluded-color-btn').forEach((btn) => {
    btn.addEventListener('click', () => restoreExcludedColor(btn.dataset.restoreHex));
  });
}

function restoreGridActionSnapshot() {
  if (!gridActionSnapshot) return;
  currentGrid = {
    grid: cloneGrid(gridActionSnapshot.grid),
    counts: { ...gridActionSnapshot.counts },
  };
  excludedColorHexes = new Set(gridActionSnapshot.excludedColorHexes);
  gridActionSnapshot = null;
  $('undoGridActionBtn').disabled = true;
  renderFromGrid();
  updateCountsList();
  refreshExcludedColorsPanel();
}

function restoreExcludedColor(hex) {
  if (!excludedColorHexes.has(hex)) return;
  const remainingExcludedColorHexes = new Set(excludedColorHexes);
  remainingExcludedColorHexes.delete(hex);
  excludedColorHexes = remainingExcludedColorHexes;
  refreshExcludedColorsPanel();
  if (currentImage) runMatch({ excludedColorHexes: remainingExcludedColorHexes });
}

function resetGridActionState(options = {}) {
  gridActionSnapshot = null;
  excludedColorHexes = new Set();
  if (!options.preservePending) pendingExcludedColorHexes = null;
  $('undoGridActionBtn').disabled = true;
  refreshExcludedColorsPanel();
}

function applyPendingColorExclusions(gridResult) {
  if (!pendingExcludedColorHexes?.size) return gridResult;

  let nextGrid = cloneGrid(gridResult.grid);
  let nextCounts = { ...gridResult.counts };
  const applied = new Set();
  const blockedExcludedColorHexes = [];

  for (const hex of pendingExcludedColorHexes) {
    const allowedHexes = new Set(Object.keys(nextCounts).filter((h) => !pendingExcludedColorHexes.has(h)));
    const result = excludeAndRemapColor(nextGrid, hex, allowedHexes);
    if (result.blocked) {
      blockedExcludedColorHexes.push(hex);
      continue;
    }
    nextGrid = result.grid;
    nextCounts = result.counts;
    if (result.remappedCount > 0) applied.add(hex);
  }

  excludedColorHexes = new Set([...applied, ...blockedExcludedColorHexes]);
  pendingExcludedColorHexes = null;
  if (blockedExcludedColorHexes.length > 0) {
    alert(`无法继续排除 ${blockedExcludedColorHexes.map(h => getColorCode(h, currentColorSystem, colorMapping)).join(', ')}，因为没有可替代颜色。`);
  }
  return { grid: nextGrid, counts: nextCounts };
}

// ── Counts List ──
function updateCountsList() {
  if (!currentGrid) return;
  const entries = Object.entries(currentGrid.counts).sort((a, b) => b[1] - a[1]);
  const totalBeads = entries.reduce((s, [, c]) => s + c, 0);
  $('colorStats').textContent = `${entries.length} 色 · ${totalBeads} 颗`;

  const hexToRgbMap = new Map();
  for (const gridRow of currentGrid.grid) {
    for (const cell of gridRow) {
      if (cell?.hex && cell.rgb && !hexToRgbMap.has(cell.hex)) {
        hexToRgbMap.set(cell.hex, cell.rgb);
      }
    }
  }

  $('countsList').innerHTML = entries.map(([hex, count]) => {
    if (!getColorEntry(hex, colorMapping)) return '';
    const code = getColorCode(hex, currentColorSystem, colorMapping);
    const rgb = hexToRgbMap.get(hex) || [128, 128, 128];
    const [r, g, b] = rgb;

    return `<li data-hex="${hex}">
      <span class="swatch" style="background:rgb(${r},${g},${b})"></span>
      <span class="name">${code} ${hex}</span>
      <span class="count">×${count}</span>
      <button class="exclude-color-btn" data-exclude-hex="${hex}" type="button">排除</button>
    </li>`;
  }).join('');

  $('countsList').querySelectorAll('li').forEach(li => {
    li.addEventListener('click', (event) => {
      if (event.target.closest('.exclude-color-btn')) return;
      $('countsList').querySelectorAll('li').forEach(l => l.classList.remove('highlighted'));
      highlightHex = highlightHex === li.dataset.hex ? null : li.dataset.hex;
      if (highlightHex) li.classList.add('highlighted');
      renderFromGrid();
    });
  });

  $('countsList').querySelectorAll('.exclude-color-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!currentGrid) return;
      const hex = btn.dataset.excludeHex;
      saveGridActionSnapshot();
      const allowedHexes = new Set(Object.keys(currentGrid.counts).filter((h) => !excludedColorHexes.has(h)));
      const result = excludeAndRemapColor(currentGrid.grid, hex, allowedHexes);
      if (result.blocked) {
        restoreGridActionSnapshot();
        alert(`无法排除 ${getColorCode(hex, currentColorSystem, colorMapping)}，因为没有可替代颜色。`);
        return;
      }
      excludedColorHexes.add(hex);
      currentGrid = { grid: result.grid, counts: result.counts };
      if (highlightHex === hex) highlightHex = null;
      renderFromGrid();
      updateCountsList();
      refreshExcludedColorsPanel();
    });
  });
}

// ── Event Listeners ──
$('dropZone').addEventListener('dragover', (e) => { e.preventDefault(); $('dropZone').classList.add('drag-over'); });
$('dropZone').addEventListener('dragleave', () => $('dropZone').classList.remove('drag-over'));
$('dropZone').addEventListener('drop', (e) => {
  e.preventDefault(); $('dropZone').classList.remove('drag-over');
  loadImage(e.dataTransfer.files[0]);
});

$('fileBtn').addEventListener('click', () => $('fileInput').click());
$('dropZone').addEventListener('click', (e) => {
  if (e.target !== $('fileBtn')) $('fileInput').click();
});
$('fileInput').addEventListener('change', (e) => { loadImage(e.target.files[0]); });

document.addEventListener('paste', (e) => {
  for (const item of e.clipboardData?.items || []) {
    if (item.type.startsWith('image/')) { loadImage(item.getAsFile()); break; }
  }
});

document.querySelectorAll('[data-w]').forEach(btn => {
  btn.addEventListener('click', () => {
    $('gridW').value = btn.dataset.w;
    $('gridH').value = btn.dataset.h;
  });
});

$('colorSystemSelect').addEventListener('change', (e) => {
  currentColorSystem = e.target.value;
  if (currentGrid) {
    renderFromGrid();
    updateCountsList();
  }
});

$('samplingMode').addEventListener('change', () => {
  if (currentImage) runMatch();
});

$('enableSkipColor').addEventListener('change', (e) => {
  $('skipColorPicker').disabled = !e.target.checked;
});

$('skipColorPicker').addEventListener('input', () => {
  $('skipColorHex').textContent = $('skipColorPicker').value;
});

let fidelityTimer = null;
$('fidelity').addEventListener('input', () => {
  const pct = parseInt($('fidelity').value);
  const labels = { 3: '最少色', 30: '经济', 60: '平衡', 80: '高质量', 100: '原色' };
  const closest = Object.keys(labels).reduce((a, b) => Math.abs(+b - pct) < Math.abs(+a - pct) ? b : a);
  $('fidelityLabel').textContent = labels[closest];

  clearTimeout(fidelityTimer);
  fidelityTimer = setTimeout(() => { if (currentImage) runMatch(); }, 200);
});

$('generateBtn').addEventListener('click', () => { if (currentImage && unifiedPalette.length > 0) runMatch(); });

$('viewColor').addEventListener('click', () => {
  showCodes = false;
  $('viewColor').className = 'rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-primary transition';
  $('viewCode').className = 'rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 text-xs font-bold uppercase tracking-wider text-secondary transition hover:bg-surface-container-high';
  renderFromGrid();
});
$('viewCode').addEventListener('click', () => {
  showCodes = true;
  $('viewCode').className = 'rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-primary transition';
  $('viewColor').className = 'rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 text-xs font-bold uppercase tracking-wider text-secondary transition hover:bg-surface-container-high';
  renderFromGrid();
});

$('zoomInBtn').addEventListener('click', () => { zoomLevel = Math.min(4, zoomLevel + 0.25); renderFromGrid(); });
$('zoomOutBtn').addEventListener('click', () => { zoomLevel = Math.max(0.25, zoomLevel - 0.25); renderFromGrid(); });

$('downloadPNGBtn').addEventListener('click', () => downloadPNG($('patternCanvas')));
$('downloadCSVBtn').addEventListener('click', () => {
  if (currentGrid) downloadCSV(currentGrid.counts, currentColorSystem, colorMapping);
});
$('printBtn').addEventListener('click', () => {
  if (currentGrid) printPattern($('patternCanvas'), currentGrid.grid[0].length, currentGrid.grid.length);
});
$('removeBackgroundBtn').addEventListener('click', () => {
  if (!currentGrid) return;
  saveGridActionSnapshot();
  const result = autoRemoveBorderBackground(currentGrid.grid);
  if (result.removedCount === 0) {
    restoreGridActionSnapshot();
    alert('未找到可去除的连通背景。');
    return;
  }
  currentGrid = { grid: result.grid, counts: result.counts };
  renderFromGrid();
  updateCountsList();
  refreshExcludedColorsPanel();
});
$('undoGridActionBtn').addEventListener('click', restoreGridActionSnapshot);

// ── Init ──
initWorker();
