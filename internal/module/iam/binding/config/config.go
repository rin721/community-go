// Package configbinding 绑定 IAM 本地身份入口的配置。
package configbinding

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rin721/go-scaffold-template/internal/kernel/config"
)

const configPath = "iam"

type Local struct {
	SetupToken        string        `mapstructure:"setupToken"`
	IdleTimeout       time.Duration `mapstructure:"idleTimeout"`
	AbsoluteTimeout   time.Duration `mapstructure:"absoluteTimeout"`
	MaxFailedAttempts int           `mapstructure:"maxFailedAttempts"`
	LockDuration      time.Duration `mapstructure:"lockDuration"`
}
type Config struct {
	Local Local `mapstructure:"local"`
}

func Default() Config {
	return Config{Local: Local{IdleTimeout: 30 * time.Minute, AbsoluteTimeout: 12 * time.Hour, MaxFailedAttempts: 5, LockDuration: 15 * time.Minute}}
}
func Binding() config.Binding {
	return config.Binding{CapabilityID: "module.iam", ConfigPath: configPath, Contract: defaults{}, Validate: func(snapshot config.Snapshot) error { _, err := Decode(snapshot); return err }}
}
func Decode(snapshot config.Snapshot) (Config, error) {
	value := Default()
	if err := snapshot.DecodeSection(configPath, &value); err != nil {
		return Config{}, fmt.Errorf("decode iam configuration: %w", err)
	}
	if value.Local.IdleTimeout <= 0 || value.Local.AbsoluteTimeout <= value.Local.IdleTimeout || value.Local.MaxFailedAttempts <= 0 || value.Local.LockDuration <= 0 {
		return Config{}, fmt.Errorf("iam local security budgets are invalid")
	}
	return value, nil
}

type defaults struct{}

func (defaults) Defaults(ctx context.Context) (config.Object, config.Control, error) {
	if ctx == nil {
		return nil, config.Continue, fmt.Errorf("iam defaults context is nil")
	}
	if err := ctx.Err(); err != nil {
		return nil, config.Continue, err
	}
	v := Default()
	return config.Object{config.FieldOf("local", config.ObjectValue(config.Object{
		config.FieldOf("setupToken", config.String(v.Local.SetupToken)), config.FieldOf("idleTimeout", config.Duration(v.Local.IdleTimeout)), config.FieldOf("absoluteTimeout", config.Duration(v.Local.AbsoluteTimeout)),
		config.FieldOf("maxFailedAttempts", mustNumber(v.Local.MaxFailedAttempts)), config.FieldOf("lockDuration", config.Duration(v.Local.LockDuration)),
	}))}, config.Continue, nil
}
func mustNumber(value int) config.Value {
	number, err := config.Number(fmt.Sprintf("%d", value))
	if err != nil {
		panic(err)
	}
	return number
}

var _ = strings.TrimSpace
