package webuiauth

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestInputValidationReturnsTypedErrors(t *testing.T) {
	if _, err := normalizeUsername(""); !errors.Is(err, errUsernameInvalid) {
		t.Fatalf("normalizeUsername() error = %v, want errUsernameInvalid", err)
	}
	if _, err := normalizeUsername(strings.Repeat("a", maxUsernameRunes+1)); !errors.Is(err, errUsernameInvalid) {
		t.Fatalf("normalizeUsername() error = %v, want errUsernameInvalid", err)
	}
	if err := validatePassword(strings.Repeat("a", minPasswordRunes-1)); !errors.Is(err, errPasswordLengthInvalid) {
		t.Fatalf("validatePassword() error = %v, want errPasswordLengthInvalid", err)
	}
	if err := validatePassword(strings.Repeat("a", maxPasswordRunes+1)); !errors.Is(err, errPasswordLengthInvalid) {
		t.Fatalf("validatePassword() error = %v, want errPasswordLengthInvalid", err)
	}
	if err := validatePassword(strings.Repeat("密", minPasswordRunes)); err != nil {
		t.Fatalf("validatePassword() error = %v, want nil", err)
	}
}

func TestWriteServiceErrorPreservesValidationAndInternalBoundaries(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{name: "username", err: errUsernameInvalid, wantStatus: http.StatusBadRequest, wantCode: "username_invalid"},
		{name: "password length", err: errPasswordLengthInvalid, wantStatus: http.StatusBadRequest, wantCode: "password_length_invalid"},
		{name: "credentials", err: ErrInvalidCredentials, wantStatus: http.StatusUnauthorized, wantCode: "invalid_credentials"},
		{name: "setup closed", err: ErrSetupClosed, wantStatus: http.StatusConflict, wantCode: "setup_closed"},
		{name: "unknown", err: errors.New("storage failed"), wantStatus: http.StatusInternalServerError, wantCode: "internal_server_error"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			writeServiceError(recorder, test.err)
			if recorder.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, test.wantStatus)
			}
			responseBody := recorder.Body.Bytes()
			var body struct {
				Code string `json:"code"`
			}
			if err := json.Unmarshal(responseBody, &body); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if body.Code != test.wantCode {
				t.Fatalf("code = %q, want %q", body.Code, test.wantCode)
			}
			if strings.Contains(string(responseBody), "storage failed") {
				t.Fatal("response leaked internal error text")
			}
		})
	}
}
