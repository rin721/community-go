package composition

import (
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/rin721/go-scaffold-template/internal/webuihost"
)

// installFakeNode 在临时目录创建伪 node 可执行文件并前置到 PATH，
// 避免测试依赖真实 node。WebUI 构建脚本本体由参数 runScript 决定。
func installFakeNode(t *testing.T) {
	t.Helper()
	binDir := t.TempDir()
	if runtime.GOOS == "windows" {
		shim := "@echo off\r\n" +
			"if defined WEBUI_FAKE_MARK (echo built> \"%WEBUI_FAKE_MARK%\")\r\n" +
			"if \"%WEBUI_FAKE_MODE%\"==\"fail\" exit /b 7\r\n" +
			"exit /b 0\r\n"
		if err := os.WriteFile(filepath.Join(binDir, "node.cmd"), []byte(shim), 0o755); err != nil {
			t.Fatalf("write node.cmd shim: %v", err)
		}
	} else {
		shim := "#!/bin/sh\n" +
			"if [ -n \"$WEBUI_FAKE_MARK\" ]; then printf 'built\\n' > \"$WEBUI_FAKE_MARK\"; fi\n" +
			"if [ \"$WEBUI_FAKE_MODE\" = \"fail\" ]; then exit 7; fi\n" +
			"exit 0\n"
		if err := os.WriteFile(filepath.Join(binDir, "node"), []byte(shim), 0o755); err != nil {
			t.Fatalf("write node shim: %v", err)
		}
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
}

func writeBuildScriptFixture(t *testing.T) string {
	t.Helper()
	script := filepath.Join(t.TempDir(), "build.sh")
	if err := os.WriteFile(script, []byte("#!/bin/sh\n# fixture\n"), 0o644); err != nil {
		t.Fatalf("write fixture script: %v", err)
	}
	return script
}

func TestRunWebUIBuildExecutesConfiguredScript(t *testing.T) {
	installFakeNode(t)
	script := writeBuildScriptFixture(t)
	directory := t.TempDir()
	configPath := filepath.Join(directory, "config.yaml")
	payload := "webui:\n  hosting:\n    enabled: true\n    dir: " + filepath.ToSlash(filepath.Join(directory, "dist")) +
		"\n    buildScript: " + filepath.ToSlash(script) + "\n    buildRuntime: node\n    buildTimeout: 1m\n"
	if err := os.WriteFile(configPath, []byte(payload), 0o600); err != nil {
		t.Fatalf("write build config: %v", err)
	}
	marker := filepath.Join(directory, "marker.txt")
	t.Setenv("WEBUI_FAKE_MARK", marker)
	if err := RunWebUIBuild(t.Context(), configPath, "WEBUI_BUILD_TEST_", io.Discard); err != nil {
		t.Fatalf("RunWebUIBuild() error = %v", err)
	}
	if _, err := os.Stat(marker); err != nil {
		t.Fatalf("marker file was not written: %v", err)
	}
}

func TestRunWebUIBuildExportsScriptFailure(t *testing.T) {
	installFakeNode(t)
	script := writeBuildScriptFixture(t)
	directory := t.TempDir()
	configPath := filepath.Join(directory, "config.yaml")
	payload := "webui:\n  hosting:\n    dir: " + filepath.ToSlash(directory) +
		"\n    buildScript: " + filepath.ToSlash(script) + "\n    buildRuntime: node\n    buildTimeout: 1m\n"
	if err := os.WriteFile(configPath, []byte(payload), 0o600); err != nil {
		t.Fatalf("write build config: %v", err)
	}
	t.Setenv("WEBUI_FAKE_MODE", "fail")
	err := RunWebUIBuild(t.Context(), configPath, "WEBUI_BUILD_TEST_", io.Discard)
	if err == nil || !strings.Contains(err.Error(), "exit status 7") {
		t.Fatalf("RunWebUIBuild(fail) error = %v, want exit status 7", err)
	}
}

func TestRunWebUIBuildFallsBackToEnvironmentDefaultsWithoutConfigFile(t *testing.T) {
	installFakeNode(t)
	script := writeBuildScriptFixture(t)
	directory := t.TempDir()
	missing := filepath.Join(directory, "missing.yaml")
	prefix := "GO_SCAFFOLD_WEBUI_BUILD_TEST_"
	t.Setenv(prefix+"WEBUI__HOSTING__BUILDSCRIPT", filepath.ToSlash(script))
	t.Setenv(prefix+"WEBUI__HOSTING__BUILDRUNTIME", string(webuihost.RuntimeNode))
	t.Setenv(prefix+"WEBUI__HOSTING__BUILDTIMEOUT", "1m")
	marker := filepath.Join(directory, "marker.txt")
	t.Setenv("WEBUI_FAKE_MARK", marker)
	if err := RunWebUIBuild(t.Context(), missing, prefix, io.Discard); err != nil {
		t.Fatalf("RunWebUIBuild(env defaults) error = %v", err)
	}
	if _, err := os.Stat(marker); err != nil {
		t.Fatalf("marker file was not written: %v", err)
	}
}
