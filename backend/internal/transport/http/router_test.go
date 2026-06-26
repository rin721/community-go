package httptransport

// 本测试文件固定 HTTP 路由、中间件顺序和错误响应契约，防止注释补全和后续重构改变外部可观察行为。

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/open-console/console-platform/internal/app/testsupport"
	"github.com/open-console/console-platform/internal/middleware"
	announcementhandler "github.com/open-console/console-platform/internal/modules/announcements/handler"
	announcementservice "github.com/open-console/console-platform/internal/modules/announcements/service"
	communityhandler "github.com/open-console/console-platform/internal/modules/community/handler"
	communityservice "github.com/open-console/console-platform/internal/modules/community/service"
	iamhandler "github.com/open-console/console-platform/internal/modules/iam/handler"
	iammodel "github.com/open-console/console-platform/internal/modules/iam/model"
	iamservice "github.com/open-console/console-platform/internal/modules/iam/service"
	systemhandler "github.com/open-console/console-platform/internal/modules/system/handler"
	systemmodel "github.com/open-console/console-platform/internal/modules/system/model"
	systemservice "github.com/open-console/console-platform/internal/modules/system/service"
	"github.com/open-console/console-platform/internal/ports"
	"github.com/open-console/console-platform/pkg/web"
	appconstants "github.com/open-console/console-platform/types/constants"
	apperrors "github.com/open-console/console-platform/types/errors"
)

type fakeDatabase struct {
	ports.Database
	pingErr error
}

type capturedRouterWarning struct {
	message string
	fields  map[string]any
}

type captureRouterLogger struct {
	warnings []capturedRouterWarning
}

func (l *captureRouterLogger) Debug(string, ...interface{}) {}
func (l *captureRouterLogger) Info(string, ...interface{})  {}

func (l *captureRouterLogger) Warn(message string, keysAndValues ...interface{}) {
	warning := capturedRouterWarning{message: message, fields: make(map[string]any)}
	for i := 0; i+1 < len(keysAndValues); i += 2 {
		key, ok := keysAndValues[i].(string)
		if !ok || key == "" {
			continue
		}
		warning.fields[key] = keysAndValues[i+1]
	}
	l.warnings = append(l.warnings, warning)
}

func (l *captureRouterLogger) Error(string, ...interface{}) {}
func (l *captureRouterLogger) Fatal(string, ...interface{}) {}
func (l *captureRouterLogger) Sync() error                  { return nil }

func (l *captureRouterLogger) warning(message string) (capturedRouterWarning, bool) {
	for _, warning := range l.warnings {
		if warning.message == message {
			return warning, true
		}
	}
	return capturedRouterWarning{}, false
}

type fakeSetupHandler struct{}

func (fakeSetupHandler) Status(c ports.HTTPContext)     { c.JSON(http.StatusOK, map[string]any{}) }
func (fakeSetupHandler) Schema(c ports.HTTPContext)     { c.JSON(http.StatusOK, map[string]any{}) }
func (fakeSetupHandler) CreateRun(c ports.HTTPContext)  { c.JSON(http.StatusOK, map[string]any{}) }
func (fakeSetupHandler) RetryRun(c ports.HTTPContext)   { c.JSON(http.StatusOK, map[string]any{}) }
func (fakeSetupHandler) Logs(c ports.HTTPContext)       { c.JSON(http.StatusOK, map[string]any{}) }
func (fakeSetupHandler) SaveConfig(c ports.HTTPContext) { c.JSON(http.StatusOK, map[string]any{}) }
func (fakeSetupHandler) TestConfig(c ports.HTTPContext) { c.JSON(http.StatusOK, map[string]any{}) }
func (fakeSetupHandler) SkipStep(c ports.HTTPContext)   { c.JSON(http.StatusOK, map[string]any{}) }
func (fakeSetupHandler) Complete(c ports.HTTPContext)   { c.JSON(http.StatusOK, map[string]any{}) }

// Close 实现测试桩的资源关闭入口，用于验证生命周期调用而不释放外部资源。
func (db *fakeDatabase) Close() error {
	return nil
}

// Ping 实现数据库测试桩的健康检查入口，按测试需要返回成功或预设错误。
func (db *fakeDatabase) Ping(context.Context) error {
	return db.pingErr
}

// Reload 实现测试桩的配置重载入口，用于验证调用路径而不触发真实资源替换。
type routerResponse struct {
	Code       int            `json:"code"`
	MessageKey string         `json:"messageKey"`
	Message    string         `json:"message"`
	Data       map[string]any `json:"data"`
}

type menuResponse struct {
	Code       int    `json:"code"`
	MessageKey string `json:"messageKey"`
	Message    string `json:"message"`
	Data       []struct {
		Code  string `json:"code"`
		Items []struct {
			Code       string `json:"code"`
			Permission string `json:"permission"`
		} `json:"items"`
	} `json:"data"`
}

type apiCatalogResponse struct {
	Code       int               `json:"code"`
	MessageKey string            `json:"messageKey"`
	Message    string            `json:"message"`
	Data       []apiCatalogGroup `json:"data"`
}

type apiCatalogGroup struct {
	Code  string           `json:"code"`
	Items []apiCatalogItem `json:"items"`
}

type apiCatalogItem struct {
	Access     string `json:"access"`
	Method     string `json:"method"`
	Path       string `json:"path"`
	Permission string `json:"permission"`
}

type apiSyncResponse struct {
	Code       int    `json:"code"`
	MessageKey string `json:"messageKey"`
	Message    string `json:"message"`
	Data       struct {
		Created       int               `json:"created"`
		Groups        []apiCatalogGroup `json:"groups"`
		Persisted     bool              `json:"persisted"`
		Stale         int               `json:"stale"`
		StorageStatus string            `json:"storageStatus"`
		Total         int               `json:"total"`
		Updated       int               `json:"updated"`
	} `json:"data"`
}

type apiPermissionSyncResponse struct {
	Code       int    `json:"code"`
	MessageKey string `json:"messageKey"`
	Message    string `json:"message"`
	Data       struct {
		Created       int    `json:"created"`
		Persisted     bool   `json:"persisted"`
		Skipped       int    `json:"skipped"`
		StorageStatus string `json:"storageStatus"`
		Total         int    `json:"total"`
	} `json:"data"`
}

type fakeIAMService struct {
	setupStatusCalls  int
	initialSetupCalls int
	signupCalls       int
	lastSignupInput   iamservice.SignupInput
	loginCalls        int
	lastLoginInput    iamservice.LoginInput
	orgListCalls      int
	lastOrgFilter     iamservice.OrganizationListFilter
	userListCalls     int
	lastUserFilter    iamservice.UserListFilter
	sessionListCalls  int
	lastSessionFilter iamservice.SessionListFilter
}

type permissionAuthorizer map[string]bool

func (a permissionAuthorizer) Authorize(_ context.Context, _ iamservice.Principal, permission iamservice.PermissionContext) (bool, error) {
	code := permission.Object + ":" + permission.Action
	if allowed, ok := a[permission.Scope+"|"+code]; ok {
		return allowed, nil
	}
	return a[code], nil
}

func (s *fakeIAMService) BootstrapAdmin(context.Context, iamservice.BootstrapAdminInput) (*iamservice.Principal, error) {
	return nil, nil
}

func (s *fakeIAMService) Captcha(context.Context) (iamservice.CaptchaChallenge, error) {
	return iamservice.CaptchaChallenge{Enabled: false}, nil
}
func (s *fakeIAMService) SetupStatus(context.Context) (iamservice.SetupStatus, error) {
	s.setupStatusCalls++
	return iamservice.SetupStatus{Required: true}, nil
}
func (s *fakeIAMService) InitialAdminSetup(context.Context, iamservice.InitialAdminSetupInput) (iamservice.TokenPair, error) {
	s.initialSetupCalls++
	return iamservice.TokenPair{AccessToken: "access", RefreshToken: "refresh", AccessExpiresAt: time.Now().Add(time.Hour), RefreshExpiresAt: time.Now().Add(time.Hour)}, nil
}
func (s *fakeIAMService) Signup(_ context.Context, input iamservice.SignupInput) (iamservice.SignupResult, error) {
	s.signupCalls++
	s.lastSignupInput = input
	pair := iamservice.TokenPair{AccessToken: "access", RefreshToken: "refresh", AccessExpiresAt: time.Now().Add(time.Hour), RefreshExpiresAt: time.Now().Add(time.Hour), UserID: 1, OrgID: 1, SessionID: 1, ProductCode: "console-platform", ClientType: "pc_web"}
	snapshot := pair.SessionSnapshot()
	return iamservice.SignupResult{Status: iamservice.SignupStatusAuthenticated, Session: &snapshot, Tokens: pair}, nil
}
func (s *fakeIAMService) ConfirmEmailVerification(context.Context, iamservice.ConfirmEmailVerificationInput) (iamservice.TokenPair, error) {
	return iamservice.TokenPair{AccessToken: "access", RefreshToken: "refresh", AccessExpiresAt: time.Now().Add(time.Hour), RefreshExpiresAt: time.Now().Add(time.Hour), UserID: 1, OrgID: 1, SessionID: 1, ProductCode: "console-platform", ClientType: "pc_web"}, nil
}
func (s *fakeIAMService) Login(_ context.Context, input iamservice.LoginInput) (iamservice.TokenPair, error) {
	s.loginCalls++
	s.lastLoginInput = input
	return iamservice.TokenPair{AccessToken: "access", RefreshToken: "refresh", AccessExpiresAt: time.Now().Add(time.Hour), RefreshExpiresAt: time.Now().Add(time.Hour), UserID: 1, OrgID: 1, SessionID: 1, ProductCode: "console-platform", ClientType: "pc_web"}, nil
}
func (s *fakeIAMService) Refresh(context.Context, iamservice.RefreshInput) (iamservice.TokenPair, error) {
	return iamservice.TokenPair{}, nil
}
func (s *fakeIAMService) Logout(context.Context, iamservice.Principal) error { return nil }
func (s *fakeIAMService) SwitchOrg(context.Context, iamservice.Principal, int64, string, string) (iamservice.TokenPair, error) {
	return iamservice.TokenPair{}, nil
}
func (s *fakeIAMService) AuthenticateToken(context.Context, string) (iamservice.Principal, error) {
	return iamservice.Principal{UserID: 1, OrgID: 1, SessionID: 1, Username: "admin", Email: "admin@example.com"}, nil
}
func (s *fakeIAMService) Authorize(context.Context, iamservice.Principal, iamservice.PermissionContext) (bool, error) {
	return true, nil
}
func (s *fakeIAMService) CurrentSession(context.Context, iamservice.Principal) (iamservice.SessionSnapshot, error) {
	return iamservice.SessionSnapshot{UserID: 1, OrgID: 1, SessionID: 1, ProductCode: "console-platform", ClientType: "pc_web", RefreshExpiresAt: time.Now().Add(time.Hour)}, nil
}
func (s *fakeIAMService) Me(context.Context, iamservice.Principal) (*iammodel.User, error) {
	return &iammodel.User{ID: 1, Username: "rin721", DisplayName: "Rin721", Email: "rin@example.com"}, nil
}
func (s *fakeIAMService) ListMyOrganizations(context.Context, iamservice.Principal) ([]iammodel.Organization, error) {
	return nil, nil
}
func (s *fakeIAMService) ListOrganizations(_ context.Context, _ iamservice.Principal, filter iamservice.OrganizationListFilter) (iamservice.OrganizationPage, error) {
	s.orgListCalls++
	s.lastOrgFilter = filter
	return iamservice.OrganizationPage{Items: []iammodel.Organization{}, Page: 1, PageSize: 10, StorageStatus: "persisted"}, nil
}
func (s *fakeIAMService) CreateOrganization(context.Context, iamservice.Principal, string, string) (*iammodel.Organization, error) {
	return nil, nil
}
func (s *fakeIAMService) UpdateOrganization(context.Context, iamservice.UpdateOrganizationInput) (*iammodel.Organization, error) {
	return nil, nil
}
func (s *fakeIAMService) InviteUser(context.Context, iamservice.InviteUserInput) (iamservice.NotificationDelivery, error) {
	return iamservice.NotificationDelivery{}, nil
}
func (s *fakeIAMService) ListInvitations(context.Context, iamservice.Principal) ([]iammodel.Invitation, error) {
	return nil, nil
}
func (s *fakeIAMService) RevokeInvitation(context.Context, iamservice.Principal, int64, string, string) error {
	return nil
}
func (s *fakeIAMService) AcceptInvitation(context.Context, iamservice.AcceptInvitationInput) (*iamservice.Principal, error) {
	return nil, nil
}
func (s *fakeIAMService) ForgotPassword(context.Context, iamservice.ForgotPasswordInput) (iamservice.NotificationDelivery, error) {
	return iamservice.NotificationDelivery{}, nil
}
func (s *fakeIAMService) ResetPassword(context.Context, iamservice.ResetPasswordInput) error {
	return nil
}
func (s *fakeIAMService) SetupMFA(context.Context, iamservice.Principal) (string, string, error) {
	return "", "", nil
}
func (s *fakeIAMService) VerifyMFA(context.Context, iamservice.Principal, string) error { return nil }
func (s *fakeIAMService) ListUsers(_ context.Context, _ iamservice.Principal, filter iamservice.UserListFilter) (iamservice.OrganizationUserPage, error) {
	s.userListCalls++
	s.lastUserFilter = filter
	return iamservice.OrganizationUserPage{Items: []iamservice.OrganizationUser{}, Page: 1, PageSize: 10, StorageStatus: "persisted"}, nil
}
func (s *fakeIAMService) UpdateUser(context.Context, iamservice.UpdateUserInput) (*iamservice.OrganizationUser, error) {
	return nil, nil
}
func (s *fakeIAMService) CreateAPIToken(context.Context, iamservice.CreateAPITokenInput) (iamservice.CreateAPITokenResult, error) {
	return iamservice.CreateAPITokenResult{}, nil
}
func (s *fakeIAMService) ListAPITokens(context.Context, iamservice.Principal, iamservice.APITokenFilter) (iamservice.APITokenPage, error) {
	return iamservice.APITokenPage{}, nil
}
func (s *fakeIAMService) RevokeAPIToken(context.Context, iamservice.RevokeAPITokenInput) error {
	return nil
}
func (s *fakeIAMService) ListRoles(context.Context, iamservice.Principal) ([]iammodel.Role, error) {
	return nil, nil
}
func (s *fakeIAMService) CreateRole(context.Context, iamservice.CreateRoleInput) (*iammodel.Role, error) {
	return nil, nil
}
func (s *fakeIAMService) UpdateRole(context.Context, iamservice.UpdateRoleInput) (*iammodel.Role, error) {
	return nil, nil
}
func (s *fakeIAMService) ListPermissions(context.Context, iamservice.Principal) ([]iammodel.Permission, error) {
	return nil, nil
}
func (s *fakeIAMService) ListSessions(_ context.Context, _ iamservice.Principal, filter iamservice.SessionListFilter) (iamservice.SessionPage, error) {
	s.sessionListCalls++
	s.lastSessionFilter = filter
	return iamservice.SessionPage{Items: []iammodel.Session{}, Page: 1, PageSize: 10, StorageStatus: "persisted"}, nil
}
func (s *fakeIAMService) RevokeSession(context.Context, iamservice.RevokeSessionInput) error {
	return nil
}
func (s *fakeIAMService) ListAuditLogs(context.Context, iamservice.Principal, iamservice.AuditLogFilter) ([]iammodel.AuditLog, error) {
	return nil, nil
}
func (s *fakeIAMService) RecordAudit(context.Context, iamservice.Principal, string, string, string, string, string, map[string]any) error {
	return nil
}
func (s *fakeIAMService) LoadPolicies(context.Context) error { return nil }
func (s *fakeIAMService) DispatchNotificationOutbox(context.Context, iamservice.NotificationOutboxDispatchInput) (iamservice.NotificationOutboxDispatchResult, error) {
	return iamservice.NotificationOutboxDispatchResult{}, nil
}
func (s *fakeIAMService) ListNotificationOutbox(context.Context, iamservice.Principal, iamservice.NotificationOutboxFilter) (iamservice.NotificationOutboxPage, error) {
	return iamservice.NotificationOutboxPage{Items: []iamservice.NotificationOutboxView{}, Page: 1, PageSize: 10, StorageStatus: "persisted"}, nil
}
func (s *fakeIAMService) RetryNotificationOutbox(context.Context, iamservice.RetryNotificationOutboxInput) (iamservice.NotificationOutboxView, error) {
	return iamservice.NotificationOutboxView{}, nil
}

// TestNewRouterHealthEndpoint 固定 HTTP 路由、中间件顺序和错误响应契约，确保后续注释补全或结构调整不改变该场景。
func TestNewRouterHealthEndpoint(t *testing.T) {
	router := newTestRouter(RouterDeps{})

	recorder, body := performRouterRequest(t, router, http.MethodGet, "/health")

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected /health status %d, got %d with body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	assertSuccessResponse(t, body)
	assertDataValue(t, body.Data, "status", "ok")
}

// TestNewRouterReadyEndpoint 固定 HTTP 路由、中间件顺序和错误响应契约，确保后续注释补全或结构调整不改变该场景。
func TestNewRouterReadyEndpoint(t *testing.T) {
	tests := []struct {
		name           string
		db             ports.Database
		wantHTTPStatus int
		wantCode       int
		wantMessageKey string
		wantStatus     string
		wantDBCheck    string
	}{
		{
			name:           "missing database",
			db:             nil,
			wantHTTPStatus: http.StatusServiceUnavailable,
			wantCode:       apperrors.ErrDatabaseError,
			wantMessageKey: "api.common.notReady",
			wantStatus:     "not_ready",
			wantDBCheck:    "missing",
		},
		{
			name:           "ping failure",
			db:             &fakeDatabase{pingErr: errors.New("db offline")},
			wantHTTPStatus: http.StatusServiceUnavailable,
			wantCode:       apperrors.ErrDatabaseError,
			wantMessageKey: "api.common.notReady",
			wantStatus:     "not_ready",
			wantDBCheck:    "db offline",
		},
		{
			name:           "ready",
			db:             &fakeDatabase{},
			wantHTTPStatus: http.StatusOK,
			wantCode:       0,
			wantMessageKey: "api.common.success",
			wantStatus:     "ready",
			wantDBCheck:    "ok",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := newTestRouter(RouterDeps{Database: tt.db})

			recorder, body := performRouterRequest(t, router, http.MethodGet, "/ready")

			if recorder.Code != tt.wantHTTPStatus {
				t.Fatalf("expected /ready status %d, got %d with body %s", tt.wantHTTPStatus, recorder.Code, recorder.Body.String())
			}
			if body.Code != tt.wantCode {
				t.Fatalf("expected response code %d, got %d", tt.wantCode, body.Code)
			}
			if body.MessageKey != tt.wantMessageKey {
				t.Fatalf("expected response messageKey %q, got %q", tt.wantMessageKey, body.MessageKey)
			}
			if body.Data == nil {
				t.Fatal("expected response data to be present")
			}
			assertDataValue(t, body.Data, "status", tt.wantStatus)
			checks, ok := body.Data["checks"].(map[string]any)
			if !ok {
				t.Fatalf("expected data.checks to be an object, got %#v", body.Data["checks"])
			}
			assertDataValue(t, checks, "database", tt.wantDBCheck)
		})
	}
}

func TestNewRouterSignupEndpointIsPublic(t *testing.T) {
	iamSvc := &fakeIAMService{}
	router := newTestRouter(RouterDeps{
		IAMHandler: iamhandler.New(iamSvc, nil),
		IAMAuth:    iamSvc,
		IAMAuthz:   iamSvc,
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/signup", bytes.NewBufferString(`{"orgCode":"acme","orgName":"Acme","username":"owner","email":"owner@example.com","password":"password123"}`))
	request.Header.Set("Content-Type", "application/json")

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected public signup status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if iamSvc.signupCalls != 1 {
		t.Fatalf("expected signup call count 1, got %d", iamSvc.signupCalls)
	}
}

func TestNewRouterCommunitySignupEndpointUsesCommunityPayload(t *testing.T) {
	iamSvc := &fakeIAMService{}
	router := newTestRouter(RouterDeps{
		IAMHandler: iamhandler.New(iamSvc, nil),
		IAMAuth:    iamSvc,
		IAMAuthz:   iamSvc,
	})

	recorder := performJSONRouterRequest(router, http.MethodPost, "/api/v1/public/community/auth/signup", `{"username":"Rin 721","displayName":"Rin","email":"rin@example.com","password":"password123"}`)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected community signup status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if iamSvc.signupCalls != 1 {
		t.Fatalf("expected signup call count 1, got %d", iamSvc.signupCalls)
	}
	if iamSvc.lastSignupInput.Username != "Rin 721" || iamSvc.lastSignupInput.DisplayName != "Rin" || iamSvc.lastSignupInput.Email != "rin@example.com" {
		t.Fatalf("unexpected community signup identity input: %#v", iamSvc.lastSignupInput)
	}
	if iamSvc.lastSignupInput.OrgCode != "community-rin-721" || iamSvc.lastSignupInput.OrgName != "Rin" {
		t.Fatalf("unexpected community signup account bridge: %#v", iamSvc.lastSignupInput)
	}
	if strings.Contains(recorder.Body.String(), "orgId") || strings.Contains(recorder.Body.String(), "permissions") || strings.Contains(recorder.Body.String(), "roles") {
		t.Fatalf("community signup response should expose a compact community session, got %s", recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), `"account"`) || !strings.Contains(recorder.Body.String(), `"handle":"rin721"`) {
		t.Fatalf("community signup response should expose community account identity, got %s", recorder.Body.String())
	}
}

func TestNewRouterCommunityAuthEndpointsUseCommunityPayload(t *testing.T) {
	iamSvc := &fakeIAMService{}
	router := newTestRouter(RouterDeps{
		IAMHandler: iamhandler.New(iamSvc, nil),
		IAMAuth:    iamSvc,
		IAMAuthz:   iamSvc,
	})

	login := performJSONRouterRequest(router, http.MethodPost, "/api/v1/public/community/auth/login", `{"identifier":"rin@example.com","password":"password123"}`)
	if login.Code != http.StatusOK {
		t.Fatalf("expected community login status %d, got %d body %s", http.StatusOK, login.Code, login.Body.String())
	}
	if iamSvc.loginCalls != 1 {
		t.Fatalf("expected login call count 1, got %d", iamSvc.loginCalls)
	}
	if iamSvc.lastLoginInput.Identifier != "rin@example.com" || iamSvc.lastLoginInput.OrgCode != "" {
		t.Fatalf("unexpected community login input: %#v", iamSvc.lastLoginInput)
	}
	if strings.Contains(login.Body.String(), "orgId") || strings.Contains(login.Body.String(), "permissions") || strings.Contains(login.Body.String(), "roles") {
		t.Fatalf("community login response should expose a compact community session, got %s", login.Body.String())
	}
	if !strings.Contains(login.Body.String(), `"account"`) || !strings.Contains(login.Body.String(), `"displayName":"Rin721"`) {
		t.Fatalf("community login response should expose community account identity, got %s", login.Body.String())
	}

	session := httptest.NewRecorder()
	sessionRequest := httptest.NewRequest(http.MethodGet, "/api/v1/public/community/auth/session", nil)
	sessionRequest.Header.Set("Authorization", "Bearer token")
	router.ServeHTTP(session, sessionRequest)
	if session.Code != http.StatusOK {
		t.Fatalf("expected community session status %d, got %d body %s", http.StatusOK, session.Code, session.Body.String())
	}
	if strings.Contains(session.Body.String(), "orgId") || strings.Contains(session.Body.String(), "permissions") || strings.Contains(session.Body.String(), "roles") {
		t.Fatalf("community session response should expose a compact community session, got %s", session.Body.String())
	}
	if !strings.Contains(session.Body.String(), `"account"`) || !strings.Contains(session.Body.String(), `"displayName":"Rin721"`) {
		t.Fatalf("community session response should expose community account identity, got %s", session.Body.String())
	}

	logout := httptest.NewRecorder()
	logoutRequest := httptest.NewRequest(http.MethodPost, "/api/v1/public/community/auth/logout", nil)
	logoutRequest.Header.Set("Authorization", "Bearer token")
	router.ServeHTTP(logout, logoutRequest)
	if logout.Code != http.StatusOK {
		t.Fatalf("expected community logout status %d, got %d body %s", http.StatusOK, logout.Code, logout.Body.String())
	}
	if !strings.Contains(logout.Body.String(), "loggedOut") {
		t.Fatalf("expected community logout response, got %s", logout.Body.String())
	}
}

func TestNewRouterSetupEndpointsArePublic(t *testing.T) {
	iamSvc := &fakeIAMService{}
	router := newTestRouter(RouterDeps{
		IAMHandler: iamhandler.New(iamSvc, nil),
		IAMAuth:    iamSvc,
		IAMAuthz:   iamSvc,
	})

	statusRecorder := httptest.NewRecorder()
	statusRequest := httptest.NewRequest(http.MethodGet, "/api/v1/auth/setup/status", nil)
	router.ServeHTTP(statusRecorder, statusRequest)
	if statusRecorder.Code != http.StatusOK {
		t.Fatalf("expected setup status %d, got %d body %s", http.StatusOK, statusRecorder.Code, statusRecorder.Body.String())
	}

	setupRecorder := performJSONRouterRequest(router, http.MethodPost, "/api/v1/auth/setup/initial-admin", `{"orgCode":"acme","orgName":"Acme","username":"owner","email":"owner@example.com","password":"password123"}`)
	if setupRecorder.Code != http.StatusOK {
		t.Fatalf("expected setup initial-admin %d, got %d body %s", http.StatusOK, setupRecorder.Code, setupRecorder.Body.String())
	}
	if iamSvc.setupStatusCalls != 1 || iamSvc.initialSetupCalls != 1 {
		t.Fatalf("unexpected setup call counts: status=%d initial=%d", iamSvc.setupStatusCalls, iamSvc.initialSetupCalls)
	}
}

func TestNewRouterRateLimitsPublicAuthEndpoints(t *testing.T) {
	iamSvc := &fakeIAMService{}
	router := newTestRouter(RouterDeps{
		IAMHandler: iamhandler.New(iamSvc, nil),
		IAMAuth:    iamSvc,
		IAMAuthz:   iamSvc,
	})

	for i := 0; i < 20; i++ {
		recorder := performJSONRouterRequest(router, http.MethodPost, "/api/v1/auth/login", `{"identifier":"owner@example.com","password":"password123"}`)
		if recorder.Code != http.StatusOK {
			t.Fatalf("request %d expected status %d, got %d body %s", i+1, http.StatusOK, recorder.Code, recorder.Body.String())
		}
	}
	limited := performJSONRouterRequest(router, http.MethodPost, "/api/v1/auth/login", `{"identifier":"owner@example.com","password":"password123"}`)
	if limited.Code != http.StatusTooManyRequests {
		t.Fatalf("expected rate limited status %d, got %d body %s", http.StatusTooManyRequests, limited.Code, limited.Body.String())
	}
}

func TestNewRouterOrgUsersPassesListFilters(t *testing.T) {
	iamSvc := &fakeIAMService{}
	router := newTestRouter(RouterDeps{
		IAMHandler: iamhandler.New(iamSvc, nil),
		IAMAuth:    iamSvc,
		IAMAuthz:   iamSvc,
	})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/orgs/1/users?keyword=alice&username=ali&displayName=Alice&email=alice%40example.com&roleCode=admin&status=active&page=2&pageSize=30&orderKey=username&desc=true", nil)
	request.Header.Set("Authorization", "Bearer token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected users status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if iamSvc.userListCalls != 1 {
		t.Fatalf("expected one ListUsers call, got %d", iamSvc.userListCalls)
	}
	filter := iamSvc.lastUserFilter
	if filter.Keyword != "alice" || filter.Username != "ali" || filter.DisplayName != "Alice" || filter.Email != "alice@example.com" || filter.RoleCode != "admin" || filter.Status != "active" || filter.Page != 2 || filter.PageSize != 30 || filter.OrderKey != "username" || !filter.Desc {
		t.Fatalf("unexpected user list filter: %#v", filter)
	}
}

func TestNewRouterOrganizationsPassesListFilters(t *testing.T) {
	iamSvc := &fakeIAMService{}
	router := newTestRouter(RouterDeps{
		IAMHandler: iamhandler.New(iamSvc, nil),
		IAMAuth:    iamSvc,
		IAMAuthz:   iamSvc,
	})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/orgs?keyword=team&code=alpha&name=Alpha%20Team&status=active&page=3&pageSize=20&orderKey=code&desc=1", nil)
	request.Header.Set("Authorization", "Bearer token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected organizations status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if iamSvc.orgListCalls != 1 {
		t.Fatalf("expected one ListOrganizations call, got %d", iamSvc.orgListCalls)
	}
	filter := iamSvc.lastOrgFilter
	if filter.Keyword != "team" || filter.Code != "alpha" || filter.Name != "Alpha Team" || filter.Status != "active" || filter.Page != 3 || filter.PageSize != 20 || filter.OrderKey != "code" || !filter.Desc {
		t.Fatalf("unexpected organization list filter: %#v", filter)
	}
}

func TestNewRouterSessionsPassesListFilters(t *testing.T) {
	iamSvc := &fakeIAMService{}
	router := newTestRouter(RouterDeps{
		IAMHandler: iamhandler.New(iamSvc, nil),
		IAMAuth:    iamSvc,
		IAMAuthz:   iamSvc,
	})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/orgs/1/sessions?scope=org&keyword=edge&userId=42&ipAddress=127.0.0.1&status=active&productCode=console-platform&clientType=mobile_web&page=2&pageSize=30&orderKey=last_used_at&desc=true", nil)
	request.Header.Set("Authorization", "Bearer token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected sessions status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	if iamSvc.sessionListCalls != 1 {
		t.Fatalf("expected one ListSessions call, got %d", iamSvc.sessionListCalls)
	}
	filter := iamSvc.lastSessionFilter
	if filter.Scope != "org" || filter.Keyword != "edge" || filter.UserID != 42 || filter.IPAddress != "127.0.0.1" || filter.Status != "active" || filter.ProductCode != "console-platform" || filter.ClientType != "mobile_web" || filter.Page != 2 || filter.PageSize != 30 || filter.OrderKey != "last_used_at" || !filter.Desc {
		t.Fatalf("unexpected session list filter: %#v", filter)
	}
}

func TestGeneratedOpenAPIYAMLSyncsWithCommittedFile(t *testing.T) {
	generated, err := GenerateOpenAPIYAML()
	if err != nil {
		t.Fatalf("generate openapi.yaml: %v", err)
	}
	committed, err := os.ReadFile(filepath.Join("..", "..", "..", "docs", "api", "openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi.yaml: %v", err)
	}
	if string(generated) != string(committed) {
		t.Fatalf("docs/api/openapi.yaml is out of sync; run go run ./cmd/console api openapi --output docs/api/openapi.yaml")
	}

	spec := string(generated)
	for _, path := range []string{
		"/health",
		"/ready",
		OpenAPIPath,
		"/api/v1/setup/status",
		"/api/v1/setup/schema",
		"/api/v1/auth/setup/status",
		"/api/v1/auth/setup/initial-admin",
		"/api/v1/auth/signup",
		"/api/v1/auth/captcha",
		"/api/v1/public/community/auth/login",
		"/api/v1/public/community/auth/logout",
		"/api/v1/public/community/auth/session",
		"/api/v1/public/community/auth/signup",
		"/api/v1/public/community/home",
		"/api/v1/public/community/videos/{idOrSlug}",
		"/api/v1/orgs/{orgId}",
		"/api/v1/orgs/{orgId}/users/{userId}",
		"/api/v1/orgs/{orgId}/invitations",
		"/api/v1/orgs/{orgId}/invitations/{invitationId}",
		"/api/v1/orgs/{orgId}/roles/{roleId}",
		"/api/v1/system/apis",
		"/api/v1/system/apis/permissions/sync",
		"/api/v1/system/apis/sync",
		"/api/v1/system/config",
		"/api/v1/system/dictionaries",
		"/api/v1/system/menus",
		"/api/v1/system/operation-records",
		"/api/v1/system/parameters",
		"/api/v1/system/parameters/{parameterId}",
		"/api/v1/system/parameters/value",
		"/api/v1/system/server-info",
		"/api/v1/system/server-metrics/history",
		"/api/v1/system/versions",
		"/api/v1/system/versions/export",
		"/api/v1/system/versions/import",
		"/api/v1/system/versions/sources",
		"/api/v1/system/versions/{versionId}",
		"/api/v1/system/versions/{versionId}/download",
	} {
		if !strings.Contains(spec, `"`+path+`":`) {
			t.Fatalf("openapi.yaml missing path %s", path)
		}
	}
}

func TestRouteContractsCoverRegisteredAPIV1Routes(t *testing.T) {
	auth := &fakeIAMService{}
	_, router := testsupport.HTTPRouter("test")
	NewRouter(RouterDeps{
		Router:               router,
		SetupHandler:         fakeSetupHandler{},
		AnnouncementsHandler: announcementhandler.New(announcementservice.New(nil, nil, announcementservice.Config{}), nil),
		CommunityHandler:     communityhandler.New(communityservice.New(nil, communityservice.Config{}), nil),
		IAMHandler:           iamhandler.New(auth, nil),
		IAMAuth:              auth,
		IAMAuthz:             auth,
		SystemHandler:        systemhandler.New(systemservice.New(systemservice.Config{}), auth, nil),
	})

	contracts := make(map[string]RouteContract)
	for _, contract := range MainHTTPContracts() {
		if !appconstants.IsAPIPath(contract.Path) {
			continue
		}
		contracts[contract.Method+" "+contract.Path] = contract
	}
	registered := make(map[string]struct{})
	for _, route := range router.Routes() {
		if !appconstants.IsAPIPath(route.Path) {
			continue
		}
		key := route.Method + " " + route.Path
		registered[key] = struct{}{}
		if _, ok := contracts[key]; !ok {
			t.Fatalf("registered route %s has no route contract", key)
		}
	}
	for key := range contracts {
		if _, ok := registered[key]; !ok {
			t.Fatalf("route contract %s is not registered by NewRouter with full deps", key)
		}
	}
}

func TestNewRouterServesOpenAPIYAMLPublicAndOutsideCatalog(t *testing.T) {
	auth := &fakeIAMService{}
	systemHandler := systemhandler.New(systemservice.New(systemservice.Config{}), permissionAuthorizer{
		"permission:read": true,
	}, nil)
	router := newTestRouter(RouterDeps{
		AnnouncementsHandler: announcementhandler.New(announcementservice.New(nil, nil, announcementservice.Config{}), nil),
		IAMAuth:              auth,
		IAMAuthz:             permissionAuthorizer{"permission:read": true},
		SystemHandler:        systemHandler,
	})

	openapi := performRawRouterRequest(router, http.MethodGet, OpenAPIPath)
	if openapi.Code != http.StatusOK {
		t.Fatalf("expected openapi status %d, got %d body %s", http.StatusOK, openapi.Code, openapi.Body.String())
	}
	if contentType := openapi.Header().Get("Content-Type"); !strings.Contains(contentType, ContentYAML) {
		t.Fatalf("expected openapi content type %s, got %q", ContentYAML, contentType)
	}
	if !strings.Contains(openapi.Body.String(), `"openapi": "3.0.3"`) {
		t.Fatalf("expected generated openapi body, got %s", openapi.Body.String())
	}

	request := httptest.NewRequest(http.MethodGet, "/api/v1/system/apis", nil)
	request.Header.Set("Authorization", "Bearer token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected api catalog status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var body apiCatalogResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode system api response: %v", err)
	}
	if apiCatalogContains(body, http.MethodGet, OpenAPIPath, "") {
		t.Fatalf("expected /openapi.yaml to stay outside API catalog: %#v", body.Data)
	}
}

func TestNewRouterSystemMenusRequireAuthAndFilterPermissions(t *testing.T) {
	auth := &fakeIAMService{}
	systemHandler := systemhandler.New(systemservice.New(systemservice.Config{}), permissionAuthorizer{
		"tenant|announcement:read": true,
		"tenant|audit:read":        true,
		"tenant|role:read":         true,
		"platform|config:read":     true,
		"platform|dictionary:read": true,
		"platform|media:read":      true,
		"platform|media:upload":    true,
		"platform|org:read":        true,
		"platform|operation:read":  true,
		"platform|parameter:read":  true,
		"platform|permission:read": true,
		"platform|server:read":     true,
		"platform|version:read":    true,
	}, nil)
	router := newTestRouter(RouterDeps{
		IAMAuth:       auth,
		SystemHandler: systemHandler,
	})

	unauthorized := performRawRouterRequest(router, http.MethodGet, "/api/v1/system/menus")
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("expected system menus to require auth, got status %d body %s", unauthorized.Code, unauthorized.Body.String())
	}

	request := httptest.NewRequest(http.MethodGet, "/api/v1/system/menus", nil)
	request.Header.Set("Authorization", "Bearer token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected system menus status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var body menuResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode system menu response: %v", err)
	}
	if body.Code != 0 || body.MessageKey != "api.common.success" {
		t.Fatalf("expected success response, got %#v", body)
	}
	if !menuContains(body, "identity", "organizations") || !menuContains(body, "identity", "roles") {
		t.Fatalf("expected allowed identity menus in %#v", body.Data)
	}
	if !menuContains(body, "workspace", "announcements") {
		t.Fatalf("expected announcement module menu in %#v", body.Data)
	}
	if !menuContains(body, "system", "probes") || !menuContains(body, "system", "menus") {
		t.Fatalf("expected allowed system menus in %#v", body.Data)
	}
	if !menuContains(body, "integration", "apis") {
		t.Fatalf("expected API catalog menu in integration group: %#v", body.Data)
	}
	if !menuContains(body, "system", "dictionaries") {
		t.Fatalf("expected dictionary management menu in %#v", body.Data)
	}
	if !menuContains(body, "logs", "operation-records") {
		t.Fatalf("expected operation history menu in %#v", body.Data)
	}
	if !menuContains(body, "logs", "login-logs") {
		t.Fatalf("expected login log menu in %#v", body.Data)
	}
	if !menuContains(body, "logs", "error-logs") {
		t.Fatalf("expected error log menu in %#v", body.Data)
	}
	if !menuContains(body, "system", "parameters") {
		t.Fatalf("expected parameter management menu in %#v", body.Data)
	}
	if !menuContains(body, "system", "system") {
		t.Fatalf("expected system config menu in %#v", body.Data)
	}
	if !menuContains(body, "system", "design-system") {
		t.Fatalf("expected design system menu in %#v", body.Data)
	}
	if !menuContains(body, "integration", "versions") {
		t.Fatalf("expected version management menu in %#v", body.Data)
	}
	if !menuContains(body, "media", "media") || !menuContains(body, "media", "media-resumable") {
		t.Fatalf("expected media menus to remain under media group: %#v", body.Data)
	}
	if menuContains(body, "identity", "users") {
		t.Fatalf("expected users menu to be hidden without user:read permission: %#v", body.Data)
	}
}

func TestOperationRecorderLogsFailureWithoutBlockingRequest(t *testing.T) {
	auth := &fakeIAMService{}
	log := &captureRouterLogger{}
	systemHandler := systemhandler.New(systemservice.New(systemservice.Config{}), permissionAuthorizer{}, log)
	router := newTestRouter(RouterDeps{
		IAMAuth:       auth,
		SystemHandler: systemHandler,
		Logger:        log,
		Middleware:    middleware.DefaultMiddlewareConfig(),
	})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/system/menus", nil)
	request.Header.Set("Authorization", "Bearer token")
	request.Header.Set("X-Request-ID", "trace-operation-record")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected operation recorder failure to keep response %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	warning, ok := log.warning("operation record failed")
	if !ok {
		t.Fatalf("expected operation recorder failure warning, got %#v", log.warnings)
	}
	if warning.fields["method"] != http.MethodGet {
		t.Fatalf("expected warning method %s, got %#v", http.MethodGet, warning.fields["method"])
	}
	if warning.fields["path"] != "/api/v1/system/menus" {
		t.Fatalf("expected warning path /api/v1/system/menus, got %#v", warning.fields["path"])
	}
	if warning.fields["status"] != http.StatusOK {
		t.Fatalf("expected warning status %d, got %#v", http.StatusOK, warning.fields["status"])
	}
	if warning.fields["traceId"] != "trace-operation-record" {
		t.Fatalf("expected warning traceId trace-operation-record, got %#v", warning.fields["traceId"])
	}
	if warning.fields["error"] == nil {
		t.Fatalf("expected warning to include operation recorder error, got %#v", warning.fields)
	}
}

// TestNewRouterDoesNotRegisterRemovedUserManagementRoutes 固定 HTTP 路由、中间件顺序和错误响应契约，确保后续注释补全或结构调整不改变该场景。
func TestNewRouterSystemAPIsRequirePermissionAndListCatalog(t *testing.T) {
	auth := &fakeIAMService{}
	systemHandler := systemhandler.New(systemservice.New(systemservice.Config{}), permissionAuthorizer{
		"permission:read": true,
	}, nil)
	router := newTestRouter(RouterDeps{
		AnnouncementsHandler: announcementhandler.New(announcementservice.New(nil, nil, announcementservice.Config{}), nil),
		IAMAuth:              auth,
		IAMAuthz:             permissionAuthorizer{"permission:read": true},
		SystemHandler:        systemHandler,
	})

	unauthorized := performRawRouterRequest(router, http.MethodGet, "/api/v1/system/apis")
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("expected system apis to require auth, got status %d body %s", unauthorized.Code, unauthorized.Body.String())
	}

	request := httptest.NewRequest(http.MethodGet, "/api/v1/system/apis", nil)
	request.Header.Set("Authorization", "Bearer token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected system apis status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var body apiCatalogResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode system api response: %v", err)
	}
	if body.Code != 0 || body.MessageKey != "api.common.success" {
		t.Fatalf("expected success response, got %#v", body)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/apis", "permission:read") {
		t.Fatalf("expected system api catalog to include itself with permission: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/announcements", "announcement:read") {
		t.Fatalf("expected system api catalog to include announcement list: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPost, "/api/v1/announcements", "announcement:create") {
		t.Fatalf("expected system api catalog to include announcement create: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPatch, "/api/v1/announcements/:announcementId", "announcement:update") {
		t.Fatalf("expected system api catalog to include announcement update: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPost, "/api/v1/announcements/:announcementId/publish", "announcement:update") {
		t.Fatalf("expected system api catalog to include announcement publish: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPost, "/api/v1/announcements/:announcementId/archive", "announcement:update") {
		t.Fatalf("expected system api catalog to include announcement archive: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodDelete, "/api/v1/announcements/:announcementId", "announcement:delete") {
		t.Fatalf("expected system api catalog to include announcement delete: %#v", body.Data)
	}
	if !apiCatalogAccess(body, http.MethodGet, "/api/v1/system/apis", "permission") {
		t.Fatalf("expected system api route to require permission in API catalog: %#v", body.Data)
	}
	if !apiCatalogAccess(body, http.MethodGet, "/api/v1/system/menus", "authenticated") {
		t.Fatalf("expected system menu route to require authentication in API catalog: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/config", "config:read") {
		t.Fatalf("expected system api catalog to include config with permission: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPatch, "/api/v1/system/config", "config:update") {
		t.Fatalf("expected system api catalog to include config update with permission: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/server-info", "server:read") {
		t.Fatalf("expected system api catalog to include server info with permission: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/server-metrics/history", "server:read") {
		t.Fatalf("expected system api catalog to include server metrics history with permission: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPost, "/api/v1/system/apis/sync", "permission:sync") {
		t.Fatalf("expected system api catalog to include sync route with permission: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPost, "/api/v1/system/apis/permissions/sync", "permission:sync") {
		t.Fatalf("expected system api catalog to include permission sync route with permission: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/dictionaries", "dictionary:read") {
		t.Fatalf("expected system api catalog to include dictionaries: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPost, "/api/v1/system/dictionaries", "dictionary:create") {
		t.Fatalf("expected system api catalog to include dictionary create: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/operation-records", "operation:read") {
		t.Fatalf("expected system api catalog to include operation history list: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodDelete, "/api/v1/system/operation-records", "operation:delete") {
		t.Fatalf("expected system api catalog to include operation history delete: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/parameters", "parameter:read") {
		t.Fatalf("expected system api catalog to include parameter list: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPost, "/api/v1/system/parameters", "parameter:create") {
		t.Fatalf("expected system api catalog to include parameter create: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/parameters/:parameterId", "parameter:read") {
		t.Fatalf("expected system api catalog to include parameter detail: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPatch, "/api/v1/system/parameters/:parameterId", "parameter:update") {
		t.Fatalf("expected system api catalog to include parameter update: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodDelete, "/api/v1/system/parameters/:parameterId", "parameter:delete") {
		t.Fatalf("expected system api catalog to include parameter delete: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/menus", "") {
		t.Fatalf("expected system api catalog to include menus: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/versions", "version:read") {
		t.Fatalf("expected system api catalog to include versions list: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPost, "/api/v1/system/versions/export", "version:create") {
		t.Fatalf("expected system api catalog to include version export: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodPost, "/api/v1/system/versions/import", "version:import") {
		t.Fatalf("expected system api catalog to include version import: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodGet, "/api/v1/system/versions/:versionId/download", "version:download") {
		t.Fatalf("expected system api catalog to include version download: %#v", body.Data)
	}
	if !apiCatalogContains(body, http.MethodDelete, "/api/v1/system/versions/:versionId", "version:delete") {
		t.Fatalf("expected system api catalog to include version delete: %#v", body.Data)
	}
}

func TestRouteContractsClassifyPublicAuthenticatedAndPermissionRoutes(t *testing.T) {
	tests := []struct {
		id             string
		wantAccess     string
		wantPermission string
		wantScope      string
	}{
		{id: "iam.login", wantAccess: "public", wantScope: iammodel.PermissionScopePlatform},
		{id: "iam.captcha", wantAccess: "public", wantScope: iammodel.PermissionScopePlatform},
		{id: "iam.invitation.accept", wantAccess: "public", wantScope: iammodel.PermissionScopePlatform},
		{id: "iam.logout", wantAccess: "authenticated", wantScope: iammodel.PermissionScopeTenant},
		{id: "iam.me", wantAccess: "authenticated", wantScope: iammodel.PermissionScopeTenant},
		{id: "iam.users.list", wantAccess: "permission", wantPermission: "user:read", wantScope: iammodel.PermissionScopeTenant},
		{id: "iam.orgs.list", wantAccess: "permission", wantPermission: "org:read", wantScope: iammodel.PermissionScopePlatform},
		{id: "system.apis", wantAccess: "permission", wantPermission: "permission:read", wantScope: iammodel.PermissionScopePlatform},
	}

	for _, tt := range tests {
		t.Run(tt.id, func(t *testing.T) {
			contract := mustRouteContract(tt.id)
			if contract.Access != tt.wantAccess {
				t.Fatalf("contract %s access = %q, want %q", tt.id, contract.Access, tt.wantAccess)
			}
			if contract.Permission != tt.wantPermission {
				t.Fatalf("contract %s permission = %q, want %q", tt.id, contract.Permission, tt.wantPermission)
			}
			if contract.Scope != tt.wantScope {
				t.Fatalf("contract %s scope = %q, want %q", tt.id, contract.Scope, tt.wantScope)
			}
		})
	}
	for _, contract := range MainHTTPContracts() {
		if contract.Access == systemmodel.APIAccessPermission && contract.Scope == "" {
			t.Fatalf("permission contract %s has empty scope", contract.ID)
		}
	}
}

func TestSanitizeOperationRequestBodyRedactsConfigUpdateValues(t *testing.T) {
	body := sanitizeOperationRequestBody(http.MethodPatch, "/api/v1/system/config", `{"persist":true,"items":[{"key":"database.mysql.password","value":"secret"},{"key":"server.port","value":18083}]}`)

	if strings.Contains(body, "secret") || strings.Contains(body, "18083") {
		t.Fatalf("expected config update body to be redacted, got %s", body)
	}
	if !strings.Contains(body, "database.mysql.password") || !strings.Contains(body, "[redacted]") {
		t.Fatalf("expected config update body to retain keys and redact values, got %s", body)
	}
	if !strings.Contains(body, `"persist":true`) {
		t.Fatalf("expected config update body to retain persist flag, got %s", body)
	}
}

func TestSystemMenuPermissionsAreBackedByRouteContracts(t *testing.T) {
	systemSvc := systemservice.New(systemservice.Config{})
	groups, err := systemSvc.ListMenus(context.Background())
	if err != nil {
		t.Fatalf("ListMenus() error = %v", err)
	}

	contractPermissions := make(map[string]struct{})
	for _, entry := range catalogAPIContracts(mainHTTPContracts()) {
		if strings.TrimSpace(entry.Permission) == "" {
			continue
		}
		contractPermissions[menuPermissionContractKey(entry.ProductCode, entry.Scope, entry.Permission)] = struct{}{}
	}

	validScopes := map[string]struct{}{
		iammodel.PermissionScopePlatform: {},
		iammodel.PermissionScopeProduct:  {},
		iammodel.PermissionScopeTenant:   {},
	}
	for _, group := range groups {
		for _, item := range group.Items {
			if strings.TrimSpace(item.Permission) == "" {
				continue
			}
			if _, ok := validScopes[strings.TrimSpace(item.Scope)]; !ok {
				t.Errorf("menu %s/%s permission %q has invalid scope %q", group.Code, item.Code, item.Permission, item.Scope)
				continue
			}
			key := menuPermissionContractKey(item.ProductCode, item.Scope, item.Permission)
			if _, ok := contractPermissions[key]; !ok {
				t.Errorf("menu %s/%s permission %q scope %q product %q has no matching route contract permission", group.Code, item.Code, item.Permission, item.Scope, item.ProductCode)
			}
		}
	}
}

func TestNewRouterSystemConfigUpdateRequiresPermission(t *testing.T) {
	auth := &fakeIAMService{}
	systemHandler := systemhandler.New(systemservice.New(systemservice.Config{
		ConfigUpdater: func(context.Context, systemservice.UpdateConfigInput) (systemmodel.ConfigSnapshot, error) {
			return systemmodel.ConfigSnapshot{Sections: []systemmodel.ConfigSection{
				{
					Code: "server",
					Items: []systemmodel.ConfigItem{
						{Key: "server.port", Value: 18083},
					},
				},
			}}, nil
		},
	}), nil, nil)

	routerWithoutPermission := newTestRouter(RouterDeps{
		IAMAuth:       auth,
		IAMAuthz:      permissionAuthorizer{},
		SystemHandler: systemHandler,
	})
	forbiddenRequest := httptest.NewRequest(http.MethodPatch, "/api/v1/system/config", bytes.NewBufferString(`{"items":[{"key":"server.port","value":18083}]}`))
	forbiddenRequest.Header.Set("Authorization", "Bearer token")
	forbiddenRequest.Header.Set("Content-Type", "application/json")
	forbiddenRecorder := httptest.NewRecorder()
	routerWithoutPermission.ServeHTTP(forbiddenRecorder, forbiddenRequest)
	if forbiddenRecorder.Code != http.StatusForbidden {
		t.Fatalf("expected config update to require config:update, got status %d body %s", forbiddenRecorder.Code, forbiddenRecorder.Body.String())
	}

	routerWithPermission := newTestRouter(RouterDeps{
		IAMAuth:       auth,
		IAMAuthz:      permissionAuthorizer{"config:update": true},
		SystemHandler: systemHandler,
	})
	allowedRequest := httptest.NewRequest(http.MethodPatch, "/api/v1/system/config", bytes.NewBufferString(`{"items":[{"key":"server.port","value":18083}]}`))
	allowedRequest.Header.Set("Authorization", "Bearer token")
	allowedRequest.Header.Set("Content-Type", "application/json")
	allowedRecorder := httptest.NewRecorder()
	routerWithPermission.ServeHTTP(allowedRecorder, allowedRequest)
	if allowedRecorder.Code != http.StatusOK {
		t.Fatalf("expected config update status %d, got %d body %s", http.StatusOK, allowedRecorder.Code, allowedRecorder.Body.String())
	}
}

func TestNewRouterSystemAPISyncReturnsLiveCatalogWithoutStorage(t *testing.T) {
	auth := &fakeIAMService{}
	systemHandler := systemhandler.New(systemservice.New(systemservice.Config{}), permissionAuthorizer{
		"permission:sync": true,
	}, nil)
	router := newTestRouter(RouterDeps{
		IAMAuth:       auth,
		IAMAuthz:      permissionAuthorizer{"permission:sync": true},
		SystemHandler: systemHandler,
	})

	unauthorized := performRawRouterRequest(router, http.MethodPost, "/api/v1/system/apis/sync")
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("expected system api sync to require auth, got status %d body %s", unauthorized.Code, unauthorized.Body.String())
	}

	request := httptest.NewRequest(http.MethodPost, "/api/v1/system/apis/sync", nil)
	request.Header.Set("Authorization", "Bearer token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected system api sync status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var body apiSyncResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode system api sync response: %v", err)
	}
	if body.Code != 0 || body.MessageKey != "api.common.success" {
		t.Fatalf("expected success response, got %#v", body)
	}
	if body.Data.Persisted || body.Data.StorageStatus != "memory" {
		t.Fatalf("expected in-memory sync result without repository, got %#v", body.Data)
	}
	if body.Data.Total == 0 || !apiGroupsContain(body.Data.Groups, http.MethodPost, "/api/v1/system/apis/sync", "permission:sync") {
		t.Fatalf("expected sync result to include live catalog routes, got %#v", body.Data.Groups)
	}
}

func TestNewRouterSystemAPIPermissionSyncReturnsUnavailableWithoutStore(t *testing.T) {
	auth := &fakeIAMService{}
	systemHandler := systemhandler.New(systemservice.New(systemservice.Config{}), permissionAuthorizer{
		"permission:read": true,
		"permission:sync": true,
	}, nil)
	router := newTestRouter(RouterDeps{
		IAMAuth:       auth,
		IAMAuthz:      permissionAuthorizer{"permission:sync": true},
		SystemHandler: systemHandler,
	})

	unauthorized := performRawRouterRequest(router, http.MethodPost, "/api/v1/system/apis/permissions/sync")
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("expected system api permission sync to require auth, got status %d body %s", unauthorized.Code, unauthorized.Body.String())
	}

	request := httptest.NewRequest(http.MethodPost, "/api/v1/system/apis/permissions/sync", nil)
	request.Header.Set("Authorization", "Bearer token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected system api permission sync status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var body apiPermissionSyncResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode system api permission sync response: %v", err)
	}
	if body.Code != 0 || body.MessageKey != "api.common.success" {
		t.Fatalf("expected success response, got %#v", body)
	}
	if body.Data.Persisted || body.Data.StorageStatus != "unavailable" {
		t.Fatalf("expected unavailable permission sync without store, got %#v", body.Data)
	}
	if body.Data.Total == 0 {
		t.Fatalf("expected permission sync result to count route permissions, got %#v", body.Data)
	}
}

func TestNewRouterDoesNotRegisterRemovedUserManagementRoutes(t *testing.T) {
	router := newTestRouter(RouterDeps{})

	for _, path := range []string{
		"/api/v1/auth/login",
		"/api/v1/auth/register",
		"/api/v1/users",
		"/api/v1/roles",
		"/api/v1/permissions",
	} {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, path, nil)

		router.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusNotFound {
			t.Fatalf("expected %s to be unregistered with status %d, got %d", path, http.StatusNotFound, recorder.Code)
		}
	}
}

// TestNewRouterServesWebUI 固定 WebUI 静态产物的挂载和 SPA fallback 行为，避免 API 路由被前端回退吞掉。
func TestNewRouterServesWebUI(t *testing.T) {
	distDir := newWebUIDist(t)
	router := newTestRouter(RouterDeps{
		WebUI: WebUIDeps{Enabled: true, MountPath: "/admin", DistDir: distDir},
	})

	for _, path := range []string{"/admin", "/admin/", "/admin/login", "/admin/users"} {
		recorder := performRawRouterRequest(router, http.MethodGet, path)
		if recorder.Code != http.StatusOK {
			t.Fatalf("expected %s status %d, got %d with body %s", path, http.StatusOK, recorder.Code, recorder.Body.String())
		}
		if !strings.Contains(recorder.Body.String(), "admin-shell") {
			t.Fatalf("expected %s to serve index.html, got %q", path, recorder.Body.String())
		}
	}

	asset := performRawRouterRequest(router, http.MethodGet, "/admin/assets/app.js")
	if asset.Code != http.StatusOK {
		t.Fatalf("expected static asset status %d, got %d with body %s", http.StatusOK, asset.Code, asset.Body.String())
	}
	if strings.Contains(asset.Body.String(), "admin-shell") || !strings.Contains(asset.Body.String(), "console.log") {
		t.Fatalf("expected asset response instead of index fallback, got %q", asset.Body.String())
	}

	missingAsset := performRawRouterRequest(router, http.MethodGet, "/admin/assets/missing.js")
	if missingAsset.Code != http.StatusNotFound || strings.Contains(missingAsset.Body.String(), "admin-shell") {
		t.Fatalf("expected missing asset to return 404 instead of index, got status %d body %s", missingAsset.Code, missingAsset.Body.String())
	}
}

// TestNewRouterKeepsAPIAndProbesOutsideWebUI 固定 WebUI fallback 不能覆盖健康检查或 API 前缀。
func TestNewRouterKeepsAPIAndProbesOutsideWebUI(t *testing.T) {
	distDir := newWebUIDist(t)
	router := newTestRouter(RouterDeps{
		WebUI: WebUIDeps{Enabled: true, MountPath: "/admin", DistDir: distDir},
	})

	health := performRawRouterRequest(router, http.MethodGet, "/health")
	if health.Code != http.StatusOK || strings.Contains(health.Body.String(), "admin-shell") {
		t.Fatalf("expected /health to stay API response, got status %d body %s", health.Code, health.Body.String())
	}

	ready := performRawRouterRequest(router, http.MethodGet, "/ready")
	if ready.Code != http.StatusServiceUnavailable || strings.Contains(ready.Body.String(), "admin-shell") {
		t.Fatalf("expected /ready to stay probe response, got status %d body %s", ready.Code, ready.Body.String())
	}

	openapi := performRawRouterRequest(router, http.MethodGet, OpenAPIPath)
	if openapi.Code != http.StatusOK || strings.Contains(openapi.Body.String(), "admin-shell") {
		t.Fatalf("expected /openapi.yaml to stay generated YAML, got status %d body %s", openapi.Code, openapi.Body.String())
	}

	login := performRawRouterRequest(router, http.MethodPost, "/api/v1/auth/login")
	if login.Code != http.StatusNotFound || strings.Contains(login.Body.String(), "admin-shell") {
		t.Fatalf("expected /api/v1/auth/login to stay outside SPA fallback, got status %d body %s", login.Code, login.Body.String())
	}
}

// TestNewRouterReturns404WhenWebUIDistMissing 固定缺少静态产物时后端仍可创建路由，WebUI 前缀返回 404。
func TestNewRouterReturns404WhenWebUIDistMissing(t *testing.T) {
	router := newTestRouter(RouterDeps{
		WebUI: WebUIDeps{Enabled: true, MountPath: "/admin", DistDir: filepath.Join(t.TempDir(), "missing")},
	})

	recorder := performRawRouterRequest(router, http.MethodGet, "/admin")
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected missing WebUI dist to return %d, got %d with body %s", http.StatusNotFound, recorder.Code, recorder.Body.String())
	}
}

func TestNewRouterServesRootReactWebUIWithoutSwallowingReservedRoutes(t *testing.T) {
	distDir := newWebUIDist(t)
	router := newTestRouter(RouterDeps{
		WebUI: WebUIDeps{Enabled: true, MountPath: "/", DistDir: distDir},
	})

	for _, path := range []string{"/", "/about", "/setup", "/admin", "/admin/users"} {
		recorder := performRawRouterRequest(router, http.MethodGet, path)
		if recorder.Code != http.StatusOK {
			t.Fatalf("expected %s status %d, got %d with body %s", path, http.StatusOK, recorder.Code, recorder.Body.String())
		}
		if !strings.Contains(recorder.Body.String(), "admin-shell") {
			t.Fatalf("expected %s to serve index.html, got %q", path, recorder.Body.String())
		}
	}

	asset := performRawRouterRequest(router, http.MethodGet, "/assets/app.js")
	if asset.Code != http.StatusOK || strings.Contains(asset.Body.String(), "admin-shell") || !strings.Contains(asset.Body.String(), "console.log") {
		t.Fatalf("expected root asset response instead of index fallback, got status %d body %s", asset.Code, asset.Body.String())
	}

	for _, path := range []string{
		"/api",
		"/api/v1",
		"/api/v1/unknown",
		"/health/missing",
		"/ready/missing",
		"/openapi.yaml/missing",
	} {
		recorder := performRawRouterRequest(router, http.MethodGet, path)
		if recorder.Code != http.StatusNotFound || strings.Contains(recorder.Body.String(), "admin-shell") {
			t.Fatalf("expected reserved path %s to stay outside SPA fallback, got status %d body %s", path, recorder.Code, recorder.Body.String())
		}
	}

	health := performRawRouterRequest(router, http.MethodGet, "/health")
	if health.Code != http.StatusOK || strings.Contains(health.Body.String(), "admin-shell") {
		t.Fatalf("expected /health to stay probe response, got status %d body %s", health.Code, health.Body.String())
	}

	ready := performRawRouterRequest(router, http.MethodGet, "/ready")
	if ready.Code != http.StatusServiceUnavailable || strings.Contains(ready.Body.String(), "admin-shell") {
		t.Fatalf("expected /ready to stay probe response, got status %d body %s", ready.Code, ready.Body.String())
	}

	openapi := performRawRouterRequest(router, http.MethodGet, OpenAPIPath)
	if openapi.Code != http.StatusOK || strings.Contains(openapi.Body.String(), "admin-shell") {
		t.Fatalf("expected /openapi.yaml to stay generated YAML, got status %d body %s", openapi.Code, openapi.Body.String())
	}
}

func TestNewRouterServesWebUIAfterLateStaticGeneration(t *testing.T) {
	distDir := t.TempDir()
	router := newTestRouter(RouterDeps{
		WebUI: WebUIDeps{Enabled: true, MountPath: "/admin", DistDir: distDir},
	})

	before := performRawRouterRequest(router, http.MethodGet, "/admin")
	if before.Code != http.StatusNotFound {
		t.Fatalf("expected missing WebUI dist to return %d before generation, got %d with body %s", http.StatusNotFound, before.Code, before.Body.String())
	}

	assetDir := filepath.Join(distDir, "assets")
	if err := os.MkdirAll(assetDir, 0755); err != nil {
		t.Fatalf("mkdir assets: %v", err)
	}
	if err := os.WriteFile(filepath.Join(distDir, "index.html"), []byte(`<!doctype html><div id="admin-shell"></div>`), 0644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}
	if err := os.WriteFile(filepath.Join(assetDir, "app.js"), []byte(`console.log("admin")`), 0644); err != nil {
		t.Fatalf("write app.js: %v", err)
	}

	after := performRawRouterRequest(router, http.MethodGet, "/admin/login")
	if after.Code != http.StatusOK {
		t.Fatalf("expected late generated WebUI status %d, got %d with body %s", http.StatusOK, after.Code, after.Body.String())
	}
	if !strings.Contains(after.Body.String(), "admin-shell") {
		t.Fatalf("expected late generated WebUI to serve index.html, got %q", after.Body.String())
	}
	asset := performRawRouterRequest(router, http.MethodGet, "/admin/assets/app.js")
	if asset.Code != http.StatusOK || !strings.Contains(asset.Body.String(), "console.log") {
		t.Fatalf("expected late generated asset response, got status %d body %s", asset.Code, asset.Body.String())
	}
}

// newTestRouter 构造当前测试场景所需的最小依赖集合，避免测试直接耦合生产装配流程。
func newTestRouter(deps RouterDeps) *web.Engine {
	engine, router := testsupport.HTTPRouter("test")
	if deps.Router == nil {
		deps.Router = router
	}
	if deps.StaticSPA == nil {
		deps.StaticSPA = router
	}
	NewRouter(deps)
	return engine
}

func newWebUIDist(t *testing.T) string {
	t.Helper()

	distDir := t.TempDir()
	assetDir := filepath.Join(distDir, "assets")
	if err := os.MkdirAll(assetDir, 0755); err != nil {
		t.Fatalf("mkdir assets: %v", err)
	}
	if err := os.WriteFile(filepath.Join(distDir, "index.html"), []byte(`<!doctype html><div id="admin-shell"></div>`), 0644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}
	if err := os.WriteFile(filepath.Join(assetDir, "app.js"), []byte(`console.log("react")`), 0644); err != nil {
		t.Fatalf("write react app.js: %v", err)
	}
	return distDir
}

// performRouterRequest 执行测试 HTTP 请求并返回响应记录器，封装路由调用细节。
func performRouterRequest(t *testing.T, router http.Handler, method string, path string) (*httptest.ResponseRecorder, routerResponse) {
	t.Helper()

	request := httptest.NewRequest(method, path, nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	var body routerResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response body %q: %v", recorder.Body.String(), err)
	}
	return recorder, body
}

func performRawRouterRequest(router http.Handler, method string, path string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	return recorder
}

func performJSONRouterRequest(router http.Handler, method string, path string, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	return recorder
}

func TestNewRouterSystemMenusSeparateTenantAndPlatformScopes(t *testing.T) {
	auth := &fakeIAMService{}
	systemHandler := systemhandler.New(systemservice.New(systemservice.Config{}), permissionAuthorizer{
		"tenant|api_token:read": true,
		"tenant|audit:read":     true,
		"tenant|role:read":      true,
		"tenant|session:read":   true,
		"tenant|user:read":      true,
	}, nil)
	router := newTestRouter(RouterDeps{
		IAMAuth:       auth,
		SystemHandler: systemHandler,
	})

	request := httptest.NewRequest(http.MethodGet, "/api/v1/system/menus", nil)
	request.Header.Set("Authorization", "Bearer token")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected system menus status %d, got %d body %s", http.StatusOK, recorder.Code, recorder.Body.String())
	}
	var body menuResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode system menu response: %v", err)
	}
	for _, item := range []struct {
		group string
		code  string
	}{
		{group: "identity", code: "users"},
		{group: "identity", code: "roles"},
		{group: "identity", code: "sessions"},
		{group: "identity", code: "security"},
		{group: "identity", code: "api-tokens"},
		{group: "logs", code: "login-logs"},
		{group: "logs", code: "audit-logs"},
	} {
		if !menuContains(body, item.group, item.code) {
			t.Fatalf("expected tenant menu %s/%s in %#v", item.group, item.code, body.Data)
		}
	}
	for _, item := range []struct {
		group string
		code  string
	}{
		{group: "identity", code: "iam"},
		{group: "identity", code: "organizations"},
		{group: "identity", code: "traffic-hijack"},
		{group: "logs", code: "error-logs"},
		{group: "system", code: "menus"},
		{group: "system", code: "system"},
		{group: "integration", code: "apis"},
		{group: "integration", code: "versions"},
		{group: "media", code: "media"},
	} {
		if menuContains(body, item.group, item.code) {
			t.Fatalf("platform menu %s/%s should be hidden for tenant permissions: %#v", item.group, item.code, body.Data)
		}
	}
}

func menuContains(body menuResponse, groupCode string, itemCode string) bool {
	for _, group := range body.Data {
		if group.Code != groupCode {
			continue
		}
		for _, item := range group.Items {
			if item.Code == itemCode {
				return true
			}
		}
	}
	return false
}

// assertSuccessResponse 校验测试响应或状态中的关键字段，使测试断言聚焦在对外契约而非重复解析细节。
func apiCatalogContains(body apiCatalogResponse, method string, path string, permission string) bool {
	return apiGroupsContain(body.Data, method, path, permission)
}

func apiGroupsContain(groups []apiCatalogGroup, method string, path string, permission string) bool {
	for _, group := range groups {
		for _, item := range group.Items {
			if item.Method == method && item.Path == path && item.Permission == permission {
				return true
			}
		}
	}
	return false
}

func menuPermissionContractKey(productCode string, scope string, permission string) string {
	return strings.ToLower(strings.TrimSpace(productCode)) + "|" + strings.ToLower(strings.TrimSpace(scope)) + "|" + strings.ToLower(strings.TrimSpace(permission))
}

func apiCatalogAccess(body apiCatalogResponse, method string, path string, access string) bool {
	for _, group := range body.Data {
		for _, item := range group.Items {
			if item.Method == method && item.Path == path && item.Access == access {
				return true
			}
		}
	}
	return false
}

func assertSuccessResponse(t *testing.T, body routerResponse) {
	t.Helper()

	if body.Code != 0 {
		t.Fatalf("expected response code 0, got %d", body.Code)
	}
	if body.MessageKey != "api.common.success" {
		t.Fatalf("expected response messageKey api.common.success, got %q", body.MessageKey)
	}
	if body.Data == nil {
		t.Fatal("expected response data to be present")
	}
}

// assertDataValue 校验测试响应或状态中的关键字段，使测试断言聚焦在对外契约而非重复解析细节。
func assertDataValue(t *testing.T, data map[string]any, key string, want string) {
	t.Helper()

	got, ok := data[key].(string)
	if !ok {
		t.Fatalf("expected data.%s to be a string, got %#v", key, data[key])
	}
	if got != want {
		t.Fatalf("expected data.%s %q, got %q", key, want, got)
	}
}
