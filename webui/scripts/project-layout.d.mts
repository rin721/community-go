export interface ProjectLayout {
  repositoryRoot: string;
  manifestPath: string;
  layout: {
    schemaVersion: number;
    roots: { webui: string; modules: string; tools: string; release: string };
    webui: { moduleFacet: string; source: string; platformStyles: string; registryOutput: string; specOutput: string };
    generatedArtifacts: { openapi: string; operationInventory: string };
  };
}

export interface LayoutPaths {
  repositoryRoot: string;
  webuiRoot: string;
  modulesRoot: string;
  toolsRoot: string;
  releaseRoot: string;
  moduleFacet: string;
  webuiSourceRoot: string;
  platformStyles: string;
  registryOutput: string;
  specOutput: string;
  openapiOutput: string;
  operationInventoryOutput: string;
}

export function findRepositoryRoot(start?: string): string;
export function loadProjectLayout(repositoryRoot?: string): ProjectLayout;
export function resolveLayoutPaths(project?: ProjectLayout): LayoutPaths;
export function discoverWebUIModuleRoots(repositoryRoot?: string): Promise<Array<{ moduleID: string; root: string }>>;
export function loadWebUIDevConfig(environment?: Record<string, string | undefined>): {
  host: string;
  port: number;
  apiTarget: string;
  managementTarget: string;
};
export function layoutField(field: string, project?: ProjectLayout): string;
