# 084 WebUI 产品化重构：逐页推翻低质量布局（第三期）

## 状态

**研究中 → 计划中（2026-09-01）**。以用户长期重构目标（admin-design-baseline.md + 逐页产品化目标）为唯一输入，基于全路由 mock 截图 + codex 多模态视觉审计 + 代码级审查形成本计划；计划经用户目标指令确认，进入实施。

## 范围（本变更）

- 依据 [R084-001 视觉与代码审计](research/R084-001-product-ux-audit/report.md) 的 P0/P1 结论，逐页推翻低质量布局与组件组织，禁止仅调色/圆角/padding。
- 第一批页面（本变更实施面）：
  1. Organization：Departments / Positions / Assignments 三页
  2. Navigation：Menus 页（P0 截断 + 原始 i18n key）
  3. OpenAPI：默认选中 + 空态（P0）
  4. IAM：Permissions 描述「翻译资源缺失」（P1）
- 第二批（记录，不实施）：Settings 开关行（appearance/notifications/language）、密码表单（confirm + 分组）、ApiTokens 创建分组、Login/Setup、Sessions/Accounts 密度。
- 功能闭环补全：仅补「能由现有业务合理推导」的能力（部门重命名/换父级、岗位重命名、账号列表筛选细节），后端已有契约支持；无法推断的规则标记待确认，不凭空造。

## 阅读顺序

1. [需求](requirements.md)（范围、验收）
2. [设计](design.md)（每页新 IA/交互/组件、文件影响）
3. [任务清单](tasks.md)（任务 ID、完成条件、证据）
4. [研究档案](research/R084-001-product-ux-audit/report.md)（事实与证据）