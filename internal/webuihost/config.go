// Package webuihost 负责 WebUI 构建产物的托管与托管前构建脚本执行。
//
// 职责边界：
//   - 声明并校验 webui 配置节（托管开关、托管目录、前置构建脚本路径与运行时）；
//   - 提供静态托管处理器（SPA fallback、缓存头、路径穿越防护）与托管目录校验；
//   - 提供托管前构建脚本执行器（node/bash，无 shell 拼接）。
//
// 本包不读取 .scaffold/layout.json，也不依赖仓库源码目录；托管目录与脚本的
// 默认值由仓库级一致性门禁与布局清单守护。
package webuihost

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rin721/go-scaffold-template/internal/kernel/config"
)

const (
	// capabilityID 是 webui 配置节在默认配置聚合中的归属标识。
	capabilityID = "application.webui.hosting"
	// configPath 是 webui 配置节在配置文件中的路径。
	configPath = "webui"
)

const (
	// DefaultHostingDir 是托管目录的默认值。它必须等于布局清单声明的
	// WebUI 根拼接 /dist（当前为 webui/dist）；该一致性由 internal/tools/project-layout
	// 的检查守护，修改一处必须同步修改另一处。
	DefaultHostingDir = "webui/dist"
	// DefaultBuildScript 是托管前构建脚本的默认路径（node 运行时、相对进程工作目录）。
	DefaultBuildScript = "webui/scripts/build-webui.mjs"
	// DefaultBuildTimeout 是托管前构建脚本执行的默认超时。
	DefaultBuildTimeout = 10 * time.Minute
)

// Runtime 是托管前构建脚本的运行时。
type Runtime string

const (
	// RuntimeNode 使用 node 解释器执行脚本（默认，Windows/Linux 均可）。
	RuntimeNode Runtime = "node"
	// RuntimeBash 使用 bash 解释器执行脚本（主要用于 Linux 环境）。
	RuntimeBash Runtime = "bash"
)

// Hosting 描述 WebUI 构建产物托管配置。
type Hosting struct {
	// Enabled 选择托管模式：true 为 Go 服务单进程托管（模式 B），
	// false 为前后端分离开发模式（模式 A，Vite 提供页面）。
	Enabled bool `mapstructure:"enabled"`
	// Dir 是托管目录（WebUI 打包后的静态产物目录），相对进程工作目录或绝对路径。
	Dir string `mapstructure:"dir"`
	// BuildScript 是托管前构建脚本路径，相对进程工作目录。
	BuildScript string `mapstructure:"buildScript"`
	// BuildRuntime 是托管前构建脚本的运行时，仅接受 node 或 bash。
	BuildRuntime Runtime `mapstructure:"buildRuntime"`
	// BuildTimeout 是托管前构建脚本执行的超时预算。
	BuildTimeout time.Duration `mapstructure:"buildTimeout"`
}

// Config 聚合 WebUI 托管组件的配置。
type Config struct {
	Hosting Hosting
}

// Default 返回集中声明的托管默认配置。
//
// 默认由 Go 服务托管（Enabled=true）；dir 与 buildScript 的默认值必须与布局
// 清单一致，由一致性门禁守护。
func Default() Config {
	return Config{
		Hosting: Hosting{
			Enabled:      true,
			Dir:          DefaultHostingDir,
			BuildScript:  DefaultBuildScript,
			BuildRuntime: RuntimeNode,
			BuildTimeout: DefaultBuildTimeout,
		},
	}
}

// Binding 返回 webui 配置节的默认配置与候选校验 authority。
func Binding() config.Binding {
	return config.Binding{
		CapabilityID: capabilityID,
		ConfigPath:   configPath,
		Contract:     webUIHostingDefaults{},
		Validate: func(snapshot config.Snapshot) error {
			_, err := Decode(snapshot)
			return err
		},
	}
}

// Decode 从不可变配置快照解码并校验 WebUI 托管配置。
func Decode(snapshot config.Snapshot) (Config, error) {
	resolved := Default()
	if err := snapshot.DecodeSection(configPath, &resolved); err != nil {
		return Config{}, fmt.Errorf("decode webui hosting configuration: %w", err)
	}
	if err := validate(resolved); err != nil {
		return Config{}, err
	}
	return resolved, nil
}

func validate(config Config) error {
	hosting := config.Hosting
	if strings.TrimSpace(hosting.Dir) == "" || strings.ContainsRune(hosting.Dir, 0) {
		return fmt.Errorf("webui hosting dir is required and must not contain NUL")
	}
	if strings.TrimSpace(hosting.BuildScript) == "" || strings.ContainsRune(hosting.BuildScript, 0) {
		return fmt.Errorf("webui hosting build script is required and must not contain NUL")
	}
	switch hosting.BuildRuntime {
	case RuntimeNode, RuntimeBash:
	default:
		return fmt.Errorf("webui hosting build runtime %q is unsupported (must be node or bash)", hosting.BuildRuntime)
	}
	if hosting.BuildTimeout <= 0 {
		return fmt.Errorf("webui hosting build timeout must be positive")
	}
	return nil
}

type webUIHostingDefaults struct{}

func (webUIHostingDefaults) Defaults(ctx context.Context) (config.Object, config.Control, error) {
	if ctx == nil {
		return nil, config.Continue, fmt.Errorf("webui hosting defaults context is nil")
	}
	if err := ctx.Err(); err != nil {
		return nil, config.Continue, err
	}
	value := Default().Hosting
	return config.Object{
		config.FieldOf("hosting", config.ObjectValue(config.Object{
			config.FieldOf("enabled", config.Bool(value.Enabled)),
			config.FieldOf("dir", config.String(value.Dir)),
			config.FieldOf("buildScript", config.String(value.BuildScript)),
			config.FieldOf("buildRuntime", config.String(string(value.BuildRuntime))),
			config.FieldOf("buildTimeout", config.Duration(value.BuildTimeout)),
		})),
	}, config.Continue, nil
}

var _ config.DefaultContract = webUIHostingDefaults{}
