import { cloneGrid, countGridColors } from './grid-operations.js';

export function paintCell(grid, row, col, colorCell) {
  const result = cloneGrid(grid);
  if (!result[row] || col < 0 || col >= result[row].length) {
    return { grid: result, counts: countGridColors(result), changed: false };
  }
  const current = result[row][col];
  if (current?.hex === colorCell.hex) {
    return { grid: result, counts: countGridColors(result), changed: false };
  }
  result[row][col] = { hex: colorCell.hex, rgb: [...colorCell.rgb] };
  return { grid: result, counts: countGridColors(result), changed: true };
}

export function eraseCell(grid, row, col) {
  const result = cloneGrid(grid);
  if (!result[row] || col < 0 || col >= result[row].length) {
    return { grid: result, counts: countGridColors(result), changed: false };
  }
  if (result[row][col] === null) {
    return { grid: result, counts: countGridColors(result), changed: false };
  }
  result[row][col] = null;
  return { grid: result, counts: countGridColors(result), changed: true };
}

export function replaceColor(grid, fromHex, toCell) {
  let changed = false;
  const result = grid.map((row) => row.map((cell) => {
    if (!cell || cell.hex !== fromHex) return cell ? { ...cell, rgb: [...cell.rgb] } : null;
    changed = true;
    return { hex: toCell.hex, rgb: [...toCell.rgb] };
  }));
  return { grid: result, counts: countGridColors(result), changed };
}

export function floodEraseColor(grid, startRow, startCol) {
  const result = cloneGrid(grid);
  const h = result.length;
  const w = result[0]?.length || 0;
  const target = result[startRow]?.[startCol];
  if (!target?.hex) return { grid: result, counts: countGridColors(result), erasedCount: 0 };

  const visited = Array.from({ length: h }, () => Array(w).fill(false));
  const stack = [[startRow, startCol]];
  let erasedCount = 0;

  while (stack.length > 0) {
    const [row, col] = stack.pop();
    if (row < 0 || row >= h || col < 0 || col >= w || visited[row][col]) continue;
    visited[row][col] = true;
    const cell = result[row][col];
    if (!cell || cell.hex !== target.hex) continue;
    result[row][col] = null;
    erasedCount++;
    stack.push([row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]);
  }

  return { grid: result, counts: countGridColors(result), erasedCount };
}
