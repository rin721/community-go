# 056 Navigation 后台导航策略模块

状态：研究门禁已通过，计划待确认；实施依赖 053 完成，并以 054 Permission Catalog 为权限投影来源。前置变更的确认不自动授权 056。

## 目标

新增 `navigation` 业务模块，只管理已注册菜单的启停、父子和排序，产出菜单策略 API/WebUI 与 `NavigationRevision`。静态 Route、Entry、component、locale 和 ViewOperationID 继续由各模块 WebUI Binding 拥有。

## 阅读顺序

1. [研究索引](research/README.md)
2. [需求规格](requirements.md)
3. [设计方案](design.md)
4. [任务与确认状态](tasks.md)

## 实施门禁

只有依赖完成且用户在本计划报告后明确确认 056，才能实施 `NAV-056-001..007`。数据库动态页面、外链/iframe、远程模块或第二套 role-menu authority 必须重新研究。
