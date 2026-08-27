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

// TestGenerateWebUIRegistryIncludesZoneContributions 证明 062 分区注入点进入生成
// webuiZoneRegistry 且 mock manifest 同步投影 zones（含动作权限投影）。
func TestGenerateWebUIRegistryIncludesZoneContributions(t *testing.T) {
	generated, err := GenerateWebUIRegistry()
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{
		`export const webuiZoneRegistry = {`,
		`"header-actions": {`,
		`"ops.capabilities-entry": () => import("../../../internal/module/ops/binding/webui/web/HeaderAction")`,
		`"footer-status": {`,
		`"ops.management-status": () => import("../../../internal/module/ops/binding/webui/web/FooterStatus")`,
		`"actionPermissions": [`,
		`"operationId": "ops.diagnostics"`,
	} {
		if !strings.Contains(generated, expected) {
			t.Fatalf("generated registry does not contain %s:\n%s", expected, generated)
		}
	}
	// mock manifest 的 zones 与 actionPermissions 存在且可序列化（host boot 依赖）。
	if !strings.Contains(generated, `"zones": [`) {
		t.Fatalf("mock manifest misses zones projection:\n%s", generated)
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
	if err := os.WriteFile(filepath.Join(repositoryRoot, ".scaffold", "layout.json"), []byte(`{"schemaVersion":1,"roots":{"webui":"webui","modules":"internal/module","tools":".tools/bin","release":"dist"},"webui":{"moduleFacet":"binding/webui/web","source":"webui/src","platformStyles":"webui/src/styles.css","registryOutput":"webui/src/generated/webui-registry.ts","specOutput":"webui/src/generated/openapi-spec.ts"},"generatedArtifacts":{"openapi":"api/openapi.yaml","operationInventory":"internal/transport/http/api/operation_inventory.gen.go"}}`), 0o644); err != nil {
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
		Navigation: []webuicontract.Navigation{{ID: "fixture.page", RouteID: "fixture.page", TitleMessageID: "webui.fixture.title", IconID: "menu"}},
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
	if err := os.WriteFile(filepath.Join(repositoryRoot, ".scaffold", "layout.json"), []byte(`{"schemaVersion":1,"roots":{"webui":"webui","modules":"internal/module","tools":".tools/bin","release":"dist"},"webui":{"moduleFacet":"binding/webui/web","source":"webui/src","platformStyles":"webui/src/styles.css","registryOutput":"webui/src/generated/webui-registry.ts","specOutput":"webui/src/generated/openapi-spec.ts"},"generatedArtifacts":{"openapi":"api/openapi.yaml","operationInventory":"internal/transport/http/api/operation_inventory.gen.go"}}`), 0o644); err != nil {
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
		Navigation: []webuicontract.Navigation{{ID: moduleID + ".page", RouteID: moduleID + ".page", TitleMessageID: "webui." + moduleID + ".title", IconID: "menu"}},
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

// TestApplicationWebUICatalogMenuHierarchy 锁定当前应用的侧边栏菜单层级分类：
// 只有 ops 使用两级结构，iam/organization/settings 拥有顶级组父节点且组内顺序父先子后，
// 082 起 governance（auth.audit）与 developer（openapi.docs）也已归入顶级组；
// 任何模块声明变化都必须在此处同步断言。
func TestApplicationWebUICatalogMenuHierarchy(t *testing.T) {
	catalog, err := applicationWebUICatalog()
	if err != nil {
		t.Fatal(err)
	}
	manifest := catalog.ManifestFor(func(string) webuicontract.Access { return webuicontract.AccessAllowed })
	byID := make(map[string]webuicontract.ManifestMenu, len(manifest.Menu))
	for _, item := range manifest.Menu {
		byID[item.ID] = item
	}
	// 顶级父节点（ParentID 为空）与子项归属。
	type wantEdge struct{ parent, child string }
	edges := []wantEdge{
		{parent: "", child: "ops.dashboard"},
		{parent: "ops.dashboard", child: "ops.capabilities"},
		{parent: "", child: "iam.access"},
		{parent: "iam.access", child: "iam.security"},
		{parent: "iam.access", child: "iam.accounts"},
		{parent: "iam.access", child: "iam.roles"},
		{parent: "iam.access", child: "iam.permissions"},
		{parent: "", child: "organization.directory"},
		{parent: "organization.directory", child: "organization.departments"},
		{parent: "organization.directory", child: "organization.positions"},
		{parent: "organization.directory", child: "organization.assignments"},
		{parent: "", child: "navigation.menus"},
		// 074：设置组子项与页内 SectionNav 完全一致（8 分区；iam.security 归位 iam.access）。
		{parent: "", child: "settings.center"},
		// 083（DEC-002 B-2）：Settings 全局菜单收敛为单入口，八个分区由页内 SectionNav 导航。
		// 082：Governance（audit）与 Developer（openapi）顶级组（REQ-020 IA 归位）。
		{parent: "", child: "auth.governance"},
		{parent: "auth.governance", child: "auth.audit"},
		{parent: "", child: "openapi.developer"},
		{parent: "openapi.developer", child: "openapi.docs"},
	}
	for _, edge := range edges {
		item, ok := byID[edge.child]
		if !ok {
			t.Fatalf("menu item %q is missing from manifest: %#v", edge.child, manifest.Menu)
		}
		if item.ParentID != edge.parent {
			t.Fatalf("menu item %q parent = %q, want %q", edge.child, item.ParentID, edge.parent)
		}
	}
	// 父节点顺序必须位于子项之前（组头先于组内页面）。
	for _, group := range []struct{ parent, firstChild string }{
		{parent: "iam.access", firstChild: "iam.accounts"},
		{parent: "organization.directory", firstChild: "organization.departments"},
		{parent: "auth.governance", firstChild: "auth.audit"},
		{parent: "openapi.developer", firstChild: "openapi.docs"},
	} {
		if byID[group.parent].Order >= byID[group.firstChild].Order {
			t.Fatalf("group parent %q order %d must precede first child %q order %d",
				group.parent, byID[group.parent].Order, group.firstChild, byID[group.firstChild].Order)
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
	if len(definitions) != 23 {
		t.Fatalf("unexpected permission definitions: %#v", definitions)
	}
	if len(blueprint.webuiCatalog.Bindings) == 0 {
		t.Fatal("validated application WebUI catalog is empty")
	}
}
