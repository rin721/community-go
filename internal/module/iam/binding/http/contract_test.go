package httpbinding

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	passwordadapter "github.com/rin721/go-scaffold-template/internal/module/iam/adapter/password"
	migrationbinding "github.com/rin721/go-scaffold-template/internal/module/iam/binding/migration"
	iampermission "github.com/rin721/go-scaffold-template/internal/module/iam/binding/permission"
	"github.com/rin721/go-scaffold-template/internal/module/iam/repo"
	"github.com/rin721/go-scaffold-template/internal/module/iam/service"
	permissioncatalog "github.com/rin721/go-scaffold-template/internal/permission"
	"github.com/rin721/go-scaffold-template/pkg/clock"
	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
	"github.com/rin721/go-scaffold-template/pkg/httpx"
	"github.com/rin721/go-scaffold-template/pkg/httpx/contract"
	"github.com/rin721/go-scaffold-template/pkg/idgen"
)

func TestSessionBoundaryPaginationAndStableConflicts(t *testing.T) {
	iam, resource := testService(t)
	defer resource.Close()
	handler, err := NewHandler(iam, nil)
	if err != nil {
		t.Fatal(err)
	}
	handlers := RuntimeHandlers(handler)
	setupBody := []byte(`{"setupToken":"setup-secret","username":"owner","displayName":"Owner","password":"123456789012345"}`)
	setupResponse := serve(t, handlers[contract.OperationID("iam.setup")], http.MethodPost, "http://example.test/api/v1/iam/setup", setupBody, nil, "")
	if setupResponse.Code != http.StatusCreated {
		t.Fatalf("setup status = %d, body = %s", setupResponse.Code, setupResponse.Body.String())
	}
	var session sessionResponse
	if err := json.Unmarshal(setupResponse.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	cookie := setupResponse.Result().Cookies()[0]

	duplicate := serve(t, handlers[contract.OperationID("iam.setup")], http.MethodPost, "http://example.test/api/v1/iam/setup", setupBody, nil, "")
	if duplicate.Code != http.StatusConflict {
		t.Fatalf("duplicate setup status = %d", duplicate.Code)
	}
	unauthenticated := serve(t, handlers[contract.OperationID("iam.session.read")], http.MethodGet, "http://example.test/api/v1/iam/session", nil, nil, "")
	if unauthenticated.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated session status = %d", unauthenticated.Code)
	}

	resolved, err := iam.Resolve(t.Context(), cookie.Value)
	if err != nil {
		t.Fatal(err)
	}
	withoutCSRF := serve(t, handlers[contract.OperationID("iam.accounts.create")], http.MethodPost, "http://example.test/api/v1/iam/accounts", []byte(`{"username":"member","displayName":"Member","password":"abcdefghijklmno"}`), &resolved, cookie.Value)
	if withoutCSRF.Code != http.StatusForbidden {
		t.Fatalf("missing csrf status = %d", withoutCSRF.Code)
	}
	if withoutCSRF.Header().Get("Content-Type") != "application/problem+json" {
		t.Fatalf("missing csrf content type = %q", withoutCSRF.Header().Get("Content-Type"))
	}
	list := serve(t, handlers[contract.OperationID("iam.accounts.list")], http.MethodGet, "http://example.test/api/v1/iam/accounts?offset=0&limit=1", nil, &resolved, cookie.Value)
	if list.Code != http.StatusOK || !bytes.Contains(list.Body.Bytes(), []byte(`"limit":1`)) || !bytes.Contains(list.Body.Bytes(), []byte(`"total":1`)) {
		t.Fatalf("paginated list = %d, %s", list.Code, list.Body.String())
	}
	_ = session
}

func serve(t *testing.T, handler contract.Handler, method, target string, body []byte, resolved *service.Session, sessionID string) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(method, target, bytes.NewReader(body))
	request.Header.Set("Origin", "http://example.test")
	if resolved != nil {
		request = service.WithResolvedSession(request, sessionID, *resolved)
	}
	response := httptest.NewRecorder()
	if err := handler.ServeHTTP(response, request); err != nil {
		httpx.WriteProblem(response, request, err)
	}
	return response
}

func testService(t *testing.T) (*service.Service, database.Resource) {
	t.Helper()
	config := database.DefaultConfig()
	config.Driver = database.DriverSQLite
	config.DSN = filepath.Join(t.TempDir(), "iam-http.db")
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
	store, err := repo.New(testAccess{resource})
	if err != nil {
		t.Fatal(err)
	}
	catalog, err := permissioncatalog.BuildCatalog(iampermission.Definitions()...)
	if err != nil {
		t.Fatal(err)
	}
	iam, err := service.New(store, clock.Fixed(time.Date(2026, 8, 22, 1, 0, 0, 0, time.UTC)), idgen.UUID(), passwordadapter.Hasher{}, service.Config{SetupToken: "setup-secret", IdleTimeout: 30 * time.Minute, AbsoluteTimeout: 12 * time.Hour, MaxFailedAttempts: 3, LockDuration: 15 * time.Minute}, catalog)
	if err != nil {
		t.Fatal(err)
	}
	return iam, resource
}

type testAccess struct{ resource database.Resource }

func (access testAccess) Use(ctx context.Context, use func(database.Client) error) error {
	return database.Borrow(ctx, access.resource.Client(), use)
}
func (access testAccess) WithinTx(ctx context.Context, use func(context.Context, database.Client, database.Tx) error) error {
	return access.Use(ctx, func(client database.Client) error {
		return client.WithinTx(ctx, func(txContext context.Context, tx database.Tx) error { return use(txContext, client, tx) })
	})
}
