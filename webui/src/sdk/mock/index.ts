// @webui/sdk/mock 提供模块 mock 数据源的类型契约。
// 模块在显式声明 mock 环境时，由宿主 SDK 传输层把 HTTP 切换到本地 mock router；
// 每个声明 Entry 的模块在自己的 binding/webui/web/mock.ts 导出 WebUIMockRoute 路由表。
export type WebUIMockMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "HEAD";

export type WebUIMockRequest = {
  method: string;
  path: string;
  body?: unknown;
};

export type WebUIMockRoute = {
  method: WebUIMockMethod;
  // pattern 支持精确路径（/api/v1/iam/session）与带 {param} 的参数段
  // （/api/v1/iam/accounts/{id}/roles）；前缀匹配暂不支持，跨路径语义由模块自行声明。
  pattern: string;
  handler: (request: WebUIMockRequest) => unknown | Promise<unknown>;
};