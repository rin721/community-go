// Navigation module browser-side mock data source: shapes match api.ts types and
// are used only when the WebUI explicitly declares VITE_WEBUI_DATA_SOURCE=mock.
import type { WebUIMockRoute } from "@webui/sdk/mock";

const catalogRevision = "mock-catalog-revision";
const navigationRevision = "mock-navigation-revision";

const menus = [
  { id: "ops.dashboard", moduleId: "ops", routeId: "ops.dashboard", titleMessageId: "webui.ops.dashboard.title", iconId: "activity", defaultParentId: "", defaultOrder: 10, enabled: true, parentId: "", order: 10, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
  { id: "ops.capabilities", moduleId: "ops", routeId: "ops.capabilities", titleMessageId: "webui.ops.capabilities.title", iconId: "activity", defaultParentId: "ops.dashboard", defaultOrder: 20, enabled: true, parentId: "ops.dashboard", order: 20, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
  { id: "iam.security", moduleId: "iam", routeId: "iam.security", titleMessageId: "webui.iam.security.title", iconId: "user", defaultParentId: "", defaultOrder: 30, enabled: true, parentId: "", order: 30, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
  { id: "iam.accounts", moduleId: "iam", routeId: "iam.accounts", titleMessageId: "webui.iam.accounts.title", iconId: "users", defaultParentId: "", defaultOrder: 40, enabled: true, parentId: "", order: 40, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
  { id: "iam.roles", moduleId: "iam", routeId: "iam.roles", titleMessageId: "webui.iam.roles.title", iconId: "shield", defaultParentId: "", defaultOrder: 50, enabled: true, parentId: "", order: 50, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
  { id: "iam.permissions", moduleId: "iam", routeId: "iam.permissions", titleMessageId: "webui.iam.permissions.title", iconId: "key", defaultParentId: "", defaultOrder: 60, enabled: true, parentId: "", order: 60, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
  { id: "organization.departments", moduleId: "organization", routeId: "organization.departments", titleMessageId: "webui.organization.departments.title", iconId: "building", defaultParentId: "", defaultOrder: 70, enabled: true, parentId: "", order: 70, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
  { id: "organization.positions", moduleId: "organization", routeId: "organization.positions", titleMessageId: "webui.organization.positions.title", iconId: "briefcase", defaultParentId: "", defaultOrder: 80, enabled: true, parentId: "", order: 80, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
  { id: "organization.assignments", moduleId: "organization", routeId: "organization.assignments", titleMessageId: "webui.organization.assignments.title", iconId: "users", defaultParentId: "", defaultOrder: 90, enabled: true, parentId: "", order: 90, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
  { id: "navigation.menus", moduleId: "navigation", routeId: "navigation.menus", titleMessageId: "webui.navigation.menus.title", iconId: "menu", defaultParentId: "", defaultOrder: 100, enabled: true, parentId: "", order: 100, version: 1, overridden: false, parentOverridden: false, orderOverridden: false },
];

export const webuiMockRoutes: ReadonlyArray<WebUIMockRoute> = [
  { method: "GET", pattern: "/api/v1/navigation/menus", handler: () => ({ items: menus, catalogRevision, navigationRevision }) },
  { method: "PUT", pattern: "/api/v1/navigation/menus/{id}", handler: () => ({ catalogRevision, navigationRevision }) },
];

export default webuiMockRoutes;