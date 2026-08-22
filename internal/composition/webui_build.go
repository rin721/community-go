package composition

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"

	"github.com/rin721/go-scaffold-template/internal/kernel/config"
	"github.com/rin721/go-scaffold-template/internal/webuihost"
)

// RunWebUIBuild 按应用配置（配置缺失时使用默认值）执行托管前构建脚本。
//
// 输出流向 output（通常是 stdout/stderr）；脚本退出码、信号与超时原因完整导出，
// 不静默回退。configPath 缺失时只使用受控环境变量与默认值，保证 config init
// 之前也可以装配 WebUI 产物。
func RunWebUIBuild(ctx context.Context, configPath, environmentPrefix string, output io.Writer) error {
	if ctx == nil {
		return fmt.Errorf("webui build context is nil")
	}
	if environmentPrefix == "" {
		return fmt.Errorf("webui build environment prefix is required")
	}
	snapshot, err := loadWebUIBuildSnapshot(ctx, configPath, environmentPrefix)
	if err != nil {
		return err
	}
	webUIConfig, err := webuihost.Decode(snapshot)
	if err != nil {
		return err
	}
	return webuihost.RunBuild(ctx, webUIConfig.Hosting.BuildRuntime, webUIConfig.Hosting.BuildScript, webUIConfig.Hosting.BuildTimeout, output)
}

func loadWebUIBuildSnapshot(ctx context.Context, configPath, environmentPrefix string) (config.Snapshot, error) {
	loader := config.New(
		config.FileSource(configPath),
		config.EnvSource(environmentPrefix),
	)
	snapshot, err := loader.Load(ctx)
	if err == nil {
		return snapshot, nil
	}
	if !errors.Is(err, fs.ErrNotExist) {
		return config.Snapshot{}, fmt.Errorf("load webui build configuration: %w", err)
	}
	// 配置文件尚不存在（例如 config init 之前）：只聚合受控环境变量与默认值。
	empty, envErr := config.New(config.EnvSource(environmentPrefix)).Load(ctx)
	if envErr != nil {
		return config.Snapshot{}, fmt.Errorf("load webui build environment configuration: %w", envErr)
	}
	return empty, nil
}
