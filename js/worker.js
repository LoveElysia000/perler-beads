// Module Web Worker — color matching engine
import { createColorMatcher } from './color-matching.js';
import { buildMatchedGrid } from './image-processing.js';

let palette = [];
let matcher = null;

self.onmessage = function (e) {
  const { type, payload, requestId } = e.data;

  if (type === 'init') {
    palette = payload.palette || [];
    matcher = createColorMatcher(palette);
    self.postMessage({ type: 'ready', requestId });
    return;
  }

  if (type === 'match') {
    const { imageData, gridW, gridH, skipColor, skipTransparent, fidelity, samplingMode } = payload;
    if (!matcher) {
      self.postMessage({ type: 'error', requestId, payload: { message: 'Color palette is not initialized.' } });
      return;
    }
    const result = buildMatchedGrid({
      imageData,
      gridW,
      gridH,
      skipColor,
      skipTransparent,
      fidelity,
      samplingMode,
    }, matcher);

    self.postMessage({ type: 'result', requestId, payload: result });
  }
};
