package composition

import "testing"

func TestApplicationHTTPRegistrationsAreComplete(t *testing.T) {
	definitions, err := applicationHTTPCatalog()
	if err != nil {
		t.Fatal(err)
	}
	if len(definitions) != 31 {
		t.Fatalf("operation count = %d", len(definitions))
	}
	seen := make(map[string]struct{}, len(definitions))
	for _, definition := range definitions {
		seen[definition.ID] = struct{}{}
	}
	for _, id := range []string{"iam.setup", "navigation.menus.update", "organization.departments.update", "completeTodo"} {
		if _, ok := seen[id]; !ok {
			t.Fatalf("missing operation %q", id)
		}
	}
}
