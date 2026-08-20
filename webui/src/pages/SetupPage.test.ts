import { describe, expect, it } from "vitest";
import { setupErrorMessage } from "./SetupPage";

describe("setupErrorMessage", () => {
  it("translates stable validation codes", () => {
    expect(setupErrorMessage(new Error("username_invalid"))).toBe("用户名不能为空且不能超过 128 个字符。");
    expect(setupErrorMessage(new Error("password_length_invalid"))).toBe("密码长度必须为 15 至 128 个字符。");
  });

  it("does not expose an unknown backend error", () => {
    expect(setupErrorMessage(new Error("database connection details"))).toBe("首次设置失败，请稍后重试。");
  });
});
