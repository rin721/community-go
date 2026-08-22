package httpbinding

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	iampermission "github.com/rin721/go-scaffold-template/internal/module/iam/binding/permission"
	"github.com/rin721/go-scaffold-template/internal/module/iam/model"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
	"github.com/rin721/go-scaffold-template/internal/transport/http/humabinding"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
)

type originInput struct {
	Origin string `header:"Origin" required:"true"`
}
type loginInput struct {
	Origin string `header:"Origin" required:"true"`
	Body   struct {
		Username string `json:"username" minLength:"3" maxLength:"64"`
		Password string `json:"password" minLength:"1" maxLength:"128"`
	}
}
type setupInput struct {
	Origin string `header:"Origin" required:"true"`
	Body   struct {
		SetupToken  string `json:"setupToken" minLength:"1" maxLength:"512"`
		Username    string `json:"username" minLength:"3" maxLength:"64"`
		DisplayName string `json:"displayName" minLength:"1" maxLength:"128"`
		Password    string `json:"password" minLength:"15" maxLength:"128"`
	}
}
type pageInput struct {
	Offset int `query:"offset" minimum:"0" default:"0"`
	Limit  int `query:"limit" minimum:"1" maximum:"100" default:"20"`
}
type idInput struct {
	ID string `path:"id"`
}
type mutationInput struct {
	ID        string `path:"id"`
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
}
type createAccountInput struct {
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		Username    string `json:"username" minLength:"3" maxLength:"64"`
		DisplayName string `json:"displayName" minLength:"1" maxLength:"128"`
		Password    string `json:"password" minLength:"15" maxLength:"128"`
	}
}
type statusInput struct {
	mutationInput
	Body struct {
		Status model.AccountStatus `json:"status" enum:"active,disabled"`
	}
}
type passwordInput struct {
	mutationInput
	Body struct {
		Password string `json:"password" minLength:"15" maxLength:"128"`
	}
}
type roleIDsInput struct {
	mutationInput
	Body struct {
		RoleIDs []string `json:"roleIds"`
	}
}
type permissionKeysInput struct {
	mutationInput
	Body struct {
		PermissionKeys []permissioncatalog.Key `json:"permissionKeys"`
	}
}
type changePasswordInput struct {
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		CurrentPassword string `json:"currentPassword" minLength:"1" maxLength:"128"`
		NewPassword     string `json:"newPassword" minLength:"15" maxLength:"128"`
	}
}
type createRoleInput struct {
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		Code        string `json:"code" minLength:"2" maxLength:"64"`
		Name        string `json:"name" minLength:"1" maxLength:"128"`
		Description string `json:"description" maxLength:"1024"`
	}
}

type sessionOutputEnvelope struct {
	SetCookie    string `header:"Set-Cookie"`
	CacheControl string `header:"Cache-Control"`
	Body         sessionResponse
}
type emptyOutput struct{}
type logoutOutput struct {
	SetCookie string `header:"Set-Cookie"`
}
type jsonOutput[T any] struct {
	CacheControl string `header:"Cache-Control"`
	Body         T
}

func definition(id, method, path, security, policy, scope, action string) huma.Operation {
	return humabinding.JSONDefinition(huma.Operation{OperationID: id, Method: method, Path: path, Tags: []string{"IAM"}}, humabinding.Definition{ID: id, Method: method, Path: path, Security: security, Policy: policy, Scope: scope, Action: action})
}
func protected(id, method, path, scope, action string) huma.Operation {
	_ = action
	return definition(id, method, path, humabinding.SecurityWebUISession, humabinding.PolicyProtected, scope, id)
}
func public(id, method, path string) huma.Operation {
	return definition(id, method, path, humabinding.SecurityNone, humabinding.PolicyPublic, "", "")
}
func problem(ctx context.Context, err error) error {
	return httpx.NewProtocolProblemError(ctx, serviceError(err))
}

// RegisterHuma 注册 IAM 的完整 typed HTTP 契约。Huma 类型只停留在模块 binding 边界。
func RegisterHuma(api huma.API, handler *Handler) {
	setup := public(opSetup, http.MethodPost, "/api/v1/iam/setup")
	setup.DefaultStatus = http.StatusCreated
	setup.Middlewares = huma.Middlewares{handler.requireOrigin}
	huma.Register(api, setup, func(ctx context.Context, in *setupInput) (*sessionOutputEnvelope, error) {
		v, err := handler.service.Setup(ctx, in.Body.SetupToken, in.Body.Username, in.Body.DisplayName, in.Body.Password)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return sessionEnvelope(v), nil
	})
	login := public(opLogin, http.MethodPost, "/api/v1/iam/login")
	login.Middlewares = huma.Middlewares{handler.requireOrigin}
	huma.Register(api, login, func(ctx context.Context, in *loginInput) (*sessionOutputEnvelope, error) {
		v, err := handler.service.Login(ctx, in.Body.Username, in.Body.Password)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return sessionEnvelope(v), nil
	})
	huma.Register(api, protected(opSession, http.MethodGet, "/api/v1/iam/session", string(iampermission.SelfRead), "read"), func(ctx context.Context, _ *struct{}) (*sessionOutputEnvelope, error) {
		id, current, ok := service.SessionFromContext(ctx)
		if !ok {
			return nil, httpx.NewProtocolProblemError(ctx, statusError(http.StatusUnauthorized, "unauthenticated", nil))
		}
		csrf, err := handler.service.RotateCSRF(ctx, id)
		if err != nil {
			return nil, httpx.NewProtocolProblemError(ctx, statusError(http.StatusUnauthorized, "unauthenticated", err))
		}
		current.CSRFToken = csrf
		return sessionEnvelope(current), nil
	})
	logout := protected(opLogout, http.MethodPost, "/api/v1/iam/logout", string(iampermission.SelfRead), "execute")
	logout.DefaultStatus = http.StatusNoContent
	logout.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, logout, func(ctx context.Context, _ *originInput) (*logoutOutput, error) {
		id, _, _ := service.SessionFromContext(ctx)
		if err := handler.service.Logout(ctx, id); err != nil {
			return nil, httpx.NewProtocolProblemError(ctx, statusError(http.StatusInternalServerError, "internal_server_error", err))
		}
		return &logoutOutput{SetCookie: expiredCookie()}, nil
	})
	change := protected(opChangePassword, http.MethodPost, "/api/v1/iam/self/password", string(iampermission.SelfPasswordWrite), "execute")
	change.DefaultStatus = http.StatusNoContent
	change.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, change, func(ctx context.Context, in *changePasswordInput) (*emptyOutput, error) {
		_, current, _ := service.SessionFromContext(ctx)
		if err := handler.service.ChangePassword(ctx, current.Identity.AccountID, in.Body.CurrentPassword, in.Body.NewPassword); err != nil {
			return nil, problem(ctx, err)
		}
		return &emptyOutput{}, nil
	})

	huma.Register(api, protected(opAccounts, http.MethodGet, "/api/v1/iam/accounts", string(iampermission.AccountRead), "list"), func(ctx context.Context, in *pageInput) (*jsonOutput[listResponse[accountResponse]], error) {
		result, err := handler.service.ListAccounts(ctx, in.Offset, in.Limit)
		if err != nil {
			return nil, problem(ctx, err)
		}
		items := make([]accountResponse, len(result.Items))
		for i, item := range result.Items {
			items[i] = accountOutput(item)
		}
		return jsonEnvelope(listResponse[accountResponse]{items, result.Offset, result.Limit, result.Total}), nil
	})
	createAccount := protected(opCreateAccount, http.MethodPost, "/api/v1/iam/accounts", string(iampermission.AccountWrite), "create")
	createAccount.DefaultStatus = http.StatusCreated
	createAccount.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, createAccount, func(ctx context.Context, in *createAccountInput) (*jsonOutput[accountResponse], error) {
		item, err := handler.service.CreateAccount(ctx, in.Body.Username, in.Body.DisplayName, in.Body.Password)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(accountOutput(item)), nil
	})
	registerMutation(api, handler, protected(opAccountStatus, http.MethodPatch, "/api/v1/iam/accounts/{id}/status", string(iampermission.AccountWrite), "update"), func(ctx context.Context, in *statusInput) error {
		return handler.service.SetAccountStatus(ctx, in.ID, in.Body.Status)
	})
	registerMutation(api, handler, protected(opResetPassword, http.MethodPost, "/api/v1/iam/accounts/{id}/password-reset", string(iampermission.AccountWrite), "execute"), func(ctx context.Context, in *passwordInput) error {
		return handler.service.ResetPassword(ctx, in.ID, in.Body.Password)
	})
	huma.Register(api, protected(opAccountRolesRead, http.MethodGet, "/api/v1/iam/accounts/{id}/roles", string(iampermission.AccountRead), "read"), func(ctx context.Context, in *idInput) (*jsonOutput[[]string], error) {
		items, err := handler.service.AccountRoleIDs(ctx, in.ID)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(items), nil
	})
	registerMutation(api, handler, protected(opAccountRoles, http.MethodPut, "/api/v1/iam/accounts/{id}/roles", string(iampermission.AccountWrite), "replace"), func(ctx context.Context, in *roleIDsInput) error {
		return handler.service.ReplaceAccountRoles(ctx, in.ID, in.Body.RoleIDs)
	})

	huma.Register(api, protected(opRoles, http.MethodGet, "/api/v1/iam/roles", string(iampermission.RoleRead), "list"), func(ctx context.Context, in *pageInput) (*jsonOutput[listResponse[roleResponse]], error) {
		result, err := handler.service.ListRoles(ctx, in.Offset, in.Limit)
		if err != nil {
			return nil, problem(ctx, err)
		}
		items := make([]roleResponse, len(result.Items))
		for i, item := range result.Items {
			items[i] = roleOutput(item)
		}
		return jsonEnvelope(listResponse[roleResponse]{items, result.Offset, result.Limit, result.Total}), nil
	})
	createRole := protected(opCreateRole, http.MethodPost, "/api/v1/iam/roles", string(iampermission.RoleWrite), "create")
	createRole.DefaultStatus = http.StatusCreated
	createRole.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, createRole, func(ctx context.Context, in *createRoleInput) (*jsonOutput[roleResponse], error) {
		item, err := handler.service.CreateRole(ctx, in.Body.Code, in.Body.Name, in.Body.Description)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(roleOutput(item)), nil
	})
	huma.Register(api, protected(opRolePermissionsRead, http.MethodGet, "/api/v1/iam/roles/{id}/permissions", string(iampermission.RoleRead), "read"), func(ctx context.Context, in *idInput) (*jsonOutput[[]permissioncatalog.Key], error) {
		items, err := handler.service.RolePermissionKeys(ctx, in.ID)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(items), nil
	})
	registerMutation(api, handler, protected(opRolePermissions, http.MethodPut, "/api/v1/iam/roles/{id}/permissions", string(iampermission.RoleWrite), "replace"), func(ctx context.Context, in *permissionKeysInput) error {
		return handler.service.ReplaceRolePermissions(ctx, in.ID, in.Body.PermissionKeys)
	})
	huma.Register(api, protected(opPermissions, http.MethodGet, "/api/v1/iam/permissions", string(iampermission.PermissionRead), "list"), func(_ context.Context, _ *struct{}) (*jsonOutput[[]permissionResponse], error) {
		definitions := handler.service.Permissions()
		items := make([]permissionResponse, len(definitions))
		for i, item := range definitions {
			items[i] = permissionResponse{string(item.Key), string(item.OwnerModuleID), item.DescriptionMessageID}
		}
		return jsonEnvelope(items), nil
	})
}

func registerMutation[I any](api huma.API, handler *Handler, operation huma.Operation, call func(context.Context, *I) error) {
	operation.DefaultStatus = http.StatusNoContent
	operation.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, operation, func(ctx context.Context, in *I) (*emptyOutput, error) {
		if err := call(ctx, in); err != nil {
			return nil, problem(ctx, err)
		}
		return &emptyOutput{}, nil
	})
}
func HumaRegistration(handler *Handler) humabinding.Registration {
	return func(api huma.API) { RegisterHuma(api, handler) }
}
func (handler *Handler) requireOrigin(ctx huma.Context, next func(huma.Context)) {
	request, writer := humabinding.UnwrapHTTP(ctx)
	if handler == nil || !handler.originAllowed(request) {
		httpx.WriteProblem(writer, request, statusError(http.StatusForbidden, "origin_rejected", nil))
		return
	}
	next(ctx)
}
func (handler *Handler) requireMutation(ctx huma.Context, next func(huma.Context)) {
	request, writer := humabinding.UnwrapHTTP(ctx)
	id, _, ok := service.SessionFromContext(request.Context())
	if !ok || handler == nil || !handler.originAllowed(request) || handler.service.ValidateCSRF(request.Context(), id, request.Header.Get("X-CSRF-Token")) != nil {
		httpx.WriteProblem(writer, request, statusError(http.StatusForbidden, "csrf_rejected", nil))
		return
	}
	next(ctx)
}
func sessionEnvelope(v service.Session) *sessionOutputEnvelope {
	return &sessionOutputEnvelope{SetCookie: sessionCookie(v.ID), CacheControl: "no-store", Body: sessionOutput(v)}
}
func sessionCookie(id string) string {
	return (&http.Cookie{Name: service.SessionCookieName, Value: id, Path: "/", HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode}).String()
}
func expiredCookie() string {
	return (&http.Cookie{Name: service.SessionCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode}).String()
}
func jsonEnvelope[T any](body T) *jsonOutput[T] {
	return &jsonOutput[T]{CacheControl: "no-store", Body: body}
}
func sessionOutput(v service.Session) sessionResponse {
	return sessionResponse{Identity: identityResponse{v.Identity.AccountID, v.Identity.Username, v.Identity.DisplayName, v.Identity.Permissions, v.Identity.MustChangePassword, v.Identity.SecurityRevision}, CSRFToken: v.CSRFToken, CreatedAt: v.CreatedAt, IdleExpiresAt: v.IdleExpiresAt, AbsoluteExpiresAt: v.AbsoluteExpiresAt}
}
