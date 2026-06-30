import assert from 'node:assert/strict';
import { buildMatchedGrid } from '../js/image-processing.js';

const palette = {
  colors: [
    { id: 'BLACK', name: 'Black', rgb: [0, 0, 0] },
    { id: 'PINK', name: 'Pink', rgb: [245, 170, 200] },
    { id: 'PURPLE', name: 'Purple', rgb: [150, 90, 160] },
    { id: 'WHITE', name: 'White', rgb: [255, 255, 255] },
  ],
};

function imageData(width, height, pixels) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const [r, g, b, a = 255] = pixels[i];
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return { data, width, height };
}

function nearestMatcher(r, g, b) {
  let best = null;
  let bestDist = Infinity;
  for (const color of palette.colors) {
    const dr = r - color.rgb[0];
    const dg = g - color.rgb[1];
    const db = b - color.rgb[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = color;
    }
  }
  return { ...best, dist: bestDist };
}

{
  const pixels = Array.from({ length: 16 }, () => [245, 170, 200]);
  pixels[0] = [0, 0, 0];
  const result = buildMatchedGrid({
    imageData: imageData(4, 4, pixels),
    gridW: 1,
    gridH: 1,
    fidelity: 90,
  }, nearestMatcher);
  assert.equal(result.grid[0][0].id, 'PINK', 'cell sampling should use the whole block, not only the top-left pixel');
}

{
  const pixels = Array.from({ length: 16 }, () => [245, 170, 200]);
  for (const idx of [1, 5, 9, 13]) pixels[idx] = [0, 0, 0];
  const result = buildMatchedGrid({
    imageData: imageData(4, 4, pixels),
    gridW: 1,
    gridH: 1,
    fidelity: 90,
  }, nearestMatcher);
  assert.equal(result.grid[0][0].id, 'BLACK', 'significant dark stroke coverage should preserve line art');
}

{
  const pixels = [
    [245, 170, 200], [245, 170, 200], [245, 170, 200],
    [245, 170, 200], [150, 90, 160], [245, 170, 200],
    [245, 170, 200], [245, 170, 200], [245, 170, 200],
  ];
  const low = buildMatchedGrid({
    imageData: imageData(3, 3, pixels),
    gridW: 3,
    gridH: 3,
    fidelity: 45,
  }, nearestMatcher);
  const high = buildMatchedGrid({
    imageData: imageData(3, 3, pixels),
    gridW: 3,
    gridH: 3,
    fidelity: 90,
  }, nearestMatcher);
  assert.equal(low.grid[1][1].id, 'PINK', 'balanced/low fidelity should clean isolated color noise');
  assert.equal(high.grid[1][1].id, 'PURPLE', 'high fidelity should keep intentional small color details');
}


{
  const pixels = [
    [0, 0, 0], [245, 170, 200], [245, 170, 200], [245, 170, 200],
    [245, 170, 200], [245, 170, 200], [245, 170, 200], [245, 170, 200],
    [245, 170, 200], [245, 170, 200], [245, 170, 200], [245, 170, 200],
    [245, 170, 200], [245, 170, 200], [245, 170, 200], [245, 170, 200],
  ];
  const result = buildMatchedGrid({
    imageData: imageData(4, 4, pixels),
    gridW: 1,
    gridH: 1,
    fidelity: 100,
  }, nearestMatcher);
  assert.equal(result.grid[0][0].id, 'PINK', 'highest fidelity should average the whole cell instead of letting one dark pixel dominate');
}

console.log('image processing tests passed');
