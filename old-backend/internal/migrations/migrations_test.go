package migrations

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
)

func TestSQLMigrationsAreNamedAndStructured(t *testing.T) {
	paths, err := filepath.Glob("*.sql")
	if err != nil {
		t.Fatalf("glob migrations: %v", err)
	}
	if len(paths) == 0 {
		t.Fatal("expected SQL migration files")
	}
	sort.Strings(paths)
	namePattern := regexp.MustCompile(`^\d{14}_[a-z0-9_]+\.sql$`)
	previous := ""
	for _, path := range paths {
		name := filepath.Base(path)
		if !namePattern.MatchString(name) {
			t.Fatalf("migration name %q must use timestamp_slug.sql", name)
		}
		if previous != "" && name <= previous {
			t.Fatalf("migration names must be strictly increasing: %q before %q", previous, name)
		}
		previous = name
		raw, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read migration %s: %v", name, err)
		}
		text := string(raw)
		if !strings.Contains(text, "-- +goose Up") || !strings.Contains(text, "-- +goose Down") {
			t.Fatalf("migration %s must contain goose Up and Down sections", name)
		}
	}
}

func TestCommunityAccountMigrationCleansHistoricalIAMCommunityIdentities(t *testing.T) {
	raw, err := os.ReadFile("20260627000400_create_community_accounts.sql")
	if err != nil {
		t.Fatalf("read community account migration: %v", err)
	}
	text := string(raw)
	for _, needle := range []string{
		"CREATE TABLE IF NOT EXISTS community_accounts",
		"CREATE TABLE IF NOT EXISTS community_sessions",
		"INSERT OR IGNORE INTO community_accounts",
		"UPDATE iam_sessions",
		"revoked_at = CURRENT_TIMESTAMP",
		"UPDATE iam_memberships",
		"UPDATE iam_organizations",
		"code LIKE 'community-%'",
	} {
		if !strings.Contains(text, needle) {
			t.Fatalf("community account migration missing %q", needle)
		}
	}
}
