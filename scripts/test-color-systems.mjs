import assert from 'node:assert/strict';
import {
  COLOR_SYSTEMS,
  DEFAULT_COLOR_SYSTEM,
  buildPaletteFromMapping,
  getColorCode,
  getColorEntry,
  hexToRgb,
  normalizeHex,
  validateColorSystemMapping,
} from '../js/color-systems.js';

const mapping = {
  '#FAF4C8': { MARD: 'A01', COCO: 'E02', '漫漫': 'E2', '盼盼': '65', '咪小窝': '77' },
  '#000000': { MARD: 'H07', COCO: 'B09', '漫漫': 'F7', '盼盼': '14', '咪小窝': '14' },
  '#FFFFFF': { MARD: 'H02', COCO: 'A01', '漫漫': 'F2', '盼盼': '1', '咪小窝': '14' },
};

assert.deepEqual(COLOR_SYSTEMS, ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝']);
assert.equal(DEFAULT_COLOR_SYSTEM, 'MARD');

assert.equal(normalizeHex('#faf4c8'), '#FAF4C8');
assert.throws(() => normalizeHex('FAF4C8'), /Invalid hex/);
assert.throws(() => normalizeHex('#fff'), /Invalid hex/);
assert.throws(() => normalizeHex(''), /Invalid hex/);

assert.deepEqual(hexToRgb('#FAF4C8'), [250, 244, 200]);

const validation = validateColorSystemMapping(mapping);
assert.equal(validation.valid, true);
assert.deepEqual(validation.errors, []);
assert.ok(validation.warnings.some((warning) => warning.includes('duplicate code') && warning.includes('咪小窝')));

const palette = buildPaletteFromMapping(mapping);
assert.equal(palette.length, 3);
assert.deepEqual(palette[0], { hex: '#FAF4C8', rgb: [250, 244, 200] });
assert.equal(getColorCode('#faf4c8', 'MARD', mapping), 'A01');
assert.equal(getColorCode('#FAF4C8', '盼盼', mapping), '65');
assert.equal(getColorCode('#123456', 'MARD', mapping), '?');
assert.equal(getColorCode('#FAF4C8', 'UNKNOWN', mapping), '?');
assert.deepEqual(getColorEntry('#faf4c8', mapping), mapping['#FAF4C8']);

assert.throws(
  () => validateColorSystemMapping({ 'FAF4C8': mapping['#FAF4C8'] }, { throwOnError: true }),
  /Invalid hex/
);
assert.throws(
  () => validateColorSystemMapping({ '#FAF4C8': { MARD: 'A01' } }, { throwOnError: true }),
  /Missing color system/
);
assert.throws(
  () => validateColorSystemMapping({ '#FAF4C8': { ...mapping['#FAF4C8'], COCO: '   ' } }, { throwOnError: true }),
  /Empty code/
);

console.log('color system tests passed');
