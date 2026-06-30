import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

assert.match(app, /const\s+SAMPLE_SCALE\s*=\s*[4-9]\b/, 'app.js should define a multi-sample scale of at least 4');
assert.match(app, /canvas\.width\s*=\s*targetW\s*\*\s*SAMPLE_SCALE/, 'applyAspectRatio should render wider than the bead grid for per-cell multi-sampling');
assert.match(app, /canvas\.height\s*=\s*targetH\s*\*\s*SAMPLE_SCALE/, 'applyAspectRatio should render taller than the bead grid for per-cell multi-sampling');
assert.match(app, /gridW:\s*w,\s*gridH:\s*h/s, 'worker payload should still include final bead grid dimensions');

console.log('sampling resolution check passed');
