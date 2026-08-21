import { describe, expect, it } from "vitest";
import { loginErrorMessageID } from "./LoginPage";

describe("loginErrorMessageID", () => {
  it("maps backend codes to locale message IDs", () => {
    expect(loginErrorMessageID(new Error("invalid_credentials"))).toBe("webui.auth.login.errors.invalidCredentials");
    expect(loginErrorMessageID(new Error("invalid_request"))).toBe("webui.auth.login.errors.invalidRequest");
  });

  it("hides unknown backend error text", () => {
    expect(loginErrorMessageID(new Error("internal database details"))).toBe("webui.auth.login.errors.unknown");
  });
});
