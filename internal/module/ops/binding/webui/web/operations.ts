import { loadBuild, loadDiagnostics, loadLiveness, loadMetrics, loadReadiness, loadStartup } from "./api";
import type { CapabilityState } from "@webui/contracts";

export type OpsOperation = {
  name: string;
  titleMessageID: string;
  query: () => Promise<unknown>;
  required: boolean;
};

export const opsOperations: ReadonlyArray<OpsOperation> = [
  { name: "build", titleMessageID: "webui.ops.dashboard.operation.build", query: loadBuild, required: true },
  { name: "startupz", titleMessageID: "webui.ops.dashboard.operation.startupz", query: loadStartup, required: true },
  { name: "livez", titleMessageID: "webui.ops.dashboard.operation.livez", query: loadLiveness, required: true },
  { name: "readyz", titleMessageID: "webui.ops.dashboard.operation.readyz", query: loadReadiness, required: true },
  { name: "diagnostics", titleMessageID: "webui.ops.dashboard.operation.diagnostics", query: loadDiagnostics, required: false },
  { name: "metrics", titleMessageID: "webui.ops.dashboard.operation.metrics", query: loadMetrics, required: false },
];

export function operationCapabilityState(required: boolean, pending: boolean, failed: boolean): CapabilityState {
  if (pending) return "unavailable";
  if (!failed) return "available";
  return required ? "unavailable" : "degraded";
}

export function refreshNoticeTone(failedCount: number): "success" | "danger" {
  return failedCount === 0 ? "success" : "danger";
}

export function filterOperationNames(operation: OpsOperation, search: string, status: "all" | "core" | "optional", translatedTitle = operation.titleMessageID): boolean {
  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = normalizedSearch.length === 0 || operation.name.toLowerCase().includes(normalizedSearch) || translatedTitle.toLowerCase().includes(normalizedSearch);
  const matchesStatus = status === "all" || (status === "core" ? operation.required : !operation.required);
  return matchesSearch && matchesStatus;
}
