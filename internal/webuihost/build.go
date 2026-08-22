package webuihost

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

// SnippetBuffer 是只保留前 limit 字节的 io.Writer，为日志摘要提供有界输出。
type SnippetBuffer struct {
	limit     int
	data      []byte
	truncated bool
}

// NewSnippetBuffer 创建保留前 limit 字节的片段缓冲。
func NewSnippetBuffer(limit int) *SnippetBuffer {
	if limit < 0 {
		limit = 0
	}
	return &SnippetBuffer{limit: limit}
}

// Write 实现 io.Writer；超出上限的输入被丢弃并标记截断。
func (b *SnippetBuffer) Write(contents []byte) (int, error) {
	if b == nil {
		return len(contents), nil
	}
	remaining := b.limit - len(b.data)
	if remaining <= 0 {
		b.truncated = true
		return len(contents), nil
	}
	if len(contents) <= remaining {
		b.data = append(b.data, contents...)
		return len(contents), nil
	}
	b.data = append(b.data, contents[:remaining]...)
	b.truncated = true
	return len(contents), nil
}

// Snippet 返回捕获的片段摘要；截断时追加省略标记。
func (b *SnippetBuffer) Snippet() string {
	if b == nil || len(b.data) == 0 {
		return ""
	}
	snippet := string(b.data)
	if b.truncated {
		snippet += "...(truncated)"
	}
	return snippet
}

// RunBuild 执行托管前构建脚本。
//
// 脚本由 exec 使用 runtime 与 scriptPath 直接启动（不经过 shell，禁止命令注入）；
// cwd 为进程工作目录，与仓库相对路径配置语义一致。timeout 为执行预算，输出流向
// output（可为 io.Discard）。错误链保留退出码、信号或超时原因。
func RunBuild(ctx context.Context, runtime Runtime, scriptPath string, timeout time.Duration, output io.Writer) error {
	if ctx == nil {
		return fmt.Errorf("webui build context is nil")
	}
	if runtime != RuntimeNode && runtime != RuntimeBash {
		return fmt.Errorf("webui build runtime %q is unsupported", runtime)
	}
	if strings.TrimSpace(scriptPath) == "" {
		return fmt.Errorf("webui build script path is required")
	}
	resolvedRuntime, err := exec.LookPath(string(runtime))
	if err != nil {
		return fmt.Errorf("resolve webui build runtime %q: %w", runtime, err)
	}
	info, err := os.Stat(scriptPath)
	if err != nil {
		return fmt.Errorf("stat webui build script %q: %w", scriptPath, err)
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("webui build script %q is not a regular file", scriptPath)
	}
	buildCtx := ctx
	cancel := func() {}
	if timeout > 0 {
		buildCtx, cancel = context.WithTimeout(ctx, timeout)
	}
	defer cancel()
	command := exec.CommandContext(buildCtx, resolvedRuntime, scriptPath)
	if output != nil {
		command.Stdout = output
		command.Stderr = output
	}
	if err := command.Run(); err != nil {
		if buildCtx.Err() != nil {
			return fmt.Errorf("run webui build script %q: %w", scriptPath, buildCtx.Err())
		}
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			return fmt.Errorf("run webui build script %q: exit status %d", scriptPath, exitErr.ExitCode())
		}
		return fmt.Errorf("run webui build script %q: %w", scriptPath, err)
	}
	return nil
}
