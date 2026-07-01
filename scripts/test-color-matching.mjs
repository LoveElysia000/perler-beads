import assert from 'node:assert/strict';
import { createColorMatcher, isSpecialEffectColor } from '../js/color-matching.js';

{
  assert.equal(isSpecialEffectColor({ name: 'Neon Red' }), true);
  assert.equal(isSpecialEffectColor({ name: 'Fluorescent Yellow' }), true);
  assert.equal(isSpecialEffectColor({ name: 'Translucent Pink' }), true);
  assert.equal(isSpecialEffectColor({ name: 'Clear' }), true);
  assert.equal(isSpecialEffectColor({ name: 'Pastel Rose' }), false);
  assert.equal(isSpecialEffectColor({ hex: '#FAF4C8' }), false, 'unified palette entries without names are regular colors');
}

{
  const matcher = createColorMatcher([
    { hex: '#D2BE3C', name: 'Yellow', rgb: [210, 190, 60] },
    { hex: '#F5F514', name: 'Fluorescent Yellow', rgb: [245, 245, 20] },
  ]);
  const match = matcher(242, 242, 25);
  assert.equal(match.hex, '#D2BE3C', 'default matching should not use fluorescent/neon colors');
}

{
  const matcher = createColorMatcher([
    { hex: '#F097B0', rgb: [240, 151, 176] },
    { hex: '#AD8A82', rgb: [173, 138, 130] },
  ]);
  const match = matcher(180, 145, 170);
  assert.equal(match.hex, '#AD8A82', 'matching should preserve unified hex identity');
}

console.log('color matching tests passed');
