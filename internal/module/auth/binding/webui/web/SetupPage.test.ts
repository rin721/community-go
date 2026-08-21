import { describe, expect, it } from "vitest";
import { setupErrorMessageID } from "./SetupPage";

describe("setupErrorMessageID", () => {
  it("maps stable backend codes to module-owned message IDs", () => {
    expect(setupErrorMessageID(new Error("username_invalid"))).toBe("webui.auth.setup.errors.usernameInvalid");
    expect(setupErrorMessageID(new Error("password_length_invalid"))).toBe("webui.auth.setup.errors.passwordLengthInvalid");
  });

  it("does not expose an unknown backend error or its text", () => {
    expect(setupErrorMessageID(new Error("database connection details"))).toBe("webui.auth.setup.errors.unknown");
  });
});
