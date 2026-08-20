// Package auth 封装认证、授权、审计及其运行时参与者。
package auth

import (
	"fmt"
	"net"
	"net/http"
	"net/url"

	"github.com/rin721/go-scaffold-template/internal/module"
	auditadapter "github.com/rin721/go-scaffold-template/internal/module/auth/adapter/audit"
	jwtadapter "github.com/rin721/go-scaffold-template/internal/module/auth/adapter/jwt"
	configbinding "github.com/rin721/go-scaffold-template/internal/module/auth/binding/config"
	"github.com/rin721/go-scaffold-template/internal/module/auth/middleware"
	"github.com/rin721/go-scaffold-template/internal/module/auth/model"
	"github.com/rin721/go-scaffold-template/internal/module/auth/service"
	webuiauth "github.com/rin721/go-scaffold-template/internal/module/auth/webuiauth"
	"github.com/rin721/go-scaffold-template/pkg/clock"
	"github.com/rin721/go-scaffold-template/pkg/logger"
	"github.com/rin721/go-scaffold-template/pkg/supervisor"
)

const moduleID module.ID = "auth"

// Dependencies 是 Auth module 实际使用的稳定能力和 authority inventory。
type Dependencies struct {
	Clock       clock.Clock
	Logger      logger.Logger
	Config      configbinding.Config
	Policies    []model.Policy
	WebUIAccess webuiauth.Access
}

// Module 是 Auth 局部装配后交给 composition root 的完成品。
type Module struct {
	Service        *service.Service
	HTTPMiddleware func(http.Handler) http.Handler
	Contribution   module.Contribution
	WebUI          *webuiauth.Service
	WebUIHTTP      http.Handler
}

// ManagementMiddleware 允许 management 使用 Bearer 或 WebUI Session，普通 API 不走此入口。
func (m Module) ManagementMiddleware(next http.Handler) http.Handler {
	if next == nil {
		return http.NotFoundHandler()
	}
	if m.WebUI == nil {
		return m.HTTPMiddleware(next)
	}
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if cookie, err := request.Cookie(webuiauth.SessionCookieName); err == nil && cookie.Value != "" {
			m.WebUI.WithSession(next).ServeHTTP(writer, request)
			return
		}
		m.HTTPMiddleware(next).ServeHTTP(writer, request)
	})
}

// NewHTTP 按已校验配置构造 HTTP Auth profile；构造阶段不执行网络 I/O。
func NewHTTP(dependencies Dependencies) (Module, error) {
	audit, err := auditadapter.New(dependencies.Logger)
	if err != nil {
		return Module{}, fmt.Errorf("compose auth audit adapter: %w", err)
	}
	var (
		verifier     service.CredentialVerifier
		development  *model.Principal
		participants []supervisor.Participant
	)
	switch dependencies.Config.Mode {
	case configbinding.ModeDevelopmentAnonymous:
		now := dependencies.Clock.Now()
		scopes := make([]model.Scope, len(dependencies.Config.AnonymousScopes))
		for index, scope := range dependencies.Config.AnonymousScopes {
			scopes[index] = model.Scope(scope)
		}
		principal, principalErr := model.NewPrincipal(
			dependencies.Config.AnonymousSubject, model.ActorDevelopment, scopes, now, now,
		)
		if principalErr != nil {
			return Module{}, fmt.Errorf("compose development principal: %w", principalErr)
		}
		development = &principal
	case configbinding.ModeJWT:
		jwtConfig := dependencies.Config.JWT
		adapter, adapterErr := jwtadapter.New(jwtadapter.Config{
			Issuer: jwtConfig.Issuer, Audience: jwtConfig.Audience, JWKSURL: jwtConfig.JWKSURL,
			Algorithms: jwtConfig.Algorithms, ScopesClaim: jwtConfig.ScopesClaim,
			RequestTimeout: jwtConfig.RequestTimeout, RefreshInterval: jwtConfig.RefreshInterval,
			RefreshTimeout: jwtConfig.RefreshTimeout, Leeway: jwtConfig.Leeway,
			MaxResponseBodyBytes:   jwtConfig.MaxResponseBodyBytes,
			AllowLoopbackOrPrivate: loopbackURL(jwtConfig.JWKSURL),
		}, dependencies.Clock)
		if adapterErr != nil {
			return Module{}, fmt.Errorf("compose JWT verifier: %w", adapterErr)
		}
		verifier = adapter
		participants = append(participants, adapter)
	default:
		return Module{}, fmt.Errorf("compose auth module: unsupported mode %q", dependencies.Config.Mode)
	}
	authService, err := service.New(dependencies.Clock, verifier, development, audit, dependencies.Policies)
	if err != nil {
		return Module{}, fmt.Errorf("compose auth service: %w", err)
	}
	var webuiAuth *webuiauth.Service
	if dependencies.WebUIAccess != nil {
		webuiAuth, err = webuiauth.New(dependencies.WebUIAccess, dependencies.Clock, webuiauth.Config{
			SetupToken: dependencies.Config.Local.SetupToken, IdleTimeout: dependencies.Config.Local.IdleTimeout,
			AbsoluteTimeout: dependencies.Config.Local.AbsoluteTimeout,
		})
		if err != nil {
			return Module{}, fmt.Errorf("compose webui auth service: %w", err)
		}
	}
	var webuiHTTP http.Handler
	if webuiAuth != nil {
		webuiHTTP, err = webuiauth.NewHTTPHandler(webuiAuth)
		if err != nil {
			return Module{}, fmt.Errorf("compose webui auth HTTP: %w", err)
		}
	}
	httpMiddleware, err := middleware.HTTP(authService)
	if err != nil {
		return Module{}, fmt.Errorf("compose auth HTTP middleware: %w", err)
	}
	contribution := module.Contribution{ID: moduleID, Participants: participants}
	if err := module.ValidateContributions(contribution); err != nil {
		return Module{}, fmt.Errorf("validate auth contribution: %w", err)
	}
	return Module{Service: authService, HTTPMiddleware: httpMiddleware, WebUI: webuiAuth, WebUIHTTP: webuiHTTP, Contribution: contribution}, nil
}

// NewLocal 构造 CLI profile；operator 必须由命令执行边界显式提供。
func NewLocal(dependencies Dependencies) (Module, error) {
	audit, err := auditadapter.New(dependencies.Logger)
	if err != nil {
		return Module{}, fmt.Errorf("compose auth audit adapter: %w", err)
	}
	authService, err := service.NewLocal(dependencies.Clock, audit, dependencies.Policies)
	if err != nil {
		return Module{}, fmt.Errorf("compose local auth service: %w", err)
	}
	var webuiAuth *webuiauth.Service
	if dependencies.WebUIAccess != nil {
		webuiAuth, err = webuiauth.New(dependencies.WebUIAccess, dependencies.Clock, webuiauth.Config{
			SetupToken: dependencies.Config.Local.SetupToken, IdleTimeout: dependencies.Config.Local.IdleTimeout,
			AbsoluteTimeout: dependencies.Config.Local.AbsoluteTimeout,
		})
		if err != nil {
			return Module{}, fmt.Errorf("compose local webui auth service: %w", err)
		}
	}
	contribution := module.Contribution{ID: moduleID}
	if err := module.ValidateContributions(contribution); err != nil {
		return Module{}, fmt.Errorf("validate auth contribution: %w", err)
	}
	return Module{Service: authService, WebUI: webuiAuth, Contribution: contribution}, nil
}

func loopbackURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	ip := net.ParseIP(parsed.Hostname())
	return ip != nil && ip.IsLoopback()
}
