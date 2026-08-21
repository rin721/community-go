package webui

import (
	"encoding/json"
	"strings"
	"testing"
)

func testBinding(moduleID string, defaultRoute bool) Binding {
	return Binding{
		ModuleID:   moduleID,
		Entries:    []Entry{{ID: moduleID + ".page", SourcePath: "web/Page.tsx"}},
		Routes:     []Route{{ID: moduleID + ".page", Path: "/" + moduleID, EntryID: moduleID + ".page", TitleMessageID: moduleID + ".title", Layout: RouteLayoutApp, DeliveryState: DeliveryImplemented, Default: defaultRoute}},
		Navigation: []Navigation{{ID: moduleID + ".page", RouteID: moduleID + ".page", TitleMessageID: moduleID + ".title", IconID: "circle"}},
		Locales:    []Locale{{Language: "zh-CN", Namespace: moduleID, SourcePath: "web/zh-CN.json"}},
	}
}

func TestBuildCatalogIsDeterministicAndManifestOmitsSourcePath(t *testing.T) {
	left, err := BuildCatalog(testBinding("ops", true), testBinding("auth", false))
	if err != nil {
		t.Fatal(err)
	}
	right, err := BuildCatalog(testBinding("auth", false), testBinding("ops", true))
	if err != nil {
		t.Fatal(err)
	}
	if left.Revision != right.Revision {
		t.Fatalf("revision differs: %s != %s", left.Revision, right.Revision)
	}
	manifest := left.ManifestFor(func(string) Access { return AccessAllowed })
	encoded, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), "SourcePath") || strings.Contains(string(encoded), "Page.tsx") {
		t.Fatalf("manifest leaked source path: %s", encoded)
	}
	if strings.Contains(string(encoded), `"state"`) || !strings.Contains(string(encoded), `"deliveryState":"implemented"`) {
		t.Fatalf("manifest did not use the single delivery state contract: %s", encoded)
	}
}

func TestBuildCatalogRejectsAmbiguousRoutesAndLocales(t *testing.T) {
	first := testBinding("ops", true)
	second := testBinding("auth", true)
	if _, err := BuildCatalog(first, second); err == nil {
		t.Fatal("multiple global default routes were accepted")
	}

	invalidDelivery := testBinding("ops", true)
	invalidDelivery.Routes[0].DeliveryState = DeliveryState("preview")
	if _, err := BuildCatalog(invalidDelivery); err == nil {
		t.Fatal("unsupported delivery state was accepted")
	}

	duplicateLocale := testBinding("ops", true)
	duplicateLocale.Locales = append(duplicateLocale.Locales, duplicateLocale.Locales[0])
	if _, err := BuildCatalog(duplicateLocale); err == nil {
		t.Fatal("duplicate language and namespace were accepted")
	}
}

func TestBuildCatalogRejectsBrokenReferencesAndCycles(t *testing.T) {
	broken := testBinding("ops", true)
	broken.Routes[0].EntryID = "missing"
	if _, err := BuildCatalog(broken); err == nil {
		t.Fatal("missing entry was accepted")
	}
	cycle := testBinding("ops", true)
	cycle.Navigation[0].ParentID = cycle.Navigation[0].ID
	if _, err := BuildCatalog(cycle); err == nil {
		t.Fatal("navigation cycle was accepted")
	}
}

func TestBuildCatalogRequiresLocaleForWebUIEntries(t *testing.T) {
	binding := testBinding("ops", true)
	binding.Locales = nil
	if _, err := BuildCatalog(binding); err == nil {
		t.Fatal("webui entries without a locale binding were accepted")
	}
}

func TestCatalogValidatesOperationInventory(t *testing.T) {
	binding := testBinding("ops", true)
	binding.Routes[0].ViewOperationID = "missing"
	catalog, err := BuildCatalog(binding)
	if err != nil {
		t.Fatal(err)
	}
	if err := catalog.ValidateOperationReferences(map[string]struct{}{"known": {}}); err == nil {
		t.Fatal("unknown operation was accepted")
	}
}

func TestBuildApplicationCatalogProjectsActivationAndDelivery(t *testing.T) {
	implemented := testBinding("ops", true)
	notImplemented := testBinding("future", false)
	notImplemented.Routes[0].DeliveryState = DeliveryNotImplemented
	disabled := testBinding("disabled", false)
	catalog, err := BuildApplicationCatalog([]ModuleRegistration{
		{Binding: implemented, Activation: ActivationEnabled},
		{Binding: notImplemented, Activation: ActivationEnabled},
		{Binding: disabled, Activation: ActivationDisabled},
	}, SDKInventory{})
	if err != nil {
		t.Fatal(err)
	}
	if len(catalog.Bindings) != 1 {
		t.Fatalf("unexpected deployable bindings: %#v", catalog.Bindings)
	}
	for _, binding := range catalog.Bindings {
		if binding.ModuleID == "disabled" {
			t.Fatalf("disabled binding leaked into catalog: %#v", binding)
		}
	}
	if _, err := BuildApplicationCatalog([]ModuleRegistration{{Binding: implemented}}, SDKInventory{}); err == nil {
		t.Fatal("missing activation was accepted")
	}
}

func TestManifestAvailabilityFailsClosedAndFiltersNavigation(t *testing.T) {
	binding := testBinding("ops", true)
	binding.Routes[0].DegradedCapabilities = []string{"read-only"}
	catalog, err := BuildCatalog(binding)
	if err != nil {
		t.Fatal(err)
	}
	manifest := catalog.ManifestForWithAvailability(
		func(string) Access { return AccessAllowed },
		func(routeID string) Availability {
			if routeID == "ops.page" {
				return Availability{State: AvailabilityDegraded, Capabilities: []string{"read-only"}}
			}
			return Availability{State: AvailabilityState("unknown")}
		},
	)
	if len(manifest.Routes) != 1 || manifest.Routes[0].Availability != AvailabilityDegraded {
		t.Fatalf("degraded route was not represented: %#v", manifest.Routes)
	}
	if len(manifest.Menu) != 1 {
		t.Fatalf("supported degraded route should remain navigable: %#v", manifest.Menu)
	}
	unknown := catalog.ManifestForWithAvailability(func(string) Access { return AccessAllowed }, func(string) Availability { return Availability{} })
	if unknown.Routes[0].Availability != AvailabilityUnavailable || len(unknown.Menu) != 0 {
		t.Fatalf("unknown availability did not fail closed: %#v", unknown)
	}
}

func TestBuildApplicationCatalogRejectsSDKRequirementMismatch(t *testing.T) {
	binding := testBinding("ops", true)
	binding.Requires = []SDKRequirement{{ID: "runtime", MajorVersion: 2}}
	if _, err := BuildApplicationCatalog([]ModuleRegistration{{Binding: binding, Activation: ActivationEnabled}}, SDKInventory{"runtime": 1}); err == nil {
		t.Fatal("SDK major mismatch was accepted")
	}
}

func TestDefaultNavigationPolicyMatchesStaticCatalogAndUsesDualRevisions(t *testing.T) {
	binding := testBinding("ops", true)
	binding.Navigation[0].Order = 20
	catalog, err := BuildCatalog(binding)
	if err != nil {
		t.Fatal(err)
	}
	policy, err := BuildNavigationPolicySnapshot(catalog)
	if err != nil {
		t.Fatal(err)
	}
	manifest, err := catalog.ManifestForWithNavigation(policy, func(string) Access { return AccessAllowed }, func(string) Availability { return Availability{State: AvailabilityAvailable} })
	if err != nil {
		t.Fatal(err)
	}
	if manifest.CatalogRevision != catalog.Revision || manifest.NavigationRevision == "" || len(manifest.Menu) != 1 || manifest.Menu[0].Order != 20 {
		t.Fatalf("unexpected default policy manifest: %#v", manifest)
	}
	encoded, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), `"revision"`) || !strings.Contains(string(encoded), `"catalogRevision"`) || !strings.Contains(string(encoded), `"navigationRevision"`) {
		t.Fatalf("dual revisions are not explicit: %s", encoded)
	}
}

func TestNavigationPolicyOverridesOnlyMenuProjection(t *testing.T) {
	parent := testBinding("parent", true)
	child := testBinding("child", false)
	catalog, err := BuildCatalog(parent, child)
	if err != nil {
		t.Fatal(err)
	}
	root := ""
	order := 7
	policy, err := BuildNavigationPolicySnapshot(catalog,
		NavigationPolicy{NavigationID: "parent.page", Enabled: false},
		NavigationPolicy{NavigationID: "child.page", Enabled: true, ParentOverride: &root, OrderOverride: &order},
	)
	if err != nil {
		t.Fatal(err)
	}
	manifest, err := catalog.ManifestForWithNavigation(policy, func(string) Access { return AccessAllowed }, func(string) Availability { return Availability{State: AvailabilityAvailable} })
	if err != nil {
		t.Fatal(err)
	}
	if len(manifest.Routes) != 2 || len(manifest.Menu) != 1 || manifest.Menu[0].ID != "child.page" || manifest.Menu[0].ParentID != "" || manifest.Menu[0].Order != 7 {
		t.Fatalf("unexpected policy projection: %#v", manifest)
	}
	for _, route := range manifest.Routes {
		if route.ID == "child.page" && (route.Path != "/child" || route.EntryID != "child.page" || route.ModuleID != "child") {
			t.Fatalf("policy mutated immutable route fields: %#v", route)
		}
	}
}

func TestNavigationPolicyFailsClosedForInvalidOverrides(t *testing.T) {
	first := testBinding("first", true)
	second := testBinding("second", false)
	catalog, err := BuildCatalog(first, second)
	if err != nil {
		t.Fatal(err)
	}
	firstParent, secondParent := "second.page", "first.page"
	badOrder := maximumNavigationOrder + 1
	for _, test := range []struct {
		name      string
		overrides []NavigationPolicy
	}{
		{name: "unknown", overrides: []NavigationPolicy{{NavigationID: "missing", Enabled: true}}},
		{name: "duplicate", overrides: []NavigationPolicy{{NavigationID: "first.page", Enabled: true}, {NavigationID: "first.page", Enabled: false}}},
		{name: "cycle", overrides: []NavigationPolicy{{NavigationID: "first.page", Enabled: true, ParentOverride: &firstParent}, {NavigationID: "second.page", Enabled: true, ParentOverride: &secondParent}}},
		{name: "order", overrides: []NavigationPolicy{{NavigationID: "first.page", Enabled: true, OrderOverride: &badOrder}}},
	} {
		t.Run(test.name, func(t *testing.T) {
			if _, err := BuildNavigationPolicySnapshot(catalog, test.overrides...); err == nil {
				t.Fatal("invalid navigation policy was accepted")
			}
		})
	}
}

func TestDisabledNavigationParentHidesDescendants(t *testing.T) {
	parent := testBinding("parent", true)
	child := testBinding("child", false)
	catalog, err := BuildCatalog(parent, child)
	if err != nil {
		t.Fatal(err)
	}
	parentID := "parent.page"
	policy, err := BuildNavigationPolicySnapshot(catalog,
		NavigationPolicy{NavigationID: "parent.page", Enabled: false},
		NavigationPolicy{NavigationID: "child.page", Enabled: true, ParentOverride: &parentID},
	)
	if err != nil {
		t.Fatal(err)
	}
	manifest, err := catalog.ManifestForWithNavigation(policy, func(string) Access { return AccessAllowed }, func(string) Availability { return Availability{State: AvailabilityAvailable} })
	if err != nil {
		t.Fatal(err)
	}
	if len(manifest.Routes) != 2 || len(manifest.Menu) != 0 {
		t.Fatalf("disabled parent leaked descendant menu or removed routes: %#v", manifest)
	}
}

func TestApplicationCatalogFixtureStateMatrix(t *testing.T) {
	fixture := testBinding("fixture", false)
	fixture.Routes[0].DegradedCapabilities = []string{"diagnostics"}
	fixture.Routes[0].ViewOperationID = "fixture.view"
	fixture.Requires = []SDKRequirement{{ID: "runtime", MajorVersion: 1}}

	cases := []struct {
		name       string
		activation ActivationState
		delivery   DeliveryState
		access     Access
		available  Availability
		wantRoute  bool
		wantMenu   bool
	}{
		{name: "enabled available", activation: ActivationEnabled, delivery: DeliveryImplemented, access: AccessAllowed, available: Availability{State: AvailabilityAvailable}, wantRoute: true, wantMenu: true},
		{name: "disabled", activation: ActivationDisabled, delivery: DeliveryImplemented, access: AccessAllowed, available: Availability{State: AvailabilityAvailable}},
		{name: "not implemented", activation: ActivationEnabled, delivery: DeliveryNotImplemented, access: AccessAllowed, available: Availability{State: AvailabilityAvailable}},
		{name: "denied", activation: ActivationEnabled, delivery: DeliveryImplemented, access: AccessDenied, available: Availability{State: AvailabilityAvailable}, wantRoute: true},
		{name: "unavailable", activation: ActivationEnabled, delivery: DeliveryImplemented, access: AccessAllowed, available: Availability{State: AvailabilityUnavailable}, wantRoute: true},
		{name: "supported degraded", activation: ActivationEnabled, delivery: DeliveryImplemented, access: AccessAllowed, available: Availability{State: AvailabilityDegraded, Capabilities: []string{"diagnostics"}}, wantRoute: true, wantMenu: true},
		{name: "unsupported degraded", activation: ActivationEnabled, delivery: DeliveryImplemented, access: AccessAllowed, available: Availability{State: AvailabilityDegraded}, wantRoute: true},
	}

	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			binding := fixture
			binding.Routes = append([]Route(nil), fixture.Routes...)
			binding.Routes[0].DeliveryState = testCase.delivery
			catalog, err := BuildApplicationCatalog([]ModuleRegistration{{Binding: binding, Activation: testCase.activation}}, SDKInventory{"runtime": 1})
			if err != nil {
				t.Fatal(err)
			}
			manifest := catalog.ManifestForWithAvailability(func(string) Access { return testCase.access }, func(string) Availability { return testCase.available })
			if got := len(manifest.Routes) > 0; got != testCase.wantRoute {
				t.Fatalf("route projection = %v, want %v: %#v", got, testCase.wantRoute, manifest)
			}
			if got := len(manifest.Menu) > 0; got != testCase.wantMenu {
				t.Fatalf("menu projection = %v, want %v: %#v", got, testCase.wantMenu, manifest)
			}
		})
	}
}
