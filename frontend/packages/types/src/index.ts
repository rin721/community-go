export type ProductState =
  | 'loading'
  | 'empty'
  | 'error'
  | 'success'
  | 'warning'
  | 'disabled'
  | 'pending'
  | 'offline'
  | 'permission-denied';

export type NavigationLeaf = Readonly<{
  kind: 'leaf';
  id: string;
  labelKey: string;
  href: string;
}>;

export type NavigationBranch = Readonly<{
  kind: 'branch';
  id: string;
  labelKey: string;
  defaultHref: string;
  children: readonly [NavigationNode, ...NavigationNode[]];
}>;

export type NavigationNode = NavigationLeaf | NavigationBranch;

export type NavigationGroup = Readonly<{
  id: string;
  labelKey: string;
  items: readonly [NavigationNode, ...NavigationNode[]];
}>;
