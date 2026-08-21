package composition

import (
	"os"
	"path/filepath"
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

func TestGenerateWebUIRegistryForCatalogAcceptsIndependentModuleFixture(t *testing.T) {
	repositoryRoot := t.TempDir()
	if err := os.MkdirAll(filepath.Join(repositoryRoot, ".scaffold"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(repositoryRoot, "webui", "src", "generated"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(repositoryRoot, ".scaffold", "layout.json"), []byte(`{"schemaVersion":1,"roots":{"webui":"webui","modules":"internal/module","tools":".tools/bin","release":"dist"},"webui":{"moduleFacet":"binding/webui/web","source":"webui/src","platformStyles":"webui/src/styles.css","registryOutput":"webui/src/generated/webui-registry.ts"},"generatedArtifacts":{"openapi":"api/openapi.yaml","operationInventory":"internal/transport/http/api/operation_inventory.gen.go"}}`), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(repositoryRoot, "webui", "src", "styles.css"), []byte(":root{}"), 0o644); err != nil {
		t.Fatal(err)
	}
	webRoot := filepath.Join(repositoryRoot, "internal", "module", "fixture", "binding", "webui", "web")
	if err := os.MkdirAll(filepath.Join(webRoot, "locale"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(webRoot, "Page.tsx"), []byte("export default function Page() { return null; }\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(webRoot, "locale", "en-US.json"), []byte(`{"webui.fixture.title":"Fixture"}`), 0o644); err != nil {
		t.Fatal(err)
	}

	binding := webuicontract.Binding{
		ModuleID:   "fixture",
		Entries:    []webuicontract.Entry{{ID: "fixture.page", SourcePath: "Page.tsx"}},
		Routes:     []webuicontract.Route{{ID: "fixture.page", Path: "/fixture", EntryID: "fixture.page", TitleMessageID: "webui.fixture.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented, Default: true}},
		Navigation: []webuicontract.Navigation{{ID: "fixture.page", RouteID: "fixture.page", TitleMessageID: "webui.fixture.title", IconID: "circle"}},
		Locales:    []webuicontract.Locale{{Language: "en-US", Namespace: "webui.fixture", SourcePath: "locale/en-US.json"}},
		Requires:   []webuicontract.SDKRequirement{{ID: "runtime", MajorVersion: 1}},
	}
	catalog, err := webuicontract.BuildApplicationCatalog([]webuicontract.ModuleRegistration{{Binding: binding, Activation: webuicontract.ActivationEnabled}}, webuicontract.SDKInventory{"runtime": 1})
	if err != nil {
		t.Fatal(err)
	}

	generated, err := GenerateWebUIRegistryForCatalog(catalog, repositoryRoot)
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{
		`"fixture.page": () => import("../../../internal/module/fixture/binding/webui/web/Page")`,
		`"webui.fixture": () => import("../../../internal/module/fixture/binding/webui/web/locale/en-US.json")`,
	} {
		if !strings.Contains(generated, expected) {
			t.Fatalf("fixture registry does not contain %s:\n%s", expected, generated)
		}
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
		if item.ID == "auth.session" {
			t.Fatalf("authentication-required route must not enter navigation: %#v", manifest.Menu)
		}
	}
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
