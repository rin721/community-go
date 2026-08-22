package composition

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	iamhttp "github.com/rin721/go-scaffold-template/internal/module/iam/binding/http"
	organizationhttp "github.com/rin721/go-scaffold-template/internal/module/organization/binding/http"
	todohttp "github.com/rin721/go-scaffold-template/internal/module/todo/binding/http"
	todohandler "github.com/rin721/go-scaffold-template/internal/module/todo/handler"
	httptransport "github.com/rin721/go-scaffold-template/internal/transport/http"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

func TestApplicationHumaSliceBuildsWithoutRuntimeResources(t *testing.T) {
	payload, err := httptransport.BuildHumaOpenAPI30(iamhttp.HumaSlice(nil), todohttp.HumaSlice(nil), organizationhttp.HumaSlice(nil))
	if err != nil {
		t.Fatal(err)
	}
	for _, operationID := range [][]byte{[]byte("login"), []byte("listTodos"), []byte("organization.departments.update")} {
		if !bytes.Contains(payload, operationID) {
			t.Fatalf("generated Huma slice is missing %q", operationID)
		}
	}
}

func TestContractDispatcherAggregatesMultipleModulesDeterministically(t *testing.T) {
	todoHandlers := todohttp.RuntimeHandlers(&todoOperationsStub{})
	publicHandler := contract.Query(func(context.Context, struct{}) (struct{}, error) { return struct{}{}, nil }, http.StatusOK)
	dispatcher, err := newContractDispatcher(
		runtimeHTTPModule{Contract: todohttp.ModuleContract(), Handlers: todoHandlers},
		runtimeHTTPModule{Contract: contract.Module{ID: "alpha", Name: "Alpha", Operations: []contract.Operation{{ID: "alpha.read", Method: contract.MethodGet, Path: "/alpha", Policy: contract.Policy{Mode: contract.PolicyModePublic}, Responses: []contract.Response{{Status: 200, Schema: contract.Object()}}}}}, Handlers: map[contract.OperationID]contract.Handler{"alpha.read": publicHandler}},
	)
	if err != nil {
		t.Fatal(err)
	}
	if modules := dispatcher.Modules(); len(modules) != 2 || modules[0].ID != "alpha" || modules[1].ID != "todo" {
		t.Fatalf("dispatcher modules = %#v", modules)
	}
	if operations := dispatcher.Operations(); len(operations) != 5 || operations[0].ID != "alpha.read" {
		t.Fatalf("dispatcher operations = %#v", operations)
	}
	if _, ok := dispatcher.Handler("createTodo"); !ok {
		t.Fatal("dispatcher Handler(createTodo) not found")
	}
}

func TestContractDispatcherRejectsMissingExtraAndDuplicateHandlers(t *testing.T) {
	module := todohttp.ModuleContract()
	handlers := todohttp.RuntimeHandlers(&todoOperationsStub{})
	delete(handlers, "createTodo")
	if _, err := newContractDispatcher(runtimeHTTPModule{Contract: module, Handlers: handlers}); err == nil {
		t.Fatal("missing runtime handler was accepted")
	}
	handlers = todohttp.RuntimeHandlers(&todoOperationsStub{})
	handlers["unknown"] = handlers["createTodo"]
	if _, err := newContractDispatcher(runtimeHTTPModule{Contract: module, Handlers: handlers}); err == nil {
		t.Fatal("unknown runtime handler was accepted")
	}
	if _, err := newContractDispatcher(
		runtimeHTTPModule{Contract: module, Handlers: todohttp.RuntimeHandlers(&todoOperationsStub{})},
		runtimeHTTPModule{Contract: module, Handlers: todohttp.RuntimeHandlers(&todoOperationsStub{})},
	); err == nil {
		t.Fatal("duplicate module was accepted")
	}
}

func TestOperationGateSelectsTypedAuthenticationSource(t *testing.T) {
	bearer, session := &requestSourceStub{}, &requestSourceStub{}
	gate, err := newOperationGate(&operationAuthorizerStub{}, bearer, session)
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	if _, err := gate.Authenticate(request, contract.SecurityNone); err != nil {
		t.Fatal(err)
	}
	if _, err := gate.Authenticate(request, contract.SecurityBearer); err != nil || bearer.calls != 1 || session.calls != 0 {
		t.Fatalf("bearer source calls = %d/%d, err %v", bearer.calls, session.calls, err)
	}
	if _, err := gate.Authenticate(request, contract.SecurityWebUISession); err != nil || session.calls != 1 {
		t.Fatalf("session source calls = %d, err %v", session.calls, err)
	}
}

func TestOperationGateMapsAuthorizationAndDependencyErrors(t *testing.T) {
	privateErr := errors.New("private auth dependency")
	for _, test := range []struct {
		name string
		err  error
		want error
	}{
		{name: "permission denied", err: authmodel.ErrPermissionDenied, want: httptransport.ErrPermissionDenied},
		{name: "auth rejected", err: authmodel.ErrUnauthenticated, want: httptransport.ErrUnauthenticated},
		{name: "dependency", err: privateErr, want: privateErr},
		{name: "allowed"},
	} {
		t.Run(test.name, func(t *testing.T) {
			gate, err := newOperationGate(&operationAuthorizerStub{err: test.err}, &requestSourceStub{}, &requestSourceStub{})
			if err != nil {
				t.Fatal(err)
			}
			err = gate.Enforce(principalContext(t), "createTodo")
			if !errors.Is(err, test.want) {
				t.Fatalf("Enforce() error = %v, want %v", err, test.want)
			}
		})
	}
	if _, err := newOperationGate(nil, &requestSourceStub{}, &requestSourceStub{}); err == nil {
		t.Fatal("nil authorizer was accepted")
	}
}

func TestTodoActorAccessMapsOnlyAuthenticatedPrincipal(t *testing.T) {
	access := todoActorAccessAdapter{}
	if _, ok := access.Actor(t.Context()); ok {
		t.Fatal("Actor() authenticated without principal")
	}
	actor, ok := access.Actor(principalContext(t))
	if !ok || actor.Subject != "subject-1" || actor.Kind != "service" || len(actor.Scopes) != 1 || actor.Scopes[0] != "todos:write" {
		t.Fatalf("Actor() = %#v, %t", actor, ok)
	}
}

func principalContext(t *testing.T) context.Context {
	t.Helper()
	now := time.Date(2026, 8, 16, 10, 0, 0, 0, time.UTC)
	principal, err := authmodel.NewPrincipal("subject-1", authmodel.ActorService, []authmodel.Scope{"todos:write"}, now, now)
	if err != nil {
		t.Fatal(err)
	}
	return authmodel.WithPrincipal(t.Context(), principal)
}

type requestSourceStub struct{ calls int }

func (stub *requestSourceStub) AuthenticateRequest(request *http.Request) (*http.Request, error) {
	stub.calls++
	return request.WithContext(principalContextForStub(request.Context())), nil
}

func principalContextForStub(ctx context.Context) context.Context {
	now := time.Date(2026, 8, 16, 10, 0, 0, 0, time.UTC)
	principal, _ := authmodel.NewPrincipal("subject-1", authmodel.ActorService, []authmodel.Scope{"todos:write"}, now, now)
	return authmodel.WithPrincipal(ctx, principal)
}

type operationAuthorizerStub struct{ err error }

func (stub *operationAuthorizerStub) EnforceOperation(context.Context, authmodel.Principal, string) error {
	return stub.err
}

type todoOperationsStub struct{ createCalls int }

func (*todoOperationsStub) ListTodos(context.Context, todohandler.ListTodosParams) (todohandler.TodoList, error) {
	return todohandler.TodoList{}, nil
}
func (stub *todoOperationsStub) CreateTodo(context.Context, todohandler.CreateTodoRequest) (todohandler.Todo, error) {
	stub.createCalls++
	return todohandler.Todo{}, nil
}
func (*todoOperationsStub) GetTodo(context.Context, string) (todohandler.Todo, error) {
	return todohandler.Todo{}, nil
}
func (*todoOperationsStub) CompleteTodo(context.Context, string) (todohandler.Todo, error) {
	return todohandler.Todo{}, nil
}

var _ todohandler.Operations = (*todoOperationsStub)(nil)
var _ operationAuthorizer = (*operationAuthorizerStub)(nil)
