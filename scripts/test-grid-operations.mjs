import assert from 'node:assert/strict';
import {
  autoRemoveBorderBackground,
  cloneGrid,
  countGridColors,
  excludeAndRemapColor,
} from '../js/grid-operations.js';

const W = { id: 'H01', hex: '#FFFFFF', rgb: [255, 255, 255] };
const R = { id: 'H05', hex: '#FF0000', rgb: [240, 20, 20] };
const P = { id: 'H06', hex: '#FF80A0', rgb: [245, 120, 130] };
const B = { id: 'H09', hex: '#0000FF', rgb: [20, 20, 240] };
const K = { id: 'H18', hex: '#000000', rgb: [0, 0, 0] };

{
  const grid = [
    [W, W, W, W],
    [W, R, R, W],
    [W, R, W, W],
    [W, W, W, W],
  ];
  const result = autoRemoveBorderBackground(grid);
  assert.equal(result.backgroundHex, '#FFFFFF');
  assert.equal(result.backgroundId, undefined, 'legacy background id should not be returned');
  assert.equal(result.removedCount, 13);
  assert.equal(result.grid[1][1].hex, '#FF0000');
  assert.equal(result.grid[2][2], null, 'background connected to border should be removed');
  assert.deepEqual(result.counts, { '#FF0000': 3 });
  assert.equal(grid[0][0].hex, '#FFFFFF', 'source grid must not be mutated');
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
  assert.equal(result.grid[2][2].hex, '#FFFFFF', 'enclosed same-color detail should be preserved');
  assert.deepEqual(result.counts, { '#FF0000': 8, '#FFFFFF': 1 });
}

{
  const grid = [[R, R, P], [B, P, B], [null, K, K]];
  assert.deepEqual(countGridColors(grid), { '#FF0000': 2, '#FF80A0': 2, '#0000FF': 2, '#000000': 2 });
  const result = excludeAndRemapColor(grid, '#FF80A0');
  assert.equal(result.blocked, false);
  assert.equal(result.replacementHex, '#FF0000');
  assert.equal(result.replacementId, undefined, 'legacy replacement id should not be returned');
  assert.equal(result.remappedCount, 2);
  assert.equal(result.counts['#FF80A0'] || 0, 0);
  assert.deepEqual(result.counts, { '#FF0000': 4, '#0000FF': 2, '#000000': 2 });
}

{
  const grid = [[P, P]];
  const result = excludeAndRemapColor(grid, '#FF80A0', new Set(['#FF80A0']));
  assert.equal(result.blocked, true);
  assert.deepEqual(result.counts, { '#FF80A0': 2 });
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

{
  const legacyOnly = { id: 'H01', rgb: [1, 2, 3] };
  assert.deepEqual(countGridColors([[legacyOnly]]), {}, 'legacy id-only cells should not be counted');
}

{
  assert.deepEqual(cloneGrid(null), []);
  assert.deepEqual(countGridColors(null), {});
  const result = excludeAndRemapColor(null, '#FF80A0');
  assert.deepEqual(result.grid, []);
  assert.deepEqual(result.counts, {});
  assert.equal(result.blocked, false);
  assert.equal(result.remappedCount, 0);
}

console.log('grid operation tests passed');
