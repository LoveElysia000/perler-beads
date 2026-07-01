import assert from 'node:assert/strict';
import { buildMatchedGrid } from '../js/image-processing.js';

const palette = {
  colors: [
    { hex: '#000000', rgb: [0, 0, 0] },
    { hex: '#AA4682', rgb: [170, 70, 130] },
    { hex: '#F5AAC8', rgb: [245, 170, 200] },
    { hex: '#965AA0', rgb: [150, 90, 160] },
    { hex: '#5A96FA', rgb: [90, 150, 250] },
    { hex: '#FFFFFF', rgb: [255, 255, 255] },
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
  assert.equal(result.grid[0][0].hex, '#F5AAC8', 'cell sampling should use the whole block, not only the top-left pixel');
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
  assert.equal(result.grid[0][0].hex, '#000000', 'significant dark stroke coverage should preserve line art');
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
  assert.equal(low.grid[1][1].hex, '#F5AAC8', 'balanced/low fidelity should clean isolated color noise');
  assert.equal(high.grid[1][1].hex, '#965AA0', 'high fidelity should keep intentional small color details');
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
  assert.equal(result.grid[0][0].hex, '#F5AAC8', 'highest fidelity should average the whole cell instead of letting one dark pixel dominate');
}

{
  const redFamily = [170, 70, 130];
  const blueFamily = [90, 150, 250];
  const pixels = [
    ...Array.from({ length: 9 }, () => redFamily),
    ...Array.from({ length: 7 }, () => blueFamily),
  ];
  const result = buildMatchedGrid({
    imageData: imageData(4, 4, pixels),
    gridW: 1,
    gridH: 1,
    fidelity: 100,
    samplingMode: 'dominant',
  }, nearestMatcher);
  assert.equal(result.grid[0][0].hex, '#AA4682', 'dominant sampling should match the most common quantized color family');
}

{
  const redFamily = [170, 70, 130];
  const blueFamily = [90, 150, 250];
  const pixels = [
    ...Array.from({ length: 12 }, () => redFamily),
    ...Array.from({ length: 4 }, () => blueFamily),
  ];
  const result = buildMatchedGrid({
    imageData: imageData(4, 4, pixels),
    gridW: 1,
    gridH: 1,
    fidelity: 100,
    samplingMode: 'average',
  }, nearestMatcher);
  assert.equal(result.grid[0][0].hex, '#965AA0', 'average sampling should match the true average color rather than a red/blue tie-break');
}

{
  const matcherColors = [
    { hex: '#F51414', rgb: [245, 20, 20] },
    { hex: '#E14137', rgb: [225, 65, 55] },
    { hex: '#1414F5', rgb: [20, 20, 245] },
  ];
  function matcher(r, g, b) {
    let best = null;
    let bestDist = Infinity;
    for (const color of matcherColors) {
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
  const pixels = [
    [245, 20, 20], [245, 20, 20], [245, 20, 20], [225, 65, 55],
    [245, 20, 20], [245, 20, 20], [225, 65, 55], [225, 65, 55],
    [20, 20, 245], [20, 20, 245], [20, 20, 245], [20, 20, 245],
  ];
  const result = buildMatchedGrid({
    imageData: imageData(4, 3, pixels),
    gridW: 4,
    gridH: 3,
    fidelity: 45,
    samplingMode: 'average',
  }, matcher);
  assert.equal(result.counts['#E14137'] || 0, 0, 'balanced/low fidelity should merge lower-frequency similar reds');
  assert.equal(result.counts['#F51414'], 8, 'similar red merge should preserve all red cells instead of relying on isolated-noise cleanup');
}

{
  const cells = [
    { hex: '#646464', rgb: [100, 100, 100], dist: 0 },
    { hex: '#646464', rgb: [100, 100, 100], dist: 0 },
    { hex: '#707070', rgb: [112, 112, 112], dist: 0 },
    { hex: '#BAD001', dist: 0 },
    { hex: '#BAD002', rgb: [100, NaN, 100], dist: 0 },
  ];
  function matcher(r) {
    return cells[r];
  }
  const pixels = cells.map((_, index) => [index, 0, 0]);
  const result = buildMatchedGrid({
    imageData: imageData(5, 1, pixels),
    gridW: 5,
    gridH: 1,
    fidelity: 45,
    samplingMode: 'average',
  }, matcher);
  assert.equal(result.counts['#707070'] || 0, 0, 'valid low-frequency similar colors should still merge');
  assert.equal(result.counts['#646464'], 3, 'valid merged colors should be counted');
  assert.equal(result.counts['#BAD001'], 1, 'missing rgb colors should remain counted without participating in merge');
  assert.equal(result.counts['#BAD002'], 1, 'invalid rgb colors should remain counted without participating in merge');
}

console.log('image processing tests passed');
