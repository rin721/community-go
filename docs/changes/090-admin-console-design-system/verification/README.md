# 090 视觉与可访问性审阅记录

## 记录边界

- 审阅日期：2026-08-29。
- 审阅对象：090 实施后的 Dashboard、Appearance 和账户目录代表截图，以及 090 mock E2E 的页面族/视口矩阵、键盘和读屏语义证据。
- 参考图只用于理解“为什么更舒适”：稳定的侧栏与顶部骨架、克制的边框和阴影、连续的对齐线、明确的标题/摘要/数据三级层级、紧凑但不拥挤的筛选与表格。090 没有复制其品牌、颜色、卡片内容或页面结构。
- 本记录不以截图文件名代替视觉结论；每个“人工确认”结论均来自实际查看渲染图。自动化几何与语义断言单独列出，不冒充人工视觉验收。

## 可复现证据

视觉证据由 `webui/e2e/webui-mock.spec.ts` 的 `090 dark compact snapshots for settings and accounts` 用例生成：

- `090-settings-appearance-light-comfortable-1280.png`
- `090-settings-appearance-dark-compact-1280.png`
- `090-accounts-dark-compact-1280.png`
- `090-accounts-dark-compact-390.png`

页面族矩阵由 `090 page family viewport matrix keeps content inside the viewport` 覆盖 12 个代表页面族 × 1440/1280/1024/768/390 五档视口，并断言页面无横向溢出。键盘与读屏证据由 `090 migrated pages expose keyboard and screen-reader semantics` 覆盖账户表格、部门树与 OpenAPI 标签栏。

## 人工审阅结论

### 页面骨架与视觉层级

- 1280px 亮色 Appearance：侧栏、顶部工具区、设置组二级导航和内容卡片形成四个稳定区域；主标题、说明、卡片标题和字段标签层级可辨，不依赖阴影堆叠层级。
- 1280px 暗色账户目录：页面动作位于标题区，搜索、筛选、结果数和数据表按任务顺序排列；表格列、状态文字和行操作保持同一对齐基线，高密度数据仍可扫描。
- 亮暗主题均使用低对比大面积表面与高对比正文，蓝色只承担选中和主操作，绿色/橙色/红色状态同时有文字，不只依赖颜色传意。

### 人工审阅发现并已修复

1. 暗色截图曾在导航后退回亮色，截图名称与真实状态不一致。已改为通过 Appearance 的真实选择交互切换主题和密度，并断言 `<html>` 的 `data-color-scheme`/`data-density`；提交证据：`7bd663e`。
2. Appearance 的服务端偏好与实际 `<html>` 主题曾不同步。服务端偏好加载后现同步本地投影和根节点；提交证据：`7bd663e`。
3. 侧栏英文曾显示字面量 `Governance \u0026 Audit`。英文资源已改为 `Governance & Audit`，视觉用例增加精确文本断言；提交证据：`7bd663e`。
4. 筛选器用空字符串表达“全部/不限”时，React Aria 将其视为未选择，暗色触发器显示为空黑块。统一 `SelectField`/`FilterSelect` 已使用内部稳定 key 映射空业务值，账户页可见 `All statuses`、`All roles` 和 `Default`；定向组件测试 8/8 通过。
5. 默认排序时仍显示 `Direction: Descending`，表达了并未生效的操作。账户、角色和 API Token 目录现仅在选择排序字段后呈现方向控件；账户视觉用例断言默认状态无 Direction。
6. 390px 下 `.filter-bar-main` 改为纵向 flex 后仍继承桌面 `flex-basis: 240px`，导致卡片标题与搜索之间出现大块空白。移动断点已将搜索容器改为 `flex: 0 0 auto` 和 `width: 100%`。

### 可访问性、长文本与高密度数据

- 账户表格通过 `aria-label` 暴露目录语义，选择框和行操作具有可访问名称；筛选器使用统一 Select 语义，空业务值仍对应可读选项文本。
- 部门树使用 `role=tree/treeitem`，OpenAPI 工作台使用 `tablist/tab`；现有测试覆盖键盘可聚焦和主要切换路径。
- 技术标识符使用 monospace 与受控换行/内部滚动；OpenAPI 长 revision、path 和 JSON 由紧凑工作台 E2E 断言不扩大页面宽度。
- 账户高密度截图中，用户名、状态、安全 revision 和行操作具有稳定列宽；Active/Disabled/Archived 等状态同时呈现文本，避免只靠色块识别。

## 尚未完成的最终复核

092 交互组件单轨任务在同一工作区中断于未提交中间态，并直接覆盖 090 的 `forms.tsx`、账户页和 mock E2E。当前 `/admin/accounts` 渲染 `Page failed to load`，因此移动 flex 修复后的 390px 最终截图不能作为可信证据重新生成。

在 092 恢复账户路由之前，本记录保持“部分完成”：

- 已人工确认：亮色/暗色桌面层级、暗色 compact 高密度账户目录、筛选空值与无效排序方向修复前后的差异。
- 已自动化覆盖：12 页面族 × 5 视口无横向溢出、代表键盘与读屏语义、亮暗和密度根属性。
- 待人工复核：移动 flex 修复后的 390px 最终画面，以及 092 单轨组件完成后的焦点、长文本和高密度回归。

只有上述待人工复核项完成后，才能将 `VERIFY-090-002`、`VERIFY-090-003` 和 `DOC-090-001` 标记完成。
