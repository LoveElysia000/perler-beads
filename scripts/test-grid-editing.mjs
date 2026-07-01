import assert from 'node:assert/strict';
import { paintCell, eraseCell, replaceColor, floodEraseColor } from '../js/grid-editing.js';

const R = { hex: '#FF0000', rgb: [240, 20, 20] };
const B = { hex: '#0000FF', rgb: [20, 20, 240] };
const W = { hex: '#FFFFFF', rgb: [255, 255, 255] };
const G = { hex: '#00FF00', rgb: [0, 240, 0] };

{
  const result = paintCell([[R, R]], 0, 1, B);
  assert.equal(result.changed, true);
  assert.deepEqual(result.counts, { '#FF0000': 1, '#0000FF': 1 });
  assert.equal(result.grid[0][1].hex, '#0000FF');
}

{
  const result = paintCell([[R, R]], 0, 1, R);
  assert.equal(result.changed, false);
  assert.deepEqual(result.counts, { '#FF0000': 2 });
}

{
  const result = eraseCell([[R, B]], 0, 0);
  assert.equal(result.changed, true);
  assert.deepEqual(result.counts, { '#0000FF': 1 });
  assert.equal(result.grid[0][0], null);
}

{
  const result = eraseCell([[null, B]], 0, 0);
  assert.equal(result.changed, false);
}

{
  const result = replaceColor([[R, B], [R, W]], '#FF0000', B);
  assert.equal(result.changed, true);
  assert.deepEqual(result.counts, { '#0000FF': 3, '#FFFFFF': 1 });
}

{
  const result = replaceColor([[R, B]], '#00FF00', W);
  assert.equal(result.changed, false);
  assert.deepEqual(result.counts, { '#FF0000': 1, '#0000FF': 1 });
}

{
  const result = floodEraseColor([
    [R, R, B],
    [R, B, B],
    [W, W, R],
  ], 0, 0);
  assert.equal(result.erasedCount, 3);
  assert.deepEqual(result.counts, { '#0000FF': 3, '#FFFFFF': 2, '#FF0000': 1 });
  assert.equal(result.grid[0][0], null);
  assert.equal(result.grid[0][1], null);
  assert.equal(result.grid[1][0], null);
  assert.equal(result.grid[2][2].hex, '#FF0000', 'disconnected same-color cell should remain');
}

{
  const result = floodEraseColor([[null, R], [R, R]], 0, 0);
  assert.equal(result.erasedCount, 0);
}

{
  const grid = [[W, W], [W, W]];
  const result = eraseCell(grid, 5, 5);
  assert.equal(result.changed, false);
  const paintOOB = paintCell(grid, -1, 0, R);
  assert.equal(paintOOB.changed, false);
}

console.log('grid editing tests passed');
