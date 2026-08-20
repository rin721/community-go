package rpcserver

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	logpkg "github.com/open-console/console-platform/pkg/logger"
)

func TestRPCHandlerCallsRegisteredMethod(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)
	body := []byte(`{"jsonrpc":"2.0","id":1,"method":"system.ping","params":{"echo":"hi"}}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/rpc", bytes.NewReader(body))

	handler.ServeHTTP(rec, req)

	resp := decodeRPCResponse(t, rec)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if string(resp.ID) != "1" {
		t.Fatalf("id = %s, want 1", resp.ID)
	}
	result, ok := resp.Result.(map[string]any)
	if !ok {
		t.Fatalf("result type = %T, want map", resp.Result)
	}
	if result["ok"] != true || result["echo"] != "hi" {
		t.Fatalf("result = %#v, want ok and echo", result)
	}
}

func TestRPCHandlerReturnsMethodRegistry(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)
	body := []byte(`{"jsonrpc":"2.0","id":"methods","method":"system.methods"}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/rpc", bytes.NewReader(body))

	handler.ServeHTTP(rec, req)

	resp := decodeRPCResponse(t, rec)
	gotAny, ok := resp.Result.([]any)
	if !ok {
		t.Fatalf("result type = %T, want []any", resp.Result)
	}
	got := make([]string, 0, len(gotAny))
	for _, value := range gotAny {
		got = append(got, value.(string))
	}
	want := []string{"system.methods", "system.ping"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("methods = %#v, want %#v", got, want)
	}
}

func TestRPCHandlerRejectsUnknownMethod(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)
	body := []byte(`{"jsonrpc":"2.0","id":1,"method":"missing.method"}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/rpc", bytes.NewReader(body))

	handler.ServeHTTP(rec, req)

	resp := decodeRPCResponse(t, rec)
	if resp.Error == nil || resp.Error.Code != CodeMethodNotFound {
		t.Fatalf("error = %#v, want method not found", resp.Error)
	}
}

func TestRPCHandlerRejectsInvalidJSON(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/rpc", bytes.NewReader([]byte(`{`)))

	handler.ServeHTTP(rec, req)

	resp := decodeRPCResponse(t, rec)
	if resp.Error == nil || resp.Error.Code != CodeParseError {
		t.Fatalf("error = %#v, want parse error", resp.Error)
	}
}

func TestRPCHandlerRejectsInvalidRequest(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)
	body := []byte(`{"jsonrpc":"2.0","method":"system.ping"}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/rpc", bytes.NewReader(body))

	handler.ServeHTTP(rec, req)

	resp := decodeRPCResponse(t, rec)
	if resp.Error == nil || resp.Error.Code != CodeInvalidRequest {
		t.Fatalf("error = %#v, want invalid request", resp.Error)
	}
}

func TestRPCHandlerRejectsNonPost(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/rpc", nil)

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 405", rec.Code)
	}
	resp := decodeRPCResponse(t, rec)
	if resp.Error == nil || resp.Error.Code != CodeInvalidRequest {
		t.Fatalf("error = %#v, want invalid request", resp.Error)
	}
}

func TestRPCHandlerLogsResponseWriteError(t *testing.T) {
	t.Parallel()

	log := &recordingLogger{}
	handler := newTestHandlerWithLogger(t, log)
	writeErr := errors.New("client connection closed")
	writer := &failingResponseWriter{header: http.Header{}, err: writeErr}
	body := []byte(`{"jsonrpc":"2.0","id":1,"method":"system.ping"}`)
	req := httptest.NewRequest(http.MethodPost, "/rpc", bytes.NewReader(body))

	handler.ServeHTTP(writer, req)

	if writer.status != http.StatusOK {
		t.Fatalf("status = %d, want 200", writer.status)
	}
	if len(log.warns) != 1 {
		t.Fatalf("warn entries = %#v, want one response write failure", log.warns)
	}
	entry := log.warns[0]
	if entry.message != "rpc response write failed" {
		t.Fatalf("warn message = %q", entry.message)
	}
	if got := entry.value("path"); got != "/rpc" {
		t.Fatalf("logged path = %#v, want /rpc", got)
	}
	if got := entry.value("status"); got != http.StatusOK {
		t.Fatalf("logged status = %#v, want %d", got, http.StatusOK)
	}
	gotErr, ok := entry.value("error").(error)
	if !ok || !errors.Is(gotErr, writeErr) {
		t.Fatalf("logged error = %#v, want %v", entry.value("error"), writeErr)
	}
}

func newTestHandler(t *testing.T) http.Handler {
	t.Helper()
	return newTestHandlerWithLogger(t, nil)
}

func newTestHandlerWithLogger(t *testing.T, log logpkg.Logger) http.Handler {
	t.Helper()

	registry := NewRegistry()
	if err := registry.Register("system.ping", func(_ context.Context, params json.RawMessage) (any, error) {
		result := map[string]any{"ok": true}
		var values map[string]any
		if len(params) > 0 && string(params) != "null" {
			if err := json.Unmarshal(params, &values); err != nil {
				return nil, InvalidParams("params must be an object")
			}
			if echo, ok := values["echo"]; ok {
				result["echo"] = echo
			}
		}
		return result, nil
	}); err != nil {
		t.Fatalf("register ping: %v", err)
	}
	if err := registry.Register("system.methods", func(context.Context, json.RawMessage) (any, error) {
		return registry.Methods(), nil
	}); err != nil {
		t.Fatalf("register methods: %v", err)
	}
	return NewHandler(registry, log)
}

func decodeRPCResponse(t *testing.T, rec *httptest.ResponseRecorder) Response {
	t.Helper()

	var raw struct {
		JSONRPC string          `json:"jsonrpc"`
		ID      json.RawMessage `json:"id"`
		Result  any             `json:"result"`
		Error   *Error          `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatalf("decode response %q: %v", rec.Body.String(), err)
	}
	return Response{
		JSONRPC: raw.JSONRPC,
		ID:      raw.ID,
		Result:  raw.Result,
		Error:   raw.Error,
	}
}

type failingResponseWriter struct {
	header http.Header
	status int
	err    error
}

func (w *failingResponseWriter) Header() http.Header {
	return w.header
}

func (w *failingResponseWriter) WriteHeader(status int) {
	w.status = status
}

func (w *failingResponseWriter) Write([]byte) (int, error) {
	return 0, w.err
}

type logEntry struct {
	message       string
	keysAndValues []interface{}
}

func (e logEntry) value(key string) any {
	for i := 0; i+1 < len(e.keysAndValues); i += 2 {
		if e.keysAndValues[i] == key {
			return e.keysAndValues[i+1]
		}
	}
	return nil
}

type recordingLogger struct {
	warns []logEntry
}

func (l *recordingLogger) Debug(string, ...interface{}) {}
func (l *recordingLogger) Info(string, ...interface{})  {}
func (l *recordingLogger) Warn(message string, keysAndValues ...interface{}) {
	l.warns = append(l.warns, logEntry{message: message, keysAndValues: append([]interface{}(nil), keysAndValues...)})
}
func (l *recordingLogger) Error(string, ...interface{}) {}
func (l *recordingLogger) Fatal(string, ...interface{}) {}
func (l *recordingLogger) With(...interface{}) logpkg.Logger {
	return l
}
func (l *recordingLogger) Sync() error {
	return nil
}
func (l *recordingLogger) Reload(*logpkg.Config) error {
	return nil
}
