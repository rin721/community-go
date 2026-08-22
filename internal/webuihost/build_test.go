package webuihost

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

// installFakeRuntime 在临时目录创建伪 node 可执行文件并前置到 PATH，
// 避免测试依赖真实 node。行为由环境变量控制：WEBUI_FAKE_MODE 取 ok/fail/hang，
// WEBUI_FAKE_MARK 设置时在脚本中写入标记文件。
func installFakeRuntime(t *testing.T) {
	t.Helper()
	binDir := t.TempDir()
	if runtime.GOOS == "windows" {
		shim := "@echo off\r\n" +
			"if defined WEBUI_FAKE_MARK (echo built> \"%WEBUI_FAKE_MARK%\")\r\n" +
			"if \"%WEBUI_FAKE_MODE%\"==\"fail\" exit /b 7\r\n" +
			"if \"%WEBUI_FAKE_MODE%\"==\"hang\" (ping -n 6 127.0.0.1 > nul)\r\n" +
			"exit /b 0\r\n"
		if err := os.WriteFile(filepath.Join(binDir, "node.cmd"), []byte(shim), 0o755); err != nil {
			t.Fatalf("write node.cmd shim: %v", err)
		}
	} else {
		shim := "#!/bin/sh\n" +
			"if [ -n \"$WEBUI_FAKE_MARK\" ]; then printf 'built\\n' > \"$WEBUI_FAKE_MARK\"; fi\n" +
			"if [ \"$WEBUI_FAKE_MODE\" = \"fail\" ]; then exit 7; fi\n" +
			"if [ \"$WEBUI_FAKE_MODE\" = \"hang\" ]; then sleep 5; fi\n" +
			"exit 0\n"
		if err := os.WriteFile(filepath.Join(binDir, "node"), []byte(shim), 0o755); err != nil {
			t.Fatalf("write node shim: %v", err)
		}
	}
	separator := string(os.PathListSeparator)
	t.Setenv("PATH", binDir+separator+os.Getenv("PATH"))
}

func writeFixtureScript(t *testing.T) string {
	t.Helper()
	script := filepath.Join(t.TempDir(), "build-webui.mjs")
	if err := os.WriteFile(script, []byte("// fixture build script\n"), 0o644); err != nil {
		t.Fatalf("write fixture script: %v", err)
	}
	return script
}

func TestRunBuildExecutesScriptAndExportsSuccess(t *testing.T) {
	installFakeRuntime(t)
	marker := filepath.Join(t.TempDir(), "marker.txt")
	t.Setenv("WEBUI_FAKE_MARK", marker)
	if err := RunBuild(context.Background(), RuntimeNode, writeFixtureScript(t), time.Minute, io.Discard); err != nil {
		t.Fatalf("RunBuild() error = %v", err)
	}
	if _, err := os.Stat(marker); err != nil {
		t.Fatalf("marker file was not written: %v", err)
	}
}

func TestRunBuildExportsScriptExitCode(t *testing.T) {
	installFakeRuntime(t)
	script := writeFixtureScript(t)
	t.Setenv("WEBUI_FAKE_MODE", "fail")
	err := RunBuild(context.Background(), RuntimeNode, script, time.Minute, io.Discard)
	if err == nil {
		t.Fatalf("RunBuild(fail) error = nil")
	}
	if !strings.Contains(err.Error(), "exit status 7") {
		t.Fatalf("RunBuild(fail) error = %v, want exit status 7", err)
	}
}

func TestRunBuildAppliesTimeout(t *testing.T) {
	installFakeRuntime(t)
	script := writeFixtureScript(t)
	t.Setenv("WEBUI_FAKE_MODE", "hang")
	err := RunBuild(context.Background(), RuntimeNode, script, 300*time.Millisecond, io.Discard)
	if err == nil {
		t.Fatalf("RunBuild(hang) error = nil")
	}
	if !strings.Contains(err.Error(), "deadline exceeded") && !strings.Contains(err.Error(), "context") {
		t.Fatalf("RunBuild(hang) error = %v, want timeout reason", err)
	}
}

func TestRunBuildRejectsUnsupportedRuntime(t *testing.T) {
	err := RunBuild(context.Background(), Runtime("python"), writeFixtureScript(t), time.Minute, io.Discard)
	if err == nil || !strings.Contains(err.Error(), "unsupported") {
		t.Fatalf("RunBuild(python) error = %v, want unsupported", err)
	}
}

func TestRunBuildRejectsMissingScript(t *testing.T) {
	err := RunBuild(context.Background(), RuntimeNode, filepath.Join(t.TempDir(), "missing.mjs"), time.Minute, io.Discard)
	if err == nil || !strings.Contains(err.Error(), "stat webui build script") {
		t.Fatalf("RunBuild(missing script) error = %v", err)
	}
}

func TestRunBuildRejectsNonRegularScript(t *testing.T) {
	parent := t.TempDir()
	directory := filepath.Join(parent, "subdir")
	if err := os.MkdirAll(directory, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	err := RunBuild(context.Background(), RuntimeNode, directory, time.Minute, io.Discard)
	if err == nil || !strings.Contains(err.Error(), "not a regular file") {
		t.Fatalf("RunBuild(directory script) error = %v", err)
	}
}

func TestRunBuildRejectsMissingRuntime(t *testing.T) {
	t.Setenv("PATH", t.TempDir())
	err := RunBuild(context.Background(), RuntimeNode, writeFixtureScript(t), time.Minute, io.Discard)
	if err == nil || !strings.Contains(err.Error(), "resolve webui build runtime") {
		t.Fatalf("RunBuild(no runtime) error = %v", err)
	}
}

func TestSnippetBufferCapsOutput(t *testing.T) {
	buffer := NewSnippetBuffer(8)
	if _, err := buffer.Write([]byte("abcdefghijklmnop")); err != nil {
		t.Fatalf("Write() error = %v", err)
	}
	snippet := buffer.Snippet()
	if !strings.HasPrefix(snippet, "abcdefgh") || !strings.Contains(snippet, "truncated") {
		t.Fatalf("snippet = %q, want capped with truncation marker", snippet)
	}
	if want := "abcdefgh...(truncated)"; snippet != want {
		t.Fatalf("snippet = %q, want %q", snippet, want)
	}
}
