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
    pass: /runMatch\(\{ excludedColorIds: remainingExcludedColorIds \}\)/.test(app),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}
if (failed.length) {
  process.exitCode = 1;
}
