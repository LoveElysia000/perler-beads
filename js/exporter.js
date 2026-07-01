// Export utilities: PNG download, CSV shopping list, print
import { getColorCode } from './color-systems.js';

export function downloadPNG(canvas, filename = 'perler-pattern.png') {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (/[,"\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function formatShoppingListCSV(counts, colorSystem, mapping = {}) {
  const rows = [
    ['code', 'hex', 'count'],
    ...Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([hex, count]) => [getColorCode(hex, colorSystem, mapping), hex, count])
  ];

  return '\uFEFF' + rows
    .map(row => row.map(escapeCsvCell).join(','))
    .join('\n');
}

export function downloadCSV(counts, colorSystem, mapping = {}) {
  const csv = formatShoppingListCSV(counts, colorSystem, mapping);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${colorSystem}-shopping-list.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function printPattern(canvas, gridW, gridH) {
  const BOARD = 29, CELL = 16;
  const boardsX = Math.ceil(gridW / BOARD), boardsY = Math.ceil(gridH / BOARD);

  const win = window.open('', '_blank', 'width=900,height=700');
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>拼豆图纸</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,sans-serif;padding:20px;color:#1e293b}
  .page{page-break-after:always;margin-bottom:24px}
  .page:last-child{page-break-after:auto}
  .label{font-size:13px;font-weight:600;color:#64748b;margin-bottom:4px}
  img{display:block;image-rendering:pixelated;border:1px solid #e2e8f0}
  @media print{.no-print{display:none}}
</style></head><body>`;

  html += `<h2 class="no-print" style="margin-bottom:12px">拼豆图纸 ${gridW}×${gridH} — ${boardsX}×${boardsY} 块底板</h2>`;

  for (let by = 0; by < boardsY; by++) {
    for (let bx = 0; bx < boardsX; bx++) {
      const bc = document.createElement('canvas');
      bc.width = BOARD * CELL; bc.height = BOARD * CELL;
      const bctx = bc.getContext('2d');
      const sx = bx * BOARD * CELL, sy = by * BOARD * CELL;
      const sw = Math.min(BOARD * CELL, canvas.width - sx);
      const sh = Math.min(BOARD * CELL, canvas.height - sy);
      bctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      html += `<div class="page"><div class="label">底板 [${by + 1},${bx + 1}]</div>`;
      html += `<img src="${bc.toDataURL()}" style="width:${sw}px;height:${sh}px"></div>`;
    }
  }

  html += '</body></html>';
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}
