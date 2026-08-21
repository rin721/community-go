// Package httpbinding 声明 IAM 的 typed HTTP 契约并绑定运行时 handler。
package httpbinding

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	iampermission "github.com/rin721/go-scaffold-template/internal/module/iam/binding/permission"
	"github.com/rin721/go-scaffold-template/internal/module/iam/model"
	"github.com/rin721/go-scaffold-template/internal/module/iam/repo"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

const (
	opSetup               contract.OperationID = "iam.setup"
	opLogin               contract.OperationID = "iam.login"
	opSession             contract.OperationID = "iam.session.read"
	opLogout              contract.OperationID = "iam.logout"
	opChangePassword      contract.OperationID = "iam.self.password.change"
	opAccounts            contract.OperationID = "iam.accounts.list"
	opCreateAccount       contract.OperationID = "iam.accounts.create"
	opAccountStatus       contract.OperationID = "iam.accounts.status"
	opResetPassword       contract.OperationID = "iam.accounts.password.reset"
	opAccountRolesRead    contract.OperationID = "iam.accounts.roles.read"
	opAccountRoles        contract.OperationID = "iam.accounts.roles.replace"
	opRoles               contract.OperationID = "iam.roles.list"
	opCreateRole          contract.OperationID = "iam.roles.create"
	opRolePermissionsRead contract.OperationID = "iam.roles.permissions.read"
	opRolePermissions     contract.OperationID = "iam.roles.permissions.replace"
	opPermissions         contract.OperationID = "iam.permissions.list"
)

var accountSchema = contract.Object().Required("id", "username", "displayName", "status", "mustChangePassword", "securityRevision", "version").Prop("id", contract.String()).Prop("username", contract.String()).Prop("displayName", contract.String()).Prop("status", contract.String().Enum("active", "disabled")).Prop("mustChangePassword", contract.Boolean()).Prop("securityRevision", contract.Int64()).Prop("version", contract.Int64())
var roleSchema = contract.Object().Required("id", "code", "name", "active", "archived", "system", "version").Prop("id", contract.String()).Prop("code", contract.String()).Prop("name", contract.String()).Prop("description", contract.String()).Prop("active", contract.Boolean()).Prop("archived", contract.Boolean()).Prop("system", contract.Boolean()).Prop("version", contract.Int64())
var accountListSchema = contract.Object().Required("items", "offset", "limit", "total").Prop("items", contract.Array(contract.Ref("IAMAccount"))).Prop("offset", contract.Integer()).Prop("limit", contract.Integer()).Prop("total", contract.Int64())
var roleListSchema = contract.Object().Required("items", "offset", "limit", "total").Prop("items", contract.Array(contract.Ref("IAMRole"))).Prop("offset", contract.Integer()).Prop("limit", contract.Integer()).Prop("total", contract.Int64())
var permissionSchema = contract.Object().Required("key", "ownerModuleId", "descriptionMessageId").Prop("key", contract.String()).Prop("ownerModuleId", contract.String()).Prop("descriptionMessageId", contract.String())
var identitySchema = contract.Object().Required("accountId", "username", "displayName", "permissions", "mustChangePassword", "securityRevision").Prop("accountId", contract.String()).Prop("username", contract.String()).Prop("displayName", contract.String()).Prop("permissions", contract.Array(contract.String())).Prop("mustChangePassword", contract.Boolean()).Prop("securityRevision", contract.Int64())
var sessionSchema = contract.Object().Required("identity", "csrfToken", "createdAt", "idleExpiresAt", "absoluteExpiresAt").Prop("identity", contract.Ref("IAMIdentity")).Prop("csrfToken", contract.String()).Prop("createdAt", contract.String().Format("date-time")).Prop("idleExpiresAt", contract.String().Format("date-time")).Prop("absoluteExpiresAt", contract.String().Format("date-time"))
var setupRequestSchema = contract.Object().Required("setupToken", "username", "displayName", "password").Prop("setupToken", contract.String().MinLength(1).MaxLength(512)).Prop("username", contract.String().MinLength(3).MaxLength(64)).Prop("displayName", contract.String().MinLength(1).MaxLength(128)).Prop("password", contract.String().MinLength(15).MaxLength(128))
var loginRequestSchema = contract.Object().Required("username", "password").Prop("username", contract.String().MinLength(3).MaxLength(64)).Prop("password", contract.String().MinLength(1).MaxLength(128))
var changePasswordRequestSchema = contract.Object().Required("currentPassword", "newPassword").Prop("currentPassword", contract.String().MinLength(1).MaxLength(128)).Prop("newPassword", contract.String().MinLength(15).MaxLength(128))
var createAccountRequestSchema = contract.Object().Required("username", "displayName", "password").Prop("username", contract.String().MinLength(3).MaxLength(64)).Prop("displayName", contract.String().MinLength(1).MaxLength(128)).Prop("password", contract.String().MinLength(15).MaxLength(128))
var createRoleRequestSchema = contract.Object().Required("code", "name").Prop("code", contract.String().MinLength(2).MaxLength(64)).Prop("name", contract.String().MinLength(1).MaxLength(128)).Prop("description", contract.String().MaxLength(1024))

func ModuleContract() contract.Module {
	return contract.Module{ID: "iam", Name: "IAM", Description: "身份、凭据、会话与 Core RBAC。", SecuritySchemes: []contract.SecurityScheme{{ID: contract.SecurityBearer, Kind: contract.SecuritySchemeHTTPBearer}, {ID: contract.SecurityWebUISession, Kind: contract.SecuritySchemeAPIKeyCookie, ParameterName: service.SessionCookieName}}, Schemas: []*contract.Schema{accountSchema.Named("IAMAccount"), roleSchema.Named("IAMRole"), identitySchema.Named("IAMIdentity"), sessionSchema.Named("IAMSession")}, Operations: []contract.Operation{
		public(opSetup, contract.MethodPost, "/api/v1/iam/setup", contract.Ref("IAMSession")), public(opLogin, contract.MethodPost, "/api/v1/iam/login", contract.Ref("IAMSession")), protected(opSession, contract.MethodGet, "/api/v1/iam/session", string(iampermission.SelfRead), contract.Ref("IAMSession")), protected(opLogout, contract.MethodPost, "/api/v1/iam/logout", string(iampermission.SelfRead), contract.Object()), protected(opChangePassword, contract.MethodPost, "/api/v1/iam/self/password", string(iampermission.SelfPasswordWrite), contract.Object()),
		protectedList(opAccounts, "/api/v1/iam/accounts", string(iampermission.AccountRead), accountListSchema), protected(opCreateAccount, contract.MethodPost, "/api/v1/iam/accounts", string(iampermission.AccountWrite), contract.Ref("IAMAccount")), protectedPath(opAccountStatus, contract.MethodPatch, "/api/v1/iam/accounts/{id}/status", string(iampermission.AccountWrite)), protectedPath(opResetPassword, contract.MethodPost, "/api/v1/iam/accounts/{id}/password-reset", string(iampermission.AccountWrite)), protectedPathResponse(opAccountRolesRead, contract.MethodGet, "/api/v1/iam/accounts/{id}/roles", string(iampermission.AccountRead), contract.Array(contract.String())), protectedPath(opAccountRoles, contract.MethodPut, "/api/v1/iam/accounts/{id}/roles", string(iampermission.AccountWrite)),
		protectedList(opRoles, "/api/v1/iam/roles", string(iampermission.RoleRead), roleListSchema), protected(opCreateRole, contract.MethodPost, "/api/v1/iam/roles", string(iampermission.RoleWrite), contract.Ref("IAMRole")), protectedPathResponse(opRolePermissionsRead, contract.MethodGet, "/api/v1/iam/roles/{id}/permissions", string(iampermission.RoleRead), contract.Array(contract.String())), protectedPath(opRolePermissions, contract.MethodPut, "/api/v1/iam/roles/{id}/permissions", string(iampermission.RoleWrite)), protected(opPermissions, contract.MethodGet, "/api/v1/iam/permissions", string(iampermission.PermissionRead), contract.Array(permissionSchema)),
	}}
}
func protectedList(id contract.OperationID, path, scope string, response *contract.Schema) contract.Operation {
	value := protected(id, contract.MethodGet, path, scope, response)
	value.Params = []contract.Param{{Name: "offset", Location: contract.ParamQuery, Required: false, Schema: contract.Integer().Min(0).Default(0)}, {Name: "limit", Location: contract.ParamQuery, Required: false, Schema: contract.Integer().Min(1).Max(100).Default(20)}}
	return value
}
func public(id contract.OperationID, method contract.Method, path string, response *contract.Schema) contract.Operation {
	return contract.Operation{ID: id, Method: method, Path: path, Tags: []string{"IAM"}, Security: contract.SecurityNone, Policy: contract.Policy{Mode: contract.PolicyModePublic}, Params: mutationParams(method, false), Request: requestFor(id, method), Responses: []contract.Response{{Status: successStatus(id, method), Schema: response}}}
}
func protected(id contract.OperationID, method contract.Method, path, scope string, response *contract.Schema) contract.Operation {
	status := successStatus(id, method)
	if status == http.StatusNoContent {
		response = nil
	}
	return contract.Operation{ID: id, Method: method, Path: path, Tags: []string{"IAM"}, Security: contract.SecurityWebUISession, Policy: contract.Policy{Mode: contract.PolicyModeProtected, Scope: scope, Action: string(id)}, Params: mutationParams(method, true), Request: requestFor(id, method), Responses: []contract.Response{{Status: status, Schema: response}}}
}
func protectedPath(id contract.OperationID, method contract.Method, path, scope string) contract.Operation {
	value := protected(id, method, path, scope, contract.Object())
	value.Params = append(value.Params, contract.Param{Name: "id", Location: contract.ParamPath, Required: true, Schema: contract.String()})
	return value
}
func protectedPathResponse(id contract.OperationID, method contract.Method, path, scope string, response *contract.Schema) contract.Operation {
	value := protected(id, method, path, scope, response)
	value.Params = append(value.Params, contract.Param{Name: "id", Location: contract.ParamPath, Required: true, Schema: contract.String()})
	return value
}
func mutationParams(method contract.Method, csrf bool) []contract.Param {
	if method == contract.MethodGet {
		return nil
	}
	params := []contract.Param{{Name: "Origin", Location: contract.ParamHeader, Required: true, Schema: contract.String()}}
	if csrf {
		params = append(params, contract.Param{Name: "X-CSRF-Token", Location: contract.ParamHeader, Required: true, Schema: contract.String()})
	}
	return params
}
func requestFor(id contract.OperationID, method contract.Method) *contract.Request {
	if method == contract.MethodGet {
		return nil
	}
	schema := contract.Object()
	switch id {
	case opSetup:
		schema = setupRequestSchema
	case opLogin:
		schema = loginRequestSchema
	case opChangePassword:
		schema = changePasswordRequestSchema
	case opCreateAccount:
		schema = createAccountRequestSchema
	case opAccountStatus:
		schema = contract.Object().Required("status").Prop("status", contract.String().Enum("active", "disabled"))
	case opResetPassword:
		schema = contract.Object().Required("password").Prop("password", contract.String().MinLength(15).MaxLength(128))
	case opAccountRoles:
		schema = contract.Object().Required("roleIDs").Prop("roleIDs", contract.Array(contract.String()))
	case opCreateRole:
		schema = createRoleRequestSchema
	case opRolePermissions:
		schema = contract.Object().Required("permissionKeys").Prop("permissionKeys", contract.Array(contract.String()))
	}
	return &contract.Request{Schema: schema}
}
func successStatus(id contract.OperationID, method contract.Method) int {
	if id == opSetup || id == opCreateAccount || id == opCreateRole {
		return http.StatusCreated
	}
	if method != contract.MethodGet && id != opLogin {
		return http.StatusNoContent
	}
	return http.StatusOK
}

type Handler struct {
	service        *service.Service
	allowedOrigins map[string]struct{}
}

func NewHandler(iam *service.Service, allowedOrigins []string) (*Handler, error) {
	if iam == nil {
		return nil, errors.New("iam HTTP service is nil")
	}
	values := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		values[origin] = struct{}{}
	}
	return &Handler{service: iam, allowedOrigins: values}, nil
}
func RuntimeHandlers(handler *Handler) map[contract.OperationID]contract.Handler {
	if handler == nil {
		return nil
	}
	return map[contract.OperationID]contract.Handler{opSetup: handler.wrap(handler.setup), opLogin: handler.wrap(handler.login), opSession: handler.wrap(handler.session), opLogout: handler.wrap(handler.logout), opChangePassword: handler.wrap(handler.changePassword), opAccounts: handler.wrap(handler.accounts), opCreateAccount: handler.wrap(handler.createAccount), opAccountStatus: handler.wrap(handler.accountStatus), opResetPassword: handler.wrap(handler.resetPassword), opAccountRolesRead: handler.wrap(handler.accountRolesRead), opAccountRoles: handler.wrap(handler.accountRoles), opRoles: handler.wrap(handler.roles), opCreateRole: handler.wrap(handler.createRole), opRolePermissionsRead: handler.wrap(handler.rolePermissionsRead), opRolePermissions: handler.wrap(handler.rolePermissions), opPermissions: handler.wrap(handler.permissions)}
}

type handlerFunc func(http.ResponseWriter, *http.Request) error

func (h *Handler) wrap(fn handlerFunc) contract.Handler { return contractHandler(fn) }

type contractHandler handlerFunc

func (fn contractHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) error { return fn(w, r) }

func (h *Handler) setup(w http.ResponseWriter, r *http.Request) error {
	if !h.originAllowed(r) {
		return statusError(http.StatusForbidden, "origin_rejected", nil)
	}
	var input struct{ SetupToken, Username, DisplayName, Password string }
	if decode(r, &input) != nil {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	session, err := h.service.Setup(r.Context(), input.SetupToken, input.Username, input.DisplayName, input.Password)
	if err != nil {
		return serviceError(err)
	}
	writeSession(w, session, http.StatusCreated)
	return nil
}
func (h *Handler) login(w http.ResponseWriter, r *http.Request) error {
	if !h.originAllowed(r) {
		return statusError(http.StatusForbidden, "origin_rejected", nil)
	}
	var input struct{ Username, Password string }
	if decode(r, &input) != nil {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	session, err := h.service.Login(r.Context(), input.Username, input.Password)
	if err != nil {
		return serviceError(err)
	}
	writeSession(w, session, 200)
	return nil
}
func (h *Handler) session(w http.ResponseWriter, r *http.Request) error {
	id, current, ok := service.SessionFromContext(r.Context())
	if !ok {
		return statusError(http.StatusUnauthorized, "unauthenticated", nil)
	}
	csrf, err := h.service.RotateCSRF(r.Context(), id)
	if err != nil {
		return statusError(http.StatusUnauthorized, "unauthenticated", err)
	}
	current.CSRFToken = csrf
	writeSession(w, current, 200)
	return nil
}
func (h *Handler) logout(w http.ResponseWriter, r *http.Request) error {
	id, _, ok := service.SessionFromContext(r.Context())
	if !ok || !h.mutationAllowed(r, id) {
		return statusError(http.StatusForbidden, "csrf_rejected", nil)
	}
	if err := h.service.Logout(r.Context(), id); err != nil {
		return statusError(http.StatusInternalServerError, "internal_server_error", err)
	}
	http.SetCookie(w, &http.Cookie{Name: service.SessionCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})
	w.WriteHeader(204)
	return nil
}
func (h *Handler) changePassword(w http.ResponseWriter, r *http.Request) error {
	id, current, ok := service.SessionFromContext(r.Context())
	if !ok || !h.mutationAllowed(r, id) {
		return statusError(http.StatusForbidden, "csrf_rejected", nil)
	}
	var input struct{ CurrentPassword, NewPassword string }
	if decode(r, &input) != nil {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	if err := h.service.ChangePassword(r.Context(), current.Identity.AccountID, input.CurrentPassword, input.NewPassword); err != nil {
		return serviceError(err)
	}
	w.WriteHeader(204)
	return nil
}
func (h *Handler) accounts(w http.ResponseWriter, r *http.Request) error {
	offset, limit, ok := page(r)
	if !ok {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	result, err := h.service.ListAccounts(r.Context(), offset, limit)
	if err != nil {
		return statusError(http.StatusInternalServerError, "internal_server_error", err)
	}
	responses := make([]accountResponse, len(result.Items))
	for index, item := range result.Items {
		responses[index] = accountOutput(item)
	}
	writeJSON(w, 200, listResponse[accountResponse]{Items: responses, Offset: result.Offset, Limit: result.Limit, Total: result.Total})
	return nil
}
func (h *Handler) createAccount(w http.ResponseWriter, r *http.Request) error {
	if !h.requireMutation(r) {
		return statusError(http.StatusForbidden, "csrf_rejected", nil)
	}
	var input struct{ Username, DisplayName, Password string }
	if decode(r, &input) != nil {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	item, err := h.service.CreateAccount(r.Context(), input.Username, input.DisplayName, input.Password)
	if err != nil {
		return serviceError(err)
	}
	writeJSON(w, 201, accountOutput(item))
	return nil
}
func (h *Handler) accountStatus(w http.ResponseWriter, r *http.Request) error {
	if !h.requireMutation(r) {
		return statusError(http.StatusForbidden, "csrf_rejected", nil)
	}
	var input struct{ Status model.AccountStatus }
	if decode(r, &input) != nil {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	if err := h.service.SetAccountStatus(r.Context(), r.PathValue("id"), input.Status); err != nil {
		return serviceError(err)
	}
	w.WriteHeader(204)
	return nil
}
func (h *Handler) resetPassword(w http.ResponseWriter, r *http.Request) error {
	if !h.requireMutation(r) {
		return statusError(http.StatusForbidden, "csrf_rejected", nil)
	}
	var input struct{ Password string }
	if decode(r, &input) != nil {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	if err := h.service.ResetPassword(r.Context(), r.PathValue("id"), input.Password); err != nil {
		return serviceError(err)
	}
	w.WriteHeader(204)
	return nil
}
func (h *Handler) accountRoles(w http.ResponseWriter, r *http.Request) error {
	if !h.requireMutation(r) {
		return statusError(http.StatusForbidden, "csrf_rejected", nil)
	}
	var input struct{ RoleIDs []string }
	if decode(r, &input) != nil {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	if err := h.service.ReplaceAccountRoles(r.Context(), r.PathValue("id"), input.RoleIDs); err != nil {
		return serviceError(err)
	}
	w.WriteHeader(204)
	return nil
}
func (h *Handler) accountRolesRead(w http.ResponseWriter, r *http.Request) error {
	items, err := h.service.AccountRoleIDs(r.Context(), r.PathValue("id"))
	if err != nil {
		return serviceError(err)
	}
	writeJSON(w, 200, items)
	return nil
}
func (h *Handler) roles(w http.ResponseWriter, r *http.Request) error {
	offset, limit, ok := page(r)
	if !ok {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	result, err := h.service.ListRoles(r.Context(), offset, limit)
	if err != nil {
		return statusError(http.StatusInternalServerError, "internal_server_error", err)
	}
	responses := make([]roleResponse, len(result.Items))
	for index, item := range result.Items {
		responses[index] = roleOutput(item)
	}
	writeJSON(w, 200, listResponse[roleResponse]{Items: responses, Offset: result.Offset, Limit: result.Limit, Total: result.Total})
	return nil
}
func (h *Handler) createRole(w http.ResponseWriter, r *http.Request) error {
	if !h.requireMutation(r) {
		return statusError(http.StatusForbidden, "csrf_rejected", nil)
	}
	var input struct{ Code, Name, Description string }
	if decode(r, &input) != nil {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	item, err := h.service.CreateRole(r.Context(), input.Code, input.Name, input.Description)
	if err != nil {
		return serviceError(err)
	}
	writeJSON(w, 201, roleOutput(item))
	return nil
}
func (h *Handler) rolePermissions(w http.ResponseWriter, r *http.Request) error {
	if !h.requireMutation(r) {
		return statusError(http.StatusForbidden, "csrf_rejected", nil)
	}
	var input struct{ PermissionKeys []permissioncatalog.Key }
	if decode(r, &input) != nil {
		return statusError(http.StatusBadRequest, "invalid_request", nil)
	}
	if err := h.service.ReplaceRolePermissions(r.Context(), r.PathValue("id"), input.PermissionKeys); err != nil {
		return serviceError(err)
	}
	w.WriteHeader(204)
	return nil
}
func (h *Handler) rolePermissionsRead(w http.ResponseWriter, r *http.Request) error {
	items, err := h.service.RolePermissionKeys(r.Context(), r.PathValue("id"))
	if err != nil {
		return serviceError(err)
	}
	writeJSON(w, 200, items)
	return nil
}
func (h *Handler) permissions(w http.ResponseWriter, _ *http.Request) error {
	definitions := h.service.Permissions()
	responses := make([]permissionResponse, len(definitions))
	for index, item := range definitions {
		responses[index] = permissionResponse{Key: string(item.Key), OwnerModuleID: string(item.OwnerModuleID), DescriptionMessageID: item.DescriptionMessageID}
	}
	writeJSON(w, 200, responses)
	return nil
}

func (h *Handler) requireMutation(r *http.Request) bool {
	id, _, ok := service.SessionFromContext(r.Context())
	return ok && h.mutationAllowed(r, id)
}
func (h *Handler) mutationAllowed(r *http.Request, id string) bool {
	return h.originAllowed(r) && h.service.ValidateCSRF(r.Context(), id, r.Header.Get("X-CSRF-Token")) == nil
}
func (h *Handler) originAllowed(r *http.Request) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return false
	}
	if httpx.SameOrigin(r, origin) {
		return true
	}
	_, ok := h.allowedOrigins[origin]
	return ok
}
func decode(r *http.Request, target any) error {
	if r.Body == nil {
		return io.EOF
	}
	decoder := json.NewDecoder(io.LimitReader(r.Body, 32<<10))
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}
func writeSession(w http.ResponseWriter, value service.Session, status int) {
	http.SetCookie(w, &http.Cookie{Name: service.SessionCookieName, Value: value.ID, Path: "/", HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})
	writeJSON(w, status, sessionResponse{Identity: identityResponse{AccountID: value.Identity.AccountID, Username: value.Identity.Username, DisplayName: value.Identity.DisplayName, Permissions: value.Identity.Permissions, MustChangePassword: value.Identity.MustChangePassword, SecurityRevision: value.Identity.SecurityRevision}, CSRFToken: value.CSRFToken, CreatedAt: value.CreatedAt, IdleExpiresAt: value.IdleExpiresAt, AbsoluteExpiresAt: value.AbsoluteExpiresAt})
}

type identityResponse struct {
	AccountID          string                  `json:"accountId"`
	Username           string                  `json:"username"`
	DisplayName        string                  `json:"displayName"`
	Permissions        []permissioncatalog.Key `json:"permissions"`
	MustChangePassword bool                    `json:"mustChangePassword"`
	SecurityRevision   uint64                  `json:"securityRevision"`
}
type sessionResponse struct {
	Identity          identityResponse `json:"identity"`
	CSRFToken         string           `json:"csrfToken"`
	CreatedAt         time.Time        `json:"createdAt"`
	IdleExpiresAt     time.Time        `json:"idleExpiresAt"`
	AbsoluteExpiresAt time.Time        `json:"absoluteExpiresAt"`
}
type accountResponse struct {
	ID                 string              `json:"id"`
	Username           string              `json:"username"`
	DisplayName        string              `json:"displayName"`
	Status             model.AccountStatus `json:"status"`
	MustChangePassword bool                `json:"mustChangePassword"`
	SecurityRevision   uint64              `json:"securityRevision"`
	Version            uint64              `json:"version"`
}
type roleResponse struct {
	ID          string `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Active      bool   `json:"active"`
	Archived    bool   `json:"archived"`
	System      bool   `json:"system"`
	Version     uint64 `json:"version"`
}
type permissionResponse struct {
	Key                  string `json:"key"`
	OwnerModuleID        string `json:"ownerModuleId"`
	DescriptionMessageID string `json:"descriptionMessageId"`
}
type listResponse[T any] struct {
	Items  []T   `json:"items"`
	Offset int   `json:"offset"`
	Limit  int   `json:"limit"`
	Total  int64 `json:"total"`
}

func accountOutput(value model.Account) accountResponse {
	return accountResponse{ID: value.ID, Username: value.Username, DisplayName: value.DisplayName, Status: value.Status, MustChangePassword: value.MustChangePassword, SecurityRevision: value.SecurityRevision, Version: value.Version}
}
func roleOutput(value model.Role) roleResponse {
	return roleResponse{ID: value.ID, Code: value.Code, Name: value.Name, Description: value.Description, Active: value.Active, Archived: value.Archived, System: value.System, Version: value.Version}
}
func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func serviceError(err error) error {
	switch {
	case errors.Is(err, model.ErrInvalidUsername), errors.Is(err, model.ErrInvalidName), errors.Is(err, model.ErrInvalidPassword):
		return statusError(http.StatusBadRequest, "invalid_request", err)
	case errors.Is(err, service.ErrInvalidCredentials):
		return statusError(http.StatusUnauthorized, "invalid_credentials", err)
	case errors.Is(err, service.ErrAccountLocked):
		return statusError(http.StatusTooManyRequests, "account_locked", err)
	case errors.Is(err, service.ErrAccountDisabled):
		return statusError(http.StatusForbidden, "account_disabled", err)
	case errors.Is(err, service.ErrSetupClosed), errors.Is(err, model.ErrOwnerInvariant), errors.Is(err, service.ErrImmutableOwner), errors.Is(err, service.ErrUnknownPermission):
		return statusError(http.StatusConflict, "conflict", err)
	case repo.IsDuplicate(err), repo.IsConflict(err):
		return statusError(http.StatusConflict, "conflict", err)
	case repo.IsNotFound(err):
		return statusError(http.StatusNotFound, "not_found", err)
	default:
		return statusError(http.StatusInternalServerError, "internal_server_error", err)
	}
}
func page(r *http.Request) (int, int, bool) {
	parse := func(name string) (int, bool) {
		value := r.URL.Query().Get(name)
		if value == "" {
			return 0, true
		}
		parsed, err := strconv.Atoi(value)
		return parsed, err == nil
	}
	offset, offsetOK := parse("offset")
	limit, limitOK := parse("limit")
	return offset, limit, offsetOK && limitOK && offset >= 0 && limit >= 0 && limit <= 100
}
func statusError(status int, code string, err error) error {
	return &httpx.StatusError{StatusCode: status, Code: code, Message: code, Err: err}
}
