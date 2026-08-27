// 083 STYLE-083-001：样式权威规则（纯函数，供 lint-architecture 调用与反向测试）。
// 规则：
//  L1 模块 CSS 不得重复定义平台布局语义类（PLATFORM_LAYOUT_CLASSES 为 styles.css 唯一 authority）；
//  L3 模块 CSS 不得出现裸 :global(...)（无模块根类前缀）——真全局泄漏。
// 模块专属类（如 ops-*/diagnostic-*/iam-form）允许保留模块根内 :global，不视为泄漏。

export const PLATFORM_LAYOUT_CLASSES = [
  "toolbar", "toolbar-actions", "page-meta", "page-sections", "page-section",
  "card-grid", "item-card", "filter-bar", "form-field", "form-error", "page-header",
  "page-eyebrow", "page-description", "module-page", "data-table", "data-toolbar",
  "pagination-total", "pagination-size", "permission-matrix", "permission-row",
  "permission-description", "role-checklist", "permissions", "admin-note",
];

/** 检查单个模块 CSS 样本，返回违规描述数组（空 = 合规）。 */
export function checkStyleAuthority(source, fileLabel = "module.css") {
  const violations = [];
  // L1：平台布局类不得出现在模块 CSS（含 :global 与局部 selector）——重复或私有覆盖。
  for (const cls of PLATFORM_LAYOUT_CLASSES) {
    if (source.includes(`.${cls}`)) {
      violations.push(`${fileLabel}: L1 platform layout class .${cls} must not be redefined in module css (083 style authority)`);
    }
  }
  // L3：裸 :global(...)（所在行无模块根类前缀）＝真全局泄漏。
  const rootClass = source.match(/^\s*\.([a-z][a-zA-Z0-9-]*)\s*(?:\{|\s|$)/m)?.[1];
  for (const match of source.matchAll(/:global\(\s*\.([a-z][a-zA-Z0-9-]*)\s*\)/g)) {
    const lineStart = source.lastIndexOf("\n", match.index) + 1;
    const lineEnd = source.indexOf("\n", match.index);
    const line = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd);
    const hasPrefix = Boolean(rootClass) && line.includes(`.${rootClass}`);
    if (!hasPrefix && !line.trimStart().startsWith(".")) {
      violations.push(`${fileLabel}: L3 bare :global(.${match[1]}) leaks to global stylesheet (083 style authority)`);
    }
  }
  return violations;
}