import assert from 'node:assert/strict';
import { formatShoppingListCSV } from '../js/exporter.js';

const mapping = {
  '#FF0000': { MARD: 'A01', COCO: 'C01', '漫漫': '红1', '盼盼': '11', '咪小窝': '21' },
  '#FFFFFF': { MARD: 'H02', COCO: 'A01', '漫漫': 'F2', '盼盼': '1', '咪小窝': '1' },
  '#0000FF': { MARD: 'C01', COCO: 'H01', '漫漫': '蓝1', '盼盼': '31', '咪小窝': '41' },
};

const counts = { '#0000FF': 2, '#FF0000': 9, '#FFFFFF': 4, '#123456': 1 };
const expected = [
  'code,hex,count',
  'A01,#FF0000,9',
  'H02,#FFFFFF,4',
  'C01,#0000FF,2',
  '?,#123456,1',
].join('\n');

const actual = formatShoppingListCSV(counts, 'MARD', mapping).replace(/^\uFEFF/, '');
assert.equal(actual, expected);

const escapedMapping = {
  '#ABCDEF': { MARD: 'A,"1"', COCO: 'C01', '漫漫': 'M01', '盼盼': 'P01', '咪小窝': 'X01' },
};
assert.equal(
  formatShoppingListCSV({ '#ABCDEF': 3 }, 'MARD', escapedMapping).replace(/^\uFEFF/, ''),
  ['code,hex,count', '"A,""1""",#ABCDEF,3'].join('\n')
);

const legacyCounts = { H01: 3 };
assert.equal(
  formatShoppingListCSV(legacyCounts, 'MARD', mapping).replace(/^\uFEFF/, ''),
  ['code,hex,count', '?,H01,3'].join('\n'),
  'legacy id keys should not be treated as mapped color codes'
);

console.log('exporter tests passed');
