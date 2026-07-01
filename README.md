# 部署与自动化热重启指南

本项目支持通过 Docker 容器化部署，并且集成了 Git Webhook 自动部署与零停机热重启机制。

## 一、 构建 Docker 镜像

在项目根目录下执行以下命令构建全栈镜像：

```bash
# 1. 克隆项目到 /tmp/aoi 目录
git clone https://github-com-gh.helloworlds.eu.org/rin721/community-go.git /tmp/aoi

# 2. 进入目录并执行 Docker 构建
cd /tmp/aoi && docker build -t aoi:latest .

# 3. 构建成功后，删除临时目录
rm -rf /tmp/aoi
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

---

## 三、 自动部署常见问题

### 1. Git 同步失败 (exit status 128)

* **根本原因**：运行工作路径（Working Directory）不匹配。
  后端服务在寻找 `.git` 目录时，是用配置的 `workDir` + `/.git` 去判断的。如果配置的 `workDir` 是 `.` 或空，程序会以后端服务进程当前的启动工作目录为准：
  * **如果后端服务是在 `backend` 目录下启动的**（例如当前工作目录是 `/app/backend`）：
    程序会去检测是否存在 `/app/backend/.git`。但实际上你的 `.git` 存放在根目录 `/app/.git`。
    结果：程序判定该目录没有 `.git`，决定执行 `git clone` 到当前目录 `/app/backend`，由于 `/app/backend` 已经有文件，导致 Git 报错退出。
  * **如果后端是在 `/app` 启动的**：
    请检查你在 `config.yaml`（或环境变量）中配置的 `workDir` 到底指向了哪里。如果配置成了相对路径或者指向了错误的子目录，也会导致判定失败。

* **🛠️ 解决方案**：
  请检查并修改自动部署的配置文件（通常在 `config.yaml` 的 `deploy` 部分，或对应的环境变量 `APP_DEPLOY_WORK_DIR`）：
  将 `workDir` (工作目录) 修改为容器内项目的根目录绝对路径：
  ```yaml
  deploy:
    work_dir: "/app"  # 或者是你容器内拥有 .git 文件夹的项目根目录绝对路径
  ```
  配置为绝对路径 `/app` 后，程序就会正确检测到 `/app/.git`存在，后续的 Webhook 就会正确走 `git fetch` 和 `git reset --hard` 流程了。

### 2. 编译失败 (go build ... exit status 1) 但手动执行编译正常

* **根本原因**：Go 编译执行路径与 `go.mod` 所在目录不匹配。
  在聚合仓库中，Go 的核心代码和 `go.mod` 位于子目录 `backend/` 下。如果部署配置中的 `workDir` 设为根目录 `/app`，而配置的编译命令为 `go build -mod=readonly -o ./console-server ./cmd/console`，Go 将因为在根目录下找不到 `go.mod` 文件而编译失败并返回 `exit status 1`。

* **🛠️ 解决方案**：
  在部署配置文件（如 `config.yaml` 的 `deploy` 部分，或对应的环境变量 `APP_DEPLOY_BUILD_CMD`）中修改 `buildCmd` 编译命令，在执行构建前先切换到 `backend/` 目录下：
  ```yaml
  deploy:
    # 切换到 backend 目录后再执行 go build
    build_cmd: "cd backend && go build -mod=readonly -o ./console-server ./cmd/console"
  ```
  或者将 `work_dir` 直接指定为包含 `go.mod` 的主目录（例如 `/app/backend`）。
