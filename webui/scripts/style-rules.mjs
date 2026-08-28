// 083 STYLE-083-001 + 086 STYLE-086-001：样式权威规则（纯函数，供 lint-architecture 调用与反向测试）。
// 规则：
//  L1 模块 CSS 不得重复定义平台布局语义类（PLATFORM_LAYOUT_CLASSES 为 styles.css 唯一 authority）；
//  L2 模块 CSS 不得写死宿主可提供 token 的颜色（TOKEN_COLORS）与 mono 字体栈（--font-mono 等价）；
//  L3 模块 CSS 不得出现裸 :global(...)（无模块根类前缀）——真全局泄漏；
//  L4 模块 CSS 不得覆盖宿主公共组件类（常见的 shell/控件类），来源只允许宿主组件 token；
//  L5 模块 CSS 不得使用 !important 纠正样式；不得引用宿主不存在的 token（MYSTERY_TOKEN）。
// 模块专属类（如 ops-*/diagnostic-*/iam-form）允许保留模块根内 :global，不视为泄漏。

export const PLATFORM_LAYOUT_CLASSES = [
  "toolbar", "toolbar-actions", "page-meta", "page-sections", "page-section",
  "card-grid", "item-card", "filter-bar", "form-field", "form-error", "page-header",
  "page-eyebrow", "page-description", "module-page", "data-table", "data-toolbar",
  "pagination-total", "pagination-size", "permission-matrix", "permission-row",
  "permission-description", "role-checklist", "permissions", "admin-note",
];

// HOST_COMPONENT_CLASSES：宿主公共组件类，模块 CSS 不得覆盖（086 组件 token 唯一 authority）。
export const HOST_COMPONENT_CLASSES = [
  "ui-button", "ui-button-primary", "ui-button-secondary", "ui-button-ghost", "ui-button-danger",
  "code-text-value", "api-token-scope-group", "api-token-scope-owner",
  "workspace-tab", "workspace-tab-rail", "workspace-tab-close", "workspace-tabs",
  "sidebar-link", "brand-row", "topbar", "app-sidebar", "search-trigger",
];

// TOKEN_COLORS：宿主 primitive/semantic 已有的色值（十六进制裸值=重复宿主令牌）。
export const TOKEN_COLORS = [
  "#16a34a", "#d97706", "#dc2626", "#2563eb", "#3b82f6", "#06b6d4", "#10b981",
  "#8b5cf6", "#f97316", "#059669", "#0891b2", "#7c3aed", "#ea580c", "#15803d",
  "#ef4444", "#60a5fa", "#22d3ee",
];

// KNOWN_TOKENS：宿主 styles.css 定义的 token 名（供 L5 校验“模块不得引用不存在 token”）。
// 只列入模块实际会用到的语义/组件 token；新增 token 时同步维护。
export const KNOWN_TOKENS = [
  "primary", "primary-soft", "primary-strong", "page", "surface", "surface-muted",
  "text", "text-secondary", "text-muted", "border", "border-strong", "on-accent",
  "warning", "danger", "danger-text", "danger-border", "info", "info-soft", "info-strong",
  "success", "success-soft", "success-strong",
  "space-1", "space-2", "space-3", "space-4", "space-5", "space-6", "space-7", "space-8",
  "font-scale-10", "font-scale-11", "font-scale-xs", "font-scale-sm", "font-scale-md",
  "font-scale-15", "font-scale-lg", "font-scale-xl", "font-scale-page-title",
  "font-weight-regular", "font-weight-medium", "font-weight-semibold", "font-weight-bold",
  "font-lineheight-tight", "font-lineheight-normal", "font-lineheight-loose", "font-mono",
  "radius-4", "radius-5", "radius-xs", "radius-sm", "radius-7", "radius-md", "radius-lg",
  "radius-12", "radius-xl", "radius-pill", "radius-round",
  "control-height-sm", "control-height-md", "control-height-lg", "control-radius",
  "control-padding-x", "control-gap", "field-min-height", "field-gap",
  "content-max-wide", "content-max-detail", "content-max-settings", "content-max-form",
  "shell-sidebar-expanded", "shell-sidebar-collapsed", "shell-header-height",
  "shell-tabs-height", "shell-content-max",
  "header-padding-inline", "header-gap", "header-actions-gap", "header-badge-height",
  "icon-button-size", "avatar-size",
  "sidebar-padding", "sidebar-collapsed-padding-inline", "sidebar-link-min-height",
  "sidebar-link-padding-inline", "sidebar-link-gap", "sidebar-brand-row-min-height",
  "sidebar-brand-row-gap", "sidebar-brand-row-padding", "sidebar-brand-mark-size",
  "sidebar-brand-radius", "sidebar-meta-padding", "sidebar-group-toggle-size",
  "workspace-tabs-tab-min-width", "workspace-tabs-tab-max-width",
  "workspace-tabs-tab-padding-inline", "workspace-tabs-close-size",
  "workspace-tabs-overflow-trigger-size", "workspace-tabs-dot-size",
  "workspace-tabs-indicator-height", "workspace-tabs-overflow-padding-inline",
  "workspace-tabs-overflow-trigger-height", "workspace-tabs-context-menu-min-width",
  "menu-item-padding", "menu-min-width", "menu-popover-padding", "menu-item-gap",
  "section-nav-width", "section-nav-item-gap", "section-nav-item-padding", "section-nav-gap",
  "switch-track-width", "switch-track-height", "switch-thumb-size",
  "switch-thumb-inset", "switch-thumb-travel", "checkbox-size", "checkbox-radius",
  "table-row-height-compact", "table-row-height-default", "table-row-height-comfortable",
  "section-gap", "stat-gap", "stat-columns", "page-header-gap", "page-description-max-width",
  "menu-indent-base", "menu-indent-step", "z-sidebar", "z-account-menu", "z-overlay",
  "z-drawer", "z-toast", "z-confirm-backdrop", "z-confirm-dialog",
  "motion-quick", "motion-standard", "motion-layout", "ease-standard", "ease-emphasized",
  "shadow", "shadow-md", "shadow-lg", "shadow-drawer", "reveal-duration",
];

/** 判断以“宿主可提供 token”形式写死的颜色/字体栈（L2）。 */
function tokenAvoidableDeclaration(declaration, fileLabel) {
  const violations = [];
  // 颜色字面量：出现在值位置且属于 TOKEN_COLORS → 应改 var(--xxx)。
  for (const color of TOKEN_COLORS) {
    if (declaration.includes(color)) {
      violations.push(`${fileLabel}: L2 raw color ${color} must use a host semantic token (086) [${declaration.trim()}]`);
    }
  }
  // mono 字体栈字面量：等价 --font-mono。
  if (/ui-monospace|SFMono-Regular|JetBrains Mono/.test(declaration) && !declaration.includes("var(--font-mono)")) {
    violations.push(`${fileLabel}: L2 mono font stack must use var(--font-mono) (086) [${declaration.trim()}]`);
  }
  return violations;
}

/** 检查单个模块 CSS 样本，返回违规描述数组（空 = 合规）。 */
export function checkStyleAuthority(source, fileLabel = "module.css") {
  const violations = [];
  const sourceLines = source.split("\n");
  const rootClass = source.match(/^\s*\.([a-z][a-zA-Z0-9-]*)\s*(?:\{|\s|$)/m)?.[1];
  // 模块自身声明的局部自定义属性（如 .opsModule { --ops-tile-a: … }）允许使用，
  // 不视为“宿主不存在的 token”；只有引用宿主 token 名才校验。
  const localTokens = new Set();
  for (const match of source.matchAll(/--([a-z][a-zA-Z0-9-]*)\s*:/g)) {
    localTokens.add(match[1]);
  }
  let ruleAccumulator = "";

  for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex += 1) {
    const line = sourceLines[lineIndex];
    const at = `${fileLabel}:${lineIndex + 1}`;

    // L2：块内声明扫描——先累积当前规则内容，块结束时统一检查。
    ruleAccumulator += `${line}\n`;
    if (line.includes("}") || /\{[^}]*\}$/.test(line)) {
      const block = ruleAccumulator.slice(0, ruleAccumulator.lastIndexOf("}") + 1);
      ruleAccumulator = ruleAccumulator.slice(ruleAccumulator.lastIndexOf("}") + 1);
      // 排除注释块
      if (block.trim() && !block.trim().startsWith("/*")) {
        violations.push(...tokenAvoidableDeclaration(block, at));
      }
    }

    // L4：模块 CSS 不得【以宿主公共组件类为主体】重定义它（如 `.ui-button { … }` /
    // `:global(.ui-button) { … }` / `.x :global(.ui-button) { … }` 且声明了会覆盖
    // 组件尺寸/颜色/排版的属性）。仅作为后代上下文（如 `.permission-key-col
    // .code-text-value { text-overflow: ellipsis }` 截断工具）不算重定义——那是
    // 模块内容区布局，不改组件自身造型；此处只对“选择器以宿主类开头或紧邻 :global
    // 的宿主类且整规则是对它的重新定义”判违规。
    if (!line.trim().startsWith("/*") && !line.trim().startsWith("*")) {
      const trimmed = line.trim();
      const bareSubject = HOST_COMPONENT_CLASSES.find((cls) =>
        new RegExp(`(^|\\s):global\\(\\.${cls}\\)\\s*(?:\\.|\\{|,|\\s)`).test(trimmed)
        || new RegExp(`^\\s*\\.${cls}\\s*(?:\\.|\\{|,|\\s)`).test(trimmed)
      );
      if (bareSubject) {
        violations.push(`${at}: L4 host component class .${bareSubject} must not be redefined in module css (086 component tokens)`);
      }
    }

    // L5a：!important 不得用于样式纠正。
    if (line.includes("!important")) {
      violations.push(`${at}: L5 !important is forbidden in module css (086)`);
    }
    // L5b：引用宿主不存在的 token（模块自身声明的局部变量除外）。
    for (const match of line.matchAll(/var\(--([a-z][a-zA-Z0-9-]*)/g)) {
      const token = match[1];
      if (!KNOWN_TOKENS.includes(token) && !localTokens.has(token)) {
        violations.push(`${at}: L5 unknown host token var(--${token}) (086)`);
      }
    }
  }

  // L1：平台布局类不得出现在模块 CSS（含 :global 与局部 selector）。
  for (const cls of PLATFORM_LAYOUT_CLASSES) {
    if (source.includes(`.${cls}`)) {
      violations.push(`${fileLabel}: L1 platform layout class .${cls} must not be redefined in module css (083 style authority)`);
    }
  }

  // L3：裸 :global(...)（所在行无模块根类前缀）＝真全局泄漏。
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