import { useQueries } from "@tanstack/react-query";
import { requestJSON, requestText } from "../api";

const operations = [
  { name: "build", title: "Build", query: () => requestJSON<Record<string, unknown>>("/management/build") },
  { name: "startupz", title: "Startup", query: () => requestJSON<Record<string, unknown>>("/management/startupz") },
  { name: "livez", title: "Liveness", query: () => requestJSON<Record<string, unknown>>("/management/livez") },
  { name: "readyz", title: "Readiness", query: () => requestJSON<Record<string, unknown>>("/management/readyz") },
  { name: "diagnostics", title: "Diagnostics", query: () => requestJSON<Record<string, unknown>>("/management/diagnostics") },
  { name: "metrics", title: "Metrics", query: () => requestText("/management/metrics") },
];

export function DashboardPage() {
  const queries = useQueries({ queries: operations.map((operation) => ({ queryKey: ["ops", operation.name], queryFn: operation.query })) });
  const loading = queries.some((query) => query.isLoading);
  const failed = queries.find((query) => query.isError);
  return <section><div className="hero"><p className="eyebrow">OPS / LIVE RUNTIME</p><h1>运行状态</h1><p>数据来自现有 management build、probe、diagnostics 和 metrics，不使用模拟系统数据。</p></div>{loading ? <div className="page-card">读取诊断中…</div> : failed ? <div className="page-card error">{(failed.error as Error).message}</div> : <div className="ops-grid">{queries.map((query, index) => <article className="page-card" key={operations[index].name}><h2>{operations[index].title}</h2><pre>{typeof query.data === "string" ? query.data : JSON.stringify(query.data, null, 2)}</pre></article>)}</div>}</section>;
}
