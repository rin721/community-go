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

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

for (const { moduleID, root } of await discoverWebUIModuleRoots(repositoryRoot)) {
  for (const file of await sourceFiles(root)) {
    const relativeFile = relative(repositoryRoot, file).replaceAll("\\", "/");
    const source = await readFile(file, "utf8");
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
  // 059 BOUNDARY-001：宿主不得读取 Manifest 的 moduleId 分支业务；平台源码（含测试 fixture）中任何
  // moduleId 属性访问都视为 ModuleID 特判，类型声明（moduleId: string）不含点号访问，不受影响。
  if (/\.moduleId\b/.test(source)) errors.push(`${relativeFile}: WebUI platform source must not branch by ModuleID`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("WebUI architecture scan passed");
