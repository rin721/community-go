import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HostRuntimeProvider, type Manifest } from "../contracts";
import { ActionTrigger, BulkActionBar, FormSubmitActions } from "./index";

function manifestWithAction(operationId: string, access: "allowed" | "authentication-required" | "denied"): Manifest {
  return {
    catalogRevision: "test-catalog",
    navigationRevision: "test-navigation",
    routes: [],
    menu: [],
    zones: [],
    actionPermissions: [{ operationId, access }],
  };
}

function wrap(manifest: Manifest, node: ReturnType<typeof createElement>) {
  return createElement(HostRuntimeProvider, { value: { manifest, completeAuthentication: async () => undefined, refreshManifest: async () => undefined, navigateToDefault: () => undefined }, children: node });
}

describe("ActionTrigger 交互状态链", () => {
  it("operationId 命中 denied 时默认隐藏触发器", () => {
    const manifest = manifestWithAction("ops.delete", "denied");
    const markup = renderToStaticMarkup(wrap(manifest, createElement(ActionTrigger, { operationId: "ops.delete", onAction: () => undefined }, "删除")));
    expect(markup).toBe("");
  });

  it("deniedBehavior=disabled 时渲染禁用触发器并保留可访问名称", () => {
    const manifest = manifestWithAction("ops.delete", "denied");
    const markup = renderToStaticMarkup(wrap(manifest, createElement(ActionTrigger, { operationId: "ops.delete", deniedBehavior: "disabled", onAction: () => undefined }, "删除")));
    expect(markup).toContain("删除");
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-disabled="true"');
  });

  it("pending 时显示 pendingLabel、aria-busy 且禁用防重复提交", () => {
    const manifest = manifestWithAction("ops.save", "allowed");
    const markup = renderToStaticMarkup(wrap(manifest, createElement(ActionTrigger, { operationId: "ops.save", pending: true, pendingLabel: "提交中…", onAction: () => undefined }, "保存")));
    expect(markup).toContain("提交中…");
    expect(markup).not.toContain(">保存<");
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('data-action-state="pending"');
  });

  it("disabledReason 分类写入 data-action-state 且按钮禁用", () => {
    const manifest = manifestWithAction("ops.save", "allowed");
    const markup = renderToStaticMarkup(wrap(manifest, createElement(ActionTrigger, { operationId: "ops.save", disabledReason: "unavailable", onAction: () => undefined }, "保存")));
    expect(markup).toContain('data-action-state="disabled-unavailable"');
    expect(markup).toContain('disabled=""');
  });

  it("allowed 且无外部禁用时按可用触发渲染", () => {
    const manifest = manifestWithAction("ops.export", "allowed");
    const markup = renderToStaticMarkup(wrap(manifest, createElement(ActionTrigger, { operationId: "ops.export", onAction: () => undefined }, "导出")));
    expect(markup).toContain("导出");
    expect(markup).not.toContain('disabled=""');
    expect(markup).not.toContain('data-action-state=');
  });

  it("未声明 operationId 时不做权限呈现限制", () => {
    const manifest = manifestWithAction("ops.other", "denied");
    const markup = renderToStaticMarkup(wrap(manifest, createElement(ActionTrigger, { onAction: () => undefined }, "通用")));
    expect(markup).toContain("通用");
  });
});

describe("BulkActionBar 批量操作条", () => {
  it("open=false 时不渲染", () => {
    const markup = renderToStaticMarkup(createElement(BulkActionBar, { open: false, selectionLabel: "已选 0 项", actionLabel: "批量删除", clearLabel: "清除", confirmTitle: "确认批量删除", confirmLabel: "确认", cancelLabel: "取消", closeLabel: "关闭", onConfirm: async () => undefined, onClear: () => undefined }));
    expect(markup).toBe("");
  });

  it("open=true 时渲染计数、清除与动作，并带确认弹窗", () => {
    const markup = renderToStaticMarkup(createElement(BulkActionBar, { open: true, selectionLabel: "已选 3 项", actionLabel: "批量删除", clearLabel: "清除", confirmTitle: "确认批量删除", confirmLabel: "确认", cancelLabel: "取消", closeLabel: "关闭", onConfirm: async () => undefined, onClear: () => undefined }));
    expect(markup).toContain("已选 3 项");
    expect(markup).toContain("批量删除");
    expect(markup).toContain("清除");
    expect(markup).toContain('role="toolbar"');
    // 确认弹窗存在但处于关闭态（aria-hidden + inert，不进入可访问树）。
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-hidden="true"');
  });
});

describe("FormSubmitActions 表单行为契约", () => {
  it("渲染提交与重置，提交 pending 时显示 pendingLabel", () => {
    const markup = renderToStaticMarkup(createElement(FormSubmitActions, { submitLabel: "保存", resetLabel: "重置", submitPending: true, submitPendingLabel: "保存中…", onSubmit: () => undefined, onReset: () => undefined }));
    expect(markup).toContain("重置");
    expect(markup).toContain("保存中…");
    expect(markup).toContain('data-action-state="pending"');
  });

  it("resetDisabled 与 submitDisabled 分别禁用对应动作", () => {
    const markup = renderToStaticMarkup(createElement(FormSubmitActions, { submitLabel: "保存", resetLabel: "重置", resetDisabled: true, submitDisabled: true, submitDisabledReason: "invalid", onSubmit: () => undefined, onReset: () => undefined }));
    expect(markup).toContain('data-action-state="disabled-invalid"');
    expect(markup).toMatch(/disabled=""/g);
  });
});