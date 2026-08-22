package service_test

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	passwordadapter "github.com/rin721/go-scaffold-template/internal/module/iam/adapter/password"
	migrationbinding "github.com/rin721/go-scaffold-template/internal/module/iam/binding/migration"
	iampermission "github.com/rin721/go-scaffold-template/internal/module/iam/binding/permission"
	"github.com/rin721/go-scaffold-template/internal/module/iam/model"
	"github.com/rin721/go-scaffold-template/internal/module/iam/repo"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
	"github.com/rin721/go-scaffold-template/pkg/clock"
	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
	"github.com/rin721/go-scaffold-template/pkg/idgen"
	"golang.org/x/crypto/argon2"
)

func TestSetupLoginRBACAndRevisionInvalidation(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	ownerSession, err := iam.Setup(t.Context(), "setup-secret", "Owner_01", "系统所有者", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	if len(ownerSession.Identity.Permissions) != len(iam.Permissions()) {
		t.Fatalf("owner permissions = %d", len(ownerSession.Identity.Permissions))
	}
	if _, err := iam.Setup(t.Context(), "setup-secret", "other", "Other", "123456789012345"); !errors.Is(err, service.ErrSetupClosed) {
		t.Fatalf("second setup error = %v", err)
	}
	account, err := iam.CreateAccount(t.Context(), "member_01", "成员一", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	role, err := iam.CreateRole(t.Context(), "reader", "只读角色", "")
	if err != nil {
		t.Fatal(err)
	}
	if err := iam.ReplaceRolePermissions(t.Context(), role.ID, []permissioncatalog.Key{iampermission.SelfRead}); err != nil {
		t.Fatal(err)
	}
	if err := iam.ReplaceAccountRoles(t.Context(), account.ID, []string{role.ID}); err != nil {
		t.Fatal(err)
	}
	first, err := iam.Login(t.Context(), "MEMBER_01", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	if !first.Identity.MustChangePassword || len(first.Identity.Permissions) != 1 || first.Identity.Permissions[0] != iampermission.SelfRead {
		t.Fatalf("first identity = %#v", first.Identity)
	}
	if err := iam.ChangePassword(t.Context(), account.ID, "abcdefghijklmno", "ponmlkjihgfedcb"); err != nil {
		t.Fatal(err)
	}
	if _, err := iam.Resolve(t.Context(), first.ID); !errors.Is(err, service.ErrSessionInvalid) {
		t.Fatalf("stale session error = %v", err)
	}
	second, err := iam.Login(t.Context(), "member_01", "ponmlkjihgfedcb")
	if err != nil {
		t.Fatal(err)
	}
	if second.Identity.MustChangePassword {
		t.Fatal("changed password must clear first-login restriction")
	}
	if err := iam.Compatible(t.Context()); err != nil {
		t.Fatalf("compatible state: %v", err)
	}
}

func TestLoginFailureIsPersistedUntilLockout(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	if _, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345"); err != nil {
		t.Fatal(err)
	}
	for attempt := 1; attempt <= 2; attempt++ {
		if _, err := iam.Login(t.Context(), "owner", "wrong-password-value"); !errors.Is(err, service.ErrInvalidCredentials) {
			t.Fatalf("attempt %d error = %v", attempt, err)
		}
	}
	if _, err := iam.Login(t.Context(), "owner", "wrong-password-value"); !errors.Is(err, service.ErrAccountLocked) {
		t.Fatalf("lockout error = %v", err)
	}
	if _, err := iam.Login(t.Context(), "owner", "123456789012345"); !errors.Is(err, service.ErrAccountLocked) {
		t.Fatalf("locked account login error = %v", err)
	}
}

func TestLoginRehashesHistoricalCredential(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	session, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	legacy := historicalHash("123456789012345")
	store := storeForResource(t, resource)
	if err := store.Use(t.Context(), func(unit *repo.Unit) error {
		return unit.UpdateCredential(t.Context(), session.Identity.AccountID, legacy, time.Date(2026, 8, 21, 1, 0, 0, 0, time.UTC))
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := iam.Login(t.Context(), "owner", "123456789012345"); err != nil {
		t.Fatalf("Login() error = %v", err)
	}
	var current string
	if err := store.Use(t.Context(), func(unit *repo.Unit) error {
		credential, findErr := unit.CredentialByAccount(t.Context(), session.Identity.AccountID)
		current = credential.PasswordHash
		return findErr
	}); err != nil {
		t.Fatal(err)
	}
	verification, err := passwordadapter.Verify(current, "123456789012345")
	if err != nil || !verification.Match || verification.NeedsRehash || current == legacy {
		t.Fatalf("rehash = %#v, error = %v, changed = %t", verification, err, current != legacy)
	}
}

func TestLoginRejectsUnboundedStoredCredentialWithoutLeakingIt(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	session, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	salt := base64.RawStdEncoding.EncodeToString(make([]byte, 16))
	digest := base64.RawStdEncoding.EncodeToString(make([]byte, 32))
	corrupted := fmt.Sprintf("$argon2id$v=%d$m=4294967295,t=3,p=2$%s$%s", argon2.Version, salt, digest)
	store := storeForResource(t, resource)
	if err := store.Use(t.Context(), func(unit *repo.Unit) error {
		return unit.UpdateCredential(t.Context(), session.Identity.AccountID, corrupted, time.Date(2026, 8, 21, 1, 0, 0, 0, time.UTC))
	}); err != nil {
		t.Fatal(err)
	}
	_, err = iam.Login(t.Context(), "owner", "123456789012345")
	if !errors.Is(err, service.ErrInvalidCredentials) {
		t.Fatalf("Login(corrupted credential) error = %v", err)
	}
	if strings.Contains(err.Error(), corrupted) {
		t.Fatalf("Login() leaked stored credential: %v", err)
	}
}

func TestOwnerCatalogExpansionIsReconciledAndInvalidatesSession(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	session, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	definitions := iampermission.Definitions()
	definitions = append(definitions, permissioncatalog.Definition{Key: "example:read", OwnerModuleID: "example", DescriptionMessageID: "permission.example.read"})
	expanded := serviceForResource(t, resource, definitions)
	if err := expanded.Compatible(t.Context()); !errors.Is(err, service.ErrIncompatibleState) {
		t.Fatalf("missing owner permission compatibility error = %v", err)
	}
	if err := expanded.ReconcileOwnerCatalog(t.Context()); err != nil {
		t.Fatal(err)
	}
	if err := expanded.Compatible(t.Context()); err != nil {
		t.Fatal(err)
	}
	if _, err := expanded.Resolve(t.Context(), session.ID); !errors.Is(err, service.ErrSessionInvalid) {
		t.Fatalf("owner session after catalog expansion = %v", err)
	}
}

func TestLastOwnerCannotBeDisabledOrUnassigned(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	session, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	roles, err := iam.ListRoles(t.Context(), 0, 20)
	if err != nil || len(roles.Items) != 1 {
		t.Fatalf("roles = %#v, %v", roles, err)
	}
	if err := iam.SetAccountStatus(t.Context(), session.Identity.AccountID, model.AccountDisabled); !errors.Is(err, model.ErrOwnerInvariant) {
		t.Fatalf("disable owner error = %v", err)
	}
	if err := iam.ReplaceAccountRoles(t.Context(), session.Identity.AccountID, nil); !errors.Is(err, model.ErrOwnerInvariant) {
		t.Fatalf("unassign owner error = %v", err)
	}
}

func TestConcurrentOwnerDisableCannotRemoveEveryActiveOwner(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	first, err := iam.Setup(t.Context(), "setup-secret", "owner-a", "Owner A", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	second, err := iam.CreateAccount(t.Context(), "owner-b", "Owner B", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	roles, err := iam.ListRoles(t.Context(), 0, 20)
	if err != nil || len(roles.Items) != 1 {
		t.Fatalf("roles = %#v, %v", roles, err)
	}
	if err := iam.ReplaceAccountRoles(t.Context(), second.ID, []string{roles.Items[0].ID}); err != nil {
		t.Fatal(err)
	}
	start := make(chan struct{})
	results := make(chan error, 2)
	for _, accountID := range []string{first.Identity.AccountID, second.ID} {
		go func(id string) {
			<-start
			results <- iam.SetAccountStatus(context.Background(), id, model.AccountDisabled)
		}(accountID)
	}
	close(start)
	<-results
	<-results
	accounts, err := iam.ListAccounts(t.Context(), 0, 20)
	if err != nil {
		t.Fatal(err)
	}
	active := 0
	for _, account := range accounts.Items {
		if account.Status == model.AccountActive {
			active++
		}
	}
	if active < 1 {
		t.Fatal("concurrent mutations removed every active owner")
	}
}

func newService(t *testing.T) (*service.Service, database.Resource) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "iam.db")
	cfg := database.DefaultConfig()
	cfg.Driver = database.DriverSQLite
	cfg.DSN = path
	runner, err := dbmigrate.New(t.Context(), dbmigrate.Config{Database: cfg, LockTimeout: 5 * time.Second}, migrationbinding.Set())
	if err != nil {
		t.Fatal(err)
	}
	if err := runner.Up(t.Context()); err != nil {
		t.Fatal(err)
	}
	if err := runner.Close(); err != nil {
		t.Fatal(err)
	}
	resource, err := database.NewGORM(t.Context(), &cfg)
	if err != nil {
		t.Fatal(err)
	}
	iam := serviceForResource(t, resource, iampermission.Definitions())
	return iam, resource
}

func serviceForResource(t *testing.T, resource database.Resource, definitions []permissioncatalog.Definition) *service.Service {
	t.Helper()
	store := storeForResource(t, resource)
	catalog, err := permissioncatalog.BuildCatalog(definitions...)
	if err != nil {
		t.Fatal(err)
	}
	iam, err := service.New(store, clock.Fixed(time.Date(2026, 8, 22, 1, 0, 0, 0, time.UTC)), idgen.UUID(), passwordadapter.Hasher{}, service.Config{SetupToken: "setup-secret", IdleTimeout: 30 * time.Minute, AbsoluteTimeout: 12 * time.Hour, MaxFailedAttempts: 3, LockDuration: 15 * time.Minute}, catalog)
	if err != nil {
		t.Fatal(err)
	}
	return iam
}

func storeForResource(t *testing.T, resource database.Resource) *repo.Store {
	t.Helper()
	store, err := repo.New(resourceAccess{resource})
	if err != nil {
		t.Fatal(err)
	}
	return store
}

func historicalHash(value string) string {
	salt := []byte("historical-salt!")
	digest := argon2.IDKey([]byte(value), salt, 2, 32*1024, 1, 32)
	return fmt.Sprintf("$argon2id$v=%d$m=32768,t=2,p=1$%s$%s", argon2.Version, base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(digest))
}

type resourceAccess struct{ resource database.Resource }

func (a resourceAccess) Use(ctx context.Context, use func(database.Client) error) error {
	return database.Borrow(ctx, a.resource.Client(), use)
}
func (a resourceAccess) WithinTx(ctx context.Context, use func(context.Context, database.Client, database.Tx) error) error {
	return a.Use(ctx, func(client database.Client) error {
		return client.WithinTx(ctx, func(txCtx context.Context, tx database.Tx) error { return use(txCtx, client, tx) })
	})
}
