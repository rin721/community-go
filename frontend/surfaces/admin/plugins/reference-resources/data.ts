/**
 * reference-resources —— 确定性本地参考数据。
 *
 * 仅用于验证 File Route、Navigation inheritance 与 Route Target，
 * 不模拟 API、权限引擎或后端业务正确性（Host 守则：Reference 数据只用于确定性验收）。
 */

export type ReferenceResourceKind = 'sample' | 'guide' | 'template';

export type ReferenceResource = Readonly<{
  id: string;
  name: string;
  kind: ReferenceResourceKind;
  status: 'active' | 'draft';
  description: string;
}>;

const resourceDefinitions: readonly ReferenceResource[] = [
  {
    id: 'resource-alpha',
    name: 'Alpha 示例资源',
    kind: 'sample',
    status: 'active',
    description: '第一个确定性参考资源，用于验证列表、详情与编辑的 File Route 拓扑。',
  },
  {
    id: 'resource-beta',
    name: 'Beta 引导指南',
    kind: 'guide',
    status: 'active',
    description: '展示 File Route 的静态 mount 与 symbolic Route Target 的确定性链路。',
  },
  {
    id: 'resource-gamma',
    name: 'Gamma 模板',
    kind: 'template',
    status: 'draft',
    description: '草稿资源，用于验证状态展示与 editing 场景的继承关系。',
  },
] as const;

export function getReferenceResources(): readonly ReferenceResource[] {
  return resourceDefinitions;
}
