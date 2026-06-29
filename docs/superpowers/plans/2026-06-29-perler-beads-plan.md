# 拼豆图纸生成器 — 实现计划

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** 网页工具：上传图片 → 拼豆图纸（品牌编号标注 + 用量清单 + 导出打印）。

**Architecture:** 前端 Tailwind CSS + Vanilla JS (ES modules) + Canvas API + Module Web Worker (CIEDE2000)；后端 FastAPI 托管静态文件 + 预留 AI 代理。

**Tech Stack:** HTML + Tailwind CSS (CDN) + Vanilla JS (ES modules) + Canvas API + Module Web Worker + FastAPI + CIEDE2000

**Design:** indigo-500 主色 · slate-50 背景 · Inter 字体 · 白底卡片 + shadow-sm · rounded-xl · duration-150 · SVG 图标

---

## 文件结构

```
perler-beads/
├── index.html              # Tailwind CSS 页面
├── css/style.css            # 仅 ~30 行定制（drag-over, pixelated, print）
├── Dockerfile               # Docker 镜像
├── docker-compose.yml        # 一键部署
├── .dockerignore
├── .github/workflows/deploy.yml  # CI/CD 自动部署
├── js/
│   ├── app.js               # 主逻辑：事件绑定、流程编排
│   ├── worker.js             # Module Web Worker：颜色匹配
│   ├── ciede2000.js          # CIEDE2000 色差算法 (ES module)
│   ├── reducer.js            # 智能减色 K-Means (ES module)
│   ├── renderer.js           # Canvas 渲染
│   └── exporter.js           # PNG / CSV / 打印分页
├── palettes/
│   ├── perler.json           # 103 色
│   ├── hama.json             # 92 色
│   └── artkal_c.json         # 174 色
└── backend/
    ├── main.py               # FastAPI + 静态文件
    ├── requirements.txt       # fastapi, uvicorn
    └── routers/
        ├── __init__.py
        └── ai.py              # 预留 AI 接口（Phase 2）
```

---

### Task 0: 项目初始化

- [ ] 创建 `backend/requirements.txt`：`fastapi==0.115.0` + `uvicorn==0.30.0`
- [ ] 创建 `backend/main.py`：FastAPI app，mount 静态文件到 `/`，include `/api/ai` 路由
- [ ] 创建 `backend/routers/__init__.py`（空）和 `ai.py`（health + remove-bg/reduce-colors 占位）
- [ ] 验证：`uv run uvicorn backend.main:app --port 8000` 启动成功
- [ ] 色表数据已存在于 `palettes/`（perler.json 103色 / hama.json 92色 / artkal_c.json 174色），格式 `{ name, colors: [{ id, name, symbol, rgb }] }`
- [ ] Commit: `feat: init backend + palettes`

---

### Task 1: CIEDE2000 色差算法

- [ ] 创建 `js/ciede2000.js`（ES module）
- [ ] 导出 `ciede2000(r1,g1,b1, r2,g2,b2)` → ΔE00 值
- [ ] 内部：sRGB→XYZ→Lab → CIEDE2000 完整公式（含 G、T、SL/SC/SH、RT 修正项）
- [ ] 导出 `rgbToLab(r,g,b)` 供调试
- [ ] 注意：ES module 格式，Worker 中通过 `import { ciede2000 } from './ciede2000.js'` 加载
- [ ] Commit: `feat: add CIEDE2000 color difference (ES module)`

---

### Task 2: Module Web Worker

- [ ] 创建 `js/worker.js`
- [ ] 顶部 `import { ciede2000 } from './ciede2000.js'`（Module Worker 语法）
- [ ] `onmessage` 处理三种消息类型：
  - `init`：接收 palettes 对象，初始化 colorCache Map
  - `match`：对 imageData 逐像素做 CIEDE2000 匹配 → 返回 `{ grid[m][n], counts{} }`。支持 skipTransparent (alpha<128)、skipColor (RGB距离<1000)。相同 RGB 缓存命中
  - `recommend`：三个品牌各跑一遍，采样步长 `max(1, min(w,h)/80)`，返回各品牌 avgDeltaE
- [ ] 空白格返回 `null`，有效格返回 `{ id, name, rgb, dist }`
- [ ] Commit: `feat: add Module Web Worker with CIEDE2000 matching`

---

### Task 3: 智能减色模块

- [ ] 创建 `js/reducer.js`（ES module）
- [ ] 导出四个函数：
  - `kMeansReduce(pixels, k, iterations=10)` — K-Means 聚类，随机初始化，最多 10 轮
  - `mapToCenters(pixels, centers)` — 像素映射到最近聚类中心
  - `cleanNoise(grid)` — 孤立单像素合并到周围多数色（8 邻域内无同色 → 合并）
  - `mergeCloseColors(grid)` — RGB 距离 < 12 且各自占比 < 5% 的相似色合并
- [ ] MVP 阶段独立保留，Phase 2 在 Worker 中接入
- [ ] Commit: `feat: add smart color reduction module`

---

### Task 4: Canvas 渲染器

- [ ] 创建 `js/renderer.js`（ES module）
- [ ] 导出 `renderPattern(canvas, grid, options)`：
  - 逐格绘制：有颜色 → 填底色 + 写编号（浅底深字/深底浅字）；null → 浅灰 `#f1f5f9`
  - `showCodes` 控制是否显示编号，cellSize<12 时自动隐藏
  - `showBoardLines`：每 29 格画 2px 粗线 `#94a3b8`
  - `highlightColor`：非高亮色变淡 `r*0.25+165`，高亮色不变
  - 格线 0.5px `#e2e8f0`
- [ ] 导出 `computeCellSize(gridW, gridH, maxW, maxH)` → 自动适配容器尺寸
- [ ] Commit: `feat: add Canvas pattern renderer`

---

### Task 5: 导出模块

- [ ] 创建 `js/exporter.js`（ES module）
- [ ] `downloadPNG(canvas, filename)` — canvas.toBlob → 下载
- [ ] `downloadCSV(counts, brand)` — 生成 BOM + CSV（编号,颜色名,数量），按数量降序
- [ ] `printPattern(canvas, gridW, gridH)` — 新窗口，按 29×29 底板拆分 canvas 区域，每板一页，打印
- [ ] Commit: `feat: add export module (PNG, CSV, print)`

---

### Task 6: 主页面 + Tailwind CSS + 逻辑

- [ ] 创建 `index.html`
  - 加载 Tailwind CDN：`<script src="https://cdn.tailwindcss.com"></script>` + config（Inter 字体）
  - 加载 Google Fonts Inter（400/500/600/700）
  - 页面结构：Header（logo SVG + 品牌推荐 badge + 品牌下拉）→ 三栏 flex 主区域 → `<script type="module" src="/js/app.js">`
  - 左栏（w-80）：上传卡片（虚线拖拽区 + 文件按钮 + 粘贴提示）→ 裁剪画布（上传后显示，拖拽选区）→ 设置卡片（网格尺寸 input×2 + 预设按钮 + 长宽比下拉 + 跳过色 checkbox×2 + 保真度滑块）→ 生成按钮（indigo-500 全宽）
  - 中栏（flex-1）：空状态占位 SVG → 预览区（toolbar：彩色/编号切换 + 缩放按钮 → Canvas 容器）
  - 右栏（w-65）：豆子清单卡片（色样圆点 + 编号 + 名称 + 数量，点击高亮）→ 导出卡片（PNG/CSV/打印按钮）
  - 所有样式用 Tailwind 工具类，无自定义 CSS class
  - 响应式：≤960px 时 flex-col 堆叠

- [ ] 创建 `css/style.css`（仅 ~30 行）
  - `#dropZone.drag-over { border-color + background }`
  - `#patternCanvas { image-rendering: pixelated }`
  - counts list 的 li、swatch、name、count 样式（动态生成，Tailwind 不方便）
  - `@media print` 隐藏 header + 侧栏
  - `.hidden { display: none !important }`

- [ ] 创建 `js/app.js`（ES module）
  - 导入 renderer.js + exporter.js
  - **Worker 初始化**：`new Worker('/js/worker.js', { type: 'module' })`，fetch 三个 palette JSON 后 postMessage('init')，缓存到 paletteCache
  - **图片加载**：FileReader → Image → 保存 currentImage（Image 对象），支持拖拽 + 点击 + Ctrl+V
  - **长宽比处理**：`applyAspectRatio(img, w, h, mode)` — fill 拉伸 / fit 留白居中 / crop 裁切居中，返回 ImageData
  - **裁剪**：上传后显示裁剪画布，拖拽选区 → 确认后替换 currentImage
  - **runMatch()**：调 applyAspectRatio → postMessage('match') + postMessage('recommend')
  - **渲染**：`renderFromGrid()` 调 renderPattern，cellSize 自适应容器 × zoomLevel
  - **清单更新**：从 paletteCache 取色表 → 生成 li 列表 → 点击 toggle highlightColor → 重新渲染
  - **品牌推荐**：比较三品牌 avgDeltaE，推荐最小的，显示 badge
  - **保真度滑块**：200ms debounce，标签切换（最少色/经济/平衡/高质量/原色）
  - **视图切换**：彩色/编号按钮互换 active class
  - **缩放**：zoomLevel 0.25~4，步长 0.25
  - **导出**：下载 PNG / CSV / 打印
  - **预设按钮**：用 data-w/data-h 属性，`querySelectorAll('[data-w]')` 选择器

- [ ] Commit: `feat: add Tailwind CSS UI + app logic`

---

### Task 7: 集成测试

- [ ] 启动 `uv run uvicorn backend.main:app --port 8000`
- [ ] 验证：上传（拖拽/点击/Ctrl+V）→ 裁剪 → 生成 → 彩色/编号切换 → 缩放 → 底板线 → 单色高亮 → 品牌推荐 → 保真度滑块 → PNG/CSV/打印 → 无控制台报错
- [ ] Commit: `feat: complete MVP`

---

## 关键技术决策

| 决策 | 选择 | 原因 |
|------|------|------|
| Worker 加载方式 | `new Worker(url, { type: 'module' })` | ciede2000.js 用 ES module export，Worker 内 import 加载 |
| 图片对象存储 | 保存 Image + 按需生成 ImageData | applyAspectRatio 需要 Image 参数 |
| 色表缓存 | paletteCache 对象 | 避免 updateCountsList 重复 fetch |
| 推荐采样 | 步长 `max(1, min(w,h)/80)` | 减少计算量，精度足够 |
| 保真度滑块 | 200ms debounce | 拖动不卡，停下才算 |
| CSS 策略 | Tailwind CDN + ~30 行定制 | 99% 样式用工具类，特殊情况保留 CSS |


## 部署

详见 [`docs/deploy.md`](../deploy.md)。Docker 容器化 + 1Panel 面板部署，含域名绑定和 HTTPS 配置。
