import type { CapabilityState } from "@webui/contracts";

export type BuildSnapshot = {
  version?: string;
  commit?: string;
  buildTime?: string;
  goVersion?: string;
  dirty?: boolean;
};

export type RuntimeSnapshot = {
  processState?: string;
  generationState?: string;
  generation?: number;
  phase?: string;
  activeRequests?: number;
  activeConnections?: number;
  authReady?: boolean;
  databaseReady?: boolean;
  cleanupRequired?: boolean;
  schedulerHealth?: string;
  messagingHealth?: string;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** readBuildSnapshot projects only fields returned by the management build response. */
export function readBuildSnapshot(value: unknown): BuildSnapshot | undefined {
  const source = record(value);
  if (!source) return undefined;
  return {
    version: stringValue(source.version),
    commit: stringValue(source.commit),
    buildTime: stringValue(source.buildTime),
    goVersion: stringValue(source.goVersion),
    dirty: booleanValue(source.dirty),
  };
}

/** readRuntimeSnapshot projects the sanitized typed diagnostics snapshot. */
export function readRuntimeSnapshot(value: unknown): RuntimeSnapshot | undefined {
  const source = record(value);
  if (!source) return undefined;
  return {
    processState: stringValue(source.processState),
    generationState: stringValue(source.generationState),
    generation: numberValue(source.generation),
    phase: stringValue(source.phase),
    activeRequests: numberValue(source.activeRequests),
    activeConnections: numberValue(source.activeConnections),
    authReady: booleanValue(source.authReady),
    databaseReady: booleanValue(source.databaseReady),
    cleanupRequired: booleanValue(source.cleanupRequired),
    schedulerHealth: stringValue(source.schedulerHealth),
    messagingHealth: stringValue(source.messagingHealth),
  };
}

export function booleanCapabilityState(value: boolean | undefined): CapabilityState {
  if (value === true) return "available";
  if (value === false) return "degraded";
  return "unavailable";
}

export function healthCapabilityState(value: string | undefined): CapabilityState {
  if (!value) return "unavailable";
  return ["ok", "pass", "ready", "healthy", "running"].includes(value.toLowerCase()) ? "available" : "degraded";
}
