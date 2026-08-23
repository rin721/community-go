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
	Offset int    `query:"offset" minimum:"0" default:"0"`
	Limit  int    `query:"limit" minimum:"1" maximum:"100" default:"20"`
	Query  string `query:"query" maxLength:"128"`
}
type idInput struct {
	ID string `path:"id"`
}

// mutationInput 是带 {id} path 参数的 mutation 公共字段；huma 对 embedded
// struct 的 path 参数绑定不可靠，使用它的输入类型必须在自身结构体扁平声明。
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
	ID        string `path:"id"`
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		Status model.AccountStatus `json:"status" enum:"active,disabled"`
	}
}
type updateAccountInput struct {
	ID        string `path:"id"`
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		ExpectedAccountVersion uint64 `json:"expectedAccountVersion"`
		DisplayName            string `json:"displayName" minLength:"1" maxLength:"128"`
	}
}
type archiveInput struct {
	ID        string `path:"id"`
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
}
type passwordInput struct {
	ID        string `path:"id"`
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		Password string `json:"password" minLength:"15" maxLength:"128"`
	}
}

// roleIDsInput 扁平声明路径/Header 与 body，避免 embedded struct 的 path
// 参数绑定歧义；huma 只直接绑定本结构体字段。
type roleIDsInput struct {
	ID        string `path:"id"`
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		ExpectedAccountVersion uint64   `json:"expectedAccountVersion"`
		RoleIDs                []string `json:"roleIds"`
	}
}
type permissionKeysInput struct {
	ID        string `path:"id"`
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		ExpectedRoleVersion uint64                  `json:"expectedRoleVersion"`
		PermissionKeys      []permissioncatalog.Key `json:"permissionKeys"`
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
type updateSelfProfileInput struct {
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		ExpectedVersion uint64 `json:"expectedVersion"`
		Nickname        string `json:"nickname" maxLength:"64"`
		Bio             string `json:"bio" maxLength:"2048"`
		BirthDate       string `json:"birthDate" maxLength:"16"`
	}
}
type selfArchiveInput struct {
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		ConfirmationID string `json:"confirmationId"`
	}
}
type selfArchiveBeginOutput struct {
	ConfirmationID string `json:"confirmationId"`
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
type updateRoleInput struct {
	ID        string `path:"id"`
	Origin    string `header:"Origin" required:"true"`
	CSRFToken string `header:"X-CSRF-Token" required:"true"`
	Body      struct {
		ExpectedRoleVersion uint64 `json:"expectedRoleVersion"`
		Name                string `json:"name" minLength:"1" maxLength:"128"`
		Description         string `json:"description" maxLength:"1024"`
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

	// 072：自服务主页资料更新：昵称/介绍/出生日期（乐观锁），不撤销会话。
	selfProfile := protected(opSelfProfileUpdate, http.MethodPatch, "/api/v1/iam/self/profile", string(iampermission.SelfProfileWrite), "update")
	selfProfile.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, selfProfile, func(ctx context.Context, in *updateSelfProfileInput) (*jsonOutput[profileResponse], error) {
		_, current, _ := service.SessionFromContext(ctx)
		updated, err := handler.service.UpdateSelfProfile(ctx, current.Identity.AccountID, in.Body.ExpectedVersion, in.Body.Nickname, in.Body.Bio, in.Body.BirthDate)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(profileResponse{Username: updated.Username, Nickname: updated.Nickname, Bio: updated.Bio, BirthDate: updated.BirthDate, Version: updated.Version}), nil
	})

	// 072：自服务软注销（两步确认）：首调生成 confirmationId，二次确认归档并吊销会话。
	selfArchiveBegin := protected(opSelfArchive, http.MethodPost, "/api/v1/iam/self/archive", string(iampermission.SelfArchive), "archive")
	selfArchiveBegin.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, selfArchiveBegin, func(ctx context.Context, _ *selfArchiveInput) (*selfArchiveBeginOutput, error) {
		_, current, _ := service.SessionFromContext(ctx)
		confirmationID, err := handler.service.BeginSelfArchive(ctx, current.Identity.AccountID)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return &selfArchiveBeginOutput{ConfirmationID: confirmationID}, nil
	})
	selfArchiveConfirm := protected(opSelfArchiveConfirm, http.MethodPost, "/api/v1/iam/self/archive/confirm", string(iampermission.SelfArchive), "archive")
	selfArchiveConfirm.DefaultStatus = http.StatusNoContent
	selfArchiveConfirm.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, selfArchiveConfirm, func(ctx context.Context, in *selfArchiveInput) (*emptyOutput, error) {
		_, current, _ := service.SessionFromContext(ctx)
		if err := handler.service.ConfirmSelfArchive(ctx, current.Identity.AccountID, in.Body.ConfirmationID); err != nil {
			return nil, problem(ctx, err)
		}
		return &emptyOutput{}, nil
	})

	// 会话集中管理：列表（自助/管理员按账号）与批量吊销。
	// 列表返回摘要视图（IDHash hex），不泄露明文 SessionID。
	huma.Register(api, protected(opSessionList, http.MethodGet, "/api/v1/iam/sessions", string(iampermission.SelfRead), "list"), func(ctx context.Context, in *sessionListInput) (*jsonOutput[listResponse[sessionInfoResponse]], error) {
		accountID := in.AccountID
		if accountID == "" {
			_, current, ok := service.SessionFromContext(ctx)
			if !ok {
				return nil, httpx.NewProtocolProblemError(ctx, statusError(http.StatusUnauthorized, "unauthenticated", nil))
			}
			accountID = current.Identity.AccountID
		}
		items, err := handler.service.ListSessions(ctx, accountID)
		if err != nil {
			return nil, problem(ctx, err)
		}
		output := make([]sessionInfoResponse, len(items))
		for index, item := range items {
			output[index] = sessionInfoResponse{
				IDHash: item.IDHash, AccountID: item.AccountID,
				CreatedAt: item.CreatedAt, LastSeenAt: item.LastSeenAt,
				IdleExpiresAt: item.IdleExpiresAt, AbsoluteExpiresAt: item.AbsoluteExpiresAt,
				RevokedAt: item.RevokedAt,
			}
		}
		return jsonEnvelope(listResponse[sessionInfoResponse]{Items: output, Offset: 0, Limit: len(output), Total: int64(len(output))}), nil
	})
	revoke := protected(opSessionRevoke, http.MethodPost, "/api/v1/iam/sessions/revoke", string(iampermission.AccountWrite), "revoke")
	revoke.DefaultStatus = http.StatusNoContent
	revoke.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, revoke, func(ctx context.Context, in *sessionRevokeInput) (*emptyOutput, error) {
		_, current, ok := service.SessionFromContext(ctx)
		if !ok {
			return nil, httpx.NewProtocolProblemError(ctx, statusError(http.StatusUnauthorized, "unauthenticated", nil))
		}
		accountID := in.AccountID
		if accountID == "" {
			accountID = current.Identity.AccountID
		}
		if _, err := handler.service.RevokeSessions(ctx, accountID, in.Body.IDHashes); err != nil {
			return nil, problem(ctx, err)
		}
		return &emptyOutput{}, nil
	})

	huma.Register(api, protected(opAccounts, http.MethodGet, "/api/v1/iam/accounts", string(iampermission.AccountRead), "list"), func(ctx context.Context, in *pageInput) (*jsonOutput[listResponse[accountResponse]], error) {
		result, err := handler.service.ListAccounts(ctx, in.Offset, in.Limit, in.Query)
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
	registerMutation(api, handler, protected(opAccountUpdate, http.MethodPatch, "/api/v1/iam/accounts/{id}", string(iampermission.AccountWrite), "update"), func(ctx context.Context, in *updateAccountInput) error {
		return handler.service.UpdateAccountInfo(ctx, in.ID, in.Body.ExpectedAccountVersion, in.Body.DisplayName)
	})
	registerMutation(api, handler, protected(opAccountArchive, http.MethodPost, "/api/v1/iam/accounts/{id}/archive", string(iampermission.AccountWrite), "archive"), func(ctx context.Context, in *archiveInput) error {
		return handler.service.ArchiveAccount(ctx, in.ID)
	})
	registerMutation(api, handler, protected(opResetPassword, http.MethodPost, "/api/v1/iam/accounts/{id}/password-reset", string(iampermission.AccountWrite), "execute"), func(ctx context.Context, in *passwordInput) error {
		return handler.service.ResetPassword(ctx, in.ID, in.Body.Password)
	})
	huma.Register(api, protected(opAccountRolesRead, http.MethodGet, "/api/v1/iam/accounts/{id}/roles", string(iampermission.AccountRead), "read"), func(ctx context.Context, in *idInput) (*jsonOutput[accountRolesResponse], error) {
		view, err := handler.service.AccountRolesSnapshot(ctx, in.ID)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(accountRolesOutput(view)), nil
	})
	accountRolesReplace := protected(opAccountRoles, http.MethodPut, "/api/v1/iam/accounts/{id}/roles", string(iampermission.AccountWrite), "replace")
	accountRolesReplace.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, accountRolesReplace, func(ctx context.Context, in *roleIDsInput) (*jsonOutput[assignmentResponse], error) {
		result, err := handler.service.ReplaceAccountRoles(ctx, in.ID, in.Body.ExpectedAccountVersion, in.Body.RoleIDs)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(assignmentOutput(in.ID, result)), nil
	})

	huma.Register(api, protected(opRoles, http.MethodGet, "/api/v1/iam/roles", string(iampermission.RoleRead), "list"), func(ctx context.Context, in *pageInput) (*jsonOutput[listResponse[roleResponse]], error) {
		result, err := handler.service.ListRoles(ctx, in.Offset, in.Limit, in.Query)
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
	roleUpdate := protected(opRoleUpdate, http.MethodPatch, "/api/v1/iam/roles/{id}", string(iampermission.RoleWrite), "update")
	roleUpdate.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, roleUpdate, func(ctx context.Context, in *updateRoleInput) (*jsonOutput[roleResponse], error) {
		item, err := handler.service.UpdateRoleInfo(ctx, in.ID, in.Body.ExpectedRoleVersion, in.Body.Name, in.Body.Description)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(roleOutput(item)), nil
	})
	registerMutation(api, handler, protected(opRoleArchive, http.MethodPost, "/api/v1/iam/roles/{id}/archive", string(iampermission.RoleWrite), "archive"), func(ctx context.Context, in *archiveInput) error {
		return handler.service.ArchiveRole(ctx, in.ID)
	})
	huma.Register(api, protected(opRolePermissionsRead, http.MethodGet, "/api/v1/iam/roles/{id}/permissions", string(iampermission.RoleRead), "read"), func(ctx context.Context, in *idInput) (*jsonOutput[rolePermissionsResponse], error) {
		view, err := handler.service.RolePermissionsSnapshot(ctx, in.ID)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(rolePermissionsOutput(view)), nil
	})
	permissionsReplace := protected(opRolePermissions, http.MethodPut, "/api/v1/iam/roles/{id}/permissions", string(iampermission.RoleWrite), "replace")
	permissionsReplace.Middlewares = huma.Middlewares{handler.requireMutation}
	huma.Register(api, permissionsReplace, func(ctx context.Context, in *permissionKeysInput) (*jsonOutput[assignmentResponse], error) {
		result, err := handler.service.ReplaceRolePermissions(ctx, in.ID, in.Body.ExpectedRoleVersion, in.Body.PermissionKeys)
		if err != nil {
			return nil, problem(ctx, err)
		}
		return jsonEnvelope(assignmentOutput(in.ID, result)), nil
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
	return sessionResponse{Identity: identityResponse{v.Identity.AccountID, v.Identity.Username, v.Identity.DisplayName, v.Identity.Nickname, v.Identity.Bio, v.Identity.BirthDate, v.Identity.Permissions, v.Identity.MustChangePassword, v.Identity.SecurityRevision}, CSRFToken: v.CSRFToken, CreatedAt: v.CreatedAt, IdleExpiresAt: v.IdleExpiresAt, AbsoluteExpiresAt: v.AbsoluteExpiresAt}
}
