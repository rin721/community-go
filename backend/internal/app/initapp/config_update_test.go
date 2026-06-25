package initapp

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	appconfig "github.com/open-console/console-platform/internal/config"
	systemservice "github.com/open-console/console-platform/internal/modules/system/service"
	"github.com/open-console/console-platform/pkg/logger"
)

func TestBuildRuntimeConfigUpdateOperationSupportsIntPointers(t *testing.T) {
	cfg := &appconfig.Config{}
	operation, path, err := buildRuntimeConfigUpdateOperation(cfg, "system.maintenance_cleanup_batch_size", float64(25))
	if err != nil {
		t.Fatalf("buildRuntimeConfigUpdateOperation() error = %v", err)
	}
	if path != "system.maintenance_cleanup_batch_size" {
		t.Fatalf("path = %q", path)
	}
	if err := operation(cfg); err != nil {
		t.Fatalf("operation() error = %v", err)
	}
	if cfg.System.MaintenanceCleanupBatchSize == nil || *cfg.System.MaintenanceCleanupBatchSize != 25 {
		t.Fatalf("maintenance cleanup batch size = %#v", cfg.System.MaintenanceCleanupBatchSize)
	}

	if _, _, err := buildRuntimeConfigUpdateOperation(cfg, "system.maintenance_cleanup_interval_seconds", 1.5); err == nil {
		t.Fatal("buildRuntimeConfigUpdateOperation() should reject non-integer pointer values")
	}
}

func TestRuntimeConfigUpdaterReturnsOperationError(t *testing.T) {
	manager := &runtimeConfigTestManager{
		current: &appconfig.Config{
			Executor: appconfig.ExecutorConfig{
				Pools: []appconfig.ExecutorPoolConfig{
					{Name: "default", Size: 8},
				},
			},
		},
		updateTarget: &appconfig.Config{},
	}

	updater := runtimeConfigUpdater(manager)
	if updater == nil {
		t.Fatal("runtimeConfigUpdater() = nil")
	}

	_, err := updater(context.Background(), systemservice.UpdateConfigInput{
		Items: []systemservice.UpdateConfigItem{
			{Key: "executor.pools.0.size", Value: 16},
		},
	})
	if !errors.Is(err, systemservice.ErrInvalidInput) {
		t.Fatalf("UpdateConfig() error = %v, want ErrInvalidInput", err)
	}
	if !strings.Contains(err.Error(), "sequence index is out of range") {
		t.Fatalf("UpdateConfig() error missing operation context: %v", err)
	}
	if got := manager.current.Executor.Pools[0].Size; got != 8 {
		t.Fatalf("config was replaced after operation error, pool size = %d", got)
	}
}

type runtimeConfigTestManager struct {
	current      *appconfig.Config
	updateTarget *appconfig.Config
}

func (m *runtimeConfigTestManager) Load(string) error {
	return nil
}

func (m *runtimeConfigTestManager) Get() *appconfig.Config {
	return m.current
}

func (m *runtimeConfigTestManager) Update(fn func(*appconfig.Config), _ ...appconfig.UpdateOption) error {
	target := m.updateTarget
	if target == nil {
		target = m.current
	}
	fn(target)
	m.current = target
	return nil
}

func (m *runtimeConfigTestManager) UpdateWithError(fn func(*appconfig.Config) error, _ ...appconfig.UpdateOption) error {
	target := m.updateTarget
	if target == nil {
		target = m.current
	}
	if err := fn(target); err != nil {
		return fmt.Errorf("apply config update: %w", err)
	}
	m.current = target
	return nil
}

func (m *runtimeConfigTestManager) RegisterHook(appconfig.HookHandler) {}

func (m *runtimeConfigTestManager) RegisterLogger(appconfig.LoggerHandler) logger.Logger {
	return nil
}

func (m *runtimeConfigTestManager) Watch() error {
	return nil
}
