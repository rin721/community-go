// Package httpbinding 声明 Navigation 的代码优先 HTTP 契约与运行期绑定。
package httpbinding

import "github.com/rin721/go-scaffold-template/pkg/httpx/contract"

var menuSchema = contract.Object().Describe("静态菜单定义与有效运行时策略。").Required("id", "moduleId", "routeId", "titleMessageId", "iconId", "defaultParentId", "defaultOrder", "enabled", "parentId", "order", "version", "overridden", "parentOverridden", "orderOverridden").Prop("id", contract.String()).Prop("moduleId", contract.String()).Prop("routeId", contract.String()).Prop("titleMessageId", contract.String()).Prop("iconId", contract.String()).Prop("defaultParentId", contract.String()).Prop("defaultOrder", contract.Integer()).Prop("enabled", contract.Boolean()).Prop("parentId", contract.String()).Prop("order", contract.Integer()).Prop("version", contract.Int64()).Prop("overridden", contract.Boolean()).Prop("parentOverridden", contract.Boolean()).Prop("orderOverridden", contract.Boolean())
