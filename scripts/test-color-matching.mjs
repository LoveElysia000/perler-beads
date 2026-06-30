import assert from 'node:assert/strict';
import { createColorMatcher, isSpecialEffectColor } from '../js/color-matching.js';

{
  assert.equal(isSpecialEffectColor({ name: 'Neon Red' }), true);
  assert.equal(isSpecialEffectColor({ name: 'Fluorescent Yellow' }), true);
  assert.equal(isSpecialEffectColor({ name: 'Translucent Pink' }), true);
  assert.equal(isSpecialEffectColor({ name: 'Clear' }), true);
  assert.equal(isSpecialEffectColor({ name: 'Pastel Rose' }), false);
}

{
  const matcher = createColorMatcher([
    { id: 'NORMAL_YELLOW', name: 'Yellow', rgb: [210, 190, 60] },
    { id: 'NEON_YELLOW', name: 'Fluorescent Yellow', rgb: [245, 245, 20] },
  ]);
  const match = matcher(242, 242, 25);
  assert.equal(match.id, 'NORMAL_YELLOW', 'default matching should not use fluorescent/neon colors');
}

{
  const matcher = createColorMatcher([
    { id: 'BRIGHT_ROSE', name: 'Bright Rose', rgb: [240, 151, 176] },
    { id: 'MUTED_BLUSH', name: 'Muted Blush', rgb: [173, 138, 130] },
  ]);
  const match = matcher(180, 145, 170);
  assert.equal(match.id, 'MUTED_BLUSH', 'matching should not choose a much brighter bead just because Delta E is slightly lower');
}

console.log('color matching tests passed');
