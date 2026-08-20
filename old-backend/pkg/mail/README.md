# pkg/mail 目录说明

`pkg/mail` 是通用邮件发送封装，负责 SMTP 配置、消息结构、模板渲染和错误返回。它不感知 IAM、注册、邀请或任何业务模块。

## 使用方式

- 上层通过 `mail.Config` 构造 SMTP sender。
- `Message` 描述收件人、主题、纯文本和 HTML 内容。
- 模板渲染失败、SMTP 连接失败和发送失败必须作为错误返回给调用方。
- SMTP deadline 设置、DATA 写入、DATA 关闭确认、连接握手、连接关闭和 `QUIT` 失败都属于投递结果的一部分；如果主错误和关闭错误同时出现，会使用 `errors.Join` 保留所有关键错误。

## 边界规则

- 不在 `pkg/mail` 中读取应用配置文件或环境变量；配置由 `internal/app` 或模块 infrastructure 注入。
- 不在底层吞掉错误，也不决定业务重试、降级或审计策略。
- 业务邮件模板、验证码语义和审计记录归属业务模块；本包只提供通用发送能力。
- `Send` 和 `Check` 成功时以 SMTP `QUIT` 完成会话；失败路径才主动关闭连接并返回关闭错误，避免把成功后的重复关闭误报为投递失败。

## 验证命令

```powershell
go test ./pkg/mail -count=1 -mod=readonly
```
