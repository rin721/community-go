import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HostRuntimeProvider, type Manifest } from "../../contracts";
import { useActionAccess, useZoneContributions, ZoneRendererContext, ZoneSlot, type ManifestZone, type ZoneRenderer } from "./index";

function manifestWith(zones: ManifestZone[], actionPermissions: Array<{ operationId: string; access: "allowed" | "authentication-required" | "denied" }>): Manifest {
  return {
    catalogRevision: "test-catalog",
    navigationRevision: "test-navigation",
    routes: [],
    menu: [],
    zones,
    actionPermissions,
  };
}

function Probe({ zone }: { zone: "header-actions" }) {
  const items = useZoneContributions(zone);
  return <output data-test-zone-count={String(items.length)} data-test-zone-ids={items.map((item) => item.id).join(",")} />;
}

function AccessProbe({ operationId }: { operationId: string }) {
  const access = useActionAccess(operationId) ?? "undefined";
  return <output data-test-access={access} />;
}

describe("webui SDK zone 契约", () => {
  it("useZoneContributions 只返回指定分区的已授权注入点", () => {
    const zones: ManifestZone[] = [
      { moduleId: "ops", zone: "header-actions", id: "ops.global", entryId: "ops.header", titleMessageId: "webui.ops.header.title", iconId: "settings", order: 10, access: "allowed" },
      { moduleId: "ops", zone: "footer-status", id: "ops.status", entryId: "ops.header", titleMessageId: "webui.ops.status.title", kind: "status", order: 1, access: "allowed" },
    ];
    const runtime = { manifest: manifestWith(zones, []), completeAuthentication: async () => undefined, refreshManifest: async () => undefined, navigateToDefault: () => undefined };
    const markup = renderToStaticMarkup(createElement(HostRuntimeProvider, { value: runtime, children: createElement(Probe, { zone: "header-actions" }) }));
    expect(markup).toContain('data-test-zone-count="1"');
    expect(markup).toContain('data-test-zone-ids="ops.global"');
  });

  it("useZoneContributions 在无 Provider 或缺失 zones 时返回空数组而非崩溃", () => {
    const markup = renderToStaticMarkup(createElement(Probe, { zone: "header-actions" }));
    expect(markup).toContain('data-test-zone-count="0"');
  });

  it("useActionAccess 按 manifest 投影返回动作 access；未声明返回 undefined", () => {
    const runtime = {
      manifest: manifestWith([], [{ operationId: "ops.denied", access: "denied" }, { operationId: "ops.allowed", access: "allowed" }]),
      completeAuthentication: async () => undefined,
      refreshManifest: async () => undefined,
      navigateToDefault: () => undefined,
    };
    const denied = renderToStaticMarkup(createElement(HostRuntimeProvider, { value: runtime, children: createElement(AccessProbe, { operationId: "ops.denied" }) }));
    expect(denied).toContain('data-test-access="denied"');
    const allowed = renderToStaticMarkup(createElement(HostRuntimeProvider, { value: runtime, children: createElement(AccessProbe, { operationId: "ops.allowed" }) }));
    expect(allowed).toContain('data-test-access="allowed"');
    const missing = renderToStaticMarkup(createElement(HostRuntimeProvider, { value: runtime, children: createElement(AccessProbe, { operationId: "ops.unknown" }) }));
    expect(missing).toContain('data-test-access="undefined"');
  });

  it("ZoneSlot 无宿主渲染器时渲染为空，有渲染器时调用宿主注入的渲染函数", () => {
    const contribution: ManifestZone = { moduleId: "ops", zone: "header-actions", id: "ops.global", entryId: "ops.header", titleMessageId: "webui.ops.header.title", iconId: "settings", order: 10, access: "allowed" };
    const empty = renderToStaticMarkup(createElement(ZoneSlot, { contribution }));
    expect(empty).toBe("");
    const renderer: ZoneRenderer = (item) => createElement("span", { "data-test-rendered": item.id });
    const rendered = renderToStaticMarkup(createElement(ZoneRendererContext.Provider, { value: renderer }, createElement(ZoneSlot, { contribution })));
    expect(rendered).toContain('data-test-rendered="ops.global"');
  });
});