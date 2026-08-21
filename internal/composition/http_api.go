package composition

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"sort"

	"github.com/rin721/go-scaffold-template/internal/module/auth"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	"github.com/rin721/go-scaffold-template/internal/module/iam"
	iamhttp "github.com/rin721/go-scaffold-template/internal/module/iam/binding/http"
	"github.com/rin721/go-scaffold-template/internal/module/navigation"
	navigationhttp "github.com/rin721/go-scaffold-template/internal/module/navigation/binding/http"
	"github.com/rin721/go-scaffold-template/internal/module/organization"
	organizationhttp "github.com/rin721/go-scaffold-template/internal/module/organization/binding/http"
	todohttp "github.com/rin721/go-scaffold-template/internal/module/todo/binding/http"
	todohandler "github.com/rin721/go-scaffold-template/internal/module/todo/handler"
	httptransport "github.com/rin721/go-scaffold-template/internal/transport/http"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

type operationAuthorizer interface {
	EnforceOperation(context.Context, authmodel.Principal, string) error
}

// operationGateAdapter 只按 operation security 选择显式认证来源，并保持单一授权边界。
type operationGateAdapter struct {
	auth    operationAuthorizer
	sources map[contract.Security]auth.RequestAuthenticator
}

func newOperationGate(authorizer operationAuthorizer, bearerSource, sessionSource auth.RequestAuthenticator) (httptransport.OperationGate, error) {
	if nilDependency(authorizer) || nilDependency(bearerSource) || nilDependency(sessionSource) {
		return nil, fmt.Errorf("auth sources for HTTP operation gate are incomplete")
	}
	return operationGateAdapter{auth: authorizer, sources: map[contract.Security]auth.RequestAuthenticator{
		contract.SecurityBearer: bearerSource, contract.SecurityWebUISession: sessionSource,
	}}, nil
}

func (adapter operationGateAdapter) Authenticate(request *http.Request, security contract.Security) (*http.Request, error) {
	if request == nil {
		return nil, httptransport.ErrUnauthenticated
	}
	if security == contract.SecurityNone {
		return request, nil
	}
	source, exists := adapter.sources[security]
	if !exists || nilDependency(source) {
		return nil, httptransport.ErrUnauthenticated
	}
	authenticated, err := source.AuthenticateRequest(request)
	if err != nil {
		return nil, httptransport.ErrUnauthenticated
	}
	return authenticated, nil
}

func (adapter operationGateAdapter) Enforce(ctx context.Context, operation string) error {
	principal, _ := authmodel.PrincipalFromContext(ctx)
	if err := adapter.auth.EnforceOperation(ctx, principal, operation); err != nil {
		switch {
		case errors.Is(err, authmodel.ErrUnauthenticated):
			return httptransport.ErrUnauthenticated
		case errors.Is(err, authmodel.ErrPermissionDenied):
			return httptransport.ErrPermissionDenied
		default:
			return err
		}
	}
	return nil
}

type runtimeHTTPModule struct {
	Contract contract.Module
	Handlers map[contract.OperationID]contract.Handler
}

// contractDispatcher 聚合多个模块的契约与 handler，不了解任何具体业务模块。
type contractDispatcher struct {
	modules    []contract.Module
	operations []contract.Operation
	handlers   map[contract.OperationID]contract.Handler
}

func newContractDispatcher(runtimeModules ...runtimeHTTPModule) (*contractDispatcher, error) {
	if len(runtimeModules) == 0 {
		return nil, fmt.Errorf("no application HTTP modules are registered")
	}
	modules := append([]runtimeHTTPModule(nil), runtimeModules...)
	sort.Slice(modules, func(left, right int) bool { return modules[left].Contract.ID < modules[right].Contract.ID })
	moduleIDs := make(map[string]struct{}, len(modules))
	handlers := make(map[contract.OperationID]contract.Handler)
	operations := make([]contract.Operation, 0)
	contracts := make([]contract.Module, 0, len(modules))
	for _, runtimeModule := range modules {
		moduleContract := runtimeModule.Contract
		if moduleContract.ID == "" {
			return nil, fmt.Errorf("HTTP module id is required")
		}
		if _, exists := moduleIDs[moduleContract.ID]; exists {
			return nil, fmt.Errorf("HTTP module %q is duplicated", moduleContract.ID)
		}
		moduleIDs[moduleContract.ID] = struct{}{}
		declared := make(map[contract.OperationID]struct{}, len(moduleContract.Operations))
		for _, operation := range moduleContract.Operations {
			if _, exists := handlers[operation.ID]; exists {
				return nil, fmt.Errorf("HTTP operation %q is declared by more than one module", operation.ID)
			}
			handler, exists := runtimeModule.Handlers[operation.ID]
			if !exists || nilDependency(handler) {
				return nil, fmt.Errorf("HTTP module %q operation %q has no runtime handler", moduleContract.ID, operation.ID)
			}
			declared[operation.ID] = struct{}{}
			handlers[operation.ID] = handler
			operations = append(operations, operation)
		}
		for operationID, handler := range runtimeModule.Handlers {
			if _, exists := declared[operationID]; !exists {
				return nil, fmt.Errorf("HTTP module %q has unknown runtime handler %q", moduleContract.ID, operationID)
			}
			if nilDependency(handler) {
				return nil, fmt.Errorf("HTTP module %q runtime handler %q is nil", moduleContract.ID, operationID)
			}
		}
		contracts = append(contracts, cloneHTTPModule(moduleContract))
	}
	sort.Slice(operations, func(left, right int) bool { return operations[left].ID < operations[right].ID })
	return &contractDispatcher{modules: contracts, operations: operations, handlers: handlers}, nil
}

func newApplicationContractDispatcher(todoOperations todohandler.Operations, iamModule iam.HTTPModule, organizationModule organization.HTTPModule, navigationModule navigation.HTTPModule, mutationGuard navigationhttp.MutationGuard) (*contractDispatcher, error) {
	if nilDependency(todoOperations) || iamModule.Handler == nil || nilDependency(organizationModule.Operations) || nilDependency(navigationModule.Operations) || nilDependency(mutationGuard) {
		return nil, fmt.Errorf("application HTTP runtime dependencies are incomplete")
	}
	return newContractDispatcher(
		runtimeHTTPModule{Contract: iamhttp.ModuleContract(), Handlers: iamhttp.RuntimeHandlers(iamModule.Handler)},
		runtimeHTTPModule{Contract: organizationhttp.ModuleContract(), Handlers: organizationhttp.RuntimeHandlers(organizationModule.Operations)},
		runtimeHTTPModule{Contract: navigationhttp.ModuleContract(), Handlers: navigationhttp.RuntimeHandlers(navigationModule.Operations, mutationGuard)},
		runtimeHTTPModule{Contract: todohttp.ModuleContract(), Handlers: todohttp.RuntimeHandlers(todoOperations)},
	)
}

func cloneHTTPModule(module contract.Module) contract.Module {
	module.Operations = append([]contract.Operation(nil), module.Operations...)
	module.Schemas = append([]*contract.Schema(nil), module.Schemas...)
	module.SecuritySchemes = append([]contract.SecurityScheme(nil), module.SecuritySchemes...)
	return module
}

func (dispatcher *contractDispatcher) Modules() []contract.Module {
	result := make([]contract.Module, len(dispatcher.modules))
	for index, module := range dispatcher.modules {
		result[index] = cloneHTTPModule(module)
	}
	return result
}

func (dispatcher *contractDispatcher) Operations() []contract.Operation {
	return append([]contract.Operation(nil), dispatcher.operations...)
}

func (dispatcher *contractDispatcher) Handler(operationID contract.OperationID) (contract.Handler, bool) {
	handler, exists := dispatcher.handlers[operationID]
	return handler, exists
}

func nilDependency(value any) bool {
	if value == nil {
		return true
	}
	reflected := reflect.ValueOf(value)
	switch reflected.Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
		return reflected.IsNil()
	default:
		return false
	}
}

var _ httptransport.OperationGate = operationGateAdapter{}
var _ httptransport.Dispatcher = (*contractDispatcher)(nil)

func withOptionalAuthentication(source auth.RequestAuthenticator, next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		authenticated, err := source.AuthenticateRequest(request)
		if err != nil {
			next.ServeHTTP(writer, request)
			return
		}
		next.ServeHTTP(writer, authenticated)
	})
}
