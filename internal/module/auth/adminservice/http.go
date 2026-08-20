package adminservice

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/rin721/go-scaffold-template/internal/module/auth/model"
)

// NewHTTPHandler 绑定 Admin/Auth setup、login、session 和 logout operation。
func NewHTTPHandler(service *Service) (http.Handler, error) {
	if service == nil {
		return nil, fmt.Errorf("admin auth service is nil")
	}
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method == http.MethodOptions {
			writer.WriteHeader(http.StatusNoContent)
			return
		}
		if request.Method != http.MethodGet && !sameOrigin(request) {
			writeAuthError(writer, request, http.StatusForbidden, "origin_rejected")
			return
		}
		path := request.URL.Path
		path = strings.TrimPrefix(path, "/api/v1/admin/auth")
		path = strings.TrimPrefix(path, "/auth")
		switch {
		case request.Method == http.MethodPost && path == "/setup":
			var input struct {
				SetupToken string `json:"setupToken"`
				Username   string `json:"username"`
				Password   string `json:"password"`
			}
			if err := decodeJSON(request, &input); err != nil {
				writeAuthError(writer, request, http.StatusBadRequest, "invalid_request")
				return
			}
			session, err := service.Setup(request.Context(), input.SetupToken, input.Username, input.Password)
			if err != nil {
				writeServiceError(writer, request, err)
				return
			}
			writeSession(writer, session, http.StatusCreated)
			return
		case request.Method == http.MethodPost && path == "/login":
			var input struct {
				Username string `json:"username"`
				Password string `json:"password"`
			}
			if err := decodeJSON(request, &input); err != nil {
				writeAuthError(writer, request, http.StatusBadRequest, "invalid_request")
				return
			}
			session, err := service.Login(request.Context(), input.Username, input.Password)
			if err != nil {
				writeServiceError(writer, request, err)
				return
			}
			writeSession(writer, session, http.StatusOK)
			return
		case request.Method == http.MethodGet && path == "/session":
			sessionID, err := cookieValue(request)
			if err != nil {
				writeAuthError(writer, request, http.StatusUnauthorized, "unauthenticated")
				return
			}
			session, principal, err := service.Resolve(request.Context(), sessionID)
			if err != nil {
				writeAuthError(writer, request, http.StatusUnauthorized, "unauthenticated")
				return
			}
			session.CSRFToken, err = service.RotateCSRF(request.Context(), sessionID)
			if err != nil {
				writeAuthError(writer, request, http.StatusUnauthorized, "unauthenticated")
				return
			}
			_ = principal
			writeSession(writer, session, http.StatusOK)
			return
		case request.Method == http.MethodPost && path == "/logout":
			sessionID, err := cookieValue(request)
			if err != nil {
				writeAuthError(writer, request, http.StatusUnauthorized, "unauthenticated")
				return
			}
			if err := service.ValidateCSRF(request.Context(), sessionID, request.Header.Get("X-CSRF-Token")); err != nil {
				writeAuthError(writer, request, http.StatusForbidden, "csrf_rejected")
				return
			}
			if err := service.Logout(request.Context(), sessionID); err != nil {
				writeAuthError(writer, request, http.StatusInternalServerError, "internal_server_error")
				return
			}
			http.SetCookie(writer, &http.Cookie{Name: SessionCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode})
			writer.WriteHeader(http.StatusNoContent)
			return
		default:
			writeAuthError(writer, request, http.StatusNotFound, "route_not_found")
		}
	}), nil
}

// WithSession 将有效 Admin Session 转换成 request Principal；无效 Session fail closed。
func (s *Service) WithSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		sessionID, err := cookieValue(request)
		if err != nil {
			writeAuthError(writer, request, http.StatusUnauthorized, "unauthenticated")
			return
		}
		_, principal, err := s.Resolve(request.Context(), sessionID)
		if err != nil {
			writeAuthError(writer, request, http.StatusUnauthorized, "unauthenticated")
			return
		}
		next.ServeHTTP(writer, request.WithContext(model.WithPrincipal(request.Context(), principal)))
	})
}

// WithOptionalSession 注入有效 Session；未登录请求继续交给公开 manifest 处理。
func (s *Service) WithOptionalSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		sessionID, err := cookieValue(request)
		if err != nil {
			next.ServeHTTP(writer, request)
			return
		}
		_, principal, err := s.Resolve(request.Context(), sessionID)
		if err != nil {
			next.ServeHTTP(writer, request)
			return
		}
		next.ServeHTTP(writer, request.WithContext(model.WithPrincipal(request.Context(), principal)))
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
func sameOrigin(request *http.Request) bool {
	origin := strings.TrimSpace(request.Header.Get("Origin"))
	if origin == "" {
		return false
	}
	expectedScheme := "http"
	if request.TLS != nil {
		expectedScheme = "https"
	}
	return origin == expectedScheme+"://"+request.Host
}
func writeServiceError(writer http.ResponseWriter, request *http.Request, err error) {
	switch {
	case errors.Is(err, ErrAdminLocked):
		writeAuthError(writer, request, http.StatusTooManyRequests, "account_locked")
	case errors.Is(err, ErrSetupClosed):
		writeAuthError(writer, request, http.StatusConflict, "setup_closed")
	case errors.Is(err, ErrInvalidCredentials):
		writeAuthError(writer, request, http.StatusUnauthorized, "invalid_credentials")
	default:
		writeAuthError(writer, request, http.StatusInternalServerError, "internal_server_error")
	}
}
func writeAuthError(writer http.ResponseWriter, _ *http.Request, status int, code string) {
	writer.Header().Set("Cache-Control", "no-store")
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(struct {
		Code string `json:"code"`
	}{code})
}
