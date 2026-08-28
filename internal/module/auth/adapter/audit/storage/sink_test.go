package auditstorage

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	authmigration "github.com/rin721/go-scaffold-template/internal/module/auth/binding/migration"
	authmodel "github.com/rin721/go-scaffold-template/internal/module/auth/model"
	authrepo "github.com/rin721/go-scaffold-template/internal/module/auth/repo"
	authservice "github.com/rin721/go-scaffold-template/internal/module/auth/service"
	"github.com/rin721/go-scaffold-template/pkg/clock"
	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
)

type noopAudit struct{}

func (noopAudit) Record(context.Context, authmodel.AuditEvent) error { return nil }

func newTestService(currentClock clock.Clock) (*authservice.Service, error) {
	return authservice.NewLocal(currentClock, noopAudit{}, []authmodel.Policy{
		{Operation: "auth.audit.list", Mode: authmodel.PolicyProtected, Scope: "auth:audit:read", Action: "auth.audit.list"},
	})
}

// newTestServiceWithSink 使用给定 audit sink（与 storage 一致）构造 service，
// 使 RecordOperation 与 ListAuditEvents 消费同一持久化面。
func newTestServiceWithSink(currentClock clock.Clock, sink authservice.AuditSink) (*authservice.Service, error) {
	service, err := authservice.NewLocal(currentClock, sink, []authmodel.Policy{
		{Operation: "auth.audit.list", Mode: authmodel.PolicyProtected, Scope: "auth:audit:read", Action: "auth.audit.list"},
	})
	if err != nil {
		return nil, err
	}
	return service, nil
}

type accessFor struct{ resource database.Resource }

func (a accessFor) Use(ctx context.Context, use func(database.Client) error) error {
	return database.Borrow(ctx, a.resource.Client(), use)
}
func (a accessFor) WithinTx(ctx context.Context, use func(context.Context, database.Client, database.Tx) error) error {
	return a.Use(ctx, func(client database.Client) error {
		return client.WithinTx(ctx, func(txCtx context.Context, tx database.Tx) error { return use(txCtx, client, tx) })
	})
}

func newTestStore(t *testing.T) (*authrepo.Store, database.Resource) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "auth-audit.db")
	cfg := database.DefaultConfig()
	cfg.Driver = database.DriverSQLite
	cfg.DSN = path
	runner, err := dbmigrate.New(t.Context(), dbmigrate.Config{Database: cfg, LockTimeout: 5 * time.Second}, authmigration.Set())
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
	store, err := authrepo.New(accessFor{resource})
	if err != nil {
		t.Fatal(err)
	}
	return store, resource
}

func testEvent(op, action string, subject string, index uint64, outcome authmodel.AuditOutcome) authmodel.AuditEvent {
	now := time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC)
	principal, err := authmodel.NewIAMRBACPrincipal(subject, authmodel.ActorService, index+1, false, now, now)
	if err != nil {
		panic(err)
	}
	return authmodel.AuditEvent{
		Operation: op, Action: authmodel.Action(action), Principal: principal,
		Resource: authmodel.ResourceFacts{Type: "account", ID: subject},
		Decision: authmodel.Decision{Allowed: true, Reason: authmodel.ReasonAllowed},
		Outcome:  outcome,
	}
}

func TestSinkRecordsAndListsLowSensitivityEvents(t *testing.T) {
	store, resource := newTestStore(t)
	defer resource.Close()
	fixed := clock.Fixed(time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC))
	sink, err := New(store, fixed, 10)
	if err != nil {
		t.Fatal(err)
	}
	first := testEvent("iam.accounts.list", "list", "account-1", 1, authmodel.AuditSucceeded)
	second := testEvent("iam.sessions.revoke", "revoke", "account-2", 2, authmodel.AuditDenied)
	second.Decision = authmodel.Decision{Reason: authmodel.ReasonRBACDenied}
	if err := sink.Record(t.Context(), first); err != nil {
		t.Fatal(err)
	}
	if err := sink.Record(t.Context(), second); err != nil {
		t.Fatal(err)
	}

	result, err := sink.List(t.Context(), authservice.AuditQueryFilter{}, 0, 20)
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 2 || len(result.Items) != 2 {
		t.Fatalf("unexpected audit list: %#v", result)
	}
	if result.Items[0].Operation != "iam.sessions.revoke" || result.Items[1].Operation != "iam.accounts.list" {
		t.Fatalf("audit events not sorted by occurrence desc: %#v", result.Items)
	}
	for _, item := range result.Items {
		if item.EventID == 0 {
			t.Fatalf("audit view does not expose a stable event id: %#v", item)
		}
		if item.SubjectHash == "" || item.SubjectHash == "account-1" || item.SubjectHash == "account-2" {
			t.Fatalf("audit view leaks raw subject: %#v", item)
		}
		if item.Outcome == "" || item.Decision == "" {
			t.Fatalf("audit view is incomplete: %#v", item)
		}
	}

	filtered, err := sink.List(t.Context(), authservice.AuditQueryFilter{Operation: "iam.accounts.list"}, 0, 20)
	if err != nil {
		t.Fatal(err)
	}
	if filtered.Total != 1 || filtered.Items[0].Operation != "iam.accounts.list" {
		t.Fatalf("operation filter failed: %#v", filtered)
	}
	if filtered.Items[0].Outcome != authmodel.AuditSucceeded || filtered.Items[0].Decision != authmodel.ReasonAllowed {
		t.Fatalf("filtered decision/outcome mismatch: %#v", filtered.Items[0])
	}

	byAction, err := sink.List(t.Context(), authservice.AuditQueryFilter{Action: "revoke"}, 0, 20)
	if err != nil {
		t.Fatal(err)
	}
	if byAction.Total != 1 || byAction.Items[0].Action != "revoke" {
		t.Fatalf("action filter failed: %#v", byAction)
	}

	byResource, err := sink.List(t.Context(), authservice.AuditQueryFilter{ResourceType: "account"}, 0, 20)
	if err != nil {
		t.Fatal(err)
	}
	if byResource.Total != 2 {
		t.Fatalf("resource type filter failed: %#v", byResource)
	}
}

func TestSinkTrimsOldestEventsAtLimit(t *testing.T) {
	store, resource := newTestStore(t)
	defer resource.Close()
	fixed := clock.Fixed(time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC))
	sink, err := New(store, fixed, 3)
	if err != nil {
		t.Fatal(err)
	}
	for index := 0; index < 5; index++ {
		event := testEvent("auth.audit.list", "list", "subject-"+time.Duration(index).String(), uint64(index), authmodel.AuditSucceeded)
		if err := sink.Record(t.Context(), event); err != nil {
			t.Fatal(err)
		}
	}
	result, err := sink.List(t.Context(), authservice.AuditQueryFilter{}, 0, 20)
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 3 {
		t.Fatalf("trim did not bound table size: total=%d", result.Total)
	}
}

// TestSinkFailClosedOnIncompleteReader 验证查询在 reader 不可用时 fail closed。
func TestServiceQueryFailClosedWithoutReader(t *testing.T) {
	store, resource := newTestStore(t)
	defer resource.Close()
	fixed := clock.Fixed(time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC))
	sink, err := New(store, fixed, 10)
	if err != nil {
		t.Fatal(err)
	}
	svc, err := newTestService(fixed)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ListAuditEvents(t.Context(), authservice.AuditQueryFilter{}, 0, 20); err == nil {
		t.Fatal("audit query without reader must fail closed")
	}
	if err := svc.WithAuditReader(sink); err != nil {
		t.Fatal(err)
	}
	evt := testEvent("auth.audit.list", "list", "account-1", 1, authmodel.AuditSucceeded)
	if err := sink.Record(t.Context(), evt); err != nil {
		t.Fatal(err)
	}
	result, err := svc.ListAuditEvents(t.Context(), authservice.AuditQueryFilter{}, 0, 20)
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 1 {
		t.Fatalf("unexpected reader result: %#v", result)
	}
}

// TestRecordOperationWritesLowSensitivityEvent 验证业务写操作审计经 service
// 写入同一低敏审计面，并保留 subject/resource 摘要语义。
func TestRecordOperationWritesLowSensitivityEvent(t *testing.T) {
	store, resource := newTestStore(t)
	defer resource.Close()
	fixed := clock.Fixed(time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC))
	sink, err := New(store, fixed, 10)
	if err != nil {
		t.Fatal(err)
	}
	svc, err := newTestServiceWithSink(fixed, sink)
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.WithAuditReader(sink); err != nil {
		t.Fatal(err)
	}
	// 无 principal 时 fail closed。
	unauth := authmodel.OperationAuditRequest{Operation: "iam.accounts.create", Action: "create", ResourceType: "account", ResourceID: "acct-1", Outcome: authmodel.AuditSucceeded}
	if err := svc.RecordOperation(t.Context(), unauth); !errors.Is(err, authmodel.ErrUnauthenticated) {
		t.Fatalf("record without principal error = %v", err)
	}
	principal, err := authmodel.NewIAMRBACPrincipal("account-0", authmodel.ActorService, 1, false, time.Now().UTC(), time.Now().UTC())
	if err != nil {
		t.Fatal(err)
	}
	ctx := authmodel.WithPrincipal(t.Context(), principal)
	req := authmodel.OperationAuditRequest{Operation: "iam.accounts.create", Action: "create", ResourceType: "account", ResourceID: "acct-1", Outcome: authmodel.AuditSucceeded}
	if err := svc.RecordOperation(ctx, req); err != nil {
		t.Fatal(err)
	}
	result, err := svc.ListAuditEvents(t.Context(), authservice.AuditQueryFilter{Action: "create"}, 0, 20)
	if err != nil {
		t.Fatal(err)
	}
	if result.Total != 1 || result.Items[0].Operation != "iam.accounts.create" {
		t.Fatalf("operation audit not recorded: %#v", result)
	}
	if result.Items[0].Action != "create" || result.Items[0].ResourceType != "account" || result.Items[0].Outcome != authmodel.AuditSucceeded {
		t.Fatalf("operation audit fields mismatch: %#v", result.Items[0])
	}
	if result.Items[0].SubjectHash == "" || result.Items[0].SubjectHash == "account-0" {
		t.Fatalf("operation audit leaks raw subject: %#v", result.Items[0])
	}
}

// TestRecordOperationFailsClosedOnIncompleteRequest 验证字段缺失 fail closed。
func TestRecordOperationFailsClosedOnIncompleteRequest(t *testing.T) {
	store, resource := newTestStore(t)
	defer resource.Close()
	fixed := clock.Fixed(time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC))
	sink, err := New(store, fixed, 10)
	if err != nil {
		t.Fatal(err)
	}
	svc, err := newTestService(fixed)
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.WithAuditReader(sink); err != nil {
		t.Fatal(err)
	}
	principal, err := authmodel.NewIAMRBACPrincipal("account-0", authmodel.ActorService, 1, false, time.Now().UTC(), time.Now().UTC())
	if err != nil {
		t.Fatal(err)
	}
	ctx := authmodel.WithPrincipal(t.Context(), principal)
	if err := svc.RecordOperation(ctx, authmodel.OperationAuditRequest{Outcome: authmodel.AuditSucceeded}); err == nil {
		t.Fatal("incomplete operation audit request must fail closed")
	}
}
