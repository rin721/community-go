import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@webui/sdk/runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@webui/sdk/runtime")>();
  return { ...actual, readWebUIDataSource: () => "mock" as const };
});
vi.mock("../../i18n", () => ({ translateMessage: (id: string) => id }));

import { MockBadge } from "./MockBadge";

describe("MockBadge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the bilingual mock badge in mock mode", () => {
    const markup = renderToStaticMarkup(createElement(MockBadge));
    expect(markup).toContain('class="mock-badge"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("webui.host.mock.badge");
    expect(markup).toContain('title="webui.host.mock.detail"');
  });
});