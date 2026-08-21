# 安全响应

## 报告与分级

正式公开 release 前，repository owner 必须配置私密漏洞报告渠道和响应责任人；当前仓库文档不虚构邮箱或 SLA。不要在公开 Issue 中提交凭据、利用细节或生产数据。

收到报告后先固定受影响 tag/commit、可达调用路径和泄露范围，再区分：代码漏洞、依赖漏洞、凭据事件、配置误用和基础设施事件。日志、Problem Details、diagnostics、trace 和 SBOM 都只能作为证据，不能包含 Token、密钥或完整 DSN。

## 修复与传播

1. 在隔离环境复现并建立负向测试。
2. 修复项目自有 contract/Adapter 边界；不要让业务调用方直接接管第三方客户端。
3. 运行 quality、security、DB、container 和 release gates。
4. 发布新版本和安全说明，列出受影响 baseline、修复 commit、迁移步骤、临时缓解和验证命令。
5. copy-owned 消费者人工评估并迁移修复；上游不会自动覆盖副本。

疑似凭据泄露时应先轮换/撤销，再调查使用记录；删除 Git 文件不能撤销已经暴露的 secret。发现 artifact、checksum、SBOM 或签名不一致时停止发布并重新从固定 source commit 构建，不允许覆盖证据继续发布。

## WebUI Session 当前约束

当前本地 WebUI 使用 IAM 服务端有状态 Session。首次设置要求 `APP_IAM__LOCAL__SETUPTOKEN`，密码使用 Argon2id（64 MiB、3 次、并行度 2），默认连续 5 次失败锁定 15 分钟；Session 默认空闲 30 分钟、绝对 12 小时。Session 保存签发时的 `SecurityRevision`，账号、密码、AccountRole 或 RolePermission 变化会使旧 Session 失效。Session 不得作为普通业务 API 的 Bearer/JWT 替代凭据。

浏览器请求使用 `__Host-community-go_iam_session` 安全 Cookie；不安全请求必须同时满足同源校验和绑定 Session 的 `X-CSRF-Token`。密码、setup token、Session ID、CSRF token 和 Authorization 不进入日志、Web Storage 或错误详情。
