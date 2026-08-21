package httpbinding

import "github.com/rin721/go-scaffold-template/pkg/httpx/contract"

func ModuleContract() contract.Module {
	list := contract.Operation{ID: "navigation.menus.list", Method: contract.MethodGet, Path: "/api/v1/navigation/menus", Tags: []string{"Navigation"}, Security: contract.SecurityWebUISession, Policy: contract.Policy{Mode: contract.PolicyModeProtected, Scope: "navigation:menu:read", Action: "navigation.menu.list"}, Responses: []contract.Response{{Status: 200, Schema: contract.Ref("NavigationMenuList")}}}
	update := contract.Operation{ID: "navigation.menus.update", Method: contract.MethodPut, Path: "/api/v1/navigation/menus/{id}", Tags: []string{"Navigation"}, Security: contract.SecurityWebUISession, Policy: contract.Policy{Mode: contract.PolicyModeProtected, Scope: "navigation:menu:write", Action: "navigation.menu.update"}, Params: []contract.Param{{Name: "id", Location: contract.ParamPath, Required: true, Schema: contract.String()}, {Name: "Origin", Location: contract.ParamHeader, Required: true, Schema: contract.String()}, {Name: "X-CSRF-Token", Location: contract.ParamHeader, Required: true, Schema: contract.String()}}, Request: &contract.Request{Schema: contract.Ref("UpdateNavigationMenu")}, Responses: []contract.Response{{Status: 200, Schema: contract.Ref("NavigationRevision")}}}
	listSchema := contract.Object().Required("items", "catalogRevision", "navigationRevision").Prop("items", contract.Array(contract.Ref("NavigationMenu"))).Prop("catalogRevision", contract.String()).Prop("navigationRevision", contract.String())
	updateSchema := contract.Object().Required("enabled", "version").Prop("enabled", contract.Boolean()).Prop("parentOverride", contract.String().Nullable()).Prop("orderOverride", contract.Integer().Min(-1000000).Max(1000000).Nullable()).Prop("version", contract.Int64().Min(0))
	revision := contract.Object().Required("catalogRevision", "navigationRevision").Prop("catalogRevision", contract.String()).Prop("navigationRevision", contract.String())
	return contract.Module{ID: "navigation", Name: "Navigation", Description: "已注册后台菜单的运行时策略。", Schemas: []*contract.Schema{menuSchema.Named("NavigationMenu"), listSchema.Named("NavigationMenuList"), updateSchema.Named("UpdateNavigationMenu"), revision.Named("NavigationRevision")}, Operations: []contract.Operation{list, update}}
}
