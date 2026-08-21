package httpbinding

import "github.com/rin721/go-scaffold-template/pkg/httpx/contract"

func ModuleContract() contract.Module {
	createDepartment := contract.Object().Required("code", "name").Prop("code", contract.String().MinLength(2).MaxLength(64)).Prop("name", contract.String().MinLength(1).MaxLength(128)).Prop("parentId", resourceID.Nullable())
	updateDepartment := contract.Object().Required("version").Prop("version", contract.Int64().Min(0)).Prop("name", contract.String().MinLength(1).MaxLength(128)).Prop("parentId", resourceID.Nullable()).Prop("clearParent", contract.Boolean()).Prop("active", contract.Boolean()).Prop("archived", contract.Boolean())
	createPosition := contract.Object().Required("code", "name").Prop("code", contract.String().MinLength(2).MaxLength(64)).Prop("name", contract.String().MinLength(1).MaxLength(128))
	updatePosition := contract.Object().Required("version").Prop("version", contract.Int64().Min(0)).Prop("name", contract.String().MinLength(1).MaxLength(128)).Prop("active", contract.Boolean()).Prop("archived", contract.Boolean())
	replaceAssignment := contract.Object().Required("positionIds").Prop("departmentId", resourceID.Nullable()).Prop("positionIds", contract.Array(resourceID))
	departmentList := contract.Object().Required("items", "offset", "limit", "total").Prop("items", contract.Array(contract.Ref("OrganizationDepartment"))).Prop("offset", contract.Integer()).Prop("limit", contract.Integer()).Prop("total", contract.Int64())
	positionList := contract.Object().Required("items", "offset", "limit", "total").Prop("items", contract.Array(contract.Ref("OrganizationPosition"))).Prop("offset", contract.Integer()).Prop("limit", contract.Integer()).Prop("total", contract.Int64())
	departmentNode := contract.Object().Describe("部门树节点。").Required("id", "code", "name", "active", "archived", "version", "createdAt", "updatedAt", "children").Prop("id", resourceID).Prop("code", contract.String()).Prop("name", contract.String()).Prop("parentId", resourceID.Nullable()).Prop("active", contract.Boolean()).Prop("archived", contract.Boolean()).Prop("version", contract.Int64()).Prop("createdAt", contract.String().Format("date-time")).Prop("updatedAt", contract.String().Format("date-time")).Prop("children", contract.Array(contract.Ref("OrganizationDepartmentNode")))

	listDepartments := operation("organization.departments.list", contract.MethodGet, "/api/v1/organization/departments", "organization:department:read", "organization.department.list", contract.Ref("OrganizationDepartmentList"))
	listDepartments.Params = listParams()
	tree := operation("organization.departments.tree", contract.MethodGet, "/api/v1/organization/departments/tree", "organization:department:read", "organization.department.tree", contract.Array(contract.Ref("OrganizationDepartmentNode")))
	tree.Params = []contract.Param{{Name: "activeOnly", Location: contract.ParamQuery, Schema: contract.Boolean()}}
	createDepartmentOperation := operation("organization.departments.create", contract.MethodPost, "/api/v1/organization/departments", "organization:department:write", "organization.department.create", contract.Ref("OrganizationDepartment"))
	createDepartmentOperation.Request = &contract.Request{Schema: contract.Ref("CreateOrganizationDepartment")}
	createDepartmentOperation.Responses[0].Status = 201
	updateDepartmentOperation := operation("organization.departments.update", contract.MethodPatch, "/api/v1/organization/departments/{id}", "organization:department:write", "organization.department.update", contract.Ref("OrganizationDepartment"))
	updateDepartmentOperation.Params = []contract.Param{{Name: "id", Location: contract.ParamPath, Required: true, Schema: resourceID}}
	updateDepartmentOperation.Request = &contract.Request{Schema: contract.Ref("UpdateOrganizationDepartment")}
	listPositions := operation("organization.positions.list", contract.MethodGet, "/api/v1/organization/positions", "organization:position:read", "organization.position.list", contract.Ref("OrganizationPositionList"))
	listPositions.Params = listParams()
	createPositionOperation := operation("organization.positions.create", contract.MethodPost, "/api/v1/organization/positions", "organization:position:write", "organization.position.create", contract.Ref("OrganizationPosition"))
	createPositionOperation.Request = &contract.Request{Schema: contract.Ref("CreateOrganizationPosition")}
	createPositionOperation.Responses[0].Status = 201
	updatePositionOperation := operation("organization.positions.update", contract.MethodPatch, "/api/v1/organization/positions/{id}", "organization:position:write", "organization.position.update", contract.Ref("OrganizationPosition"))
	updatePositionOperation.Params = []contract.Param{{Name: "id", Location: contract.ParamPath, Required: true, Schema: resourceID}}
	updatePositionOperation.Request = &contract.Request{Schema: contract.Ref("UpdateOrganizationPosition")}
	getAssignment := operation("organization.assignments.get", contract.MethodGet, "/api/v1/organization/accounts/{id}/assignment", "organization:department:read", "organization.assignment.read", contract.Ref("OrganizationAssignment"))
	getAssignment.Params = []contract.Param{{Name: "id", Location: contract.ParamPath, Required: true, Schema: resourceID}}
	replaceAssignmentOperation := operation("organization.assignments.replace", contract.MethodPut, "/api/v1/organization/accounts/{id}/assignment", "organization:department:write", "organization.assignment.replace", contract.Ref("OrganizationAssignment"))
	replaceAssignmentOperation.Params = []contract.Param{{Name: "id", Location: contract.ParamPath, Required: true, Schema: resourceID}}
	replaceAssignmentOperation.Request = &contract.Request{Schema: contract.Ref("ReplaceOrganizationAssignment")}

	return contract.Module{ID: "organization", Name: "Organization", Description: "部门、岗位与账号组织关系。", Schemas: []*contract.Schema{departmentSchema.Named("OrganizationDepartment"), departmentNode.Named("OrganizationDepartmentNode"), departmentList.Named("OrganizationDepartmentList"), positionSchema.Named("OrganizationPosition"), positionList.Named("OrganizationPositionList"), assignmentSchema.Named("OrganizationAssignment"), createDepartment.Named("CreateOrganizationDepartment"), updateDepartment.Named("UpdateOrganizationDepartment"), createPosition.Named("CreateOrganizationPosition"), updatePosition.Named("UpdateOrganizationPosition"), replaceAssignment.Named("ReplaceOrganizationAssignment")}, Operations: []contract.Operation{listDepartments, tree, createDepartmentOperation, updateDepartmentOperation, listPositions, createPositionOperation, updatePositionOperation, getAssignment, replaceAssignmentOperation}}
}
