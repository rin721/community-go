package webuiauth

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/rin721/go-scaffold-template/internal/module/auth/model"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

const (
	operationSetup   contract.OperationID = "auth.webui.setup"
	operationLogin   contract.OperationID = "auth.webui.login"
	operationSession contract.OperationID = model.OperationWebUISession
	operationLogout  contract.OperationID = "auth.webui.logout"
)

var (
	credentialsSchema = contract.Object().Required("username", "password").
				Prop("username", contract.String().MinLength(1).MaxLength(128)).
				Prop("password", contract.String().MinLength(12).MaxLength(256))
	setupSchema = contract.Object().Required("setupToken", "username", "password").
			Prop("setupToken", contract.String().MinLength(1).MaxLength(512)).
			Prop("username", contract.String().MinLength(1).MaxLength(128)).
			Prop("password", contract.String().MinLength(12).MaxLength(256))
	httpUserSchema = contract.Object().Required("id", "username", "scopes").
			Prop("id", contract.String()).Prop("username", contract.String()).Prop("scopes", contract.Array(contract.String()))
	httpSessionSchema = contract.Object().Required("user", "csrfToken", "createdAt", "idleExpiresAt", "absoluteExpiresAt").
				Prop("user", contract.Ref("WebUIAuthUser")).Prop("csrfToken", contract.String()).
				Prop("createdAt", contract.String().Format("date-time")).Prop("idleExpiresAt", contract.String().Format("date-time")).
				Prop("absoluteExpiresAt", contract.String().Format("date-time"))
)

// ModuleContract 返回当前 Auth WebUI 的真实 HTTP operation；054 将以 IAM 单轨替换该完成品。
func ModuleContract() contract.Module {
	return contract.Module{
		ID: "auth", Name: "Auth", Description: "当前 WebUI 本地认证边界。",
		SecuritySchemes: []contract.SecurityScheme{
			{ID: contract.SecurityBearer, Kind: contract.SecuritySchemeHTTPBearer},
			{ID: contract.SecurityWebUISession, Kind: contract.SecuritySchemeAPIKeyCookie, ParameterName: SessionCookieName},
		},
		Schemas: []*contract.Schema{
			setupSchema.Named("WebUIAuthSetupRequest"), credentialsSchema.Named("WebUIAuthLoginRequest"),
			httpUserSchema.Named("WebUIAuthUser"), httpSessionSchema.Named("WebUIAuthSession"),
		},
		Operations: []contract.Operation{
			{ID: operationSetup, Method: contract.MethodPost, Path: "/api/v1/webui/auth/setup", Tags: []string{"Auth"}, Security: contract.SecurityNone, Policy: contract.Policy{Mode: contract.PolicyModePublic}, Params: []contract.Param{{Name: "Origin", Location: contract.ParamHeader, Required: true, Schema: contract.String()}}, Request: &contract.Request{Schema: contract.Ref("WebUIAuthSetupRequest")}, Responses: []contract.Response{{Status: http.StatusCreated, Schema: contract.Ref("WebUIAuthSession")}}},
			{ID: operationLogin, Method: contract.MethodPost, Path: "/api/v1/webui/auth/login", Tags: []string{"Auth"}, Security: contract.SecurityNone, Policy: contract.Policy{Mode: contract.PolicyModePublic}, Params: []contract.Param{{Name: "Origin", Location: contract.ParamHeader, Required: true, Schema: contract.String()}}, Request: &contract.Request{Schema: contract.Ref("WebUIAuthLoginRequest")}, Responses: []contract.Response{{Status: http.StatusOK, Schema: contract.Ref("WebUIAuthSession")}}},
			{ID: operationSession, Method: contract.MethodGet, Path: "/api/v1/webui/auth/session", Tags: []string{"Auth"}, Security: contract.SecurityWebUISession, Policy: contract.Policy{Mode: contract.PolicyModeProtected, Scope: string(model.ScopeManagementRead), Action: "auth.webui.session.read"}, Responses: []contract.Response{{Status: http.StatusOK, Schema: contract.Ref("WebUIAuthSession")}}},
			{ID: operationLogout, Method: contract.MethodPost, Path: "/api/v1/webui/auth/logout", Tags: []string{"Auth"}, Security: contract.SecurityWebUISession, Policy: contract.Policy{Mode: contract.PolicyModeProtected, Scope: string(model.ScopeManagementRead), Action: "auth.webui.session.logout"}, Params: []contract.Param{{Name: "Origin", Location: contract.ParamHeader, Required: true, Schema: contract.String()}, {Name: "X-CSRF-Token", Location: contract.ParamHeader, Required: true, Schema: contract.String()}}, Responses: []contract.Response{{Status: http.StatusNoContent}}},
		},
	}
}

// RuntimeHandlers 返回与 ModuleContract 一一对应的运行时 handler。
func RuntimeHandlers(service *Service) map[contract.OperationID]contract.Handler {
	if service == nil {
		return nil
	}
	return map[contract.OperationID]contract.Handler{
		operationSetup:   handlerFunc(service.setupHTTP),
		operationLogin:   handlerFunc(service.loginHTTP),
		operationSession: handlerFunc(service.sessionHTTP),
		operationLogout:  handlerFunc(service.logoutHTTP),
	}
}

type handlerFunc func(http.ResponseWriter, *http.Request) error

func (handler handlerFunc) ServeHTTP(writer http.ResponseWriter, request *http.Request) error {
	return handler(writer, request)
}

type resolvedSession struct {
	ID      string
	Session Session
}

type resolvedSessionContextKey struct{}

// AuthenticateRequest 解析一次 Cookie Session，并同时注入 Principal 与当前 Session 快照。
func (service *Service) AuthenticateRequest(request *http.Request) (*http.Request, error) {
	if service == nil || request == nil {
		return nil, ErrSessionInvalid
	}
	sessionID, err := cookieValue(request)
	if err != nil {
		return nil, err
	}
	session, principal, err := service.Resolve(request.Context(), sessionID)
	if err != nil {
		return nil, err
	}
	ctx := model.WithPrincipal(request.Context(), principal)
	ctx = context.WithValue(ctx, resolvedSessionContextKey{}, resolvedSession{ID: sessionID, Session: session})
	return request.WithContext(ctx), nil
}

func resolvedSessionFromContext(ctx context.Context) (resolvedSession, bool) {
	resolved, ok := ctx.Value(resolvedSessionContextKey{}).(resolvedSession)
	return resolved, ok && resolved.ID != ""
}

func (service *Service) setupHTTP(writer http.ResponseWriter, request *http.Request) error {
	if !service.allowsOrigin(request) {
		writeAuthError(writer, http.StatusForbidden, "origin_rejected")
		return nil
	}
	var input struct {
		SetupToken string `json:"setupToken"`
		Username   string `json:"username"`
		Password   string `json:"password"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeAuthError(writer, http.StatusBadRequest, "invalid_request")
		return nil
	}
	session, err := service.Setup(request.Context(), input.SetupToken, input.Username, input.Password)
	if err != nil {
		writeServiceError(writer, err)
		return nil
	}
	writeSession(writer, session, http.StatusCreated)
	return nil
}

func (service *Service) loginHTTP(writer http.ResponseWriter, request *http.Request) error {
	if !service.allowsOrigin(request) {
		writeAuthError(writer, http.StatusForbidden, "origin_rejected")
		return nil
	}
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := decodeJSON(request, &input); err != nil {
		writeAuthError(writer, http.StatusBadRequest, "invalid_request")
		return nil
	}
	session, err := service.Login(request.Context(), input.Username, input.Password)
	if err != nil {
		writeServiceError(writer, err)
		return nil
	}
	writeSession(writer, session, http.StatusOK)
	return nil
}

func (service *Service) sessionHTTP(writer http.ResponseWriter, request *http.Request) error {
	resolved, ok := resolvedSessionFromContext(request.Context())
	if !ok {
		writeAuthError(writer, http.StatusUnauthorized, "unauthenticated")
		return nil
	}
	csrfToken, err := service.RotateCSRF(request.Context(), resolved.ID)
	if err != nil {
		writeAuthError(writer, http.StatusUnauthorized, "unauthenticated")
		return nil
	}
	resolved.Session.CSRFToken = csrfToken
	writeSession(writer, resolved.Session, http.StatusOK)
	return nil
}

func (service *Service) logoutHTTP(writer http.ResponseWriter, request *http.Request) error {
	if !service.allowsOrigin(request) {
		writeAuthError(writer, http.StatusForbidden, "origin_rejected")
		return nil
	}
	resolved, ok := resolvedSessionFromContext(request.Context())
	if !ok {
		writeAuthError(writer, http.StatusUnauthorized, "unauthenticated")
		return nil
	}
	if err := service.ValidateCSRF(request.Context(), resolved.ID, request.Header.Get("X-CSRF-Token")); err != nil {
		writeAuthError(writer, http.StatusForbidden, "csrf_rejected")
		return nil
	}
	if err := service.Logout(request.Context(), resolved.ID); err != nil {
		writeAuthError(writer, http.StatusInternalServerError, "internal_server_error")
		return nil
	}
	http.SetCookie(writer, &http.Cookie{Name: SessionCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})
	writer.WriteHeader(http.StatusNoContent)
	return nil
}

// WithSession 将有效 WebUI Session 转换成 request Principal；management 边界仍复用此适配器。
func (service *Service) WithSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		authenticated, err := service.AuthenticateRequest(request)
		if err != nil {
			writeAuthError(writer, http.StatusUnauthorized, "unauthenticated")
			return
		}
		next.ServeHTTP(writer, authenticated)
	})
}

// WithOptionalSession 注入有效 Session；未登录请求继续交给公开 manifest 处理。
func (service *Service) WithOptionalSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		authenticated, err := service.AuthenticateRequest(request)
		if err != nil {
			next.ServeHTTP(writer, request)
			return
		}
		next.ServeHTTP(writer, authenticated)
	})
}

func decodeJSON(request *http.Request, target any) error {
	if request.Body == nil {
		return errors.New("request body is missing")
	}
	decoder := json.NewDecoder(io.LimitReader(request.Body, 16<<10))
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func writeSession(writer http.ResponseWriter, session Session, status int) {
	http.SetCookie(writer, &http.Cookie{Name: SessionCookieName, Value: session.ID, Path: "/", HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})
	writer.Header().Set("Cache-Control", "no-store")
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(struct {
		User              User   `json:"user"`
		CSRFToken         string `json:"csrfToken"`
		CreatedAt         any    `json:"createdAt"`
		IdleExpiresAt     any    `json:"idleExpiresAt"`
		AbsoluteExpiresAt any    `json:"absoluteExpiresAt"`
	}{session.User, session.CSRFToken, session.CreatedAt, session.IdleExpiresAt, session.AbsoluteExpiresAt})
}

func cookieValue(request *http.Request) (string, error) {
	cookie, err := request.Cookie(SessionCookieName)
	if err != nil || cookie.Value == "" {
		return "", ErrSessionInvalid
	}
	return cookie.Value, nil
}

func (service *Service) allowsOrigin(request *http.Request) bool {
	origin := strings.TrimSpace(request.Header.Get("Origin"))
	if origin == "" {
		return false
	}
	if httpx.SameOrigin(request, origin) {
		return true
	}
	_, allowed := service.allowedOrigins[origin]
	return allowed
}

func writeServiceError(writer http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errUsernameInvalid):
		writeAuthError(writer, http.StatusBadRequest, "username_invalid")
	case errors.Is(err, errPasswordLengthInvalid):
		writeAuthError(writer, http.StatusBadRequest, "password_length_invalid")
	case errors.Is(err, ErrWebUILocked):
		writeAuthError(writer, http.StatusTooManyRequests, "account_locked")
	case errors.Is(err, ErrSetupClosed):
		writeAuthError(writer, http.StatusConflict, "setup_closed")
	case errors.Is(err, ErrInvalidCredentials):
		writeAuthError(writer, http.StatusUnauthorized, "invalid_credentials")
	default:
		writeAuthError(writer, http.StatusInternalServerError, "internal_server_error")
	}
}

func writeAuthError(writer http.ResponseWriter, status int, code string) {
	writer.Header().Set("Cache-Control", "no-store")
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(struct {
		Code string `json:"code"`
	}{code})
}
