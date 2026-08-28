import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntityDetail, PageFrame, PageSection, ResourceIndex, StickyActionBar } from "./index";

describe("090 页面骨架与后台模式", () => {
  it("PageFrame 将场景变体落到稳定语义 class", () => {
    const markup = renderToStaticMarkup(<PageFrame variant="detail" data-testid="detail-frame">detail</PageFrame>);
    expect(markup).toContain("page-frame page-frame-detail module-page");
    expect(markup).toContain('data-page-frame="detail"');
  });

  it("PageSection 提供统一 header/content/footer anatomy", () => {
    const markup = renderToStaticMarkup(<PageSection kicker="Users" title="Account list" description="Directory" footer="Pagination">table</PageSection>);
    expect(markup).toContain("page-section-header");
    expect(markup).toContain("page-section-content");
    expect(markup).toContain("page-section-footer");
    expect(markup).toContain("Account list");
  });

  it("ResourceIndex/EntityDetail/StickyActionBar 固定后台流程顺序", () => {
    const resource = renderToStaticMarkup(<ResourceIndex summary="8 accounts" toolbar="filters" footer="page 1">table</ResourceIndex>);
    expect(resource.indexOf("resource-index-summary")).toBeLessThan(resource.indexOf("resource-index-toolbar"));
    expect(resource.indexOf("resource-index-toolbar")).toBeLessThan(resource.indexOf("resource-index-content"));
    expect(resource).toContain("resource-index-footer");

    const detail = renderToStaticMarkup(<EntityDetail header="identity"><PageSection title="Access">roles</PageSection></EntityDetail>);
    expect(detail).toContain("entity-detail-header");
    expect(detail).toContain("entity-detail-content");

    const actions = renderToStaticMarkup(<StickyActionBar>Save</StickyActionBar>);
    expect(actions).toContain("sticky-action-bar");
  });
});
