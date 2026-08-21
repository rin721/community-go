package composition

import (
	"fmt"
	"net/http"

	"github.com/rin721/go-scaffold-template/internal/module/auth"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	"github.com/rin721/go-scaffold-template/internal/module/iam/repo"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
)

// iamSessionAuthAdapter 是 IAM identity 到通用 Auth Principal 的唯一装配适配器。
type iamSessionAuthAdapter struct{ service *service.Service }

func newIAMSessionAuthAdapter(value *service.Service) (auth.RequestAuthenticator, error) {
	if value == nil {
		return nil, fmt.Errorf("iam session service is nil")
	}
	return iamSessionAuthAdapter{service: value}, nil
}
func (a iamSessionAuthAdapter) AuthenticateRequest(request *http.Request) (*http.Request, error) {
	cookie, err := request.Cookie(service.SessionCookieName)
	if err != nil || cookie.Value == "" {
		return nil, service.ErrSessionInvalid
	}
	session, err := a.service.Resolve(request.Context(), cookie.Value)
	if err != nil {
		return nil, err
	}
	scopes := make([]authmodel.Scope, len(session.Identity.Permissions))
	for index, key := range session.Identity.Permissions {
		scopes[index] = authmodel.Scope(key)
	}
	principal, err := authmodel.NewPrincipal(session.Identity.AccountID, authmodel.ActorService, scopes, session.Identity.AuthenticatedAt, session.Identity.AuthenticatedAt)
	if err != nil {
		return nil, err
	}
	resolved := service.WithResolvedSession(request, cookie.Value, session)
	return resolved.WithContext(authmodel.WithPrincipal(resolved.Context(), principal)), nil
}

func adaptIAMDatabaseAccess(access repo.Access) (repo.Access, error) {
	if access == nil {
		return nil, fmt.Errorf("iam database access is nil")
	}
	return access, nil
}

var _ auth.RequestAuthenticator = iamSessionAuthAdapter{}
