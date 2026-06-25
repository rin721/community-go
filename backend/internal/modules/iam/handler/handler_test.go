package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/open-console/console-platform/types/result"
)

func TestQueryFilterInvalidParamsKeepFieldContext(t *testing.T) {
	tests := []struct {
		name      string
		target    string
		parse     func(*handlerTestContext) bool
		wantKey   string
		wantField string
	}{
		{
			name:   "audit numeric limit",
			target: "/api/v1/orgs/1/audit-logs?limit=abc",
			parse: func(c *handlerTestContext) bool {
				_, ok := parseAuditLogFilter(c)
				return ok
			},
			wantKey:   "validation.common.invalidNumber",
			wantField: "limit",
		},
		{
			name:   "audit RFC3339 from",
			target: "/api/v1/orgs/1/audit-logs?from=abc",
			parse: func(c *handlerTestContext) bool {
				_, ok := parseAuditLogFilter(c)
				return ok
			},
			wantKey:   "validation.common.invalid",
			wantField: "from",
		},
		{
			name:   "api token numeric user id",
			target: "/api/v1/orgs/1/api-tokens?userId=abc",
			parse: func(c *handlerTestContext) bool {
				_, ok := parseAPITokenFilter(c)
				return ok
			},
			wantKey:   "validation.common.invalidNumber",
			wantField: "userId",
		},
		{
			name:   "user list numeric page size",
			target: "/api/v1/orgs/1/users?pageSize=abc",
			parse: func(c *handlerTestContext) bool {
				_, ok := parseUserListFilter(c)
				return ok
			},
			wantKey:   "validation.common.invalidNumber",
			wantField: "pageSize",
		},
		{
			name:   "organization list numeric page",
			target: "/api/v1/orgs?page=abc",
			parse: func(c *handlerTestContext) bool {
				_, ok := parseOrganizationListFilter(c)
				return ok
			},
			wantKey:   "validation.common.invalidNumber",
			wantField: "page",
		},
		{
			name:   "session list numeric user id",
			target: "/api/v1/orgs/1/sessions?userId=abc",
			parse: func(c *handlerTestContext) bool {
				_, ok := parseSessionListFilter(c)
				return ok
			},
			wantKey:   "validation.common.invalidNumber",
			wantField: "userId",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := newHandlerTestContext(http.MethodGet, tt.target)

			if ok := tt.parse(ctx); ok {
				t.Fatal("parse should fail")
			}

			if ctx.status != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", ctx.status, http.StatusBadRequest)
			}
			body := responseBody(t, ctx)
			if body.MessageKey != tt.wantKey {
				t.Fatalf("messageKey = %q, want %q", body.MessageKey, tt.wantKey)
			}
			if got := body.MessageArgs["field"]; got != tt.wantField {
				t.Fatalf("field arg = %#v, want %q", got, tt.wantField)
			}
		})
	}
}

func TestQueryFilterValidParamsDoNotWriteResponse(t *testing.T) {
	ctx := newHandlerTestContext(http.MethodGet, "/api/v1/orgs/1/audit-logs?limit=10&userId=42&cursor=7&from=2026-06-22T00:00:00Z&to=2026-06-22T01:00:00Z")

	filter, ok := parseAuditLogFilter(ctx)
	if !ok {
		t.Fatal("parse should succeed")
	}
	if ctx.wrote {
		t.Fatalf("unexpected response write: status=%d body=%#v", ctx.status, ctx.body)
	}
	if filter.Limit != 10 || filter.UserID != 42 || filter.Cursor != 7 {
		t.Fatalf("unexpected numeric filter: %#v", filter)
	}
	if filter.From.IsZero() || filter.To.IsZero() {
		t.Fatalf("expected time range to be parsed: %#v", filter)
	}
}

func responseBody(t *testing.T, ctx *handlerTestContext) *result.Result[any] {
	t.Helper()
	body, ok := ctx.body.(*result.Result[any])
	if !ok {
		t.Fatalf("body = %T, want *result.Result[any]", ctx.body)
	}
	return body
}

type handlerTestContext struct {
	body       any
	header     http.Header
	params     map[string]string
	req        *http.Request
	status     int
	values     map[any]any
	wrote      bool
	bindErr    error
	boundBytes []byte
}

func newHandlerTestContext(method string, target string) *handlerTestContext {
	return &handlerTestContext{
		header: http.Header{},
		params: map[string]string{},
		req:    httptest.NewRequest(method, target, nil),
		status: http.StatusOK,
		values: map[any]any{},
	}
}

func (c *handlerTestContext) Request() *http.Request {
	return c.req
}

func (c *handlerTestContext) RequestContext() context.Context {
	return c.req.Context()
}

func (c *handlerTestContext) GetHeader(name string) string {
	return c.req.Header.Get(name)
}

func (c *handlerTestContext) Header(name string, value string) {
	c.header.Set(name, value)
}

func (c *handlerTestContext) Cookie(name string) (string, error) {
	cookie, err := c.req.Cookie(name)
	if err != nil {
		return "", err
	}
	return cookie.Value, nil
}

func (c *handlerTestContext) SetCookie(cookie *http.Cookie) {
	c.header.Add("Set-Cookie", cookie.String())
}

func (c *handlerTestContext) Set(key string, value any) {
	c.values[key] = value
}

func (c *handlerTestContext) Get(key any) (any, bool) {
	value, ok := c.values[key]
	return value, ok
}

func (c *handlerTestContext) Param(name string) string {
	return c.params[name]
}

func (c *handlerTestContext) BindJSON(dest any) error {
	if c.bindErr != nil {
		return c.bindErr
	}
	if len(c.boundBytes) == 0 {
		return errors.New("empty request body")
	}
	return json.NewDecoder(bytes.NewReader(c.boundBytes)).Decode(dest)
}

func (c *handlerTestContext) JSON(status int, body any) {
	c.status = status
	c.body = body
	c.wrote = true
}

func (c *handlerTestContext) Data(status int, _ string, body []byte) {
	c.status = status
	c.body = body
	c.wrote = true
}

func (c *handlerTestContext) AbortWithStatusJSON(status int, body any) {
	c.JSON(status, body)
}

func (c *handlerTestContext) Next() {}

func (c *handlerTestContext) Path() string {
	return c.req.URL.Path
}

func (c *handlerTestContext) Method() string {
	return c.req.Method
}

func (c *handlerTestContext) ClientIP() string {
	return "127.0.0.1"
}

func (c *handlerTestContext) Status() int {
	return c.status
}
