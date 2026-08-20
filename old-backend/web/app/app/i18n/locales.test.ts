import { describe, expect, it } from "vitest";

import { normalizeLocale } from "./locales";
import { resources } from "./resources";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("i18n locales", () => {
  it("keeps zh-CN and en-US resource keys aligned", () => {
    expect(flattenKeys(resources["en-US"]).sort()).toEqual(flattenKeys(resources["zh-CN"]).sort());
  });

  it("normalizes browser language values", () => {
    expect(normalizeLocale("en")).toBe("en-US");
    expect(normalizeLocale("en-US")).toBe("en-US");
    expect(normalizeLocale("zh-Hans-CN")).toBe("zh-CN");
    expect(normalizeLocale("fr-FR")).toBe("zh-CN");
  });
});
