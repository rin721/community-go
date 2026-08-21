import assert from "node:assert/strict";
import test from "node:test";
import { discoverWebUIModuleRoots, loadProjectLayout, loadWebUIDevConfig, resolveLayoutPaths } from "./project-layout.mjs";

test("layout resolves declared roots and module facet", async () => {
  const project = loadProjectLayout();
  const paths = resolveLayoutPaths(project);
  assert.equal(project.layout.webui.moduleFacet, "binding/webui/web");
  assert.ok(paths.webuiRoot.endsWith("community-go\\webui") || paths.webuiRoot.endsWith("community-go/webui"));
  const roots = await discoverWebUIModuleRoots(project.repositoryRoot);
  assert.deepEqual(roots.map(({ moduleID }) => moduleID), ["auth", "ops"]);
});

test("development config accepts overrides and rejects unsafe endpoints", () => {
  assert.deepEqual(loadWebUIDevConfig({
    WEBUI_DEV_HOST: "localhost",
    WEBUI_DEV_PORT: "5174",
    WEBUI_API_TARGET: "https://api.example.test",
    WEBUI_MANAGEMENT_TARGET: "http://management.example.test:9091",
  }), {
    host: "localhost",
    port: 5174,
    apiTarget: "https://api.example.test",
    managementTarget: "http://management.example.test:9091",
  });
  assert.throws(() => loadWebUIDevConfig({ WEBUI_DEV_PORT: "0" }));
  assert.throws(() => loadWebUIDevConfig({ WEBUI_API_TARGET: "http://user:pass@example.test" }));
});
