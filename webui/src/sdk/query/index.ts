import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useHostRuntime } from "../runtime";
import { useQueries as useTanStackQueries, useQueryClient as useTanStackQueryClient, type QueryKey, type UseQueryResult } from "@tanstack/react-query";

export type GatedQueryResult = UseQueryResult<unknown, Error>;
export type GatedQueryOption = { capability?: string; enabled?: boolean; queryKey?: QueryKey; [key: string]: unknown };
export type GatedQueriesOptions = { queries: ReadonlyArray<GatedQueryOption>; [key: string]: unknown };

// useGatedQueries 把 route access/availability 作为 query 自动执行前置条件，并取消被撤销门禁的在途请求。
export function useGatedQueries(options: GatedQueriesOptions): GatedQueryResult[] {
  const { pathname } = useLocation();
  const { manifest } = useHostRuntime();
  const queryClient = useTanStackQueryClient();
  const route = manifest.routes.find((candidate) => candidate.path === pathname);
  const queryGateAllowed: boolean[] = [];
  const queries = options.queries.map(({ capability, ...query }) => {
    const routeAvailable = route?.availability === "available"
      || Boolean(route?.availability === "degraded" && typeof capability === "string" && route.availableCapabilities?.includes(capability));
    const gateAllowed = Boolean(route?.access === "allowed" && route.deliveryState === "implemented" && routeAvailable);
    queryGateAllowed.push(gateAllowed);
    const queryKey = Array.isArray(query.queryKey) ? [...query.queryKey, "__webui_revision", manifest.catalogRevision, manifest.navigationRevision] : query.queryKey;
    return { ...query, queryKey, enabled: gateAllowed && query.enabled !== false };
  });
  const queryKeySignature = queries.map((query) => JSON.stringify(query.queryKey)).join("|");
  const gateSignature = options.queries.map((query) => `${query.capability ?? ""}:${query.enabled !== false}`).join("|");
  useEffect(() => {
    queries.forEach((query, index) => {
      if (!queryGateAllowed[index] && Array.isArray(query.queryKey)) void queryClient.cancelQueries({ queryKey: query.queryKey });
    });
  }, [gateSignature, manifest.catalogRevision, manifest.navigationRevision, pathname, queryClient, queryKeySignature, route?.access, route?.availability, route?.deliveryState, route?.availableCapabilities?.join("\u0000")]);
  return useTanStackQueries({ ...options, queries } as Parameters<typeof useTanStackQueries>[0]) as GatedQueryResult[];
}

export { useTanStackQueryClient as useQueryClient };
// 082 REQ-082-009/010/002：统一 Query/Mutation 契约 + 列表页 URL 状态同步（见 unified.ts）。
export { useWebUIQuery, useWebUIMutation, useListQueryParams } from "./unified";
export type { ProblemError, FilterSchema, FilterValue } from "./unified";
