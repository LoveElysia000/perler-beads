# 拼豆图纸生成器

一个浏览器端拼豆图纸生成工具。上传图片后，应用会把图片转换为拼豆网格，按统一色号系统标注每格豆子编号，生成图纸、豆子用量清单，并支持 PNG、CSV 和打印导出。

## 功能特性

- 图片上传：支持拖拽、文件选择、剪贴板粘贴。
- 网格尺寸：支持自定义宽高和 `29×29`、`58×58`、`87×87`、`116×116` 预设。
- 色号系统：支持 MARD / COCO / 漫漫 / 盼盼 / 咪小窝 统一色号显示。
- 颜色匹配：使用 CIEDE2000 感知色差匹配统一色表。
- 图纸生成：Canvas 渲染彩色拼豆网格，支持品牌编号显示。
- 线稿优化：按格子区域采样，并保护黑色轮廓，减少插画线稿失真。
- 保真度控制：低/中保真度会清理孤立噪点，高保真度保留更多细节。
- 底板辅助线：每 `29×29` 格显示一条底板分界线。
- 豆子清单：统计每个颜色编号的用量，可点击单色高亮。
- 导出：支持下载 PNG、导出 CSV 购物清单、浏览器打印。
- 部署：FastAPI 托管静态前端，Docker 一体化部署。

## 项目结构

```text
perler-beads/
├── index.html                    # 前端页面
├── css/style.css                  # 少量自定义样式
├── js/
│   ├── app.js                     # 主流程、事件绑定、图片处理编排
│   ├── worker.js                  # Web Worker，执行颜色匹配
│   ├── image-processing.js        # 分块采样、线稿保护、噪点清理
│   ├── ciede2000.js               # CIEDE2000 色差算法
│   ├── color-matching.js          # 颜色匹配评分引擎
│   ├── color-systems.js           # 统一色号系统：映射加载、校验、编码查询
│   ├── renderer.js                # Canvas 图纸渲染
│   ├── exporter.js                # PNG / CSV / 打印导出
│   ├── reducer.js                 # 聚类与减色工具函数
│   └── grid-operations.js         # 去背景、颜色排除、重映射
├── palettes/
│   └── color-system-mapping.json  # 统一色号映射表（hex → MARD/COCO/漫漫/盼盼/咪小窝）
├── backend/
│   ├── main.py                    # FastAPI 应用，托管静态文件
│   ├── requirements.txt
│   └── routers/ai.py              # 预留 AI 接口
├── scripts/
│   ├── check-layout.js            # 基础布局检查
│   ├── check-sampling-resolution.mjs
│   ├── test-color-matching.mjs    # 颜色匹配行为测试
│   ├── test-color-systems.mjs     # 色号系统映射和验证测试
│   ├── test-exporter.mjs          # CSV 导出格式测试
│   ├── test-grid-operations.mjs   # 网格操作测试
│   └── test-image-processing.mjs  # 图像处理行为测试
├── Dockerfile
├── docker-compose.yml             # 服务器部署，含 Watchtower 自动更新
├── docker-compose.local.yml       # 本地源码构建测试
├── LICENSE                        # AGPL-3.0
├── NOTICE                         # 数据来源与版权声明
├── DEPLOY.md                      # 详细部署说明
└── .github/workflows/deploy.yml   # GitHub Actions 构建并推送 GHCR 镜像
```

## 本地开发

### 1. 准备 Python 环境

推荐使用项目本地虚拟环境：

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
```

如果使用 `uv`：

```bash
uv venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
```

### 2. 启动服务

```bash
.venv/bin/uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

访问：

```text
http://127.0.0.1:8000
```

健康检查：

```text
http://127.0.0.1:8000/api/ai/health
```

### 3. 仅预览静态页面

如果只是改前端，也可以直接启动静态服务：

```bash
python3 -m http.server 4173
```

访问：

```text
http://127.0.0.1:4173
```

## 验证命令

```bash
node scripts/test-image-processing.mjs
node scripts/check-layout.js
node --check js/app.js
node --check js/worker.js
node --check js/image-processing.js
python3 -m compileall backend
docker compose config
docker compose -f docker-compose.local.yml config
```

如果本机 Docker 正在运行，可以测试本地镜像构建：

```bash
docker compose -f docker-compose.local.yml up -d --build
```

停止：

```bash
docker compose -f docker-compose.local.yml down
```

## 部署

项目使用 GitHub Actions 构建 Docker 镜像并推送到 GHCR：

```text
ghcr.io/loveelysia000/perler-beads:latest
```

服务器使用 `docker-compose.yml` 启动应用和 Watchtower。Watchtower 会定期检查镜像更新，并自动重启应用容器。

服务器首次部署：

```bash
mkdir -p /opt/perler-beads
cd /opt/perler-beads
# 将 docker-compose.yml 放到该目录
docker compose up -d
```

后续发布只需要推送代码：

```bash
git push
```

详细部署说明见 [DEPLOY.md](DEPLOY.md)。

## GitHub Actions

工作流文件：[.github/workflows/deploy.yml](.github/workflows/deploy.yml)

触发条件：

- push 到 `main`
- push 到 `master`
- 手动 `workflow_dispatch`

产物：

- `ghcr.io/loveelysia000/perler-beads:latest`
- `ghcr.io/loveelysia000/perler-beads:<commit-sha>`

如果 GHCR package 是公开的，服务器通常不需要 `docker login ghcr.io`。

## 技术栈

- 前端：HTML、Tailwind CDN、Vanilla JavaScript、Canvas API、Web Worker
- 图像处理：Canvas ImageData、CIEDE2000 色差、分块采样、线稿保护
- 后端：FastAPI、Uvicorn
- 部署：Docker、Docker Compose、GitHub Actions、GHCR、Watchtower

## 当前限制

- Tailwind 当前通过 CDN 加载，生产环境如需完全离线或更稳定的国内访问，可后续改为本地构建 CSS。
- `/api/ai/remove-bg` 和 `/api/ai/reduce-colors` 是 Phase 2 预留接口，目前返回占位结果。
- 拼豆生成主要在浏览器端完成，超大网格会增加浏览器计算和渲染压力。

此项目基于 [Zippland/perler-beads](https://github.com/Zippland/perler-beads) 项目的色号映射数据，遵循 **GNU Affero General Public License v3.0 (AGPL-3.0)** 开源。

作为网络服务运行本项目的修改版本时，需要向用户提供对应的完整源代码。
详细条款见 [LICENSE](LICENSE)，数据来源声明见 [NOTICE](NOTICE)。。
