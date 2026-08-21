package service_test

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	migrationbinding "github.com/rin721/go-scaffold-template/internal/module/organization/binding/migration"
	"github.com/rin721/go-scaffold-template/internal/module/organization/model"
	"github.com/rin721/go-scaffold-template/internal/module/organization/repo"
	"github.com/rin721/go-scaffold-template/internal/module/organization/service"
	"github.com/rin721/go-scaffold-template/pkg/clock"
	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
	"github.com/rin721/go-scaffold-template/pkg/idgen"
)

func TestDepartmentTreeCycleAndReferenceRules(t *testing.T) {
	organization, resource := newService(t, accountDirectory{})
	defer resource.Close()
	root, err := organization.CreateDepartment(t.Context(), "engineering", "研发部", nil)
	if err != nil {
		t.Fatal(err)
	}
	child, err := organization.CreateDepartment(t.Context(), "platform", "平台组", &root.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := organization.UpdateDepartment(t.Context(), service.UpdateDepartmentCommand{ID: root.ID, Version: root.Version, ParentID: pointer(&child.ID)}); !errors.Is(err, model.ErrCycle) {
		t.Fatalf("cycle error = %v", err)
	}
	archived := true
	if _, err := organization.UpdateDepartment(t.Context(), service.UpdateDepartmentCommand{ID: root.ID, Version: root.Version, Archived: &archived}); !errors.Is(err, model.ErrReferenced) {
		t.Fatalf("referenced error = %v", err)
	}
	tree, err := organization.DepartmentTree(t.Context(), true)
	if err != nil || len(tree) != 1 || len(tree[0].Children) != 1 || tree[0].Children[0].Department.ID != child.ID {
		t.Fatalf("tree = %#v, error = %v", tree, err)
	}
}

func TestAssignmentUsesOneDepartmentAndDeduplicatedPositions(t *testing.T) {
	organization, resource := newService(t, accountDirectory{})
	defer resource.Close()
	department, err := organization.CreateDepartment(t.Context(), "sales", "销售部", nil)
	if err != nil {
		t.Fatal(err)
	}
	first, err := organization.CreatePosition(t.Context(), "manager", "经理")
	if err != nil {
		t.Fatal(err)
	}
	second, err := organization.CreatePosition(t.Context(), "specialist", "专员")
	if err != nil {
		t.Fatal(err)
	}
	accountID := "a9f41ec8-7a6a-4b79-b76f-eedc8f2eef66"
	assignment, err := organization.ReplaceAssignment(t.Context(), accountID, &department.ID, []string{second.ID, first.ID, first.ID})
	if err != nil {
		t.Fatal(err)
	}
	positionSet := map[string]bool{}
	for _, id := range assignment.PositionIDs {
		positionSet[id] = true
	}
	if assignment.DepartmentID == nil || *assignment.DepartmentID != department.ID || len(assignment.PositionIDs) != 2 || !positionSet[first.ID] || !positionSet[second.ID] {
		t.Fatalf("assignment = %#v", assignment)
	}
	archived := true
	if _, err := organization.UpdatePosition(t.Context(), service.UpdatePositionCommand{ID: first.ID, Version: first.Version, Archived: &archived}); !errors.Is(err, model.ErrReferenced) {
		t.Fatalf("position reference error = %v", err)
	}
}

func TestRejectedAccountLeavesNoOrganizationRelationship(t *testing.T) {
	organization, resource := newService(t, accountDirectory{err: errors.New("disabled")})
	defer resource.Close()
	accountID := "1c05bf1c-02fc-4508-8d24-b90a230585b4"
	if _, err := organization.ReplaceAssignment(t.Context(), accountID, nil, nil); !errors.Is(err, model.ErrAccountInvalid) {
		t.Fatalf("assignment error = %v", err)
	}
}

type accountDirectory struct{ err error }

func (directory accountDirectory) RequireAssignableAccount(context.Context, string) error {
	return directory.err
}

func newService(t *testing.T, accounts service.AccountDirectory) (*service.Service, database.Resource) {
	t.Helper()
	config := database.DefaultConfig()
	config.Driver = database.DriverSQLite
	config.DSN = filepath.Join(t.TempDir(), "organization.db")
	runner, err := dbmigrate.New(t.Context(), dbmigrate.Config{Database: config, LockTimeout: 5 * time.Second}, migrationbinding.Set())
	if err != nil {
		t.Fatal(err)
	}
	if err := runner.Up(t.Context()); err != nil {
		t.Fatal(err)
	}
	if err := runner.Close(); err != nil {
		t.Fatal(err)
	}
	resource, err := database.NewGORM(t.Context(), &config)
	if err != nil {
		t.Fatal(err)
	}
	store, err := repo.New(resourceAccess{resource: resource})
	if err != nil {
		t.Fatal(err)
	}
	organization, err := service.New(store, clock.Fixed(time.Date(2026, 8, 22, 8, 0, 0, 0, time.UTC)), idgen.UUID(), accounts)
	if err != nil {
		t.Fatal(err)
	}
	return organization, resource
}

type resourceAccess struct{ resource database.Resource }

func (access resourceAccess) Use(ctx context.Context, use func(database.Client) error) error {
	return database.Borrow(ctx, access.resource.Client(), use)
}
func (access resourceAccess) WithinTx(ctx context.Context, use func(context.Context, database.Client, database.Tx) error) error {
	return access.Use(ctx, func(client database.Client) error {
		return client.WithinTx(ctx, func(txCtx context.Context, tx database.Tx) error { return use(txCtx, client, tx) })
	})
}

func pointer(value *string) **string { return &value }
