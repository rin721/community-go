import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, FormField, fieldWidthClass } from "./index";

describe("082 FormField 规格化", () => {
  it("Field 支持 description 与 optional 标记（结构性扩展,兼容既有调用）", () => {
    const markup = renderToStaticMarkup(
      createElement(Field, { label: "用户名", value: "alice", description: "登录账号", optional: true, onChange: () => undefined }),
    );
    expect(markup).toContain("用户名");
    expect(markup).toContain("（可选）");
    expect(markup).toContain("登录账号");
  });

  it("Field 无新 props 时保持既有渲染（hint/error 路径）", () => {
    const markup = renderToStaticMarkup(
      createElement(Field, { label: "密码", hint: "至少 8 位", error: "太短", value: "x", onChange: () => undefined }),
    );
    expect(markup).toContain("密码");
    expect(markup).toContain("至少 8 位");
    expect(markup).toContain("太短");
    expect(markup).toContain("has-error");
  });

  it("FormField 渲染 Label+control+description+helper+error 统一结构", () => {
    const markup = renderToStaticMarkup(
      createElement(FormField, {
        label: "角色",
        control: createElement("input", { type: "text", value: "admin", onChange: () => undefined, readOnly: true }),
        description: "分配给该账号的角色",
        helper: "可多选",
        error: "必填",
      }),
    );
    expect(markup).toContain("form-field-label");
    expect(markup).toContain("form-field-description");
    expect(markup).toContain("form-field-helper");
    expect(markup).toContain("form-field-error");
    expect(markup).toContain("has-error");
  });

  it("fieldWidthClass 输出宽度档 class", () => {
    expect(fieldWidthClass("sm")).toBe("field-width-sm");
    expect(fieldWidthClass("md")).toBe("field-width-md");
    expect(fieldWidthClass("lg")).toBe("field-width-lg");
    expect(fieldWidthClass("auto")).toBe("");
  });
});