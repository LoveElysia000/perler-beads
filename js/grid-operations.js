export function cloneGrid(grid) {
  return (grid || []).map((row) => (row || []).map((cell) => cloneCell(cell)));
}

export function countGridColors(grid) {
  const counts = {};
  for (const row of grid || []) {
    for (const cell of row || []) {
      if (!cell) continue;
      counts[cell.id] = (counts[cell.id] || 0) + 1;
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
    return { grid, counts: {}, removedCount: 0, backgroundId: null };
  }

  const h = grid.length;
  const w = grid[0].length;
  const borderCounts = new Map();

  const countCell = (y, x) => {
    const cell = grid[y]?.[x];
    if (!cell) return;
    borderCounts.set(cell.id, (borderCounts.get(cell.id) || 0) + 1);
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
    return { grid: cloned, counts: countGridColors(cloned), removedCount: 0, backgroundId: null };
  }

  const [backgroundId] = [...borderCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const result = cloneGrid(grid);
  const visited = Array.from({ length: h }, () => Array(w).fill(false));
  const stack = [];

  const pushIfBackground = (y, x) => {
    if (y < 0 || y >= h || x < 0 || x >= w || visited[y][x]) return;
    const cell = result[y][x];
    if (!cell || cell.id !== backgroundId) return;
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

  return { grid: result, counts: countGridColors(result), removedCount, backgroundId };
}

export function excludeAndRemapColor(grid, excludedId, allowedColorIds = null) {
  const counts = countGridColors(grid);
  if (!counts[excludedId]) {
    return { grid: cloneGrid(grid), counts, remappedCount: 0, replacementId: null, blocked: false };
  }

  const colorById = new Map();
  for (const row of grid || []) {
    for (const cell of row || []) {
      if (cell) colorById.set(cell.id, cell);
    }
  }

  const allowed = new Set(allowedColorIds || Object.keys(counts));
  allowed.delete(excludedId);
  const candidates = [...allowed]
    .map((id) => colorById.get(id))
    .filter(Boolean);

  if (candidates.length === 0) {
    return { grid: cloneGrid(grid), counts, remappedCount: 0, replacementId: null, blocked: true };
  }

  const excludedCell = colorById.get(excludedId);
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
    if (cell.id !== excludedId) return cloneCell(cell);
    remappedCount++;
    return cloneCell(best);
  }));

  return {
    grid: result,
    counts: countGridColors(result),
    remappedCount,
    replacementId: best.id,
    blocked: false,
  };
}

function cloneCell(cell) {
  if (!cell) return null;
  return { ...cell, rgb: [...cell.rgb] };
}
