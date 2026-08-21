# 055 Organization 组织目录模块

状态：研究门禁已通过，计划待确认；实施依赖 053 完成，并以 054 已冻结的 AccountDirectory 契约为前提。053/054 的确认不自动授权 055。

## 目标

新增 `organization` 业务模块，拥有 Department、Position 及账号部门/岗位关系，产出部门、岗位和账号组织分配 API/WebUI。首版只提供组织目录和筛选，不进入权限 decision。

## 阅读顺序

1. [研究索引](research/README.md)
2. [需求规格](requirements.md)
3. [设计方案](design.md)
4. [任务与确认状态](tasks.md)

## 实施门禁

只有依赖完成且用户在本计划报告后明确确认 055，才能实施 `ORG-055-001..007`。部门数据范围、多租户、汇报线或 HR 流程必须另行研究。
