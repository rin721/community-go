import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const manifestRelativePath = ".scaffold/layout.json";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultWebUIRoot = dirname(scriptDirectory);

function fail(message) {
  throw new Error(`project layout: ${message}`);
}

function cleanRelativePath(field, value) {
  if (typeof value !== "string" || value.trim() === "" || value.includes("\\") || isAbsolute(value) || value.startsWith("//")) {
    fail(`${field} must be a non-empty repository-relative path using '/'`);
  }
  const parts = value.trim().split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    fail(`${field} contains an invalid path segment`);
  }
  return parts.join("/");
}

function isWithin(pathValue, rootValue) {
  return pathValue === rootValue || pathValue.startsWith(`${rootValue}/`);
}

function rejectUnknownFields(value, allowed, scope) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${scope} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${scope}.${key} is unknown`);
}

function validateLayout(repositoryRoot, layout) {
  rejectUnknownFields(layout, ["schemaVersion", "roots", "webui", "generatedArtifacts"], "layout");
  rejectUnknownFields(layout.roots, ["webui", "modules", "tools", "release"], "layout.roots");
  rejectUnknownFields(layout.webui, ["moduleFacet", "source", "platformStyles", "registryOutput"], "layout.webui");
  rejectUnknownFields(layout.generatedArtifacts, ["openapi", "operationInventory"], "layout.generatedArtifacts");
  if (!layout || layout.schemaVersion !== 1) fail("schemaVersion 1 is required");
  const fields = {
    "roots.webui": layout.roots?.webui,
    "roots.modules": layout.roots?.modules,
    "roots.tools": layout.roots?.tools,
    "roots.release": layout.roots?.release,
    "webui.moduleFacet": layout.webui?.moduleFacet,
    "webui.source": layout.webui?.source,
    "webui.platformStyles": layout.webui?.platformStyles,
    "webui.registryOutput": layout.webui?.registryOutput,
    "generatedArtifacts.openapi": layout.generatedArtifacts?.openapi,
    "generatedArtifacts.operationInventory": layout.generatedArtifacts?.operationInventory,
  };
  const cleaned = Object.fromEntries(Object.entries(fields).map(([field, value]) => [field, cleanRelativePath(field, value)]));
  const roots = [cleaned["roots.webui"], cleaned["roots.modules"], cleaned["roots.tools"], cleaned["roots.release"]];
  for (let index = 0; index < roots.length; index += 1) {
    for (let other = index + 1; other < roots.length; other += 1) {
      if (isWithin(roots[index], roots[other]) || isWithin(roots[other], roots[index])) fail("repository roots overlap");
    }
  }
  if (!isWithin(cleaned["webui.source"], cleaned["roots.webui"]) ||
      !isWithin(cleaned["webui.platformStyles"], cleaned["roots.webui"]) ||
      !isWithin(cleaned["webui.registryOutput"], cleaned["roots.webui"])) {
    fail("WebUI paths must stay under roots.webui");
  }
  for (const [field, value] of [["roots.webui", cleaned["roots.webui"]], ["roots.modules", cleaned["roots.modules"]]]) {
    const pathValue = join(repositoryRoot, value);
    if (!existsSync(pathValue) || !statSync(pathValue).isDirectory()) fail(`${field} is not a directory: ${value}`);
  }
  return layout;
}

export function findRepositoryRoot(start = defaultWebUIRoot) {
  let candidate = resolve(start);
  try {
    if (existsSync(candidate) && !statSync(candidate).isDirectory()) candidate = dirname(candidate);
  } catch {
    candidate = dirname(candidate);
  }
  while (true) {
    const manifestPath = join(candidate, manifestRelativePath);
    if (existsSync(manifestPath)) return candidate;
    const parent = dirname(candidate);
    if (parent === candidate) fail(`${manifestRelativePath} was not found from ${start}`);
    candidate = parent;
  }
}

export function loadProjectLayout(repositoryRoot = findRepositoryRoot()) {
  const root = resolve(repositoryRoot);
  const manifestPath = join(root, manifestRelativePath);
  let layout;
  try {
    layout = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail(`cannot read ${manifestPath}: ${error.message}`);
  }
  validateLayout(root, layout);
  return { repositoryRoot: root, manifestPath, layout };
}

export function resolveLayoutPaths(project = loadProjectLayout()) {
  const { repositoryRoot, layout } = project;
  const fromRoot = (pathValue) => join(repositoryRoot, pathValue);
  return {
    repositoryRoot,
    webuiRoot: fromRoot(layout.roots.webui),
    modulesRoot: fromRoot(layout.roots.modules),
    toolsRoot: fromRoot(layout.roots.tools),
    releaseRoot: fromRoot(layout.roots.release),
    moduleFacet: layout.webui.moduleFacet,
    webuiSourceRoot: fromRoot(layout.webui.source),
    platformStyles: fromRoot(layout.webui.platformStyles),
    registryOutput: fromRoot(layout.webui.registryOutput),
    openapiOutput: fromRoot(layout.generatedArtifacts.openapi),
    operationInventoryOutput: fromRoot(layout.generatedArtifacts.operationInventory),
  };
}

export async function discoverWebUIModuleRoots(repositoryRoot = findRepositoryRoot()) {
  const { modulesRoot, moduleFacet } = resolveLayoutPaths(loadProjectLayout(repositoryRoot));
  const { readdir, stat } = await import("node:fs/promises");
  const entries = await readdir(modulesRoot, { withFileTypes: true });
  const roots = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const root = join(modulesRoot, entry.name, moduleFacet);
    try {
      if ((await stat(root)).isDirectory()) roots.push({ moduleID: entry.name, root });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return roots;
}

function parsePort(value, field) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail(`${field} must be an integer TCP port`);
  return port;
}

function parseTarget(value, field) {
  let target;
  try { target = new URL(value); } catch { fail(`${field} must be an absolute HTTP(S) URL`); }
  if (!target || !["http:", "https:"].includes(target.protocol) || target.username || target.password || target.search || target.hash) {
    fail(`${field} must be an absolute HTTP(S) URL without credentials/query/fragment`);
  }
  return target.toString().replace(/\/$/, "");
}

export function loadWebUIDevConfig(environment = process.env) {
  return {
    host: environment.WEBUI_DEV_HOST?.trim() || "127.0.0.1",
    port: parsePort(environment.WEBUI_DEV_PORT?.trim() || "5173", "WEBUI_DEV_PORT"),
    apiTarget: parseTarget(environment.WEBUI_API_TARGET?.trim() || "http://127.0.0.1:8080", "WEBUI_API_TARGET"),
    managementTarget: parseTarget(environment.WEBUI_MANAGEMENT_TARGET?.trim() || "http://127.0.0.1:9090", "WEBUI_MANAGEMENT_TARGET"),
  };
}

export function layoutField(field, project = loadProjectLayout()) {
  const paths = resolveLayoutPaths(project);
  if (!(field in paths)) fail(`unknown field ${field}`);
  return paths[field];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const field = process.argv[2] === "--field" ? process.argv[3] : "repositoryRoot";
    process.stdout.write(`${layoutField(field)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
