export function isFoundationDependencyAllowed(owner, target) {
  if (owner.layer === 'universal') return target.layer === 'universal';
  if (owner.layer === 'surface') {
    return (
      target.layer === 'universal' ||
      (target.layer === 'surface' && owner.surface === target.surface)
    );
  }
  return (
    target.layer === 'universal' || (target.layer === 'surface' && owner.surface === target.surface)
  );
}

export function getFoundationWorkspaceNameViolation(workspace, classification) {
  if (classification.layer === 'surface') {
    const kind = classification.kind ?? 'foundation';
    if (kind === 'foundation' && !workspace.endsWith(`/${classification.surface}-foundation`)) {
      return 'Surface Foundation 命名必须为 packages/<surface>-foundation';
    }
    if (kind === 'framework' && !workspace.endsWith(`/${classification.surface}-framework`)) {
      return 'Surface Framework 命名必须为 packages/<surface>-framework';
    }
    if (kind === 'surface' && !workspace.startsWith('surfaces/')) {
      return 'Product Surface 实现必须位于 surfaces/ 目录';
    }
  }
  if (
    classification.layer === 'host' &&
    !workspace.endsWith(`/${classification.surface}-${classification.runtime}`)
  ) {
    return 'Host 命名必须为 apps/<surface>-<runtime>';
  }
  return null;
}
