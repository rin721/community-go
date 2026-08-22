package composition

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

func TestGenerateWebUIRegistryIncludesMockArtifacts(t *testing.T) {
	generated, err := GenerateWebUIRegistry()
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{
		`export const webuiMockRegistry = {`,
		`"iam": () => import("../../../internal/module/iam/binding/webui/web/mock")`,
		`"ops": () => import("../../../internal/module/ops/binding/webui/web/mock")`,
		`export const webuiMockManifest = {`,
	} {
		if !strings.Contains(generated, expected) {
			t.Fatalf("generated registry does not contain %s:\n%s", expected, generated)
		}
	}
	// mock manifest 的 catalogRevision 必须与生成 registry 的 webuiRevision 一致
	//（宿主版本门禁依赖这一点，否则 mock 环境无法 boot）。
	revision := regexp.MustCompile(`webuiRevision = "([0-9a-f]+)"`).FindStringSubmatch(generated)
	if len(revision) != 2 {
		t.Fatalf("generated registry has no webuiRevision:\n%s", generated)
	}
	if !strings.Contains(generated, `"catalogRevision": "`+revision[1]+`"`) {
		t.Fatalf("mock manifest catalogRevision does not match webuiRevision:\n%s", generated)
	}
}

func TestGenerateWebUIRegistryIncludesEntriesAndLocales(t *testing.T) {
	generated, err := GenerateWebUIRegistry()
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{
		`"iam.login": () => import("../../../internal/module/iam/binding/webui/web/LoginPage")`,
		`"ops.capabilities": () => import("../../../internal/module/ops/binding/webui/web/CapabilitiesPage")`,
		`"ops.dashboard": () => import("../../../internal/module/ops/binding/webui/web/DashboardPage")`,
		`"webui.iam": () => import("../../../internal/module/iam/binding/webui/web/locale/zh-CN.json")`,
		`"webui.ops": () => import("../../../internal/module/ops/binding/webui/web/locale/zh-CN.json")`,
	} {
		if !strings.Contains(generated, expected) {
			t.Fatalf("generated registry does not contain %s:\n%s", expected, generated)
		}
	}
	if strings.Index(generated, `"iam.login"`) > strings.Index(generated, `"ops.dashboard"`) {
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
	if err := os.WriteFile(filepath.Join(webRoot, "mock.ts"), []byte("export default [];\n"), 0o644); err != nil {
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
		MockSource: "mock.ts",
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

// TestGenerateWebUIRegistryExcludesDisabledModule 证明静态可插拔的 disabled 模块在 catalog 投影阶段
// 被完全移除：其 entry、locale 不进入生成的 registry，route 与 menu 也不进入 manifest 投影。
// 059 BOUNDARY-001 回归：普通模块只需声明自身 facet 与 composition registration。
func TestGenerateWebUIRegistryExcludesDisabledModule(t *testing.T) {
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

	for _, moduleID := range []string{"fixture", "retired"} {
		webRoot := filepath.Join(repositoryRoot, "internal", "module", moduleID, "binding", "webui", "web")
		if err := os.MkdirAll(filepath.Join(webRoot, "locale"), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(webRoot, "Page.tsx"), []byte("export default function Page() { return null; }\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(webRoot, "mock.ts"), []byte("export default [];\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(webRoot, "locale", "en-US.json"), []byte(`{"webui.`+moduleID+`.title":"`+moduleID+`"}`), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	fixture := moduleFixtureBinding("fixture")
	retired := moduleFixtureBinding("retired")
	catalog, err := webuicontract.BuildApplicationCatalog([]webuicontract.ModuleRegistration{
		{Binding: fixture, Activation: webuicontract.ActivationEnabled},
		{Binding: retired, Activation: webuicontract.ActivationDisabled},
	}, webuicontract.SDKInventory{"runtime": 1})
	if err != nil {
		t.Fatal(err)
	}
	generated, err := GenerateWebUIRegistryForCatalog(catalog, repositoryRoot)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(generated, "retired") {
		t.Fatalf("disabled module leaked into generated registry:\n%s", generated)
	}
	for _, expected := range []string{
		`"fixture.page": () => import("../../../internal/module/fixture/binding/webui/web/Page")`,
		`"webui.fixture": () => import("../../../internal/module/fixture/binding/webui/web/locale/en-US.json")`,
	} {
		if !strings.Contains(generated, expected) {
			t.Fatalf("enabled fixture registry is missing %s:\n%s", expected, generated)
		}
	}
	manifest := catalog.ManifestFor(func(string) webuicontract.Access { return webuicontract.AccessAllowed })
	for _, route := range manifest.Routes {
		if route.ModuleID == "retired" {
			t.Fatalf("disabled module route leaked into manifest: %#v", route)
		}
	}
	for _, item := range manifest.Menu {
		if item.ModuleID == "retired" {
			t.Fatalf("disabled module menu leaked into manifest: %#v", item)
		}
	}
}

func moduleFixtureBinding(moduleID string) webuicontract.Binding {
	return webuicontract.Binding{
		ModuleID:   moduleID,
		Entries:    []webuicontract.Entry{{ID: moduleID + ".page", SourcePath: "Page.tsx"}},
		Routes:     []webuicontract.Route{{ID: moduleID + ".page", Path: "/" + moduleID, EntryID: moduleID + ".page", TitleMessageID: "webui." + moduleID + ".title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented, Default: true}},
		Navigation: []webuicontract.Navigation{{ID: moduleID + ".page", RouteID: moduleID + ".page", TitleMessageID: "webui." + moduleID + ".title", IconID: "circle"}},
		Locales:    []webuicontract.Locale{{Language: "en-US", Namespace: "webui." + moduleID, SourcePath: "locale/en-US.json"}},
		MockSource: "mock.ts",
		Requires:   []webuicontract.SDKRequirement{{ID: "runtime", MajorVersion: 1}},
	}
}

func TestApplicationWebUICatalogProtectsIAMSecurityAndExposesNavigation(t *testing.T) {
	catalog, err := applicationWebUICatalog()
	if err != nil {
		t.Fatal(err)
	}
	manifest := catalog.ManifestFor(func(operation string) webuicontract.Access {
		if operation == "iam.session.read" {
			return webuicontract.AccessAuthenticationRequired
		}
		return webuicontract.AccessAllowed
	})
	var sessionRoute *webuicontract.ManifestRoute
	for index := range manifest.Routes {
		if manifest.Routes[index].ID == "iam.security" {
			sessionRoute = &manifest.Routes[index]
			break
		}
	}
	if sessionRoute == nil || sessionRoute.Access != webuicontract.AccessAuthenticationRequired {
		t.Fatalf("iam security route is not protected: %#v", sessionRoute)
	}
	for _, item := range manifest.Menu {
		if item.ID == "iam.security" {
			t.Fatalf("authentication-required route must not enter navigation: %#v", manifest.Menu)
		}
	}
}

func TestOperationPoliciesIncludeIAMSessionAuthorization(t *testing.T) {
	blueprint, err := newApplicationBlueprint()
	if err != nil {
		t.Fatal(err)
	}
	policies := blueprint.policyCopy()
	for _, policy := range policies {
		if policy.Operation == "iam.session.read" {
			if policy.Scope != "iam:account:self:read" || policy.Action != "iam.session.read" {
				t.Fatalf("unexpected IAM session policy: %#v", policy)
			}
			return
		}
	}
	t.Fatal("IAM session authorization policy is missing")
}

func TestApplicationPermissionCatalogCoversCurrentOperationAndWebUIReferences(t *testing.T) {
	blueprint, err := newApplicationBlueprint()
	if err != nil {
		t.Fatal(err)
	}
	catalog := blueprint.permissions
	definitions := catalog.Definitions()
	if len(definitions) != 16 {
		t.Fatalf("unexpected permission definitions: %#v", definitions)
	}
	if len(blueprint.webuiCatalog.Bindings) == 0 {
		t.Fatal("validated application WebUI catalog is empty")
	}
}
