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
