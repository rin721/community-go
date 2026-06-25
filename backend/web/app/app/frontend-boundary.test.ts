import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appRoot = dirname(fileURLToPath(import.meta.url));

const removedComponentPath = `components/${"ao" + "i"}`;
const removedComponentImportPath = `app/${removedComponentPath}`;
const removedPluginEndpoint = `/api/v1/${"plugins"}`;
const sourceExtensions = new Set([".ts", ".tsx"]);

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      return sourceFiles(path);
    }
    if ([...sourceExtensions].some((extension) => path.endsWith(extension))) {
      return [path];
    }
    return [];
  });
}

function rel(path: string) {
  return relative(appRoot, path).split(sep).join("/");
}

function productionSourceFiles() {
  return sourceFiles(appRoot).filter((file) => !/\.(test|spec)\.tsx?$/.test(file));
}

describe("frontend architecture boundaries", () => {
  it("keeps API path literals inside the endpoint registry", () => {
    const allowed = new Set(["lib/api/endpoints.ts"]);
    const offenders = productionSourceFiles()
      .filter((file) => !allowed.has(rel(file)))
      .filter((file) => readFileSync(file, "utf8").includes("/api/v1"))
      .map(rel);

    expect(offenders).toEqual([]);
  });

  it("keeps direct fetch usage inside the API client or documented streaming exception", () => {
    const allowed = new Set(["lib/api/client.ts", "routes/admin/traffic-hijack.tsx"]);
    const offenders = productionSourceFiles()
      .filter((file) => !allowed.has(rel(file)))
      .filter((file) => /\bfetch\s*\(/.test(readFileSync(file, "utf8")))
      .map(rel);

    expect(offenders).toEqual([]);
  });

  it("does not restore removed plugin or legacy component entry points", () => {
    const offenders = productionSourceFiles()
      .filter((file) => {
        const text = readFileSync(file, "utf8");
        return (
          text.includes(removedPluginEndpoint) ||
          text.includes(removedComponentImportPath) ||
          text.includes(removedComponentPath)
        );
      })
      .map(rel);

    expect(offenders).toEqual([]);
  });

  it("keeps console UI primitive layer independent from higher-level patterns", () => {
    const offenders = productionSourceFiles()
      .filter((file) => rel(file).startsWith("components/console/primitives/"))
      .filter((file) => /from\s+["'][^"']*\/patterns(\/|["'])/.test(readFileSync(file, "utf8")))
      .map(rel);

    expect(offenders).toEqual([]);
  });
});
