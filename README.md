# 部署与自动化热重启指南

本项目支持通过 Docker 容器化部署，并且集成了 Git Webhook 自动部署与零停机热重启机制。

## 一、 构建 Docker 镜像

在项目根目录下执行以下命令构建全栈镜像：

```bash
docker build -t aoi:latest .
```

---

## 二、 部署与运行容器（动态注入环境变量）

启动容器时，您可以通过 `-e` 参数动态传入部署相关的环境变量，程序将自动覆盖默认配置文件中的对应选项。

### 1. 核心部署环境变量说明

| 环境变量名 | 作用描述 | 示例值 |
| :--- | :--- | :--- |
| **`DEPLOY_ENABLED`** | 是否启用自动部署与热启动模块 | `true` (启用) / `false` (禁用) |
| **`DEPLOY_ENV`** | 部署环境 | `production` (执行部署) / `development` (仅记录日志) |
| **`DEPLOY_REPO_URL`** | 部署拉取的公开/私有 Git 仓库克隆地址 | `https://github.com/username/project.git` |
| **`DEPLOY_BRANCH`** | 监听并同步的 Git 目标分支 | `main` / `master` |
| **`DEPLOY_WEBHOOK_SECRET`** | Webhook 校验签名密钥（安全校验使用） | `your_webhook_secure_secret_string` |

### 2. 容器启动命令示例

运行以下命令部署容器：

```bash
docker run -d \
  --name aoi \
  -p 9999:9999 \
  -e DEPLOY_ENABLED=true \
  -e DEPLOY_ENV=production \
  -e DEPLOY_REPO_URL="https://github-com-gh.helloworlds.eu.org/rin721/community-go.git" \
  -e DEPLOY_BRANCH="main" \
  -e DEPLOY_WEBHOOK_SECRET="123456" \
  -v /root/.aoi:/app \
  --restart unless-stopped \
  aoi:latest
```

> [!NOTE]
> * `-v /root/.aoi:/app`：将宿主机的目录挂载到容器中，使得 Git pull 同步的代码和编译出的新二进制能够持久化，并且支持热重载和状态文件落盘。