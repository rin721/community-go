package httptransport

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/rin721/go-scaffold-template/internal/transport/http/humabinding"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
)

func newHumaAPI(router chi.Router, gate OperationGate) huma.API {
	config := huma.DefaultConfig("application HTTP API", "1.0.0-rc.1")
	config.Info.Description = "generated from module bindings"
	config.OpenAPIPath = ""
	config.DocsPath = ""
	config.SchemasPath = ""
	config.CreateHooks = nil
	config.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		string(contract.SecurityBearer):       {Type: "http", Scheme: "bearer", BearerFormat: "JWT"},
		string(contract.SecurityWebUISession): {Type: "apiKey", In: "cookie", Name: "go_scaffold_session"},
	}

	adapter := &problemAdapter{Adapter: humachi.NewAdapter(router)}
	api := huma.NewAPI(config, adapter)
	api.UseMiddleware(humaOperationGate(gate))
	return api
}

// BuildHumaOpenAPI30 从无资源 registration 生成 OpenAPI 3.0.3，供静态生成门禁复用。
func BuildHumaOpenAPI30(registrations ...humabinding.Registration) ([]byte, error) {
	api := newHumaAPI(chi.NewRouter(), nil)
	for index, registration := range registrations {
		if registration == nil {
			return nil, fmt.Errorf("Huma registration %d is nil", index)
		}
		registration(api)
	}
	payload, err := api.OpenAPI().DowngradeYAML()
	if err != nil {
		return nil, fmt.Errorf("downgrade Huma OpenAPI: %w", err)
	}
	return payload, nil
}

func humaOperationGate(gate OperationGate) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		request, writer := humachi.Unwrap(ctx)
		operationID := ctx.Operation().OperationID
		securityValue, ok := humabinding.Security(ctx.Operation())
		if !ok {
			httpx.WriteProblem(writer, request, fmt.Errorf("operation %q has no project security metadata", operationID))
			return
		}
		security := contract.Security(securityValue)
		requestContext := httpx.WithOperationID(request.Context(), operationID)
		requestContext = httpx.WithRequestLanguage(requestContext, request.Header.Get(acceptLanguageHeader))
		request = request.WithContext(requestContext)
		authenticated, err := gate.Authenticate(request, security)
		if err != nil {
			writeGateError(writer, request, err)
			return
		}
		if err := gate.Enforce(authenticated.Context(), operationID); err != nil {
			writeGateError(writer, authenticated, err)
			return
		}
		next(huma.WithContext(ctx, authenticated.Context()))
	}
}

// problemAdapter 只规范化 Huma 自身的解析/校验错误。业务错误已由项目
// ProtocolProblemError 表达，不会在这里丢失稳定 code 或 request instance。
type problemAdapter struct {
	huma.Adapter
}

func (adapter *problemAdapter) Handle(operation *huma.Operation, handler func(huma.Context)) {
	adapter.Adapter.Handle(operation, func(ctx huma.Context) {
		buffer := &bufferedHumaContext{embeddedHumaContext: ctx, response: &humaResponseBuffer{header: make(http.Header)}}
		handler(buffer)
		buffer.flush()
	})
}

type bufferedHumaContext struct {
	embeddedHumaContext
	response *humaResponseBuffer
}

type embeddedHumaContext interface{ huma.Context }

type humaResponseBuffer struct {
	header http.Header
	status int
	body   bytes.Buffer
}

func (ctx *bufferedHumaContext) Unwrap() huma.Context { return ctx.embeddedHumaContext }

func (ctx *bufferedHumaContext) WithContext(value context.Context) huma.Context {
	return &bufferedHumaContext{embeddedHumaContext: huma.WithContext(ctx.embeddedHumaContext, value), response: ctx.response}
}

func (ctx *bufferedHumaContext) SetStatus(status int) { ctx.response.status = status }
func (ctx *bufferedHumaContext) Status() int          { return ctx.response.status }
func (ctx *bufferedHumaContext) SetHeader(name, value string) {
	ctx.response.header.Set(name, value)
}
func (ctx *bufferedHumaContext) AppendHeader(name, value string) {
	ctx.response.header.Add(name, value)
}
func (ctx *bufferedHumaContext) BodyWriter() io.Writer { return &ctx.response.body }

func (ctx *bufferedHumaContext) flush() {
	request, writer := humachi.Unwrap(ctx.embeddedHumaContext)
	if ctx.response.status >= http.StatusBadRequest && !isProjectProblem(ctx.response.body.Bytes()) {
		status, code, message := humaValidationProblem(ctx.response.status)
		httpx.WriteProblem(writer, request, &httpx.StatusError{StatusCode: status, Code: code, Message: message})
		return
	}
	for name, values := range ctx.response.header {
		for _, value := range values {
			writer.Header().Add(name, value)
		}
	}
	if ctx.response.status != 0 {
		writer.WriteHeader(ctx.response.status)
	}
	_, _ = writer.Write(ctx.response.body.Bytes())
}

func isProjectProblem(payload []byte) bool {
	var problem struct {
		Code string `json:"code"`
	}
	return json.Unmarshal(payload, &problem) == nil && problem.Code != ""
}

func humaValidationProblem(status int) (int, string, string) {
	switch status {
	case http.StatusRequestEntityTooLarge:
		return status, "request_body_too_large", "request body exceeds the configured limit"
	case http.StatusUnsupportedMediaType:
		return status, "unsupported_media_type", "request Content-Type is not supported"
	default:
		return http.StatusBadRequest, "invalid_request", "request does not match the OpenAPI contract"
	}
}
