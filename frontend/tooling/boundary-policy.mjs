const testPathPattern = /(?:^|\/)\b(?:e2e|test|tests|__tests__)\b(?:\/|$)|\.(?:test|spec)\.[^.]+$/;

export function findSourcePolicyViolations({ content, extension, localPath }) {
  const violations = [];
  const isUiAdapter = localPath.startsWith('packages/ui-adapter/');
  const isTest = testPathPattern.test(localPath);

  if (
    extension === '.tsx' &&
    /(?:^|[\s'"`])(?!(?:data|aria|group-data|peer-data)-)[a-z][a-z-]*-\[[^\]]+\]/m.test(content)
  ) {
    violations.push(['Token governance', '禁止 Tailwind arbitrary value']);
  }

  if (extension === '.tsx' && !isUiAdapter && /<(?:input|textarea|select|option)\b/.test(content)) {
    violations.push(['UI contract', 'Feature 禁止绕过 UI Adapter 使用原生表单控件']);
  }

  if (
    extension === '.tsx' &&
    !isUiAdapter &&
    /\bui-(?:field|overlay|anchored|listbox|option)(?:-|\b)/.test(content)
  ) {
    violations.push(['UI contract', 'Adapter 内部 Element 样式禁止向 Feature 泄漏']);
  }

  if (
    extension === '.tsx' &&
    !isUiAdapter &&
    !isTest &&
    /\bclassNames\s*=|\b(?:button|modal|popover|drawer|dropdown|tabs|table)--[a-z-]+/.test(content)
  ) {
    violations.push(['Vendor contract', 'Feature 禁止消费 vendor slot/class map 或 BEM class']);
  }

  if (
    extension === '.css' &&
    !isUiAdapter &&
    /\[data-slot(?:\]|=)|\.(?:button|modal|popover|drawer|dropdown|tabs|table)--[a-z-]+/.test(
      content,
    )
  ) {
    violations.push(['Vendor contract', '公开样式禁止穿透 vendor slot 或内部 BEM DOM']);
  }

  if (content.includes('!important')) {
    violations.push(['Style governance', '禁止 !important']);
  }

  if (extension === '.tsx' && /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(content)) {
    violations.push(['Token governance', '组件中禁止硬编码颜色']);
  }

  if (
    extension === '.css' &&
    localPath !== 'packages/design-system/src/tokens.css' &&
    /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(content)
  ) {
    violations.push(['Token governance', '硬编码颜色只能由 Design Token 权威文件声明']);
  }

  return violations;
}

export function findImportPolicyViolations({ localPath, specifier, workspace }) {
  const violations = [];

  if (specifier.startsWith('@heroui/') && !localPath.startsWith('packages/ui-adapter/')) {
    violations.push(['HeroUI isolation', '直接依赖只能出现在 packages/ui-adapter']);
  }
  if (specifier === '@community-go/ui-adapter') {
    violations.push(['UI adapter imports', '必须使用 UI Adapter 语义子路径，禁止根 Barrel 导入']);
  }
  if (workspace?.startsWith('packages/') && specifier.startsWith('@community-go/admin-web')) {
    violations.push(['Dependency direction', '公共包不得依赖 Runtime Host']);
  }
  if (workspace === 'packages/core') {
    const allowed =
      specifier === '@community-go/types' || specifier === 'vitest' || specifier.startsWith('.');
    if (!allowed) violations.push(['Core purity', `Core 不得依赖 ${specifier}`]);
  }

  return violations;
}
