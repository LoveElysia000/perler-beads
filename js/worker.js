// Module Web Worker — color matching engine
import { ciede2000 } from './ciede2000.js';
import { buildMatchedGrid } from './image-processing.js';

let palettes = {};
let colorCache = new Map();

function matchColor(r, g, b, palette) {
  const key = `${r},${g},${b}`;
  if (colorCache.has(key)) return colorCache.get(key);

  let best = null, bestDist = Infinity;
  for (const color of palette) {
    const dist = ciede2000(r, g, b, color.rgb[0], color.rgb[1], color.rgb[2]);
    if (dist < bestDist) { bestDist = dist; best = color; }
  }
  const result = { ...best, dist: bestDist };
  colorCache.set(key, result);
  return result;
}

self.onmessage = function (e) {
  const { type, payload, requestId } = e.data;

  if (type === 'init') {
    palettes = payload.palettes;
    colorCache = new Map();
    self.postMessage({ type: 'ready', requestId });
    return;
  }

  if (type === 'match') {
    const { imageData, brand, gridW, gridH, skipColor, skipTransparent, fidelity } = payload;
    const palette = palettes[brand];
    const result = buildMatchedGrid({
      imageData,
      gridW,
      gridH,
      skipColor,
      skipTransparent,
      fidelity,
    }, (r, g, b) => matchColor(r, g, b, palette.colors));

    self.postMessage({ type: 'result', requestId, payload: result });
    return;
  }

  if (type === 'recommend') {
    const { imageData, gridW, gridH } = payload;
    const { data, width, height } = imageData;
    const results = {};

    for (const [name, palette] of Object.entries(palettes)) {
      let totalDist = 0, count = 0;
      const step = Math.max(1, Math.floor(Math.min(width, height) / 80));

      for (let gy = 0; gy < gridH; gy += step) {
        for (let gx = 0; gx < gridW; gx += step) {
          const sx = Math.floor(gx * width / gridW);
          const sy = Math.floor(gy * height / gridH);
          const i = (sy * width + sx) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          const match = matchColor(r, g, b, palette.colors);
          totalDist += match.dist;
          count++;
        }
      }
      results[name] = { avgDeltaE: count > 0 ? +(totalDist / count).toFixed(2) : 0 };
    }

    self.postMessage({ type: 'recommendation', requestId, payload: results });
    return;
  }
};
