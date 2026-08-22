package httptransport

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/danielgtaylor/huma/v2"
	"github.com/rin721/go-scaffold-template/internal/transport/http/humabinding"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

type humaDispatcherStub struct{}

func (humaDispatcherStub) Modules() []contract.Module {
	return []contract.Module{{ID: "legacy", Name: "Legacy", Operations: []contract.Operation{{ID: "legacy.read", Method: contract.MethodGet, Path: "/legacy", Policy: contract.Policy{Mode: contract.PolicyModePublic}, Responses: []contract.Response{{Status: http.StatusOK, Schema: contract.Object()}}}}}}
}
func (humaDispatcherStub) Operations() []contract.Operation {
	return humaDispatcherStub{}.Modules()[0].Operations
}
func (humaDispatcherStub) Handler(contract.OperationID) (contract.Handler, bool) {
	return contract.Query(func(context.Context, struct{}) (struct{}, error) { return struct{}{}, nil }, http.StatusOK), true
}

type humaSliceInput struct {
	Limit int `query:"limit" minimum:"1"`
}
type humaSliceOutput struct {
	Body struct {
		Limit int `json:"limit"`
	}
}

type humaBodyInput struct {
	Body struct {
		Name string `json:"name" minLength:"1"`
	}
}

type humaBodyOutput struct {
	Body struct {
		Name string `json:"name"`
	}
}

func TestHumaSliceUsesGateValidationAndProjectProblem(t *testing.T) {
	handlerCalled := false
	registration := humabinding.Registration(func(api huma.API) {
		operation := humabinding.Operation(huma.Operation{OperationID: "typed.list", Method: http.MethodGet, Path: "/typed"}, string(contract.SecurityBearer))
		huma.Register(api, operation, func(ctx context.Context, input *humaSliceInput) (*humaSliceOutput, error) {
			handlerCalled = true
			if input.Limit == 13 {
				return nil, httpx.NewProtocolProblemError(ctx, &httpx.StatusError{StatusCode: http.StatusConflict, Code: "typed_conflict", Message: "typed conflict"})
			}
			output := &humaSliceOutput{}
			output.Body.Limit = input.Limit
			return output, nil
		})
		bodyOperation := humabinding.JSONOperation(huma.Operation{OperationID: "typed.create", Method: http.MethodPost, Path: "/typed"}, "")
		huma.Register(api, bodyOperation, func(_ context.Context, input *humaBodyInput) (*humaBodyOutput, error) {
			handlerCalled = true
			output := &humaBodyOutput{}
			output.Body.Name = input.Body.Name
			return output, nil
		})
	})

	t.Run("validation", func(t *testing.T) {
		handlerCalled = false
		routes, err := NewRouteBinding(humaDispatcherStub{}, &operationGateStub{authenticated: true}, registration)
		if err != nil {
			t.Fatal(err)
		}
		recorder := httptest.NewRecorder()
		routes.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/typed?limit=bad", nil))
		problem := decodeProblem(t, recorder)
		if recorder.Code != http.StatusBadRequest || problem.Code != "invalid_request" || handlerCalled {
			t.Fatalf("response = %d %#v, handlerCalled=%v", recorder.Code, problem, handlerCalled)
		}
	})

	t.Run("gate", func(t *testing.T) {
		handlerCalled = false
		routes, err := NewRouteBinding(humaDispatcherStub{}, &operationGateStub{}, registration)
		if err != nil {
			t.Fatal(err)
		}
		recorder := httptest.NewRecorder()
		routes.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/typed?limit=2", nil))
		problem := decodeProblem(t, recorder)
		if recorder.Code != http.StatusUnauthorized || problem.Code != "unauthenticated" || handlerCalled {
			t.Fatalf("response = %d %#v, handlerCalled=%v", recorder.Code, problem, handlerCalled)
		}
	})

	t.Run("business problem", func(t *testing.T) {
		handlerCalled = false
		routes, err := NewRouteBinding(humaDispatcherStub{}, &operationGateStub{authenticated: true}, registration)
		if err != nil {
			t.Fatal(err)
		}
		recorder := httptest.NewRecorder()
		routes.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/typed?limit=13", nil))
		problem := decodeProblem(t, recorder)
		if recorder.Code != http.StatusConflict || problem.Code != "typed_conflict" || !handlerCalled || recorder.Header().Get("Content-Type") != "application/problem+json" {
			t.Fatalf("response = %d %#v headers=%#v, handlerCalled=%v", recorder.Code, problem, recorder.Header(), handlerCalled)
		}
	})

	t.Run("missing content type", func(t *testing.T) {
		handlerCalled = false
		routes, err := NewRouteBinding(humaDispatcherStub{}, &operationGateStub{authenticated: true}, registration)
		if err != nil {
			t.Fatal(err)
		}
		recorder := httptest.NewRecorder()
		routes.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/typed", strings.NewReader(`{"name":"typed"}`)))
		problem := decodeProblem(t, recorder)
		if recorder.Code != http.StatusUnsupportedMediaType || problem.Code != "unsupported_media_type" || handlerCalled {
			t.Fatalf("response = %d %#v, handlerCalled=%v", recorder.Code, problem, handlerCalled)
		}
	})
}

func TestBuildHumaOpenAPI30NeedsNoRuntimeResources(t *testing.T) {
	registration := humabinding.Registration(func(api huma.API) {
		operation := humabinding.Operation(huma.Operation{OperationID: "typed.list", Method: http.MethodGet, Path: "/typed"}, string(contract.SecurityBearer))
		huma.Register(api, operation, func(context.Context, *humaSliceInput) (*humaSliceOutput, error) { return nil, nil })
	})
	payload, err := BuildHumaOpenAPI30(registration)
	if err != nil {
		t.Fatal(err)
	}
	document := string(payload)
	if !strings.Contains(document, "openapi: 3.0.3") || !strings.Contains(document, "operationId: typed.list") || !strings.Contains(document, "bearerAuth") {
		t.Fatalf("unexpected generated OpenAPI:\n%s", document)
	}
}

var _ Dispatcher = humaDispatcherStub{}
