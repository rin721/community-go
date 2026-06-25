package initcenter

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/open-console/console-platform/internal/app/initapp"
	appconfig "github.com/open-console/console-platform/internal/config"
	"github.com/open-console/console-platform/pkg/database"
	"github.com/open-console/console-platform/pkg/utils"
)

func TestInitTaskRegistryResolveOrdersDependencies(t *testing.T) {
	registry := NewInitTaskRegistry()
	for _, def := range []stepDefinition{
		{Key: "verify", Order: 30, Dependencies: []string{"migrate"}},
		{Key: "config", Order: 10},
		{Key: "migrate", Order: 20, Dependencies: []string{"config"}},
	} {
		if err := registry.Register(taskAdapter{def: def}); err != nil {
			t.Fatalf("register %s: %v", def.Key, err)
		}
	}

	defs, err := registry.Resolve()
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	got := make([]string, 0, len(defs))
	for _, def := range defs {
		got = append(got, def.Key)
	}
	want := []string{"config", "migrate", "verify"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("resolved order = %v, want %v", got, want)
	}
}

func TestInitTaskRegistryRejectsDuplicate(t *testing.T) {
	registry := NewInitTaskRegistry()
	if err := registry.Register(taskAdapter{def: stepDefinition{Key: "config"}}); err != nil {
		t.Fatalf("register first task: %v", err)
	}
	if err := registry.Register(taskAdapter{def: stepDefinition{Key: "config"}}); err == nil {
		t.Fatalf("expected duplicate task error")
	}
}

func TestBaseDefinitionsOrderSetupConfigurationSteps(t *testing.T) {
	service := New(initapp.Core{}, initapp.Infrastructure{}, initapp.Modules{}, "", nil)
	defs := service.definitions()
	index := map[string]int{}
	for position, def := range defs {
		index[def.Key] = position
	}
	assertBefore := func(left, right string) {
		t.Helper()
		leftIndex, leftOK := index[left]
		rightIndex, rightOK := index[right]
		if !leftOK || !rightOK {
			t.Fatalf("missing setup steps %s=%v %s=%v", left, leftOK, right, rightOK)
		}
		if leftIndex >= rightIndex {
			t.Fatalf("setup step %s index=%d must be before %s index=%d; order=%v", left, leftIndex, right, rightIndex, stepKeys(defs))
		}
	}

	assertBefore("storage.configure", "database.configure")
	assertBefore("database.configure", "cache.configure")
	assertBefore("database.configure", "system.configure")
	assertBefore("catalog.sync", "iam.owner")
	assertBefore("iam.owner", "site.configure")
	assertBefore("site.configure", "optional.finalize")
	assertBefore("site.configure", "verify.finish")
}

func TestInitDependencyResolverRejectsMissingDependency(t *testing.T) {
	resolver := InitDependencyResolver{tasks: map[string]stepDefinition{
		"migrate": {Key: "migrate", Dependencies: []string{"config"}},
	}}
	if _, err := resolver.Resolve(); err == nil {
		t.Fatalf("expected missing dependency error")
	}
}

func TestInitDependencyResolverRejectsCycle(t *testing.T) {
	resolver := InitDependencyResolver{tasks: map[string]stepDefinition{
		"a": {Key: "a", Dependencies: []string{"b"}},
		"b": {Key: "b", Dependencies: []string{"a"}},
	}}
	if _, err := resolver.Resolve(); err == nil {
		t.Fatalf("expected cyclic dependency error")
	}
}

func stepKeys(defs []stepDefinition) []string {
	out := make([]string, 0, len(defs))
	for _, def := range defs {
		out = append(out, def.Key)
	}
	return out
}

func TestStatusWithoutIAMModuleUsesBootstrapUserCheck(t *testing.T) {
	db, err := database.New(&database.Config{
		Driver: database.DriverSQLite,
		DBName: filepath.Join(t.TempDir(), "app.db"),
		Silent: true,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})

	service := New(
		initapp.Core{
			Config: &appconfig.Config{
				Auth: appconfig.AuthConfig{
					Enabled: true,
					PasswordPolicy: appconfig.PasswordPolicyConfig{
						MinLength: 8,
					},
				},
			},
			IDGenerator: utils.DefaultSnowflake(),
		},
		initapp.Infrastructure{Database: db},
		initapp.Modules{},
		"",
		nil,
	)
	status, err := service.Status(context.Background())
	if err != nil {
		t.Fatalf("status on empty bootstrap database: %v", err)
	}
	if !status.Required {
		t.Fatalf("status.Required = false, want true for empty IAM users table")
	}
	if status.PasswordPolicy.MinLength != 8 {
		t.Fatalf("password policy min length = %d, want 8", status.PasswordPolicy.MinLength)
	}
}

func TestSetupSchemaUsesI18nKeysWithoutDisplayFallbacks(t *testing.T) {
	schemas := []StepSchema{
		databaseSchema(),
		cacheSchema(),
		storageSchema(),
		systemSchema(),
		siteSchema(),
		iamOwnerSchema(),
		optionalFinalizeSchema(),
	}

	for _, schema := range schemas {
		if schema.Title != "" || schema.Description != "" {
			t.Fatalf("%s contains display fallback title=%q description=%q", schema.Key, schema.Title, schema.Description)
		}
		if schema.TitleKey == "" || schema.DescriptionKey == "" {
			t.Fatalf("%s missing title/description keys", schema.Key)
		}
		assertFieldsUseI18nKeys(t, schema.Fields)
		for _, group := range schema.Groups {
			if group.Title != "" || group.Description != "" {
				t.Fatalf("%s group %s contains display fallback title=%q description=%q", schema.Key, group.Key, group.Title, group.Description)
			}
			if group.TitleKey == "" || group.DescriptionKey == "" {
				t.Fatalf("%s group %s missing title/description keys", schema.Key, group.Key)
			}
			assertFieldsUseI18nKeys(t, group.Fields)
		}
	}
}

func TestSiteConfigureOwnsOnlySiteDisplayConfigPaths(t *testing.T) {
	values := map[string]any{
		"auth.issuer":                   "should-stay-system",
		"brand.productName":             "Console Platform",
		"brand.versionName":             "Community",
		"i18n.defaultLocale":            "en-US",
		"webui.public_base_url":         "https://admin.example.com",
		"system.seed_defaults_on_start": false,
	}

	sitePaths := configPathsForStep("site.configure", values)
	sort.Strings(sitePaths)
	if !reflect.DeepEqual(sitePaths, []string{"brand.productName", "brand.versionName", "webui.public_base_url"}) {
		t.Fatalf("site.configure paths = %v", sitePaths)
	}
	systemPaths := configPathsForStep("system.configure", values)
	for _, path := range systemPaths {
		switch path {
		case "brand.productName", "brand.versionName", "webui.public_base_url":
			t.Fatalf("system.configure still accepts site path %s: %v", path, systemPaths)
		}
	}

	cfg := &appconfig.Config{}
	for _, path := range sitePaths {
		if err := setConfigPath(cfg, path, values[path]); err != nil {
			t.Fatalf("setConfigPath(%s): %v", path, err)
		}
	}
	if cfg.Brand.ProductName != "Console Platform" || cfg.Brand.VersionName != "Community" || cfg.WebUI.PublicBaseURL != "https://admin.example.com" {
		t.Fatalf("site fields not written: brand=%#v webui=%#v", cfg.Brand, cfg.WebUI)
	}
}

func TestSiteConfigureValidatorChecksVisibleFieldsOnly(t *testing.T) {
	validator := NewInitValidator(&Service{core: initapp.Core{Config: &appconfig.Config{}}})
	failed := validator.Test(context.Background(), "site.configure", map[string]any{
		"brand.productName": "",
		"brand.versionName": "Community",
	})
	if failed.Status != "failed" || !strings.Contains(failed.Error, "productName") {
		t.Fatalf("site.configure failed result = %#v", failed)
	}

	passed := validator.Test(context.Background(), "site.configure", map[string]any{
		"brand.productName":     "Console Platform",
		"brand.versionName":     "Community",
		"webui.public_base_url": "https://admin.example.com",
	})
	if passed.Status != "succeeded" {
		t.Fatalf("site.configure status = %s error=%s hint=%s", passed.Status, passed.Error, passed.RepairHint)
	}
}

func TestInputFingerprintReturnsMarshalError(t *testing.T) {
	_, err := inputFingerprintFor("site.configure", map[string]any{"brand.productName": func() {}})
	if err == nil {
		t.Fatalf("inputFingerprintFor() error = nil, want marshal error")
	}
	if !strings.Contains(err.Error(), "encode setup input fingerprint for site.configure") {
		t.Fatalf("inputFingerprintFor() error = %v, want setup fingerprint context", err)
	}
}

func TestTestConfigReturnsFingerprintError(t *testing.T) {
	service := New(
		initapp.Core{
			Config:      &appconfig.Config{Auth: appconfig.AuthConfig{Enabled: false}},
			IDGenerator: utils.DefaultSnowflake(),
		},
		initapp.Infrastructure{},
		initapp.Modules{},
		filepath.Join(t.TempDir(), "config.yaml"),
		nil,
	)

	_, err := service.TestConfig(context.Background(), "site.configure", Input{Source: SourceCLI}, map[string]any{
		"brand.productName":     func() {},
		"brand.versionName":     "Community",
		"webui.public_base_url": "https://admin.example.com",
	})
	if err == nil {
		t.Fatalf("TestConfig() error = nil, want fingerprint error")
	}
	if !strings.Contains(err.Error(), "encode setup input fingerprint for site.configure") {
		t.Fatalf("TestConfig() error = %v, want setup fingerprint context", err)
	}
}

func TestRunReturnsCurrentStepSaveError(t *testing.T) {
	saveErr := errors.New("save run failed")
	db := newInitCenterTestDatabase(t)
	service := newSingleStepInitCenterService(t, initCenterDatabaseGate{Database: db, saveRunErr: saveErr}, func(context.Context, *execution) (stepOutcome, error) {
		t.Fatal("Apply must not run after current step state save failed")
		return stepOutcome{}, nil
	})

	_, err := service.Run(context.Background(), Input{Source: SourceCLI})
	if !errors.Is(err, saveErr) {
		t.Fatalf("Run() error = %v, want save run error", err)
	}
}

func TestRunReturnsStepFailureRecordError(t *testing.T) {
	applyErr := errors.New("apply failed")
	saveStepErr := errors.New("save step failed")
	db := newInitCenterTestDatabase(t)
	service := newSingleStepInitCenterService(t, initCenterDatabaseGate{Database: db, saveStepErr: saveStepErr}, func(context.Context, *execution) (stepOutcome, error) {
		return stepOutcome{Summary: "apply failed"}, applyErr
	})

	_, err := service.Run(context.Background(), Input{Source: SourceCLI})
	if !errors.Is(err, applyErr) {
		t.Fatalf("Run() error = %v, want apply error", err)
	}
	if !errors.Is(err, saveStepErr) {
		t.Fatalf("Run() error = %v, want step save error", err)
	}
}

func TestRunReturnsResultStepReadError(t *testing.T) {
	findStepsErr := errors.New("read initialization steps failed")
	db := newInitCenterTestDatabase(t)
	service := newSingleStepInitCenterService(t, initCenterDatabaseGate{Database: db, findStepsErr: findStepsErr}, func(context.Context, *execution) (stepOutcome, error) {
		return stepOutcome{Summary: "ok"}, nil
	})

	_, err := service.Run(context.Background(), Input{Source: SourceCLI})

	if !errors.Is(err, findStepsErr) {
		t.Fatalf("Run() error = %v, want step read error", err)
	}
}

func TestRunReturnsInitializationOutputError(t *testing.T) {
	writeErr := errors.New("stdout unavailable")
	service := New(
		initapp.Core{
			Config:      &appconfig.Config{Auth: appconfig.AuthConfig{Enabled: false}},
			IDGenerator: utils.DefaultSnowflake(),
		},
		initapp.Infrastructure{},
		initapp.Modules{},
		filepath.Join(t.TempDir(), "config.yaml"),
		initCenterWriteErrorWriter{err: writeErr},
	)
	registry := NewInitTaskRegistry()
	if err := registry.Register(taskAdapter{def: stepDefinition{
		Key:      "test.step",
		Phase:    "test",
		Order:    1,
		Title:    "Test step",
		Required: true,
		Apply: func(context.Context, *execution) (stepOutcome, error) {
			return stepOutcome{Summary: "ok"}, nil
		},
	}}); err != nil {
		t.Fatalf("register test step: %v", err)
	}
	service.registry = registry

	_, err := service.Run(context.Background(), Input{Source: SourceCLI})

	if !errors.Is(err, writeErr) {
		t.Fatalf("Run() error = %v, want stdout write error", err)
	}
	if !strings.Contains(err.Error(), "write initialization output") {
		t.Fatalf("Run() error missing output context: %v", err)
	}
}

func TestSaveConfigReturnsStepReadError(t *testing.T) {
	findStepsErr := errors.New("read initialization steps failed")
	db := newInitCenterTestDatabase(t)
	service := New(
		initapp.Core{
			Config:      &appconfig.Config{Auth: appconfig.AuthConfig{Enabled: false}},
			IDGenerator: utils.DefaultSnowflake(),
		},
		initapp.Infrastructure{Database: initCenterDatabaseGate{Database: db, findStepsErr: findStepsErr}},
		initapp.Modules{},
		filepath.Join(t.TempDir(), "config.yaml"),
		nil,
	)

	_, err := service.SaveConfig(context.Background(), "site.configure", Input{Source: SourceCLI}, map[string]any{
		"brand.productName": "Console Platform",
		"brand.versionName": "Community",
	}, false, false)
	if !errors.Is(err, findStepsErr) {
		t.Fatalf("SaveConfig() error = %v, want step read error", err)
	}
}

func TestStatusReturnsBootstrapStateClearError(t *testing.T) {
	clearErr := errors.New("remove denied")
	service := New(
		initapp.Core{
			Config:      &appconfig.Config{Auth: appconfig.AuthConfig{Enabled: false}},
			IDGenerator: utils.DefaultSnowflake(),
		},
		initapp.Infrastructure{},
		initapp.Modules{},
		filepath.Join(t.TempDir(), "config.yaml"),
		nil,
	)
	setBootstrapStatePathForTest(t, filepath.Join(t.TempDir(), "bootstrap_state.json"))
	if err := writeBootstrapState(bootstrapState{
		CurrentStep:       "database.configure",
		RestartRequired:   true,
		RestartReason:     "restart required",
		TargetFingerprint: service.configFingerprint(),
		UpdatedAt:         time.Now().UTC(),
	}); err != nil {
		t.Fatalf("writeBootstrapState() error = %v", err)
	}
	oldRemove := removeBootstrapStateFile
	removeBootstrapStateFile = func(string) error {
		return clearErr
	}
	t.Cleanup(func() {
		removeBootstrapStateFile = oldRemove
	})

	_, err := service.Status(context.Background())

	if !errors.Is(err, clearErr) {
		t.Fatalf("Status() error = %v, want bootstrap clear error", err)
	}
	if !strings.Contains(err.Error(), "clear setup bootstrap state") {
		t.Fatalf("Status() error missing bootstrap clear context: %v", err)
	}
}

func assertFieldsUseI18nKeys(t *testing.T, fields []FieldSchema) {
	t.Helper()
	for _, field := range fields {
		if field.Label != "" || field.Help != "" || field.Placeholder != "" {
			t.Fatalf("%s contains display fallback label=%q help=%q placeholder=%q", field.Key, field.Label, field.Help, field.Placeholder)
		}
		if field.LabelKey == "" || field.HelpKey == "" {
			t.Fatalf("%s missing label/help keys", field.Key)
		}
		for _, option := range field.Options {
			if option.Label != "" {
				t.Fatalf("%s option %s contains display fallback label=%q", field.Key, option.Value, option.Label)
			}
			if option.LabelKey == "" {
				t.Fatalf("%s option %s missing label key", field.Key, option.Value)
			}
		}
	}
}

func setBootstrapStatePathForTest(t *testing.T, path string) {
	t.Helper()
	oldPath := bootstrapStatePath
	oldRemove := removeBootstrapStateFile
	bootstrapStatePath = path
	removeBootstrapStateFile = os.Remove
	t.Cleanup(func() {
		bootstrapStatePath = oldPath
		removeBootstrapStateFile = oldRemove
	})
}

func newInitCenterTestDatabase(t *testing.T) database.Database {
	t.Helper()
	db, err := database.New(&database.Config{
		Driver: database.DriverSQLite,
		DBName: filepath.Join(t.TempDir(), "initcenter.db"),
		Silent: true,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})
	return db
}

func newSingleStepInitCenterService(t *testing.T, db database.Database, apply func(context.Context, *execution) (stepOutcome, error)) *Service {
	t.Helper()
	service := New(
		initapp.Core{
			Config:      &appconfig.Config{Auth: appconfig.AuthConfig{Enabled: false}},
			IDGenerator: utils.DefaultSnowflake(),
		},
		initapp.Infrastructure{Database: db},
		initapp.Modules{},
		filepath.Join(t.TempDir(), "config.yaml"),
		nil,
	)
	registry := NewInitTaskRegistry()
	if err := registry.Register(taskAdapter{def: stepDefinition{
		Key:      "test.step",
		Phase:    "test",
		Order:    1,
		Title:    "Test step",
		Required: true,
		Apply:    apply,
	}}); err != nil {
		t.Fatalf("register test step: %v", err)
	}
	service.registry = registry
	return service
}

type initCenterDatabaseGate struct {
	database.Database
	saveRunErr   error
	saveStepErr  error
	findStepsErr error
}

func (db initCenterDatabaseGate) Save(ctx context.Context, value any) error {
	switch value.(type) {
	case *runRecord:
		if db.saveRunErr != nil {
			return db.saveRunErr
		}
	case *stepRecord:
		if db.saveStepErr != nil {
			return db.saveStepErr
		}
	}
	return db.Database.Save(ctx, value)
}

func (db initCenterDatabaseGate) Find(ctx context.Context, dest any, opts ...database.QueryOption) error {
	if _, ok := dest.(*[]stepRecord); ok && db.findStepsErr != nil {
		return db.findStepsErr
	}
	return db.Database.Find(ctx, dest, opts...)
}

type initCenterWriteErrorWriter struct {
	err error
}

func (w initCenterWriteErrorWriter) Write([]byte) (int, error) {
	return 0, w.err
}
