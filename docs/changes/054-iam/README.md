# 054 IAM 身份与访问管理模块

状态：研究门禁已通过，计划待确认；实施依赖 053 Admin 多业务模块基础平台完成。053 的未来确认或完成不自动授权 054。

## 目标

新增 `iam` 业务模块，单轨接管当前 Auth 本地账号、密码和 Session，并实现 Account、Credential、Session、Role、Permission、AccountRole、RolePermission 与 system `owner` 不变量，产出初始化/登录、账号安全、用户、角色和权限管理 API/WebUI。

Organization 与 Navigation 分别属于 055、056；IAM 不拥有 Department、Position 或 MenuPolicy。

## 阅读顺序

1. [研究索引](research/README.md)
2. [需求规格](requirements.md)
3. [设计方案](design.md)
4. [任务与确认状态](tasks.md)

## 实施门禁

只有 053 已完成且用户在本计划报告后明确确认 054，才能实施 `IAM-054-001..009`。加入外部 IAM、MFA、多租户、角色继承、数据权限或改变 Auth/IAM owner 时必须重新研究确认。
