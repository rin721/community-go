import { useLocation } from "react-router-dom";
import { useHostRuntime } from "../runtime";
import { useQueries as useTanStackQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

export type GatedQueryResult = UseQueryResult<unknown, Error>;

// useGatedQueries 把 route access/availability 作为 query 自动执行前置条件。
// route 离开或 manifest 失效会卸载 query owner，TanStack Query 负责取消在途请求。
export function useGatedQueries(options: any): GatedQueryResult[] {
  const { pathname } = useLocation();
  const { manifest } = useHostRuntime();
  const route = manifest.routes.find((candidate) => candidate.path === pathname);
  const enabled = route?.access === "allowed" && route.deliveryState === "implemented" && route.availability !== "unavailable";
  const queries = Array.isArray(options.queries)
    ? options.queries.map((query: any) => ({ ...query, enabled: enabled && query.enabled !== false }))
    : options.queries;
  return useTanStackQueries({ ...options, queries }) as GatedQueryResult[];
}

export { useQueryClient };
