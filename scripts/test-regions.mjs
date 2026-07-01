import assert from 'node:assert/strict';
import { getAllConnectedRegions, getConnectedRegion, isRegionCompleted, sortRegions, regionCenter, cellKey } from '../js/regions.js';

const R = { hex: '#FF0000', rgb: [255, 0, 0] };
const B = { hex: '#0000FF', rgb: [0, 0, 255] };
const G = { hex: '#00FF00', rgb: [0, 255, 0] };

{
  assert.equal(cellKey(3, 5), '3,5');
  assert.equal(cellKey(0, 0), '0,0');
}

{
  const grid = [
    [R, R, B, R],
    [R, B, B, R],
    [B, B, R, R],
  ];

  const redRegions = getAllConnectedRegions(grid, '#FF0000');
  assert.equal(redRegions.length, 2);
  assert.deepEqual(redRegions.map((r) => r.length).sort((a, b) => a - b), [3, 4]);

  const singleRegion = getConnectedRegion(grid, 0, 0, '#FF0000');
  assert.equal(singleRegion.length, 3);

  const completed = new Set(redRegions[0].map(({ row, col }) => cellKey(row, col)));
  assert.equal(isRegionCompleted(redRegions[0], completed), true);
  assert.equal(isRegionCompleted(redRegions[1], completed), false);
}

{
  const grid = [
    [R, R],
    [R, R],
  ];
  const regions = getAllConnectedRegions(grid, '#FF0000');
  assert.equal(regions.length, 1);
  assert.equal(regions[0].length, 4);

  const center = regionCenter(regions[0]);
  assert.equal(center.row, 1);
  assert.equal(center.col, 1);
}

{
  const grid = [
    [R, B, R],
    [B, R, B],
    [R, B, R],
  ];
  const regions = getAllConnectedRegions(grid, '#FF0000');
  assert.equal(regions.length, 5, 'diagonal same-color cells should be separate regions');
}

{
  const grid = [[null, R], [R, null], [null, R]];
  const regions = getAllConnectedRegions(grid, '#FF0000');
  assert.equal(regions.length, 3);
}

{
  const grid = [[R, R], [R, R]];
  const regions = getAllConnectedRegions(grid, '#FF0000');
  const sortedBySize = sortRegions(regions, 'size');
  assert.equal(sortedBySize[0].length, 4);

  const sortedByNearest = sortRegions(regions, 'nearest', { row: 0, col: 0 }, { rows: 2, cols: 2 });
  assert.equal(sortedByNearest.length, 1);

  const sortedByEdge = sortRegions(regions, 'edge', { row: 0, col: 0 }, { rows: 2, cols: 2 });
  assert.equal(sortedByEdge[0].length, 4);
}

{
  const regions = [
    [{ row: 0, col: 0 }],
    [{ row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }],
  ];
  const sorted = sortRegions(regions, 'nearest', { row: 2, col: 2 });
  assert.equal(sorted[0].length, 3, 'nearest to (2,2) should be the cluster at (1,1)');
  assert.equal(sorted[1].length, 1, 'farthest should be (0,0)');
}

console.log('region tests passed');
