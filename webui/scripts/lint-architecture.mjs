import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { discoverWebUIModuleRoots } from "./module-roots.mjs";
import { loadProjectLayout, resolveLayoutPaths } from "./project-layout.mjs";

const project = loadProjectLayout();
const { repositoryRoot, webuiRoot, platformStyles, webuiSourceRoot } = resolveLayoutPaths(project);
const errors = [];

const platformStylesSource = await readFile(platformStyles, "utf8");
for (const selector of [
  "auth-panel", "auth-form", "auth-summary", "auth-session", "scope-list", "scope-item",
  "ops-grid", "ops-summary", "ops-overview", "ops-metric", "diagnostic-", "capability-preview",
  "capability-row-actions", "capability-detail-result", "refresh-icon",
]) {
  if (platformStylesSource.includes(`.${selector}`)) errors.push(`${project.layout.webui.platformStyles}: business selector ${selector} must be module-owned`);
}

// 083 STYLE-083-001：平台布局语义类（styles.css 为唯一 authority）。
// 模块 CSS 不得用 :global 重复定义、不得局部覆盖这些类；类名 kebab-case 统一。
const PLATFORM_LAYOUT_CLASSES = [
  "toolbar", "toolbar-actions", "page-meta", "page-sections", "page-section",
  "card-grid", "item-card", "filter-bar", "form-field", "form-error", "page-header",
  "page-eyebrow", "page-description", "module-page", "data-table", "data-toolbar",
  "pagination-total", "pagination-size", "permission-matrix", "permission-row",
  "permission-description", "role-checklist", "permissions", "admin-note",
];

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(?:ts|tsx|css)$/.test(entry.name)) files.push(path);
  }
  return files;
}

for (const { moduleID, root } of await discoverWebUIModuleRoots(repositoryRoot)) {
  for (const file of await sourceFiles(root)) {
    const relativeFile = relative(repositoryRoot, file).replaceAll("\\", "/");
    const source = await readFile(file, "utf8");
    if (/\.css$/.test(file)) {
      // 083 样式权威规则：
      //  L1 平台布局类不得在本模块 CSS 中出现（含 :global 与局部 selector）——重复或私有覆盖。
      for (const cls of PLATFORM_LAYOUT_CLASSES) {
        if (source.includes(`.${cls}`)) {
          errors.push(`${relativeFile}: L1 platform layout class .${cls} must not be redefined in module css (083 style authority)`);
        }
      }
      //  L3 裸 :global(...)（无模块根类前缀的交易行）＝真全局泄漏。
      const rootClass = source.match(/^\s*\.([a-z][a-zA-Z0-9-]*)\s*(?:\{|\s|$)/m)?.[1];
      for (const match of source.matchAll(/:global\(\s*\.([a-z][a-zA-Z0-9-]*)\s*\)/g)) {
        const lineStart = source.lastIndexOf("\n", match.index) + 1;
        const line = source.slice(lineStart, source.indexOf("\n", match.index) < 0 ? source.length : source.indexOf("\n", match.index));
        const hasPrefix = rootClass && line.includes(`.${rootClass}`);
        if (!hasPrefix && !line.trimStart().startsWith(".")) {
          // 行首非模块根类且无前缀 => 真全局候选；容忍「只含 :global」缩进行若紧跟根类上下文
          errors.push(`${relativeFile}: L3 bare :global(.${match[1]}) leaks to global stylesheet (083 style authority)`);
        }
      }
      continue;
    }
    if (source.includes("@webui/contracts") || source.includes("@webui/ui")) errors.push(`${relativeFile}: old WebUI alias is forbidden`);
    if (source.includes("@tanstack/react-query")) errors.push(`${relativeFile}: query client must enter through @webui/sdk/query`);
    if (/from\s+["'][^"']*webui\/src\/(?:platform|components|pages)[^"']*["']/.test(source)) errors.push(`${relativeFile}: module imports WebUI platform internals`);
    for (const importedModule of source.matchAll(/internal\/module\/([a-z0-9_-]+)/g)) {
      if (importedModule[1] !== moduleID) errors.push(`${relativeFile}: module import crosses into ${importedModule[1]}`);
    }
  }
}

for (const file of await sourceFiles(webuiSourceRoot)) {
  const relativeFile = relative(repositoryRoot, file).replaceAll("\\", "/");
  if (relativeFile.includes("/sdk/") || relativeFile.includes("/generated/")) continue;
  const source = await readFile(file, "utf8");
  if (/internal\/module\//.test(source)) errors.push(`${relativeFile}: WebUI platform source must not import business modules`);
  if (/\.moduleId\b/.test(source)) errors.push(`${relativeFile}: WebUI platform source must not branch by ModuleID`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("WebUI architecture scan passed");