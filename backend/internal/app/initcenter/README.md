# initcenter 说明

`initcenter` 是首次安装和初始化流程的应用服务层，负责把配置保存、配置测试、迁移、系统默认数据、IAM 初始管理员和可选服务 Token 串成可审计、可重试的初始化闭环。它服务 `/setup` Web 向导、CLI `init` 流程和初始化状态查询，不承载具体业务模块的长期领域逻辑。

## 职责边界

- `Service` 编排初始化状态、步骤执行、跳过、重试、完成和配置保存。
- `InitConfigStore` 负责把 setup 表单值写回受控配置文件，并维护数据库配置变更后的 `bootstrap_state.json` 重启提示。
- `stateStore` 负责初始化 run 和 step 的数据库状态记录。
- `schema` 和 `validator` 描述 setup 表单结构与即时可用性测试，不直接修改业务数据。

## 错误处理

- 初始化 run、step、配置测试和配置保存的数据库读写失败必须返回给 handler 或 CLI 调用方。
- setup 表单值写入配置结构时，配置路径映射或字段写入失败必须返回；不得把未写入的配置当作保存成功。
- 生成输入指纹、保存配置、写入或清理 `bootstrap_state.json` 失败必须返回；不得把旧重启状态静默当作已清理。
- `Run` 汇总结果时读取步骤记录失败必须返回，避免调用方拿到缺少步骤事实的初始化报告。
- CLI 初始化进度写入 stdout 失败必须返回，避免脚本或人工流程误判步骤摘要已经可靠输出。
- 初始化主错误和状态落盘错误同时发生时，应使用 `errors.Join` 同时保留两类错误。

## 扩展规范

- 新增初始化步骤应通过 `InitTaskRegistry` 和 `stepDefinition` 接入，明确 `Key`、依赖、schema、校验、执行和恢复说明。
- 新增配置路径必须先进入 `configPathsForStep`，再同步配置示例、i18n、前端 setup 表单和测试。
- 不要在本目录直接实现 IAM、System 或文件存储的业务规则；应调用对应模块 service 或基础设施端口。

## 验证命令

```powershell
go test ./internal/app/initcenter -count=1 -mod=readonly
go test ./internal/app/... -count=1 -mod=readonly
```
