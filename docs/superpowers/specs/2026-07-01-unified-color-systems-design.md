# 统一色号系统架构设计

**日期**: 2026-07-01  
**状态**: 待评审  
**目标**: 将当前以 Hama / Perler / Artkal C 品牌色表为主的图纸生成流程，重构为类似 Zippland/perler-beads 的统一色号系统架构，解决图纸格子编号默认显示 `Hxx` 导致“全是 H”的问题，并让图纸、清单、导出统一显示 `MARD / COCO / 漫漫 / 盼盼 / 咪小窝` 色号。

---

## 1. 背景

当前项目的颜色匹配与图纸渲染以品牌 palette 为中心：

- `palettes/hama.json`
- `palettes/perler.json`
- `palettes/artkal_c.json`

生成 grid cell 时保存品牌色号 `id`，例如 `H01`；渲染时直接画 `cell.id`。由于默认品牌是 Hama，所有 Hama 色号都以 `H` 开头，用户看到的图纸编号就像“全是 H”。

参考项目的做法更干净：以 hex 颜色作为内部稳定键，显示时根据用户选择的色号系统映射到对应编号。我们决定采用这个架构，不在现有 Hama / Perler / Artkal 流程上继续打补丁。

---

## 2. 设计目标

1. **统一数据模型**  
   内部颜色以 hex 为主键，不再以某个品牌 `id` 作为主键。

2. **统一显示体系**  
   用户选择 `MARD / COCO / 漫漫 / 盼盼 / 咪小窝` 后，预览图纸、PNG、打印、CSV、豆子清单都显示同一个体系的色号。

3. **减少概念混杂**  
   主流程不再同时维护 `id`、`symbol`、`displayCode` 多套编号概念。

4. **保留当前核心能力**  
   继续保留上传图片、网格尺寸、采样模式、保真度、跳过透明/指定颜色、底板线、高亮、去背景、导出等能力。

5. **合规使用参考数据**  
   若使用 Zippland/perler-beads 的色号映射数据，项目需要明确 AGPL-3.0 许可证和来源声明。

---

## 3. 非目标

本次不做以下内容：

- 不继续维护 Hama / Perler / Artkal C 作为主品牌选择。
- 不实现多品牌并存购物清单。
- 不引入 React / Next.js；仍保持当前原生 HTML + JS 模块结构。
- 不直接照搬参考项目的 UI 或组件代码。
- 不在第一版中解决所有颜色商品名、本地化名称或购买链接问题。

---

## 4. 用户体验设计

### 4.1 色号系统选择

原有品牌选择：

```text
Hama / Perler / Artkal C
```

替换为色号系统选择：

```text
MARD / COCO / 漫漫 / 盼盼 / 咪小窝
```

默认值建议：`MARD`。

### 4.2 图纸格子编号

格子中显示当前色号系统的编号：

```text
A01 / B12 / E2 / 65 / 77 ...
```

如果某个 hex 在当前系统没有映射，显示 `?`。正常情况下，来自完整映射表的颜色都应该有映射。

### 4.3 豆子清单

清单按当前色号系统显示：

```text
A01  ×120
B03  ×48
E2   ×16
```

清单仍显示色样和数量。颜色名称第一版可不显示，避免从旧品牌名称体系中混入不一致信息。

### 4.4 导出

- PNG：复用当前 canvas，显示当前色号系统编号。
- 打印：继续按底板分页裁切当前 canvas。
- CSV：导出当前色号系统下的购物清单，字段建议为：`code,hex,count`。

---

## 5. 数据设计

### 5.1 主映射文件

新增主数据文件：

```text
palettes/color-system-mapping.json
```

结构：

```json
{
  "#FAF4C8": {
    "MARD": "A01",
    "COCO": "E02",
    "漫漫": "E2",
    "盼盼": "65",
    "咪小窝": "77"
  }
}
```

要求：

- hex 统一大写，格式必须为 `#RRGGBB`。
- 不接受 3 位 hex、无 `#` hex、空字符串、`null` 或非字符串 key；导入脚本/校验脚本发现后应 fail fast。
- 每个条目必须包含五个系统字段：`MARD / COCO / 漫漫 / 盼盼 / 咪小窝`。字段值必须是非空字符串，并在写入前 trim。
- JSON 对象天然不能保留重复 key；若从上游生成 mapping，生成脚本必须检测重复 hex 并中止。
- 同一色号系统内允许多个 hex 对应同一个 code，但校验脚本必须报告 warning，并在 README/校验输出中说明这是数据特性还是需要人工修正。清单仍按 hex 聚合，避免把不同颜色错误合并。
- 文件来源和许可证需要在 README / NOTICE / LICENSE 中说明。

### 5.2 运行时 palette

从 mapping 转换为颜色匹配使用的 palette：

```js
{
  hex: '#FAF4C8',
  rgb: [250, 244, 200],
  codes: {
    MARD: 'A01',
    COCO: 'E02',
    '漫漫': 'E2',
    '盼盼': '65',
    '咪小窝': '77'
  }
}
```

### 5.3 Grid cell

新的 cell 数据只保存渲染和编辑必须的信息，不在每个格子复制完整 `codes` 对象，避免 500×500 网格、worker `postMessage`、undo snapshot 和 clone 操作出现不必要的内存膨胀。

```js
{
  hex: '#FAF4C8',
  rgb: [250, 244, 200],
  dist: 1.23
}
```

空白仍使用 `null`。

显示编号时统一通过 helper 从全局 mapping 查询：

```js
getColorCode(cell.hex, currentColorSystem)
```

### 5.4 Counts

旧结构：

```js
{ H01: 120 }
```

新结构按 hex 聚合：

```js
{ '#FAF4C8': 120 }
```

显示时通过 `getColorCode(hex, selectedColorSystem)` 转成当前色号。

---

## 6. 模块设计

### 6.1 新增 `js/color-systems.js`

职责：

- 定义支持的系统列表。
- 将 mapping 转换成可匹配 palette。
- 提供 hex 标准化和 rgb 转换。
- 提供 `getColorCode(hex, system)`。
- 提供 `getColorEntry(hex)`。
- 提供 `validateColorSystemMapping(mapping)`，用于加载时校验格式、缺失字段和重复 code warning。

建议接口：

```js
export const COLOR_SYSTEMS = ['MARD', 'COCO', '漫漫', '盼盼', '咪小窝'];
export const DEFAULT_COLOR_SYSTEM = 'MARD';

export function validateColorSystemMapping(mapping) {}
export function buildPaletteFromMapping(mapping) {}
export function getColorCode(hex, system, mapping) {}
export function getColorEntry(hex, mapping) {}
export function normalizeHex(hex) {}
export function hexToRgb(hex) {}
```

### 6.2 `app.js`

改动：

- `currentBrand` 改为 `currentColorSystem`。
- 启动时加载 `palettes/color-system-mapping.json`。
- 加载后先调用 `validateColorSystemMapping`，校验失败时阻止生成并显示错误。
- 将转换后的 unified palette 传给 worker。
- 色号系统选择变化时不需要重新匹配颜色，只需要重新渲染图纸和清单。
- 如果 mapping 尚未加载，生成按钮保持 disabled。
- 删除或停用 `showBrandRecommendation`、`recommend` 请求发送和 `brandRecommend` 状态更新，避免旧品牌推荐逻辑残留。

### 6.3 `worker.js`

改动：

- 不再接收多品牌 palettes。
- 初始化时接收单一 unified palette。
- 推荐品牌逻辑移除或停用，因为不再比较 Hama / Perler / Artkal。

### 6.4 `color-matching.js`

改动：

- matcher 返回完整 unified color：`hex/rgb/codes`。
- 特殊效果过滤逻辑如果依赖 `name`，需要移除或改为无条件匹配，因为新映射第一版不包含名称。

### 6.5 `image-processing.js`

改动：

- cell 保存 `hex/rgb/codes/dist`。
- 相似色合并、噪点清理、统计都改用 `hex` 比较和聚合。

### 6.6 `renderer.js`

改动：

- 渲染参数新增 `colorSystem` 和 `mapping`。
- 绘制文字时使用 `getColorCode(cell.hex, colorSystem, mapping) || '?'`。
- 高亮比较改为按 `hex`。
- 不再读取 `cell.id`；需要增加负向测试防止旧字段回流。

### 6.7 `grid-operations.js`

改动：

- clone、count、背景移除、排除颜色、重映射全部改为以 `hex` 作为颜色身份。

### 6.8 `exporter.js`

改动：

- CSV 导出使用 `code,hex,count`。
- `formatShoppingListCSV` 接收 `counts, colorSystem, mapping`，用 `getColorCode(hex, colorSystem, mapping)` 生成 code。
- PNG / print 继续使用当前 canvas，无额外编号逻辑。

### 6.9 `index.html`

改动：

- 将 `brandSelect` 改为 `colorSystemSelect`，选项为 `MARD / COCO / 漫漫 / 盼盼 / 咪小窝`。
- 将“品牌”“品牌色表”等文案改为“色号系统”“统一色号表”。
- 移除或隐藏 `brandRecommend` 容器。
- 新增轻量状态提示容器，例如 `statusMessage`，用于 mapping 加载失败、数据校验失败等错误提示；避免只依赖 `alert`。

---

## 7. 数据流

```text
加载 color-system-mapping.json
          │
          ▼
buildPaletteFromMapping(mapping)
          │
          ▼
上传图片 → 采样 → CIEDE2000 匹配 unified palette
          │
          ▼
生成 grid cell: { hex, rgb, codes, dist }
          │
          ├─ Canvas: codes[currentColorSystem]
          ├─ 清单: counts[hex] → code
          ├─ CSV: code,hex,count
          └─ 打印/PNG: 复用 canvas
```

切换色号系统时：

```text
currentColorSystem 变化
          │
          ├─ 重新 renderFromGrid()
          └─ 重新 updateCountsList()
```

不重新跑图片匹配。

---

## 8. 兼容与迁移

### 8.1 旧 palette 文件

第一阶段可以保留旧文件但不再主流程加载：

- `palettes/hama.json`
- `palettes/perler.json`
- `palettes/artkal_c.json`

确认新流程稳定后，可在后续清理任务中删除。

### 8.2 旧品牌推荐

品牌推荐依赖三套品牌 palette，和统一色号系统架构冲突。第一阶段停用：

- 隐藏或移除 `brandRecommend`。
- 移除 worker 的 `recommend` 消息使用。

### 8.3 颜色名称

新映射第一版没有统一名称。清单先显示色号、色样、数量和 hex，不显示旧品牌名称，避免误导。

---

## 9. 错误处理

1. mapping 加载失败：
   - 生成按钮保持 disabled。
   - `statusMessage` 显示“色号映射加载失败，请刷新重试”。

2. mapping 条目格式错误：
   - 加载校验阶段 fail fast，不进入半可用状态。
   - `statusMessage` 显示“色号映射数据无效，请检查数据文件”。
   - 如果最终 palette 为空，阻止生成。

3. 缺失当前系统编号：
   - 图纸显示 `?`。
   - CSV 中 code 为 `?`。
   - 这种情况应通过数据校验尽量避免。

4. grid 中旧字段残留：
   - 迁移后主流程不应产生 `id`。
   - 测试需要覆盖 `id` 不再参与统计和渲染。

---

## 10. 合规设计

因为计划使用 Zippland/perler-beads 的色号映射数据：

1. 新增 `LICENSE`，采用与上游兼容的 AGPL-3.0。实现前需要确认上游是 `AGPL-3.0-only` 还是 `AGPL-3.0-or-later`；无法确认时按 `AGPL-3.0-only` 处理更保守。
2. 新增 `NOTICE`，至少包含：
   - 上游仓库 URL：`https://github.com/Zippland/perler-beads`。
   - 使用的数据文件：色号映射数据。
   - 获取日期或上游 commit hash。
   - 本项目对数据做过的格式调整或未修改声明。
   - 上游许可证和版权声明。
   - 本项目自身版权声明。
3. 更新 README：
   - 功能描述改为统一色号系统。
   - 删除 Hama / Perler / Artkal 作为主色表的描述。
   - 添加许可证、源码开放和网络使用场景下 AGPL 源码提供义务说明。
   - 添加致谢说明。

---

## 11. 验证计划

### 11.1 静态检查

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

### 11.2 单元/脚本测试

更新或新增脚本覆盖：

- mapping 能转换为非空 palette。
- mapping 校验能拒绝非法 hex、缺失系统字段、空 code，并报告重复 code warning。
- 每个 palette entry 有 hex、rgb；cell 不复制 codes。
- `getColorCode('#FAF4C8', 'MARD')` 返回映射编号。
- `countGridColors` 按 hex 统计。
- `excludeAndRemapColor` 按 hex 排除并重映射。
- `formatShoppingListCSV` 输出 `code,hex,count`。
- 负向测试：构造带旧字段 `{ id: 'H01', hex: '#FAF4C8' }` 的 cell，确认 renderer/count/export 都不输出或依赖 `H01`。
- 更新所有现有测试脚本中依赖旧 `id/name` 的 fixture。

### 11.3 手动验证

- 上传图片后生成图纸，格子中不再出现统一品牌前缀 `Hxx`。
- 页面不再出现“品牌色表”“Hama / Perler / Artkal C”主流程文案。
- 切换 `MARD / COCO / 漫漫 / 盼盼 / 咪小窝`，无需重新生成图片，图纸编号和清单同步变化。
- PNG 下载和打印内容与当前预览一致。
- CSV 中 code 与当前选择的色号系统一致。
- 一键去背景、颜色排除、单色高亮仍可用。

---

## 12. 实施边界

第一阶段只完成统一色号系统替换。旧 Hama / Perler / Artkal 文件可以暂留，避免一次提交中同时做过多删除。等新流程通过验证后，再单独清理无用文件和文档。

---

## 13. 开放问题

无阻塞开放问题。设计默认：

- 默认色号系统为 `MARD`。
- 直接使用参考项目映射数据，并按 AGPL-3.0 合规处理。
- 新流程不保留 Hama / Perler / Artkal 主品牌选择。
