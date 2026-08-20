import{p as r,s as t,o as i,a as s,_ as c,b as d,r as l}from"./schemas-DGILMLri.js";const m=[{author:"Console Platform Maintainers",cover:"/images/blog/react-frontend-migration.svg",date:"2026-06-18",description:"Notes on the first phase of moving the platform console to a unified React public site and admin workspace.",draft:!1,locale:"en-US",slug:"react-frontend-migration",tags:["React","i18n","Design System"],title:"React Frontend Migration Phase One",updatedAt:"2026-06-18",content:`Phase one creates the React project foundation instead of deleting the legacy Nuxt admin immediately. This keeps the migration evidence-based while the build output, Go static hosting path, and \`/admin\` route behavior are verified.

## Phase goals

- Create the React Router Framework SPA.
- Establish the platform React component layers.
- Add i18next resources and canonical \`X-Locale\` forwarding.
- Validate Markdown front matter.

Each migrated admin page must also remove the matching old route, component, API call, and obsolete i18n keys in the same phase.`,highlightedCode:{},path:"content/blog/en-US/react-frontend-migration.md"},{author:"Console Platform Maintainers",cover:"/images/blog/react-frontend-migration.svg",date:"2026-06-18",description:"记录平台控制台从旧后台入口迁移到统一 React 前端的第一阶段边界。",draft:!1,locale:"zh-CN",slug:"react-frontend-migration",tags:["React","i18n","Design System"],title:"React 前端迁移第一阶段",updatedAt:"2026-06-18",content:`第一阶段先建立新的 React 工程骨架，而不是直接删除旧的 Nuxt 后台。这样可以在验证构建产物、Go 静态托管路径和 \`/admin\` 路由守卫前，保留足够的事实依据。

## 本阶段目标

- 建立 React Router Framework SPA。
- 建立 platform React 组件分层。
- 建立 i18next 资源与 \`X-Locale\` 映射。
- 建立 Markdown front matter 校验。

后续每迁移一个后台页面，都需要同步清理旧入口、旧组件、旧 API 调用和废弃 i18n key。`,highlightedCode:{},path:"content/blog/zh-CN/react-frontend-migration.md"}],o=r(e=>e instanceof Date?e.toISOString().slice(0,10):e,t().date()),g=i({author:t().min(1),cover:t().min(1),date:o,description:t().min(1),draft:d(),locale:c(["zh-CN","en-US"]),slug:t().min(1),tags:s(t().min(1)),title:t().min(1),updatedAt:o});function h(e){return f().filter(a=>a.locale===e&&!a.draft).sort((a,n)=>n.date.localeCompare(a.date))}function b(e,a){return h(e).find(n=>n.slug===a)??null}function f(){return m.map(e=>u.parse(e))}const u=g.extend({content:t().min(1),highlightedCode:l(t(),t()),path:t().min(1)});export{b as a,h as g};
