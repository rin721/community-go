import assert from "node:assert/strict";
import test from "node:test";
import { discoverWebUIModuleRoots, loadProjectLayout, loadWebUIDevConfig, resolveLayoutPaths } from "./project-layout.mjs";

test("layout resolves declared roots and module facet", async () => {
  const project = loadProjectLayout();
  const paths = resolveLayoutPaths(project);
  assert.equal(project.layout.webui.moduleFacet, "binding/webui/web");
  assert.ok(paths.webuiRoot.endsWith("community-go\\webui") || paths.webuiRoot.endsWith("community-go/webui"));
  assert.ok(paths.specOutput.endsWith("openapi-spec.ts"));
  const roots = await discoverWebUIModuleRoots(project.repositoryRoot);
  assert.deepEqual(roots.map(({ moduleID }) => moduleID), ["auth", "iam", "navigation", "openapi", "ops", "organization", "settings"]);
});

test("development config accepts overrides and rejects unsafe endpoints", () => {
  assert.deepEqual(loadWebUIDevConfig({
    WEBUI_DEV_HOST: "localhost",
    WEBUI_DEV_PORT: "5174",
    WEBUI_API_TARGET: "https://api.example.test",
    WEBUI_MANAGEMENT_TARGET: "http://management.example.test:9091",
    VITE_WEBUI_DATA_SOURCE: "separated",
  }), {
    host: "localhost",
    port: 5174,
    apiTarget: "https://api.example.test",
    managementTarget: "http://management.example.test:9091",
    dataSource: "separated",
  });
  assert.equal(loadWebUIDevConfig({}).dataSource, "server-hosted");
  assert.equal(loadWebUIDevConfig({ VITE_WEBUI_DATA_SOURCE: "mock" }).dataSource, "mock");
  assert.throws(() => loadWebUIDevConfig({ VITE_WEBUI_DATA_SOURCE: "offline" }));
  assert.throws(() => loadWebUIDevConfig({ WEBUI_DEV_PORT: "0" }));
  assert.throws(() => loadWebUIDevConfig({ WEBUI_API_TARGET: "http://user:pass@example.test" }));
});
