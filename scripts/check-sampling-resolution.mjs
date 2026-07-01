import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

assert.match(app, /function prepareSourceImageData\(/, 'app.js should define prepareSourceImageData for source-region preprocessing');
assert.doesNotMatch(app, /SAMPLE_SCALE/, 'app.js should not use SAMPLE_SCALE after switching to source-region preprocessing');
assert.match(app, /gridW:\s*w,\s*gridH:\s*h/s, 'worker payload should still include final bead grid dimensions');

console.log('sampling resolution check passed');
