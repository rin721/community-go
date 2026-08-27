# 083 Production-grade 全栈产品重构（WebUI 产品化二期）

## 状态

**研究中**（研究门禁未通过）。方案输入 `docs/changes/temp-new-changes.md`（Production-grade 全栈产品重构，606 行，commit `5a3def3`）与 `docs/changes/admin-design-baseline.md`（后台产品设计风格基准，commit `5a3def3`）。本研究阶段回答：新方案主张（推倒骨架/补后端/成熟组件库/移除 Tab Bar/产品化 Feature）与 **082 已实施现状**（HeroUI 单轨、静态插拔、保留 WorkspaceTabs、Backend Freeze、平台语义组件已落地）之间的实质差异、可落地范围与冲突裁决。

## 背景

082 已完成 WebUI 平台底座（DataTable 增强/FilterBar/FormField/状态反馈/语义组件/token/Query 契约）与全部主页面迁移（IAM/Auth/Ops/Org/Navigation/Token/UserDetail/Sessions/Menu 归位），Vitest 192 / mock E2E 3 / lint / build 全绿（2026-08-27 记录）。随后用户重写方案为「Production-grade 全栈产品重构」，并补充声明：**不替换当前组件栈（HeroUI/RAC/Tailwind），缺口用成熟技术补齐、优先成熟第三方而非自研**；同时指出**样式污染（122 处 `:global` 泄漏）与布局骨架缺陷（`100vh`/居中 `max-width`）**是真实存在、导致新增需求后交互出问题的架构缺陷。

## 研究问题（R083-001..003）

1. **新方案 vs 082 现状差异**：每节（1-12、11b/11c/11d）在当前已实现下是已满足/部分满足/未满足/冲突，可落地范围与决策点。
2. **样式权威与布局骨架事实基线**：122 处 `:global`、`100vh`、居中容器、Tab Bar、Footer 等的精确现状与修复路径。
3. **设计基线落地缺口**：082 各页面（Accounts/Roles/Sessions/Permissions/Audit/Org/Nav/Ops/Token/Settings）逐页对照 admin-design-baseline，哪些达到、哪些仍是"旧结构沿用"需重做。

## 阅读顺序

1. [研究档案](research/)（R083-001..003，建设中）
2. 待研究门禁通过后：[需求](requirements.md)、[设计](design.md)、[任务](tasks.md)