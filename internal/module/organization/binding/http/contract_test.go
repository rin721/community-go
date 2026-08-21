package httpbinding

import (
	"context"
	"testing"

	organizationhandler "github.com/rin721/go-scaffold-template/internal/module/organization/handler"
)

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
