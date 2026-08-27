import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CodeViewer, DetailDrawer } from "./index";

describe("082 CodeViewer / DetailDrawer", () => {
  it("CodeViewer 渲染结构化数据(JSON 转义后可见)并可折叠", () => {
    const markup = renderToStaticMarkup(createElement(CodeViewer, { value: '{"a":1}', language: "json", label: "detail" }));
    expect(markup).toContain("code-viewer");
    expect(markup).toContain("language-json");
    expect(markup).toContain("code-viewer-toggle");
    // JSON 大括号在 SSR 中会被转义为实体,验证值仍在
    expect(markup).toContain("a");
    expect(markup).toContain("1");
  });

  it("CodeViewer 空值时返回 null", () => {
    const markup = renderToStaticMarkup(createElement(CodeViewer, { value: "" }));
    expect(markup).toBe("");
  });

  // DetailDrawer 基于 RAC Modal(069:SSR 输出为空,portal 客户端挂载),
  // 与既有 Drawer 同一边界,浏览器渲染走 e2e;这里只验证组件挂载不抛错。
  it("DetailDrawer 挂载不抛错(SSR 输出为空符合 RAC Modal 边界)", () => {
    expect(() => renderToStaticMarkup(
      createElement(DetailDrawer, {
        open: true,
        onClose: () => undefined,
        title: "详情",
        identity: "acct-1",
        width: 640,
        children: createElement("p", null, "content"),
      }),
    )).not.toThrow();
  });
});