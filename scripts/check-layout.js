const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('js/app.js', 'utf8');

const checks = [
  {
    name: 'preset size buttons wrap instead of clipping in the inspector panel',
    pass: /data-testid="size-presets"[^>]*class="[^"]*flex-wrap/.test(html),
  },
  {
    name: 'main app can shrink columns without horizontal viewport overflow',
    pass: /<main[^>]*class="[^"]*min-w-0/.test(html),
  },
  {
    name: 'workbench panels are labeled and use stable layout classes',
    pass: /<aside id="toolRail"[^>]*class="[^"]*fixed/.test(html) && /<aside id="inspectorPanel"[^>]*class="[^"]*shrink-0/.test(html),
  },
  {
    name: 'center panel can shrink and keep its content scrollable',
    pass: /<section id="centerPanel"[^>]*class="[^"]*min-w-0/.test(html),
  },
  {
    name: 'workspace exposes background removal and undo controls',
    pass: /id="removeBackgroundBtn"/.test(html) && /id="undoGridActionBtn"/.test(html),
  },
  {
    name: 'excluded colors panel has stable list target',
    pass: /id="excludedColorsPanel"/.test(html) && /id="excludedColorsList"/.test(html),
  },
  {
    name: 'counts list supports color exclusion action without breaking highlight clicks',
    pass: /exclude-color-btn/.test(app) && /closest\('\.exclude-color-btn'\)/.test(app),
  },
  {
    name: 'restoring one excluded color preserves remaining exclusions during regeneration',
    pass: /runMatch\(\{ excludedColorHexes: remainingExcludedColorHexes \}\)/.test(app),
  },
  {
    name: 'pending exclusion remap failures alert and keep exclusions visible',
    pass: /blockedExcludedColorHexes/.test(app) && /无法继续排除/.test(app),
  },
  {
    name: 'uses color system selector instead of legacy brand selector',
    pass: /id="colorSystemSelect"/.test(html) && !/id="brandSelect"/.test(html),
  },
  {
    name: 'color system selector exposes supported systems',
    pass: ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝'].every((label) => html.includes(label)),
  },
  {
    name: 'status message container exists for mapping load errors',
    pass: /id="statusMessage"/.test(html),
  },
  {
    name: 'legacy brand recommendation UI is removed from main flow',
    pass: !/id="brandRecommend"/.test(html) && !/showBrandRecommendation/.test(app),
  },
  {
    name: 'manual refinement controls exist',
    pass: /id="paintModeBtn"/.test(html) && /id="eraseModeBtn"/.test(html) && /id="floodEraseModeBtn"/.test(html) && /id="replaceColorBtn"/.test(html),
  },
  {
    name: 'selected edit color label is present',
    pass: /id="selectedEditColorLabel"/.test(html),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}
if (failed.length) {
  process.exitCode = 1;
}
