/**
 * @community-go/schemas —— Governance Draft / Diff / Change 数据 Contract 与纯规则。
 *
 * Draft / Diff / Change 是未来 Project Authoring 出现前、需要跨 Authority 统一
 * 交换的治理数据 Contract。本模块只定义结构与**无副作用**的纯规则：
 * - createGovernanceChange：由 Draft 相对当前值生成 Diff；
 * - describeGovernanceDiff：可读描述；
 * - applyGovernanceChange：不可变计算目标值（不执行任何写回副作用；
 *   Authority Commit 属未来正式能力，本模块不提供）。
 */

/** 治理 Draft：一次治理变更草案（只承载一次交换，不持有具体治理事实）。 */
export type GovernanceDraft = Readonly<{
  draftId: string;
  authorityId: string;
  domainId: string;
  nodeId: string;
  /** 目标值（纯数据；具体语义由对应 Authority 的 value schema 解释）。 */
  targetValue: unknown;
  source: 'inspector' | 'plugin' | 'project-author';
  createdAt: string;
}>;

/** 治理 Diff：Draft 相对当前值的结构化差异（remove 无 after；add 无 before）。 */
export type GovernanceDiff = Readonly<{
  draftId: string;
  authorityId: string;
  domainId: string;
  nodeId: string;
  kind: 'add' | 'update' | 'remove';
  path: readonly PropertyKey[];
  before?: unknown;
  after?: unknown;
}>;

/** 治理 Change：Draft + 全部 Diff。 */
export type GovernanceChange = GovernanceDraft &
  Readonly<{
    diffs: readonly GovernanceDiff[];
  }>;

/** Draft source 白名单。 */
export type GovernanceDraftSource = GovernanceDraft['source'];

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 由 Draft 相对当前值生成 Change（含结构化 Diff）。
 *
 * 纯不可变计算：
 * - 当前值与 targetValue 全等 → 无 diff；
 * - 二者均为纯 record → 逐 key 比较（缺失=remove / 新增=add / 不同=update）；
 * - 其它类型 → 单一 update diff（before=当前值, after=目标值）。
 */
export function createGovernanceChange(
  draft: GovernanceDraft,
  currentValue: unknown,
): GovernanceChange {
  const diffs: GovernanceDiff[] = [];
  const base = {
    draftId: draft.draftId,
    authorityId: draft.authorityId,
    domainId: draft.domainId,
    nodeId: draft.nodeId,
  };

  if (Object.is(currentValue, draft.targetValue)) {
    return { ...draft, diffs: [] };
  }

  if (isPlainRecord(currentValue) && isPlainRecord(draft.targetValue)) {
    const keys = new Set([...Object.keys(currentValue), ...Object.keys(draft.targetValue)]);
    for (const key of [...keys].sort()) {
      const before = currentValue[key];
      const after = draft.targetValue[key];
      if (before === undefined && after !== undefined) {
        diffs.push({ ...base, kind: 'add', path: [key], after });
      } else if (after === undefined && before !== undefined) {
        diffs.push({ ...base, kind: 'remove', path: [key], before });
      } else if (!Object.is(before, after)) {
        diffs.push({ ...base, kind: 'update', path: [key], before, after });
      }
    }
  } else {
    diffs.push({
      ...base,
      kind: 'update',
      path: [],
      ...(currentValue !== undefined ? { before: currentValue } : {}),
      after: draft.targetValue,
    });
  }
  return { ...draft, diffs };
}

/** 可读描述单条 Diff（UI/诊断展示；不用于机器相等判断）。 */
export function describeGovernanceDiff(diff: GovernanceDiff): string {
  const location = [diff.authorityId, diff.domainId, diff.nodeId].join('.');
  const pathText = diff.path.length > 0 ? `@ ${diff.path.join('.')}` : '(root)';
  switch (diff.kind) {
    case 'add':
      return `[${diff.draftId}] ${location} ${pathText}: add ${JSON.stringify(diff.after)}`;
    case 'remove':
      return `[${diff.draftId}] ${location} ${pathText}: remove ${JSON.stringify(diff.before)}`;
    case 'update':
      return `[${diff.draftId}] ${location} ${pathText}: ${JSON.stringify(diff.before)} → ${JSON.stringify(diff.after)}`;
  }
}

/**
 * 不可变地应用 Change 得到目标值（纯计算，无副作用）。
 *
 * - diff 为空 → 原值；
 * - 单条 root update → 返回 after；
 * - 多 key diff → 从 currentValue 克隆 record 后逐 key 应用
 *   （add/update 写 after；remove 删除 key）。
 */
export function applyGovernanceChange(change: GovernanceChange, currentValue: unknown): unknown {
  if (change.diffs.length === 0) return currentValue;
  if (change.diffs.length === 1 && change.diffs[0]?.path.length === 0) {
    return change.diffs[0]?.after;
  }
  if (!isPlainRecord(currentValue)) return change.targetValue;
  const result: Record<string, unknown> = { ...currentValue };
  for (const diff of change.diffs) {
    const key = diff.path[0];
    if (key === undefined) continue;
    if (diff.kind === 'remove') {
      delete result[String(key)];
    } else {
      result[String(key)] = diff.after;
    }
  }
  return result;
}
