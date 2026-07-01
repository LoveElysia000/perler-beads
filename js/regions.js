export function cellKey(row, col) {
  return `${row},${col}`;
}

export function getConnectedRegion(grid, startRow, startCol, colorHex) {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const visited = Array.from({ length: h }, () => Array(w).fill(false));
  const region = [];
  const stack = [[startRow, startCol]];

  while (stack.length > 0) {
    const [row, col] = stack.pop();
    if (row < 0 || row >= h || col < 0 || col >= w || visited[row][col]) continue;
    visited[row][col] = true;
    const cell = grid[row][col];
    if (!cell || cell.hex !== colorHex) continue;
    region.push({ row, col });
    stack.push([row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]);
  }

  return region;
}

export function getAllConnectedRegions(grid, colorHex) {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  const visited = Array.from({ length: h }, () => Array(w).fill(false));
  const regions = [];

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      if (visited[row][col]) continue;
      const cell = grid[row][col];
      if (!cell || cell.hex !== colorHex) {
        visited[row][col] = true;
        continue;
      }
      const region = getConnectedRegion(grid, row, col, colorHex);
      for (const item of region) visited[item.row][item.col] = true;
      if (region.length > 0) regions.push(region);
    }
  }

  return regions;
}

export function regionCenter(region) {
  const sum = region.reduce((acc, cell) => ({ row: acc.row + cell.row, col: acc.col + cell.col }), { row: 0, col: 0 });
  return { row: Math.round(sum.row / region.length), col: Math.round(sum.col / region.length) };
}

export function isRegionCompleted(region, completedCells) {
  return region.every(({ row, col }) => completedCells.has(cellKey(row, col)));
}

export function sortRegions(regions, strategy, reference = { row: 0, col: 0 }, gridSize = null) {
  const copy = regions.slice();
  if (strategy === 'nearest') {
    return copy.sort((a, b) => {
      const ca = regionCenter(a);
      const cb = regionCenter(b);
      const da = Math.abs(ca.row - reference.row) + Math.abs(ca.col - reference.col);
      const db = Math.abs(cb.row - reference.row) + Math.abs(cb.col - reference.col);
      return da - db;
    });
  }
  if (strategy === 'edge' && gridSize) {
    return copy.sort((a, b) => edgeDistance(a, gridSize) - edgeDistance(b, gridSize));
  }
  return copy.sort((a, b) => b.length - a.length);
}

function edgeDistance(region, gridSize) {
  return Math.min(...region.map(({ row, col }) =>
    Math.min(row, col, gridSize.rows - 1 - row, gridSize.cols - 1 - col)
  ));
}
