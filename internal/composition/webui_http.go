package composition

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

// newWebUIManifestHandler 把 Auth policy 接到纯 WebUI Catalog，不让 Catalog 反向依赖业务模块。
func newWebUIManifestHandler(catalog webuicontract.Catalog, policy webuicontract.NavigationPolicySnapshot, authorizer operationAuthorizer, availabilityLookup func(string) webuicontract.Availability) (http.Handler, error) {
	if policy.Revision == "" {
		return nil, fmt.Errorf("webui navigation policy snapshot is empty")
	}
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		manifest, err := catalog.ManifestForWithNavigation(policy, func(operation string) webuicontract.Access {
			if operation == "" {
				return webuicontract.AccessAllowed
			}
			principal, authenticated := authmodel.PrincipalFromContext(request.Context())
			if !authenticated {
				return webuicontract.AccessAuthenticationRequired
			}
			if authorizer == nil {
				return webuicontract.AccessDenied
			}
			if err := authorizer.EnforceOperation(request.Context(), principal, operation); err != nil {
				if errors.Is(err, authmodel.ErrUnauthenticated) {
					return webuicontract.AccessAuthenticationRequired
				}
				return webuicontract.AccessDenied
			}
			return webuicontract.AccessAllowed
		}, availabilityLookup)
		if err != nil {
			http.Error(writer, "webui manifest unavailable", http.StatusServiceUnavailable)
			return
		}
		writer.Header().Set("Cache-Control", "no-store")
		writer.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(writer).Encode(manifest)
	}), nil
}
