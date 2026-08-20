package webuiauth

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestServiceAllowsRequestOrConfiguredOrigin(t *testing.T) {
	service := &Service{allowedOrigins: map[string]struct{}{
		"https://localhost:5173": {},
	}}
	tests := []struct {
		name   string
		origin string
		want   bool
	}{
		{name: "request origin", origin: "http://127.0.0.1:8080", want: true},
		{name: "configured Vite origin", origin: "https://localhost:5173", want: true},
		{name: "untrusted origin", origin: "https://example.invalid", want: false},
		{name: "missing origin", origin: "", want: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "http://127.0.0.1:8080/api/v1/webui/auth/setup", nil)
			request.Header.Set("Origin", test.origin)
			if got := service.allowsOrigin(request); got != test.want {
				t.Fatalf("allowsOrigin() = %t, want %t", got, test.want)
			}
		})
	}
}
