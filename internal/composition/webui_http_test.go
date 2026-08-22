package composition

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	webuicontract "github.com/rin721/go-scaffold-template/internal/webui"
)

func TestManifestReadsNavigationPolicyOnEveryRequest(t *testing.T) {
	catalog, err := webuicontract.BuildCatalog(webuicontract.Binding{ModuleID: "test", Entries: []webuicontract.Entry{{ID: "test.page", SourcePath: "Page.tsx"}}, Routes: []webuicontract.Route{{ID: "test.page", Path: "/test", EntryID: "test.page", TitleMessageID: "test.title", Layout: webuicontract.RouteLayoutApp, DeliveryState: webuicontract.DeliveryImplemented}}, Navigation: []webuicontract.Navigation{{ID: "test.menu", RouteID: "test.page", TitleMessageID: "test.title", IconID: "menu", Order: 1}}, Locales: []webuicontract.Locale{{Language: "en-US", Namespace: "test", SourcePath: "locale.json"}}, MockSource: "mock.ts"})
	if err != nil {
		t.Fatal(err)
	}
	enabled, err := webuicontract.BuildNavigationPolicySnapshot(catalog)
	if err != nil {
		t.Fatal(err)
	}
	disabled, err := webuicontract.BuildNavigationPolicySnapshot(catalog, webuicontract.NavigationPolicy{NavigationID: "test.menu", Enabled: false})
	if err != nil {
		t.Fatal(err)
	}
	calls := 0
	handler, err := newWebUIManifestHandler(catalog, func(context.Context) (webuicontract.NavigationPolicySnapshot, error) {
		calls++
		if calls == 1 {
			return enabled, nil
		}
		return disabled, nil
	}, nil, func(string) webuicontract.Availability {
		return webuicontract.Availability{State: webuicontract.AvailabilityAvailable}
	})
	if err != nil {
		t.Fatal(err)
	}
	first := httptest.NewRecorder()
	handler.ServeHTTP(first, httptest.NewRequest(http.MethodGet, "/manifest", nil))
	second := httptest.NewRecorder()
	handler.ServeHTTP(second, httptest.NewRequest(http.MethodGet, "/manifest", nil))
	var firstManifest, secondManifest webuicontract.Manifest
	if err := json.Unmarshal(first.Body.Bytes(), &firstManifest); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(second.Body.Bytes(), &secondManifest); err != nil {
		t.Fatal(err)
	}
	if len(firstManifest.Menu) != 1 || len(secondManifest.Menu) != 0 || len(secondManifest.Routes) != 1 || firstManifest.NavigationRevision == secondManifest.NavigationRevision || calls != 2 {
		t.Fatalf("first=%#v second=%#v calls=%d", firstManifest, secondManifest, calls)
	}
}
