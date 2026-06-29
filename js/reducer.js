// Smart color reduction — K-Means clustering + noise cleaning

export function kMeansReduce(pixels, k, iterations = 10) {
  if (pixels.length <= k) return pixels.map(p => ({ r: p.r, g: p.g, b: p.b }));

  const centers = [];
  const used = new Set();
  while (centers.length < k) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (!used.has(idx)) {
      used.add(idx);
      centers.push({ r: pixels[idx].r, g: pixels[idx].g, b: pixels[idx].b });
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    const clusters = Array.from({ length: k }, () => []);
    for (const pixel of pixels) {
      let bestIdx = 0, bestDist = Infinity;
      for (let i = 0; i < k; i++) {
        const dr = pixel.r - centers[i].r, dg = pixel.g - centers[i].g, db = pixel.b - centers[i].b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
      clusters[bestIdx].push(pixel);
    }

    let changed = false;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;
      const avgR = Math.round(clusters[i].reduce((s, p) => s + p.r, 0) / clusters[i].length);
      const avgG = Math.round(clusters[i].reduce((s, p) => s + p.g, 0) / clusters[i].length);
      const avgB = Math.round(clusters[i].reduce((s, p) => s + p.b, 0) / clusters[i].length);
      if (centers[i].r !== avgR || centers[i].g !== avgG || centers[i].b !== avgB) {
        changed = true;
        centers[i] = { r: avgR, g: avgG, b: avgB };
      }
    }
    if (!changed) break;
  }
  return centers;
}

export function mapToCenters(pixels, centers) {
  return pixels.map(pixel => {
    let best = centers[0], bestDist = Infinity;
    for (const c of centers) {
      const dr = pixel.r - c.r, dg = pixel.g - c.g, db = pixel.b - c.b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) { bestDist = dist; best = c; }
    }
    return { r: best.r, g: best.g, b: best.b };
  });
}

export function cleanNoise(grid) {
  const h = grid.length, w = grid[0].length;
  const result = grid.map(row => row.map(cell => ({ ...cell })));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = result[y][x];
      let sameCount = 0;
      const neighborColors = {};
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dy === 0 && dx === 0) continue;
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
          const nc = result[ny][nx];
          if (Math.abs(nc.r - color.r) < 5 && Math.abs(nc.g - color.g) < 5 && Math.abs(nc.b - color.b) < 5) {
            sameCount++;
          }
          const key = `${nc.r},${nc.g},${nc.b}`;
          neighborColors[key] = (neighborColors[key] || 0) + 1;
        }
      }
      if (sameCount === 0) {
        const bestKey = Object.entries(neighborColors).sort((a, b) => b[1] - a[1])[0][0];
        const [nr, ng, nb] = bestKey.split(',').map(Number);
        result[y][x] = { r: nr, g: ng, b: nb };
      }
    }
  }
  return result;
}

export function mergeCloseColors(grid) {
  const colorMap = new Map();
  for (const row of grid) for (const cell of row) {
    const key = `${cell.r},${cell.g},${cell.b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  const total = grid.length * grid[0].length;
  const colors = Array.from(colorMap.entries())
    .map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number);
      return { r, g, b, key, count, ratio: count / total };
    })
    .filter(c => c.ratio < 0.05);

  const merges = {};
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const dr = colors[i].r - colors[j].r, dg = colors[i].g - colors[j].g, db = colors[i].b - colors[j].b;
      if (dr * dr + dg * dg + db * db < 144) {
        const [from, to] = colors[i].count > colors[j].count
          ? [colors[j].key, colors[i].key] : [colors[i].key, colors[j].key];
        merges[from] = to;
      }
    }
  }

  if (Object.keys(merges).length === 0) return grid;

  return grid.map(row => row.map(cell => {
    const key = `${cell.r},${cell.g},${cell.b}`;
    if (merges[key]) {
      const [r, g, b] = merges[key].split(',').map(Number);
      return { r, g, b };
    }
    return { ...cell };
  }));
}
