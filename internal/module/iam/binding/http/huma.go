package httpbinding

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
	"github.com/rin721/go-scaffold-template/internal/transport/http/humabinding"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

type loginInput struct {
	Origin string `header:"Origin" required:"true"`
	Body   struct {
		Username string `json:"username" minLength:"3" maxLength:"64"`
		Password string `json:"password" minLength:"1" maxLength:"128"`
	}
}

type loginOutput struct {
	SetCookie    string `header:"Set-Cookie"`
	CacheControl string `header:"Cache-Control"`
	Body         sessionResponse
}

// RegisterHumaSlice 注册 IAM public JSON body 第一片，并保留模块拥有的 Origin 策略。
func RegisterHumaSlice(api huma.API, handler *Handler) {
	operation := humabinding.JSONOperation(huma.Operation{
		OperationID: string(opLogin),
		Method:      http.MethodPost,
		Path:        "/api/v1/iam/login",
		Tags:        []string{"IAM"},
		Summary:     "Create an IAM session",
		Middlewares: huma.Middlewares{handler.requireLoginOrigin},
	}, string(contract.SecurityNone))
	huma.Register(api, operation, func(ctx context.Context, input *loginInput) (*loginOutput, error) {
		session, err := handler.service.Login(ctx, input.Body.Username, input.Body.Password)
		if err != nil {
			return nil, httpx.NewProtocolProblemError(ctx, serviceError(err))
		}
		cookie := (&http.Cookie{Name: service.SessionCookieName, Value: session.ID, Path: "/", HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode}).String()
		return &loginOutput{
			SetCookie: cookie, CacheControl: "no-store",
			Body: sessionOutput(session),
		}, nil
	})
}

// HumaSlice 返回可由 composition 显式装配的无资源 registration。
func HumaSlice(handler *Handler) humabinding.Registration {
	return func(api huma.API) { RegisterHumaSlice(api, handler) }
}

func (handler *Handler) requireLoginOrigin(ctx huma.Context, next func(huma.Context)) {
	request, writer := humabinding.UnwrapHTTP(ctx)
	if !handler.originAllowed(request) {
		httpx.WriteProblem(writer, request, statusError(http.StatusForbidden, "origin_rejected", nil))
		return
	}
	next(ctx)
}

func sessionOutput(value service.Session) sessionResponse {
	return sessionResponse{Identity: identityResponse{AccountID: value.Identity.AccountID, Username: value.Identity.Username, DisplayName: value.Identity.DisplayName, Permissions: value.Identity.Permissions, MustChangePassword: value.Identity.MustChangePassword, SecurityRevision: value.Identity.SecurityRevision}, CSRFToken: value.CSRFToken, CreatedAt: value.CreatedAt, IdleExpiresAt: value.IdleExpiresAt, AbsoluteExpiresAt: value.AbsoluteExpiresAt}
}
