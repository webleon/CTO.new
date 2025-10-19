# Nginx Proxy Manager 门户

[English](./README.md) | 简体中文

一个小型的 Express Web 服务，登录到 Nginx Proxy Manager（NPM）后台 API，渲染一个包含可点击链接的主机目录页面。

徽章：

[![版本](https://img.shields.io/github/v/tag/webleon/cto-new?label=version)](https://github.com/webleon/cto-new/tags)
[![GHCR 镜像](https://img.shields.io/badge/GHCR-ghcr.io%2Fwebleon%2Fcto-new-555?logo=github)](https://ghcr.io/webleon/cto-new)
[![Docker Pulls](https://img.shields.io/docker/pulls/<user>/<repo>?logo=docker&label=Docker%20Hub%20pulls)](https://hub.docker.com/r/<user>/<repo>)

注意：GHCR 镜像发布于 ghcr.io/webleon/cto-new。

## 概述
该服务会登录 NPM 管理端 API，展示一个只读的、简洁的门户页面，列出你在 NPM 中配置的条目。它可作为自建服务的一站式入口页。

## 功能
- 使用管理员凭据对接 NPM 内部 API
- 列出已启用的代理主机（可选包含重定向主机与流/端口转发）
- 域名可点击（若强制 SSL，则为 https，否则为 http）
- 展示状态、上游协议/主机/端口以及 SSL 标志
- 提供跳转到 NPM 管理界面编辑该条目的链接（可选）
- 定期刷新 NPM 数据
- 提供 Docker 与 docker-compose 打包
- 支持通过环境变量开启 HTTP 基本认证来保护门户页面（可选）

## 环境变量
可通过环境变量配置服务。可以直接设置 NPM_BASE_URL，或通过 NPM_HOST 与 NPM_PORT 组合得到。

| 变量 | 是否必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| NPM_BASE_URL | 是（或由下方推导） | — | NPM 管理端/API 的基础地址（如 http://npm.local:81）。若未设置，将根据 NPM_HOST 与 NPM_PORT 推导（http 协议）。 |
| NPM_HOST | 否 | — | 当未设置 NPM_BASE_URL 时，用于推导基础地址的主机名。 |
| NPM_PORT | 否 | — | 当未设置 NPM_BASE_URL 时，用于推导基础地址的端口。 |
| NPM_EMAIL | 是 | — | NPM 管理员邮箱。 |
| NPM_PASSWORD | 是 | — | NPM 管理员密码。 |
| INCLUDE_REDIRECTS | 否 | false | 是否在门户中包含重定向主机。 |
| INCLUDE_STREAMS | 否 | false | 是否在门户中包含流（TCP/UDP）。 |
| REFRESH_INTERVAL_SECONDS | 否 | 60 | 从 NPM 拉取数据的刷新间隔（秒）。 |
| PORT | 否 | 3000 | 门户监听的 HTTP 端口。 |
| BASIC_AUTH_USER | 否 | — | 与 BASIC_AUTH_PASS 同时设置时，为门户启用 HTTP 基本认证。 |
| BASIC_AUTH_PASS | 否 | — | HTTP 基本认证的密码。 |

使用本地 .env 文件快速启动：

```bash
cp .env.example .env
# 编辑 .env 中的变量
```

## 本地运行
- 使用 Node.js：
  ```bash
  npm install
  npm start
  # 打开 http://localhost:3000
  ```

- 使用 Docker Compose（推荐）：
  ```bash
  docker compose up --build
  # 打开 http://localhost:3000
  ```

## GHCR 镜像与标签

```bash
# GHCR 镜像引用
export IMAGE_GHCR=ghcr.io/webleon/cto-new

# 拉取示例
# latest 标签
docker pull ${IMAGE_GHCR}:latest
# 指定版本标签
docker pull ${IMAGE_GHCR}:vX.Y.Z
```

公开拉取：
```bash
docker pull ghcr.io/webleon/cto-new:latest
```

私有拉取：
1. 在 GitHub 创建一个具备 read:packages 权限的经典型 PAT（若包关联私有仓库，可能需要 repo 权限）。
2. 登录并拉取：
   ```bash
   echo '<your-ghcr-pat>' | docker login ghcr.io -u <github-username> --password-stdin
   docker pull ${IMAGE_GHCR}:latest
   ```

### 群晖 DSM（Container Manager）— 从 GHCR 拉取
- 公共镜像（无需认证）：
  1. 打开 Container Manager > 镜像（Image）> 添加 > 通过 URL（By URL）。
  2. 输入镜像：ghcr.io/webleon/cto-new:<tag>（例如 :latest）。
  3. 拉取镜像后按需运行容器。

- 私有镜像（需凭据）：
  1. 在 GitHub 创建具备 read:packages 的 PAT。
  2. 群晖：Container Manager > 设置 > 注册表（或“注册表凭据”）> 新增。
  3. 服务器：ghcr.io；启用认证并填写：
     - 用户名：你的 GitHub 用户名
     - 密码：上一步创建的 PAT
  4. 保存后，转到 Image > Add > By URL，输入 ghcr.io/webleon/cto-new:<tag>；如有提示，选择刚保存的注册表凭据。

- 通过 SSH 的 CLI 方式：
  ```bash
  echo '<your-ghcr-pat>' | docker login ghcr.io -u <github-username> --password-stdin
  docker pull ${IMAGE_GHCR}:latest
  ```

## 在群晖上运行（UI 与 CLI）

- 使用群晖 UI：
  1. Container Manager > 镜像：先按上文拉取镜像。
  2. Container Manager > 容器：从该镜像创建容器。
  3. 常规设置：
     - 容器名：npm-proxy-portal
     - 启用自动重启
  4. 端口设置：
     - 本地端口 5300 -> 容器端口 3000（TCP）
  5. 环境变量：
     - NPM_BASE_URL=http://<npm-host>:81（或设置 NPM_HOST 与 NPM_PORT）
     - NPM_EMAIL、NPM_PASSWORD
     - INCLUDE_REDIRECTS、INCLUDE_STREAMS（可选）
     - REFRESH_INTERVAL_SECONDS（可选）
     - BASIC_AUTH_USER / BASIC_AUTH_PASS（可选）
  6. 卷：无需映射。
  7. 检查设置后应用。

- 使用 SSH 的 CLI 方式：
  ```bash
  export IMAGE_GHCR=ghcr.io/webleon/cto-new
  docker run -d \
    --name npm-proxy-portal \
    -p 5300:3000 \
    --restart unless-stopped \
    -e NPM_BASE_URL=http://<npm-host>:81 \
    -e NPM_EMAIL=admin@example.com \
    -e NPM_PASSWORD=changeme \
    -e INCLUDE_REDIRECTS=false \
    -e INCLUDE_STREAMS=false \
    -e REFRESH_INTERVAL_SECONDS=60 \
    -e BASIC_AUTH_USER=admin \
    -e BASIC_AUTH_PASS=strongpassword \
    ${IMAGE_GHCR}:latest
  ```

## 通过 NPM 对外暴露
你也可以把本门户放在 NPM 反向代理后面：
1. 在 NPM 中创建新的 Proxy Host
2. 域名：portal.example.com
3. 协议：http
4. 转发主机/IP：运行本服务的 Docker 主机
5. 转发端口：3000（若使用了 5300:3000 的映射，则填写 5300）
6. 启用 Websockets（可选）
7. SSL：按需申请证书，并可启用“强制 SSL”

保存后，访问该域名（例如 https://portal.example.com）。

## 故障排查
- 无法登录 NPM：
  - 确认 NPM_BASE_URL 指向 NPM 管理端地址和端口（通常 http://<npm-host>:81），不要填公网反代地址。
  - 校验 NPM_EMAIL 与 NPM_PASSWORD，尝试使用同样账户登录 NPM 管理界面。
- 页面没有条目：
  - 本门户只展示已启用的条目；请确认 NPM 中相关条目已启用。
  - 若需要显示重定向/流，请将 INCLUDE_REDIRECTS/INCLUDE_STREAMS 设为 true。
- GHCR 拉取错误：
  - 私有镜像：确认 PAT 具备 read:packages 权限，且已登录 ghcr.io。
  - 公共拉取：确保 GHCR 包可见性设置为 Public。
- 架构不匹配：
  - 镜像支持 linux/amd64 与 linux/arm64。确认群晖设备处理器架构与之匹配。
- 基本认证反复弹窗：
  - 确认 BASIC_AUTH_USER 与 BASIC_AUTH_PASS 与浏览器中输入一致。

## 开发与测试
```bash
npm install
npm test
```

## 许可
MIT
