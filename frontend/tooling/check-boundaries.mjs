import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';

const frontendRoot = resolve(import.meta.dirname, '..');
const sourceExtensions = new Set(['.ts', '.tsx', '.css']);
const ignoredDirectories = new Set(['node_modules', 'dist', 'coverage', '.vite']);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(entryPath)));
    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) files.push(entryPath);
  }
  return files;
}

function workspaceOf(filePath) {
  const localPath = relative(frontendRoot, filePath).split(sep);
  if (!['apps', 'packages'].includes(localPath[0] ?? '')) return null;
  return localPath.slice(0, 2).join('/');
}

function report(violations, filePath, rule, detail) {
  violations.push(`${relative(frontendRoot, filePath)}: ${rule} - ${detail}`);
}

const files = await collectSourceFiles(frontendRoot);
const violations = [];
const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;

for (const filePath of files) {
  const content = await readFile(filePath, 'utf8');
  const localPath = relative(frontendRoot, filePath).split(sep).join('/');
  const workspace = workspaceOf(filePath);

  if (
    extname(filePath) === '.tsx' &&
    /(?:^|[\s'"`])(?!(?:data|aria|group-data|peer-data)-)[a-z][a-z-]*-\[[^\]]+\]/m.test(content)
  ) {
    report(violations, filePath, 'Token governance', '禁止 Tailwind arbitrary value');
  }
  if (
    extname(filePath) === '.tsx' &&
    !localPath.startsWith('packages/ui-adapter/') &&
    /<(?:input|textarea|select|option)\b/.test(content)
  ) {
    report(violations, filePath, 'UI contract', 'Feature 禁止绕过 UI Adapter 使用原生表单控件');
  }
  if (
    extname(filePath) === '.tsx' &&
    !localPath.startsWith('packages/ui-adapter/') &&
    /\bui-(?:field|overlay|anchored|listbox|option)(?:-|\b)/.test(content)
  ) {
    report(violations, filePath, 'UI contract', 'Adapter 内部 Element 样式禁止向 Feature 泄漏');
  }
  if (content.includes('!important')) {
    report(violations, filePath, 'Style governance', '禁止 !important');
  }
  if (extname(filePath) === '.tsx' && /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(content)) {
    report(violations, filePath, 'Token governance', '组件中禁止硬编码颜色');
  }
  if (
    extname(filePath) === '.css' &&
    localPath !== 'packages/design-system/src/tokens.css' &&
    /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(content)
  ) {
    report(violations, filePath, 'Token governance', '硬编码颜色只能由 Design Token 权威文件声明');
  }

  for (const match of content.matchAll(importPattern)) {
    const specifier = match[1];
    if (!specifier) continue;
    if (specifier.startsWith('@heroui/') && !localPath.startsWith('packages/ui-adapter/')) {
      report(violations, filePath, 'HeroUI isolation', '直接依赖只能出现在 packages/ui-adapter');
    }
    if (specifier.startsWith('.')) {
      const targetWorkspace = workspaceOf(resolve(filePath, '..', specifier));
      if (workspace && targetWorkspace && workspace !== targetWorkspace) {
        report(
          violations,
          filePath,
          'Workspace boundary',
          `禁止跨 Workspace 相对导入 ${specifier}`,
        );
      }
    }
    if (workspace?.startsWith('packages/') && specifier.startsWith('@community-go/web')) {
      report(violations, filePath, 'Dependency direction', '公共包不得依赖 Web Host');
    }
    if (workspace?.startsWith('packages/') && specifier.startsWith('@community-go/desktop-host')) {
      report(violations, filePath, 'Dependency direction', '公共包不得依赖 Desktop Host');
    }
    if (workspace === 'packages/core') {
      const allowed =
        specifier === '@community-go/types' || specifier === 'vitest' || specifier.startsWith('.');
      if (!allowed) report(violations, filePath, 'Core purity', `Core 不得依赖 ${specifier}`);
    }
  }

  if (
    workspace?.startsWith('packages/') &&
    /\b(?:window|document|navigator|localStorage|sessionStorage)\b/.test(content)
  ) {
    report(violations, filePath, 'Host leakage', '公共包不得直接访问浏览器 Host API');
  }
}

if (violations.length > 0) {
  console.error(`Architecture checks failed:\n${violations.map((item) => `- ${item}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Architecture checks passed for ${files.length} source files.`);
}
