export function cloneGrid(grid) {
  return (grid || []).map((row) => (row || []).map((cell) => cloneCell(cell)));
}

export function countGridColors(grid) {
  const counts = {};
  for (const row of grid || []) {
    for (const cell of row || []) {
      if (!cell?.hex) continue;
      counts[cell.hex] = (counts[cell.hex] || 0) + 1;
    }
  }
  return counts;
}

export function rgbDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function autoRemoveBorderBackground(grid) {
  if (!grid?.length || !grid[0]?.length) {
    return { grid, counts: {}, removedCount: 0, backgroundHex: null };
  }

  const h = grid.length;
  const w = grid[0].length;
  const borderCounts = new Map();

  const countCell = (y, x) => {
    const cell = grid[y]?.[x];
    if (!cell?.hex) return;
    borderCounts.set(cell.hex, (borderCounts.get(cell.hex) || 0) + 1);
  };

  for (let x = 0; x < w; x++) {
    countCell(0, x);
    if (h > 1) countCell(h - 1, x);
  }
  for (let y = 1; y < h - 1; y++) {
    countCell(y, 0);
    if (w > 1) countCell(y, w - 1);
  }

  if (borderCounts.size === 0) {
    const cloned = cloneGrid(grid);
    return { grid: cloned, counts: countGridColors(cloned), removedCount: 0, backgroundHex: null };
  }

  const [backgroundHex] = [...borderCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const result = cloneGrid(grid);
  const visited = Array.from({ length: h }, () => Array(w).fill(false));
  const stack = [];

  const pushIfBackground = (y, x) => {
    if (y < 0 || y >= h || x < 0 || x >= w || visited[y][x]) return;
    const cell = result[y][x];
    if (!cell || cell.hex !== backgroundHex) return;
    visited[y][x] = true;
    stack.push([y, x]);
  };

  for (let x = 0; x < w; x++) {
    pushIfBackground(0, x);
    if (h > 1) pushIfBackground(h - 1, x);
  }
  for (let y = 1; y < h - 1; y++) {
    pushIfBackground(y, 0);
    if (w > 1) pushIfBackground(y, w - 1);
  }

  let removedCount = 0;
  while (stack.length > 0) {
    const [y, x] = stack.pop();
    if (result[y][x]) {
      result[y][x] = null;
      removedCount++;
    }
    pushIfBackground(y - 1, x);
    pushIfBackground(y + 1, x);
    pushIfBackground(y, x - 1);
    pushIfBackground(y, x + 1);
  }

  return { grid: result, counts: countGridColors(result), removedCount, backgroundHex };
}

export function excludeAndRemapColor(grid, excludedHex, allowedColorHexes = null) {
  const counts = countGridColors(grid);
  if (!counts[excludedHex]) {
    return { grid: cloneGrid(grid), counts, remappedCount: 0, replacementHex: null, blocked: false };
  }

  const colorByHex = new Map();
  for (const row of grid || []) {
    for (const cell of row || []) {
      if (cell?.hex) colorByHex.set(cell.hex, cell);
    }
  }

  const allowed = new Set(allowedColorHexes || Object.keys(counts));
  allowed.delete(excludedHex);
  const candidates = [...allowed]
    .map((hex) => colorByHex.get(hex))
    .filter(Boolean);

  if (candidates.length === 0) {
    return { grid: cloneGrid(grid), counts, remappedCount: 0, replacementHex: null, blocked: true };
  }

  const excludedCell = colorByHex.get(excludedHex);
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = rgbDistance(excludedCell.rgb, candidate.rgb);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  let remappedCount = 0;
  const result = grid.map((row) => row.map((cell) => {
    if (!cell) return null;
    if (cell.hex !== excludedHex) return cloneCell(cell);
    remappedCount++;
    return cloneCell(best);
  }));

  return {
    grid: result,
    counts: countGridColors(result),
    remappedCount,
    replacementHex: best.hex,
    blocked: false,
  };
}

function cloneCell(cell) {
  if (!cell) return null;
  return { ...cell, rgb: [...cell.rgb] };
}
