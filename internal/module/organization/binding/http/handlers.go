package httpbinding

import (
	"encoding/json"
	"fmt"
	"net/http"

	organizationhandler "github.com/rin721/go-scaffold-template/internal/module/organization/handler"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

type pathBodyHandler[Request, Response any] struct {
	pathName string
	handle   func(*http.Request, string, Request) (Response, error)
	status   int
}

func (handler pathBodyHandler[Request, Response]) ServeHTTP(writer http.ResponseWriter, request *http.Request) error {
	id := contract.PathValuesFromContext(request.Context())[handler.pathName]
	if id == "" {
		return fmt.Errorf("path param %s: missing", handler.pathName)
	}
	var body Request
	if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
		return fmt.Errorf("decode JSON body: %w", err)
	}
	response, err := handler.handle(request, id, body)
	if err != nil {
		return err
	}
	return contract.EncodeJSONResponse(writer, handler.status, response)
}

func RuntimeHandlers(operations organizationhandler.Operations) map[contract.OperationID]contract.Handler {
	if operations == nil {
		return nil
	}
	return map[contract.OperationID]contract.Handler{
		"organization.departments.list":   contract.Query(operations.ListDepartments, http.StatusOK),
		"organization.departments.tree":   contract.Query(operations.DepartmentTree, http.StatusOK),
		"organization.departments.create": contract.JSONBody(operations.CreateDepartment, http.StatusCreated),
		"organization.departments.update": pathBodyHandler[organizationhandler.UpdateDepartmentRequest, organizationhandler.Department]{pathName: "id", status: http.StatusOK, handle: func(request *http.Request, id string, body organizationhandler.UpdateDepartmentRequest) (organizationhandler.Department, error) {
			body.ID = id
			return operations.UpdateDepartment(request.Context(), body)
		}},
		"organization.positions.list":   contract.Query(operations.ListPositions, http.StatusOK),
		"organization.positions.create": contract.JSONBody(operations.CreatePosition, http.StatusCreated),
		"organization.positions.update": pathBodyHandler[organizationhandler.UpdatePositionRequest, organizationhandler.Position]{pathName: "id", status: http.StatusOK, handle: func(request *http.Request, id string, body organizationhandler.UpdatePositionRequest) (organizationhandler.Position, error) {
			body.ID = id
			return operations.UpdatePosition(request.Context(), body)
		}},
		"organization.assignments.get": contract.Path("id", operations.GetAssignment, http.StatusOK),
		"organization.assignments.replace": pathBodyHandler[organizationhandler.ReplaceAssignmentRequest, organizationhandler.Assignment]{pathName: "id", status: http.StatusOK, handle: func(request *http.Request, id string, body organizationhandler.ReplaceAssignmentRequest) (organizationhandler.Assignment, error) {
			body.AccountID = id
			return operations.ReplaceAssignment(request.Context(), body)
		}},
	}
}
