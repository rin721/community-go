import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactElement } from "react";

// renderClient 在 jsdom 中以客户端方式渲染组件树（React 19 createRoot + act）。
// RAC Modal/Dialog 等 overlay 组件只在客户端挂载（SSR 输出为空，069 起相关单测统一走这里），
// 渲染结果通过 fragment 断言（RAC 使用 portal 挂到 body 附近的 fragment，非 host 内）。
export function renderClient(element: ReactElement): { unmount: () => void; host: HTMLDivElement } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  act(() => { root.render(element); });
  return {
    unmount: () => {
      act(() => { root.unmount(); });
      host.remove();
    },
    host,
  };
}