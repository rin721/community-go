import { access, readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

import {
  getFoundationWorkspaceNameViolation,
  isFoundationDependencyAllowed,
} from './foundation-policy.mjs';

const frontendRoot = resolve(import.meta.dirname, '..');
const policy = JSON.parse(
  await readFile(join(frontendRoot, 'tooling', 'foundation-policy.json'), 'utf8'),
);
const registry = JSON.parse(
  await readFile(join(frontendRoot, 'tooling', 'foundation-contracts.json'), 'utf8'),
);
const violations = [];
const manifests = new Map();

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

for (const root of ['apps', 'packages', 'surfaces']) {
  for (const entry of await readdir(join(frontendRoot, root), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const workspace = `${root}/${entry.name}`;
    const manifestPath = join(frontendRoot, workspace, 'package.json');
    if (!(await exists(manifestPath))) continue;
    manifests.set(workspace, JSON.parse(await readFile(manifestPath, 'utf8')));
  }
}

const registeredWorkspaces = new Set(Object.keys(policy.workspaces));
for (const workspace of manifests.keys()) {
  if (!registeredWorkspaces.has(workspace)) violations.push(`${workspace}: workspace 未分类`);
}
for (const workspace of registeredWorkspaces) {
  if (!manifests.has(workspace)) violations.push(`${workspace}: 分类指向不存在的 workspace`);
}

const workspaceByPackage = new Map(
  [...manifests].map(([workspace, manifest]) => [manifest.name, workspace]),
);

for (const [workspace, manifest] of manifests) {
  const owner = policy.workspaces[workspace];
  if (!owner) continue;
  const nameViolation = getFoundationWorkspaceNameViolation(workspace, owner);
  if (nameViolation) violations.push(`${workspace}: ${nameViolation}`);
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    const targetWorkspace = workspaceByPackage.get(dependency);
    if (!targetWorkspace) continue;
    const target = policy.workspaces[targetWorkspace];
    if (!target || !isFoundationDependencyAllowed(owner, target)) {
      violations.push(`${workspace}: 禁止依赖 ${targetWorkspace}`);
    }
  }
}

for (const [packageName, contract] of Object.entries(registry.contracts)) {
  const workspace = workspaceByPackage.get(packageName);
  if (!workspace) {
    violations.push(`${packageName}: Contract 指向不存在的 package`);
    continue;
  }
  const manifest = manifests.get(workspace);
  const actualExports = Object.keys(manifest.exports ?? {}).sort();
  const registeredExports = [...contract.exports].sort();
  if (JSON.stringify(actualExports) !== JSON.stringify(registeredExports)) {
    violations.push(`${packageName}: exports 与 Contract registry 不一致`);
  }
  if (!['experimental', 'stable', 'replacing', 'retiring'].includes(contract.maturity)) {
    violations.push(`${packageName}: maturity 非法`);
  }
  if (!contract.owner || contract.authorityRoutes.length === 0 || contract.evidence.length === 0) {
    violations.push(`${packageName}: owner、authorityRoutes 与 evidence 不得为空`);
  }
  for (const evidence of contract.evidence) {
    if (!(await exists(join(frontendRoot, evidence)))) {
      violations.push(`${packageName}: 证据不存在 ${evidence}`);
    }
  }
}

for (const [workspace, manifest] of manifests) {
  if (
    (workspace.startsWith('packages/') || workspace.startsWith('surfaces/')) &&
    !registry.contracts[manifest.name]
  ) {
    violations.push(`${manifest.name}: 公共 package/surface 缺少 Contract registry`);
  }
}

async function collectSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'coverage'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(path)));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const vendorOwners = new Map([
  ['react-hook-form', 'packages/form-foundation'],
  ['@hookform/resolvers', 'packages/form-foundation'],
  ['i18next', 'packages/i18n'],
  ['react-i18next', 'packages/i18n'],
]);
const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
for (const file of await collectSourceFiles(frontendRoot)) {
  const localPath = relative(frontendRoot, file).split(sep).join('/');
  const content = await readFile(file, 'utf8');
  for (const match of content.matchAll(importPattern)) {
    const specifier = match[1];
    for (const [vendor, owner] of vendorOwners) {
      if (
        (specifier === vendor || specifier.startsWith(`${vendor}/`)) &&
        !localPath.startsWith(`${owner}/`)
      ) {
        violations.push(`${localPath}: ${vendor} 只能由 ${owner} 直接依赖`);
      }
    }
    if (
      (specifier === 'next' || specifier.startsWith('next/')) &&
      !localPath.startsWith('apps/admin-web/')
    ) {
      violations.push(`${localPath}: Next 只能由 Web Host 直接依赖`);
    }
  }
  if (
    /\bnew Intl\.(?:DateTimeFormat|NumberFormat|RelativeTimeFormat)\b/.test(content) &&
    !localPath.startsWith('packages/i18n/')
  ) {
    violations.push(`${localPath}: Intl 格式化必须经过 packages/i18n`);
  }
}

if (violations.length > 0) {
  console.error(
    `Foundation governance failed:\n${violations.map((item) => `- ${item}`).join('\n')}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Foundation governance passed for ${manifests.size} workspaces and ${Object.keys(registry.contracts).length} contract owners.`,
  );
}
