import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation as useTanStackMutation, useQuery as useTanStackQuery, useQueryClient as useTanStackQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * 082 REQ-082-010：稳定错误契约——服务端 Problem JSON 的客户端投影。
 * 只保留低敏字段；detail 不用于直出 UI（页面对应稳定 messageId）。
 */
export type ProblemError = {
  status?: number;
  code?: string;
  detail?: string;
  requestId?: string;
  traceId?: string;
};

/**
 * 082 REQ-082-009：统一查询契约。
 * - 请求可取消（queryFn 接收 AbortSignal）；
 * - 失败统一携带 ProblemError（错误码 → messageId 在页面层映射）；
 * - 缓存/失效由 @tanstack/react-query 承载，key 追加 catalogRevision 保证跨版本失效。
 */
export function useWebUIQuery<T>(opts: {
  key: QueryKey;
  enabled?: boolean;
  staleTime?: number;
  queryFn: (signal: AbortSignal) => Promise<T>;
  onError?: (error: ProblemError) => void;
}) {
  const queryKey: QueryKey = Array.isArray(opts.key) ? [...opts.key] : [opts.key];
  const result = useTanStackQuery({
    queryKey,
    enabled: opts.enabled !== false,
    staleTime: opts.staleTime ?? 30_000,
    queryFn: ({ signal }) => opts.queryFn(signal),
  });
  const error = result.error as ProblemError | null;
  useEffect(() => {
    if (error && opts.onError) opts.onError(error);
  }, [error]);
  return {
    data: result.data as T | undefined,
    isPending: result.isPending,
    isError: result.isError,
    error,
    refetch: result.refetch,
  };
}

/**
 * 082 REQ-082-009：统一 Mutation 契约。
 * - mutationFn 为写操作实现（页面层负责注入 CSRF/Origin 头，见模块 api.ts 既有先例）；
 * - invalidates 成功后失效对应查询；
 * - 失败统一携带 ProblemError。
 */
export function useWebUIMutation<TIn, TOut>(opts: {
  mutationFn: (input: TIn) => Promise<TOut>;
  invalidates?: QueryKey[];
  onSuccess?: (data: TOut, input: TIn) => void;
  onError?: (error: ProblemError) => void;
}) {
  const queryClient = useTanStackQueryClient();
  const mutation = useTanStackMutation({
    mutationFn: async (input: TIn) => opts.mutationFn(input),
    onSuccess: async (data, input) => {
      if (opts.invalidates) {
        await Promise.all(opts.invalidates.map((key) => queryClient.invalidateQueries({ queryKey: key })));
      }
      opts.onSuccess?.(data, input);
    },
  });
  const error = mutation.error as ProblemError | null;
  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error,
    reset: mutation.reset,
  };
}

/** Filter 值序列化：支持 string/number/boolean/string[]。 */
export type FilterValue = string | number | boolean | ReadonlyArray<string> | undefined;

/** 082 REQ-082-002：列表页过滤/分页/排序 schema（含 URL query 键声明）。 */
export type FilterSchema<TFilters extends Record<string, FilterValue>> = {
  /** 每个 filter：query key 与解码（非法/缺失回退默认）。 */
  filters: Record<keyof TFilters, { queryKey: string; defaultValue: TFilters[keyof TFilters]; decode?: (raw: string | null) => TFilters[keyof TFilters] }>;
};

/** 082 REQ-082-002：列表页查询状态同步 URL（useSearchParams）；write=replace 保留 history 供 back/forward。 */
export function useListQueryParams<TFilters extends Record<string, FilterValue>>(schema: FilterSchema<TFilters>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const parse = (): TFilters => {
    const out = {} as TFilters;
    for (const key of Object.keys(schema.filters) as Array<keyof TFilters>) {
      const spec = schema.filters[key];
      const raw = searchParams.get(spec.queryKey);
      out[key] = spec.decode ? spec.decode(raw) : (raw as TFilters[keyof TFilters]) ?? spec.defaultValue;
    }
    return out;
  };
  const [filters, setFiltersState] = useState<TFilters>(parse);
  const searchString = searchParams.toString();
  const filterKeys = Object.keys(schema.filters).join("|");
  // 浏览器前进/后退或外部 deep-link 改变 query 时，重新投影到页面状态；
  // 不能只依赖 setFilters，否则地址栏和筛选器会出现漂移。
  useEffect(() => {
    setFiltersState(parse());
  }, [searchString, filterKeys]);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "20", 10) || 20);
  const sortRaw = searchParams.get("sort");
  const sort = sortRaw ? { key: sortRaw.split(":")[0], direction: sortRaw.split(":")[1] === "desc" ? ("desc" as const) : ("asc" as const) } : null;
  const setFilters = useCallback(
    (next: TFilters) => {
      setFiltersState(next);
      const params = new URLSearchParams(searchParams);
      for (const key of Object.keys(schema.filters) as Array<keyof TFilters>) {
        const spec = schema.filters[key];
        const value = next[key];
        if (value === undefined || value === "" || value === null || (Array.isArray(value) && value.length === 0)) params.delete(spec.queryKey);
        else params.set(spec.queryKey, String(value));
      }
      setSearchParams(params, { replace: false });
    },
    [searchParams, setSearchParams, schema.filters],
  );
  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(next));
      setSearchParams(params, { replace: false });
    },
    [searchParams, setSearchParams],
  );
  const setPageSize = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("pageSize", String(next));
      params.delete("page");
      setSearchParams(params, { replace: false });
    },
    [searchParams, setSearchParams],
  );
  const setSort = useCallback(
    (next: { key: string; direction: "asc" | "desc" } | null) => {
      const params = new URLSearchParams(searchParams);
      if (next) params.set("sort", `${next.key}:${next.direction}`);
      else params.delete("sort");
      setSearchParams(params, { replace: false });
    },
    [searchParams, setSearchParams],
  );
  const clearFilters = useCallback(() => {
    setFiltersState(parse());
    const params = new URLSearchParams(searchParams);
    for (const key of Object.keys(schema.filters) as Array<keyof TFilters>) {
      params.delete(schema.filters[key].queryKey);
    }
    setSearchParams(params, { replace: false });
  }, [searchParams, setSearchParams, schema.filters]);
  return { filters, setFilters, page, setPage, pageSize, setPageSize, sort, setSort, clearFilters };
}
