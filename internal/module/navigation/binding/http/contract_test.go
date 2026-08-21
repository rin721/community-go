package httpbinding

import (
	"context"
	"errors"
	"net/http"
	"testing"

	navigationhandler "github.com/rin721/go-scaffold-template/internal/module/navigation/handler"
)

func TestContractRuntimeAndMutationGuard(t *testing.T) {
	module := ModuleContract()
	if module.ID != "navigation" || len(module.Operations) != 2 {
		t.Fatalf("contract = %#v", module)
	}
	guardErr := errors.New("csrf rejected")
	handlers := RuntimeHandlers(operationStub{}, guardStub{err: guardErr})
	if len(handlers) != 2 {
		t.Fatalf("handlers = %d", len(handlers))
	}
	request, _ := http.NewRequest(http.MethodPut, "/api/v1/navigation/menus/menu", http.NoBody)
	if err := handlers["navigation.menus.update"].ServeHTTP(nil, request); !errors.Is(err, guardErr) {
		t.Fatalf("guard error = %v", err)
	}
}

type guardStub struct{ err error }

func (guard guardStub) ValidateMutation(*http.Request) error { return guard.err }

type operationStub struct{}

func (operationStub) ListMenus(context.Context) (navigationhandler.MenuList, error) {
	return navigationhandler.MenuList{}, nil
}
func (operationStub) UpdateMenu(context.Context, navigationhandler.UpdateMenuRequest) (navigationhandler.Revision, error) {
	return navigationhandler.Revision{}, nil
}
