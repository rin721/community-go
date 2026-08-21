package httpbinding

import (
	"encoding/json"
	"fmt"
	"net/http"

	navigationhandler "github.com/rin721/go-scaffold-template/internal/module/navigation/handler"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

type noBodyHandler struct {
	handle func(*http.Request) (navigationhandler.MenuList, error)
}

func (handler noBodyHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) error {
	response, err := handler.handle(request)
	if err != nil {
		return err
	}
	return contract.EncodeJSONResponse(writer, http.StatusOK, response)
}

type MutationGuard interface{ ValidateMutation(*http.Request) error }

type updateHandler struct {
	operations navigationhandler.Operations
	guard      MutationGuard
}

func (handler updateHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) error {
	if handler.guard == nil {
		return fmt.Errorf("navigation mutation guard is nil")
	}
	if err := handler.guard.ValidateMutation(request); err != nil {
		return err
	}
	id := contract.PathValuesFromContext(request.Context())["id"]
	if id == "" {
		return fmt.Errorf("path param id: missing")
	}
	var body navigationhandler.UpdateMenuRequest
	if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
		return fmt.Errorf("decode JSON body: %w", err)
	}
	body.ID = id
	response, err := handler.operations.UpdateMenu(request.Context(), body)
	if err != nil {
		return err
	}
	return contract.EncodeJSONResponse(writer, http.StatusOK, response)
}
func RuntimeHandlers(operations navigationhandler.Operations, guard MutationGuard) map[contract.OperationID]contract.Handler {
	if operations == nil || guard == nil {
		return nil
	}
	return map[contract.OperationID]contract.Handler{"navigation.menus.list": noBodyHandler{handle: func(request *http.Request) (navigationhandler.MenuList, error) {
		return operations.ListMenus(request.Context())
	}}, "navigation.menus.update": updateHandler{operations: operations, guard: guard}}
}
