# 部署说明

这个项目推荐使用 GitHub Actions 自动构建镜像，再由服务器上的 Watchtower 自动拉取更新。

## 日常发布流程

以后只需要把代码推到 GitHub 主分支：

```bash
git push
```

GitHub Actions 会自动构建并推送镜像：

```text
ghcr.io/loveelysia000/perler-beads:latest
```

服务器上的 Watchtower 会定时检查新镜像并自动重启容器。

## 服务器首次部署

1. 安装 Docker 和 Docker Compose。
2. 在服务器创建目录，例如：

```bash
sudo mkdir -p /opt/perler-beads
cd /opt/perler-beads
```

3. 上传或复制本仓库的 `docker-compose.yml` 到该目录。
4. 如果 GHCR 镜像是私有的，先登录一次：

```bash
docker login ghcr.io
```

需要使用 GitHub Personal Access Token，权限至少包含 `read:packages`。

5. 启动服务：

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

## 本地构建测试

如果想在本机或服务器上不依赖 GHCR，直接从源码构建：

```bash
docker compose -f docker-compose.local.yml up -d --build
```

停止本地构建服务：

```bash
docker compose -f docker-compose.local.yml down
```

## 查看服务状态

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

## 注意事项

- `docker-compose.yml` 是服务器部署用，使用 GHCR 镜像并包含 Watchtower，容器时区设置为 `Asia/Shanghai`。
- `docker-compose.local.yml` 是本地/源码构建用。
- 如果绑定域名，建议用 Nginx 或 Caddy 反向代理到 `127.0.0.1:8000`，并开启 HTTPS。
