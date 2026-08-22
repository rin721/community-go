// Package humabinding 定义模块 binding 与 HTTP transport 之间的最小 Huma 接入契约。
package humabinding

import (
	"mime"
	"net/http"
	"reflect"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
)

const securityMetadata = "project.security"

// Registration 是无资源、可重复构造 OpenAPI 的模块 registration。
type Registration func(huma.API)

// UnwrapHTTP 只供模块级协议 middleware 读取原生 request/response；Router adapter
// 的具体类型不会扩散到模块 binding。
func UnwrapHTTP(ctx huma.Context) (*http.Request, http.ResponseWriter) {
	return humachi.Unwrap(ctx)
}

// Optional 保留 query 参数“缺失”与类型零值的区别，避免用魔法零值改变业务语义。
type Optional[T any] struct {
	Value T
	IsSet bool
}

func (value Optional[T]) Schema(registry huma.Registry) *huma.Schema {
	return huma.SchemaFromType(registry, reflect.TypeOf(value.Value))
}

func (value *Optional[T]) Receiver() reflect.Value {
	return reflect.ValueOf(value).Elem().Field(0)
}

func (value *Optional[T]) OnParamSet(isSet bool, _ any) { value.IsSet = isSet }

// Pointer 只在参数真实出现时返回值地址。
func (value *Optional[T]) Pointer() *T {
	if value == nil || !value.IsSet {
		return nil
	}
	return &value.Value
}

// Operation 附加项目 security 元数据，具体认证与授权仍由 transport Gate 执行。
func Operation(operation huma.Operation, security string) huma.Operation {
	if operation.Metadata == nil {
		operation.Metadata = make(map[string]any)
	}
	operation.Metadata[securityMetadata] = security
	if security == "" {
		operation.Security = []map[string][]string{}
	} else {
		operation.Security = []map[string][]string{{security: {}}}
	}
	return operation
}

// JSONOperation 在 Huma 解码前保持项目既有的显式 application/json 契约。
func JSONOperation(operation huma.Operation, security string) huma.Operation {
	operation = Operation(operation, security)
	operation.Middlewares = append(operation.Middlewares, requireJSONContentType)
	return operation
}

func requireJSONContentType(ctx huma.Context, next func(huma.Context)) {
	request, writer := UnwrapHTTP(ctx)
	mediaType, _, err := mime.ParseMediaType(request.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		httpx.WriteProblem(writer, request, &httpx.StatusError{StatusCode: http.StatusUnsupportedMediaType, Code: "unsupported_media_type", Message: "request Content-Type is not supported", Err: err})
		return
	}
	next(ctx)
}

// Security 返回 transport Gate 所需的项目 security 标识。
func Security(operation *huma.Operation) (string, bool) {
	if operation == nil {
		return "", false
	}
	value, ok := operation.Metadata[securityMetadata].(string)
	return value, ok
}
