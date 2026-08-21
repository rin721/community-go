package contract

import "testing"

func TestHTTPContractSupportsTypedSecurityProfiles(t *testing.T) {
	for _, security := range []Security{SecurityBearer, SecurityWebUISession} {
		kind := SecuritySchemeHTTPBearer
		parameterName := ""
		if security == SecurityWebUISession {
			kind = SecuritySchemeAPIKeyCookie
			parameterName = "__Host-test_session"
		}
		module := Module{ID: "test", Name: "Test", SecuritySchemes: []SecurityScheme{{ID: security, Kind: kind, ParameterName: parameterName}}, Operations: []Operation{{
			ID: "test.read", Method: MethodGet, Path: "/test", Security: security,
			Policy:    Policy{Mode: PolicyModeProtected, Scope: "test:read", Action: "test.read"},
			Responses: []Response{{Status: 200, Schema: Object()}},
		}}}
		if _, err := BuildDocument(Info{Title: "test", Version: "1"}, []Module{module}); err != nil {
			t.Fatalf("security %q was rejected: %v", security, err)
		}
	}
}

func TestHTTPContractRejectsUnknownAndDuplicateSecuritySchemeOwners(t *testing.T) {
	operation := Operation{ID: "test.read", Method: MethodGet, Path: "/test", Security: SecurityBearer, Policy: Policy{Mode: PolicyModeProtected, Scope: "test:read", Action: "test.read"}, Responses: []Response{{Status: 200, Schema: Object()}}}
	if _, err := BuildDocument(Info{Title: "test", Version: "1"}, []Module{{ID: "test", Name: "Test", Operations: []Operation{operation}}}); err == nil {
		t.Fatal("unknown security scheme reference was accepted")
	}
	scheme := SecurityScheme{ID: SecurityBearer, Kind: SecuritySchemeHTTPBearer}
	if _, err := BuildDocument(Info{Title: "test", Version: "1"}, []Module{{ID: "one", Name: "One", SecuritySchemes: []SecurityScheme{scheme}}, {ID: "two", Name: "Two", SecuritySchemes: []SecurityScheme{scheme}}}); err == nil {
		t.Fatal("duplicate security scheme owner was accepted")
	}
}

func TestHTTPContractRejectsDuplicateModuleAndOperationOwners(t *testing.T) {
	operation := Operation{ID: "test.read", Method: MethodGet, Path: "/test", Policy: Policy{Mode: PolicyModePublic}, Responses: []Response{{Status: 200, Schema: Object()}}}
	if _, err := BuildDocument(Info{Title: "test", Version: "1"}, []Module{{ID: "test", Name: "One", Operations: []Operation{operation}}, {ID: "test", Name: "Two"}}); err == nil {
		t.Fatal("duplicate module owner was accepted")
	}
	if _, err := BuildDocument(Info{Title: "test", Version: "1"}, []Module{{ID: "one", Name: "One", Operations: []Operation{operation}}, {ID: "two", Name: "Two", Operations: []Operation{operation}}}); err == nil {
		t.Fatal("duplicate operation owner was accepted")
	}
}
