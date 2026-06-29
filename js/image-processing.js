const DARK_LUMINANCE = 72;
const DARK_STROKE_RATIO = 0.18;

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isDarkStrokePixel(r, g, b) {
  return luminance(r, g, b) <= DARK_LUMINANCE;
}

function isSkippedColor(r, g, b, skipColor) {
  if (!skipColor) return false;
  const dr = r - skipColor[0];
  const dg = g - skipColor[1];
  const db = b - skipColor[2];
  return dr * dr + dg * dg + db * db < 1000;
}

function averagePixels(pixels) {
  const totals = pixels.reduce((sum, pixel) => {
    sum.r += pixel.r;
    sum.g += pixel.g;
    sum.b += pixel.b;
    return sum;
  }, { r: 0, g: 0, b: 0 });

  return {
    r: Math.round(totals.r / pixels.length),
    g: Math.round(totals.g / pixels.length),
    b: Math.round(totals.b / pixels.length),
  };
}

function dominantSampleColor(samples) {
  if (samples.length === 0) return null;

  const darkPixels = samples.filter((pixel) => isDarkStrokePixel(pixel.r, pixel.g, pixel.b));
  if (darkPixels.length / samples.length >= DARK_STROKE_RATIO) {
    return averagePixels(darkPixels);
  }

  const fillPixels = samples.length >= 12
    ? samples.filter((pixel) => !isDarkStrokePixel(pixel.r, pixel.g, pixel.b))
    : samples;

  return averagePixels(fillPixels.length > 0 ? fillPixels : samples);
}

function cleanMatchedNoise(grid) {
  const h = grid.length;
  const w = grid[0].length;
  const result = grid.map((row) => row.map((cell) => cell && { ...cell }));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = grid[y][x];
      if (!cell) continue;

      let sameCount = 0;
      const neighborCounts = new Map();
      const neighborCells = new Map();

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dy === 0 && dx === 0) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
          const neighbor = grid[ny][nx];
          if (!neighbor) continue;
          if (neighbor.id === cell.id) sameCount++;
          neighborCounts.set(neighbor.id, (neighborCounts.get(neighbor.id) || 0) + 1);
          neighborCells.set(neighbor.id, neighbor);
        }
      }

      if (sameCount > 0 || neighborCounts.size === 0) continue;

      const [bestId, bestCount] = [...neighborCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (bestCount >= 3) {
        result[y][x] = { ...neighborCells.get(bestId) };
      }
    }
  }

  return result;
}

function countColors(grid) {
  const counts = {};
  for (const row of grid) {
    for (const cell of row) {
      if (!cell) continue;
      counts[cell.id] = (counts[cell.id] || 0) + 1;
    }
  }
  return counts;
}

export function buildMatchedGrid({
  imageData,
  gridW,
  gridH,
  skipColor = null,
  skipTransparent = true,
  fidelity = 60,
}, matchColor) {
  const { data, width, height } = imageData;
  const grid = new Array(gridH);

  for (let gy = 0; gy < gridH; gy++) {
    grid[gy] = new Array(gridW);
    const y0 = Math.floor(gy * height / gridH);
    const y1 = Math.max(y0 + 1, Math.floor((gy + 1) * height / gridH));

    for (let gx = 0; gx < gridW; gx++) {
      const x0 = Math.floor(gx * width / gridW);
      const x1 = Math.max(x0 + 1, Math.floor((gx + 1) * width / gridW));
      const samples = [];

      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * width + sx) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (skipTransparent && a < 128) continue;
          if (isSkippedColor(r, g, b, skipColor)) continue;
          samples.push({ r, g, b });
        }
      }

      const sampleColor = dominantSampleColor(samples);
      if (!sampleColor) {
        grid[gy][gx] = null;
        continue;
      }

      const match = matchColor(sampleColor.r, sampleColor.g, sampleColor.b);
      grid[gy][gx] = { id: match.id, name: match.name, rgb: match.rgb, dist: match.dist };
    }
  }

  const cleanedGrid = fidelity < 80 ? cleanMatchedNoise(grid) : grid;
  return { grid: cleanedGrid, counts: countColors(cleanedGrid) };
}
