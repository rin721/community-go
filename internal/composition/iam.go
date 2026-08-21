package composition

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/rin721/go-scaffold-template/internal/module/auth"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	"github.com/rin721/go-scaffold-template/internal/module/iam/repo"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
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

// iamMutationGuardAdapter 在 composition 把 IAM Session 协议校验提供给普通业务 HTTP binding。
type iamMutationGuardAdapter struct {
	service        mutationSessionService
	allowedOrigins map[string]struct{}
}

type mutationSessionService interface {
	ValidateCSRF(context.Context, string, string) error
}

func newIAMMutationGuard(value mutationSessionService, allowedOrigins []string) (iamMutationGuardAdapter, error) {
	if nilDependency(value) {
		return iamMutationGuardAdapter{}, fmt.Errorf("iam mutation guard service is nil")
	}
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowed[origin] = struct{}{}
		}
	}
	return iamMutationGuardAdapter{service: value, allowedOrigins: allowed}, nil
}
func (adapter iamMutationGuardAdapter) ValidateMutation(request *http.Request) error {
	if request == nil {
		return &httpx.StatusError{StatusCode: http.StatusForbidden, Code: "csrf_invalid", Message: "mutation request is invalid"}
	}
	origin := strings.TrimSpace(request.Header.Get("Origin"))
	if origin == "" {
		return &httpx.StatusError{StatusCode: http.StatusForbidden, Code: "csrf_invalid", Message: "origin is required"}
	}
	if !httpx.SameOrigin(request, origin) {
		if _, ok := adapter.allowedOrigins[origin]; !ok {
			return &httpx.StatusError{StatusCode: http.StatusForbidden, Code: "csrf_invalid", Message: "origin is not allowed"}
		}
	}
	id, _, ok := service.SessionFromContext(request.Context())
	if !ok || adapter.service.ValidateCSRF(request.Context(), id, request.Header.Get("X-CSRF-Token")) != nil {
		return &httpx.StatusError{StatusCode: http.StatusForbidden, Code: "csrf_invalid", Message: "CSRF token is invalid"}
	}
	return nil
}
