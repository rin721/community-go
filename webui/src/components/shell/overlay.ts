import { useEffect, useState } from "react";

// OverlayPhase 是公共 overlay 的四态机：closed -> entering -> open -> exiting -> closed。
// 实现基于 mounted + phase state；phase 超时由承载方从项目 motion token 换算传入，
// 不允许组件内散落数字。
export type OverlayPhase = "closed" | "entering" | "open" | "exiting";

export type OverlayCloseReason = "dismiss" | "escape" | "action";

type OverlayState = { mounted: boolean; phase: OverlayPhase };

// overlayReduce 是 overlay 状态机的纯推进函数，供 hook 与测试共用：
// - 传入 open=false 时进入 exiting（已 closed 则保持）；exiting 超时后卸载并回到 closed；
// - 传入 open=true 时挂载并进入 entering（已挂载且非 exiting 则保持当前 open 等值）。
export function overlayReduce(state: OverlayState, open: boolean): OverlayState {
  if (open) {
    if (!state.mounted) return { mounted: true, phase: "entering" };
    if (state.phase === "exiting" || state.phase === "closed") return { mounted: true, phase: "entering" };
    return state;
  }
  if (!state.mounted || state.phase === "closed") return { mounted: false, phase: "closed" };
  if (state.phase === "exiting") return state;
  return { mounted: true, phase: "exiting" };
}

// useOverlayOpenPhase 管理 mounted/open 之后的进入/退出阶段。
// - open=true：挂载并先进入 entering，下一动画帧转 open；
// - open=false：进入 exiting，超时（timeoutMs）后卸载并回到 closed；
// - 返回的 mounted/phase 供组件保留 exiting DOM 并统一 phase class；
// - 阶段推进不依赖组件重渲染事件，避免无限等待 transition event。
export function useOverlayOpenPhase(open: boolean, timeoutMs: number): { phase: OverlayPhase; mounted: boolean } {
  const [state, setState] = useState<OverlayState>(() => ({ mounted: open, phase: open ? "open" : "closed" }));

  useEffect(() => {
    setState((current) => overlayReduce(current, open));
  }, [open]);

  useEffect(() => {
    if (state.phase === "entering") {
      const frame = requestAnimationFrame(() => setState((current) => current.phase === "entering" ? { mounted: true, phase: "open" } : current));
      return () => cancelAnimationFrame(frame);
    }
    if (state.phase === "exiting") {
      const timer = window.setTimeout(() => setState((current) => current.phase === "exiting" ? { mounted: false, phase: "closed" } : current), timeoutMs);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [state.phase, timeoutMs]);

  return { phase: state.phase, mounted: state.mounted };
}