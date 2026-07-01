# ==========================================
# 1. 基础环境配置 (Go 1.25.7 + Node + Pnpm + Ffmpeg)
# ==========================================
FROM golang:1.25.7-bookworm

# 设置非交互式前端，避免安装过程因弹窗挂起
ENV DEBIAN_FRONTEND=noninteractive

# 切换 Debian apt 镜像源为中科大源 (USTC) 以加速国内服务器构建
RUN sed -i 's/deb.debian.org/mirrors.ustc.edu.cn/g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 安装 Node.js (使用稳定的 20.x LTS) 并配置淘宝镜像源 (npmmirror) 全局安装 Pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm config set registry https://registry.npmmirror.com \
    && npm install -g pnpm \
    && pnpm config set registry https://registry.npmmirror.com

# ==========================================
# 2. 注入环境变量说明 (编译与启动期)
# ==========================================
# 提示：以下为编译期硬编码前端环境变量。
# 部署相关的环境变量（如 DEPLOY_ENABLED, DEPLOY_ENV, DEPLOY_REPO_URL, DEPLOY_BRANCH）
# 均无需在此硬编码，应在容器启动（docker run -e）时动态注入，Go 进程会自动加载并覆盖配置。
#
# Nuxt 约定：NUXT_PUBLIC_* 变量在编译时需要硬编码进客户端 Bundle
ENV NUXT_PUBLIC_API_MOCK=false \
    NUXT_BACKEND_ORIGIN=https://aoi-console.kobayashi.eu.org \
    NUXT_PUBLIC_API_BASE_URL=/api/v1/public/community \
    NUXT_PUBLIC_AUTH_API_BASE_URL=/api/v1

# ==========================================
# 3. 源码构建阶段 (编译至暂存区 /workspace)
# ==========================================
WORKDIR /workspace

# 配置 Go 模块代理为国内七牛云镜像源 (goproxy.cn) 加速依赖下载
ENV GOPROXY=https://goproxy.cn,direct

# 将宿主机 /root/.aoi 下的所有源码复制到暂存区
COPY . .

# 步骤 A: 打包后端内嵌的 React Web 产物
RUN cd backend/web/app \
    && pnpm install \
    && pnpm build

# 步骤 B: 下载 Go 依赖并编译后端核心二进制文件
RUN cd backend \
    && go mod download \
    && go build -o aoi ./cmd/console

# 步骤 C: 预备后端配置文件
RUN cd backend \
    && cp configs/config.example.yaml configs/config.yaml

# ==========================================
# 4. 运行阶段与进程管理
# ==========================================
# 设置最终运行时容器的挂载工作根目录
WORKDIR /app

# 编写引导脚本：
# 1. 解决宿主机空目录挂载覆盖容器内产物的问题
# 2. 优雅启动 Go 后端主服务进程
RUN echo '#!/bin/bash\n\
if [ ! -f "/app/backend/aoi" ]; then\n\
    echo "[Init] Detected missing executable or empty /app directory. Copying built artifacts from workspace..."\n\
    cp -r /workspace/. /app/\n\
fi\n\
\n\
echo "[Start] Launching Go Backend..."\n\
cd /app/backend\n\
exec ./aoi server --config=configs/config.yaml' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

# 仅声明后端端口（此处以 9999 为例）
EXPOSE 9999

# 执行引导脚本
ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]