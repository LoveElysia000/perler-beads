import assert from 'node:assert/strict';
import { formatShoppingListCSV } from '../js/exporter.js';

const counts = { BLUE: 2, RED: 9, WHITE: 4, GREEN: 1 };
const palette = {
  colors: [
    { id: 'RED', name: 'Bright "Warm", Red' },
    { id: 'WHITE', name: 'Snow\nWhite' },
    { id: 'BLUE', name: 'Blue' },
    { id: 'GREEN', name: 'Forest\rGreen' },
  ],
};

const expected = [
  '编号,颜色名,数量',
  'RED,"Bright ""Warm"", Red",9',
  'WHITE,"Snow\nWhite",4',
  'BLUE,Blue,2',
  'GREEN,"Forest\rGreen",1',
].join('\n');

const actual = formatShoppingListCSV(counts, palette).replace(/^\uFEFF/, '');
assert.equal(actual, expected);

const missingCounts = { NULL_COUNT: null, UNDEFINED_COUNT: undefined };
const missingPalette = {
  colors: [
    { id: 'NULL_COUNT', name: 'Null Count' },
    { id: 'UNDEFINED_COUNT', name: 'Undefined Count' },
  ],
};

assert.doesNotThrow(() => formatShoppingListCSV(missingCounts, missingPalette));
assert.equal(
  formatShoppingListCSV(missingCounts, missingPalette).replace(/^\uFEFF/, ''),
  [
    '编号,颜色名,数量',
    'NULL_COUNT,Null Count,',
    'UNDEFINED_COUNT,Undefined Count,',
  ].join('\n')
);
