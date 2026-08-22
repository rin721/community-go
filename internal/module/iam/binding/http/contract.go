// Package httpbinding 通过项目 HTTP 边界发布 IAM 能力。
package httpbinding

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/rin721/go-scaffold-template/internal/module/iam/model"
	"github.com/rin721/go-scaffold-template/internal/module/iam/repo"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
)

const (
	opSetup               = "iam.setup"
	opLogin               = "iam.login"
	opSession             = "iam.session.read"
	opLogout              = "iam.logout"
	opChangePassword      = "iam.self.password.change"
	opAccounts            = "iam.accounts.list"
	opCreateAccount       = "iam.accounts.create"
	opAccountStatus       = "iam.accounts.status"
	opResetPassword       = "iam.accounts.password.reset"
	opAccountRolesRead    = "iam.accounts.roles.read"
	opAccountRoles        = "iam.accounts.roles.replace"
	opRoles               = "iam.roles.list"
	opCreateRole          = "iam.roles.create"
	opRolePermissionsRead = "iam.roles.permissions.read"
	opRolePermissions     = "iam.roles.permissions.replace"
	opPermissions         = "iam.permissions.list"
)

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
	Status             model.AccountStatus `json:"status" enum:"active,disabled"`
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

func accountOutput(v model.Account) accountResponse {
	return accountResponse{v.ID, v.Username, v.DisplayName, v.Status, v.MustChangePassword, v.SecurityRevision, v.Version}
}
func roleOutput(v model.Role) roleResponse {
	return roleResponse{v.ID, v.Code, v.Name, v.Description, v.Active, v.Archived, v.System, v.Version}
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
	case errors.Is(err, service.ErrSetupClosed), errors.Is(err, model.ErrOwnerInvariant), errors.Is(err, service.ErrImmutableOwner), errors.Is(err, service.ErrUnknownPermission), repo.IsDuplicate(err), repo.IsConflict(err):
		return statusError(http.StatusConflict, "conflict", err)
	case repo.IsNotFound(err):
		return statusError(http.StatusNotFound, "not_found", err)
	default:
		return statusError(http.StatusInternalServerError, "internal_server_error", err)
	}
}
func statusError(status int, code string, err error) error {
	return &httpx.StatusError{StatusCode: status, Code: code, Message: code, Err: err}
}
