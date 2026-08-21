# 047 任务清单

## 1. 当前状态

- 研究门禁：已通过（`R001`）。
- 计划状态：修订后的首次检查点 A–C 已重新确认，当前实施中；检查点 D 后续待确认。
- 实施授权：用户已确认“047 方案”，授权修订后的布局、骨架和强制 i18n 契约实现；不授权 Auth/Ops 完整页面产品化或后续 Demo。
- Git 基线：`HEAD 72e99de`，当前分支相对本地 `origin/main` ahead 8；接续复核时已有未提交的 047 草案和索引修改，本轮计划文档不得暂存或提交。

## 2. 研究与计划

| ID | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| RES-001 | 无 | 复核 042–046、Contract、Composition、registry、宿主、模块页面、i18n 与能力状态 | R001 区分事实、推断、目标和局限 | 已完成 |
| RES-002 | 无 | 浏览器观察 SoybeanAdmin 并以官方主源交叉核对产品组织 | 登录、首页 Shell、用户列表/筛选、新增 Drawer、403 与主题 Drawer 有 DOM/截图实测；移动观察失败边界明确；形成后续逐任务观察方法 | 已完成 |
| RES-003 | RES-002 | 吸收“宿主本体优先、布局骨架先行、完全参考”的最新用户决策 | 高保真 parity 与不复制源码/品牌/Demo 的边界写入研究、需求和设计 | 已完成 |
| PLAN-001 | RES-001, RES-002, RES-003 | 形成需求、设计、任务和重新确认边界 | 047 固定文档齐全，可供用户确认首次宿主范围 | 已完成 |

## 3. 首次待确认实施任务：布局与骨架

| ID | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| ARC-001 | 用户确认 | 单轨收敛交付状态与四态运行语义 | `preview` 旧语义删除；权限/交付/运行/交互状态分离；Go/TS 测试覆盖 | 已实施未闭合 |
| GEN-001 | ARC-001 | 扩展 codegen 为 Entry + locale registry | registry/revision 唯一来源；非法/缺失 locale fail closed；clean check 通过 | 已实施未闭合 |
| HOST-001 | GEN-001 | 用 manifest + generated registry 动态建立模块路由 | 宿主无 Auth/Ops import 和集中模块 Route；lazy/error/access boundary 生效 | 已实施未闭合 |
| I18N-001 | GEN-001 | 接入单一 i18next/react-i18next 实例并落实强制 WebUI i18n 契约 | 每个 WebUI 模块声明 locale Binding；模块只使用 `useWebUITranslation(namespace)`；host/module 文案均来自资源；缺失资源可诊断 | 已实施未闭合 |
| I18N-CONTRACT-001 | I18N-001 | 固化 locale owner、message ID、error code -> message ID、无硬编码文案和公开翻译 hook 规范 | `setupErrorMessages` 类映射只返回 message ID；Contract/codegen、静态扫描和运行期边界测试通过；调整后计划已确认 | 已实施未闭合 |
| MOD-001 | HOST-001, I18N-CONTRACT-001 | 把 Auth/Ops 页面迁回模块 owner，完成宿主骨架所需最小适配并遵守 i18n 契约 | 删除反向 re-export 和宿主具体模块 import；模块只依赖公开宿主契约/UI；所有用户文案走模块 namespace；真实流程行为不扩展 | 已实施未闭合 |
| UI-001 | HOST-001, I18N-001 | 高保真建立 Token、AuthLayout、AppLayout 与响应式 Shell | 侧栏、Header、breadcrumb、workspace tabs、route search、内容 Surface、Footer、用户/主题/语言/全屏入口在桌面/移动与明暗主题通过对照 | 已实施未闭合 |
| UI-002 | UI-001 | 建立页面容器、toolbar、feedback、state、form、table、filter、pagination、Drawer 模式 | 测试 fixture 覆盖状态且不进入生产 manifest/navigation；模块不复制视觉基础 | 已实施未闭合 |
| VIS-OPS-001 | UI-002, VIS-HOST-001 | 基于最新 Soybean 工作台观察校准已有 Ops Dashboard 的概览层级 | 仅使用六个真实 management 查询；概览统计、加载/失败状态和诊断详情均经 i18n 契约与响应式样式验证 | 已实施未闭合 |
| BUILTIN-001 | UI-001, ARC-001 | 建立 Theme Drawer、403、404、mismatch 和 not-implemented 宿主页面 | 单一主题 authority；状态一致、错误低敏、解析错误可见、不发不存在 API | 已实施未闭合 |
| VIS-HOST-001 | UI-001, UI-002, BUILTIN-001 | 建立 SoybeanAdmin 宿主 parity 矩阵并逐任务动态观察 | 同视口 DOM/截图覆盖 Shell、导航、页签、搜索、主题 Drawer、Surface、状态页、响应式/主题；差异修正或有项目边界理由 | 已实施未闭合 |
| TEST-HOST-001 | ARC-001, GEN-001, HOST-001, MOD-001, I18N-001, I18N-CONTRACT-001, UI-001, UI-002, BUILTIN-001, VIS-HOST-001 | 补宿主 Go/TS/React/E2E/visual/architecture 门禁 | 证明无用户可见硬编码/直接 i18n singleton/穿透/Demo/假能力；error code -> message ID、locale completeness、现有 Auth/Ops 流程和宿主 parity 全部通过 | 验证中 |
| DOC-HOST-001 | TEST-HOST-001 | 同步 WebUI authority 与模块开发指南 | 当前宿主结构、强制 i18n 接入、状态、视觉流程和未完成模块产品化边界进入主题文档 | 已同步未闭合 |
| GIT-HOST-001 | DOC-HOST-001 | 审查并提交首次已确认范围 | 只提交重新确认后的首次宿主范围；有完整验证证据；不 push | 待提交 |

## 4. 宿主门禁后的后续任务

下列任务属于当前 Goal 的后续增量，不在首次“布局与骨架”确认范围内。宿主本体完成后应根据当时参考站和真实 API 重新复核；若接口、依赖或边界发生实质变化，另行确认。

| ID | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| AUTH-001 | TEST-HOST-001 | 产品化 setup/login/session 页面 | 真实 API/Session/CSRF 语义不变；pending/error/success/移动端完整 | 后续 |
| OPS-001 | TEST-HOST-001 | 产品化真实 Ops dashboard | 六类真实数据分层；局部失败 degraded；必要失败 unavailable；可独立重试 | 后续 |
| VIS-MODULE-001 | AUTH-001, OPS-001 | 逐页高保真对照 Auth/Ops | 每页重新观察参考站并形成多断点/主题差异矩阵 | 后续 |
| TEST-MODULE-001 | VIS-MODULE-001 | 完成真实模块 E2E 与视觉回归 | Auth/Ops 关键流、权限、四态和低敏证据通过 | 后续 |

## 5. 实施顺序与检查点

```text
首次检查点 A（装配骨架）：ARC-001 -> GEN-001 -> HOST-001 -> I18N-001 -> I18N-CONTRACT-001 -> MOD-001
首次检查点 B（布局骨架）：UI-001 -> UI-002 -> BUILTIN-001
首次检查点 C（宿主验收）：VIS-HOST-001 -> TEST-HOST-001 -> DOC-HOST-001 -> GIT-HOST-001
后续检查点 D（真实页面）：AUTH-001 -> OPS-001 -> VIS-MODULE-001 -> TEST-MODULE-001
```

每个任务先完成对应参考页面观察，再实施与验证。后一个任务不得用前一个任务的粗略截图替代自己的页面/交互对照。首次确认只覆盖 A–C；D 不能随 A–C 自动启动。

## 6. 验证矩阵

| 范围 | 计划检查 |
| --- | --- |
| Go Contract/Composition | `go test ./internal/webui ./internal/composition/...`，最终 `go test ./...` |
| Codegen | `pnpm generate` 审查差异；`pnpm generate:check` clean |
| Frontend static | `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` |
| Architecture | 搜索宿主模块 import/硬编码 route、模块导入宿主内部、生产 Demo、Todo WebUI、旧 `preview` 语义 |
| i18n contract | locale Binding 与 registry 完整性；模块生产 Web 源码无用户可见硬编码；无直接 i18n singleton；error code 只映射 message ID；缺失 key/namespace/language fail closed 或可诊断 |
| E2E | 首次覆盖 manifest 装配、导航/页签/search/theme、权限菜单/直达 403、404、revision/entry/locale mismatch，并证明现有 setup/login/session/Ops 不回归 |
| Visual | 首次覆盖 Auth/App Shell、导航、页签、search、Theme Drawer、Surface、builtin/四态在桌面/移动与 light/dark 的同视口 parity；Auth/Ops 页面产品化后续单独验收 |
| 低敏 | 截图、日志、fixture、错误与提交不含 Token、Cookie、密码、Authorization、内部地址 |
| Diff | `git diff --check`，逐文件审查，只提交已确认范围 |

## 8. 当前实施证据与剩余风险

- 已通过：`go test ./...`、`pnpm test`、`pnpm lint`（包含 i18n contract scan）、`pnpm lint:modules`、`pnpm typecheck`、`pnpm build`、`pnpm generate:check`、`git diff --check`。
- 已通过：模块生产 TSX 无中文/用户可见硬编码、无直接 `react-i18next` import、无 `setupErrorMessages` 展示文本映射；错误码映射测试只接受 message ID。
- 未闭合：浏览器本地视觉回归未完成。Vite 使用项目要求的 HTTPS，但浏览器拒绝本地自签名证书（`ERR_CERT_AUTHORITY_INVALID`）；SoybeanAdmin 参考站 Shell 的 DOM/截图观察已完成，项目页面桌面/移动与明暗主题截图需在受信任证书环境补齐。

## 7. 重新确认触发器

- 新增或改变后端 API、数据库 migration、Auth/Session/CSRF/Origin 或普通业务权限语义；
- 为 Todo 或其他新业务模块增加 WebUI 页面；
- 引入动态插件、远程页面、新全局状态框架或替换前端技术栈；
- 实施发现当前 Binding 无法表达模块页面 owner，必须改变模块边界；
- i18n 规范需要新增或改变 Binding 字段、`@webui/contracts` 公开翻译 API、locale owner、message ID 或静态架构门禁；
- 参考视觉要求演变为复制品牌、源码或不存在的业务能力；
- 计划中的文件影响、依赖选择或外部副作用发生实质变化。
