import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HostRuntimeProvider, type Manifest } from "../contracts";
import { ConfirmActionTrigger } from "./index";

const manifest: Manifest = {
  catalogRevision: "r",
  navigationRevision: "n",
  routes: [],
  menu: [],
  zones: [],
  actionPermissions: [{ operationId: "iam.accounts.archive", access: "allowed" }],
};

function wrap(node: ReturnType<typeof createElement>) {
  return createElement(HostRuntimeProvider, { value: { manifest, completeAuthentication: async () => undefined, refreshManifest: async () => undefined, navigateToDefault: () => undefined }, children: node });
}

describe("083 ConfirmActionTrigger (PAGE-007)", () => {
  it("renders the action button when granted (dialog mounts client-side)", () => {
    const markup = renderToStaticMarkup(wrap(createElement(ConfirmActionTrigger, {
      operationId: "iam.accounts.archive",
      label: "归档",
      confirmTitle: "确认归档",
      confirmDescription: "归档后不可登录。",
      confirmLabel: "归档",
      cancelLabel: "取消",
      closeLabel: "关闭",
      onConfirm: async () => undefined,
    })));
    expect(markup).toContain("归档");
    // RAC Modal 客户端挂载：SSR 输出按钮，弹窗文案由浏览器交互呈现（与 ConfirmDialog 同边界）
  });

  it("hides the trigger when permission denied", () => {
    const deniedManifest: Manifest = { ...manifest, actionPermissions: [{ operationId: "iam.accounts.archive", access: "denied" }] };
    const markup = renderToStaticMarkup(createElement(HostRuntimeProvider, { value: { manifest: deniedManifest, completeAuthentication: async () => undefined, refreshManifest: async () => undefined, navigateToDefault: () => undefined }, children: createElement(ConfirmActionTrigger, {
      operationId: "iam.accounts.archive",
      label: "归档",
      confirmTitle: "确认归档",
      confirmLabel: "归档",
      cancelLabel: "取消",
      closeLabel: "关闭",
      onConfirm: async () => undefined,
    }) }));
    expect(markup).toBe("");
  });
});