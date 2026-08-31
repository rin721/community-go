import type { NavigationBranch, NavigationLeaf, NavigationNode } from '@community-go/types';

export type NavigationLeafPath = Readonly<{
  leaf: NavigationLeaf;
  ancestors: readonly NavigationBranch[];
}>;

export function getFirstNavigationLeaf(node: NavigationNode): NavigationLeaf {
  return node.kind === 'leaf' ? node : getFirstNavigationLeaf(node.children[0]);
}

export function flattenNavigationLeaves(
  nodes: readonly NavigationNode[],
  ancestors: readonly NavigationBranch[] = [],
): readonly NavigationLeafPath[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'leaf') return [{ leaf: node, ancestors }];
    return flattenNavigationLeaves(node.children, [...ancestors, node]);
  });
}

export function getNavigationTreeErrors(nodes: readonly NavigationNode[]): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const hrefs = new Set<string>();

  const visit = (node: NavigationNode) => {
    if (ids.has(node.id)) errors.push(`duplicate id: ${node.id}`);
    ids.add(node.id);

    if (node.kind === 'leaf') {
      if (hrefs.has(node.href)) errors.push(`duplicate href: ${node.href}`);
      hrefs.add(node.href);
      return;
    }

    if (node.defaultHref !== getFirstNavigationLeaf(node).href) {
      errors.push(`invalid default href: ${node.id}`);
    }
    node.children.forEach(visit);
  };

  nodes.forEach(visit);
  return errors;
}

export function isNavigationHrefActive(href: string, pathname: string): boolean {
  const normalize = (value: string) => (value.length > 1 ? value.replace(/\/$/, '') : value);
  return normalize(href) === normalize(pathname);
}
