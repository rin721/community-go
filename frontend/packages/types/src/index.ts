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
  /** 可选 semantic presentation metadata（opaque；Shell 按自己 presentation policy 消费）。 */
  iconId?: string;
}>;

export type NavigationBranch = Readonly<{
  kind: 'branch';
  id: string;
  labelKey: string;
  defaultHref: string;
  children: readonly [NavigationNode, ...NavigationNode[]];
  /** 可选 semantic presentation metadata（opaque；Shell 按自己 presentation policy 消费）。 */
  iconId?: string;
}>;

export type NavigationNode = NavigationLeaf | NavigationBranch;

export type NavigationGroup = Readonly<{
  id: string;
  labelKey: string;
  items: readonly [NavigationNode, ...NavigationNode[]];
}>;
