# 统一色号系统实施计划

**日期**: 2026-07-01  
**设计文档**: [统一色号系统架构设计](../specs/2026-07-01-unified-color-systems-design.md)  
**执行方式**: 单人顺序实施，不使用子代理。  
**约束**: 按 TDD 执行；先写/改测试并确认失败，再实现生产代码。

---

## 目标

将主流程从 Hama / Perler / Artkal C 品牌 palette 切换为统一色号系统：`MARD / COCO / 漫漫 / 盼盼 / 咪小窝`。内部以 hex 为颜色身份，图纸、清单、CSV、导出统一按当前色号系统显示编号。

---

## 任务拆分

### Task 1 — 色号系统数据与 helper

**测试先行**

- 新增/更新脚本测试 `js/color-systems.js`：
  - 校验合法 mapping 能构建 palette；
  - 非法 hex / 缺失系统字段 / 空 code 会抛出明确错误；
  - 重复 code 只 warning，不合并 hex；
  - `getColorCode(hex, system, mapping)` 正常返回 code；
  - `normalizeHex` 严格拒绝无效格式。

**实现**

- 新增 `js/color-systems.js`。
- 新增 `palettes/color-system-mapping.json`，从 Zippland/perler-beads 取映射数据。
- helper 输出 `{ hex, rgb, dist? }` 友好的 unified palette entry。

**验收**

- 新测试红绿通过。
- 不修改主流程。

---

### Task 2 — 数据模型迁移：grid/count/processing

**测试先行**

- 更新 `scripts/test-image-processing.mjs`：fixture 改为 `{ hex, rgb }`；断言 `grid` 和 `counts` 按 hex 工作。
- 更新 `scripts/test-grid-operations.mjs`：
  - `countGridColors` 输出 `{ '#RRGGBB': count }`；
  - `autoRemoveBorderBackground` 返回 `backgroundHex`；
  - `excludeAndRemapColor(grid, excludedHex)` 按 hex 排除；
  - 带旧 `id: 'H01'` 的 cell 不应影响统计结果。
- 先运行确认失败。

**实现**

- `image-processing.js`：cell 保存 `{ hex, rgb, dist }`。
- `grid-operations.js`：身份字段全部从 `id` 改为 `hex`。
- 相关 clone/merge/noise cleanup 改用 hex。

**验收**

- image/grid 测试通过。

---

### Task 3 — 匹配器与 worker 切换为 unified palette

**测试先行**

- 更新 `scripts/test-color-matching.mjs`：
  - 支持无 `name` 的 `{ hex, rgb }` 颜色；
  - 匹配结果保留 `hex`；
  - 旧特殊效果过滤不应因缺失 name 报错。
- 如有必要新增 worker 初始化的轻量测试或通过现有集成测试覆盖。

**实现**

- `color-matching.js`：以 `{ hex, rgb }` 为主，不依赖 `id/name`。
- `worker.js`：初始化单一 unified palette；移除/停用品牌 recommend 分支。
- `app.js`：加载 mapping，构建 unified palette，传给 worker。

**验收**

- color matching 测试通过。
- `node --check js/worker.js js/app.js` 通过。

---

### Task 4 — UI 与渲染/清单迁移

**测试先行**

- 更新 `scripts/check-layout.js` 或新增检查：
  - 页面存在 `colorSystemSelect`；
  - 页面不再存在主流程 `brandSelect`；
  - 有 `statusMessage`；
  - 不再暴露 Hama / Perler / Artkal 主品牌选项。
- 为 renderer 增加可脚本化测试（若现有环境不支持 canvas，可测试 display code helper 在渲染路径中的纯函数；否则通过静态检查兜底）。

**实现**

- `index.html`：品牌选择改为色号系统选择；更新文案；新增 `statusMessage`；移除/隐藏 `brandRecommend`。
- `renderer.js`：传入 `colorSystem/mapping`，通过 `getColorCode` 绘制编号。
- `app.js`：`currentBrand -> currentColorSystem`；切换系统只重渲染图纸和清单，不重新匹配。
- `updateCountsList` 按 hex 显示 code、色样、hex、数量。

**验收**

- layout 检查通过。
- 手动或自动确认切换色号系统无需重新生成。

---

### Task 5 — CSV/PNG/打印导出迁移

**测试先行**

- 更新 `scripts/test-exporter.mjs`：
  - `formatShoppingListCSV(counts, system, mapping)` 输出 `code,hex,count`；
  - 缺失 code 时输出 `?`；
  - 旧 id 不参与 CSV。

**实现**

- `exporter.js`：CSV 接口切到 `counts + colorSystem + mapping`。
- `app.js`：调用 CSV 导出时传当前系统和 mapping。
- PNG/print 继续复用 canvas。

**验收**

- exporter 测试通过。

---

### Task 6 — 合规和文档更新

**测试/检查先行**

- 检查当前仓库无 LICENSE，需要新增。
- README 文案检查：不再宣称 Hama/Perler/Artkal 是主色表。

**实现**

- 新增 `LICENSE`（AGPL-3.0，按上游兼容策略）。
- 新增 `NOTICE`，包含上游 URL、commit/获取日期、数据用途、改动说明、许可证和版权声明。
- 更新 `README.md` 项目描述、功能、结构、验证命令、许可证章节。

**验收**

- README 和 NOTICE 与实际实现一致。

---

### Task 7 — 全量验证与收尾

运行：

```bash
node --check js/color-systems.js
node --check js/app.js
node --check js/worker.js
node --check js/image-processing.js
node --check js/renderer.js
node --check js/exporter.js
node --check js/grid-operations.js
node scripts/test-color-matching.mjs
node scripts/test-exporter.mjs
node scripts/test-grid-operations.mjs
node scripts/test-image-processing.mjs
node scripts/check-layout.js
python3 -m compileall backend
```

如 Docker 可用，再运行：

```bash
docker compose config
docker compose -f docker-compose.local.yml config
```

---

## 风险与处理

| 风险 | 处理 |
|---|---|
| 映射数据量大，手动复制出错 | 从参考仓库复制原始 JSON 后用校验脚本验证 |
| 大网格内存膨胀 | cell 不复制 codes，只存 hex/rgb/dist |
| 旧 id 残留 | 负向测试覆盖 renderer/count/export 不依赖 id |
| AGPL 表述不清 | LICENSE + NOTICE + README 同步更新 |
| UI 文案和 JS id 不一致 | layout 脚本检查 DOM id 和旧选项 |
