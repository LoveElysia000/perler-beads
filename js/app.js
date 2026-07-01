// Main application logic
import { autoRemoveBorderBackground, cloneGrid, excludeAndRemapColor } from './grid-operations.js';
import { renderPattern, computeCellSize } from './renderer.js';
import { downloadPNG, downloadCSV, printPattern } from './exporter.js';

// ── State ──
let worker = null;
let currentImage = null;       // original Image object
let currentGrid = null;        // { grid, counts }
let currentBrand = 'hama';
let highlightColor = null;
let showCodes = true;
let zoomLevel = 1;
let paletteCache = {};
let gridActionSnapshot = null;
let excludedColorIds = new Set();
let pendingExcludedColorIds = null;

// ── DOM ──
const $ = (id) => document.getElementById(id);

// ── Worker Init ──
function initWorker() {
  worker = new Worker('/js/worker.js', { type: 'module' });
  worker.onmessage = handleWorkerMessage;
  Promise.all([
    fetch('/palettes/perler.json').then(r => r.json()),
    fetch('/palettes/hama.json').then(r => r.json()),
    fetch('/palettes/artkal_c.json').then(r => r.json()),
  ]).then(([perler, hama, artkal]) => {
    paletteCache = { perler, hama, artkal_c: artkal };
    worker.postMessage({ type: 'init', payload: { palettes: paletteCache } });
  }).catch(err => console.error('Failed to load palettes:', err));
}

function handleWorkerMessage(e) {
  const { type, payload } = e.data;
  if (type === 'ready') {
    console.log('Worker ready');
  } else if (type === 'result') {
    currentGrid = applyPendingColorExclusions(payload);
    renderFromGrid();
    updateCountsList();
    refreshExcludedColorsPanel();
    $('exportSection').classList.remove('hidden');
    $('countsSection').classList.remove('hidden');
    $('generateBtn').disabled = false;
    $('generateBtn').innerHTML = '<span class="material-symbols-outlined">replay</span>重新生成';
  } else if (type === 'recommendation') {
    showBrandRecommendation(payload);
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
      $('generateBtn').disabled = false;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Aspect Ratio ──
function prepareSourceImageData(img, targetW, targetH, mode) {
  const targetRatio = targetW / targetH;
  const imgRatio = img.width / img.height;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (mode === 'fit') {
    if (imgRatio > targetRatio) {
      canvas.width = img.width;
      canvas.height = Math.max(1, Math.round(img.width / targetRatio));
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, Math.round((canvas.height - img.height) / 2));
    } else {
      canvas.height = img.height;
      canvas.width = Math.max(1, Math.round(img.height * targetRatio));
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, Math.round((canvas.width - img.width) / 2), 0);
    }
  } else if (mode === 'crop') {
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgRatio > targetRatio) {
      sw = Math.round(img.height * targetRatio);
      sx = Math.round((img.width - sw) / 2);
    } else {
      sh = Math.round(img.width / targetRatio);
      sy = Math.round((img.height - sh) / 2);
    }
    canvas.width = sw;
    canvas.height = sh;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
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
  const pendingExclusions = options.excludedColorIds || null;
  if (pendingExclusions) {
    pendingExcludedColorIds = new Set(pendingExclusions);
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
      brand: currentBrand,
      gridW: w, gridH: h,
      skipColor,
      skipTransparent: $('skipTransparent').checked,
      fidelity: parseInt($('fidelity').value) || 60,
      samplingMode: $('samplingMode')?.value || 'lineart'
    }
  });

  worker.postMessage({
    type: 'recommend',
    payload: { imageData: processed, gridW: w, gridH: h }
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
    highlightColor,
    cellSize
  });
}

function saveGridActionSnapshot() {
  if (!currentGrid) return;
  gridActionSnapshot = {
    grid: cloneGrid(currentGrid.grid),
    counts: { ...currentGrid.counts },
    excludedColorIds: new Set(excludedColorIds),
  };
  $('undoGridActionBtn').disabled = false;
}

function refreshExcludedColorsPanel() {
  const panel = $('excludedColorsPanel');
  const list = $('excludedColorsList');
  if (!panel || !list) return;
  panel.classList.toggle('hidden', excludedColorIds.size === 0);
  list.innerHTML = [...excludedColorIds].map((id) => `
    <li class="flex items-center justify-between gap-2">
      <span>${id}</span>
      <button class="restore-excluded-color-btn rounded border border-outline-variant px-2 py-1" data-restore-id="${id}" type="button">恢复</button>
    </li>`).join('');
  list.querySelectorAll('.restore-excluded-color-btn').forEach((btn) => {
    btn.addEventListener('click', () => restoreExcludedColor(btn.dataset.restoreId));
  });
}

function restoreGridActionSnapshot() {
  if (!gridActionSnapshot) return;
  currentGrid = {
    grid: cloneGrid(gridActionSnapshot.grid),
    counts: { ...gridActionSnapshot.counts },
  };
  excludedColorIds = new Set(gridActionSnapshot.excludedColorIds);
  gridActionSnapshot = null;
  $('undoGridActionBtn').disabled = true;
  renderFromGrid();
  updateCountsList();
  refreshExcludedColorsPanel();
}

function restoreExcludedColor(id) {
  if (!excludedColorIds.has(id)) return;
  const remainingExcludedColorIds = new Set(excludedColorIds);
  remainingExcludedColorIds.delete(id);
  excludedColorIds = remainingExcludedColorIds;
  refreshExcludedColorsPanel();
  if (currentImage) runMatch({ excludedColorIds: remainingExcludedColorIds });
}

function resetGridActionState(options = {}) {
  gridActionSnapshot = null;
  excludedColorIds = new Set();
  if (!options.preservePending) pendingExcludedColorIds = null;
  $('undoGridActionBtn').disabled = true;
  refreshExcludedColorsPanel();
}

function applyPendingColorExclusions(gridResult) {
  if (!pendingExcludedColorIds?.size) return gridResult;

  let nextGrid = cloneGrid(gridResult.grid);
  let nextCounts = { ...gridResult.counts };
  const applied = new Set();
  const blockedExcludedColorIds = [];

  for (const id of pendingExcludedColorIds) {
    const allowedIds = new Set(Object.keys(nextCounts).filter((colorId) => !pendingExcludedColorIds.has(colorId)));
    const result = excludeAndRemapColor(nextGrid, id, allowedIds);
    if (result.blocked) {
      blockedExcludedColorIds.push(id);
      continue;
    }
    nextGrid = result.grid;
    nextCounts = result.counts;
    if (result.remappedCount > 0) applied.add(id);
  }

  excludedColorIds = new Set([...applied, ...blockedExcludedColorIds]);
  pendingExcludedColorIds = null;
  if (blockedExcludedColorIds.length > 0) {
    alert(`无法继续排除 ${blockedExcludedColorIds.join(', ')}，因为没有可替代颜色。`);
  }
  return { grid: nextGrid, counts: nextCounts };
}

// ── Counts List ──
function updateCountsList() {
  if (!currentGrid) return;
  const entries = Object.entries(currentGrid.counts).sort((a, b) => b[1] - a[1]);
  const palette = paletteCache[currentBrand];
  if (!palette) return;

  const paletteData = {};
  palette.colors.forEach(c => { paletteData[c.id] = c; });

  const totalBeads = entries.reduce((s, [, c]) => s + c, 0);
  $('colorStats').textContent = `${entries.length} 色 · ${totalBeads} 颗`;

  $('countsList').innerHTML = entries.map(([id, count]) => {
    const color = paletteData[id];
    if (!color) return '';
    const [r, g, b] = color.rgb;
    return `<li data-id="${id}">
      <span class="swatch" style="background:rgb(${r},${g},${b})"></span>
      <span class="name">${id} ${color.name}</span>
      <span class="count">×${count}</span>
      <button class="exclude-color-btn" data-exclude-id="${id}" type="button">排除</button>
    </li>`;
  }).join('');

  $('countsList').querySelectorAll('li').forEach(li => {
    li.addEventListener('click', (event) => {
      if (event.target.closest('.exclude-color-btn')) return;
      $('countsList').querySelectorAll('li').forEach(l => l.classList.remove('highlighted'));
      highlightColor = highlightColor === li.dataset.id ? null : li.dataset.id;
      if (highlightColor) li.classList.add('highlighted');
      renderFromGrid();
    });
  });

  $('countsList').querySelectorAll('.exclude-color-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!currentGrid) return;
      const id = btn.dataset.excludeId;
      saveGridActionSnapshot();
      const allowedIds = new Set(Object.keys(currentGrid.counts).filter((colorId) => !excludedColorIds.has(colorId)));
      const result = excludeAndRemapColor(currentGrid.grid, id, allowedIds);
      if (result.blocked) {
        restoreGridActionSnapshot();
        alert(`无法排除 ${id}，因为没有可替代颜色。`);
        return;
      }
      excludedColorIds.add(id);
      currentGrid = { grid: result.grid, counts: result.counts };
      if (highlightColor === id) highlightColor = null;
      renderFromGrid();
      updateCountsList();
      refreshExcludedColorsPanel();
    });
  });
}

function showBrandRecommendation(results) {
  const current = results[currentBrand];
  if (!current) return;
  let best = currentBrand, bestDist = current.avgDeltaE;
  for (const [name, r] of Object.entries(results)) {
    if (r.avgDeltaE < bestDist) { bestDist = r.avgDeltaE; best = name; }
  }
  if (best !== currentBrand) {
    const names = { perler: 'Perler', hama: 'Hama', artkal_c: 'Artkal C' };
    $('brandRecommend').textContent = `💡 推荐 ${names[best]}（ΔE ${bestDist} vs ${names[currentBrand]} ${current.avgDeltaE}）`;
    $('brandRecommend').classList.remove('hidden');
  } else {
    $('brandRecommend').classList.add('hidden');
  }
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

$('brandSelect').addEventListener('change', (e) => {
  currentBrand = e.target.value;
  if (currentImage) runMatch();
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

$('generateBtn').addEventListener('click', () => { if (currentImage) runMatch(); });

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
  if (currentGrid) downloadCSV(currentGrid.counts, currentBrand, paletteCache[currentBrand]);
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
