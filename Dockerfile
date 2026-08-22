# syntax=docker/dockerfile:1.19

FROM --platform=$BUILDPLATFORM golang:1.26.6-bookworm@sha256:18aedc16aa19b3fd7ded7245fc14b109e054d65d22ed53c355c899582bbb2113 AS build

ARG TARGETOS=linux
ARG TARGETARCH=amd64
ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_TIME=unknown
ARG DIRTY=true

WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -buildvcs=false \
    -ldflags="-s -w -X main.buildVersion=${VERSION} -X main.buildCommit=${COMMIT} -X main.buildTime=${BUILD_TIME} -X main.buildDirty=${DIRTY}" \
    -o /out/go-scaffold-template ./cmd/app
RUN mkdir -p /out/data

FROM --platform=$BUILDPLATFORM node:24-bookworm@sha256:f6d02cf1353049cf3658e6ce9ec03c6877a6479495f122062d195e2279d01055 AS webui-build

# WebUI 构建产物在镜像构建期装配：registry 与 tsconfig 是已提交且经质量门禁校验的
# 生成物，因此本 stage 只做依赖安装与打包；runtime 镜像不含 node，运行期不执行
# 托管前构建脚本。digest 复核：Docker Hub library/node tag 24-bookworm linux/amd64
# （2026-08-22，官方 API）。
WORKDIR /src
COPY . .
RUN corepack enable \
    && cd webui \
    && corepack pnpm install --frozen-lockfile \
    && corepack pnpm build \
    && test -f dist/index.html

FROM gcr.io/distroless/static-debian13:nonroot@sha256:b5b9fd04c8dcf72a173183c0b7dee47e053e002246b308a59f3441db7b8b9cc4 AS runtime

ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_TIME=unknown
ARG SOURCE=https://github.com/rin721/go-scaffold-template

LABEL org.opencontainers.image.title="go-scaffold-template" \
      org.opencontainers.image.description="Production-oriented Go HTTP API scaffold" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}" \
      org.opencontainers.image.created="${BUILD_TIME}" \
      org.opencontainers.image.source="${SOURCE}" \
      org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app
COPY --chown=nonroot:nonroot --from=build /out/go-scaffold-template /app/go-scaffold-template
COPY --chown=nonroot:nonroot config.example.yaml /app/config.yaml
COPY --chown=nonroot:nonroot --from=build /out/data /app/.data
COPY --chown=nonroot:nonroot --from=webui-build /src/webui/dist /app/webui/dist

USER nonroot:nonroot
EXPOSE 8080 9090
ENTRYPOINT ["/app/go-scaffold-template"]
