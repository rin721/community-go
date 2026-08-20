package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"

	applicationcomposition "github.com/rin721/go-scaffold-template/internal/composition"
)

const (
	applicationName        = "go-scaffold-template"
	applicationDescription = "Go 后端服务与 CLI 工具基础设施脚手架"
	defaultConfigPath      = "config.yaml"
	environmentPrefix      = "APP_"
)

var (
	buildVersion = "dev"
	buildCommit  = "unknown"
	buildTime    = "unknown"
	buildDirty   = "true"
)

func main() {
	os.Exit(runMain(os.Stdin, os.Stdout, os.Stderr, os.Args[1:]))
}

func runMain(stdin io.Reader, stdout, stderr io.Writer, args []string) int {
	if len(args) >= 2 && args[0] == "admin" && args[1] == "generate" {
		return generateAdminRegistry(stdout, stderr, len(args) > 2 && args[2] == "--check")
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	return execute(ctx, newProcess(stdin, stdout, stderr), args)
}

func generateAdminRegistry(stdout, stderr io.Writer, check bool) int {
	content, err := applicationcomposition.GenerateAdminRegistry()
	if err != nil {
		_, _ = fmt.Fprintf(stderr, "admin registry: %v\n", err)
		return applicationcomposition.ExitError
	}
	outputPath := "webui/src/generated/admin-registry.ts"
	if _, err := os.Stat("webui"); err != nil {
		outputPath = "src/generated/admin-registry.ts"
	}
	if check {
		actual, readErr := os.ReadFile(outputPath)
		if readErr != nil {
			_, _ = fmt.Fprintf(stderr, "admin registry: %v\n", readErr)
			return applicationcomposition.ExitError
		}
		if string(actual) != content {
			_, _ = fmt.Fprintln(stderr, "admin registry: generated file is stale")
			return applicationcomposition.ExitError
		}
		_, _ = fmt.Fprintln(stdout, "admin registry is current")
		return applicationcomposition.ExitSuccess
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		_, _ = fmt.Fprintf(stderr, "admin registry: %v\n", err)
		return applicationcomposition.ExitError
	}
	if err := os.WriteFile(outputPath, []byte(content), 0o644); err != nil {
		_, _ = fmt.Fprintf(stderr, "admin registry: %v\n", err)
		return applicationcomposition.ExitError
	}
	return applicationcomposition.ExitSuccess
}

// process 保存应用入口拥有的固定装配参数和标准流。
//
// Kernel、CLI 和业务能力仍由各自包拥有；这里仅选择配置来源、组合清单和运行模式。
type process struct {
	configPath        string
	environmentPrefix string
	stdin             io.Reader
	stdout            io.Writer
	stderr            io.Writer
}

func newProcess(stdin io.Reader, stdout, stderr io.Writer) process {
	return process{
		configPath:        defaultConfigPath,
		environmentPrefix: environmentPrefix,
		stdin:             stdin,
		stdout:            stdout,
		stderr:            stderr,
	}
}

// run 根据参数选择启动前 CLI 或长期服务模式。
//
// 有参数时只执行 CLI，允许在配置文件尚不存在时运行 config init；无参数时才加载
// 文件与环境变量、启动 Kernel，并等待进程信号触发优雅退出。
func (p process) run(ctx context.Context, args []string) error {
	if ctx == nil {
		return fmt.Errorf("application context is nil")
	}
	return applicationcomposition.Run(ctx, applicationcomposition.EntryConfig{
		Name: applicationName, Description: applicationDescription,
		ConfigPath: p.configPath, EnvironmentPrefix: p.environmentPrefix,
		Stdin: p.stdin, Stdout: p.stdout, Stderr: p.stderr,
		Build: applicationcomposition.BuildInfo{Version: buildVersion, Commit: buildCommit, BuildTime: buildTime, GoVersion: runtime.Version(), Dirty: strings.EqualFold(buildDirty, "true")},
	}, args)
}

func execute(ctx context.Context, process process, args []string) int {
	err := process.run(ctx, args)
	if err == nil {
		return applicationcomposition.ExitSuccess
	}
	if _, writeErr := fmt.Fprintf(process.stderr, "%s: %v\n", applicationName, err); writeErr != nil {
		return applicationcomposition.ExitError
	}
	return applicationcomposition.ExitCode(err)
}
