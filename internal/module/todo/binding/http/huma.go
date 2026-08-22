package httpbinding

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	todohandler "github.com/rin721/go-scaffold-template/internal/module/todo/handler"
	"github.com/rin721/go-scaffold-template/internal/transport/http/humabinding"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

type listTodosInput struct {
	Status humabinding.Optional[todohandler.TodoStatus] `query:"status" enum:"pending,completed"`
	Offset humabinding.Optional[int]                    `query:"offset" minimum:"0"`
	Limit  humabinding.Optional[int]                    `query:"limit" minimum:"1"`
}

type listTodosOutput struct {
	Body todohandler.TodoList
}

// RegisterHumaSlice 注册 Todo 第一片 typed operation；业务 handler 不感知 Huma。
func RegisterHumaSlice(api huma.API, operations todohandler.Operations) {
	operation := humabinding.Operation(huma.Operation{
		OperationID: "listTodos",
		Method:      http.MethodGet,
		Path:        "/api/v1/todos",
		Tags:        []string{"Todo"},
		Summary:     "List Todo resources",
	}, string(contract.SecurityBearer))
	huma.Register(api, operation, func(ctx context.Context, input *listTodosInput) (*listTodosOutput, error) {
		result, err := operations.ListTodos(ctx, todohandler.ListTodosParams{Status: input.Status.Pointer(), Offset: input.Offset.Pointer(), Limit: input.Limit.Pointer()})
		if err != nil {
			return nil, httpx.NewProtocolProblemError(ctx, err)
		}
		return &listTodosOutput{Body: result}, nil
	})
}

// HumaSlice 返回可由 composition 显式装配的无资源 registration。
func HumaSlice(operations todohandler.Operations) humabinding.Registration {
	return func(api huma.API) { RegisterHumaSlice(api, operations) }
}
