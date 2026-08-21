# 发布

## 本地 release candidate

先安装固定版本工具，再构建本地候选：

```powershell
./scripts/Install-Tools.ps1
./scripts/Release-Local.ps1
```

Linux 使用 `scripts/install-tools.sh` 与 `scripts/release-local.sh`。输出位于忽略的 `dist/`，包括 Windows/Linux amd64 archive、`checksums.txt`、每个 archive 的 SPDX JSON SBOM，以及本轮临时密钥生成并立即验证的 checksum signature/bundle。临时私钥在脚本结束前删除；`local-rc.pub` 只证明该本地 artifact set 在本轮后未变化，不证明公开发布者身份。

本地候选不创建 tag、不 push、不创建 GitHub Release、不上传 image 或 attestation。

## 正式发布

正式流程只接受受保护的 `v*` tag，并进入 GitHub `release` environment 审批。workflow 使用固定工具版本，运行 `scripts/verify-quality.sh` 所定义的 Go/生成物/仓库产物门禁，以 GoReleaser 创建 draft release，再使用 GitHub OIDC keyless identity 签名并验证 checksum bundle。该 job 当前不安装 Node/pnpm，也不执行 WebUI 门禁；不得把它描述成已经重新跑过项目全部质量检查。

审批者必须按同一 tag/source commit 核对独立 workflow 与任务证据，而不是只看 release job 自身：

- tag、source commit、`/build` 返回值和 archive build info 一致；
- Windows/Linux Go quality、SQLite/PostgreSQL/MySQL 和 container jobs 全部通过，并确认这些独立 workflow 对应同一 commit；
- 如果该 commit 影响 WebUI，按 [WebUI 开发指南](../development/webui.md) 保存 lint、module/i18n/architecture 覆盖、typecheck、unit、build、registry、E2E 与视觉证据；当前 CI/release workflow 不会替审批者生成这些证据；
- checksum、SPDX SBOM 和 Sigstore bundle 都随 draft 提供；
- OpenAPI breaking 结论、migration/rollback 说明和已知限制已审阅；
- 项目源码当前已通过根 `LICENSE`、`NOTICE` 和 README 声明 Apache License 2.0；但 Dockerfile 的 OCI `org.opencontainers.image.licenses` 仍是 `NOASSERTION`。在该 label 通过独立非文档变更与源码许可证单轨对齐前，正式容器发布门禁未通过，不得声称镜像 license metadata 已闭环。

workflow 只生成 draft，不替审批者发布。发布或撤销 release、tag、registry image 仍是外部副作用，必须另有明确授权。
