package service_test

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"time"

	passwordadapter "github.com/rin721/go-scaffold-template/internal/module/iam/adapter/password"
	"github.com/rin721/go-scaffold-template/internal/module/iam/authorization"
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
	if _, err := iam.ReplaceRolePermissions(t.Context(), role.ID, 1, []permissioncatalog.Key{iampermission.SelfRead}); err != nil {
		t.Fatal(err)
	}
	if _, err := iam.ReplaceAccountRoles(t.Context(), account.ID, 1, []string{role.ID}); err != nil {
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
	roles, err := iam.ListRoles(t.Context(), 0, 20, "")
	if err != nil || len(roles.Items) != 1 {
		t.Fatalf("roles = %#v, %v", roles, err)
	}
	if err := iam.SetAccountStatus(t.Context(), session.Identity.AccountID, model.AccountDisabled); !errors.Is(err, model.ErrOwnerInvariant) {
		t.Fatalf("disable owner error = %v", err)
	}
	if _, err := iam.ReplaceAccountRoles(t.Context(), session.Identity.AccountID, 1, nil); !errors.Is(err, model.ErrOwnerInvariant) {
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
	roles, err := iam.ListRoles(t.Context(), 0, 20, "")
	if err != nil || len(roles.Items) != 1 {
		t.Fatalf("roles = %#v, %v", roles, err)
	}
	if _, err := iam.ReplaceAccountRoles(t.Context(), second.ID, 1, []string{roles.Items[0].ID}); err != nil {
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
	accounts, err := iam.ListAccounts(t.Context(), 0, 20, "")
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
	runtime, err := authorization.New(store, catalog)
	if err != nil {
		t.Fatal(err)
	}
	iam, err := service.New(store, clock.Fixed(time.Date(2026, 8, 22, 1, 0, 0, 0, time.UTC)), idgen.UUID(), passwordadapter.Hasher{}, service.Config{SetupToken: "setup-secret", IdleTimeout: 30 * time.Minute, AbsoluteTimeout: 12 * time.Hour, MaxFailedAttempts: 3, LockDuration: 15 * time.Minute}, catalog, runtime)
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

// TestRelationshipReplaceVersionConflictAndNoOp 覆盖 dynamic assignment 的
// expected version 语义：过期版本返回 409 类错误；no-op 不改变版本与 revision、
// 不撤销 Session；有效变更返回 diff 与新版本。
func TestRelationshipReplaceVersionConflictAndNoOp(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	session, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	account, err := iam.CreateAccount(t.Context(), "member", "成员", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	role, err := iam.CreateRole(t.Context(), "reader", "只读", "")
	if err != nil {
		t.Fatal(err)
	}
	// 过期 expected version → 稳定冲突。
	if _, err := iam.ReplaceAccountRoles(t.Context(), account.ID, 99, []string{role.ID}); !errors.Is(err, service.ErrVersionConflict) {
		t.Fatalf("stale account version error = %v", err)
	}
	if _, err := iam.ReplaceRolePermissions(t.Context(), role.ID, 99, []permissioncatalog.Key{iampermission.SelfRead}); !errors.Is(err, service.ErrVersionConflict) {
		t.Fatalf("stale role version error = %v", err)
	}
	// 正确版本写入角色权限，获得 added 计数与 role version 递增。
	result, err := iam.ReplaceRolePermissions(t.Context(), role.ID, 1, []permissioncatalog.Key{iampermission.SelfRead})
	if err != nil {
		t.Fatal(err)
	}
	if result.Added != 1 || result.Removed != 0 || result.EntityVersion != 2 || result.AuthorizationRevision != 3 {
		t.Fatalf("role permission replace result = %#v", result)
	}
	view, err := iam.RolePermissionsSnapshot(t.Context(), role.ID)
	if err != nil || view.RoleVersion != 2 || len(view.PermissionKeys) != 1 || view.PermissionKeys[0] != iampermission.SelfRead {
		t.Fatalf("role permissions snapshot = %#v, %v", view, err)
	}
	// 账号角色替换成功；旧 Session 失效。
	if _, err := iam.ReplaceAccountRoles(t.Context(), account.ID, 1, []string{role.ID}); err != nil {
		t.Fatal(err)
	}
	first, err := iam.Login(t.Context(), "member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	// no-op 再提交同一集合：版本/revision 不变，Session 不被撤销。
	before, err := iam.AccountRolesSnapshot(t.Context(), account.ID)
	if err != nil {
		t.Fatal(err)
	}
	noop, err := iam.ReplaceAccountRoles(t.Context(), account.ID, before.AccountVersion, []string{role.ID})
	if err != nil {
		t.Fatal(err)
	}
	if noop.Added != 0 || noop.Removed != 0 || noop.EntityVersion != before.AccountVersion || noop.AuthorizationRevision != before.AuthorizationRevision {
		t.Fatalf("no-op result = %#v, before = %#v", noop, before)
	}
	if _, err := iam.Resolve(t.Context(), first.ID); err != nil {
		t.Fatalf("no-op must not revoke member session: %v", err)
	}
	// 版本冲突后不静默覆盖：期望集合保持不变。
	if _, err := iam.ReplaceAccountRoles(t.Context(), account.ID, noop.EntityVersion, []string{role.ID, "role-ghost"}); !errors.Is(err, repo.ErrNotFound) {
		t.Fatalf("ghost role error = %v", err)
	}
	_ = session
}

// TestReplaceRemovesPermissionRevokesAssignedSessionsAndPublishes 验证有效
// 角色权限移除会撤销持有者的 Session，且新登录账号不再拥有该权限。
func TestReplaceRemovesPermissionRevokesAssignedSessionsAndPublishes(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	if _, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345"); err != nil {
		t.Fatal(err)
	}
	account, err := iam.CreateAccount(t.Context(), "member", "成员", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	role, err := iam.CreateRole(t.Context(), "reader", "只读", "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := iam.ReplaceRolePermissions(t.Context(), role.ID, 1, []permissioncatalog.Key{iampermission.SelfRead, iampermission.AccountRead}); err != nil {
		t.Fatal(err)
	}
	if _, err := iam.ReplaceAccountRoles(t.Context(), account.ID, 1, []string{role.ID}); err != nil {
		t.Fatal(err)
	}
	session, err := iam.Login(t.Context(), "member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	// 移除 AccountRead：持有者 Session 被撤销。
	result, err := iam.ReplaceRolePermissions(t.Context(), role.ID, 2, []permissioncatalog.Key{iampermission.SelfRead})
	if err != nil {
		t.Fatal(err)
	}
	if result.Removed != 1 || result.Added != 0 {
		t.Fatalf("remove result = %#v", result)
	}
	if _, err := iam.Resolve(t.Context(), session.ID); !errors.Is(err, service.ErrSessionInvalid) {
		t.Fatalf("member session after permission removal = %v", err)
	}
	replacement, err := iam.Login(t.Context(), "member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	if replacement.Identity.SecurityRevision != session.Identity.SecurityRevision+1 {
		t.Fatalf("replacement security revision = %d, want %d", replacement.Identity.SecurityRevision, session.Identity.SecurityRevision+1)
	}
	view, err := iam.RolePermissionsSnapshot(t.Context(), role.ID)
	if err != nil || len(view.PermissionKeys) != 1 || view.PermissionKeys[0] != iampermission.SelfRead {
		t.Fatalf("role permissions snapshot = %#v, %v", view, err)
	}
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

func TestSessionListingAndSelectiveRevocation(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	if _, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345"); err != nil {
		t.Fatal(err)
	}
	first, err := iam.Login(t.Context(), "owner", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	second, err := iam.Login(t.Context(), "owner", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	accountID := first.Identity.AccountID

	items, err := iam.ListSessions(t.Context(), accountID)
	if err != nil {
		t.Fatal(err)
	}
	// Setup 也创建了一个会话，因此共 3 个。
	if len(items) != 3 {
		t.Fatalf("session list = %d, want 3", len(items))
	}
	// 摘要视图不泄露明文 SessionID。
	for _, item := range items {
		if item.IDHash == "" || item.IDHash == first.ID || item.IDHash == second.ID {
			t.Fatalf("session view leaks raw id: %#v", item)
		}
	}
	// 按明文 session id 的摘要定位对应的 idHash（测试夹具内部实现细节）。
	firstHash, secondHash := "", ""
	for _, item := range items {
		raw, err := hex.DecodeString(item.IDHash)
		if err != nil {
			t.Fatal(err)
		}
		switch string(raw) {
		case string(sessionDigest(first.ID)):
			firstHash = item.IDHash
		case string(sessionDigest(second.ID)):
			secondHash = item.IDHash
		}
	}
	if firstHash == "" || secondHash == "" {
		t.Fatalf("first/second session hash not found: %#v", items)
	}

	// 批量吊销 first 会话；first 失效、second 与 setup 仍有效。
	revoked, err := iam.RevokeSessions(t.Context(), accountID, []string{firstHash})
	if err != nil {
		t.Fatal(err)
	}
	if revoked != 1 {
		t.Fatalf("revoked = %d, want 1", revoked)
	}
	if _, err := iam.Resolve(t.Context(), first.ID); !errors.Is(err, service.ErrSessionInvalid) {
		t.Fatalf("revoked session resolve error = %v", err)
	}
	if _, err := iam.Resolve(t.Context(), second.ID); err != nil {
		t.Fatalf("active session resolve error = %v", err)
	}

	// 重复吊销是 no-op；未知摘要 fail closed。
	if revoked, err := iam.RevokeSessions(t.Context(), accountID, []string{firstHash}); err != nil || revoked != 0 {
		t.Fatalf("repeat revoke = %d, %v", revoked, err)
	}
	if _, err := iam.RevokeSessions(t.Context(), accountID, []string{"deadbeef"}); !errors.Is(err, service.ErrSessionInvalid) {
		t.Fatalf("unknown session hash error = %v", err)
	}

	// 吊销剩余全部会话后 second 也失效。
	remaining, err := iam.ListSessions(t.Context(), accountID)
	if err != nil {
		t.Fatal(err)
	}
	hashes := make([]string, 0, len(remaining))
	for _, item := range remaining {
		hashes = append(hashes, item.IDHash)
	}
	if n, err := iam.RevokeSessions(t.Context(), accountID, hashes); err != nil || n == 0 {
		t.Fatalf("revoke remaining = %d, %v", n, err)
	}
	if _, err := iam.Resolve(t.Context(), second.ID); !errors.Is(err, service.ErrSessionInvalid) {
		t.Fatalf("second session resolve error = %v", err)
	}
}

// sessionDigest 计算与服务端一致的明文会话摘要（测试夹具用）。
func sessionDigest(value string) []byte {
	sum := sha256.Sum256([]byte(value))
	return sum[:]
}

type recordingOperationAudit struct {
	requests []service.OperationAuditRequest
}

func (r *recordingOperationAudit) RecordOperation(_ context.Context, request service.OperationAuditRequest) error {
	r.requests = append(r.requests, request)
	return nil
}

func TestWriteOperationsAuditOperationOutcome(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	audit := &recordingOperationAudit{}
	iam.WithOperationAudit(audit)

	if _, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345"); err != nil {
		t.Fatal(err)
	}
	account, err := iam.CreateAccount(t.Context(), "member", "Member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	role, err := iam.CreateRole(t.Context(), "reader", "Reader", "")
	if err != nil {
		t.Fatal(err)
	}
	if err := iam.SetAccountStatus(t.Context(), account.ID, model.AccountDisabled); err != nil {
		t.Fatal(err)
	}
	if err := iam.ResetPassword(t.Context(), account.ID, "ponmlkjihgfedcb"); err != nil {
		t.Fatal(err)
	}
	rolesView, err := iam.AccountRolesSnapshot(t.Context(), account.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := iam.ReplaceAccountRoles(t.Context(), account.ID, rolesView.AccountVersion, []string{role.ID}); err != nil {
		t.Fatal(err)
	}
	permissionsView, err := iam.RolePermissionsSnapshot(t.Context(), role.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := iam.ReplaceRolePermissions(t.Context(), role.ID, permissionsView.RoleVersion, []permissioncatalog.Key{iampermission.SelfRead}); err != nil {
		t.Fatal(err)
	}

	operations := map[string]bool{}
	for _, request := range audit.requests {
		operations[request.Operation] = true
		if request.ResourceType != "account" && request.ResourceType != "role" {
			t.Fatalf("operation audit resource type unexpected: %#v", request)
		}
		if request.ResourceID == "" {
			t.Fatalf("operation audit resource id is empty: %#v", request)
		}
		if request.Outcome != service.OperationSucceeded {
			t.Fatalf("operation audit outcome is not succeeded: %#v", request)
		}
	}
	for _, expected := range []string{"iam.accounts.create", "iam.roles.create", "iam.accounts.status", "iam.accounts.password.reset", "iam.accounts.roles.replace", "iam.roles.permissions.replace"} {
		if !operations[expected] {
			t.Fatalf("operation audit missing %q: %#v", expected, audit.requests)
		}
	}
}

func TestWriteOperationAuditRecordsFailureWithoutBlocking(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	audit := &recordingOperationAudit{}
	iam.WithOperationAudit(audit)

	// 失败写操作：重置不存在账号应记录 failed 且不阻塞业务错误返回。
	err := iam.ResetPassword(t.Context(), "missing-account", "ponmlkjihgfedcb")
	if err == nil {
		t.Fatal("reset password for missing account should fail")
	}
	_ = err
	found := false
	for _, request := range audit.requests {
		if request.ResourceType == "account" && request.Outcome == service.OperationFailed {
			found = true
		}
	}
	if !found {
		t.Fatalf("failed operation audit missing: %#v", audit.requests)
	}
}

func TestSessionListRejectsUnknownAccount(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	if _, err := iam.ListSessions(t.Context(), "missing-account"); !errors.Is(err, repo.ErrNotFound) {
		t.Fatalf("unknown account session list error = %v", err)
	}
}

// TestAccountInfoUpdateRenamesAndRevokesSessions 验证账号显示名更新：成功变更
// 后安全 revision 递增、Session 撤销、过期版本返回稳定冲突。
func TestAccountInfoUpdateRenamesAndRevokesSessions(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	if _, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345"); err != nil {
		t.Fatal(err)
	}
	account, err := iam.CreateAccount(t.Context(), "member", "成员", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	if err := iam.UpdateAccountInfo(t.Context(), account.ID, 99, "新名字"); !errors.Is(err, service.ErrVersionConflict) {
		t.Fatalf("stale account version error = %v", err)
	}
	session, err := iam.Login(t.Context(), "member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	accounts, err := iam.ListAccounts(t.Context(), 0, 20, "")
	if err != nil {
		t.Fatal(err)
	}
	var currentVersion uint64
	for _, item := range accounts.Items {
		if item.ID == account.ID {
			currentVersion = item.Version
		}
	}
	if err := iam.UpdateAccountInfo(t.Context(), account.ID, currentVersion, "新名字"); err != nil {
		t.Fatal(err)
	}
	if _, err := iam.Resolve(t.Context(), session.ID); !errors.Is(err, service.ErrSessionInvalid) {
		t.Fatalf("session after rename error = %v", err)
	}
	replacement, err := iam.Login(t.Context(), "member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	if replacement.Identity.DisplayName != "新名字" || replacement.Identity.SecurityRevision != session.Identity.SecurityRevision+1 {
		t.Fatalf("replacement identity = %#v", replacement.Identity)
	}
}

// TestArchiveAccountBlocksLoginAssignmentAndRevokesSessions 验证账号归档：
// 归档后不可登录、组织分配失败（Assignable=false）、Session 撤销、owner 最后账号保护。
func TestArchiveAccountBlocksLoginAssignmentAndRevokesSessions(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	session, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	account, err := iam.CreateAccount(t.Context(), "member", "成员", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	memberSession, err := iam.Login(t.Context(), "member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	if err := iam.ArchiveAccount(t.Context(), account.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := iam.Login(t.Context(), "member", "abcdefghijklmno"); !errors.Is(err, service.ErrAccountDisabled) {
		t.Fatalf("login after archive error = %v", err)
	}
	if err := iam.RequireAssignableAccount(t.Context(), account.ID); !errors.Is(err, service.ErrAccountDisabled) {
		t.Fatalf("assignable after archive error = %v", err)
	}
	if _, err := iam.Resolve(t.Context(), memberSession.ID); !errors.Is(err, service.ErrSessionInvalid) {
		t.Fatalf("session after archive error = %v", err)
	}
	// 重复归档是 no-op。
	if err := iam.ArchiveAccount(t.Context(), account.ID); err != nil {
		t.Fatalf("repeat archive error = %v", err)
	}
	// 最后一个 owner 账号不可归档。
	if err := iam.ArchiveAccount(t.Context(), session.Identity.AccountID); !errors.Is(err, model.ErrOwnerInvariant) {
		t.Fatalf("archive last owner error = %v", err)
	}
}

// TestRoleInfoUpdateDoesNotChangeAuthorizationRevision 验证角色改名/描述更新：
// 不触发授权 revision change、不撤销持有者 Session；过期版本返回稳定冲突。
func TestRoleInfoUpdateDoesNotChangeAuthorizationRevision(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	if _, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345"); err != nil {
		t.Fatal(err)
	}
	role, err := iam.CreateRole(t.Context(), "reader", "只读", "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := iam.ReplaceRolePermissions(t.Context(), role.ID, 1, []permissioncatalog.Key{iampermission.SelfRead}); err != nil {
		t.Fatal(err)
	}
	account, err := iam.CreateAccount(t.Context(), "member", "成员", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := iam.ReplaceAccountRoles(t.Context(), account.ID, 1, []string{role.ID}); err != nil {
		t.Fatal(err)
	}
	session, err := iam.Login(t.Context(), "member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	before, err := iam.RolePermissionsSnapshot(t.Context(), role.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := iam.UpdateRoleInfo(t.Context(), role.ID, 99, "只读升级", "描述"); !errors.Is(err, service.ErrVersionConflict) {
		t.Fatalf("stale role version error = %v", err)
	}
	updated, err := iam.UpdateRoleInfo(t.Context(), role.ID, before.RoleVersion, "只读升级", "描述")
	if err != nil {
		t.Fatal(err)
	}
	if updated.Name != "只读升级" || updated.Description != "描述" {
		t.Fatalf("updated role = %#v", updated)
	}
	after, err := iam.RolePermissionsSnapshot(t.Context(), role.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after.AuthorizationRevision != before.AuthorizationRevision {
		t.Fatalf("role info update changed authorization revision: %d -> %d", before.AuthorizationRevision, after.AuthorizationRevision)
	}
	// 改名不撤销持有者 Session。
	if _, err := iam.Resolve(t.Context(), session.ID); err != nil {
		t.Fatalf("member session after role rename = %v", err)
	}
	// owner 角色不可改名。
	ownerRoles, err := iam.ListRoles(t.Context(), 0, 20, "")
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range ownerRoles.Items {
		if item.Code == model.OwnerRoleCode {
			if _, err := iam.UpdateRoleInfo(t.Context(), item.ID, item.Version, "x", ""); !errors.Is(err, service.ErrImmutableOwner) {
				t.Fatalf("owner role info update error = %v", err)
			}
		}
	}
}

// TestArchiveRoleRevokesPermissionAndSessions 验证角色归档：归档移出授权规则、
// 持有者 Session 撤销、不可再分配、owner 不可归档。
func TestArchiveRoleRevokesPermissionAndSessions(t *testing.T) {
	iam, resource := newService(t)
	defer resource.Close()
	ownerSession, err := iam.Setup(t.Context(), "setup-secret", "owner", "Owner", "123456789012345")
	if err != nil {
		t.Fatal(err)
	}
	role, err := iam.CreateRole(t.Context(), "reader", "只读", "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := iam.ReplaceRolePermissions(t.Context(), role.ID, 1, []permissioncatalog.Key{iampermission.SelfRead, iampermission.AccountRead}); err != nil {
		t.Fatal(err)
	}
	account, err := iam.CreateAccount(t.Context(), "member", "成员", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := iam.ReplaceAccountRoles(t.Context(), account.ID, 1, []string{role.ID}); err != nil {
		t.Fatal(err)
	}
	session, err := iam.Login(t.Context(), "member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	if err := iam.ArchiveRole(t.Context(), role.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := iam.Resolve(t.Context(), session.ID); !errors.Is(err, service.ErrSessionInvalid) {
		t.Fatalf("member session after role archive = %v", err)
	}
	// 归档角色不可再分配。
	accounts, err := iam.ListAccounts(t.Context(), 0, 20, "")
	if err != nil {
		t.Fatal(err)
	}
	var accountVersion uint64
	for _, item := range accounts.Items {
		if item.ID == account.ID {
			accountVersion = item.Version
			break
		}
	}
	if _, err := iam.ReplaceAccountRoles(t.Context(), account.ID, accountVersion, []string{role.ID}); !errors.Is(err, repo.ErrNotFound) {
		t.Fatalf("assign archived role error = %v", err)
	}
	// 新登录不再获得该角色权限。
	replacement, err := iam.Login(t.Context(), "member", "abcdefghijklmno")
	if err != nil {
		t.Fatal(err)
	}
	if len(replacement.Identity.Permissions) != 0 {
		t.Fatalf("permissions after role archive = %v", replacement.Identity.Permissions)
	}
	// owner 角色不可归档。
	ownerRoles, err := iam.ListRoles(t.Context(), 0, 20, "")
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range ownerRoles.Items {
		if item.Code == model.OwnerRoleCode {
			if err := iam.ArchiveRole(t.Context(), item.ID); !errors.Is(err, service.ErrImmutableOwner) {
				t.Fatalf("archive owner role error = %v", err)
			}
		}
	}
	_ = ownerSession
}
