package config

import "testing"

func TestSystemConfigMaintenanceDefaultsAndValidation(t *testing.T) {
	var cfg SystemConfig
	if got := cfg.MaintenanceCleanupIntervalSecondsValue(); got != DefaultSystemMaintenanceCleanupIntervalSeconds {
		t.Fatalf("MaintenanceCleanupIntervalSecondsValue() = %d, want %d", got, DefaultSystemMaintenanceCleanupIntervalSeconds)
	}
	if got := cfg.MaintenanceCleanupBatchSizeValue(); got != DefaultSystemMaintenanceCleanupBatchSize {
		t.Fatalf("MaintenanceCleanupBatchSizeValue() = %d, want %d", got, DefaultSystemMaintenanceCleanupBatchSize)
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("Validate() default error = %v", err)
	}

	invalidInterval := 0
	cfg.MaintenanceCleanupIntervalSeconds = &invalidInterval
	if err := cfg.Validate(); err == nil {
		t.Fatal("Validate() should reject non-positive maintenance cleanup interval")
	}

	validInterval := 120
	invalidBatch := -1
	cfg.MaintenanceCleanupIntervalSeconds = &validInterval
	cfg.MaintenanceCleanupBatchSize = &invalidBatch
	if err := cfg.Validate(); err == nil {
		t.Fatal("Validate() should reject non-positive maintenance cleanup batch size")
	}

	validBatch := 25
	cfg.MaintenanceCleanupBatchSize = &validBatch
	if err := cfg.Validate(); err != nil {
		t.Fatalf("Validate() valid config error = %v", err)
	}
}
