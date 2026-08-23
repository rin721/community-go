# 072 设置套件细化：8 分区重组、IAM 自服务资料/软注销、SPA 页内导航修复

状态：研究门禁已通过（R072-001/R072-002）；计划已建立，**待确认**（等待用户对 design.md 第 5 节决策 1–5 的确认）。

## 背景

- 设置模块重组为 8 分区：profile（用户主页设置，经用户/权限体系接口：昵称/介绍/出生日期）、account（用户名/注销＝技术软注销）、security（密码/认证）、appearance、notifications、language、about（项目介绍/技术栈/仓库地址）、acknowledgement（鸣谢）。
- **修复缺陷**：071 的页内分区导航点击会整页刷新——改为 SPA 内路由切换。

研究确认（R072-001）：IAM 现无资料字段、无自服务归档端点（archive 已是软注销语义：登录阻塞+会话吊销，但只有管理端 `{id}/archive`）；宿主 `HostRuntime` 无 navigate 但 App 装配点与 zone 注入先例俱备；语言键 `community-go-webui-language` 已有。推荐组合（R072-002）：IAM 增自服务 `updateProfile`（乐观锁）+ `self/archive` 两步确认（复用归档语义，技术软注销不物理删除）；`HostRuntime.navigate` 注入 + `SettingsNavLayout` 接 SectionNav onSelect（SPA 切换，单轨移除整页路径）；8 分区页内全列、全局菜单 `settings.center` 子项五分区；language 沿用同键+重载；about/acknowledgement 静态双语。

## 范围

IAM（migration 004 三方言 + 自服务两端点 + permission/observability/openapi 同步 + 测试）→ runtime navigate（SDK+App 注入+SettingsNavLayout）→ settings 8 分区重组（路由/menu/页面/i18n/mock/受控图标 info/star/languages）→ Go/WebUI/e2e 验证（SPA 切换无 reload 断言、资料/注销两步/语言/关于/鸣谢、截图 072-*）→ 文档与提交。

## 明确不做

- 不做物理删除（注销＝软注销/归档）；语言分区不建并行语言系统；
- 不改其他业务模块契约（仅 IAM 自服务新增与 settings 重组）。

## 阅读顺序

1. [研究档案](research/README.md)：R072-001、R072-002
2. [需求规格](requirements.md)：REQ-072-A..D
3. [设计方案](design.md)：IAM 端点、SPA 导航、8 分区、文件影响与待确认决策 1–5
4. [任务清单](tasks.md)：SET-072-A..E