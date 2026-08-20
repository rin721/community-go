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
		Routes:     []Route{{ID: moduleID + ".page", Path: "/" + moduleID, EntryID: moduleID + ".page", TitleMessageID: moduleID + ".title", State: StateAvailable, Default: defaultRoute}},
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
