package httpbinding

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	organizationhandler "github.com/rin721/go-scaffold-template/internal/module/organization/handler"
	"github.com/rin721/go-scaffold-template/internal/transport/http/humabinding"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

type updateDepartmentInput struct {
	ID   string `path:"id" minLength:"1" maxLength:"36"`
	Body organizationhandler.UpdateDepartmentRequest
}

type updateDepartmentOutput struct {
	Body organizationhandler.Department
}

// RegisterHumaSlice 注册 Organization 的 path + version mutation 第一片。
func RegisterHumaSlice(api huma.API, operations organizationhandler.Operations) {
	operation := humabinding.JSONOperation(huma.Operation{
		OperationID: "organization.departments.update",
		Method:      http.MethodPatch,
		Path:        "/api/v1/organization/departments/{id}",
		Tags:        []string{"Organization"},
		Summary:     "Update an organization department",
	}, string(contract.SecurityBearer))
	huma.Register(api, operation, func(ctx context.Context, input *updateDepartmentInput) (*updateDepartmentOutput, error) {
		input.Body.ID = input.ID
		result, err := operations.UpdateDepartment(ctx, input.Body)
		if err != nil {
			return nil, httpx.NewProtocolProblemError(ctx, err)
		}
		return &updateDepartmentOutput{Body: result}, nil
	})
}

// HumaSlice 返回可由 composition 显式装配的无资源 registration。
func HumaSlice(operations organizationhandler.Operations) humabinding.Registration {
	return func(api huma.API) { RegisterHumaSlice(api, operations) }
}
