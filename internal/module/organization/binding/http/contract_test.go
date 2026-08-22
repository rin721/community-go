package httpbinding

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	organizationhandler "github.com/rin721/go-scaffold-template/internal/module/organization/handler"
)

func TestHumaUpdateDepartmentSliceBindsPathAndVersion(t *testing.T) {
	operations := &capturingOperationStub{}
	router := chi.NewRouter()
	config := huma.DefaultConfig("test", "1")
	config.OpenAPIPath, config.DocsPath, config.SchemasPath = "", "", ""
	api := humachi.New(router, config)
	RegisterHumaSlice(api, operations)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/organization/departments/department-1", bytes.NewBufferString(`{"version":7,"name":"Research"}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK || operations.updated.ID != "department-1" || operations.updated.Version != 7 || operations.updated.Name == nil || *operations.updated.Name != "Research" {
		t.Fatalf("response=%d body=%s request=%#v", response.Code, response.Body.String(), operations.updated)
	}
}

func TestContractAndRuntimeHandlersStayComplete(t *testing.T) {
	module := ModuleContract()
	if module.ID != "organization" || len(module.Operations) != 9 {
		t.Fatalf("module contract = %#v", module)
	}
	handlers := RuntimeHandlers(operationStub{})
	if len(handlers) != len(module.Operations) {
		t.Fatalf("handlers = %d, operations = %d", len(handlers), len(module.Operations))
	}
	for _, operation := range module.Operations {
		if handlers[operation.ID] == nil {
			t.Fatalf("operation %q has no handler", operation.ID)
		}
	}
}

type operationStub struct{}

type capturingOperationStub struct {
	operationStub
	updated organizationhandler.UpdateDepartmentRequest
}

func (stub *capturingOperationStub) UpdateDepartment(_ context.Context, request organizationhandler.UpdateDepartmentRequest) (organizationhandler.Department, error) {
	stub.updated = request
	return organizationhandler.Department{ID: request.ID, Version: request.Version}, nil
}

func (operationStub) ListDepartments(context.Context, organizationhandler.ListParams) (organizationhandler.DepartmentList, error) {
	return organizationhandler.DepartmentList{}, nil
}
func (operationStub) DepartmentTree(context.Context, organizationhandler.TreeParams) ([]organizationhandler.DepartmentNode, error) {
	return nil, nil
}
func (operationStub) CreateDepartment(context.Context, organizationhandler.CreateDepartmentRequest) (organizationhandler.Department, error) {
	return organizationhandler.Department{}, nil
}
func (operationStub) UpdateDepartment(context.Context, organizationhandler.UpdateDepartmentRequest) (organizationhandler.Department, error) {
	return organizationhandler.Department{}, nil
}
func (operationStub) ListPositions(context.Context, organizationhandler.ListParams) (organizationhandler.PositionList, error) {
	return organizationhandler.PositionList{}, nil
}
func (operationStub) CreatePosition(context.Context, organizationhandler.CreatePositionRequest) (organizationhandler.Position, error) {
	return organizationhandler.Position{}, nil
}
func (operationStub) UpdatePosition(context.Context, organizationhandler.UpdatePositionRequest) (organizationhandler.Position, error) {
	return organizationhandler.Position{}, nil
}
func (operationStub) GetAssignment(context.Context, string) (organizationhandler.Assignment, error) {
	return organizationhandler.Assignment{}, nil
}
func (operationStub) ReplaceAssignment(context.Context, organizationhandler.ReplaceAssignmentRequest) (organizationhandler.Assignment, error) {
	return organizationhandler.Assignment{}, nil
}
