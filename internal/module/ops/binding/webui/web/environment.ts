// Ops data-source split: when the WebUI explicitly declares mock, the host transport
// takes over (no probing, no real requests); in real mode (server-hosted/separated)
// reachability is probed with /management/readyz.
// The view layer only uses this to distinguish an unreachable data source; per-capability
// failures stay with the react-query state machine.
import { readWebUIDataSource } from "@webui/sdk/runtime";
import { loadReadiness } from "./api";

export type ManagementSource = "mock" | "connected" | "unreachable";

export async function resolveManagementSource(): Promise<ManagementSource> {
  if (readWebUIDataSource() === "mock") return "mock";
  try {
    await loadReadiness();
    return "connected";
  } catch {
    return "unreachable";
  }
}