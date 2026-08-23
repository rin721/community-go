package composition

import "testing"

func TestApplicationHTTPRegistrationsAreComplete(t *testing.T) {
	blueprint, err := newApplicationBlueprint()
	if err != nil {
		t.Fatal(err)
	}
	definitions := blueprint.httpDefinitions
	if len(definitions) != 41 {
		t.Fatalf("operation count = %d", len(definitions))
	}
	seen := make(map[string]struct{}, len(definitions))
	for _, definition := range definitions {
		seen[definition.ID] = struct{}{}
	}
	for _, id := range []string{"iam.setup", "navigation.menus.update", "organization.departments.update", "completeTodo", "auth.audit.list", "iam.sessions.list", "iam.sessions.revoke", "iam.accounts.update", "iam.accounts.archive", "iam.roles.update", "iam.roles.archive", "iam.self.profile.update", "iam.self.archive", "iam.self.archive.confirm"} {
		if _, ok := seen[id]; !ok {
			t.Fatalf("missing operation %q", id)
		}
	}
}

func TestApplicationBlueprintReturnsIndependentPolicyCopies(t *testing.T) {
	blueprint, err := newApplicationBlueprint()
	if err != nil {
		t.Fatal(err)
	}
	first := blueprint.policyCopy()
	first[0].Operation = "mutated"
	second := blueprint.policyCopy()
	if second[0].Operation == "mutated" {
		t.Fatal("blueprint policy slice is mutable through its consumer copy")
	}
}
