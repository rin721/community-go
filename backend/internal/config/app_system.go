package config

import "fmt"

const (
	DefaultSystemMaintenanceCleanupIntervalSeconds = 60
	DefaultSystemMaintenanceCleanupBatchSize       = 100
)

// SystemConfig 控制系统管理模块的启动期默认数据和后台维护清理策略。
type SystemConfig struct {
	SeedDefaultsOnStart               *bool `mapstructure:"seed_defaults_on_start" envname:"SYSTEM_SEED_DEFAULTS_ON_START" json:"seed_defaults_on_start" yaml:"seed_defaults_on_start" toml:"seed_defaults_on_start"`
	MaintenanceCleanupIntervalSeconds *int  `mapstructure:"maintenance_cleanup_interval_seconds" envname:"SYSTEM_MAINTENANCE_CLEANUP_INTERVAL_SECONDS" json:"maintenance_cleanup_interval_seconds" yaml:"maintenance_cleanup_interval_seconds" toml:"maintenance_cleanup_interval_seconds"`
	MaintenanceCleanupBatchSize       *int  `mapstructure:"maintenance_cleanup_batch_size" envname:"SYSTEM_MAINTENANCE_CLEANUP_BATCH_SIZE" json:"maintenance_cleanup_batch_size" yaml:"maintenance_cleanup_batch_size" toml:"maintenance_cleanup_batch_size"`
}

func (c *SystemConfig) ValidateName() string {
	return AppSystemName
}

func (c *SystemConfig) ValidateRequired() bool {
	return false
}

func (c *SystemConfig) Validate() error {
	if c.MaintenanceCleanupIntervalSeconds != nil && *c.MaintenanceCleanupIntervalSeconds <= 0 {
		return fmt.Errorf("maintenance_cleanup_interval_seconds must be positive")
	}
	if c.MaintenanceCleanupBatchSize != nil && *c.MaintenanceCleanupBatchSize <= 0 {
		return fmt.Errorf("maintenance_cleanup_batch_size must be positive")
	}
	return nil
}

// SeedDefaultsOnStartValue 返回启动期默认数据补齐开关。
func (c SystemConfig) SeedDefaultsOnStartValue() bool {
	if c.SeedDefaultsOnStart == nil {
		return true
	}
	return *c.SeedDefaultsOnStart
}

// MaintenanceCleanupIntervalSecondsValue 返回 System 后台维护清理调度间隔秒数。
func (c SystemConfig) MaintenanceCleanupIntervalSecondsValue() int {
	if c.MaintenanceCleanupIntervalSeconds == nil {
		return DefaultSystemMaintenanceCleanupIntervalSeconds
	}
	return *c.MaintenanceCleanupIntervalSeconds
}

// MaintenanceCleanupBatchSizeValue 返回每轮 System 后台维护清理最多处理的媒体上传会话数。
func (c SystemConfig) MaintenanceCleanupBatchSizeValue() int {
	if c.MaintenanceCleanupBatchSize == nil {
		return DefaultSystemMaintenanceCleanupBatchSize
	}
	return *c.MaintenanceCleanupBatchSize
}

func copySystemConfig(src SystemConfig) SystemConfig {
	dst := src
	if src.SeedDefaultsOnStart != nil {
		value := *src.SeedDefaultsOnStart
		dst.SeedDefaultsOnStart = &value
	}
	if src.MaintenanceCleanupIntervalSeconds != nil {
		value := *src.MaintenanceCleanupIntervalSeconds
		dst.MaintenanceCleanupIntervalSeconds = &value
	}
	if src.MaintenanceCleanupBatchSize != nil {
		value := *src.MaintenanceCleanupBatchSize
		dst.MaintenanceCleanupBatchSize = &value
	}
	return dst
}
