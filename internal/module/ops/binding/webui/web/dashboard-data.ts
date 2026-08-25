import type { CapabilityState } from "@webui/sdk/runtime";

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
  process?: ProcessSnapshotView;
  units?: UnitView[];
};

// ProcessSnapshotView projects the process-level server state (081, diagnostics.process).
export type ProcessSnapshotView = {
  allocBytes?: number;
  sysBytes?: number;
  heapAllocBytes?: number;
  numGoroutine?: number;
  numGC?: number;
  uptimeSeconds?: number;
};

// UnitView is a supervisor supervision unit summary (081, diagnostics.units).
export type UnitView = {
  owner: string;
  kind: string;
  state: string;
  phase: string;
  attempt?: number;
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

// readBuildSnapshot projects only fields returned by the management build response.
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

// readRuntimeSnapshot projects the sanitized typed diagnostics snapshot.
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
    process: readProcessSnapshot(source.process),
    units: readUnits(source.units),
  };
}

// readProcessSnapshot projects diagnostics.process (081).
export function readProcessSnapshot(value: unknown): ProcessSnapshotView | undefined {
  const source = record(value);
  if (!source) return undefined;
  return {
    allocBytes: numberValue(source.allocBytes),
    sysBytes: numberValue(source.sysBytes),
    heapAllocBytes: numberValue(source.heapAllocBytes),
    numGoroutine: numberValue(source.numGoroutine),
    numGC: numberValue(source.numGC),
    uptimeSeconds: numberValue(source.uptimeSeconds),
  };
}

// readUnits projects diagnostics.units (081).
export function readUnits(value: unknown): UnitView[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const units: UnitView[] = [];
  for (const item of value) {
    const entry = record(item);
    if (!entry) continue;
    const owner = stringValue(entry.owner);
    const state = stringValue(entry.state);
    if (!owner || !state) continue;
    units.push({ owner, kind: stringValue(entry.kind) ?? "unit", state, phase: stringValue(entry.phase) ?? "", attempt: numberValue(entry.attempt) });
  }
  return units.length === 0 ? undefined : units;
}

// SchedulerTaskView is a scheduler task summary (081, diagnostics.scheduler.tasks).
export type SchedulerTaskView = { id: string; state: string; runs: number; skipped: number; active: number; queued: number };

// readSchedulerTasks projects scheduler.tasks (081).
export function readSchedulerTasks(value: unknown): SchedulerTaskView[] | undefined {
  const source = record(value);
  const scheduler = record(source?.scheduler);
  const tasks = Array.isArray(scheduler?.tasks) ? (scheduler.tasks as unknown[]) : undefined;
  if (!tasks) return undefined;
  const views: SchedulerTaskView[] = [];
  for (const item of tasks) {
    const task = record(item);
    if (!task) continue;
    const id = stringValue(task.id);
    const state = stringValue(task.state);
    if (!id || !state) continue;
    views.push({ id, state, runs: numberValue(task.runs) ?? 0, skipped: numberValue(task.skipped) ?? 0, active: numberValue(task.active) ?? 0, queued: numberValue(task.queued) ?? 0 });
  }
  return views.length === 0 ? undefined : views;
}

// readSchedulerRuns sums the total scheduler task executions (081).
export function readSchedulerRuns(value: unknown): number | undefined {
  const tasks = readSchedulerTasks(value);
  if (!tasks) return undefined;
  return tasks.reduce((total, task) => total + task.runs, 0);
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