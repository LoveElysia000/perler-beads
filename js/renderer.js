// Canvas pattern renderer
import { getColorCode } from './color-systems.js';

const BOARD_SIZE = 29;
const DEFAULT_CELL_SIZE = 16;

export function renderPattern(canvas, grid, options = {}) {
  const {
    showCodes = true,
    showBoardLines = true,
    highlightColor = null,
    cellSize = DEFAULT_CELL_SIZE,
    colorSystem = 'MARD',
    colorMapping = {},
    buildRegion = null,
    completedCells = null,
  } = options;

  const h = grid.length, w = grid[0].length;
  canvas.width = w * cellSize;
  canvas.height = h * cellSize;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = grid[y][x];
      const px = x * cellSize, py = y * cellSize;

      if (cell === null) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(px, py, cellSize, cellSize);
      } else {
        const [r, g, b] = cell.rgb;
        if (highlightColor && cell.hex !== highlightColor) {
          const dimR = Math.round(r * 0.25 + 220 * 0.75);
          const dimG = Math.round(g * 0.25 + 220 * 0.75);
          const dimB = Math.round(b * 0.25 + 220 * 0.75);
          ctx.fillStyle = `rgb(${dimR},${dimG},${dimB})`;
        } else {
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        }
        ctx.fillRect(px, py, cellSize, cellSize);

        if (showCodes && cellSize >= 12) {
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          ctx.fillStyle = luminance > 140 ? '#1e293b' : '#ffffff';
          const fontSize = Math.max(8, Math.min(cellSize * 0.5, 12));
          ctx.font = `600 ${fontSize}px "Inter", system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(getColorCode(cell.hex, colorSystem, colorMapping), px + cellSize / 2, py + cellSize / 2);
        }
      }

      if (completedCells?.has(`${y},${x}`)) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.fillRect(px, py, cellSize, cellSize);
      }

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, cellSize, cellSize);
    }
  }

  if (buildRegion?.length) {
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = Math.max(2, cellSize * 0.12);
    for (const { row, col } of buildRegion) {
      ctx.strokeRect(col * cellSize + 1, row * cellSize + 1, cellSize - 2, cellSize - 2);
    }
  }

  if (showBoardLines) {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    for (let x = BOARD_SIZE; x < w; x += BOARD_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, h * cellSize);
      ctx.stroke();
    }
    for (let y = BOARD_SIZE; y < h; y += BOARD_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(w * cellSize, y * cellSize);
      ctx.stroke();
    }
  }
}

export function computeCellSize(gridW, gridH, maxWidth, maxHeight) {
  const maxCellW = Math.floor(maxWidth / gridW);
  const maxCellH = Math.floor(maxHeight / gridH);
  return Math.max(4, Math.min(maxCellW, maxCellH));
}
