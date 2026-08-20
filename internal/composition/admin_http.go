package composition

import (
	"encoding/json"
	"errors"
	"net/http"

	admincontract "github.com/rin721/go-scaffold-template/internal/admin"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
)

// newAdminManifestHandler 把 Auth policy 接到纯 Admin Catalog，不让 Catalog 反向依赖业务模块。
func newAdminManifestHandler(catalog admincontract.Catalog, authorizer operationAuthorizer) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		manifest := catalog.ManifestFor(func(operation string) admincontract.Access {
			if operation == "" {
				return admincontract.AccessAllowed
			}
			principal, authenticated := authmodel.PrincipalFromContext(request.Context())
			if !authenticated {
				return admincontract.AccessAuthenticationRequired
			}
			if authorizer == nil {
				return admincontract.AccessDenied
			}
			if err := authorizer.EnforceOperation(request.Context(), principal, operation); err != nil {
				if errors.Is(err, authmodel.ErrUnauthenticated) {
					return admincontract.AccessAuthenticationRequired
				}
				return admincontract.AccessDenied
			}
			return admincontract.AccessAllowed
		})
		writer.Header().Set("Cache-Control", "no-store")
		writer.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(writer).Encode(manifest)
	})
}
