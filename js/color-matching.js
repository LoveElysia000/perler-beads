import { ciede2000 } from './ciede2000.js';

const SPECIAL_EFFECT_PATTERN = /\b(transparent|translucent|clear|neon|fluorescent|glow|pearl|metallic|gold|silver)\b/i;
const LUMINANCE_WEIGHT = 0.08;
const CHROMA_WEIGHT = 0.035;

function luminance(rgb) {
  return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

function chroma(rgb) {
  return Math.max(...rgb) - Math.min(...rgb);
}

export function isSpecialEffectColor(color) {
  return SPECIAL_EFFECT_PATTERN.test(color.name || '');
}

function scoreColor(sourceRgb, color) {
  const deltaE = ciede2000(
    sourceRgb[0], sourceRgb[1], sourceRgb[2],
    color.rgb[0], color.rgb[1], color.rgb[2],
  );
  const luminancePenalty = Math.abs(luminance(sourceRgb) - luminance(color.rgb)) * LUMINANCE_WEIGHT;
  const chromaPenalty = Math.abs(chroma(sourceRgb) - chroma(color.rgb)) * CHROMA_WEIGHT;
  return deltaE + luminancePenalty + chromaPenalty;
}

export function createColorMatcher(colors, options = {}) {
  const { allowSpecialEffects = false } = options;
  const regularColors = colors.filter((color) => !isSpecialEffectColor(color));
  const matchableColors = allowSpecialEffects || regularColors.length === 0 ? colors : regularColors;
  const colorCache = new Map();

  return function matchColor(r, g, b) {
    const key = `${r},${g},${b}`;
    if (colorCache.has(key)) return colorCache.get(key);

    const sourceRgb = [r, g, b];
    let best = null;
    let bestScore = Infinity;
    let bestDeltaE = Infinity;

    for (const color of matchableColors) {
      const deltaE = ciede2000(r, g, b, color.rgb[0], color.rgb[1], color.rgb[2]);
      const score = scoreColor(sourceRgb, color);
      if (score < bestScore) {
        bestScore = score;
        bestDeltaE = deltaE;
        best = color;
      }
    }

    const result = { ...best, dist: bestDeltaE, score: bestScore };
    colorCache.set(key, result);
    return result;
  };
}
