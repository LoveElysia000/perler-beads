import assert from 'node:assert/strict';
import {
  autoRemoveBorderBackground,
  cloneGrid,
  countGridColors,
  excludeAndRemapColor,
} from '../js/grid-operations.js';

const W = { id: 'WHITE', name: 'White', rgb: [255, 255, 255] };
const R = { id: 'RED', name: 'Red', rgb: [240, 20, 20] };
const P = { id: 'PINK', name: 'Pink', rgb: [245, 120, 130] };
const B = { id: 'BLUE', name: 'Blue', rgb: [20, 20, 240] };
const K = { id: 'BLACK', name: 'Black', rgb: [0, 0, 0] };

{
  const grid = [
    [W, W, W, W],
    [W, R, R, W],
    [W, R, W, W],
    [W, W, W, W],
  ];
  const result = autoRemoveBorderBackground(grid);
  assert.equal(result.backgroundId, 'WHITE');
  assert.equal(result.removedCount, 13);
  assert.equal(result.grid[1][1].id, 'RED');
  assert.equal(result.grid[2][2], null, 'background connected to border should be removed');
  assert.deepEqual(result.counts, { RED: 3 });
  assert.equal(grid[0][0].id, 'WHITE', 'source grid must not be mutated');
}

{
  const grid = [
    [W, W, W, W, W],
    [W, R, R, R, W],
    [W, R, W, R, W],
    [W, R, R, R, W],
    [W, W, W, W, W],
  ];
  const result = autoRemoveBorderBackground(grid);
  assert.equal(result.removedCount, 16);
  assert.equal(result.grid[2][2].id, 'WHITE', 'enclosed same-color detail should be preserved');
  assert.deepEqual(result.counts, { RED: 8, WHITE: 1 });
}

{
  const grid = [[R, R, P], [B, P, B], [null, K, K]];
  assert.deepEqual(countGridColors(grid), { RED: 2, PINK: 2, BLUE: 2, BLACK: 2 });
  const result = excludeAndRemapColor(grid, 'PINK');
  assert.equal(result.blocked, false);
  assert.equal(result.replacementId, 'RED');
  assert.equal(result.remappedCount, 2);
  assert.equal(result.counts.PINK || 0, 0);
  assert.deepEqual(result.counts, { RED: 4, BLUE: 2, BLACK: 2 });
}

{
  const grid = [[P, P]];
  const result = excludeAndRemapColor(grid, 'PINK', new Set(['PINK']));
  assert.equal(result.blocked, true);
  assert.deepEqual(result.counts, { PINK: 2 });
}

{
  const grid = [[R, null], [P, B]];
  const copy = cloneGrid(grid);
  assert.notEqual(copy, grid);
  assert.notEqual(copy[0], grid[0]);
  assert.notEqual(copy[0][0], grid[0][0]);
  assert.notEqual(copy[0][0].rgb, grid[0][0].rgb);
  assert.equal(copy[0][1], null);
  copy[0][0].rgb[0] = 0;
  assert.equal(grid[0][0].rgb[0], 240, 'clone should protect nested rgb arrays');
}

console.log('grid operation tests passed');
