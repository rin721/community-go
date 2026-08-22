package httpbinding

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	organizationhandler "github.com/rin721/go-scaffold-template/internal/module/organization/handler"
	"github.com/rin721/go-scaffold-template/internal/transport/http/humabinding"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
)

type organizationListInput struct {
	Offset     humabinding.Optional[int]  `query:"offset" minimum:"0"`
	Limit      humabinding.Optional[int]  `query:"limit" minimum:"1" maximum:"100"`
	ActiveOnly humabinding.Optional[bool] `query:"activeOnly"`
	Query      humabinding.Optional[string] `query:"query" maxLength:"128"`
}
type organizationTreeInput struct {
	ActiveOnly humabinding.Optional[bool] `query:"activeOnly"`
}
type organizationPathInput struct {
	ID string `path:"id" minLength:"1" maxLength:"36"`
}
type createDepartmentInput struct {
	Body organizationhandler.CreateDepartmentRequest
}
type updateDepartmentInput struct {
	ID   string `path:"id" minLength:"1" maxLength:"36"`
	Body organizationhandler.UpdateDepartmentRequest
}
type createPositionInput struct {
	Body organizationhandler.CreatePositionRequest
}
type updatePositionInput struct {
	ID   string `path:"id" minLength:"1" maxLength:"36"`
	Body organizationhandler.UpdatePositionRequest
}
type replaceAssignmentInput struct {
	ID   string `path:"id" minLength:"1" maxLength:"36"`
	Body organizationhandler.ReplaceAssignmentRequest
}
type departmentOutput struct {
	Body organizationhandler.Department
}
type departmentListOutput struct {
	Body organizationhandler.DepartmentList
}
type departmentTreeOutput struct {
	Body []organizationhandler.DepartmentNode
}
type positionOutput struct{ Body organizationhandler.Position }
type positionListOutput struct {
	Body organizationhandler.PositionList
}
type assignmentOutput struct {
	Body organizationhandler.Assignment
}

// Register 注册 Organization 的全部 typed HTTP operation。
func Register(api huma.API, operations organizationhandler.Operations) {
	huma.Register(api, organizationOperation("organization.departments.list", http.MethodGet, "/api/v1/organization/departments", "organization:department:read", "organization.department.list", http.StatusOK), func(ctx context.Context, input *organizationListInput) (*departmentListOutput, error) {
		value, err := operations.ListDepartments(ctx, humaListParams(input))
		if err != nil {
			return nil, protocolError(ctx, err)
		}
		return &departmentListOutput{Body: value}, nil
	})
	huma.Register(api, organizationOperation("organization.departments.tree", http.MethodGet, "/api/v1/organization/departments/tree", "organization:department:read", "organization.department.tree", http.StatusOK), func(ctx context.Context, input *organizationTreeInput) (*departmentTreeOutput, error) {
		value, err := operations.DepartmentTree(ctx, organizationhandler.TreeParams{ActiveOnly: input.ActiveOnly.Pointer()})
		if err != nil {
			return nil, protocolError(ctx, err)
		}
		return &departmentTreeOutput{Body: value}, nil
	})
	huma.Register(api, organizationJSONOperation("organization.departments.create", http.MethodPost, "/api/v1/organization/departments", "organization:department:write", "organization.department.create", http.StatusCreated), func(ctx context.Context, input *createDepartmentInput) (*departmentOutput, error) {
		value, err := operations.CreateDepartment(ctx, input.Body)
		if err != nil {
			return nil, protocolError(ctx, err)
		}
		return &departmentOutput{Body: value}, nil
	})
	huma.Register(api, organizationJSONOperation("organization.departments.update", http.MethodPatch, "/api/v1/organization/departments/{id}", "organization:department:write", "organization.department.update", http.StatusOK), func(ctx context.Context, input *updateDepartmentInput) (*departmentOutput, error) {
		input.Body.ID = input.ID
		value, err := operations.UpdateDepartment(ctx, input.Body)
		if err != nil {
			return nil, protocolError(ctx, err)
		}
		return &departmentOutput{Body: value}, nil
	})
	huma.Register(api, organizationOperation("organization.positions.list", http.MethodGet, "/api/v1/organization/positions", "organization:position:read", "organization.position.list", http.StatusOK), func(ctx context.Context, input *organizationListInput) (*positionListOutput, error) {
		value, err := operations.ListPositions(ctx, humaListParams(input))
		if err != nil {
			return nil, protocolError(ctx, err)
		}
		return &positionListOutput{Body: value}, nil
	})
	huma.Register(api, organizationJSONOperation("organization.positions.create", http.MethodPost, "/api/v1/organization/positions", "organization:position:write", "organization.position.create", http.StatusCreated), func(ctx context.Context, input *createPositionInput) (*positionOutput, error) {
		value, err := operations.CreatePosition(ctx, input.Body)
		if err != nil {
			return nil, protocolError(ctx, err)
		}
		return &positionOutput{Body: value}, nil
	})
	huma.Register(api, organizationJSONOperation("organization.positions.update", http.MethodPatch, "/api/v1/organization/positions/{id}", "organization:position:write", "organization.position.update", http.StatusOK), func(ctx context.Context, input *updatePositionInput) (*positionOutput, error) {
		input.Body.ID = input.ID
		value, err := operations.UpdatePosition(ctx, input.Body)
		if err != nil {
			return nil, protocolError(ctx, err)
		}
		return &positionOutput{Body: value}, nil
	})
	huma.Register(api, organizationOperation("organization.assignments.get", http.MethodGet, "/api/v1/organization/accounts/{id}/assignment", "organization:department:read", "organization.assignment.read", http.StatusOK), func(ctx context.Context, input *organizationPathInput) (*assignmentOutput, error) {
		value, err := operations.GetAssignment(ctx, input.ID)
		if err != nil {
			return nil, protocolError(ctx, err)
		}
		return &assignmentOutput{Body: value}, nil
	})
	huma.Register(api, organizationJSONOperation("organization.assignments.replace", http.MethodPut, "/api/v1/organization/accounts/{id}/assignment", "organization:department:write", "organization.assignment.replace", http.StatusOK), func(ctx context.Context, input *replaceAssignmentInput) (*assignmentOutput, error) {
		input.Body.AccountID = input.ID
		value, err := operations.ReplaceAssignment(ctx, input.Body)
		if err != nil {
			return nil, protocolError(ctx, err)
		}
		return &assignmentOutput{Body: value}, nil
	})
}

func HumaRegistration(operations organizationhandler.Operations) humabinding.Registration {
	return func(api huma.API) { Register(api, operations) }
}
func humaListParams(input *organizationListInput) organizationhandler.ListParams {
	return organizationhandler.ListParams{Offset: input.Offset.Pointer(), Limit: input.Limit.Pointer(), ActiveOnly: input.ActiveOnly.Pointer(), Query: input.Query.Pointer()}
}
func protocolError(ctx context.Context, err error) error {
	return httpx.NewProtocolProblemError(ctx, err)
}
func organizationOperation(id, method, path, scope, action string, status int) huma.Operation {
	return humabinding.Define(huma.Operation{OperationID: id, Method: method, Path: path, Tags: []string{"Organization"}, DefaultStatus: status}, humabinding.Definition{Security: humabinding.SecurityBearer, Policy: humabinding.PolicyProtected, Scope: scope, Action: action})
}
func organizationJSONOperation(id, method, path, scope, action string, status int) huma.Operation {
	return humabinding.JSONDefinition(huma.Operation{OperationID: id, Method: method, Path: path, Tags: []string{"Organization"}, DefaultStatus: status}, humabinding.Definition{Security: humabinding.SecurityBearer, Policy: humabinding.PolicyProtected, Scope: scope, Action: action})
}
