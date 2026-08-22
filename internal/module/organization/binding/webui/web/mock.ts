// Organization module browser-side mock data source: shapes match api.ts types and
// are used only when the WebUI explicitly declares VITE_WEBUI_DATA_SOURCE=mock.
import type { WebUIMockRoute } from "@webui/sdk/mock";

const departments = [
  { id: "dept-1", code: "HQ", name: "Headquarters", active: true, archived: false, version: 1 },
  { id: "dept-2", code: "ENG", name: "Engineering", parentId: "dept-1", active: true, archived: false, version: 1 },
];

const positions = [
  { id: "pos-1", code: "ENG-LEAD", name: "Engineering Lead", active: true, archived: false, version: 1 },
  { id: "pos-2", code: "OPS-READ", name: "Operations Reader", active: true, archived: false, version: 1 },
];

const accounts = [
  { id: "acct-1", username: "admin", displayName: "Mock Administrator" },
  { id: "acct-2", username: "ops.reader", displayName: "Ops Reader" },
];

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/organization/departments", handler: () => ({ items: departments, offset: 0, limit: 100, total: departments.length }) },
  { method: "GET", pattern: "/api/v1/organization/departments/tree", handler: () => [
    { ...departments[0], children: [{ ...departments[1], children: [] }] },
  ] },
  { method: "POST", pattern: "/api/v1/organization/departments", handler: (request) => {
    const body = (request.body ?? {}) as { code?: string; name?: string };
    return { id: `dept-${departments.length + 1}`, code: body.code ?? "NEW", name: body.name ?? "New Department", active: true, archived: false, version: 1 };
  } },
  { method: "PATCH", pattern: "/api/v1/organization/departments/{id}", handler: () => ({ ...departments[0], version: 2 }) },
  { method: "GET", pattern: "/api/v1/organization/positions", handler: () => ({ items: positions, offset: 0, limit: 100, total: positions.length }) },
  { method: "POST", pattern: "/api/v1/organization/positions", handler: (request) => {
    const body = (request.body ?? {}) as { code?: string; name?: string };
    return { id: `pos-${positions.length + 1}`, code: body.code ?? "NEW-POS", name: body.name ?? "New Position", active: true, archived: false, version: 1 };
  } },
  { method: "PATCH", pattern: "/api/v1/organization/positions/{id}", handler: () => ({ ...positions[0], version: 2 }) },
  { method: "GET", pattern: "/api/v1/iam/accounts", handler: () => ({ items: accounts, offset: 0, limit: 100, total: accounts.length }) },
  { method: "GET", pattern: "/api/v1/organization/accounts/{accountId}/assignment", handler: () => ({ accountId: "acct-1", departmentId: "dept-1", positionIds: ["pos-1"] }) },
  { method: "PUT", pattern: "/api/v1/organization/accounts/{accountId}/assignment", handler: (request) => {
    const body = (request.body ?? {}) as { departmentId?: string; positionIds?: string[] };
    return { accountId: "acct-1", departmentId: body.departmentId ?? "dept-1", positionIds: body.positionIds ?? [] };
  } },
];

export default webuiMockRoutes;