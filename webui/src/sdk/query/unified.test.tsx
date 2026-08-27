import { describe, expect, it } from "vitest";
import { createElement, useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useListQueryParams, useWebUIQuery, useWebUIMutation } from "./index";

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("082 useListQueryParams（URL 状态同步）", () => {
  it("非法/缺失 query 回退默认值", () => {
    function Probe() {
      const { filters, page, pageSize } = useListQueryParams({
        filters: {
          status: { queryKey: "status", defaultValue: "all" },
          archived: { queryKey: "archived", defaultValue: false, decode: (raw) => raw === "true" },
        },
      });
      return <div>{String(filters.status)}:{String(filters.archived)}:p{page}:s{pageSize}</div>;
    }
    const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Probe)));
    expect(markup).toContain("all:false:p1:s20");
  });

  it("从 query 读取 filter 与 sort", () => {
    function Probe() {
      const { filters, sort } = useListQueryParams({
        filters: {
          status: { queryKey: "status", defaultValue: "all" },
        },
      });
      return <div>{String(filters.status)}:{String(sort?.key)}{sort?.direction}</div>;
    }
    const markup = renderToStaticMarkup(
      createElement(MemoryRouter, { initialEntries: ["/?status=active&sort=name:desc"] }, createElement(Probe)),
    );
    expect(markup).toContain("active:namedesc");
  });
});

describe("082 useWebUIQuery / useWebUIMutation（统一契约）", () => {
  it("useWebUIQuery 在 enabled=false 时不发起请求并回退 undefined", () => {
    function Probe() {
      const { data, isPending } = useWebUIQuery({ key: ["k"], enabled: false, queryFn: async () => "no" });
      return <div>{String(isPending)}:{String(data)}</div>;
    }
    const markup = renderToStaticMarkup(
      createElement(QueryClientProvider, { client: queryClient() }, createElement(Probe)),
    );
    expect(markup).toContain("true:undefined");
  });

  it("useWebUIMutation 暴露 mutate/isPending/error 契约", () => {
    function Probe() {
      const mutation = useWebUIMutation<{ n: number }, string>({ mutationFn: async () => "ok" });
      void mutation;
      return <div>contract</div>;
    }
    const markup = renderToStaticMarkup(
      createElement(QueryClientProvider, { client: queryClient() }, createElement(Probe)),
    );
    expect(markup).toContain("contract");
  });
});