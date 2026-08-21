# 048 研究索引

本目录回答两个问题：当前 WebUI 为什么仍然是构建期耦合，以及哪一种模块化模型既能保留完整业务模块，又不会让每个页面反向修改宿主核心。

## 记录

- [R001 当前 WebUI 全栈耦合审计](R001-current-webui-coupling/report.md)：沿 Binding、Composition、codegen、Router、宿主契约、业务页面和 CSS 核对当前依赖方向。
- [R002 静态全栈模块方案比较](R002-static-full-stack-module-model/report.md)：比较当前共置模型、集中前端、静态全栈模块和运行时微前端，并结合 React Router、Vite 与 TypeScript 官方能力形成推荐方案。

## 门禁结论

关键问题已经有可复核证据，事实、用户决策和目标设计已经分离。剩余未知主要是实施时的 API DTO 细节与迁移切片顺序，不妨碍形成整体计划，因此研究门禁通过。
