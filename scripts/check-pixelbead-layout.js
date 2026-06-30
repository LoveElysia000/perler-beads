const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const requiredIds = [
  'brandSelect', 'brandRecommend', 'dropZone', 'fileBtn', 'fileInput', 'gridW', 'gridH',
  'aspectMode', 'skipTransparent', 'enableSkipColor', 'skipColorPicker', 'skipColorHex',
  'fidelity', 'fidelityLabel', 'generateBtn', 'previewEmpty', 'previewArea', 'previewContainer',
  'patternCanvas', 'viewColor', 'viewCode', 'zoomOutBtn', 'zoomInBtn', 'countsSection',
  'colorStats', 'countsList', 'exportSection', 'downloadPNGBtn', 'downloadCSVBtn', 'printBtn'
];

const checks = [
  {
    name: 'uses PixelBead workbench branding',
    pass: /PixelBead/.test(html) && /Project Alpha|拼豆图纸/.test(html),
  },
  {
    name: 'has floating tool rail and right inspector layout',
    pass: /id="toolRail"/.test(html) && /id="inspectorPanel"/.test(html) && /id="centerPanel"/.test(html),
  },
  {
    name: 'keeps all app.js required element ids',
    pass: requiredIds.every((id) => html.includes(`id="${id}"`)),
  },
  {
    name: 'keeps grid preset data attributes',
    pass: ['29', '58', '87', '116'].every((size) => html.includes(`data-w="${size}"`) && html.includes(`data-h="${size}"`)),
  },
  {
    name: 'loads Material Symbols for PixelBead icon style',
    pass: /Material\+Symbols\+Outlined/.test(html) && /material-symbols-outlined/.test(html),
  },
];

for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (checks.some((check) => !check.pass)) {
  process.exitCode = 1;
}
