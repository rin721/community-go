import { createContext, useContext, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type Access = "allowed" | "authentication-required" | "denied";
export type DeliveryState = "implemented" | "not-implemented";
export type RouteLayout = "app" | "blank";
export type CapabilityState = "available" | "degraded" | "unavailable" | "not-implemented";

export type ManifestRoute = {
  moduleId: string;
  id: string;
  path: string;
  entryId: string;
  titleMessageId: string;
  viewOperationId?: string;
  layout: RouteLayout;
  deliveryState: DeliveryState;
  default: boolean;
  unauthenticatedDefault: boolean;
  access: Access;
  availability?: CapabilityState;
  availableCapabilities?: string[];
};

export type ManifestMenu = {
  moduleId: string;
  id: string;
  parentId?: string;
  routeId: string;
  titleMessageId: string;
  iconId: string;
  order: number;
};

export type Manifest = { catalogRevision: string; navigationRevision: string; routes: ManifestRoute[]; menu: ManifestMenu[] };
export type PrincipalView = { id: string; username: string; scopes: string[] };

export type HostRuntime = {
  manifest: Manifest;
  principal?: PrincipalView;
  completeAuthentication: (principal: PrincipalView) => Promise<void>;
  refreshManifest: () => Promise<void>;
  navigateToDefault: () => void;
};

const HostRuntimeContext = createContext<HostRuntime | undefined>(undefined);

export function HostRuntimeProvider({ value, children }: { value: HostRuntime; children: ReactNode }) {
  return <HostRuntimeContext.Provider value={value}>{children}</HostRuntimeContext.Provider>;
}

export function useHostRuntime(): HostRuntime {
  const runtime = useContext(HostRuntimeContext);
  if (!runtime) throw new Error("webui_host_runtime_missing");
  return runtime;
}

/** useWebUITranslation 约束业务模块只能通过宿主公开的 namespace 翻译契约取文案。 */
export function useWebUITranslation(namespace: `webui.${string}`) {
  if (!namespace.startsWith("webui.")) throw new Error("webui_i18n_namespace_invalid");
  return useTranslation(namespace);
}

export async function requestJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ code: "request_failed" }));
    throw new Error(typeof body.code === "string" ? body.code : "request_failed");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function requestText(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  const response = await fetch(input, { credentials: "include", ...init });
  if (!response.ok) throw new Error(`request_failed_${response.status}`);
  return response.text();
}
