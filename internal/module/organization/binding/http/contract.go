// Package httpbinding 声明 Organization 的代码优先 HTTP 契约与运行期绑定。
package httpbinding

import "github.com/rin721/go-scaffold-template/pkg/httpx/contract"

var resourceID = contract.String().Describe("稳定资源 ID。").MinLength(1).MaxLength(128)

var departmentSchema = contract.Object().Describe("部门资源。").
	Required("id", "code", "name", "active", "archived", "version", "createdAt", "updatedAt").
	Prop("id", resourceID).Prop("code", contract.String()).Prop("name", contract.String()).
	Prop("parentId", resourceID.Nullable()).Prop("active", contract.Boolean()).Prop("archived", contract.Boolean()).
	Prop("version", contract.Int64().Min(0)).Prop("createdAt", contract.String().Format("date-time")).Prop("updatedAt", contract.String().Format("date-time"))

var positionSchema = contract.Object().Describe("岗位资源。").
	Required("id", "code", "name", "active", "archived", "version", "createdAt", "updatedAt").
	Prop("id", resourceID).Prop("code", contract.String()).Prop("name", contract.String()).
	Prop("active", contract.Boolean()).Prop("archived", contract.Boolean()).Prop("version", contract.Int64().Min(0)).
	Prop("createdAt", contract.String().Format("date-time")).Prop("updatedAt", contract.String().Format("date-time"))

var assignmentSchema = contract.Object().Describe("账号组织关系。").
	Required("accountId", "positionIds").Prop("accountId", resourceID).Prop("departmentId", resourceID.Nullable()).Prop("positionIds", contract.Array(resourceID))

func listParams() []contract.Param {
	return []contract.Param{{Name: "offset", Location: contract.ParamQuery, Schema: contract.Integer().Min(0).Default(0)}, {Name: "limit", Location: contract.ParamQuery, Schema: contract.Integer().Min(1)}, {Name: "activeOnly", Location: contract.ParamQuery, Schema: contract.Boolean()}}
}

func operation(id contract.OperationID, method contract.Method, path, scope, action string, response *contract.Schema) contract.Operation {
	return contract.Operation{ID: id, Method: method, Path: path, Tags: []string{"Organization"}, Security: contract.SecurityWebUISession, Policy: contract.Policy{Mode: contract.PolicyModeProtected, Scope: scope, Action: action}, Responses: []contract.Response{{Status: 200, Schema: response}}}
}
