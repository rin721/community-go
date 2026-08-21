package composition

import (
	"strings"
	"testing"

	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

func TestGenerateWebUIRegistryIncludesEntriesAndLocales(t *testing.T) {
	generated, err := GenerateWebUIRegistry()
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{
		`"auth.login": () => import("../../../internal/module/auth/binding/webui/web/LoginPage")`,
		`"ops.capabilities": () => import("../../../internal/module/ops/binding/webui/web/CapabilitiesPage")`,
		`"ops.dashboard": () => import("../../../internal/module/ops/binding/webui/web/DashboardPage")`,
		`"webui.auth": () => import("../../../internal/module/auth/binding/webui/web/locale/zh-CN.json")`,
		`"webui.ops": () => import("../../../internal/module/ops/binding/webui/web/locale/zh-CN.json")`,
	} {
		if !strings.Contains(generated, expected) {
			t.Fatalf("generated registry does not contain %s:\n%s", expected, generated)
		}
	}
	if strings.Index(generated, `"auth.login"`) > strings.Index(generated, `"ops.dashboard"`) {
		t.Fatalf("generated entries are not stable:\n%s", generated)
	}
}

func TestApplicationWebUICatalogProtectsAuthSessionAndExposesNavigation(t *testing.T) {
	catalog, err := applicationWebUICatalog()
	if err != nil {
		t.Fatal(err)
	}
	manifest := catalog.ManifestFor(func(operation string) webuicontract.Access {
		if operation == authmodel.OperationWebUISession {
			return webuicontract.AccessAuthenticationRequired
		}
		return webuicontract.AccessAllowed
	})
	var sessionRoute *webuicontract.ManifestRoute
	for index := range manifest.Routes {
		if manifest.Routes[index].ID == "auth.session" {
			sessionRoute = &manifest.Routes[index]
			break
		}
	}
	if sessionRoute == nil || sessionRoute.Access != webuicontract.AccessAuthenticationRequired {
		t.Fatalf("auth session route is not protected: %#v", sessionRoute)
	}
	for _, item := range manifest.Menu {
		if item.ID == "auth.session" && item.RouteID == "auth.session" && item.IconID == "user" {
			return
		}
	}
	t.Fatalf("auth session navigation is missing: %#v", manifest.Menu)
}

func TestOperationPoliciesIncludeWebUISessionAuthorization(t *testing.T) {
	policies, err := operationPolicies()
	if err != nil {
		t.Fatal(err)
	}
	for _, policy := range policies {
		if policy.Operation == authmodel.OperationWebUISession {
			if policy.Scope != "management:read" || policy.Action != "auth.webui.session.read" {
				t.Fatalf("unexpected WebUI session policy: %#v", policy)
			}
			return
		}
	}
	t.Fatal("WebUI session authorization policy is missing")
}
