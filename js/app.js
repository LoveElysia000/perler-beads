// Main application logic
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
    currentGrid = payload;
    renderFromGrid();
    updateCountsList();
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
function applyAspectRatio(img, targetW, targetH, mode) {
  const canvas = document.createElement('canvas');
  canvas.width = targetW; canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  const imgRatio = img.width / img.height;
  const targetRatio = targetW / targetH;

  if (mode === 'fill') {
    ctx.drawImage(img, 0, 0, targetW, targetH);
  } else if (mode === 'fit') {
    let dw, dh;
    if (imgRatio > targetRatio) { dw = targetW; dh = targetW / imgRatio; }
    else { dh = targetH; dw = targetH * imgRatio; }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
  } else {
    let sw, sh;
    if (imgRatio > targetRatio) { sh = img.height; sw = img.height * targetRatio; }
    else { sw = img.width; sh = img.width / targetRatio; }
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, targetW, targetH);
  }
  return ctx.getImageData(0, 0, targetW, targetH);
}

// ── Matching ──
function runMatch() {
  if (!currentImage || !worker) return;
  const w = parseInt($('gridW').value) || 58;
  const h = parseInt($('gridH').value) || 58;
  const mode = $('aspectMode').value;

  $('previewEmpty').classList.add('hidden');
  $('previewArea').classList.remove('hidden');
  $('generateBtn').disabled = true;
  $('generateBtn').textContent = '处理中...';

  const processed = applyAspectRatio(currentImage, w, h, mode);

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
      fidelity: parseInt($('fidelity').value) || 60
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
    </li>`;
  }).join('');

  $('countsList').querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      $('countsList').querySelectorAll('li').forEach(l => l.classList.remove('highlighted'));
      highlightColor = highlightColor === li.dataset.id ? null : li.dataset.id;
      if (highlightColor) li.classList.add('highlighted');
      renderFromGrid();
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
  if (currentGrid) downloadCSV(currentGrid.counts, currentBrand);
});
$('printBtn').addEventListener('click', () => {
  if (currentGrid) printPattern($('patternCanvas'), currentGrid.grid[0].length, currentGrid.grid.length);
});

// ── Init ──
initWorker();
