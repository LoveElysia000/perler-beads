// Module Web Worker — color matching engine
import { createColorMatcher } from './color-matching.js';
import { buildMatchedGrid } from './image-processing.js';

let palettes = {};
let matchers = {};

function getMatcher(brand) {
  if (!matchers[brand]) {
    matchers[brand] = createColorMatcher(palettes[brand].colors);
  }
  return matchers[brand];
}

self.onmessage = function (e) {
  const { type, payload, requestId } = e.data;

  if (type === 'init') {
    palettes = payload.palettes;
    matchers = {};
    self.postMessage({ type: 'ready', requestId });
    return;
  }

  if (type === 'match') {
    const { imageData, brand, gridW, gridH, skipColor, skipTransparent, fidelity } = payload;
    const result = buildMatchedGrid({
      imageData,
      gridW,
      gridH,
      skipColor,
      skipTransparent,
      fidelity,
    }, getMatcher(brand));

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
      const matcher = createColorMatcher(palette.colors);

      for (let gy = 0; gy < gridH; gy += step) {
        for (let gx = 0; gx < gridW; gx += step) {
          const sx = Math.floor(gx * width / gridW);
          const sy = Math.floor(gy * height / gridH);
          const i = (sy * width + sx) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          const match = matcher(r, g, b);
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
