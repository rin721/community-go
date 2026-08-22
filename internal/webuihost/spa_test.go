package webuihost

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const fixtureIndexHTML = "<!doctype html><html><head></head><body id=\"root\"></body></html>"

func newFixtureDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	files := map[string]string{
		"index.html":           fixtureIndexHTML,
		"style.css":            "body { margin: 0 }",
		"assets/app.abc123.js": "console.log('app')",
		"nested/page.html":     "<div>nested</div>",
	}
	for relative, content := range files {
		path := filepath.Join(dir, filepath.FromSlash(relative))
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", path, err)
		}
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatalf("write %s: %v", path, err)
		}
	}
	return dir
}

func newFixtureHandler(t *testing.T) http.Handler {
	t.Helper()
	handler, err := NewSPAHandler(newFixtureDir(t), []string{"/api", "/management"}, []string{"/assets"})
	if err != nil {
		t.Fatalf("NewSPAHandler() error = %v", err)
	}
	return handler
}

func TestSPAHandlerServesExistingFiles(t *testing.T) {
	handler := newFixtureHandler(t)
	tests := []struct {
		path       string
		wantStatus int
		wantCache  string
		wantBody   string
	}{
		{path: "/", wantStatus: http.StatusOK, wantCache: noCache, wantBody: fixtureIndexHTML},
		{path: "/index.html", wantStatus: http.StatusOK, wantCache: noCache, wantBody: fixtureIndexHTML},
		{path: "/style.css", wantStatus: http.StatusOK, wantCache: noCache, wantBody: "body { margin: 0 }"},
		{path: "/assets/app.abc123.js", wantStatus: http.StatusOK, wantCache: immutableLongTermCache, wantBody: "console.log('app')"},
		{path: "/nested/page.html", wantStatus: http.StatusOK, wantCache: noCache, wantBody: "<div>nested</div>"},
	}
	for _, test := range tests {
		t.Run(test.path, func(t *testing.T) {
			recorder := perform(handler, http.MethodGet, test.path)
			if recorder.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", recorder.Code, test.wantStatus, recorder.Body.String())
			}
			if got := recorder.Header().Get("Cache-Control"); got != test.wantCache {
				t.Fatalf("Cache-Control = %q, want %q", got, test.wantCache)
			}
			if !strings.Contains(recorder.Body.String(), test.wantBody) {
				t.Fatalf("body = %q, want contains %q", recorder.Body.String(), test.wantBody)
			}
		})
	}
}

func TestSPAHandlerFallsBackToIndexForClientRoutes(t *testing.T) {
	handler := newFixtureHandler(t)
	for _, route := range []string{"/dashboard", "/login", "/admin/departments/dept-1"} {
		recorder := perform(handler, http.MethodGet, route)
		if recorder.Code != http.StatusOK {
			t.Fatalf("GET %s status = %d; body = %s", route, recorder.Code, recorder.Body.String())
		}
		if got := recorder.Header().Get("Cache-Control"); got != noCache {
			t.Fatalf("GET %s Cache-Control = %q, want %q", route, got, noCache)
		}
		if !strings.Contains(recorder.Body.String(), fixtureIndexHTML) {
			t.Fatalf("GET %s body = %q, want index.html fallback", route, recorder.Body.String())
		}
	}
}

func TestSPAHandlerKeepsExcludedPrefixesAsJSONNotFound(t *testing.T) {
	handler := newFixtureHandler(t)
	for _, pathValue := range []string{"/api", "/api/v1/nope", "/management", "/management/readyz"} {
		recorder := perform(handler, http.MethodGet, pathValue)
		if recorder.Code != http.StatusNotFound {
			t.Fatalf("GET %s status = %d, want 404", pathValue, recorder.Code)
		}
		if got := recorder.Header().Get("Content-Type"); !strings.Contains(got, "application/problem+json") {
			t.Fatalf("GET %s Content-Type = %q, want problem+json", pathValue, got)
		}
		if strings.Contains(recorder.Body.String(), fixtureIndexHTML) {
			t.Fatalf("GET %s must not fall back to HTML", pathValue)
		}
		var problem struct {
			Code string `json:"code"`
		}
		if err := json.Unmarshal(recorder.Body.Bytes(), &problem); err != nil {
			t.Fatalf("decode problem for %s: %v", pathValue, err)
		}
		if problem.Code != "route_not_found" {
			t.Fatalf("GET %s problem code = %q, want route_not_found", pathValue, problem.Code)
		}
	}
}

func TestSPAHandlerRejectsUnsafePaths(t *testing.T) {
	handler := newFixtureHandler(t)
	unsafe := []string{"/../secret", "/assets/../../secret", "/assets\\..\\secret", "/a\x00b"}
	for _, pathValue := range unsafe {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, "http://example.test/placeholder", nil)
		request.URL.Path = pathValue
		handler.ServeHTTP(recorder, request)
		if recorder.Code != http.StatusBadRequest {
			t.Fatalf("GET %q status = %d, want 400; body = %s", pathValue, recorder.Code, recorder.Body.String())
		}
	}
}

func TestSPAHandlerRejectsNonReadMethods(t *testing.T) {
	handler := newFixtureHandler(t)
	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions} {
		recorder := perform(handler, method, "/anything")
		if recorder.Code != http.StatusMethodNotAllowed {
			t.Fatalf("%s status = %d, want 405", method, recorder.Code)
		}
	}
}

func TestSPAHandlerSupportsHead(t *testing.T) {
	handler := newFixtureHandler(t)
	recorder := perform(handler, http.MethodHead, "/")
	if recorder.Code != http.StatusOK {
		t.Fatalf("HEAD status = %d, want 200", recorder.Code)
	}
	if recorder.Body.Len() != 0 {
		t.Fatalf("HEAD body length = %d, want 0", recorder.Body.Len())
	}
}

func TestValidateDirRejectsInvalidDirectories(t *testing.T) {
	dir := newFixtureDir(t)
	if err := ValidateDir(dir); err != nil {
		t.Fatalf("ValidateDir(fixture) error = %v", err)
	}
	filePath := filepath.Join(dir, "style.css")
	if err := ValidateDir(filePath); err == nil {
		t.Fatalf("ValidateDir(file) error = nil")
	}
	empty := t.TempDir()
	if err := ValidateDir(empty); err == nil {
		t.Fatalf("ValidateDir(dir without index.html) error = nil")
	}
	if err := ValidateDir(""); err == nil {
		t.Fatalf("ValidateDir(empty path) error = nil")
	}
}

func TestNewSPAHandlerValidatesFolder(t *testing.T) {
	if _, err := NewSPAHandler("", nil, nil); err == nil {
		t.Fatalf("NewSPAHandler(empty dir) error = nil")
	}
	if _, err := NewSPAHandler(t.TempDir(), nil, nil); err == nil {
		t.Fatalf("NewSPAHandler(dir without index.html) error = nil")
	}
	if _, err := NewSPAHandler(newFixtureDir(t), []string{""}, nil); err == nil {
		t.Fatalf("NewSPAHandler(empty excluded prefix) error = nil")
	}
}

func perform(handler http.Handler, method, pathValue string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(method, "http://example.test"+pathValue, nil)
	handler.ServeHTTP(recorder, request)
	return recorder
}
