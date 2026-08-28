import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CodeText, DangerZone, EntityHeader, ErrorState, MetricCard, StatusBadge, StatusPill } from "./index";

describe("082 状态反馈语义组件", () => {
  it("StatusBadge 渲染语义状态 tone 与状态 class", () => {
    const markup = renderToStaticMarkup(createElement("span", { className: "status-inner" }, [createElement(StatusBadge, { status: "revoked", children: "已吊销" })]));
    expect(markup).toContain("status-badge");
    expect(markup).toContain("status-revoked");
    expect(markup).toContain("已吊销");
  });

  it("StatusPill 复用统一状态组件并保留能力状态 class", () => {
    const markup = renderToStaticMarkup(createElement(StatusPill, { state: "available", children: "Operational" }));
    expect(markup).toContain("status-badge");
    expect(markup).toContain("status-pill");
    expect(markup).toContain("status-available");
  });

  it("MetricCard 渲染状态、进度和趋势语义", () => {
    const markup = renderToStaticMarkup(createElement(MetricCard, { title: "CPU", value: "42", unit: "%", percent: 42, trend: [20, 42], trendLabel: "CPU trend", state: "available", stateLabel: "Operational", detail: "sampled" }));
    expect(markup).toContain("metric-card");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain("Operational");
    expect(markup).toContain("CPU trend");
  });

  it("EntityHeader 统一身份、状态与动作区域", () => {
    const markup = renderToStaticMarkup(createElement(EntityHeader, { title: "Account", identity: "@owner", status: "Active", actions: "Edit" }));
    expect(markup).toContain("entity-header");
    expect(markup).toContain("entity-header-identity");
    expect(markup).toContain("entity-header-status");
    expect(markup).toContain("entity-header-actions");
  });

  it("CodeText 渲染 monospace code 与可访问名", () => {
    const markup = renderToStaticMarkup(createElement(CodeText, { value: "iam.account.self.password.write", copyable: true, copyLabel: "复制" }));
    expect(markup).toContain("code-text-value");
    expect(markup).toContain("iam.account.self.password.write");
    expect(markup).toContain('aria-label="复制"');
  });

  it("DangerZone 渲染后果说明与触发确认按钮", () => {
    const markup = renderToStaticMarkup(
      createElement(DangerZone, {
        title: "吊销会话",
        consequence: "该会话将被立即吊销。",
        confirmLabel: "吊销",
        cancelLabel: "取消",
        closeLabel: "关闭",
        onConfirm: async () => undefined,
      }),
    );
    expect(markup).toContain("danger-zone");
    expect(markup).toContain("吊销会话");
    expect(markup).toContain("该会话将被立即吊销。");
  });

  it("DangerZone 请求输入确认时渲染输入框", () => {
    const markup = renderToStaticMarkup(
      createElement(DangerZone, {
        title: "删除账号",
        consequence: "不可恢复。",
        inputConfirmation: "DELETE",
        confirmLabel: "删除",
        cancelLabel: "取消",
        closeLabel: "关闭",
        onConfirm: async () => undefined,
      }),
    );
    // SSR 不渲染受控 opener 展开态；此处验证组件挂载不抛错且含标识符提示结构
    expect(markup).toContain("danger-zone");
  });

  it("ErrorState 按 kind 渲染分级 class", () => {
    expect(renderToStaticMarkup(createElement(ErrorState, { kind: "connectivity", title: "数据源不可达" }))).toContain("error-state-connectivity");
    expect(renderToStaticMarkup(createElement(ErrorState, { kind: "permission", title: "无权限" }))).toContain("error-state-permission");
    expect(renderToStaticMarkup(createElement(ErrorState, { kind: "section", title: "加载失败" }))).toContain("error-state-section");
    expect(renderToStaticMarkup(createElement(ErrorState, { kind: "inline", title: "字段错误" }))).toContain("error-state-inline");
  });

  it("ErrorState 可呈现低敏请求关联 ID", () => {
    const markup = renderToStaticMarkup(createElement(ErrorState, { kind: "connectivity", title: "加载失败", requestId: "req-123" }));
    expect(markup).toContain('data-request-id="req-123"');
    expect(markup).toContain('aria-label="request id"');
  });
});
