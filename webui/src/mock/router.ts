// 宿主 mock 数据传输层：仅在显式声明 VITE_WEBUI_DATA_SOURCE=mock 时由
// contracts.requestJSON/requestText 调用。按 method+path 匹配路由表（宿主优先，
// 其次为各模块经生成 webuiMockRegistry 贡献的路由），未命中抛出与真实 4xx
// 同构的 route_not_found 错误，绝不发起真实网络请求。
import { webuiMockRegistry } from "../generated/webui-registry";
import type { WebUIMockRequest, WebUIMockRoute } from "@webui/sdk/mock";
import { hostMockRoutes } from "./host";

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === "string") return input.split("?")[0] ?? input;
  if (input instanceof URL) return input.pathname;
  return String(input);
}

function matchesPattern(pattern: string, path: string): boolean {
  const patternParts = pattern.split("/");
  const pathParts = path.split("/");
  if (patternParts.length !== pathParts.length) return false;
  for (let index = 0; index < patternParts.length; index++) {
    const part = patternParts[index];
    if (part.startsWith("{") && part.endsWith("}")) continue;
    if (part !== pathParts[index]) return false;
  }
  return true;
}

let cachedRoutes: ReadonlyArray<WebUIMockRoute> | undefined;

async function loadRoutes(): Promise<ReadonlyArray<WebUIMockRoute>> {
  if (cachedRoutes) return cachedRoutes;
  const routes: WebUIMockRoute[] = [...hostMockRoutes];
  for (const load of Object.values(webuiMockRegistry)) {
    const module = await load();
    const contributed = (module as { default?: ReadonlyArray<WebUIMockRoute> }).default;
    if (contributed) routes.push(...contributed);
  }
  cachedRoutes = routes;
  return routes;
}

// resetMockRouterCache 清空聚合缓存，供测试隔离使用。
export function resetMockRouterCache(): void {
  cachedRoutes = undefined;
}

async function dispatch(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  const path = requestPath(input);
  const method = (init?.method ?? "GET").toUpperCase();
  let body: unknown;
  if (typeof init?.body === "string" && init.body !== "") {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = init.body;
    }
  }
  const routes = await loadRoutes();
  for (const route of routes) {
    if (route.method !== method || !matchesPattern(route.pattern, path)) continue;
    const request: WebUIMockRequest = { method, path, body };
    return await route.handler(request);
  }
  throw new Error("route_not_found");
}

export function mockRequestJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  return dispatch(input, init) as Promise<T>;
}

export function mockRequestText(input: RequestInfo | URL, init?: RequestInit): Promise<string> {
  return dispatch(input, init) as Promise<string>;
}