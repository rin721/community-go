# System 模块

`internal/modules/system` 承载后台系统管理能力。System service 定义 repository、权限同步、host metrics 和 storage 相关 contract；具体数据库 executor、主机指标采集和对象存储由 repository、app adapter 和 app 装配注入。

## 能力

| 能力 | 说明 |
| --- | --- |
| 菜单目录 | `GET /api/v1/system/menus` 返回当前后台菜单目录 |
| API 目录 | 从当前进程已注册路由生成 API catalog，并可同步到数据库 |
| 权限同步 | 将带权限的 API 目录同步到 IAM 权限目录 |
| 字典管理 | 维护 `system_dictionaries` 和 `system_dictionary_items`；社区视频分类使用内置字典 code `community.video.category`，具体 item 由后台管理 |
| 参数管理 | 维护 `system_parameters` |
| 系统配置 | 读取脱敏配置快照，受控更新运行时配置并可持久化到 YAML |
| 操作记录 | 记录受保护后台 API 请求 |
| 服务器状态 | 返回运行时、构建信息、CPU、内存、磁盘容量和短窗口网络/磁盘 IO 趋势指标 |
| 流量劫持监控 | 以 HTTP(S) 主动探针检测 DNS、TLS、跳转、状态码、内容关键字和耗时异常 |
| 版本发布包 | 保存菜单、API、字典快照 JSON，用于留痕、下载和跨环境导入 |
| 媒体库 | 分类、普通上传、断点上传、外链导入、重命名、下载和删除 |

## 依赖边界

- `service` 定义 `Repository`、`PermissionStore`、`HostMetricsCollector`、`MetricsHistoryProvider`、`IDGenerator` 和 `MediaObjectStorage` contract。
- `repository` 实现 System repository contract，持有数据库 executor，并把底层 not-found 映射为 `ErrNotFound`，把缺表类错误包装为 `ErrStorageUnavailable`。
- host metrics 由 `internal/app/adapters.HostMetricsCollector` 适配 `pkg/hostmetrics`；短窗口历史由 `internal/app/adapters.ServerMetricsSampler` 在应用生命周期中采样并注入。
- traffic hijack 由 `internal/app/adapters.TrafficProbeRunner` 使用标准库 HTTP client、DNS resolver、`httptrace` 和 SSE 事件流实现；调度器随应用生命周期启动，service 只依赖本包定义的 runner、alert sink 和 repository contract。
- System 维护清理由 `internal/app/adapters.SystemMaintenanceScheduler` 随应用生命周期调度，service 暴露 `RunMaintenanceCleanup` 用例并返回清理结果和错误，repository 只负责候选查询和持久化操作。
- 媒体对象存储由 `internal/app` 从 Storage 基础设施注入；service 不直接依赖 `pkg/storage`。

## 路由和权限

| 路由 | 权限 | 用途 |
| --- | --- | --- |
| `GET /api/v1/system/menus` | 认证 | 菜单目录 |
| `GET/PATCH /api/v1/system/config` | `config:read/update` | 运行时配置 |
| `GET /api/v1/system/server-info` | `server:read` | 服务器状态 |
| `GET /api/v1/system/server-metrics/history` | `server:read` | 服务器指标短窗口历史 |
| `/api/v1/system/traffic-hijack*` | `traffic_hijack:*` | 流量劫持监控目标、结果、事件和 SSE 流 |
| `GET /api/v1/system/apis` | `permission:read` | API 目录 |
| `POST /api/v1/system/apis/sync` | `permission:sync` | 同步 API 目录 |
| `POST /api/v1/system/apis/permissions/sync` | `permission:sync` | 同步权限目录 |
| `GET/DELETE /api/v1/system/operation-records` | `operation:read/delete` | 操作记录 |
| `/api/v1/system/versions*` | `version:*` | 版本发布包 |
| `/api/v1/system/media*` | `media:*` | 媒体库 |
| `/api/v1/system/parameters*` | `parameter:*` | 参数管理 |
| `/api/v1/system/dictionaries*`、`/dictionary-items*` | `dictionary:*` | 字典管理 |

`GET /api/v1/system/menus` 只要求认证，但 handler 会按当前 `Principal`、菜单项 `permission` 和 `scope` 调用 IAM authorizer 过滤菜单项。前端只能展示该接口返回的菜单；接口未返回可用菜单时只能使用最小 dashboard 导航，不能回退到完整静态菜单。默认菜单的日志分组包含 `/notification-outbox`，该入口由 IAM 模块提供真实 API，菜单可见性依赖平台级 `notification:read` 权限，手动重试按钮另需 `notification:retry`。

React 后台页面的系统写操作必须继续以 route contract 权限为准做体验层控制：例如运行时配置保存需要 `config:update`，API 清单同步和权限目录同步都需要 `permission:sync`，参数创建、编辑和删除分别需要 `parameter:create`、`parameter:update` 和 `parameter:delete`，字典创建、更新和删除分别需要 `dictionary:create`、`dictionary:update` 和 `dictionary:delete`，社区分类页面复用这些字典权限管理 `community.video.category` item，操作记录删除需要 `operation:delete`，版本发布包创建、导入、删除和下载分别需要 `version:create`、`version:import`、`version:delete` 和 `version:download`。媒体库分类创建、编辑和删除以及资源重命名需要 `media:update`，普通上传和断点续传检查、分片、完成、终止需要 `media:upload`，URL 导入需要 `media:import`，资源删除需要 `media:delete`，认证下载需要 `media:download`。流量劫持目标创建、编辑、立即探测和事件恢复需要 `traffic_hijack:update`，删除目标需要 `traffic_hijack:delete`。页面可使用 `/api/v1/me/session` 返回的 `permissions` 快照禁用按钮或选择框，但后端 handler、middleware 和 service 鉴权仍是唯一生产权限边界。

## 版本发布包

版本发布包存储菜单、API 和字典配置快照：

- 菜单来自 service 内置目录；
- API 来自当前进程路由目录；
- 字典来自数据库；
- 导入时只幂等补齐字典，菜单和 API 保留在包记录中并报告跳过。

它不是 Go 构建版本，也不是 goose 迁移版本。

## 媒体库

- 外链导入只保存 URL，不下载远程文件。
- 普通上传和断点上传需要 `storage.driver` 选择 `local`、`s3`、`minio`、`local+s3` 或 `local+minio`。
- 本地对象 key 由服务端生成，原始文件名只用于展示。
- 下载本地对象需要 IAM 鉴权，不提供匿名静态下载。
- 断点上传临时分片位于 `media/chunks/<session-id>/`，完成或中止后清理。
- 断点上传会话被动发现过期时会先保存 `expired` 状态；保存失败会返回存储错误，不伪装成普通无效输入。
- 断点上传完成或中止后的临时分片文件和分片记录清理仍不阻断已创建资产或会话状态返回；清理失败会写入 warn 日志并包含 `session_id` 和底层错误。
- 后台维护任务会定期扫描仍有分片记录的 completed、aborted、expired 会话，以及已过期的 active 会话；active 会话会先保存为 `expired`，再清理 `media/chunks/<session-id>/` 和分片记录。对象存储或数据库清理失败会向调度器返回错误，不把残留伪装成成功。

Storage 不可用时，列表和外链导入仍可工作；普通上传、断点上传、本地下载和本地删除会返回 storage unavailable。

## 服务器状态

`GET /api/v1/system/server-info` 返回 Go runtime、构建信息、CPU、内存和磁盘挂载点容量采样。`GET /api/v1/system/server-metrics/history` 返回应用启动后的短窗口真实采样，默认每 5 秒采样、保留 60 个点，包含 CPU、RAM、最高磁盘使用率、Go heap、goroutine 数、网络收发 KB/s，以及聚合和单磁盘 IO 的读写 MB/s、读写次数/s 和平均 IO 延迟。磁盘 IO 名称来自操作系统 disk counter；容量/使用率仍来自挂载点数据，不做 device 到 mount point 的虚假映射。初次启动样本不足或首个样本速率为 0 是正常状态。

后端 DTO 当前不包含 GPU、CI/CD、后台任务或服务进程明细；前端不能 mock 不存在的指标。

前端治理入口：

- `web/app/app/lib/api/endpoints.ts`
- `web/app/app/lib/api/system.ts`
- `web/app/app/routes/admin/dashboard.tsx`
- `web/app/app/components/console/patterns/EChart.tsx`
- `web/app/app/components/console/patterns`
- `web/app/app/i18n/locales/{zh-CN,en-US}.json`

新增指标必须先扩展后端采集和 DTO，再扩展前端配置、图表 option 和派生模型。服务器状态不再有独立 `/admin/server-info` 后台页面，工作台入口统一为 `/admin`。

## 流量劫持监控

流量劫持监控的 V1 定义是“外部访问路径异常”，不做抓包、旁路代理或真实 MITM 检测。后端主动探测用户保存的 HTTP(S) 目标，异常来源包括：

- DNS 解析 IP 偏离期望 IP/CIDR；
- loopback、link-local、multicast、private 或 reserved 地址默认被阻断，只有目标显式开启 `allowPrivateNetwork` 时才允许；
- TLS 证书异常或 SHA256 指纹不匹配；
- 跳转超过 5 次或最终 Host 与期望不一致；
- 状态码不在期望范围；
- 响应体缺少期望关键字；
- DNS、连接、TLS、TTFB 或总耗时探测失败。

目标数据写入 `system_traffic_probe_targets`，每次探测结果写入 `system_traffic_probe_results`，同一目标只保留最近 500 条结果。异常事件写入 `system_traffic_hijack_events`，按 `targetId + reason + evidenceHash` 聚合 open/update/resolved 状态。探针 runner 返回的 `EvidenceJSON` 必须是合法 JSON；校验失败会返回错误，并且不会写入本次结果、目标状态或劫持事件。探针适配器内部证据序列化失败时会返回 `{}` 并写入 warn 日志，避免把编码异常静默隐藏。单次探测后的结果保留窗口维护失败不阻断本次结果写入，但会写入 warn 日志并包含 `target_id` 和底层错误；后台维护任务会继续按目标补偿维护结果保留窗口，失败会返回调度器记录。告警通道为目标级配置：`event` 写站内事件，`debug` 写后端日志，`email` 复用 SMTP sender；邮件不可用不会阻塞探针，只更新通知状态。

后台入口为 `/admin/traffic-hijack`，工作台 `/admin` 同步展示概览卡片。实时展示使用 `GET /api/v1/system/traffic-hijack/stream` 的 `text/event-stream`，前端因认证需要通过带 Bearer header 的 fetch stream 消费 SSE；断开后按 30 秒轮询 overview/results/events。SSE 写入失败表示客户端连接或传输已不可用，handler 会记录 warn 并结束当前 stream，不继续 flush 失效事件。

## 配置

System 本身只有：

```yaml
system:
  seed_defaults_on_start: true
  maintenance_cleanup_interval_seconds: 60
  maintenance_cleanup_batch_size: 100
```

媒体库复用 `storage.*`。版本发布包不新增 YAML 或环境变量配置。运行时配置 API 由 `config:*` 权限保护。

`maintenance_cleanup_interval_seconds` 控制后台维护清理调度间隔；`maintenance_cleanup_batch_size` 控制每轮最多处理的媒体上传会话数量。两者必须为正整数，可通过 `APP_SYSTEM_MAINTENANCE_CLEANUP_INTERVAL_SECONDS` 和 `APP_SYSTEM_MAINTENANCE_CLEANUP_BATCH_SIZE` 覆盖，并会出现在系统配置快照中。

## 默认数据

`seed_defaults_on_start=true` 时，System 模块会在启动或初始化流程中幂等补齐平台运行所需默认数据：

- 字典：`system.status`、`http.method`、`operation.result`、`community.video.category`。`community.video.category` 只内置字典 code，不内置具体分类 item；分类 item 由后台“社区分类”或系统字典管理维护。
- 参数：`admin.title`、`admin.home_path`。

这些数据不是业务演示数据，也不包含默认管理员账号。已有参数被后台修改后，seed 不会覆盖用户值。需要本地演示流程时，按 [本地演示环境与示例数据](../onboarding/demo-environment.md) 创建临时管理员和本地数据。

## 测试入口

```powershell
go test ./internal/modules/system/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
```

## 非目标

- 版本导入不改写代码菜单和 HTTP 路由。
- 媒体外链导入不下载远程资源。
- 服务器状态不展示后端未采集的指标。
