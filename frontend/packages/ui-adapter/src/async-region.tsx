import type { ReactNode } from 'react';

// AsyncRegion：Async Content Transition 语义容器（recipe: content.enter），
// 解决"数据就绪但内容突然出现"。职责边界（权威：docs/motion-foundation.md §5/§10）：
// - 只处理"数据是否 Ready"，不处理"是否进入视口"（ViewportReveal 未来职责）；
// - 只做内容进场（enter）主持；旧层退场的 exit 主持属于未来 Presence 原语；
// - 不暴露 duration/easing；动画参数全部来自 design-system 配方与 Policy。

export type AsyncRegionState = 'loading' | 'error' | 'empty' | 'ready';

export type AsyncRegionProps = Readonly<{
  state: AsyncRegionState;
  /** 容器 aria-label：整块异步区域的可访问名称（辅助技术可见）。 */
  label: string;
  /** ready 内容：始终渲染以保留结构；非 ready 时 hidden，ready 时播放 content.enter。 */
  children: ReactNode;
  /** loading 层：调用方组合 Skeleton 等。 */
  loading: ReactNode;
  /** error 层：调用方组合 StateSurface（含恢复动作）。 */
  error?: ReactNode;
  /** empty 层：调用方组合 StateSurface（含恢复动作）。 */
  empty?: ReactNode;
}>;

export function AsyncRegion({ state, label, children, loading, error, empty }: AsyncRegionProps) {
  return (
    <div
      className="ui-async-region"
      data-state={state}
      role="region"
      aria-label={label}
      aria-busy={state === 'loading' ? true : undefined}
    >
      {state === 'loading' ? loading : null}
      {state === 'error' && error !== undefined ? error : null}
      {state === 'empty' && empty !== undefined ? empty : null}
      <div className="ui-async-region-content" hidden={state !== 'ready'}>
        {children}
      </div>
    </div>
  );
}
