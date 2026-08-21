import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * 发现仓库中实际提供 WebUI 源码的业务模块。
 * 目录结果按 module ID 排序，保证各平台的 lint 输出稳定。
 */
export async function discoverWebUIModuleRoots(repositoryRoot) {
  const moduleDirectory = join(repositoryRoot, "internal", "module");
  const entries = await readdir(moduleDirectory, { withFileTypes: true });
  const roots = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const root = join(moduleDirectory, entry.name, "binding", "webui", "web");
    try {
      if ((await stat(root)).isDirectory()) roots.push({ moduleID: entry.name, root });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return roots;
}
