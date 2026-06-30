# 拼豆图纸生成器 — 部署文档

本项目推荐使用 GitHub Actions 构建 Docker 镜像并推送到 GHCR，服务器使用 Docker Compose + Watchtower 自动拉取更新。

```text
git push → GitHub Actions 构建镜像 → 推送到 GHCR → Watchtower 自动更新服务器容器
```

服务器上只需要保存 `docker-compose.yml`，不需要保存完整源码，也不需要手动安装 Python 依赖。

---

## 1. GitHub Actions

工作流文件：`.github/workflows/deploy.yml`

触发方式：

- push 到 `main`
- push 到 `master`
- 手动运行 workflow

镜像会推送到：

```text
ghcr.io/loveelysia000/perler-beads:latest
ghcr.io/loveelysia000/perler-beads:<commit-sha>
```

仓库需要允许 Actions 写入 Packages：

```text
GitHub 仓库 → Settings → Actions → General → Workflow permissions → Read and write permissions
```

---

## 2. 服务器首次部署

创建部署目录：

```bash
sudo mkdir -p /opt/perler-beads
cd /opt/perler-beads
```

将项目里的 `docker-compose.yml` 放到该目录，然后启动：

```bash
docker compose up -d
```

访问：

```text
http://服务器IP:8000
```

健康检查：

```text
http://服务器IP:8000/api/ai/health
```

---

## 3. Watchtower 自动更新

`docker-compose.yml` 中包含 Watchtower：

```yaml
watchtower:
  image: containrrr/watchtower:latest
  container_name: perler-beads-watchtower
  restart: unless-stopped
  environment:
    - TZ=Asia/Shanghai
    - DOCKER_API_VERSION=1.40
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  command: --interval 60 --cleanup --label-enable
```

应用容器带有：

```yaml
labels:
  - "com.centurylinklabs.watchtower.enable=true"
```

`--label-enable` 表示 Watchtower 只更新带这个 label 的容器，避免影响服务器上其他容器。

---

## 4. GHCR package 权限

如果 GHCR package 是公开的，服务器通常不需要登录。

可以在服务器测试：

```bash
docker pull ghcr.io/loveelysia000/perler-beads:latest
```

如果提示 `unauthorized` 或 `denied`，说明 package 不是公开可拉取，需要先登录：

```bash
docker login ghcr.io
```

使用 GitHub Personal Access Token，权限至少包含：

```text
read:packages
```

---

## 5. 绑定域名 + HTTPS（可选）

推荐用 Nginx、Caddy 或 1Panel 反向代理：

```text
https://beads.example.com → http://127.0.0.1:8000
```

如果使用 1Panel：

1. 网站 → 创建网站 → 反向代理
2. 代理地址填：`http://127.0.0.1:8000`
3. 绑定域名
4. 开启 SSL 自动申请证书

---

## 6. 常用命令

查看容器：

```bash
docker ps
```

查看应用日志：

```bash
docker logs -f perler-beads
```

查看自动更新日志：

```bash
docker logs -f perler-beads-watchtower
```

手动更新一次：

```bash
docker compose pull
docker compose up -d
```

---

## 7. 故障排查

| 问题 | 检查 |
|------|------|
| GitHub Actions 推送失败 | Workflow permissions 是否是 Read and write |
| 服务器拉取镜像失败 | GHCR package 是否 Public；必要时 `docker login ghcr.io` |
| 访问不了 8000 | 防火墙、安全组、1Panel 安全页面是否放行端口 |
| Watchtower 不更新 | 应用容器是否带 `com.centurylinklabs.watchtower.enable=true` label |
| 页面空白 | 浏览器 F12 Console；容器日志 `docker logs -f perler-beads` |
| HTTPS 失败 | 域名解析、80/443 端口、反向代理配置 |
